//! CCPA Consumer Rights (P1.3)
//!
//! Implements the California Consumer Privacy Act (Cal. Civ. Code 1798.100 et seq.)
//! consumer rights for California residents.
//!
//! ## Supported Rights
//!
//! - **Right to Know**: Categories of personal information collected
//! - **Right to Delete**: Deletion of personal information
//! - **Right to Opt-Out**: Opt-out of sale of personal information (N/A for Ixos)
//! - **Right to Non-Discrimination**: Equal service regardless of privacy choices
//!
//! ## Response Deadline
//!
//! Per Cal. Civ. Code 1798.130(a)(2), requests must be handled within 45 days.
//!
//! ## Note on Data Sales
//!
//! Ixos does not sell personal information. The "Do Not Sell" functionality is
//! implemented for compliance with the CCPA's requirement to provide an opt-out
//! mechanism, even when no sales occur.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use super::audit::{AuditEventType, AuditLogger};
use super::consent::{ConsentManager, ConsentScope, ConsentType};
use super::gdpr::GDPRLayer;
use super::types::{ComplianceError, DataSubjectRequest, DeletionScope, Regulation, RequestType};

/// Data category collected (CCPA disclosure)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataCategory {
    /// Category name
    pub name: String,
    /// Examples of data in this category
    pub examples: Vec<String>,
    /// Source of the data
    pub source: String,
    /// Business purpose for collection
    pub purpose: String,
}

/// CCPA privacy notice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CCPANotice {
    /// Categories of personal information collected
    pub categories_collected: Vec<DataCategory>,
    /// Purposes for collection
    pub purposes: Vec<String>,
    /// Whether personal information is sold (always false for Ixos)
    pub sells_data: bool,
    /// Whether personal information is shared (always false for Ixos)
    pub shares_data: bool,
    /// Data retention period
    pub retention_period: String,
    /// Consumer rights summary
    pub consumer_rights: Vec<String>,
    /// How to exercise rights
    pub how_to_exercise: String,
}

impl Default for CCPANotice {
    fn default() -> Self {
        Self {
            categories_collected: vec![
                DataCategory {
                    name: "Identifiers".to_string(),
                    examples: vec!["Device identifier hash".to_string()],
                    source: "Automatically generated".to_string(),
                    purpose: "Distinguish between installations for consent tracking".to_string(),
                },
                DataCategory {
                    name: "Internet or network activity".to_string(),
                    examples: vec![
                        "Search queries".to_string(),
                        "Search timestamps".to_string(),
                    ],
                    source: "User-provided through search functionality".to_string(),
                    purpose: "Provide search history and improve search experience".to_string(),
                },
                DataCategory {
                    name: "File content and metadata".to_string(),
                    examples: vec![
                        "File names".to_string(),
                        "File paths".to_string(),
                        "Text content (processed locally)".to_string(),
                    ],
                    source: "User's file system".to_string(),
                    purpose: "Generate embeddings for semantic search".to_string(),
                },
            ],
            purposes: vec![
                "Providing semantic file search functionality".to_string(),
                "Improving search accuracy through caching".to_string(),
                "Maintaining search history for user convenience".to_string(),
                "Tracking consent preferences".to_string(),
            ],
            sells_data: false,
            shares_data: false,
            retention_period: "Until user requests deletion. Cached embeddings are automatically \
                invalidated when source files are modified."
                .to_string(),
            consumer_rights: vec![
                "Right to know what personal information is collected".to_string(),
                "Right to delete personal information".to_string(),
                "Right to opt-out of sale of personal information (N/A - we don't sell data)"
                    .to_string(),
                "Right to non-discrimination for exercising privacy rights".to_string(),
            ],
            how_to_exercise: "Use the 'ixos compliance ccpa' commands or contact the Ixos team."
                .to_string(),
        }
    }
}

/// Response to a "Right to Know" request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CCPAKnowResponse {
    /// Request metadata
    pub request_info: CCPARequestInfo,
    /// Categories of personal information collected
    pub categories_collected: Vec<DataCategory>,
    /// Purposes for collection
    pub purposes: Vec<String>,
    /// Whether data was sold (always empty for Ixos)
    pub sold_to: Vec<String>,
    /// Whether data was disclosed (always empty for Ixos)
    pub disclosed_to: Vec<String>,
}

