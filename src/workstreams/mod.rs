//! Workstreams - Auto-Clustered Sessions (Phase 2)
//!
//! Workstreams are automatically detected sessions based on user activity patterns.
//! They help users understand their work patterns and quickly resume previous contexts.
//!
//! ## Auto-Clustering Algorithm
//!
//! Sessions are clustered by detecting time gaps in activity:
//! 1. Sort all activity events by timestamp
//! 2. Split into sessions where gap > threshold (default: 30 minutes)
//! 3. For each session, extract top folders/files/queries
//! 4. Generate descriptive name from dominant patterns
//!
//! ## Storage
//!
//! - Encrypted JSON in SecureStore
//! - Only stores aggregated metadata (not full events)
//! - ~1KB per workstream

mod storage;

pub use storage::{
    MemoryWorkstreamStorage, WorkstreamStorage, WorkstreamStorageConfig, WorkstreamStorageData,
    WorkstreamStorageError,
};

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

use crate::activity_ledger::ActivityEvent;

/// Default gap threshold for session detection (30 minutes)
pub const DEFAULT_GAP_THRESHOLD_MINS: u32 = 30;

/// Maximum workstreams to keep
pub const MAX_WORKSTREAMS: usize = 100;

/// A workstream represents an auto-detected or manually created work session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workstream {
    /// Unique identifier (UUID)
    pub id: String,
    /// Display name (auto-generated or user-provided)
    pub name: String,
    /// Creation timestamp (Unix ms)
    pub created_at: u64,
    /// Last activity timestamp (Unix ms)
    pub last_active: u64,
    /// Top folders accessed (folder path, access count)
    pub top_folders: Vec<(String, u32)>,
    /// Top files accessed (file path, access count)
    pub top_files: Vec<(String, u32)>,
    /// Top queries used (query hash, count)
    pub top_queries: Vec<(String, u32)>,
    /// IDs of events in this workstream
    pub event_ids: Vec<String>,
    /// Whether this was auto-clustered or manually created
    pub is_auto: bool,
    /// User-provided description (optional)
    pub description: Option<String>,
    /// Whether this workstream is pinned
    pub is_pinned: bool,
}

impl Workstream {
    /// Create a new empty workstream
    pub fn new(name: String) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            created_at: now,
            last_active: now,
            top_folders: Vec::new(),
            top_files: Vec::new(),
            top_queries: Vec::new(),
            event_ids: Vec::new(),
            is_auto: false,
            description: None,
            is_pinned: false,
        }
    }

    /// Create from a set of activity events
    pub fn from_events(events: &[&ActivityEvent], auto_name: bool) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // Calculate timestamps
        let created_at = events.iter().map(|e| e.timestamp).min().unwrap_or(now);
        let last_active = events.iter().map(|e| e.timestamp).max().unwrap_or(now);

        // Count folders
        let mut folder_counts: HashMap<String, u32> = HashMap::new();
        for event in events {
            if let Some(parent) = Path::new(&event.file_path).parent() {
                let folder = parent.to_string_lossy().to_string();
                *folder_counts.entry(folder).or_default() += 1;
            }
        }
        let mut top_folders: Vec<_> = folder_counts.into_iter().collect();
        top_folders.sort_by(|a, b| b.1.cmp(&a.1));
        top_folders.truncate(5);

        // Count files
        let mut file_counts: HashMap<String, u32> = HashMap::new();
        for event in events {
            if !event.file_path.is_empty() {
                *file_counts.entry(event.file_path.clone()).or_default() += 1;
            }
        }
        let mut top_files: Vec<_> = file_counts.into_iter().collect();
        top_files.sort_by(|a, b| b.1.cmp(&a.1));
        top_files.truncate(10);

        // Count queries
        let mut query_counts: HashMap<String, u32> = HashMap::new();
        for event in events {
            if let Some(ref qh) = event.query_hash {
                *query_counts.entry(qh.clone()).or_default() += 1;
            }
        }
        let mut top_queries: Vec<_> = query_counts.into_iter().collect();
        top_queries.sort_by(|a, b| b.1.cmp(&a.1));
        top_queries.truncate(5);

        // Auto-generate name
        let name = if auto_name {
            generate_workstream_name(&top_folders, &top_files, created_at)
        } else {
            "Untitled Workstream".to_string()
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            created_at,
            last_active,
            top_folders,
            top_files,
            top_queries,
            event_ids: events.iter().map(|e| e.id.clone()).collect(),
            is_auto: true,
            description: None,
            is_pinned: false,
        }
    }

    /// Get the duration of this workstream in milliseconds
    pub fn duration_ms(&self) -> u64 {
        self.last_active.saturating_sub(self.created_at)
    }

    /// Get total event count
    pub fn event_count(&self) -> usize {
        self.event_ids.len()
    }
}

