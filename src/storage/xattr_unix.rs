//! Unix extended attributes cache implementation
//!
//! On Unix-like systems (Linux, macOS, FreeBSD), files can have extended
//! attributes (xattr) that store arbitrary metadata.
//!
//! Ixos uses the attribute name `user.ixos.embed` to store signed embeddings.
//!
//! Requirements:
//! - Linux: filesystem must be mounted with `user_xattr` (most default configs)
//! - macOS: APFS and HFS+ support xattr natively
//! - FreeBSD: UFS and ZFS support xattr
//!
//! Limitations:
//! - FAT32/exFAT don't support xattr
//! - NFS may or may not support xattr depending on configuration
//! - Some backup tools may not preserve xattr

#![cfg(unix)]

use std::path::Path;

use super::{CacheError, EmbeddingCache, MetadataValidator, ValidatorError};
use crate::security::crypto::load_or_create_key;

/// Name of the extended attribute for Ixos embeddings
const XATTR_NAME: &str = "user.ixos.embed";

/// Unix extended attributes cache
pub struct XattrCache {
    validator: MetadataValidator,
}

impl XattrCache {
    /// Create a new xattr cache with persistent HMAC key
    pub fn new() -> Self {
        Self::new_with_fingerprint([0u8; 32])
    }

    /// Create a new xattr cache with an explicit model fingerprint.
    pub fn new_with_fingerprint(model_fingerprint: [u8; 32]) -> Self {
        let key = load_or_create_key();

        Self {
            validator: MetadataValidator::new(&key, model_fingerprint),
        }
    }

    /// Create xattr cache with custom validator (for testing)
    pub fn with_validator(validator: MetadataValidator) -> Self {
        Self { validator }
    }

    /// Check if the filesystem at the given path supports extended attributes
    ///
    /// This is a best-effort check. We verify:
    /// 1. The platform supports xattr (compile-time check via xattr::SUPPORTED_PLATFORM)
    /// 2. We can list xattr on the path or its parent directory
    pub fn is_supported_static(path: &Path) -> bool {
        // First check if xattr is supported on this platform
        if !xattr::SUPPORTED_PLATFORM {
            return false;
        }

        // Try to list xattr on the path (or parent if file doesn't exist yet)
        let check_path = if path.exists() {
            path.to_path_buf()
        } else {
            path.parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| Path::new(".").to_path_buf())
        };

        // If we can list xattr, the filesystem supports it
        xattr::list(&check_path).is_ok()
    }
}

impl Default for XattrCache {
    fn default() -> Self {
        Self::new()
    }
}

impl EmbeddingCache for XattrCache {
    fn get(&self, path: &Path, file_hash: &[u8; 32]) -> Result<Option<Vec<f32>>, CacheError> {
        // Try to read the xattr
        match xattr::get(path, XATTR_NAME) {
            Ok(Some(data)) => {
                // Verify and decode
                match self.validator.verify(&data, file_hash) {
                    Ok(embedding) => {
                        tracing::debug!("xattr cache hit for {:?}", path);
                        Ok(Some(embedding))
                    }
                    Err(ValidatorError::FileHashMismatch) => {
                        tracing::debug!("xattr cache stale for {:?} (file modified)", path);
                        Ok(None)
                    }
                    Err(ValidatorError::ModelMismatch) => {
                        tracing::debug!("xattr cache stale for {:?} (model updated)", path);
                        Ok(None)
                    }
                    Err(e) => {
                        tracing::warn!("xattr cache invalid for {:?}: {}", path, e);
                        Ok(None)
                    }
                }
            }
            Ok(None) => {
                tracing::trace!("xattr cache miss for {:?}", path);
                Ok(None)
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                tracing::trace!("xattr cache miss for {:?} (file not found)", path);
                Ok(None)
            }
            Err(e) => {
                tracing::warn!("xattr read error for {:?}: {}", path, e);
                Err(CacheError::Io(e))
            }
        }
    }

