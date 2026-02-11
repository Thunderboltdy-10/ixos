//! Snippet extraction and highlighting for search results
//!
//! Provides context extraction around matched content with term highlighting.
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::ixos_rank::snippet::{extract_context, ContextSnippet};
//! use std::path::Path;
//!
//! let snippet = extract_context(
//!     Path::new("document.txt"),
//!     "medical treatment",
//!     3,  // lines of context
//! );
//!
//! if let Some(ctx) = snippet {
//!     println!("Match at line {}", ctx.line_number);
//!     for line in &ctx.matched {
//!         println!("  > {}", line);
//!     }
//! }
//! ```

use std::path::Path;

/// Context snippet showing match location with surrounding lines
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextSnippet {
    /// Line number where match starts (1-indexed)
    pub line_number: usize,
    /// Lines before the match
    pub before: Vec<String>,
    /// The matching line(s) with highlighted terms
    pub matched: Vec<String>,
    /// Lines after the match
    pub after: Vec<String>,
    /// Raw matched line (without highlighting)
    pub raw_matched: String,
}

impl ContextSnippet {
    /// Create an empty context snippet
    pub fn empty() -> Self {
        Self::default()
    }

    /// Create a context snippet with all fields
    pub fn new(
        line_number: usize,
        before: Vec<String>,
        matched: Vec<String>,
        after: Vec<String>,
        raw_matched: String,
    ) -> Self {
        Self {
            line_number,
            before,
            matched,
            after,
            raw_matched,
        }
    }

    /// Check if this snippet is empty (no match found)
    pub fn is_empty(&self) -> bool {
        self.matched.is_empty()
    }
}

/// ANSI color codes for terminal highlighting
pub mod colors {
    /// Bold yellow for matched terms
    pub const HIGHLIGHT: &str = "\x1b[1;33m";
    /// Reset to default
    pub const RESET: &str = "\x1b[0m";
    /// Dim gray for context lines
    pub const DIM: &str = "\x1b[2m";
    /// Cyan for line numbers
    pub const LINE_NUM: &str = "\x1b[36m";
    /// Green for match indicator
    pub const MATCH_INDICATOR: &str = "\x1b[32m";
}

/// Extract context around the best matching line in a file
///
/// # Arguments
/// * `file_path` - Path to the file
/// * `query` - Search query
/// * `context_lines` - Number of lines to show before and after match
///
/// # Returns
/// `Some(ContextSnippet)` if a match was found, `None` otherwise
pub fn extract_context(
    file_path: &Path,
    query: &str,
    context_lines: usize,
) -> Option<ContextSnippet> {
    // SECURITY: Check if this is a cloud-only file to prevent auto-download
    use crate::storage::cloud_detection::should_skip_cloud_file;
    if should_skip_cloud_file(file_path) {
        return None;
    }

    // Read file content
    let content = match std::fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return None,
    };

    extract_context_from_string(&content, query, context_lines)
}

/// Extract context from a string (for testing and reuse)
pub fn extract_context_from_string(
    content: &str,
    query: &str,
    context_lines: usize,
) -> Option<ContextSnippet> {
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() {
        return None;
    }

    // Parse query into terms
    let query_terms: Vec<&str> = query
        .split_whitespace()
        .filter(|t| t.len() >= 2) // Skip very short terms
        .collect();

    if query_terms.is_empty() {
        return None;
    }

    // Find the best matching line
    let (best_line_idx, best_score) = find_best_match_line(&lines, &query_terms);

    if best_score == 0 {
        // No matches found, return first line as context
        let matched = vec![lines.first()?.to_string()];
        let after: Vec<String> = lines
            .iter()
            .skip(1)
            .take(context_lines)
            .map(|s| s.to_string())
            .collect();

        return Some(ContextSnippet::new(
            1,
            vec![],
            matched.clone(),
            after,
            matched.first().cloned().unwrap_or_default(),
        ));
    }

    // Extract context around the best match
    let start = best_line_idx.saturating_sub(context_lines);
    let end = (best_line_idx + context_lines + 1).min(lines.len());

    let before: Vec<String> = lines[start..best_line_idx]
        .iter()
        .map(|s| s.to_string())
        .collect();

    let raw_matched = lines[best_line_idx].to_string();
    let highlighted = highlight_terms(lines[best_line_idx], &query_terms, true);
    let matched = vec![highlighted];

    let after: Vec<String> = lines[best_line_idx + 1..end]
        .iter()
        .map(|s| s.to_string())
        .collect();

    Some(ContextSnippet::new(
        best_line_idx + 1, // 1-indexed
        before,
        matched,
        after,
        raw_matched,
    ))
}

