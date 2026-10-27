//! Update on launch/login, before the next session; signed app updates are mandatory.
use ixos_runtime::releases;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

pub fn start(app: tauri::AppHandle) {
    if cfg!(debug_assertions) || std::env::var_os("IXOS_NO_UPDATE_CHECK").is_some() {
        return;
    }
    // A receipt lets CLI/agents suggest desktop updates independently of engine updates.
    let _ = std::fs::create_dir_all(releases::install_dir());
    let _ = std::fs::write(
        releases::install_dir().join("desktop-version"),
        env!("CARGO_PKG_VERSION"),
    );
    tauri::async_runtime::spawn(async move {
        let engine = tauri::async_runtime::spawn_blocking(update_engine).await;
        let engine_changed = match engine {
            Ok(Ok(changed)) => changed,
            error => {
                tracing::warn!(
                    ?error,
                    "Engine update check failed; keeping the current engine"
                );
                false
            }
        };
        if let Err(error) = update_app(&app).await {
            tracing::warn!(%error, "Desktop update failed; keeping the current app");
        }
        if engine_changed {
            app.state::<crate::state::AppState>().stop();
            app.restart();
        }
    });
}
fn update_engine() -> Result<bool, String> {
    // Respect developer/admin overrides and independently installed CLI packages.
    if std::env::var_os("IXOS_ENGINE_PATH").is_some()
        || std::env::var_os("IXOS_RUNTIME_FROM").is_some()
    {
        return Ok(false);
    }
    let path = releases::engine_path();
    if !path.is_file() {
        return Ok(false);
    }
    let result = (|| -> anyhow::Result<bool> {
        let mut session = ixos_runtime::client::Session::start(&path)?;
        let info = session.call("hello", serde_json::json!({}))?;
        drop(session);
        let release = releases::latest("engine")?;
        if !releases::is_newer(
            &release.version()?.to_string(),
            info["version"].as_str().unwrap_or(""),
        ) {
            return Ok(false);
        }
        releases::install_engine(&release)
    })();
    result.map_err(|e| format!("{e:#}"))
}
async fn update_app(
    app: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if option_env!("IXOS_UPDATER_PUBLIC_KEY")
        .unwrap_or("")
        .is_empty()
    {
        return Err("Desktop build lacks its update verification key".into());
    }
    let release = tauri::async_runtime::spawn_blocking(|| -> Result<_, String> {
        let release = releases::latest("desktop").map_err(|e| e.to_string())?;
        release
            .manifest()
            .and_then(|m| m.asset().map(|_| ()))
            .map_err(|e| e.to_string())?;
        Ok(release)
    })
    .await??;
    let before_exit = app.clone();
    let updater = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(30))
        .endpoints(vec![release.url("desktop-update.json").parse()?])?
        .on_before_exit(move || before_exit.state::<crate::state::AppState>().stop())
        .build()?;
    if let Some(update) = updater.check().await? {
        update.download_and_install(|_, _| {}, || {}).await?;
        app.state::<crate::state::AppState>().stop();
        app.restart();
    }
    Ok(())
}
