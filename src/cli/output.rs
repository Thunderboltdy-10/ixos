//! Output formatters for Ixos CLI
//!
//! Provides multiple output formats for different use cases:
//!
//! - **Human**: Colored, readable output for terminal use
//! - **JSON**: Structured output for scripting and jq
//! - **CSV**: Spreadsheet-compatible format
//! - **Ripgrep**: Compatible with rg for fzf integration
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::cli::output::{create_formatter, OutputFormat};
//!
//! let formatter = create_formatter(OutputFormat::Json, false);
//! let mut stdout = std::io::stdout();
//! formatter.format_complete(&mut stdout).unwrap();
//! ```

use serde::Serialize;
use std::io::{self, Write};

use crate::ixos_rank::{LexicalMatch, RankedResult, ScoreBreakdown};

// =============================================================================
// Output Format Enum
// =============================================================================

/// Available output formats
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum OutputFormat {
    /// Human-readable output with optional colors
    #[default]
    Human,
    /// JSON output for scripting
    Json,
    /// CSV output for spreadsheets
    Csv,
    /// Ripgrep-compatible output for fzf integration
    Ripgrep,
    /// Zotero CSV format
    Zotero,
    /// Mendeley XML format
    Mendeley,
    /// BibTeX format
    Bibtex,
}

impl std::fmt::Display for OutputFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OutputFormat::Human => write!(f, "human"),
            OutputFormat::Json => write!(f, "json"),
            OutputFormat::Csv => write!(f, "csv"),
            OutputFormat::Ripgrep => write!(f, "ripgrep"),
            OutputFormat::Zotero => write!(f, "zotero"),
            OutputFormat::Mendeley => write!(f, "mendeley"),
            OutputFormat::Bibtex => write!(f, "bibtex"),
        }
    }
}

impl std::str::FromStr for OutputFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "human" => Ok(OutputFormat::Human),
            "json" => Ok(OutputFormat::Json),
            "csv" => Ok(OutputFormat::Csv),
            "ripgrep" | "rg" => Ok(OutputFormat::Ripgrep),
            "zotero" => Ok(OutputFormat::Zotero),
            "mendeley" | "xml" => Ok(OutputFormat::Mendeley),
            "bibtex" | "bib" => Ok(OutputFormat::Bibtex),
            _ => Err(format!("Unknown format: {}", s)),
        }
    }
}

// =============================================================================
// Serializable Output Types
// =============================================================================

/// Search result output for JSON serialization
#[derive(Debug, Serialize)]
pub struct SearchResultOutput {
    /// File path
    pub path: String,
    /// Relevance score
    pub score: f32,
    /// Whether integrity was verified
    pub integrity_verified: bool,
    /// Content snippet (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    /// Score breakdown (if requested)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_breakdown: Option<ScoreBreakdownOutput>,
}

/// Score breakdown for JSON serialization
#[derive(Debug, Serialize)]
pub struct ScoreBreakdownOutput {
    /// Semantic similarity score
    pub semantic: f32,
    /// Integrity verification score
    pub integrity: f32,
    /// Temporal (file age) score
    pub temporal: f32,
    /// Behavior pattern score
    pub behavior: f32,
}

impl From<&ScoreBreakdown> for ScoreBreakdownOutput {
    fn from(b: &ScoreBreakdown) -> Self {
        Self {
            semantic: b.semantic,
            integrity: b.integrity,
            temporal: b.temporal,
            behavior: b.behavior,
        }
    }
}

/// Evidence output for JSON serialization
#[derive(Debug, Serialize)]
pub struct EvidenceOutput {
    /// Evidence tags for UI display
    pub tags: Vec<String>,
    /// Human-readable explanation of why this matched
    #[serde(skip_serializing_if = "Option::is_none")]
    pub explanation: Option<String>,
    /// Number of lexical (keyword) matches
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lexical_hit_count: Option<usize>,
    /// Query terms that matched
    pub matched_terms: Vec<String>,
    /// Best semantic passage match
    #[serde(skip_serializing_if = "Option::is_none")]
    pub semantic_passage: Option<String>,
    /// Path-based evidence tags
    pub path_tags: Vec<String>,
    /// Detected file type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_type: Option<String>,
}

