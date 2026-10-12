//! Consent management for GDPR and EU AI Act compliance.
//!
//! This module provides consent record storage and verification,
//! used by both the EU AI Act transparency layer and GDPR compliance.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::audit::{AuditEventType, AuditLogger};
use super::storage::ComplianceStorage;
use super::types::ComplianceError;

/// Type of consent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ConsentType {
    /// EU AI Act - consent for AI-powered processing
    AIProcessing,
    /// GDPR - consent for general data processing
    DataProcessing,
    /// CCPA - opt-out preference (inverted consent model)
    CCPAOptOut,
}

impl ConsentType {
    /// Get human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            ConsentType::AIProcessing => "AI Processing",
            ConsentType::DataProcessing => "Data Processing",
            ConsentType::CCPAOptOut => "CCPA Opt-Out",
        }
    }

    /// Get the file extension used for storage
    fn file_extension(&self) -> &'static str {
        match self {
            ConsentType::AIProcessing => "ai_consent",
            ConsentType::DataProcessing => "data_consent",
            ConsentType::CCPAOptOut => "ccpa_optout",
        }
    }
}

impl std::fmt::Display for ConsentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// Scope of consent - what the consent applies to
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConsentScope {
    /// All AI-powered features
    AllAIFeatures,
    /// All data processing activities
    AllDataProcessing,
    /// Specific feature by name
    Feature(String),
    /// Specific data category
    DataCategory(String),
}

impl std::fmt::Display for ConsentScope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConsentScope::AllAIFeatures => write!(f, "All AI Features"),
            ConsentScope::AllDataProcessing => write!(f, "All Data Processing"),
            ConsentScope::Feature(name) => write!(f, "Feature: {}", name),
            ConsentScope::DataCategory(cat) => write!(f, "Data Category: {}", cat),
        }
    }
}

/// A consent record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsentRecord {
    /// Unique record ID
    pub id: String,
    /// Type of consent
    pub consent_type: ConsentType,
    /// Scope of consent
    pub scope: ConsentScope,
    /// Whether consent was given (true) or withdrawn (false)
    pub granted: bool,
    /// When consent was given/modified
    pub timestamp: DateTime<Utc>,
    /// Version of disclosure that was shown (for AI consent)
    pub disclosure_version: Option<String>,
    /// Optional note about the consent action
    pub note: Option<String>,
}

impl ConsentRecord {
    /// Create a new consent grant record
    pub fn grant(consent_type: ConsentType, scope: ConsentScope) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            consent_type,
            scope,
            granted: true,
            timestamp: Utc::now(),
            disclosure_version: None,
            note: None,
        }
    }

    /// Create a new consent withdrawal record
    pub fn withdraw(consent_type: ConsentType, scope: ConsentScope) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            consent_type,
            scope,
            granted: false,
            timestamp: Utc::now(),
            disclosure_version: None,
            note: Some("Consent withdrawn".to_string()),
        }
    }

    /// Add disclosure version
    pub fn with_disclosure_version(mut self, version: &str) -> Self {
        self.disclosure_version = Some(version.to_string());
        self
    }

    /// Add a note
    pub fn with_note(mut self, note: &str) -> Self {
        self.note = Some(note.to_string());
        self
    }
}

/// Consent status summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsentStatus {
    /// Type of consent
    pub consent_type: ConsentType,
    /// Whether consent is currently active
    pub is_granted: bool,
    /// When consent was last modified
    pub last_modified: DateTime<Utc>,
    /// Disclosure version if applicable
    pub disclosure_version: Option<String>,
    /// Total number of consent records (grants + withdrawals)
    pub record_count: usize,
}

/// Consent manager for storing and querying consent records
pub struct ConsentManager {
    storage: ComplianceStorage,
    audit: AuditLogger,
}

impl ConsentManager {
    /// Create a new consent manager
    pub fn new(storage: ComplianceStorage, audit: AuditLogger) -> Self {
        Self { storage, audit }
    }

    /// Generate filename for a consent record
    fn filename(&self, consent_type: ConsentType, record_id: &str) -> String {
        format!(
            "{}_{}.{}",
            consent_type.file_extension(),
            record_id,
            consent_type.file_extension()
        )
    }

    /// Store a consent record
    pub fn record_consent(&self, record: ConsentRecord) -> Result<(), ComplianceError> {
        let filename = self.filename(record.consent_type, &record.id);
        self.storage.store("consent", &filename, &record)?;

        // Audit log
        if record.granted {
            self.audit.log(
                AuditEventType::ConsentGranted {
                    consent_type: record.consent_type.to_string(),
                    disclosure_version: record.disclosure_version.clone().unwrap_or_default(),
                },
                "consent",
            )?;
        } else {
            self.audit.log(
                AuditEventType::ConsentWithdrawn {
                    consent_type: record.consent_type.to_string(),
                },
                "consent",
            )?;
        }

        tracing::info!(
            consent_type = %record.consent_type,
            granted = record.granted,
            "Consent record stored"
        );

        Ok(())
    }

