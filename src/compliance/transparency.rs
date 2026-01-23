//! EU AI Act Transparency Layer (P1.1)
//!
//! Implements Article 52 transparency obligations for AI systems.
//! Provides disclosure of AI processing and manages user consent.
//!
//! ## EU AI Act Compliance (Regulation (EU) 2024/1689)
//!
//! Article 52 requires that AI systems intended to interact with natural persons
//! must be designed so that it is clear to users that they are interacting with
//! an AI system. This module provides:
//!
//! - Clear disclosure of AI processing activities
//! - Informed consent mechanism
//! - Consent withdrawal capability
//! - Audit trail of consent actions

use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};

use super::audit::{AuditEventType, AuditLogger};
use super::consent::{ConsentManager, ConsentRecord, ConsentScope, ConsentType};
use super::types::ComplianceError;

/// Current disclosure version
pub const DISCLOSURE_VERSION: &str = "1.0";

/// An AI processing activity disclosed to users
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProcessingActivity {
    /// Name of the processing activity
    pub name: String,
    /// Plain-language description
    pub description: String,
    /// Purpose of the processing
    pub purpose: String,
    /// Types of data involved
    pub data_involved: Vec<String>,
}

/// AI disclosure information (EU AI Act Article 52)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIDisclosure {
    /// Version of this disclosure
    pub version: String,
    /// Title shown to user
    pub title: String,
    /// Main description
    pub description: String,
    /// List of AI processing activities
    pub processing_activities: Vec<AIProcessingActivity>,
    /// Data storage information
    pub data_storage: String,
    /// Data retention information
    pub data_retention: String,
    /// Contact information
    pub contact: String,
    /// Link to privacy policy (if any)
    pub privacy_policy_url: Option<String>,
}

impl Default for AIDisclosure {
    fn default() -> Self {
        Self {
            version: DISCLOSURE_VERSION.to_string(),
            title: "AI-Powered Semantic Search".to_string(),
            description: "Ixos uses artificial intelligence to understand the meaning of your \
                files and provide relevant search results based on semantic similarity."
                .to_string(),
            processing_activities: vec![
                AIProcessingActivity {
                    name: "Embedding Generation".to_string(),
                    description:
                        "Converting file content into numerical representations (embeddings) \
                        using a machine learning model."
                            .to_string(),
                    purpose:
                        "Enable semantic similarity matching between search queries and files."
                            .to_string(),
                    data_involved: vec![
                        "File content (text)".to_string(),
                        "File metadata (name, path)".to_string(),
                    ],
                },
                AIProcessingActivity {
                    name: "Similarity Ranking".to_string(),
                    description: "Calculating relevance scores between your search query and file \
                        embeddings using cosine similarity."
                        .to_string(),
                    purpose: "Provide accurate and relevant search results.".to_string(),
                    data_involved: vec![
                        "Search queries".to_string(),
                        "Pre-computed file embeddings".to_string(),
                    ],
                },
            ],
            data_storage: "All AI processing happens locally on your device. No data is sent \
                to external servers. Embeddings are cached in file metadata (xattr/ADS) for \
                faster subsequent searches."
                .to_string(),
            data_retention: "Cached embeddings remain until the file is modified or deleted, \
                or until you request erasure. Search history is retained until you delete it."
                .to_string(),
            contact: "For privacy inquiries, please contact the Ixos development team.".to_string(),
            privacy_policy_url: None,
        }
    }
}

impl AIDisclosure {
    /// Format the disclosure for CLI display
    pub fn format_cli(&self) -> String {
        let mut output = String::new();
        let separator = "━".repeat(56);

        output.push_str(&format!("{}\n", separator));
        output.push_str(&format!("  {}\n", self.title));
        output.push_str(&format!("{}\n\n", separator));

        output.push_str(&format!("{}\n\n", self.description));

        output.push_str("Processing activities:\n");
        for activity in &self.processing_activities {
            output.push_str(&format!(
                "  • {} - {}\n",
                activity.name, activity.description
            ));
        }
        output.push('\n');

        output.push_str(&format!("Data storage: {}\n\n", self.data_storage));
        output.push_str(&format!("Data retention: {}\n\n", self.data_retention));

        if let Some(url) = &self.privacy_policy_url {
            output.push_str(&format!("Privacy policy: {}\n\n", url));
        }

        output.push_str(&separator);

        output
    }

    /// Format as JSON for programmatic access
    pub fn to_json(&self) -> Result<String, ComplianceError> {
        Ok(serde_json::to_string_pretty(self)?)
    }
}

/// Transparency layer for EU AI Act compliance
pub struct TransparencyLayer {
    disclosure: AIDisclosure,
    consent_manager: ConsentManager,
    audit: AuditLogger,
}

impl TransparencyLayer {
    /// Create a new transparency layer with default disclosure
    pub fn new(consent_manager: ConsentManager, audit: AuditLogger) -> Self {
        Self {
            disclosure: AIDisclosure::default(),
            consent_manager,
            audit,
        }
    }

    /// Create with custom disclosure
    pub fn with_disclosure(
        disclosure: AIDisclosure,
        consent_manager: ConsentManager,
        audit: AuditLogger,
    ) -> Self {
        Self {
            disclosure,
            consent_manager,
            audit,
        }
    }

    /// Get the current disclosure
    pub fn disclosure(&self) -> &AIDisclosure {
        &self.disclosure
    }

