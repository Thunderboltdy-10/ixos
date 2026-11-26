use std::path::Path;
#[cfg(not(target_os = "macos"))]
use tauri::LogicalSize;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_opener::OpenerExt;

const OVERLAY_WIDTH: f64 = 680.0;
const OVERLAY_MAX_HEIGHT: u32 = 640;

#[tauri::command]
pub fn show_overlay(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or("Search window is missing")?;
    app.run_on_main_thread(move || {
        if let Err(error) = toggle_overlay(&window) {
            tracing::warn!(%error, "Could not toggle quick search");
        }
    })
    .map_err(|error| error.to_string())
}

fn toggle_overlay(window: &WebviewWindow) -> tauri::Result<()> {
    if window.is_visible()? {
        return window.hide();
    }
    let max_height = place_overlay(window)?;
    window.show()?;
    window.set_focus()?;
    window.emit_to(window.label(), "shortcut-triggered", max_height)
}

fn overlay_layout(width: f64, height: f64) -> (f64, f64, u32) {
    let panel_width = (width - 32.0).clamp(1.0, OVERLAY_WIDTH);
    let top = (height * 0.18).round();
    let max_height = (height - top - 16.0).clamp(1.0, f64::from(OVERLAY_MAX_HEIGHT));
    (panel_width, top, max_height as u32)
}

#[cfg(not(target_os = "macos"))]
fn place_overlay(window: &WebviewWindow) -> tauri::Result<u32> {
    use tauri::{PhysicalPosition, PhysicalSize};

    let monitor = window
        .cursor_position()
        .ok()
        .and_then(|point| window.monitor_from_point(point.x, point.y).ok().flatten());
    let Some(monitor) = monitor.or(window.primary_monitor()?) else {
        return Ok(OVERLAY_MAX_HEIGHT);
    };
    let area = monitor.work_area();
    let scale = monitor.scale_factor();
    let work_size = area.size.to_logical::<f64>(scale);
    let (width, top, max_height) = overlay_layout(work_size.width, work_size.height);
    let old_height = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?)
        .height;
    let size = PhysicalSize::from_logical(
        LogicalSize::new(width, old_height.min(max_height.into())),
        scale,
    );
    window.set_position(PhysicalPosition::new(
        area.position.x + (area.size.width.saturating_sub(size.width) / 2) as i32,
        area.position.y + (top * scale).round() as i32,
    ))?;
    window.set_size(size)?;
    Ok(max_height)
}

#[cfg(target_os = "macos")]
fn place_overlay(window: &WebviewWindow) -> tauri::Result<u32> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSEvent, NSScreen, NSWindow};

    let mtm = MainThreadMarker::new().expect("quick search runs on the main thread");
    let cursor = NSEvent::mouseLocation();
    let screen = NSScreen::screens(mtm).iter().find(|screen| {
        let frame = screen.frame();
        cursor.x >= frame.origin.x
            && cursor.x < frame.origin.x + frame.size.width
            && cursor.y >= frame.origin.y
            && cursor.y < frame.origin.y + frame.size.height
    });
    let Some(screen) = screen.or_else(|| NSScreen::mainScreen(mtm)) else {
        return Ok(OVERLAY_MAX_HEIGHT);
    };
    let area = screen.visibleFrame();
    let (width, top, max_height) = overlay_layout(area.size.width, area.size.height);
    // SAFETY: Tauri owns the NSWindow and this callback runs on the main thread.
    let native = unsafe { &*window.ns_window()?.cast::<NSWindow>() };
    let mut frame = native.frame();
    frame.size.width = width;
    frame.size.height = frame.size.height.min(max_height.into());
    frame.origin.x = area.origin.x + (area.size.width - width) / 2.0;
    frame.origin.y = area.origin.y + area.size.height - top - frame.size.height;
    native.setFrame_display(frame, false);
    Ok(max_height)
}

#[cfg(target_os = "macos")]
pub fn configure_overlay(window: &WebviewWindow) -> tauri::Result<()> {
    use objc2_app_kit::{
        NSWindow, NSWindowAnimationBehavior, NSWindowCollectionBehavior as Behavior,
    };

    // SAFETY: Tauri owns the NSWindow and app setup runs on the main thread.
    let native = unsafe { &*window.ns_window()?.cast::<NSWindow>() };
    native.setMovable(false);
    native.setHasShadow(true);
    native.setAnimationBehavior(NSWindowAnimationBehavior::None);
    native.setExcludedFromWindowsMenu(true);
    native.setCollectionBehavior(
        Behavior::CanJoinAllSpaces
            | Behavior::FullScreenAuxiliary
            | Behavior::Transient
            | Behavior::IgnoresCycle,
    );
    Ok(())
}

