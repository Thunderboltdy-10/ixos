//! Secure Ranking with Integrity Verification
//!
//! This module provides tamper-resistant ranking that defends against:
//!
//! - **Timing attacks**: Rapidly modifying files to influence recency bias
//! - **File manipulation**: Creating keyword-stuffed content
//! - **Bot patterns**: Automated queries designed to influence rankings
//!
//! ## Composite Scoring
//!
//! The final score is a weighted combination:
//!
//! ```text
//! final_score =
//!     semantic_score * 0.4 +    // From hybrid engine
//!     integrity_score * 0.3 +   // Penalizes suspiciously recent modifications
//!     temporal_score * 0.1 +    // Favors older, stable files
//!     behavior_score * 0.2      // Penalizes bot-like access
//! ```
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::ixos_rank::secure_ranker::{SecureRanker, Candidate};
//! use std::path::PathBuf;
//!
//! let mut ranker = SecureRanker::new();
//!
//! let candidates = vec![
//!     Candidate::new(PathBuf::from("/docs/report.txt"), 0.85),
//!     Candidate::new(PathBuf::from("/docs/notes.md"), 0.72),
//! ];
//!
//! let results = ranker.rank("quarterly report", candidates);
//! for result in results {
//!     println!("{}: {:.2} (verified: {})",
//!         result.path.display(),
//!         result.score,
//!         result.integrity_verified
//!     );
//! }
//! ```

use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

use crate::ixos_rank::personal_ranker::{normalize_open_score, recency_factor};
use crate::journalist_mode::is_journalist_mode;
use crate::security::crypto::sha256_file;
use crate::storage::personal_ranking::get_personal_signals;

use super::types::EvidenceSummary;

/// Default integrity cache TTL (5 minutes)
pub const DEFAULT_INTEGRITY_TTL: Duration = Duration::from_secs(300);

/// Default threshold for "recently modified" files (5 minutes)
pub const DEFAULT_RECENT_MODIFICATION_THRESHOLD: Duration = Duration::from_secs(300);

/// Default max age for temporal scoring (30 days)
pub const DEFAULT_MAX_AGE_FOR_TEMPORAL: Duration = Duration::from_secs(30 * 24 * 3600);

/// Default behavior model window (10 minutes)
pub const DEFAULT_BEHAVIOR_WINDOW: Duration = Duration::from_secs(600);

/// Default rapid access threshold (5 accesses in window = bot-like)
pub const DEFAULT_RAPID_ACCESS_THRESHOLD: usize = 5;

// =============================================================================
// Configuration
// =============================================================================

/// Configuration for secure ranking
#[derive(Debug, Clone)]
pub struct SecureRankerConfig {
    /// How long to cache integrity verification (default: 5 min)
    pub integrity_ttl: Duration,

    /// Weight for semantic similarity score (default: 0.4)
    pub semantic_weight: f32,

    /// Weight for integrity score (default: 0.3)
    pub integrity_weight: f32,

    /// Weight for temporal score (default: 0.1)
    pub temporal_weight: f32,

    /// Weight for behavior score (default: 0.2)
    pub behavior_weight: f32,

    /// Files modified more recently than this get reduced integrity score (default: 5 min)
    pub recent_modification_threshold: Duration,

    /// Max age for temporal scoring, files older get max score (default: 30 days)
    pub max_age_for_temporal_score: Duration,

    /// Window for behavior model tracking (default: 10 min)
    pub behavior_window: Duration,

    /// Number of accesses in window that triggers bot detection (default: 5)
    pub rapid_access_threshold: usize,

    /// Enables learned personal signals (open score + recency).
    pub personal_ranking_enabled: bool,

    /// Global multiplier for personal boost.
    pub personal_weight: f32,

    /// Only apply learned personalization above this base score.
    pub base_threshold: f32,
}

impl Default for SecureRankerConfig {
    fn default() -> Self {
        Self {
            integrity_ttl: DEFAULT_INTEGRITY_TTL,
            semantic_weight: 0.4,
            integrity_weight: 0.3,
            temporal_weight: 0.1,
            behavior_weight: 0.2,
            recent_modification_threshold: DEFAULT_RECENT_MODIFICATION_THRESHOLD,
            max_age_for_temporal_score: DEFAULT_MAX_AGE_FOR_TEMPORAL,
            behavior_window: DEFAULT_BEHAVIOR_WINDOW,
            rapid_access_threshold: DEFAULT_RAPID_ACCESS_THRESHOLD,
            personal_ranking_enabled: false,
            personal_weight: 0.15,
            base_threshold: 0.1,
        }
    }
}

