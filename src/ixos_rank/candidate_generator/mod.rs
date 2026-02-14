//! P2: Candidate Generation
//!
//! The unified candidate generator that enforces all hard caps.
//! This is the backbone of the search pipeline - it ensures we NEVER
//! embed more than MAX_CANDIDATES_FOR_EMBEDDING files per query.
//!
//! ## Pipeline
//!
//! 1. **Path Scoring** (instant, ~10ms for 30k files)
//!    - Uses in-memory PathIndex for BM25-ish scoring
//!    - No disk I/O - only path strings
//!
//! 2. **Ripgrep Scan** (streamed, capped at RIPGREP_MAX_HITS)
//!    - Content-based search with hard timeout
//!    - Stops early if max hits reached
//!
//! 3. **Merge & Deduplicate**
//!    - Combine candidates from both sources
//!    - Boost files that appear in multiple sources
//!
//! 4. **Apply Priors**
//!    - Recency boost (mtime)
//!    - Hot folder boost
//!    - File type prior
//!
//! 5. **HARD CAP** (non-negotiable)
//!    - Truncate to MAX_CANDIDATES_FOR_EMBEDDING
//!
//! ## Hard Limits
//!
//! These are **laws**, not guidelines:
//! - `MAX_CANDIDATES_FOR_EMBEDDING = 3000`
//! - `MAX_BYTES_READ_PER_FILE = 64KB`
//! - `MAX_TEXT_CHARS_PER_FILE = 20,000`

pub mod document_engine;
pub mod metadata_priors;
pub mod path_engine;
pub mod query_preprocess;
pub mod ripgrep_funnel;
pub mod scorer;

pub use document_engine::{DocumentEngine, DocumentEngineConfig, DocumentSearchStats};
pub use metadata_priors::{MetadataPriors, PriorScores, PriorWeights};
pub use path_engine::{PathIndex, PathIndexConfig, PathMetadata, HARDCODED_SKIP_DIRS};
pub use query_preprocess::{ProcessedQuery, QueryPreprocessConfig, QueryPreprocessor};
pub use ripgrep_funnel::{RipgrepFunnel, RipgrepFunnelConfig, RipgrepStats, TerminationReason};
pub use scorer::{
    CandidateScoreBreakdown, CandidateSet, CandidateSource, CandidateStats, MatchContext,
    ScoreWeights, ScoredCandidate,
};

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::ixos_rank::ask_mode::{AnchorTerm, QueryMode};
use crate::journalist_mode::deep_search_overrides;

use crate::instrumentation::{
    candidate_merge_span, directory_walk_span, metadata_priors_span, path_scoring_span,
    ripgrep_scan_span,
};

// ============================================================================
// HARD CAPS - These are NON-NEGOTIABLE
// ============================================================================

/// Maximum candidates to pass to embedding phase
/// This is the PRIMARY safeguard against 40s searches
pub const MAX_CANDIDATES_FOR_EMBEDDING: usize = 3000;

/// Maximum bytes to read per file in hot path
pub const MAX_BYTES_READ_PER_FILE: usize = 64 * 1024; // 64KB

/// Maximum text characters per file after extraction
pub const MAX_TEXT_CHARS_PER_FILE: usize = 20_000;

/// Batch flush interval for streaming (milliseconds)
pub const BATCH_FLUSH_INTERVAL_MS: u64 = 50;

/// Batch size threshold for streaming
pub const BATCH_SIZE_THRESHOLD: usize = 20;

/// Document formats supported by DocumentEngine.
const DOCUMENT_EXTENSIONS: &[&str] = &["pdf", "docx", "xlsx", "xls", "pptx", "rtf"];

/// Query terms that strongly indicate binary document search intent.
const DOCUMENT_QUERY_TERMS: &[&str] = &[
    "pdf",
    "docx",
    "xlsx",
    "xls",
    "pptx",
    "ppt",
    "rtf",
    "word",
    "excel",
    "powerpoint",
    "presentation",
    "spreadsheet",
    "slide",
    "slides",
];

/// Number of high-rank path candidates to inspect for document signals.
const DOCUMENT_PATH_SIGNAL_SAMPLE: usize = 64;

// ============================================================================
// CandidateGenerator
// ============================================================================

