//! Resilience components for file watcher DoS protection
//!
//! This module provides protection against:
//! - **Event flooding**: Rate limiting prevents resource exhaustion
//! - **Duplicate events**: Deduplication within time windows
//! - **Symlink attacks**: Depth tracking prevents infinite recursion
//! - **Coordinated attacks**: Attack detection triggers defensive mode
//!
//! ## Architecture
//!
//! ```text
//! FileEvent
//!     │
//!     ▼
//! ┌─────────────────┐
//! │  AttackDetector │ → If attack detected, enter defensive mode
//! └────────┬────────┘
//!          │
//!          ▼
//! ┌─────────────────┐
//! │  EventLimiter   │ → Rate limit per event type
//! └────────┬────────┘
//!          │
//!          ▼
//! ┌─────────────────┐
//! │   DedupCache    │ → Filter duplicate events
//! └────────┬────────┘
//!          │
//!          ▼
//! ┌─────────────────┐
//! │ SymlinkTracker  │ → Prevent symlink recursion
//! └────────┬────────┘
//!          │
//!          ▼
//!    ProcessedEvent
//! ```

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use super::events::EventType;

/// Configuration for file watcher resilience
#[derive(Debug, Clone)]
pub struct ResilienceConfig {
    /// Maximum events per second per event type (default: 100)
    pub max_events_per_second: usize,
    /// Deduplication time window (default: 100ms)
    pub dedup_window: Duration,
    /// Maximum symlink traversal depth (default: 10)
    pub max_symlink_depth: usize,
    /// Attack detection threshold - events per second (default: 500)
    pub attack_threshold: usize,
    /// Attack detection time window (default: 1 second)
    pub attack_window: Duration,
    /// Reduced rate limit when in defensive mode (default: 10)
    pub defensive_rate_limit: usize,
    /// Extended dedup window in defensive mode (default: 1 second)
    pub defensive_dedup_window: Duration,
}

impl Default for ResilienceConfig {
    fn default() -> Self {
        Self {
            max_events_per_second: 100,
            dedup_window: Duration::from_millis(100),
            max_symlink_depth: 10,
            attack_threshold: 500,
            attack_window: Duration::from_secs(1),
            defensive_rate_limit: 10,
            defensive_dedup_window: Duration::from_secs(1),
        }
    }
}

impl ResilienceConfig {
    /// Create a more permissive configuration for high-throughput scenarios
    pub fn permissive() -> Self {
        Self {
            max_events_per_second: 500,
            dedup_window: Duration::from_millis(50),
            max_symlink_depth: 20,
            attack_threshold: 2000,
            attack_window: Duration::from_secs(1),
            defensive_rate_limit: 50,
            defensive_dedup_window: Duration::from_millis(500),
        }
    }

    /// Create a stricter configuration for sensitive environments
    pub fn strict() -> Self {
        Self {
            max_events_per_second: 50,
            dedup_window: Duration::from_millis(200),
            max_symlink_depth: 5,
            attack_threshold: 200,
            attack_window: Duration::from_secs(1),
            defensive_rate_limit: 5,
            defensive_dedup_window: Duration::from_secs(2),
        }
    }
}

/// Rate limiter for file events
///
/// Limits the number of events processed per event type within a time window.
#[derive(Debug)]
pub struct EventLimiter {
    /// Event counts per type in the current window
    counts: HashMap<EventType, usize>,
    /// Start of the current window
    window_start: Instant,
    /// Maximum events per second
    max_per_second: usize,
}

impl EventLimiter {
    /// Create a new event limiter
    pub fn new(max_per_second: usize) -> Self {
        Self {
            counts: HashMap::new(),
            window_start: Instant::now(),
            max_per_second,
        }
    }

    /// Check if an event is allowed and record it
    ///
    /// Returns `true` if the event is within rate limits.
    pub fn allow(&mut self, event_type: &EventType) -> bool {
        // Reset window if a second has passed
        if self.window_start.elapsed() >= Duration::from_secs(1) {
            self.counts.clear();
            self.window_start = Instant::now();
        }

        let count = self.counts.entry(event_type.clone()).or_insert(0);
        if *count >= self.max_per_second {
            return false;
        }

        *count += 1;
        true
    }

    /// Get the current count for an event type
    pub fn current_count(&self, event_type: &EventType) -> usize {
        *self.counts.get(event_type).unwrap_or(&0)
    }

