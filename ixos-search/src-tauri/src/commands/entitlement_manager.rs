use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ixos_protocol::capabilities::Capabilities;
use ixos_protocol::entitlements::ProStatus;
use ixos_protocol::security::{DeviceIdentity, SecureStore};
use serde::{Deserialize, Serialize};

use crate::commands::auth::{
    decode_entitlement_token_allow_expired, validate_entitlement_for_device,
};

const ENTITLEMENT_SERVICE: &str = "ixos";
const ENTITLEMENT_ACCOUNT: &str = "entitlement_v1";
const ENTITLEMENT_LABEL: &str = "Ixos Entitlement";

const DEFAULT_GRACE_DAYS: u64 = 14;
const ROLLBACK_TOLERANCE_SECONDS: u64 = 5 * 60;
const TIME_SUSPECT_GRACE_SECONDS: u64 = 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitlementCache {
    pub entitlement_token: Option<String>,
    pub last_seen_wall_time: Option<u64>,
    pub last_verified_wall_time: Option<u64>,
    pub last_server_time: Option<u64>,
    pub time_suspect: bool,
}

impl Default for EntitlementCache {
    fn default() -> Self {
        Self {
            entitlement_token: None,
            last_seen_wall_time: None,
            last_verified_wall_time: None,
            last_server_time: None,
            time_suspect: false,
        }
    }
}

#[derive(Debug)]
pub struct EntitlementManager {
    cache: EntitlementCache,
    cached_capabilities: Capabilities,
    persist: bool,
}

impl EntitlementManager {
    pub fn new() -> Self {
        let cache = load_cache_from_store().unwrap_or_default();
        let mut manager = Self {
            cache,
            cached_capabilities: Capabilities::default(),
            persist: true,
        };
        manager.hydrate_from_cache();
        manager
    }

    #[cfg(test)]
    pub fn new_in_memory(cache: EntitlementCache) -> Self {
        let mut manager = Self {
            cache,
            cached_capabilities: Capabilities::default(),
            persist: false,
        };
        manager.hydrate_from_cache();
        manager
    }

    pub fn entitlement_token(&self) -> Option<String> {
        self.cache.entitlement_token.clone()
    }

    pub fn set_entitlement_token(
        &mut self,
        token: String,
        device: &DeviceIdentity,
    ) -> Result<(), String> {
        let claims = decode_entitlement_token_allow_expired(&token)?;
        validate_entitlement_for_device(&claims, device)?;
        self.cached_capabilities = Capabilities::from_entitlements(&claims.capabilities);
        self.cache.entitlement_token = Some(token);
        self.cache.time_suspect = false;
        let now = unix_seconds(SystemTime::now());
        self.cache.last_seen_wall_time = Some(now);
        self.cache.last_verified_wall_time = Some(now);
        if let Some(server_time) = claims.server_time.map(|v| v as u64) {
            self.cache.last_server_time = Some(server_time);
        }
        self.persist_cache();
        Ok(())
    }

    pub fn clear(&mut self) {
        self.cache = EntitlementCache::default();
        self.cached_capabilities = Capabilities::default();
        self.clear_store();
    }

    pub fn capabilities(&self) -> &Capabilities {
        &self.cached_capabilities
    }

    pub fn pro_status(&mut self, now: SystemTime, device: &DeviceIdentity) -> ProStatus {
        let now_unix = unix_seconds(now);
        self.pro_status_at(now_unix, device)
    }

