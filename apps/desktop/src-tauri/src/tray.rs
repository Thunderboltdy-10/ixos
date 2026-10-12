//! System tray integration
//!
//! Provides system tray icon with menu for:
//! - Quick search access
//! - Settings
//! - Quit application

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    App, Emitter, Manager,
};

/// Setup the system tray icon and menu
pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let show_item = MenuItem::with_id(app, "show", "Show Ixos", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let separator = MenuItem::new(app, "", false, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Ixos", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(app, &[&show_item, &settings_item, &separator, &quit_item])?;

    // Get icon from app's default window icon (configured in tauri.conf.json)
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("Default window icon should be configured in tauri.conf.json");

    // Create tray icon with the loaded icon
    let tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Ixos - Local Search")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = crate::commands::system::show_overlay(app.clone());
            }
            "settings" => {
                // Show main window and trigger settings open via event
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                    let _ = main.emit("open-settings", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                let _ = crate::commands::system::show_overlay(app.clone());
            }
        })
        .build(app)?;

    // Store tray in app state to prevent it from being dropped
    app.manage(tray);

    Ok(())
}
