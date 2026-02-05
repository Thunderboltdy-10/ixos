//! Shared types for the ranking module
//!
//! Defines the data structures used by lexical, semantic, and hybrid search engines.

use std::path::PathBuf;

use crate::ixos_rank::evidence::EvidenceTag;

/// Result from lexical (keyword-based) search
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalMatch {
    /// Path to the matched file
    pub path: PathBuf,
    /// Relevance score (e.g., BM25 or TF-IDF)
    pub score: f32,
    /// Snippet of content showing the match
    pub content_snippet: String,
    /// Number of query terms that matched
    pub term_matches: usize,
    /// Total number of query terms
    pub total_terms: usize,
}

impl LexicalMatch {
    /// Create a new lexical match
    pub fn new(path: PathBuf, score: f32, snippet: String, matches: usize, total: usize) -> Self {
        Self {
            path,
            score,
            content_snippet: snippet,
            term_matches: matches,
            total_terms: total,
        }
    }

    /// Get the match ratio (matched terms / total terms)
    pub fn match_ratio(&self) -> f32 {
        if self.total_terms == 0 {
            0.0
        } else {
            (self.term_matches as f32 / self.total_terms as f32).clamp(0.0, 1.0)
        }
    }

    /// Check if this is an exact match (all terms matched)
    pub fn is_exact_match(&self) -> bool {
        self.term_matches == self.total_terms && self.total_terms > 0
    }
}

/// Result from semantic (embedding-based) search
#[derive(Debug, Clone)]
pub struct SemanticMatch {
    /// Path to the matched file
    pub path: PathBuf,
    /// Cosine similarity score [0.0, 1.0]
    pub similarity: f32,
}

impl SemanticMatch {
    /// Create a new semantic match
    pub fn new(path: PathBuf, similarity: f32) -> Self {
        Self { path, similarity }
    }
}

/// Final ranked search result
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// Path to the matched file
    pub path: PathBuf,
    /// Final combined score
    pub score: f32,
    /// Source of the result
    pub source: SearchSource,
}

/// Evidence summary for UI display (optional, top-K only)
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceSummary {
    pub tags: Vec<EvidenceTag>,
    pub explanation: Option<String>,
    pub lexical_hit_count: Option<usize>,
    pub matched_terms: Vec<String>,
    pub semantic_passage: Option<String>,
    pub path_tags: Vec<String>,
    pub file_type: Option<String>,
}

impl SearchResult {
    /// Create a new search result
    pub fn new(path: PathBuf, score: f32, source: SearchSource) -> Self {
        Self {
            path,
            score,
            source,
        }
    }
}

/// Source of a search result
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchSource {
    /// Result came from lexical search only
    Lexical,
    /// Result came from semantic search only
    Semantic,
    /// Result came from hybrid (lexical + semantic) search
    Hybrid,
}

impl std::fmt::Display for SearchSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SearchSource::Lexical => write!(f, "lexical"),
            SearchSource::Semantic => write!(f, "semantic"),
            SearchSource::Hybrid => write!(f, "hybrid"),
        }
    }
}

/// Statistics from lexical search phase for attack detection
#[derive(Debug, Clone)]
pub struct LexicalStats {
    /// Total number of results returned
    pub result_count: usize,
    /// Number of unique query terms
    pub query_term_count: usize,
    /// Average score across results
    pub avg_score: f32,
    /// Degradation score [0.0, 1.0] - higher means worse quality
    pub degradation_score: f32,
}

impl LexicalStats {
    /// Create new lexical stats
    pub fn new(result_count: usize, term_count: usize, avg_score: f32, degradation: f32) -> Self {
        Self {
            result_count,
            query_term_count: term_count,
            avg_score,
            degradation_score: degradation,
        }
    }

    /// Create stats indicating no results
    pub fn empty(term_count: usize) -> Self {
        Self {
            result_count: 0,
            query_term_count: term_count,
            avg_score: 0.0,
            degradation_score: 0.0,
        }
    }

    /// Check if stats indicate a potential attack
    pub fn indicates_attack(&self, result_threshold: usize, degradation_threshold: f32) -> bool {
        self.result_count > result_threshold && self.degradation_score > degradation_threshold
    }
}

/// Errors from search operations
#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("Lexical search failed: {0}")]
    LexicalFailed(String),

    #[error("Semantic search failed: {0}")]
    SemanticFailed(String),

    #[error("Embedding generation failed: {0}")]
    EmbeddingFailed(String),

    #[error("No search results found")]
    NoResults,

    #[error("Search timeout exceeded")]
    Timeout,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lexical_match_ratio() {
        let m = LexicalMatch::new(PathBuf::from("/test"), 0.5, String::new(), 2, 4);
        assert_eq!(m.match_ratio(), 0.5);
    }

    #[test]
    fn test_lexical_match_ratio_clamped_to_one() {
        let m = LexicalMatch::new(PathBuf::from("/test"), 0.5, String::new(), 8, 2);
        assert_eq!(m.match_ratio(), 1.0);
    }

    #[test]
    fn test_lexical_match_exact() {
        let exact = LexicalMatch::new(PathBuf::from("/test"), 1.0, String::new(), 3, 3);
        assert!(exact.is_exact_match());

        let partial = LexicalMatch::new(PathBuf::from("/test"), 0.5, String::new(), 2, 3);
        assert!(!partial.is_exact_match());
    }

    #[test]
    fn test_search_source_display() {
        assert_eq!(format!("{}", SearchSource::Lexical), "lexical");
        assert_eq!(format!("{}", SearchSource::Semantic), "semantic");
        assert_eq!(format!("{}", SearchSource::Hybrid), "hybrid");
    }

    #[test]
    fn test_lexical_stats_indicates_attack() {
        let stats = LexicalStats::new(1500, 3, 0.3, 0.7);
        assert!(stats.indicates_attack(1000, 0.5));

        let normal_stats = LexicalStats::new(500, 3, 0.8, 0.2);
        assert!(!normal_stats.indicates_attack(1000, 0.5));
    }
}
