//! Tray process and commands for local search.
pub mod commands;
pub mod state;
pub mod tray;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(state::AppState::default());
            tray::setup_tray(app)?;
            commands::shortcut::setup_global_shortcut(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" && !commands::settings::Settings::load().quit_on_close {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::search::search_progressive,
            commands::search::cancel_search,
            commands::settings::get_config,
            commands::settings::update_config,
            commands::system::show_overlay,
            commands::system::hide_overlay,
            commands::system::open_file,
            commands::system::reveal_in_explorer,
            commands::system::select_directory,
            commands::system::get_default_search_directory,
            commands::system::get_model_status,
            commands::system::download_model,
            commands::shortcut::get_shortcut_config,
            commands::shortcut::set_shortcut_config,
        ])
        .run(tauri::generate_context!())
        .expect("Cannot run Ixos");
}
