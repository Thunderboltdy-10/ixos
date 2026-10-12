//! Deep Search mode controls and overrides.
//!
//! This module keeps the legacy module path (`journalist_mode`) for crate-level
//! compatibility, but the runtime behavior is now "Deep Search":
//! - wider candidate set
//! - deeper per-file reads
//! - broader text extraction caps

use std::sync::atomic::{AtomicBool, Ordering};

/// Legacy compatibility shim.
///
/// Journalist mode behavior was removed in favor of Deep Search. Callers that
/// still check this should not alter behavior.
pub fn is_journalist_mode() -> bool {
    false
}

/// Global flag indicating deep search is active for the current search.
static DEEP_SEARCH_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Check if deep search is currently active.
pub fn is_deep_search_mode() -> bool {
    DEEP_SEARCH_ACTIVE.load(Ordering::SeqCst)
}

/// Dynamic caps used by search pipeline code.
#[derive(Debug, Clone, Copy)]
pub struct DeepSearchOverrides {
    pub max_candidates: usize,
    pub max_bytes_per_file: usize,
    pub max_text_chars: usize,
}

impl DeepSearchOverrides {
    pub const fn standard() -> Self {
        Self {
            max_candidates: 3000,
            max_bytes_per_file: 64 * 1024,
            max_text_chars: 20_000,
        }
    }

    pub const fn deep() -> Self {
        Self {
            max_candidates: 10_000,
            max_bytes_per_file: 256 * 1024,
            max_text_chars: 80_000,
        }
    }
}

/// Return active search caps based on deep-search mode.
pub fn deep_search_overrides() -> DeepSearchOverrides {
    if is_deep_search_mode() {
        DeepSearchOverrides::deep()
    } else {
        DeepSearchOverrides::standard()
    }
}

#[derive(Debug, Clone)]
pub struct DeepSearchConfig {
    pub max_candidates: usize,
    pub max_bytes_per_file: usize,
    pub max_text_chars: usize,
}

impl Default for DeepSearchConfig {
    fn default() -> Self {
        let caps = DeepSearchOverrides::deep();
        Self {
            max_candidates: caps.max_candidates,
            max_bytes_per_file: caps.max_bytes_per_file,
            max_text_chars: caps.max_text_chars,
        }
    }
}

#[derive(Debug, Default, Clone)]
pub struct DeepSearchStats {
    pub searches_performed: usize,
    pub files_opened: usize,
    pub bytes_read: usize,
    pub cross_refs: usize,
}

#[derive(Debug, Clone, Default)]
pub struct SecureBuffer {
    data: Vec<u8>,
}

impl SecureBuffer {
    pub fn new(data: Vec<u8>) -> Self {
        Self { data }
    }

    pub fn empty() -> Self {
        Self { data: Vec::new() }
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.data
    }

    pub fn as_str(&self) -> Option<&str> {
        std::str::from_utf8(&self.data).ok()
    }

    pub fn clear(&mut self) {
        self.data.clear();
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

/// Deep search runtime manager.
#[derive(Debug, Default)]
pub struct DeepSearchMode {
    enabled: bool,
    pub config: DeepSearchConfig,
    stats: DeepSearchStats,
}

impl DeepSearchMode {
    pub fn new() -> Self {
        Self {
            enabled: false,
            config: DeepSearchConfig::default(),
            stats: DeepSearchStats::default(),
        }
    }

    pub fn enable(&mut self) {
        self.enabled = true;
        DEEP_SEARCH_ACTIVE.store(true, Ordering::SeqCst);
        tracing::info!("Deep Search mode enabled");
    }

    pub fn disable(&mut self) {
        self.enabled = false;
        DEEP_SEARCH_ACTIVE.store(false, Ordering::SeqCst);
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn record_search(&mut self) {
        self.stats.searches_performed += 1;
    }

    pub fn record_file_access(&mut self, count: usize) {
        self.stats.files_opened += count;
    }

    pub fn record_bytes_read(&mut self, bytes: usize) {
        self.stats.bytes_read += bytes;
    }

    pub fn record_cross_ref(&mut self, count: usize) {
        self.stats.cross_refs += count;
    }

    pub fn stats(&self) -> &DeepSearchStats {
        &self.stats
    }

    pub fn summary_line(&self) -> String {
        format!(
            "Deep Search: files_opened={}, bytes_read={}, cross_refs={}",
            self.stats.files_opened, self.stats.bytes_read, self.stats.cross_refs
        )
    }

    // Legacy methods kept for call-site compatibility.
    pub fn create_buffer(&mut self, data: Vec<u8>) -> SecureBuffer {
        SecureBuffer::new(data)
    }

    pub fn clear_all(&mut self) {}

    pub fn emergency_clear(&mut self) {
        self.disable();
    }

    pub fn buffer_count(&self) -> usize {
        0
    }

    pub fn total_tracked_bytes(&self) -> usize {
        0
    }
}

impl Drop for DeepSearchMode {
    fn drop(&mut self) {
        self.disable();
    }
}

/// Compatibility alias for existing imports.
pub type JournalistMode = DeepSearchMode;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deep_search_mode_toggles_global_flag() {
        let mut mode = DeepSearchMode::new();
        assert!(!is_deep_search_mode());
        mode.enable();
        assert!(is_deep_search_mode());
        mode.disable();
        assert!(!is_deep_search_mode());
    }

    #[test]
    fn deep_search_overrides_switch_with_flag() {
        let standard = deep_search_overrides();
        assert_eq!(standard.max_candidates, 3000);

        let mut mode = DeepSearchMode::new();
        mode.enable();
        let deep = deep_search_overrides();
        assert_eq!(deep.max_candidates, 10_000);
        mode.disable();
    }
}