/// Configuration for the candidate generator
#[derive(Debug, Clone)]
pub struct CandidateGeneratorConfig {
    /// Path index configuration
    pub path_config: PathIndexConfig,
    /// Ripgrep funnel configuration
    pub ripgrep_config: RipgrepFunnelConfig,
    /// Metadata priors
    pub priors: MetadataPriors,
    /// Score weights for combining different signals
    pub weights: ScoreWeights,
    /// Maximum candidates (cannot exceed MAX_CANDIDATES_FOR_EMBEDDING)
    pub max_candidates: usize,
    /// Whether to run path scoring
    pub enable_path_scoring: bool,
    /// Whether to run ripgrep
    pub enable_ripgrep: bool,
}

impl Default for CandidateGeneratorConfig {
    fn default() -> Self {
        Self {
            path_config: PathIndexConfig::default(),
            ripgrep_config: RipgrepFunnelConfig::default(),
            priors: MetadataPriors::default(),
            weights: ScoreWeights::default(),
            max_candidates: MAX_CANDIDATES_FOR_EMBEDDING,
            enable_path_scoring: true,
            enable_ripgrep: true,
        }
    }
}

/// The unified candidate generator - enforces all hard caps
pub struct CandidateGenerator {
    /// Root directory for search
    root_dir: PathBuf,
    /// Configuration
    config: CandidateGeneratorConfig,
    /// Path index (built lazily)
    path_index: Option<Arc<PathIndex>>,
    /// Ripgrep funnel
    ripgrep: RipgrepFunnel,
    /// Document engine for binary files (PDF, DOCX, etc.)
    document_engine: DocumentEngine,
    /// Query preprocessor (typos + synonyms)
    preprocessor: QueryPreprocessor,
    /// Last directory walk/index build duration
    last_index_build_ms: u64,
}

struct CachedIndex {
    index: Arc<PathIndex>,
    file_list: Vec<PathBuf>,
    built_at: Instant,
}

const INDEX_CACHE_TTL_SECS: u64 = 300;

static INDEX_CACHE: OnceLock<Mutex<HashMap<PathBuf, CachedIndex>>> = OnceLock::new();

impl CandidateGenerator {
    /// Create a new candidate generator for a directory
    pub fn new(root_dir: PathBuf, config: CandidateGeneratorConfig) -> Self {
        let ripgrep = RipgrepFunnel::new(root_dir.clone(), config.ripgrep_config.clone());
        let document_engine = DocumentEngine::with_defaults(root_dir.clone());

        Self {
            root_dir,
            config,
            path_index: None,
            ripgrep,
            document_engine,
            preprocessor: QueryPreprocessor::with_defaults(),
            last_index_build_ms: 0,
        }
    }

    /// Create with default configuration
    pub fn with_defaults(root_dir: PathBuf) -> Self {
        Self::new(root_dir, CandidateGeneratorConfig::default())
    }

    /// Build or rebuild the path index
    ///
    /// P5 optimization: Also updates RipgrepFunnel with the file list
    /// to skip redundant directory walking during search.
    pub fn build_index(&mut self) {
        let cache_key = self
            .root_dir
            .canonicalize()
            .unwrap_or(self.root_dir.clone());
        let cache = INDEX_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
        {
            let cache_guard = cache.lock().unwrap();
            if let Some(entry) = cache_guard.get(&cache_key) {
                if entry.built_at.elapsed() < Duration::from_secs(INDEX_CACHE_TTL_SECS) {
                    self.path_index = Some(Arc::clone(&entry.index));
                    self.ripgrep.set_cached_file_list(entry.file_list.clone());
                    self.last_index_build_ms = 0;
                    return;
                }
            }
        }

        let start = Instant::now();
        let _span = directory_walk_span(&self.root_dir);
        let _enter = _span.enter();
        let index = PathIndex::build_from_walk(&self.root_dir, &self.config.path_config);
        let build_ms = start.elapsed().as_millis() as u64;
        self.last_index_build_ms = build_ms;

        // P5 optimization: Share file list with ripgrep funnel
        let file_paths = index.get_file_paths();
        self.ripgrep.set_cached_file_list(file_paths.clone());

        let index = Arc::new(index);
        self.path_index = Some(Arc::clone(&index));

        let mut cache_guard = cache.lock().unwrap();
        cache_guard.insert(
            cache_key,
            CachedIndex {
                index,
                file_list: file_paths,
                built_at: Instant::now(),
            },
        );
    }

