//! Shortcut command handlers
//!
//! Provides keyboard shortcut configuration and management.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// =============================================================================
// Types
// =============================================================================

/// Shortcut configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutConfig {
    /// Modifier keys (ctrl, alt, shift, meta)
    pub modifiers: Vec<String>,
    /// Main key code
    pub key: String,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            modifiers: vec!["Control".to_string()],
            key: "Space".to_string(),
        }
    }
}

impl ShortcutConfig {
    /// Get the config file path
    fn config_path() -> Option<PathBuf> {
        dirs::config_dir().map(|p| p.join("ixos").join("shortcut.json"))
    }

    /// Load shortcut config from file
    pub fn load() -> Self {
        if let Some(path) = Self::config_path() {
            if path.exists() {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(config) = serde_json::from_str(&content) {
                        return config;
                    }
                }
            }
        }
        Self::default()
    }

    /// Save shortcut config to file
    pub fn save(&self) -> Result<(), String> {
        let path = Self::config_path().ok_or("Could not determine config directory")?;

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(&path, content).map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Convert modifiers to tauri Modifiers
    pub fn to_modifiers(&self) -> Modifiers {
        let mut mods = Modifiers::empty();
        for modifier in &self.modifiers {
            match modifier.to_lowercase().as_str() {
                "control" | "ctrl" => mods |= Modifiers::CONTROL,
                "alt" => mods |= Modifiers::ALT,
                "shift" => mods |= Modifiers::SHIFT,
                "meta" | "super" | "win" | "cmd" => mods |= Modifiers::META,
                _ => {}
            }
        }
        mods
    }

    /// Convert key string to tauri Code
    pub fn to_code(&self) -> Option<Code> {
        match self.key.to_lowercase().as_str() {
            "space" => Some(Code::Space),
            "enter" => Some(Code::Enter),
            "escape" | "esc" => Some(Code::Escape),
            "tab" => Some(Code::Tab),
            "backspace" => Some(Code::Backspace),
            // Letters
            "a" => Some(Code::KeyA),
            "b" => Some(Code::KeyB),
            "c" => Some(Code::KeyC),
            "d" => Some(Code::KeyD),
            "e" => Some(Code::KeyE),
            "f" => Some(Code::KeyF),
            "g" => Some(Code::KeyG),
            "h" => Some(Code::KeyH),
            "i" => Some(Code::KeyI),
            "j" => Some(Code::KeyJ),
            "k" => Some(Code::KeyK),
            "l" => Some(Code::KeyL),
            "m" => Some(Code::KeyM),
            "n" => Some(Code::KeyN),
            "o" => Some(Code::KeyO),
            "p" => Some(Code::KeyP),
            "q" => Some(Code::KeyQ),
            "r" => Some(Code::KeyR),
            "s" => Some(Code::KeyS),
            "t" => Some(Code::KeyT),
            "u" => Some(Code::KeyU),
            "v" => Some(Code::KeyV),
            "w" => Some(Code::KeyW),
            "x" => Some(Code::KeyX),
            "y" => Some(Code::KeyY),
            "z" => Some(Code::KeyZ),
            // Numbers
            "0" | "digit0" => Some(Code::Digit0),
            "1" | "digit1" => Some(Code::Digit1),
            "2" | "digit2" => Some(Code::Digit2),
            "3" | "digit3" => Some(Code::Digit3),
            "4" | "digit4" => Some(Code::Digit4),
            "5" | "digit5" => Some(Code::Digit5),
            "6" | "digit6" => Some(Code::Digit6),
            "7" | "digit7" => Some(Code::Digit7),
            "8" | "digit8" => Some(Code::Digit8),
            "9" | "digit9" => Some(Code::Digit9),
            // Function keys
            "f1" => Some(Code::F1),
            "f2" => Some(Code::F2),
            "f3" => Some(Code::F3),
            "f4" => Some(Code::F4),
            "f5" => Some(Code::F5),
            "f6" => Some(Code::F6),
            "f7" => Some(Code::F7),
            "f8" => Some(Code::F8),
            "f9" => Some(Code::F9),
            "f10" => Some(Code::F10),
            "f11" => Some(Code::F11),
            "f12" => Some(Code::F12),
            // Punctuation
            "comma" => Some(Code::Comma),
            "period" => Some(Code::Period),
            "slash" => Some(Code::Slash),
            "semicolon" => Some(Code::Semicolon),
            "quote" => Some(Code::Quote),
            "bracketleft" => Some(Code::BracketLeft),
            "bracketright" => Some(Code::BracketRight),
            "backslash" => Some(Code::Backslash),
            "minus" => Some(Code::Minus),
            "equal" => Some(Code::Equal),
            "backquote" => Some(Code::Backquote),
            _ => None,
        }
    }

    /// Build a Shortcut from this config
    pub fn to_shortcut(&self) -> Option<Shortcut> {
        let code = self.to_code()?;
        let modifiers = self.to_modifiers();
        Some(Shortcut::new(Some(modifiers), code))
    }

    /// Format for display
    pub fn display_string(&self) -> String {
        let mut parts = Vec::new();
        for modifier in &self.modifiers {
            parts.push(modifier.clone());
        }
        parts.push(self.key.clone());
        parts.join(" + ")
    }
}

