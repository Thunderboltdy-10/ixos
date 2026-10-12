//! Co-occurrence Analysis for Related Files
//!
//! Tracks which files are frequently opened/edited together within time windows.
//! This enables the "Related Files" panel to show co-open and co-edit suggestions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Time window in milliseconds (default: 30 minutes)
#[allow(dead_code)]
pub const DEFAULT_WINDOW_MS: u64 = 30 * 60 * 1000;

/// Represents a co-occurrence relationship between two files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoOccurrence {
    /// The other file that co-occurred with the query file
    pub file_id: String,
    /// The file path (resolved from file_id via reverse mapping)
    /// This is populated when returning results so UI can display
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    /// Number of times these files were accessed together
    pub count: u32,
    /// Most recent co-occurrence timestamp
    pub last_seen: u64,
    /// Average time gap between accesses (in ms)
    pub avg_gap_ms: u64,
    /// Reason for the co-occurrence
    pub reason: CoOccurrenceReason,
}

/// Reason why files co-occurred
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CoOccurrenceReason {
    /// Files were opened within the same time window
    CoOpen,
    /// Files were edited within the same session
    CoEdit,
    /// Files frequently appear together
    Frequent,
}

/// Activity record for a single file
#[derive(Debug, Clone)]
struct FileActivity {
    #[allow(dead_code)]
    file_id: String,
    timestamps: Vec<u64>,
}

impl FileActivity {
    fn new(file_id: String) -> Self {
        Self {
            file_id,
            timestamps: Vec::new(),
        }
    }

    fn add_timestamp(&mut self, ts: u64) {
        // Keep sorted, newest first
        let idx = self
            .timestamps
            .iter()
            .position(|&t| t < ts)
            .unwrap_or(self.timestamps.len());
        self.timestamps.insert(idx, ts);

        // Limit to last 1000 timestamps per file
        if self.timestamps.len() > 1000 {
            self.timestamps.pop();
        }
    }

    /// Get timestamps within a window around the given timestamp
    fn timestamps_in_window(&self, center_ts: u64, window_ms: u64) -> Vec<u64> {
        let start = center_ts.saturating_sub(window_ms);
        let end = center_ts.saturating_add(window_ms);

        self.timestamps
            .iter()
            .filter(|&&ts| ts >= start && ts <= end)
            .copied()
            .collect()
    }
}

/// Analyzes co-occurrence patterns between files
#[derive(Debug, Default)]
pub struct CoOccurrenceAnalyzer {
    /// Per-file activity records
    activities: HashMap<String, FileActivity>,
    /// Session timeline for temporal analysis
    session_timeline: Vec<(u64, String)>, // (timestamp, file_id)
    /// Reverse mapping from file_id to file_path for UI display
    file_id_to_path: HashMap<String, String>,
}

impl CoOccurrenceAnalyzer {
    /// Create a new analyzer
    pub fn new() -> Self {
        Self::default()
    }

    /// Record a file activity with file path for reverse mapping
    pub fn record_activity(&mut self, file_id: &str, timestamp: u64) {
        self.record_activity_with_path(file_id, None, timestamp);
    }

    /// Record a file activity with optional file path for reverse mapping
    pub fn record_activity_with_path(
        &mut self,
        file_id: &str,
        file_path: Option<&str>,
        timestamp: u64,
    ) {
        // Update file activity
        self.activities
            .entry(file_id.to_string())
            .or_insert_with(|| FileActivity::new(file_id.to_string()))
            .add_timestamp(timestamp);

        // Update file_id -> path mapping if path provided
        if let Some(path) = file_path {
            self.file_id_to_path
                .insert(file_id.to_string(), path.to_string());
        }

        // Update session timeline
        self.session_timeline.push((timestamp, file_id.to_string()));

        // Keep timeline bounded (last 5000 events)
        if self.session_timeline.len() > 5000 {
            self.session_timeline.remove(0);
        }

        // Keep timeline sorted
        self.session_timeline.sort_by(|a, b| b.0.cmp(&a.0));
    }

    /// Get file path for a file_id (if known)
    pub fn get_file_path(&self, file_id: &str) -> Option<&String> {
        self.file_id_to_path.get(file_id)
    }