    /// Ensure path index is built
    fn ensure_index(&mut self) {
        if self.path_index.is_none() {
            self.build_index();
        }
    }

    /// Gate expensive document parsing so code-only queries stay fast.
    fn should_search_documents(
        &self,
        lexical_query: &str,
        path_candidates: &[ScoredCandidate],
    ) -> bool {
        if Self::query_has_document_intent(lexical_query) {
            return true;
        }

        Self::path_candidates_include_document(path_candidates)
    }

    fn query_has_document_intent(query: &str) -> bool {
        let lower = query.to_ascii_lowercase();
        for raw in lower.split_whitespace() {
            let token =
                raw.trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != ':' && c != '.');
            if token.is_empty() {
                continue;
            }

            if let Some(ext) = token.strip_prefix("ext:") {
                let ext = ext.trim_start_matches('.');
                if Self::is_document_extension(ext) {
                    return true;
                }
            }

            if DOCUMENT_QUERY_TERMS.contains(&token) {
                return true;
            }
        }

        false
    }

    fn path_candidates_include_document(path_candidates: &[ScoredCandidate]) -> bool {
        path_candidates
            .iter()
            .take(DOCUMENT_PATH_SIGNAL_SAMPLE)
            .any(|candidate| {
                candidate
                    .path
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .is_some_and(Self::is_document_extension)
            })
    }

    fn is_document_extension(ext: &str) -> bool {
        DOCUMENT_EXTENSIONS
            .iter()
            .any(|document_ext| ext.eq_ignore_ascii_case(document_ext))
    }

    /// Generate candidates with HARD CAP enforcement
    ///
    /// This is the core function that ensures we NEVER exceed MAX_CANDIDATES_FOR_EMBEDDING.
    pub fn generate(&mut self, query: &str) -> CandidateSet {
        let start = Instant::now();
        let mut stats = CandidateStats::default();

        let processed = self.preprocessor.preprocess(query);
        let lexical_query = processed.expanded_query;

        // Phase 1: Path scoring (instant, no disk I/O)
        let path_start = Instant::now();
        let path_candidates = if self.config.enable_path_scoring {
            let path_count = self.path_index.as_ref().map(|idx| idx.len()).unwrap_or(0);
            let _span = path_scoring_span(path_count);
            let _enter = _span.enter();
            self.ensure_index();
            stats.directory_walk_ms = self.last_index_build_ms;
            let candidates = self
                .path_index
                .as_ref()
                .map(|idx| {
                    stats.paths_scanned = idx.len();
                    idx.score(&lexical_query, self.config.max_candidates * 2)
                })
                .unwrap_or_default();
            stats.path_candidates = candidates.len();
            candidates
        } else {
            Vec::new()
        };
        stats.path_scoring_ms = path_start.elapsed().as_millis() as u64;

        // Phase 2: Ripgrep scan (capped)
        let ripgrep_start = Instant::now();
        let (ripgrep_candidates, ripgrep_stats) = if self.config.enable_ripgrep {
            let _span = ripgrep_scan_span(&lexical_query);
            let _enter = _span.enter();
            self.ripgrep.search_capped(&lexical_query)
        } else {
            (Vec::new(), RipgrepStats::default())
        };
        stats.ripgrep_candidates = ripgrep_candidates.len();
        stats.ripgrep_capped = ripgrep_stats.terminated_by == TerminationReason::MaxHitsReached;
        stats.ripgrep_ms = ripgrep_start.elapsed().as_millis() as u64;

        // Phase 2.5: Document search (for binary formats ripgrep can't handle)
        let document_candidates = if self.should_search_documents(&lexical_query, &path_candidates)
        {
            let (document_candidates, _doc_stats) = self.document_engine.search(&lexical_query);
            // Clear document cache after search (privacy: no persistent cache)
            self.document_engine.clear_cache();
            document_candidates
        } else {
            Vec::new()
        };

        // Phase 3: Merge and deduplicate (path + ripgrep + document candidates)
        let merge_start = Instant::now();
        let _merge_span = candidate_merge_span(path_candidates.len(), ripgrep_candidates.len());
        let _merge_enter = _merge_span.enter();
        let mut merged = self.merge_candidates(path_candidates, ripgrep_candidates);
        // Also merge document candidates (PDF, DOCX, XLSX, PPTX)
        merged = self.merge_candidates(merged, document_candidates);
        stats.merged_candidates = merged.len();

        // Phase 4: Apply metadata priors
        let _priors_span = metadata_priors_span(merged.len());
        let _priors_enter = _priors_span.enter();
        self.apply_priors(&mut merged);

        if processed.mode == QueryMode::Ask && !processed.anchor_terms.is_empty() {
            merged = self.filter_by_anchors(merged, &processed.anchor_terms);
            stats.merged_candidates = merged.len();
        }

        // Phase 5: Sort by combined score
        merged.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Phase 6: HARD CAP ENFORCEMENT (non-negotiable)
        let deep_caps = deep_search_overrides();
        let max = self.config.max_candidates.min(deep_caps.max_candidates);
        merged.truncate(max);
        stats.final_candidates = merged.len();
        stats.merge_ms = merge_start.elapsed().as_millis() as u64;

        tracing::debug!(
            path_candidates = stats.path_candidates,
            ripgrep_candidates = stats.ripgrep_candidates,
            merged = stats.merged_candidates,
            final_candidates = stats.final_candidates,
            total_ms = start.elapsed().as_millis(),
            "Candidate generation complete"
        );

        CandidateSet {
            candidates: merged,
            stats,
        }
    }

    /// Generate candidates with streaming ripgrep batches
    pub fn generate_streaming<F>(
        &mut self,
        query: &str,
        batch_size: usize,
        batch_interval_ms: u64,
        mut on_batch: F,
    ) -> CandidateSet
    where
        F: FnMut(Vec<ScoredCandidate>, bool),
    {
        let start = Instant::now();
        let mut stats = CandidateStats::default();
        stats.directory_walk_ms = self.last_index_build_ms;

        let processed = self.preprocessor.preprocess(query);
        let lexical_query = processed.expanded_query;

        // Phase 1: Path scoring (instant, no disk I/O)
        let path_start = Instant::now();
        let path_candidates = if self.config.enable_path_scoring {
            let path_count = self.path_index.as_ref().map(|idx| idx.len()).unwrap_or(0);
            let _span = path_scoring_span(path_count);
            let _enter = _span.enter();
            self.ensure_index();
            stats.directory_walk_ms = self.last_index_build_ms;
            let candidates = self
                .path_index
                .as_ref()
                .map(|idx| {
                    stats.paths_scanned = idx.len();
                    idx.score(&lexical_query, self.config.max_candidates * 2)
                })
                .unwrap_or_default();
            stats.path_candidates = candidates.len();
            candidates
        } else {
            Vec::new()
        };
        stats.path_scoring_ms = path_start.elapsed().as_millis() as u64;

        // Phase 2: Ripgrep scan (streamed)
        let ripgrep_start = Instant::now();
        let (ripgrep_candidates, ripgrep_stats) = if self.config.enable_ripgrep {
            let _span = ripgrep_scan_span(&lexical_query);
            let _enter = _span.enter();
            self.ripgrep.search_streaming(
                &lexical_query,
                batch_size,
                batch_interval_ms,
                |batch, is_final| on_batch(batch, is_final),
            )
        } else {
            (Vec::new(), RipgrepStats::default())
        };
        stats.ripgrep_candidates = ripgrep_candidates.len();
        stats.ripgrep_capped = ripgrep_stats.terminated_by == TerminationReason::MaxHitsReached;
        stats.ripgrep_ms = ripgrep_start.elapsed().as_millis() as u64;

        // Phase 2.5: Document search (for binary formats ripgrep can't handle)
        let document_candidates = if self.should_search_documents(&lexical_query, &path_candidates)
        {
            let (document_candidates, _doc_stats) = self.document_engine.search(&lexical_query);
            // Clear document cache after search (privacy: no persistent cache)
            self.document_engine.clear_cache();
            document_candidates
        } else {
            Vec::new()
        };

        // Phase 3: Merge and deduplicate (path + ripgrep + document candidates)
        let merge_start = Instant::now();
        let _merge_span = candidate_merge_span(path_candidates.len(), ripgrep_candidates.len());
        let _merge_enter = _merge_span.enter();
        let mut merged = self.merge_candidates(path_candidates, ripgrep_candidates);
        // Also merge document candidates (PDF, DOCX, XLSX, PPTX)
        merged = self.merge_candidates(merged, document_candidates);
        stats.merged_candidates = merged.len();

        // Phase 4: Apply metadata priors
        let _priors_span = metadata_priors_span(merged.len());
        let _priors_enter = _priors_span.enter();
        self.apply_priors(&mut merged);

        if processed.mode == QueryMode::Ask && !processed.anchor_terms.is_empty() {
            merged = self.filter_by_anchors(merged, &processed.anchor_terms);
            stats.merged_candidates = merged.len();
        }

        // Phase 5: Sort by combined score
        merged.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Phase 6: HARD CAP ENFORCEMENT
        let deep_caps = deep_search_overrides();
        let max = self.config.max_candidates.min(deep_caps.max_candidates);
        merged.truncate(max);
        stats.final_candidates = merged.len();
        stats.merge_ms = merge_start.elapsed().as_millis() as u64;

        tracing::debug!(
            path_candidates = stats.path_candidates,
            ripgrep_candidates = stats.ripgrep_candidates,
            merged = stats.merged_candidates,
            final_candidates = stats.final_candidates,
            total_ms = start.elapsed().as_millis(),
            "Candidate generation complete (streaming)"
        );

        CandidateSet {
            candidates: merged,
            stats,
        }
    }

    pub fn filter_by_anchors(
        &self,
        candidates: Vec<ScoredCandidate>,
        anchors: &[AnchorTerm],
    ) -> Vec<ScoredCandidate> {
        if anchors.is_empty() {
            return candidates;
        }

        candidates
            .into_iter()
            .filter(|candidate| {
                let preview = candidate.content_preview.as_ref().or_else(|| {
                    candidate
                        .match_context
                        .as_ref()
                        .and_then(|ctx| ctx.snippet.as_ref())
                });
                let preview = match preview {
                    Some(text) => text.to_lowercase(),
                    None => return false,
                };
                anchors.iter().any(|anchor| preview.contains(&anchor.term))
            })
            .collect()
    }

    /// Merge candidates from path scoring and ripgrep
    fn merge_candidates(
        &self,
        path_candidates: Vec<ScoredCandidate>,
        ripgrep_candidates: Vec<ScoredCandidate>,
    ) -> Vec<ScoredCandidate> {
        let mut seen: HashSet<PathBuf> = HashSet::new();
        let mut merged: Vec<ScoredCandidate> = Vec::new();

        // Process path candidates first
        for candidate in path_candidates {
            seen.insert(candidate.path.clone());
            merged.push(candidate);
        }

        // Process ripgrep candidates, merging scores for duplicates
        for candidate in ripgrep_candidates {
            if let Some(existing) = merged.iter_mut().find(|c| c.path == candidate.path) {
                // Merge: boost files that appear in both sources
                existing.merge_with(&candidate);
            } else if !seen.contains(&candidate.path) {
                seen.insert(candidate.path.clone());
                merged.push(candidate);
            }
        }

        merged
    }

    /// Apply metadata priors to candidates
    fn apply_priors(&self, candidates: &mut [ScoredCandidate]) {
        for candidate in candidates {
            // Get file metadata
            let metadata = self
                .path_index
                .as_ref()
                .and_then(|idx| idx.get_metadata(&candidate.path));

            let mtime = metadata
                .map(|m| m.mtime)
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            let size = metadata.map(|m| m.size_bytes).unwrap_or(0);

            let priors = self
                .config
                .priors
                .calculate_priors(&candidate.path, mtime, size);

            candidate.apply_priors(priors.recency, priors.folder, priors.type_prior);
        }
    }

    /// Get the number of indexed paths
    pub fn indexed_path_count(&self) -> usize {
        self.path_index.as_ref().map(|idx| idx.len()).unwrap_or(0)
    }

    /// Check if index is built
    pub fn is_indexed(&self) -> bool {
        self.path_index.is_some()
    }
}

