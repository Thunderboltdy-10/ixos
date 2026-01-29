//! Ixos Desktop Application
//!
//! Tauri v2 backend for the Ixos privacy-first semantic file search tool.
//!
//! This module provides:
//! - Search commands with progressive streaming results
//! - Configuration management
//! - Compliance (GDPR/CCPA) controls
//! - System tray and global hotkey integration
//! - Journalist mode emergency clear

pub mod commands;
pub mod state;
pub mod tray;

use tauri::Manager;

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_prevent_default::Builder::new()
                .with_flags(tauri_plugin_prevent_default::Flags::DOWNLOADS)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
        }))
        .setup(|app| {
            // Initialize application state
            app.manage(state::AppState::new());

            // Initialize P2 perceived performance state
            app.manage(commands::history::HistoryState::default());
            app.manage(commands::prefetch::PrefetchState::default());
            app.manage(commands::indexer::IndexerState::default());

            // Setup system tray
            tray::setup_tray(app)?;

            // Setup global hotkey - now uses configurable shortcut from settings
            commands::shortcut::setup_global_shortcut(app)?;

            tracing::info!("Ixos application started");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    // Check if "Quit on Close" is enabled
                    // We load config here (synchronously) to avoid complex state management
                    // This is acceptable for a UI event handler
                    let config = ixos_protocol::cli::IxosConfig::load();
                    if !config.output.exit_on_close {
                         // Default behavior: minimize to tray
                         window.hide().ok();
                         api.prevent_close();
                    }
                    // Else: allow close (which quits the app since it's the main window)
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Search
            commands::search::search_progressive,
            commands::search::cancel_search,
            // Config
            commands::config::get_config,
            commands::config::update_config,
            commands::config::reset_config,
            commands::config::get_consent_status,
            commands::config::grant_consent,
            commands::config::withdraw_consent,
            // System
            commands::system::show_overlay,
            commands::system::hide_overlay,
            commands::system::open_file,
            commands::system::reveal_in_explorer,
            commands::system::emergency_clear,
            commands::system::get_default_search_directory,
            commands::system::select_directory,
            commands::system::get_model_status,
            commands::system::preload_model,
            commands::system::download_model,
            commands::system::check_and_download_models,
            // Storage
            commands::storage::write_encrypted_file,
            commands::storage::read_encrypted_file,
            commands::storage::delete_encrypted_file,
            commands::storage::clear_all_encrypted_files,
            // Auth / Entitlements
            commands::auth::verify_entitlement_token,
            commands::auth::set_entitlement_token,
            commands::auth::clear_entitlement_token,
            commands::auth::check_search_allowed,
            commands::auth::get_device_id,
            commands::auth::open_checkout,
            commands::auth::open_external_url,
            // Cache Management
            commands::storage::get_cache_stats,
            commands::storage::clear_embedding_cache,
            // P2.1: Search History (Ramp 1)
            commands::history::get_search_suggestions,
            commands::history::add_to_history,
            commands::history::delete_history_item,
            commands::history::clear_history,
            commands::history::get_all_history,
            // P2.3: File Prefetching
            commands::prefetch::prefetch_file,
            commands::prefetch::get_file_content,
            commands::prefetch::clear_prefetch_cache,
            commands::prefetch::get_prefetch_stats,
            // P2.3: Background Indexing
            commands::indexer::start_background_indexing,
            commands::indexer::stop_background_indexing,
            commands::indexer::is_indexing,
            // Keyboard Shortcuts
            commands::shortcut::get_shortcut_config,
            commands::shortcut::set_shortcut_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
