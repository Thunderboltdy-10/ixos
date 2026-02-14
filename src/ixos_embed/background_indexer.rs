//! Background indexer for idle-time embedding (P2.3)
//!
//! Pre-computes embeddings for frequently accessed directories
//! when the system is idle (60+ seconds of inactivity).

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::ixos_embed::{MmapModel2VecEmbedder, ModelType, SecureEmbedder, StubModel};
use crate::ixos_rank::{CacheMode, StubSemanticEngine};

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
        directories: Vec<PathBuf>,
        progress_tx: Option<mpsc::Sender<IndexingProgress>>,
    ) {
        if self.is_running() {
            return;
        }

        self.is_running.store(true, Ordering::Relaxed);
        let (tx, rx) = mpsc::channel::<()>(1);
        self.stop_tx = Some(tx);

        let is_running = self.is_running.clone();

        tokio::spawn(run_indexing_loop(is_running, directories, rx, progress_tx));
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
        directories: Vec<PathBuf>,
        progress_tx: Option<mpsc::Sender<IndexingProgress>>,
    ) {
        if self.is_running() {
            return;
        }

        self.is_running.store(true, Ordering::Relaxed);
        let (tx, rx) = mpsc::channel::<()>(1);
        self.stop_tx = Some(tx);

        let is_running = self.is_running.clone();

        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to create runtime");

            rt.block_on(run_indexing_loop(is_running, directories, rx, progress_tx));
        });
    }
}

async fn run_indexing_loop(
    is_running: Arc<AtomicBool>,
    directories: Vec<PathBuf>,
    mut stop_rx: mpsc::Receiver<()>,
    progress_tx: Option<mpsc::Sender<IndexingProgress>>,
) {
    tracing::info!("Background indexing started");

    if let Some(ref tx) = progress_tx {
        let _ = tx
            .send(IndexingProgress {
                files_indexed: 0,
                files_total: 0,
                current_directory: None,
                is_complete: false,
            })
            .await;
    }

    // Best-effort real embedder; fallback to stub when unavailable.
    let real_model = MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV2)
        .ok()
        .map(Arc::new);

    let mut total_discovered = 0usize;
    let mut total_warmed = 0usize;

    'outer: loop {
        for directory in &directories {
            tokio::select! {
                _ = stop_rx.recv() => {
                    tracing::info!("Background indexing stop requested");
                    break 'outer;
                }
                else => {}
            }

            if !directory.exists() {
                continue;
            }

            let mut semantic = if let Some(model) = &real_model {
                let embedder = SecureEmbedder::new_fast(model.clone());
                StubSemanticEngine::with_cache_mode(embedder, CacheMode::NativeCache)
            } else {
                let model = Arc::new(StubModel::new());
                let embedder = SecureEmbedder::new_fast(model);
                StubSemanticEngine::with_cache_mode(embedder, CacheMode::NativeCache)
            };

            let discovered = semantic.index_directory(directory).await.unwrap_or(0);
            let warmed = semantic.precompute_embeddings().await;
            total_discovered += discovered;
            total_warmed += warmed;

            if let Some(ref tx) = progress_tx {
                let _ = tx
                    .send(IndexingProgress {
                        files_indexed: total_warmed,
                        files_total: total_discovered,
                        current_directory: Some(directory.clone()),
                        is_complete: false,
                    })
                    .await;
            }
        }

        // Background loop cadence: repeat periodically until explicitly stopped.
        tokio::select! {
            _ = stop_rx.recv() => {
                tracing::info!("Background indexing stop requested");
                break;
            }
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(60)) => {}
        }
    }

    if let Some(tx) = progress_tx {
        let _ = tx
            .send(IndexingProgress {
                files_indexed: total_warmed,
                files_total: total_discovered,
                current_directory: None,
                is_complete: true,
            })
            .await;
    }

    is_running.store(false, Ordering::Relaxed);
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
