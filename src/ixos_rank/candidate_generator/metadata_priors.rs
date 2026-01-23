//! P2.3: Metadata Priors
//!
//! Apply recency, hot folders, and file type priors to candidate scoring.

use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::time::{Duration, SystemTime};

/// Configuration for metadata-based scoring priors
#[derive(Debug, Clone)]
pub struct MetadataPriors {
    /// Recency decay half-life (files older than this get ~0.5 recency score)
    pub recency_half_life: Duration,
    /// Hot folders (recently accessed or frequently used directories)
    pub hot_folders: HashSet<String>,
    /// File type priors: extension -> score multiplier (0.0 to 1.0)
    pub type_priors: HashMap<String, f32>,
    /// Size caps: skip files larger than this
    pub max_file_size: u64,
    /// Minimum file size (skip tiny files)
    pub min_file_size: u64,
}

impl Default for MetadataPriors {
    fn default() -> Self {
        let mut type_priors = HashMap::new();

        // Fast to parse - high prior
        type_priors.insert("txt".into(), 1.0);
        type_priors.insert("md".into(), 1.0);
        type_priors.insert("rs".into(), 0.95);
        type_priors.insert("py".into(), 0.95);
        type_priors.insert("js".into(), 0.9);
        type_priors.insert("ts".into(), 0.9);
        type_priors.insert("json".into(), 0.85);
        type_priors.insert("yaml".into(), 0.85);
        type_priors.insert("yml".into(), 0.85);
        type_priors.insert("toml".into(), 0.85);
        type_priors.insert("xml".into(), 0.8);
        type_priors.insert("html".into(), 0.8);
        type_priors.insert("css".into(), 0.8);
        type_priors.insert("csv".into(), 0.8);
        type_priors.insert("log".into(), 0.7);

        // Code files
        type_priors.insert("java".into(), 0.9);
        type_priors.insert("go".into(), 0.9);
        type_priors.insert("c".into(), 0.85);
        type_priors.insert("cpp".into(), 0.85);
        type_priors.insert("h".into(), 0.85);
        type_priors.insert("hpp".into(), 0.85);
        type_priors.insert("rb".into(), 0.85);
        type_priors.insert("php".into(), 0.8);
        type_priors.insert("sh".into(), 0.75);
        type_priors.insert("bat".into(), 0.7);
        type_priors.insert("ps1".into(), 0.7);

        // Slow to parse - low prior (defer to evidence phase)
        type_priors.insert("pdf".into(), 0.3);
        type_priors.insert("docx".into(), 0.3);
        type_priors.insert("doc".into(), 0.25);
        type_priors.insert("xlsx".into(), 0.25);
        type_priors.insert("xls".into(), 0.25);
        type_priors.insert("pptx".into(), 0.2);

        // Binary/skip by default
        type_priors.insert("exe".into(), 0.0);
        type_priors.insert("dll".into(), 0.0);
        type_priors.insert("so".into(), 0.0);
        type_priors.insert("dylib".into(), 0.0);
        type_priors.insert("bin".into(), 0.0);
        type_priors.insert("o".into(), 0.0);
        type_priors.insert("obj".into(), 0.0);

        // Archives
        type_priors.insert("zip".into(), 0.1);
        type_priors.insert("tar".into(), 0.1);
        type_priors.insert("gz".into(), 0.1);
        type_priors.insert("7z".into(), 0.1);
        type_priors.insert("rar".into(), 0.1);

        // Images (usually not text-searchable)
        type_priors.insert("png".into(), 0.05);
        type_priors.insert("jpg".into(), 0.05);
        type_priors.insert("jpeg".into(), 0.05);
        type_priors.insert("gif".into(), 0.05);
        type_priors.insert("svg".into(), 0.3); // SVG is XML

        Self {
            recency_half_life: Duration::from_secs(7 * 24 * 3600), // 7 days
            hot_folders: HashSet::new(),
            type_priors,
            max_file_size: 10 * 1024 * 1024, // 10MB
            min_file_size: 1,                // At least 1 byte
        }
    }
}

impl MetadataPriors {
    /// Create with custom recency half-life
    pub fn with_recency_half_life(half_life: Duration) -> Self {
        Self {
            recency_half_life: half_life,
            ..Default::default()
        }
    }

    /// Add a hot folder
    pub fn add_hot_folder(&mut self, folder: impl Into<String>) {
        self.hot_folders.insert(folder.into());
    }

    /// Set type prior for an extension
    pub fn set_type_prior(&mut self, ext: impl Into<String>, prior: f32) {
        self.type_priors.insert(ext.into(), prior.clamp(0.0, 1.0));
    }

    /// Calculate recency score based on modification time
    ///
    /// Uses exponential decay: score = 0.5^(age/half_life)
    /// - Recently modified files (< half_life ago): score > 0.5
    /// - Files exactly half_life old: score = 0.5
    /// - Older files: score < 0.5, approaching 0
    pub fn recency_score(&self, mtime: SystemTime) -> f32 {
        let age = SystemTime::now()
            .duration_since(mtime)
            .unwrap_or(Duration::MAX);

        let half_life_secs = self.recency_half_life.as_secs_f32();
        let age_secs = age.as_secs_f32();

        // Exponential decay: 0.5^(age/half_life)
        (0.5_f32).powf(age_secs / half_life_secs)
    }

