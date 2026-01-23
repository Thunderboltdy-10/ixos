//! File system watcher with DoS protection
//!
//! This module provides resilient file system monitoring that protects against:
//!
//! - **Event flooding**: Rapid file changes that could exhaust resources
//! - **Symlink attacks**: Circular symlinks causing infinite recursion
//! - **Coordinated attacks**: Patterns designed to overwhelm the system
//!
//! ## Architecture
//!
//! The `ResilientWatcher` processes events through multiple protection layers:
//!
//! 1. **Attack Detection**: Monitors overall event rate
//! 2. **Rate Limiting**: Caps events per type per second
//! 3. **Deduplication**: Filters rapid duplicate events
//! 4. **Symlink Protection**: Prevents deep symlink traversal
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::ixos_watcher::{ResilientWatcher, FileEvent, EventType};
//! use std::path::PathBuf;
//!
//! let mut watcher = ResilientWatcher::new();
//!
//! // Process an event
//! let event = FileEvent::new(PathBuf::from("/path/to/file.txt"), EventType::Modify);
//! if let Some(processed) = watcher.process_event(event) {
//!     println!("Processing: {:?}", processed.path);
//! }
//! ```
//!
//! ## Defensive Mode
//!
//! When an attack is detected (>500 events/sec by default), the watcher
//! enters "defensive mode" with:
//!
//! - Reduced rate limits (10 events/sec per type)
//! - Extended deduplication window (1 second)
//! - Increased logging

pub mod events;
pub mod resilience;

pub use events::{EventType, FileEvent, ProcessedEvent};
pub use resilience::{AttackDetector, DedupCache, EventLimiter, ResilienceConfig, SymlinkTracker};

/// Resilient file watcher with DoS protection
///
/// Wraps file system events with multiple protection layers to prevent
/// resource exhaustion from malicious or accidental event flooding.
#[derive(Debug)]
pub struct ResilientWatcher {
    /// Configuration for resilience parameters
    config: ResilienceConfig,
    /// Rate limiter for events
    event_limiter: EventLimiter,
    /// Deduplication cache
    dedup_cache: DedupCache,
    /// Symlink depth tracker
    symlink_tracker: SymlinkTracker,
    /// Attack detector
    attack_detector: AttackDetector,
    /// Whether we're in defensive mode
    defensive_mode: bool,
    /// Statistics
    stats: WatcherStats,
}

/// Statistics about watcher operation
#[derive(Debug, Default, Clone)]
pub struct WatcherStats {
    /// Total events received
    pub total_events: u64,
    /// Events that passed all filters
    pub passed_events: u64,
    /// Events blocked by rate limiter
    pub rate_limited: u64,
    /// Events blocked by deduplication
    pub deduplicated: u64,
    /// Events blocked by symlink protection
    pub symlink_blocked: u64,
    /// Number of times defensive mode was entered
    pub defensive_mode_entries: u64,
}

impl ResilientWatcher {
    /// Create a new resilient watcher with default configuration
    pub fn new() -> Self {
        Self::with_config(ResilienceConfig::default())
    }

    /// Create a new resilient watcher with custom configuration
    pub fn with_config(config: ResilienceConfig) -> Self {
        Self {
            event_limiter: EventLimiter::new(config.max_events_per_second),
            dedup_cache: DedupCache::new(config.dedup_window),
            symlink_tracker: SymlinkTracker::new(config.max_symlink_depth),
            attack_detector: AttackDetector::new(config.attack_threshold, config.attack_window),
            defensive_mode: false,
            stats: WatcherStats::default(),
            config,
        }
    }

    /// Process a file event through all protection layers
    ///
    /// Returns `Some(ProcessedEvent)` if the event passes all filters,
    /// or `None` if it was blocked.
    pub fn process_event(&mut self, event: FileEvent) -> Option<ProcessedEvent> {
        self.stats.total_events += 1;

        // Check for attack (do this first to potentially enter defensive mode)
        if self.attack_detector.record_and_check() && !self.defensive_mode {
            self.enter_defensive_mode();
        }

        // Rate limiting
        if !self.event_limiter.allow(&event.event_type) {
            self.stats.rate_limited += 1;
            tracing::trace!("Rate limited: {:?} {:?}", event.event_type, event.path);
            return None;
        }

        // Deduplication
        let event_key = event.dedup_key();
        if !self.dedup_cache.check_and_add(&event_key) {
            self.stats.deduplicated += 1;
            tracing::trace!("Deduplicated: {}", event_key);
            return None;
        }

        // Symlink protection
        if event.is_symlink {
            if !self.symlink_tracker.check_depth(&event.path) {
                self.stats.symlink_blocked += 1;
                tracing::warn!("Symlink depth exceeded for: {:?}", event.path);
                return None;
            }
        }

        self.stats.passed_events += 1;
        Some(ProcessedEvent::from(event))
    }

