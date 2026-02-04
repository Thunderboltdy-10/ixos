//! Workstream Storage
//!
//! Handles encrypted persistence of workstream data to disk.
//! Uses the same SecureStore pattern as activity ledger persistence.

use super::{Workstream, WorkstreamManager, MAX_WORKSTREAMS};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// Storage configuration for workstreams
#[derive(Debug, Clone)]
pub struct WorkstreamStorageConfig {
    /// Maximum workstreams to store
    pub max_workstreams: usize,
    /// Storage key for encrypted persistence
    pub storage_key: String,
}

impl Default for WorkstreamStorageConfig {
    fn default() -> Self {
        Self {
            max_workstreams: MAX_WORKSTREAMS,
            storage_key: "workstreams_v1".to_string(),
        }
    }
}

/// Serializable format for workstream persistence
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkstreamStorageData {
    /// Version for migration support
    pub version: u32,
    /// Stored workstreams
    pub workstreams: Vec<Workstream>,
    /// Last save timestamp
    pub last_saved: u64,
}

impl WorkstreamStorageData {
    /// Create new storage data from workstreams
    pub fn new(workstreams: Vec<Workstream>) -> Self {
        Self {
            version: 1,
            workstreams,
            last_saved: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }

    /// Get the workstreams
    pub fn into_workstreams(self) -> Vec<Workstream> {
        self.workstreams
    }
}

/// Storage errors
#[derive(Debug, thiserror::Error)]
pub enum WorkstreamStorageError {
    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Deserialization error: {0}")]
    Deserialization(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Storage not found")]
    NotFound,
}

/// Storage trait for workstreams
pub trait WorkstreamStorage {
    /// Save workstreams to storage
    fn save(&self, manager: &WorkstreamManager) -> Result<(), WorkstreamStorageError>;

    /// Load workstreams from storage
    fn load(&self) -> Result<Vec<Workstream>, WorkstreamStorageError>;

    /// Clear all stored workstream data
    fn clear(&self) -> Result<(), WorkstreamStorageError>;
}

/// In-memory storage for testing and non-Pro users
#[derive(Debug, Default)]
pub struct MemoryWorkstreamStorage {
    data: std::sync::Mutex<Option<Vec<Workstream>>>,
}

impl MemoryWorkstreamStorage {
    pub fn new() -> Self {
        Self::default()
    }
}

impl WorkstreamStorage for MemoryWorkstreamStorage {
    fn save(&self, manager: &WorkstreamManager) -> Result<(), WorkstreamStorageError> {
        let mut data = self
            .data
            .lock()
            .map_err(|e| WorkstreamStorageError::Io(e.to_string()))?;
        *data = Some(manager.export());
        Ok(())
    }

    fn load(&self) -> Result<Vec<Workstream>, WorkstreamStorageError> {
        let data = self
            .data
            .lock()
            .map_err(|e| WorkstreamStorageError::Io(e.to_string()))?;
        match data.as_ref() {
            Some(workstreams) => Ok(workstreams.clone()),
            None => Err(WorkstreamStorageError::NotFound),
        }
    }

    fn clear(&self) -> Result<(), WorkstreamStorageError> {
        let mut data = self
            .data
            .lock()
            .map_err(|e| WorkstreamStorageError::Io(e.to_string()))?;
        *data = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_storage_roundtrip() {
        let storage = MemoryWorkstreamStorage::new();
        let mut manager = WorkstreamManager::new();

        manager.add(Workstream::new("Workstream 1".to_string()));
        manager.add(Workstream::new("Workstream 2".to_string()));

        storage.save(&manager).unwrap();

        let loaded = storage.load().unwrap();
        assert_eq!(loaded.len(), 2);
    }

    #[test]
    fn test_memory_storage_clear() {
        let storage = MemoryWorkstreamStorage::new();
        let mut manager = WorkstreamManager::new();

        manager.add(Workstream::new("Test".to_string()));
        storage.save(&manager).unwrap();

        storage.clear().unwrap();

        assert!(matches!(
            storage.load(),
            Err(WorkstreamStorageError::NotFound)
        ));
    }

    #[test]
    fn test_storage_data_serialization() {
        let ws = Workstream::new("Test Workstream".to_string());
        let data = WorkstreamStorageData::new(vec![ws]);

        let json = serde_json::to_string(&data).unwrap();
        let parsed: WorkstreamStorageData = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.version, 1);
        assert_eq!(parsed.workstreams.len(), 1);
        assert_eq!(parsed.workstreams[0].name, "Test Workstream");
    }
}
