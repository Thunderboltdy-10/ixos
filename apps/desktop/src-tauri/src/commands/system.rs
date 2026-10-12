use super::settings::Settings;
use std::path::Path;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn show_overlay(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or("Search window is missing")?;
    window.show().map_err(|e| e.to_string())?;
    let _ = tauri::Emitter::emit(&window, "shortcut-triggered", ());
    window.set_focus().map_err(|e| e.to_string())
}
#[tauri::command]
pub fn hide_overlay(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or("Search window is missing")?
        .hide()
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).is_file() {
        return Err("File no longer exists".into());
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn reveal_in_explorer(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<Option<String>, String> {
        use tauri_plugin_dialog::DialogExt;
        let Some(path) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        let mut settings = Settings::load();
        if !settings.search.locations.contains(&path) {
            settings.search.locations.push(path.clone());
            super::settings::apply(app.clone(), settings)?;
        }
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|error| error.to_string())?
}
#[tauri::command]
pub fn get_model_status() -> serde_json::Value {
    let config = Settings::load().search;
    serde_json::json!(ixos_core::model::install::MODELS.iter().map(|model| {
        let path=config.model_path(model.profile,None);
        serde_json::json!({"profile":model.profile,"installed":ixos_core::model::install::verify(&path,model.profile).is_ok()})
    }).collect::<Vec<_>>())
}
#[tauri::command]
pub async fn install_model(
    app: AppHandle,
    profile: ixos_core::config::Profile,
    source: Option<std::path::PathBuf>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        ixos_core::model::install::install(
            profile,
            &Settings::load().search.model_dir,
            source.as_deref(),
        )
        .map(|_| {
            super::search::warm(app);
        })
        .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn suggested_locations() -> Vec<std::path::PathBuf> {
    [dirs::document_dir(), dirs::desktop_dir()]
        .into_iter()
        .flatten()
        .filter(|path| path.is_dir())
        .collect()
}
#[tauri::command]
pub async fn doctor() -> Result<ixos_core::doctor::Report, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let config = Settings::load().search;
        ixos_core::doctor::check(
            &config,
            config.profile,
            &config.model_path(config.profile, None),
        )
        .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}
