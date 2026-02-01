use base64::{engine::general_purpose::STANDARD, Engine as _};
use crate::state::AppState;
use ixos_protocol::capabilities::Capabilities;
use ixos_protocol::security::DeviceIdentity;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct EntitlementClaims {
    pub sub: String,
    #[serde(default)]
    pub did: String,
    #[serde(default)]
    pub trusted_device_pubkey_hash: String,
    pub plan: String,
    #[serde(default, alias = "features")]
    pub capabilities: Vec<String>,
    pub exp: usize,
    #[serde(default)]
    pub offline_grace_days: Option<u32>,
    pub iss: String,
    pub iat: Option<usize>,
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

    let mut public_key = env_str
        .ok_or_else(|| "IXOS_JWT_PUBLIC_KEY not set in environment".to_string())?;

    // Clean up escaped newlines if present
    public_key = public_key.replace("\\n", "\n");

    let parsed = DecodingKey::from_ec_pem(public_key.as_bytes())
        .map_err(|e| format!("Failed to parse public key: {}", e))?;
    let _ = KEY.set(parsed);
    KEY.get()
        .ok_or_else(|| "Failed to initialize decoding key".to_string())
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
    if claims.trusted_device_pubkey_hash.is_empty() {
        return Err("Entitlement missing trusted device binding".to_string());
    }
    if claims.trusted_device_pubkey_hash != device.device_id() {
        return Err("Entitlement token not issued for this device".to_string());
    }
    Ok(())
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
    if let Ok(claims) = decode_entitlement_token_allow_expired(&token) {
        let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
        if let Err(err) = validate_entitlement_for_device(&claims, &device) {
            state.set_entitlement_token(None);
            state.set_capabilities(Capabilities::default());
            state.entitlement_manager.lock().clear();
            return Err(err);
        }
        state.set_entitlement_token(Some(token.clone()));
        state.set_capabilities(Capabilities::from_entitlements(&claims.capabilities));
        state.entitlement_manager.lock().update_from_claims(&claims);
    } else {
        state.set_entitlement_token(None);
        state.set_capabilities(Capabilities::default());
        state.entitlement_manager.lock().clear();
    }
    Ok(())
}

#[tauri::command]
pub async fn clear_entitlement_token(state: State<'_, AppState>) -> Result<(), String> {
    state.set_entitlement_token(None);
    state.set_capabilities(Capabilities::default());
    state.entitlement_manager.lock().clear();
    Ok(())
}

#[tauri::command]
pub async fn check_search_allowed(
    _app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    if let Some(token) = state.get_entitlement_token() {
        let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
        let mut manager = state.entitlement_manager.lock();
        manager.refresh_if_needed(Some(token), &device)?;
        return Ok(manager.is_valid());
    }
    Ok(false)
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
