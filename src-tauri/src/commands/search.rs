//! Search command handlers
//!
//! Provides progressive search with streaming results to the frontend.

use crate::state::AppState;
use crate::commands::auth::verify_entitlement_token_internal;
use ixos_protocol::instrumentation::ipc_send_span;
use ixos_protocol::ixos_rank::{
    progressive::{SearchEvent, SearchMode, StreamEventKind, StreamStage},
    CandidateLexicalEngine, ProgressiveSearchConfig, ProgressiveSearchEngine, RankedResult,
    StubSemanticEngine,
};
use ixos_protocol::EvidenceTag;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{Emitter, State, Window};
use tokio::sync::mpsc;

// =============================================================================
// Payload Types for Frontend
// =============================================================================

/// Search event payload sent to frontend
#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SearchEventPayload {
    /// Quick lexical results
    LexicalResults {
        results: Vec<LexicalResultPayload>,
        count: usize,
    },
    /// P2.1 batched lexical results for streaming
    LexicalBatch {
        results: Vec<LexicalResultPayload>,
        count: usize,
        batch_number: u32,
        is_final: bool,
    },
    /// Status update
    Status { message: String },
    /// Final semantic results
    SemanticResults {
        results: Vec<RankedResultPayload>,
        count: usize,
    },
    /// P2.1 late semantic result discovered after completion
    LateResult {
        result: RankedResultPayload,
        discovery_time_ms: u64,
    },
    /// Search completed
    Complete,
    /// Search cancelled
    Cancelled,
    /// Error occurred
    Error { message: String },
    /// P3.4 streaming contract
    StreamUpdate {
        stage: StreamStagePayload,
        stats: StreamStatsPayload,
        events: Vec<StreamEventPayload>,
    },
}

/// Lexical result payload
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalResultPayload {
    pub path: String,
    pub filename: String,
    pub directory: String,
    pub score: f32,
    pub snippet: String,
    pub term_matches: usize,
    pub total_terms: usize,
}

/// Ranked result payload with full details
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedResultPayload {
    pub path: String,
    pub filename: String,
    pub directory: String,
    pub score: f32,
    pub integrity_verified: bool,
    pub score_breakdown: ScoreBreakdownPayload,
    pub context: Option<ContextPayload>,
    pub evidence: Option<EvidencePayload>,
    /// File size in bytes
    pub file_size: Option<u64>,
    /// File modification time as Unix timestamp (seconds since epoch)
    pub modified_at: Option<i64>,
    /// File extension (without the dot)
    pub file_extension: Option<String>,
}

/// Score breakdown payload
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreBreakdownPayload {
    pub semantic: f32,
    pub integrity: f32,
    pub temporal: f32,
    pub behavior: f32,
}

/// Context snippet payload
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextPayload {
    pub line_number: usize,
    pub before: Vec<String>,
    pub matched: Vec<String>,
    pub after: Vec<String>,
}

