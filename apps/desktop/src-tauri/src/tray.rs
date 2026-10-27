//! Tray icon: quick search, the main window, Settings and Quit.
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    App, Emitter,
};

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "search", "Quick search", true, None::<&str>)?,
            &MenuItem::with_id(app, "open", "Open Ixos", true, None::<&str>)?,
            &MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", "Quit Ixos", true, None::<&str>)?,
        ],
    )?;
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("The window icon is missing from tauri.conf.json")?;
    TrayIconBuilder::with_id("ixos")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Ixos")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "search" => {
                let _ = crate::commands::system::show_overlay(app.clone());
            }
            "open" => crate::commands::system::show_main(app),
            "settings" => {
                crate::commands::system::show_main(app);
                let _ = app.emit("open-settings", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                crate::commands::system::show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
