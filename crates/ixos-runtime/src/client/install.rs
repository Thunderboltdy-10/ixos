//! Use the shared engine, provisioning it from the engine bundled with this app.
use super::*;
use std::sync::Mutex;
const VERSION: &str = env!("CARGO_PKG_VERSION");
static INSTALL: Mutex<()> = Mutex::new(());
fn compatible(path: &Path) -> bool {
    Session::start(path).is_ok()
}
/// `ixos --version` output for this app's version or newer. An older app must
/// not replace an engine that `ixos update` already moved forward.
fn up_to_date(version_output: &str, own: &str) -> bool {
    version_output
        .split_whitespace()
        .nth(1)
        .is_some_and(|version| !crate::releases::is_newer(own, version))
}
fn current(path: &Path) -> bool {
    command(path)
        .arg("--version")
        .output()
        .is_ok_and(|output| up_to_date(&String::from_utf8_lossy(&output.stdout), VERSION))
        && compatible(path)
}
pub fn ensure_runtime() -> anyhow::Result<PathBuf> {
    let _guard = INSTALL
        .lock()
        .map_err(|_| anyhow::anyhow!("Runtime installer lock poisoned"))?;
    if let Some(path) = std::env::var_os("IXOS_ENGINE_PATH").map(PathBuf::from) {
        anyhow::ensure!(
            compatible(&path),
            "IXOS_ENGINE_PATH does not provide a compatible Ixos runtime: {}",
            path.display()
        );
        return Ok(path);
    }
    let shared = crate::releases::engine_path();
    // This runs for every engine session, so setup, which rewrites the user's
    // agent configuration, happens only when the shared engine needs it.
    if current(&shared) {
        return Ok(shared);
    }
    // Native packages carry their own engine. Never fetch a different release.
    let bundled = std::env::current_exe()?.with_file_name(if cfg!(windows) {
        "ixos-engine.exe"
    } else {
        "ixos-engine"
    });
    if bundled.is_file() {
        // The engine is copied first, so an agent configuration problem cannot block the app.
        let status = command(&bundled)
            .args(["setup", "--install", "--skip-models"])
            .status();
        if !status.as_ref().is_ok_and(|status| status.success()) {
            eprintln!("Ixos setup incomplete: {status:?}");
        }
    }
    anyhow::ensure!(
        compatible(&shared),
        "Ixos engine is unavailable; reinstall Ixos or set IXOS_ENGINE_PATH"
    );
    Ok(shared)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_an_older_or_unknown_engine_is_replaced() {
        assert!(up_to_date("ixos 1.2.3\n", "1.2.3"));
        assert!(up_to_date("ixos 1.3.0\n", "1.2.3"));
        assert!(!up_to_date("ixos 1.2.2\n", "1.2.3"));
        assert!(!up_to_date("", "1.2.3"));
    }
}
