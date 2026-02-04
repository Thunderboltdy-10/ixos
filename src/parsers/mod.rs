//! Lightweight document parsers for evidence extraction.

use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

use calamine::{open_workbook_auto, Reader};
use quick_xml::events::Event;
use quick_xml::Reader as XmlReader;
use zip::ZipArchive;

/// Check if a path is likely to yield extractable text.
pub fn can_extract_text(path: &Path) -> bool {
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

    let mut text = match ext.as_str() {
        "pdf" => extract_pdf(path),
        "docx" => extract_docx(path),
        "xlsx" | "xls" => extract_xlsx(path),
        "pptx" => extract_pptx(path),
        "ppt" => None,
        "rtf" => extract_plain_text(path, max_bytes),
        _ => extract_plain_text(path, max_bytes),
    }?;

    if text.is_empty() {
        return None;
    }

    if text.chars().count() > max_chars {
        text = truncate_chars(&text, max_chars);
    }

    Some(text)
}

fn extract_plain_text(path: &Path, max_bytes: usize) -> Option<String> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut buffer = vec![0u8; max_bytes.max(1)];
    let bytes_read = reader.read(&mut buffer).ok()?;
    buffer.truncate(bytes_read);
    let text = String::from_utf8_lossy(&buffer).to_string();
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

fn extract_pdf(path: &Path) -> Option<String> {
    pdf_extract::extract_text(path).ok()
}

fn extract_docx(path: &Path) -> Option<String> {
    let file = File::open(path).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;
    let mut doc = archive.by_name("word/document.xml").ok()?;
    let mut xml = String::new();
    doc.read_to_string(&mut xml).ok()?;
    extract_text_from_xml(&xml)
}

fn extract_xlsx(path: &Path) -> Option<String> {
    let mut workbook = open_workbook_auto(path).ok()?;
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

fn extract_pptx(path: &Path) -> Option<String> {
    let file = File::open(path).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;
    let mut slide_names: Vec<String> = archive
        .file_names()
        .filter(|name| name.starts_with("ppt/slides/slide") && name.ends_with(".xml"))
        .map(|name| name.to_string())
        .collect();
    if slide_names.is_empty() {
        return None;
    }
    slide_names.sort();

    let mut out = String::new();
    for name in slide_names {
        let mut slide = archive.by_name(&name).ok()?;
        let mut xml = String::new();
        slide.read_to_string(&mut xml).ok()?;
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
