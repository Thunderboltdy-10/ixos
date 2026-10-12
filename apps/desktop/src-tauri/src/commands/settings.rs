use ixos_core::config::Config;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub locations: Vec<PathBuf>,
    pub search: Config,
    pub quit_on_close: bool,
}
impl Settings {
    fn path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(std::env::temp_dir)
            .join("ixos/desktop.json")
    }
    pub fn load() -> Self {
        std::fs::read(Self::path())
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default()
    }
    pub fn save(&self) -> Result<(), String> {
        self.search.validate().map_err(|e| e.to_string())?;
        if self.locations.iter().any(|path| !path.is_dir()) {
            return Err("Each location must be a directory".into());
        }
        let path = Self::path();
        std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::write(
            path,
            serde_json::to_vec_pretty(self).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    }
}
#[tauri::command]
pub fn get_config() -> Settings {
    Settings::load()
}
#[tauri::command]
pub fn update_config(
    config: Settings,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    config.save()?;
    state.engines.lock().map_err(|e| e.to_string())?.clear();
    Ok(())
}
