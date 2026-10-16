//! Resident search state belongs to the tray process.
use ixos_core::engine::Engine;
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{atomic::AtomicU64, Mutex},
};

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationStatus {
    pub directory: PathBuf,
    pub file_count: usize,
    pub skipped_files: usize,
    pub source_bytes: u64,
    pub budget_bytes: u64,
    pub stage: String,
    pub error: Option<String>,
}
#[derive(Default)]
pub struct AppState {
    pub models: Mutex<Vec<ModelStatus>>,
    pub engine: Mutex<Option<Engine>>,
    pub locations: Mutex<Vec<LocationStatus>>,
    pub generation: AtomicU64,
    pub warming_generation: AtomicU64,
}

#[derive(Clone, Serialize)]
pub struct ModelStatus {
    pub profile: ixos_core::config::Profile,
    pub installed: bool,
    pub downloading: bool,
    pub error: Option<String>,
}
