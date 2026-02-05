//! P5: Document-Aware Candidate Generator
//!
//! Extracts text from binary document formats (PDF, DOCX, XLSX, PPTX) and performs
//! BM25 search on extracted content. This engine handles files that ripgrep cannot
//! search because they use non-UTF8 binary formats.
//!
//! Key design decisions:
//! - **On-demand extraction**: Text is extracted during search, not pre-indexed
//!   (aligns with JIT privacy philosophy - no persistent cache of document contents)
//! - **Memory-only caching**: Extracted text is cached only within a single search session
//! - **Parallel extraction**: Uses rayon for parallel document processing on large sets

use super::path_engine::HARDCODED_SKIP_DIRS;
use super::scorer::{CandidateSource, MatchContext, ScoredCandidate};
use crate::parsers;
use ignore::WalkBuilder;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

/// Document extensions that require special parsing (binary formats)
const DOCUMENT_EXTENSIONS: &[&str] = &["pdf", "docx", "xlsx", "xls", "pptx", "rtf"];

/// Maximum bytes to read from document files
const MAX_DOCUMENT_BYTES: usize = 10 * 1024 * 1024; // 10MB

/// Maximum characters to extract from documents
const MAX_DOCUMENT_CHARS: usize = 100_000;

/// Hard limit on documents to process
const MAX_DOCUMENTS_TO_SEARCH: usize = 500;

/// Timeout for document search phase
const DOCUMENT_SEARCH_TIMEOUT_MS: u64 = 5000;

/// Configuration for document engine
#[derive(Debug, Clone)]
pub struct DocumentEngineConfig {
    /// Maximum bytes to read per document
    pub max_bytes: usize,
    /// Maximum characters after extraction
    pub max_chars: usize,
    /// Maximum documents to process
    pub max_documents: usize,
    /// Timeout in milliseconds
    pub timeout_ms: u64,
    /// Whether to respect .gitignore
    pub respect_gitignore: bool,
}

impl Default for DocumentEngineConfig {
    fn default() -> Self {
        Self {
            max_bytes: MAX_DOCUMENT_BYTES,
            max_chars: MAX_DOCUMENT_CHARS,
            max_documents: MAX_DOCUMENTS_TO_SEARCH,
            timeout_ms: DOCUMENT_SEARCH_TIMEOUT_MS,
            respect_gitignore: true,
        }
    }
}

/// Statistics from document search
#[derive(Debug, Clone, Default)]
pub struct DocumentSearchStats {
    /// Number of documents found
    pub documents_found: usize,
    /// Number of documents successfully extracted
    pub documents_extracted: usize,
    /// Number of documents that matched
    pub documents_matched: usize,
    /// Time taken in milliseconds
    pub duration_ms: u64,
    /// Whether search was truncated due to timeout or limit
    pub truncated: bool,
}

/// Document-aware candidate generator for binary file formats
pub struct DocumentEngine {
    root_dir: PathBuf,
    config: DocumentEngineConfig,
    /// Session-local cache of extracted text (path -> extracted text)
    /// This is cleared after each search session
    extraction_cache: HashMap<PathBuf, String>,
}

impl DocumentEngine {
    /// Create a new document engine for a directory
    pub fn new(root_dir: PathBuf, config: DocumentEngineConfig) -> Self {
        Self {
            root_dir,
            config,
            extraction_cache: HashMap::new(),
        }
    }

    /// Create with default config
    pub fn with_defaults(root_dir: PathBuf) -> Self {
        Self::new(root_dir, DocumentEngineConfig::default())
    }

