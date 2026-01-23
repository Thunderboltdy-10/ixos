//! Search history tracking for GDPR compliance.
//!
//! Tracks search queries and results for data subject access requests.
//! Search history is stored locally and can be exported or deleted per GDPR.

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

use super::storage::ComplianceStorage;
use super::types::ComplianceError;

/// A search history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHistoryEntry {
    /// Unique entry ID
    pub id: String,
    /// Search query
    pub query: String,
    /// When the search was performed
    pub timestamp: DateTime<Utc>,
    /// Number of results returned
    pub result_count: usize,
    /// Search duration in milliseconds
    pub duration_ms: u64,
    /// Whether lexical or semantic search was used
    pub search_mode: SearchMode,
}

/// Search mode used
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SearchMode {
    /// Keyword-based lexical search
    Lexical,
    /// AI-powered semantic search
    Semantic,
    /// Hybrid lexical + semantic search
    Hybrid,
}

impl std::fmt::Display for SearchMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SearchMode::Lexical => write!(f, "Lexical"),
            SearchMode::Semantic => write!(f, "Semantic"),
            SearchMode::Hybrid => write!(f, "Hybrid"),
        }
    }
}

impl SearchHistoryEntry {
    /// Create a new search history entry
    pub fn new(
        query: String,
        result_count: usize,
        duration_ms: u64,
        search_mode: SearchMode,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            query,
            timestamp: Utc::now(),
            result_count,
            duration_ms,
            search_mode,
        }
    }
}

/// Summary of search history for export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHistorySummary {
    /// Total number of searches
    pub total_searches: usize,
    /// Date of first search
    pub first_search: Option<DateTime<Utc>>,
    /// Date of most recent search
    pub last_search: Option<DateTime<Utc>>,
    /// Most common search terms (top 10)
    pub common_terms: Vec<(String, usize)>,
    /// Search mode breakdown
    pub mode_counts: SearchModeCounts,
}

/// Counts of searches by mode
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SearchModeCounts {
    pub lexical: usize,
    pub semantic: usize,
    pub hybrid: usize,
}

/// Search history manager
pub struct SearchHistory {
    storage: ComplianceStorage,
}

impl SearchHistory {
    /// Create a new search history manager
    pub fn new(storage: ComplianceStorage) -> Self {
        Self { storage }
    }

    /// Generate filename for a specific date
    fn filename_for_date(&self, date: NaiveDate) -> String {
        format!("searches_{}.jsonl", date.format("%Y-%m-%d"))
    }

    /// Record a search
    pub fn record_search(&self, entry: SearchHistoryEntry) -> Result<(), ComplianceError> {
        let filename = self.filename_for_date(entry.timestamp.date_naive());
        self.storage.append_jsonl("history", &filename, &entry)?;

        tracing::debug!(
            query = %entry.query,
            results = entry.result_count,
            duration_ms = entry.duration_ms,
            "Search recorded"
        );

        Ok(())
    }

    /// Record a search with basic info
    pub fn record(
        &self,
        query: &str,
        result_count: usize,
        duration_ms: u64,
        search_mode: SearchMode,
    ) -> Result<(), ComplianceError> {
        let entry =
            SearchHistoryEntry::new(query.to_string(), result_count, duration_ms, search_mode);
        self.record_search(entry)
    }

    /// Get all searches for a specific date
    pub fn get_for_date(
        &self,
        date: NaiveDate,
    ) -> Result<Vec<SearchHistoryEntry>, ComplianceError> {
        let filename = self.filename_for_date(date);
        self.storage.read_jsonl("history", &filename)
    }