/// Find the line with the best match score
///
/// Returns (line_index, score) where score is number of matching terms
fn find_best_match_line(lines: &[&str], query_terms: &[&str]) -> (usize, usize) {
    let mut best_idx = 0;
    let mut best_score = 0;

    for (idx, line) in lines.iter().enumerate() {
        let line_lower = line.to_lowercase();
        let score = query_terms
            .iter()
            .filter(|term| line_lower.contains(&term.to_lowercase()))
            .count();

        if score > best_score {
            best_score = score;
            best_idx = idx;
        }
    }

    (best_idx, best_score)
}

use regex::RegexBuilder;

/// Highlight query terms in text with ANSI colors
///
/// # Arguments
/// * `text` - The text to highlight
/// * `terms` - Query terms to highlight
/// * `use_color` - Whether to use ANSI color codes
///
/// # Returns
/// Text with highlighted terms
pub fn highlight_terms(text: &str, terms: &[&str], use_color: bool) -> String {
    if !use_color || terms.is_empty() {
        return text.to_string();
    }

    // Escape terms to be safe for regex
    let escaped_terms: Vec<String> = terms.iter().map(|t| regex::escape(t)).collect();
    let pattern = escaped_terms.join("|");

    let re = match RegexBuilder::new(&pattern).case_insensitive(true).build() {
        Ok(re) => re,
        Err(_) => return text.to_string(),
    };

    let mut result = String::new();
    let mut last_end = 0;

    for mat in re.find_iter(text) {
        let start = mat.start();
        let end = mat.end();

        // Append text before match
        result.push_str(&text[last_end..start]);

        // Append highlighted match
        result.push_str(colors::HIGHLIGHT);
        result.push_str(&text[start..end]);
        result.push_str(colors::RESET);

        last_end = end;
    }

    // Append remaining text
    result.push_str(&text[last_end..]);
    result
}

