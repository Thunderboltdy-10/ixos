//! Search history command handlers (P2.1 Ramp 1)
//!
//! Provides instant echo search suggestions based on previous queries.

use ixos_protocol::{InstantHistoryEntry as HistoryEntry, InstantSearchHistory as SearchHistory};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

/// State wrapper for search history
pub struct HistoryState(pub Mutex<SearchHistory>);

impl Default for HistoryState {
    fn default() -> Self {
        Self(Mutex::new(SearchHistory::new()))
    }
}

/// Get search suggestions matching a prefix
///
/// # Arguments
///
/// * `prefix` - The query prefix to match
/// * `limit` - Maximum number of suggestions to return (default: 5)
#[tauri::command]
pub fn get_search_suggestions(
    prefix: &str,
    limit: Option<usize>,
    state: State<'_, HistoryState>,
) -> Result<Vec<HistoryEntry>, String> {
    get_search_suggestions_inner(prefix, limit, &state)
}

/// Add a search query to history
///
/// # Arguments
///
/// * `query` - The search query
/// * `directory` - The directory that was searched
/// * `result_count` - Number of results found
#[tauri::command]
pub fn add_to_history(
    query: &str,
    directory: &str,
    result_count: usize,
    state: State<'_, HistoryState>,
) -> Result<(), String> {
    add_to_history_inner(query, directory, result_count, &state)
}

/// Delete a specific item from history
#[tauri::command]
pub fn delete_history_item(query: String, state: State<'_, HistoryState>) -> Result<(), String> {
    let mut history = state.0.lock().map_err(|e| e.to_string())?;
    history.remove(&query);
    Ok(())
}

/// Clear all search history
#[tauri::command]
pub fn clear_history(state: State<'_, HistoryState>) -> Result<(), String> {
    clear_history_inner(&state)
}

/// Get all history entries
#[tauri::command]
pub fn get_all_history(state: State<'_, HistoryState>) -> Result<Vec<HistoryEntry>, String> {
    get_all_history_inner(&state)
}

fn get_search_suggestions_inner(
    prefix: &str,
    limit: Option<usize>,
    state: &HistoryState,
) -> Result<Vec<HistoryEntry>, String> {
    let history = state.0.lock().map_err(|e| e.to_string())?;

    let suggestions = history
        .get_suggestions(prefix, limit.unwrap_or(5))
        .into_iter()
        .cloned()
        .collect();

    Ok(suggestions)
}

fn add_to_history_inner(
    query: &str,
    directory: &str,
    result_count: usize,
    state: &HistoryState,
) -> Result<(), String> {
    let mut history = state.0.lock().map_err(|e| e.to_string())?;
    history.add(query.to_string(), PathBuf::from(directory), result_count);
    Ok(())
}

fn clear_history_inner(state: &HistoryState) -> Result<(), String> {
    let mut history = state.0.lock().map_err(|e| e.to_string())?;
    history.clear();
    Ok(())
}

fn get_all_history_inner(state: &HistoryState) -> Result<Vec<HistoryEntry>, String> {
    let history = state.0.lock().map_err(|e| e.to_string())?;
    let entries = history.entries().cloned().collect();
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_state() -> HistoryState {
        HistoryState::default()
    }

    #[test]
    fn test_add_and_get_suggestions() {
        let state = create_test_state();

        add_to_history_inner("test query", "/tmp", 5, &state).unwrap();

        let suggestions = get_search_suggestions_inner("test", Some(5), &state).unwrap();
        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].query, "test query");
    }

    #[test]
    fn test_clear_history() {
        let state = create_test_state();

        add_to_history_inner("test", "/tmp", 1, &state).unwrap();
        clear_history_inner(&state).unwrap();

        let all = get_all_history_inner(&state).unwrap();
        assert!(all.is_empty());
    }
}
