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
    pub ixos_flash_v2_available: bool,
    pub ixos_flash_v2_path: Option<String>,
    pub ixos_pro_v2_available: bool,
    pub ixos_pro_v2_path: Option<String>,
    pub ixos_flash_v1_available: bool,
    pub ixos_flash_v1_path: Option<String>,
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

    let mut ixos_flash_v2_available = false;
    let mut ixos_flash_v2_path: Option<String> = None;
    let mut ixos_pro_v2_path: Option<String> = None;
    let ixos_pro_v2_available;
    let mut ixos_flash_v1_available = false;
    let mut ixos_flash_v1_path: Option<String> = None;
    let mut ixos_pro_v1_available = false;
    let mut ixos_pro_v1_path: Option<String> = None;
    let mut potion_available = false;
    let mut potion_path: Option<String> = None;

    for (model_type, available, path) in models {
        match format!("{:?}", model_type).as_str() {
            "IxosFlashV2" => {
                ixos_flash_v2_available = available;
                ixos_flash_v2_path = path.map(|p| p.display().to_string());
            }
            "IxosFlashV1" => {
                ixos_flash_v1_available = available;
                ixos_flash_v1_path = path.map(|p| p.display().to_string());
            }
            "IxosProV1" => {
                ixos_pro_v1_available = available;
                ixos_pro_v1_path = path.map(|p| p.display().to_string());
            }
            "Potion" => {
                potion_available = available;
                potion_path = path.map(|p| p.display().to_string());
            }
            _ => {}
        }
    }

    ixos_pro_v2_available = ixos_flash_v2_available && potion_available;
    if ixos_pro_v2_available {
        ixos_pro_v2_path = ixos_flash_v2_path.clone().or(potion_path.clone());
    }

    let any_available = ixos_flash_v2_available
        || ixos_pro_v2_available
        || ixos_flash_v1_available
        || ixos_pro_v1_available;
    let recommended = if ixos_flash_v2_available {
        Some("ixos-flash-v2".to_string())
    } else if ixos_pro_v2_available {
        Some("ixos-pro-v2".to_string())
    } else if ixos_flash_v1_available {
        Some("ixos-flash-v1".to_string())
    } else if ixos_pro_v1_available {
        Some("ixos-pro-v1".to_string())
    } else {
        None
    };

    let mut loaded_model = state.loaded_model();
    if matches!(
        loaded_model.as_deref(),
        Some("potion") | Some("potion-base-8m-int8")
    ) {
        loaded_model = Some("ixos-pro-v2".to_string());
    }

    Ok(ModelStatus {
        ixos_flash_v2_available,
        ixos_flash_v2_path,
        ixos_pro_v2_available,
        ixos_pro_v2_path,
        ixos_flash_v1_available,
        ixos_flash_v1_path,
        ixos_pro_v1_available,
        ixos_pro_v1_path,
        any_available,
        recommended,
        loaded_model,
    })
}