#[tauri::command]
pub fn resize_overlay(window: WebviewWindow, height: u32) -> Result<(), String> {
    if window.label() != "overlay" {
        return Err("Only quick search can resize the overlay".into());
    }
    let app = window.app_handle().clone();
    app.run_on_main_thread(move || {
        if let Err(error) =
            set_overlay_height(&window, f64::from(height.clamp(1, OVERLAY_MAX_HEIGHT)))
        {
            tracing::warn!(%error, "Could not resize quick search");
        }
    })
    .map_err(|error| error.to_string())
}

#[cfg(not(target_os = "macos"))]
fn set_overlay_height(window: &WebviewWindow, height: f64) -> tauri::Result<()> {
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    window.set_size(LogicalSize::new(size.width, height))
}

#[cfg(target_os = "macos")]
fn set_overlay_height(window: &WebviewWindow, height: f64) -> tauri::Result<()> {
    use objc2_app_kit::NSWindow;

    // SAFETY: Tauri owns the NSWindow and this callback runs on the main thread.
    let native = unsafe { &*window.ns_window()?.cast::<NSWindow>() };
    let mut frame = native.frame();
    // AppKit measures from the bottom, so keep the search field anchored at the top.
    frame.origin.y += frame.size.height - height;
    frame.size.height = height;
    native.setFrame_display(frame, true);
    // The shadow follows the transparent window's content, so redraw it at the new size.
    native.invalidateShadow();
    Ok(())
}
/// Keep the launcher out of the window switcher and remove its native window controls.
#[cfg(windows)]
pub fn configure_overlay(window: &WebviewWindow) -> tauri::Result<()> {
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        UI::{
            Shell::{DefSubclassProc, SetWindowSubclass},
            WindowsAndMessaging::{
                GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, GWL_STYLE, SC_MAXIMIZE, SC_MINIMIZE,
                SC_MOVE, SC_SIZE, STYLESTRUCT, WM_NCACTIVATE, WM_NCPAINT, WM_STYLECHANGING,
                WM_SYSCOMMAND, WS_CAPTION, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW, WS_SYSMENU,
            },
        },
    };
    // Undocumented messages the visual styles engine paints the caption and frame with.
    const WM_NCUAHDRAWCAPTION: u32 = 0xAE;
    const WM_NCUAHDRAWFRAME: u32 = 0xAF;
    fn launcher_style(index: i32, style: u32) -> u32 {
        match index {
            GWL_STYLE => style & !(WS_CAPTION | WS_SYSMENU),
            GWL_EXSTYLE => (style | WS_EX_TOOLWINDOW) & !WS_EX_APPWINDOW,
            _ => style,
        }
    }
    unsafe extern "system" fn overlay_proc(
        window: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _id: usize,
        _data: usize,
    ) -> LRESULT {
        match message {
            WM_NCPAINT | WM_NCUAHDRAWCAPTION | WM_NCUAHDRAWFRAME => 0,
            // An lparam of -1 keeps the activation change but skips its repaint.
            WM_NCACTIVATE => DefSubclassProc(window, message, wparam, -1),
            WM_SYSCOMMAND
                if matches!(
                    (wparam & 0xfff0) as u32,
                    SC_MOVE | SC_SIZE | SC_MINIMIZE | SC_MAXIMIZE
                ) =>
            {
                0
            }
            WM_STYLECHANGING => {
                // Tao reapplies its window styles when the overlay is shown or hidden.
                let style = &mut *(lparam as *mut STYLESTRUCT);
                style.styleNew = launcher_style(wparam as i32, style.styleNew);
                DefSubclassProc(window, message, wparam, lparam)
            }
            _ => DefSubclassProc(window, message, wparam, lparam),
        }
    }
    let handle = window.hwnd()?.0 as HWND;
    // SAFETY: setup runs on the window's owning thread and the callback has static lifetime.
    unsafe {
        SetWindowSubclass(handle, Some(overlay_proc), 1, 0);
        for index in [GWL_STYLE, GWL_EXSTYLE] {
            let style = GetWindowLongW(handle, index) as u32;
            SetWindowLongW(handle, index, launcher_style(index, style) as i32);
        }
    }
    Ok(())
}
#[tauri::command]
pub fn hide_overlay(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or("Search window is missing")?
        .hide()
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).is_file() {
        return Err("File no longer exists".into());
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn open_link(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("Only web links can be opened".into());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn reveal_in_explorer(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())
}
/// Opens the folder picker, where several folders can be chosen at once. Nothing is
/// added here; the window adds what was chosen to its settings.
#[tauri::command]
pub async fn pick_folders(app: AppHandle) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri_plugin_dialog::DialogExt;
        app.dialog()
            .file()
            .blocking_pick_folders()
            .unwrap_or_default()
            .into_iter()
            .map(|path| {
                path.into_path()
                    .map(|path| path.to_string_lossy().into_owned())
                    .map_err(|error| error.to_string())
            })
            .collect()
    })
    .await
    .map_err(|error| error.to_string())?
}
/// Download models during first-launch setup, outside the installer executable.
/// Failed downloads leave keyword search available and can be retried in Settings.
pub fn setup_models(app: AppHandle) {
    use crate::state::{AppState, ModelStatus};
    use ixos_runtime::config::Profile;
    let profiles = [Profile::Code, Profile::Documents];
    if let Ok(mut statuses) = app.state::<AppState>().models.lock() {
        *statuses = profiles
            .iter()
            .map(|&profile| ModelStatus {
                profile,
                installed: false,
                downloading: true,
                error: None,
            })
            .collect();
    }
    let _ = tauri::Emitter::emit(&app, "models-changed", ());
    drop(tauri::async_runtime::spawn_blocking(move || {
        for profile in profiles {
            let _ = install_profile(&app, profile, None);
        }
    }));
}

