//! IPC Server for Daemon Communication (P5)
//!
//! Provides inter-process communication between the daemon and CLI/UI.
//! Uses named pipes on Windows and Unix sockets on Unix systems.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::sync::mpsc;

/// IPC message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IpcMessage {
    /// Request daemon status
    Status,

    /// Request cache statistics
    CacheStats,

    /// Request to add a directory to watch
    AddDirectory { path: PathBuf },

    /// Request to remove a directory from watch
    RemoveDirectory { path: PathBuf },

    /// Request to clear the cache
    ClearCache,

    /// Request to trigger immediate indexing
    IndexNow,

    /// Request to pause indexing
    Pause,

    /// Request to resume indexing
    Resume,

    /// Request to shutdown the daemon
    Shutdown,

    /// Search request from UI
    Search {
        query: String,
        directory: PathBuf,
        limit: usize,
    },
}

/// IPC response types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IpcResponse {
    /// Success with optional message
    Ok { message: Option<String> },

    /// Error response
    Error { message: String },

    /// Daemon status
    Status {
        running: bool,
        indexing: bool,
        files_indexed: usize,
        directories_watched: usize,
        uptime_seconds: u64,
    },

    /// Cache statistics
    CacheStats {
        total_files: usize,
        cached_embeddings: usize,
        cache_size_bytes: u64,
        hit_rate: f32,
    },

    /// Search results (placeholder for streaming)
    SearchResults {
        results: Vec<SearchResult>,
        total_ms: u64,
    },
}

/// Simplified search result for IPC
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: PathBuf,
    pub score: f32,
    pub snippet: Option<String>,
}

/// IPC Server for daemon communication
pub struct IpcServer {
    /// Path to the IPC socket/pipe
    path: PathBuf,
    /// Channel for incoming messages
    message_tx: mpsc::Sender<(IpcMessage, mpsc::Sender<IpcResponse>)>,
    /// Whether the server is running
    running: bool,
}

impl IpcServer {
    /// Create a new IPC server
    pub fn new(
        path: PathBuf,
    ) -> (
        Self,
        mpsc::Receiver<(IpcMessage, mpsc::Sender<IpcResponse>)>,
    ) {
        let (tx, rx) = mpsc::channel(32);
        (
            Self {
                path,
                message_tx: tx,
                running: false,
            },
            rx,
        )
    }

    /// Start the IPC server
    #[cfg(windows)]
    pub async fn start(&mut self) -> Result<(), std::io::Error> {
        use tokio::net::windows::named_pipe::{PipeMode, ServerOptions};

        self.running = true;
        let path = self.path.clone();
        let tx = self.message_tx.clone();

        tokio::spawn(async move {
            tracing::info!("Starting IPC server on {:?}", path);

            // Create named pipe server
            let path_str = path.to_string_lossy();

            loop {
                let server = match ServerOptions::new()
                    .first_pipe_instance(true)
                    .pipe_mode(PipeMode::Message)
                    .create(&*path_str)
                {
                    Ok(s) => s,
                    Err(e) => {
                        tracing::error!("Failed to create named pipe: {}", e);
                        break;
                    }
                };

                // Wait for client connection
                if let Err(e) = server.connect().await {
                    tracing::error!("Client connection failed: {}", e);
                    continue;
                }

                // Handle client in separate task
                let tx_clone = tx.clone();
                tokio::spawn(async move {
                    Self::handle_client_windows(server, tx_clone).await;
                });
            }
        });

        Ok(())
    }

    #[cfg(windows)]
    async fn handle_client_windows(
        _pipe: tokio::net::windows::named_pipe::NamedPipeServer,
        _tx: mpsc::Sender<(IpcMessage, mpsc::Sender<IpcResponse>)>,
    ) {
        // TODO: Read messages from pipe, deserialize, send to channel
        // For now, this is a placeholder
        tracing::debug!("Client connected to named pipe");
    }

    /// Start the IPC server (Unix)
    #[cfg(unix)]
    pub async fn start(&mut self) -> Result<(), std::io::Error> {
        use tokio::net::UnixListener;

        self.running = true;
        let path = self.path.clone();
        let tx = self.message_tx.clone();

        // Remove existing socket file
        let _ = std::fs::remove_file(&path);

        tokio::spawn(async move {
            tracing::info!("Starting IPC server on {:?}", path);

            let listener = match UnixListener::bind(&path) {
                Ok(l) => l,
                Err(e) => {
                    tracing::error!("Failed to bind Unix socket: {}", e);
                    return;
                }
            };

            // Set restrictive permissions
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
            }

            loop {
                match listener.accept().await {
                    Ok((stream, _)) => {
                        let tx_clone = tx.clone();
                        tokio::spawn(async move {
                            Self::handle_client_unix(stream, tx_clone).await;
                        });
                    }
                    Err(e) => {
                        tracing::error!("Accept failed: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    #[cfg(unix)]
    async fn handle_client_unix(
        mut stream: tokio::net::UnixStream,
        tx: mpsc::Sender<(IpcMessage, mpsc::Sender<IpcResponse>)>,
    ) {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let mut buf = vec![0u8; 4096];

        loop {
            match stream.read(&mut buf).await {
                Ok(0) => break, // Connection closed
                Ok(n) => {
                    // Deserialize message
                    match serde_json::from_slice::<IpcMessage>(&buf[..n]) {
                        Ok(msg) => {
                            // Create response channel
                            let (resp_tx, mut resp_rx) = mpsc::channel(1);

                            // Send to handler
                            if tx.send((msg, resp_tx)).await.is_err() {
                                break;
                            }

                            // Wait for response
                            if let Some(resp) = resp_rx.recv().await {
                                if let Ok(json) = serde_json::to_vec(&resp) {
                                    let _ = stream.write_all(&json).await;
                                }
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Invalid IPC message: {}", e);
                            let err = IpcResponse::Error {
                                message: format!("Invalid message: {}", e),
                            };
                            if let Ok(json) = serde_json::to_vec(&err) {
                                let _ = stream.write_all(&json).await;
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Read error: {}", e);
                    break;
                }
            }
        }
    }

    /// Stop the IPC server
    pub fn stop(&mut self) {
        self.running = false;
        // Remove socket file on Unix
        #[cfg(unix)]
        let _ = std::fs::remove_file(&self.path);
    }

    /// Check if server is running
    pub fn is_running(&self) -> bool {
        self.running
    }
}

impl Drop for IpcServer {
    fn drop(&mut self) {
        self.stop();
    }
}
