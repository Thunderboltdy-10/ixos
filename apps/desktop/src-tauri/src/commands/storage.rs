use serde_json::{json, Value};
use std::path::PathBuf;

#[tauri::command]
pub async fn cache_stats(directory: PathBuf) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ixos_runtime::client::manage("cache", json!({"roots":[directory],"remove":false}))
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn cache_clear(directory: PathBuf, yes: bool) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ixos_runtime::client::manage("cache", json!({"roots":[directory],"remove":yes}))
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error| error.to_string())
}
