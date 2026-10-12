//! GDPR Data Subject Rights (P1.2)
//!
//! Implements Articles 15-22 of the General Data Protection Regulation (EU) 2016/679.
//!
//! ## Supported Rights
//!
//! - **Article 15**: Right of access by the data subject
//! - **Article 16**: Right to rectification (via re-indexing)
//! - **Article 17**: Right to erasure ('right to be forgotten')
//! - **Article 18**: Right to restriction of processing (via consent withdrawal)
//! - **Article 20**: Right to data portability
//! - **Article 21**: Right to object (via consent withdrawal)
//!
//! ## Response Deadline
//!
//! Per Article 12(3), requests must be handled within one month (30 days).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::audit::{AuditEventType, AuditLogger};
use super::consent::{ConsentManager, ConsentRecord};
use super::search_history::{SearchHistory, SearchHistoryEntry, SearchHistorySummary};
use super::storage::ComplianceStorage;
use super::types::{
    ComplianceError, DataSubjectRequest, DeletionDetails, DeletionReport, DeletionScope,
    Regulation, RequestStatus, RequestType,
};

/// User data export for Article 15 (Access) and Article 20 (Portability)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDataExport {
    /// Export metadata
    pub export_info: ExportInfo,
    /// Consent records
    pub consent_records: Vec<ConsentRecordExport>,
    /// Search history
    pub search_history: Vec<SearchHistoryEntry>,
    /// Search history summary
    pub search_summary: SearchHistorySummary,
    /// Cache information (not actual content)
    pub cache_info: CacheInfo,
    /// Data processing information
    pub processing_info: ProcessingInfo,
}

/// Export metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportInfo {
    /// When the export was created
    pub exported_at: DateTime<Utc>,
    /// Export format version
    pub format_version: String,
    /// Regulation under which export was requested
    pub regulation: String,
    /// GDPR Article(s) applicable
    pub gdpr_articles: Vec<String>,
}

/// Consent record for export (simplified)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsentRecordExport {
    /// Consent type
    pub consent_type: String,
    /// Whether consent was granted
    pub granted: bool,
    /// When consent action occurred
    pub timestamp: DateTime<Utc>,
    /// Disclosure version shown
    pub disclosure_version: Option<String>,
}

impl From<ConsentRecord> for ConsentRecordExport {
    fn from(record: ConsentRecord) -> Self {
        Self {
            consent_type: record.consent_type.to_string(),
            granted: record.granted,
            timestamp: record.timestamp,
            disclosure_version: record.disclosure_version,
        }
    }
}

/// Cache information (metadata only, not content)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheInfo {
    /// Number of files with cached embeddings
    pub cached_file_count: usize,
    /// Total size of cached data in bytes
    pub total_cache_size_bytes: u64,
    /// Note about cache storage
    pub storage_note: String,
}

/// Information about data processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingInfo {
    /// Types of processing performed
    pub processing_types: Vec<String>,
    /// Legal basis for processing
    pub legal_basis: String,
    /// Data retention policy
    pub retention_policy: String,
    /// Data protection measures
    pub protection_measures: Vec<String>,
}

impl Default for ProcessingInfo {
    fn default() -> Self {
        Self {
            processing_types: vec![
                "Semantic embedding generation".to_string(),
                "Similarity-based search ranking".to_string(),
                "Search history logging".to_string(),
            ],
            legal_basis: "Consent (GDPR Article 6(1)(a))".to_string(),
            retention_policy: "Data retained until user requests deletion or withdraws consent. \
                Cached embeddings are invalidated when source files are modified."
                .to_string(),
            protection_measures: vec![
                "All processing happens locally (no external transmission)".to_string(),
                "HMAC-SHA256 signed cache entries".to_string(),
                "Memory protection for sensitive data".to_string(),
                "Constant-time embedding generation".to_string(),
            ],
        }
    }
}

/// GDPR compliance layer
pub struct GDPRLayer {
    storage: ComplianceStorage,
    consent_manager: ConsentManager,
    search_history: SearchHistory,
    audit: AuditLogger,
    /// Paths to scan for cached embeddings
    cache_paths: Vec<PathBuf>,
}

impl GDPRLayer {
    /// Create a new GDPR layer
    pub fn new(
        storage: ComplianceStorage,
        consent_manager: ConsentManager,
        search_history: SearchHistory,
        audit: AuditLogger,
    ) -> Self {
        Self {
            storage,
            consent_manager,
            search_history,
            audit,
            cache_paths: Vec::new(),
        }
    }

    /// Register a path to scan for cached embeddings
    pub fn register_cache_path(&mut self, path: PathBuf) {
        self.cache_paths.push(path);
    }

