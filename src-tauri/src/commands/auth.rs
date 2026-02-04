use crate::state::AppState;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use ixos_protocol::entitlements::ProStatus;
use ixos_protocol::security::DeviceIdentity;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::time::SystemTime;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct EntitlementClaims {
    #[serde(alias = "user_id")]
    pub sub: String,

    // Device binding fields - backend may send one OR BOTH of these claim names
    // We capture them separately to avoid serde "duplicate field" errors when both are present
    #[serde(default, alias = "device_pubkey_hash")]
    pub trusted_device_pubkey_hash: Option<String>,

    // Alternate device ID field - some backends use "did" or "device_id" instead
    #[serde(default, alias = "device_id")]
    pub did: Option<String>,

    pub plan: String,
    #[serde(default, alias = "features")]
    pub capabilities: Vec<String>,
    pub exp: usize,
    #[serde(default)]
    pub offline_grace_days: Option<u32>,
    pub iss: String,
    pub iat: Option<usize>,
    #[serde(default, alias = "server_time_unix")]
    pub server_time: Option<usize>,
}

fn decoding_key() -> Result<&'static DecodingKey, String> {
    static KEY: OnceLock<DecodingKey> = OnceLock::new();
    if let Some(existing) = KEY.get() {
        return Ok(existing);
    }

    // Try compile-time environment variable first (loaded from .env during build)
    // We use include_str! to bake the local env file content if the var isn't set,
    // ensuring the key is available even if .env loading fails at runtime.
    let env_str = option_env!("IXOS_JWT_PUBLIC_KEY")
        .map(|s| s.to_string())
        .or_else(|| std::env::var("IXOS_JWT_PUBLIC_KEY").ok());

    let mut public_key = env_str.ok_or_else(|| {
        println!("[Rust] IXOS_JWT_PUBLIC_KEY not set in environment!");
        "IXOS_JWT_PUBLIC_KEY not set in environment".to_string()
    })?;

    // Clean up escaped newlines if present
    public_key = public_key.replace("\\n", "\n");
    // Check if key looks valid (has correct header)
    if !public_key.contains("BEGIN PUBLIC KEY") {
        println!("[Rust] Warning: Public key does not contain 'BEGIN PUBLIC KEY'");
    }

    let parsed = DecodingKey::from_ec_pem(public_key.as_bytes()).map_err(|e| {
        println!("[Rust] Failed to parse public key: {}", e);
        format!("Failed to parse public key: {}", e)
    })?;
    let _ = KEY.set(parsed);
    println!("[Rust] Decoding key initialized successfully");
    KEY.get()
        .ok_or_else(|| "Failed to initialize decoding key".to_string())
}

impl EntitlementClaims {
    pub fn get_device_hash(&self) -> String {
        // Check trusted_device_pubkey_hash first, then fall back to did
        self.trusted_device_pubkey_hash
            .clone()
            .or_else(|| self.did.clone())
            .unwrap_or_default()
    }
}

pub fn verify_entitlement_token_internal(token: &str) -> Result<EntitlementClaims, String> {
    let key = decoding_key()?;
    let mut validation = Validation::new(Algorithm::ES256);
    validation.set_issuer(&["ixos-control-plane"]);
    let data = decode::<EntitlementClaims>(token, key, &validation)
        .map_err(|e| format!("Invalid token: {}", e))?;
    Ok(data.claims)
}

pub(crate) fn decode_entitlement_token_allow_expired(
    token: &str,
) -> Result<EntitlementClaims, String> {
    let key = decoding_key()?;
    let mut validation = Validation::new(Algorithm::ES256);
    validation.set_issuer(&["ixos-control-plane"]);
    validation.validate_exp = false;
    let data = decode::<EntitlementClaims>(token, key, &validation)
        .map_err(|e| format!("Invalid token: {}", e))?;
    Ok(data.claims)
}

pub(crate) fn validate_entitlement_for_device(
    claims: &EntitlementClaims,
    device: &DeviceIdentity,
) -> Result<(), String> {
    let claim_raw = claims.get_device_hash();

    // Allow tokens without device binding for backward compatibility
    // This handles tokens issued before device binding was implemented
    if claim_raw.is_empty() {
        tracing::debug!("Token has no device binding - allowing for backward compatibility");
        return Ok(());
    }
    let claim = claim_raw.trim();
    let device_id = device.device_id();

    println!(
        "[Rust] Validating device binding. Claim: '{}', DeviceID: '{}'",
        claim, device_id
    );

    if claim.eq_ignore_ascii_case(device_id) {
        println!("[Rust] Device ID matched directly");
        return Ok(());
    }

    let pubkey = device.public_key();
    let pubkey_hex = hex_encode(&pubkey);
    println!("[Rust] Checking pubkey hex: '{}'", pubkey_hex);

    if claim.eq_ignore_ascii_case(&pubkey_hex) {
        return Ok(());
    }

    if let Ok(decoded) = STANDARD.decode(claim) {
        if decoded == pubkey {
            return Ok(());
        }
    }
    if let Ok(decoded) = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(claim) {
        if decoded == pubkey {
            return Ok(());
        }
    }

    // When device binding is present, verify it matches this device
    println!(
        "[Rust] Device binding FAILED. Expected: '{}' or '{}', Got: '{}'",
        device_id, pubkey_hex, claim
    );
    return Err("Entitlement token not issued for this device".to_string());
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        use std::fmt::Write;
        let _ = write!(out, "{:02x}", b);
    }
    out
}