/// Generate an automatic name for a workstream based on its content
fn generate_workstream_name(
    top_folders: &[(String, u32)],
    top_files: &[(String, u32)],
    timestamp: u64,
) -> String {
    // Try to use the most common folder name
    if let Some((folder, _)) = top_folders.first() {
        if let Some(name) = Path::new(folder).file_name() {
            let folder_name = name.to_string_lossy();
            if !folder_name.is_empty() && folder_name != "." {
                return format_with_date(&folder_name, timestamp);
            }
        }
    }

    // Fall back to most common file name
    if let Some((file, _)) = top_files.first() {
        if let Some(name) = Path::new(file).file_name() {
            let file_name = name.to_string_lossy();
            return format_with_date(&file_name, timestamp);
        }
    }

    // Ultimate fallback: just the date
    format_date_only(timestamp)
}

fn format_with_date(prefix: &str, timestamp: u64) -> String {
    let date = format_timestamp(timestamp);
    format!("{} - {}", prefix, date)
}

fn format_date_only(timestamp: u64) -> String {
    format!("Session {}", format_timestamp(timestamp))
}

fn format_timestamp(timestamp: u64) -> String {
    // Simple date formatting without external deps
    let secs = timestamp / 1000;
    let days = secs / 86400;

    // Calculate date from Unix epoch (1970-01-01)
    // This is approximate but good enough for display
    let years = days / 365;
    let year = 1970 + years;
    let remaining_days = days % 365;
    let month = remaining_days / 30 + 1;
    let day = remaining_days % 30 + 1;

    format!("{:04}-{:02}-{:02}", year, month.min(12), day.min(31))
}

/// Auto-cluster activity events into workstreams based on time gaps
pub fn auto_cluster_sessions(events: &[ActivityEvent], gap_threshold_mins: u32) -> Vec<Workstream> {
    if events.is_empty() {
        return Vec::new();
    }

    // Sort events by timestamp
    let mut sorted_events: Vec<&ActivityEvent> = events.iter().collect();
    sorted_events.sort_by_key(|e| e.timestamp);

    let gap_threshold_ms = (gap_threshold_mins as u64) * 60 * 1000;

    // Split into sessions
    let mut sessions: Vec<Vec<&ActivityEvent>> = Vec::new();
    let mut current_session: Vec<&ActivityEvent> = vec![sorted_events[0]];

    for event in sorted_events.iter().skip(1) {
        let last_timestamp = current_session.last().map(|e| e.timestamp).unwrap_or(0);
        let gap = event.timestamp.saturating_sub(last_timestamp);

        if gap > gap_threshold_ms {
            // Start new session
            if !current_session.is_empty() {
                sessions.push(std::mem::take(&mut current_session));
            }
        }
        current_session.push(event);
    }

    // Don't forget the last session
    if !current_session.is_empty() {
        sessions.push(current_session);
    }

    // Convert sessions to workstreams
    sessions
        .into_iter()
        .filter(|s| s.len() >= 2) // Require at least 2 events
        .map(|s| Workstream::from_events(&s, true))
        .collect()
}

/// Manages workstreams (CRUD operations, persistence)
#[derive(Debug, Default)]
pub struct WorkstreamManager {
    workstreams: Vec<Workstream>,
    dirty: bool,
}

impl WorkstreamManager {
    /// Create a new empty manager
    pub fn new() -> Self {
        Self::default()
    }