/// Request metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CCPARequestInfo {
    /// Request ID
    pub request_id: String,
    /// When request was made
    pub requested_at: DateTime<Utc>,
    /// Response deadline (45 days)
    pub deadline: DateTime<Utc>,
    /// When response was provided
    pub responded_at: DateTime<Utc>,
}

/// Response to a delete request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CCPADeleteResponse {
    /// Request ID
    pub request_id: String,
    /// Status of deletion
    pub status: String,
    /// Categories of data deleted
    pub categories_deleted: Vec<String>,
    /// When deletion was completed
    pub completed_at: DateTime<Utc>,
}

/// Opt-out status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CCPAOptOutStatus {
    /// Whether opt-out is recorded
    pub opted_out: bool,
    /// When opt-out was recorded
    pub opted_out_at: Option<DateTime<Utc>>,
    /// Note about data sales
    pub note: String,
}

/// CCPA compliance layer
pub struct CCPALayer {
    notice: CCPANotice,
    consent_manager: ConsentManager,
    gdpr_layer: GDPRLayer,
    audit: AuditLogger,
}

impl CCPALayer {
    /// Create a new CCPA layer
    pub fn new(consent_manager: ConsentManager, gdpr_layer: GDPRLayer, audit: AuditLogger) -> Self {
        Self {
            notice: CCPANotice::default(),
            consent_manager,
            gdpr_layer,
            audit,
        }
    }

    /// Get the CCPA notice
    pub fn notice(&self) -> &CCPANotice {
        &self.notice
    }

    /// Handle "Right to Know" request
    pub fn handle_know_request(&self) -> Result<CCPAKnowResponse, ComplianceError> {
        let request = DataSubjectRequest::new(Regulation::CCPA, RequestType::Know);

        let response = CCPAKnowResponse {
            request_info: CCPARequestInfo {
                request_id: request.id.clone(),
                requested_at: request.received_at,
                deadline: request.deadline,
                responded_at: Utc::now(),
            },
            categories_collected: self.notice.categories_collected.clone(),
            purposes: self.notice.purposes.clone(),
            sold_to: Vec::new(),      // We don't sell data
            disclosed_to: Vec::new(), // We don't share data
        };

        // Log the request
        self.audit.log(
            AuditEventType::RequestReceived {
                request_id: request.id.clone(),
                request_type: RequestType::Know,
                regulation: Regulation::CCPA,
            },
            "ccpa",
        )?;

        self.audit.log(
            AuditEventType::RequestCompleted {
                request_id: request.id,
            },
            "ccpa",
        )?;

        tracing::info!("CCPA 'Right to Know' request completed");

        Ok(response)
    }

    /// Handle "Right to Delete" request
    pub fn handle_delete_request(&self) -> Result<CCPADeleteResponse, ComplianceError> {
        let request = DataSubjectRequest::new(Regulation::CCPA, RequestType::Delete);

        // Log the request
        self.audit.log(
            AuditEventType::RequestReceived {
                request_id: request.id.clone(),
                request_type: RequestType::Delete,
                regulation: Regulation::CCPA,
            },
            "ccpa",
        )?;

        // Delegate to GDPR layer for actual deletion
        let deletion_report = self.gdpr_layer.handle_erasure_request(DeletionScope::All)?;

        let response = CCPADeleteResponse {
            request_id: request.id.clone(),
            status: "Completed".to_string(),
            categories_deleted: vec![
                "Identifiers".to_string(),
                "Internet or network activity".to_string(),
                "Cached file embeddings".to_string(),
            ],
            completed_at: deletion_report.completed_at,
        };

        self.audit.log(
            AuditEventType::RequestCompleted {
                request_id: request.id,
            },
            "ccpa",
        )?;

        tracing::info!("CCPA 'Right to Delete' request completed");

        Ok(response)
    }

    /// Handle "Right to Opt-Out" request
    ///
    /// Note: Ixos does not sell personal information, but this functionality
    /// is provided for compliance with CCPA's opt-out requirement.
    pub fn handle_opt_out(&self) -> Result<CCPAOptOutStatus, ComplianceError> {
        // Record the opt-out preference
        self.consent_manager.grant_consent(
            ConsentType::CCPAOptOut,
            ConsentScope::AllDataProcessing,
            None,
        )?;

        let status = CCPAOptOutStatus {
            opted_out: true,
            opted_out_at: Some(Utc::now()),
            note: "Ixos does not sell personal information. This opt-out preference has been \
                recorded for compliance purposes."
                .to_string(),
        };

        tracing::info!("CCPA opt-out recorded (no data sales occur)");

        Ok(status)
    }

