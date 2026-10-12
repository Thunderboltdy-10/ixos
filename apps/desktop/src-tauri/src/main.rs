#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info,winit=error")
        .init();
    ixos_app_lib::run();
}