    /// Get total events across all types in current window
    pub fn total_count(&self) -> usize {
        self.counts.values().sum()
    }

    /// Update the rate limit (for defensive mode)
    pub fn set_limit(&mut self, new_limit: usize) {
        self.max_per_second = new_limit;
    }

    /// Reset the limiter
    pub fn reset(&mut self) {
        self.counts.clear();
        self.window_start = Instant::now();
    }
}

/// Cache for deduplicating rapid duplicate events
///
/// Filters out duplicate events that occur within a short time window.
#[derive(Debug)]
pub struct DedupCache {
    /// Set of recent event keys
    recent: HashSet<String>,
    /// Deduplication window duration
    window: Duration,
    /// Last time the cache was cleaned
    last_cleanup: Instant,
}

impl DedupCache {
    /// Create a new deduplication cache
    pub fn new(window: Duration) -> Self {
        Self {
            recent: HashSet::new(),
            window,
            last_cleanup: Instant::now(),
        }
    }

    /// Check if an event is new (not a duplicate)
    ///
    /// Returns `true` if this is a new event, `false` if duplicate.
    pub fn check_and_add(&mut self, event_key: &str) -> bool {
        // Periodic cleanup
        if self.last_cleanup.elapsed() > self.window {
            self.recent.clear();
            self.last_cleanup = Instant::now();
        }

        if self.recent.contains(event_key) {
            return false;
        }

        self.recent.insert(event_key.to_string());
        true
    }

    /// Get the number of tracked events
    pub fn len(&self) -> usize {
        self.recent.len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.recent.is_empty()
    }

    /// Update the deduplication window
    pub fn set_window(&mut self, new_window: Duration) {
        self.window = new_window;
    }

    /// Force a cleanup of the cache
    pub fn clear(&mut self) {
        self.recent.clear();
        self.last_cleanup = Instant::now();
    }
}

/// Tracker to prevent symlink infinite recursion
///
/// Tracks symlink traversal depth to prevent attacks using circular symlinks.
#[derive(Debug)]
pub struct SymlinkTracker {
    /// Map of canonical paths to traversal depth
    visited: HashMap<PathBuf, usize>,
    /// Maximum allowed depth
    max_depth: usize,
}

impl SymlinkTracker {
    /// Create a new symlink tracker
    pub fn new(max_depth: usize) -> Self {
        Self {
            visited: HashMap::new(),
            max_depth,
        }
    }

    /// Check if traversal of a symlink is allowed
    ///
    /// Returns `true` if the symlink can be followed, `false` if depth exceeded.
    pub fn check_depth(&mut self, path: &Path) -> bool {
        // Try to resolve to canonical path to detect loops
        let canonical = match std::fs::canonicalize(path) {
            Ok(p) => p,
            Err(_) => return false, // Can't resolve, reject for safety
        };

        let depth = self.visited.entry(canonical).or_insert(0);
        if *depth >= self.max_depth {
            return false;
        }

        *depth += 1;
        true
    }

    /// Check depth without incrementing (peek)
    pub fn peek_depth(&self, path: &Path) -> Option<usize> {
        std::fs::canonicalize(path)
            .ok()
            .and_then(|canonical| self.visited.get(&canonical).copied())
    }

    /// Reset tracking for a specific path
    pub fn reset_path(&mut self, path: &Path) {
        if let Ok(canonical) = std::fs::canonicalize(path) {
            self.visited.remove(&canonical);
        }
    }

    /// Clear all tracked paths
    pub fn clear(&mut self) {
        self.visited.clear();
    }

    /// Get the number of tracked paths
    pub fn tracked_count(&self) -> usize {
        self.visited.len()
    }
}

/// Detector for file system attack patterns
///
/// Monitors event rates to detect potential DoS attacks.
#[derive(Debug)]
pub struct AttackDetector {
    /// Recent event timestamps
    event_times: Vec<Instant>,
    /// Attack threshold (events per window)
    threshold: usize,
    /// Detection window
    window: Duration,
    /// Whether we're currently in attack mode
    in_attack_mode: bool,
    /// When attack mode was entered
    attack_mode_started: Option<Instant>,
}

impl AttackDetector {
    /// Create a new attack detector
    pub fn new(threshold: usize, window: Duration) -> Self {
        Self {
            event_times: Vec::new(),
            threshold,
            window,
            in_attack_mode: false,
            attack_mode_started: None,
        }
    }

