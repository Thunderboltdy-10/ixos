// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    // Load environment variables from .env or .env.local
    // Search in current directory, project root, and executable directory
    dotenvy::dotenv().ok();
    dotenvy::from_filename(".env.local").ok();
    
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            dotenvy::from_path(exe_dir.join(".env.local")).ok();
            if let Some(parent) = exe_dir.parent() {
                dotenvy::from_path(parent.join(".env.local")).ok();
            }
        }
    }

    // Initialize tracing for logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .init();

    let config = ixos_protocol::cli::IxosConfig::load();
    ixos_protocol::telemetry::install_crash_handler(
        ixos_protocol::telemetry::TelemetryConfig {
            crash_opt_in: config.security.telemetry_opt_in,
        },
        "tauri",
    );

    ixos_app_lib::run();
}
