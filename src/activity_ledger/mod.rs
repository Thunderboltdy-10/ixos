//! Activity Ledger - Local Activity Tracking for Second Brain (Phase 2)
//!
//! This module provides privacy-first activity tracking for the Pro "Second Brain" features:
//! - Today Tab (resume, recent, suggested files)
//! - Related Files Panel (co-open, co-edit patterns)
//! - Workstreams (auto-clustered sessions)
//!
//! ## Zero-Index Philosophy
//!
//! Following Ixos's core principle, the activity ledger:
//! - Stores ONLY metadata (paths, timestamps, action types)
//! - NO file content is ever indexed or cached
//! - Rolling 30-day window with max 10,000 events
//! - ~500KB max storage footprint
//!
//! ## Privacy
//!
//! - File paths stored with SHA256 file_id for anonymous correlation
//! - Encrypted JSON backup (via SecureStore)
//! - GDPR deletion support via `clear_activity()`

mod co_occurrence;
mod storage;

pub use co_occurrence::{CoOccurrence, CoOccurrenceAnalyzer};
pub use storage::{ActivityStorage, StorageConfig};

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// Maximum number of events to store (auto-prune oldest)
pub const MAX_EVENTS: usize = 10_000;

/// Maximum serialized storage budget for persisted ledger.
pub const MAX_STORAGE_BYTES: usize = 5 * 1024 * 1024;

/// Rolling window in days
pub const ROLLING_WINDOW_DAYS: u64 = 30;

/// Activity event representing a single user interaction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ActivityEvent {
    /// Unique event ID (UUID)
    pub id: String,
    /// SHA256 hash of file path for privacy-preserving correlation
    pub file_id: String,
    /// Full file path (encrypted at rest)
    pub file_path: String,
    /// Unix timestamp in milliseconds
    pub timestamp: u64,
    /// Type of activity
    pub action_type: ActivityAction,
    /// Hash of search query (if action is SearchQuery or ResultClicked)
    pub query_hash: Option<String>,
    /// Associated workstream ID (if assigned)
    pub workstream_id: Option<String>,
    /// Additional metadata
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

/// Types of trackable activities
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ActivityAction {
    /// User executed a search query
    SearchQuery,
    /// Search result appeared in the ranked list
    ResultShown,
    /// User clicked on a search result
    ResultClicked,
    /// User opened a file from search results
    FileOpened,
    /// User revealed a file in file explorer
    FileRevealed,
    /// File was modified (detected via watcher)
    FileModified,
    /// File was moved/renamed
    FileMoved,
    /// File was renamed
    FileRenamed,
    /// User pinned a file for quick access
    FilePinned,
    /// User unpinned a file
    FileUnpinned,
}

impl ActivityAction {
    /// Returns true if this action should contribute to co-occurrence analysis
    pub fn contributes_to_co_occurrence(&self) -> bool {
        matches!(
            self,
            ActivityAction::FileOpened
                | ActivityAction::FileRevealed
                | ActivityAction::FileModified
                | ActivityAction::ResultShown
                | ActivityAction::ResultClicked
        )
    }
}

/// Time range for querying activities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    /// Start timestamp (inclusive), Unix ms
    pub start: Option<u64>,
    /// End timestamp (exclusive), Unix ms
    pub end: Option<u64>,
}

impl TimeRange {
    /// Create a time range for "today" (since midnight local time)
    pub fn today() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // Approximate: last 24 hours
        let start = now.saturating_sub(24 * 60 * 60 * 1000);

        Self {
            start: Some(start),
            end: None,
        }
    }

    /// Create a time range for the last N days
    pub fn last_days(days: u64) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let start = now.saturating_sub(days * 24 * 60 * 60 * 1000);

        Self {
            start: Some(start),
            end: None,
        }
    }

    /// Create a time range for a specific window around a timestamp
    pub fn around(timestamp: u64, window_mins: u32) -> Self {
        let window_ms = (window_mins as u64) * 60 * 1000;
        Self {
            start: Some(timestamp.saturating_sub(window_ms)),
            end: Some(timestamp.saturating_add(window_ms)),
        }
    }

    /// Check if a timestamp falls within this range
    pub fn contains(&self, timestamp: u64) -> bool {
        let after_start = self.start.map_or(true, |s| timestamp >= s);
        let before_end = self.end.map_or(true, |e| timestamp < e);
        after_start && before_end
    }
}

