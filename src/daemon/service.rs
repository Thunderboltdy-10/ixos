//! Daemon Service (P5)
//!
//! Main daemon service that coordinates:
//! - File system watching (ResilientWatcher)
//! - Background indexing (BackgroundIndexer)
//! - IPC communication (IpcServer)
//! - Cache management

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

use sysinfo::System;
use tokio::sync::{mpsc, RwLock};

use super::config::DaemonConfig;
use super::ipc::{IpcMessage, IpcResponse, IpcServer};
use crate::ixos_watcher::ResilientWatcher;

/// Statistics for the daemon service
#[derive(Debug, Clone, Default)]
pub struct DaemonStats {
    pub files_indexed: usize,
    pub files_watched: usize,
    pub cache_hits: usize,
    pub cache_misses: usize,
    pub errors: usize,
    pub start_time: Option<Instant>,
}

/// State of a watched directory
#[derive(Debug)]
struct WatchedDirectory {
    path: PathBuf,
    files: HashMap<PathBuf, FileState>,
    last_scan: Instant,
}

#[derive(Debug)]
struct FileState {
    modified_time: std::time::SystemTime,
    indexed: bool,
}

/// Main daemon service
pub struct DaemonService {
    config: DaemonConfig,
    stats: Arc<RwLock<DaemonStats>>,
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    watched_dirs: Arc<RwLock<Vec<WatchedDirectory>>>,
    ipc_server: Option<IpcServer>,
    stop_tx: Option<mpsc::Sender<()>>,
}

impl DaemonService {
    /// Create a new daemon service
    pub fn new(config: DaemonConfig) -> Self {
        Self {
            config,
            stats: Arc::new(RwLock::new(DaemonStats::default())),
            running: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
            watched_dirs: Arc::new(RwLock::new(Vec::new())),
            ipc_server: None,
            stop_tx: None,
        }
    }