    pub fn pro_status_at(&mut self, now_unix: u64, device: &DeviceIdentity) -> ProStatus {
        if let Some(last_seen) = self.cache.last_seen_wall_time {
            if now_unix + ROLLBACK_TOLERANCE_SECONDS < last_seen {
                self.cache.time_suspect = true;
            }
        }
        self.cache.last_seen_wall_time = Some(now_unix);

        let token = match self.cache.entitlement_token.clone() {
            Some(token) => token,
            None => {
                self.persist_cache();
                return ProStatus::Expired {
                    expired_at: now_unix,
                };
            }
        };

        let claims = match decode_entitlement_token_allow_expired(&token) {
            Ok(claims) => claims,
            Err(err) => {
                tracing::warn!("Entitlement token decode failed: {}", err);
                self.clear();
                return ProStatus::Expired {
                    expired_at: now_unix,
                };
            }
        };

        if let Err(err) = validate_entitlement_for_device(&claims, device) {
            tracing::warn!("Entitlement device mismatch: {}", err);
            self.clear();
            return ProStatus::Expired {
                expired_at: now_unix,
            };
        }

        let exp = claims.exp as u64;
        let grace_days = claims
            .offline_grace_days
            .unwrap_or(DEFAULT_GRACE_DAYS as u32) as u64;
        let grace_seconds = grace_days.saturating_mul(24 * 60 * 60);
        let grace_until = exp.saturating_add(grace_seconds);

        let mut effective_now = now_unix;
        if let Some(server_time) = claims.server_time.map(|v| v as u64) {
            if now_unix + ROLLBACK_TOLERANCE_SECONDS < server_time {
                self.cache.time_suspect = true;
            }
            let last_server = self
                .cache
                .last_server_time
                .map(|last| last.max(server_time))
                .unwrap_or(server_time);
            self.cache.last_server_time = Some(last_server);
            effective_now = effective_now.max(last_server);
        } else if let Some(last_server) = self.cache.last_server_time {
            effective_now = effective_now.max(last_server);
        }

        self.cached_capabilities = Capabilities::from_entitlements(&claims.capabilities);
        self.cache.last_verified_wall_time = Some(now_unix);

        let status = if effective_now <= exp {
            ProStatus::Active { expires_at: exp }
        } else if effective_now <= grace_until {
            ProStatus::Grace {
                expires_at: exp,
                refresh_by: grace_until,
            }
        } else {
            ProStatus::Expired {
                expired_at: grace_until,
            }
        };

        if self.cache.time_suspect {
            let limited_until = self
                .cache
                .last_verified_wall_time
                .map(|ts| ts.saturating_add(TIME_SUSPECT_GRACE_SECONDS));
            self.persist_cache();
            return ProStatus::TimeSuspect { limited_until };
        }

        self.persist_cache();
        status
    }

    fn hydrate_from_cache(&mut self) {
        if let Some(token) = self.cache.entitlement_token.clone() {
            if let Ok(claims) = decode_entitlement_token_allow_expired(&token) {
                self.cached_capabilities = Capabilities::from_entitlements(&claims.capabilities);
            }
        }
    }

    fn persist_cache(&self) {
        if !self.persist {
            return;
        }
        if let Err(err) = save_cache_to_store(&self.cache) {
            tracing::warn!("Failed to persist entitlement cache: {}", err);
        }
    }

    fn clear_store(&self) {
        if !self.persist {
            return;
        }
        if let Err(err) = SecureStore::delete(ENTITLEMENT_SERVICE, ENTITLEMENT_ACCOUNT) {
            tracing::warn!("Failed to clear entitlement cache: {}", err);
        }
    }
}

fn unix_seconds(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0))
        .as_secs()
}

fn load_cache_from_store() -> Result<EntitlementCache, String> {
    let raw =
        SecureStore::load(ENTITLEMENT_SERVICE, ENTITLEMENT_ACCOUNT).map_err(|e| e.to_string())?;
    if let Some(bytes) = raw {
        let cache =
            serde_json::from_slice::<EntitlementCache>(&bytes).map_err(|e| e.to_string())?;
        Ok(cache)
    } else {
        Ok(EntitlementCache::default())
    }
}

