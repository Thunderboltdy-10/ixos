//! Lightweight document parsers for evidence extraction.

use crate::storage::cloud_detection::should_skip_cloud_file;
use regex::Regex;
use std::fs::File;
use std::io::{Cursor, Read};
use std::path::Path;

use calamine::{open_workbook_auto_from_rs, Reader};
use quick_xml::events::Event;
use quick_xml::Reader as XmlReader;
use zip::ZipArchive;

/// Check if a path is likely to yield extractable text.
pub fn can_extract_text(path: &Path) -> bool {
    if should_skip_cloud_file(path) {
        return false;
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    matches!(
        ext.as_str(),
        "txt"
            | "md"
            | "log"
            | "csv"
            | "json"
            | "yaml"
            | "yml"
            | "toml"
            | "xml"
            | "html"
            | "htm"
            | "rs"
            | "py"
            | "js"
            | "ts"
            | "tsx"
            | "jsx"
            | "css"
            | "scss"
            | "swift"
            | "kt"
            | "cs"
            | "sql"
            | "ipynb"
            | "rst"
            | "tex"
            | "java"
            | "go"
            | "c"
            | "cpp"
            | "h"
            | "hpp"
            | "rb"
            | "php"
            | "sh"
            | "ps1"
            | "pdf"
            | "docx"
            | "xlsx"
            | "xls"
            | "pptx"
            | "ppt"
            | "rtf"
    )
}

/// Extract text from a file with byte and character caps.
pub fn extract_text(path: &Path, max_bytes: usize, max_chars: usize) -> Option<String> {
    if should_skip_cloud_file(path) {
        return None;
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if is_heavy_ext(&ext) {
        let size = std::fs::metadata(path).ok()?.len() as usize;
        if size > max_bytes {
            return None;
        }
    }

    let mut bytes = Vec::new();
    File::open(path)
        .ok()?
        .take(max_bytes as u64)
        .read_to_end(&mut bytes)
        .ok()?;
    extract_text_from_bytes(path, &bytes, max_chars)
}

/// Parse a stable snapshot; binary containers never fall back to raw text.
pub(crate) fn extract_text_from_bytes(
    path: &Path,
    bytes: &[u8],
    max_chars: usize,
) -> Option<String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let text = match ext.as_str() {
        "pdf" => extract_pdf(bytes),
        "docx" => extract_docx(bytes),
        "xlsx" | "xls" => extract_xlsx(bytes),
        "pptx" => extract_pptx(bytes),
        "ppt" | "doc" => None,
        _ => decode_text(bytes),
    }?;
    if text.trim().is_empty() {
        return None;
    }
    Some(truncate_chars(&text, max_chars))
}

/// Decode BOM-tagged UTF-16 and UTF-8. Untagged NUL data is binary.
pub(crate) fn decode_text(bytes: &[u8]) -> Option<String> {
    let text = if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        let little = bytes[0] == 0xFF;
        let units: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|b| {
                if little {
                    u16::from_le_bytes([b[0], b[1]])
                } else {
                    u16::from_be_bytes([b[0], b[1]])
                }
            })
            .collect();
        String::from_utf16_lossy(&units)
    } else {
        if bytes.contains(&0) {
            return None;
        }
        let bytes = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);
        String::from_utf8_lossy(bytes).into_owned()
    };
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

fn extract_pdf(bytes: &[u8]) -> Option<String> {
    if let Ok(text) = pdf_extract::extract_text_from_mem(bytes) {
        if !text.trim().is_empty() {
            return Some(text);
        }
    }

    if let Ok(doc) = lopdf::Document::load_mem(bytes) {
        let mut pages: Vec<u32> = doc.get_pages().keys().copied().collect();
        pages.sort_unstable();
        if let Ok(fallback) = doc.extract_text(&pages) {
            if !fallback.trim().is_empty() {
                return Some(fallback);
            }
        }
    }

    extract_pdf_literal_text(bytes)
}

fn extract_pdf_literal_text(bytes: &[u8]) -> Option<String> {
    let content = String::from_utf8_lossy(bytes);
    let pattern = Regex::new(r"\(([^()]*)\)\s*Tj").ok()?;
    let mut out = String::new();
    let mut last_space = true;

    for capture in pattern.captures_iter(&content) {
        let token = capture.get(1)?.as_str();
        let decoded = token
            .replace("\\\\", "\\")
            .replace("\\(", "(")
            .replace("\\)", ")");
        push_clean_text(&mut out, &decoded, &mut last_space);
        out.push('\n');
        last_space = true;
    }

    if out.trim().is_empty() {
        None
    } else {
        Some(out)
    }
}

fn extract_docx(bytes: &[u8]) -> Option<String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).ok()?;
    let doc = archive.by_name("word/document.xml").ok()?;
    let mut xml = String::new();
    doc.take(8 * 1024 * 1024).read_to_string(&mut xml).ok()?;
    extract_text_from_xml(&xml)
}

fn extract_xlsx(bytes: &[u8]) -> Option<String> {
    let mut workbook = open_workbook_auto_from_rs(Cursor::new(bytes)).ok()?;
    let sheet_names = workbook.sheet_names().to_owned();
    let mut out = String::new();
    let mut last_space;

    for name in sheet_names {
        if let Ok(range) = workbook.worksheet_range(&name) {
            if !out.is_empty() {
                out.push('\n');
            }
            out.push_str(&name);
            out.push('\n');
            last_space = true;

            for row in range.rows() {
                for cell in row {
                    let cell_text = cell.to_string();
                    if !cell_text.trim().is_empty() {
                        push_clean_text(&mut out, &cell_text, &mut last_space);
                        out.push(' ');
                        last_space = true;
                    }
                }
                if !out.ends_with('\n') {
                    out.push('\n');
                    last_space = true;
                }
            }
        }
    }

    if out.trim().is_empty() {
        None
    } else {
        Some(out)
    }
}

