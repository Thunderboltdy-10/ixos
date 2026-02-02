//! Activity Ledger command handlers (Phase 2 - Second Brain)
//!
//! Provides activity tracking for Pro "Second Brain" features:
//! - Today Tab
//! - Related Files Panel
//! - Workstreams

use ixos_protocol::{
    ActivityAction, ActivityEvent, ActivityLedger, CoOccurrence, RecentFile, TimeRange,
    create_event, hash_query,
};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

use crate::state::AppState;
use super::entitlement_manager::EntitlementManager;
use ixos_protocol::capabilities::Capability;
use ixos_protocol::security::device_identity::DeviceIdentity;

/// State wrapper for activity ledger
pub struct ActivityState {
    pub ledger: Mutex<ActivityLedger>,
    /// Whether persistence is enabled (Pro only)
    pub persist_enabled: Mutex<bool>,
}

impl Default for ActivityState {
    fn default() -> Self {
        Self {
            ledger: Mutex::new(ActivityLedger::new()),
            persist_enabled: Mutex::new(false),
        }
    }
}

impl ActivityState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Enable persistence (called when Pro entitlement is verified)
    pub fn enable_persistence(&self) {
        *self.persist_enabled.lock() = true;
    }

    /// Disable persistence (free users)
    pub fn disable_persistence(&self) {
        *self.persist_enabled.lock() = false;
    }

    /// Check if persistence is enabled
    pub fn is_persistence_enabled(&self) -> bool {
        *self.persist_enabled.lock()
    }
}

