//! Progressive Search Engine
//!
//! Provides streaming search results for responsive UIs. The search is executed
//! in two phases:
//!
//! 1. **Lexical Phase** (~50ms): Fast keyword matching, results shown immediately
//! 2. **Semantic Phase** (~1500ms): Embedding-based reranking for better relevance
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_core::ixos_rank::{
//!     ProgressiveSearchEngine, SearchEvent,
//!     StubLexicalEngine, StubSemanticEngine,
//! };
//! use tokio::sync::mpsc;
//! use tokio_util::sync::CancellationToken;
//!
//! #[tokio::main]
//! async fn main() {
//!     let lexical = StubLexicalEngine::new();
//!     let semantic = StubSemanticEngine::with_stub_model();
//!     let mut engine = ProgressiveSearchEngine::new(lexical, semantic);
//!
//!     let (tx, mut rx) = mpsc::channel(256);
//!     let cancel = CancellationToken::new();
//!
//!     tokio::spawn(async move {
//!         engine.search_progressive("query".to_string(), tx, cancel).await
//!     });
//!
//!     while let Some(event) = rx.recv().await {
//!         match event {
//!             SearchEvent::LexicalResults(results) => println!("Quick: {} files", results.len()),
//!             SearchEvent::SemanticResults(results) => println!("Final: {} files", results.len()),
//!             SearchEvent::Complete => break,
//!             _ => {}
//!         }
//!     }
//! }
//! ```

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use std::{fs::File, io::Read};

use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::instrumentation::search_total_span;

use super::ask_mode::{
    AnchorTerm, QueryMode, SnippetTrustConfig, TrustedSnippet, TrustedSnippetSelector,
};
use super::candidate_generator::QueryPreprocessor;
use super::evidence::{Evidence, EvidenceChain, PassageExtractor};
use super::lexical_engine::LexicalEngine;
use super::secure_ranker::{Candidate, RankedResult, ScoreBreakdown, SecureRanker};
use super::semantic_engine::SemanticEngine;
use super::types::{EvidenceSummary, LexicalMatch, SearchError, SemanticMatch};

// =============================================================================
// Configuration
// =============================================================================

/// Default lexical phase timeout
pub const DEFAULT_LEXICAL_TIMEOUT: Duration = Duration::from_millis(500);

/// Default semantic phase timeout
pub const DEFAULT_SEMANTIC_TIMEOUT: Duration = Duration::from_secs(5);

/// Default maximum results
pub const DEFAULT_MAX_RESULTS: usize = 20;

/// Upper bound for Auto-mode refinement to avoid Pro-like tail latency.
const AUTO_REFINE_TIMEOUT_CAP: Duration = Duration::from_millis(2500);

/// Search quality mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchMode {
    Flash,
    Pro,
    Auto,
}

impl Default for SearchMode {
    fn default() -> Self {
        SearchMode::Auto
    }
}

/// Auto mode routing configuration
#[derive(Debug, Clone, Copy)]
pub struct AutoModeConfig {
    pub gap_threshold: f32,
    pub lexical_threshold: f32,
    pub short_query_len: usize,
    pub entropy_threshold: f32,
    pub pro_top_k: usize,
}

/// Fusion weighting for dual-embedder + lexical blending (Pro/Auto refinement)
#[derive(Debug, Clone, Copy)]
pub struct FusionConfig {
    pub flash: f32,
    pub pro: f32,
    pub lexical: f32,
    pub dir_prior: f32,
}

/// Configuration for progressive search
#[derive(Debug, Clone)]
pub struct ProgressiveSearchConfig {
    /// Timeout for the lexical search phase
    pub lexical_timeout: Duration,

    /// Timeout for the semantic search phase
    pub semantic_timeout: Duration,

    /// Maximum number of results to return
    pub max_results: usize,

    /// Whether to apply secure ranking to final results
    pub enable_secure_ranking: bool,

    /// Candidate multiplier for lexical phase (to ensure enough for semantic)
    pub candidate_multiplier: usize,

    /// Number of lines of context to show around matches (0 = disabled)
    pub context_lines: usize,

    /// Minimum score threshold (results below this are discarded)
    pub min_score_threshold: f32,

    /// Batch size for lexical streaming (P2.1)
    pub lexical_batch_size: usize,

    /// Maximum time before forcing a batch send (ms) (P2.1)
    pub lexical_batch_timeout_ms: u64,

    /// Maximum number of results to enrich with evidence
    pub evidence_max_results: usize,

    /// Maximum bytes to read for evidence extraction
    pub evidence_max_bytes: usize,

    /// Search quality mode (flash/pro/auto)
    pub search_mode: SearchMode,

    /// Auto-mode routing configuration
    pub auto_mode: AutoModeConfig,

    /// Enable lexical-semantic fusion for Pro/Auto refinement
    pub enable_fusion: bool,

    /// Fusion weights for semantic/lexical/path priors
    pub fusion: FusionConfig,
}

impl Default for ProgressiveSearchConfig {
    fn default() -> Self {
        Self {
            lexical_timeout: DEFAULT_LEXICAL_TIMEOUT,
            semantic_timeout: DEFAULT_SEMANTIC_TIMEOUT,
            max_results: DEFAULT_MAX_RESULTS,
            enable_secure_ranking: true,
            candidate_multiplier: 5,
            context_lines: 3,
            min_score_threshold: 0.1,
            lexical_batch_size: 20,
            lexical_batch_timeout_ms: 50,
            evidence_max_results: 3,
            evidence_max_bytes: 32 * 1024,
            search_mode: SearchMode::Auto,
            auto_mode: AutoModeConfig {
                gap_threshold: 0.05,
                lexical_threshold: 0.15,
                short_query_len: 2,
                entropy_threshold: 0.9,
                pro_top_k: 20,
            },
            enable_fusion: true,
            fusion: FusionConfig {
                flash: 0.2672,
                pro: 0.2725,
                lexical: 0.4602,
                dir_prior: 0.0,
            },
        }
    }
}

impl ProgressiveSearchConfig {
    /// Create a fast configuration for testing
    pub fn fast() -> Self {
        Self {
            lexical_timeout: Duration::from_millis(100),
            semantic_timeout: Duration::from_secs(2),
            max_results: 20,
            enable_secure_ranking: true,
            candidate_multiplier: 5,
            context_lines: 2,
            min_score_threshold: 0.1,
            lexical_batch_size: 10,
            lexical_batch_timeout_ms: 30,
            evidence_max_results: 3,
            evidence_max_bytes: 32 * 1024,
            search_mode: SearchMode::Auto,
            auto_mode: AutoModeConfig {
                gap_threshold: 0.08,
                lexical_threshold: 0.2,
                short_query_len: 2,
                entropy_threshold: 0.95,
                pro_top_k: 20,
            },
            enable_fusion: true,
            fusion: FusionConfig {
                flash: 0.2672,
                pro: 0.2725,
                lexical: 0.4602,
                dir_prior: 0.0,
            },
        }
    }

    /// Create a thorough configuration for comprehensive search
    pub fn thorough() -> Self {
        Self {
            lexical_timeout: Duration::from_secs(1),
            semantic_timeout: Duration::from_secs(10),
            max_results: 50,
            enable_secure_ranking: true,
            candidate_multiplier: 20,
            context_lines: 5,
            min_score_threshold: 0.05,
            lexical_batch_size: 30,
            lexical_batch_timeout_ms: 100,
            evidence_max_results: 12,
            evidence_max_bytes: 256 * 1024,
            search_mode: SearchMode::Auto,
            auto_mode: AutoModeConfig {
                gap_threshold: 0.04,
                lexical_threshold: 0.12,
                short_query_len: 2,
                entropy_threshold: 0.85,
                pro_top_k: 200,
            },
            enable_fusion: true,
            fusion: FusionConfig {
                flash: 0.2672,
                pro: 0.2725,
                lexical: 0.4602,
                dir_prior: 0.0,
            },
        }
    }
}

// =============================================================================
// Search Events
// =============================================================================

/// Events emitted during progressive search
///
/// These events allow the UI to show results progressively as they become
/// available, providing a responsive user experience.
#[derive(Debug, Clone)]
pub enum StreamStage {
    Echo,
    Lexical,
    Semantic,
    Refining,
    Tail,
}

#[derive(Debug, Clone)]
pub enum StreamEventKind {
    Lexical,
    Semantic,
    Scan,
}

#[derive(Debug, Clone, Default)]
pub struct StreamStats {
    pub files_scanned: usize,
    pub candidates: usize,
    pub embedded: usize,
    pub cache_hits: usize,
}

#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchDiagnostics {
    pub candidates: super::candidate_generator::CandidateStats,
    pub embedding: super::semantic_engine::SemanticMetrics,
}

#[derive(Debug, Clone)]
pub struct StreamEventItem {
    pub id: String,
    pub kind: StreamEventKind,
    pub score: f32,
    pub slot_index: usize,
    pub path_hint: Option<String>,
}

/// Events emitted during progressive search
///
/// These events allow the UI to show results progressively as they become
/// available, providing a responsive user experience.
#[derive(Debug, Clone)]
pub enum SearchEvent {
    /// Lexical (keyword) results available
    ///
    /// Sent quickly (~50ms) with initial results based on keyword matching.
    /// These results are preliminary and will be refined by semantic search.
    LexicalResults(Vec<LexicalMatch>),

    /// P2.1: Batched lexical results for streaming
    ///
    /// Sent incrementally as lexical results become available.
    /// Allows for immediate display of results before semantic reranking.
    LexicalBatch {
        results: Vec<LexicalMatch>,
        batch_number: u32,
        is_final: bool,
    },

    /// Status update for the UI
    ///
    /// Sent during longer operations to keep the user informed.
    Status(String),

    /// Semantic (embedding) results available
    ///
    /// Sent after semantic reranking is complete (~1500ms).
    /// These are the final, high-quality results.
    SemanticResults(Vec<RankedResult>),

    /// P2.1: Late result discovered after main search completed
    ///
    /// Some high-quality results may be found after the initial search
    /// completes. These are sent as they become available.
    LateResult {
        result: RankedResult,
        discovery_time_ms: u64,
    },