    /// Get co-occurring files for a given file
    pub fn get_co_occurrences(&self, file_id: &str, window_mins: u32) -> Vec<CoOccurrence> {
        let window_ms = (window_mins as u64) * 60 * 1000;

        let Some(source_activity) = self.activities.get(file_id) else {
            return Vec::new();
        };

        // Count co-occurrences with each other file
        let mut co_counts: HashMap<String, CoOccurrenceStats> = HashMap::new();

        // For each timestamp of the source file
        for &source_ts in &source_activity.timestamps {
            // Find other files accessed within the window
            for (other_id, other_activity) in &self.activities {
                if other_id == file_id {
                    continue;
                }

                let other_timestamps = other_activity.timestamps_in_window(source_ts, window_ms);

                for &other_ts in &other_timestamps {
                    let gap = if other_ts > source_ts {
                        other_ts - source_ts
                    } else {
                        source_ts - other_ts
                    };

                    co_counts
                        .entry(other_id.clone())
                        .or_insert_with(|| CoOccurrenceStats::new(other_id.clone()))
                        .record(source_ts.max(other_ts), gap);
                }
            }
        }

        // Convert to CoOccurrence structs and sort by count
        let mut results: Vec<CoOccurrence> = co_counts
            .into_values()
            .filter(|stats| stats.count > 0)
            .map(|stats| {
                let avg_gap = stats.avg_gap_ms();
                let file_path = self.file_id_to_path.get(&stats.file_id).cloned();
                CoOccurrence {
                    file_id: stats.file_id,
                    file_path,
                    count: stats.count,
                    last_seen: stats.last_seen,
                    avg_gap_ms: avg_gap,
                    reason: if avg_gap < 5 * 60 * 1000 {
                        CoOccurrenceReason::CoEdit // Very close together
                    } else {
                        CoOccurrenceReason::CoOpen
                    },
                }
            })
            .collect();

        results.sort_by(|a, b| b.count.cmp(&a.count));
        results.truncate(10); // Top 10 co-occurrences
        results
    }

    /// Clear all data
    pub fn clear(&mut self) {
        self.activities.clear();
        self.session_timeline.clear();
        self.file_id_to_path.clear();
    }

    /// Get total tracked files
    pub fn tracked_files(&self) -> usize {
        self.activities.len()
    }
}

/// Statistics for a single co-occurrence relationship
#[derive(Debug)]
struct CoOccurrenceStats {
    file_id: String,
    count: u32,
    last_seen: u64,
    total_gap_ms: u64,
}

impl CoOccurrenceStats {
    fn new(file_id: String) -> Self {
        Self {
            file_id,
            count: 0,
            last_seen: 0,
            total_gap_ms: 0,
        }
    }

    fn record(&mut self, timestamp: u64, gap_ms: u64) {
        self.count += 1;
        self.last_seen = self.last_seen.max(timestamp);
        self.total_gap_ms += gap_ms;
    }

    fn avg_gap_ms(&self) -> u64 {
        if self.count > 0 {
            self.total_gap_ms / self.count as u64
        } else {
            0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_co_occurrence_tracking() {
        let mut analyzer = CoOccurrenceAnalyzer::new();

        // Simulate opening file A and B close together
        let base_time = 1000000u64;
        analyzer.record_activity("file_a", base_time);
        analyzer.record_activity("file_b", base_time + 60_000); // 1 minute later
        analyzer.record_activity("file_a", base_time + 120_000); // 2 minutes later
        analyzer.record_activity("file_b", base_time + 180_000); // 3 minutes later

        let co_occur = analyzer.get_co_occurrences("file_a", 30);

        assert!(!co_occur.is_empty());
        assert_eq!(co_occur[0].file_id, "file_b");
        assert!(co_occur[0].count >= 2);
    }

    #[test]
    fn test_no_self_co_occurrence() {
        let mut analyzer = CoOccurrenceAnalyzer::new();

        analyzer.record_activity("file_a", 1000);
        analyzer.record_activity("file_a", 2000);
        analyzer.record_activity("file_a", 3000);

        let co_occur = analyzer.get_co_occurrences("file_a", 30);

        // Should not include self
        assert!(co_occur.iter().all(|c| c.file_id != "file_a"));
    }

    #[test]
    fn test_window_filtering() {
        let mut analyzer = CoOccurrenceAnalyzer::new();

        let base_time = 1000000u64;
        analyzer.record_activity("file_a", base_time);
        analyzer.record_activity("file_b", base_time + 60 * 60 * 1000); // 1 hour later

        // With 30 min window, should not co-occur
        let co_occur_30 = analyzer.get_co_occurrences("file_a", 30);
        assert!(co_occur_30.iter().all(|c| c.file_id != "file_b"));

        // With 90 min window, should co-occur
        let co_occur_90 = analyzer.get_co_occurrences("file_a", 90);
        assert!(co_occur_90.iter().any(|c| c.file_id == "file_b"));
    }
}