    /// Load from existing workstreams
    pub fn from_workstreams(workstreams: Vec<Workstream>) -> Self {
        Self {
            workstreams,
            dirty: false,
        }
    }

    /// Add a new workstream
    pub fn add(&mut self, workstream: Workstream) {
        self.workstreams.push(workstream);
        self.prune_if_needed();
        self.dirty = true;
    }

    /// Get all workstreams (sorted by last_active, most recent first)
    pub fn list(&self, limit: Option<usize>, offset: Option<usize>) -> Vec<&Workstream> {
        let mut sorted: Vec<_> = self.workstreams.iter().collect();
        sorted.sort_by(|a, b| b.last_active.cmp(&a.last_active));

        sorted
            .into_iter()
            .skip(offset.unwrap_or(0))
            .take(limit.unwrap_or(usize::MAX))
            .collect()
    }

    /// Get a specific workstream by ID
    pub fn get(&self, id: &str) -> Option<&Workstream> {
        self.workstreams.iter().find(|w| w.id == id)
    }

    /// Get a mutable reference to a workstream
    pub fn get_mut(&mut self, id: &str) -> Option<&mut Workstream> {
        self.dirty = true;
        self.workstreams.iter_mut().find(|w| w.id == id)
    }

    /// Rename a workstream
    pub fn rename(&mut self, id: &str, new_name: String) -> bool {
        if let Some(ws) = self.get_mut(id) {
            ws.name = new_name;
            ws.is_auto = false; // User has customized it
            true
        } else {
            false
        }
    }

    /// Delete a workstream
    pub fn delete(&mut self, id: &str) -> bool {
        let len_before = self.workstreams.len();
        self.workstreams.retain(|w| w.id != id);
        let deleted = self.workstreams.len() < len_before;
        if deleted {
            self.dirty = true;
        }
        deleted
    }

    /// Merge multiple workstreams into one
    pub fn merge(&mut self, ids: &[String]) -> Option<String> {
        if ids.len() < 2 {
            return None;
        }

        // Collect all events from workstreams to merge
        let mut all_event_ids: Vec<String> = Vec::new();
        let mut merged_name = String::new();
        let mut earliest_created = u64::MAX;
        let mut latest_active = 0u64;

        for id in ids {
            if let Some(ws) = self.get(id) {
                all_event_ids.extend(ws.event_ids.clone());
                if merged_name.is_empty() {
                    merged_name = ws.name.clone();
                }
                earliest_created = earliest_created.min(ws.created_at);
                latest_active = latest_active.max(ws.last_active);
            }
        }

        if all_event_ids.is_empty() {
            return None;
        }

        // Remove old workstreams
        self.workstreams.retain(|w| !ids.contains(&w.id));

        // Create merged workstream
        let mut merged = Workstream::new(format!("{} (merged)", merged_name));
        merged.event_ids = all_event_ids;
        merged.created_at = earliest_created;
        merged.last_active = latest_active;
        merged.is_auto = false;

        let merged_id = merged.id.clone();
        self.workstreams.push(merged);
        self.dirty = true;

        Some(merged_id)
    }

    /// Re-cluster workstreams from activity events
    pub fn recluster(&mut self, events: &[ActivityEvent], gap_threshold_mins: u32) {
        // Keep pinned workstreams
        let pinned: Vec<_> = self
            .workstreams
            .iter()
            .filter(|w| w.is_pinned)
            .cloned()
            .collect();

        // Generate new clusters
        let mut new_workstreams = auto_cluster_sessions(events, gap_threshold_mins);

        // Re-add pinned
        new_workstreams.extend(pinned);

        self.workstreams = new_workstreams;
        self.prune_if_needed();
        self.dirty = true;
    }

    /// Get the most recent active workstream
    pub fn get_most_recent(&self) -> Option<&Workstream> {
        self.workstreams.iter().max_by_key(|w| w.last_active)
    }

    /// Prune to stay within limits
    fn prune_if_needed(&mut self) {
        while self.workstreams.len() > MAX_WORKSTREAMS {
            // Remove oldest non-pinned workstream
            if let Some(idx) = self
                .workstreams
                .iter()
                .enumerate()
                .filter(|(_, w)| !w.is_pinned)
                .min_by_key(|(_, w)| w.last_active)
                .map(|(i, _)| i)
            {
                self.workstreams.remove(idx);
            } else {
                break; // All pinned, can't prune more
            }
        }
    }

