//! Activity Ledger Storage
//!
//! Handles encrypted persistence of activity data to disk.
//! Uses the same SecureStore pattern as other Ixos persistence.

use super::{ActivityEvent, ActivityLedger, MAX_EVENTS, ROLLING_WINDOW_DAYS};
use serde::{Deserialize, Serialize};

/// Storage configuration
#[derive(Debug, Clone)]
pub struct StorageConfig {
    /// Maximum events to store
    pub max_events: usize,
    /// Rolling window in days
    pub rolling_window_days: u64,
    /// Storage key for encrypted persistence
    pub storage_key: String,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            max_events: MAX_EVENTS,
            rolling_window_days: ROLLING_WINDOW_DAYS,
            storage_key: "activity_ledger_v1".to_string(),
        }
    }
}

/// Serializable format for activity ledger persistence
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityStorageData {
    /// Version for migration support
    pub version: u32,
    /// Stored events
    pub events: Vec<ActivityEvent>,
    /// Last save timestamp
    pub last_saved: u64,
}

impl ActivityStorageData {
    #[allow(dead_code)]
    pub fn new(events: Vec<ActivityEvent>) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};

        Self {
            version: 1,
            events,
            last_saved: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }
}

/// Storage trait for activity ledger
pub trait ActivityStorage {
    /// Save activity ledger to storage
    fn save(&self, ledger: &ActivityLedger) -> Result<(), StorageError>;

    /// Load activity ledger from storage
    fn load(&self) -> Result<ActivityLedger, StorageError>;

    /// Clear all stored data
    fn clear(&self) -> Result<(), StorageError>;
}

/// Storage errors
#[derive(Debug, thiserror::Error)]
pub enum StorageError {
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

/// In-memory storage for testing and non-Pro users
#[allow(dead_code)]
#[derive(Debug, Default)]
pub struct MemoryStorage {
    data: std::sync::Mutex<Option<Vec<ActivityEvent>>>,
}

impl MemoryStorage {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self::default()
    }
}

impl ActivityStorage for MemoryStorage {
    fn save(&self, ledger: &ActivityLedger) -> Result<(), StorageError> {
        let mut data = self
            .data
            .lock()
            .map_err(|e| StorageError::Io(e.to_string()))?;
        *data = Some(ledger.export_events());
        Ok(())
    }

    fn load(&self) -> Result<ActivityLedger, StorageError> {
        let data = self
            .data
            .lock()
            .map_err(|e| StorageError::Io(e.to_string()))?;
        match data.as_ref() {
            Some(events) => Ok(ActivityLedger::from_events(events.clone())),
            None => Err(StorageError::NotFound),
        }
    }

    fn clear(&self) -> Result<(), StorageError> {
        let mut data = self
            .data
            .lock()
            .map_err(|e| StorageError::Io(e.to_string()))?;
        *data = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::activity_ledger::{create_event, ActivityAction};

    #[test]
    fn test_memory_storage_roundtrip() {
        let storage = MemoryStorage::new();
        let mut ledger = ActivityLedger::new();

        ledger.log_activity(create_event("/file1.txt", ActivityAction::FileOpened, None));
        ledger.log_activity(create_event(
            "/file2.txt",
            ActivityAction::SearchQuery,
            Some("test"),
        ));

        storage.save(&ledger).unwrap();

        let loaded = storage.load().unwrap();
        assert_eq!(loaded.event_count(), 2);
    }

    #[test]
    fn test_memory_storage_clear() {
        let storage = MemoryStorage::new();
        let mut ledger = ActivityLedger::new();

        ledger.log_activity(create_event("/file1.txt", ActivityAction::FileOpened, None));
        storage.save(&ledger).unwrap();

        storage.clear().unwrap();

        assert!(matches!(storage.load(), Err(StorageError::NotFound)));
    }
}
