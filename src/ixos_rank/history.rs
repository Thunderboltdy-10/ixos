//! Search history buffer for instant echo (P2.1 Ramp 1)
//!
//! Provides in-memory search history with prefix matching for
//! instant suggestions in the first 50ms of a search.

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// Maximum number of history entries to keep
const MAX_HISTORY_ENTRIES: usize = 100;

/// A single search history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    /// The search query
    pub query: String,
    /// Directory searched
    pub directory: PathBuf,
    /// Number of results found
    pub result_count: usize,
    /// Timestamp (ms since epoch)
    pub timestamp: u64,
}

/// Search history buffer with prefix matching
#[derive(Debug, Default)]
pub struct SearchHistory {
    entries: VecDeque<HistoryEntry>,
}

impl SearchHistory {
    pub fn new() -> Self {
        Self {
            entries: VecDeque::with_capacity(MAX_HISTORY_ENTRIES),
        }
    }

    /// Add a new entry to history
    pub fn add(&mut self, query: String, directory: PathBuf, result_count: usize) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        // Remove existing entry if it exists (deduplication)
        // Check for same query and directory (case-insensitive for query)
        let query_lower = query.to_lowercase();
        self.entries
            .retain(|e| e.query.to_lowercase() != query_lower || e.directory != directory);

        // Remove oldest if at capacity
        if self.entries.len() >= MAX_HISTORY_ENTRIES {
            self.entries.pop_back();
        }

        // Add to front (most recent first)
        self.entries.push_front(HistoryEntry {
            query,
            directory,
            result_count,
            timestamp,
        });
    }

    /// Get suggestions matching a prefix (case-insensitive)
    pub fn get_suggestions(&self, prefix: &str, limit: usize) -> Vec<&HistoryEntry> {
        let prefix_lower = prefix.to_lowercase();
        self.entries
            .iter()
            .filter(|e| e.query.to_lowercase().starts_with(&prefix_lower))
            .take(limit)
            .collect()
    }

    /// Clear all history
    pub fn clear(&mut self) {
        self.entries.clear();
    }

    /// Remove a specific query from history
    pub fn remove(&mut self, query: &str) {
        let query_lower = query.to_lowercase();
        self.entries
            .retain(|e| e.query.to_lowercase() != query_lower);
    }

    /// Get all entries (for export)
    pub fn entries(&self) -> impl Iterator<Item = &HistoryEntry> {
        self.entries.iter()
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if history is empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_add_and_retrieve() {
        let mut history = SearchHistory::new();
        history.add("test query".to_string(), PathBuf::from("/tmp"), 5);

        assert_eq!(history.len(), 1);
        let entries: Vec<_> = history.entries().collect();
        assert_eq!(entries[0].query, "test query");
    }

    #[test]
    fn test_history_prefix_matching() {
        let mut history = SearchHistory::new();
        history.add("apple pie".to_string(), PathBuf::from("/tmp"), 3);
        history.add("apple sauce".to_string(), PathBuf::from("/tmp"), 2);
        history.add("banana bread".to_string(), PathBuf::from("/tmp"), 1);

        let suggestions = history.get_suggestions("app", 10);
        assert_eq!(suggestions.len(), 2);
        assert!(suggestions[0].query.starts_with("apple"));
    }

    #[test]
    fn test_history_case_insensitive() {
        let mut history = SearchHistory::new();
        history.add("Apple Pie".to_string(), PathBuf::from("/tmp"), 3);

        let suggestions = history.get_suggestions("app", 10);
        assert_eq!(suggestions.len(), 1);
    }

    #[test]
    fn test_history_limit() {
        let mut history = SearchHistory::new();
        history.add("apple".to_string(), PathBuf::from("/tmp"), 1);
        history.add("apricot".to_string(), PathBuf::from("/tmp"), 1);
        history.add("avocado".to_string(), PathBuf::from("/tmp"), 1);

        let suggestions = history.get_suggestions("a", 2);
        assert_eq!(suggestions.len(), 2);
    }

    #[test]
    fn test_history_max_capacity() {
        let mut history = SearchHistory::new();

        // Add more than MAX_HISTORY_ENTRIES
        for i in 0..150 {
            history.add(format!("query{}", i), PathBuf::from("/tmp"), 1);
        }

        assert_eq!(history.len(), MAX_HISTORY_ENTRIES);
    }

    #[test]
    fn test_history_deduplication() {
        let mut history = SearchHistory::new();
        // Add initial entry
        history.add("apple".to_string(), PathBuf::from("/tmp"), 5);

        // Add another entry
        history.add("banana".to_string(), PathBuf::from("/tmp"), 2);

        // Add apple again (should replace previous)
        history.add("Apple".to_string(), PathBuf::from("/tmp"), 10); // Case insensitive check

        assert_eq!(history.len(), 2);

        // Check order - Apple should be first (most recent)
        let entries: Vec<_> = history.entries().collect();
        assert_eq!(entries[0].query, "Apple");
        assert_eq!(entries[0].result_count, 10);
        assert_eq!(entries[1].query, "banana");
    }

    #[test]
    fn test_history_deduplication_different_dirs() {
        let mut history = SearchHistory::new();
        history.add("apple".to_string(), PathBuf::from("/tmp1"), 5);
        history.add("apple".to_string(), PathBuf::from("/tmp2"), 2);

        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_history_clear() {
        let mut history = SearchHistory::new();
        history.add("test".to_string(), PathBuf::from("/tmp"), 1);
        assert_eq!(history.len(), 1);

        history.clear();
        assert!(history.is_empty());
    }
}
