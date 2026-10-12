//! File content prefetcher (P2.3)
//!
//! Prefetches file content on hover to reduce latency when opening files.

use lru::LruCache;
use parking_lot::Mutex;
use std::collections::HashSet;
use std::num::NonZeroUsize;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;

/// Maximum number of files to cache
const MAX_CACHED_FILES: usize = 50;
/// Maximum file size to prefetch (1MB)
const MAX_FILE_SIZE: u64 = 1024 * 1024;

/// File content prefetcher with LRU cache
pub struct FilePrefetcher {
    cache: Arc<Mutex<LruCache<PathBuf, String>>>,
    pending: Arc<Mutex<HashSet<PathBuf>>>,
}

impl FilePrefetcher {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(Mutex::new(LruCache::new(
                NonZeroUsize::new(MAX_CACHED_FILES).unwrap(),
            ))),
            pending: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    /// Prefetch a file's content in the background
    pub async fn prefetch(&self, path: PathBuf) {
        // Skip if already cached or pending
        {
            let cache = self.cache.lock();
            if cache.contains(&path) {
                return;
            }
        }
        {
            let mut pending = self.pending.lock();
            if pending.contains(&path) {
                return;
            }
            pending.insert(path.clone());
        }

        // Read file in background
        let cache = self.cache.clone();
        let pending = self.pending.clone();

        tokio::spawn(async move {
            if let Ok(metadata) = fs::metadata(&path).await {
                if metadata.len() <= MAX_FILE_SIZE {
                    if let Ok(content) = fs::read_to_string(&path).await {
                        cache.lock().put(path.clone(), content);
                    }
                }
            }
            pending.lock().remove(&path);
        });
    }

    /// Get cached content for a file
    pub fn get_cached(&self, path: &Path) -> Option<String> {
        self.cache.lock().get(&path.to_path_buf()).cloned()
    }

    /// Clear all cached content
    pub fn clear(&self) {
        self.cache.lock().clear();
        self.pending.lock().clear();
    }

    /// Get number of cached files
    pub fn cache_size(&self) -> usize {
        self.cache.lock().len()
    }

    /// Get number of pending prefetch operations
    pub fn pending_count(&self) -> usize {
        self.pending.lock().len()
    }

    /// Synchronous prefetch that schedules the async work
    ///
    /// This can be called from a blocking context. It spawns the async
    /// prefetch operation on the current runtime.
    pub fn prefetch_sync(&self, path: PathBuf) {
        // Skip if already cached or pending
        {
            let cache = self.cache.lock();
            if cache.contains(&path) {
                return;
            }
        }
        {
            let mut pending = self.pending.lock();
            if pending.contains(&path) {
                return;
            }
            pending.insert(path.clone());
        }

        // Clone arcs for the spawned task
        let cache = self.cache.clone();
        let pending = self.pending.clone();

        // Spawn the actual file reading on the tokio runtime
        // This uses spawn_blocking internally for file I/O
        std::thread::spawn(move || {
            // Read file synchronously
            if let Ok(metadata) = std::fs::metadata(&path) {
                if metadata.len() <= MAX_FILE_SIZE {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        cache.lock().put(path.clone(), content);
                    }
                }
            }
            pending.lock().remove(&path);
        });
    }
}

impl Default for FilePrefetcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_prefetch_small_file() {
        let prefetcher = FilePrefetcher::new();

        // Create a temporary file
        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "test content").unwrap();
        let path = temp_file.path().to_path_buf();

        // Prefetch the file
        prefetcher.prefetch(path.clone()).await;

        // Wait a bit for the background task
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Check if it's cached
        let cached = prefetcher.get_cached(&path);
        assert!(cached.is_some());
        assert_eq!(cached.unwrap(), "test content");
    }

    #[tokio::test]
    async fn test_prefetch_nonexistent_file() {
        let prefetcher = FilePrefetcher::new();
        let path = PathBuf::from("/nonexistent/file.txt");

        prefetcher.prefetch(path.clone()).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let cached = prefetcher.get_cached(&path);
        assert!(cached.is_none());
    }

    #[tokio::test]
    async fn test_cache_clear() {
        let prefetcher = FilePrefetcher::new();

        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "test").unwrap();
        let path = temp_file.path().to_path_buf();

        prefetcher.prefetch(path.clone()).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        assert!(prefetcher.cache_size() > 0);

        prefetcher.clear();
        assert_eq!(prefetcher.cache_size(), 0);
    }

    #[test]
    fn test_cache_size_tracking() {
        let prefetcher = FilePrefetcher::new();
        assert_eq!(prefetcher.cache_size(), 0);
        assert_eq!(prefetcher.pending_count(), 0);
    }
}
