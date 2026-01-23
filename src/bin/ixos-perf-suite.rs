//! Ixos perf regression suite (P9)
//!
//! Generates deterministic corpora and emits JSON baselines for CI.

use clap::Parser;
use rand::{rngs::StdRng, Rng, SeedableRng};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

use ixos_protocol::instrumentation::{CorpusStats, MetricsCollector, PerformanceBaseline};
use ixos_protocol::ixos_rank::{
    CacheMode, CandidateGenerator, CandidateGeneratorConfig, SemanticEngine, StubSemanticEngine,
};
use ixos_protocol::SecureEmbedder;

#[derive(Parser, Debug)]
#[command(name = "ixos-perf-suite")]
#[command(about = "Deterministic perf regression suite", long_about = None)]
struct PerfSuiteArgs {
    /// Output JSON report path
    #[arg(long, default_value = "PERF_REGRESSION.json")]
    out: PathBuf,
    /// Sizes to generate (comma-separated)
    #[arg(long, default_value = "30000,100000")]
    sizes: String,
    /// Runs per size
    #[arg(long, default_value = "6")]
    runs: usize,
    /// Seed for deterministic content
    #[arg(long, default_value = "1337")]
    seed: u64,
    /// Cache mode: jit or cache
    #[arg(long, default_value = "jit")]
    cache_mode: String,
}

#[derive(Debug, Serialize)]
struct PerfRegressionReport {
    generated_at: String,
    runs: Vec<PerfRegressionRun>,
}

#[derive(Debug, Serialize)]
struct PerfRegressionRun {
    size: usize,
    cache_mode: String,
    baseline: PerformanceBaseline,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = PerfSuiteArgs::parse();
    let sizes = parse_sizes(&args.sizes)?;
    let cache_mode = parse_cache_mode(&args.cache_mode);

    let mut runs = Vec::new();
    for size in sizes {
        let corpus_dir = build_corpus(size, args.seed)?;
        let baseline = run_baseline(&corpus_dir, size, args.runs, cache_mode).await?;
        runs.push(PerfRegressionRun {
            size,
            cache_mode: format!("{:?}", cache_mode),
            baseline,
        });
    }

    let report = PerfRegressionReport {
        generated_at: chrono::Utc::now().to_rfc3339(),
        runs,
    };
    let content = serde_json::to_string_pretty(&report)?;
    std::fs::write(&args.out, content)?;
    println!("Wrote {}", args.out.display());
    Ok(())
}

fn parse_sizes(raw: &str) -> anyhow::Result<Vec<usize>> {
    let mut sizes = Vec::new();
    for part in raw.split(',') {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }
        sizes.push(trimmed.parse::<usize>()?);
    }
    if sizes.is_empty() {
        anyhow::bail!("No sizes provided");
    }
    Ok(sizes)
}

fn parse_cache_mode(raw: &str) -> CacheMode {
    match raw.to_lowercase().as_str() {
        "cache" => CacheMode::Cache,
        _ => CacheMode::Jit,
    }
}

fn build_corpus(size: usize, seed: u64) -> anyhow::Result<PathBuf> {
    let root = std::env::current_dir()?.join("target").join("perf_corpus");
    let corpus_dir = root.join(format!("{}k", size / 1000));
    if corpus_dir.exists() {
        return Ok(corpus_dir);
    }
    std::fs::create_dir_all(&corpus_dir)?;

    let subdirs = ["finance", "ops", "legal", "hr", "marketing", "product", "research", "sales"];
    for subdir in &subdirs {
        std::fs::create_dir_all(corpus_dir.join(subdir))?;
    }

    let mut rng = StdRng::seed_from_u64(seed);
    for i in 0..size {
        let subdir = subdirs[i % subdirs.len()];
        let filename = format!("file_{:05}.txt", i);
        let path = corpus_dir.join(subdir).join(&filename);
        let content = format!(
            "Synthetic file {}.\nKeywords: report, analysis, budget, summary.\nToken:{}",
            i,
            rng.gen::<u64>()
        );
        std::fs::write(path, content)?;
    }

    Ok(corpus_dir)
}

async fn run_baseline(
    corpus_dir: &Path,
    size: usize,
    runs: usize,
    cache_mode: CacheMode,
) -> anyhow::Result<PerformanceBaseline> {
    let corpus = collect_corpus_stats(corpus_dir);
    let mut generator = CandidateGenerator::new(corpus_dir.to_path_buf(), CandidateGeneratorConfig::default());
    generator.build_index();

    let model = ixos_protocol::ixos_embed::model::StubModel::new();
    let embedder = SecureEmbedder::new_fast(std::sync::Arc::new(model));
    let mut semantic = StubSemanticEngine::with_cache_mode(embedder, cache_mode);
    semantic.index_directory(corpus_dir).await?;

    let queries = default_queries();
    let mut metrics_runs = Vec::new();

    for run_idx in 0..runs {
        let query = &queries[run_idx % queries.len()];
        let mut collector = MetricsCollector::new();

        let candidate_start = Instant::now();
        let candidate_set = generator.generate(query);
        let candidate_stats = candidate_set.stats.clone();
        let _candidate_elapsed = candidate_start.elapsed();

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
        let _semantic_results = semantic.rerank(query, lexical_results).await?;
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
        collector.update_resources(resources);

        metrics_runs.push(collector.finalize());

        if matches!(cache_mode, CacheMode::Cache) {
            semantic.clear_memory_cache().await;
        }
    }

    let baseline = PerformanceBaseline::from_runs(metrics_runs, corpus);
    tracing::info!("Perf suite size {} completed", size);
    Ok(baseline)
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