impl From<&crate::ixos_rank::types::EvidenceSummary> for EvidenceOutput {
    fn from(e: &crate::ixos_rank::types::EvidenceSummary) -> Self {
        Self {
            tags: e.tags.iter().map(|t| t.to_string()).collect(),
            explanation: e.explanation.clone(),
            lexical_hit_count: e.lexical_hit_count,
            matched_terms: e.matched_terms.clone(),
            semantic_passage: e.semantic_passage.clone(),
            path_tags: e.path_tags.clone(),
            file_type: e.file_type.clone(),
        }
    }
}

/// Extended search result output with evidence
#[derive(Debug, Serialize)]
pub struct SearchResultOutputWithEvidence {
    /// File path
    pub path: String,
    /// Relevance score
    pub score: f32,
    /// Whether integrity was verified
    pub integrity_verified: bool,
    /// Content snippet (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    /// Score breakdown (if requested)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_breakdown: Option<ScoreBreakdownOutput>,
    /// Evidence payload explaining why this result matched
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<EvidenceOutput>,
}

// =============================================================================
// Output Formatter Trait
// =============================================================================

/// Trait for output formatters
pub trait OutputFormatter: Send + Sync {
    /// Format lexical (quick) search results
    fn format_lexical_results(
        &self,
        results: &[LexicalMatch],
        writer: &mut dyn Write,
    ) -> io::Result<()>;

    /// Format semantic (final) search results
    fn format_semantic_results(
        &self,
        results: &[RankedResult],
        show_scores: bool,
        writer: &mut dyn Write,
    ) -> io::Result<()>;

    /// Format a status message
    fn format_status(&self, message: &str, writer: &mut dyn Write) -> io::Result<()>;

    /// Format search completion
    fn format_complete(&self, writer: &mut dyn Write) -> io::Result<()>;

    /// Format an error message
    fn format_error(&self, error: &str, writer: &mut dyn Write) -> io::Result<()>;
}

// =============================================================================
// Human Formatter
// =============================================================================

/// Human-readable output formatter
pub struct HumanFormatter {
    use_color: bool,
}

impl HumanFormatter {
    /// Create a new human formatter
    pub fn new(use_color: bool) -> Self {
        Self { use_color }
    }

    /// Apply color to text if colors are enabled
    fn colorize(&self, text: &str, color_code: &str) -> String {
        if self.use_color {
            format!("\x1b[{}m{}\x1b[0m", color_code, text)
        } else {
            text.to_string()
        }
    }

    /// Format a score with color based on value
    fn format_score(&self, score: f32) -> String {
        let score_str = format!("{:.2}", score);
        if !self.use_color {
            return score_str;
        }

        // Color based on score value
        let color = if score >= 0.8 {
            "32" // Green
        } else if score >= 0.5 {
            "33" // Yellow
        } else {
            "31" // Red
        };

        self.colorize(&score_str, color)
    }
}

impl OutputFormatter for HumanFormatter {
    fn format_lexical_results(
        &self,
        results: &[LexicalMatch],
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        if results.is_empty() {
            return Ok(());
        }

        let header = self.colorize(
            &format!("Quick results ({} files):", results.len()),
            "1;36", // Bold cyan
        );
        writeln!(writer, "{}", header)?;

        for (i, result) in results.iter().take(10).enumerate() {
            let path = self.colorize(&result.path.display().to_string(), "1"); // Bold
            let score = self.format_score(result.score);
            writeln!(writer, "  {}. {} (score: {})", i + 1, path, score)?;
        }

        if results.len() > 10 {
            writeln!(
                writer,
                "  {} ...and {} more",
                self.colorize("...", "90"),
                results.len() - 10
            )?;
        }

        writeln!(writer)?;
        Ok(())
    }