    /// Enter defensive mode with reduced limits
    fn enter_defensive_mode(&mut self) {
        if self.defensive_mode {
            return;
        }

        tracing::warn!(
            "Entering defensive mode due to high event rate ({} events detected)",
            self.attack_detector.current_event_count()
        );

        self.defensive_mode = true;
        self.stats.defensive_mode_entries += 1;

        // Apply defensive settings
        self.event_limiter
            .set_limit(self.config.defensive_rate_limit);
        self.dedup_cache
            .set_window(self.config.defensive_dedup_window);
    }

    /// Exit defensive mode and restore normal limits
    pub fn exit_defensive_mode(&mut self) {
        if !self.defensive_mode {
            return;
        }

        tracing::info!("Exiting defensive mode, restoring normal limits");

        self.defensive_mode = false;

        // Restore normal settings
        self.event_limiter
            .set_limit(self.config.max_events_per_second);
        self.dedup_cache.set_window(self.config.dedup_window);
        self.attack_detector.reset();
    }

    /// Check if currently in defensive mode
    pub fn is_defensive_mode(&self) -> bool {
        self.defensive_mode
    }

    /// Get current statistics
    pub fn stats(&self) -> &WatcherStats {
        &self.stats
    }

    /// Reset statistics
    pub fn reset_stats(&mut self) {
        self.stats = WatcherStats::default();
    }

    /// Get the current configuration
    pub fn config(&self) -> &ResilienceConfig {
        &self.config
    }

    /// Perform periodic maintenance (call periodically)
    ///
    /// - Cleans up old attack detection data
    /// - May auto-exit defensive mode if attack subsides
    pub fn maintenance(&mut self) {
        self.attack_detector.cleanup();

        // Auto-exit defensive mode if attack detector is no longer triggered
        if self.defensive_mode && !self.attack_detector.is_in_attack_mode() {
            self.exit_defensive_mode();
        }
    }

    /// Clear all tracking state
    pub fn clear(&mut self) {
        self.event_limiter.reset();
        self.dedup_cache.clear();
        self.symlink_tracker.clear();
        self.attack_detector.reset();

        if self.defensive_mode {
            self.exit_defensive_mode();
        }
    }
}

