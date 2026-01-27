//! Storage commands for encrypted data persistence
//!
//! Provides file I/O operations for encrypted user data (history, stats, etc.)
//! Also provides cache statistics and management for embedding caches.

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Cache statistics returned to the frontend
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStats {
    /// Type of cache backend being used
    pub backend_type: String,
    /// Number of files with cached embeddings (estimate)
    pub cached_files: usize,
    /// Total size of cached data in bytes (estimate)
    pub total_size_bytes: u64,
    /// Whether the cache is available
    pub available: bool,
    /// Current cache mode
    pub cache_mode: String,
}

/// Get the app config directory
fn get_config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))
}

/// Write encrypted data to a file in the app config directory
#[tauri::command]
pub async fn write_encrypted_file(
    app: tauri::AppHandle,
    filename: String,
    data: String,
) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;

    // Create config directory if it doesn't exist
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let file_path = config_dir.join(&filename);

    // Write the encrypted data (already encrypted by frontend)
    fs::write(&file_path, data).map_err(|e| format!("Failed to write file {}: {}", filename, e))?;

    Ok(())
}

/// Read encrypted data from a file in the app config directory
#[tauri::command]
pub async fn read_encrypted_file(
    app: tauri::AppHandle,
    filename: String,
) -> Result<String, String> {
    let config_dir = get_config_dir(&app)?;
    let file_path = config_dir.join(&filename);

    // Check if file exists
    if !file_path.exists() {
        return Err(format!("File not found: {}", filename));
    }

    // Read the encrypted data
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file {}: {}", filename, e))
}

/// Delete an encrypted file from the app config directory
#[tauri::command]
pub async fn delete_encrypted_file(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;
    let file_path = config_dir.join(&filename);

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete file {}: {}", filename, e))?;
    }

    Ok(())
}

/// Clear all encrypted files (for journalist mode emergency clear)
#[tauri::command]
pub async fn clear_all_encrypted_files(app: tauri::AppHandle) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;

    if !config_dir.exists() {
        return Ok(());
    }

    // List of encrypted files to delete
    let encrypted_files = [
        "search_history.encrypted",
        "statistics.encrypted",
        "starred_searches.encrypted",
        "auth_token.encrypted",
    ];

    for filename in &encrypted_files {
        let file_path = config_dir.join(filename);
        if file_path.exists() {
            fs::remove_file(&file_path)
                .map_err(|e| format!("Failed to delete {}: {}", filename, e))?;
        }
    }

    Ok(())
}

/// Get cache statistics for a directory
///
/// Returns information about the embedding cache for the specified directory.
#[tauri::command]
pub async fn get_cache_stats(directory: String) -> Result<CacheStats, String> {
    use ixos_protocol::storage::get_cache_for_path;
    use std::path::Path;

    let dir_path = Path::new(&directory);

    if !dir_path.exists() {
        return Err(format!("Directory not found: {}", directory));
    }

    // Get the cache backend for this directory
    let cache = get_cache_for_path(dir_path);

    // Determine the backend type
    let backend_type = if cfg!(windows) {
        "ADS".to_string()
    } else {
        "xattr".to_string()
    };

    // Count files in directory (estimate of potential cached files)
    let mut file_count = 0usize;

    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                file_count += 1;
            }
        }
    }

    // Estimate cache size (actual detection would require checking each file)
    // For now, return an estimate based on file count
    let estimated_cached = file_count / 4; // Rough estimate: ~25% of files are cached
    let total_size_bytes = estimated_cached as u64 * 1024; // ~1KB per embedding

    Ok(CacheStats {
        backend_type,
        cached_files: estimated_cached,
        total_size_bytes,
        available: cache.is_supported(dir_path),
        cache_mode: "cache".to_string(),
    })
}

/// Clear the embedding cache for a directory
///
/// Removes all cached embeddings from files in the specified directory.
#[tauri::command]
pub async fn clear_embedding_cache(directory: String) -> Result<usize, String> {
    use ixos_protocol::storage::get_cache_for_path;
    use std::path::Path;

    let dir_path = Path::new(&directory);

    if !dir_path.exists() {
        return Err(format!("Directory not found: {}", directory));
    }

    let cache = get_cache_for_path(dir_path);
    let mut cleared_count = 0usize;

    // Walk through files and delete their cache entries
    fn clear_recursive(
        dir: &Path,
        cache: &dyn ixos_protocol::storage::EmbeddingCache,
        count: &mut usize,
    ) -> Result<(), String> {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    // Use delete method to remove cache entry
                    if cache.delete(&path).is_ok() {
                        *count += 1;
                    }
                } else if path.is_dir() {
                    // Don't recurse into hidden directories
                    if !path
                        .file_name()
                        .map(|n| n.to_string_lossy().starts_with('.'))
                        .unwrap_or(false)
                    {
                        clear_recursive(&path, cache, count)?;
                    }
                }
            }
        }
        Ok(())
    }

    clear_recursive(dir_path, cache.as_ref(), &mut cleared_count)
        .map_err(|e| format!("Failed to clear cache: {}", e))?;

    Ok(cleared_count)
}
