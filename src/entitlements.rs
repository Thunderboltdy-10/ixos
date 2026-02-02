//! Entitlement models and Pro status evaluation types.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Entitlement {
    pub user_id: String,
    pub plan: String,
    pub capabilities: Vec<String>,
    pub exp: u64,
    pub iat: Option<u64>,
    pub device_pubkey_hash: Option<String>,
    pub server_time: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum ProStatus {
    Active { expires_at: u64 },
    Grace { expires_at: u64, refresh_by: u64 },
    Expired { expired_at: u64 },
    TimeSuspect { limited_until: Option<u64> },
}

impl ProStatus {
    pub fn is_enabled(&self) -> bool {
        matches!(self, ProStatus::Active { .. } | ProStatus::Grace { .. })
    }

    pub fn refresh_by(&self) -> Option<u64> {
        match self {
            ProStatus::Grace { refresh_by, .. } => Some(*refresh_by),
            _ => None,
        }
    }
}
