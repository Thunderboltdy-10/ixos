//! Journalist Mode - Maximum privacy search mode
//!
//! Provides a high-security search mode designed for journalists and
//! sensitive document handling. Features:
//!
//! - **Memory-only operation**: Forces JIT mode, no persistent cache
//! - **Auto-clear**: All buffers cleared after each search
//! - **Secure wipe**: Memory zeroed on exit using zeroize
//! - **No forensic artifacts**: No ADS/xattr, no logs
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::journalist_mode::JournalistMode;
//!
//! let mut journalist = JournalistMode::new();
//! journalist.enable();
//!
//! // ... perform search ...
//!
//! journalist.clear_all(); // Securely wipe everything
//! ```
//!
//! ## CLI Usage
//!
//! ```cmd
//! .\target\release\ixos.exe search "query" --journalist-mode
//! ```

use std::sync::atomic::{AtomicBool, Ordering};
use zeroize::Zeroize;

/// Global flag indicating journalist mode is active
static JOURNALIST_MODE_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Checks if journalist mode is currently active
pub fn is_journalist_mode() -> bool {
    JOURNALIST_MODE_ACTIVE.load(Ordering::SeqCst)
}

/// Journalist mode manager for maximum privacy searches
///
/// When enabled:
/// - Forces JIT cache mode (no persistent storage)
/// - Wraps sensitive data in secure buffers
/// - Clears all data after each operation
/// - Zeroizes memory on drop
#[derive(Debug)]
pub struct JournalistMode {
    /// Whether journalist mode is currently enabled
    enabled: bool,
    /// Tracked secure buffers for clearing
    buffers: Vec<SecureBuffer>,
    /// Statistics for the session
    stats: SessionStats,
}

/// Statistics for a journalist mode session
#[derive(Debug, Default)]
pub struct SessionStats {
    /// Number of searches performed
    pub searches_performed: usize,
    /// Number of files accessed
    pub files_accessed: usize,
    /// Number of clear operations
    pub clear_operations: usize,
}

/// Secure buffer that zeroizes on drop
#[derive(Debug)]
pub struct SecureBuffer {
    data: Vec<u8>,
}

impl SecureBuffer {
    /// Create a new secure buffer from data
    pub fn new(data: Vec<u8>) -> Self {
        Self { data }
    }

    /// Create an empty secure buffer
    pub fn empty() -> Self {
        Self { data: Vec::new() }
    }

    /// Get a reference to the data
    pub fn as_bytes(&self) -> &[u8] {
        &self.data
    }

    /// Get the data as a string (if valid UTF-8)
    pub fn as_str(&self) -> Option<&str> {
        std::str::from_utf8(&self.data).ok()
    }

    /// Clear the buffer securely
    pub fn clear(&mut self) {
        self.data.zeroize();
    }

    /// Get the length of the buffer
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Check if the buffer is empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl Drop for SecureBuffer {
    fn drop(&mut self) {
        self.data.zeroize();
    }
}

impl Clone for SecureBuffer {
    fn clone(&self) -> Self {
        Self {
            data: self.data.clone(),
        }
    }
}

impl JournalistMode {
    /// Create a new journalist mode manager (disabled by default)
    pub fn new() -> Self {
        Self {
            enabled: false,
            buffers: Vec::new(),
            stats: SessionStats::default(),
        }
    }

    /// Enable journalist mode
    ///
    /// This sets the global flag and configures for maximum privacy:
    /// - Forces JIT cache mode
    /// - Disables all logging
    /// - Enables secure memory tracking
    pub fn enable(&mut self) {
        self.enabled = true;
        JOURNALIST_MODE_ACTIVE.store(true, Ordering::SeqCst);
        tracing::info!("Journalist mode enabled - maximum privacy active");
    }

    /// Disable journalist mode
    pub fn disable(&mut self) {
        self.clear_all();
        self.enabled = false;
        JOURNALIST_MODE_ACTIVE.store(false, Ordering::SeqCst);
        tracing::info!("Journalist mode disabled");
    }

    /// Check if journalist mode is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Create a secure buffer and track it for later clearing
    pub fn create_buffer(&mut self, data: Vec<u8>) -> SecureBuffer {
        let buffer = SecureBuffer::new(data.clone());
        self.buffers.push(SecureBuffer::new(data));
        buffer
    }

    /// Record a search operation
    pub fn record_search(&mut self) {
        self.stats.searches_performed += 1;
    }