    /// Search completed successfully
    Complete,

    /// Search was cancelled by the user
    Cancelled,

    /// An error occurred during search
    Error(String),

    /// P3.4: Streaming contract for UI traces and stats
    StreamUpdate {
        stage: StreamStage,
        stats: StreamStats,
        events: Vec<StreamEventItem>,
    },
}

// =============================================================================
// Progressive Search Engine
// =============================================================================

/// Progressive search engine with streaming results
///
/// Combines lexical and semantic search with support for:
/// - Streaming results via mpsc channel
/// - Cancellation token for user-initiated abort
/// - Secure ranking with integrity verification
/// - Configurable timeouts
pub struct ProgressiveSearchEngine<L: LexicalEngine, S: SemanticEngine> {
    lexical_engine: Arc<L>,
    semantic_engine: Arc<S>,
    pro_engine: Option<Arc<dyn SemanticEngine>>,
    secure_ranker: SecureRanker,
    config: ProgressiveSearchConfig,
    diagnostics: SearchDiagnostics,
}

impl<L: LexicalEngine, S: SemanticEngine> ProgressiveSearchEngine<L, S> {
    /// Create a new progressive search engine with default configuration
    pub fn new(lexical: L, semantic: S) -> Self {
        Self {
            lexical_engine: Arc::new(lexical),
            semantic_engine: Arc::new(semantic),
            pro_engine: None,
            secure_ranker: SecureRanker::new(),
            config: ProgressiveSearchConfig::default(),
            diagnostics: SearchDiagnostics::default(),
        }
    }

    /// Create a new progressive search engine with custom configuration
    pub fn with_config(lexical: L, semantic: S, config: ProgressiveSearchConfig) -> Self {
        Self {
            lexical_engine: Arc::new(lexical),
            semantic_engine: Arc::new(semantic),
            pro_engine: None,
            secure_ranker: SecureRanker::new(),
            config,
            diagnostics: SearchDiagnostics::default(),
        }
    }