impl SecureRankerConfig {
    /// Create config with custom score weights
    pub fn with_weights(semantic: f32, integrity: f32, temporal: f32, behavior: f32) -> Self {
        Self {
            semantic_weight: semantic,
            integrity_weight: integrity,
            temporal_weight: temporal,
            behavior_weight: behavior,
            ..Default::default()
        }
    }

    /// Create config with strict security settings
    pub fn strict() -> Self {
        Self {
            integrity_ttl: Duration::from_secs(60), // 1 min cache
            recent_modification_threshold: Duration::from_secs(600), // 10 min = suspicious
            rapid_access_threshold: 3,              // Lower threshold for bot detection
            ..Default::default()
        }
    }

    /// Create config with relaxed settings (for testing)
    pub fn relaxed() -> Self {
        Self {
            integrity_ttl: Duration::from_secs(3600), // 1 hour cache
            recent_modification_threshold: Duration::from_secs(60), // 1 min = suspicious
            rapid_access_threshold: 10,               // Higher threshold
            ..Default::default()
        }
    }
}

// =============================================================================
// Types
// =============================================================================

/// Candidate file from hybrid search engine
#[derive(Debug, Clone)]
pub struct Candidate {
    /// Path to the candidate file
    pub path: PathBuf,

    /// Similarity score from semantic engine [0.0, 1.0]
    pub similarity: f32,
}

impl Candidate {
    /// Create a new candidate
    pub fn new(path: PathBuf, similarity: f32) -> Self {
        Self { path, similarity }
    }
}

/// Final ranked result with integrity verification
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedResult {
    /// Path to the ranked file
    pub path: PathBuf,

    /// Final composite score [0.0, 1.0]
    pub score: f32,

    /// Whether integrity verification passed
    pub integrity_verified: bool,

    /// Breakdown of individual scores (for debugging)
    pub score_breakdown: ScoreBreakdown,

    /// Context snippet showing where the match occurred
    pub context_snippet: Option<crate::ixos_rank::snippet::ContextSnippet>,
    /// Optional evidence summary (top-K only)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<EvidenceSummary>,
}

impl RankedResult {
    /// Create a new ranked result
    pub fn new(
        path: PathBuf,
        score: f32,
        integrity_verified: bool,
        breakdown: ScoreBreakdown,
    ) -> Self {
        Self {
            path,
            score,
            integrity_verified,
            score_breakdown: breakdown,
            context_snippet: None,
            evidence: None,
        }
    }

    /// Create a new ranked result with context snippet
    pub fn with_context(
        path: PathBuf,
        score: f32,
        integrity_verified: bool,
        breakdown: ScoreBreakdown,
        context: crate::ixos_rank::snippet::ContextSnippet,
    ) -> Self {
        Self {
            path,
            score,
            integrity_verified,
            score_breakdown: breakdown,
            context_snippet: Some(context),
            evidence: None,
        }
    }
}

/// Breakdown of individual scoring components
#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct ScoreBreakdown {
    /// Semantic similarity score (from hybrid engine)
    pub semantic: f32,
    /// Integrity score (based on modification time)
    pub integrity: f32,
    /// Temporal score (based on file age)
    pub temporal: f32,
    /// Behavior score (based on access patterns)
    pub behavior: f32,
    /// Personal score component (learned + manual pin/ignore)
    pub personal: f32,
}

// =============================================================================
// File Integrity Cache
// =============================================================================

/// Cached integrity information for a file
#[derive(Debug, Clone)]
struct FileIntegrity {
    /// SHA256 hash of file content
    /// Used by hash_matches() for integrity verification
    #[allow(dead_code)]
    content_hash: [u8; 32],
    /// When the hash was last computed
    last_verified: Instant,
}

impl FileIntegrity {
    fn new(content_hash: [u8; 32]) -> Self {
        Self {
            content_hash,
            last_verified: Instant::now(),
        }
    }

    fn is_valid(&self, ttl: Duration) -> bool {
        self.last_verified.elapsed() < ttl
    }

