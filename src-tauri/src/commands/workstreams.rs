//! Workstreams command handlers (Phase 2 - Second Brain)
//!
//! Provides workstream management for Pro "Second Brain" features:
//! - Auto-clustered work sessions
//! - Manual workstream creation
//! - Merge, rename, delete operations
//! - Persistence via encrypted storage

use ixos_protocol::{Workstream, WorkstreamManager, WorkstreamStorageData};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

use super::activity::ActivityState;
use crate::state::AppState;
use ixos_protocol::capabilities::Capability;
use ixos_protocol::security::device_identity::DeviceIdentity;

use chacha20poly1305::aead::{rand_core::RngCore, Aead, KeyInit, OsRng};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use std::fs;
use std::path::PathBuf;

const WORKSTREAMS_FILE_ENC: &str = "workstreams_v1.enc";
const WORKSTREAMS_FILE_JSON_LEGACY: &str = "workstreams_v1.json";
const WORKSTREAMS_KEY_CONTEXT: &str = "workstreams-v1";

fn get_config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))
}

fn encrypt_payload(plaintext: &[u8], key_bytes: [u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&key_bytes));
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let mut out = nonce_bytes.to_vec();
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

fn decrypt_payload(blob: &[u8], key_bytes: [u8; 32]) -> Result<Vec<u8>, String> {
    if blob.len() < 12 {
        return Err("Encrypted payload too short".to_string());
    }
    let (nonce_bytes, ciphertext) = blob.split_at(12);
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&key_bytes));
    cipher
        .decrypt(Nonce::from_slice(nonce_bytes), ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))
}

fn persist_workstreams_to_disk(
    app: &tauri::AppHandle,
    workstreams_state: &WorkstreamsState,
) -> Result<(), String> {
    if !workstreams_state.is_persistence_enabled() {
        return Ok(());
    }

    let ws_manager = workstreams_state.manager.lock();
    let workstreams = ws_manager.export();
    let storage_data = WorkstreamStorageData::new(workstreams);
    let json = serde_json::to_vec(&storage_data).map_err(|e| e.to_string())?;
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let key = device.derive_storage_key(WORKSTREAMS_KEY_CONTEXT);
    let encrypted = encrypt_payload(&json, key)?;
    let count = ws_manager.count();
    drop(ws_manager);

    let config_dir = get_config_dir(app)?;
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    let storage_path = config_dir.join(WORKSTREAMS_FILE_ENC);
    fs::write(&storage_path, encrypted)
        .map_err(|e| format!("Failed to save workstreams: {}", e))?;

    let mut ws_manager = workstreams_state.manager.lock();
    ws_manager.mark_saved();
    drop(ws_manager);

    tracing::info!(
        "Workstreams saved ({} workstreams) to {:?}",
        count,
        storage_path
    );
    Ok(())
}

/// State wrapper for workstreams
pub struct WorkstreamsState {
    pub manager: Mutex<WorkstreamManager>,
    /// Whether persistence is enabled (Pro only)
    pub persist_enabled: Mutex<bool>,
}

impl Default for WorkstreamsState {
    fn default() -> Self {
        Self {
            manager: Mutex::new(WorkstreamManager::new()),
            persist_enabled: Mutex::new(false),
        }
    }
}

impl WorkstreamsState {
    /// Enable persistence (called when Pro entitlement is verified)
    pub fn enable_persistence(&self) {
        *self.persist_enabled.lock() = true;
    }

    /// Disable persistence (free users)
    #[allow(dead_code)]
    pub fn disable_persistence(&self) {
        *self.persist_enabled.lock() = false;
    }

    /// Check if persistence is enabled
    pub fn is_persistence_enabled(&self) -> bool {
        *self.persist_enabled.lock()
    }
}

/// Workstream payload for frontend
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkstreamPayload {
    pub id: String,
    pub name: String,
    pub created_at: u64,
    pub last_active: u64,
    pub top_folders: Vec<(String, u32)>,
    pub top_files: Vec<(String, u32)>,
    pub top_queries: Vec<(String, u32)>,
    pub event_count: usize,
    pub is_auto: bool,
    pub description: Option<String>,
    pub is_pinned: bool,
    pub duration_ms: u64,
}

impl From<&Workstream> for WorkstreamPayload {
    fn from(w: &Workstream) -> Self {
        Self {
            id: w.id.clone(),
            name: w.name.clone(),
            created_at: w.created_at,
            last_active: w.last_active,
            top_folders: w.top_folders.clone(),
            top_files: w.top_files.clone(),
            top_queries: w.top_queries.clone(),
            event_count: w.event_count(),
            is_auto: w.is_auto,
            description: w.description.clone(),
            is_pinned: w.is_pinned,
            duration_ms: w.duration_ms(),
        }
    }
}

