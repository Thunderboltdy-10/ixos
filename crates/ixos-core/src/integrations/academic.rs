//! Academic Integration module
//!
//! Provides features for exporting search results to academic reference managers
//! like Zotero and Mendeley.

use crate::ixos_rank::RankedResult;
use std::path::PathBuf;

/// Supported academic export formats
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AcademicFormat {
    Zotero,
    Mendeley,
    BibTex,
}

impl std::str::FromStr for AcademicFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "zotero" | "csv" => Ok(AcademicFormat::Zotero),
            "mendeley" | "xml" => Ok(AcademicFormat::Mendeley),
            "bibtex" | "bib" => Ok(AcademicFormat::BibTex),
            _ => Err(format!("Unknown format: {}", s)),
        }
    }
}

/// Metadata extracted from a file for academic purposes
#[derive(Debug, Default)]
struct AcademicMetadata {
    title: String,
    author: String,
    year: String,
    file_path: PathBuf,
    snippet: String,
}

impl AcademicMetadata {
    /// Extract metadata from a search result
    fn from_result(result: &RankedResult) -> Self {
        let path = &result.path;
        let filename = path
            .file_name()
            .map(|s| s.to_string_lossy())
            .unwrap_or_default();

        // Try to guess title from filename (replace underscores/dashes with spaces)
        let title = path
            .file_stem()
            .map(|s| s.to_string_lossy().replace(['_', '-'], " "))
            .unwrap_or_else(|| "Unknown Title".to_string());

        // Try to extract year from filename (simple 4-digit regex equivalent)
        let year = if let Some(capture) = Self::extract_year(&filename) {
            capture
        } else {
            // Fallback to file modification time
            if let Ok(metadata) = std::fs::metadata(path) {
                if let Ok(modified) = metadata.modified() {
                    let datetime: chrono::DateTime<chrono::Utc> = modified.into();
                    datetime.format("%Y").to_string()
                } else {
                    "2026".to_string()
                }
            } else {
                "2026".to_string()
            }
        };

        Self {
            title,
            author: "Unknown Author".to_string(), // Diffcult to extract without PDF parsing
            year,
            file_path: path.clone(),
            snippet: result
                .context_snippet
                .as_ref()
                .map(|s| s.raw_matched.clone())
                .unwrap_or_default(),
        }
    }

    fn extract_year(s: &str) -> Option<String> {
        // Simple manual parser: look for 19xx or 20xx
        for i in 0..s.len().saturating_sub(3) {
            if let Some(slice) = s.get(i..i + 4) {
                if slice.chars().all(|c| c.is_ascii_digit()) {
                    if slice.starts_with("19") || slice.starts_with("20") {
                        return Some(slice.to_string());
                    }
                }
            }
        }
        None
    }
}

/// Exporter for academic formats
pub struct AcademicExporter;

impl AcademicExporter {
    /// Export results to the specified format
    pub fn export(results: &[RankedResult], format: AcademicFormat) -> String {
        let metadata: Vec<AcademicMetadata> =
            results.iter().map(AcademicMetadata::from_result).collect();

        match format {
            AcademicFormat::Zotero => Self::to_zotero_csv(&metadata),
            AcademicFormat::Mendeley => Self::to_mendeley_xml(&metadata),
            AcademicFormat::BibTex => Self::to_bibtex(&metadata),
        }
    }

    fn to_zotero_csv(items: &[AcademicMetadata]) -> String {
        let mut output = String::from("Item Type,Title,Author,Date,File Attachments,Extra\n");

        for item in items {
            let title = item.title.replace('"', "\"\"");
            let path = item.file_path.display().to_string().replace('"', "\"\"");
            let snippet = item.snippet.replace('"', "\"\"").replace('\n', " ");

            output.push_str(&format!(
                "document,\"{}\",\"{}\",{},\"{}\",\"Snippet: {}\"\n",
                title, item.author, item.year, path, snippet
            ));
        }

        output
    }

    fn to_mendeley_xml(items: &[AcademicMetadata]) -> String {
        let mut output = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<records>\n");

        for item in items {
            output.push_str("  <record>\n");
            output.push_str("    <type>Generic</type>\n");
            output.push_str(&format!(
                "    <title>{}</title>\n",
                Self::escape_xml(&item.title)
            ));
            output.push_str("    <authors>\n");
            output.push_str(&format!(
                "      <author>{}</author>\n",
                Self::escape_xml(&item.author)
            ));
            output.push_str("    </authors>\n");
            output.push_str(&format!("    <year>{}</year>\n", item.year));
            output.push_str("    <urls>\n");
            output.push_str(&format!(
                "      <url>file://{}</url>\n",
                Self::escape_xml(&item.file_path.display().to_string())
            ));
            output.push_str("    </urls>\n");
            output.push_str(&format!(
                "    <abstract>{}</abstract>\n",
                Self::escape_xml(&item.snippet)
            ));
            output.push_str("  </record>\n");
        }

        output.push_str("</records>");
        output
    }

    fn to_bibtex(items: &[AcademicMetadata]) -> String {
        let mut output = String::new();

        for (i, item) in items.iter().enumerate() {
            let key = format!("ref_{}", i);
            output.push_str(&format!("@misc{{{},\n", key));
            output.push_str(&format!("  title = {{{}}},\n", item.title));
            output.push_str(&format!("  author = {{{}}},\n", item.author));
            output.push_str(&format!("  year = {{{}}},\n", item.year));
            output.push_str(&format!(
                "  note = {{File: {}. Snippet: {}}}\n",
                item.file_path.display(),
                item.snippet.replace('\n', " ")
            ));
            output.push_str("}\n\n");
        }

        output
    }

    fn escape_xml(s: &str) -> String {
        s.replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;")
            .replace('\'', "&apos;")
    }
}