impl Default for ResilientWatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn create_event(path: &str, event_type: EventType) -> FileEvent {
        FileEvent::new(PathBuf::from(path), event_type)
    }

    #[test]
    fn test_watcher_creation() {
        let watcher = ResilientWatcher::new();
        assert!(!watcher.is_defensive_mode());
        assert_eq!(watcher.stats().total_events, 0);
    }

    #[test]
    fn test_watcher_processes_normal_event() {
        let mut watcher = ResilientWatcher::new();
        let event = create_event("/test/file.txt", EventType::Modify);

        let result = watcher.process_event(event);
        assert!(result.is_some());
        assert_eq!(watcher.stats().total_events, 1);
        assert_eq!(watcher.stats().passed_events, 1);
    }

    #[test]
    fn test_watcher_rate_limits() {
        let config = ResilienceConfig {
            max_events_per_second: 2,
            ..Default::default()
        };
        let mut watcher = ResilientWatcher::with_config(config);

        // First two should pass
        assert!(watcher
            .process_event(create_event("/a.txt", EventType::Create))
            .is_some());
        assert!(watcher
            .process_event(create_event("/b.txt", EventType::Create))
            .is_some());

        // Third should be rate limited
        assert!(watcher
            .process_event(create_event("/c.txt", EventType::Create))
            .is_none());
        assert_eq!(watcher.stats().rate_limited, 1);
    }

    #[test]
    fn test_watcher_deduplicates() {
        let mut watcher = ResilientWatcher::new();

        // First event passes
        assert!(watcher
            .process_event(create_event("/same.txt", EventType::Modify))
            .is_some());

        // Duplicate should be filtered
        assert!(watcher
            .process_event(create_event("/same.txt", EventType::Modify))
            .is_none());
        assert_eq!(watcher.stats().deduplicated, 1);

        // Different event type should pass
        assert!(watcher
            .process_event(create_event("/same.txt", EventType::Delete))
            .is_some());
    }

    #[test]
    fn test_watcher_enters_defensive_mode() {
        let config = ResilienceConfig {
            attack_threshold: 5,
            attack_window: std::time::Duration::from_secs(10),
            max_events_per_second: 100,
            ..Default::default()
        };
        let mut watcher = ResilientWatcher::with_config(config);

        // Generate enough unique events to trigger attack detection
        for i in 0..6 {
            let event = create_event(&format!("/file{}.txt", i), EventType::Create);
            watcher.process_event(event);
        }

        assert!(watcher.is_defensive_mode());
        assert_eq!(watcher.stats().defensive_mode_entries, 1);
    }

    #[test]
    fn test_watcher_exit_defensive_mode() {
        let config = ResilienceConfig {
            attack_threshold: 3,
            ..Default::default()
        };
        let mut watcher = ResilientWatcher::with_config(config);

        // Trigger defensive mode
        for i in 0..4 {
            watcher.process_event(create_event(&format!("/f{}.txt", i), EventType::Create));
        }
        assert!(watcher.is_defensive_mode());

        // Exit defensive mode
        watcher.exit_defensive_mode();
        assert!(!watcher.is_defensive_mode());
    }

    #[test]
    fn test_watcher_stats() {
        let mut watcher = ResilientWatcher::new();

        watcher.process_event(create_event("/a.txt", EventType::Create));
        watcher.process_event(create_event("/a.txt", EventType::Create)); // Dup
        watcher.process_event(create_event("/b.txt", EventType::Modify));

        let stats = watcher.stats();
        assert_eq!(stats.total_events, 3);
        assert_eq!(stats.passed_events, 2);
        assert_eq!(stats.deduplicated, 1);
    }

    #[test]
    fn test_watcher_reset_stats() {
        let mut watcher = ResilientWatcher::new();
        watcher.process_event(create_event("/test.txt", EventType::Create));

        assert_eq!(watcher.stats().total_events, 1);

        watcher.reset_stats();
        assert_eq!(watcher.stats().total_events, 0);
    }

    #[test]
    fn test_watcher_clear() {
        let config = ResilienceConfig {
            attack_threshold: 2,
            ..Default::default()
        };
        let mut watcher = ResilientWatcher::with_config(config);

        // Trigger defensive mode
        for i in 0..3 {
            watcher.process_event(create_event(&format!("/f{}.txt", i), EventType::Create));
        }
        assert!(watcher.is_defensive_mode());

        watcher.clear();
        assert!(!watcher.is_defensive_mode());
    }

    #[test]
    fn test_watcher_with_permissive_config() {
        let watcher = ResilientWatcher::with_config(ResilienceConfig::permissive());
        assert_eq!(watcher.config().max_events_per_second, 500);
    }

    #[test]
    fn test_watcher_with_strict_config() {
        let watcher = ResilientWatcher::with_config(ResilienceConfig::strict());
        assert_eq!(watcher.config().max_events_per_second, 50);
    }

    #[test]
    fn test_watcher_maintenance_auto_exits_defensive() {
        let config = ResilienceConfig {
            attack_threshold: 3,
            attack_window: std::time::Duration::from_millis(50),
            ..Default::default()
        };
        let mut watcher = ResilientWatcher::with_config(config);

        // Trigger defensive mode
        for i in 0..4 {
            watcher.process_event(create_event(&format!("/f{}.txt", i), EventType::Create));
        }
        assert!(watcher.is_defensive_mode());

        // Wait for attack window to pass
        std::thread::sleep(std::time::Duration::from_millis(100));

        // Maintenance should auto-exit defensive mode
        watcher.maintenance();
        assert!(!watcher.is_defensive_mode());
    }
}
