use crate::state::AppState;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct EntitlementClaims {
    pub sub: String,
    pub did: String,
    pub plan: String,
    pub features: Vec<String>,
    pub exp: usize,
    pub iss: String,
    pub iat: Option<usize>,
}

fn decoding_key() -> Result<&'static DecodingKey, String> {
    static KEY: OnceLock<DecodingKey> = OnceLock::new();
    if let Some(existing) = KEY.get() {
        return Ok(existing);
    }

    // Use runtime environment variable instead of compile-time env! 
    // to allow the app to build even if the variable isn't set.
    let mut public_key = std::env::var("IXOS_JWT_PUBLIC_KEY")
        .map_err(|_| "IXOS_JWT_PUBLIC_KEY not set in environment".to_string())?;
    
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

#[tauri::command]
pub async fn verify_entitlement_token(token: String) -> Result<EntitlementClaims, String> {
    verify_entitlement_token_internal(&token)
}

#[tauri::command]
pub async fn set_entitlement_token(
    state: State<'_, AppState>,
    token: String,
) -> Result<(), String> {
    state.set_entitlement_token(Some(token));
    Ok(())
}

#[tauri::command]
pub async fn clear_entitlement_token(state: State<'_, AppState>) -> Result<(), String> {
    state.set_entitlement_token(None);
    Ok(())
}

fn get_device_id_from_path(config_dir: &std::path::Path) -> Result<String, String> {
    let file_path = config_dir.join("device_id.txt");

    if file_path.exists() {
        return fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read device id: {}", e));
    }

    fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;

    let device_id = Uuid::new_v4().to_string();
    fs::write(&file_path, &device_id).map_err(|e| format!("Failed to write device id: {}", e))?;

    Ok(device_id)
}

#[tauri::command]
pub async fn check_search_allowed(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    if let Some(token) = state.get_entitlement_token() {
        if let Ok(claims) = verify_entitlement_token_internal(&token) {
            // Verify DID matches local device
            let config_dir = app
                .path()
                .app_config_dir()
                .map_err(|e| format!("Failed to get config directory: {}", e))?;

            if let Ok(device_id) = get_device_id_from_path(&config_dir) {
                if claims.did == device_id {
                    return Ok(true);
                }
            }
        }
    }
    Ok(false)
}

#[tauri::command]
pub async fn get_device_id(app: AppHandle) -> Result<String, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))?;

    get_device_id_from_path(&config_dir)
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