// ============================================================================
// Conversion helpers for integration with existing code
// ============================================================================

use super::types::LexicalMatch;

impl From<&ScoredCandidate> for LexicalMatch {
    fn from(candidate: &ScoredCandidate) -> Self {
        LexicalMatch {
            path: candidate.path.clone(),
            score: candidate.combined_score,
            content_snippet: candidate
                .match_context
                .as_ref()
                .and_then(|c| c.snippet.clone())
                .unwrap_or_default(),
            term_matches: candidate
                .match_context
                .as_ref()
                .map(|c| c.match_count)
                .unwrap_or(0),
            total_terms: 1, // Query is treated as single term for conversion
        }
    }
}

impl CandidateSet {
    /// Convert to LexicalMatch vector for backwards compatibility
    pub fn into_lexical_matches(self) -> Vec<LexicalMatch> {
        self.candidates.iter().map(LexicalMatch::from).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        std::fs::create_dir_all(root.join("docs")).unwrap();
        std::fs::create_dir_all(root.join("src")).unwrap();

        std::fs::write(root.join("docs/report.txt"), "Quarterly report content").unwrap();
        std::fs::write(root.join("docs/notes.md"), "Meeting notes about quarterly").unwrap();
        std::fs::write(root.join("src/main.rs"), "fn main() { quarterly(); }").unwrap();
        std::fs::write(root.join("readme.txt"), "Project readme").unwrap();

        temp
    }

