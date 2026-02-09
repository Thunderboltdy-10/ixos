//! Configuration command handlers
//!
//! Provides configuration and compliance management for the frontend.

use ixos_protocol::cli::IxosConfig;
use ixos_protocol::compliance::ComplianceManager;
use serde::{Deserialize, Serialize};

// =============================================================================
// Payload Types
// =============================================================================

/// Full configuration payload
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigPayload {
    pub search: SearchConfigPayload,
    pub output: OutputConfigPayload,
    pub security: SecurityConfigPayload,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchConfigPayload {
    pub default_limit: usize,
    pub default_directory: Option<String>,
    pub timeout_seconds: u64,
    pub enable_secure_ranking: bool,
    pub progressive_by_default: bool,
    pub cache_mode: String,
    pub use_stub_model: bool,
    pub secure_timing: bool,
    pub context_lines: usize,
    pub min_score_threshold: f32,
    pub model_type: String,
    pub pro_model_type: String,
    pub search_mode: String,
    pub personal_ranking_enabled: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputConfigPayload {
    pub default_format: String,
    pub color: bool,
    pub show_scores: bool,
    pub exit_on_close: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityConfigPayload {
    pub sandbox_enabled: bool,
    pub sandbox_directories: Vec<String>,
    pub verify_integrity: bool,
    pub telemetry_opt_in: bool,
}

/// Consent status payload
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsentPayload {
    pub has_consent: bool,
    pub consent_type: String,
    pub granted_at: Option<String>,
}

// =============================================================================
// Conversion Functions
// =============================================================================

impl From<IxosConfig> for ConfigPayload {
    fn from(config: IxosConfig) -> Self {
        Self {
            search: SearchConfigPayload {
                default_limit: config.search.default_limit,
                default_directory: config
                    .search
                    .default_directory
                    .map(|p| p.display().to_string()),
                timeout_seconds: config.search.timeout_seconds,
                enable_secure_ranking: config.search.enable_secure_ranking,
                progressive_by_default: config.search.progressive_by_default,
                cache_mode: config.search.cache_mode.clone(),
                use_stub_model: config.search.use_stub_model,
                secure_timing: config.search.secure_timing,
                context_lines: config.search.context_lines,
                min_score_threshold: config.search.min_score_threshold,
                model_type: config.search.model_type.clone(),
                pro_model_type: config.search.pro_model_type.clone(),
                search_mode: config.search.search_mode.clone(),
                personal_ranking_enabled: config.search.personal_ranking_enabled,
            },
            output: OutputConfigPayload {
                default_format: config.output.default_format.clone(),
                color: config.output.color,
                show_scores: config.output.show_scores,
                exit_on_close: config.output.exit_on_close,
            },
            security: SecurityConfigPayload {
                sandbox_enabled: config.security.sandbox_enabled,
                sandbox_directories: config
                    .security
                    .sandbox_directories
                    .iter()
                    .map(|p| p.display().to_string())
                    .collect(),
                verify_integrity: config.security.verify_integrity,
                telemetry_opt_in: config.security.telemetry_opt_in,
            },
        }
    }
}

impl From<ConfigPayload> for IxosConfig {
    fn from(payload: ConfigPayload) -> Self {
        use std::path::PathBuf;

        Self {
            search: ixos_protocol::cli::SearchConfig {
                default_limit: payload.search.default_limit,
                default_directory: payload.search.default_directory.map(PathBuf::from),
                timeout_seconds: payload.search.timeout_seconds,
                enable_secure_ranking: payload.search.enable_secure_ranking,
                progressive_by_default: payload.search.progressive_by_default,
                cache_mode: payload.search.cache_mode,
                use_stub_model: payload.search.use_stub_model,
                secure_timing: payload.search.secure_timing,
                context_lines: payload.search.context_lines,
                min_score_threshold: payload.search.min_score_threshold,
                model_type: payload.search.model_type,
                pro_model_type: payload.search.pro_model_type,
                search_mode: payload.search.search_mode,
                personal_ranking_enabled: payload.search.personal_ranking_enabled,
            },
            output: ixos_protocol::cli::OutputConfig {
                default_format: payload.output.default_format,
                color: payload.output.color,
                show_scores: payload.output.show_scores,
                exit_on_close: payload.output.exit_on_close,
            },
            index: ixos_protocol::cli::IndexConfig::default(),
            security: ixos_protocol::cli::SecurityConfig {
                sandbox_enabled: payload.security.sandbox_enabled,
                sandbox_directories: payload
                    .security
                    .sandbox_directories
                    .iter()
                    .map(PathBuf::from)
                    .collect(),
                verify_integrity: payload.security.verify_integrity,
                telemetry_opt_in: payload.security.telemetry_opt_in,
            },
        }
    }
}

// =============================================================================
// Commands
// =============================================================================

/// Get current configuration
#[tauri::command]
pub async fn get_config() -> Result<ConfigPayload, String> {
    let config = IxosConfig::load();
    Ok(config.into())
}

/// Update configuration
#[tauri::command]
pub async fn update_config(config: ConfigPayload) -> Result<(), String> {
    let ixos_config: IxosConfig = config.into();
    ixos_config.save().map_err(|e| e.to_string())
}

/// Reset configuration to defaults
#[tauri::command]
pub async fn reset_config() -> Result<(), String> {
    IxosConfig::default().save().map_err(|e| e.to_string())
}

/// Get consent status
#[tauri::command]
pub async fn get_consent_status() -> Result<ConsentPayload, String> {
    let manager = ComplianceManager::new().map_err(|e| e.to_string())?;
    let has_consent = manager.has_consent().map_err(|e| e.to_string())?;

    Ok(ConsentPayload {
        has_consent,
        consent_type: "AIProcessing".to_string(),
        granted_at: None, // Could be fetched from consent record
    })
}

/// Grant consent for AI processing
#[tauri::command]
pub async fn grant_consent() -> Result<(), String> {
    let manager = ComplianceManager::new().map_err(|e| e.to_string())?;
    manager.grant_consent().map_err(|e| e.to_string())?;
    Ok(())
}

/// Withdraw consent
#[tauri::command]
pub async fn withdraw_consent() -> Result<(), String> {
    let manager = ComplianceManager::new().map_err(|e| e.to_string())?;
    manager.withdraw_consent().map_err(|e| e.to_string())?;
    Ok(())
}