    /// Record an event and check if under attack
    ///
    /// Returns `true` if an attack is detected.
    pub fn record_and_check(&mut self) -> bool {
        let now = Instant::now();

        // Remove old entries
        self.event_times
            .retain(|t| now.duration_since(*t) < self.window);

        // Add this event
        self.event_times.push(now);

        // Check threshold
        let was_in_attack = self.in_attack_mode;
        self.in_attack_mode = self.event_times.len() >= self.threshold;

        if self.in_attack_mode && !was_in_attack {
            self.attack_mode_started = Some(now);
            tracing::warn!(
                "Attack detected: {} events in {:?} window (threshold: {})",
                self.event_times.len(),
                self.window,
                self.threshold
            );
        }

        self.in_attack_mode
    }

    /// Check if currently in attack mode
    pub fn is_in_attack_mode(&self) -> bool {
        self.in_attack_mode
    }

    /// Get current event count in window
    pub fn current_event_count(&self) -> usize {
        let now = Instant::now();
        self.event_times
            .iter()
            .filter(|t| now.duration_since(**t) < self.window)
            .count()
    }

    /// Get how long we've been in attack mode
    pub fn attack_duration(&self) -> Option<Duration> {
        self.attack_mode_started.map(|start| start.elapsed())
    }

    /// Reset attack mode (call when attack subsides)
    pub fn reset(&mut self) {
        self.in_attack_mode = false;
        self.attack_mode_started = None;
        self.event_times.clear();
    }

