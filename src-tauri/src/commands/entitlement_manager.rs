use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use ixos_protocol::capabilities::Capabilities;
use ixos_protocol::security::DeviceIdentity;

use crate::commands::auth::{
    decode_entitlement_token_allow_expired, validate_entitlement_for_device, EntitlementClaims,
};

#[derive(Debug, Default)]
pub struct EntitlementManager {
    last_refresh: Option<Instant>,
    cached_capabilities: Capabilities,
    token_expiry: Option<SystemTime>,
    offline_grace_expires: Option<SystemTime>,
}

impl EntitlementManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn refresh_if_needed(
        &mut self,
        token: Option<String>,
        device: &DeviceIdentity,
    ) -> Result<(), String> {
        let token = token.ok_or_else(|| "No entitlement token".to_string())?;

        let now = Instant::now();
        if let Some(last) = self.last_refresh {
            if now.duration_since(last) < Duration::from_secs(24 * 60 * 60) {
                return Ok(());
            }
        }

        let claims = decode_entitlement_token_allow_expired(&token)?;
        validate_entitlement_for_device(&claims, device)?;
        self.update_from_claims(&claims);
        self.last_refresh = Some(now);
        Ok(())
    }

    pub fn update_from_claims(&mut self, claims: &EntitlementClaims) {
        self.cached_capabilities = Capabilities::from_entitlements(&claims.capabilities);

        let expiry = UNIX_EPOCH + Duration::from_secs(claims.exp as u64);
        self.token_expiry = Some(expiry);

        let grace_days = claims.offline_grace_days.unwrap_or(14) as u64;
        let grace_seconds = grace_days.saturating_mul(24 * 60 * 60);
        self.offline_grace_expires = Some(expiry + Duration::from_secs(grace_seconds));
    }

    pub fn clear(&mut self) {
        self.cached_capabilities = Capabilities::default();
        self.token_expiry = None;
        self.offline_grace_expires = None;
        self.last_refresh = None;
    }

    pub fn is_valid(&self) -> bool {
        let now = SystemTime::now();
        if let Some(expiry) = self.token_expiry {
            if now <= expiry {
                return true;
            }
        }
        if let Some(grace) = self.offline_grace_expires {
            return now <= grace;
        }
        false
    }

    pub fn capabilities(&self) -> &Capabilities {
        &self.cached_capabilities
    }
}


