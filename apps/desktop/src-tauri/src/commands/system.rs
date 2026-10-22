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
/// Download models during first-launch setup, outside the installer executable.
/// Failed downloads leave keyword search available and can be retried in Settings.
pub fn setup_models(app: AppHandle) {
    use crate::state::{AppState, ModelStatus};
    use ixos_runtime::config::Profile;
    let profiles = [Profile::Code, Profile::Documents];
    if let Ok(mut statuses) = app.state::<AppState>().models.lock() {
        *statuses = profiles
            .iter()
            .map(|&profile| ModelStatus {
                profile,
                installed: false,
                downloading: true,
                error: None,
            })
            .collect();
    }
    let _ = tauri::Emitter::emit(&app, "models-changed", ());
    drop(tauri::async_runtime::spawn_blocking(move || {
        for profile in profiles {
            let _ = install_profile(&app, profile, None);
        }
    }));
}

fn install_profile(
    app: &AppHandle,
    profile: ixos_runtime::config::Profile,
    source: Option<std::path::PathBuf>,
) -> Result<(), String> {
    use crate::state::{AppState, ModelStatus};
    let update = |installed, downloading, error| {
        if let Ok(mut statuses) = app.state::<AppState>().models.lock() {
            statuses.retain(|status| status.profile != profile);
            statuses.push(ModelStatus {
                profile,
                installed,
                downloading,
                error,
            });
        }
        let _ = tauri::Emitter::emit(app, "models-changed", ());
    };
    update(false, true, None);
    let generation = app.state::<AppState>().lifecycle.clone();
    let expected = generation.load(std::sync::atomic::Ordering::Acquire);
    let result = ixos_runtime::client::manage_cancelled(
        "model-install",
        serde_json::json!({"profile":profile,"source":source}),
        ixos_runtime::client::Cancellation::new(generation, expected),
    )
    .map_err(|error| format!("{error:#}"));
    match result {
        Ok(_) => {
            update(true, false, None);
            super::search::warm(app.clone());
            Ok(())
        }
        Err(error) => {
            update(false, false, Some(error.clone()));
            Err(error)
        }
    }
}

#[tauri::command]
pub fn get_model_status(app: AppHandle) -> Result<Vec<crate::state::ModelStatus>, String> {
    app.state::<crate::state::AppState>()
        .models
        .lock()
        .map(|statuses| statuses.clone())
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn install_model(
    app: AppHandle,
    profile: ixos_runtime::config::Profile,
    source: Option<std::path::PathBuf>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_profile(&app, profile, source))
        .await
        .map_err(|error| error.to_string())?
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
pub async fn doctor(app: AppHandle) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let generation = app.state::<crate::state::AppState>().lifecycle.clone();
        let expected = generation.load(std::sync::atomic::Ordering::Acquire);
        ixos_runtime::client::manage_cancelled(
            "doctor",
            serde_json::json!({}),
            ixos_runtime::client::Cancellation::new(generation, expected),
        )
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error| error.to_string())
}

/// Reports each detected skill host independently, including preserved user edits.
#[tauri::command]
pub async fn get_skill_status(app: AppHandle) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let generation = app.state::<crate::state::AppState>().lifecycle.clone();
        let expected = generation.load(std::sync::atomic::Ordering::Acquire);
        ixos_runtime::client::manage_cancelled(
            "skill",
            serde_json::json!({}),
            ixos_runtime::client::Cancellation::new(generation, expected),
        )
        .map_err(|error| format!("{error:#}"))
    })
    .await
    .map_err(|error| error.to_string())?
}
