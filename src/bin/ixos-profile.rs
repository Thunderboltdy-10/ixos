//! Ixos profile bundle exporter (P9)
//!
//! Generates a timing-only profile bundle with no file content.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

use clap::{Parser, ValueEnum};
use ixos_protocol::instrumentation::{
    CorpusStats, MetricsCollector, ProfileBundle, ProfileRunConfig, ResourceSampler,
};
use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
use ixos_protocol::ixos_rank::{
    CacheMode, CandidateGenerator, CandidateGeneratorConfig, SemanticEngine, StubSemanticEngine,
};
use ixos_protocol::optimization::SystemSpecs;
use ixos_protocol::SecureEmbedder;
use serde::Serialize;

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum ProfileCacheMode {
    #[default]
    NativeCache,
    Ephemeral,
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum ProfileModelType {
    Stub,
    #[default]
    Potion,
    Qwen,
    IxosFlashV2,
    IxosFlashV1,
    IxosFlashV4,
    IxosFlashV4Fast,
    IxosProV1,
}

#[derive(Parser, Debug)]
#[command(name = "ixos-profile")]
#[command(about = "Ixos profile bundle exporter", long_about = None)]
struct ProfileArgs {
    /// Directory to profile
    #[arg(long)]
    dir: PathBuf,
    /// Number of runs
    #[arg(long, default_value = "6")]
    runs: usize,
    /// Cache mode: local or memory
    #[arg(long, value_enum, default_value = "native-cache")]
    cache_mode: ProfileCacheMode,
    /// Model to use
    #[arg(long, value_enum, default_value = "potion")]
    model: ProfileModelType,
    /// Allow stub model usage (explicit opt-in)
    #[arg(long)]
    allow_stub: bool,
    /// Optional query list (comma-separated)
    #[arg(long)]
    queries: Option<String>,
    /// Output profile bundle path
    #[arg(long, default_value = "profile_bundle.json")]
    out: PathBuf,
    /// Optional slow-query threshold (ms) to emit a slow query report
    #[arg(long)]
    slow_threshold_ms: Option<u64>,
    /// Output path for slow query report (JSON)
    #[arg(long, default_value = "slow_queries.json")]
    slow_out: PathBuf,
}

#[derive(Debug, Serialize)]
struct SlowQueryReport {
    generated_at: String,
    threshold_ms: u64,
    queries: Vec<SlowQuery>,
}

#[derive(Debug, Serialize)]
struct SlowQuery {
    query: String,
    ttfr_ms: u64,
    ttsi_ms: Option<u64>,
    total_ms: u64,
    stages: ixos_protocol::instrumentation::StageMetrics,
    resources: ixos_protocol::instrumentation::ResourceMetrics,
}

fn collect_corpus_stats(root: &Path) -> CorpusStats {
    let mut total_files = 0usize;
    let mut total_size = 0u64;
    let mut types: HashMap<String, usize> = HashMap::new();

    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        if let Ok(entries) = std::fs::read_dir(&path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    stack.push(p);
                } else if p.is_file() {
                    total_files += 1;
                    if let Ok(meta) = entry.metadata() {
                        total_size += meta.len();
                    }
                    let ext = p
                        .extension()
                        .map(|e| e.to_string_lossy().to_lowercase())
                        .unwrap_or_else(|| "unknown".to_string());
                    *types.entry(ext).or_insert(0) += 1;
                }
            }
        }
    }

    let total_size_mb = total_size as f64 / (1024.0 * 1024.0);
    let avg_file_size_bytes = if total_files == 0 {
        0
    } else {
        total_size / total_files as u64
    };

    let mut file_types: Vec<(String, usize)> = types.into_iter().collect();
    file_types.sort_by(|a, b| b.1.cmp(&a.1));

    CorpusStats {
        total_files,
        total_size_mb,
        file_types,
        avg_file_size_bytes,
    }
}