/// Evidence payload for UI display
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidencePayload {
    pub tags: Vec<EvidenceTag>,
    pub explanation: Option<String>,
    pub lexical_hit_count: Option<usize>,
    pub matched_terms: Vec<String>,
    pub semantic_passage: Option<String>,
    pub path_tags: Vec<String>,
    pub file_type: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamStatsPayload {
    pub files_scanned: usize,
    pub candidates: usize,
    pub embedded: usize,
    pub cache_hits: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEventPayload {
    pub id: String,
    pub kind: StreamEventKindPayload,
    pub score: f32,
    pub slot_index: usize,
    pub path: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StreamStagePayload {
    Echo,
    Lexical,
    Semantic,
    Refining,
    Tail,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StreamEventKindPayload {
    Lexical,
    Semantic,
    Scan,
}

/// Search options from frontend
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    pub limit: Option<usize>,
    pub secure_ranking: Option<bool>,
    pub context_lines: Option<usize>,
    pub cache_mode: Option<String>,
    pub journalist_mode: Option<bool>,
    pub secure_timing: Option<bool>,
    pub model_type: Option<String>,
    pub pro_model_type: Option<String>,
    pub search_mode: Option<String>,
    pub timeout_seconds: Option<u64>,
}

// =============================================================================
// Conversion Functions
// =============================================================================

fn path_to_parts(path: &Path) -> (String, String, String) {
    let path_str = path.display().to_string();
    let filename = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path_str.clone());
    let directory = path
        .parent()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    (path_str, filename, directory)
}

fn ranked_result_to_payload(result: &RankedResult) -> RankedResultPayload {
    let (path, filename, directory) = path_to_parts(&result.path);

    // Get file metadata for size and modification time
    let (file_size, modified_at) = match std::fs::metadata(&result.path) {
        Ok(metadata) => {
            let size = Some(metadata.len());
            let mtime = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64);
            (size, mtime)
        }
        Err(_) => (None, None),
    };

    // Get file extension
    let file_extension = result
        .path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase());

    RankedResultPayload {
        path,
        filename,
        directory,
        score: result.score,
        integrity_verified: result.integrity_verified,
        score_breakdown: ScoreBreakdownPayload {
            semantic: result.score_breakdown.semantic,
            integrity: result.score_breakdown.integrity,
            temporal: result.score_breakdown.temporal,
            behavior: result.score_breakdown.behavior,
        },
        context: result.context_snippet.as_ref().map(|ctx| ContextPayload {
            line_number: ctx.line_number,
            before: ctx.before.clone(),
            matched: ctx.matched.clone(),
            after: ctx.after.clone(),
        }),
        evidence: result.evidence.as_ref().map(|e| EvidencePayload {
            tags: e.tags.clone(),
            explanation: e.explanation.clone(),
            lexical_hit_count: e.lexical_hit_count,
            matched_terms: e.matched_terms.clone(),
            semantic_passage: e.semantic_passage.clone(),
            path_tags: e.path_tags.clone(),
            file_type: e.file_type.clone(),
        }),
        file_size,
        modified_at,
        file_extension,
    }
}

// =============================================================================
// Commands
// =============================================================================

