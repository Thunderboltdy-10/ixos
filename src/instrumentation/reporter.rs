//! Performance baseline reporting

use super::metrics::{LatencyPercentiles, SearchMetrics};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;

/// Complete performance baseline report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceBaseline {
    /// Report generation timestamp
    pub generated_at: String,
    /// Corpus statistics
    pub corpus: CorpusStats,
    /// Summary metrics
    pub summary: SummaryMetrics,
    /// Detailed stage breakdown
    pub stages: StageBreakdown,
    /// Individual run results
    pub runs: Vec<SearchMetrics>,
}

/// Statistics about the test corpus
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorpusStats {
    /// Total number of files
    pub total_files: usize,
    /// Total size in megabytes
    pub total_size_mb: f64,
    /// File type distribution
    pub file_types: Vec<(String, usize)>,
    /// Average file size in bytes
    pub avg_file_size_bytes: u64,
}

/// Summary metrics across all runs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummaryMetrics {
    /// Time to first result percentiles
    pub ttfr: LatencyPercentiles,
    /// Time to semantic interaction percentiles
    pub ttsi: LatencyPercentiles,
    /// Total search time percentiles
    pub total: LatencyPercentiles,
    /// Average cache hit rate
    pub avg_cache_hit_rate: f32,
    /// Average candidates embedded
    pub avg_candidates_embedded: usize,
    /// Average CPU utilization
    pub avg_cpu_percent: f32,
    /// Peak RAM usage across runs (MB)
    pub peak_ram_mb: u64,
}

/// Detailed breakdown by pipeline stage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageBreakdown {
    /// Directory walk percentiles
    pub directory_walk: LatencyPercentiles,
    /// Path scoring percentiles
    pub path_scoring: LatencyPercentiles,
    /// Ripgrep scan percentiles
    pub ripgrep_scan: LatencyPercentiles,
    /// Candidate selection percentiles
    pub candidate_selection: LatencyPercentiles,
    /// Embedding percentiles
    pub embedding: LatencyPercentiles,
    /// Ranking percentiles
    pub ranking: LatencyPercentiles,
}

impl PerformanceBaseline {
    /// Generate a new baseline from collected metrics
    pub fn from_runs(runs: Vec<SearchMetrics>, corpus: CorpusStats) -> Self {
        let summary = Self::calculate_summary(&runs);
        let stages = Self::calculate_stage_breakdown(&runs);

        Self {
            generated_at: chrono::Utc::now().to_rfc3339(),
            corpus,
            summary,
            stages,
            runs,
        }
    }

    fn calculate_summary(runs: &[SearchMetrics]) -> SummaryMetrics {
        use super::metrics::calculate_percentiles;

        let mut ttfr_values: Vec<u64> = runs.iter().map(|r| r.ttfr_ms).collect();
        let mut ttsi_values: Vec<u64> = runs.iter().filter_map(|r| r.ttsi_ms).collect();
        let mut total_values: Vec<u64> = runs.iter().map(|r| r.total_ms).collect();

        let avg_cache_hit_rate = if runs.is_empty() {
            0.0
        } else {
            runs.iter().map(|r| r.resources.cache_hit_rate).sum::<f32>() / runs.len() as f32
        };

        let avg_candidates_embedded = if runs.is_empty() {
            0
        } else {
            runs.iter()
                .map(|r| r.resources.candidates_embedded)
                .sum::<usize>()
                / runs.len()
        };

        let avg_cpu_percent = if runs.is_empty() {
            0.0
        } else {
            runs.iter().map(|r| r.resources.cpu_percent).sum::<f32>() / runs.len() as f32
        };

        let peak_ram_mb = runs
            .iter()
            .map(|r| r.resources.peak_ram_mb)
            .max()
            .unwrap_or(0);

        SummaryMetrics {
            ttfr: calculate_percentiles(&mut ttfr_values),
            ttsi: calculate_percentiles(&mut ttsi_values),
            total: calculate_percentiles(&mut total_values),
            avg_cache_hit_rate,
            avg_candidates_embedded,
            avg_cpu_percent,
            peak_ram_mb,
        }
    }

    fn calculate_stage_breakdown(runs: &[SearchMetrics]) -> StageBreakdown {
        use super::metrics::calculate_percentiles;

        let mut directory_walk: Vec<u64> =
            runs.iter().map(|r| r.stages.directory_walk_ms).collect();
        let mut path_scoring: Vec<u64> = runs.iter().map(|r| r.stages.path_scoring_ms).collect();
        let mut ripgrep_scan: Vec<u64> = runs.iter().map(|r| r.stages.ripgrep_scan_ms).collect();
        let mut candidate_selection: Vec<u64> = runs
            .iter()
            .map(|r| r.stages.candidate_selection_ms)
            .collect();
        let mut embedding: Vec<u64> = runs.iter().map(|r| r.stages.embedding_ms).collect();
        let mut ranking: Vec<u64> = runs.iter().map(|r| r.stages.ranking_ms).collect();

        StageBreakdown {
            directory_walk: calculate_percentiles(&mut directory_walk),
            path_scoring: calculate_percentiles(&mut path_scoring),
            ripgrep_scan: calculate_percentiles(&mut ripgrep_scan),
            candidate_selection: calculate_percentiles(&mut candidate_selection),
            embedding: calculate_percentiles(&mut embedding),
            ranking: calculate_percentiles(&mut ranking),
        }
    }

