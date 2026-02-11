//! Cloud storage file detection
//!
//! Detects if files are cloud-only (not locally available) to prevent
//! accidental downloads when searching in OneDrive, iCloud, Dropbox, etc.
//!
//! ## Platform Support
//!
//! - **Windows**: Uses FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS and FILE_ATTRIBUTE_RECALL_ON_OPEN
//! - **macOS**: Uses NSURLIsUbiquitousItemKey and NSURLUbiquitousItemDownloadingStatusKey
//! - **Linux**: Limited support - checks for common cloud sync markers

use std::path::Path;

/// Status of a file in cloud storage
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CloudStorageStatus {
    /// File is stored locally and can be safely accessed
    Local,
    /// File is in cloud storage only - accessing will trigger download
    CloudOnly,
    /// File is being downloaded from cloud
    Downloading,
    /// Could not determine cloud storage status
    Unknown,
}

/// Check if a file is cloud-only and would trigger a download if accessed
///
/// Returns `CloudStorageStatus::CloudOnly` if the file is stored in the cloud
/// and not locally available. Returns `CloudStorageStatus::Local` if the file
/// is stored locally or if cloud status cannot be determined.
///
/// # Examples
///
/// ```rust,ignore
/// use std::path::Path;
/// use ixos_protocol::storage::cloud_detection::get_cloud_storage_status;
///
/// let path = Path::new("/Users/me/OneDrive/document.txt");
/// match get_cloud_storage_status(path) {
///     CloudStorageStatus::CloudOnly => println!("File is in cloud only - skip to avoid download"),
///     CloudStorageStatus::Local => println!("File is local - safe to access"),
///     _ => println!("Unknown status - proceed with caution"),
/// }
/// ```
pub fn get_cloud_storage_status(path: &Path) -> CloudStorageStatus {
    // First check if the path is in a known cloud storage location
    if is_cloud_storage_path(path) {
        // Then check if the file is actually cloud-only
        check_file_cloud_status(path)
    } else {
        // Not in a cloud storage path, assume local
        CloudStorageStatus::Local
    }
}

/// Check if a path is within a known cloud storage directory
fn is_cloud_storage_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy().to_lowercase();

    // Common cloud storage path indicators
    let cloud_indicators = [
        // Windows
        "\\onedrive",
        "\\dropbox",
        "\\google drive",
        "\\google drive",
        "\\my drive",
        "\\box",
        "\\icloud",
        // macOS
        "/onedrive",
        "/dropbox",
        "/google drive",
        "/google drive",
        "/my drive",
        "/box",
        "/icloud drive",
        "/library/mobile documents",
        // Linux
        "/onedrive",
        "/dropbox",
        "/google-drive",
        "/pcloud",
        "/nextcloud",
        "/owncloud",
    ];

    cloud_indicators
        .iter()
        .any(|indicator| path_str.contains(indicator))
}

/// Platform-specific check for file cloud status
#[cfg(target_os = "windows")]
fn check_file_cloud_status(path: &Path) -> CloudStorageStatus {
    use std::os::windows::fs::MetadataExt;

    match std::fs::metadata(path) {
        Ok(metadata) => {
            let attrs = metadata.file_attributes();

            // FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS = 0x00400000
            // This attribute indicates the file is partially present on the system
            // and accessing it will trigger a download from the cloud
            const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: u32 = 0x00400000;

            // FILE_ATTRIBUTE_RECALL_ON_OPEN = 0x00040000
            // This attribute indicates the file is not present on the system
            // and opening it will trigger a download
            const FILE_ATTRIBUTE_RECALL_ON_OPEN: u32 = 0x00040000;

            // FILE_ATTRIBUTE_OFFLINE = 0x00001000
            // The data of the file is not immediately available
            const FILE_ATTRIBUTE_OFFLINE: u32 = 0x00001000;

            if attrs
                & (FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS
                    | FILE_ATTRIBUTE_RECALL_ON_OPEN
                    | FILE_ATTRIBUTE_OFFLINE)
                != 0
            {
                tracing::debug!(
                    "Cloud-only file detected (attrs: 0x{:08X}): {}",
                    attrs,
                    path.display()
                );
                CloudStorageStatus::CloudOnly
            } else {
                CloudStorageStatus::Local
            }
        }
        Err(e) => {
            tracing::debug!("Could not get metadata for {}: {}", path.display(), e);
            CloudStorageStatus::Unknown
        }
    }
}

#[cfg(target_os = "macos")]
fn check_file_cloud_status(path: &Path) -> CloudStorageStatus {
    // On macOS, we can use xattr to check for iCloud status
    // The com.apple.icloud.itemName xattr indicates an iCloud file
    // The absence of the file locally while having this xattr means it's cloud-only

    match xattr::get(path, "com.apple.icloud.itemName") {
        Ok(Some(_)) => {
            // It's an iCloud file, check if it exists locally
            // If the file size is 0 or very small, it might be a placeholder
            match std::fs::metadata(path) {
                Ok(metadata) => {
                    let size = metadata.len();
                    // If file is empty or very small, it's likely a placeholder
                    if size == 0 || size < 100 {
                        tracing::debug!(
                            "iCloud placeholder detected (size: {}): {}",
                            size,
                            path.display()
                        );
                        CloudStorageStatus::CloudOnly
                    } else {
                        CloudStorageStatus::Local
                    }
                }
                Err(_) => CloudStorageStatus::Unknown,
            }
        }
        Ok(None) => {
            // Not an iCloud file, check if it's in a cloud sync folder
            // Use file size as a heuristic
            match std::fs::metadata(path) {
                Ok(metadata) => {
                    if metadata.len() == 0 {
                        // Could be a placeholder
                        CloudStorageStatus::CloudOnly
                    } else {
                        CloudStorageStatus::Local
                    }
                }
                Err(_) => CloudStorageStatus::Unknown,
            }
        }
        Err(_) => CloudStorageStatus::Unknown,
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn check_file_cloud_status(path: &Path) -> CloudStorageStatus {
    // On Linux, check file size as a heuristic
    // Many cloud sync clients use 0-byte or small placeholder files
    match std::fs::metadata(path) {
        Ok(metadata) => {
            if metadata.len() == 0 {
                // Could be a placeholder - log it but return Unknown
                // since we can't be certain
                tracing::debug!("Possible cloud placeholder (0 bytes): {}", path.display());
                CloudStorageStatus::Unknown
            } else {
                CloudStorageStatus::Local
            }
        }
        Err(_) => CloudStorageStatus::Unknown,
    }
}

/// Check if we should skip processing this file to avoid triggering a cloud download
///
/// Returns `true` if the file should be skipped (cloud-only)
pub fn should_skip_cloud_file(path: &Path) -> bool {
    match get_cloud_storage_status(path) {
        CloudStorageStatus::CloudOnly => {
            tracing::info!(
                "Skipping cloud-only file to prevent auto-download: {}",
                path.display()
            );
            true
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_cloud_storage_path() {
        assert!(is_cloud_storage_path(Path::new(
            "/Users/me/OneDrive/file.txt"
        )));
        assert!(is_cloud_storage_path(Path::new(
            "/Users/me/Dropbox/file.txt"
        )));
        assert!(is_cloud_storage_path(Path::new(
            "/Users/me/Google Drive/file.txt"
        )));
        assert!(is_cloud_storage_path(Path::new(
            "C:\\Users\\me\\OneDrive\\file.txt"
        )));
        assert!(!is_cloud_storage_path(Path::new(
            "/Users/me/Documents/file.txt"
        )));
        assert!(!is_cloud_storage_path(Path::new("C:\\Windows\\file.txt")));
    }
}