/// Start a progressive search with streaming results
///
/// Results are emitted as events to the frontend window.
#[tauri::command]
pub async fn search_progressive(
    window: Window,
    state: State<'_, AppState>,
    query: String,
    directory: String,
    options: SearchOptions,
) -> Result<(), String> {
    // Verify entitlement token before allowing search
    if let Some(token) = state.get_entitlement_token() {
        verify_entitlement_token_internal(&token)?;
    } else {
        #[cfg(debug_assertions)]
        {
            tracing::warn!("Search allowed without entitlement token (DEBUG MODE)");
        }
        #[cfg(not(debug_assertions))]
        {
            return Err("Authentication required".into());
        }
    }

    // Cancel any existing search
    state.cancel_search();

    // Handle journalist mode
    if options.journalist_mode.unwrap_or(false) {
        state.enable_journalist_mode();
    }

    // Get cancellation token
    let cancel = state.new_search_token();

    // Parse directory
    let dir_path = PathBuf::from(&directory);
    if !dir_path.exists() {
        return Err(format!("Directory not found: {}", directory));
    }

    // Build search configuration
    let mut config = ProgressiveSearchConfig {
        max_results: options.limit.unwrap_or(20),
        enable_secure_ranking: options.secure_ranking.unwrap_or(true),
        context_lines: options.context_lines.unwrap_or(3),
        ..Default::default()
    };

    // Override timeout if provided
    if let Some(secs) = options.timeout_seconds {
        config.semantic_timeout = std::time::Duration::from_secs(secs);
    }

    config.search_mode = match options.search_mode.as_deref() {
        Some("flash") => SearchMode::Flash,
        Some("pro") => SearchMode::Pro,
        _ => SearchMode::Auto,
    };

    // Create channel for events
    let (tx, mut rx) = mpsc::channel(32);

    // Clone window for event emission
    let window_clone = window.clone();

    // Spawn task to forward events to frontend
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let payload = match event {
                SearchEvent::LexicalResults(results) => {
                    let payloads: Vec<LexicalResultPayload> = results
                        .iter()
                        .map(|r| {
                            let (path, filename, directory) = path_to_parts(&r.path);
                            LexicalResultPayload {
                                path,
                                filename,
                                directory,
                                score: r.score,
                                snippet: r.content_snippet.clone(),
                                term_matches: r.term_matches,
                                total_terms: r.total_terms,
                            }
                        })
                        .collect();
                    let count = payloads.len();
                    SearchEventPayload::LexicalResults {
                        results: payloads,
                        count,
                    }
                }
                SearchEvent::Status(message) => SearchEventPayload::Status { message },
                SearchEvent::SemanticResults(results) => {
                    let payloads: Vec<RankedResultPayload> =
                        results.iter().map(ranked_result_to_payload).collect();
                    let count = payloads.len();
                    SearchEventPayload::SemanticResults {
                        results: payloads,
                        count,
                    }
                }
                SearchEvent::Complete => SearchEventPayload::Complete,
                SearchEvent::Cancelled => SearchEventPayload::Cancelled,
                SearchEvent::Error(msg) => SearchEventPayload::Error { message: msg },
                SearchEvent::StreamUpdate {
                    stage,
                    stats,
                    events,
                } => {
                    let stage_payload = match stage {
                        StreamStage::Echo => StreamStagePayload::Echo,
                        StreamStage::Lexical => StreamStagePayload::Lexical,
                        StreamStage::Semantic => StreamStagePayload::Semantic,
                        StreamStage::Refining => StreamStagePayload::Refining,
                        StreamStage::Tail => StreamStagePayload::Tail,
                    };
                    let stats_payload = StreamStatsPayload {
                        files_scanned: stats.files_scanned,
                        candidates: stats.candidates,
                        embedded: stats.embedded,
                        cache_hits: stats.cache_hits,
                    };
                    let events_payload = events
                        .into_iter()
                        .map(|event| StreamEventPayload {
                            id: event.id,
                            kind: match event.kind {
                                StreamEventKind::Lexical => StreamEventKindPayload::Lexical,
                                StreamEventKind::Semantic => StreamEventKindPayload::Semantic,
                                StreamEventKind::Scan => StreamEventKindPayload::Scan,
                            },
                            score: event.score,
                            slot_index: event.slot_index,
                            path: event.path_hint,
                        })
                        .collect();
                    SearchEventPayload::StreamUpdate {
                        stage: stage_payload,
                        stats: stats_payload,
                        events: events_payload,
                    }
                }
                SearchEvent::LexicalBatch {
                    results,
                    batch_number,
                    is_final,
                } => {
                    // P2.1 batched lexical results for streaming
                    let payloads: Vec<LexicalResultPayload> = results
                        .iter()
                        .map(|r| {
                            let (path, filename, directory) = path_to_parts(&r.path);
                            LexicalResultPayload {
                                path,
                                filename,
                                directory,
                                score: r.score,
                                snippet: r.content_snippet.clone(),
                                term_matches: r.term_matches,
                                total_terms: r.total_terms,
                            }
                        })
                        .collect();
                    SearchEventPayload::LexicalBatch {
                        results: payloads,
                        count: results.len(),
                        batch_number,
                        is_final,
                    }
                }
                SearchEvent::LateResult {
                    result,
                    discovery_time_ms,
                } => SearchEventPayload::LateResult {
                    result: ranked_result_to_payload(&result),
                    discovery_time_ms,
                },
            };

            let (batch_num, result_count) = match &payload {
                SearchEventPayload::LexicalResults { results, .. } => (0, results.len()),
                SearchEventPayload::LexicalBatch {
                    results,
                    batch_number,
                    ..
                } => (*batch_number as usize, results.len()),
                SearchEventPayload::SemanticResults { results, .. } => (0, results.len()),
                SearchEventPayload::StreamUpdate { events, .. } => (0, events.len()),
                SearchEventPayload::LateResult { .. } => (0, 1),
                _ => (0, 0),
            };
            let _span = ipc_send_span(batch_num, result_count);
            let _enter = _span.enter();
            // Emit to frontend
            if let Err(e) = window_clone.emit("search-event", &payload) {
                tracing::error!("Failed to emit search event: {}", e);
                break;
            }
        }
    });

    // Load the model BEFORE spawning to avoid lifetime issues with State
    use ixos_protocol::ixos_embed::ModelType;
    use ixos_protocol::SecureEmbedder;

    let model_type_str = options.model_type.as_deref().unwrap_or("ixos-flash-v2");
    let model_type = model_type_str
        .parse::<ModelType>()
        .unwrap_or(ModelType::IxosFlashV2);

    let pro_model_type_str = options.pro_model_type.as_deref().unwrap_or("potion");
    let pro_model_type = pro_model_type_str
        .parse::<ModelType>()
        .unwrap_or(ModelType::Potion);

    let model_result = state.get_or_load_model(model_type);
    let use_pro = matches!(config.search_mode, SearchMode::Auto | SearchMode::Pro);
    let pro_model_result = if use_pro {
        Some(if pro_model_type == model_type {
            model_result.clone()
        } else {
            state.get_or_load_model(pro_model_type)
        })
    } else {
        None
    };
    let cache_mode = match options.cache_mode.as_deref() {
        Some("cache") => ixos_protocol::CacheMode::Cache,
        _ => ixos_protocol::CacheMode::Jit,
    };
    let cache_mode = if options.journalist_mode.unwrap_or(false) {
        ixos_protocol::CacheMode::Jit
    } else {
        cache_mode
    };

    // Spawn search task
    tokio::spawn(async move {
        // Load lexical engine from directory
        if !dir_path.exists() {
            let _ = tx
                .send(SearchEvent::Error(format!(
                    "Directory not found: {}",
                    dir_path.display()
                )))
                .await;
            return;
        }
        let lexical = CandidateLexicalEngine::new(dir_path.clone());

        // Create semantic engine with pre-loaded model
        let mut semantic = match model_result {
            Ok(model) => {
                tracing::info!(
                    "Using embedding model: {} ({})",
                    model_type.display_name(),
                    model_type.description()
                );
                let embedder = SecureEmbedder::new_fast(model);
                StubSemanticEngine::with_cache_mode(embedder, cache_mode)
            }
            Err(e) => {
                tracing::warn!("Model load failed ({}), using stub: {}", model_type, e);
                StubSemanticEngine::with_stub_model()
            }
        };
        let mut pro_engine = match pro_model_result {
            Some(Ok(model)) => {
                tracing::info!(
                    "Using pro embedding model: {} ({})",
                    pro_model_type.display_name(),
                    pro_model_type.description()
                );
                let embedder = SecureEmbedder::new_fast(model);
                Some(StubSemanticEngine::with_cache_mode(embedder, cache_mode))
            }
            Some(Err(e)) => {
                tracing::warn!("Pro model load failed ({}): {}", pro_model_type, e);
                None
            }
            None => None,
        };

        // Index the directory for semantic search
        if let Err(e) = semantic.index_directory(&dir_path).await {
            tracing::warn!("Failed to index directory for semantic search: {}", e);
        }
        if let Some(pro_engine) = pro_engine.as_mut() {
            if let Err(e) = pro_engine.index_directory(&dir_path).await {
                tracing::warn!("Failed to index directory for pro search: {}", e);
            }
        }

        // Create progressive search engine
        let mut engine =
            ProgressiveSearchEngine::with_config_and_pro(lexical, semantic, pro_engine, config);

        // Run search
        if let Err(e) = engine.search_progressive(query, tx, cancel).await {
            tracing::error!("Search failed: {}", e);
        }
    });

    Ok(())
}

/// Cancel the current search
#[tauri::command]
pub async fn cancel_search(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_search();
    Ok(())
}