    /// Check if the stored hash matches the given hash
    /// Returns true if hashes match (file unchanged), false otherwise
    fn hash_matches(&self, current_hash: &[u8; 32]) -> bool {
        self.content_hash == *current_hash
    }
}

// =============================================================================
// User Behavior Model
// =============================================================================

/// Tracks user behavior to detect bot-like patterns
#[derive(Debug)]
pub struct UserBehaviorModel {
    /// Recent query history (timestamp, query)
    query_history: VecDeque<(Instant, String)>,

    /// Access patterns per file (timestamps of accesses)
    access_patterns: HashMap<PathBuf, Vec<Instant>>,

    /// Time window for tracking
    window: Duration,

    /// Threshold for rapid access detection
    rapid_threshold: usize,
}

impl UserBehaviorModel {
    /// Create a new behavior model
    pub fn new(window: Duration, rapid_threshold: usize) -> Self {
        Self {
            query_history: VecDeque::new(),
            access_patterns: HashMap::new(),
            window,
            rapid_threshold,
        }
    }

    /// Record a query
    pub fn record_query(&mut self, query: &str) {
        self.cleanup_old_entries();
        self.query_history
            .push_back((Instant::now(), query.to_string()));
    }

    /// Record a file access
    pub fn record_access(&mut self, path: &Path) {
        self.cleanup_old_entries();
        self.access_patterns
            .entry(path.to_path_buf())
            .or_default()
            .push(Instant::now());
    }

    /// Get behavior score for a file (1.0 = normal, lower = suspicious)
    pub fn get_score(&self, path: &Path, _query: &str) -> f32 {
        // Check for rapid access pattern
        if let Some(accesses) = self.access_patterns.get(path) {
            let recent_count = accesses
                .iter()
                .filter(|t| t.elapsed() < self.window)
                .count();

            if recent_count >= self.rapid_threshold {
                // Bot-like rapid access pattern detected
                return 0.2;
            }

            if recent_count >= self.rapid_threshold / 2 {
                // Suspicious but not definitive
                return 0.5;
            }
        }

        // Check for repetitive query patterns
        let recent_queries: Vec<_> = self
            .query_history
            .iter()
            .filter(|(t, _)| t.elapsed() < self.window)
            .collect();

        if recent_queries.len() >= self.rapid_threshold {
            // Many queries in short time window
            return 0.6;
        }

        // Normal behavior
        1.0
    }

    /// Clean up entries older than the window
    fn cleanup_old_entries(&mut self) {
        // Clean query history
        while let Some((time, _)) = self.query_history.front() {
            if time.elapsed() > self.window {
                self.query_history.pop_front();
            } else {
                break;
            }
        }

        // Clean access patterns
        for accesses in self.access_patterns.values_mut() {
            accesses.retain(|t| t.elapsed() < self.window);
        }

        // Remove empty entries
        self.access_patterns.retain(|_, v| !v.is_empty());
    }

    /// Get the number of tracked files
    pub fn tracked_files(&self) -> usize {
        self.access_patterns.len()
    }

    /// Get the number of recent queries
    pub fn recent_query_count(&self) -> usize {
        self.query_history
            .iter()
            .filter(|(t, _)| t.elapsed() < self.window)
            .count()
    }
}

// =============================================================================
// Secure Ranker
// =============================================================================

/// Tamper-resistant file ranker with integrity verification
#[derive(Debug)]
pub struct SecureRanker {
    /// Cached integrity information per file
    integrity_cache: HashMap<PathBuf, FileIntegrity>,

    /// User behavior model for bot detection
    behavior_model: UserBehaviorModel,

    /// Configuration
    config: SecureRankerConfig,
}

impl SecureRanker {
    /// Create a new secure ranker with default configuration
    pub fn new() -> Self {
        Self::with_config(SecureRankerConfig::default())
    }

    /// Create a new secure ranker with custom configuration
    pub fn with_config(config: SecureRankerConfig) -> Self {
        Self {
            integrity_cache: HashMap::new(),
            behavior_model: UserBehaviorModel::new(
                config.behavior_window,
                config.rapid_access_threshold,
            ),
            config,
        }
    }

