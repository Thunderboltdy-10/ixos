//! Big-root benchmark harness for Ixos.
//!
//! Produces JSON + markdown reports with per-query timings and tier PASS/FAIL gates.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use clap::{Parser, ValueEnum};
use ixos_protocol::ixos_embed::{MmapModel2VecEmbedder, ModelType};
use ixos_protocol::ixos_rank::{
    CacheMode, CandidateGenerator, CandidateGeneratorConfig, SemanticEngine, StubSemanticEngine,
};
use ixos_protocol::SecureEmbedder;
use serde::Serialize;

const DEFAULT_QUERY_FILE: &str = "bench/big_root_queries.json";

const TIER_A_TTFR_P50_MS: f64 = 60.0;
const TIER_A_TOTAL_P95_MS: f64 = 400.0;

const TIER_B_TTFR_P50_MS: f64 = 120.0;
const TIER_B_TOTAL_P95_MS: f64 = 2000.0;

const TIER_C_COLD_TTFR_P50_MS: f64 = 200.0;
const TIER_C_COLD_TOTAL_P95_MS: f64 = 12000.0;
const TIER_C_WARM_TOTAL_P95_MS: f64 = 5000.0;

const HARSH_TIER_A_TTFR_P50_MS: f64 = 35.0;
const HARSH_TIER_A_TOTAL_P95_MS: f64 = 250.0;
const HARSH_TIER_B_TTFR_P50_MS: f64 = 70.0;
const HARSH_TIER_B_TOTAL_P95_MS: f64 = 1200.0;
const HARSH_TIER_C_COLD_TTFR_P50_MS: f64 = 120.0;
const HARSH_TIER_C_COLD_TOTAL_P95_MS: f64 = 6000.0;
const HARSH_TIER_C_WARM_TOTAL_P95_MS: f64 = 2500.0;
const HARSH_STAGE_RIPGREP_P95_MS: f64 = 80.0;
const HARSH_STAGE_EMBED_P95_MS: f64 = 40.0;
const HARSH_STAGE_RANK_P95_MS: f64 = 80.0;

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum BenchCacheMode {
    #[default]
    NativeCache,
    Ephemeral,
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum BenchModelType {
    #[default]
    IxosFlashV2,
    Potion,
    IxosFlashV1,
    IxosProV1,
}

#[derive(Clone, Copy, Debug, Default, ValueEnum)]
enum ObjectiveProfile {
    #[default]
    Standard,
    #[value(alias = "strict")]
    Harsh,
}

#[derive(Parser, Debug)]
#[command(name = "ixos-big-bench")]
#[command(about = "Run large-root benchmark with tier gates", long_about = None)]
struct BigBenchArgs {
    /// Directory to benchmark
    #[arg(long)]
    dir: PathBuf,

    /// Optional query file (JSON array or {"queries":[...]})
    #[arg(long)]
    queries_file: Option<PathBuf>,

    /// Number of runs per query
    #[arg(long, default_value = "3")]
    runs: usize,

    /// Cache mode: native-cache or ephemeral
    #[arg(long, value_enum, default_value = "native-cache")]
    cache_mode: BenchCacheMode,

    /// Embedding model
    #[arg(long, value_enum, default_value = "ixos-flash-v2")]
    model: BenchModelType,

    /// Output directory for markdown + json reports
    #[arg(long, default_value = "reports")]
    output_dir: PathBuf,

    /// Max lexical candidates to pass to semantic rerank
    #[arg(long, default_value = "1500")]
    candidate_limit: usize,

    /// Max final results to keep per query
    #[arg(long, default_value = "20")]
    result_limit: usize,

    /// Objective profile for pass/fail gates
    #[arg(long, value_enum, default_value = "standard")]
    objective_profile: ObjectiveProfile,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum CorpusTier {
    A,
    B,
    C,
}

#[derive(Debug, Clone, Serialize)]
struct StageBreakdown {
    walk_ms: u64,
    path_score_ms: u64,
    ripgrep_ms: u64,
    embed_ms: u64,
    rank_ms: u64,
    evidence_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
struct CacheStats {
    hits: usize,
    misses: usize,
    writes: usize,
}

#[derive(Debug, Clone, Serialize)]
struct QueryRunRecord {
    query: String,
    run_index: usize,
    warm: bool,
    ttfr_ms: u64,
    total_ms: u64,
    stage_breakdown: StageBreakdown,
    cache_stats: CacheStats,
    result_count: usize,
    top1_path: Option<String>,
    top1_score: Option<f32>,
}

#[derive(Debug, Clone, Serialize)]
struct QueryAggregate {
    query: String,
    samples: usize,
    ttfr_p50_ms: f64,
    total_p95_ms: f64,
    avg_results: f64,
}

#[derive(Debug, Clone, Serialize)]
struct TierTargets {
    description: String,
    ttfr_target_ms: Option<f64>,
    total_target_ms: Option<f64>,
    cold_ttfr_target_ms: Option<f64>,
    cold_total_target_ms: Option<f64>,
    warm_total_target_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
struct GateResult {
    pass: bool,
    reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct Summary {
    samples: usize,
    ttfr_p50_ms: f64,
    ttfr_p95_ms: f64,
    total_p50_ms: f64,
    total_p95_ms: f64,
    cold_ttfr_p50_ms: Option<f64>,
    cold_total_p95_ms: Option<f64>,
    warm_total_p95_ms: Option<f64>,
    walk_p95_ms: f64,
    path_score_p95_ms: f64,
    ripgrep_p95_ms: f64,
    embed_p95_ms: f64,
    rank_p95_ms: f64,
    avg_cache_hit_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
struct BigBenchReport {
    generated_at: String,
    root_dir: String,
    file_count: usize,
    corpus_tier: CorpusTier,
    objective_profile: String,
    model: String,
    cache_mode: String,
    runs_per_query: usize,
    queries: usize,
    targets: TierTargets,
    gate: GateResult,
    summary: Summary,
    per_query: Vec<QueryAggregate>,
    records: Vec<QueryRunRecord>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(untagged)]
enum QueryFilePayload {
    Array(Vec<String>),
    Object { queries: Vec<String> },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = BigBenchArgs::parse();
    if args.runs == 0 {
        anyhow::bail!("--runs must be at least 1");
    }
    if !args.dir.exists() {
        anyhow::bail!("Directory not found: {}", args.dir.display());
    }

    let root_dir = args.dir.canonicalize().unwrap_or(args.dir.clone());
    let file_count = count_files(&root_dir)?;
    let tier = classify_tier(file_count);
    let queries = load_queries(args.queries_file.as_deref())?;
    if queries.is_empty() {
        anyhow::bail!("No queries loaded for benchmark");
    }

    let cache_mode = match args.cache_mode {
        BenchCacheMode::NativeCache => CacheMode::NativeCache,
        BenchCacheMode::Ephemeral => CacheMode::Ephemeral,
    };

    let mut generator =
        CandidateGenerator::new(root_dir.clone(), CandidateGeneratorConfig::default());
    generator.build_index();

    let mut semantic = load_semantic(args.model, cache_mode)?;
    semantic.index_directory(&root_dir).await?;

    let mut records: Vec<QueryRunRecord> = Vec::new();
    for run_idx in 0..args.runs {
        for (query_idx, query) in queries.iter().enumerate() {
            let query_started = Instant::now();
            let candidate_set = generator.generate(query);
            let candidate_stats = candidate_set.stats.clone();
            let candidate_elapsed_ms = query_started.elapsed().as_millis() as u64;

            let mut lexical_results = candidate_set.into_lexical_matches();
            lexical_results.truncate(args.candidate_limit);
            let semantic_limit = args.result_limit.min(lexical_results.len());

            let semantic_started = Instant::now();
            let semantic_results = semantic
                .rerank(query, lexical_results, semantic_limit)
                .await?;
            let semantic_elapsed_ms = semantic_started.elapsed().as_millis() as u64;
            let semantic_metrics = semantic.take_metrics().await;
            let rank_ms = semantic_elapsed_ms.saturating_sub(semantic_metrics.embedding_ms);

            let top1 = semantic_results.first();
            let walk_ms = candidate_stats.directory_walk_ms;
            records.push(QueryRunRecord {
                query: query.clone(),
                run_index: run_idx + 1,
                warm: query_idx > 0 || run_idx > 0,
                ttfr_ms: candidate_elapsed_ms,
                total_ms: query_started.elapsed().as_millis() as u64,
                stage_breakdown: StageBreakdown {
                    walk_ms,
                    path_score_ms: candidate_stats.path_scoring_ms,
                    ripgrep_ms: candidate_stats.ripgrep_ms,
                    embed_ms: semantic_metrics.embedding_ms,
                    rank_ms,
                    evidence_ms: 0,
                },
                cache_stats: CacheStats {
                    hits: semantic_metrics.cache_hits,
                    misses: semantic_metrics.candidates_embedded,
                    writes: if matches!(cache_mode, CacheMode::NativeCache) {
                        semantic_metrics.candidates_embedded
                    } else {
                        0
                    },
                },
                result_count: semantic_results.len(),
                top1_path: top1.map(|item| item.path.display().to_string()),
                top1_score: top1.map(|item| item.similarity),
            });
        }
    }

    let summary = build_summary(&records);
    let targets = tier_targets(tier, args.objective_profile);
    let gate = evaluate_gate(tier, args.objective_profile, &summary);
    let per_query = build_query_aggregates(&records);

    let report = BigBenchReport {
        generated_at: chrono::Utc::now().to_rfc3339(),
        root_dir: root_dir.display().to_string(),
        file_count,
        corpus_tier: tier,
        objective_profile: format!("{:?}", args.objective_profile),
        model: bench_model_to_model_type(args.model).to_string(),
        cache_mode: format!("{cache_mode:?}"),
        runs_per_query: args.runs,
        queries: queries.len(),
        targets,
        gate,
        summary,
        per_query,
        records,
    };

    fs::create_dir_all(&args.output_dir)?;
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let json_path = args.output_dir.join(format!("big_bench_{ts}.json"));
    let md_path = args.output_dir.join(format!("big_bench_{ts}.md"));

    fs::write(&json_path, serde_json::to_string_pretty(&report)?)?;
    fs::write(&md_path, render_markdown(&report))?;

    println!("Wrote {}", json_path.display());
    println!("Wrote {}", md_path.display());
    if report.gate.pass {
        println!("Tier gate: PASS");
    } else {
        println!("Tier gate: FAIL");
        let reason = if report.gate.reasons.is_empty() {
            "unknown gate failure".to_string()
        } else {
            report.gate.reasons.join("; ")
        };
        anyhow::bail!("tier gate failed: {}", reason);
    }
    Ok(())
}

fn count_files(root: &Path) -> anyhow::Result<usize> {
    let mut files = 0usize;
    for entry in walkdir::WalkDir::new(root) {
        let entry = entry?;
        if entry.file_type().is_file() {
            files += 1;
        }
    }
    Ok(files)
}

fn classify_tier(file_count: usize) -> CorpusTier {
    if file_count <= 5_000 {
        CorpusTier::A
    } else if file_count <= 80_000 {
        CorpusTier::B
    } else {
        CorpusTier::C
    }
}

fn load_queries(path: Option<&Path>) -> anyhow::Result<Vec<String>> {
    let default_path = PathBuf::from(DEFAULT_QUERY_FILE);
    let query_path = path.unwrap_or(default_path.as_path());
    let raw = if query_path.exists() {
        fs::read_to_string(query_path)?
    } else {
        String::new()
    };

    let mut queries = if raw.trim().is_empty() {
        vec![
            "cache mode".to_string(),
            "semantic ranking".to_string(),
            "progressive search".to_string(),
            "deep search mode".to_string(),
            "model list".to_string(),
        ]
    } else {
        match serde_json::from_str::<QueryFilePayload>(&raw)? {
            QueryFilePayload::Array(items) => items,
            QueryFilePayload::Object { queries } => queries,
        }
    };

    queries.retain(|q| !q.trim().is_empty());
    Ok(queries)
}

fn bench_model_to_model_type(model: BenchModelType) -> ModelType {
    match model {
        BenchModelType::IxosFlashV2 => ModelType::IxosFlashV2,
        BenchModelType::Potion => ModelType::Potion,
        BenchModelType::IxosFlashV1 => ModelType::IxosFlashV1,
        BenchModelType::IxosProV1 => ModelType::IxosProV1,
    }
}

fn load_semantic(
    model: BenchModelType,
    cache_mode: CacheMode,
) -> anyhow::Result<StubSemanticEngine> {
    let model_type = bench_model_to_model_type(model);
    let model = MmapModel2VecEmbedder::new_with_type(model_type)
        .map_err(|e| anyhow::anyhow!("Model load failed ({}): {}", model_type, e))?;
    let embedder = SecureEmbedder::new_fast(std::sync::Arc::new(model));
    Ok(StubSemanticEngine::with_cache_mode(embedder, cache_mode))
}

fn percentile(values: &[u64], p: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    let rank = ((sorted.len() - 1) as f64 * p).round() as usize;
    sorted[rank.min(sorted.len() - 1)] as f64
}

fn build_summary(records: &[QueryRunRecord]) -> Summary {
    let ttfr: Vec<u64> = records.iter().map(|r| r.ttfr_ms).collect();
    let total: Vec<u64> = records.iter().map(|r| r.total_ms).collect();
    let walk: Vec<u64> = records.iter().map(|r| r.stage_breakdown.walk_ms).collect();
    let path_score: Vec<u64> = records
        .iter()
        .map(|r| r.stage_breakdown.path_score_ms)
        .collect();
    let ripgrep: Vec<u64> = records
        .iter()
        .map(|r| r.stage_breakdown.ripgrep_ms)
        .collect();
    let embed: Vec<u64> = records.iter().map(|r| r.stage_breakdown.embed_ms).collect();
    let rank: Vec<u64> = records.iter().map(|r| r.stage_breakdown.rank_ms).collect();

    let cold: Vec<&QueryRunRecord> = records.iter().filter(|r| !r.warm).collect();
    let warm: Vec<&QueryRunRecord> = records.iter().filter(|r| r.warm).collect();
    let cold_ttfr: Vec<u64> = cold.iter().map(|r| r.ttfr_ms).collect();
    let cold_total: Vec<u64> = cold.iter().map(|r| r.total_ms).collect();
    let warm_total: Vec<u64> = warm.iter().map(|r| r.total_ms).collect();

    let mut hit_rate_sum = 0.0f64;
    for record in records {
        let denom = (record.cache_stats.hits + record.cache_stats.misses) as f64;
        if denom > 0.0 {
            hit_rate_sum += record.cache_stats.hits as f64 / denom;
        }
    }
    let avg_cache_hit_rate = if records.is_empty() {
        0.0
    } else {
        hit_rate_sum / records.len() as f64
    };

    Summary {
        samples: records.len(),
        ttfr_p50_ms: percentile(&ttfr, 0.5),
        ttfr_p95_ms: percentile(&ttfr, 0.95),
        total_p50_ms: percentile(&total, 0.5),
        total_p95_ms: percentile(&total, 0.95),
        cold_ttfr_p50_ms: (!cold_ttfr.is_empty()).then(|| percentile(&cold_ttfr, 0.5)),
        cold_total_p95_ms: (!cold_total.is_empty()).then(|| percentile(&cold_total, 0.95)),
        warm_total_p95_ms: (!warm_total.is_empty()).then(|| percentile(&warm_total, 0.95)),
        walk_p95_ms: percentile(&walk, 0.95),
        path_score_p95_ms: percentile(&path_score, 0.95),
        ripgrep_p95_ms: percentile(&ripgrep, 0.95),
        embed_p95_ms: percentile(&embed, 0.95),
        rank_p95_ms: percentile(&rank, 0.95),
        avg_cache_hit_rate,
    }
}

fn build_query_aggregates(records: &[QueryRunRecord]) -> Vec<QueryAggregate> {
    let mut grouped: BTreeMap<String, Vec<&QueryRunRecord>> = BTreeMap::new();
    for record in records {
        grouped
            .entry(record.query.clone())
            .or_default()
            .push(record);
    }

    grouped
        .into_iter()
        .map(|(query, rows)| {
            let ttfr: Vec<u64> = rows.iter().map(|r| r.ttfr_ms).collect();
            let total: Vec<u64> = rows.iter().map(|r| r.total_ms).collect();
            let avg_results = if rows.is_empty() {
                0.0
            } else {
                rows.iter().map(|r| r.result_count as f64).sum::<f64>() / rows.len() as f64
            };
            QueryAggregate {
                query,
                samples: rows.len(),
                ttfr_p50_ms: percentile(&ttfr, 0.5),
                total_p95_ms: percentile(&total, 0.95),
                avg_results,
            }
        })
        .collect()
}

fn tier_targets(tier: CorpusTier, profile: ObjectiveProfile) -> TierTargets {
    match (tier, profile) {
        (CorpusTier::A, ObjectiveProfile::Standard) => TierTargets {
            description: "Tier A (<=5k files, standard objective)".to_string(),
            ttfr_target_ms: Some(TIER_A_TTFR_P50_MS),
            total_target_ms: Some(TIER_A_TOTAL_P95_MS),
            cold_ttfr_target_ms: None,
            cold_total_target_ms: None,
            warm_total_target_ms: None,
        },
        (CorpusTier::B, ObjectiveProfile::Standard) => TierTargets {
            description: "Tier B (~50k files, standard objective)".to_string(),
            ttfr_target_ms: Some(TIER_B_TTFR_P50_MS),
            total_target_ms: Some(TIER_B_TOTAL_P95_MS),
            cold_ttfr_target_ms: None,
            cold_total_target_ms: None,
            warm_total_target_ms: None,
        },
        (CorpusTier::C, ObjectiveProfile::Standard) => TierTargets {
            description: "Tier C (100k-300k files, standard objective)".to_string(),
            ttfr_target_ms: None,
            total_target_ms: None,
            cold_ttfr_target_ms: Some(TIER_C_COLD_TTFR_P50_MS),
            cold_total_target_ms: Some(TIER_C_COLD_TOTAL_P95_MS),
            warm_total_target_ms: Some(TIER_C_WARM_TOTAL_P95_MS),
        },
        (CorpusTier::A, ObjectiveProfile::Harsh) => TierTargets {
            description: "Tier A (<=5k files, harsh objective)".to_string(),
            ttfr_target_ms: Some(HARSH_TIER_A_TTFR_P50_MS),
            total_target_ms: Some(HARSH_TIER_A_TOTAL_P95_MS),
            cold_ttfr_target_ms: None,
            cold_total_target_ms: None,
            warm_total_target_ms: None,
        },
        (CorpusTier::B, ObjectiveProfile::Harsh) => TierTargets {
            description: "Tier B (~50k files, harsh objective)".to_string(),
            ttfr_target_ms: Some(HARSH_TIER_B_TTFR_P50_MS),
            total_target_ms: Some(HARSH_TIER_B_TOTAL_P95_MS),
            cold_ttfr_target_ms: None,
            cold_total_target_ms: None,
            warm_total_target_ms: None,
        },
        (CorpusTier::C, ObjectiveProfile::Harsh) => TierTargets {
            description: "Tier C (100k-300k files, harsh objective)".to_string(),
            ttfr_target_ms: None,
            total_target_ms: None,
            cold_ttfr_target_ms: Some(HARSH_TIER_C_COLD_TTFR_P50_MS),
            cold_total_target_ms: Some(HARSH_TIER_C_COLD_TOTAL_P95_MS),
            warm_total_target_ms: Some(HARSH_TIER_C_WARM_TOTAL_P95_MS),
        },
    }
}

fn evaluate_gate(tier: CorpusTier, profile: ObjectiveProfile, summary: &Summary) -> GateResult {
    let mut reasons = Vec::new();
    match (tier, profile) {
        (CorpusTier::A, ObjectiveProfile::Standard) => {
            if summary.ttfr_p50_ms > TIER_A_TTFR_P50_MS {
                reasons.push(format!(
                    "ttfr_p50 {:.2}ms exceeds target {:.2}ms",
                    summary.ttfr_p50_ms, TIER_A_TTFR_P50_MS
                ));
            }
            if summary.total_p95_ms > TIER_A_TOTAL_P95_MS {
                reasons.push(format!(
                    "total_p95 {:.2}ms exceeds target {:.2}ms",
                    summary.total_p95_ms, TIER_A_TOTAL_P95_MS
                ));
            }
        }
        (CorpusTier::B, ObjectiveProfile::Standard) => {
            if summary.ttfr_p50_ms > TIER_B_TTFR_P50_MS {
                reasons.push(format!(
                    "ttfr_p50 {:.2}ms exceeds target {:.2}ms",
                    summary.ttfr_p50_ms, TIER_B_TTFR_P50_MS
                ));
            }
            if summary.total_p95_ms > TIER_B_TOTAL_P95_MS {
                reasons.push(format!(
                    "total_p95 {:.2}ms exceeds target {:.2}ms",
                    summary.total_p95_ms, TIER_B_TOTAL_P95_MS
                ));
            }
        }
        (CorpusTier::C, ObjectiveProfile::Standard) => {
            match summary.cold_ttfr_p50_ms {
                Some(v) if v > TIER_C_COLD_TTFR_P50_MS => reasons.push(format!(
                    "cold ttfr_p50 {:.2}ms exceeds target {:.2}ms",
                    v, TIER_C_COLD_TTFR_P50_MS
                )),
                None => reasons.push("missing cold ttfr samples".to_string()),
                _ => {}
            }
            match summary.cold_total_p95_ms {
                Some(v) if v > TIER_C_COLD_TOTAL_P95_MS => reasons.push(format!(
                    "cold total_p95 {:.2}ms exceeds target {:.2}ms",
                    v, TIER_C_COLD_TOTAL_P95_MS
                )),
                None => reasons.push("missing cold total samples".to_string()),
                _ => {}
            }
            match summary.warm_total_p95_ms {
                Some(v) if v > TIER_C_WARM_TOTAL_P95_MS => reasons.push(format!(
                    "warm total_p95 {:.2}ms exceeds target {:.2}ms",
                    v, TIER_C_WARM_TOTAL_P95_MS
                )),
                None => reasons.push("missing warm total samples".to_string()),
                _ => {}
            }
        }
        (CorpusTier::A, ObjectiveProfile::Harsh) => {
            if summary.ttfr_p50_ms > HARSH_TIER_A_TTFR_P50_MS {
                reasons.push(format!(
                    "ttfr_p50 {:.2}ms exceeds harsh target {:.2}ms",
                    summary.ttfr_p50_ms, HARSH_TIER_A_TTFR_P50_MS
                ));
            }
            if summary.total_p95_ms > HARSH_TIER_A_TOTAL_P95_MS {
                reasons.push(format!(
                    "total_p95 {:.2}ms exceeds harsh target {:.2}ms",
                    summary.total_p95_ms, HARSH_TIER_A_TOTAL_P95_MS
                ));
            }
        }
        (CorpusTier::B, ObjectiveProfile::Harsh) => {
            if summary.ttfr_p50_ms > HARSH_TIER_B_TTFR_P50_MS {
                reasons.push(format!(
                    "ttfr_p50 {:.2}ms exceeds harsh target {:.2}ms",
                    summary.ttfr_p50_ms, HARSH_TIER_B_TTFR_P50_MS
                ));
            }
            if summary.total_p95_ms > HARSH_TIER_B_TOTAL_P95_MS {
                reasons.push(format!(
                    "total_p95 {:.2}ms exceeds harsh target {:.2}ms",
                    summary.total_p95_ms, HARSH_TIER_B_TOTAL_P95_MS
                ));
            }
        }
        (CorpusTier::C, ObjectiveProfile::Harsh) => {
            match summary.cold_ttfr_p50_ms {
                Some(v) if v > HARSH_TIER_C_COLD_TTFR_P50_MS => reasons.push(format!(
                    "cold ttfr_p50 {:.2}ms exceeds harsh target {:.2}ms",
                    v, HARSH_TIER_C_COLD_TTFR_P50_MS
                )),
                None => reasons.push("missing cold ttfr samples".to_string()),
                _ => {}
            }
            match summary.cold_total_p95_ms {
                Some(v) if v > HARSH_TIER_C_COLD_TOTAL_P95_MS => reasons.push(format!(
                    "cold total_p95 {:.2}ms exceeds harsh target {:.2}ms",
                    v, HARSH_TIER_C_COLD_TOTAL_P95_MS
                )),
                None => reasons.push("missing cold total samples".to_string()),
                _ => {}
            }
            match summary.warm_total_p95_ms {
                Some(v) if v > HARSH_TIER_C_WARM_TOTAL_P95_MS => reasons.push(format!(
                    "warm total_p95 {:.2}ms exceeds harsh target {:.2}ms",
                    v, HARSH_TIER_C_WARM_TOTAL_P95_MS
                )),
                None => reasons.push("missing warm total samples".to_string()),
                _ => {}
            }
            if summary.ripgrep_p95_ms > HARSH_STAGE_RIPGREP_P95_MS {
                reasons.push(format!(
                    "ripgrep_p95 {:.2}ms exceeds harsh stage target {:.2}ms",
                    summary.ripgrep_p95_ms, HARSH_STAGE_RIPGREP_P95_MS
                ));
            }
            if summary.embed_p95_ms > HARSH_STAGE_EMBED_P95_MS {
                reasons.push(format!(
                    "embed_p95 {:.2}ms exceeds harsh stage target {:.2}ms",
                    summary.embed_p95_ms, HARSH_STAGE_EMBED_P95_MS
                ));
            }
            if summary.rank_p95_ms > HARSH_STAGE_RANK_P95_MS {
                reasons.push(format!(
                    "rank_p95 {:.2}ms exceeds harsh stage target {:.2}ms",
                    summary.rank_p95_ms, HARSH_STAGE_RANK_P95_MS
                ));
            }
        }
    }

    GateResult {
        pass: reasons.is_empty(),
        reasons,
    }
}

fn render_markdown(report: &BigBenchReport) -> String {
    let mut lines = Vec::new();
    lines.push("# Ixos Big Root Benchmark".to_string());
    lines.push(format!("- Generated: `{}`", report.generated_at));
    lines.push(format!("- Root: `{}`", report.root_dir));
    lines.push(format!("- Files: `{}`", report.file_count));
    lines.push(format!("- Tier: `{:?}`", report.corpus_tier));
    lines.push(format!(
        "- Objective profile: `{}`",
        report.objective_profile
    ));
    lines.push(format!("- Model: `{}`", report.model));
    lines.push(format!("- Cache mode: `{}`", report.cache_mode));
    lines.push(format!("- Runs/query: `{}`", report.runs_per_query));
    lines.push(format!("- Queries: `{}`", report.queries));
    lines.push(String::new());

    lines.push("## Tier Gate".to_string());
    lines.push(format!(
        "- Status: **{}**",
        if report.gate.pass { "PASS" } else { "FAIL" }
    ));
    for reason in &report.gate.reasons {
        lines.push(format!("- {}", reason));
    }
    lines.push(String::new());

    lines.push("## Summary".to_string());
    lines.push("| Metric | Value |".to_string());
    lines.push("| --- | ---: |".to_string());
    lines.push(format!(
        "| TTFR p50 (ms) | {:.2} |",
        report.summary.ttfr_p50_ms
    ));
    lines.push(format!(
        "| TTFR p95 (ms) | {:.2} |",
        report.summary.ttfr_p95_ms
    ));
    lines.push(format!(
        "| Total p50 (ms) | {:.2} |",
        report.summary.total_p50_ms
    ));
    lines.push(format!(
        "| Total p95 (ms) | {:.2} |",
        report.summary.total_p95_ms
    ));
    if let Some(v) = report.summary.cold_ttfr_p50_ms {
        lines.push(format!("| Cold TTFR p50 (ms) | {:.2} |", v));
    }
    if let Some(v) = report.summary.cold_total_p95_ms {
        lines.push(format!("| Cold Total p95 (ms) | {:.2} |", v));
    }
    if let Some(v) = report.summary.warm_total_p95_ms {
        lines.push(format!("| Warm Total p95 (ms) | {:.2} |", v));
    }
    lines.push(format!(
        "| Avg cache hit rate | {:.3} |",
        report.summary.avg_cache_hit_rate
    ));
    lines.push(format!(
        "| Walk p95 (ms) | {:.2} |",
        report.summary.walk_p95_ms
    ));
    lines.push(format!(
        "| Path score p95 (ms) | {:.2} |",
        report.summary.path_score_p95_ms
    ));
    lines.push(format!(
        "| Ripgrep p95 (ms) | {:.2} |",
        report.summary.ripgrep_p95_ms
    ));
    lines.push(format!(
        "| Embed p95 (ms) | {:.2} |",
        report.summary.embed_p95_ms
    ));
    lines.push(format!(
        "| Rank p95 (ms) | {:.2} |",
        report.summary.rank_p95_ms
    ));
    lines.push(String::new());

    lines.push("## Per Query".to_string());
    lines.push("| Query | Samples | TTFR p50 (ms) | Total p95 (ms) | Avg results |".to_string());
    lines.push("| --- | ---: | ---: | ---: | ---: |".to_string());
    for row in &report.per_query {
        lines.push(format!(
            "| {} | {} | {:.2} | {:.2} | {:.2} |",
            row.query, row.samples, row.ttfr_p50_ms, row.total_p95_ms, row.avg_results
        ));
    }

    lines.join("\n") + "\n"
}
