//! File prefetching command handlers (P2.3)
//!
//! Reduces file opening latency by prefetching content on hover.

use ixos_protocol::FilePrefetcher;
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

/// State wrapper for file prefetcher
pub struct PrefetchState(pub Arc<Mutex<FilePrefetcher>>);

impl Default for PrefetchState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(FilePrefetcher::new())))
    }
}

/// Prefetch a file's content in the background
///
/// # Arguments
///
/// * `path` - The file path to prefetch
#[tauri::command]
pub async fn prefetch_file(path: String, state: State<'_, PrefetchState>) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    // Clone the Arc to avoid holding the lock across await
    let prefetcher = state.0.clone();
    // Spawn a blocking task to handle the prefetch
    tokio::task::spawn_blocking(move || {
        let prefetcher = prefetcher.lock();
        // Use blocking prefetch or schedule it
        prefetcher.prefetch_sync(path_buf);
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get cached file content if available
///
/// # Arguments
///
/// * `path` - The file path to retrieve
///
/// # Returns
///
/// The file content if cached, None otherwise
#[tauri::command]
pub fn get_file_content(
    path: String,
    state: State<'_, PrefetchState>,
) -> Result<Option<String>, String> {
    let prefetcher = state.0.lock();
    Ok(prefetcher.get_cached(&PathBuf::from(path)))
}

/// Clear all prefetched content
#[tauri::command]
pub fn clear_prefetch_cache(state: State<'_, PrefetchState>) -> Result<(), String> {
    let prefetcher = state.0.lock();
    prefetcher.clear();
    Ok(())
}

/// Get prefetch cache statistics
#[tauri::command]
pub fn get_prefetch_stats(state: State<'_, PrefetchState>) -> Result<PrefetchStats, String> {
    let prefetcher = state.0.lock();
    Ok(PrefetchStats {
        cached_files: prefetcher.cache_size(),
        pending_files: prefetcher.pending_count(),
    })
}

/// Prefetch statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PrefetchStats {
    pub cached_files: usize,
    pub pending_files: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_prefetch_state() {
        let state = PrefetchState::default();
        let stats = get_prefetch_stats(State::from(&state)).unwrap();
        assert_eq!(stats.cached_files, 0);
        assert_eq!(stats.pending_files, 0);
    }

    #[tokio::test]
    async fn test_clear_cache() {
        let state = PrefetchState::default();
        clear_prefetch_cache(State::from(&state)).unwrap();
        let stats = get_prefetch_stats(State::from(&state)).unwrap();
        assert_eq!(stats.cached_files, 0);
    }
}