    fn set(&self, path: &Path, file_hash: &[u8; 32], embedding: &[f32]) -> Result<(), CacheError> {
        let signed_data = self.validator.sign(embedding, file_hash);

        xattr::set(path, XATTR_NAME, &signed_data)?;
        tracing::debug!("xattr cache set for {:?}", path);
        Ok(())
    }

    fn delete(&self, path: &Path) -> Result<(), CacheError> {
        match xattr::remove(path, XATTR_NAME) {
            Ok(()) => {
                tracing::debug!("xattr cache deleted for {:?}", path);
                Ok(())
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                // Already deleted or never existed, that's fine
                Ok(())
            }
            Err(e) => {
                tracing::warn!("xattr delete error for {:?}: {}", path, e);
                // Don't propagate delete errors - best effort
                Ok(())
            }
        }
    }

    fn contains(&self, path: &Path) -> bool {
        xattr::get(path, XATTR_NAME).unwrap_or(None).is_some()
    }

    fn is_supported(&self, path: &Path) -> bool {
        Self::is_supported_static(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn test_validator() -> MetadataValidator {
        let key = [0x42u8; 32];
        let fingerprint = [0xABu8; 32];
        MetadataValidator::new(&key, fingerprint)
    }

    #[test]
    fn test_xattr_roundtrip() {
        // Create a temp file
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        // Only run if xattr is supported
        if !XattrCache::is_supported_static(path) {
            println!("Skipping test - xattr not supported on this filesystem");
            return;
        }

        let cache = XattrCache::with_validator(test_validator());
        let embedding: Vec<f32> = (0..64).map(|i| i as f32 * 0.01).collect();
        let file_hash = [0xCDu8; 32];

        // Set
        cache
            .set(path, &file_hash, &embedding)
            .expect("Failed to set");

        // Get
        let retrieved = cache.get(path, &file_hash).expect("Failed to get");
        assert!(retrieved.is_some());

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.len(), embedding.len());

        // Check values (accounting for f16 precision loss)
        for (orig, ret) in embedding.iter().zip(retrieved.iter()) {
            assert!((orig - ret).abs() < 0.01);
        }
    }

    #[test]
    fn test_xattr_cache_miss() {
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        if !XattrCache::is_supported_static(path) {
            println!("Skipping test - xattr not supported on this filesystem");
            return;
        }

        let cache = XattrCache::with_validator(test_validator());
        let file_hash = [0xCDu8; 32];

        // No cache set - should return None
        let result = cache.get(path, &file_hash).expect("Failed to get");
        assert!(result.is_none());
    }

    #[test]
    fn test_xattr_stale_on_file_change() {
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        if !XattrCache::is_supported_static(path) {
            println!("Skipping test - xattr not supported on this filesystem");
            return;
        }

        let cache = XattrCache::with_validator(test_validator());
        let embedding: Vec<f32> = (0..64).map(|i| i as f32 * 0.01).collect();
        let original_hash = [0xCDu8; 32];
        let new_hash = [0xEEu8; 32];

        // Set with original hash
        cache
            .set(path, &original_hash, &embedding)
            .expect("Failed to set");

        // Get with different hash - should return None (stale)
        let result = cache.get(path, &new_hash).expect("Failed to get");
        assert!(result.is_none());
    }

    #[test]
    fn test_xattr_delete() {
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        if !XattrCache::is_supported_static(path) {
            println!("Skipping test - xattr not supported on this filesystem");
            return;
        }

        let cache = XattrCache::with_validator(test_validator());
        let embedding: Vec<f32> = (0..64).map(|i| i as f32 * 0.01).collect();
        let file_hash = [0xCDu8; 32];

        // Set
        cache
            .set(path, &file_hash, &embedding)
            .expect("Failed to set");

        // Delete
        cache.delete(path).expect("Failed to delete");

        // Get should return None
        let result = cache.get(path, &file_hash).expect("Failed to get");
        assert!(result.is_none());
    }
}