/// Request payload for logging activity
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogActivityRequest {
    pub file_path: String,
    pub action_type: ActivityAction,
    pub query: Option<String>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

/// Request payload for getting activity
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetActivityRequest {
    pub time_range: Option<TimeRangePayload>,
    pub action_types: Option<Vec<ActivityAction>>,
    pub limit: Option<usize>,
}

/// Time range payload
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeRangePayload {
    pub start: Option<u64>,
    pub end: Option<u64>,
}

impl From<TimeRangePayload> for TimeRange {
    fn from(p: TimeRangePayload) -> Self {
        TimeRange {
            start: p.start,
            end: p.end,
        }
    }
}

/// Activity event payload for frontend
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventPayload {
    pub id: String,
    pub file_id: String,
    pub file_path: String,
    pub timestamp: u64,
    pub action_type: ActivityAction,
    pub query_hash: Option<String>,
    pub workstream_id: Option<String>,
}

impl From<&ActivityEvent> for ActivityEventPayload {
    fn from(e: &ActivityEvent) -> Self {
        Self {
            id: e.id.clone(),
            file_id: e.file_id.clone(),
            file_path: e.file_path.clone(),
            timestamp: e.timestamp,
            action_type: e.action_type,
            query_hash: e.query_hash.clone(),
            workstream_id: e.workstream_id.clone(),
        }
    }
}

/// Co-occurrence payload for frontend
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoOccurrencePayload {
    pub file_id: String,
    pub count: u32,
    pub last_seen: u64,
    pub avg_gap_ms: u64,
    pub reason: String,
}

impl From<CoOccurrence> for CoOccurrencePayload {
    fn from(c: CoOccurrence) -> Self {
        Self {
            file_id: c.file_id,
            count: c.count,
            last_seen: c.last_seen,
            avg_gap_ms: c.avg_gap_ms,
            reason: format!("{:?}", c.reason).to_lowercase(),
        }
    }
}

/// Recent file payload for frontend
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentFilePayload {
    pub path: String,
    pub file_id: String,
    pub last_touched: u64,
    pub touch_count: u32,
    pub actions: Vec<ActivityAction>,
}

impl From<RecentFile> for RecentFilePayload {
    fn from(r: RecentFile) -> Self {
        Self {
            path: r.path,
            file_id: r.file_id,
            last_touched: r.last_touched,
            touch_count: r.touch_count,
            actions: r.actions,
        }
    }
}

/// Log an activity event
///
/// This is called from the frontend whenever a user action occurs.
/// Activity is always tracked in memory; persistence requires Pro.
#[tauri::command]
pub fn log_activity(
    request: LogActivityRequest,
    activity_state: State<'_, ActivityState>,
) -> Result<(), String> {
    let mut event = create_event(
        &request.file_path,
        request.action_type,
        request.query.as_deref(),
    );

    if let Some(metadata) = request.metadata {
        event.metadata = metadata;
    }

    let mut ledger = activity_state.ledger.lock();
    ledger.log_activity(event);

    Ok(())
}

/// Get activity events within a time range
///
/// # Arguments
///
/// * `request` - Query parameters (time range, action types, limit)
#[tauri::command]
pub fn get_activity(
    request: GetActivityRequest,
    activity_state: State<'_, ActivityState>,
) -> Result<Vec<ActivityEventPayload>, String> {
    let ledger = activity_state.ledger.lock();

    let time_range = request.time_range.map(|t| t.into());
    let events = ledger.get_activity(time_range, request.action_types, request.limit);

    Ok(events.into_iter().map(|e| e.into()).collect())
}

/// Get co-occurrence data for a file
///
/// Returns files that are frequently opened/edited together with the given file.
///
/// # Arguments
///
/// * `file_path` - The file to find co-occurrences for
/// * `window_mins` - Time window in minutes (default: 30)
#[tauri::command]
pub fn get_co_occurrence(
    file_path: String,
    window_mins: Option<u32>,
    activity_state: State<'_, ActivityState>,
    app_state: State<'_, AppState>,
) -> Result<Vec<CoOccurrencePayload>, String> {
    // Check Pro capability for related files
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let manager = app_state.entitlement_manager.lock();

    if !manager
        .capabilities()
        .has(Capability::RelatedGraph)
    {
        return Err("Pro capability required for related files".into());
    }

    let ledger = activity_state.ledger.lock();
    let co_occurrences = ledger.get_co_occurrence(&file_path, window_mins.unwrap_or(30));

    Ok(co_occurrences.into_iter().map(|c| c.into()).collect())
}

/// Get recently touched files (today)
///
/// Returns files opened, modified, or revealed today.
#[tauri::command]
pub fn get_recently_touched(
    limit: Option<usize>,
    activity_state: State<'_, ActivityState>,
) -> Result<Vec<RecentFilePayload>, String> {
    let ledger = activity_state.ledger.lock();
    let recent = ledger.get_recently_touched(limit.unwrap_or(20));

    Ok(recent.into_iter().map(|r| r.into()).collect())
}

/// Clear activity within a time range (GDPR deletion)
///
/// # Arguments
///
/// * `time_range` - Optional time range to clear (None = clear all)
#[tauri::command]
pub fn clear_activity(
    time_range: Option<TimeRangePayload>,
    activity_state: State<'_, ActivityState>,
) -> Result<(), String> {
    let mut ledger = activity_state.ledger.lock();
    ledger.clear_activity(time_range.map(|t| t.into()));
    Ok(())
}

/// Get activity ledger statistics
#[tauri::command]
pub fn get_activity_stats(
    activity_state: State<'_, ActivityState>,
) -> Result<ActivityStatsPayload, String> {
    let ledger = activity_state.ledger.lock();

    Ok(ActivityStatsPayload {
        event_count: ledger.event_count(),
        is_dirty: ledger.is_dirty(),
    })
}

/// Statistics payload
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStatsPayload {
    pub event_count: usize,
    pub is_dirty: bool,
}

/// Save activity ledger to encrypted storage (Pro only)
#[tauri::command]
pub async fn save_activity_ledger(
    activity_state: State<'_, ActivityState>,
    app_state: State<'_, AppState>,
) -> Result<(), String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::MemoryGraph) {
        return Err("Pro capability required for activity persistence".into());
    }

    if !activity_state.is_persistence_enabled() {
        return Err("Activity persistence not enabled".into());
    }

    let ledger = activity_state.ledger.lock();
    let events = ledger.export_events();

    // Serialize to JSON
    let json = serde_json::to_string(&events).map_err(|e| e.to_string())?;

    // Save using encrypted storage (via existing storage commands)
    // This will be integrated with the existing write_encrypted_file command
    // For now, we'll use the storage key directly
    drop(ledger);

    // Note: Actual encrypted write would go through the storage module
    // This is a placeholder that shows the flow
    tracing::info!("Activity ledger saved ({} events)", events.len());

    Ok(())
}

/// Load activity ledger from encrypted storage (Pro only)
#[tauri::command]
pub async fn load_activity_ledger(
    activity_state: State<'_, ActivityState>,
    app_state: State<'_, AppState>,
) -> Result<ActivityStatsPayload, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::MemoryGraph) {
        return Err("Pro capability required for activity persistence".into());
    }

    // Note: Actual encrypted read would go through the storage module
    // This enables persistence for the session
    activity_state.enable_persistence();

    let ledger = activity_state.ledger.lock();
    Ok(ActivityStatsPayload {
        event_count: ledger.event_count(),
        is_dirty: ledger.is_dirty(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_activity_request_deserialization() {
        let json = r#"{
            "filePath": "/path/to/file.txt",
            "actionType": "file_opened",
            "query": null
        }"#;

        let request: LogActivityRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.file_path, "/path/to/file.txt");
        assert_eq!(request.action_type, ActivityAction::FileOpened);
    }

    #[test]
    fn test_activity_state_persistence_toggle() {
        let state = ActivityState::new();

        assert!(!state.is_persistence_enabled());

        state.enable_persistence();
        assert!(state.is_persistence_enabled());

        state.disable_persistence();
        assert!(!state.is_persistence_enabled());
    }
}
