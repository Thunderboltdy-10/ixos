//! Storage commands for encrypted data persistence
//!
//! Provides file I/O operations for encrypted user data (history, stats, etc.)
//! Also provides cache statistics and management for embedding caches.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

fn detect_cache_backend(path: &Path) -> &'static str {
    #[cfg(windows)]
    {
        if ixos_core::storage::ads_windows::AdsCache::is_supported_static(path) {
            return "ADS";
        }
    }

    #[cfg(all(unix, not(windows)))]
    {
        if ixos_core::storage::xattr_unix::XattrCache::is_supported_static(path) {
            return "xattr";
        }
    }

    if ixos_core::storage::sidecar_lmdb::LmdbSidecarCache::new().is_ok() {
        return "LMDB";
    }

    "Null"
}

fn walk_files_recursive(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                files.push(path);
                continue;
            }

            if path.is_dir() {
                let hidden = path
                    .file_name()
                    .map(|n| n.to_string_lossy().starts_with('.'))
                    .unwrap_or(false);
                if !hidden {
                    stack.push(path);
                }
            }
        }
    }

    files
}

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
        "activity_ledger_v1.enc",
        "workstreams_v1.enc",
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
    use ixos_core::storage::get_cache_for_path;

    let dir_path = Path::new(&directory);

    if !dir_path.exists() {
        return Err(format!("Directory not found: {}", directory));
    }

    let backend_type = detect_cache_backend(dir_path).to_string();
    let cache = get_cache_for_path(dir_path);
    let available = cache.is_supported(dir_path);
    let configured_cache_mode = ixos_core::cli::IxosConfig::load().search.cache_mode;

    let (cached_files, total_size_bytes) = if backend_type == "LMDB" {
        match ixos_core::storage::sidecar_lmdb::LmdbSidecarCache::new()
            .and_then(|lmdb| lmdb.stats())
        {
            Ok(stats) => (stats.entry_count, stats.disk_usage_bytes as u64),
            Err(_) => (0, 0),
        }
    } else {
        let files = walk_files_recursive(dir_path);
        let cached = files.iter().filter(|path| cache.contains(path)).count();
        // model2vec embeddings are ~225 bytes (+metadata/signature overhead)
        let bytes = cached as u64 * 256;
        (cached, bytes)
    };

    Ok(CacheStats {
        backend_type,
        cached_files,
        total_size_bytes,
        available,
        cache_mode: configured_cache_mode,
    })
}

/// Clear the embedding cache for a directory
///
/// Removes all cached embeddings from files in the specified directory.
#[tauri::command]
pub async fn clear_embedding_cache(directory: String) -> Result<usize, String> {
    use ixos_core::storage::get_cache_for_path;

    let dir_path = Path::new(&directory);

    if !dir_path.exists() {
        return Err(format!("Directory not found: {}", directory));
    }

    if detect_cache_backend(dir_path) == "LMDB" {
        let lmdb = ixos_core::storage::sidecar_lmdb::LmdbSidecarCache::new()
            .map_err(|e| format!("Failed to open LMDB cache: {}", e))?;
        let before = lmdb
            .stats()
            .map_err(|e| format!("Failed to read LMDB cache stats: {}", e))?
            .entry_count;
        lmdb.clear()
            .map_err(|e| format!("Failed to clear LMDB cache: {}", e))?;
        return Ok(before);
    }

    let cache = get_cache_for_path(dir_path);
    let mut cleared_count = 0usize;

    // Walk through files and delete their cache entries
    fn clear_recursive(
        dir: &Path,
        cache: &dyn ixos_core::storage::EmbeddingCache,
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

/// Clear all app-managed embedding cache state.
///
/// If `directory` is provided, clears metadata cache entries for files under that directory
/// and clears the LMDB sidecar fallback cache.
/// If omitted, clears only the LMDB sidecar fallback cache.
#[tauri::command]
pub async fn clear_all_embedding_cache(directory: Option<String>) -> Result<usize, String> {
    let mut total_cleared = 0usize;

    if let Some(dir) = directory {
        total_cleared += clear_embedding_cache(dir).await?;
    }

    // Always clear global LMDB sidecar cache if available.
    if let Ok(lmdb) = ixos_core::storage::sidecar_lmdb::LmdbSidecarCache::new() {
        let before = lmdb
            .stats()
            .map(|s| s.entry_count)
            .map_err(|e| format!("Failed to read LMDB cache stats: {}", e))?;
        lmdb.clear()
            .map_err(|e| format!("Failed to clear LMDB cache: {}", e))?;
        total_cleared += before;
    }

    Ok(total_cleared)
}
