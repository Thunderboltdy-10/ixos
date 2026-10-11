//! Search command handlers
//!
//! Provides progressive search with streaming results to the frontend.

use crate::state::AppState;
use ixos_protocol::cli::IxosConfig;
use ixos_protocol::instrumentation::ipc_send_span;
use ixos_protocol::ixos_rank::{
    progressive::{SearchEvent, SearchMode, StreamEventKind, StreamStage, StreamStats},
    CandidateLexicalEngine, IntentDetector, LexicalEngine, ProgressiveSearchConfig,
    ProgressiveSearchEngine, RankedResult, StubSemanticEngine,
};
use ixos_protocol::EvidenceTag;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::ipc::Channel;
use tauri::State;
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
    pub personal: f32,
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
    pub deep_search: Option<bool>,
    pub secure_timing: Option<bool>,
    pub model_type: Option<String>,
    pub pro_model_type: Option<String>,
    pub search_mode: Option<String>,
    pub is_ask_mode: Option<String>,
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
            personal: result.score_breakdown.personal,
        },
        context: result.context_snippet.as_ref().map(|ctx| ContextPayload {
            line_number: ctx.line_number,
            before: ctx.before.clone(),
            matched: ctx.raw_matched.lines().map(str::to_owned).collect(),
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
// Event Conversion
// =============================================================================

/// Convert a backend SearchEvent into a frontend-ready SearchEventPayload.
fn convert_search_event(event: SearchEvent) -> SearchEventPayload {
    match event {
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
    }
}

// =============================================================================
// Commands
// =============================================================================

fn parse_search_mode(value: Option<&str>) -> SearchMode {
    match value {
        Some("flash") => SearchMode::Flash,
        Some("pro") => SearchMode::Pro,
        _ => SearchMode::Auto,
    }
}

fn parse_cache_mode(value: Option<&str>) -> Result<ixos_protocol::CacheMode, String> {
    let Some(raw) = value else {
        return Ok(ixos_protocol::CacheMode::NativeCache);
    };

    match raw.trim().to_lowercase().as_str() {
        "native-cache" | "local" => Ok(ixos_protocol::CacheMode::NativeCache),
        "ephemeral" | "memory" => Ok(ixos_protocol::CacheMode::Ephemeral),
        invalid => Err(format!(
            "Invalid cache mode '{invalid}'. Use local/native-cache or memory/ephemeral."
        )),
    }
}

fn ask_mode_requested(value: Option<&str>, query: &str) -> bool {
    let normalized = value.map(|v| v.trim().to_lowercase());
    match normalized.as_deref() {
        Some("on" | "always" | "true") => true,
        Some("off" | "disabled" | "false") => false,
        Some("auto" | "intent" | "detect") | None => {
            IntentDetector::new().should_activate_ask_mode(query)
        }
        Some(_) => IntentDetector::new().should_activate_ask_mode(query),
    }
}

fn should_eager_index_semantic(search_mode: SearchMode, lexical_probe_is_empty: bool) -> bool {
    matches!(search_mode, SearchMode::Pro) || lexical_probe_is_empty
}

/// Start a progressive search with streaming results
///
/// Results are streamed to the frontend via Tauri v2 Channel API.
#[tauri::command]
pub async fn search_progressive(
    state: State<'_, AppState>,
    channel: Channel<SearchEventPayload>,
    query: String,
    directory: String,
    options: SearchOptions,
) -> Result<(), String> {
    let requested_search_mode = options.search_mode.as_deref();
    // Cancel any existing search
    state.cancel_search();
    state.disable_deep_search_mode();

    // Re-enable deep search mode when requested
    if options.deep_search.unwrap_or(false) {
        state.enable_deep_search_mode();
    }

    // Get cancellation token
    let cancel = state.new_search_token();

    // Parse directory
    let dir_path = PathBuf::from(&directory);
    if !dir_path.is_dir() {
        return Err(format!("Directory not found: {}", directory));
    }

    // Build search configuration
    let deep_search_enabled = options.deep_search.unwrap_or(false);
    let mut config = if deep_search_enabled {
        ProgressiveSearchConfig::thorough()
    } else {
        ProgressiveSearchConfig::default()
    };
    config.max_results = options.limit.unwrap_or(config.max_results);
    if query.trim().is_empty() || config.max_results == 0 {
        return Err("Search requires a nonempty query and a positive result limit".into());
    }
    config.enable_secure_ranking = options
        .secure_ranking
        .unwrap_or(config.enable_secure_ranking);
    config.context_lines = options.context_lines.unwrap_or(config.context_lines);
    if deep_search_enabled {
        config.context_lines = options.context_lines.unwrap_or(6);
        config.candidate_multiplier = config.candidate_multiplier.saturating_mul(2);
        config.min_score_threshold *= 0.85;
        config.evidence_max_results = config
            .evidence_max_results
            .saturating_mul(2)
            .max(6)
            .min(config.max_results.max(1));
    }

    // Override timeout if provided
    if let Some(secs) = options.timeout_seconds {
        config.semantic_timeout = std::time::Duration::from_secs(secs);
    }

    config.search_mode = parse_search_mode(requested_search_mode);

    // Create internal channel for search engine → forwarder communication.
    // 512 provides ample headroom for try_send() in sync batch callbacks.
    // Typical search produces <100 stream events total.
    let (tx, mut rx) = mpsc::channel(512);

    // Spawn task to forward events to frontend via Tauri v2 Channel API.
    // The Channel is scoped to this command invocation — guaranteed ordering,
    // no missed events, automatic cleanup when command completes.
    let ch = channel.clone();
    let forward_handle = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let payload = convert_search_event(event);

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

            if let Err(e) = ch.send(payload) {
                tracing::warn!("Failed to send search event via channel: {}", e);
                tracing::error!("Search stream delivery failed on channel transport");
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
        .map_err(|e| format!("Invalid search model: {e}"))?;

    let pro_model_type_str = options.pro_model_type.as_deref().unwrap_or("ixos-pro-v2");
    let pro_model_type = match pro_model_type_str.to_lowercase().as_str() {
        "ixos-pro-v2" | "pro-v2" | "pro" => ModelType::IxosProV2,
        "potion" | "potion-base-8m-int8" => ModelType::Potion,
        _ => pro_model_type_str
            .parse::<ModelType>()
            .map_err(|e| format!("Invalid secondary search model: {e}"))?,
    };

    let model_result = state.get_or_load_model(model_type);
    let ask_mode_enabled = ask_mode_requested(options.is_ask_mode.as_deref(), &query);
    let use_pro = matches!(config.search_mode, SearchMode::Pro)
        || (matches!(config.search_mode, SearchMode::Auto) && !ask_mode_enabled);
    let pro_model_result = if use_pro {
        Some(if pro_model_type == model_type {
            model_result.clone()
        } else {
            state.get_or_load_model(pro_model_type)
        })
    } else {
        None
    };
    let cache_mode = parse_cache_mode(options.cache_mode.as_deref())?;

    // Spawn search task
    let search_handle = tokio::spawn(async move {
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
                let _ = tx
                    .send(SearchEvent::Error(format!(
                        "Model {model_type} could not load: {e}"
                    )))
                    .await;
                return;
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
                if matches!(config.search_mode, SearchMode::Pro) {
                    let _ = tx
                        .send(SearchEvent::Error(format!(
                            "Selected secondary model {pro_model_type} could not load: {e}"
                        )))
                        .await;
                    return;
                }
                tracing::warn!("Pro model load failed ({}): {}", pro_model_type, e);
                None
            }
            None => None,
        };

        if ask_mode_enabled {
            let _ = tx
                .send(SearchEvent::Status(
                    "Ask Mode active: understanding your question.".into(),
                ))
                .await;
        }

        let _ = tx
            .send(SearchEvent::Status(
                "Preparing search context (local-only)...".into(),
            ))
            .await;
        let _ = tx
            .send(SearchEvent::StreamUpdate {
                stage: StreamStage::Lexical,
                stats: StreamStats::default(),
                events: Vec::new(),
            })
            .await;

        // Eager indexing can add large startup latency on big trees.
        // For Flash/Auto flows we avoid full pre-indexing unless needed.
        // If lexical preflight yields zero matches, we index so pure-semantic fallback has files.
        let lexical_probe_is_empty =
            if ask_mode_enabled || matches!(config.search_mode, SearchMode::Pro) {
                false
            } else {
                match lexical.search(&query, 1).await {
                    Ok(results) => results.is_empty(),
                    Err(e) => {
                        tracing::warn!(
                        "Lexical preflight failed, enabling semantic eager indexing fallback: {}",
                        e
                    );
                        true
                    }
                }
            };
        let requires_eager_index =
            should_eager_index_semantic(config.search_mode, lexical_probe_is_empty);
        if requires_eager_index {
            if let Err(e) = semantic.index_directory(&dir_path).await {
                tracing::warn!("Failed to index directory for semantic search: {}", e);
            }
            if let Some(pro_engine) = pro_engine.as_mut() {
                // Keep Auto mode flash-first and stream immediately.
                // Pro indexing is only required for Pro-primary searches.
                if matches!(config.search_mode, SearchMode::Pro) {
                    if let Err(e) = pro_engine.index_directory(&dir_path).await {
                        tracing::warn!("Failed to index directory for pro search: {}", e);
                    }
                } else {
                    tracing::debug!("Skipping eager pro index in Auto mode");
                }
            }
        } else {
            tracing::debug!(
                "Skipping eager semantic index for low-latency lexical-first flow (lexical preflight had matches)"
            );
        }
        let _ = tx
            .send(SearchEvent::Status(
                "Semantic index ready. Starting progressive search...".into(),
            ))
            .await;

        // Create progressive search engine
        let mut engine =
            ProgressiveSearchEngine::with_config_and_pro(lexical, semantic, pro_engine, config);
        let runtime_config = IxosConfig::load();

        let personal_ranking_enabled = runtime_config.search.personal_ranking_enabled;

        engine
            .secure_ranker_mut()
            .config_mut()
            .personal_ranking_enabled = personal_ranking_enabled;

        // Run search
        if let Err(e) = engine.search_progressive(query, tx, cancel).await {
            tracing::error!("Search failed: {}", e);
        }
    });

    if let Err(e) = search_handle.await {
        tracing::error!("Search task join error: {}", e);
        return Err(format!("Search task failed: {}", e));
    }

    if let Err(e) = forward_handle.await {
        tracing::warn!("Search forwarder join error: {}", e);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_modes_do_not_require_an_account() {
        assert!(matches!(parse_search_mode(Some("auto")), SearchMode::Auto));
        assert!(matches!(parse_search_mode(Some("pro")), SearchMode::Pro));
        assert!(matches!(
            parse_search_mode(Some("flash")),
            SearchMode::Flash
        ));
    }

    #[test]
    fn eager_indexing_is_forced_for_pro_mode() {
        assert!(should_eager_index_semantic(SearchMode::Pro, false));
    }

    #[test]
    fn eager_indexing_runs_when_lexical_probe_is_empty() {
        assert!(should_eager_index_semantic(SearchMode::Flash, true));
    }

    #[test]
    fn eager_indexing_skips_when_lexical_probe_has_hits() {
        assert!(!should_eager_index_semantic(SearchMode::Flash, false));
    }

    #[test]
    fn parse_cache_mode_rejects_legacy_aliases() {
        for legacy in ["jit", "cache", "persistent", "nativecache"] {
            let err = parse_cache_mode(Some(legacy)).expect_err("expected cache mode parse error");
            assert!(err.contains("Invalid cache mode"), "error was: {err}");
        }
    }

    #[test]
    fn ask_mode_uses_intent_and_explicit_selection() {
        assert!(ask_mode_requested(
            Some("auto"),
            "where is the release notes?"
        ));
        assert!(ask_mode_requested(None, "why is search slow?"));
        assert!(!ask_mode_requested(Some("off"), "why is search slow?"));
    }
}

/// Cancel the current search
#[tauri::command]
pub async fn cancel_search(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_search();
    Ok(())
}