// =============================================================================
// Commands
// =============================================================================

/// Get current shortcut configuration
#[tauri::command]
pub async fn get_shortcut_config() -> Result<ShortcutConfig, String> {
    Ok(ShortcutConfig::load())
}

/// Set shortcut configuration and re-register
#[tauri::command]
pub async fn set_shortcut_config(app: AppHandle, config: ShortcutConfig) -> Result<(), String> {
    // Validate the shortcut can be created
    let new_shortcut = config
        .to_shortcut()
        .ok_or_else(|| format!("Invalid key: {}", config.key))?;

    // Load old config to unregister old shortcut
    let old_config = ShortcutConfig::load();
    if let Some(old_shortcut) = old_config.to_shortcut() {
        let _ = app.global_shortcut().unregister(old_shortcut);
    }

    // Save new config
    config.save()?;

    // Register new shortcut
    register_shortcut_internal(&app, new_shortcut)?;

    tracing::info!("Shortcut updated to: {}", config.display_string());
    Ok(())
}

/// Register shortcut with the given app handle
fn register_shortcut_internal(app: &AppHandle, shortcut: Shortcut) -> Result<(), String> {
    let app_handle = app.clone();

    // Try to unregister first in case it's already registered
    let _ = app.global_shortcut().unregister(shortcut);

    let register_result =
        app.global_shortcut()
            .on_shortcut(shortcut, move |_app, _shortcut, event| {
                // Only trigger on key press, not release
                if event.state == ShortcutState::Pressed {
                    if let Some(main) = app_handle.get_webview_window("main") {
                        // Emit event to frontend for handling
                        let _ = main.emit("shortcut-triggered", ());

                        // Also toggle window visibility from backend for reliability
                        if main.is_visible().unwrap_or(false) {
                            let _ = main.hide();
                        } else {
                            let _ = main.show();
                            let _ = main.set_focus();
                            let _ = main.unminimize();
                        }
                    }
                }
            });

    register_result.map_err(|e| format!("Failed to register shortcut: {}", e))
}

/// Initialize global shortcut from saved config (called at app startup)
pub fn setup_global_shortcut(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let config = ShortcutConfig::load();

    if let Some(shortcut) = config.to_shortcut() {
        let app_handle = app.handle().clone();

        // Try to unregister any existing shortcut first
        let _ = app.global_shortcut().unregister(shortcut);

        let register_result =
            app.global_shortcut()
                .on_shortcut(shortcut, move |_app, _shortcut, event| {
                    // Only trigger on key press, not release
                    if event.state == ShortcutState::Pressed {
                        if let Some(main) = app_handle.get_webview_window("main") {
                            // Emit event to frontend for handling
                            let _ = main.emit("shortcut-triggered", ());

                            // Toggle window visibility
                            if main.is_visible().unwrap_or(false) {
                                let _ = main.hide();
                            } else {
                                let _ = main.show();
                                let _ = main.set_focus();
                                let _ = main.unminimize();
                            }
                        }
                    }
                });

        match register_result {
            Ok(_) => {
                tracing::info!("Global shortcut registered: {}", config.display_string());
            }
            Err(e) => {
                tracing::warn!(
                    "Global shortcut {} unavailable: {}. App will still work.",
                    config.display_string(),
                    e
                );
            }
        }
    } else {
        tracing::warn!("Invalid shortcut configuration, using fallback");
    }

    Ok(())
}