fn install_profile(
    app: &AppHandle,
    profile: ixos_runtime::config::Profile,
    source: Option<std::path::PathBuf>,
) -> Result<(), String> {
    use crate::state::{AppState, ModelStatus};
    let update = |installed, downloading, error| {
        if let Ok(mut statuses) = app.state::<AppState>().models.lock() {
            statuses.retain(|status| status.profile != profile);
            statuses.push(ModelStatus {
                profile,
                installed,
                downloading,
                error,
            });
        }
        let _ = tauri::Emitter::emit(app, "models-changed", ());
    };
    update(false, true, None);
    let generation = app.state::<AppState>().lifecycle.clone();
    let expected = generation.load(std::sync::atomic::Ordering::Acquire);
    let result = ixos_runtime::client::manage_cancelled(
        "model-install",
        serde_json::json!({"profile":profile,"source":source}),
        ixos_runtime::client::Cancellation::new(generation, expected),
    )
    .map_err(|error| format!("{error:#}"));
    match result {
        Ok(_) => {
            update(true, false, None);
            super::search::warm(app.clone());
            Ok(())
        }
        Err(error) => {
            update(false, false, Some(error.clone()));
            Err(error)
        }
    }
}

#[tauri::command]
pub fn get_model_status(app: AppHandle) -> Result<Vec<crate::state::ModelStatus>, String> {
    app.state::<crate::state::AppState>()
        .models
        .lock()
        .map(|statuses| statuses.clone())
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn install_model(
    app: AppHandle,
    profile: ixos_runtime::config::Profile,
    source: Option<std::path::PathBuf>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_profile(&app, profile, source))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn suggested_locations() -> Vec<std::path::PathBuf> {
    [dirs::document_dir(), dirs::desktop_dir()]
        .into_iter()
        .flatten()
        .filter(|path| path.is_dir())
        .collect()
}
#[tauri::command]
pub async fn doctor(app: AppHandle) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let generation = app.state::<crate::state::AppState>().lifecycle.clone();
        let expected = generation.load(std::sync::atomic::Ordering::Acquire);
        ixos_runtime::client::manage_cancelled(
            "doctor",
            serde_json::json!({}),
            ixos_runtime::client::Cancellation::new(generation, expected),
        )
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error| error.to_string())
}

/// Reports each detected skill host independently, including preserved user edits.
#[tauri::command]
pub async fn get_skill_status(app: AppHandle) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let generation = app.state::<crate::state::AppState>().lifecycle.clone();
        let expected = generation.load(std::sync::atomic::Ordering::Acquire);
        ixos_runtime::client::manage_cancelled(
            "skill",
            serde_json::json!({}),
            ixos_runtime::client::Cancellation::new(generation, expected),
        )
        .map_err(|error| format!("{error:#}"))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn get_launch_at_login(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn set_launch_at_login(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let launcher = app.autolaunch();
    if enabled {
        launcher.enable()
    } else {
        launcher.disable()
    }
    .map_err(|error| error.to_string())
}
pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