/// List all workstreams
///
/// # Arguments
///
/// * `limit` - Maximum number to return
/// * `offset` - Number to skip (for pagination)
#[tauri::command]
pub fn list_workstreams(
    limit: Option<usize>,
    offset: Option<usize>,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<Vec<WorkstreamPayload>, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let ws_manager = workstreams_state.manager.lock();
    let workstreams = ws_manager.list(limit, offset);

    Ok(workstreams.into_iter().map(|w| w.into()).collect())
}

/// Get a specific workstream by ID
#[tauri::command]
pub fn get_workstream(
    id: String,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<WorkstreamPayload, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let ws_manager = workstreams_state.manager.lock();

    ws_manager
        .get(&id)
        .map(|w| w.into())
        .ok_or_else(|| "Workstream not found".to_string())
}

/// Request payload for creating a workstream
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkstreamRequest {
    pub name: String,
    pub description: Option<String>,
    pub event_ids: Option<Vec<String>>,
}

/// Create a new workstream manually
#[tauri::command]
pub fn create_workstream(
    app: tauri::AppHandle,
    request: CreateWorkstreamRequest,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<WorkstreamPayload, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let mut workstream = Workstream::new(request.name);
    workstream.description = request.description;
    workstream.is_auto = false;

    if let Some(event_ids) = request.event_ids {
        workstream.event_ids = event_ids;
    }

    let payload: WorkstreamPayload = (&workstream).into();

    let mut ws_manager = workstreams_state.manager.lock();
    ws_manager.add(workstream);
    drop(ws_manager);

    if !app_state.is_journalist_mode() {
        let _ = persist_workstreams_to_disk(&app, &workstreams_state);
    }

    Ok(payload)
}

/// Rename a workstream
#[tauri::command]
pub fn rename_workstream(
    app: tauri::AppHandle,
    id: String,
    new_name: String,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let mut ws_manager = workstreams_state.manager.lock();
    let renamed = ws_manager.rename(&id, new_name);
    drop(ws_manager);

    if renamed && !app_state.is_journalist_mode() {
        let _ = persist_workstreams_to_disk(&app, &workstreams_state);
    }

    Ok(renamed)
}

/// Merge multiple workstreams into one
#[tauri::command]
pub fn merge_workstreams(
    app: tauri::AppHandle,
    ids: Vec<String>,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let mut ws_manager = workstreams_state.manager.lock();
    let merged = ws_manager.merge(&ids);
    drop(ws_manager);

    if merged.is_some() && !app_state.is_journalist_mode() {
        let _ = persist_workstreams_to_disk(&app, &workstreams_state);
    }

    Ok(merged)
}

/// Delete a workstream
#[tauri::command]
pub fn delete_workstream(
    app: tauri::AppHandle,
    id: String,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let mut ws_manager = workstreams_state.manager.lock();
    let deleted = ws_manager.delete(&id);
    drop(ws_manager);

    if deleted && !app_state.is_journalist_mode() {
        let _ = persist_workstreams_to_disk(&app, &workstreams_state);
    }

    Ok(deleted)
}

/// Re-cluster workstreams from activity events
#[tauri::command]
pub fn recluster_workstreams(
    app: tauri::AppHandle,
    gap_threshold_mins: Option<u32>,
    workstreams_state: State<'_, WorkstreamsState>,
    activity_state: State<'_, ActivityState>,
    app_state: State<'_, AppState>,
) -> Result<usize, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }
    drop(manager);

    // Get all events from activity ledger
    let ledger = activity_state.ledger.lock();
    let events = ledger.export_events();
    drop(ledger);

    // Recluster
    let mut ws_manager = workstreams_state.manager.lock();
    ws_manager.recluster(&events, gap_threshold_mins.unwrap_or(30));
    let count = ws_manager.count();
    drop(ws_manager);

    // Persist automatically after recluster when persistence is enabled.
    if !app_state.is_journalist_mode() {
        if let Err(e) = persist_workstreams_to_disk(&app, &workstreams_state) {
            tracing::warn!("Failed to persist workstreams after recluster: {}", e);
        }
    }

    Ok(count)
}

