//! File system event types for the Ixos watcher
//!
//! Defines the event types and structures used to represent file system changes.

use std::path::PathBuf;
use std::time::Instant;

/// Type of file system event
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum EventType {
    /// File or directory was created
    Create,
    /// File or directory was modified
    Modify,
    /// File or directory was deleted
    Delete,
    /// File or directory was renamed
    Rename,
    /// File was accessed (read)
    Access,
    /// Other event type
    Other,
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventType::Create => write!(f, "create"),
            EventType::Modify => write!(f, "modify"),
            EventType::Delete => write!(f, "delete"),
            EventType::Rename => write!(f, "rename"),
            EventType::Access => write!(f, "access"),
            EventType::Other => write!(f, "other"),
        }
    }
}

/// Raw file system event before filtering
#[derive(Debug, Clone)]
pub struct FileEvent {
    /// Path to the affected file or directory
    pub path: PathBuf,
    /// Type of event
    pub event_type: EventType,
    /// When the event occurred
    pub timestamp: Instant,
    /// Whether the path is a symbolic link
    pub is_symlink: bool,
}

impl FileEvent {
    /// Create a new file event
    pub fn new(path: PathBuf, event_type: EventType) -> Self {
        Self {
            path,
            event_type,
            timestamp: Instant::now(),
            is_symlink: false,
        }
    }

    /// Create a new file event with symlink information
    pub fn with_symlink_check(path: PathBuf, event_type: EventType) -> Self {
        let is_symlink = path
            .symlink_metadata()
            .map(|m| m.file_type().is_symlink())
            .unwrap_or(false);

        Self {
            path,
            event_type,
            timestamp: Instant::now(),
            is_symlink,
        }
    }

    /// Generate a unique key for deduplication
    pub fn dedup_key(&self) -> String {
        format!("{}:{}", self.event_type, self.path.display())
    }
}

/// Processed event after passing through resilience filters
#[derive(Debug, Clone)]
pub struct ProcessedEvent {
    /// Path to the affected file or directory
    pub path: PathBuf,
    /// Type of event
    pub event_type: EventType,
    /// When the event was processed
    pub timestamp: Instant,
}

impl From<FileEvent> for ProcessedEvent {
    fn from(event: FileEvent) -> Self {
        Self {
            path: event.path,
            event_type: event.event_type,
            timestamp: event.timestamp,
        }
    }
}

impl ProcessedEvent {
    /// Create a new processed event
    pub fn new(path: PathBuf, event_type: EventType) -> Self {
        Self {
            path,
            event_type,
            timestamp: Instant::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_type_display() {
        assert_eq!(format!("{}", EventType::Create), "create");
        assert_eq!(format!("{}", EventType::Modify), "modify");
        assert_eq!(format!("{}", EventType::Delete), "delete");
    }

    #[test]
    fn test_file_event_creation() {
        let event = FileEvent::new(PathBuf::from("/test/file.txt"), EventType::Create);
        assert_eq!(event.path, PathBuf::from("/test/file.txt"));
        assert_eq!(event.event_type, EventType::Create);
        assert!(!event.is_symlink);
    }

    #[test]
    fn test_file_event_dedup_key() {
        let event = FileEvent::new(PathBuf::from("/test/file.txt"), EventType::Modify);
        let key = event.dedup_key();
        assert!(key.contains("modify"));
        assert!(key.contains("file.txt"));
    }

    #[test]
    fn test_processed_event_from_file_event() {
        let file_event = FileEvent::new(PathBuf::from("/test"), EventType::Delete);
        let processed: ProcessedEvent = file_event.into();
        assert_eq!(processed.path, PathBuf::from("/test"));
        assert_eq!(processed.event_type, EventType::Delete);
    }
}
