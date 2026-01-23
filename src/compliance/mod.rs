//! Legal Compliance Module (P1)
//!
//! This module provides comprehensive legal compliance for:
//!
//! - **P1.1 EU AI Act**: Transparency layer with AI disclosure and consent
//! - **P1.2 GDPR**: Data subject rights (access, erasure, portability)
//! - **P1.3 CCPA**: California consumer privacy rights
//! - **P1.4 Technical Documentation**: Auto-generated AI system documentation
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use ixos_protocol::compliance::ComplianceManager;
//!
//! fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     // Initialize compliance manager
//!     let compliance = ComplianceManager::new()?;
//!
//!     // Check/request consent before AI operations
//!     compliance.ensure_consent_cli()?;
//!
//!     // Handle GDPR access request
//!     let data = compliance.gdpr_access()?;
//!
//!     // Generate technical documentation
//!     let docs = compliance.generate_documentation();
//!     Ok(())
//! }
//! ```
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                    ComplianceManager                        │
//! │  (Facade for all compliance operations)                     │
//! ├─────────────────────────────────────────────────────────────┤
//! │                                                             │
//! │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
//! │  │ Transparency│  │    GDPR     │  │    CCPA     │         │
//! │  │   Layer     │  │   Layer     │  │   Layer     │         │
//! │  │  (P1.1)     │  │  (P1.2)     │  │  (P1.3)     │         │
//! │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
//! │         │                │                │                 │
//! │  ┌──────┴────────────────┴────────────────┴──────┐         │
//! │  │              ConsentManager                    │         │
//! │  │         (Shared consent storage)               │         │
//! │  └──────────────────┬────────────────────────────┘         │
//! │                     │                                       │
//! │  ┌──────────────────┴────────────────────────────┐         │
//! │  │           ComplianceStorage                    │         │
//! │  │    (HMAC-signed record persistence)            │         │
//! │  └────────────────────────────────────────────────┘         │
//! │                                                             │
//! │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
//! │  │   Search    │  │    Audit    │  │   Docs      │         │
//! │  │   History   │  │   Logger    │  │  (P1.4)     │         │
//! │  └─────────────┘  └─────────────┘  └─────────────┘         │
//! └─────────────────────────────────────────────────────────────┘
//! ```

pub mod audit;
pub mod ccpa;
pub mod consent;
pub mod documentation;
pub mod gdpr;
pub mod search_history;
pub mod storage;
pub mod transparency;
pub mod types;

// Re-exports for convenience
pub use audit::{AuditEntry, AuditEventType, AuditLogger};
pub use ccpa::{CCPADeleteResponse, CCPAKnowResponse, CCPALayer, CCPANotice, CCPAOptOutStatus};
pub use consent::{ConsentManager, ConsentRecord, ConsentScope, ConsentStatus, ConsentType};
pub use documentation::{LimitationSeverity, RiskLevel, TechnicalDocumentation};
pub use gdpr::{CacheInfo, GDPRLayer, ProcessingInfo, UserDataExport};
pub use search_history::{SearchHistory, SearchHistoryEntry, SearchHistorySummary, SearchMode};
pub use storage::{compliance_dir, ComplianceStorage, ComplianceValidator};
pub use transparency::{AIDisclosure, AIProcessingActivity, TransparencyLayer, DISCLOSURE_VERSION};
pub use types::{
    ComplianceError, DataSubjectRequest, DeletionDetails, DeletionReport, DeletionScope,
    Regulation, RequestStatus, RequestType, StatusChange,
};

use std::path::PathBuf;

/// Unified compliance manager facade
///
/// Provides a single entry point for all compliance operations,
/// coordinating between the various compliance layers.
pub struct ComplianceManager {
    #[allow(dead_code)]
    storage: ComplianceStorage,
    audit: AuditLogger,
    #[allow(dead_code)]
    consent: ConsentManager,
    transparency: TransparencyLayer,
    search_history: SearchHistory,
    gdpr: GDPRLayer,
    ccpa: CCPALayer,
}

impl ComplianceManager {
    /// Create a new compliance manager with default configuration
    pub fn new() -> Result<Self, ComplianceError> {
        let storage = ComplianceStorage::new_with_default_key()?;

        // Clone storage for each component (they share the same key)
        let audit_storage = ComplianceStorage::new_with_default_key()?;
        let consent_storage = ComplianceStorage::new_with_default_key()?;
        let history_storage = ComplianceStorage::new_with_default_key()?;
        let gdpr_storage = ComplianceStorage::new_with_default_key()?;

        let audit = AuditLogger::new(audit_storage);

        // Create shared audit logger for consent
        let consent_audit = AuditLogger::new(ComplianceStorage::new_with_default_key()?);
        let consent = ConsentManager::new(consent_storage, consent_audit);

        // Create transparency layer
        let transparency_audit = AuditLogger::new(ComplianceStorage::new_with_default_key()?);
        let transparency_consent = ConsentManager::new(
            ComplianceStorage::new_with_default_key()?,
            AuditLogger::new(ComplianceStorage::new_with_default_key()?),
        );
        let transparency = TransparencyLayer::new(transparency_consent, transparency_audit);

        // Create search history
        let search_history = SearchHistory::new(history_storage);

        // Create GDPR layer
        let gdpr_consent = ConsentManager::new(
            ComplianceStorage::new_with_default_key()?,
            AuditLogger::new(ComplianceStorage::new_with_default_key()?),
        );
        let gdpr_history = SearchHistory::new(ComplianceStorage::new_with_default_key()?);
        let gdpr_audit = AuditLogger::new(ComplianceStorage::new_with_default_key()?);
        let gdpr = GDPRLayer::new(gdpr_storage, gdpr_consent, gdpr_history, gdpr_audit);

        // Create CCPA layer
        let ccpa_consent = ConsentManager::new(
            ComplianceStorage::new_with_default_key()?,
            AuditLogger::new(ComplianceStorage::new_with_default_key()?),
        );
        let ccpa_gdpr = GDPRLayer::new(
            ComplianceStorage::new_with_default_key()?,
            ConsentManager::new(
                ComplianceStorage::new_with_default_key()?,
                AuditLogger::new(ComplianceStorage::new_with_default_key()?),
            ),
            SearchHistory::new(ComplianceStorage::new_with_default_key()?),
            AuditLogger::new(ComplianceStorage::new_with_default_key()?),
        );
        let ccpa_audit = AuditLogger::new(ComplianceStorage::new_with_default_key()?);
        let ccpa = CCPALayer::new(ccpa_consent, ccpa_gdpr, ccpa_audit);

        Ok(Self {
            storage,
            audit,
            consent,
            transparency,
            search_history,
            gdpr,
            ccpa,
        })
    }

