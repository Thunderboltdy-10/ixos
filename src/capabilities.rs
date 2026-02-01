//! Capability model for Pro feature gating.
//!
//! This module is the single source of truth for feature capabilities.

use std::collections::HashSet;

use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Capability {
    AskModePlus,
    MemoryGraph,
    TodayTab,
    RelatedGraph,
    BriefInbox,
    VerifiedSession,
    AutomationActions,
}

impl Capability {
    pub fn as_str(&self) -> &'static str {
        match self {
            Capability::AskModePlus => "ask_mode_plus",
            Capability::MemoryGraph => "memory_graph",
            Capability::TodayTab => "today_tab",
            Capability::RelatedGraph => "related_graph",
            Capability::BriefInbox => "brief_inbox",
            Capability::VerifiedSession => "verified_session",
            Capability::AutomationActions => "automation_actions",
        }
    }

    pub fn from_feature(value: &str) -> Option<Self> {
        let normalized: String = value
            .trim()
            .to_lowercase()
            .chars()
            .filter(|c| !matches!(c, '-' | '_' | ' '))
            .collect();
        match normalized.as_str() {
            "askmodeplus" => Some(Capability::AskModePlus),
            "memorygraph" => Some(Capability::MemoryGraph),
            "todaytab" => Some(Capability::TodayTab),
            "relatedgraph" => Some(Capability::RelatedGraph),
            "briefinbox" => Some(Capability::BriefInbox),
            "verifiedsession" => Some(Capability::VerifiedSession),
            "automationactions" => Some(Capability::AutomationActions),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Capabilities {
    enabled: HashSet<Capability>,
}

impl Capabilities {
    pub fn from_entitlements(features: &[String]) -> Self {
        let mut enabled = HashSet::new();
        for feature in features {
            if let Some(cap) = Capability::from_feature(feature) {
                enabled.insert(cap);
            }
        }
        Self { enabled }
    }

    pub fn has(&self, cap: Capability) -> bool {
        self.enabled.contains(&cap)
    }

    pub fn require(&self, cap: Capability) -> Result<(), CapabilityError> {
        if self.has(cap) {
            Ok(())
        } else {
            Err(CapabilityError::Missing(cap))
        }
    }
}

#[derive(Debug, Error)]
pub enum CapabilityError {
    #[error("Missing capability: {0:?}")]
    Missing(Capability),
}