    /// Get all searches in a date range
    pub fn get_range(
        &self,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<SearchHistoryEntry>, ComplianceError> {
        let mut entries = Vec::new();
        let mut current = start;

        while current <= end {
            match self.get_for_date(current) {
                Ok(day_entries) => entries.extend(day_entries),
                Err(ComplianceError::Storage(e)) if e.kind() == std::io::ErrorKind::NotFound => {
                    // No entries for this day
                }
                Err(e) => return Err(e),
            }

            current = current
                .succ_opt()
                .ok_or_else(|| ComplianceError::ExportFailed("Date overflow".to_string()))?;
        }

        // Sort by timestamp
        entries.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

        Ok(entries)
    }

    /// Get recent searches (last N days)
    pub fn get_recent(&self, days: u32) -> Result<Vec<SearchHistoryEntry>, ComplianceError> {
        let end = Utc::now().date_naive();
        let start = end - chrono::Duration::days(days as i64);
        self.get_range(start, end)
    }

    /// Get all search history
    pub fn get_all(&self) -> Result<Vec<SearchHistoryEntry>, ComplianceError> {
        let files = self.storage.list_files("history", "jsonl")?;
        let mut all_entries = Vec::new();

        for path in files {
            let filename = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default();

            match self
                .storage
                .read_jsonl::<SearchHistoryEntry>("history", filename)
            {
                Ok(entries) => all_entries.extend(entries),
                Err(e) => {
                    tracing::warn!("Failed to read history file {:?}: {}", path, e);
                }
            }
        }

        // Sort by timestamp
        all_entries.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

        Ok(all_entries)
    }

    /// Get search history summary
    pub fn get_summary(&self) -> Result<SearchHistorySummary, ComplianceError> {
        let all_entries = self.get_all()?;

        if all_entries.is_empty() {
            return Ok(SearchHistorySummary {
                total_searches: 0,
                first_search: None,
                last_search: None,
                common_terms: Vec::new(),
                mode_counts: SearchModeCounts::default(),
            });
        }

        // Count search modes
        let mut mode_counts = SearchModeCounts::default();
        for entry in &all_entries {
            match entry.search_mode {
                SearchMode::Lexical => mode_counts.lexical += 1,
                SearchMode::Semantic => mode_counts.semantic += 1,
                SearchMode::Hybrid => mode_counts.hybrid += 1,
            }
        }

        // Count term frequency
        let mut term_counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for entry in &all_entries {
            for word in entry.query.split_whitespace() {
                let word_lower = word.to_lowercase();
                if word_lower.len() > 2 {
                    // Skip short words
                    *term_counts.entry(word_lower).or_insert(0) += 1;
                }
            }
        }

        // Get top 10 terms
        let mut term_vec: Vec<_> = term_counts.into_iter().collect();
        term_vec.sort_by(|a, b| b.1.cmp(&a.1));
        let common_terms: Vec<_> = term_vec.into_iter().take(10).collect();

        Ok(SearchHistorySummary {
            total_searches: all_entries.len(),
            first_search: all_entries.first().map(|e| e.timestamp),
            last_search: all_entries.last().map(|e| e.timestamp),
            common_terms,
            mode_counts,
        })
    }

    /// Clear all search history
    pub fn clear_all(&self) -> Result<usize, ComplianceError> {
        let count = self.storage.clear_subdir("history")?;

        tracing::info!(count = count, "Search history cleared");

        Ok(count)
    }

    /// Clear search history older than N days
    pub fn clear_older_than(&self, days: u32) -> Result<usize, ComplianceError> {
        let cutoff = Utc::now().date_naive() - chrono::Duration::days(days as i64);
        let files = self.storage.list_files("history", "jsonl")?;
        let mut deleted = 0;

        for path in files {
            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                // Parse date from filename: searches_YYYY-MM-DD.jsonl
                if let Some(date_str) = filename
                    .strip_prefix("searches_")
                    .and_then(|s| s.strip_suffix(".jsonl"))
                {
                    if let Ok(file_date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                        if file_date < cutoff {
                            if std::fs::remove_file(&path).is_ok() {
                                deleted += 1;
                            }
                        }
                    }
                }
            }
        }

        tracing::info!(
            deleted = deleted,
            cutoff_date = %cutoff,
            "Old search history cleared"
        );

        Ok(deleted)
    }

    /// Export history to JSON
    pub fn export_json(&self) -> Result<String, ComplianceError> {
        let entries = self.get_all()?;
        Ok(serde_json::to_string_pretty(&entries)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_history_entry_creation() {
        let entry = SearchHistoryEntry::new("test query".to_string(), 10, 150, SearchMode::Hybrid);

        assert_eq!(entry.query, "test query");
        assert_eq!(entry.result_count, 10);
        assert_eq!(entry.duration_ms, 150);
        assert_eq!(entry.search_mode, SearchMode::Hybrid);
    }

    #[test]
    fn test_search_mode_display() {
        assert_eq!(SearchMode::Lexical.to_string(), "Lexical");
        assert_eq!(SearchMode::Semantic.to_string(), "Semantic");
        assert_eq!(SearchMode::Hybrid.to_string(), "Hybrid");
    }
}
