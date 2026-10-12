//! LMDB sidecar cache implementation
//!
//! Provides a persistent embedding cache for filesystems that don't support
//! extended attributes (FAT32, exFAT) or NTFS ADS (USB drives, network shares).
//!
//! The cache uses LMDB (Lightning Memory-Mapped Database) for fast key-value storage:
//! - Location: the user's application cache under ixos/embeddings
//! - Key: SHA256(normalized_absolute_path)
//! - Value: dimension-aware signed embedding (same format as ADS/xattr caches)
//! - Size cap: 50MB maximum database size
//!
//! This cache is shared across searches and survives process exit. No files are
//! created alongside searched documents.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::security::crypto::sha256;
use heed::types::Bytes;
use heed::{Database, Env, EnvOpenOptions};
use parking_lot::Mutex;

use super::{CacheError, EmbeddingCache, MetadataValidator, ValidatorError};
use crate::security::crypto::load_or_create_key;

/// Maximum database size: 50MB
const MAX_DB_SIZE: usize = 50 * 1024 * 1024;

/// LMDB-backed sidecar cache for non-xattr/ADS filesystems
pub struct LmdbSidecarCache {
    env: Arc<Env>,
    db: Database<Bytes, Bytes>,
    validator: MetadataValidator,
    cache_dir: PathBuf,
    /// Lock to serialize write operations
    write_lock: Mutex<()>,
}

impl LmdbSidecarCache {
    /// Create a new LMDB sidecar cache
    ///
    /// Creates the cache directory if it doesn't exist. The cache uses a persistent
    /// HMAC key loaded from the user's config directory.
    pub fn new() -> Result<Self, LmdbCacheError> {
        Self::new_with_fingerprint([0u8; 32])
    }

    /// Create a new LMDB sidecar cache with an explicit model fingerprint.
    pub fn new_with_fingerprint(model_fingerprint: [u8; 32]) -> Result<Self, LmdbCacheError> {
        let cache_dir = Self::get_cache_dir();
        Self::with_cache_dir(cache_dir, false, model_fingerprint)
    }

    /// Create a new LMDB sidecar cache at a custom directory
    ///
    /// # Arguments
    /// * `cache_dir` - Directory where the LMDB database will be stored
    /// * `_owns_cache` - Retained for API compatibility; dropping a shared cache never deletes it
    pub fn with_cache_dir(
        cache_dir: PathBuf,
        _owns_cache: bool,
        model_fingerprint: [u8; 32],
    ) -> Result<Self, LmdbCacheError> {
        // Ensure the cache directory exists
        std::fs::create_dir_all(&cache_dir).map_err(LmdbCacheError::CreateDir)?;

        // Open LMDB environment with 50MB size limit
        let env = unsafe {
            EnvOpenOptions::new()
                .map_size(MAX_DB_SIZE)
                .max_dbs(1)
                .open(&cache_dir)
                .map_err(LmdbCacheError::OpenEnv)?
        };

        // Create or open the embeddings database
        let mut wtxn = env.write_txn().map_err(LmdbCacheError::Transaction)?;
        let db: Database<Bytes, Bytes> = env
            .create_database(&mut wtxn, Some("embeddings"))
            .map_err(LmdbCacheError::CreateDb)?;
        wtxn.commit().map_err(LmdbCacheError::Commit)?;

        // Load the HMAC key for signature validation
        let key = load_or_create_key();
        let validator = MetadataValidator::new(&key, model_fingerprint);

        tracing::info!("LMDB sidecar cache opened at {:?}", cache_dir);

        Ok(Self {
            env: Arc::new(env),
            db,
            validator,
            cache_dir,
            write_lock: Mutex::new(()),
        })
    }

