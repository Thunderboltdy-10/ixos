use ixos_runtime::config::Config;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub search: Config,
    pub quit_on_close: bool,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct DesktopOptions {
    quit_on_close: bool,
}
impl Settings {
    fn path() -> PathBuf {
        ixos_runtime::config::settings_dir().join("desktop.json")
    }
    pub fn load() -> Self {
        let desktop: DesktopOptions = std::fs::read(Self::path())
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        Self {
            search: Config::load(&Config::path()).unwrap_or_default(),
            quit_on_close: desktop.quit_on_close,
        }
    }
    pub fn save(&self) -> Result<(), String> {
        self.search.validate().map_err(|e| e.to_string())?;
        if self.search.locations.iter().any(|path| !path.is_dir()) {
            return Err("Each location must be a directory".into());
        }
        self.search
            .save(&Config::path())
            .map_err(|e| e.to_string())?;
        let path = Self::path();
        std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::write(
            path,
            serde_json::to_vec_pretty(&DesktopOptions {
                quit_on_close: self.quit_on_close,
            })
            .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    }
}
#[tauri::command]
pub fn get_config() -> Settings {
    Settings::load()
}
pub fn apply(app: tauri::AppHandle, config: Settings) -> Result<(), String> {
    use tauri::Manager;
    let model_directory_changed = Settings::load().search.model_dir != config.search.model_dir;
    config.save()?;
    let state = app.state::<crate::state::AppState>();
    state
        .generation
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    state
        .warming_generation
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    *state.engine.lock().map_err(|error| error.to_string())? = None;
    let _ = app.emit("settings-changed", ());
    if model_directory_changed {
        super::system::setup_models(app.clone());
    }
    super::search::warm(app);
    Ok(())
}
#[tauri::command]
pub async fn update_config(config: Settings, app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || apply(app, config))
        .await
        .map_err(|error| error.to_string())?
}