    /// Rank candidates with security-aware scoring
    ///
    /// Files that fail integrity verification are excluded from results.
    pub fn rank(&mut self, query: &str, candidates: Vec<Candidate>) -> Vec<RankedResult> {
        // Record the query for behavior tracking
        self.behavior_model.record_query(query);

        let mut results = Vec::new();

        for candidate in candidates {
            // Verify integrity - skip files that fail
            if !self.verify_integrity(&candidate.path) {
                tracing::warn!("Integrity check failed, excluding: {:?}", candidate.path);
                continue;
            }

            // Calculate individual scores
            let semantic_score = candidate.similarity;
            let integrity_score = self.calculate_integrity_score(&candidate.path);
            let temporal_score = self.calculate_temporal_score(&candidate.path);
            let behavior_score = self.behavior_model.get_score(&candidate.path, query);

            // Record access for behavior tracking
            self.behavior_model.record_access(&candidate.path);

            // Composite weighted score
            let base_score = semantic_score * self.config.semantic_weight
                + integrity_score * self.config.integrity_weight
                + temporal_score * self.config.temporal_weight
                + behavior_score * self.config.behavior_weight;

            let mut personal_component = 0.0;
            if !is_journalist_mode() && base_score >= self.config.base_threshold {
                if let Ok(Some(signals)) = get_personal_signals(&candidate.path) {
                    let mut boost = 0.0;
                    if self.config.personal_ranking_enabled {
                        let now = SystemTime::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();
                        let open = normalize_open_score(signals.open_score);
                        let recency = recency_factor(signals.last_open_ts, now);
                        boost += 0.45 * open + 0.35 * recency;
                    }

                    if signals.pinned {
                        boost += 0.5;
                    }
                    if signals.ignored {
                        boost -= 0.8;
                    }
                    personal_component = boost;
                }
            }

            let final_score = base_score + self.config.personal_weight * personal_component;

            let breakdown = ScoreBreakdown {
                semantic: semantic_score,
                integrity: integrity_score,
                temporal: temporal_score,
                behavior: behavior_score,
                personal: personal_component,
            };

            results.push(RankedResult::new(
                candidate.path,
                final_score,
                true,
                breakdown,
            ));
        }

        // Sort by score descending
        results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results
    }

    /// Verify file integrity (readable and cacheable)
    ///
    /// Returns true if the file exists, a hash can be computed, and if cached,
    /// the hash hasn't changed (file wasn't modified while in cache).
    /// Uses cached hash if still valid (within TTL).
    pub fn verify_integrity(&mut self, path: &Path) -> bool {
        // Compute current hash
        let current_hash = match sha256_file(path) {
            Ok(hash) => hash,
            Err(e) => {
                tracing::debug!("Failed to verify integrity for {:?}: {}", path, e);
                return false;
            }
        };

        // Check cache - if entry exists and is valid, verify hash hasn't changed
        if let Some(integrity) = self.integrity_cache.get(path) {
            if integrity.is_valid(self.config.integrity_ttl) {
                if integrity.hash_matches(&current_hash) {
                    tracing::trace!("Using cached integrity for {:?} (hash unchanged)", path);
                    return true;
                } else {
                    // File was modified while cached - suspicious activity
                    tracing::warn!(
                        "File {:?} was modified while in integrity cache - possible tampering",
                        path
                    );
                    // Update cache with new hash but return false to flag this
                    self.integrity_cache
                        .insert(path.to_path_buf(), FileIntegrity::new(current_hash));
                    return false;
                }
            }
        }

        // No valid cache entry - store the new hash
        self.integrity_cache
            .insert(path.to_path_buf(), FileIntegrity::new(current_hash));
        true
    }

    /// Calculate integrity score based on file modification time
    ///
    /// - Returns 1.0 for normal files
    /// - Returns 0.3 for recently modified files (<5 min)
    /// - Does not penalize `created == modified` alone (common on copied/extracted files)
    pub fn calculate_integrity_score(&self, path: &Path) -> f32 {
        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => return 0.0, // Can't read = no score
        };

        let now = SystemTime::now();
        let modified = metadata.modified().unwrap_or(now);
        let created = metadata.created().ok();

        // Check for recently modified (potentially manipulated)
        if let Ok(time_since_modified) = now.duration_since(modified) {
            if time_since_modified < self.config.recent_modification_threshold {
                tracing::debug!("Recently modified file: {:?}", path);
                return 0.3;
            }
        }