/// Pin or unpin a workstream
#[tauri::command]
pub fn pin_workstream(
    app: tauri::AppHandle,
    id: String,
    pinned: bool,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstreams".into());
    }

    let mut ws_manager = workstreams_state.manager.lock();

    if let Some(ws) = ws_manager.get_mut(&id) {
        ws.is_pinned = pinned;
        drop(ws_manager);
        if !app_state.is_journalist_mode() {
            let _ = persist_workstreams_to_disk(&app, &workstreams_state);
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Get workstreams statistics
#[tauri::command]
pub fn get_workstreams_stats(
    workstreams_state: State<'_, WorkstreamsState>,
) -> Result<WorkstreamsStatsPayload, String> {
    let ws_manager = workstreams_state.manager.lock();

    let workstreams = ws_manager.list(None, None);
    let pinned_count = workstreams.iter().filter(|w| w.is_pinned).count();
    let auto_count = workstreams.iter().filter(|w| w.is_auto).count();

    Ok(WorkstreamsStatsPayload {
        total_count: ws_manager.count(),
        pinned_count,
        auto_count,
        is_dirty: ws_manager.is_dirty(),
    })
}

/// Statistics payload
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkstreamsStatsPayload {
    pub total_count: usize,
    pub pinned_count: usize,
    pub auto_count: usize,
    pub is_dirty: bool,
}

/// Save workstreams to encrypted storage (Pro only)
#[tauri::command]
pub async fn save_workstreams(
    app: tauri::AppHandle,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<(), String> {
    if app_state.is_journalist_mode() {
        return Ok(());
    }

    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstream persistence".into());
    }
    drop(manager);

    if !workstreams_state.is_persistence_enabled() {
        return Err("Workstream persistence not enabled".into());
    }

    persist_workstreams_to_disk(&app, &workstreams_state)
}

pub async fn autosave_if_dirty(app: tauri::AppHandle) -> Result<(), String> {
    let workstreams_state = app.state::<WorkstreamsState>();
    let app_state = app.state::<AppState>();
    if app_state.is_journalist_mode() || !workstreams_state.is_persistence_enabled() {
        return Ok(());
    }

    let should_save = {
        let ws_manager = workstreams_state.manager.lock();
        ws_manager.is_dirty()
    };

    if should_save {
        persist_workstreams_to_disk(&app, &workstreams_state)?;
    }

    Ok(())
}

/// Load workstreams from encrypted storage (Pro only)
#[tauri::command]
pub async fn load_workstreams(
    app: tauri::AppHandle,
    workstreams_state: State<'_, WorkstreamsState>,
    app_state: State<'_, AppState>,
) -> Result<WorkstreamsStatsPayload, String> {
    if app_state.is_journalist_mode() {
        let ws_manager = workstreams_state.manager.lock();
        let workstreams = ws_manager.list(None, None);
        let pinned_count = workstreams.iter().filter(|w| w.is_pinned).count();
        let auto_count = workstreams.iter().filter(|w| w.is_auto).count();
        return Ok(WorkstreamsStatsPayload {
            total_count: ws_manager.count(),
            pinned_count,
            auto_count,
            is_dirty: ws_manager.is_dirty(),
        });
    }

    // Check Pro capability
    let manager = app_state.entitlement_manager.lock();
    if !manager.capabilities().has(Capability::TodayTab) {
        return Err("Pro capability required for workstream persistence".into());
    }
    drop(manager);

    // Enable persistence for the session
    workstreams_state.enable_persistence();

    let config_dir = get_config_dir(&app)?;
    let storage_path = config_dir.join(WORKSTREAMS_FILE_ENC);
    let legacy_path = config_dir.join(WORKSTREAMS_FILE_JSON_LEGACY);

    // Try to load existing workstreams
    if storage_path.exists() {
        match std::fs::read(&storage_path) {
            Ok(blob) => {
                let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
                let key = device.derive_storage_key(WORKSTREAMS_KEY_CONTEXT);
                let plaintext = decrypt_payload(&blob, key)?;
                match serde_json::from_slice::<WorkstreamStorageData>(&plaintext) {
                    Ok(storage_data) => {
                        let workstreams = storage_data.into_workstreams();
                        let count = workstreams.len();

                        let mut ws_manager = workstreams_state.manager.lock();
                        *ws_manager = WorkstreamManager::from_workstreams(workstreams);
                        ws_manager.mark_saved();

                        tracing::info!("Loaded {} workstreams from {:?}", count, storage_path);
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse encrypted workstreams file: {}", e);
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to read encrypted workstreams file: {}", e);
            }
        }
    } else if legacy_path.exists() {
        match std::fs::read_to_string(&legacy_path) {
            Ok(json) => match serde_json::from_str::<WorkstreamStorageData>(&json) {
                Ok(storage_data) => {
                    let workstreams = storage_data.into_workstreams();
                    let count = workstreams.len();

                    let mut ws_manager = workstreams_state.manager.lock();
                    *ws_manager = WorkstreamManager::from_workstreams(workstreams);
                    ws_manager.mark_saved();

                    tracing::info!("Loaded {} workstreams from legacy {:?}", count, legacy_path);
                }
                Err(e) => {
                    tracing::warn!("Failed to parse legacy workstreams file: {}", e);
                }
            },
            Err(e) => {
                tracing::warn!("Failed to read legacy workstreams file: {}", e);
            }
        }
    }

    let ws_manager = workstreams_state.manager.lock();
    let workstreams = ws_manager.list(None, None);
    let pinned_count = workstreams.iter().filter(|w| w.is_pinned).count();
    let auto_count = workstreams.iter().filter(|w| w.is_auto).count();

    Ok(WorkstreamsStatsPayload {
        total_count: ws_manager.count(),
        pinned_count,
        auto_count,
        is_dirty: ws_manager.is_dirty(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workstream_payload_conversion() {
        let ws = Workstream::new("Test Workstream".to_string());
        let payload: WorkstreamPayload = (&ws).into();

        assert_eq!(payload.name, "Test Workstream");
        assert!(!payload.is_auto);
        assert!(!payload.is_pinned);
    }
}
