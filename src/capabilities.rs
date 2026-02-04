//! Capability model for Pro feature gating.
//!
//! This module is the single source of truth for feature capabilities.

use std::collections::HashSet;

use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Capability {
    // Existing capabilities
    AskModePlus,
    MemoryGraph,
    TodayTab,
    RelatedGraph,
    BriefInbox,
    VerifiedSession,
    AutomationActions,

    // Phase 2: Second Brain
    AskModeExpansion, // Enhanced Ask Mode (entity extraction, synonyms)
    ActivityLedger,   // Activity tracking persistence

    // Phase 3: Watches & Inbox
    WatchEngine, // Scoped file watches
    FileInbox,   // File change inbox
    DailyBrief,  // Daily digest briefing

    // Phase 4: Change Lens & Collections
    ChangeLens,       // Diff view for file changes
    SmartCollections, // Auto-generated collections (hot, stale, etc.)

    // Phase 5: Security & Hardening
    ForensicCanary, // Tamper detection for sensitive files
    ScoreBreakdown, // Detailed score breakdown (vs basic for free)
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
            Capability::AskModeExpansion => "ask_mode_expansion",
            Capability::ActivityLedger => "activity_ledger",
            Capability::WatchEngine => "watch_engine",
            Capability::FileInbox => "file_inbox",
            Capability::DailyBrief => "daily_brief",
            Capability::ChangeLens => "change_lens",
            Capability::SmartCollections => "smart_collections",
            Capability::ForensicCanary => "forensic_canary",
            Capability::ScoreBreakdown => "score_breakdown",
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
            "askmodeexpansion" => Some(Capability::AskModeExpansion),
            "activityledger" => Some(Capability::ActivityLedger),
            "watchengine" => Some(Capability::WatchEngine),
            "fileinbox" => Some(Capability::FileInbox),
            "dailybrief" => Some(Capability::DailyBrief),
            "changelens" => Some(Capability::ChangeLens),
            "smartcollections" => Some(Capability::SmartCollections),
            "forensiccanary" => Some(Capability::ForensicCanary),
            "scorebreakdown" => Some(Capability::ScoreBreakdown),
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
