//! Tray process and commands for local search.
pub mod commands;
pub mod state;
pub mod tray;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(state::AppState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::setup_tray(app)?;
            commands::shortcut::setup_global_shortcut(app)?;
            commands::system::setup_models(app.handle().clone());
            commands::search::warm(app.handle().clone());
            if !commands::settings::Settings::load()
                .search
                .locations
                .is_empty()
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" && commands::settings::Settings::load().quit_on_close {
                    window.app_handle().exit(0);
                } else {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::search::search_progressive,
            commands::search::cancel_search,
            commands::search::get_location_status,
            commands::recent::list_recent_searches,
            commands::recent::clear_recent_searches,
            commands::settings::get_config,
            commands::settings::update_config,
            commands::storage::cache_stats,
            commands::storage::cache_clear,
            commands::system::show_overlay,
            commands::system::hide_overlay,
            commands::system::open_file,
            commands::system::reveal_in_explorer,
            commands::system::select_directory,
            commands::system::suggested_locations,
            commands::system::doctor,
            commands::system::get_model_status,
            commands::system::get_skill_status,
            commands::system::install_model,
            commands::shortcut::get_shortcut_config,
            commands::shortcut::set_shortcut_config,
        ])
        .build(tauri::generate_context!())
        .expect("Cannot run Ixos")
        .run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
            ) {
                app.state::<state::AppState>().stop();
            }
        });
}
