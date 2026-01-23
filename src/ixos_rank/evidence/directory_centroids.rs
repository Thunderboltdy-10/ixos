//! Directory Centroids (P6)
//!
//! Maintains semantic centroids for directories to enable directory-aware relevance.
//! Uses Exponential Moving Average (EMA) to update centroids incrementally.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

/// Configuration for directory centroids
#[derive(Debug, Clone)]
pub struct CentroidConfig {
    /// EMA alpha for centroid updates (0-1, higher = more weight to new samples)
    pub ema_alpha: f32,

    /// Minimum files needed to compute a centroid
    pub min_files: usize,

    /// Maximum age before centroid is considered stale
    pub max_age: Duration,

    /// Hotness threshold (files accessed per hour)
    pub hotness_threshold: f32,

    /// Maximum number of directories to track
    pub max_directories: usize,
}

impl Default for CentroidConfig {
    fn default() -> Self {
        Self {
            ema_alpha: 0.1,
            min_files: 3,
            max_age: Duration::from_secs(3600), // 1 hour
            hotness_threshold: 5.0,
            max_directories: 1000,
        }
    }
}

/// Centroid for a single directory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryCentroid {
    /// The directory path
    pub path: PathBuf,

    /// Centroid embedding vector
    pub embedding: Vec<f32>,

    /// Number of files contributing to this centroid
    pub file_count: usize,

    /// Hotness score (based on access frequency)
    pub hotness: f32,

    /// When the centroid was last updated
    #[serde(skip)]
    pub last_updated: Option<Instant>,

    /// File access timestamps (for hotness calculation)
    #[serde(skip)]
    access_timestamps: Vec<Instant>,

    /// Semantic theme detected for this directory
    pub theme: Option<String>,
}

impl DirectoryCentroid {
    /// Create a new centroid for a directory
    pub fn new(path: PathBuf, embedding: Vec<f32>) -> Self {
        Self {
            path,
            embedding,
            file_count: 1,
            hotness: 0.0,
            last_updated: Some(Instant::now()),
            access_timestamps: Vec::new(),
            theme: None,
        }
    }

    /// Update centroid with a new embedding using EMA
    pub fn update_embedding(&mut self, new_embedding: &[f32], alpha: f32) {
        if self.embedding.len() != new_embedding.len() {
            // Dimension mismatch, replace entirely
            self.embedding = new_embedding.to_vec();
            self.file_count = 1;
        } else {
            // EMA update: new = alpha * sample + (1-alpha) * old
            for (old, new) in self.embedding.iter_mut().zip(new_embedding.iter()) {
                *old = alpha * new + (1.0 - alpha) * *old;
            }
            self.file_count += 1;
        }
        self.last_updated = Some(Instant::now());
    }

    /// Record a file access
    pub fn record_access(&mut self) {
        let now = Instant::now();
        self.access_timestamps.push(now);

        // Cleanup old timestamps (older than 1 hour)
        let one_hour_ago = now - Duration::from_secs(3600);
        self.access_timestamps.retain(|t| *t > one_hour_ago);

        // Update hotness (accesses per hour)
        self.hotness = self.access_timestamps.len() as f32;
    }

    /// Check if centroid is stale
    pub fn is_stale(&self, max_age: Duration) -> bool {
        match self.last_updated {
            Some(t) => t.elapsed() > max_age,
            None => true,
        }
    }

    /// Calculate cosine similarity with another embedding
    pub fn similarity(&self, other: &[f32]) -> f32 {
        if self.embedding.len() != other.len() {
            return 0.0;
        }

        let dot: f32 = self
            .embedding
            .iter()
            .zip(other.iter())
            .map(|(a, b)| a * b)
            .sum();
        let norm_self: f32 = self.embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_other: f32 = other.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm_self == 0.0 || norm_other == 0.0 {
            return 0.0;
        }

        dot / (norm_self * norm_other)
    }

    /// Check if this directory is "hot"
    pub fn is_hot(&self, threshold: f32) -> bool {
        self.hotness >= threshold
    }
}

/// Manager for all directory centroids
pub struct DirectoryCentroids {
    /// Centroids indexed by directory path
    centroids: HashMap<PathBuf, DirectoryCentroid>,

    /// Configuration
    config: CentroidConfig,
}

impl DirectoryCentroids {
    /// Create a new centroid manager
    pub fn new(config: CentroidConfig) -> Self {
        Self {
            centroids: HashMap::new(),
            config,
        }
    }

    /// Create with default configuration
    pub fn default_config() -> Self {
        Self::new(CentroidConfig::default())
    }

    /// Update or create centroid for a directory
    pub fn update(&mut self, directory: &Path, file_embedding: &[f32]) {
        let dir_path = directory.to_path_buf();

        if let Some(centroid) = self.centroids.get_mut(&dir_path) {
            centroid.update_embedding(file_embedding, self.config.ema_alpha);
        } else {
            // Check capacity
            if self.centroids.len() >= self.config.max_directories {
                self.evict_stale();
            }

            let centroid = DirectoryCentroid::new(dir_path.clone(), file_embedding.to_vec());
            self.centroids.insert(dir_path, centroid);
        }
    }

    /// Record a file access in a directory
    pub fn record_access(&mut self, directory: &Path) {
        if let Some(centroid) = self.centroids.get_mut(directory) {
            centroid.record_access();
        }
    }

    /// Get centroid for a directory
    pub fn get(&self, directory: &Path) -> Option<&DirectoryCentroid> {
        self.centroids.get(directory)
    }