/// Format a context snippet for human-readable output
///
/// # Arguments
/// * `snippet` - The context snippet to format
/// * `use_color` - Whether to use ANSI color codes
///
/// # Returns
/// Formatted string with line numbers and context
pub fn format_snippet(snippet: &ContextSnippet, use_color: bool) -> String {
    if snippet.is_empty() {
        return String::new();
    }

    let mut output = String::new();
    let line_num_width = (snippet.line_number + snippet.after.len())
        .to_string()
        .len();

    // Before lines
    for (i, line) in snippet.before.iter().enumerate() {
        let line_num = snippet.line_number - snippet.before.len() + i;
        if use_color {
            output.push_str(&format!(
                "   {}{:>width$}{} │ {}{}{}\n",
                colors::LINE_NUM,
                line_num,
                colors::RESET,
                colors::DIM,
                line,
                colors::RESET,
                width = line_num_width
            ));
        } else {
            output.push_str(&format!(
                "   {:>width$} │ {}\n",
                line_num,
                line,
                width = line_num_width
            ));
        }
    }

    // Matched line(s)
    for (i, line) in snippet.matched.iter().enumerate() {
        let line_num = snippet.line_number + i;
        if use_color {
            output.push_str(&format!(
                "  {}{}{}{:>width$}{} │ {}\n",
                colors::MATCH_INDICATOR,
                "▸",
                colors::LINE_NUM,
                line_num,
                colors::RESET,
                line,
                width = line_num_width
            ));
        } else {
            output.push_str(&format!(
                "  ▸{:>width$} │ {}\n",
                line_num,
                line,
                width = line_num_width
            ));
        }
    }

    // After lines
    for (i, line) in snippet.after.iter().enumerate() {
        let line_num = snippet.line_number + snippet.matched.len() + i;
        if use_color {
            output.push_str(&format!(
                "   {}{:>width$}{} │ {}{}{}\n",
                colors::LINE_NUM,
                line_num,
                colors::RESET,
                colors::DIM,
                line,
                colors::RESET,
                width = line_num_width
            ));
        } else {
            output.push_str(&format!(
                "   {:>width$} │ {}\n",
                line_num,
                line,
                width = line_num_width
            ));
        }
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_context_basic() {
        let content = "line 1\nline 2\nmedical treatment here\nline 4\nline 5";
        let snippet = extract_context_from_string(content, "medical treatment", 1).unwrap();

        assert_eq!(snippet.line_number, 3);
        assert_eq!(snippet.before.len(), 1);
        assert_eq!(snippet.after.len(), 1);
        assert!(snippet.matched[0].contains("medical"));
    }

    #[test]
    fn test_extract_context_at_start() {
        let content = "medical treatment here\nline 2\nline 3";
        let snippet = extract_context_from_string(content, "medical", 2).unwrap();

        assert_eq!(snippet.line_number, 1);
        assert_eq!(snippet.before.len(), 0);
        assert_eq!(snippet.after.len(), 2);
    }

    #[test]
    fn test_extract_context_at_end() {
        let content = "line 1\nline 2\nmedical treatment here";
        let snippet = extract_context_from_string(content, "medical", 2).unwrap();

        assert_eq!(snippet.line_number, 3);
        assert_eq!(snippet.before.len(), 2);
        assert_eq!(snippet.after.len(), 0);
    }

    #[test]
    fn test_highlight_terms() {
        let text = "This is a medical treatment document";
        let terms = vec!["medical", "treatment"];
        let highlighted = highlight_terms(text, &terms, true);

        assert!(highlighted.contains(colors::HIGHLIGHT));
        assert!(highlighted.contains(colors::RESET));
    }

    #[test]
    fn test_highlight_terms_no_color() {
        let text = "This is a medical treatment document";
        let terms = vec!["medical", "treatment"];
        let highlighted = highlight_terms(text, &terms, false);

        assert_eq!(highlighted, text);
    }

    #[test]
    fn test_highlight_case_insensitive() {
        let text = "Medical Treatment in MEDICAL care";
        let terms = vec!["medical"];
        let highlighted = highlight_terms(text, &terms, true);

        // Should highlight both occurrences
        let highlight_count = highlighted.matches(colors::HIGHLIGHT).count();
        assert_eq!(highlight_count, 2);
    }

    #[test]
    fn test_empty_content() {
        let snippet = extract_context_from_string("", "query", 3);
        assert!(snippet.is_none());
    }

    #[test]
    fn test_no_match_returns_first_line() {
        let content = "line 1\nline 2\nline 3";
        let snippet = extract_context_from_string(content, "xyz", 1).unwrap();

        assert_eq!(snippet.line_number, 1);
        assert_eq!(snippet.matched[0], "line 1");
    }

    #[test]
    fn test_format_snippet() {
        let snippet = ContextSnippet::new(
            5,
            vec!["before 1".to_string(), "before 2".to_string()],
            vec!["matched line".to_string()],
            vec!["after 1".to_string()],
            "matched line".to_string(),
        );

        let formatted = format_snippet(&snippet, false);
        assert!(formatted.contains("before 1"));
        assert!(formatted.contains("matched line"));
        assert!(formatted.contains("after 1"));
        assert!(formatted.contains("▸")); // Match indicator
    }

    #[test]
    fn test_context_snippet_is_empty() {
        let empty = ContextSnippet::empty();
        assert!(empty.is_empty());

        let with_match = ContextSnippet::new(
            1,
            vec![],
            vec!["match".to_string()],
            vec![],
            "match".to_string(),
        );
        assert!(!with_match.is_empty());
    }
}