    fn format_semantic_results(
        &self,
        results: &[RankedResult],
        show_scores: bool,
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        if results.is_empty() {
            writeln!(writer, "{}", self.colorize("No results found.", "33"))?;
            return Ok(());
        }

        let header = self.colorize(
            &format!("Results ({} files):", results.len()),
            "1;32", // Bold green
        );
        writeln!(writer, "{}", header)?;

        for (i, result) in results.iter().enumerate() {
            let path = self.colorize(&result.path.display().to_string(), "1"); // Bold
            let score = self.format_score(result.score);

            if show_scores {
                let breakdown = &result.score_breakdown;
                writeln!(
                    writer,
                    "{}. {} (score: {}, semantic: {:.2}, integrity: {:.2})",
                    i + 1,
                    path,
                    score,
                    breakdown.semantic,
                    breakdown.integrity
                )?;
            } else {
                writeln!(writer, "{}. {}", i + 1, path)?;
            }

            // Display context snippet if available
            if let Some(ref snippet) = result.context_snippet {
                let formatted = crate::ixos_rank::snippet::format_snippet(snippet, self.use_color);
                if !formatted.is_empty() {
                    write!(writer, "{}", formatted)?;
                    writeln!(writer)?;
                }
            }
        }

        Ok(())
    }

    fn format_status(&self, message: &str, writer: &mut dyn Write) -> io::Result<()> {
        let status = self.colorize(&format!("... {}", message), "90"); // Gray
        writeln!(writer, "{}", status)
    }

    fn format_complete(&self, writer: &mut dyn Write) -> io::Result<()> {
        writeln!(writer, "{}", self.colorize("Search complete.", "32"))
    }

    fn format_error(&self, error: &str, writer: &mut dyn Write) -> io::Result<()> {
        writeln!(writer, "{}: {}", self.colorize("Error", "1;31"), error)
    }
}

// =============================================================================
// JSON Formatter
// =============================================================================

/// JSON output formatter
pub struct JsonFormatter {
    include_evidence: bool,
}

impl JsonFormatter {
    /// Create a new JSON formatter
    pub fn new() -> Self {
        Self {
            include_evidence: false,
        }
    }

    /// Create a JSON formatter that includes evidence
    pub fn with_evidence() -> Self {
        Self {
            include_evidence: true,
        }
    }
}

impl Default for JsonFormatter {
    fn default() -> Self {
        Self::new()
    }
}

impl OutputFormatter for JsonFormatter {
    fn format_lexical_results(
        &self,
        results: &[LexicalMatch],
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        let outputs: Vec<SearchResultOutput> = results
            .iter()
            .map(|r| SearchResultOutput {
                path: r.path.to_string_lossy().to_string(),
                score: r.score,
                integrity_verified: false,
                snippet: Some(r.content_snippet.clone()),
                score_breakdown: None,
            })
            .collect();

        let json = serde_json::json!({
            "type": "lexical",
            "count": outputs.len(),
            "results": outputs
        });

        writeln!(
            writer,
            "{}",
            serde_json::to_string(&json).unwrap_or_default()
        )
    }

    fn format_semantic_results(
        &self,
        results: &[RankedResult],
        show_scores: bool,
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        if self.include_evidence {
            // Extended output with evidence
            let outputs: Vec<SearchResultOutputWithEvidence> = results
                .iter()
                .map(|r| SearchResultOutputWithEvidence {
                    path: r.path.to_string_lossy().to_string(),
                    score: r.score,
                    integrity_verified: r.integrity_verified,
                    snippet: r.context_snippet.as_ref().map(|s| s.raw_matched.clone()),
                    score_breakdown: if show_scores {
                        Some(ScoreBreakdownOutput::from(&r.score_breakdown))
                    } else {
                        None
                    },
                    evidence: r.evidence.as_ref().map(EvidenceOutput::from),
                })
                .collect();

            let json = serde_json::json!({
                "type": "semantic",
                "count": outputs.len(),
                "results": outputs
            });

            writeln!(
                writer,
                "{}",
                serde_json::to_string(&json).unwrap_or_default()
            )
        } else {
            // Standard output without evidence
            let outputs: Vec<SearchResultOutput> = results
                .iter()
                .map(|r| SearchResultOutput {
                    path: r.path.to_string_lossy().to_string(),
                    score: r.score,
                    integrity_verified: r.integrity_verified,
                    snippet: r.context_snippet.as_ref().map(|s| s.raw_matched.clone()),
                    score_breakdown: if show_scores {
                        Some(ScoreBreakdownOutput::from(&r.score_breakdown))
                    } else {
                        None
                    },
                })
                .collect();

            let json = serde_json::json!({
                "type": "semantic",
                "count": outputs.len(),
                "results": outputs
            });

            writeln!(
                writer,
                "{}",
                serde_json::to_string(&json).unwrap_or_default()
            )
        }
    }