    /// Get current opt-out status
    pub fn get_opt_out_status(&self) -> Result<CCPAOptOutStatus, ComplianceError> {
        let status = self.consent_manager.get_status(ConsentType::CCPAOptOut)?;

        Ok(CCPAOptOutStatus {
            opted_out: status.is_granted,
            opted_out_at: if status.is_granted {
                Some(status.last_modified)
            } else {
                None
            },
            note: if status.is_granted {
                "Opt-out preference recorded. Ixos does not sell personal information.".to_string()
            } else {
                "No opt-out recorded. Note: Ixos does not sell personal information regardless."
                    .to_string()
            },
        })
    }

    /// Verify consumer identity for CCPA requests
    ///
    /// For a local-only application, verification is based on device access.
    pub fn verify_identity(&self) -> bool {
        // In a local-only app, having access to the device is sufficient verification
        true
    }

    /// Export data for portability (delegates to GDPR)
    pub fn handle_portability_request(&self) -> Result<PathBuf, ComplianceError> {
        self.gdpr_layer.handle_portability_request()
    }

    /// Format "Know" response for CLI
    pub fn format_know_cli(&self, response: &CCPAKnowResponse) -> String {
        let mut output = String::new();

        output.push_str("CCPA 'Right to Know' Response\n");
        output.push_str("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        output.push_str(&format!(
            "Request ID: {}\n",
            response.request_info.request_id
        ));
        output.push_str(&format!(
            "Responded: {}\n\n",
            response
                .request_info
                .responded_at
                .format("%Y-%m-%d %H:%M:%S UTC")
        ));

        output.push_str("CATEGORIES OF PERSONAL INFORMATION COLLECTED\n");
        output.push_str("────────────────────────────────────────────\n");
        for category in &response.categories_collected {
            output.push_str(&format!("\n{}:\n", category.name));
            output.push_str(&format!("  Examples: {}\n", category.examples.join(", ")));
            output.push_str(&format!("  Source: {}\n", category.source));
            output.push_str(&format!("  Purpose: {}\n", category.purpose));
        }
        output.push('\n');

        output.push_str("PURPOSES FOR COLLECTION\n");
        output.push_str("───────────────────────\n");
        for purpose in &response.purposes {
            output.push_str(&format!("  • {}\n", purpose));
        }
        output.push('\n');

        output.push_str("DATA SALES/SHARING\n");
        output.push_str("──────────────────\n");
        output.push_str("  Sold to: None (Ixos does not sell personal information)\n");
        output.push_str("  Disclosed to: None (all processing is local)\n");

        output
    }

    /// Format notice for CLI ("Do Not Sell" page equivalent)
    pub fn format_notice_cli(&self) -> String {
        let mut output = String::new();

        output.push_str("CCPA Privacy Notice\n");
        output.push_str("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

        output.push_str("DO NOT SELL MY PERSONAL INFORMATION\n");
        output.push_str("────────────────────────────────────\n");
        output.push_str("Ixos does NOT sell your personal information to third parties.\n");
        output.push_str("All data processing happens locally on your device.\n\n");

        output.push_str("YOUR RIGHTS\n");
        output.push_str("───────────\n");
        for right in &self.notice.consumer_rights {
            output.push_str(&format!("  • {}\n", right));
        }
        output.push('\n');

        output.push_str(&format!(
            "HOW TO EXERCISE: {}\n",
            self.notice.how_to_exercise
        ));

        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ccpa_notice_default() {
        let notice = CCPANotice::default();

        assert!(!notice.sells_data);
        assert!(!notice.shares_data);
        assert!(!notice.categories_collected.is_empty());
        assert!(!notice.consumer_rights.is_empty());
    }

    #[test]
    fn test_data_category() {
        let category = DataCategory {
            name: "Test".to_string(),
            examples: vec!["Example 1".to_string()],
            source: "User".to_string(),
            purpose: "Testing".to_string(),
        };

        assert_eq!(category.name, "Test");
    }

    #[test]
    fn test_opt_out_status() {
        let status = CCPAOptOutStatus {
            opted_out: true,
            opted_out_at: Some(Utc::now()),
            note: "Test note".to_string(),
        };

        assert!(status.opted_out);
        assert!(status.opted_out_at.is_some());
    }
}