    /// Start the daemon service
    pub async fn start(&mut self) -> anyhow::Result<()> {
        if self.running.load(Ordering::SeqCst) {
            return Err(anyhow::anyhow!("Daemon already running"));
        }

        self.config.validate().map_err(|e| anyhow::anyhow!(e))?;

        self.running.store(true, Ordering::SeqCst);

        // Initialize stats
        {
            let mut stats = self.stats.write().await;
            stats.start_time = Some(Instant::now());
        }

        // Initialize watched directories
        for dir in &self.config.watch_directories {
            self.add_directory(dir.clone()).await?;
        }

        // Create stop channel
        let (stop_tx, stop_rx) = mpsc::channel::<()>(1);
        self.stop_tx = Some(stop_tx);

        // Start IPC server
        let (mut ipc_server, ipc_rx) = IpcServer::new(self.config.ipc_path.clone());
        ipc_server.start().await?;
        self.ipc_server = Some(ipc_server);

        // Spawn main event loop
        let running = self.running.clone();
        let paused = self.paused.clone();
        let stats = self.stats.clone();
        let watched_dirs = self.watched_dirs.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            Self::event_loop(
                running,
                paused,
                stats,
                watched_dirs,
                config,
                ipc_rx,
                stop_rx,
            )
            .await;
        });

        tracing::info!("Daemon service started");
        Ok(())
    }

    /// Stop the daemon service
    pub async fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);

        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(()).await;
        }

        if let Some(mut server) = self.ipc_server.take() {
            server.stop();
        }

        tracing::info!("Daemon service stopped");
    }

    /// Add a directory to watch
    pub async fn add_directory(&self, path: PathBuf) -> anyhow::Result<()> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Directory does not exist: {:?}", path));
        }

        let mut dirs = self.watched_dirs.write().await;

        // Check if already watching
        if dirs.iter().any(|d| d.path == path) {
            return Ok(());
        }

        dirs.push(WatchedDirectory {
            path,
            files: HashMap::new(),
            last_scan: Instant::now(),
        });

        Ok(())
    }

    /// Remove a directory from watch
    pub async fn remove_directory(&self, path: &PathBuf) {
        let mut dirs = self.watched_dirs.write().await;
        dirs.retain(|d| d.path != *path);
    }

    /// Get current statistics
    pub async fn get_stats(&self) -> DaemonStats {
        self.stats.read().await.clone()
    }

    /// Check if daemon is running
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// Pause indexing
    pub fn pause(&self) {
        self.paused.store(true, Ordering::SeqCst);
    }

    /// Resume indexing
    pub fn resume(&self) {
        self.paused.store(false, Ordering::SeqCst);
    }

    /// Main event loop
    async fn event_loop(
        running: Arc<AtomicBool>,
        paused: Arc<AtomicBool>,
        stats: Arc<RwLock<DaemonStats>>,
        watched_dirs: Arc<RwLock<Vec<WatchedDirectory>>>,
        config: DaemonConfig,
        mut ipc_rx: mpsc::Receiver<(IpcMessage, mpsc::Sender<IpcResponse>)>,
        mut stop_rx: mpsc::Receiver<()>,
    ) {
        let mut idle_checker = tokio::time::interval(config.idle_check_interval);
        let mut last_activity = Instant::now();
        let mut system = System::new_all();

        // Create file watcher (event processor for resilience)
        let _watcher = ResilientWatcher::new();

        // Note: ResilientWatcher processes events, actual watching would use notify crate
        // For now, we do polling-based watching via the idle checker

        loop {
            tokio::select! {
                // Stop signal
                _ = stop_rx.recv() => {
                    tracing::info!("Received stop signal");
                    break;
                }

                // IPC message
                Some((msg, resp_tx)) = ipc_rx.recv() => {
                    let response = Self::handle_ipc_message(
                        msg,
                        &running,
                        &paused,
                        &stats,
                        &watched_dirs,
                        &config,
                    ).await;
                    let _ = resp_tx.send(response).await;
                    last_activity = Instant::now();
                }

                // Idle check
                _ = idle_checker.tick() => {
                    if !running.load(Ordering::SeqCst) {
                        break;
                    }

                    if paused.load(Ordering::SeqCst) {
                        continue;
                    }

                    // Check system idle
                    system.refresh_cpu_all();
                    let cpu_usage: f32 = system.global_cpu_usage();
                    let is_idle = cpu_usage < 20.0 && last_activity.elapsed() > config.idle_threshold;

                    if is_idle && !config.deep_search_mode {
                        // Background indexing during idle
                        Self::do_background_indexing(
                            &watched_dirs,
                            &stats,
                            &config,
                        ).await;
                    }
                }
            }
        }

        running.store(false, Ordering::SeqCst);
    }

    /// Handle IPC message
    async fn handle_ipc_message(
        msg: IpcMessage,
        running: &Arc<AtomicBool>,
        paused: &Arc<AtomicBool>,
        stats: &Arc<RwLock<DaemonStats>>,
        watched_dirs: &Arc<RwLock<Vec<WatchedDirectory>>>,
        config: &DaemonConfig,
    ) -> IpcResponse {
        match msg {
            IpcMessage::Status => {
                let s = stats.read().await;
                let dirs = watched_dirs.read().await;
                IpcResponse::Status {
                    running: running.load(Ordering::SeqCst),
                    indexing: !paused.load(Ordering::SeqCst),
                    files_indexed: s.files_indexed,
                    directories_watched: dirs.len(),
                    uptime_seconds: s.start_time.map(|t| t.elapsed().as_secs()).unwrap_or(0),
                }
            }

            IpcMessage::CacheStats => {
                let s = stats.read().await;
                let total = s.cache_hits + s.cache_misses;
                let hit_rate = if total > 0 {
                    s.cache_hits as f32 / total as f32
                } else {
                    0.0
                };
                IpcResponse::CacheStats {
                    total_files: s.files_watched,
                    cached_embeddings: s.files_indexed,
                    cache_size_bytes: 0, // TODO: Calculate actual size
                    hit_rate,
                }
            }

            IpcMessage::AddDirectory { path } => {
                let mut dirs = watched_dirs.write().await;
                if !dirs.iter().any(|d| d.path == path) {
                    dirs.push(WatchedDirectory {
                        path: path.clone(),
                        files: HashMap::new(),
                        last_scan: Instant::now(),
                    });
                    IpcResponse::Ok {
                        message: Some(format!("Added directory: {:?}", path)),
                    }
                } else {
                    IpcResponse::Ok {
                        message: Some("Directory already being watched".into()),
                    }
                }
            }

            IpcMessage::RemoveDirectory { path } => {
                let mut dirs = watched_dirs.write().await;
                let len_before = dirs.len();
                dirs.retain(|d| d.path != path);
                if dirs.len() < len_before {
                    IpcResponse::Ok {
                        message: Some(format!("Removed directory: {:?}", path)),
                    }
                } else {
                    IpcResponse::Error {
                        message: "Directory was not being watched".into(),
                    }
                }
            }

            IpcMessage::ClearCache => {
                if config.deep_search_mode {
                    return IpcResponse::Ok {
                        message: Some("No cache in deep search mode".into()),
                    };
                }
                // TODO: Actually clear the cache
                let mut s = stats.write().await;
                s.files_indexed = 0;
                s.cache_hits = 0;
                s.cache_misses = 0;
                IpcResponse::Ok {
                    message: Some("Cache cleared".into()),
                }
            }

            IpcMessage::IndexNow => {
                if config.deep_search_mode {
                    return IpcResponse::Error {
                        message: "Cannot index in deep search mode".into(),
                    };
                }
                // Trigger immediate indexing
                Self::do_background_indexing(watched_dirs, stats, config).await;
                IpcResponse::Ok {
                    message: Some("Indexing triggered".into()),
                }
            }

            IpcMessage::Pause => {
                paused.store(true, Ordering::SeqCst);
                IpcResponse::Ok {
                    message: Some("Indexing paused".into()),
                }
            }

            IpcMessage::Resume => {
                paused.store(false, Ordering::SeqCst);
                IpcResponse::Ok {
                    message: Some("Indexing resumed".into()),
                }
            }

            IpcMessage::Shutdown => {
                running.store(false, Ordering::SeqCst);
                IpcResponse::Ok {
                    message: Some("Shutdown initiated".into()),
                }
            }

            IpcMessage::Search {
                query: _,
                directory: _,
                limit: _,
            } => {
                // TODO: Implement actual search
                IpcResponse::SearchResults {
                    results: vec![],
                    total_ms: 0,
                }
            }
        }
    }

    /// Perform background indexing
    async fn do_background_indexing(
        watched_dirs: &Arc<RwLock<Vec<WatchedDirectory>>>,
        stats: &Arc<RwLock<DaemonStats>>,
        config: &DaemonConfig,
    ) {
        let mut dirs = watched_dirs.write().await;
        let mut indexed_count = 0;

        for dir in dirs.iter_mut() {
            // Scan for new/modified files
            let entries = match std::fs::read_dir(&dir.path) {
                Ok(e) => e,
                Err(e) => {
                    tracing::warn!("Failed to read directory {:?}: {}", dir.path, e);
                    continue;
                }
            };

            for entry in entries.flatten() {
                let path = entry.path();

                // Skip directories
                if path.is_dir() {
                    continue;
                }

                // Check extension
                if let Some(ext) = path.extension() {
                    if !config.should_index_extension(&ext.to_string_lossy()) {
                        continue;
                    }
                }

                // Check exclusions
                if config.should_exclude(&path) {
                    continue;
                }

                // Get modification time
                let metadata = match entry.metadata() {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let modified = metadata
                    .modified()
                    .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

                // Check if needs indexing
                let needs_index = match dir.files.get(&path) {
                    Some(state) => state.modified_time != modified || !state.indexed,
                    None => true,
                };

                if needs_index {
                    // TODO: Actually generate embedding and cache it
                    // For now, just mark as indexed
                    dir.files.insert(
                        path.clone(),
                        FileState {
                            modified_time: modified,
                            indexed: true,
                        },
                    );
                    indexed_count += 1;

                    // Respect batch size
                    if indexed_count >= config.batch_size {
                        break;
                    }
                }
            }

            dir.last_scan = Instant::now();
        }

        // Update stats
        if indexed_count > 0 {
            let mut s = stats.write().await;
            s.files_indexed += indexed_count;
            tracing::debug!("Indexed {} files in background", indexed_count);
        }
    }
}

impl Drop for DaemonService {
    fn drop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_daemon_creation() {
        let config = DaemonConfig::default();
        let daemon = DaemonService::new(config);
        assert!(!daemon.is_running());
    }

    #[tokio::test]
    async fn test_daemon_stats() {
        let config = DaemonConfig::default();
        let daemon = DaemonService::new(config);
        let stats = daemon.get_stats().await;
        assert_eq!(stats.files_indexed, 0);
    }
}
