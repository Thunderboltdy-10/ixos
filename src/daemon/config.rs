//! Daemon configuration (P5)
//!
//! Configuration for the background indexing daemon.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

/// Configuration for the daemon service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonConfig {
    /// Directories to watch for changes
    pub watch_directories: Vec<PathBuf>,

    /// How often to check for idle time (seconds)
    pub idle_check_interval: Duration,

    /// Minimum idle time before starting background indexing (seconds)
    pub idle_threshold: Duration,

    /// Maximum number of files to index per batch
    pub batch_size: usize,

    /// Whether to persist cache across restarts
    pub persistent_cache: bool,

    /// IPC socket/pipe path
    pub ipc_path: PathBuf,

    /// Enable deep search mode (no cache persistence)
    #[serde(default, alias = "journalist_mode")]
    pub deep_search_mode: bool,

    /// Maximum memory usage for indexing (bytes)
    pub max_memory_bytes: usize,

    /// File extensions to index (empty = all text files)
    pub index_extensions: Vec<String>,

    /// Paths to exclude from indexing
    pub exclude_patterns: Vec<String>,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            watch_directories: vec![],
            idle_check_interval: Duration::from_secs(5),
            idle_threshold: Duration::from_secs(60),
            batch_size: 50,
            persistent_cache: true,
            ipc_path: Self::default_ipc_path(),
            deep_search_mode: false,
            max_memory_bytes: 256 * 1024 * 1024, // 256 MB
            index_extensions: vec![
                "txt".into(),
                "md".into(),
                "rs".into(),
                "py".into(),
                "js".into(),
                "ts".into(),
                "json".into(),
                "yaml".into(),
                "toml".into(),
                "html".into(),
                "css".into(),
                "go".into(),
                "java".into(),
                "c".into(),
                "cpp".into(),
                "h".into(),
            ],
            exclude_patterns: vec![
                "**/node_modules/**".into(),
                "**/target/**".into(),
                "**/.git/**".into(),
                "**/dist/**".into(),
                "**/build/**".into(),
            ],
        }
    }
}

impl DaemonConfig {
    /// Create config with specific directories
    pub fn with_directories(directories: Vec<PathBuf>) -> Self {
        Self {
            watch_directories: directories,
            ..Default::default()
        }
    }

    /// Create config for deep search mode (no persistence)
    pub fn deep_search() -> Self {
        Self {
            persistent_cache: false,
            deep_search_mode: true,
            ..Default::default()
        }
    }

    /// Backward-compatible alias for legacy callers.
    pub fn journalist() -> Self {
        Self::deep_search()
    }

    /// Get the default IPC path for the current platform
    #[cfg(windows)]
    fn default_ipc_path() -> PathBuf {
        PathBuf::from(r"\\.\pipe\ixos-daemon")
    }

    #[cfg(unix)]
    fn default_ipc_path() -> PathBuf {
        let runtime_dir = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".into());
        PathBuf::from(runtime_dir).join("ixos-daemon.sock")
    }

    /// Check if a file extension should be indexed
    pub fn should_index_extension(&self, ext: &str) -> bool {
        if self.index_extensions.is_empty() {
            return true;
        }
        self.index_extensions
            .iter()
            .any(|e| e.eq_ignore_ascii_case(ext))
    }

    /// Check if a path should be excluded
    pub fn should_exclude(&self, path: &std::path::Path) -> bool {
        let path_str = path.to_string_lossy();
        for pattern in &self.exclude_patterns {
            if let Ok(glob) = glob::Pattern::new(pattern) {
                if glob.matches(&path_str) {
                    return true;
                }
            }
        }
        false
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.batch_size == 0 {
            return Err("batch_size must be > 0".into());
        }
        if self.max_memory_bytes < 16 * 1024 * 1024 {
            return Err("max_memory_bytes must be at least 16MB".into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = DaemonConfig::default();
        assert!(config.validate().is_ok());
        assert!(!config.deep_search_mode);
        assert!(config.persistent_cache);
    }

    #[test]
    fn test_deep_search_config() {
        let config = DaemonConfig::deep_search();
        assert!(config.deep_search_mode);
        assert!(!config.persistent_cache);
    }

    #[test]
    fn test_should_index_extension() {
        let config = DaemonConfig::default();
        assert!(config.should_index_extension("rs"));
        assert!(config.should_index_extension("RS")); // case insensitive
        assert!(!config.should_index_extension("exe"));
    }
}