    /// Grant consent
    pub fn grant_consent(
        &self,
        consent_type: ConsentType,
        scope: ConsentScope,
        disclosure_version: Option<&str>,
    ) -> Result<ConsentRecord, ComplianceError> {
        let mut record = ConsentRecord::grant(consent_type, scope);
        if let Some(version) = disclosure_version {
            record = record.with_disclosure_version(version);
        }
        self.record_consent(record.clone())?;
        Ok(record)
    }

    /// Withdraw consent
    pub fn withdraw_consent(
        &self,
        consent_type: ConsentType,
        scope: ConsentScope,
    ) -> Result<ConsentRecord, ComplianceError> {
        let record = ConsentRecord::withdraw(consent_type, scope);
        self.record_consent(record.clone())?;
        Ok(record)
    }

    /// Get all consent records for a type
    pub fn get_history(
        &self,
        consent_type: ConsentType,
    ) -> Result<Vec<ConsentRecord>, ComplianceError> {
        let extension = consent_type.file_extension();
        let files = self.storage.list_files("consent", extension)?;

        let mut records: Vec<ConsentRecord> = Vec::new();
        for path in files {
            let filename = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default();

            if let Ok(record) = self.storage.load::<ConsentRecord>("consent", filename) {
                if record.consent_type == consent_type {
                    records.push(record);
                }
            }
        }

        // Sort by timestamp (newest first)
        records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        Ok(records)
    }

    /// Get all consent records (all types)
    pub fn get_all_history(&self) -> Result<Vec<ConsentRecord>, ComplianceError> {
        let mut all_records = Vec::new();

        for consent_type in [
            ConsentType::AIProcessing,
            ConsentType::DataProcessing,
            ConsentType::CCPAOptOut,
        ] {
            let records = self.get_history(consent_type)?;
            all_records.extend(records);
        }

        // Sort by timestamp (newest first)
        all_records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        Ok(all_records)
    }

    /// Check if consent is currently active for a type
    pub fn has_consent(&self, consent_type: ConsentType) -> Result<bool, ComplianceError> {
        let history = self.get_history(consent_type)?;

        // Find the most recent record
        if let Some(latest) = history.first() {
            Ok(latest.granted)
        } else {
            Ok(false) // No records = no consent
        }
    }

    /// Get current consent status
    pub fn get_status(&self, consent_type: ConsentType) -> Result<ConsentStatus, ComplianceError> {
        let history = self.get_history(consent_type)?;

        let (is_granted, last_modified, disclosure_version) = if let Some(latest) = history.first()
        {
            (
                latest.granted,
                latest.timestamp,
                latest.disclosure_version.clone(),
            )
        } else {
            (false, Utc::now(), None)
        };

        Ok(ConsentStatus {
            consent_type,
            is_granted,
            last_modified,
            disclosure_version,
            record_count: history.len(),
        })
    }

    /// Get status for all consent types
    pub fn get_all_status(&self) -> Result<Vec<ConsentStatus>, ComplianceError> {
        let mut statuses = Vec::new();

        for consent_type in [
            ConsentType::AIProcessing,
            ConsentType::DataProcessing,
            ConsentType::CCPAOptOut,
        ] {
            statuses.push(self.get_status(consent_type)?);
        }

        Ok(statuses)
    }

    /// Delete all consent records (for GDPR erasure)
    pub fn delete_all_records(&self) -> Result<usize, ComplianceError> {
        let count = self.storage.clear_subdir("consent")?;

        tracing::info!(count = count, "All consent records deleted");

        Ok(count)
    }

    /// Export consent records for data portability
    pub fn export_records(&self) -> Result<Vec<ConsentRecord>, ComplianceError> {
        self.get_all_history()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consent_record_creation() {
        let record = ConsentRecord::grant(ConsentType::AIProcessing, ConsentScope::AllAIFeatures);

        assert!(record.granted);
        assert_eq!(record.consent_type, ConsentType::AIProcessing);
        assert!(record.disclosure_version.is_none());
    }

    #[test]
    fn test_consent_record_with_disclosure() {
        let record = ConsentRecord::grant(ConsentType::AIProcessing, ConsentScope::AllAIFeatures)
            .with_disclosure_version("1.0");

        assert_eq!(record.disclosure_version, Some("1.0".to_string()));
    }

    #[test]
    fn test_consent_withdrawal() {
        let record =
            ConsentRecord::withdraw(ConsentType::AIProcessing, ConsentScope::AllAIFeatures);

        assert!(!record.granted);
        assert!(record.note.is_some());
    }

    #[test]
    fn test_consent_type_display() {
        assert_eq!(ConsentType::AIProcessing.to_string(), "AI Processing");
        assert_eq!(ConsentType::DataProcessing.to_string(), "Data Processing");
    }
}