fn save_cache_to_store(cache: &EntitlementCache) -> Result<(), String> {
    let bytes = serde_json::to_vec(cache).map_err(|e| e.to_string())?;
    SecureStore::store(
        ENTITLEMENT_SERVICE,
        ENTITLEMENT_ACCOUNT,
        ENTITLEMENT_LABEL,
        &bytes,
    )
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::auth::EntitlementClaims;
    use ixos_protocol::security::DeviceIdentity;
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
    use p256::ecdsa::SigningKey;
    use p256::pkcs8::{EncodePrivateKey, EncodePublicKey, LineEnding};
    use std::sync::OnceLock;

    struct TestKeys {
        private_pem: String,
    }

    fn test_keys() -> &'static TestKeys {
        static KEYS: OnceLock<TestKeys> = OnceLock::new();
        KEYS.get_or_init(|| {
            let signing_key = SigningKey::random(&mut p256::elliptic_curve::rand_core::OsRng);
            let private_pem = signing_key
                .to_pkcs8_pem(LineEnding::LF)
                .expect("private pem")
                .to_string();
            let public_pem = signing_key
                .verifying_key()
                .to_public_key_pem(LineEnding::LF)
                .expect("public pem")
                .to_string();
            std::env::set_var("IXOS_JWT_PUBLIC_KEY", public_pem.clone());
            TestKeys { private_pem }
        })
    }

    fn build_token(
        private_pem: &str,
        device_id: &str,
        exp: u64,
        offline_grace_days: Option<u32>,
    ) -> String {
        let claims = EntitlementClaims {
            sub: "user_123".into(),
            trusted_device_pubkey_hash: Some(device_id.to_string()),
            did: None,
            plan: "pro".into(),
            capabilities: vec!["ask_mode_plus".into()],
            exp: exp as usize,
            offline_grace_days,
            iss: "ixos-control-plane".into(),
            iat: Some(exp.saturating_sub(3600) as usize),
            server_time: Some(exp as usize),
        };
        let header = Header::new(Algorithm::ES256);
        encode(
            &header,
            &claims,
            &EncodingKey::from_ec_pem(private_pem.as_bytes()).expect("encoding key"),
        )
        .expect("token")
    }

    #[test]
    fn entitlement_parse_roundtrip() {
        let keys = test_keys();
        let device = DeviceIdentity::load_or_create().expect("device");
        let exp = 1_800_000_000u64;
        let token = build_token(keys.private_pem.as_str(), device.device_id(), exp, Some(7));

        let claims = decode_entitlement_token_allow_expired(&token).expect("claims");
        assert_eq!(claims.sub, "user_123");
        assert_eq!(claims.plan, "pro");
        assert!(claims.capabilities.contains(&"ask_mode_plus".to_string()));
        assert_eq!(claims.exp, exp as usize);
        assert_eq!(claims.offline_grace_days, Some(7));
        assert_eq!(claims.server_time, Some(exp as usize));
    }

    #[test]
    fn exp_grace_transitions() {
        let keys = test_keys();
        let device = DeviceIdentity::load_or_create().expect("device");
        let exp = 2_000_000_000u64;
        let token = build_token(keys.private_pem.as_str(), device.device_id(), exp, Some(1));

        let cache = EntitlementCache {
            entitlement_token: Some(token),
            ..EntitlementCache::default()
        };
        let mut manager = EntitlementManager::new_in_memory(cache);

        let status_active = manager.pro_status_at(exp - 10, &device);
        assert!(matches!(status_active, ProStatus::Active { .. }));

        let status_grace = manager.pro_status_at(exp + 10, &device);
        assert!(matches!(status_grace, ProStatus::Grace { .. }));

        let status_expired = manager.pro_status_at(exp + 86_400 + 10, &device);
        assert!(matches!(status_expired, ProStatus::Expired { .. }));
    }

    #[test]
    fn device_binding_mismatch_clears_state() {
        let keys = test_keys();
        let device = DeviceIdentity::load_or_create().expect("device");
        let exp = 2_100_000_000u64;
        let token = build_token(keys.private_pem.as_str(), "different-device", exp, Some(1));

        let cache = EntitlementCache {
            entitlement_token: Some(token),
            ..EntitlementCache::default()
        };
        let mut manager = EntitlementManager::new_in_memory(cache);

        let status = manager.pro_status_at(exp - 10, &device);
        assert!(matches!(status, ProStatus::Expired { .. }));
        assert!(manager.entitlement_token().is_none());
    }

    #[test]
    fn clock_rollback_triggers_time_suspect() {
        let keys = test_keys();
        let device = DeviceIdentity::load_or_create().expect("device");
        let exp = 2_200_000_000u64;
        let token = build_token(keys.private_pem.as_str(), device.device_id(), exp, Some(1));

        let cache = EntitlementCache {
            entitlement_token: Some(token),
            last_seen_wall_time: Some(exp + ROLLBACK_TOLERANCE_SECONDS + 1),
            ..EntitlementCache::default()
        };
        let mut manager = EntitlementManager::new_in_memory(cache);

        let status = manager.pro_status_at(exp, &device);
        assert!(matches!(status, ProStatus::TimeSuspect { .. }));
    }
}
