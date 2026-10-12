//! Diagnostics command handlers.

use ixos_core::diagnostics::{run_doctor as run_doctor_checks, DoctorOptions, DoctorReport};

#[tauri::command]
pub async fn run_doctor(verbose: Option<bool>) -> Result<DoctorReport, String> {
    Ok(run_doctor_checks(DoctorOptions {
        verbose: verbose.unwrap_or(false),
    })
    .await)
}
