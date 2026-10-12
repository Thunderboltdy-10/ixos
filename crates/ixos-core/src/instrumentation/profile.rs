//! P9: Profile bundle exporter (timing-only diagnostics).

use super::metrics::{calculate_percentiles, LatencyPercentiles, SearchMetrics};
use super::reporter::CorpusStats;
use crate::optimization::SystemSpecs;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileRunConfig {
    pub cache_mode: String,
    pub model: String,
    pub query_count: usize,
    pub runs: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileBundle {
    pub generated_at: String,
    pub app_version: String,
    pub system: SystemSpecs,
    pub corpus: CorpusStats,
    pub summary: ProfileSummary,
    pub run_config: ProfileRunConfig,
    pub runs: Vec<SearchMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileSummary {
    pub ttfr: LatencyPercentiles,
    pub ttsi: LatencyPercentiles,
    pub total: LatencyPercentiles,
}

impl ProfileBundle {
    pub fn from_runs(
        runs: Vec<SearchMetrics>,
        corpus: CorpusStats,
        system: SystemSpecs,
        run_config: ProfileRunConfig,
    ) -> Self {
        let summary = summarize_runs(&runs);
        Self {
            generated_at: chrono::Utc::now().to_rfc3339(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            system,
            corpus,
            summary,
            run_config,
            runs,
        }
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    pub fn save_to_file(&self, path: &Path) -> Result<(), String> {
        let json = self.to_json().map_err(|e| e.to_string())?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(path, json).map_err(|e| e.to_string())
    }
}

fn summarize_runs(runs: &[SearchMetrics]) -> ProfileSummary {
    let mut ttfr_values: Vec<u64> = runs.iter().map(|r| r.ttfr_ms).collect();
    let mut ttsi_values: Vec<u64> = runs.iter().filter_map(|r| r.ttsi_ms).collect();
    let mut total_values: Vec<u64> = runs.iter().map(|r| r.total_ms).collect();

    ProfileSummary {
        ttfr: calculate_percentiles(&mut ttfr_values),
        ttsi: calculate_percentiles(&mut ttsi_values),
        total: calculate_percentiles(&mut total_values),
    }
}