    /// Clear old events without resetting attack mode
    pub fn cleanup(&mut self) {
        let now = Instant::now();
        self.event_times
            .retain(|t| now.duration_since(*t) < self.window);

        // Auto-exit attack mode if events dropped below threshold
        if self.in_attack_mode && self.event_times.len() < self.threshold / 2 {
            tracing::info!("Attack appears to have subsided, exiting attack mode");
            self.in_attack_mode = false;
            self.attack_mode_started = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // EventLimiter tests
    #[test]
    fn test_event_limiter_allows_within_limit() {
        let mut limiter = EventLimiter::new(5);

        for _ in 0..5 {
            assert!(limiter.allow(&EventType::Create));
        }
    }

    #[test]
    fn test_event_limiter_blocks_excess() {
        let mut limiter = EventLimiter::new(3);

        assert!(limiter.allow(&EventType::Create));
        assert!(limiter.allow(&EventType::Create));
        assert!(limiter.allow(&EventType::Create));
        assert!(!limiter.allow(&EventType::Create)); // 4th should be blocked
    }

    #[test]
    fn test_event_limiter_separate_types() {
        let mut limiter = EventLimiter::new(2);

        assert!(limiter.allow(&EventType::Create));
        assert!(limiter.allow(&EventType::Create));
        assert!(!limiter.allow(&EventType::Create)); // Blocked

        // Different type should still be allowed
        assert!(limiter.allow(&EventType::Modify));
        assert!(limiter.allow(&EventType::Modify));
        assert!(!limiter.allow(&EventType::Modify)); // Blocked
    }

    #[test]
    fn test_event_limiter_resets_after_window() {
        let mut limiter = EventLimiter::new(1);

        assert!(limiter.allow(&EventType::Create));
        assert!(!limiter.allow(&EventType::Create));

        // Simulate time passing
        std::thread::sleep(Duration::from_millis(1100));

        assert!(limiter.allow(&EventType::Create)); // Should be allowed after window reset
    }

    #[test]
    fn test_event_limiter_total_count() {
        let mut limiter = EventLimiter::new(10);

        limiter.allow(&EventType::Create);
        limiter.allow(&EventType::Create);
        limiter.allow(&EventType::Modify);

        assert_eq!(limiter.total_count(), 3);
    }

    // DedupCache tests
    #[test]
    fn test_dedup_cache_allows_first() {
        let mut cache = DedupCache::new(Duration::from_secs(1));
        assert!(cache.check_and_add("event1"));
    }

    #[test]
    fn test_dedup_cache_blocks_duplicate() {
        let mut cache = DedupCache::new(Duration::from_secs(1));
        assert!(cache.check_and_add("event1"));
        assert!(!cache.check_and_add("event1")); // Duplicate
    }

    #[test]
    fn test_dedup_cache_allows_different_keys() {
        let mut cache = DedupCache::new(Duration::from_secs(1));
        assert!(cache.check_and_add("event1"));
        assert!(cache.check_and_add("event2"));
        assert!(cache.check_and_add("event3"));
    }

    #[test]
    fn test_dedup_cache_clears_after_window() {
        let mut cache = DedupCache::new(Duration::from_millis(50));
        assert!(cache.check_and_add("event1"));
        assert!(!cache.check_and_add("event1")); // Duplicate

        std::thread::sleep(Duration::from_millis(100));

        assert!(cache.check_and_add("event1")); // Should be allowed after window
    }

    #[test]
    fn test_dedup_cache_len() {
        let mut cache = DedupCache::new(Duration::from_secs(1));
        cache.check_and_add("a");
        cache.check_and_add("b");
        cache.check_and_add("c");
        assert_eq!(cache.len(), 3);
    }

    // SymlinkTracker tests
    #[test]
    fn test_symlink_tracker_allows_within_depth() {
        let mut tracker = SymlinkTracker::new(3);

        // Use current directory as a test path
        let path = std::env::current_dir().unwrap();

        assert!(tracker.check_depth(&path));
        assert!(tracker.check_depth(&path));
        assert!(tracker.check_depth(&path));
    }

    #[test]
    fn test_symlink_tracker_blocks_excess_depth() {
        let mut tracker = SymlinkTracker::new(2);

        let path = std::env::current_dir().unwrap();

        assert!(tracker.check_depth(&path)); // Depth 1
        assert!(tracker.check_depth(&path)); // Depth 2
        assert!(!tracker.check_depth(&path)); // Depth 3 - blocked
    }

    #[test]
    fn test_symlink_tracker_clear() {
        let mut tracker = SymlinkTracker::new(1);

        let path = std::env::current_dir().unwrap();

        assert!(tracker.check_depth(&path));
        assert!(!tracker.check_depth(&path));

        tracker.clear();

        assert!(tracker.check_depth(&path)); // Should be allowed after clear
    }

    // AttackDetector tests
    #[test]
    fn test_attack_detector_no_attack_below_threshold() {
        let mut detector = AttackDetector::new(10, Duration::from_secs(1));

        for _ in 0..9 {
            assert!(!detector.record_and_check());
        }
    }

    #[test]
    fn test_attack_detector_triggers_at_threshold() {
        let mut detector = AttackDetector::new(5, Duration::from_secs(1));

        for _ in 0..4 {
            assert!(!detector.record_and_check());
        }
        assert!(detector.record_and_check()); // 5th event triggers
    }

    #[test]
    fn test_attack_detector_stays_in_attack_mode() {
        let mut detector = AttackDetector::new(3, Duration::from_secs(1));

        detector.record_and_check();
        detector.record_and_check();
        detector.record_and_check(); // Triggers

        assert!(detector.is_in_attack_mode());
        assert!(detector.record_and_check()); // Still in attack mode
    }

    #[test]
    fn test_attack_detector_reset() {
        let mut detector = AttackDetector::new(2, Duration::from_secs(1));

        detector.record_and_check();
        detector.record_and_check(); // Triggers

        assert!(detector.is_in_attack_mode());

        detector.reset();

        assert!(!detector.is_in_attack_mode());
        assert_eq!(detector.current_event_count(), 0);
    }

    #[test]
    fn test_attack_detector_event_count() {
        let mut detector = AttackDetector::new(10, Duration::from_secs(1));

        detector.record_and_check();
        detector.record_and_check();
        detector.record_and_check();

        assert_eq!(detector.current_event_count(), 3);
    }

    // ResilienceConfig tests
    #[test]
    fn test_resilience_config_default() {
        let config = ResilienceConfig::default();
        assert_eq!(config.max_events_per_second, 100);
        assert_eq!(config.dedup_window, Duration::from_millis(100));
        assert_eq!(config.max_symlink_depth, 10);
        assert_eq!(config.attack_threshold, 500);
    }

    #[test]
    fn test_resilience_config_permissive() {
        let config = ResilienceConfig::permissive();
        assert!(config.max_events_per_second > ResilienceConfig::default().max_events_per_second);
    }

    #[test]
    fn test_resilience_config_strict() {
        let config = ResilienceConfig::strict();
        assert!(config.max_events_per_second < ResilienceConfig::default().max_events_per_second);
    }
}
