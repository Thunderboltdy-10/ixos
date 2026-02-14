use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use clap::{Parser, ValueEnum};
use serde::Serialize;
use tokio::sync::{mpsc, Mutex};
use tokio_util::sync::CancellationToken;

use ixos_protocol::instrumentation::CorpusStats;
use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
use ixos_protocol::ixos_rank::{
    progressive::{
        ProgressiveSearchConfig, ProgressiveSearchEngine, SearchEvent, SearchMode, StreamStats,
    },
    CacheMode, CandidateLexicalEngine, StubSemanticEngine,
};
use ixos_protocol::SecureEmbedder;

#[derive(Clone, Copy, Debug, ValueEnum)]
enum BenchCacheMode {
    NativeCache,
    Ephemeral,
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum BenchSearchMode {
    Flash,
    Auto,
    Pro,
}

#[derive(Parser, Debug)]
#[command(name = "ixos-scale-bench")]
#[command(about = "Ixos scale benchmark runner", long_about = None)]
struct Args {
    /// Directory to benchmark
    #[arg(long)]
    dir: PathBuf,

    /// File containing queries (one per line)
    #[arg(long)]
    queries_file: PathBuf,

    /// Max queries to run (truncate if file has more)
    #[arg(long, default_value = "50")]
    max_queries: usize,

    /// Cache mode: local or memory
    #[arg(long, value_enum, default_value = "native-cache")]
    cache_mode: BenchCacheMode,

    /// Search mode: flash, auto, pro
    #[arg(long, value_enum, default_value = "auto")]
    search_mode: BenchSearchMode,

    /// Flash model type (e.g., ixos-flash-v2)
    #[arg(long, default_value = "ixos-flash-v2")]
    model: String,

    /// Pro model type (e.g., ixos-pro-v2)
    #[arg(long, default_value = "ixos-pro-v2")]
    pro_model: String,

    /// Output JSON path
    #[arg(long, default_value = "reports/scale_bench.json")]
    out_json: PathBuf,

    /// Output Markdown path
    #[arg(long, default_value = "reports/SCALE_BENCH.md")]
    out_md: PathBuf,

