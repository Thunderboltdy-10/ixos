//! Windows NTFS Alternate Data Streams cache implementation
//!
//! On Windows NTFS, files can have multiple "streams" of data.
//! The main content is the default stream; additional streams are accessed
//! via colon syntax: `file.txt:stream_name`
//!
//! Ixos uses the stream name `ixos_embed` to store signed embeddings.
//! Example: `C:\Documents\report.pdf:ixos_embed`
//!
//! Limitations:
//! - Only works on NTFS filesystems
//! - ADS is stripped when copying to FAT32, exFAT, or cloud storage
//! - Some backup tools may not preserve ADS

use std::ffi::OsString;
use std::fs;
use std::os::windows::ffi::OsStringExt;
use std::path::{Path, PathBuf};
use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;

use super::{CacheError, EmbeddingCache, MetadataValidator, ValidatorError};
use crate::security::crypto::load_or_create_key;

/// Name of the alternate data stream for Ixos embeddings
const ADS_STREAM_NAME: &str = ":ixos_embed";

/// Windows NTFS Alternate Data Streams cache
pub struct AdsCache {
    validator: MetadataValidator,
}

impl AdsCache {
    /// Create a new ADS cache with persistent HMAC key
    pub fn new() -> Self {
        Self::new_with_fingerprint([0u8; 32])
    }

    /// Create a new ADS cache with an explicit model fingerprint.
    pub fn new_with_fingerprint(model_fingerprint: [u8; 32]) -> Self {
        let key = load_or_create_key();

        Self {
            validator: MetadataValidator::new(&key, model_fingerprint),
        }
    }

    /// Create ADS cache with custom validator (for testing)
    pub fn with_validator(validator: MetadataValidator) -> Self {
        Self { validator }
    }