fn default_queries() -> Vec<String> {
    vec![
        "report".to_string(),
        "analysis".to_string(),
        "invoice".to_string(),
        "project".to_string(),
        "meeting".to_string(),
        "summary".to_string(),
        "budget".to_string(),
        "design".to_string(),
    ]
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = ProfileArgs::parse();

    if !args.dir.exists() {
        anyhow::bail!("Directory not found: {}", args.dir.display());
    }

    let queries = args
        .queries
        .map(|q| {
            q.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_else(default_queries);

    let dir = args.dir.canonicalize().unwrap_or(args.dir.clone());
    let corpus = collect_corpus_stats(&dir);
    let mut generator = CandidateGenerator::new(dir.clone(), CandidateGeneratorConfig::default());
    generator.build_index();

    let cache_mode = match args.cache_mode {
        ProfileCacheMode::Ephemeral => CacheMode::Ephemeral,
        ProfileCacheMode::NativeCache => CacheMode::NativeCache,
    };

    if matches!(args.model, ProfileModelType::Stub) && !args.allow_stub {
        anyhow::bail!("Stub model is disabled. Pass --allow-stub to opt in.");
    }

    let mut semantic = match args.model {
        ProfileModelType::Stub => StubSemanticEngine::with_stub_model_and_mode(cache_mode),
        ProfileModelType::Potion => {
            load_model_semantic(ixos_protocol::ixos_embed::ModelType::Potion, cache_mode)?
        }
        ProfileModelType::Qwen => {
            load_model_semantic(ixos_protocol::ixos_embed::ModelType::Qwen, cache_mode)?
        }
        ProfileModelType::IxosFlashV2 => load_model_semantic(
            ixos_protocol::ixos_embed::ModelType::IxosFlashV2,
            cache_mode,
        )?,
        ProfileModelType::IxosFlashV1 => load_model_semantic(
            ixos_protocol::ixos_embed::ModelType::IxosFlashV1,
            cache_mode,
        )?,
        ProfileModelType::IxosFlashV4 => load_model_semantic(
            ixos_protocol::ixos_embed::ModelType::IxosFlashV4,
            cache_mode,
        )?,
        ProfileModelType::IxosFlashV4Fast => load_model_semantic(
            ixos_protocol::ixos_embed::ModelType::IxosFlashV4Fast,
            cache_mode,
        )?,
        ProfileModelType::IxosProV1 => {
            load_model_semantic(ixos_protocol::ixos_embed::ModelType::IxosProV1, cache_mode)?
        }
    };

    semantic.index_directory(&dir).await?;

    let mut runs = Vec::new();
    let mut slow_queries = Vec::new();
    for run_idx in 0..args.runs {
        let query = &queries[run_idx % queries.len()];
        let mut collector = MetricsCollector::new();
        let sampler = ResourceSampler::default();

        let candidate_start = Instant::now();
        let candidate_set = generator.generate(query);
        let candidate_stats = candidate_set.stats.clone();
        let candidate_elapsed = candidate_start.elapsed();

        collector.record_directory_walk(std::time::Duration::from_millis(
            candidate_stats.directory_walk_ms,
        ));
        collector.record_path_scoring(std::time::Duration::from_millis(
            candidate_stats.path_scoring_ms,
        ));
        collector.record_ripgrep_scan(std::time::Duration::from_millis(candidate_stats.ripgrep_ms));
        collector
            .record_candidate_selection(std::time::Duration::from_millis(candidate_stats.merge_ms));
        collector.mark_first_result();

        collector.set_files_scanned(candidate_stats.paths_scanned);
        collector.set_candidates_generated(candidate_stats.merged_candidates);

        let mut lexical_results = candidate_set.into_lexical_matches();
        lexical_results.truncate(1500);

        collector.mark_semantic_start();
        let semantic_start = Instant::now();
        let limit = lexical_results.len();
        let _semantic_results = semantic.rerank(query, lexical_results, limit).await?;
        let semantic_elapsed = semantic_start.elapsed().as_millis() as u64;

        let semantic_metrics = semantic.take_metrics().await;

        collector.record_embedding(std::time::Duration::from_millis(
            semantic_metrics.embedding_ms,
        ));
        let ranking_ms = semantic_elapsed.saturating_sub(semantic_metrics.embedding_ms);
        collector.record_ranking(std::time::Duration::from_millis(ranking_ms));

        let mut resources = ixos_protocol::instrumentation::ResourceMetrics::default();
        resources.io_read_mb = semantic_metrics.io_read_bytes as f64 / (1024.0 * 1024.0);
        let total_candidates = semantic_metrics.cache_hits + semantic_metrics.candidates_embedded;
        resources.cache_hit_rate = if total_candidates == 0 {
            0.0
        } else {
            semantic_metrics.cache_hits as f32 / total_candidates as f32
        };
        resources.files_scanned = candidate_stats.paths_scanned;
        resources.candidates_generated = candidate_stats.merged_candidates;
        resources.candidates_embedded = semantic_metrics.candidates_embedded;
        let sample = sampler.stop();
        resources.peak_ram_mb = sample.peak_ram_mb;
        resources.cpu_percent = sample.avg_cpu_percent;
        collector.update_resources(resources);

        let _ = candidate_elapsed;
        let finalized = collector.finalize();
        if let Some(threshold) = args.slow_threshold_ms {
            if finalized.total_ms >= threshold {
                slow_queries.push(SlowQuery {
                    query: query.to_string(),
                    ttfr_ms: finalized.ttfr_ms,
                    ttsi_ms: finalized.ttsi_ms,
                    total_ms: finalized.total_ms,
                    stages: finalized.stages.clone(),
                    resources: finalized.resources.clone(),
                });
            }
        }
        runs.push(finalized);

        if matches!(cache_mode, CacheMode::NativeCache) {
            semantic.clear_memory_cache().await;
        }
    }

    let system = SystemSpecs::detect();
    let run_config = ProfileRunConfig {
        cache_mode: format!("{:?}", cache_mode),
        model: format!("{:?}", args.model),
        query_count: queries.len(),
        runs: runs.len(),
    };
    let bundle = ProfileBundle::from_runs(runs, corpus, system, run_config);
    bundle.save_to_file(&args.out).map_err(anyhow::Error::msg)?;

    if let Some(threshold) = args.slow_threshold_ms {
        let report = SlowQueryReport {
            generated_at: chrono::Utc::now().to_rfc3339(),
            threshold_ms: threshold,
            queries: slow_queries,
        };
        let content = serde_json::to_string_pretty(&report)?;
        if let Some(parent) = args.slow_out.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&args.slow_out, content)?;
        println!("Wrote {}", args.slow_out.display());
    }

    println!("Wrote {}", args.out.display());
    Ok(())
}

fn load_model_semantic(
    model_type: ixos_protocol::ixos_embed::ModelType,
    cache_mode: CacheMode,
) -> anyhow::Result<StubSemanticEngine> {
    let model = MmapModel2VecEmbedder::new_with_type(model_type);
    match model {
        Ok(model) => {
            let embedder = SecureEmbedder::new_fast(std::sync::Arc::new(model));
            Ok(StubSemanticEngine::with_cache_mode(embedder, cache_mode))
        }
        Err(e) => Err(anyhow::anyhow!("Model load failed ({}): {}", model_type, e)),
    }
}