fn extract_pptx(bytes: &[u8]) -> Option<String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).ok()?;
    let mut slide_names: Vec<String> = archive
        .file_names()
        .filter(|name| name.starts_with("ppt/slides/slide") && name.ends_with(".xml"))
        .map(|name| name.to_string())
        .collect();
    if slide_names.is_empty() {
        return None;
    }
    slide_names.sort_by_key(|name| {
        name.trim_start_matches("ppt/slides/slide")
            .trim_end_matches(".xml")
            .parse::<usize>()
            .unwrap_or(usize::MAX)
    });

    let mut out = String::new();
    for name in slide_names {
        let slide = archive.by_name(&name).ok()?;
        let mut xml = String::new();
        slide.take(8 * 1024 * 1024).read_to_string(&mut xml).ok()?;
        if let Some(text) = extract_text_from_xml(&xml) {
            if !out.is_empty() {
                out.push('\n');
            }
            out.push_str(&text);
        }
    }

    if out.trim().is_empty() {
        None
    } else {
        Some(out)
    }
}

fn extract_text_from_xml(xml: &str) -> Option<String> {
    let mut reader = XmlReader::from_str(xml);
    reader.trim_text(true);
    let mut buf = Vec::new();
    let mut out = String::new();
    let mut last_space = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(text)) => {
                let text = text.unescape().ok()?;
                push_clean_text(&mut out, &text, &mut last_space);
            }
            Ok(Event::End(end)) => {
                if ends_with_tag(end.name().as_ref(), b"p") {
                    out.push('\n');
                    last_space = true;
                }
            }
            Ok(Event::Empty(empty)) => {
                if ends_with_tag(empty.name().as_ref(), b"br") {
                    out.push('\n');
                    last_space = true;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => return None,
            _ => {}
        }
        buf.clear();
    }

    if out.trim().is_empty() {
        None
    } else {
        Some(out)
    }
}

fn ends_with_tag(name: &[u8], tag: &[u8]) -> bool {
    if name == tag {
        return true;
    }
    if name.len() <= tag.len() + 1 {
        return false;
    }
    if !name.ends_with(tag) {
        return false;
    }
    name[name.len() - tag.len() - 1] == b':'
}

fn push_clean_text(out: &mut String, text: &str, last_space: &mut bool) {
    for ch in text.chars() {
        if ch.is_whitespace() {
            if !*last_space {
                out.push(' ');
                *last_space = true;
            }
        } else {
            out.push(ch);
            *last_space = false;
        }
    }
}

fn truncate_chars(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    text.chars().take(max_chars).collect()
}

fn is_heavy_ext(ext: &str) -> bool {
    matches!(ext, "pdf" | "docx" | "xlsx" | "xls" | "pptx")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn binary_containers_never_become_raw_text() {
        assert!(
            extract_text_from_bytes(Path::new("broken.docx"), b"PK raw archive garbage", 200)
                .is_none()
        );
        assert!(extract_text_from_bytes(
            Path::new("broken.pdf"),
            b"%PDF invalid binary container",
            200
        )
        .is_none());
        assert!(decode_text(b"some\0binary data").is_none());
    }

    #[test]
    fn utf16_text_and_utf8_bom_are_decoded() {
        let original = "résumé 日本語";
        let bytes: Vec<_> = [0xFF, 0xFE]
            .into_iter()
            .chain(original.encode_utf16().flat_map(u16::to_le_bytes))
            .collect();
        assert_eq!(decode_text(&bytes).unwrap(), original);
        assert_eq!(decode_text(b"\xEF\xBB\xBFhello").unwrap(), "hello");
    }

    fn fixture(name: &str) -> PathBuf {
        PathBuf::from("tests").join("fixtures").join(name)
    }

    #[test]
    fn test_extract_txt_fixture() {
        let path = fixture("sample.txt");
        let text = extract_text(&path, 8 * 1024, 8 * 1024).expect("txt extract");
        assert!(text.contains("Ixos TXT Fixture"));
    }

    #[test]
    fn test_extract_rtf_fixture() {
        let path = fixture("sample.rtf");
        let text = extract_text(&path, 8 * 1024, 8 * 1024).expect("rtf extract");
        assert!(text.contains("Ixos RTF Fixture"));
    }

    #[test]
    fn test_extract_pdf_fixture() {
        let path = fixture("sample.pdf");
        let text = extract_text(&path, 64 * 1024, 16 * 1024).expect("pdf extract");
        assert!(text.contains("Ixos PDF Fixture"));
    }

    #[test]
    fn test_extract_docx_fixture() {
        let path = fixture("sample.docx");
        let text = extract_text(&path, 64 * 1024, 16 * 1024).expect("docx extract");
        assert!(text.contains("Ixos DOCX Fixture"));
    }

    #[test]
    fn test_extract_pptx_fixture() {
        let path = fixture("sample.pptx");
        let text = extract_text(&path, 64 * 1024, 16 * 1024).expect("pptx extract");
        assert!(text.contains("Ixos PPTX Fixture"));
    }

    #[test]
    fn test_heavy_format_respects_byte_cap() {
        let path = fixture("sample.pdf");
        let text = extract_text(&path, 1, 512);
        assert!(text.is_none());
    }
}
