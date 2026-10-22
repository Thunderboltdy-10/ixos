//! Resident search state belongs to the tray process.
use ixos_runtime::client::Engine;
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
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
    pub generation: Arc<AtomicU64>,
    pub warming_generation: Arc<AtomicU64>,
    pub lifecycle: Arc<AtomicU64>,
}
impl AppState {
    pub fn stop(&self) {
        self.generation.fetch_add(1, Ordering::AcqRel);
        self.warming_generation.fetch_add(1, Ordering::AcqRel);
        self.lifecycle.fetch_add(1, Ordering::AcqRel);
        // Never wait for the engine mutex from the event loop. In-flight calls
        // see cancellation; idle workers are dropped immediately.
        if let Ok(mut engine) = self.engine.try_lock() {
            *engine = None;
        }
    }
}

#[derive(Clone, Serialize)]
pub struct ModelStatus {
    pub profile: ixos_runtime::config::Profile,
    pub installed: bool,
    pub downloading: bool,
    pub error: Option<String>,
}
