//! Ixos perf regression suite (P9)
//!
//! Generates deterministic corpora and emits JSON baselines for CI.

use clap::Parser;
use rand::{rngs::StdRng, Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

use ixos_protocol::instrumentation::{
    CorpusStats, MetricsCollector, PerformanceBaseline, ResourceSampler,
};
use ixos_protocol::ixos_embed::{MmapModel2VecEmbedder, ModelType};
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
    /// Optional config file (TOML)
    #[arg(long)]
    config: Option<PathBuf>,
    /// Sizes to generate (comma-separated)
    #[arg(long, default_value = "30000,100000")]
    sizes: String,
    /// Runs per size
    #[arg(long, default_value = "6")]
    runs: usize,
    /// Seed for deterministic content
    #[arg(long, default_value = "1337")]
    seed: u64,
    /// Cache mode: local or memory
    #[arg(long, default_value = "native-cache")]
    cache_mode: String,
    /// Model to use
    #[arg(long, default_value = "ixos-flash-v2")]
    model: String,
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

#[derive(Debug, Deserialize)]
struct PerfSuiteConfig {
    run: PerfRunConfig,
    corpora: HashMap<String, PerfCorpusConfig>,
}

#[derive(Debug, Deserialize)]
struct PerfRunConfig {
    runs: usize,
    seed: u64,
    cache_mode: String,
    model: String,
    queries: Option<Vec<String>>,
    out_dir: Option<PathBuf>,
}

#[derive(Debug, Deserialize)]
struct PerfCorpusConfig {
    size: Option<usize>,
    dir: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = PerfSuiteArgs::parse();
    let config = match args.config.as_ref() {
        Some(path) => Some(load_config(path)?),
        None => None,
    };

    let (run_count, seed, cache_mode, model_type, queries, out_path) = if let Some(ref cfg) = config
    {
        let cache_mode = parse_cache_mode(&cfg.run.cache_mode)?;
        let model_type = parse_model_type(&cfg.run.model)?;
        let out_dir = cfg
            .run
            .out_dir
            .clone()
            .unwrap_or_else(|| PathBuf::from("bench/results"));
        let out_path = out_dir.join("PERF_REGRESSION.json");
        (
            cfg.run.runs,
            cfg.run.seed,
            cache_mode,
            model_type,
            cfg.run.queries.clone().unwrap_or_else(default_queries),
            out_path,
        )
    } else {
        let cache_mode = parse_cache_mode(&args.cache_mode)?;
        let model_type = parse_model_type(&args.model)?;
        (
            args.runs,
            args.seed,
            cache_mode,
            model_type,
            default_queries(),
            args.out.clone(),
        )
    };

    let mut runs = Vec::new();
    if let Some(cfg) = config {
        for (name, corpus_cfg) in cfg.corpora {
            let corpus_dir = prepare_corpus(&name, &corpus_cfg, seed)?;
            let baseline =
                run_baseline(&corpus_dir, run_count, cache_mode, model_type, &queries).await?;
            let size = baseline.corpus.total_files;
            runs.push(PerfRegressionRun {
                size,
                cache_mode: format!("{:?}", cache_mode),
                baseline,
            });
        }
    } else {
        let sizes = parse_sizes(&args.sizes)?;
        for size in sizes {
            let corpus_dir = build_corpus(&format!("{}k", size / 1000), size, seed)?;
            let baseline =
                run_baseline(&corpus_dir, run_count, cache_mode, model_type, &queries).await?;
            runs.push(PerfRegressionRun {
                size,
                cache_mode: format!("{:?}", cache_mode),
                baseline,
            });
        }
    }

    let report = PerfRegressionReport {
        generated_at: chrono::Utc::now().to_rfc3339(),
        runs,
    };
    let content = serde_json::to_string_pretty(&report)?;
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&out_path, content)?;
    println!("Wrote {}", out_path.display());
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

fn parse_cache_mode(raw: &str) -> anyhow::Result<CacheMode> {
    match raw.to_lowercase().as_str() {
        "native-cache" | "local" => Ok(CacheMode::NativeCache),
        "ephemeral" | "memory" => Ok(CacheMode::Ephemeral),
        other => anyhow::bail!(
            "invalid cache mode '{other}'. valid values: local|native-cache|memory|ephemeral"
        ),
    }
}

fn parse_model_type(raw: &str) -> anyhow::Result<ModelType> {
    raw.parse::<ModelType>().map_err(|e| anyhow::anyhow!(e))
}

fn load_config(path: &Path) -> anyhow::Result<PerfSuiteConfig> {
    let content = std::fs::read_to_string(path)?;
    let config: PerfSuiteConfig = toml::from_str(&content)?;
    Ok(config)
}

fn prepare_corpus(name: &str, config: &PerfCorpusConfig, seed: u64) -> anyhow::Result<PathBuf> {
    if let Some(dir) = config.dir.as_ref() {
        if !dir.exists() {
            anyhow::bail!("Corpus dir not found: {}", dir.display());
        }
        return Ok(dir.clone());
    }
    let size = config
        .size
        .ok_or_else(|| anyhow::anyhow!("Corpus {} missing size or dir", name))?;
    build_corpus(name, size, seed)
}

fn build_corpus(name: &str, size: usize, seed: u64) -> anyhow::Result<PathBuf> {
    let root = std::env::current_dir()?.join("target").join("perf_corpus");
    let corpus_dir = root.join(name);
    if corpus_dir.exists() {
        return Ok(corpus_dir);
    }
    std::fs::create_dir_all(&corpus_dir)?;

    let subdirs = [
        "finance",
        "ops",
        "legal",
        "hr",
        "marketing",
        "product",
        "research",
        "sales",
    ];
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
    runs: usize,
    cache_mode: CacheMode,
    model_type: ModelType,
    queries: &[String],
) -> anyhow::Result<PerformanceBaseline> {
    let corpus = collect_corpus_stats(corpus_dir);
    let mut generator = CandidateGenerator::new(
        corpus_dir.to_path_buf(),
        CandidateGeneratorConfig::default(),
    );
    generator.build_index();

    let model = MmapModel2VecEmbedder::new_with_type(model_type)
        .map_err(|e| anyhow::anyhow!("Model load failed: {}", e))?;
    let embedder = SecureEmbedder::new_fast(std::sync::Arc::new(model));
    let mut semantic = StubSemanticEngine::with_cache_mode(embedder, cache_mode);
    semantic.index_directory(corpus_dir).await?;

    let mut metrics_runs = Vec::new();

    for run_idx in 0..runs {
        let query = &queries[run_idx % queries.len()];
        let mut collector = MetricsCollector::new();
        let sampler = ResourceSampler::default();

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

        metrics_runs.push(collector.finalize());

        if matches!(cache_mode, CacheMode::NativeCache) {
            semantic.clear_memory_cache().await;
        }
    }

    let total_files = corpus.total_files;
    let baseline = PerformanceBaseline::from_runs(metrics_runs, corpus);
    tracing::info!(
        "Perf suite completed (files: {}, cache: {:?}, model: {:?})",
        total_files,
        cache_mode,
        model_type
    );
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
