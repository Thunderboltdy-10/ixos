use ixos_core::cache::{self, CacheStats};
use std::path::PathBuf;

#[tauri::command]
pub async fn cache_stats(directory: PathBuf) -> Result<CacheStats, String> {
    tauri::async_runtime::spawn_blocking(move || cache::manage(&[directory], false, false))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn cache_clear(directory: PathBuf, yes: bool) -> Result<CacheStats, String> {
    tauri::async_runtime::spawn_blocking(move || cache::manage(&[directory], false, yes))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}