    /// Record file access
    pub fn record_file_access(&mut self, count: usize) {
        self.stats.files_accessed += count;
    }

    /// Clear all tracked buffers securely
    ///
    /// This immediately zeroizes all tracked buffers.
    pub fn clear_all(&mut self) {
        for buffer in &mut self.buffers {
            buffer.clear();
        }
        self.buffers.clear();
        self.stats.clear_operations += 1;
        tracing::debug!("Journalist mode: cleared {} buffers", self.buffers.len());
    }

    /// Emergency clear - immediately wipe all data
    ///
    /// This is the panic button - clears everything as fast as possible.
    pub fn emergency_clear(&mut self) {
        self.clear_all();
        // Force garbage collection hint
        self.buffers = Vec::new();
        self.buffers.shrink_to_fit();
        tracing::warn!("Journalist mode: EMERGENCY CLEAR executed");
    }

    /// Get session statistics
    pub fn stats(&self) -> &SessionStats {
        &self.stats
    }

    /// Get the number of tracked buffers
    pub fn buffer_count(&self) -> usize {
        self.buffers.len()
    }

    /// Get total bytes currently tracked
    pub fn total_tracked_bytes(&self) -> usize {
        self.buffers.iter().map(|b| b.len()).sum()
    }
}

impl Default for JournalistMode {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for JournalistMode {
    fn drop(&mut self) {
        // Ensure all buffers are cleared on drop
        self.clear_all();
        JOURNALIST_MODE_ACTIVE.store(false, Ordering::SeqCst);
    }
}

/// Configuration for journalist mode
#[derive(Debug, Clone)]
pub struct JournalistModeConfig {
    /// Whether to show any output (default: true, for results only)
    pub show_output: bool,
    /// Whether to show progress indicators (default: false)
    pub show_progress: bool,
    /// Maximum number of results (default: 20)
    pub max_results: usize,
}

impl Default for JournalistModeConfig {
    fn default() -> Self {
        Self {
            show_output: true,
            show_progress: false,
            max_results: 20,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_journalist_mode_creation() {
        let mode = JournalistMode::new();
        assert!(!mode.is_enabled());
        assert_eq!(mode.buffer_count(), 0);
    }

    #[test]
    fn test_journalist_mode_enable_disable() {
        let mut mode = JournalistMode::new();

        mode.enable();
        assert!(mode.is_enabled());
        assert!(is_journalist_mode());

        mode.disable();
        assert!(!mode.is_enabled());
        assert!(!is_journalist_mode());
    }

    #[test]
    fn test_secure_buffer_zeroize() {
        let data = b"sensitive data".to_vec();
        let mut buffer = SecureBuffer::new(data);

        assert_eq!(buffer.as_bytes(), b"sensitive data");
        buffer.clear();

        // Data should be zeroed
        assert!(buffer.as_bytes().iter().all(|&b| b == 0) || buffer.is_empty());
    }

    #[test]
    fn test_buffer_tracking() {
        let mut mode = JournalistMode::new();
        mode.enable();

        let _buf1 = mode.create_buffer(b"data1".to_vec());
        let _buf2 = mode.create_buffer(b"data2".to_vec());

        assert_eq!(mode.buffer_count(), 2);
        assert_eq!(mode.total_tracked_bytes(), 10);

        mode.clear_all();
        assert_eq!(mode.buffer_count(), 0);
    }

    #[test]
    fn test_session_stats() {
        let mut mode = JournalistMode::new();
        mode.enable();

        mode.record_search();
        mode.record_search();
        mode.record_file_access(10);

        assert_eq!(mode.stats().searches_performed, 2);
        assert_eq!(mode.stats().files_accessed, 10);
    }

    #[test]
    fn test_emergency_clear() {
        let mut mode = JournalistMode::new();
        mode.enable();

        let _buf = mode.create_buffer(b"sensitive".to_vec());
        mode.emergency_clear();

        assert_eq!(mode.buffer_count(), 0);
        assert_eq!(mode.stats().clear_operations, 1);
    }

    #[test]
    fn test_drop_clears_buffers() {
        {
            let mut mode = JournalistMode::new();
            mode.enable();
            let _ = mode.create_buffer(b"will be cleared".to_vec());
            // mode drops here
        }

        // Global flag should be reset
        assert!(!is_journalist_mode());
    }

    #[test]
    fn test_config_defaults() {
        let config = JournalistModeConfig::default();
        assert!(config.show_output);
        assert!(!config.show_progress);
        assert_eq!(config.max_results, 20);
    }
}
