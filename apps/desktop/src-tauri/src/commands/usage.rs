//! Local counts behind the Settings summary. Nothing here leaves the computer.
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Usage {
    pub searches: u64,
    pub files: u64,
    pub lines: u64,
    /// Milliseconds to the first results of recent searches, newest last.
    pub waits: Vec<f32>,
}
fn path() -> PathBuf {
    ixos_runtime::config::settings_dir().join("usage.json")
}
fn load() -> Usage {
    std::fs::read(path())
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}
pub fn record(files: usize, lines: usize, wait_ms: f32) -> Result<(), String> {
    let mut usage = load();
    usage.searches += 1;
    usage.files += files as u64;
    usage.lines += lines as u64;
    usage.waits.push(wait_ms);
    let excess = usage.waits.len().saturating_sub(200);
    usage.waits.drain(..excess);
    let file = path();
    std::fs::create_dir_all(file.parent().unwrap()).map_err(|error| error.to_string())?;
    std::fs::write(
        file,
        serde_json::to_vec(&usage).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn get_usage() -> Usage {
    load()
}