    fn format_status(&self, message: &str, writer: &mut dyn Write) -> io::Result<()> {
        let json = serde_json::json!({
            "type": "status",
            "message": message
        });
        writeln!(
            writer,
            "{}",
            serde_json::to_string(&json).unwrap_or_default()
        )
    }

    fn format_complete(&self, writer: &mut dyn Write) -> io::Result<()> {
        let json = serde_json::json!({
            "type": "complete"
        });
        writeln!(
            writer,
            "{}",
            serde_json::to_string(&json).unwrap_or_default()
        )
    }

    fn format_error(&self, error: &str, writer: &mut dyn Write) -> io::Result<()> {
        let json = serde_json::json!({
            "type": "error",
            "message": error
        });
        writeln!(
            writer,
            "{}",
            serde_json::to_string(&json).unwrap_or_default()
        )
    }
}

// =============================================================================
// CSV Formatter
// =============================================================================

/// CSV output formatter
pub struct CsvFormatter {
    header_written: std::sync::atomic::AtomicBool,
}

impl CsvFormatter {
    /// Create a new CSV formatter
    pub fn new() -> Self {
        Self {
            header_written: std::sync::atomic::AtomicBool::new(false),
        }
    }
}

impl Default for CsvFormatter {
    fn default() -> Self {
        Self::new()
    }
}

impl OutputFormatter for CsvFormatter {
    fn format_lexical_results(
        &self,
        results: &[LexicalMatch],
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        // Write header if not already written
        if !self
            .header_written
            .swap(true, std::sync::atomic::Ordering::SeqCst)
        {
            writeln!(writer, "path,score,type")?;
        }

        for result in results {
            // Escape path if it contains commas or quotes
            let path = escape_csv(&result.path.to_string_lossy());
            writeln!(writer, "{},{:.4},lexical", path, result.score)?;
        }
        Ok(())
    }

    fn format_semantic_results(
        &self,
        results: &[RankedResult],
        _show_scores: bool,
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        // Write header if not already written
        if !self
            .header_written
            .swap(true, std::sync::atomic::Ordering::SeqCst)
        {
            writeln!(writer, "path,score,integrity_verified")?;
        }

        for result in results {
            let path = escape_csv(&result.path.to_string_lossy());
            writeln!(
                writer,
                "{},{:.4},{}",
                path, result.score, result.integrity_verified
            )?;
        }
        Ok(())
    }

    fn format_status(&self, _message: &str, _writer: &mut dyn Write) -> io::Result<()> {
        // Silent in CSV mode
        Ok(())
    }

    fn format_complete(&self, _writer: &mut dyn Write) -> io::Result<()> {
        // Silent in CSV mode
        Ok(())
    }

    fn format_error(&self, error: &str, writer: &mut dyn Write) -> io::Result<()> {
        // CSV comment
        writeln!(writer, "# Error: {}", error)
    }
}