    /// Create cache with a custom validator (for testing)
    pub fn with_validator(
        cache_dir: PathBuf,
        validator: MetadataValidator,
    ) -> Result<Self, LmdbCacheError> {
        std::fs::create_dir_all(&cache_dir).map_err(LmdbCacheError::CreateDir)?;

        let env = unsafe {
            EnvOpenOptions::new()
                .map_size(MAX_DB_SIZE)
                .max_dbs(1)
                .open(&cache_dir)
                .map_err(LmdbCacheError::OpenEnv)?
        };

        let mut wtxn = env.write_txn().map_err(LmdbCacheError::Transaction)?;
        let db: Database<Bytes, Bytes> = env
            .create_database(&mut wtxn, Some("embeddings"))
            .map_err(LmdbCacheError::CreateDb)?;
        wtxn.commit().map_err(LmdbCacheError::Commit)?;

        Ok(Self {
            env: Arc::new(env),
            db,
            validator,
            cache_dir,
            write_lock: Mutex::new(()),
        })
    }

    /// Get the default cache directory
    ///
    /// Returns:
    /// Uses the platform application cache, with a temporary-directory fallback.
    pub fn get_cache_dir() -> PathBuf {
        dirs::cache_dir()
            .unwrap_or_else(std::env::temp_dir)
            .join("ixos")
            .join("embeddings")
    }

    /// One slot per file, like ADS/xattr. The signed value validates model and
    /// source identities. Presence/deletion also work for generic cache commands.
    fn make_key(path: &Path) -> [u8; 32] {
        let absolute = std::fs::canonicalize(path).unwrap_or_else(|_| {
            if path.is_absolute() {
                path.to_path_buf()
            } else {
                std::env::current_dir().unwrap_or_default().join(path)
            }
        });
        let text = absolute.to_string_lossy();
        #[cfg(windows)]
        let text = text.trim_start_matches(r"\\?\").to_lowercase();
        sha256(text.as_bytes())
    }

    /// Check if LMDB sidecar caching is available
    ///
    /// This backend can be attempted independently of the source filesystem.
    /// Application-cache permissions or capacity can still make operations fail.
    pub fn is_supported_static(_path: &Path) -> bool {
        // Availability is decided by actual application-cache I/O, not the
        // source filesystem's support for ADS/xattr.
        // The temp directory should always be writable
        true
    }

    /// Get statistics about the cache
    pub fn stats(&self) -> Result<LmdbCacheStats, LmdbCacheError> {
        let rtxn = self.env.read_txn().map_err(LmdbCacheError::Transaction)?;
        let count = self.db.len(&rtxn).map_err(LmdbCacheError::Read)?;

        // Get approximate disk usage
        let disk_usage = std::fs::metadata(self.cache_dir.join("data.mdb"))
            .map(|m| m.len() as usize)
            .unwrap_or(0);

        Ok(LmdbCacheStats {
            entry_count: count as usize,
            disk_usage_bytes: disk_usage,
            max_size_bytes: MAX_DB_SIZE,
        })
    }

    /// Clear all entries from the cache
    pub fn clear(&self) -> Result<(), LmdbCacheError> {
        let _lock = self.write_lock.lock();
        let mut wtxn = self.env.write_txn().map_err(LmdbCacheError::Transaction)?;
        self.db.clear(&mut wtxn).map_err(LmdbCacheError::Write)?;
        wtxn.commit().map_err(LmdbCacheError::Commit)?;
        tracing::info!("LMDB sidecar cache cleared");
        Ok(())
    }
}

impl Default for LmdbSidecarCache {
    fn default() -> Self {
        Self::new().expect("Failed to create default LMDB sidecar cache")
    }
}

impl EmbeddingCache for LmdbSidecarCache {
    fn get(&self, path: &Path, file_hash: &[u8; 32]) -> Result<Option<Vec<f32>>, CacheError> {
        let key = Self::make_key(path);

        let rtxn = self.env.read_txn().map_err(|e| {
            tracing::warn!("LMDB read transaction failed: {}", e);
            CacheError::Io(std::io::Error::other(e.to_string()))
        })?;

        match self.db.get(&rtxn, &key) {
            Ok(Some(data)) => {
                // Verify and decode the signed metadata
                match self.validator.verify(data, file_hash) {
                    Ok(embedding) => {
                        tracing::debug!("LMDB sidecar cache hit for {:?}", path);
                        Ok(Some(embedding))
                    }
                    Err(ValidatorError::FileHashMismatch) => {
                        tracing::debug!("LMDB sidecar cache stale for {:?} (file modified)", path);
                        Ok(None)
                    }
                    Err(ValidatorError::ModelMismatch) => {
                        tracing::debug!("LMDB sidecar cache stale for {:?} (model updated)", path);
                        Ok(None)
                    }
                    Err(e) => {
                        tracing::warn!("LMDB sidecar cache invalid for {:?}: {}", path, e);
                        Ok(None)
                    }
                }
            }
            Ok(None) => {
                tracing::trace!("LMDB sidecar cache miss for {:?}", path);
                Ok(None)
            }
            Err(e) => {
                tracing::warn!("LMDB read error for {:?}: {}", path, e);
                Err(CacheError::Io(std::io::Error::other(e.to_string())))
            }
        }
    }

