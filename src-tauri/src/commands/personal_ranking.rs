//! Personal ranking command handlers.

use std::path::Path;
use std::time::SystemTime;

use tauri::State;

use crate::state::AppState;
use ixos_protocol::capabilities::Capability;
use ixos_protocol::ixos_rank::personal_ranker;
use ixos_protocol::security::DeviceIdentity;
use ixos_protocol::storage::personal_ranking::{
    get_personal_signals as load_personal_signals, reset_learning_for_directory, PersonalSignals,
};

fn ensure_not_journalist(state: &AppState) -> bool {
    !state.is_journalist_mode()
}

fn ensure_pro_personal_ranking(state: &State<'_, AppState>) -> Result<(), String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let mut manager = state.entitlement_manager.lock();
    let status = manager.pro_status(SystemTime::now(), &device);
    if !status.is_enabled() {
        return Err("Pro entitlement required for personal ranking".to_string());
    }
    if !manager.capabilities().has(Capability::AskModePlus) {
        return Err("Pro capability required for personal ranking".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn pin_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    ensure_pro_personal_ranking(&state)?;
    personal_ranker::pin(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unpin_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    ensure_pro_personal_ranking(&state)?;
    personal_ranker::unpin(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ignore_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    ensure_pro_personal_ranking(&state)?;
    personal_ranker::ignore(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unignore_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    ensure_pro_personal_ranking(&state)?;
    personal_ranker::unignore(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_not_relevant(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    ensure_pro_personal_ranking(&state)?;
    personal_ranker::mark_not_relevant(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_personal_signals(
    path: String,
    state: State<'_, AppState>,
) -> Result<Option<PersonalSignals>, String> {
    if !ensure_not_journalist(&state) {
        return Ok(None);
    }
    ensure_pro_personal_ranking(&state)?;
    load_personal_signals(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_learning(directory: String, state: State<'_, AppState>) -> Result<usize, String> {
    if !ensure_not_journalist(&state) {
        return Ok(0);
    }
    ensure_pro_personal_ranking(&state)?;
    Ok(reset_learning_for_directory(Path::new(&directory)))
}
