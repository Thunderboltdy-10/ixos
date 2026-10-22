use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentSearch {
    query: String,
    directory: Option<PathBuf>,
    timestamp: u64,
}
fn path() -> PathBuf {
    ixos_runtime::config::settings_dir().join("recent-searches.json")
}
#[tauri::command]
pub fn list_recent_searches() -> Vec<RecentSearch> {
    let entries: Vec<RecentSearch> = std::fs::read(path())
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default();
    entries
        .into_iter()
        .filter(|entry| !entry.query.trim().is_empty() && entry.query.len() <= 512)
        .take(20)
        .collect()
}
pub fn record(
    app: &tauri::AppHandle,
    query: &str,
    directory: Option<PathBuf>,
) -> Result<(), String> {
    if query.len() > 512 {
        return Ok(());
    }
    let mut entries = list_recent_searches();
    entries.retain(|entry| entry.query != query || entry.directory != directory);
    entries.insert(
        0,
        RecentSearch {
            query: query.into(),
            directory,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        },
    );
    entries.truncate(20);
    let file = path();
    std::fs::create_dir_all(file.parent().unwrap()).map_err(|error| error.to_string())?;
    std::fs::write(
        file,
        serde_json::to_vec(&entries).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    let _ = app.emit("recent-searches-changed", entries);
    Ok(())
}
#[tauri::command]
pub fn clear_recent_searches(app: tauri::AppHandle) -> Result<(), String> {
    match std::fs::remove_file(path()) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.to_string()),
    }
    let _ = app.emit("recent-searches-changed", Vec::<RecentSearch>::new());
    Ok(())
}