    fn set(&self, path: &Path, file_hash: &[u8; 32], embedding: &[f32]) -> Result<(), CacheError> {
        let key = Self::make_key(path);
        let signed_data = self.validator.sign(embedding, file_hash);
        self.validator.verify(&signed_data, file_hash)?;

        let _lock = self.write_lock.lock();
        let mut wtxn = self.env.write_txn().map_err(|e| {
            tracing::warn!("LMDB write transaction failed: {}", e);
            CacheError::Io(std::io::Error::other(e.to_string()))
        })?;

        self.db.put(&mut wtxn, &key, &signed_data).map_err(|e| {
            tracing::warn!("LMDB put failed for {:?}: {}", path, e);
            CacheError::Io(std::io::Error::other(e.to_string()))
        })?;

        wtxn.commit().map_err(|e| {
            tracing::warn!("LMDB commit failed: {}", e);
            CacheError::Io(std::io::Error::other(e.to_string()))
        })?;

        tracing::debug!("LMDB sidecar cache set for {:?}", path);
        Ok(())
    }

    fn delete(&self, path: &Path) -> Result<(), CacheError> {
        let key = Self::make_key(path);
        let _lock = self.write_lock.lock();
        let mut transaction = self
            .env
            .write_txn()
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        self.db
            .delete(&mut transaction, &key)
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        transaction
            .commit()
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        Ok(())
    }

    fn contains(&self, path: &Path) -> bool {
        let key = Self::make_key(path);
        self.env
            .read_txn()
            .ok()
            .is_some_and(|transaction| self.db.get(&transaction, &key).ok().flatten().is_some())
    }

    fn is_supported(&self, _path: &Path) -> bool {
        // LMDB sidecar is a universal fallback
        true
    }
}

/// LMDB-specific errors
#[derive(Debug, thiserror::Error)]
pub enum LmdbCacheError {
    #[error("Failed to create cache directory: {0}")]
    CreateDir(std::io::Error),

    #[error("Failed to open LMDB environment: {0}")]
    OpenEnv(heed::Error),

    #[error("Failed to create database: {0}")]
    CreateDb(heed::Error),

    #[error("Transaction error: {0}")]
    Transaction(heed::Error),

    #[error("Commit error: {0}")]
    Commit(heed::Error),

    #[error("Read error: {0}")]
    Read(heed::Error),