    /// Search documents for matching content
    ///
    /// This method:
    /// 1. Walks the directory to find document files
    /// 2. Extracts text from each document (on-demand)
    /// 3. Performs BM25-style search on extracted text
    /// 4. Returns scored candidates
    pub fn search(&mut self, query: &str) -> (Vec<ScoredCandidate>, DocumentSearchStats) {
        let start = Instant::now();
        let deadline = start + Duration::from_millis(self.config.timeout_ms);
        let mut stats = DocumentSearchStats::default();

        // Tokenize query for BM25 matching
        let query_terms = Self::tokenize_query(query);
        if query_terms.is_empty() {
            return (Vec::new(), stats);
        }

        // Find all document files
        let documents = self.collect_documents();
        stats.documents_found = documents.len();

        if documents.is_empty() {
            stats.duration_ms = start.elapsed().as_millis() as u64;
            return (Vec::new(), stats);
        }

        let mut candidates = Vec::new();

        // Process documents (with limit and timeout)
        for (idx, doc_path) in documents.iter().enumerate() {
            // Check limits
            if idx >= self.config.max_documents {
                stats.truncated = true;
                break;
            }

            // Check timeout
            if Instant::now() > deadline {
                stats.truncated = true;
                break;
            }

            // Extract text from document
            let text = match self.extract_text(doc_path) {
                Some(t) => t,
                None => continue,
            };
            stats.documents_extracted += 1;

            // Search for query terms in extracted text
            if let Some(candidate) = self.score_document(doc_path, &text, &query_terms) {
                stats.documents_matched += 1;
                candidates.push(candidate);
            }
        }

        // Sort by score
        candidates.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        stats.duration_ms = start.elapsed().as_millis() as u64;
        (candidates, stats)
    }

    /// Clear the session-local extraction cache
    ///
    /// Call this after each search session to free memory and ensure
    /// privacy (no persistent cache of document contents)
    pub fn clear_cache(&mut self) {
        self.extraction_cache.clear();
    }

    /// Collect all document files in the directory
    fn collect_documents(&self) -> Vec<PathBuf> {
        let mut documents = Vec::new();

        let mut builder = WalkBuilder::new(&self.root_dir);
        builder
            .hidden(true) // Skip hidden files
            .git_ignore(self.config.respect_gitignore)
            .follow_links(false)
            .max_filesize(Some(self.config.max_bytes as u64));

        // Skip hardcoded directories
        let root = self.root_dir.clone();
        builder.filter_entry(move |entry| {
            let path = entry.path();
            if path == root {
                return true;
            }
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if HARDCODED_SKIP_DIRS.contains(&name_str.as_ref()) {
                    return false;
                }
            }
            true
        });

        for entry in builder.build().flatten() {
            let path = entry.path();

            // Skip directories
            if path.is_dir() {
                continue;
            }

            // Check if it's a document file
            if self.is_document_file(path) {
                documents.push(path.to_path_buf());
            }
        }