impl EntitlementClaims {
    pub fn to_entitlement(&self) -> ixos_protocol::Entitlement {
        ixos_protocol::Entitlement {
            user_id: self.sub.clone(),
            plan: self.plan.clone(),
            capabilities: self.capabilities.clone(),
            exp: self.exp as u64,
            iat: self.iat.map(|v| v as u64),
            device_pubkey_hash: {
                let hash = self.get_device_hash();
                if hash.is_empty() {
                    None
                } else {
                    Some(hash)
                }
            },
            server_time: self.server_time.map(|v| v as u64),
        }
    }
}

#[tauri::command]
pub async fn verify_entitlement_token(token: String) -> Result<EntitlementClaims, String> {
    verify_entitlement_token_internal(&token)
}

#[tauri::command]
pub async fn set_entitlement_token(
    state: State<'_, AppState>,
    token: String,
) -> Result<(), String> {
    println!("[Rust] set_entitlement_token called");
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let mut manager = state.entitlement_manager.lock();
    match manager.set_entitlement_token(token, &device) {
        Ok(()) => {
            println!("[Rust] Token set successfully");
            Ok(())
        }
        Err(err) => {
            println!("[Rust] Token set FAILED: {}", err);
            manager.clear();
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn clear_entitlement_token(state: State<'_, AppState>) -> Result<(), String> {
    state.entitlement_manager.lock().clear();
    Ok(())
}

#[tauri::command]
pub async fn check_search_allowed(
    _app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let mut manager = state.entitlement_manager.lock();
    Ok(manager.pro_status(SystemTime::now(), &device).is_enabled())
}

#[tauri::command]
pub async fn get_pro_status(state: State<'_, AppState>) -> Result<ProStatus, String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let mut manager = state.entitlement_manager.lock();
    Ok(manager.pro_status(SystemTime::now(), &device))
}

#[tauri::command]
pub async fn get_device_id(_app: AppHandle) -> Result<String, String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    Ok(device.device_id().to_string())
}

#[tauri::command]
pub async fn get_device_public_key(_app: AppHandle) -> Result<String, String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let encoded = STANDARD.encode(device.public_key());
    Ok(encoded)
}

/// Open checkout URL in the system's default browser
#[tauri::command]
pub async fn open_checkout(
    app: AppHandle,
    variant_id: String,
    user_id: String,
    user_email: Option<String>,
    pricing_url: Option<String>,
    checkout_url_template: Option<String>,
    success_url: Option<String>,
    cancel_url: Option<String>,
) -> Result<(), String> {
    let site_url = std::env::var("IXOS_SITE_URL").ok();
    let pricing_url = pricing_url
        .or_else(|| std::env::var("IXOS_PRICING_URL").ok())
        .or_else(|| {
            site_url.as_ref().map(|base| {
                let trimmed = base.trim_end_matches('/');
                format!("{}/pricing", trimmed)
            })
        });
    let template =
        checkout_url_template.or_else(|| std::env::var("IXOS_CHECKOUT_URL_TEMPLATE").ok());
    let base = std::env::var("IXOS_CHECKOUT_URL").ok();
    let success_url = success_url
        .or_else(|| std::env::var("IXOS_CHECKOUT_SUCCESS_URL").ok())
        .or_else(|| {
            site_url
                .as_ref()
                .map(|base| format!("{}/account?checkout=success", base.trim_end_matches('/')))
        });
    let cancel_url = cancel_url
        .or_else(|| std::env::var("IXOS_CHECKOUT_CANCEL_URL").ok())
        .or_else(|| {
            site_url
                .as_ref()
                .map(|base| format!("{}/pricing?checkout=cancelled", base.trim_end_matches('/')))
        });

    let mut target_url = if let Some(pricing_url) = pricing_url.as_ref() {
        pricing_url.clone()
    } else if let Some(template) = template {
        template.replace("{variantId}", &variant_id)
    } else if let Some(base) = base {
        base
    } else {
        return Err(
            "IXOS_PRICING_URL or IXOS_CHECKOUT_URL_TEMPLATE or IXOS_CHECKOUT_URL is not set"
                .to_string(),
        );
    };

    if target_url.contains("{variantId}") {
        target_url = target_url.replace("{variantId}", &variant_id);
    }

    if !target_url.starts_with("http://") && !target_url.starts_with("https://") {
        target_url = format!("https://{}", target_url);
    }

    let mut url =
        tauri::Url::parse(&target_url).map_err(|e| format!("Invalid checkout URL: {}", e))?;
    {
        let mut pairs = url.query_pairs_mut();
        if pricing_url.is_some() {
            pairs.append_pair("clerk_user_id", &user_id);
            pairs.append_pair("variant_id", &variant_id);
            if let Some(email) = user_email {
                pairs.append_pair("email", &email);
            }
            if let Some(success) = success_url.as_ref() {
                pairs.append_pair("success_url", success);
            }
            if let Some(cancel) = cancel_url.as_ref() {
                pairs.append_pair("cancel_url", cancel);
            }
        } else {
            pairs.append_pair("checkout[custom][clerk_user_id]", &user_id);
            if let Some(email) = user_email {
                pairs.append_pair("checkout[buyer][email]", &email);
            }
            if let Some(success) = success_url.as_ref() {
                pairs.append_pair("checkout[success_url]", success);
            }
            if let Some(cancel) = cancel_url.as_ref() {
                pairs.append_pair("checkout[cancel_url]", cancel);
            }
        }
    }

    // Open in system browser instead of creating a new window
    app.opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}

/// Open URL in the system's default browser
#[tauri::command]
pub async fn open_external_url(
    app: AppHandle,
    url: String,
    _title: Option<String>,
    _label: Option<String>,
) -> Result<(), String> {
    // Validate URL
    let parsed = tauri::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;

    // Open in system browser
    app.opener()
        .open_url(parsed.as_str(), None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}