    /// Per-query timeout (seconds)
    #[arg(long, default_value = "15")]
    timeout_seconds: u64,
}

#[derive(Debug, Serialize)]
struct QueryResult {
    query: String,
    ttfr_ms: Option<u64>,
    ttsi_ms: Option<u64>,
    total_ms: u64,
    results: usize,
    files_scanned: usize,
    candidates: usize,
    embedded: usize,
    cache_hits: usize,
    file_types: HashMap<String, usize>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct AggregateStats {
    query_count: usize,
    failures: usize,
    ttfr_p50_ms: Option<u64>,
    ttfr_p95_ms: Option<u64>,
    ttsi_p50_ms: Option<u64>,
    ttsi_p95_ms: Option<u64>,
    total_p50_ms: u64,
    total_p95_ms: u64,
    candidates_p50: u64,
    candidates_p95: u64,
    embedded_p50: u64,
    embedded_p95: u64,
}

#[derive(Debug, Serialize)]
struct ScaleBenchReport {
    generated_at_unix: u64,
    dir: String,
    cache_mode: String,
    search_mode: String,
    model: String,
    pro_model: String,
    corpus: CorpusStats,
    aggregate: AggregateStats,
    queries: Vec<QueryResult>,
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

fn percentile(values: &mut [u64], pct: f32) -> Option<u64> {
    if values.is_empty() {
        return None;
    }
    values.sort_unstable();
    let rank = ((values.len() - 1) as f32 * pct).round() as usize;
    values.get(rank).copied()
}

fn load_queries(path: &Path, max: usize) -> anyhow::Result<Vec<String>> {
    let content = std::fs::read_to_string(path)?;
    let mut out = Vec::new();
    for line in content.lines() {
        let q = line.trim();
        if q.is_empty() {
            continue;
        }
        out.push(q.to_string());
        if out.len() >= max {
            break;
        }
    }
    Ok(out)
}

fn parse_search_mode(mode: BenchSearchMode) -> SearchMode {
    match mode {
        BenchSearchMode::Flash => SearchMode::Flash,
        BenchSearchMode::Auto => SearchMode::Auto,
        BenchSearchMode::Pro => SearchMode::Pro,
    }
}

fn cache_mode(mode: BenchCacheMode) -> CacheMode {
    match mode {
        BenchCacheMode::Ephemeral => CacheMode::Ephemeral,
        BenchCacheMode::NativeCache => CacheMode::NativeCache,
    }
}

fn parse_flash_model_type(raw: &str) -> anyhow::Result<ixos_protocol::ixos_embed::ModelType> {
    raw.parse::<ixos_protocol::ixos_embed::ModelType>()
        .map_err(|e| anyhow::anyhow!(e))
}

fn parse_pro_model_type(raw: &str) -> ixos_protocol::ixos_embed::ModelType {
    match raw.trim().to_lowercase().as_str() {
        "ixos-pro-v2" | "pro-v2" | "pro" => ixos_protocol::ixos_embed::ModelType::Potion,
        "potion" | "potion-base-8m-int8" => ixos_protocol::ixos_embed::ModelType::Potion,
        _ => raw
            .parse::<ixos_protocol::ixos_embed::ModelType>()
            .unwrap_or(ixos_protocol::ixos_embed::ModelType::Potion),
    }
}

fn build_semantic_engine(
    model_type: ixos_protocol::ixos_embed::ModelType,
    cache_mode: CacheMode,
) -> anyhow::Result<StubSemanticEngine> {
    let model = MmapModel2VecEmbedder::new_with_type(model_type)
        .map_err(|e| anyhow::anyhow!("Model load failed ({}): {}", model_type, e))?;
    let embedder = SecureEmbedder::new_fast(std::sync::Arc::new(model));
    Ok(StubSemanticEngine::with_cache_mode(embedder, cache_mode))
}

fn record_file_types(results: &[ixos_protocol::ixos_rank::RankedResult]) -> HashMap<String, usize> {
    let mut out = HashMap::new();
    for result in results {
        let ext = result
            .path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_else(|| "unknown".to_string());
        *out.entry(ext).or_insert(0) += 1;
    }
    out
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    if !args.dir.exists() {
        anyhow::bail!("Directory not found: {}", args.dir.display());
    }
    if !args.queries_file.exists() {
        anyhow::bail!("Queries file not found: {}", args.queries_file.display());
    }

    let queries = load_queries(&args.queries_file, args.max_queries)?;
    if queries.is_empty() {
        anyhow::bail!("No queries found in {}", args.queries_file.display());
    }

    let dir = args.dir.canonicalize().unwrap_or(args.dir.clone());
    let corpus = collect_corpus_stats(&dir);

    // Build lexical engine
    let lexical = CandidateLexicalEngine::new(dir.clone());

    // Build semantic engines
    let flash_type = parse_flash_model_type(&args.model)?;
    let pro_type = parse_pro_model_type(&args.pro_model);

    let cache_mode = cache_mode(args.cache_mode);

    let mut flash_engine = build_semantic_engine(flash_type, cache_mode)?;
    flash_engine.index_directory(&dir).await?;

    let use_pro = matches!(
        args.search_mode,
        BenchSearchMode::Auto | BenchSearchMode::Pro
    );
    let mut pro_engine = if use_pro {
        if pro_type == flash_type {
            None
        } else {
            let mut engine = build_semantic_engine(pro_type, cache_mode)?;
            engine.index_directory(&dir).await?;
            Some(engine)
        }
    } else {
        None
    };

    let mut config = ProgressiveSearchConfig::default();
    config.search_mode = parse_search_mode(args.search_mode);

    let engine = ProgressiveSearchEngine::with_config_and_pro(
        lexical,
        flash_engine,
        pro_engine.take(),
        config,
    );
    let engine = std::sync::Arc::new(Mutex::new(engine));

    let mut results = Vec::new();
    let mut failures = 0usize;

    for query in &queries {
        let start = Instant::now();
        let deadline = start + Duration::from_secs(args.timeout_seconds);

        let (tx, mut rx) = mpsc::channel(20);
        let cancel = CancellationToken::new();
        let query_string = query.clone();

        let mut ttfr_ms: Option<u64> = None;
        let mut ttsi_ms: Option<u64> = None;
        let mut final_results: Vec<ixos_protocol::ixos_rank::RankedResult> = Vec::new();
        let mut stats = StreamStats::default();
        let mut error: Option<String> = None;

        let engine_handle = std::sync::Arc::clone(&engine);
        let search_handle = tokio::spawn(async move {
            let mut guard = engine_handle.lock().await;
            guard.search_progressive(query_string, tx, cancel).await
        });

        while let Some(event) = rx.recv().await {
            if Instant::now() > deadline {
                error = Some("timeout".to_string());
                break;
            }
            match event {
                SearchEvent::LexicalResults(_) | SearchEvent::LexicalBatch { .. } => {
                    if ttfr_ms.is_none() {
                        ttfr_ms = Some(start.elapsed().as_millis() as u64);
                    }
                }
                SearchEvent::SemanticResults(items) => {
                    if ttsi_ms.is_none() {
                        ttsi_ms = Some(start.elapsed().as_millis() as u64);
                    }
                    final_results = items;
                }
                SearchEvent::LateResult { result, .. } => {
                    if ttsi_ms.is_none() {
                        ttsi_ms = Some(start.elapsed().as_millis() as u64);
                    }
                    final_results.push(result);
                }
                SearchEvent::StreamUpdate { stats: s, .. } => {
                    stats = s;
                }
                SearchEvent::Error(e) => {
                    error = Some(e);
                    break;
                }
                SearchEvent::Complete => {
                    break;
                }
                _ => {}
            }
        }

        let _ = search_handle.await;
        let total_ms = start.elapsed().as_millis() as u64;

        if error.is_some() {
            failures += 1;
        }

        let file_types = record_file_types(&final_results);
        results.push(QueryResult {
            query: query.clone(),
            ttfr_ms,
            ttsi_ms,
            total_ms,
            results: final_results.len(),
            files_scanned: stats.files_scanned,
            candidates: stats.candidates,
            embedded: stats.embedded,
            cache_hits: stats.cache_hits,
            file_types,
            error,
        });
    }

    let mut total_times: Vec<u64> = results.iter().map(|r| r.total_ms).collect();
    let mut ttfr_times: Vec<u64> = results.iter().filter_map(|r| r.ttfr_ms).collect();
    let mut ttsi_times: Vec<u64> = results.iter().filter_map(|r| r.ttsi_ms).collect();
    let mut candidate_counts: Vec<u64> = results.iter().map(|r| r.candidates as u64).collect();
    let mut embedded_counts: Vec<u64> = results.iter().map(|r| r.embedded as u64).collect();

    let aggregate = AggregateStats {
        query_count: results.len(),
        failures,
        ttfr_p50_ms: percentile(&mut ttfr_times, 0.50),
        ttfr_p95_ms: percentile(&mut ttfr_times, 0.95),
        ttsi_p50_ms: percentile(&mut ttsi_times, 0.50),
        ttsi_p95_ms: percentile(&mut ttsi_times, 0.95),
        total_p50_ms: percentile(&mut total_times, 0.50).unwrap_or(0),
        total_p95_ms: percentile(&mut total_times, 0.95).unwrap_or(0),
        candidates_p50: percentile(&mut candidate_counts, 0.50).unwrap_or(0),
        candidates_p95: percentile(&mut candidate_counts, 0.95).unwrap_or(0),
        embedded_p50: percentile(&mut embedded_counts, 0.50).unwrap_or(0),
        embedded_p95: percentile(&mut embedded_counts, 0.95).unwrap_or(0),
    };

    let report = ScaleBenchReport {
        generated_at_unix: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        dir: dir.display().to_string(),
        cache_mode: format!("{:?}", args.cache_mode),
        search_mode: format!("{:?}", args.search_mode),
        model: args.model.clone(),
        pro_model: args.pro_model.clone(),
        corpus,
        aggregate,
        queries: results,
    };

    if let Some(parent) = args.out_json.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if let Some(parent) = args.out_md.parent() {
        std::fs::create_dir_all(parent)?;
    }

    std::fs::write(&args.out_json, serde_json::to_string_pretty(&report)?)?;

    let md = format!(
        "# Scale Bench\n\nGenerated: {}\n\n## Summary\n- Directory: `{}`\n- Search mode: `{}`\n- Flash model: `{}`\n- Pro model: `{}`\n- Cache mode: `{}`\n- Queries: {}\n- Failures: {}\n\n| Metric | p50 | p95 |\n| --- | --- | --- |\n| TTFR (ms) | {} | {} |\n| TTSI (ms) | {} | {} |\n| Total (ms) | {} | {} |\n| Candidates | {} | {} |\n| Embedded | {} | {} |\n\n## Corpus\n- Total files: {}\n- Total size (MB): {:.2}\n- Avg file size (bytes): {}\n\n## Raw JSON\nSee `{}`.\n",
        report.generated_at_unix,
        report.dir,
        report.search_mode,
        report.model,
        report.pro_model,
        report.cache_mode,
        report.aggregate.query_count,
        report.aggregate.failures,
        report.aggregate.ttfr_p50_ms.unwrap_or(0),
        report.aggregate.ttfr_p95_ms.unwrap_or(0),
        report.aggregate.ttsi_p50_ms.unwrap_or(0),
        report.aggregate.ttsi_p95_ms.unwrap_or(0),
        report.aggregate.total_p50_ms,
        report.aggregate.total_p95_ms,
        report.aggregate.candidates_p50,
        report.aggregate.candidates_p95,
        report.aggregate.embedded_p50,
        report.aggregate.embedded_p95,
        report.corpus.total_files,
        report.corpus.total_size_mb,
        report.corpus.avg_file_size_bytes,
        args.out_json.display(),
    );

    std::fs::write(&args.out_md, md)?;

    Ok(())
}
