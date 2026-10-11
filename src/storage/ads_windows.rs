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
use std::io::Write;
use std::os::windows::ffi::OsStringExt;
use std::os::windows::fs::OpenOptionsExt;
use std::os::windows::io::AsRawHandle;
use std::path::{Path, PathBuf};
use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;

use super::{CacheError, EmbeddingCache, MetadataValidator, ValidatorError};
use crate::security::crypto::load_or_create_key;

/// Name of the alternate data stream for Ixos embeddings
const ADS_STREAM_NAME: &str = ":ixos_embed";

/// Disable automatic access/write timestamp updates from THIS metadata handle.
/// No previously read timestamp is restored, so concurrent primary writes retain
/// their own timestamps. Stream updates can still generate filesystem events.
fn suppress_handle_times(file: &fs::File) -> std::io::Result<()> {
    use windows_sys::Win32::{Foundation::FILETIME, Storage::FileSystem::SetFileTime};
    let unchanged = FILETIME {
        dwLowDateTime: u32::MAX,
        dwHighDateTime: u32::MAX,
    };
    // SAFETY: the File owns a live handle; pointers address initialized FILETIME
    // values for this synchronous call. All-ones is the documented suppression
    // sentinel, not a timestamp value to assign to the source.
    if unsafe {
        SetFileTime(
            file.as_raw_handle(),
            std::ptr::null(),
            &unchanged,
            &unchanged,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error());
    }
    Ok(())
}

pub(crate) fn write_metadata_stream(path: &Path, name: &str, data: &[u8]) -> std::io::Result<()> {
    use windows_sys::Win32::Storage::FileSystem::{FILE_SHARE_READ, FILE_SHARE_WRITE};
    // Open the primary first and prevent rename/delete for this short write.
    // A missing primary must never be recreated just to attach cached metadata.
    let _primary = fs::OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
        .open(path)?;
    let mut stream = path.as_os_str().to_owned();
    stream.push(name);
    // Truncate only AFTER suppression. CREATE_ALWAYS would modify the stream
    // before its handle has been configured.
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .open(stream)?;
    suppress_handle_times(&file)?;
    file.set_len(0)?;
    file.write_all(data)
}

pub(crate) fn remove_metadata_stream(stream: &Path) -> std::io::Result<()> {
    use windows_sys::Win32::Storage::FileSystem::{
        FileDispositionInfo, SetFileInformationByHandle, DELETE, FILE_DISPOSITION_INFO,
        FILE_WRITE_ATTRIBUTES,
    };
    let file = fs::OpenOptions::new()
        .access_mode(DELETE | FILE_WRITE_ATTRIBUTES)
        .open(stream)?;
    suppress_handle_times(&file)?;
    let disposition = FILE_DISPOSITION_INFO { DeleteFile: 1 };
    // SAFETY: live owned handle and correctly sized/initialized synchronous
    // disposition structure. This deletes the named metadata stream on close.
    if unsafe {
        SetFileInformationByHandle(
            file.as_raw_handle(),
            FileDispositionInfo,
            &disposition as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<FILE_DISPOSITION_INFO>() as u32,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error());
    }
    Ok(())
}

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
        let signed_data = self.validator.sign(embedding, file_hash);
        self.validator.verify(&signed_data, file_hash)?;

        write_metadata_stream(path, ADS_STREAM_NAME, &signed_data)?;
        tracing::debug!("ADS cache set for {:?}", path);
        Ok(())
    }

    fn delete(&self, path: &Path) -> Result<(), CacheError> {
        let ads_path = Self::ads_path(path);

        match remove_metadata_stream(&ads_path) {
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
                Err(CacheError::Io(e))
            }
        }
    }

    fn contains(&self, path: &Path) -> bool {
        let ads_path = Self::ads_path(path);
        // GetFileAttributes (used by Path::exists) does not reliably address ADS.
        // Opening the named stream also works for canonical extended-length paths.
        fs::File::open(ads_path).is_ok()
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
    fn metadata_write_replace_and_delete_preserve_primary_mtime() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("source.txt");
        fs::write(&path, "primary source").unwrap();
        if !AdsCache::is_supported_static(&path) {
            return;
        }
        let before = fs::metadata(&path).unwrap().modified().unwrap();
        write_metadata_stream(&path, ADS_STREAM_NAME, b"long cached value").unwrap();
        assert_eq!(fs::metadata(&path).unwrap().modified().unwrap(), before);
        write_metadata_stream(&path, ADS_STREAM_NAME, b"short").unwrap();
        assert_eq!(fs::read(AdsCache::ads_path(&path)).unwrap(), b"short");
        assert_eq!(fs::metadata(&path).unwrap().modified().unwrap(), before);
        remove_metadata_stream(&AdsCache::ads_path(&path)).unwrap();
        assert!(!AdsCache::with_validator(test_validator()).contains(&path));
        assert_eq!(fs::metadata(&path).unwrap().modified().unwrap(), before);
        assert_eq!(fs::read(&path).unwrap(), b"primary source");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn suppressed_cache_handle_does_not_restore_over_concurrent_source_edit() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("source.txt");
        fs::write(&path, "before edit").unwrap();
        if !AdsCache::is_supported_static(&path) {
            return;
        }
        let mut cache = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(AdsCache::ads_path(&path))
            .unwrap();
        suppress_handle_times(&cache).unwrap();
        fs::write(&path, "concurrent edit").unwrap();
        let external_time = std::time::UNIX_EPOCH + std::time::Duration::from_secs(1_700_000_000);
        fs::File::options()
            .write(true)
            .open(&path)
            .unwrap()
            .set_times(fs::FileTimes::new().set_modified(external_time))
            .unwrap();
        cache.write_all(b"metadata update").unwrap();
        drop(cache);
        assert_eq!(
            fs::metadata(&path).unwrap().modified().unwrap(),
            external_time
        );
        assert_eq!(fs::read(&path).unwrap(), b"concurrent edit");
    }

    #[test]
    fn metadata_write_never_creates_a_missing_primary() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("deleted.txt");
        assert!(write_metadata_stream(&path, ADS_STREAM_NAME, b"cache").is_err());
        assert!(!path.exists());
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 0);
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
        let embedding: Vec<f32> = (0..512).map(|i| (i % 100) as f32 * 0.01).collect();
        let file_hash = [0xCDu8; 32];

        // Set
        cache
            .set(path, &file_hash, &embedding)
            .expect("Failed to set");
        assert!(cache.contains(path));
        assert!(cache.contains(&fs::canonicalize(path).unwrap()));

        // Get
        let retrieved = cache.get(path, &file_hash).expect("Failed to get");
        assert!(retrieved.is_some());

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.len(), embedding.len());

        // Check values (accounting for f16 precision loss)
        for (orig, ret) in embedding.iter().zip(retrieved.iter()) {
            assert!((orig - ret).abs() < 0.01);
        }
        cache.delete(path).unwrap();
        assert!(!cache.contains(path));
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
        let embedding: Vec<f32> = (0..512).map(|i| (i % 100) as f32 * 0.01).collect();
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
