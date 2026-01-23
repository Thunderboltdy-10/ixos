// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
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
