//! Personal ranking command handlers.

use std::path::Path;

use tauri::State;

use crate::state::AppState;
use ixos_protocol::ixos_rank::personal_ranker;
use ixos_protocol::storage::personal_ranking::{
    get_personal_signals as load_personal_signals, reset_learning_for_directory, PersonalSignals,
};

fn ensure_not_journalist(state: &AppState) -> bool {
    !state.is_journalist_mode()
}

#[tauri::command]
pub fn pin_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    personal_ranker::pin(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unpin_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    personal_ranker::unpin(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ignore_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    personal_ranker::ignore(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unignore_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
    personal_ranker::unignore(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_not_relevant(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !ensure_not_journalist(&state) {
        return Ok(());
    }
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
    load_personal_signals(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_learning(directory: String, state: State<'_, AppState>) -> Result<usize, String> {
    if !ensure_not_journalist(&state) {
        return Ok(0);
    }
    Ok(reset_learning_for_directory(Path::new(&directory)))
}