    /// Check if user has given AI processing consent
    pub fn has_consent(&self) -> Result<bool, ComplianceError> {
        self.consent_manager.has_consent(ConsentType::AIProcessing)
    }

    /// Record user's AI processing consent
    pub fn record_consent(&self, granted: bool) -> Result<ConsentRecord, ComplianceError> {
        if granted {
            self.consent_manager.grant_consent(
                ConsentType::AIProcessing,
                ConsentScope::AllAIFeatures,
                Some(&self.disclosure.version),
            )
        } else {
            self.consent_manager
                .withdraw_consent(ConsentType::AIProcessing, ConsentScope::AllAIFeatures)
        }
    }

    /// Withdraw consent
    pub fn withdraw_consent(&self) -> Result<ConsentRecord, ComplianceError> {
        self.record_consent(false)
    }

    /// Ensure compliance before AI operation
    ///
    /// Returns Ok(()) if consent is active, Err if consent required.
    pub fn ensure_compliance(&self) -> Result<(), ComplianceError> {
        if !self.has_consent()? {
            return Err(ComplianceError::ConsentRequired);
        }

        // Log compliance check
        self.audit.log(
            AuditEventType::ComplianceCheckPassed {
                check_type: "ai_consent".to_string(),
            },
            "transparency",
        )?;

        Ok(())
    }

    /// Show disclosure and request consent via CLI
    ///
    /// Returns true if consent was granted, false if declined.
    pub fn show_disclosure_cli(&self) -> Result<bool, ComplianceError> {
        let stdout = io::stdout();
        let stdin = io::stdin();
        let mut stdout_lock = stdout.lock();
        let mut stdin_lock = stdin.lock();

        // Show disclosure
        writeln!(stdout_lock, "{}", self.disclosure.format_cli())
            .map_err(|e| ComplianceError::Storage(e))?;

        // Log that disclosure was shown
        self.audit.log(
            AuditEventType::DisclosureShown {
                version: self.disclosure.version.clone(),
            },
            "transparency",
        )?;

        // Prompt for consent
        write!(
            stdout_lock,
            "\nDo you consent to AI-powered search? [y/N]: "
        )
        .map_err(|e| ComplianceError::Storage(e))?;
        stdout_lock
            .flush()
            .map_err(|e| ComplianceError::Storage(e))?;

        let mut input = String::new();
        stdin_lock
            .read_line(&mut input)
            .map_err(|e| ComplianceError::Storage(e))?;

        let consent_given =
            input.trim().eq_ignore_ascii_case("y") || input.trim().eq_ignore_ascii_case("yes");

        if consent_given {
            self.record_consent(true)?;
            writeln!(
                stdout_lock,
                "\nConsent recorded. You can withdraw anytime with:\n  ixos compliance consent --withdraw"
            )
            .map_err(|e| ComplianceError::Storage(e))?;
        } else {
            writeln!(
                stdout_lock,
                "\nConsent declined. AI-powered search features are disabled.\n\
                 You can grant consent later with:\n  ixos compliance consent --grant"
            )
            .map_err(|e| ComplianceError::Storage(e))?;
        }

        writeln!(stdout_lock, "{}", "━".repeat(56)).map_err(|e| ComplianceError::Storage(e))?;

        Ok(consent_given)
    }

    /// Check consent and prompt if needed (CLI flow)
    ///
    /// This is the main entry point for CLI commands that require consent.
    /// Returns Ok(()) if consent is active (either existing or just granted).
    pub fn ensure_consent_cli(&self) -> Result<(), ComplianceError> {
        // Check if consent already exists
        if self.has_consent()? {
            return Ok(());
        }

        // Show disclosure and request consent
        let granted = self.show_disclosure_cli()?;

        if granted {
            Ok(())
        } else {
            Err(ComplianceError::ConsentRequired)
        }
    }

    /// Get consent status for display
    pub fn get_consent_status(&self) -> Result<String, ComplianceError> {
        let status = self.consent_manager.get_status(ConsentType::AIProcessing)?;

        let mut output = String::new();
        output.push_str("AI Processing Consent Status\n");
        output.push_str(&format!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
        output.push_str(&format!(
            "Status: {}\n",
            if status.is_granted {
                "GRANTED"
            } else {
                "NOT GRANTED"
            }
        ));
        output.push_str(&format!(
            "Last modified: {}\n",
            status.last_modified.format("%Y-%m-%d %H:%M:%S UTC")
        ));

        if let Some(version) = &status.disclosure_version {
            output.push_str(&format!("Disclosure version: {}\n", version));
        }

        output.push_str(&format!("Total consent actions: {}\n", status.record_count));

        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_disclosure() {
        let disclosure = AIDisclosure::default();

        assert_eq!(disclosure.version, DISCLOSURE_VERSION);
        assert!(!disclosure.processing_activities.is_empty());
        assert!(!disclosure.description.is_empty());
    }

    #[test]
    fn test_disclosure_cli_format() {
        let disclosure = AIDisclosure::default();
        let formatted = disclosure.format_cli();

        assert!(formatted.contains(&disclosure.title));
        assert!(formatted.contains("Embedding Generation"));
        assert!(formatted.contains("Similarity Ranking"));
    }

    #[test]
    fn test_disclosure_json() {
        let disclosure = AIDisclosure::default();
        let json = disclosure.to_json().unwrap();

        assert!(json.contains("\"version\""));
        assert!(json.contains("\"processing_activities\""));
    }
}
