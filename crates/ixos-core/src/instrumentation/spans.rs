//! Pre-defined tracing spans for consistent instrumentation

use tracing::{span, Level, Span};

/// Span names for all pipeline stages
pub mod span_names {
    pub const SEARCH_TOTAL: &str = "search.total";
    pub const DIRECTORY_WALK: &str = "search.directory_walk";
    pub const PATH_SCORING: &str = "candidate.path_scoring";
    pub const RIPGREP_SCAN: &str = "candidate.ripgrep_scan";
    pub const METADATA_PRIORS: &str = "candidate.metadata_priors";
    pub const CANDIDATE_MERGE: &str = "candidate.merge_and_cap";
    pub const CONTENT_EXTRACTION: &str = "semantic.content_extraction";
    pub const EMBEDDING_BATCH: &str = "semantic.embedding_batch";
    pub const RANKING_FUSION: &str = "semantic.ranking_fusion";
    pub const IPC_SEND: &str = "ipc.send_results";
}

/// Create a span for the total search operation
pub fn search_total_span(query: &str) -> Span {
    span!(Level::INFO, "search.total", query = %query)
}

/// Create a span for directory walking
pub fn directory_walk_span(root: &std::path::Path) -> Span {
    span!(Level::INFO, "search.directory_walk", root = %root.display())
}

/// Create a span for path/filename scoring
pub fn path_scoring_span(num_paths: usize) -> Span {
    span!(Level::INFO, "candidate.path_scoring", num_paths = %num_paths)
}

/// Create a span for ripgrep scanning
pub fn ripgrep_scan_span(query: &str) -> Span {
    span!(Level::INFO, "candidate.ripgrep_scan", query = %query)
}

/// Create a span for metadata priors application
pub fn metadata_priors_span(num_candidates: usize) -> Span {
    span!(Level::INFO, "candidate.metadata_priors", num_candidates = %num_candidates)
}

/// Create a span for candidate merging and capping
pub fn candidate_merge_span(path_count: usize, ripgrep_count: usize) -> Span {
    span!(
        Level::INFO,
        "candidate.merge_and_cap",
        path_count = %path_count,
        ripgrep_count = %ripgrep_count
    )
}

/// Create a span for content extraction
pub fn content_extraction_span(path: &std::path::Path) -> Span {
    span!(Level::DEBUG, "semantic.content_extraction", path = %path.display())
}

/// Create a span for batch embedding
pub fn embedding_batch_span(batch_size: usize, batch_num: usize) -> Span {
    span!(
        Level::INFO,
        "semantic.embedding_batch",
        batch_size = %batch_size,
        batch_num = %batch_num
    )
}

/// Create a span for ranking/score fusion
pub fn ranking_fusion_span(num_results: usize) -> Span {
    span!(Level::INFO, "semantic.ranking_fusion", num_results = %num_results)
}

/// Create a span for IPC/result sending
pub fn ipc_send_span(batch_num: usize, result_count: usize) -> Span {
    span!(
        Level::DEBUG,
        "ipc.send_results",
        batch_num = %batch_num,
        result_count = %result_count
    )
}