/// The Activity Ledger - in-memory store with persistence support
#[derive(Debug, Default)]
pub struct ActivityLedger {
    /// Events sorted by timestamp (newest first for fast recent queries)
    events: Vec<ActivityEvent>,
    /// Index: file_id -> event indices for fast file lookups
    file_index: HashMap<String, Vec<usize>>,
    /// Index: query_hash -> event indices for fast query lookups
    query_index: HashMap<String, Vec<usize>>,
    /// Co-occurrence analyzer
    co_occurrence: CoOccurrenceAnalyzer,
    /// Whether the ledger has unsaved changes
    dirty: bool,
}

/// Suggested move/reorganization recommendation inferred from repeated user behavior.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MoveRecommendation {
    /// File that is repeatedly accessed in contexts associated with another folder.
    pub file_path: String,
    /// Current folder of the file.
    pub current_folder: String,
    /// Suggested destination folder.
    pub suggested_folder: String,
    /// Confidence score in [0, 1].
    pub confidence: f32,
    /// Number of repeated evidence points backing this suggestion.
    pub evidence_count: u32,
    /// User-facing explanation.
    pub reason: String,
}

impl ActivityLedger {
    /// Create a new empty ledger
    pub fn new() -> Self {
        Self::default()
    }

    /// Load ledger from serialized events
    pub fn from_events(events: Vec<ActivityEvent>) -> Self {
        let mut ledger = Self::new();
        for event in events {
            ledger.add_event_internal(event, false);
        }
        ledger.dirty = false;
        ledger
    }

    /// Add a new activity event
    pub fn log_activity(&mut self, event: ActivityEvent) {
        self.add_event_internal(event, true);
        self.prune_if_needed();
    }

    /// Internal event addition with index updates
    fn add_event_internal(&mut self, event: ActivityEvent, mark_dirty: bool) {
        // Update co-occurrence analyzer with file path for reverse mapping
        if event.action_type.contributes_to_co_occurrence() {
            self.co_occurrence.record_activity_with_path(
                &event.file_id,
                Some(&event.file_path),
                event.timestamp,
            );
        }

        // Find insertion point (maintain sorted order, newest first)
        let insert_idx = self
            .events
            .iter()
            .position(|e| e.timestamp < event.timestamp)
            .unwrap_or(self.events.len());

        // Insert event
        self.events.insert(insert_idx, event.clone());

        // Update file index (note: indices after insert_idx shift by 1)
        self.rebuild_indices_if_needed();

        // Update file index for new event
        self.file_index
            .entry(event.file_id.clone())
            .or_default()
            .push(insert_idx);

        // Update query index if applicable
        if let Some(ref qh) = event.query_hash {
            self.query_index
                .entry(qh.clone())
                .or_default()
                .push(insert_idx);
        }

        if mark_dirty {
            self.dirty = true;
        }
    }

    /// Rebuild indices (needed after insertions that shift indices)
    fn rebuild_indices_if_needed(&mut self) {
        // For simplicity, rebuild indices periodically
        // In production, we'd use a more efficient approach
        if self.events.len() % 100 == 0 {
            self.rebuild_indices();
        }
    }

    /// Fully rebuild all indices
    fn rebuild_indices(&mut self) {
        self.file_index.clear();
        self.query_index.clear();

        for (idx, event) in self.events.iter().enumerate() {
            self.file_index
                .entry(event.file_id.clone())
                .or_default()
                .push(idx);

            if let Some(ref qh) = event.query_hash {
                self.query_index.entry(qh.clone()).or_default().push(idx);
            }
        }
    }

