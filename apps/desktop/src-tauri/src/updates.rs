//! Offer a newer release each time the app opens.
use ixos_runtime::releases;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

pub fn start(app: tauri::AppHandle) {
    if cfg!(debug_assertions) || std::env::var_os("IXOS_NO_UPDATE_CHECK").is_some() {
        return;
    }
    tauri::async_runtime::spawn_blocking(move || {
        if let Err(error) = offer(&app) {
            tracing::warn!("Update check failed: {error:#}");
        }
    });
}
fn offer(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let release = releases::latest()?;
    let version = release.version()?.to_string();
    if !releases::is_newer(&version, env!("CARGO_PKG_VERSION")) {
        return Ok(());
    }
    release.manifest()?.asset()?;
    let accepted = app
        .dialog()
        .message(format!("Ixos {version} is available. Update now?"))
        .title("Update Ixos")
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Update".into(),
            "Later".into(),
        ))
        .blocking_show();
    if !accepted {
        return Ok(());
    }
    if let Err(error) = releases::install_desktop(&release, true) {
        app.dialog()
            .message(format!("Could not update Ixos: {error:#}"))
            .title("Update Ixos")
            .blocking_show();
        return Ok(());
    }
    app.state::<crate::state::AppState>().stop();
    app.restart();
}
