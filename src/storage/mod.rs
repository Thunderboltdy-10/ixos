//! Cross-platform embedding cache
//!
//! Provides a unified interface for storing signed embeddings in file metadata:
//! - Windows NTFS: Alternate Data Streams (file:ixos_embed)
//! - Unix (Linux/macOS): Extended attributes (user.ixos.embed)
//! - LMDB Sidecar: For FAT32, USB drives, network shares (temp directory)
//! - Fallback: NullCache for when all else fails (pure JIT mode)

use std::path::Path;

#[cfg(windows)]
pub mod ads_windows;
pub mod cloud_detection;
pub mod null;
pub mod personal_ranking;
pub mod sidecar_lmdb;
pub mod validator;
#[cfg(unix)]
pub mod xattr_unix;

pub use validator::{MetadataValidator, ValidatorError};

/// Placeholder fingerprint used by generic storage callers that do not provide
/// model identity. Semantic search paths should pass the real model fingerprint.
pub const DEFAULT_MODEL_FINGERPRINT: [u8; 32] = [0u8; 32];

/// Unified trait for embedding cache backends
pub trait EmbeddingCache: Send + Sync {
    /// Get cached embedding if valid (checks file hash + signature)
    fn get(&self, path: &Path, file_hash: &[u8; 32]) -> Result<Option<Vec<f32>>, CacheError>;

    /// Store signed embedding in file metadata
    fn set(&self, path: &Path, file_hash: &[u8; 32], embedding: &[f32]) -> Result<(), CacheError>;

    /// Remove cached embedding
    fn delete(&self, path: &Path) -> Result<(), CacheError>;

    /// Check if embedding exists for path (without verifying hash)
    fn contains(&self, path: &Path) -> bool;

    /// Check if this cache backend works for the given path
    fn is_supported(&self, path: &Path) -> bool;
}

/// Auto-detect best cache backend for a path
///
/// Priority order:
/// 1. Windows NTFS ADS (best performance, no extra files)
/// 2. Unix xattr (best performance, no extra files)
/// 3. LMDB sidecar (FAT32, USB, network drives - uses temp directory)
/// 4. NullCache (pure JIT mode, no persistence)
pub fn get_cache_for_path(path: &Path) -> Box<dyn EmbeddingCache> {
    get_cache_for_path_with_fingerprint(path, DEFAULT_MODEL_FINGERPRINT)
}

/// Auto-detect best cache backend for a path with an explicit model fingerprint.
///
/// This ensures cached embeddings are invalidated when the active model changes.
pub fn get_cache_for_path_with_fingerprint(
    path: &Path,
    model_fingerprint: [u8; 32],
) -> Box<dyn EmbeddingCache> {
    #[cfg(windows)]
    {
        if ads_windows::AdsCache::is_supported_static(path) {
            return Box::new(ads_windows::AdsCache::new_with_fingerprint(
                model_fingerprint,
            ));
        }
    }

    #[cfg(unix)]
    {
        if xattr_unix::XattrCache::is_supported_static(path) {
            return Box::new(xattr_unix::XattrCache::new_with_fingerprint(
                model_fingerprint,
            ));
        }
    }

    // Try LMDB sidecar cache as fallback (for FAT32, USB, network drives)
    match sidecar_lmdb::LmdbSidecarCache::new_with_fingerprint(model_fingerprint) {
        Ok(cache) => {
            tracing::info!("Using LMDB sidecar cache for {:?}", path);
            Box::new(cache)
        }
        Err(e) => {
            tracing::warn!("Failed to create LMDB sidecar cache: {}", e);
            // Final fallback: pure JIT (no caching)
            Box::new(null::NullCache)
        }
    }
}

/// Cache operation errors
#[derive(Debug, thiserror::Error)]
pub enum CacheError {
    #[error("Invalid signature - possible tampering")]
    InvalidSignature,

    #[error("Stale cache - file modified since caching")]
    StaleCache,

    #[error("Model version mismatch - cache needs regeneration")]
    ModelMismatch,

    #[error("Unsupported filesystem for this cache backend")]
    UnsupportedFilesystem,

    #[error("Validator error: {0}")]
    Validator(#[from] ValidatorError),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
