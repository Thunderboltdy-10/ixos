//! System command handlers
//!
//! Provides system-level operations like:
//! - Window management (show/hide overlay)
//! - File operations (open, reveal in explorer)
//! - Emergency clear for journalist mode

use crate::state::AppState;
use tauri::{AppHandle, Manager, State};

/// Show the search overlay window
#[tauri::command]
pub async fn show_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.show().map_err(|e| e.to_string())?;
        overlay.set_focus().map_err(|e| e.to_string())?;
        overlay.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the search overlay window
#[tauri::command]
pub async fn hide_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Open a file with the default application
#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Reveal a file in the system file explorer
#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, we open the parent directory
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or(path);
        std::process::Command::new("xdg-open")
            .arg(&parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Emergency clear all sensitive data (journalist mode panic button)
#[tauri::command]
pub async fn emergency_clear(state: State<'_, AppState>) -> Result<(), String> {
    state.emergency_clear();
    tracing::warn!("Emergency clear executed from UI");
    Ok(())
}

/// Get the default search directory (user's home or documents folder)
#[tauri::command]
pub async fn get_default_search_directory() -> Result<String, String> {
    // Try documents folder first, fall back to home
    if let Some(docs) = dirs::document_dir() {
        return Ok(docs.display().to_string());
    }
    if let Some(home) = dirs::home_dir() {
        return Ok(home.display().to_string());
    }
    Ok(".".to_string())
}

/// Open native folder picker dialog
#[tauri::command]
pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    // Open folder picker dialog
    let folder = app
        .dialog()
        .file()
        .set_title("Select Search Directory")
        .blocking_pick_folder();

    match folder {
        Some(FilePath::Path(path)) => Ok(Some(path.display().to_string())),
        Some(FilePath::Url(url)) => Ok(Some(url.to_string())),
        None => Ok(None),
    }
}

/// Model status information
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub potion_available: bool,
    pub potion_path: Option<String>,
    pub qwen_available: bool,
    pub qwen_path: Option<String>,
    pub ixos_flash_v2_available: bool,
    pub ixos_flash_v2_path: Option<String>,
    pub ixos_pro_v1_available: bool,
    pub ixos_pro_v1_path: Option<String>,
    pub any_available: bool,
    pub recommended: Option<String>,
    pub loaded_model: Option<String>,
}

/// Check if embedding models are available
#[tauri::command]
pub async fn get_model_status(state: State<'_, AppState>) -> Result<ModelStatus, String> {
    use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;

    let models = MmapModel2VecEmbedder::available_models();

    let mut potion_available = false;
    let mut potion_path: Option<String> = None;
    let mut qwen_available = false;
    let mut qwen_path: Option<String> = None;
    let mut ixos_flash_v2_available = false;
    let mut ixos_flash_v2_path: Option<String> = None;
    let mut ixos_pro_v1_available = false;
    let mut ixos_pro_v1_path: Option<String> = None;

    for (model_type, available, path) in models {
        match format!("{:?}", model_type).as_str() {
            "Potion" => {
                potion_available = available;
                potion_path = path.map(|p| p.display().to_string());
            }
            "Qwen" => {
                qwen_available = available;
                qwen_path = path.map(|p| p.display().to_string());
            }
            "IxosFlashV2" => {
                ixos_flash_v2_available = available;
                ixos_flash_v2_path = path.map(|p| p.display().to_string());
            }
            "IxosProV1" => {
                ixos_pro_v1_available = available;
                ixos_pro_v1_path = path.map(|p| p.display().to_string());
            }
            _ => {}
        }
    }

    let any_available =
        potion_available || qwen_available || ixos_flash_v2_available || ixos_pro_v1_available;
    let recommended = if ixos_flash_v2_available {
        Some("ixos-flash-v2".to_string())
    } else if potion_available {
        Some("potion".to_string())
    } else if qwen_available {
        Some("qwen".to_string())
    } else {
        None
    };

    Ok(ModelStatus {
        potion_available,
        potion_path,
        qwen_available,
        qwen_path,
        ixos_flash_v2_available,
        ixos_flash_v2_path,
        ixos_pro_v1_available,
        ixos_pro_v1_path,
        any_available,
        recommended,
        loaded_model: state.loaded_model(),
    })
}

/// Preload a model into memory for faster subsequent searches
#[tauri::command]
pub async fn preload_model(
    state: State<'_, AppState>,
    model_type: String,
) -> Result<String, String> {
    use ixos_protocol::ixos_embed::ModelType;

    let model_type = model_type
        .parse::<ModelType>()
        .unwrap_or(ModelType::IxosFlashV2);

    tracing::info!("Preloading model: {:?}", model_type);

    let model = state.get_or_load_model(model_type)?;
    // Perform a dummy embedding to ensure model is fully loaded
    use ixos_protocol::ixos_embed::EmbeddingModel;
    let _ = model.embed("warmup").map_err(|e| e.to_string())?;
    tracing::info!("Model preloaded successfully: {:?}", model_type);
    Ok(format!("Model {} loaded", model_type))
}