    #[error("Write error: {0}")]
    Write(heed::Error),
}

/// Cache statistics
#[derive(Debug, Clone)]
pub struct LmdbCacheStats {
    /// Number of entries in the cache
    pub entry_count: usize,
    /// Current disk usage in bytes
    pub disk_usage_bytes: usize,
    /// Maximum allowed size in bytes
    pub max_size_bytes: usize,
}

// Safety: LmdbSidecarCache is Send + Sync because:
// - Arc<Env> is Send + Sync (heed::Env is thread-safe)
// - Database handles are Send + Sync
// - MetadataValidator contains only immutable data
// - write_lock protects concurrent writes
unsafe impl Send for LmdbSidecarCache {}
unsafe impl Sync for LmdbSidecarCache {}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn test_validator() -> MetadataValidator {
        let key = [0x42u8; 32];
        let fingerprint = [0xABu8; 32];
        MetadataValidator::new(&key, fingerprint)
    }

    fn test_embedding() -> Vec<f32> {
        (0..512).map(|i| (i % 100) as f32 * 0.01).collect()
    }

    fn test_file_hash() -> [u8; 32] {
        [0xCDu8; 32]
    }

    #[test]
    fn test_make_key_deterministic() {
        let path = Path::new("/test/file.txt");
        let key1 = LmdbSidecarCache::make_key(path);
        let key2 = LmdbSidecarCache::make_key(path);

        assert_eq!(key1, key2, "Keys should be deterministic");
    }

    #[test]
    fn test_make_key_different_for_different_paths() {
        let path1 = Path::new("/test/file1.txt");
        let path2 = Path::new("/test/file2.txt");
        let key1 = LmdbSidecarCache::make_key(path1);
        let key2 = LmdbSidecarCache::make_key(path2);

        assert_ne!(key1, key2, "Different paths should produce different keys");
    }

    #[test]
    fn cache_rejects_different_model_in_the_same_file_slot() {
        let temp = TempDir::new().unwrap();
        let path = Path::new("/test/document.txt");
        let cache =
            LmdbSidecarCache::with_validator(temp.path().to_path_buf(), test_validator()).unwrap();
        cache
            .set(path, &test_file_hash(), &test_embedding())
            .unwrap();
        let other = LmdbSidecarCache::with_validator(
            temp.path().to_path_buf(),
            MetadataValidator::new(&[0x42; 32], [0x99; 32]),
        )
        .unwrap();
        assert!(other.contains(path));
        assert!(other.get(path, &test_file_hash()).unwrap().is_none());
        other
            .set(path, &test_file_hash(), &test_embedding())
            .unwrap();
        assert_eq!(other.stats().unwrap().entry_count, 1);
        assert!(cache.get(path, &test_file_hash()).unwrap().is_none());
    }

    #[test]
    fn test_roundtrip() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let cache =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .expect("Failed to create cache");

        let path = Path::new("/test/document.txt");
        let embedding = test_embedding();
        let file_hash = test_file_hash();

        // Set
        cache
            .set(path, &file_hash, &embedding)
            .expect("Failed to set");

