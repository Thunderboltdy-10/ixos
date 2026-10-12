//! Audit trail logging for compliance.
//!
//! This module provides tamper-evident audit logging for all compliance-related
//! operations. Audit logs are stored as JSONL files organized by date.

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

use super::storage::ComplianceStorage;
use super::types::{ComplianceError, DeletionScope, Regulation, RequestType};

/// Types of audit events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum AuditEventType {
    // Consent events
    /// User granted consent
    ConsentGranted {
        consent_type: String,
        disclosure_version: String,
    },
    /// User withdrew consent
    ConsentWithdrawn { consent_type: String },

    // Data subject request events
    /// New request received
    RequestReceived {
        request_id: String,
        request_type: RequestType,
        regulation: Regulation,
    },
    /// Request processing started
    RequestStarted { request_id: String },
    /// Request completed successfully
    RequestCompleted { request_id: String },
    /// Request failed
    RequestFailed { request_id: String, reason: String },

    // Data access events
    /// User data was exported
    DataExported { export_path: String, format: String },
    /// User data was deleted
    DataDeleted {
        scope: DeletionScope,
        items_count: usize,
    },

    // Disclosure events
    /// AI disclosure was shown to user
    DisclosureShown { version: String },
    /// User acknowledged disclosure
    DisclosureAcknowledged { version: String },

    // Search events (for history tracking)
    /// Search was performed
    SearchPerformed {
        query_hash: String, // Hash of query for privacy
        result_count: usize,
    },

    // System events
    /// Compliance check passed
    ComplianceCheckPassed { check_type: String },
    /// Compliance check failed
    ComplianceCheckFailed { check_type: String, reason: String },

    // Generic event for extensibility
    /// Custom event
    Custom { name: String, details: String },
}

/// An audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    /// Unique entry ID
    pub id: String,
    /// When the event occurred
    pub timestamp: DateTime<Utc>,
    /// Event type and data
    pub event: AuditEventType,
    /// Optional additional details
    pub details: Option<String>,
    /// Source component (e.g., "transparency", "gdpr", "ccpa")
    pub source: String,
}

impl AuditEntry {
    /// Create a new audit entry
    pub fn new(event: AuditEventType, source: &str) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event,
            details: None,
            source: source.to_string(),
        }
    }

    /// Add details to the entry
    pub fn with_details(mut self, details: &str) -> Self {
        self.details = Some(details.to_string());
        self
    }
}

/// Audit logger for compliance events
pub struct AuditLogger {
    storage: ComplianceStorage,
}

impl AuditLogger {
    /// Create a new audit logger
    pub fn new(storage: ComplianceStorage) -> Self {
        Self { storage }
    }

    /// Log an audit event
    pub fn log(&self, event: AuditEventType, source: &str) -> Result<(), ComplianceError> {
        self.log_entry(AuditEntry::new(event, source))
    }

    /// Log an audit event with details
    pub fn log_with_details(
        &self,
        event: AuditEventType,
        source: &str,
        details: &str,
    ) -> Result<(), ComplianceError> {
        self.log_entry(AuditEntry::new(event, source).with_details(details))
    }

    /// Log a pre-built audit entry
    pub fn log_entry(&self, entry: AuditEntry) -> Result<(), ComplianceError> {
        // Also log via tracing for real-time visibility
        tracing::info!(
            target: "ixos::compliance::audit",
            id = %entry.id,
            source = %entry.source,
            event = ?entry.event,
            details = ?entry.details,
            "Compliance audit event"
        );

        // Persist to daily log file
        let filename = format!("audit_{}.jsonl", entry.timestamp.format("%Y-%m-%d"));
        self.storage.append_jsonl("audit", &filename, &entry)?;

        Ok(())
    }

    /// Read audit entries for a specific date
    pub fn read_date(&self, date: NaiveDate) -> Result<Vec<AuditEntry>, ComplianceError> {
        let filename = format!("audit_{}.jsonl", date.format("%Y-%m-%d"));
        self.storage.read_jsonl("audit", &filename)
    }

