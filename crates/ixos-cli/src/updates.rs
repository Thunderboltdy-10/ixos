//! Nonblocking daily update notices. MCP carries the notice to the agent itself.
use anyhow::Context;
use ixos_runtime::releases;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
#[derive(Default, Deserialize, Serialize)]
struct Notice {
    checked: u64,
    engine: Option<String>,
    desktop: Option<String>,
}
fn path() -> std::path::PathBuf {
    ixos_runtime::config::cache_dir().join("updates.json")
}
fn read() -> Notice {
    std::fs::read(path())
        .ok()
        .and_then(|v| serde_json::from_slice(&v).ok())
        .unwrap_or_default()
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
pub fn notice() -> Option<String> {
    let saved = read();
    let engine = saved
        .engine
        .as_deref()
        .is_some_and(|v| newer(v, env!("CARGO_PKG_VERSION")));
    let installed = std::fs::read_to_string(releases::install_dir().join("desktop-version")).ok();
    let desktop = installed
        .as_deref()
        .zip(saved.desktop.as_deref())
        .is_some_and(|(old, new)| newer(new, old.trim()));
    (engine || desktop).then(|| format!("Ixos update available{}. Run `{}`. Ask the user whether to update before running it; restart the MCP connection afterwards.",
        if engine && desktop { " for CLI and desktop" } else if desktop { " for desktop" } else { " for CLI/MCP/skill" },
        if desktop { "ixos update --desktop" } else { "ixos update" }))
}
fn newer(new: &str, old: &str) -> bool {
    releases::is_newer(new, old)
}
pub fn suggest() {
    if std::env::var_os("IXOS_NO_UPDATE_CHECK").is_some() {
        return;
    }
    if let Some(notice) = notice() {
        eprintln!("{notice}");
    }
    let path = path();
    // A short-lived marker bounds concurrent probes and retries after network errors.
    let lock = path.with_extension("checking");
    let fresh = |p: &std::path::Path, seconds: u64| {
        std::fs::metadata(p)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.elapsed().ok())
            .is_some_and(|age| age.as_secs() < seconds)
    };
    if fresh(&path, 86400) || fresh(&lock, 600) {
        return;
    }
    if let Some(parent) = path.parent() {
        if std::fs::create_dir_all(parent).is_err() {
            return;
        }
    }
    if lock.exists() {
        if fresh(&lock, 600) {
            return;
        }
        let _ = std::fs::remove_file(&lock);
    }
    let Ok(_marker) = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&lock)
    else {
        return;
    };
    let Ok(executable) = std::env::current_exe() else {
        return;
    };
    if releases::spawn_update_check(&executable).is_err() {
        let _ = std::fs::remove_file(lock);
    }
}
pub fn run(check: bool, desktop: bool, background: bool) -> anyhow::Result<()> {
    let engine = releases::latest("engine")?;
    // Validate protocol before suggesting or applying an incompatible upgrade.
    engine.manifest()?.asset()?;
    let app = if desktop || releases::install_dir().join("desktop-version").exists() {
        let release = releases::latest("desktop")?;
        release.manifest()?.asset()?;
        Some(release)
    } else {
        None
    };
    let saved = Notice {
        checked: now(),
        engine: Some(engine.version()?.to_string()),
        desktop: app
            .as_ref()
            .map(|r| r.version().map(|v| v.to_string()))
            .transpose()?,
    };
    std::fs::create_dir_all(path().parent().unwrap())?;
    let mut file = tempfile::NamedTempFile::new_in(path().parent().unwrap())?;
    serde_json::to_writer(&mut file, &saved)?;
    file.persist(path())?;
    let _ = std::fs::remove_file(path().with_extension("checking"));
    if check {
        if !background {
            println!(
                "{}",
                notice().unwrap_or_else(|| "Ixos is up to date.".into())
            );
        }
        return Ok(());
    }
    // Updating a custom executable would leave the command on PATH unchanged.
    let current = std::env::current_exe()?.canonicalize()?;
    let managed = releases::engine_path()
        .canonicalize()
        .context("Run the binary installer before using self-update")?;
    anyhow::ensure!(current == managed, "This CLI is managed outside the Ixos installer; update it through its original installation method");
    if newer(&engine.version()?.to_string(), env!("CARGO_PKG_VERSION")) {
        releases::install_engine(&engine)?;
        println!("Updated the shared CLI/MCP/skill. Restart running clients to use it.");
    }
    if desktop {
        releases::install_desktop(app.as_ref().context("No desktop release")?)?;
    }
    println!("Ixos update complete.");
    Ok(())
}
