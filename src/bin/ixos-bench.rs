//! Ixos performance benchmark runner (P1)
//!
//! Runs end-to-end search measurements and writes PERF_BASELINE.md and JSON.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

use clap::{Parser, ValueEnum};
use ixos_protocol::instrumentation::{
    CorpusStats, MetricsCollector, PerformanceBaseline, ResourceSampler,
};
use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
use ixos_protocol::ixos_rank::{
    CacheMode, CandidateGenerator, CandidateGeneratorConfig, SemanticEngine, StubSemanticEngine,
};
use ixos_protocol::SecureEmbedder;

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum BenchCacheMode {
    #[default]
    NativeCache,
    Ephemeral,
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum BenchModelType {
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
#[command(name = "ixos-bench")]
#[command(about = "Ixos performance benchmark runner", long_about = None)]
struct BenchArgs {
    /// Directory to benchmark (use dataset/ for safety)
    #[arg(long)]
    dir: PathBuf,
    /// Number of runs
    #[arg(long, default_value = "10")]
    runs: usize,
    /// Cache mode: local or memory
    #[arg(long, value_enum, default_value = "native-cache")]
    cache_mode: BenchCacheMode,
    /// Model to use
    #[arg(long, value_enum, default_value = "potion")]
    model: BenchModelType,
    /// Optional query list (comma-separated)
    #[arg(long)]
    queries: Option<String>,
    /// Output report path (markdown)
    #[arg(long, default_value = "PERF_BASELINE.md")]
    out: PathBuf,
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
    let args = BenchArgs::parse();

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

    let model_type = match args.model {
        BenchModelType::Potion => ixos_protocol::ixos_embed::ModelType::Potion,
        BenchModelType::Qwen => ixos_protocol::ixos_embed::ModelType::Qwen,
        BenchModelType::IxosFlashV2 => ixos_protocol::ixos_embed::ModelType::IxosFlashV2,
        BenchModelType::IxosFlashV1 => ixos_protocol::ixos_embed::ModelType::IxosFlashV1,
        BenchModelType::IxosFlashV4 => ixos_protocol::ixos_embed::ModelType::IxosFlashV4,
        BenchModelType::IxosFlashV4Fast => ixos_protocol::ixos_embed::ModelType::IxosFlashV4Fast,
        BenchModelType::IxosProV1 => ixos_protocol::ixos_embed::ModelType::IxosProV1,
    };
    let model = MmapModel2VecEmbedder::new_with_type(model_type)
        .map_err(|e| anyhow::anyhow!("Model load failed: {}", e))?;
    let embedder = SecureEmbedder::new_fast(std::sync::Arc::new(model));
    let cache_mode = match args.cache_mode {
        BenchCacheMode::Ephemeral => CacheMode::Ephemeral,
        BenchCacheMode::NativeCache => CacheMode::NativeCache,
    };
    let is_cache_mode = matches!(cache_mode, CacheMode::NativeCache);
    let mut semantic = StubSemanticEngine::with_cache_mode(embedder, cache_mode);
    semantic.index_directory(&dir).await?;

    let mut runs = Vec::new();
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
        runs.push(collector.finalize());

        if is_cache_mode {
            semantic.clear_memory_cache().await;
        }
    }

    let baseline = PerformanceBaseline::from_runs(runs, corpus);
    baseline.save_to_file(&args.out)?;

    let json_path = args.out.with_extension("json");
    let json = baseline.to_json()?;
    std::fs::write(&json_path, json)?;

    println!("Wrote {} and {}", args.out.display(), json_path.display());

    Ok(())
}