    /// Export for persistence
    pub fn export(&self) -> Vec<Workstream> {
        self.workstreams.clone()
    }

    /// Check if dirty
    pub fn is_dirty(&self) -> bool {
        self.dirty
    }

    /// Mark as saved
    pub fn mark_saved(&mut self) {
        self.dirty = false;
    }

    /// Get total count
    pub fn count(&self) -> usize {
        self.workstreams.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::activity_ledger::{create_event, ActivityAction};

    fn create_test_event(path: &str, timestamp: u64) -> ActivityEvent {
        let mut event = create_event(path, ActivityAction::FileOpened, None);
        event.timestamp = timestamp;
        event
    }

    #[test]
    fn test_auto_cluster_basic() {
        let base = 1000000u64;

        let events = vec![
            create_test_event("/project/file1.txt", base),
            create_test_event("/project/file2.txt", base + 5 * 60 * 1000), // 5 min later
            create_test_event("/project/file3.txt", base + 10 * 60 * 1000), // 10 min later
            // Gap of 1 hour
            create_test_event("/other/file4.txt", base + 70 * 60 * 1000), // 70 min later
            create_test_event("/other/file5.txt", base + 75 * 60 * 1000), // 75 min later
        ];

        let workstreams = auto_cluster_sessions(&events, 30);

        assert_eq!(workstreams.len(), 2);
        assert_eq!(workstreams[0].event_count(), 3);
        assert_eq!(workstreams[1].event_count(), 2);
    }

    #[test]
    fn test_workstream_manager_crud() {
        let mut manager = WorkstreamManager::new();

        let ws1 = Workstream::new("Workstream 1".to_string());
        let ws1_id = ws1.id.clone();
        manager.add(ws1);

        let ws2 = Workstream::new("Workstream 2".to_string());
        manager.add(ws2);

        assert_eq!(manager.count(), 2);

        // Get
        let ws = manager.get(&ws1_id);
        assert!(ws.is_some());
        assert_eq!(ws.unwrap().name, "Workstream 1");

        // Rename
        assert!(manager.rename(&ws1_id, "Renamed".to_string()));
        assert_eq!(manager.get(&ws1_id).unwrap().name, "Renamed");

        // Delete
        assert!(manager.delete(&ws1_id));
        assert_eq!(manager.count(), 1);
        assert!(manager.get(&ws1_id).is_none());
    }

    #[test]
    fn test_workstream_from_events() {
        let events = vec![
            create_test_event("/project/src/main.rs", 1000),
            create_test_event("/project/src/lib.rs", 2000),
            create_test_event("/project/Cargo.toml", 3000),
        ];

        let refs: Vec<_> = events.iter().collect();
        let ws = Workstream::from_events(&refs, true);

        assert!(ws.is_auto);
        assert_eq!(ws.event_count(), 3);
        assert!(!ws.top_folders.is_empty());
        assert!(!ws.top_files.is_empty());
    }

    #[test]
    fn test_merge_workstreams() {
        let mut manager = WorkstreamManager::new();

        let mut ws1 = Workstream::new("Workstream 1".to_string());
        ws1.event_ids = vec!["e1".into(), "e2".into()];
        let ws1_id = ws1.id.clone();
        manager.add(ws1);

        let mut ws2 = Workstream::new("Workstream 2".to_string());
        ws2.event_ids = vec!["e3".into(), "e4".into()];
        let ws2_id = ws2.id.clone();
        manager.add(ws2);

        let merged_id = manager.merge(&[ws1_id.clone(), ws2_id.clone()]);
        assert!(merged_id.is_some());

        let merged = manager.get(&merged_id.unwrap()).unwrap();
        assert_eq!(merged.event_ids.len(), 4);

        // Old workstreams should be gone
        assert!(manager.get(&ws1_id).is_none());
        assert!(manager.get(&ws2_id).is_none());
    }
}