    /// Check if the given path is on an NTFS filesystem
    ///
    /// Uses GetVolumeInformationW to query the filesystem type.
    pub fn is_supported_static(path: &Path) -> bool {
        // Get the root path (e.g., "C:\")
        let path_str = match path.to_str() {
            Some(s) => s,
            None => return false,
        };
        let normalized = path_str.strip_prefix(r"\\?\").unwrap_or(path_str);

        // Need at least "C:" to determine the drive
        if normalized.len() < 2 {
            return false;
        }

        // Build root path like "C:\"
        let root: String = if normalized.as_bytes().get(1) == Some(&b':') {
            format!("{}\\", &normalized[..2])
        } else if normalized.starts_with("\\\\") || normalized.starts_with("UNC\\") {
            // UNC path - less likely to support ADS reliably
            return false;
        } else {
            return false;
        };

        // Convert to wide string with null terminator
        let root_wide: Vec<u16> = root.encode_utf16().chain(std::iter::once(0)).collect();

        // Buffer for filesystem name
        let mut fs_name_buf = [0u16; 32];

        let result = unsafe {
            GetVolumeInformationW(
                root_wide.as_ptr(),
                std::ptr::null_mut(), // volume name buffer (not needed)
                0,                    // volume name buffer size
                std::ptr::null_mut(), // volume serial number (not needed)
                std::ptr::null_mut(), // max component length (not needed)
                std::ptr::null_mut(), // file system flags (not needed)
                fs_name_buf.as_mut_ptr(),
                fs_name_buf.len() as u32,
            )
        };

        if result == 0 {
            return false;
        }

        // Convert filesystem name to string
        let fs_name_len = fs_name_buf
            .iter()
            .position(|&c| c == 0)
            .unwrap_or(fs_name_buf.len());
        let fs_name = OsString::from_wide(&fs_name_buf[..fs_name_len]);
        let fs_name_str = fs_name.to_string_lossy();

        // Only NTFS reliably supports ADS
        fs_name_str.eq_ignore_ascii_case("NTFS")
    }

    /// Build the full ADS path for a file
    ///
    /// Example: `C:\file.txt` -> `C:\file.txt:ixos_embed`
    fn ads_path(path: &Path) -> PathBuf {
        let mut ads_path = path.as_os_str().to_owned();
        ads_path.push(ADS_STREAM_NAME);
        PathBuf::from(ads_path)
    }
}

impl Default for AdsCache {
    fn default() -> Self {
        Self::new()
    }
}

impl EmbeddingCache for AdsCache {
    fn get(&self, path: &Path, file_hash: &[u8; 32]) -> Result<Option<Vec<f32>>, CacheError> {
        let ads_path = Self::ads_path(path);

        // Try to read the ADS
        match fs::read(&ads_path) {
            Ok(data) => {
                // Verify and decode
                match self.validator.verify(&data, file_hash) {
                    Ok(embedding) => {
                        tracing::debug!("ADS cache hit for {:?}", path);
                        Ok(Some(embedding))
                    }
                    Err(ValidatorError::FileHashMismatch) => {
                        tracing::debug!("ADS cache stale for {:?} (file modified)", path);
                        Ok(None)
                    }
                    Err(ValidatorError::ModelMismatch) => {
                        tracing::debug!("ADS cache stale for {:?} (model updated)", path);
                        Ok(None)
                    }
                    Err(e) => {
                        tracing::warn!("ADS cache invalid for {:?}: {}", path, e);
                        Ok(None)
                    }
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                tracing::trace!("ADS cache miss for {:?}", path);
                Ok(None)
            }
            Err(e) => {
                tracing::warn!("ADS read error for {:?}: {}", path, e);
                Err(CacheError::Io(e))
            }
        }
    }

    fn set(&self, path: &Path, file_hash: &[u8; 32], embedding: &[f32]) -> Result<(), CacheError> {
        let ads_path = Self::ads_path(path);
        let signed_data = self.validator.sign(embedding, file_hash);

        fs::write(&ads_path, signed_data)?;
        tracing::debug!("ADS cache set for {:?}", path);
        Ok(())
    }

    fn delete(&self, path: &Path) -> Result<(), CacheError> {
        let ads_path = Self::ads_path(path);

        match fs::remove_file(&ads_path) {
            Ok(()) => {
                tracing::debug!("ADS cache deleted for {:?}", path);
                Ok(())
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                // Already deleted, that's fine
                Ok(())
            }
            Err(e) => {
                tracing::warn!("ADS delete error for {:?}: {}", path, e);
                // Don't propagate delete errors - best effort
                Ok(())
            }
        }
    }

    fn contains(&self, path: &Path) -> bool {
        let ads_path = Self::ads_path(path);
        ads_path.exists()
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
    fn test_ads_path_construction() {
        let path = Path::new("C:\\test\\file.txt");
        let ads = AdsCache::ads_path(path);
        assert_eq!(ads.to_string_lossy(), "C:\\test\\file.txt:ixos_embed");
    }

    #[test]
    fn test_ads_roundtrip() {
        // Create a temp file
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        // Only run on NTFS
        if !AdsCache::is_supported_static(path) {
            println!("Skipping test - not on NTFS filesystem");
            return;
        }

        let cache = AdsCache::with_validator(test_validator());
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
    fn test_ads_cache_miss() {
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        if !AdsCache::is_supported_static(path) {
            println!("Skipping test - not on NTFS filesystem");
            return;
        }

        let cache = AdsCache::with_validator(test_validator());
        let file_hash = [0xCDu8; 32];

        // No cache set - should return None
        let result = cache.get(path, &file_hash).expect("Failed to get");
        assert!(result.is_none());
    }

    #[test]
    fn test_ads_stale_on_file_change() {
        let temp = NamedTempFile::new().expect("Failed to create temp file");
        let path = temp.path();

        if !AdsCache::is_supported_static(path) {
            println!("Skipping test - not on NTFS filesystem");
            return;
        }

        let cache = AdsCache::with_validator(test_validator());
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
}