    #[test]
    fn test_candidate_generation() {
        let temp = setup_test_dir();
        let mut generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());

        let result = generator.generate("quarterly");

        assert!(!result.is_empty());
        assert!(result.stats.final_candidates <= MAX_CANDIDATES_FOR_EMBEDDING);
    }

    #[test]
    fn test_hard_cap_enforcement() {
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        // Create more files than MAX_CANDIDATES_FOR_EMBEDDING
        for i in 0..2000 {
            std::fs::write(
                root.join(format!("file_{}.txt", i)),
                format!("test content {}", i),
            )
            .unwrap();
        }

        let mut generator = CandidateGenerator::with_defaults(root.to_path_buf());
        let result = generator.generate("test");

        // MUST NOT exceed the hard cap
        assert!(
            result.len() <= MAX_CANDIDATES_FOR_EMBEDDING,
            "Hard cap violated: {} > {}",
            result.len(),
            MAX_CANDIDATES_FOR_EMBEDDING
        );
    }

    #[test]
    fn test_merge_boosts_duplicates() {
        let temp = setup_test_dir();
        let mut generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());

        let result = generator.generate("quarterly report");

        // Files matching both path and content should have higher scores
        let report_file = result
            .candidates
            .iter()
            .find(|c| c.path.to_string_lossy().contains("report"));

        assert!(report_file.is_some());
        if let Some(candidate) = report_file {
            // Should be merged from multiple sources
            assert!(
                candidate.breakdown.path_score > 0.0 || candidate.breakdown.lexical_score > 0.0
            );
        }
    }

    #[test]
    fn test_empty_query() {
        let temp = setup_test_dir();
        let mut generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());

        let result = generator.generate("");
        assert!(result.is_empty());
    }

    #[test]
    fn test_conversion_to_lexical_match() {
        let temp = setup_test_dir();
        let mut generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());

        let result = generator.generate("report");
        let lexical_matches = result.into_lexical_matches();

        assert!(!lexical_matches.is_empty());
        assert!(lexical_matches
            .iter()
            .any(|m| m.path.to_string_lossy().contains("report")));
    }

    #[test]
    fn test_document_search_gate_skips_code_query_without_doc_signals() {
        let temp = setup_test_dir();
        let generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());
        assert!(!generator.should_search_documents("fn main import module", &[]));
    }

    #[test]
    fn test_document_search_gate_runs_for_document_query_signals() {
        let temp = setup_test_dir();
        let generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());
        assert!(generator.should_search_documents("ext:pdf quarterly report", &[]));
        assert!(generator.should_search_documents("powerpoint roadmap", &[]));
    }

    #[test]
    fn test_document_search_gate_runs_when_top_paths_include_document_files() {
        let temp = setup_test_dir();
        let generator = CandidateGenerator::with_defaults(temp.path().to_path_buf());
        let path_candidates = vec![ScoredCandidate::from_path_match(
            std::path::PathBuf::from("docs/roadmap.pdf"),
            0.9,
        )];
        assert!(generator.should_search_documents("roadmap", &path_candidates));
    }
}
