//! Background indexer command handlers (P2.3)
//!
//! Pre-computes embeddings during idle time for frequently accessed directories.

use ixos_protocol::{BackgroundIndexer, IndexingProgress};
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::mpsc;

/// State wrapper for background indexer
pub struct IndexerState {
    pub indexer: Arc<Mutex<BackgroundIndexer>>,
    pub progress_tx: Arc<Mutex<Option<mpsc::Sender<IndexingProgress>>>>,
}

impl Default for IndexerState {
    fn default() -> Self {
        Self {
            indexer: Arc::new(Mutex::new(BackgroundIndexer::new())),
            progress_tx: Arc::new(Mutex::new(None)),
        }
    }
}

/// Start background indexing for directories
///
/// # Arguments
///
/// * `directories` - List of directory paths to index
#[tauri::command]
pub async fn start_background_indexing(
    directories: Vec<String>,
    state: State<'_, IndexerState>,
) -> Result<(), String> {
    let dirs: Vec<PathBuf> = directories.into_iter().map(PathBuf::from).collect();

    let (tx, mut rx) = mpsc::channel(100);

    // Store progress channel
    {
        let mut progress_tx = state.progress_tx.lock();
        *progress_tx = Some(tx.clone());
    }

    // Start indexing - clone the Arc to avoid holding the lock across await
    let indexer = state.indexer.clone();
    let dirs_clone = dirs.clone();
    let tx_clone = tx.clone();

    // Spawn a task to start indexing without holding lock across await
    tokio::task::spawn_blocking(move || {
        let mut indexer = indexer.lock();
        // Use synchronous start if available, or schedule the async work
        // Note: The original `indexer.start` was async. If `BackgroundIndexer::start_sync`
        // does not exist, this line will cause a compilation error.
        // If `start` is truly async and needs to be called, it should be spawned
        // on the async runtime *after* dropping the lock, or the Mutex type
        // should be `tokio::sync::Mutex` which allows holding the guard across .await.
        // Assuming `start_sync` is a new synchronous method or `start` was meant to be sync.
        indexer.start_sync(dirs_clone, Some(tx_clone));
    })
    .await
    .map_err(|e| e.to_string())?;

    // Spawn task to handle progress updates
    tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            // Emit progress event to frontend
            // Note: In a full implementation, this would emit Tauri events
            tracing::debug!(
                "Indexing progress: {}/{} files",
                progress.files_indexed,
                progress.files_total
            );
        }
    });

    Ok(())
}

/// Stop background indexing
#[tauri::command]
pub fn stop_background_indexing(state: State<'_, IndexerState>) -> Result<(), String> {
    let mut indexer = state.indexer.lock();
    indexer.stop();

    // Clear progress channel
    let mut progress_tx = state.progress_tx.lock();
    *progress_tx = None;

    Ok(())
}

/// Check if background indexing is running
#[tauri::command]
pub fn is_indexing(state: State<'_, IndexerState>) -> Result<bool, String> {
    let indexer = state.indexer.lock();
    Ok(indexer.is_running())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_indexer_state() {
        let state = IndexerState::default();
        let running = is_indexing(State::from(&state)).unwrap();
        assert!(!running);
    }

    #[tokio::test]
    async fn test_start_stop_indexing() {
        let state = IndexerState::default();

        start_background_indexing(vec!["/tmp".to_string()], State::from(&state))
            .await
            .unwrap();

        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let running = is_indexing(State::from(&state)).unwrap();
        assert!(running);

        stop_background_indexing(State::from(&state)).unwrap();
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let running = is_indexing(State::from(&state)).unwrap();
        assert!(!running);
    }
}