    /// Create a new progressive search engine with an optional Pro engine
    pub fn with_config_and_pro<P: SemanticEngine + 'static>(
        lexical: L,
        semantic: S,
        pro: Option<P>,
        config: ProgressiveSearchConfig,
    ) -> Self {
        Self {
            lexical_engine: Arc::new(lexical),
            semantic_engine: Arc::new(semantic),
            pro_engine: pro.map(|engine| Arc::new(engine) as Arc<dyn SemanticEngine>),
            secure_ranker: SecureRanker::new(),
            config,
            diagnostics: SearchDiagnostics::default(),
        }
    }

    /// Execute progressive search with streaming events
    ///
    /// Results are sent via the provided channel as they become available.
    /// The search can be cancelled at any time using the cancellation token.
    ///
    /// # Arguments
    ///
    /// * `query` - The search query
    /// * `tx` - Channel to send search events
    /// * `cancel` - Token to cancel the search
    ///
    /// # Returns
    ///
    /// Returns `Ok(())` on successful completion or cancellation.
    /// Returns `Err` if a critical error occurs.
    pub async fn search_progressive(
        &mut self,
        query: String,
        tx: mpsc::Sender<SearchEvent>,
        cancel: CancellationToken,
    ) -> Result<(), SearchError> {
        self.semantic_engine.reset_metrics().await;
        if let Some(pro) = &self.pro_engine {
            pro.reset_metrics().await;
        }
        self.diagnostics = SearchDiagnostics::default();
        const MAX_STREAM_EVENTS: usize = 120;
        const MAX_SCAN_EVENTS_PER_BATCH: usize = 6;
        let _total_span = search_total_span(&query);
        let _total_enter = _total_span.enter();

        // Calculate how many candidates to request from lexical phase.
        // Witness-guard experiments need a wider candidate pool for low-limit queries.
        let lexical_limit = semantic_candidate_limit(
            self.config.max_results,
            self.config.candidate_multiplier,
            witness_guard_enabled(),
        );
        let stream_stats = Arc::new(std::sync::Mutex::new(StreamStats {
            files_scanned: 0,
            candidates: 0,
            embedded: 0,
            cache_hits: 0,
        }));
        let stream_event_count = Arc::new(AtomicUsize::new(0));
        let lexical_slot_index = Arc::new(AtomicUsize::new(0));
        let scan_event_count = Arc::new(AtomicUsize::new(0));

        let mut preprocessor = QueryPreprocessor::with_defaults();
        let processed = preprocessor.preprocess(&query);

        let echo_stats = stream_stats.lock().unwrap().clone();
        let _ = tx.try_send(SearchEvent::StreamUpdate {
            stage: StreamStage::Echo,
            stats: echo_stats,
            events: Vec::new(),
        });

        // Phase 1: Lexical search (fast)
        let lexical_batch_size = self.config.lexical_batch_size;
        let lexical_batch_timeout = Duration::from_millis(self.config.lexical_batch_timeout_ms);
        let tx_batches = tx.clone();
        let stream_stats_for_batches = Arc::clone(&stream_stats);
        let stream_event_count_for_batches = Arc::clone(&stream_event_count);
        let lexical_slot_index_for_batches = Arc::clone(&lexical_slot_index);
        let scan_event_count_for_batches = Arc::clone(&scan_event_count);
        let mut batch_number = 0u32;

        let mut lexical_results = tokio::select! {
            biased; // Check cancellation first

            _ = cancel.cancelled() => {
                let _ = tx.send(SearchEvent::Cancelled).await;
                return Ok(());
            }

            result = tokio::time::timeout(
                self.config.lexical_timeout,
                self.lexical_engine.search_with_batches(
                    &query,
                    lexical_limit,
                    lexical_batch_size,
                    lexical_batch_timeout,
                    Some(Box::new(move |batch, is_final| {
                        if batch.is_empty() {
                            return;
                        }
                        batch_number += 1;
                        if let Err(e) = tx_batches.try_send(SearchEvent::LexicalBatch {
                            results: batch.clone(),
                            batch_number,
                            is_final,
                        }) {
                            tracing::warn!("LexicalBatch event dropped (channel full): {}", e);
                        }

                        // Clone stats inside a limited scope to drop the MutexGuard before blocking_send
                        let stats_clone = {
                            let mut stats = stream_stats_for_batches.lock().unwrap();
                            stats.candidates = stats.candidates.saturating_add(batch.len());
                            stats.files_scanned = stats.files_scanned.saturating_add(batch.len());
                            stats.clone()
                        };

                        let mut events = Vec::new();
                        for item in &batch {
                            if stream_event_count_for_batches.load(Ordering::Relaxed) >= MAX_STREAM_EVENTS {
                                break;
                            }
                            let slot_index = lexical_slot_index_for_batches.fetch_add(1, Ordering::Relaxed);
                            events.push(StreamEventItem {
                                id: format!("lexical:{}", item.path.display()),
                                kind: StreamEventKind::Lexical,
                                score: item.score,
                                slot_index,
                                path_hint: None,
                            });
                            stream_event_count_for_batches.fetch_add(1, Ordering::Relaxed);
                        }

                        for item in batch.iter().take(MAX_SCAN_EVENTS_PER_BATCH) {
                            let scan_index = scan_event_count_for_batches.fetch_add(1, Ordering::Relaxed);
                            events.push(StreamEventItem {
                                id: format!("scan:{}:{}", item.path.display(), scan_index),
                                kind: StreamEventKind::Scan,
                                score: 0.0,
                                slot_index: 0,
                                path_hint: Some(item.path.display().to_string()),
                            });
                        }

                        if !events.is_empty() {
                            if let Err(e) = tx_batches.try_send(SearchEvent::StreamUpdate {
                                stage: StreamStage::Lexical,
                                stats: stats_clone,
                                events,
                            }) {
                                tracing::warn!("StreamUpdate event dropped (channel full): {}", e);
                            }
                        }
                    })),
                )
            ) => {
                match result {
                    Ok(Ok(results)) => results,
                    Ok(Err(e)) => {
                        tracing::warn!("Lexical search failed: {}", e);
                        let _ = tx.send(SearchEvent::Error(format!("Lexical search failed: {}", e))).await;
                        return Err(e);
                    }
                    Err(_) => {
                        tracing::debug!("Lexical search timed out, continuing with empty results");
                        Vec::new()
                    }
                }
            }
        };
        if processed.mode == QueryMode::Ask && !processed.anchor_terms.is_empty() {
            let unfiltered = lexical_results.clone();
            lexical_results = filter_lexical_by_anchors(lexical_results, &processed.anchor_terms);
            if lexical_results.is_empty() {
                tracing::debug!(
                    "Ask-mode anchor filtering removed all lexical candidates; keeping unfiltered lexical set"
                );
                lexical_results = unfiltered;
            }
        }
        let lexical_results_len = lexical_results.len();
        let has_lexical_results = !lexical_results.is_empty();
        let lexical_lookup: std::collections::HashMap<_, _> = lexical_results
            .iter()
            .map(|m| (m.path.clone(), m.clone()))
            .collect();

        // Send lexical results immediately if we have any
        if !lexical_results.is_empty() {
            // Send top results for immediate display
            let display_results: Vec<LexicalMatch> = lexical_results
                .iter()
                .take(self.config.max_results)
                .cloned()
                .collect();

            let _ = tx.send(SearchEvent::LexicalResults(display_results)).await;
        }

        // Prepare semantic query (question rewrite, typo fixes)
        let mut semantic_query = processed.semantic_query.clone();
        if semantic_query.trim().is_empty() {
            semantic_query = processed.corrected_query.clone();
        }
        if semantic_query.trim().is_empty() {
            semantic_query = query.clone();
        }
        let query_terms = extract_query_terms(&semantic_query);

        // Check cancellation before semantic phase
        if cancel.is_cancelled() {
            let _ = tx.send(SearchEvent::Cancelled).await;
            return Ok(());
        }

        // Send status update
        let semantic_status = if processed.mode == QueryMode::Ask {
            "Ask Mode active: understanding your question..."
        } else {
            "Understanding meaning..."
        };
        let _ = tx.send(SearchEvent::Status(semantic_status.into())).await;
        let semantic_start_stats = stream_stats.lock().unwrap().clone();
        let _ = tx.try_send(SearchEvent::StreamUpdate {
            stage: StreamStage::Semantic,
            stats: semantic_start_stats,
            events: Vec::new(),
        });

        // Phase 2: Semantic search (slower, more accurate)
        let flash_engine: &dyn SemanticEngine = self.semantic_engine.as_ref();
        let pro_engine = self.pro_engine.as_ref().map(|p| p.as_ref());
        let has_pro_engine = pro_engine.is_some();

        // Auto mode is intentionally Flash-first. Pro mode is Pro-first.
        let use_pro_primary = matches!(self.config.search_mode, SearchMode::Pro) && has_pro_engine;
        let mut used_pro = use_pro_primary;

        let primary_engine: &dyn SemanticEngine = if use_pro_primary {
            pro_engine.unwrap_or(flash_engine)
        } else {
            flash_engine
        };
        let mut flash_scores: Option<std::collections::HashMap<std::path::PathBuf, f32>> = None;

        let mut semantic_results = if lexical_results.is_empty() {
            // Ask-mode queries should avoid search_pure to prevent full-corpus scans.
            if processed.mode == QueryMode::Ask {
                let ask_fallback = self
                    .lexical_engine
                    .search(&semantic_query, lexical_limit)
                    .await
                    .unwrap_or_default();
                if ask_fallback.is_empty() {
                    Vec::new()
                } else {
                    tokio::select! {
                        biased;

                        _ = cancel.cancelled() => {
                            let _ = tx.send(SearchEvent::Cancelled).await;
                            return Ok(());
                        }

                        result = tokio::time::timeout(
                            self.config.semantic_timeout,
                            primary_engine.rerank(&semantic_query, ask_fallback, lexical_limit)
                        ) => {
                            match result {
                                Ok(Ok(results)) => results,
                                Ok(Err(e)) => {
                                    tracing::warn!("Ask-mode semantic rerank failed: {}", e);
                                    let _ = tx.send(SearchEvent::Error(format!("Semantic rerank failed: {}", e))).await;
                                    return Err(e);
                                }
                                Err(_) => {
                                    let _ = tx.send(SearchEvent::Error("Semantic search timeout".into())).await;
                                    return Err(SearchError::Timeout);
                                }
                            }
                        }
                    }
                }
            } else {
                // No lexical results in keyword mode: fallback to pure semantic search.
                tokio::select! {
                    biased;

                    _ = cancel.cancelled() => {
                        let _ = tx.send(SearchEvent::Cancelled).await;
                        return Ok(());
                    }

                    result = tokio::time::timeout(
                        self.config.semantic_timeout,
                        primary_engine.search_pure(&semantic_query, self.config.max_results)
                    ) => {
                        match result {
                            Ok(Ok(results)) => results,
                            Ok(Err(e)) => {
                                tracing::warn!("Pure semantic search failed: {}", e);
                                let _ = tx.send(SearchEvent::Error(format!("Semantic search failed: {}", e))).await;
                                return Err(e);
                            }
                            Err(_) => {
                                let _ = tx.send(SearchEvent::Error("Semantic search timeout".into())).await;
                                return Err(SearchError::Timeout);
                            }
                        }
                    }
                }
            }
        } else {
            // Rerank lexical results using semantic similarity
            tokio::select! {
                biased;

                _ = cancel.cancelled() => {
                    let _ = tx.send(SearchEvent::Cancelled).await;
                    return Ok(());
                }

                result = tokio::time::timeout(
                    self.config.semantic_timeout,
                    primary_engine.rerank(
                        &semantic_query,
                        lexical_results.clone(),
                        lexical_limit,
                    )
                ) => {
                    match result {
                        Ok(Ok(results)) => results,
                        Ok(Err(e)) => {
                            tracing::warn!("Semantic rerank failed: {}", e);
                            let _ = tx.send(SearchEvent::Error(format!("Semantic rerank failed: {}", e))).await;
                            return Err(e);
                        }
                        Err(_) => {
                            let _ = tx.send(SearchEvent::Error("Semantic search timeout".into())).await;
                            return Err(SearchError::Timeout);
                        }
                    }
                }
            }
        };

        if lexical_results.is_empty()
            && witness_guard_enabled()
            && !query_requests_sensitive_content(&query_terms)
        {
            let sensitive_in_initial_top = semantic_results
                .iter()
                .take(self.config.max_results.max(1))
                .any(|item| path_is_sensitive(&item.path));
            let widened_limit = semantic_pure_limit(self.config.max_results, true);

            if sensitive_in_initial_top && widened_limit > self.config.max_results {
                tokio::select! {
                    biased;

                    _ = cancel.cancelled() => {
                        let _ = tx.send(SearchEvent::Cancelled).await;
                        return Ok(());
                    }

                    result = tokio::time::timeout(
                        self.config.semantic_timeout,
                        primary_engine.search_pure(&semantic_query, widened_limit)
                    ) => {
                        match result {
                            Ok(Ok(widened_results)) => {
                                if widened_results.len() > semantic_results.len() {
                                    semantic_results = widened_results;
                                }
                            }
                            Ok(Err(e)) => {
                                tracing::debug!("Witness guard pure overfetch probe failed: {}", e);
                            }
                            Err(_) => {
                                tracing::debug!("Witness guard pure overfetch probe timed out");
                            }
                        }
                    }
                }
            }
        }

        let metrics = primary_engine.metrics().await;
        {
            let mut stats = stream_stats.lock().unwrap();
            stats.embedded = metrics.candidates_embedded;
            stats.cache_hits = metrics.cache_hits;
        }
        let semantic_progress_stats = stream_stats.lock().unwrap().clone();
        let _ = tx.try_send(SearchEvent::StreamUpdate {
            stage: StreamStage::Semantic,
            stats: semantic_progress_stats,
            events: Vec::new(),
        });

        // Pro mode: potion/pro primary pass followed by optional Flash top-K refinement for fusion.
        let run_flash_refine =
            use_pro_primary && self.config.enable_fusion && self.config.fusion.flash > 0.0;

        if run_flash_refine {
            let _ = tx
                .send(SearchEvent::Status("Refining with Flash model...".into()))
                .await;
            let refine_stats = stream_stats.lock().unwrap().clone();
            let _ = tx.try_send(SearchEvent::StreamUpdate {
                stage: StreamStage::Refining,
                stats: refine_stats,
                events: Vec::new(),
            });

            let mut flash_candidates: Vec<LexicalMatch> = semantic_results
                .iter()
                .take(self.config.auto_mode.pro_top_k)
                .map(|m| {
                    lexical_lookup.get(&m.path).cloned().unwrap_or_else(|| {
                        LexicalMatch::new(m.path.clone(), 0.0, String::new(), 0, 0)
                    })
                })
                .collect();

            if flash_candidates.is_empty() && !lexical_results.is_empty() {
                flash_candidates = lexical_results
                    .iter()
                    .take(self.config.auto_mode.pro_top_k)
                    .cloned()
                    .collect();
            }

            if !flash_candidates.is_empty() {
                match tokio::time::timeout(
                    self.config.semantic_timeout,
                    flash_engine.rerank(
                        &semantic_query,
                        flash_candidates,
                        self.config.auto_mode.pro_top_k,
                    ),
                )
                .await
                {
                    Ok(Ok(results)) => {
                        flash_scores = Some(
                            results
                                .into_iter()
                                .map(|m| (m.path, m.similarity))
                                .collect(),
                        );
                    }
                    Ok(Err(e)) => {
                        tracing::warn!("Flash refinement failed: {}", e);
                    }
                    Err(_) => {
                        tracing::warn!("Flash refinement timed out");
                    }
                }
            }
        } else if matches!(self.config.search_mode, SearchMode::Pro) && !has_pro_engine {
            flash_scores = Some(
                semantic_results
                    .iter()
                    .map(|m| (m.path.clone(), m.similarity))
                    .collect(),
            );
        }

        // Apply lexical-semantic fusion for Pro mode.
        if self.config.enable_fusion && use_pro_primary {
            let mut fusion = self.config.fusion;
            if flash_scores.is_none() && fusion.flash > 0.0 {
                fusion.pro += fusion.flash;
                fusion.flash = 0.0;
            }
            apply_fusion(
                &mut semantic_results,
                &lexical_lookup,
                &query_terms,
                fusion,
                flash_scores.as_ref(),
            );
        }
        maybe_apply_witness_guard(&mut semantic_results, &lexical_lookup, &query_terms);

        // Check cancellation before ranking
        if cancel.is_cancelled() {
            let _ = tx.send(SearchEvent::Cancelled).await;
            return Ok(());
        }

        let mut final_results = rank_with_optional_witness_guard(
            &query,
            &semantic_results,
            self.config.enable_secure_ranking,
            self.config.max_results,
            self.config.min_score_threshold,
            &mut self.secure_ranker,
            &lexical_lookup,
            &query_terms,
        );

        // Flash-first Auto mode: publish immediately, then optionally refine top-K with Pro.
        let _ = tx
            .send(SearchEvent::SemanticResults(final_results.clone()))
            .await;

        let should_run_auto_pro_refine = matches!(self.config.search_mode, SearchMode::Auto)
            && has_pro_engine
            && processed.mode != QueryMode::Ask
            && should_refine(
                query_terms.len(),
                &lexical_results,
                &semantic_results,
                self.config.auto_mode,
            );

        tracing::debug!(
            query = %query,
            query_terms = query_terms.len(),
            lexical_results = lexical_results.len(),
            semantic_results = semantic_results.len(),
            should_refine = should_run_auto_pro_refine,
            "Auto-mode Pro refinement gate"
        );

        if should_run_auto_pro_refine {
            let _ = tx
                .send(SearchEvent::Status(
                    "Refining top results with Pro model...".into(),
                ))
                .await;
            let refine_stats = stream_stats.lock().unwrap().clone();
            let _ = tx.try_send(SearchEvent::StreamUpdate {
                stage: StreamStage::Refining,
                stats: refine_stats,
                events: Vec::new(),
            });

            let pro_top_k = self.config.auto_mode.pro_top_k.max(1);
            let mut pro_candidates: Vec<LexicalMatch> = semantic_results
                .iter()
                .take(pro_top_k)
                .map(|m| {
                    lexical_lookup.get(&m.path).cloned().unwrap_or_else(|| {
                        LexicalMatch::new(m.path.clone(), 0.0, String::new(), 0, 0)
                    })
                })
                .collect();

            if pro_candidates.is_empty() && !lexical_results.is_empty() {
                pro_candidates = lexical_results.iter().take(pro_top_k).cloned().collect();
            }

            if let Some(pro_engine) = pro_engine {
                if !pro_candidates.is_empty() {
                    let auto_refine_timeout =
                        self.config.semantic_timeout.min(AUTO_REFINE_TIMEOUT_CAP);
                    match tokio::time::timeout(
                        auto_refine_timeout,
                        pro_engine.rerank(&semantic_query, pro_candidates, pro_top_k),
                    )
                    .await
                    {
                        Ok(Ok(pro_results)) => {
                            let pro_scores: std::collections::HashMap<_, _> = pro_results
                                .into_iter()
                                .map(|m| (m.path, m.similarity))
                                .collect();

                            if !pro_scores.is_empty() {
                                const AUTO_PRO_BLEND: f32 = 0.65;
                                let mut seen_paths: std::collections::HashSet<std::path::PathBuf> =
                                    semantic_results.iter().map(|m| m.path.clone()).collect();

                                for item in semantic_results.iter_mut() {
                                    if let Some(pro_score) = pro_scores.get(&item.path) {
                                        item.similarity = (AUTO_PRO_BLEND * *pro_score
                                            + (1.0 - AUTO_PRO_BLEND) * item.similarity)
                                            .clamp(0.0, 1.0);
                                    }
                                }

                                for (path, pro_score) in &pro_scores {
                                    if seen_paths.insert(path.clone()) {
                                        semantic_results
                                            .push(SemanticMatch::new(path.clone(), *pro_score));
                                    }
                                }

                                semantic_results.sort_by(|a, b| {
                                    b.similarity
                                        .partial_cmp(&a.similarity)
                                        .unwrap_or(std::cmp::Ordering::Equal)
                                });
                                used_pro = true;

                                final_results = rank_with_optional_witness_guard(
                                    &query,
                                    &semantic_results,
                                    self.config.enable_secure_ranking,
                                    self.config.max_results,
                                    self.config.min_score_threshold,
                                    &mut self.secure_ranker,
                                    &lexical_lookup,
                                    &query_terms,
                                );

                                let _ = tx
                                    .send(SearchEvent::SemanticResults(final_results.clone()))
                                    .await;
                            }
                        }
                        Ok(Err(e)) => {
                            tracing::warn!("Pro refinement failed: {}", e);
                        }
                        Err(_) => {
                            tracing::warn!(
                                "Pro refinement timed out after {:?}",
                                auto_refine_timeout
                            );
                        }
                    }
                }
            }
        }

        // Evidence extraction is deferred until after initial semantic results are shown.
        let context_lines = self.config.context_lines;
        let evidence_limit = self
            .config
            .evidence_max_results
            .min(self.config.max_results);
        let evidence_max_bytes = self.config.evidence_max_bytes;
        let evidence_engine: &dyn SemanticEngine = if used_pro {
            self.pro_engine
                .as_ref()
                .map(|p| p.as_ref())
                .unwrap_or(self.semantic_engine.as_ref())
        } else {
            self.semantic_engine.as_ref()
        };
        let query_embedding = if evidence_limit > 0 {
            evidence_engine.embed_query(&semantic_query).await.ok()
        } else {
            None
        };
        let passage_extractor = PassageExtractor::default_config();
        let will_enrich_results = evidence_limit > 0 || context_lines > 0;
        if will_enrich_results {
            let _ = tx.try_send(SearchEvent::Status("Collecting evidence...".into()));

            for (index, result) in final_results.iter_mut().enumerate() {
                if let Some(line) = lexical_lookup
                    .get(&result.path)
                    .and_then(|m| m.line_numbers.first())
                {
                    result.context_snippet =
                        super::snippet::extract_context_at_line(&result.path, *line, context_lines);
                }
                if index >= evidence_limit {
                    if context_lines > 0 && result.context_snippet.is_none() {
                        if let Some(content) = super::evidence::passage_extractor::read_file_content(
                            &result.path,
                            evidence_max_bytes,
                        ) {
                            if let Some(snippet) = super::snippet::extract_context_from_string(
                                &content,
                                &semantic_query,
                                context_lines,
                            ) {
                                result.context_snippet = Some(snippet);
                            }
                        }
                    }
                    continue;
                }

                let mut semantic_passage: Option<String> = None;
                let mut semantic_offset = 0;
                let mut ask_mode_trust: Option<TrustedSnippet> = None;
                if let Some(query_embedding) = query_embedding
                    .as_ref()
                    .filter(|_| result.context_snippet.is_none())
                {
                    if should_extract_evidence(&result.path) {
                        if let Some(content) = super::evidence::passage_extractor::read_file_content(
                            &result.path,
                            evidence_max_bytes,
                        ) {
                            if processed.mode == QueryMode::Ask
                                && !processed.anchor_terms.is_empty()
                            {
                                let passages =
                                    passage_extractor.extract(&content, query_embedding, |chunk| {
                                        evidence_engine.embed_passage_chunk(chunk)
                                    });
                                if !passages.is_empty() {
                                    let semantic_scores: Vec<(usize, f32)> = passages
                                        .iter()
                                        .enumerate()
                                        .map(|(idx, passage)| (idx, passage.score))
                                        .collect();
                                    let selector =
                                        TrustedSnippetSelector::new(SnippetTrustConfig {
                                            min_anchor_hits: if processed.anchor_terms.len() >= 2 {
                                                2
                                            } else {
                                                1
                                            },
                                            ..Default::default()
                                        });
                                    if let Some(trusted) = selector.select_trusted_passage(
                                        &passages,
                                        &processed.anchor_terms,
                                        &semantic_scores,
                                    ) {
                                        let display = passage_extractor
                                            .truncate_for_display(&trusted.passage.text);
                                        semantic_passage = Some(display.clone());
                                        semantic_offset = trusted.passage.offset;
                                        let matched_lines: Vec<String> =
                                            display.lines().map(|l| l.to_string()).collect();
                                        result.context_snippet =
                                            Some(super::snippet::ContextSnippet::new(
                                                trusted.passage.line_number,
                                                Vec::new(),
                                                matched_lines,
                                                Vec::new(),
                                                display,
                                            ));
                                        ask_mode_trust = Some(trusted);
                                    }
                                }
                            } else if let Some(passage) =
                                passage_extractor.best_passage(&content, query_embedding, |chunk| {
                                    evidence_engine.embed_passage_chunk(chunk)
                                })
                            {
                                let display = passage_extractor.truncate_for_display(&passage.text);
                                semantic_passage = Some(display.clone());
                                semantic_offset = passage.offset;
                                let matched_lines: Vec<String> =
                                    display.lines().map(|l| l.to_string()).collect();
                                result.context_snippet = Some(super::snippet::ContextSnippet::new(
                                    passage.line_number,
                                    Vec::new(),
                                    matched_lines,
                                    Vec::new(),
                                    display,
                                ));
                            }
                        }
                    }
                }

                if result.context_snippet.is_none()
                    && context_lines > 0
                    && (processed.mode != QueryMode::Ask || processed.anchor_terms.is_empty())
                {
                    if let Some(content) = super::evidence::passage_extractor::read_file_content(
                        &result.path,
                        evidence_max_bytes,
                    ) {
                        if let Some(snippet) = super::snippet::extract_context_from_string(
                            &content,
                            &semantic_query,
                            context_lines,
                        ) {
                            result.context_snippet = Some(snippet);
                        }
                    }
                }

                let evidence = build_evidence_summary(
                    result,
                    lexical_lookup.get(&result.path),
                    &query_terms,
                    semantic_passage,
                    semantic_offset,
                    ask_mode_trust,
                );
                result.evidence = Some(evidence);
            }

            // Push enriched snippets/evidence as an update without resetting the search lifecycle.
            let _ = tx.try_send(SearchEvent::SemanticResults(final_results.clone()));
        }
        {
            let mut stats = stream_stats.lock().unwrap();
            stats.candidates = if has_lexical_results {
                lexical_results_len
            } else {
                final_results.len()
            };
        }

        let mut embedding = self.semantic_engine.metrics().await;
        if let Some(pro) = &self.pro_engine {
            let other = pro.metrics().await;
            embedding.cache_hits += other.cache_hits;
            embedding.candidates_embedded += other.candidates_embedded;
            embedding.io_read_bytes += other.io_read_bytes;
            embedding.embedding_ms += other.embedding_ms;
        }
        let candidates = self.lexical_engine.candidate_stats().await;
        {
            let mut stats = stream_stats.lock().unwrap();
            stats.files_scanned = candidates.files_scanned;
            stats.embedded = embedding.candidates_embedded;
            stats.cache_hits = embedding.cache_hits;
        }
        self.diagnostics = SearchDiagnostics {
            candidates,
            embedding,
        };

        let mut semantic_events: Vec<StreamEventItem> = Vec::new();
        for (slot_index, result) in final_results.iter().enumerate() {
            if stream_event_count.load(Ordering::Relaxed) >= MAX_STREAM_EVENTS {
                break;
            }
            semantic_events.push(StreamEventItem {
                id: format!("semantic:{}", result.path.display()),
                kind: StreamEventKind::Semantic,
                score: result.score,
                slot_index,
                path_hint: None,
            });
            stream_event_count.fetch_add(1, Ordering::Relaxed);
        }

        if !semantic_events.is_empty() {
            let semantic_stats = stream_stats.lock().unwrap().clone();
            let _ = tx.try_send(SearchEvent::StreamUpdate {
                stage: StreamStage::Semantic,
                stats: semantic_stats,
                events: semantic_events,
            });
        }

        let tail_stats = stream_stats.lock().unwrap().clone();
        let _ = tx.try_send(SearchEvent::StreamUpdate {
            stage: StreamStage::Tail,
            stats: tail_stats,
            events: Vec::new(),
        });
        let _ = tx.send(SearchEvent::Complete).await;

        Ok(())
    }

    pub fn diagnostics(&self) -> &SearchDiagnostics {
        &self.diagnostics
    }

    /// Simple blocking search (non-progressive)
    ///
    /// Executes the full search pipeline and returns the final results.
    /// Useful for CLI or when streaming is not needed.
    pub async fn search(
        &mut self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<RankedResult>, SearchError> {
        let (tx, mut rx) = mpsc::channel(64);
        let cancel = CancellationToken::new();

        // Override max_results for this search
        let original_max = self.config.max_results;
        self.config.max_results = limit;

        let (final_results, search_error) = {
            let search_future = self.search_progressive(query.to_string(), tx, cancel);
            tokio::pin!(search_future);

            let mut final_results: Option<Vec<RankedResult>> = None;
            let mut search_completed = false;
            let mut search_error: Option<SearchError> = None;

            loop {
                tokio::select! {
                    result = &mut search_future, if !search_completed => {
                        search_completed = true;
                        if let Err(err) = result {
                            search_error = Some(err);
                            break;
                        }
                    }
                    event = rx.recv() => {
                        match event {
                            Some(SearchEvent::SemanticResults(results)) => {
                                final_results = Some(results);
                            }
                            Some(SearchEvent::Error(e)) => {
                                search_error = Some(SearchError::SemanticFailed(e));
                                break;
                            }
                            Some(SearchEvent::Complete) => {
                                if search_completed {
                                    break;
                                }
                            }
                            Some(_) => {}
                            None => {
                                if search_completed {
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            (final_results, search_error)
        };

        // Restore original config
        self.config.max_results = original_max;

        if let Some(err) = search_error {
            return Err(err);
        }

        Ok(final_results.unwrap_or_default())
    }

    /// Get reference to the secure ranker
    pub fn secure_ranker(&self) -> &SecureRanker {
        &self.secure_ranker
    }

    /// Get mutable reference to the secure ranker
    pub fn secure_ranker_mut(&mut self) -> &mut SecureRanker {
        &mut self.secure_ranker
    }

    /// Get the current configuration
    pub fn config(&self) -> &ProgressiveSearchConfig {
        &self.config
    }
}

fn rank_with_optional_witness_guard(
    query: &str,
    semantic_results: &[SemanticMatch],
    enable_secure_ranking: bool,
    max_results: usize,
    min_score_threshold: f32,
    secure_ranker: &mut SecureRanker,
    lexical_lookup: &std::collections::HashMap<std::path::PathBuf, LexicalMatch>,
    query_terms: &[String],
) -> Vec<RankedResult> {
    let guard_on = witness_guard_enabled();
    let ranking_limit = if guard_on {
        max_results.saturating_mul(4).max(max_results)
    } else {
        max_results
    };

    let mut ranked: Vec<RankedResult> = rank_semantic_candidates(
        query,
        semantic_results,
        enable_secure_ranking,
        ranking_limit,
        secure_ranker,
    )
    .into_iter()
    .filter(|r| r.score >= min_score_threshold)
    .collect();

    if guard_on {
        promote_witness_anchor_candidate(&mut ranked, lexical_lookup, query_terms, max_results);
    }

    ranked.truncate(max_results);
    ranked
}

fn semantic_candidate_limit(
    max_results: usize,
    candidate_multiplier: usize,
    _witness_guard_on: bool,
) -> usize {
    max_results.saturating_mul(candidate_multiplier.max(1))
}

fn semantic_pure_limit(max_results: usize, witness_guard_on: bool) -> usize {
    let base = max_results.max(1);
    if witness_guard_on {
        base.saturating_mul(4).max(32)
    } else {
        base
    }
}

fn rank_semantic_candidates(
    query: &str,
    semantic_results: &[SemanticMatch],
    enable_secure_ranking: bool,
    max_results: usize,
    secure_ranker: &mut SecureRanker,
) -> Vec<RankedResult> {
    if enable_secure_ranking {
        let candidates: Vec<Candidate> = semantic_results
            .iter()
            .map(|m| Candidate::new(m.path.clone(), m.similarity))
            .collect();
        secure_ranker.rank(query, candidates)
    } else {
        semantic_results
            .iter()
            .take(max_results)
            .map(|m| {
                RankedResult::new(
                    m.path.clone(),
                    m.similarity,
                    true, // Assume integrity verified
                    ScoreBreakdown {
                        semantic: m.similarity,
                        integrity: 1.0,
                        temporal: 0.5,
                        behavior: 1.0,
                        personal: 0.0,
                    },
                )
            })
            .collect()
    }
}

fn witness_hit_count(
    path: &std::path::Path,
    lexical_lookup: &std::collections::HashMap<std::path::PathBuf, LexicalMatch>,
    query_terms: &[String],
) -> usize {
    lexical_lookup
        .get(path)
        .map(|m| matched_terms_from_text(query_terms, &m.content_snippet).len())
        .unwrap_or(0)
}

fn promote_witness_anchor_candidate(
    ranked: &mut Vec<RankedResult>,
    lexical_lookup: &std::collections::HashMap<std::path::PathBuf, LexicalMatch>,
    query_terms: &[String],
    top_k: usize,
) {
    if ranked.is_empty() || query_terms.is_empty() || top_k == 0 {
        return;
    }

    if query_requests_sensitive_content(query_terms) {
        return;
    }

    let mut witness_cache: std::collections::HashMap<std::path::PathBuf, usize> =
        std::collections::HashMap::new();
    let mut witness_hits_for = |path: &std::path::Path| -> usize {
        if let Some(hits) = witness_cache.get(path) {
            return *hits;
        }
        let lexical_hits = witness_hit_count(path, lexical_lookup, query_terms);
        let hits = if lexical_hits > 0 {
            lexical_hits
        } else {
            content_witness_hit_count(path, query_terms)
        };
        witness_cache.insert(path.to_path_buf(), hits);
        hits
    };

    let top_k = top_k.min(ranked.len());
    let top_has_strong_witness = ranked
        .iter()
        .take(top_k)
        .any(|result| witness_hits_for(&result.path) >= 2);
    if top_has_strong_witness {
        return;
    }

    let promote_idx = ranked
        .iter()
        .enumerate()
        .skip(top_k)
        .find_map(|(idx, result)| {
            let hits = witness_hits_for(&result.path);
            if hits >= 2 && !path_is_sensitive(&result.path) {
                Some(idx)
            } else {
                None
            }
        });

    if let Some(idx) = promote_idx {
        let promoted = ranked.remove(idx);
        ranked.insert(0, promoted);
    }
}

fn score_entropy(scores: &[f32]) -> f32 {
    if scores.is_empty() {
        return 0.0;
    }
    let max_score = scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let mut exp_scores = Vec::with_capacity(scores.len());
    let mut sum_exp = 0.0;
    for s in scores {
        let v = (*s - max_score).exp();
        exp_scores.push(v);
        sum_exp += v;
    }
    if sum_exp <= 1e-8 {
        return 0.0;
    }
    let mut entropy = 0.0;
    for v in exp_scores {
        let p = v / sum_exp;
        if p > 1e-8 {
            entropy -= p * p.ln();
        }
    }
    let denom = (scores.len() as f32).ln().max(1e-6);
    (entropy / denom).clamp(0.0, 1.0)
}

fn should_refine(
    query_terms: usize,
    lexical_results: &[LexicalMatch],
    semantic_results: &[SemanticMatch],
    config: AutoModeConfig,
) -> bool {
    if semantic_results.is_empty() {
        return true;
    }

    let mut scores: Vec<f32> = semantic_results.iter().map(|m| m.similarity).collect();
    scores.sort_by(|a, b: &f32| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

    if scores.is_empty() {
        return true;
    }

    let gap = if scores.len() >= 2 {
        let idx = scores.len().min(5) - 1;
        scores[0] - scores[idx]
    } else {
        0.0
    };
    let lexical_max = lexical_results
        .iter()
        .map(|m| m.match_ratio())
        .fold(0.0_f32, f32::max);
    let exact_top_hits = lexical_results
        .iter()
        .take(5)
        .filter(|m| m.is_exact_match())
        .count();

    if exact_top_hits >= 3 && query_terms > 1 {
        tracing::debug!(
            query_terms,
            lexical_max,
            exact_top_hits,
            "Auto refine skipped due to strong lexical consensus"
        );
        return false;
    }
    let entropy = score_entropy(&scores);
    let top_1 = scores[0];
    let top_k = scores.len().min(5);
    let top_k_avg = scores.iter().take(top_k).sum::<f32>() / top_k as f32;

    let weak_gap = gap < config.gap_threshold;
    let weak_lexical = lexical_max < config.lexical_threshold;
    let high_entropy = entropy > config.entropy_threshold;
    let low_top_1 = top_1 < 0.63;
    let low_top_k = top_k_avg < 0.58;

    let mut uncertainty_signals = 0usize;
    if weak_gap {
        uncertainty_signals += 1;
    }
    if weak_lexical {
        uncertainty_signals += 1;
    }
    if high_entropy {
        uncertainty_signals += 1;
    }
    if low_top_1 {
        uncertainty_signals += 1;
    }
    if low_top_k {
        uncertainty_signals += 1;
    }

    let required_signals = if query_terms <= config.short_query_len {
        4
    } else {
        2
    };

    let should_refine = uncertainty_signals >= required_signals;
    tracing::debug!(
        query_terms,
        gap,
        lexical_max,
        entropy,
        top_1,
        top_k_avg,
        weak_gap,
        weak_lexical,
        exact_top_hits,
        high_entropy,
        low_top_1,
        low_top_k,
        uncertainty_signals,
        required_signals,
        should_refine,
        "Auto refine heuristic signals"
    );
    should_refine
}

fn dir_prior_score(query_terms: &[String], path: &std::path::Path) -> f32 {
    if query_terms.is_empty() {
        return 0.0;
    }
    let mut hits = 0usize;
    for part in path.parent().into_iter().flat_map(|p| p.iter()) {
        if let Some(token) = part.to_str() {
            let lower = token.to_lowercase();
            for term in query_terms {
                if lower.contains(term) {
                    hits += 1;
                }
            }
        }
    }
    (hits as f32) / (query_terms.len() as f32)
}

fn apply_fusion(
    semantic_results: &mut [SemanticMatch],
    lexical_lookup: &std::collections::HashMap<std::path::PathBuf, LexicalMatch>,
    query_terms: &[String],
    config: FusionConfig,
    flash_scores: Option<&std::collections::HashMap<std::path::PathBuf, f32>>,
) {
    if (config.flash + config.pro + config.lexical + config.dir_prior) <= 0.0 {
        return;
    }
    let flash_weight = config.flash;
    let pro_weight = config.pro;
    let lexical_weight = config.lexical;
    let dir_weight = config.dir_prior;
    for item in semantic_results.iter_mut() {
        let lexical_score = lexical_lookup
            .get(&item.path)
            .map(|m| m.match_ratio())
            .unwrap_or(0.0);
        let dir_score = dir_prior_score(query_terms, &item.path);
        let flash_score = flash_scores
            .and_then(|scores| scores.get(&item.path).copied())
            .unwrap_or(item.similarity);
        let pro_score = item.similarity;
        item.similarity = flash_weight * flash_score
            + pro_weight * pro_score
            + lexical_weight * lexical_score
            + dir_weight * dir_score;
    }
}

fn maybe_apply_witness_guard(
    semantic_results: &mut [SemanticMatch],
    lexical_lookup: &std::collections::HashMap<std::path::PathBuf, LexicalMatch>,
    query_terms: &[String],
) {
    if !witness_guard_enabled() {
        return;
    }
    apply_witness_guard(semantic_results, lexical_lookup, query_terms);
}

fn witness_guard_enabled() -> bool {
    std::env::var("IXOS_EXPERIMENT_WITNESS_GUARD")
        .ok()
        .map(|v| {
            matches!(
                v.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "on" | "yes"
            )
        })
        .unwrap_or(false)
}

fn apply_witness_guard(
    semantic_results: &mut [SemanticMatch],
    lexical_lookup: &std::collections::HashMap<std::path::PathBuf, LexicalMatch>,
    query_terms: &[String],
) {
    if semantic_results.is_empty() || query_terms.is_empty() {
        return;
    }

    let sensitive_query = query_requests_sensitive_content(query_terms);
    if sensitive_query {
        return;
    }

    let sensitive_paths_present = semantic_results
        .iter()
        .take(20)
        .any(|item| path_is_sensitive(&item.path));
    if !sensitive_paths_present {
        return;
    }

    let has_strong_non_sensitive_witness = semantic_results.iter().take(10).any(|item| {
        if path_is_sensitive(&item.path) {
            return false;
        }
        let lexical_hits = lexical_lookup
            .get(&item.path)
            .map(|m| matched_terms_from_text(query_terms, &m.content_snippet).len())
            .unwrap_or(0);
        let content_hits = if lexical_hits == 0 {
            content_witness_hit_count(&item.path, query_terms)
        } else {
            0
        };
        lexical_hits.max(content_hits) >= 2
    });
    if has_strong_non_sensitive_witness {
        return;
    }

    for item in semantic_results.iter_mut() {
        let lexical = lexical_lookup.get(&item.path);
        let lexical_ratio = lexical
            .map(|m| m.match_ratio().clamp(0.0, 1.0))
            .unwrap_or(0.0);
        let lexical_term_hits = lexical
            .map(|m| matched_terms_from_text(query_terms, &m.content_snippet).len())
            .unwrap_or(0);
        let content_term_hits = if lexical_term_hits == 0 {
            content_witness_hit_count(&item.path, query_terms)
        } else {
            0
        };
        let total_term_hits = lexical_term_hits.max(content_term_hits);
        let exact_bonus = lexical
            .map(|m| if m.is_exact_match() { 0.14 } else { 0.0 })
            .unwrap_or(0.0);
        let witness_bonus = (lexical_ratio * 0.28).min(0.28)
            + exact_bonus
            + if total_term_hits >= 2 {
                0.18
            } else if total_term_hits == 1 {
                0.06
            } else {
                0.0
            };

        let sensitive_path = path_is_sensitive(&item.path);
        let privacy_penalty = if !sensitive_query && sensitive_path && total_term_hits == 0 {
            0.40
        } else {
            0.0
        };

        item.similarity = (item.similarity + witness_bonus - privacy_penalty).clamp(0.0, 1.0);
    }

    semantic_results.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
}

fn query_requests_sensitive_content(query_terms: &[String]) -> bool {
    const SENSITIVE_TERMS: [&str; 6] = [
        "restricted",
        "secret",
        "private",
        "confidential",
        "credential",
        "password",
    ];
    query_terms.iter().any(|term| {
        let lower = term.to_ascii_lowercase();
        SENSITIVE_TERMS.iter().any(|needle| lower.contains(needle))
    })
}

fn path_is_sensitive(path: &std::path::Path) -> bool {
    const SENSITIVE_TERMS: [&str; 6] = [
        "restricted",
        "secret",
        "private",
        "confidential",
        "credential",
        "password",
    ];

    path.components().any(|component| {
        let token = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        SENSITIVE_TERMS.iter().any(|needle| token.contains(needle))
    })
}

fn content_witness_hit_count(path: &std::path::Path, query_terms: &[String]) -> usize {
    if query_terms.is_empty() {
        return 0;
    }
    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return 0,
    };
    let mut buf = vec![0_u8; 16 * 1024];
    let read = match file.read(&mut buf) {
        Ok(n) => n,
        Err(_) => return 0,
    };
    if read == 0 {
        return 0;
    }
    let text = String::from_utf8_lossy(&buf[..read]).to_ascii_lowercase();
    query_terms
        .iter()
        .filter(|term| text.contains(term.as_str()))
        .count()
}

fn extract_query_terms(query: &str) -> Vec<String> {
    let mut terms = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in query.chars() {
        if ch == '"' {
            in_quotes = !in_quotes;
            continue;
        }
        if ch.is_whitespace() && !in_quotes {
            if !current.is_empty() {
                push_term(&mut terms, &current);
                current.clear();
            }
            continue;
        }
        current.push(ch);
    }

    if !current.is_empty() {
        push_term(&mut terms, &current);
    }

    terms
}

fn filter_lexical_by_anchors(
    results: Vec<LexicalMatch>,
    anchors: &[AnchorTerm],
) -> Vec<LexicalMatch> {
    if anchors.is_empty() {
        return results;
    }

    results
        .into_iter()
        .filter(|item| {
            let snippet = item.content_snippet.to_lowercase();
            anchors.iter().any(|anchor| snippet.contains(&anchor.term))
        })
        .collect()
}

fn push_term(terms: &mut Vec<String>, raw: &str) {
    let lower = raw.to_lowercase();
    if lower.len() < 2 {
        return;
    }
    if lower.contains(':') {
        return;
    }
    terms.push(lower);
}

fn should_extract_evidence(path: &std::path::Path) -> bool {
    crate::parsers::can_extract_text(path)
}

fn build_evidence_summary(
    result: &RankedResult,
    lexical: Option<&LexicalMatch>,
    query_terms: &[String],
    semantic_passage: Option<String>,
    semantic_offset: usize,
    ask_mode_trust: Option<TrustedSnippet>,
) -> EvidenceSummary {
    let mut evidence_items: Vec<Evidence> = Vec::new();

    if let Some(lexical) = lexical {
        let matched_terms = matched_terms_from_text(query_terms, &lexical.content_snippet);
        let tf_score = if lexical.total_terms == 0 {
            0.0
        } else {
            lexical.term_matches as f32 / lexical.total_terms as f32
        };
        evidence_items.push(Evidence::Lexical {
            terms: matched_terms.clone(),
            snippet: lexical.content_snippet.clone(),
            line_numbers: lexical.line_numbers.clone(),
            tf_score,
        });
    }

    if let Some(ref passage) = semantic_passage {
        evidence_items.push(Evidence::Semantic {
            similarity: result.score_breakdown.semantic,
            best_chunk: passage.clone(),
            chunk_offset: semantic_offset,
            concepts: Vec::new(),
        });
    }

    if let Some(trusted) = ask_mode_trust {
        evidence_items.push(Evidence::AskModeTrust {
            anchor_coverage: trusted.anchor_coverage,
            matched_anchors: trusted.matched_anchors,
            why_matched: trusted.why_matched,
        });
    }

    let (path_tokens, matched_parts) = path_tags_and_matches(&result.path, query_terms);
    if !path_tokens.is_empty() {
        evidence_items.push(Evidence::PathMatch {
            tokens: path_tokens.clone(),
            matched_parts,
            path_score: 0.5,
        });
    }

    let chain = EvidenceChain::build(result.path.clone(), result.score, evidence_items);

    let matched_terms = if let Some(lexical) = lexical {
        matched_terms_from_text(query_terms, &lexical.content_snippet)
    } else {
        matched_terms_from_text(query_terms, &result.path.to_string_lossy())
    };

    EvidenceSummary {
        tags: chain.tags.clone(),
        explanation: Some(chain.explanation),
        lexical_hit_count: lexical.map(|m| m.term_matches),
        matched_terms,
        semantic_passage,
        path_tags: path_tokens,
        file_type: result
            .path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase()),
    }
}

fn matched_terms_from_text(query_terms: &[String], text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    query_terms
        .iter()
        .filter(|term| lower.contains(term.as_str()))
        .cloned()
        .collect()
}

fn path_tags_and_matches(
    path: &std::path::Path,
    query_terms: &[String],
) -> (Vec<String>, Vec<super::evidence::types::PathPart>) {
    let mut tags = Vec::new();
    let mut matched_parts = Vec::new();

    let filename = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let filename_tokens = tokenize_path_segment(&filename);
    if !filename_tokens.is_empty() {
        tags.extend(filename_tokens.clone());
    }

    let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase());

    let parent_token = path
        .parent()
        .and_then(|p| p.file_name())
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    if !parent_token.is_empty() {
        tags.push(parent_token.clone());
    }

    if query_terms.iter().any(|t| filename.contains(t)) {
        matched_parts.push(super::evidence::types::PathPart::Filename);
    }
    if let Some(ext) = ext.as_ref() {
        if query_terms.iter().any(|t| t == ext) {
            matched_parts.push(super::evidence::types::PathPart::Extension);
        }
    }
    if !parent_token.is_empty() && query_terms.iter().any(|t| parent_token.contains(t)) {
        matched_parts.push(super::evidence::types::PathPart::Parent);
    }

    tags.sort();
    tags.dedup();

    (tags, matched_parts)
}

fn tokenize_path_segment(segment: &str) -> Vec<String> {
    segment
        .split(|c: char| c == '_' || c == '-' || c == '.' || c == ' ')
        .map(|s| s.trim().to_lowercase())
        .filter(|s| s.len() >= 2)
        .collect()
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ixos_rank::{StubLexicalEngine, StubSemanticEngine};
    use async_trait::async_trait;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    #[derive(Clone, Default)]
    struct CountingSemanticEngine {
        rerank_calls: Arc<AtomicUsize>,
        search_calls: Arc<AtomicUsize>,
        embed_calls: Arc<AtomicUsize>,
    }

    impl CountingSemanticEngine {
        fn new() -> Self {
            Self::default()
        }

        fn rerank_calls(&self) -> usize {
            self.rerank_calls.load(Ordering::Relaxed)
        }

        fn search_calls(&self) -> usize {
            self.search_calls.load(Ordering::Relaxed)
        }

        fn embed_calls(&self) -> usize {
            self.embed_calls.load(Ordering::Relaxed)
        }
    }

    #[async_trait]
    impl SemanticEngine for CountingSemanticEngine {
        async fn rerank(
            &self,
            _query: &str,
            candidates: Vec<LexicalMatch>,
            limit: usize,
        ) -> Result<Vec<SemanticMatch>, SearchError> {
            self.rerank_calls.fetch_add(1, Ordering::Relaxed);
            Ok(candidates
                .into_iter()
                .take(limit)
                .map(|m| SemanticMatch::new(m.path, 0.5))
                .collect())
        }

        async fn search_pure(
            &self,
            _query: &str,
            _limit: usize,
        ) -> Result<Vec<SemanticMatch>, SearchError> {
            self.search_calls.fetch_add(1, Ordering::Relaxed);
            Ok(Vec::new())
        }

        async fn embed_query(&self, _query: &str) -> Result<Vec<f32>, SearchError> {
            self.embed_calls.fetch_add(1, Ordering::Relaxed);
            Ok(vec![0.0, 0.0, 0.0])
        }

        fn embed_passage_chunk(&self, _text: &str) -> Option<Vec<f32>> {
            self.embed_calls.fetch_add(1, Ordering::Relaxed);
            Some(vec![0.0, 0.0, 0.0])
        }
    }

    fn create_test_engine() -> ProgressiveSearchEngine<StubLexicalEngine, StubSemanticEngine> {
        let lexical = StubLexicalEngine::new();
        let semantic = StubSemanticEngine::with_stub_model();
        ProgressiveSearchEngine::new(lexical, semantic)
    }

    fn create_populated_engine() -> ProgressiveSearchEngine<StubLexicalEngine, StubSemanticEngine> {
        let mut lexical = StubLexicalEngine::new();
        lexical.add_file(
            PathBuf::from("/test/doc1.txt"),
            "The quick brown fox jumps over the lazy dog".to_string(),
        );
        lexical.add_file(
            PathBuf::from("/test/doc2.txt"),
            "Hello world, this is a test document".to_string(),
        );

        let semantic = StubSemanticEngine::with_stub_model();

        ProgressiveSearchEngine::new(lexical, semantic)
    }

    #[test]
    fn test_config_default() {
        let config = ProgressiveSearchConfig::default();
        assert_eq!(config.max_results, 20);
        assert!(config.enable_secure_ranking);
    }

    #[test]
    fn test_config_fast() {
        let config = ProgressiveSearchConfig::fast();
        assert!(config.lexical_timeout < Duration::from_millis(200));
    }

    #[test]
    fn test_config_thorough() {
        let config = ProgressiveSearchConfig::thorough();
        assert!(config.semantic_timeout >= Duration::from_secs(10));
    }

    #[tokio::test]
    async fn test_progressive_search_empty_query() {
        let mut engine = create_test_engine();
        let (tx, mut rx) = mpsc::channel(256);
        let cancel = CancellationToken::new();

        engine
            .search_progressive("test".to_string(), tx, cancel)
            .await
            .unwrap();

        // Should receive Complete (no results since engine is empty)
        let mut saw_complete = false;
        while let Some(event) = rx.recv().await {
            if matches!(event, SearchEvent::Complete) {
                saw_complete = true;
                break;
            }
        }
        assert!(saw_complete);
    }

    #[tokio::test]
    async fn test_progressive_search_with_results() {
        let mut engine = create_populated_engine();
        let (tx, mut rx) = mpsc::channel(256);
        let cancel = CancellationToken::new();

        engine
            .search_progressive("quick brown".to_string(), tx, cancel)
            .await
            .unwrap();

        let mut saw_lexical = false;
        let mut saw_understanding_status = false;
        let mut saw_complete = false;

        while let Some(event) = rx.recv().await {
            match event {
                SearchEvent::LexicalResults(results) => {
                    assert!(!results.is_empty());
                    saw_lexical = true;
                }
                SearchEvent::Status(msg) => {
                    if msg.contains("Understanding") {
                        saw_understanding_status = true;
                    }
                }
                SearchEvent::Complete => {
                    saw_complete = true;
                    break;
                }
                _ => {}
            }
        }

        assert!(saw_lexical, "Should have received lexical results");
        assert!(
            saw_understanding_status,
            "Should have received semantic understanding status update"
        );
        assert!(saw_complete, "Should have received complete");
    }

    #[tokio::test]
    async fn test_cancellation() {
        let mut engine = create_populated_engine();
        let (tx, mut rx) = mpsc::channel(256);
        let cancel = CancellationToken::new();

        // Cancel immediately
        cancel.cancel();

        engine
            .search_progressive("test".to_string(), tx, cancel)
            .await
            .unwrap();

        // Should receive Cancelled (ignore any stream updates)
        let mut saw_cancelled = false;
        while let Some(event) = rx.recv().await {
            if matches!(event, SearchEvent::Cancelled) {
                saw_cancelled = true;
                break;
            }
        }
        assert!(saw_cancelled);
    }

    #[tokio::test]
    async fn test_simple_search() {
        let mut engine = create_populated_engine();

        let results = engine.search("quick", 10).await.unwrap();
        // May or may not have results depending on semantic engine state
        // but should not error
        assert!(results.len() <= 10);
    }

    #[tokio::test]
    async fn test_search_respects_limit() {
        let mut engine = create_populated_engine();

        let results = engine.search("the", 1).await.unwrap();
        assert!(results.len() <= 1);
    }

    #[test]
    fn test_engine_accessors() {
        let engine = create_test_engine();
        assert_eq!(engine.config().max_results, 20);
        assert_eq!(engine.secure_ranker().cache_size(), 0);
    }

    #[test]
    fn test_should_refine_skips_high_confidence_short_query() {
        let config = AutoModeConfig {
            gap_threshold: 0.05,
            lexical_threshold: 0.15,
            short_query_len: 2,
            entropy_threshold: 0.9,
            pro_top_k: 20,
        };

        let lexical_results = vec![LexicalMatch::new(
            PathBuf::from("/test/high_conf.txt"),
            1.0,
            String::new(),
            2,
            2,
        )];

        let semantic_results = vec![
            SemanticMatch::new(PathBuf::from("/test/1.txt"), 0.86),
            SemanticMatch::new(PathBuf::from("/test/2.txt"), 0.80),
            SemanticMatch::new(PathBuf::from("/test/3.txt"), 0.76),
            SemanticMatch::new(PathBuf::from("/test/4.txt"), 0.73),
            SemanticMatch::new(PathBuf::from("/test/5.txt"), 0.69),
        ];

        assert!(
            !should_refine(2, &lexical_results, &semantic_results, config),
            "Auto refinement should be skipped for high-confidence short queries"
        );
    }

    #[test]
    fn test_should_refine_runs_on_low_confidence_short_query() {
        let config = AutoModeConfig {
            gap_threshold: 0.05,
            lexical_threshold: 0.15,
            short_query_len: 2,
            entropy_threshold: 0.9,
            pro_top_k: 20,
        };

        let lexical_results = vec![LexicalMatch::new(
            PathBuf::from("/test/weak_lexical.txt"),
            0.0,
            String::new(),
            0,
            2,
        )];

        let semantic_results = vec![
            SemanticMatch::new(PathBuf::from("/test/1.txt"), 0.54),
            SemanticMatch::new(PathBuf::from("/test/2.txt"), 0.53),
            SemanticMatch::new(PathBuf::from("/test/3.txt"), 0.52),
            SemanticMatch::new(PathBuf::from("/test/4.txt"), 0.52),
            SemanticMatch::new(PathBuf::from("/test/5.txt"), 0.51),
        ];

        assert!(
            should_refine(2, &lexical_results, &semantic_results, config),
            "Auto refinement should run when confidence signals are weak"
        );
    }

    #[test]
    fn test_should_refine_skips_with_strong_lexical_consensus() {
        let config = AutoModeConfig {
            gap_threshold: 0.05,
            lexical_threshold: 0.15,
            short_query_len: 2,
            entropy_threshold: 0.9,
            pro_top_k: 20,
        };

        let lexical_results = vec![
            LexicalMatch::new(PathBuf::from("/test/1.txt"), 1.0, String::new(), 2, 2),
            LexicalMatch::new(PathBuf::from("/test/2.txt"), 1.0, String::new(), 2, 2),
            LexicalMatch::new(PathBuf::from("/test/3.txt"), 1.0, String::new(), 2, 2),
            LexicalMatch::new(PathBuf::from("/test/4.txt"), 1.0, String::new(), 1, 2),
            LexicalMatch::new(PathBuf::from("/test/5.txt"), 1.0, String::new(), 1, 2),
        ];

        let semantic_results = vec![
            SemanticMatch::new(PathBuf::from("/test/1.txt"), 0.52),
            SemanticMatch::new(PathBuf::from("/test/2.txt"), 0.51),
            SemanticMatch::new(PathBuf::from("/test/3.txt"), 0.51),
            SemanticMatch::new(PathBuf::from("/test/4.txt"), 0.50),
            SemanticMatch::new(PathBuf::from("/test/5.txt"), 0.50),
        ];

        assert!(
            !should_refine(2, &lexical_results, &semantic_results, config),
            "Auto refinement should be skipped when lexical top hits strongly agree"
        );
    }

    #[test]
    fn test_apply_witness_guard_promotes_anchor_and_penalizes_sensitive_path() {
        use std::collections::HashMap;

        let restricted_path = PathBuf::from("/repo/restricted/secret.txt");
        let witness_path = PathBuf::from("/repo/logs/app.log");

        let mut semantic_results = vec![
            SemanticMatch::new(restricted_path.clone(), 0.70),
            SemanticMatch::new(witness_path.clone(), 0.66),
        ];

        let mut lexical_lookup = HashMap::new();
        lexical_lookup.insert(
            witness_path.clone(),
            LexicalMatch::new(witness_path.clone(), 0.5, "Streaming update".into(), 1, 2),
        );

        let query_terms = vec!["results".to_string(), "streamed".to_string()];
        apply_witness_guard(&mut semantic_results, &lexical_lookup, &query_terms);

        let restricted_score = semantic_results
            .iter()
            .find(|m| m.path == restricted_path)
            .map(|m| m.similarity)
            .unwrap_or_default();
        let witness_score = semantic_results
            .iter()
            .find(|m| m.path == witness_path)
            .map(|m| m.similarity)
            .unwrap_or_default();

        assert!(
            witness_score > restricted_score,
            "witness candidate should outrank penalized sensitive path"
        );
    }

    #[test]
    fn test_apply_witness_guard_reorders_results_after_score_shift() {
        use std::collections::HashMap;

        let temp = tempfile::NamedTempFile::new().expect("temp file");
        std::fs::write(temp.path(), "Results streamed in log pipeline").expect("write");

        let restricted_path = PathBuf::from("/repo/restricted/secret.txt");
        let witness_path = temp.path().to_path_buf();
        let mut semantic_results = vec![SemanticMatch::new(restricted_path.clone(), 0.75)];
        for i in 0..9 {
            let score = 0.39 - (i as f32 * 0.01);
            semantic_results.push(SemanticMatch::new(
                PathBuf::from(format!("/repo/docs/filler_{i}.txt")),
                score,
            ));
        }
        semantic_results.push(SemanticMatch::new(witness_path.clone(), 0.35));

        let lexical_lookup = HashMap::new();
        let query_terms = vec!["results".to_string(), "streamed".to_string()];

        apply_witness_guard(&mut semantic_results, &lexical_lookup, &query_terms);

        assert_eq!(semantic_results[0].path, witness_path);
    }

    #[test]
    fn test_apply_witness_guard_skips_when_top_has_strong_non_sensitive_witness() {
        use std::collections::HashMap;

        let temp = tempfile::NamedTempFile::new().expect("temp file");
        std::fs::write(temp.path(), "Results streamed in log pipeline").expect("write");
        let witness_path = temp.path().to_path_buf();
        let restricted_path = PathBuf::from("/repo/restricted/secret.txt");

        let mut semantic_results = vec![
            SemanticMatch::new(witness_path.clone(), 0.90),
            SemanticMatch::new(restricted_path.clone(), 0.80),
        ];

        let mut lexical_lookup = HashMap::new();
        lexical_lookup.insert(
            witness_path.clone(),
            LexicalMatch::new(witness_path.clone(), 1.0, "Results streamed".into(), 2, 2),
        );

        let query_terms = vec!["results".to_string(), "streamed".to_string()];
        apply_witness_guard(&mut semantic_results, &lexical_lookup, &query_terms);

        assert_eq!(semantic_results.len(), 2);
        assert_eq!(semantic_results[0].path, witness_path);
        assert_eq!(semantic_results[1].path, restricted_path);
        assert!((semantic_results[0].similarity - 0.90).abs() < f32::EPSILON);
        assert!((semantic_results[1].similarity - 0.80).abs() < f32::EPSILON);
    }

    #[test]
    fn test_query_sensitive_detection() {
        let sensitive = vec!["restricted".to_string(), "data".to_string()];
        let benign = vec!["results".to_string(), "streamed".to_string()];

        assert!(query_requests_sensitive_content(&sensitive));
        assert!(!query_requests_sensitive_content(&benign));
    }

    #[test]
    fn test_path_sensitive_detection() {
        let sensitive_path = PathBuf::from("/repo/restricted/secret.txt");
        let benign_path = PathBuf::from("/repo/logs/app.log");

        assert!(path_is_sensitive(&sensitive_path));
        assert!(!path_is_sensitive(&benign_path));
    }

    #[test]
    fn test_semantic_candidate_limit_stable_across_witness_guard_flag() {
        assert_eq!(semantic_candidate_limit(8, 5, false), 40);
        assert_eq!(semantic_candidate_limit(8, 5, true), 40);
        assert_eq!(semantic_candidate_limit(30, 5, true), 150);
        assert_eq!(semantic_candidate_limit(8, 0, false), 8);
    }

    #[test]
    fn test_semantic_pure_limit_with_witness_guard_overfetch() {
        assert_eq!(semantic_pure_limit(8, false), 8);
        assert_eq!(semantic_pure_limit(8, true), 32);
        assert_eq!(semantic_pure_limit(20, true), 80);
        assert_eq!(semantic_pure_limit(0, false), 1);
    }

    #[test]
    fn test_content_witness_hit_count_reads_terms() {
        let temp = tempfile::NamedTempFile::new().expect("temp file");
        std::fs::write(temp.path(), "Results streamed into channel").expect("write");
        let terms = vec!["results".to_string(), "streamed".to_string()];
        let hits = content_witness_hit_count(temp.path(), &terms);
        assert!(hits >= 2);
    }

    #[test]
    fn test_promote_witness_anchor_candidate_moves_anchor_into_top_window() {
        use std::collections::HashMap;

        let anchor_path = PathBuf::from("/repo/logs/app.log");
        let weak_path = PathBuf::from("/repo/docs/weak.txt");
        let filler_path = PathBuf::from("/repo/docs/filler.txt");

        let mut ranked = vec![
            RankedResult::new(
                weak_path.clone(),
                0.90,
                true,
                ScoreBreakdown {
                    semantic: 0.90,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
            RankedResult::new(
                filler_path.clone(),
                0.89,
                true,
                ScoreBreakdown {
                    semantic: 0.89,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
            RankedResult::new(
                anchor_path.clone(),
                0.70,
                true,
                ScoreBreakdown {
                    semantic: 0.70,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
        ];

        let mut lexical_lookup = HashMap::new();
        lexical_lookup.insert(
            anchor_path.clone(),
            LexicalMatch::new(anchor_path.clone(), 1.0, "Results streamed".into(), 2, 2),
        );

        let query_terms = vec!["results".to_string(), "streamed".to_string()];
        promote_witness_anchor_candidate(&mut ranked, &lexical_lookup, &query_terms, 2);

        assert_eq!(ranked[0].path, anchor_path);
    }

    #[test]
    fn test_promote_witness_anchor_candidate_uses_content_fallback_without_lexical_hit() {
        let temp = tempfile::NamedTempFile::new().expect("temp file");
        std::fs::write(
            temp.path(),
            "2026-01-20 10:00:01 Results streamed after merge operation",
        )
        .expect("write");

        let fallback_path = temp.path().to_path_buf();
        let mut ranked = vec![
            RankedResult::new(
                PathBuf::from("/repo/docs/changelog.txt"),
                0.90,
                true,
                ScoreBreakdown {
                    semantic: 0.90,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
            RankedResult::new(
                PathBuf::from("/repo/docs/overview.md"),
                0.89,
                true,
                ScoreBreakdown {
                    semantic: 0.89,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
            RankedResult::new(
                fallback_path.clone(),
                0.88,
                true,
                ScoreBreakdown {
                    semantic: 0.88,
                    integrity: 1.0,
                    temporal: 0.5,
                    behavior: 1.0,
                    personal: 0.0,
                },
            ),
        ];

        let lexical_lookup = std::collections::HashMap::new();
        let query_terms = vec!["results".to_string(), "streamed".to_string()];
        promote_witness_anchor_candidate(&mut ranked, &lexical_lookup, &query_terms, 2);

        assert_eq!(ranked[0].path, fallback_path);
    }

    #[tokio::test]
    async fn test_ask_mode_respects_selected_model() {
        let mut lexical = StubLexicalEngine::new();
        lexical.add_file(
            PathBuf::from("/test/ask.txt"),
            "Rust search question content".to_string(),
        );

        let flash_engine = CountingSemanticEngine::new();
        let pro_engine = CountingSemanticEngine::new();
        let flash_probe = flash_engine.clone();
        let pro_probe = pro_engine.clone();

        let mut config = ProgressiveSearchConfig::default();
        config.search_mode = SearchMode::Flash;
        config.evidence_max_results = 0;
        config.context_lines = 0;

        let mut engine = ProgressiveSearchEngine::with_config_and_pro(
            lexical,
            flash_engine,
            Some(pro_engine),
            config,
        );

        let (tx, mut rx) = mpsc::channel(256);
        let cancel = CancellationToken::new();

        engine
            .search_progressive("why rust?".to_string(), tx, cancel)
            .await
            .unwrap();

        while let Some(event) = rx.recv().await {
            if matches!(event, SearchEvent::Complete) {
                break;
            }
        }

        let flash_calls = flash_probe.rerank_calls() + flash_probe.search_calls();
        assert!(flash_calls > 0, "Flash should be used");
        assert_eq!(
            pro_probe.rerank_calls(),
            0,
            "Pro should not be forced for Ask Mode"
        );
        assert_eq!(pro_probe.search_calls(), 0);
        assert_eq!(pro_probe.embed_calls(), 0);
    }
}