        if let Some(created_time) = created {
            if let (Ok(mod_duration), Ok(create_duration)) = (
                modified.duration_since(SystemTime::UNIX_EPOCH),
                created_time.duration_since(SystemTime::UNIX_EPOCH),
            ) {
                // On Windows and on copied/extracted corpora, created ~= modified is normal.
                // Treat it as informational only to avoid crushing relevance quality.
                if mod_duration.abs_diff(create_duration) < Duration::from_secs(1) {
                    tracing::trace!(
                        "created ~= modified observed (no integrity penalty applied): {:?}",
                        path
                    );
                }
            }
        }

        // Normal file
        1.0
    }

    /// Calculate temporal score based on file age
    ///
    /// Older, stable files get higher scores (up to 1.0 at max_age).
    pub fn calculate_temporal_score(&self, path: &Path) -> f32 {
        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => return 0.0,
        };

        let now = SystemTime::now();
        let created = metadata.created().unwrap_or(now);

        let age = now.duration_since(created).unwrap_or(Duration::ZERO);
        let max_age = self.config.max_age_for_temporal_score;

        // Linear scale from 0 to 1 based on age
        let score = age.as_secs_f32() / max_age.as_secs_f32();
        score.min(1.0)
    }

    /// Get the number of cached integrity entries
    pub fn cache_size(&self) -> usize {
        self.integrity_cache.len()
    }

    /// Clear the integrity cache
    pub fn clear_cache(&mut self) {
        self.integrity_cache.clear();
    }

    /// Get reference to behavior model (for testing)
    pub fn behavior_model(&self) -> &UserBehaviorModel {
        &self.behavior_model
    }

    /// Get immutable configuration.
    pub fn config(&self) -> &SecureRankerConfig {
        &self.config
    }

    /// Get mutable configuration.
    pub fn config_mut(&mut self) -> &mut SecureRankerConfig {
        &mut self.config
    }
}