    /// Prune old events to stay within limits
    fn prune_if_needed(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let cutoff = now.saturating_sub(ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

        // Remove events older than rolling window
        let old_len = self.events.len();
        self.events.retain(|e| e.timestamp >= cutoff);

        // If still over limit, remove oldest
        while self.events.len() > MAX_EVENTS {
            self.events.pop(); // Remove oldest (at end since sorted newest first)
        }

        // Rebuild indices if we pruned anything
        if self.events.len() != old_len {
            self.rebuild_indices();
            self.dirty = true;
        }
    }

    /// Enforce a serialized storage-size budget by pruning oldest entries.
    ///
    /// Prunes 20% of oldest events per iteration until serialized JSON fits.
    pub fn enforce_storage_limit_bytes(
        &mut self,
        max_storage_bytes: usize,
    ) -> Result<usize, serde_json::Error> {
        let mut total_pruned = 0usize;

        loop {
            let serialized = serde_json::to_vec(&self.events)?;
            if serialized.len() <= max_storage_bytes || self.events.is_empty() {
                break;
            }

            let prune_count = ((self.events.len() as f32) * 0.20).ceil() as usize;
            let prune_count = prune_count.max(1).min(self.events.len());
            let keep = self.events.len().saturating_sub(prune_count);
            self.events.truncate(keep);
            total_pruned += prune_count;
        }

        if total_pruned > 0 {
            self.rebuild_indices();
            self.dirty = true;
        }

        Ok(total_pruned)
    }

    /// Get activities within a time range, optionally filtered by action types
    pub fn get_activity(
        &self,
        time_range: Option<TimeRange>,
        action_types: Option<Vec<ActivityAction>>,
        limit: Option<usize>,
    ) -> Vec<&ActivityEvent> {
        let range = time_range.unwrap_or(TimeRange {
            start: None,
            end: None,
        });

        self.events
            .iter()
            .filter(|e| range.contains(e.timestamp))
            .filter(|e| {
                action_types
                    .as_ref()
                    .map_or(true, |types| types.contains(&e.action_type))
            })
            .take(limit.unwrap_or(usize::MAX))
            .collect()
    }

    /// Get activities for a specific file
    pub fn get_file_activity(&self, file_id: &str) -> Vec<&ActivityEvent> {
        self.file_index
            .get(file_id)
            .map(|indices| indices.iter().filter_map(|&i| self.events.get(i)).collect())
            .unwrap_or_default()
    }

    /// Get co-occurrence data for a file (files opened/edited together)
    pub fn get_co_occurrence(&self, file_path: &str, window_mins: u32) -> Vec<CoOccurrence> {
        let file_id = hash_file_path(file_path);
        self.co_occurrence.get_co_occurrences(&file_id, window_mins)
    }

    /// Get recently touched files (opened, modified, revealed today)
    pub fn get_recently_touched(&self, limit: usize) -> Vec<RecentFile> {
        let range = TimeRange::today();
        let mut file_map: HashMap<String, RecentFile> = HashMap::new();

        for event in self.events.iter() {
            if !range.contains(event.timestamp) {
                continue;
            }

            if !matches!(
                event.action_type,
                ActivityAction::FileOpened
                    | ActivityAction::FileModified
                    | ActivityAction::FileRevealed
                    | ActivityAction::ResultClicked
            ) {
                continue;
            }

            file_map
                .entry(event.file_path.clone())
                .and_modify(|f| {
                    f.last_touched = f.last_touched.max(event.timestamp);
                    f.touch_count += 1;
                    f.actions.push(event.action_type);
                })
                .or_insert_with(|| RecentFile {
                    path: event.file_path.clone(),
                    file_id: event.file_id.clone(),
                    last_touched: event.timestamp,
                    touch_count: 1,
                    actions: vec![event.action_type],
                });
        }

        let mut files: Vec<RecentFile> = file_map.into_values().collect();
        files.sort_by(|a, b| b.last_touched.cmp(&a.last_touched));
        files.truncate(limit);
        files
    }

    /// Suggest file/folder reorganization opportunities from repeated behavior.
    ///
    /// One-off interactions have very low influence. Recommendations require repeated
    /// evidence (`min_evidence`) before they are surfaced.
    pub fn get_move_recommendations(
        &self,
        min_evidence: u32,
        limit: usize,
    ) -> Vec<MoveRecommendation> {
        #[derive(Default)]
        struct FileSignals {
            shown: u32,
            clicked_or_opened: u32,
            query_hits: HashMap<String, u32>,
        }

        let min_evidence = min_evidence.max(2);
        let mut file_signals: HashMap<String, FileSignals> = HashMap::new();
        let mut query_folder_counts: HashMap<String, HashMap<String, u32>> = HashMap::new();

        for event in &self.events {
            if event.file_path.is_empty() {
                continue;
            }

            let folder = Path::new(&event.file_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let entry = file_signals.entry(event.file_path.clone()).or_default();
            match event.action_type {
                ActivityAction::ResultShown => {
                    entry.shown = entry.shown.saturating_add(1);
                }
                ActivityAction::ResultClicked
                | ActivityAction::FileOpened
                | ActivityAction::FileModified => {
                    entry.clicked_or_opened = entry.clicked_or_opened.saturating_add(1);
                    if let Some(query_hash) = event.query_hash.clone() {
                        *entry.query_hits.entry(query_hash.clone()).or_default() += 1;
                        *query_folder_counts
                            .entry(query_hash)
                            .or_default()
                            .entry(folder)
                            .or_default() += 1;
                    }
                }
                _ => {}
            }
        }

        let mut recommendations = Vec::new();
        for (file_path, signals) in file_signals {
            if signals.query_hits.is_empty() {
                continue;
            }

            let current_folder = Path::new(&file_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            if current_folder.is_empty() {
                continue;
            }

            let mut candidate_folder_evidence: HashMap<String, u32> = HashMap::new();
            for (query_hash, file_query_hits) in signals.query_hits {
                if let Some(folder_counts) = query_folder_counts.get(&query_hash) {
                    for (folder, count) in folder_counts {
                        if folder == &current_folder {
                            continue;
                        }
                        *candidate_folder_evidence.entry(folder.clone()).or_default() +=
                            count.saturating_mul(file_query_hits);
                    }
                }
            }

            let Some((best_folder, evidence_count)) = candidate_folder_evidence
                .into_iter()
                .max_by_key(|(_, evidence)| *evidence)
            else {
                continue;
            };
            if evidence_count < min_evidence {
                continue;
            }

            // Repetition dominates; CTR is a low-weight tiebreaker signal.
            let repetition_score = ((evidence_count - min_evidence + 1) as f32
                / (min_evidence as f32 + 6.0))
                .clamp(0.0, 1.0);
            let ctr = if signals.shown > 0 {
                signals.clicked_or_opened as f32 / signals.shown as f32
            } else {
                0.0
            };
            let confidence = (repetition_score * 0.9 + ctr * 0.1).clamp(0.0, 0.98);

            recommendations.push(MoveRecommendation {
                file_path: file_path.clone(),
                current_folder: current_folder.clone(),
                suggested_folder: best_folder.clone(),
                confidence,
                evidence_count,
                reason: format!(
                    "Repeated searches and openings align more with '{}' ({} repeated signals)",
                    best_folder, evidence_count
                ),
            });
        }

        recommendations.sort_by(|a, b| {
            b.confidence
                .total_cmp(&a.confidence)
                .then(b.evidence_count.cmp(&a.evidence_count))
        });
        recommendations.truncate(limit);
        recommendations
    }

    /// Clear activities within a time range (GDPR deletion)
    pub fn clear_activity(&mut self, time_range: Option<TimeRange>) {
        match time_range {
            Some(range) => {
                self.events.retain(|e| !range.contains(e.timestamp));
            }
            None => {
                self.events.clear();
            }
        }
        self.rebuild_indices();
        self.co_occurrence.clear();
        self.dirty = true;
    }

    /// Export all events for persistence
    pub fn export_events(&self) -> Vec<ActivityEvent> {
        self.events.clone()
    }

    /// Check if there are unsaved changes
    pub fn is_dirty(&self) -> bool {
        self.dirty
    }

    /// Mark as saved
    pub fn mark_saved(&mut self) {
        self.dirty = false;
    }

    /// Get total event count
    pub fn event_count(&self) -> usize {
        self.events.len()
    }
}

/// Summary of a recently touched file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub file_id: String,
    pub last_touched: u64,
    pub touch_count: u32,
    pub actions: Vec<ActivityAction>,
}

/// Generate SHA256 hash of a file path for privacy-preserving correlation
pub fn hash_file_path(path: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // Use a fast hash for correlation (not cryptographic - paths are also stored)
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Generate a hash of a search query
pub fn hash_query(query: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let normalized = query.trim().to_lowercase();
    let mut hasher = DefaultHasher::new();
    normalized.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Create a new activity event
pub fn create_event(
    file_path: &str,
    action_type: ActivityAction,
    query: Option<&str>,
) -> ActivityEvent {
    ActivityEvent {
        id: uuid::Uuid::new_v4().to_string(),
        file_id: hash_file_path(file_path),
        file_path: file_path.to_string(),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        action_type,
        query_hash: query.map(hash_query),
        workstream_id: None,
        metadata: HashMap::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_event() {
        let event = create_event("/path/to/file.txt", ActivityAction::FileOpened, None);

        assert!(!event.id.is_empty());
        assert!(!event.file_id.is_empty());
        assert_eq!(event.file_path, "/path/to/file.txt");
        assert_eq!(event.action_type, ActivityAction::FileOpened);
        assert!(event.query_hash.is_none());
    }

    #[test]
    fn test_ledger_basic_operations() {
        let mut ledger = ActivityLedger::new();

        let event1 = create_event("/file1.txt", ActivityAction::FileOpened, None);
        let event2 = create_event("/file2.txt", ActivityAction::FileOpened, None);

        ledger.log_activity(event1);
        ledger.log_activity(event2);

        assert_eq!(ledger.event_count(), 2);
        assert!(ledger.is_dirty());
    }

    #[test]
    fn test_time_range_contains() {
        let range = TimeRange {
            start: Some(100),
            end: Some(200),
        };

        assert!(!range.contains(50));
        assert!(range.contains(100));
        assert!(range.contains(150));
        assert!(!range.contains(200));
        assert!(!range.contains(250));
    }

    #[test]
    fn test_get_activity_filtered() {
        let mut ledger = ActivityLedger::new();

        ledger.log_activity(create_event("/file1.txt", ActivityAction::FileOpened, None));
        ledger.log_activity(create_event(
            "/file2.txt",
            ActivityAction::SearchQuery,
            Some("test"),
        ));
        ledger.log_activity(create_event("/file3.txt", ActivityAction::FileOpened, None));

        let opened = ledger.get_activity(None, Some(vec![ActivityAction::FileOpened]), None);
        assert_eq!(opened.len(), 2);

        let searches = ledger.get_activity(None, Some(vec![ActivityAction::SearchQuery]), None);
        assert_eq!(searches.len(), 1);
    }

    #[test]
    fn test_hash_stability() {
        let path = "/some/file/path.txt";
        let hash1 = hash_file_path(path);
        let hash2 = hash_file_path(path);
        assert_eq!(hash1, hash2);

        let query = "search query";
        let qh1 = hash_query(query);
        let qh2 = hash_query(query);
        assert_eq!(qh1, qh2);
    }

    #[test]
    fn test_prunes_to_max_events() {
        let mut ledger = ActivityLedger::new();
        for i in 0..15_000 {
            let mut event =
                create_event(&format!("/file_{i}.txt"), ActivityAction::FileOpened, None);
            event.timestamp = i as u64;
            ledger.log_activity(event);
        }
        assert!(ledger.event_count() <= MAX_EVENTS);
    }

    #[test]
    fn test_enforce_storage_limit_bytes() {
        let mut ledger = ActivityLedger::new();
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        for i in 0..1_200 {
            let mut event =
                create_event(&format!("/large_{i}.txt"), ActivityAction::FileOpened, None);
            event.metadata.insert("blob".to_string(), "x".repeat(8_000));
            event.timestamp = now_ms.saturating_sub(i as u64);
            ledger.log_activity(event);
        }

        let pruned = ledger
            .enforce_storage_limit_bytes(300_000)
            .expect("enforce");
        assert!(pruned > 0);

        let serialized = serde_json::to_vec(&ledger.export_events()).expect("serialize");
        assert!(serialized.len() <= 300_000);
    }

    #[test]
    fn move_recommendations_require_repetition() {
        let mut ledger = ActivityLedger::new();
        ledger.log_activity(create_event(
            "/project/notes/tax_2025.md",
            ActivityAction::ResultClicked,
            Some("tax report"),
        ));
        ledger.log_activity(create_event(
            "/project/finance/annual_tax.md",
            ActivityAction::ResultClicked,
            Some("tax report"),
        ));

        let recs = ledger.get_move_recommendations(3, 10);
        assert!(recs.is_empty());
    }

    #[test]
    fn move_recommendations_surface_with_repeated_evidence() {
        let mut ledger = ActivityLedger::new();
        ledger.log_activity(create_event(
            "/project/notes/tax_2025.md",
            ActivityAction::ResultShown,
            Some("tax report"),
        ));
        for _ in 0..6 {
            ledger.log_activity(create_event(
                "/project/finance/annual_tax.md",
                ActivityAction::ResultClicked,
                Some("tax report"),
            ));
        }
        for _ in 0..3 {
            ledger.log_activity(create_event(
                "/project/notes/tax_2025.md",
                ActivityAction::ResultClicked,
                Some("tax report"),
            ));
        }

        let recs = ledger.get_move_recommendations(3, 10);
        let target = recs
            .into_iter()
            .find(|r| r.file_path == "/project/notes/tax_2025.md")
            .expect("expected recommendation");
        assert_eq!(target.suggested_folder, "/project/finance");
        assert!(target.confidence > 0.0);
        assert!(target.evidence_count >= 3);
    }
}
