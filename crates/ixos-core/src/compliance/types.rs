//! Compliance module shared types, enums, and errors.
//!
//! This module provides the foundational types used across all compliance
//! implementations (GDPR, CCPA, EU AI Act).

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

/// Errors from compliance operations
#[derive(Debug, thiserror::Error)]
pub enum ComplianceError {
    #[error("User consent required for this operation")]
    ConsentRequired,

    #[error("Consent has been withdrawn")]
    ConsentWithdrawn,

    #[error("Invalid consent record signature - possible tampering")]
    InvalidSignature,

    #[error("Invalid record format")]
    InvalidFormat,

    #[error("Request deadline exceeded: was due {0}")]
    DeadlineExceeded(DateTime<Utc>),

    #[error("User not found: {0}")]
    UserNotFound(String),

    #[error("Data export failed: {0}")]
    ExportFailed(String),

    #[error("Deletion failed: {0}")]
    DeletionFailed(String),

    #[error("Audit log failed: {0}")]
    AuditFailed(String),

    #[error("Storage error: {0}")]
    Storage(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Regulation type for request tracking and deadline calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Regulation {
    /// EU General Data Protection Regulation (2016/679)
    GDPR,
    /// California Consumer Privacy Act
    CCPA,
    /// EU Artificial Intelligence Act (2024/1689)
    EUAIAct,
}

impl Regulation {
    /// Get response deadline in days for data subject requests
    pub fn response_deadline_days(&self) -> u32 {
        match self {
            Regulation::GDPR => 30,   // Article 12(3) - without prejudice to extension
            Regulation::CCPA => 45,   // Cal. Civ. Code 1798.130(a)(2)
            Regulation::EUAIAct => 0, // No request-response model
        }
    }

    /// Get the regulation's full name
    pub fn full_name(&self) -> &'static str {
        match self {
            Regulation::GDPR => "General Data Protection Regulation (EU) 2016/679",
            Regulation::CCPA => "California Consumer Privacy Act",
            Regulation::EUAIAct => "EU Artificial Intelligence Act (EU) 2024/1689",
        }
    }
}

impl std::fmt::Display for Regulation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Regulation::GDPR => write!(f, "GDPR"),
            Regulation::CCPA => write!(f, "CCPA"),
            Regulation::EUAIAct => write!(f, "EU AI Act"),
        }
    }
}

/// Type of data subject request
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RequestType {
    // GDPR Rights (Articles 15-22)
    /// Article 15 - Right of access by the data subject
    Access,
    /// Article 16 - Right to rectification
    Rectification,
    /// Article 17 - Right to erasure ('right to be forgotten')
    Erasure,
    /// Article 18 - Right to restriction of processing
    Restriction,
    /// Article 20 - Right to data portability
    Portability,
    /// Article 21 - Right to object
    Objection,

    // CCPA Rights
    /// CCPA Right to Know
    Know,
    /// CCPA Right to Delete
    Delete,
    /// CCPA Right to Opt-Out of Sale
    OptOut,
    /// CCPA Right to Non-Discrimination
    NonDiscrimination,
}

impl RequestType {
    /// Get human-readable description
    pub fn description(&self) -> &'static str {
        match self {
            RequestType::Access => "Access to personal data",
            RequestType::Rectification => "Correction of inaccurate data",
            RequestType::Erasure => "Deletion of personal data",
            RequestType::Restriction => "Restriction of processing",
            RequestType::Portability => "Data export in portable format",
            RequestType::Objection => "Objection to processing",
            RequestType::Know => "Disclosure of data categories collected",
            RequestType::Delete => "Deletion of personal information",
            RequestType::OptOut => "Opt-out of data sales",
            RequestType::NonDiscrimination => "Non-discrimination rights",
        }
    }
}

impl std::fmt::Display for RequestType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.description())
    }
}

/// Status of a compliance request
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RequestStatus {
    /// Request received, awaiting processing
    Pending,
    /// Request is being processed
    InProgress,
    /// Request completed successfully
    Completed,
    /// Request failed
    Failed,
    /// Request expired (deadline passed)
    Expired,
}

impl std::fmt::Display for RequestStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RequestStatus::Pending => write!(f, "Pending"),
            RequestStatus::InProgress => write!(f, "In Progress"),
            RequestStatus::Completed => write!(f, "Completed"),
            RequestStatus::Failed => write!(f, "Failed"),
            RequestStatus::Expired => write!(f, "Expired"),
        }
    }
}

/// A data subject request (GDPR/CCPA)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSubjectRequest {
    /// Unique request ID
    pub id: String,
    /// Regulation under which request is made
    pub regulation: Regulation,
    /// Type of request
    pub request_type: RequestType,
    /// When request was received
    pub received_at: DateTime<Utc>,
    /// Deadline for response
    pub deadline: DateTime<Utc>,
    /// Current status
    pub status: RequestStatus,
    /// Status history with timestamps and notes
    pub status_history: Vec<StatusChange>,
    /// Whether identity has been verified
    pub identity_verified: bool,
    /// Completion timestamp (if completed)
    pub completed_at: Option<DateTime<Utc>>,
    /// Result or error message
    pub result_message: Option<String>,
}