    /// Article 15: Handle access request
    ///
    /// Returns all personal data held about the user.
    pub fn handle_access_request(&self) -> Result<UserDataExport, ComplianceError> {
        // Create request record
        let mut request = DataSubjectRequest::new(Regulation::GDPR, RequestType::Access);
        request.update_status(RequestStatus::InProgress, "Collecting user data");

        // Collect consent records
        let consent_records: Vec<ConsentRecordExport> = self
            .consent_manager
            .export_records()?
            .into_iter()
            .map(ConsentRecordExport::from)
            .collect();

        // Collect search history
        let search_history = self.search_history.get_all()?;
        let search_summary = self.search_history.get_summary()?;

        // Get cache info
        let cache_info = self.get_cache_info()?;

        let export = UserDataExport {
            export_info: ExportInfo {
                exported_at: Utc::now(),
                format_version: "1.0".to_string(),
                regulation: "GDPR".to_string(),
                gdpr_articles: vec!["Article 15 - Right of access".to_string()],
            },
            consent_records,
            search_history,
            search_summary,
            cache_info,
            processing_info: ProcessingInfo::default(),
        };

        // Log the access request
        self.audit.log(
            AuditEventType::RequestCompleted {
                request_id: request.id.clone(),
            },
            "gdpr",
        )?;

        tracing::info!("GDPR access request completed");

        Ok(export)
    }

    /// Article 17: Handle erasure request
    ///
    /// Deletes user data according to the specified scope.
    pub fn handle_erasure_request(
        &self,
        scope: DeletionScope,
    ) -> Result<DeletionReport, ComplianceError> {
        // Create request record
        let mut request = DataSubjectRequest::new(Regulation::GDPR, RequestType::Erasure);
        request.update_status(
            RequestStatus::InProgress,
            &format!("Deleting data: {:?}", scope),
        );

        let mut details = DeletionDetails::default();

        match scope {
            DeletionScope::SearchHistory => {
                details.search_history_entries_deleted = self.search_history.clear_all()?;
            }
            DeletionScope::CachedEmbeddings => {
                details.cached_embeddings_cleared = self.clear_embedding_caches()?;
            }
            DeletionScope::ConsentRecords => {
                details.consent_records_deleted = self.consent_manager.delete_all_records()?;
            }
            DeletionScope::All => {
                details.consent_records_deleted = self.consent_manager.delete_all_records()?;
                details.search_history_entries_deleted = self.search_history.clear_all()?;
                details.cached_embeddings_cleared = self.clear_embedding_caches()?;
                details.preferences_deleted = true;
            }
        }

        let report = DeletionReport {
            request_id: request.id.clone(),
            completed_at: Utc::now(),
            scope,
            details: details.clone(),
        };

        // Store the deletion report
        let report_filename = format!("deletion_{}.json", request.id);
        self.storage
            .store_unsigned("requests", &report_filename, &report)?;

        // Log the deletion
        self.audit
            .log_data_deleted(scope, details.total_items_deleted())?;

        tracing::info!(
            scope = ?scope,
            consent_deleted = details.consent_records_deleted,
            history_deleted = details.search_history_entries_deleted,
            cache_cleared = details.cached_embeddings_cleared,
            "GDPR erasure request completed"
        );

        Ok(report)
    }

    /// Article 20: Handle portability request
    ///
    /// Exports user data in a machine-readable format (JSON).
    pub fn handle_portability_request(&self) -> Result<PathBuf, ComplianceError> {
        let export = self.handle_access_request()?;

        // Add portability-specific article
        let mut export = export;
        export
            .export_info
            .gdpr_articles
            .push("Article 20 - Right to data portability".to_string());

        // Generate export file
        let json = serde_json::to_string_pretty(&export)?;
        let filename = format!(
            "ixos_gdpr_export_{}.json",
            Utc::now().format("%Y%m%d_%H%M%S")
        );
        let export_path = self.storage.subdir("exports").join(&filename);

        std::fs::write(&export_path, json)?;

        // Log the export
        self.audit
            .log_data_exported(export_path.to_string_lossy().as_ref(), "JSON")?;

        tracing::info!(
            path = %export_path.display(),
            "GDPR data portability export created"
        );

        Ok(export_path)
    }

    /// Get cache information (without actual content)
    fn get_cache_info(&self) -> Result<CacheInfo, ComplianceError> {
        let mut cached_file_count = 0;
        let mut total_size = 0u64;

        for cache_path in &self.cache_paths {
            if cache_path.exists() {
                let (count, size) = self.count_cached_files(cache_path)?;
                cached_file_count += count;
                total_size += size;
            }
        }

        Ok(CacheInfo {
            cached_file_count,
            total_cache_size_bytes: total_size,
            storage_note:
                "Embeddings are stored in file metadata (xattr on Unix, ADS on Windows). \
                No separate cache files are created."
                    .to_string(),
        })
    }