    /// Export as markdown report
    pub fn to_markdown(&self) -> String {
        let mut md = String::new();

        md.push_str("# PERF_BASELINE.md\n\n");
        md.push_str(&format!("**Generated:** {}\n\n", self.generated_at));

        // Corpus stats
        md.push_str("## Corpus Statistics\n\n");
        md.push_str(&format!("| Metric | Value |\n"));
        md.push_str(&format!("|--------|-------|\n"));
        md.push_str(&format!("| Total Files | {} |\n", self.corpus.total_files));
        md.push_str(&format!(
            "| Total Size | {:.2} MB |\n",
            self.corpus.total_size_mb
        ));
        md.push_str(&format!(
            "| Avg File Size | {} bytes |\n",
            self.corpus.avg_file_size_bytes
        ));
        md.push_str("\n");

        // Summary
        md.push_str("## Summary Metrics\n\n");
        md.push_str("| Metric | P50 | P95 | P99 |\n");
        md.push_str("|--------|-----|-----|-----|\n");
        md.push_str(&format!(
            "| TTFR | {}ms | {}ms | {}ms |\n",
            self.summary.ttfr.p50_ms, self.summary.ttfr.p95_ms, self.summary.ttfr.p99_ms
        ));
        md.push_str(&format!(
            "| TTSI | {}ms | {}ms | {}ms |\n",
            self.summary.ttsi.p50_ms, self.summary.ttsi.p95_ms, self.summary.ttsi.p99_ms
        ));
        md.push_str(&format!(
            "| Total | {}ms | {}ms | {}ms |\n",
            self.summary.total.p50_ms, self.summary.total.p95_ms, self.summary.total.p99_ms
        ));
        md.push_str("\n");
        md.push_str(&format!(
            "- **Avg Cache Hit Rate:** {:.1}%\n",
            self.summary.avg_cache_hit_rate * 100.0
        ));
        md.push_str(&format!(
            "- **Avg Candidates Embedded:** {}\n\n",
            self.summary.avg_candidates_embedded
        ));
        md.push_str(&format!(
            "- **Avg CPU:** {:.1}%\n",
            self.summary.avg_cpu_percent
        ));
        md.push_str(&format!(
            "- **Peak RAM:** {} MB\n\n",
            self.summary.peak_ram_mb
        ));

        // Stage breakdown
        md.push_str("## Stage Breakdown (P95)\n\n");
        md.push_str("| Stage | Duration |\n");
        md.push_str("|-------|----------|\n");
        md.push_str(&format!(
            "| Directory Walk | {}ms |\n",
            self.stages.directory_walk.p95_ms
        ));
        md.push_str(&format!(
            "| Path Scoring | {}ms |\n",
            self.stages.path_scoring.p95_ms
        ));
        md.push_str(&format!(
            "| Ripgrep Scan | {}ms |\n",
            self.stages.ripgrep_scan.p95_ms
        ));
        md.push_str(&format!(
            "| Candidate Selection | {}ms |\n",
            self.stages.candidate_selection.p95_ms
        ));
        md.push_str(&format!(
            "| Embedding | {}ms |\n",
            self.stages.embedding.p95_ms
        ));
        md.push_str(&format!("| Ranking | {}ms |\n", self.stages.ranking.p95_ms));
        md.push_str("\n");

        // Exit criteria check
        md.push_str("## Exit Criteria\n\n");
        let ttfr_pass = self.summary.ttfr.p95_ms < 200;
        let embed_pass = self.summary.avg_candidates_embedded <= 1500;

        md.push_str(&format!(
            "- [{}] TTFR P95 < 200ms (actual: {}ms)\n",
            if ttfr_pass { "x" } else { " " },
            self.summary.ttfr.p95_ms
        ));
        md.push_str(&format!(
            "- [{}] Candidates Embedded <= 1500 (actual: {})\n",
            if embed_pass { "x" } else { " " },
            self.summary.avg_candidates_embedded
        ));

        md
    }

    /// Save report to file
    pub fn save_to_file(&self, path: &Path) -> std::io::Result<()> {
        let markdown = self.to_markdown();
        let mut file = std::fs::File::create(path)?;
        file.write_all(markdown.as_bytes())?;
        Ok(())
    }

    /// Export as JSON
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::instrumentation::metrics::{ResourceMetrics, StageMetrics};

    #[test]
    fn test_baseline_generation() {
        let runs = vec![SearchMetrics {
            ttfr_ms: 100,
            ttsi_ms: Some(500),
            total_ms: 1000,
            stages: StageMetrics {
                directory_walk_ms: 10,
                path_scoring_ms: 20,
                ripgrep_scan_ms: 50,
                candidate_selection_ms: 5,
                embedding_ms: 400,
                ranking_ms: 15,
                ipc_overhead_ms: 5,
            },
            resources: ResourceMetrics {
                peak_ram_mb: 100,
                io_read_mb: 50.0,
                cpu_percent: 75.0,
                cache_hit_rate: 0.8,
                files_scanned: 10000,
                candidates_generated: 2000,
                candidates_embedded: 1000,
            },
        }];

        let corpus = CorpusStats {
            total_files: 10000,
            total_size_mb: 500.0,
            file_types: vec![("txt".into(), 5000), ("md".into(), 3000)],
            avg_file_size_bytes: 51200,
        };

        let baseline = PerformanceBaseline::from_runs(runs, corpus);
        let markdown = baseline.to_markdown();

        assert!(markdown.contains("PERF_BASELINE.md"));
        assert!(markdown.contains("10000"));
    }
}