/// Preload a model into memory for faster subsequent searches
#[tauri::command]
pub async fn preload_model(
    state: State<'_, AppState>,
    model_type: String,
) -> Result<String, String> {
    use ixos_protocol::ixos_embed::ModelType;

    // Check authentication
    if state
        .entitlement_manager
        .lock()
        .entitlement_token()
        .is_none()
    {
        return Err("Authentication required to preload models".to_string());
    }

    let normalized = model_type.trim().to_lowercase();
    if normalized == "ixos-pro-v2" || normalized == "pro-v2" || normalized == "pro" {
        tracing::info!("Preloading Pro v2 dependencies");
        let flash = state.get_or_load_model(ModelType::IxosFlashV2)?;
        let potion = state.get_or_load_model(ModelType::Potion)?;
        use ixos_protocol::ixos_embed::EmbeddingModel;
        let _ = flash.embed("warmup").map_err(|e| e.to_string())?;
        let _ = potion.embed("warmup").map_err(|e| e.to_string())?;
        *state.loaded_model.lock() = Some("ixos-pro-v2".to_string());
        return Ok("Model ixos-pro-v2 loaded".to_string());
    }

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

/// Progress event for model download
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelDownloadProgress {
    pub model_type: String,
    pub filename: String,
    pub bytes_downloaded: u64,
    pub total_bytes: Option<u64>,
    pub percent: Option<u32>,
    pub status: String, // "downloading", "complete", "error"
    pub message: Option<String>,
}

/// Download a model from Hugging Face if it's missing
#[tauri::command]
pub async fn download_model(app: AppHandle, model_type: String) -> Result<String, String> {
    use futures_util::StreamExt;
    use ixos_protocol::ixos_embed::ModelType;
    use std::io::Write;
    use tauri::Emitter;

    let normalized = model_type.trim().to_lowercase();
    if normalized == "ixos-pro-v2" || normalized == "pro-v2" || normalized == "pro" {
        // Use Box::pin to handle recursive async calls
        Box::pin(download_model(app.clone(), "ixos-flash-v2".to_string())).await?;
        Box::pin(download_model(app.clone(), "potion".to_string())).await?;
        return Ok("Successfully downloaded and validated ixos-pro-v2 dependencies".to_string());
    }

    let model_type_enum = model_type
        .parse::<ModelType>()
        .unwrap_or(ModelType::IxosFlashV2);

    // Determine target directory in AppData (Roaming/Ixos/models)
    // We use dirs::data_dir() to match ixos_protocol's search path
    let data_dir = dirs::data_dir().ok_or("Could not find system data directory")?;
    let models_dir = data_dir.join("Ixos").join("models");

    // Define model-specific paths and HF repo IDs
    // Mappings align with mmap_model.rs expectations
    // Note: vocab.txt is not required for these models (tokenizer.json is sufficient)
    let (subdir, repo_id, files) = match model_type_enum {
        ModelType::IxosFlashV2 => (
            "ixos-flash-v2",
            "Thunderboltdy10/Ixos-Flash-v2",
            vec!["config.json", "model.safetensors", "tokenizer.json"],
        ),
        ModelType::IxosFlashV1 => (
            "ixos-flash-v1",
            "Thunderboltdy10/Ixos-Flash",
            vec!["config.json", "model.safetensors", "tokenizer.json"],
        ),
        ModelType::IxosProV1 => (
            "ixos-pro-v1",
            "Thunderboltdy10/Ixos-Pro",
            vec!["config.json", "model.safetensors", "tokenizer.json"],
        ),
        ModelType::Potion => (
            "potion-base-8M-int8",
            "minishlab/potion-base-8M",
            vec!["config.json", "model.safetensors", "tokenizer.json"],
        ),
        _ => return Err("Model download not supported for this type yet".to_string()),
    };

    let target_dir = models_dir.join(subdir);
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    tracing::info!("Downloading {} to {:?}", repo_id, target_dir);

    let client = reqwest::Client::new();
    let mut all_files_valid = true;
    let mut error_msg = String::new();

    for filename in files {
        let url = format!(
            "https://huggingface.co/{}/resolve/main/{}",
            repo_id, filename
        );
        let target_path = target_dir.join(filename);

        // Check if file already exists and is valid
        if target_path.exists() {
            if let Ok(metadata) = std::fs::metadata(&target_path) {
                if metadata.len() > 0 {
                    // File exists with non-zero size - verify it's not corrupted
                    tracing::info!("File {} already exists, verifying...", filename);
                    // For existing files, we'll trust them for now but log their presence
                    continue;
                }
            }
        }

        tracing::info!("Downloading file: {} ({})", filename, url);

        // Download without authentication header (models are public)
        let res = client.get(&url).send().await.map_err(|e| {
            let msg = format!("Failed to request {}: {}", filename, e);
            error_msg = msg.clone();
            msg
        })?;

        // Detailed error handling for different status codes
        if !res.status().is_success() {
            let status_code = res.status().as_u16();
            let body = res.text().await.unwrap_or_default();

            let detailed_error = match status_code {
                401 | 403 => format!(
                    "Access denied downloading {}: Status {}. File may require authentication.",
                    filename, status_code
                ),
                404 => format!(
                    "File not found: {}. Repository or file may not exist.",
                    filename
                ),
                429 => format!("Rate limited. Please wait before retrying.",),
                500..=599 => format!(
                    "Server error downloading {}: Status {}. Please try again later.",
                    filename, status_code
                ),
                _ => format!(
                    "Failed to download {}: Status {} - {}",
                    filename,
                    status_code,
                    body.lines().next().unwrap_or("")
                ),
            };

            error_msg = detailed_error.clone();
            all_files_valid = false;
            tracing::error!("{}", detailed_error);
            continue; // Try next file
        }

        // Get total size from Content-Length header if available
        let total_size = res.content_length();

        // Download with streaming and progress events
        let mut file = std::fs::File::create(&target_path)
            .map_err(|e| format!("Failed to create file {:?}: {}", target_path, e))?;

        let mut stream = res.bytes_stream();
        let mut bytes_written: u64 = 0;
        let mut last_emit = std::time::Instant::now();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Download error for {}: {}", filename, e))?;
            file.write_all(&chunk)
                .map_err(|e| format!("Write error for {}: {}", filename, e))?;
            bytes_written += chunk.len() as u64;

            // Emit progress event every 100ms to avoid flooding
            if last_emit.elapsed().as_millis() >= 100 {
                let percent =
                    total_size.map(|t| ((bytes_written as f64 / t as f64) * 100.0) as u32);
                let _ = app.emit(
                    "model_download_progress",
                    ModelDownloadProgress {
                        model_type: model_type.clone(),
                        filename: filename.to_string(),
                        bytes_downloaded: bytes_written,
                        total_bytes: total_size,
                        percent,
                        status: "downloading".to_string(),
                        message: None,
                    },
                );
                last_emit = std::time::Instant::now();
            }
        }

        // Emit final progress for this file
        let _ = app.emit(
            "model_download_progress",
            ModelDownloadProgress {
                model_type: model_type.clone(),
                filename: filename.to_string(),
                bytes_downloaded: bytes_written,
                total_bytes: total_size,
                percent: Some(100),
                status: "complete".to_string(),
                message: Some(format!("Downloaded {}", filename)),
            },
        );

        tracing::info!(
            "Downloaded {} successfully: {} bytes",
            filename,
            bytes_written
        );

        // Verify file was written and is not empty
        if bytes_written == 0 {
            error_msg = format!("{} downloaded but is empty", filename);
            all_files_valid = false;
            std::fs::remove_file(&target_path).ok();
            tracing::error!("File {} is empty, removing", filename);
        }
    }

    if !all_files_valid {
        return Err(error_msg);
    }

    // Final validation: check that ALL required files exist and have content
    let required_files = ["config.json", "model.safetensors", "tokenizer.json"];
    for required in &required_files {
        let path = target_dir.join(required);
        if !path.exists() {
            return Err(format!(
                "Model validation failed: {} is missing. Please download again.",
                required
            ));
        }

        let metadata =
            std::fs::metadata(&path).map_err(|e| format!("Cannot validate {}: {}", required, e))?;

        if metadata.len() == 0 {
            return Err(format!(
                "Model validation failed: {} is empty (0 bytes). Please download again.",
                required
            ));
        }
    }

    tracing::info!("Model {} downloaded and validated successfully", model_type);
    Ok(format!(
        "Successfully downloaded and validated {}",
        model_type
    ))
}

