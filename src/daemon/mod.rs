//! Daemon Service Module (P5)
//!
//! Provides background file watching and incremental indexing daemon.
//! Integrates ResilientWatcher with BackgroundIndexer for cache maintenance.

pub mod config;
pub mod ipc;
pub mod service;

pub use config::DaemonConfig;
pub use ipc::{IpcMessage, IpcResponse, IpcServer};
pub use service::DaemonService;