    // =========================================================================
    // Transparency (P1.1)
    // =========================================================================

    /// Check if user has given AI processing consent
    pub fn has_consent(&self) -> Result<bool, ComplianceError> {
        self.transparency.has_consent()
    }

    /// Ensure consent before AI operation (fails if no consent)
    pub fn ensure_compliance(&self) -> Result<(), ComplianceError> {
        self.transparency.ensure_compliance()
    }

    /// Show disclosure and request consent via CLI
    pub fn ensure_consent_cli(&self) -> Result<(), ComplianceError> {
        self.transparency.ensure_consent_cli()
    }

    /// Get the AI disclosure information
    pub fn disclosure(&self) -> &AIDisclosure {
        self.transparency.disclosure()
    }

    /// Grant AI processing consent
    pub fn grant_consent(&self) -> Result<ConsentRecord, ComplianceError> {
        self.transparency.record_consent(true)
    }

    /// Withdraw AI processing consent
    pub fn withdraw_consent(&self) -> Result<ConsentRecord, ComplianceError> {
        self.transparency.withdraw_consent()
    }

    /// Get consent status as formatted string
    pub fn consent_status(&self) -> Result<String, ComplianceError> {
        self.transparency.get_consent_status()
    }

    // =========================================================================
    // Search History
    // =========================================================================

    /// Record a search
    pub fn record_search(
        &self,
        query: &str,
        result_count: usize,
        duration_ms: u64,
        mode: SearchMode,
    ) -> Result<(), ComplianceError> {
        self.search_history
            .record(query, result_count, duration_ms, mode)
    }

    /// Get search history summary
    pub fn search_summary(&self) -> Result<SearchHistorySummary, ComplianceError> {
        self.search_history.get_summary()
    }

    // =========================================================================
    // GDPR (P1.2)
    // =========================================================================

    /// GDPR Article 15: Handle access request
    pub fn gdpr_access(&self) -> Result<UserDataExport, ComplianceError> {
        self.gdpr.handle_access_request()
    }

    /// GDPR Article 17: Handle erasure request
    pub fn gdpr_erase(&self, scope: DeletionScope) -> Result<DeletionReport, ComplianceError> {
        self.gdpr.handle_erasure_request(scope)
    }

    /// GDPR Article 20: Handle portability request
    pub fn gdpr_export(&self) -> Result<PathBuf, ComplianceError> {
        self.gdpr.handle_portability_request()
    }

    /// Format GDPR access data for CLI
    pub fn format_gdpr_access(&self, export: &UserDataExport) -> String {
        self.gdpr.format_access_cli(export)
    }

    // =========================================================================
    // CCPA (P1.3)
    // =========================================================================

    /// CCPA: Handle "Right to Know" request
    pub fn ccpa_know(&self) -> Result<CCPAKnowResponse, ComplianceError> {
        self.ccpa.handle_know_request()
    }

    /// CCPA: Handle delete request
    pub fn ccpa_delete(&self) -> Result<CCPADeleteResponse, ComplianceError> {
        self.ccpa.handle_delete_request()
    }

    /// CCPA: Handle opt-out request
    pub fn ccpa_opt_out(&self) -> Result<CCPAOptOutStatus, ComplianceError> {
        self.ccpa.handle_opt_out()
    }

    /// Get CCPA notice
    pub fn ccpa_notice(&self) -> &CCPANotice {
        self.ccpa.notice()
    }

    /// Format CCPA "Know" response for CLI
    pub fn format_ccpa_know(&self, response: &CCPAKnowResponse) -> String {
        self.ccpa.format_know_cli(response)
    }

    /// Format CCPA notice for CLI
    pub fn format_ccpa_notice(&self) -> String {
        self.ccpa.format_notice_cli()
    }

    // =========================================================================
    // Technical Documentation (P1.4)
    // =========================================================================

    /// Generate technical documentation
    pub fn generate_documentation(&self) -> TechnicalDocumentation {
        TechnicalDocumentation::generate()
    }

    // =========================================================================
    // Audit
    // =========================================================================

    /// Get recent audit entries
    pub fn audit_recent(&self, days: u32) -> Result<Vec<AuditEntry>, ComplianceError> {
        self.audit.read_recent(days)
    }

    /// Get audit event counts
    pub fn audit_counts(
        &self,
        days: u32,
    ) -> Result<std::collections::HashMap<String, usize>, ComplianceError> {
        self.audit.count_by_type(days)
    }

    // =========================================================================
    // Storage
    // =========================================================================

    /// Get compliance storage directory
    pub fn storage_dir(&self) -> PathBuf {
        compliance_dir()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_disclosure_version() {
        assert_eq!(DISCLOSURE_VERSION, "1.0");
    }
}