        // Get
        let retrieved = cache.get(path, &file_hash).expect("Failed to get");
        assert!(retrieved.is_some(), "Should have retrieved the embedding");

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.len(), embedding.len());

        // Check values (accounting for f16 precision loss)
        for (orig, ret) in embedding.iter().zip(retrieved.iter()) {
            assert!(
                (orig - ret).abs() < 0.01,
                "Values should be close: {} vs {}",
                orig,
                ret
            );
        }
    }

    #[test]
    fn cache_survives_last_handle_and_reopens() {
        let temp_dir = TempDir::new().unwrap();
        let path = Path::new("/test/document.txt");
        {
            let cache =
                LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                    .unwrap();
            cache
                .set(path, &test_file_hash(), &test_embedding())
                .unwrap();
        }
        assert!(temp_dir.path().join("data.mdb").exists());
        let reopened =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .unwrap();
        assert_eq!(
            reopened
                .get(path, &test_file_hash())
                .unwrap()
                .unwrap()
                .len(),
            512
        );
    }

    #[test]
    fn edited_values_replace_old_entries_and_delete_is_real() {
        let temp = TempDir::new().unwrap();
        let cache =
            LmdbSidecarCache::with_validator(temp.path().to_path_buf(), test_validator()).unwrap();
        let path = Path::new("/test/editable.txt");
        assert!(!cache.contains(path));
        for byte in 0..20 {
            cache.set(path, &[byte; 32], &test_embedding()).unwrap();
        }
        assert_eq!(cache.stats().unwrap().entry_count, 1);
        assert!(cache.contains(path));
        assert!(cache.get(path, &[0; 32]).unwrap().is_none());
        assert!(cache.get(path, &[19; 32]).unwrap().is_some());
        cache.delete(path).unwrap();
        assert!(!cache.contains(path));
        assert_eq!(cache.stats().unwrap().entry_count, 0);
    }

    #[test]
    fn test_cache_miss() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let cache =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .expect("Failed to create cache");

        let path = Path::new("/test/nonexistent.txt");
        let file_hash = test_file_hash();

        let result = cache.get(path, &file_hash).expect("Failed to get");
        assert!(result.is_none(), "Should return None for cache miss");
    }

    #[test]
    fn test_stale_on_hash_change() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let cache =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .expect("Failed to create cache");

        let path = Path::new("/test/document.txt");
        let embedding = test_embedding();
        let original_hash = test_file_hash();
        let new_hash = [0xEEu8; 32];

        // Set with original hash
        cache
            .set(path, &original_hash, &embedding)
            .expect("Failed to set");

        // Get with different hash should miss (different key)
        let result = cache.get(path, &new_hash).expect("Failed to get");
        assert!(result.is_none(), "Should return None for stale cache");
    }

    #[test]
    fn test_stats() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let cache =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .expect("Failed to create cache");

        // Initially empty
        let stats = cache.stats().expect("Failed to get stats");
        assert_eq!(stats.entry_count, 0);

        // Add an entry
        let path = Path::new("/test/document.txt");
        cache
            .set(path, &test_file_hash(), &test_embedding())
            .expect("Failed to set");

        let stats = cache.stats().expect("Failed to get stats");
        assert_eq!(stats.entry_count, 1);
    }

    #[test]
    fn test_clear() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let cache =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .expect("Failed to create cache");

        // Add entries
        for i in 0..5 {
            let path = PathBuf::from(format!("/test/file{}.txt", i));
            cache
                .set(&path, &test_file_hash(), &test_embedding())
                .expect("Failed to set");
        }

        let stats = cache.stats().expect("Failed to get stats");
        assert_eq!(stats.entry_count, 5);

        // Clear
        cache.clear().expect("Failed to clear");

        let stats = cache.stats().expect("Failed to get stats");
        assert_eq!(stats.entry_count, 0);
    }

    #[test]
    fn test_is_supported_always_true() {
        assert!(LmdbSidecarCache::is_supported_static(Path::new(
            "/any/path"
        )));
        assert!(LmdbSidecarCache::is_supported_static(Path::new(
            "C:\\any\\path"
        )));
    }

    #[test]
    fn test_multiple_files() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let cache =
            LmdbSidecarCache::with_validator(temp_dir.path().to_path_buf(), test_validator())
                .expect("Failed to create cache");

        // Store embeddings for multiple files
        let files: Vec<(PathBuf, [u8; 32])> = (0..10)
            .map(|i| {
                let path = PathBuf::from(format!("/test/file{}.txt", i));
                let mut hash = [0u8; 32];
                hash[0] = i as u8;
                (path, hash)
            })
            .collect();

        for (path, hash) in &files {
            let embedding: Vec<f32> = (0..64)
                .map(|j| (hash[0] as f32 * 0.1) + (j as f32 * 0.01))
                .collect();
            cache.set(path, hash, &embedding).expect("Failed to set");
        }

        // Verify all entries
        for (path, hash) in &files {
            let result = cache.get(path, hash).expect("Failed to get");
            assert!(result.is_some(), "Should retrieve embedding for {:?}", path);
        }
    }
}