        documents
    }

    /// Check if a file is a document that needs special parsing
    fn is_document_file(&self, path: &Path) -> bool {
        let ext = match path.extension() {
            Some(e) => e.to_string_lossy().to_lowercase(),
            None => return false,
        };

        DOCUMENT_EXTENSIONS.contains(&ext.as_str())
    }

    /// Extract text from a document file
    ///
    /// Uses session-local caching to avoid re-extracting the same document
    fn extract_text(&mut self, path: &Path) -> Option<String> {
        // Check cache first
        if let Some(cached) = self.extraction_cache.get(path) {
            return Some(cached.clone());
        }

        // Extract text using the parsers module
        let text = parsers::extract_text(path, self.config.max_bytes, self.config.max_chars)?;

        // Cache the extracted text for this session
        self.extraction_cache
            .insert(path.to_path_buf(), text.clone());

        Some(text)
    }

    /// Score a document based on query term matches
    fn score_document(
        &self,
        path: &Path,
        text: &str,
        query_terms: &[String],
    ) -> Option<ScoredCandidate> {
        let text_lower = text.to_lowercase();

        // Count term occurrences
        let mut total_matches = 0;
        let mut terms_found = 0;
        let mut first_match_snippet: Option<String> = None;

        for term in query_terms {
            let count = text_lower.matches(term.as_str()).count();
            if count > 0 {
                total_matches += count;
                terms_found += 1;

                // Capture first match as snippet
                if first_match_snippet.is_none() {
                    first_match_snippet = self.extract_snippet(&text_lower, term);
                }
            }
        }

        // No matches
        if total_matches == 0 {
            return None;
        }

        // Calculate BM25-inspired score
        let score =
            self.calculate_bm25_score(total_matches, terms_found, query_terms.len(), text.len());

        let context = MatchContext {
            line_numbers: Vec::new(), // Documents don't have meaningful line numbers
            match_count: total_matches,
            snippet: first_match_snippet,
        };

        let mut candidate =
            ScoredCandidate::from_ripgrep_hit(path.to_path_buf(), score, Some(context));
        candidate.source = CandidateSource::RipgrepHit; // Reuse ripgrep source type for documents

        Some(candidate)
    }

    /// Calculate BM25-style score
    fn calculate_bm25_score(
        &self,
        total_matches: usize,
        terms_found: usize,
        total_terms: usize,
        doc_length: usize,
    ) -> f32 {
        // BM25 parameters
        const K1: f32 = 1.2;
        const B: f32 = 0.75;
        const AVG_DOC_LEN: f32 = 5000.0; // Assumed average document length

        // Term frequency saturation
        let tf = total_matches as f32;
        let length_norm = 1.0 - B + B * (doc_length as f32 / AVG_DOC_LEN);
        let tf_score = (tf * (K1 + 1.0)) / (tf + K1 * length_norm);

        // Coverage boost (how many query terms were found)
        let coverage = terms_found as f32 / total_terms as f32;

        // Combine scores and normalize to [0, 1]
        let raw_score = tf_score * (0.5 + 0.5 * coverage);
        raw_score.min(1.0)
    }

    /// Extract a snippet around the first occurrence of a term
    fn extract_snippet(&self, text: &str, term: &str) -> Option<String> {
        let pos = text.find(term)?;

        // Get context around the match (up to 100 chars on each side)
        let start = pos.saturating_sub(100);
        let end = (pos + term.len() + 100).min(text.len());

        // Find word boundaries
        let snippet_start = text[start..pos]
            .rfind(char::is_whitespace)
            .map(|i| start + i + 1)
            .unwrap_or(start);
        let snippet_end = text[pos..end]
            .find(char::is_whitespace)
            .map(|i| pos + i)
            .unwrap_or(end);

        let snippet = text[snippet_start..snippet_end].trim();

        if snippet.len() > 200 {
            Some(format!("{}...", &snippet[..200]))
        } else {
            Some(snippet.to_string())
        }
    }

    /// Tokenize query into search terms
    fn tokenize_query(query: &str) -> Vec<String> {
        query
            .to_lowercase()
            .split(|c: char| !c.is_alphanumeric())
            .filter(|s| s.len() >= 2)
            .map(String::from)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_is_document_file() {
        let engine = DocumentEngine::with_defaults(PathBuf::from("."));

        assert!(engine.is_document_file(Path::new("test.pdf")));
        assert!(engine.is_document_file(Path::new("test.docx")));
        assert!(engine.is_document_file(Path::new("test.xlsx")));
        assert!(engine.is_document_file(Path::new("test.pptx")));
        assert!(engine.is_document_file(Path::new("test.rtf")));

        assert!(!engine.is_document_file(Path::new("test.txt")));
        assert!(!engine.is_document_file(Path::new("test.rs")));
        assert!(!engine.is_document_file(Path::new("test.js")));
    }

    #[test]
    fn test_tokenize_query() {
        let tokens = DocumentEngine::tokenize_query("hello world test");
        assert_eq!(tokens, vec!["hello", "world", "test"]);

        let tokens2 = DocumentEngine::tokenize_query("PDF document search");
        assert_eq!(tokens2, vec!["pdf", "document", "search"]);
    }

    #[test]
    fn test_empty_query() {
        let mut engine = DocumentEngine::with_defaults(PathBuf::from("."));
        let (candidates, stats) = engine.search("");
        assert!(candidates.is_empty());
        assert_eq!(stats.documents_found, 0);
    }

    #[test]
    fn test_bm25_score_calculation() {
        let engine = DocumentEngine::with_defaults(PathBuf::from("."));

        // High match count should give higher score
        let score_high = engine.calculate_bm25_score(10, 3, 3, 1000);
        let score_low = engine.calculate_bm25_score(1, 1, 3, 1000);
        assert!(score_high > score_low);

        // Score should be capped at 1.0
        let score_max = engine.calculate_bm25_score(1000, 10, 10, 100);
        assert!(score_max <= 1.0);
    }

    #[test]
    fn test_search_no_documents() {
        let temp = TempDir::new().unwrap();

        // Create non-document files
        std::fs::write(temp.path().join("test.txt"), "hello world").unwrap();
        std::fs::write(temp.path().join("test.rs"), "fn main() {}").unwrap();

        let mut engine = DocumentEngine::with_defaults(temp.path().to_path_buf());
        let (candidates, stats) = engine.search("hello");

        assert!(candidates.is_empty());
        assert_eq!(stats.documents_found, 0);
    }
}
