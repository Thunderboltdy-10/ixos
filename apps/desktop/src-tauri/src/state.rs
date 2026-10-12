//! Resident engines and cancellation state owned by the tray process.
use ixos_core::retrieval::Engine;
use std::{
    collections::BTreeMap,
    sync::{atomic::AtomicU64, Mutex},
};
#[derive(Default)]
pub struct AppState {
    pub engines: Mutex<BTreeMap<String, Engine>>,
    pub generation: AtomicU64,
}