    /// Count files with cached embeddings in a directory
    fn count_cached_files(&self, path: &Path) -> Result<(usize, u64), ComplianceError> {
        let mut count = 0;
        let mut size = 0u64;

        // Walk directory and check for cached embeddings
        for entry in walkdir::WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let cache = crate::storage::get_cache_for_path(entry.path());
                if cache.is_supported(entry.path()) {
                    // Approximate: assume 225 bytes per cached embedding
                    count += 1;
                    size += 225;
                }
            }
        }

        Ok((count, size))
    }

    /// Clear all embedding caches
    fn clear_embedding_caches(&self) -> Result<usize, ComplianceError> {
        let mut cleared = 0;

        for cache_path in &self.cache_paths {
            if cache_path.exists() {
                cleared += self.clear_cache_at_path(cache_path)?;
            }
        }

        Ok(cleared)
    }

    /// Clear embedding cache for files in a directory
    fn clear_cache_at_path(&self, path: &Path) -> Result<usize, ComplianceError> {
        let mut count = 0;

        for entry in walkdir::WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let cache = crate::storage::get_cache_for_path(entry.path());
                if cache.delete(entry.path()).is_ok() {
                    count += 1;
                }
            }
        }

        Ok(count)
    }

    /// Format access request result as CLI output
    pub fn format_access_cli(&self, export: &UserDataExport) -> String {
        let mut output = String::new();

        output.push_str("GDPR Data Access Report\n");
        output.push_str("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        output.push_str(&format!(
            "Generated: {}\n\n",
            export
                .export_info
                .exported_at
                .format("%Y-%m-%d %H:%M:%S UTC")
        ));

        output.push_str("CONSENT RECORDS\n");
        output.push_str("───────────────\n");
        if export.consent_records.is_empty() {
            output.push_str("No consent records found.\n");
        } else {
            for record in &export.consent_records {
                output.push_str(&format!(
                    "  {} - {} ({})\n",
                    record.consent_type,
                    if record.granted {
                        "Granted"
                    } else {
                        "Withdrawn"
                    },
                    record.timestamp.format("%Y-%m-%d %H:%M")
                ));
            }
        }
        output.push('\n');

        output.push_str("SEARCH HISTORY\n");
        output.push_str("──────────────\n");
        output.push_str(&format!(
            "  Total searches: {}\n",
            export.search_summary.total_searches
        ));
        if let Some(first) = export.search_summary.first_search {
            output.push_str(&format!("  First search: {}\n", first.format("%Y-%m-%d")));
        }
        if let Some(last) = export.search_summary.last_search {
            output.push_str(&format!("  Last search: {}\n", last.format("%Y-%m-%d")));
        }
        output.push('\n');

        output.push_str("CACHE INFORMATION\n");
        output.push_str("─────────────────\n");
        output.push_str(&format!(
            "  Cached files: {}\n",
            export.cache_info.cached_file_count
        ));
        output.push_str(&format!(
            "  Cache size: {} bytes\n",
            export.cache_info.total_cache_size_bytes
        ));
        output.push('\n');

        output.push_str("DATA PROCESSING\n");
        output.push_str("───────────────\n");
        output.push_str(&format!(
            "  Legal basis: {}\n",
            export.processing_info.legal_basis
        ));
        output.push_str(&format!(
            "  Processing types: {}\n",
            export.processing_info.processing_types.join(", ")
        ));

        output
    }
}

impl DeletionDetails {
    /// Total items deleted
    pub fn total_items_deleted(&self) -> usize {
        self.consent_records_deleted
            + self.search_history_entries_deleted
            + self.cached_embeddings_cleared
            + if self.preferences_deleted { 1 } else { 0 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_info_creation() {
        let info = ExportInfo {
            exported_at: Utc::now(),
            format_version: "1.0".to_string(),
            regulation: "GDPR".to_string(),
            gdpr_articles: vec!["Article 15".to_string()],
        };

        assert_eq!(info.format_version, "1.0");
        assert_eq!(info.regulation, "GDPR");
    }

    #[test]
    fn test_processing_info_default() {
        let info = ProcessingInfo::default();

        assert!(!info.processing_types.is_empty());
        assert!(info.legal_basis.contains("Consent"));
    }

    #[test]
    fn test_deletion_details_total() {
        let details = DeletionDetails {
            consent_records_deleted: 5,
            search_history_entries_deleted: 10,
            cached_embeddings_cleared: 100,
            preferences_deleted: true,
            audit_entries_retained: 50,
        };

        assert_eq!(details.total_items_deleted(), 116);
    }
}
