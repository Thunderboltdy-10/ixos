// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    #[cfg(debug_assertions)]
    {
        // Development-only env hydration. Release builds should rely on CI/build-time
        // values rather than sidecar `.env.local` files next to the packaged app.
        dotenvy::dotenv().ok();
        dotenvy::from_filename(".env.local").ok();
        dotenvy::from_filename("src-tauri/.env").ok();
        dotenvy::from_filename("src-tauri/.env.local").ok();

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                dotenvy::from_path(exe_dir.join(".env.local")).ok();
                if let Some(parent) = exe_dir.parent() {
                    dotenvy::from_path(parent.join(".env.local")).ok();
                }
            }
        }
    }

    // Initialize tracing for logging
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,winit=error"));

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .init();

    let config = ixos_core::cli::IxosConfig::load();
    ixos_core::telemetry::install_crash_handler(
        ixos_core::telemetry::TelemetryConfig {
            crash_opt_in: config.security.telemetry_opt_in,
        },
        "tauri",
    );

    ixos_app_lib::run();
}