    /// Get similarity to directory centroid
    pub fn similarity(&self, directory: &Path, embedding: &[f32]) -> Option<f32> {
        self.centroids
            .get(directory)
            .map(|c| c.similarity(embedding))
    }

    /// Check if directory is hot
    pub fn is_hot(&self, directory: &Path) -> bool {
        self.centroids
            .get(directory)
            .map(|c| c.is_hot(self.config.hotness_threshold))
            .unwrap_or(false)
    }

    /// Get all hot directories
    pub fn hot_directories(&self) -> Vec<&PathBuf> {
        self.centroids
            .iter()
            .filter(|(_, c)| c.is_hot(self.config.hotness_threshold))
            .map(|(p, _)| p)
            .collect()
    }

    /// Evict stale centroids
    fn evict_stale(&mut self) {
        self.centroids
            .retain(|_, c| !c.is_stale(self.config.max_age));

        // If still over capacity, evict least hot
        if self.centroids.len() >= self.config.max_directories {
            let mut entries: Vec<_> = self.centroids.drain().collect();
            entries.sort_by(|a, b| b.1.hotness.partial_cmp(&a.1.hotness).unwrap());
            entries.truncate(self.config.max_directories - 100); // Leave room for growth
            self.centroids = entries.into_iter().collect();
        }
    }

    /// Get statistics
    pub fn stats(&self) -> CentroidStats {
        let hot_count = self
            .centroids
            .values()
            .filter(|c| c.is_hot(self.config.hotness_threshold))
            .count();

        let avg_file_count = if self.centroids.is_empty() {
            0.0
        } else {
            self.centroids
                .values()
                .map(|c| c.file_count as f32)
                .sum::<f32>()
                / self.centroids.len() as f32
        };

        CentroidStats {
            total_directories: self.centroids.len(),
            hot_directories: hot_count,
            avg_files_per_directory: avg_file_count,
        }
    }

    /// Clear all centroids
    pub fn clear(&mut self) {
        self.centroids.clear();
    }

    /// Get directories sorted by relevance to a query embedding
    pub fn rank_directories(&self, query_embedding: &[f32], limit: usize) -> Vec<(&PathBuf, f32)> {
        let mut ranked: Vec<_> = self
            .centroids
            .iter()
            .map(|(path, centroid)| {
                let similarity = centroid.similarity(query_embedding);
                let hot_bonus = if centroid.is_hot(self.config.hotness_threshold) {
                    0.1
                } else {
                    0.0
                };
                (path, similarity + hot_bonus)
            })
            .collect();

        ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        ranked.truncate(limit);
        ranked
    }
}

/// Statistics about centroids
#[derive(Debug, Clone)]
pub struct CentroidStats {
    pub total_directories: usize,
    pub hot_directories: usize,
    pub avg_files_per_directory: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_embedding(seed: f32) -> Vec<f32> {
        (0..64).map(|i| (i as f32 * seed).sin()).collect()
    }

    #[test]
    fn test_centroid_creation() {
        let centroid = DirectoryCentroid::new(PathBuf::from("/test"), test_embedding(1.0));
        assert_eq!(centroid.file_count, 1);
        assert_eq!(centroid.embedding.len(), 64);
    }

    #[test]
    fn test_centroid_ema_update() {
        let mut centroid = DirectoryCentroid::new(PathBuf::from("/test"), vec![1.0, 0.0, 0.0]);

        centroid.update_embedding(&[0.0, 1.0, 0.0], 0.5);

        // EMA: 0.5 * [0,1,0] + 0.5 * [1,0,0] = [0.5, 0.5, 0]
        assert!((centroid.embedding[0] - 0.5).abs() < 0.001);
        assert!((centroid.embedding[1] - 0.5).abs() < 0.001);
        assert_eq!(centroid.file_count, 2);
    }

    #[test]
    fn test_centroid_similarity() {
        let centroid = DirectoryCentroid::new(PathBuf::from("/test"), vec![1.0, 0.0, 0.0]);

        // Same vector = similarity 1.0
        assert!((centroid.similarity(&[1.0, 0.0, 0.0]) - 1.0).abs() < 0.001);

        // Orthogonal = similarity 0.0
        assert!((centroid.similarity(&[0.0, 1.0, 0.0])).abs() < 0.001);
    }

    #[test]
    fn test_centroid_hotness() {
        let mut centroid = DirectoryCentroid::new(PathBuf::from("/test"), vec![1.0]);

        assert!(!centroid.is_hot(5.0));

        // Record 5 accesses
        for _ in 0..5 {
            centroid.record_access();
        }

        assert!(centroid.is_hot(5.0));
    }

    #[test]
    fn test_centroids_manager() {
        let mut manager = DirectoryCentroids::default_config();

        manager.update(Path::new("/test/dir1"), &test_embedding(1.0));
        manager.update(Path::new("/test/dir2"), &test_embedding(2.0));

        assert_eq!(manager.stats().total_directories, 2);
    }

    #[test]
    fn test_centroids_hot_directories() {
        let mut manager = DirectoryCentroids::new(CentroidConfig {
            hotness_threshold: 3.0,
            ..Default::default()
        });

        manager.update(Path::new("/test/hot"), &test_embedding(1.0));
        manager.update(Path::new("/test/cold"), &test_embedding(2.0));

        // Make one directory hot
        for _ in 0..5 {
            manager.record_access(Path::new("/test/hot"));
        }

        let hot = manager.hot_directories();
        assert_eq!(hot.len(), 1);
        assert_eq!(*hot[0], PathBuf::from("/test/hot"));
    }
}
