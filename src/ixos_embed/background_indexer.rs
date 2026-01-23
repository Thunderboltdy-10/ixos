//! Background indexer for idle-time embedding (P2.3)
//!
//! Pre-computes embeddings for frequently accessed directories
//! when the system is idle (60+ seconds of inactivity).

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

/// Background indexer for idle-time embedding
pub struct BackgroundIndexer {
    is_running: Arc<AtomicBool>,
    stop_tx: Option<mpsc::Sender<()>>,
}

/// Indexing progress information
#[derive(Debug, Clone, Default)]
pub struct IndexingProgress {
    pub files_indexed: usize,
    pub files_total: usize,
    pub current_directory: Option<PathBuf>,
    pub is_complete: bool,
}

impl BackgroundIndexer {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            stop_tx: None,
        }
    }

    /// Check if indexing is currently running
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::Relaxed)
    }

    /// Stop background indexing
    pub fn stop(&mut self) {
        self.is_running.store(false, Ordering::Relaxed);
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.try_send(());
        }
    }

    /// Start background indexing for directories
    ///
    /// # Arguments
    ///
    /// * `directories` - List of directories to index
    /// * `progress_tx` - Optional channel to send progress updates
    ///
    /// Note: Full implementation would integrate with EmbeddingModel
    pub async fn start(
        &mut self,
        _directories: Vec<PathBuf>,
        progress_tx: Option<mpsc::Sender<IndexingProgress>>,
    ) {
        if self.is_running() {
            return;
        }

        self.is_running.store(true, Ordering::Relaxed);
        let (tx, mut rx) = mpsc::channel::<()>(1);
        self.stop_tx = Some(tx);

        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            tracing::info!("Background indexing started");

            if let Some(ref tx) = progress_tx {
                let progress = IndexingProgress {
                    files_indexed: 0,
                    files_total: 0,
                    current_directory: None,
                    is_complete: false,
                };
                let _ = tx.send(progress).await;
            }

            loop {
                tokio::select! {
                    _ = rx.recv() => {
                        tracing::info!("Background indexing stopped");
                        break;
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {
                        if !is_running.load(Ordering::Relaxed) {
                            break;
                        }
                        // Placeholder: actual indexing logic would go here
                        // For now, just send a progress update if channel exists
                        if let Some(ref tx) = progress_tx {
                            let progress = IndexingProgress {
                                files_indexed: 0,
                                files_total: 0,
                                current_directory: None,
                                is_complete: false,
                            };
                            let _ = tx.send(progress).await;
                        }
                    }
                }
            }

            // Send completion if channel exists
            if let Some(tx) = progress_tx {
                let progress = IndexingProgress {
                    files_indexed: 0,
                    files_total: 0,
                    current_directory: None,
                    is_complete: true,
                };
                let _ = tx.send(progress).await;
            }

            is_running.store(false, Ordering::Relaxed);
        });
    }

    /// Start background indexing without progress updates
    pub async fn start_simple(&mut self, directories: Vec<PathBuf>) {
        self.start(directories, None).await;
    }

    /// Synchronous version of start that can be called from blocking context
    ///
    /// This spawns the background indexing task on the tokio runtime without
    /// requiring an async context.
    pub fn start_sync(
        &mut self,
        _directories: Vec<PathBuf>,
        progress_tx: Option<mpsc::Sender<IndexingProgress>>,
    ) {
        if self.is_running() {
            return;
        }

        self.is_running.store(true, Ordering::Relaxed);
        let (tx, mut rx) = mpsc::channel::<()>(1);
        self.stop_tx = Some(tx);

        let is_running = self.is_running.clone();

        // Spawn the background task - this works even from spawn_blocking
        // because we're just scheduling work, not awaiting it
        std::thread::spawn(move || {
            // Create a new runtime for this thread
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to create runtime");

            rt.block_on(async move {
                tracing::info!("Background indexing started (sync)");

                if let Some(ref tx) = progress_tx {
                    let progress = IndexingProgress {
                        files_indexed: 0,
                        files_total: 0,
                        current_directory: None,
                        is_complete: false,
                    };
                    let _ = tx.send(progress).await;
                }

                loop {
                    tokio::select! {
                        _ = rx.recv() => {
                            tracing::info!("Background indexing stopped");
                            break;
                        }
                        _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {
                            if !is_running.load(Ordering::Relaxed) {
                                break;
                            }
                            // Placeholder: actual indexing logic would go here
                            if let Some(ref tx) = progress_tx {
                                let progress = IndexingProgress {
                                    files_indexed: 0,
                                    files_total: 0,
                                    current_directory: None,
                                    is_complete: false,
                                };
                                let _ = tx.send(progress).await;
                            }
                        }
                    }
                }

                // Send completion if channel exists
                if let Some(tx) = progress_tx {
                    let progress = IndexingProgress {
                        files_indexed: 0,
                        files_total: 0,
                        current_directory: None,
                        is_complete: true,
                    };
                    let _ = tx.send(progress).await;
                }

                is_running.store(false, Ordering::Relaxed);
            });
        });
    }
}

impl Default for BackgroundIndexer {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for BackgroundIndexer {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_indexer_start_stop() {
        let mut indexer = BackgroundIndexer::new();
        assert!(!indexer.is_running());

        indexer.start_simple(vec![PathBuf::from("/tmp")]).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        assert!(indexer.is_running());

        indexer.stop();
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        assert!(!indexer.is_running());
    }

    #[tokio::test]
    async fn test_indexer_double_start() {
        let mut indexer = BackgroundIndexer::new();

        indexer.start_simple(vec![PathBuf::from("/tmp")]).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        // Try to start again - should be no-op
        indexer.start_simple(vec![PathBuf::from("/tmp")]).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        assert!(indexer.is_running());
        indexer.stop();
    }

    #[tokio::test]
    async fn test_indexer_progress_updates() {
        let mut indexer = BackgroundIndexer::new();
        let (tx, mut rx) = mpsc::channel(10);

        indexer.start(vec![PathBuf::from("/tmp")], Some(tx)).await;

        // Wait for at least one progress update
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        indexer.stop();

        // Should have received at least one progress update
        let mut received_progress = false;
        while let Ok(progress) = rx.try_recv() {
            received_progress = true;
            if progress.is_complete {
                break;
            }
        }
        assert!(received_progress);
    }
}
