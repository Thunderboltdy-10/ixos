//! Storage commands for encrypted data persistence
//!
//! Provides file I/O operations for encrypted user data (history, stats, etc.)

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Get the app config directory
fn get_config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))
}

/// Write encrypted data to a file in the app config directory
#[tauri::command]
pub async fn write_encrypted_file(
    app: tauri::AppHandle,
    filename: String,
    data: String,
) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;

    // Create config directory if it doesn't exist
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let file_path = config_dir.join(&filename);

    // Write the encrypted data (already encrypted by frontend)
    fs::write(&file_path, data).map_err(|e| format!("Failed to write file {}: {}", filename, e))?;

    Ok(())
}

/// Read encrypted data from a file in the app config directory
#[tauri::command]
pub async fn read_encrypted_file(
    app: tauri::AppHandle,
    filename: String,
) -> Result<String, String> {
    let config_dir = get_config_dir(&app)?;
    let file_path = config_dir.join(&filename);

    // Check if file exists
    if !file_path.exists() {
        return Err(format!("File not found: {}", filename));
    }

    // Read the encrypted data
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file {}: {}", filename, e))
}

/// Delete an encrypted file from the app config directory
#[tauri::command]
pub async fn delete_encrypted_file(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;
    let file_path = config_dir.join(&filename);

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete file {}: {}", filename, e))?;
    }

    Ok(())
}

/// Clear all encrypted files (for journalist mode emergency clear)
#[tauri::command]
pub async fn clear_all_encrypted_files(app: tauri::AppHandle) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;

    if !config_dir.exists() {
        return Ok(());
    }

    // List of encrypted files to delete
    let encrypted_files = ["search_history.encrypted", "statistics.encrypted"];

    for filename in &encrypted_files {
        let file_path = config_dir.join(filename);
        if file_path.exists() {
            fs::remove_file(&file_path)
                .map_err(|e| format!("Failed to delete {}: {}", filename, e))?;
        }
    }

    Ok(())
}