    /// Calculate hot folder boost
    ///
    /// Returns 1.0 if the file is in a hot folder, 0.5 otherwise
    pub fn folder_score(&self, path: &Path) -> f32 {
        if self.hot_folders.is_empty() {
            return 0.5; // Neutral if no hot folders defined
        }

        let path_str = path.to_string_lossy();

        for folder in &self.hot_folders {
            if path_str.contains(folder) {
                return 1.0; // Hot folder match
            }
        }

        0.3 // Not in a hot folder
    }

    /// Get type prior for a file extension
    ///
    /// Returns the configured prior for the extension, or 0.5 for unknown types
    pub fn type_prior(&self, ext: Option<&str>) -> f32 {
        ext.and_then(|e| self.type_priors.get(&e.to_lowercase()))
            .copied()
            .unwrap_or(0.5) // Unknown types get neutral score
    }

    /// Get type prior from path
    pub fn type_prior_for_path(&self, path: &Path) -> f32 {
        self.type_prior(path.extension().map(|e| e.to_str().unwrap_or("")))
    }

    /// Check if file size is within acceptable range
    pub fn is_size_acceptable(&self, size_bytes: u64) -> bool {
        size_bytes >= self.min_file_size && size_bytes <= self.max_file_size
    }

    /// Calculate all priors for a file and return combined score boost
    pub fn calculate_priors(
        &self,
        path: &Path,
        mtime: SystemTime,
        _size_bytes: u64,
    ) -> PriorScores {
        PriorScores {
            recency: self.recency_score(mtime),
            folder: self.folder_score(path),
            type_prior: self.type_prior_for_path(path),
        }
    }
}

/// Prior scores for a single file
#[derive(Debug, Clone, Copy)]
pub struct PriorScores {
    /// Recency score (0.0 - 1.0)
    pub recency: f32,
    /// Folder boost (0.0 - 1.0)
    pub folder: f32,
    /// File type prior (0.0 - 1.0)
    pub type_prior: f32,
}

impl PriorScores {
    /// Calculate weighted average of priors
    pub fn weighted_average(&self, weights: &PriorWeights) -> f32 {
        let total_weight = weights.recency + weights.folder + weights.type_prior;
        if total_weight == 0.0 {
            return 0.5;
        }

        (self.recency * weights.recency
            + self.folder * weights.folder
            + self.type_prior * weights.type_prior)
            / total_weight
    }
}

/// Weights for combining priors
#[derive(Debug, Clone, Copy)]
pub struct PriorWeights {
    pub recency: f32,
    pub folder: f32,
    pub type_prior: f32,
}

impl Default for PriorWeights {
    fn default() -> Self {
        Self {
            recency: 0.5,
            folder: 0.2,
            type_prior: 0.3,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recency_score_recent() {
        let priors = MetadataPriors::default();

        // File modified just now should have score close to 1.0
        let now = SystemTime::now();
        let score = priors.recency_score(now);
        assert!(score > 0.9, "Recent file should have high score: {}", score);
    }

    #[test]
    fn test_recency_score_old() {
        let priors = MetadataPriors::default();

        // File modified 30 days ago should have low score
        let old_time = SystemTime::now() - Duration::from_secs(30 * 24 * 3600);
        let score = priors.recency_score(old_time);
        assert!(score < 0.1, "Old file should have low score: {}", score);
    }

    #[test]
    fn test_recency_score_half_life() {
        let priors = MetadataPriors::default();

        // File modified exactly half_life ago should have score ~0.5
        let half_life_ago = SystemTime::now() - priors.recency_half_life;
        let score = priors.recency_score(half_life_ago);
        assert!(
            (score - 0.5).abs() < 0.1,
            "Half-life file should have score ~0.5: {}",
            score
        );
    }

    #[test]
    fn test_type_prior_text() {
        let priors = MetadataPriors::default();

        assert_eq!(priors.type_prior(Some("txt")), 1.0);
        assert_eq!(priors.type_prior(Some("md")), 1.0);
    }

    #[test]
    fn test_type_prior_code() {
        let priors = MetadataPriors::default();

        assert!(priors.type_prior(Some("rs")) > 0.9);
        assert!(priors.type_prior(Some("py")) > 0.9);
    }

    #[test]
    fn test_type_prior_binary() {
        let priors = MetadataPriors::default();

        assert_eq!(priors.type_prior(Some("exe")), 0.0);
        assert_eq!(priors.type_prior(Some("dll")), 0.0);
    }

    #[test]
    fn test_type_prior_unknown() {
        let priors = MetadataPriors::default();

        // Unknown extension should get neutral score
        assert_eq!(priors.type_prior(Some("xyz123")), 0.5);
        assert_eq!(priors.type_prior(None), 0.5);
    }

    #[test]
    fn test_hot_folder() {
        let mut priors = MetadataPriors::default();
        priors.add_hot_folder("projects");
        priors.add_hot_folder("important");

        let hot_path = Path::new("/home/user/projects/report.txt");
        let cold_path = Path::new("/home/user/archive/old.txt");

        assert_eq!(priors.folder_score(hot_path), 1.0);
        assert!(priors.folder_score(cold_path) < 0.5);
    }

    #[test]
    fn test_size_acceptable() {
        let priors = MetadataPriors::default();

        assert!(priors.is_size_acceptable(1000));
        assert!(priors.is_size_acceptable(5 * 1024 * 1024)); // 5MB
        assert!(!priors.is_size_acceptable(0));
        assert!(!priors.is_size_acceptable(100 * 1024 * 1024)); // 100MB
    }
}