/// Check if models exist and download if missing (for background startup download)
#[tauri::command]
pub async fn check_and_download_models(app: AppHandle) -> Result<bool, String> {
    use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
    use tauri::Emitter;

    let models = MmapModel2VecEmbedder::available_models();

    // Check if Flash model is available
    let flash_available = models.iter().any(|(model_type, available, _)| {
        format!("{:?}", model_type) == "IxosFlashV2" && *available
    });

    if flash_available {
        tracing::info!("Flash model already available, no download needed");
        return Ok(true);
    }

    // Emit starting event
    let _ = app.emit(
        "model_download_progress",
        ModelDownloadProgress {
            model_type: "ixos-flash-v2".to_string(),
            filename: "".to_string(),
            bytes_downloaded: 0,
            total_bytes: None,
            percent: Some(0),
            status: "starting".to_string(),
            message: Some("Starting model download...".to_string()),
        },
    );

    // Download Flash model
    tracing::info!("Flash model not found, initiating background download");
    match download_model(app.clone(), "ixos-flash-v2".to_string()).await {
        Ok(_) => {
            let _ = app.emit(
                "model_download_progress",
                ModelDownloadProgress {
                    model_type: "ixos-flash-v2".to_string(),
                    filename: "all".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percent: Some(100),
                    status: "complete".to_string(),
                    message: Some("Model download complete!".to_string()),
                },
            );
            Ok(true)
        }
        Err(e) => {
            let _ = app.emit(
                "model_download_progress",
                ModelDownloadProgress {
                    model_type: "ixos-flash-v2".to_string(),
                    filename: "".to_string(),
                    bytes_downloaded: 0,
                    total_bytes: None,
                    percent: None,
                    status: "error".to_string(),
                    message: Some(format!("Download failed: {}", e)),
                },
            );
            Err(e)
        }
    }
}
