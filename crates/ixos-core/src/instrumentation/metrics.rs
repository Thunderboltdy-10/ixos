//! Metrics types for performance measurement

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// Metrics collected for a single search operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMetrics {
    /// Time to first result (any result visible) in milliseconds
    pub ttfr_ms: u64,
    /// Time to first semantic result in milliseconds (None if no semantic phase)
    pub ttsi_ms: Option<u64>,
    /// Total search duration in milliseconds
    pub total_ms: u64,
    /// Breakdown by pipeline stage
    pub stages: StageMetrics,
    /// Resource usage metrics
    pub resources: ResourceMetrics,
}

/// Timing breakdown by pipeline stage
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StageMetrics {
    /// Directory walking/file discovery
    pub directory_walk_ms: u64,
    /// Path/filename index scoring (P2.1)
    pub path_scoring_ms: u64,
    /// Ripgrep content scanning (P2.2)
    pub ripgrep_scan_ms: u64,
    /// Candidate selection and capping
    pub candidate_selection_ms: u64,
    /// Embedding generation
    pub embedding_ms: u64,
    /// Score fusion and ranking
    pub ranking_ms: u64,
    /// IPC/result delivery overhead
    pub ipc_overhead_ms: u64,
}

/// Resource usage metrics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ResourceMetrics {
    /// Peak RAM usage in megabytes
    pub peak_ram_mb: u64,
    /// Total I/O read in megabytes
    pub io_read_mb: f64,
    /// Average CPU utilization (0.0 - 100.0)
    pub cpu_percent: f32,
    /// Embedding cache hit rate (0.0 - 1.0)
    pub cache_hit_rate: f32,
    /// Number of files scanned during discovery
    pub files_scanned: usize,
    /// Number of candidates generated (before cap)
    pub candidates_generated: usize,
    /// Number of candidates actually embedded
    pub candidates_embedded: usize,
}

/// Latency percentiles across multiple runs
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LatencyPercentiles {
    /// 50th percentile (median)
    pub p50_ms: u64,
    /// 95th percentile
    pub p95_ms: u64,
    /// 99th percentile
    pub p99_ms: u64,
}

/// Builder for collecting metrics during a search operation
#[derive(Debug)]
pub struct MetricsCollector {
    start_time: Instant,
    first_result_time: Option<Instant>,
    semantic_start_time: Option<Instant>,
    stages: StageMetrics,
    resources: ResourceMetrics,
}

impl MetricsCollector {
    /// Create a new metrics collector
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            first_result_time: None,
            semantic_start_time: None,
            stages: StageMetrics::default(),
            resources: ResourceMetrics::default(),
        }
    }

    /// Mark the time of the first result
    pub fn mark_first_result(&mut self) {
        if self.first_result_time.is_none() {
            self.first_result_time = Some(Instant::now());
        }
    }

    /// Mark the start of semantic phase
    pub fn mark_semantic_start(&mut self) {
        self.semantic_start_time = Some(Instant::now());
    }

    /// Record directory walk duration
    pub fn record_directory_walk(&mut self, duration: Duration) {
        self.stages.directory_walk_ms = duration.as_millis() as u64;
    }

    /// Record path scoring duration
    pub fn record_path_scoring(&mut self, duration: Duration) {
        self.stages.path_scoring_ms = duration.as_millis() as u64;
    }

    /// Record ripgrep scan duration
    pub fn record_ripgrep_scan(&mut self, duration: Duration) {
        self.stages.ripgrep_scan_ms = duration.as_millis() as u64;
    }

    /// Record candidate selection duration
    pub fn record_candidate_selection(&mut self, duration: Duration) {
        self.stages.candidate_selection_ms = duration.as_millis() as u64;
    }

    /// Record embedding duration
    pub fn record_embedding(&mut self, duration: Duration) {
        self.stages.embedding_ms = duration.as_millis() as u64;
    }

    /// Record ranking duration
    pub fn record_ranking(&mut self, duration: Duration) {
        self.stages.ranking_ms = duration.as_millis() as u64;
    }

    /// Record IPC overhead
    pub fn record_ipc_overhead(&mut self, duration: Duration) {
        self.stages.ipc_overhead_ms += duration.as_millis() as u64;
    }

    /// Update resource metrics
    pub fn update_resources(&mut self, resources: ResourceMetrics) {
        self.resources = resources;
    }

    /// Set files scanned count
    pub fn set_files_scanned(&mut self, count: usize) {
        self.resources.files_scanned = count;
    }

    /// Set candidates generated count
    pub fn set_candidates_generated(&mut self, count: usize) {
        self.resources.candidates_generated = count;
    }

    /// Set candidates embedded count
    pub fn set_candidates_embedded(&mut self, count: usize) {
        self.resources.candidates_embedded = count;
    }

    /// Set cache hit rate
    pub fn set_cache_hit_rate(&mut self, rate: f32) {
        self.resources.cache_hit_rate = rate;
    }

    /// Finalize and return the collected metrics
    pub fn finalize(self) -> SearchMetrics {
        let total_duration = self.start_time.elapsed();

        let ttfr_ms = self
            .first_result_time
            .map(|t| t.duration_since(self.start_time).as_millis() as u64)
            .unwrap_or(total_duration.as_millis() as u64);

        let ttsi_ms = self
            .semantic_start_time
            .map(|start| start.duration_since(self.start_time).as_millis() as u64);

        SearchMetrics {
            ttfr_ms,
            ttsi_ms,
            total_ms: total_duration.as_millis() as u64,
            stages: self.stages,
            resources: self.resources,
        }
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate percentiles from a list of durations
pub fn calculate_percentiles(durations: &mut [u64]) -> LatencyPercentiles {
    if durations.is_empty() {
        return LatencyPercentiles::default();
    }

    durations.sort_unstable();
    let len = durations.len();

    LatencyPercentiles {
        p50_ms: durations[len / 2],
        p95_ms: durations[(len as f64 * 0.95) as usize].min(durations[len - 1]),
        p99_ms: durations[(len as f64 * 0.99) as usize].min(durations[len - 1]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_collector() {
        let mut collector = MetricsCollector::new();

        collector.mark_first_result();
        collector.record_path_scoring(Duration::from_millis(10));
        collector.record_ripgrep_scan(Duration::from_millis(50));
        collector.set_candidates_generated(500);
        collector.set_candidates_embedded(100);

        let metrics = collector.finalize();

        assert_eq!(metrics.stages.path_scoring_ms, 10);
        assert_eq!(metrics.stages.ripgrep_scan_ms, 50);
        assert_eq!(metrics.resources.candidates_generated, 500);
        assert_eq!(metrics.resources.candidates_embedded, 100);
    }

    #[test]
    fn test_percentiles() {
        let mut durations = vec![100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
        let percentiles = calculate_percentiles(&mut durations);

        assert_eq!(percentiles.p50_ms, 600); // median
        assert!(percentiles.p95_ms >= 900);
        assert!(percentiles.p99_ms >= 900);
    }
}
