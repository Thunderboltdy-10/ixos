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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.unminimize();
                let _ = main.set_focus();
            }
        }))
        .setup(|app| {
            // Initialize application state
            app.manage(state::AppState::new());

            // Initialize P2 perceived performance state
            app.manage(commands::history::HistoryState::default());
            app.manage(commands::prefetch::PrefetchState::default());
            app.manage(commands::indexer::IndexerState::default());

            // Initialize Phase 2 Second Brain state
            app.manage(commands::activity::ActivityState::default());
            app.manage(commands::workstreams::WorkstreamsState::default());

            // Periodic autosave for activity ledger (every 5 minutes when dirty).
            let autosave_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(300)).await;
                    if let Err(e) =
                        commands::activity::autosave_if_dirty(autosave_handle.clone()).await
                    {
                        tracing::warn!("Activity autosave skipped: {}", e);
                    }
                    if let Err(e) =
                        commands::workstreams::autosave_if_dirty(autosave_handle.clone()).await
                    {
                        tracing::warn!("Workstreams autosave skipped: {}", e);
                    }
                }
            });
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
                    // Trigger a best-effort final activity save on close.
                    let save_handle = window.app_handle().clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = commands::activity::autosave_if_dirty(save_handle.clone()).await;
                        let _ = commands::workstreams::autosave_if_dirty(save_handle).await;
                    });

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
            // Personal ranking
            commands::personal_ranking::pin_file,
            commands::personal_ranking::unpin_file,
            commands::personal_ranking::ignore_file,
            commands::personal_ranking::unignore_file,
            commands::personal_ranking::mark_not_relevant,
            commands::personal_ranking::get_personal_signals,
            commands::personal_ranking::reset_learning,
            // Config
            commands::config::get_config,
            commands::config::update_config,
            commands::config::reset_config,
            commands::config::get_consent_status,
            commands::config::grant_consent,
            commands::config::withdraw_consent,
            // Diagnostics
            commands::doctor::run_doctor,
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
            commands::auth::set_entitlement_public_key,
            commands::auth::set_entitlement_token,
            commands::auth::clear_entitlement_token,
            commands::auth::check_search_allowed,
            commands::auth::get_pro_status,
            commands::auth::get_device_id,
            commands::auth::get_device_public_key,
            commands::auth::open_checkout,
            commands::auth::open_external_url,
            // Pro
            commands::pro::ask_mode_plus,
            commands::pro::extract_answer_card,
            // Cache Management
            commands::storage::get_cache_stats,
            commands::storage::clear_embedding_cache,
            commands::storage::clear_all_embedding_cache,
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
            // Phase 2: Activity Ledger
            commands::activity::log_activity,
            commands::activity::log_result_shown,
            commands::activity::get_activity,
            commands::activity::get_co_occurrence,
            commands::activity::get_recently_touched,
            commands::activity::clear_activity,
            commands::activity::get_activity_stats,
            commands::activity::save_activity_ledger,
            commands::activity::load_activity_ledger,
            // Phase 2: Workstreams
            commands::workstreams::list_workstreams,
            commands::workstreams::get_workstream,
            commands::workstreams::create_workstream,
            commands::workstreams::rename_workstream,
            commands::workstreams::merge_workstreams,
            commands::workstreams::delete_workstream,
            commands::workstreams::recluster_workstreams,
            commands::workstreams::pin_workstream,
            commands::workstreams::get_workstreams_stats,
            commands::workstreams::save_workstreams,
            commands::workstreams::load_workstreams,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