impl Default for SecureRanker {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    // -------------------------------------------------------------------------
    // Configuration Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_config_default() {
        let config = SecureRankerConfig::default();
        assert_eq!(config.semantic_weight, 0.4);
        assert_eq!(config.integrity_weight, 0.3);
        assert_eq!(config.temporal_weight, 0.1);
        assert_eq!(config.behavior_weight, 0.2);
        assert_eq!(config.integrity_ttl, Duration::from_secs(300));
    }

    #[test]
    fn test_config_weights_sum_to_one() {
        let config = SecureRankerConfig::default();
        let sum = config.semantic_weight
            + config.integrity_weight
            + config.temporal_weight
            + config.behavior_weight;
        assert!((sum - 1.0).abs() < 0.001, "Weights should sum to 1.0");
    }

    #[test]
    fn test_config_custom_weights() {
        let config = SecureRankerConfig::with_weights(0.5, 0.2, 0.2, 0.1);
        assert_eq!(config.semantic_weight, 0.5);
        assert_eq!(config.integrity_weight, 0.2);
        assert_eq!(config.temporal_weight, 0.2);
        assert_eq!(config.behavior_weight, 0.1);
    }

    #[test]
    fn test_config_strict() {
        let config = SecureRankerConfig::strict();
        assert!(config.integrity_ttl < Duration::from_secs(120));
        assert!(config.rapid_access_threshold < 5);
    }

    #[test]
    fn test_config_relaxed() {
        let config = SecureRankerConfig::relaxed();
        assert!(config.integrity_ttl > Duration::from_secs(1800));
        assert!(config.rapid_access_threshold > 5);
    }

    // -------------------------------------------------------------------------
    // Candidate Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_candidate_creation() {
        let candidate = Candidate::new(PathBuf::from("/test/file.txt"), 0.85);
        assert_eq!(candidate.path, PathBuf::from("/test/file.txt"));
        assert_eq!(candidate.similarity, 0.85);
    }

    // -------------------------------------------------------------------------
    // Integrity Verification Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_verify_integrity_new_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        let mut ranker = SecureRanker::new();
        assert!(ranker.verify_integrity(&file_path));
        assert_eq!(ranker.cache_size(), 1);
    }

    #[test]
    fn test_verify_integrity_cached() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        let mut ranker = SecureRanker::new();

        // First verification computes hash
        assert!(ranker.verify_integrity(&file_path));

        // Second uses cache
        assert!(ranker.verify_integrity(&file_path));
        assert_eq!(ranker.cache_size(), 1);
    }

    #[test]
    fn test_verify_integrity_nonexistent_file() {
        let mut ranker = SecureRanker::new();
        assert!(!ranker.verify_integrity(Path::new("/nonexistent/file.txt")));
    }

    #[test]
    fn test_verify_integrity_after_clear_cache() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        let mut ranker = SecureRanker::new();
        assert!(ranker.verify_integrity(&file_path));
        assert_eq!(ranker.cache_size(), 1);

        ranker.clear_cache();
        assert_eq!(ranker.cache_size(), 0);
    }

    // -------------------------------------------------------------------------
    // Integrity Score Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_integrity_score_normal_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("old_file.txt");
        fs::write(&file_path, "test content").unwrap();

        // Modify the file time to simulate an old file
        let ranker = SecureRanker::new();

        // Note: We can't easily test "old" files without mocking time
        // This test verifies the function runs without error
        let score = ranker.calculate_integrity_score(&file_path);
        // New files will be "recently modified" since we just created them
        assert!(score > 0.0);
    }

    #[test]
    fn test_integrity_score_nonexistent_file() {
        let ranker = SecureRanker::new();
        let score = ranker.calculate_integrity_score(Path::new("/nonexistent/file.txt"));
        assert_eq!(score, 0.0);
    }

    // -------------------------------------------------------------------------
    // Temporal Score Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_temporal_score_new_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("new_file.txt");
        fs::write(&file_path, "test content").unwrap();

        let ranker = SecureRanker::new();
        let score = ranker.calculate_temporal_score(&file_path);

        // New file should have low temporal score
        assert!(score < 0.1, "New file should have low temporal score");
    }

    #[test]
    fn test_temporal_score_capped_at_one() {
        let ranker = SecureRanker::new();

        // Even if we can't create truly old files, verify the score is capped
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        let score = ranker.calculate_temporal_score(&file_path);
        assert!(score <= 1.0, "Score should be capped at 1.0");
    }

    #[test]
    fn test_temporal_score_nonexistent_file() {
        let ranker = SecureRanker::new();
        let score = ranker.calculate_temporal_score(Path::new("/nonexistent/file.txt"));
        assert_eq!(score, 0.0);
    }

    // -------------------------------------------------------------------------
    // Behavior Model Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_behavior_model_records_access() {
        let mut model = UserBehaviorModel::new(Duration::from_secs(60), 5);
        let path = PathBuf::from("/test/file.txt");

        model.record_access(&path);
        assert_eq!(model.tracked_files(), 1);
    }

    #[test]
    fn test_behavior_model_records_query() {
        let mut model = UserBehaviorModel::new(Duration::from_secs(60), 5);

        model.record_query("test query");
        assert_eq!(model.recent_query_count(), 1);
    }

    #[test]
    fn test_behavior_model_detects_rapid_access() {
        let mut model = UserBehaviorModel::new(Duration::from_secs(60), 3);
        let path = PathBuf::from("/test/file.txt");

        // Access the same file rapidly
        for _ in 0..3 {
            model.record_access(&path);
        }

        let score = model.get_score(&path, "query");
        assert!(score < 0.5, "Rapid access should lower score: {}", score);
    }

    #[test]
    fn test_behavior_model_normal_usage() {
        let model = UserBehaviorModel::new(Duration::from_secs(60), 5);
        let path = PathBuf::from("/test/file.txt");

        // No accesses recorded
        let score = model.get_score(&path, "query");
        assert_eq!(score, 1.0, "Normal usage should have full score");
    }

    #[test]
    fn test_behavior_model_suspicious_access() {
        let mut model = UserBehaviorModel::new(Duration::from_secs(60), 6);
        let path = PathBuf::from("/test/file.txt");

        // Access the same file somewhat rapidly (threshold/2 = 3)
        for _ in 0..3 {
            model.record_access(&path);
        }

        let score = model.get_score(&path, "query");
        assert!(
            score >= 0.5 && score < 1.0,
            "Suspicious access should partially lower score"
        );
    }

    // -------------------------------------------------------------------------
    // Ranking Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_rank_empty_candidates() {
        let mut ranker = SecureRanker::new();
        let results = ranker.rank("test query", vec![]);
        assert!(results.is_empty());
    }

    #[test]
    fn test_rank_excludes_failed_integrity() {
        let mut ranker = SecureRanker::new();

        // Create candidates with one non-existent file
        let candidates = vec![
            Candidate::new(PathBuf::from("/nonexistent/file1.txt"), 0.9),
            Candidate::new(PathBuf::from("/nonexistent/file2.txt"), 0.8),
        ];

        let results = ranker.rank("query", candidates);
        assert!(results.is_empty(), "Non-existent files should be excluded");
    }

    #[test]
    fn test_rank_with_valid_files() {
        let temp_dir = TempDir::new().unwrap();

        // Create test files
        let file1 = temp_dir.path().join("file1.txt");
        let file2 = temp_dir.path().join("file2.txt");
        fs::write(&file1, "content 1").unwrap();
        fs::write(&file2, "content 2").unwrap();

        let mut ranker = SecureRanker::new();

        let candidates = vec![
            Candidate::new(file1.clone(), 0.9),
            Candidate::new(file2.clone(), 0.7),
        ];

        let results = ranker.rank("query", candidates);
        assert_eq!(results.len(), 2, "Both valid files should be ranked");
        assert!(results[0].integrity_verified);
        assert!(results[1].integrity_verified);
    }

    #[test]
    fn test_rank_sorting() {
        let temp_dir = TempDir::new().unwrap();

        // Create test files
        let file1 = temp_dir.path().join("file1.txt");
        let file2 = temp_dir.path().join("file2.txt");
        let file3 = temp_dir.path().join("file3.txt");
        fs::write(&file1, "content 1").unwrap();
        fs::write(&file2, "content 2").unwrap();
        fs::write(&file3, "content 3").unwrap();

        let mut ranker = SecureRanker::new();

        // Give different similarities
        let candidates = vec![
            Candidate::new(file1.clone(), 0.5),
            Candidate::new(file2.clone(), 0.9),
            Candidate::new(file3.clone(), 0.2),
        ];

        let results = ranker.rank("query", candidates);
        assert_eq!(results.len(), 3);

        // Results should be sorted by score descending
        assert!(results[0].score >= results[1].score);
        assert!(results[1].score >= results[2].score);
    }

    #[test]
    fn test_rank_includes_score_breakdown() {
        let temp_dir = TempDir::new().unwrap();
        let file = temp_dir.path().join("test.txt");
        fs::write(&file, "test content").unwrap();

        let mut ranker = SecureRanker::new();

        let candidates = vec![Candidate::new(file.clone(), 0.85)];

        let results = ranker.rank("query", candidates);
        assert_eq!(results.len(), 1);

        let breakdown = &results[0].score_breakdown;
        assert_eq!(breakdown.semantic, 0.85);
        assert!(breakdown.integrity >= 0.0 && breakdown.integrity <= 1.0);
        assert!(breakdown.temporal >= 0.0 && breakdown.temporal <= 1.0);
        assert!(breakdown.behavior >= 0.0 && breakdown.behavior <= 1.0);
    }

    #[test]
    fn test_rank_composite_scoring() {
        let temp_dir = TempDir::new().unwrap();
        let file = temp_dir.path().join("test.txt");
        fs::write(&file, "test content").unwrap();

        let config = SecureRankerConfig::with_weights(1.0, 0.0, 0.0, 0.0);
        let mut ranker = SecureRanker::with_config(config);

        let candidates = vec![Candidate::new(file.clone(), 0.75)];

        let results = ranker.rank("query", candidates);
        assert_eq!(results.len(), 1);

        // With only semantic weight, score should be close to similarity
        let score = results[0].score;
        assert!(
            (score - 0.75).abs() < 0.01,
            "Score {} should be close to 0.75",
            score
        );
    }

    // -------------------------------------------------------------------------
    // Integration Tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_ranker_default_creation() {
        let ranker = SecureRanker::default();
        assert_eq!(ranker.cache_size(), 0);
    }

    #[test]
    fn test_ranker_with_custom_config() {
        let config = SecureRankerConfig::strict();
        let ranker = SecureRanker::with_config(config);
        assert_eq!(ranker.cache_size(), 0);
    }

    #[test]
    fn test_ranker_behavior_model_access() {
        let mut ranker = SecureRanker::new();
        assert_eq!(ranker.behavior_model().tracked_files(), 0);

        // Rank some files to trigger behavior tracking
        let temp_dir = TempDir::new().unwrap();
        let file = temp_dir.path().join("test.txt");
        fs::write(&file, "test").unwrap();

        let candidates = vec![Candidate::new(file, 0.5)];
        ranker.rank("query", candidates);

        assert_eq!(ranker.behavior_model().tracked_files(), 1);
    }
}
