//! Null cache implementation (pure JIT mode)
//!
//! Used as fallback when no filesystem-based caching is available:
//! - FAT32, exFAT filesystems (no xattr/ADS support)
//! - Cloud sync folders (OneDrive, Dropbox strip metadata)
//! - Network drives (SMB/NFS often don't support metadata)
//!
//! In this mode, embeddings are generated on every search (pure JIT).
//! This provides maximum privacy at the cost of repeated computation.

use super::{CacheError, EmbeddingCache};
use std::path::Path;

/// No-op cache for unsupported filesystems
///
/// Always returns cache misses and silently discards writes.
/// This enables Ixos to work on any filesystem with graceful degradation.
pub struct NullCache;

impl NullCache {
    /// Create a new NullCache
    ///
    /// This is essentially a no-op but maintains API consistency.
    pub fn new() -> Self {
        Self
    }

    /// NullCache always reports as supported (it's the fallback)
    pub fn is_supported_static(_path: &Path) -> bool {
        true
    }
}

impl Default for NullCache {
    fn default() -> Self {
        Self::new()
    }
}

impl EmbeddingCache for NullCache {
    /// Always returns None (cache miss)
    ///
    /// In pure JIT mode, every file needs fresh embedding generation.
    fn get(&self, _path: &Path, _file_hash: &[u8; 32]) -> Result<Option<Vec<f32>>, CacheError> {
        tracing::trace!("NullCache: cache miss (pure JIT mode)");
        Ok(None)
    }

    /// Silently discards the embedding
    ///
    /// No storage is performed in pure JIT mode.
    fn set(
        &self,
        _path: &Path,
        _file_hash: &[u8; 32],
        _embedding: &[f32],
    ) -> Result<(), CacheError> {
        tracing::trace!("NullCache: discarding embedding (pure JIT mode)");
        Ok(())
    }

    /// No-op delete
    fn delete(&self, _path: &Path) -> Result<(), CacheError> {
        Ok(())
    }

    fn contains(&self, _path: &Path) -> bool {
        false
    }

    /// Always returns true (NullCache is the universal fallback)
    fn is_supported(&self, _path: &Path) -> bool {
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_null_cache_always_misses() {
        let cache = NullCache::new();
        let path = Path::new("/test/file.txt");
        let hash = [0u8; 32];

        let result = cache.get(&path, &hash).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_null_cache_set_succeeds() {
        let cache = NullCache::new();
        let path = Path::new("/test/file.txt");
        let hash = [0u8; 32];
        let embedding = vec![0.1, 0.2, 0.3];

        // Set should succeed silently
        let result = cache.set(&path, &hash, &embedding);
        assert!(result.is_ok());
    }

    #[test]
    fn test_null_cache_delete_succeeds() {
        let cache = NullCache::new();
        let path = Path::new("/test/file.txt");

        let result = cache.delete(&path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_null_cache_always_supported() {
        let cache = NullCache::new();
        assert!(cache.is_supported(Path::new("/any/path")));
        assert!(NullCache::is_supported_static(Path::new("/any/path")));
    }
}