/// A status change in a request's history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusChange {
    pub timestamp: DateTime<Utc>,
    pub status: RequestStatus,
    pub note: String,
}

impl DataSubjectRequest {
    /// Create a new data subject request
    pub fn new(regulation: Regulation, request_type: RequestType) -> Self {
        let now = Utc::now();
        let deadline_days = regulation.response_deadline_days();
        let deadline = now + Duration::days(deadline_days as i64);

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            regulation,
            request_type,
            received_at: now,
            deadline,
            status: RequestStatus::Pending,
            status_history: vec![StatusChange {
                timestamp: now,
                status: RequestStatus::Pending,
                note: "Request created".to_string(),
            }],
            identity_verified: false,
            completed_at: None,
            result_message: None,
        }
    }

    /// Check if deadline has passed
    pub fn is_overdue(&self) -> bool {
        self.deadline > Utc::now() && !matches!(self.status, RequestStatus::Completed)
    }

    /// Days remaining until deadline (negative if overdue)
    pub fn days_remaining(&self) -> i64 {
        (self.deadline - Utc::now()).num_days()
    }

    /// Update request status
    pub fn update_status(&mut self, status: RequestStatus, note: &str) {
        self.status = status;
        self.status_history.push(StatusChange {
            timestamp: Utc::now(),
            status,
            note: note.to_string(),
        });

        if status == RequestStatus::Completed {
            self.completed_at = Some(Utc::now());
        }
    }

    /// Mark identity as verified
    pub fn verify_identity(&mut self) {
        self.identity_verified = true;
        self.status_history.push(StatusChange {
            timestamp: Utc::now(),
            status: self.status,
            note: "Identity verified".to_string(),
        });
    }
}

/// Scope of data deletion for erasure requests
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DeletionScope {
    /// Delete search history only
    SearchHistory,
    /// Delete cached embeddings only
    CachedEmbeddings,
    /// Delete consent records only
    ConsentRecords,
    /// Delete all user data
    All,
}

impl std::fmt::Display for DeletionScope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeletionScope::SearchHistory => write!(f, "search_history"),
            DeletionScope::CachedEmbeddings => write!(f, "cached_embeddings"),
            DeletionScope::ConsentRecords => write!(f, "consent_records"),
            DeletionScope::All => write!(f, "all"),
        }
    }
}

impl std::str::FromStr for DeletionScope {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "search_history" | "history" => Ok(DeletionScope::SearchHistory),
            "cached_embeddings" | "cache" | "embeddings" => Ok(DeletionScope::CachedEmbeddings),
            "consent_records" | "consent" => Ok(DeletionScope::ConsentRecords),
            "all" => Ok(DeletionScope::All),
            _ => Err(format!("Unknown deletion scope: {}", s)),
        }
    }
}

/// Deletion report detailing what was deleted
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletionReport {
    /// Request ID this report is for
    pub request_id: String,
    /// When deletion was completed
    pub completed_at: DateTime<Utc>,
    /// Scope of deletion
    pub scope: DeletionScope,
    /// Detailed deletion counts
    pub details: DeletionDetails,
}

/// Detailed counts of deleted items
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DeletionDetails {
    /// Number of consent records deleted
    pub consent_records_deleted: usize,
    /// Number of search history entries deleted
    pub search_history_entries_deleted: usize,
    /// Number of cached embeddings cleared
    pub cached_embeddings_cleared: usize,
    /// Whether user preferences were deleted
    pub preferences_deleted: bool,
    /// Number of audit entries (audit entries are retained for compliance)
    pub audit_entries_retained: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regulation_deadlines() {
        assert_eq!(Regulation::GDPR.response_deadline_days(), 30);
        assert_eq!(Regulation::CCPA.response_deadline_days(), 45);
        assert_eq!(Regulation::EUAIAct.response_deadline_days(), 0);
    }

    #[test]
    fn test_data_subject_request_creation() {
        let request = DataSubjectRequest::new(Regulation::GDPR, RequestType::Access);

        assert_eq!(request.regulation, Regulation::GDPR);
        assert_eq!(request.request_type, RequestType::Access);
        assert_eq!(request.status, RequestStatus::Pending);
        assert!(!request.identity_verified);
        assert!(request.completed_at.is_none());
        // Allow for time passing between creation and assertion
        assert!(request.days_remaining() >= 29 && request.days_remaining() <= 30);
    }

    #[test]
    fn test_deletion_scope_parsing() {
        assert_eq!("all".parse::<DeletionScope>().unwrap(), DeletionScope::All);
        assert_eq!(
            "history".parse::<DeletionScope>().unwrap(),
            DeletionScope::SearchHistory
        );
        assert_eq!(
            "cache".parse::<DeletionScope>().unwrap(),
            DeletionScope::CachedEmbeddings
        );
    }

    #[test]
    fn test_request_status_update() {
        let mut request = DataSubjectRequest::new(Regulation::GDPR, RequestType::Erasure);
        request.update_status(RequestStatus::InProgress, "Processing deletion");
        request.update_status(RequestStatus::Completed, "All data deleted");

        assert_eq!(request.status, RequestStatus::Completed);
        assert!(request.completed_at.is_some());
        assert_eq!(request.status_history.len(), 3);
    }
}