/// Escape a string for CSV output
fn escape_csv(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

// =============================================================================
// Ripgrep Formatter
// =============================================================================

/// Ripgrep-compatible output formatter
///
/// Produces output compatible with ripgrep for use with fzf:
/// ```text
/// path:line:content
/// ```
pub struct RipgrepFormatter;

impl OutputFormatter for RipgrepFormatter {
    fn format_lexical_results(
        &self,
        results: &[LexicalMatch],
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        for result in results {
            // Format: path:1:snippet (line 1 since we don't track line numbers)
            let snippet = result
                .content_snippet
                .replace('\n', " ")
                .replace('\r', "")
                .chars()
                .take(100)
                .collect::<String>();
            writeln!(writer, "{}:1:{}", result.path.display(), snippet)?;
        }
        Ok(())
    }

    fn format_semantic_results(
        &self,
        results: &[RankedResult],
        _show_scores: bool,
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        // Output in ripgrep format: path:line:content
        for result in results {
            if let Some(ref snippet) = result.context_snippet {
                // Format: path:line_number:matched_content
                let content = snippet
                    .raw_matched
                    .replace('\n', " ")
                    .replace('\r', "")
                    .chars()
                    .take(100)
                    .collect::<String>();
                writeln!(
                    writer,
                    "{}:{}:{}",
                    result.path.display(),
                    snippet.line_number,
                    content
                )?;
            } else {
                // No context available, just output path
                writeln!(writer, "{}", result.path.display())?;
            }
        }
        Ok(())
    }

    fn format_status(&self, _message: &str, _writer: &mut dyn Write) -> io::Result<()> {
        // Silent for piping
        Ok(())
    }

    fn format_complete(&self, _writer: &mut dyn Write) -> io::Result<()> {
        // Silent for piping
        Ok(())
    }

    fn format_error(&self, error: &str, _writer: &mut dyn Write) -> io::Result<()> {
        // Write to stderr instead
        eprintln!("ixos: {}", error);
        Ok(())
    }
}

// =============================================================================
// Academic Formatter
// =============================================================================

/// Formatter for academic export formats
pub struct AcademicFormatter {
    format: crate::integrations::academic::AcademicFormat,
}

impl AcademicFormatter {
    pub fn new(format: crate::integrations::academic::AcademicFormat) -> Self {
        Self { format }
    }
}

impl OutputFormatter for AcademicFormatter {
    fn format_lexical_results(
        &self,
        _results: &[LexicalMatch],
        _writer: &mut dyn Write,
    ) -> io::Result<()> {
        // Not supported for lexical results
        Ok(())
    }

    fn format_semantic_results(
        &self,
        results: &[RankedResult],
        _show_scores: bool,
        writer: &mut dyn Write,
    ) -> io::Result<()> {
        let output = crate::integrations::academic::AcademicExporter::export(results, self.format);
        write!(writer, "{}", output)
    }

    fn format_status(&self, _message: &str, _writer: &mut dyn Write) -> io::Result<()> {
        Ok(())
    }

    fn format_complete(&self, _writer: &mut dyn Write) -> io::Result<()> {
        Ok(())
    }

    fn format_error(&self, error: &str, writer: &mut dyn Write) -> io::Result<()> {
        writeln!(writer, "# Error: {}", error)
    }
}

// =============================================================================
// Factory Function
// =============================================================================

/// Create a formatter for the given output format
pub fn create_formatter(format: OutputFormat, use_color: bool) -> Box<dyn OutputFormatter> {
    create_formatter_with_options(format, use_color, false)
}

/// Create a formatter with evidence option
pub fn create_formatter_with_options(
    format: OutputFormat,
    use_color: bool,
    include_evidence: bool,
) -> Box<dyn OutputFormatter> {
    match format {
        OutputFormat::Human => Box::new(HumanFormatter::new(use_color)),
        OutputFormat::Json => {
            if include_evidence {
                Box::new(JsonFormatter::with_evidence())
            } else {
                Box::new(JsonFormatter::new())
            }
        }
        OutputFormat::Csv => Box::new(CsvFormatter::new()),
        OutputFormat::Ripgrep => Box::new(RipgrepFormatter),
        OutputFormat::Zotero => Box::new(AcademicFormatter::new(
            crate::integrations::academic::AcademicFormat::Zotero,
        )),
        OutputFormat::Mendeley => Box::new(AcademicFormatter::new(
            crate::integrations::academic::AcademicFormat::Mendeley,
        )),
        OutputFormat::Bibtex => Box::new(AcademicFormatter::new(
            crate::integrations::academic::AcademicFormat::BibTex,
        )),
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn create_test_lexical_results() -> Vec<LexicalMatch> {
        vec![
            LexicalMatch::new(
                PathBuf::from("/test/doc1.txt"),
                0.85,
                "This is a test snippet".to_string(),
                2,
                2,
            ),
            LexicalMatch::new(
                PathBuf::from("/test/doc2.txt"),
                0.65,
                "Another test document".to_string(),
                1,
                2,
            ),
        ]
    }

    fn create_test_ranked_results() -> Vec<RankedResult> {
        vec![
            RankedResult::new(
                PathBuf::from("/test/doc1.txt"),
                0.9,
                true,
                ScoreBreakdown {
                    semantic: 0.85,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
            RankedResult::new(
                PathBuf::from("/test/doc2.txt"),
                0.7,
                true,
                ScoreBreakdown {
                    semantic: 0.65,
                    integrity: 1.0,
                    temporal: 0.3,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
        ]
    }

    #[test]
    fn test_output_format_parse() {
        assert_eq!(
            "human".parse::<OutputFormat>().unwrap(),
            OutputFormat::Human
        );
        assert_eq!("json".parse::<OutputFormat>().unwrap(), OutputFormat::Json);
        assert_eq!("csv".parse::<OutputFormat>().unwrap(), OutputFormat::Csv);
        assert_eq!(
            "ripgrep".parse::<OutputFormat>().unwrap(),
            OutputFormat::Ripgrep
        );
        assert_eq!("rg".parse::<OutputFormat>().unwrap(), OutputFormat::Ripgrep);
    }

    #[test]
    fn test_output_format_display() {
        assert_eq!(OutputFormat::Human.to_string(), "human");
        assert_eq!(OutputFormat::Json.to_string(), "json");
    }

    #[test]
    fn test_human_formatter_lexical() {
        let formatter = HumanFormatter::new(false);
        let results = create_test_lexical_results();
        let mut output = Vec::new();

        formatter
            .format_lexical_results(&results, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        assert!(output_str.contains("Quick results"));
        assert!(output_str.contains("doc1.txt"));
    }

    #[test]
    fn test_human_formatter_semantic() {
        let formatter = HumanFormatter::new(false);
        let results = create_test_ranked_results();
        let mut output = Vec::new();

        formatter
            .format_semantic_results(&results, false, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        assert!(output_str.contains("Results"));
        assert!(output_str.contains("doc1.txt"));
    }

    #[test]
    fn test_human_formatter_empty() {
        let formatter = HumanFormatter::new(false);
        let mut output = Vec::new();

        formatter
            .format_semantic_results(&[], false, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        assert!(output_str.contains("No results"));
    }

    #[test]
    fn test_json_formatter_lexical() {
        let formatter = JsonFormatter::new();
        let results = create_test_lexical_results();
        let mut output = Vec::new();

        formatter
            .format_lexical_results(&results, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        let json: serde_json::Value = serde_json::from_str(&output_str).unwrap();

        assert_eq!(json["type"], "lexical");
        assert_eq!(json["count"], 2);
        assert!(json["results"].is_array());
    }

    #[test]
    fn test_json_formatter_semantic() {
        let formatter = JsonFormatter::new();
        let results = create_test_ranked_results();
        let mut output = Vec::new();

        formatter
            .format_semantic_results(&results, true, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        let json: serde_json::Value = serde_json::from_str(&output_str).unwrap();

        assert_eq!(json["type"], "semantic");
        assert!(json["results"][0]["score_breakdown"].is_object());
    }

    #[test]
    fn test_csv_formatter() {
        let formatter = CsvFormatter::new();
        let results = create_test_ranked_results();
        let mut output = Vec::new();

        formatter
            .format_semantic_results(&results, false, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        assert!(output_str.contains("path,score,integrity_verified"));
        assert!(output_str.contains("doc1.txt"));
    }

    #[test]
    fn test_csv_escape() {
        assert_eq!(escape_csv("simple"), "simple");
        assert_eq!(escape_csv("with,comma"), "\"with,comma\"");
        assert_eq!(escape_csv("with\"quote"), "\"with\"\"quote\"");
    }

    #[test]
    fn test_ripgrep_formatter() {
        let formatter = RipgrepFormatter;
        let results = create_test_ranked_results();
        let mut output = Vec::new();

        formatter
            .format_semantic_results(&results, false, &mut output)
            .unwrap();

        let output_str = String::from_utf8(output).unwrap();
        let lines: Vec<&str> = output_str.lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("doc1.txt"));
    }

    #[test]
    fn test_create_formatter() {
        let formatter = create_formatter(OutputFormat::Human, true);
        let mut output = Vec::new();
        formatter.format_complete(&mut output).unwrap();
        assert!(!output.is_empty());
    }
}