    /// Read audit entries for a date range
    pub fn read_range(
        &self,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<AuditEntry>, ComplianceError> {
        let mut entries = Vec::new();
        let mut current = start;

        while current <= end {
            match self.read_date(current) {
                Ok(day_entries) => entries.extend(day_entries),
                Err(ComplianceError::Storage(e)) if e.kind() == std::io::ErrorKind::NotFound => {
                    // No entries for this day, skip
                }
                Err(e) => return Err(e),
            }

            current = current
                .succ_opt()
                .ok_or_else(|| ComplianceError::AuditFailed("Date overflow".to_string()))?;
        }

        // Sort by timestamp
        entries.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

        Ok(entries)
    }

    /// Read recent audit entries (last N days)
    pub fn read_recent(&self, days: u32) -> Result<Vec<AuditEntry>, ComplianceError> {
        let end = Utc::now().date_naive();
        let start = end - chrono::Duration::days(days as i64);
        self.read_range(start, end)
    }

    /// Count entries by event type
    pub fn count_by_type(
        &self,
        days: u32,
    ) -> Result<std::collections::HashMap<String, usize>, ComplianceError> {
        let entries = self.read_recent(days)?;
        let mut counts = std::collections::HashMap::new();

        for entry in entries {
            let type_name = match &entry.event {
                AuditEventType::ConsentGranted { .. } => "ConsentGranted",
                AuditEventType::ConsentWithdrawn { .. } => "ConsentWithdrawn",
                AuditEventType::RequestReceived { .. } => "RequestReceived",
                AuditEventType::RequestStarted { .. } => "RequestStarted",
                AuditEventType::RequestCompleted { .. } => "RequestCompleted",
                AuditEventType::RequestFailed { .. } => "RequestFailed",
                AuditEventType::DataExported { .. } => "DataExported",
                AuditEventType::DataDeleted { .. } => "DataDeleted",
                AuditEventType::DisclosureShown { .. } => "DisclosureShown",
                AuditEventType::DisclosureAcknowledged { .. } => "DisclosureAcknowledged",
                AuditEventType::SearchPerformed { .. } => "SearchPerformed",
                AuditEventType::ComplianceCheckPassed { .. } => "ComplianceCheckPassed",
                AuditEventType::ComplianceCheckFailed { .. } => "ComplianceCheckFailed",
                AuditEventType::Custom { name, .. } => name.as_str(),
            };

            *counts.entry(type_name.to_string()).or_insert(0) += 1;
        }

        Ok(counts)
    }
}

// Convenience functions for common audit events

impl AuditLogger {
    /// Log consent granted event
    pub fn log_consent_granted(
        &self,
        consent_type: &str,
        disclosure_version: &str,
    ) -> Result<(), ComplianceError> {
        self.log(
            AuditEventType::ConsentGranted {
                consent_type: consent_type.to_string(),
                disclosure_version: disclosure_version.to_string(),
            },
            "consent",
        )
    }

    /// Log consent withdrawn event
    pub fn log_consent_withdrawn(&self, consent_type: &str) -> Result<(), ComplianceError> {
        self.log(
            AuditEventType::ConsentWithdrawn {
                consent_type: consent_type.to_string(),
            },
            "consent",
        )
    }

    /// Log data export event
    pub fn log_data_exported(&self, path: &str, format: &str) -> Result<(), ComplianceError> {
        self.log(
            AuditEventType::DataExported {
                export_path: path.to_string(),
                format: format.to_string(),
            },
            "gdpr",
        )
    }

    /// Log data deletion event
    pub fn log_data_deleted(
        &self,
        scope: DeletionScope,
        count: usize,
    ) -> Result<(), ComplianceError> {
        self.log(
            AuditEventType::DataDeleted {
                scope,
                items_count: count,
            },
            "gdpr",
        )
    }

    /// Log search performed (with hashed query for privacy)
    pub fn log_search(&self, query: &str, result_count: usize) -> Result<(), ComplianceError> {
        // Hash the query for privacy - we don't store the actual query
        let query_hash = {
            use ring::digest::{digest, SHA256};
            let hash = digest(&SHA256, query.as_bytes());
            hex_encode(&hash.as_ref()[..8]) // First 8 bytes, 16 hex chars
        };

        self.log(
            AuditEventType::SearchPerformed {
                query_hash,
                result_count,
            },
            "search",
        )
    }
}

/// Encode bytes as hex string
fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_entry_creation() {
        let entry = AuditEntry::new(
            AuditEventType::ConsentGranted {
                consent_type: "AIProcessing".to_string(),
                disclosure_version: "1.0".to_string(),
            },
            "transparency",
        );

        assert!(!entry.id.is_empty());
        assert_eq!(entry.source, "transparency");
        assert!(entry.details.is_none());
    }

    #[test]
    fn test_audit_entry_with_details() {
        let entry = AuditEntry::new(
            AuditEventType::ComplianceCheckFailed {
                check_type: "consent".to_string(),
                reason: "No consent record found".to_string(),
            },
            "system",
        )
        .with_details("User attempted search without consent");

        assert!(entry.details.is_some());
        assert_eq!(
            entry.details.unwrap(),
            "User attempted search without consent"
        );
    }

    #[test]
    fn test_hex_encode() {
        let bytes = [0xde, 0xad, 0xbe, 0xef];
        assert_eq!(hex_encode(&bytes), "deadbeef");
    }
}
