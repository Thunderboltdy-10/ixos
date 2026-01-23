//! P9: Crash telemetry (opt-in, local-only).
//!
//! Captures panic reports and writes them to a local bundle without
//! collecting file content or search queries.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Once;

#[derive(Debug, Clone)]
pub struct TelemetryConfig {
    pub crash_opt_in: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrashReport {
    pub timestamp: String,
    pub app: String,
    pub version: String,
    pub message: String,
    pub location: Option<String>,
    pub thread: Option<String>,
    pub backtrace: String,
    pub os: String,
    pub arch: String,
}

static HOOK_INSTALLED: Once = Once::new();

pub fn install_crash_handler(config: TelemetryConfig, app: &str) {
    if !config.crash_opt_in {
        return;
    }
    let app_name = app.to_string();
    HOOK_INSTALLED.call_once(move || {
        let default_hook = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            let report = build_report(&app_name, info);
            if let Err(e) = write_report(&report) {
                tracing::warn!("Failed to write crash report: {}", e);
            }
            default_hook(info);
        }));
    });
}

fn build_report(app: &str, info: &std::panic::PanicHookInfo<'_>) -> CrashReport {
    let message = info
        .payload()
        .downcast_ref::<&str>()
        .map(|s| s.to_string())
        .or_else(|| info.payload().downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "Unknown panic".to_string());

    let location = info
        .location()
        .map(|loc| format!("{}:{}", loc.file(), loc.line()));

    CrashReport {
        timestamp: chrono::Utc::now().to_rfc3339(),
        app: app.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        message,
        location,
        thread: std::thread::current().name().map(|s| s.to_string()),
        backtrace: format!("{:?}", std::backtrace::Backtrace::force_capture()),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

fn write_report(report: &CrashReport) -> Result<(), String> {
    let dir = crash_report_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let filename = format!(
        "crash_{}_{}.json",
        chrono::Utc::now().format("%Y%m%dT%H%M%S"),
        std::process::id()
    );
    let path = dir.join(filename);
    let content = serde_json::to_string_pretty(report).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn crash_report_dir() -> PathBuf {
    if let Some(dir) = dirs::data_dir() {
        dir.join("ixos").join("telemetry").join("crash_reports")
    } else {
        Path::new(".").join("telemetry").join("crash_reports")
    }
}
