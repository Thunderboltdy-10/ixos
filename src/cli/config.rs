//! Configuration file handling for Ixos CLI
//!
//! Manages configuration stored in `~/.config/ixos/config.toml` (or platform equivalent).
//!
//! ## Configuration Layers
//!
//! Configuration values are resolved in this order (later overrides earlier):
//! 1. Hard-coded defaults
//! 2. Config file (`~/.config/ixos/config.toml`)
//! 3. Environment variables (`IXOS_*`)
//! 4. Command-line arguments
//!
//! ## Example Config File
//!
//! ```toml
//! [search]
//! default_limit = 20
//! timeout_seconds = 5
//!
//! [output]
//! default_format = "human"
//! color = true
//!
//! [index]
//! use_xattr = true
//! ```

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// =============================================================================
// Configuration Structures
// =============================================================================

/// Root configuration for Ixos
// Config file format version
// Bump this when making breaking changes to the config structure
const CONFIG_VERSION: u32 = 1;
const LEGACY_CONFIG_VERSION: u32 = 0;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IxosConfig {
    /// Config file format version for migrations
    #[serde(default = "default_config_version")]
    pub version: u32,

    /// Search settings
    #[serde(default)]
    pub search: SearchConfig,

    /// Output format settings
    #[serde(default)]
    pub output: OutputConfig,

    /// Indexing settings
    #[serde(default)]
    pub index: IndexConfig,

    /// Security settings
    #[serde(default)]
    pub security: SecurityConfig,
}

fn default_config_version() -> u32 {
    LEGACY_CONFIG_VERSION
}

/// Search-related configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchConfig {
    /// Default number of results to return
    #[serde(default = "default_limit")]
    pub default_limit: usize,

    /// Default directory to search (None = current directory)
    #[serde(default)]
    pub default_directory: Option<PathBuf>,

    /// Search timeout in seconds
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,

    /// Whether to apply secure ranking by default
    #[serde(default = "default_true")]
    pub enable_secure_ranking: bool,

    /// Show progressive results by default
    #[serde(default)]
    pub progressive_by_default: bool,

    /// Default cache mode: "native-cache" or "ephemeral"
    #[serde(default = "default_cache_mode")]
    pub cache_mode: String,

    /// Use stub model by default (for testing)
    #[serde(default)]
    pub use_stub_model: bool,

    /// Enable secure timing mode (100ms floor for timing attack protection)
    /// Default: false for maximum performance
    #[serde(default)]
    pub secure_timing: bool,

    /// Number of context lines to show around matches
    #[serde(default = "default_context_lines")]
    pub context_lines: usize,

    /// Minimum score threshold (0.0-1.0) to include in results
    #[serde(default = "default_min_score")]
    pub min_score_threshold: f32,

    /// Embedding model type: "ixos-flash-v2" (default)
    #[serde(default = "default_model_type")]
    pub model_type: String,

    /// Pro model type (used for auto/pro modes)
    #[serde(default = "default_pro_model_type")]
    pub pro_model_type: String,

    /// Search mode: flash | pro | auto
    #[serde(default = "default_search_mode")]
    pub search_mode: String,

    /// Enable local personal ranking signals (Pro feature)
    #[serde(default)]
    pub personal_ranking_enabled: bool,
}

/// Output format configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputConfig {
    /// Default output format (human, json, csv, ripgrep)
    #[serde(default = "default_format")]
    pub default_format: String,

    /// Use colored output
    #[serde(default = "default_true")]
    pub color: bool,

    /// Show score breakdown in results
    #[serde(default)]
    pub show_scores: bool,

    /// Exit the application when the main window is closed (instead of minimizing to tray)
    #[serde(default = "default_false")]
    pub exit_on_close: bool,
}

/// Indexing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexConfig {
    /// Use xattr/ADS caching when available
    #[serde(default = "default_true")]
    pub use_xattr: bool,

    /// Directories to watch for changes
    #[serde(default)]
    pub watch_directories: Vec<PathBuf>,

    /// File extensions to index
    #[serde(default = "default_extensions")]
    pub extensions: Vec<String>,
}

/// Security configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// Enable sandbox mode (restrict to specific directories)
    #[serde(default)]
    pub sandbox_enabled: bool,

    /// Allowed directories when sandbox is enabled
    #[serde(default)]
    pub sandbox_directories: Vec<PathBuf>,

    /// Enable integrity verification for results
    #[serde(default = "default_true")]
    pub verify_integrity: bool,

    /// Opt-in crash telemetry (local-only report bundle)
    #[serde(default = "default_false")]
    pub telemetry_opt_in: bool,
}

// =============================================================================
// Default Value Functions
// =============================================================================

fn default_limit() -> usize {
    20
}

fn default_timeout() -> u64 {
    5
}

fn default_true() -> bool {
    true
}

fn default_false() -> bool {
    false
}

fn default_min_score() -> f32 {
    0.1
}

fn default_format() -> String {
    "human".to_string()
}

fn default_cache_mode() -> String {
    "native-cache".to_string()
}

fn normalize_cache_mode(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "native-cache" | "local" | "cache" | "jit" | "persistent" | "nativecache" => {
            "native-cache".to_string()
        }
        "ephemeral" | "memory" | "memory-only" => "ephemeral".to_string(),
        _ => value.trim().to_lowercase(),
    }
}

fn default_extensions() -> Vec<String> {
    vec![
        "txt".to_string(),
        "md".to_string(),
        "json".to_string(),
        "rs".to_string(),
        "toml".to_string(),
        "yaml".to_string(),
        "yml".to_string(),
    ]
}

fn default_context_lines() -> usize {
    5
}

fn default_model_type() -> String {
    "ixos-flash-v2".to_string()
}

fn default_pro_model_type() -> String {
    "ixos-pro-v2".to_string()
}

fn default_search_mode() -> String {
    "auto".to_string()
}

fn normalize_flash_model_type(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "ixos-flash-v2" | "flash" | "flash-v2" => "ixos-flash-v2".to_string(),
        "ixos-flash-v1" | "flash-v1" => "ixos-flash-v2".to_string(),
        _ => "ixos-flash-v2".to_string(),
    }
}

fn normalize_pro_model_type(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "ixos-pro-v2" | "pro-v2" | "pro" => "ixos-pro-v2".to_string(),
        "potion" | "potion-base-8m-int8" | "ixos-pro-v1" => "ixos-pro-v2".to_string(),
        _ => "ixos-pro-v2".to_string(),
    }
}

// =============================================================================
// Default Implementations
// =============================================================================

impl Default for IxosConfig {
    fn default() -> Self {
        Self {
            version: CONFIG_VERSION,
            search: SearchConfig::default(),
            output: OutputConfig::default(),
            index: IndexConfig::default(),
            security: SecurityConfig::default(),
        }
    }
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            default_limit: default_limit(),
            default_directory: None,
            timeout_seconds: default_timeout(),
            enable_secure_ranking: true,
            progressive_by_default: false,
            cache_mode: default_cache_mode(),
            use_stub_model: false,
            secure_timing: false,
            context_lines: default_context_lines(),
            min_score_threshold: default_min_score(),
            model_type: default_model_type(),
            pro_model_type: default_pro_model_type(),
            search_mode: default_search_mode(),
            personal_ranking_enabled: false,
        }
    }
}

impl Default for OutputConfig {
    fn default() -> Self {
        Self {
            default_format: default_format(),
            color: true,
            show_scores: false,
            exit_on_close: false,
        }
    }
}

impl Default for IndexConfig {
    fn default() -> Self {
        Self {
            use_xattr: true,
            watch_directories: Vec::new(),
            extensions: default_extensions(),
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            sandbox_enabled: false,
            sandbox_directories: Vec::new(),
            verify_integrity: true,
            telemetry_opt_in: false,
        }
    }
}

// =============================================================================
// Configuration Loading and Saving
// =============================================================================

impl IxosConfig {
    /// Get the default configuration file path
    ///
    /// Returns platform-specific config directory:
    /// - Linux: `~/.config/ixos/config.toml`
    /// - macOS: `~/Library/Application Support/ixos/config.toml`
    /// - Windows: `%APPDATA%\ixos\config.toml`
    pub fn default_path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("ixos")
            .join("config.toml")
    }

    /// Load configuration from the default path
    ///
    /// Returns default configuration if the file doesn't exist.
    pub fn load() -> Self {
        Self::load_from(Self::default_path())
    }

    /// Load configuration from a specific path
    ///
    /// Returns default configuration if the file doesn't exist or can't be parsed.
    /// Performs automatic migration if the config version is outdated.
    pub fn load_from(path: PathBuf) -> Self {
        match std::fs::read_to_string(&path) {
            Ok(content) => match toml::from_str::<Self>(&content) {
                Ok(mut config) => {
                    tracing::debug!("Loaded config from {:?}", path);

                    // Check if migration is needed
                    let mut changed = false;
                    let original_version = config.version;

                    // Run migrations
                    config.migrate_if_needed();

                    // Normalize cache mode values (keeps old configs compatible)
                    let normalized_cache_mode = normalize_cache_mode(&config.search.cache_mode);
                    if normalized_cache_mode != config.search.cache_mode {
                        config.search.cache_mode = normalized_cache_mode;
                        changed = true;
                    }

                    // Normalize model types
                    let normalized_model = normalize_flash_model_type(&config.search.model_type);
                    if normalized_model != config.search.model_type {
                        config.search.model_type = normalized_model;
                        changed = true;
                    }
                    let normalized_pro = normalize_pro_model_type(&config.search.pro_model_type);
                    if normalized_pro != config.search.pro_model_type {
                        config.search.pro_model_type = normalized_pro;
                        changed = true;
                    }
                    if !["flash", "auto", "pro"].contains(&config.search.search_mode.as_str()) {
                        config.search.search_mode = default_search_mode();
                        changed = true;
                    }

                    // Save if migrated or normalized
                    if config.version != original_version || changed {
                        tracing::info!(
                            "Config migrated from version {} to {}",
                            original_version,
                            config.version
                        );
                        if let Err(e) = config.save_to(path.clone()) {
                            tracing::warn!("Failed to persist migrated config {:?}: {}", path, e);
                        }
                    }
                    config
                }
                Err(e) => {
                    tracing::warn!("Failed to parse config at {:?}: {}", path, e);
                    Self::default()
                }
            },
            Err(_) => {
                tracing::debug!("Config file not found at {:?}, using defaults", path);
                Self::default()
            }
        }
    }

    /// Migrate config to the latest version if needed
    fn migrate_if_needed(&mut self) {
        match self.version {
            0 => {
                // Migration from unversioned (v0) to v1
                // Ensure personal_ranking_enabled defaults to false for security
                if self.search.personal_ranking_enabled {
                    tracing::info!("Migrating config: Resetting personal_ranking_enabled to false (requires Pro)");
                    self.search.personal_ranking_enabled = false;
                }
                self.search.cache_mode = normalize_cache_mode(&self.search.cache_mode);
                self.version = CONFIG_VERSION;
            }
            CONFIG_VERSION => {
                // Current version - no migration needed
            }
            _ => {
                // Future versions - config is newer than this code
                tracing::warn!("Config version {} is newer than supported version {}. Some features may not work correctly.", 
                    self.version, CONFIG_VERSION);
            }
        }
    }

    /// Save configuration to the default path
    pub fn save(&self) -> std::io::Result<()> {
        self.save_to(Self::default_path())
    }

    /// Save configuration to a specific path
    ///
    /// Creates parent directories if they don't exist.
    pub fn save_to(&self, path: PathBuf) -> std::io::Result<()> {
        // Create parent directories
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let content = toml::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

        std::fs::write(&path, content)?;
        tracing::debug!("Saved config to {:?}", path);

        Ok(())
    }

    /// Get a configuration value by key path
    ///
    /// Key path uses dot notation: `search.default_limit`
    pub fn get(&self, key: &str) -> Option<String> {
        let parts: Vec<&str> = key.split('.').collect();

        match parts.as_slice() {
            ["search", "default_limit"] => Some(self.search.default_limit.to_string()),
            ["search", "timeout_seconds"] => Some(self.search.timeout_seconds.to_string()),
            ["search", "enable_secure_ranking"] => {
                Some(self.search.enable_secure_ranking.to_string())
            }
            ["search", "progressive_by_default"] => {
                Some(self.search.progressive_by_default.to_string())
            }
            ["search", "cache_mode"] => Some(self.search.cache_mode.clone()),
            ["search", "use_stub_model"] => Some(self.search.use_stub_model.to_string()),
            ["search", "secure_timing"] => Some(self.search.secure_timing.to_string()),
            ["search", "context_lines"] => Some(self.search.context_lines.to_string()),
            ["search", "model_type"] => Some(self.search.model_type.clone()),
            ["search", "pro_model_type"] => Some(self.search.pro_model_type.clone()),
            ["search", "search_mode"] => Some(self.search.search_mode.clone()),
            ["search", "personal_ranking_enabled"] => {
                Some(self.search.personal_ranking_enabled.to_string())
            }
            ["output", "default_format"] => Some(self.output.default_format.clone()),
            ["output", "color"] => Some(self.output.color.to_string()),
            ["output", "show_scores"] => Some(self.output.show_scores.to_string()),
            ["output", "exit_on_close"] => Some(self.output.exit_on_close.to_string()),
            ["index", "use_xattr"] => Some(self.index.use_xattr.to_string()),
            ["security", "sandbox_enabled"] => Some(self.security.sandbox_enabled.to_string()),
            ["security", "verify_integrity"] => Some(self.security.verify_integrity.to_string()),
            ["security", "telemetry_opt_in"] => Some(self.security.telemetry_opt_in.to_string()),
            _ => None,
        }
    }

    /// Set a configuration value by key path
    ///
    /// Key path uses dot notation: `search.default_limit`
    /// Returns an error if the key is invalid or the value can't be parsed.
    pub fn set(&mut self, key: &str, value: &str) -> Result<(), ConfigError> {
        let parts: Vec<&str> = key.split('.').collect();

        match parts.as_slice() {
            ["search", "default_limit"] => {
                self.search.default_limit =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "positive integer".to_string(),
                    })?;
            }
            ["search", "timeout_seconds"] => {
                self.search.timeout_seconds =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "positive integer".to_string(),
                    })?;
            }
            ["search", "enable_secure_ranking"] => {
                self.search.enable_secure_ranking =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["search", "progressive_by_default"] => {
                self.search.progressive_by_default =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["search", "cache_mode"] => {
                let normalized = normalize_cache_mode(value);
                if !["native-cache", "ephemeral", "local", "memory"]
                    .contains(&value.trim().to_lowercase().as_str())
                {
                    return Err(ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "native-cache/local or ephemeral/memory".to_string(),
                    });
                }
                self.search.cache_mode = normalized;
            }
            ["search", "use_stub_model"] => {
                self.search.use_stub_model =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["search", "secure_timing"] => {
                self.search.secure_timing =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["search", "context_lines"] => {
                self.search.context_lines =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "positive integer".to_string(),
                    })?;
            }
            ["search", "model_type"] => {
                if value != "ixos-flash-v2" {
                    return Err(ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "ixos-flash-v2".to_string(),
                    });
                }
                self.search.model_type = value.to_string();
            }
            ["search", "pro_model_type"] => {
                if value != "ixos-pro-v2" {
                    return Err(ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "ixos-pro-v2".to_string(),
                    });
                }
                self.search.pro_model_type = value.to_string();
            }
            ["search", "search_mode"] => {
                if !["flash", "pro", "auto"].contains(&value) {
                    return Err(ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "flash, pro, or auto".to_string(),
                    });
                }
                self.search.search_mode = value.to_string();
            }
            ["search", "personal_ranking_enabled"] => {
                self.search.personal_ranking_enabled =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["output", "default_format"] => {
                if !["human", "json", "csv", "ripgrep"].contains(&value) {
                    return Err(ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "human, json, csv, or ripgrep".to_string(),
                    });
                }
                self.output.default_format = value.to_string();
            }
            ["output", "color"] => {
                self.output.color = value.parse().map_err(|_| ConfigError::InvalidValue {
                    key: key.to_string(),
                    value: value.to_string(),
                    expected: "true or false".to_string(),
                })?;
            }
            ["output", "show_scores"] => {
                self.output.show_scores = value.parse().map_err(|_| ConfigError::InvalidValue {
                    key: key.to_string(),
                    value: value.to_string(),
                    expected: "true or false".to_string(),
                })?;
            }
            ["output", "exit_on_close"] => {
                self.output.exit_on_close =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["index", "use_xattr"] => {
                self.index.use_xattr = value.parse().map_err(|_| ConfigError::InvalidValue {
                    key: key.to_string(),
                    value: value.to_string(),
                    expected: "true or false".to_string(),
                })?;
            }
            ["security", "sandbox_enabled"] => {
                self.security.sandbox_enabled =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["security", "verify_integrity"] => {
                self.security.verify_integrity =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            ["security", "telemetry_opt_in"] => {
                self.security.telemetry_opt_in =
                    value.parse().map_err(|_| ConfigError::InvalidValue {
                        key: key.to_string(),
                        value: value.to_string(),
                        expected: "true or false".to_string(),
                    })?;
            }
            _ => {
                return Err(ConfigError::UnknownKey(key.to_string()));
            }
        }

        Ok(())
    }

    /// List all configuration keys with their current values
    pub fn list(&self) -> Vec<(String, String)> {
        vec![
            (
                "search.default_limit".to_string(),
                self.search.default_limit.to_string(),
            ),
            (
                "search.timeout_seconds".to_string(),
                self.search.timeout_seconds.to_string(),
            ),
            (
                "search.enable_secure_ranking".to_string(),
                self.search.enable_secure_ranking.to_string(),
            ),
            (
                "search.progressive_by_default".to_string(),
                self.search.progressive_by_default.to_string(),
            ),
            (
                "search.cache_mode".to_string(),
                self.search.cache_mode.clone(),
            ),
            (
                "search.use_stub_model".to_string(),
                self.search.use_stub_model.to_string(),
            ),
            (
                "search.secure_timing".to_string(),
                self.search.secure_timing.to_string(),
            ),
            (
                "search.context_lines".to_string(),
                self.search.context_lines.to_string(),
            ),
            (
                "search.model_type".to_string(),
                self.search.model_type.clone(),
            ),
            (
                "search.pro_model_type".to_string(),
                self.search.pro_model_type.clone(),
            ),
            (
                "search.search_mode".to_string(),
                self.search.search_mode.clone(),
            ),
            (
                "search.personal_ranking_enabled".to_string(),
                self.search.personal_ranking_enabled.to_string(),
            ),
            (
                "output.default_format".to_string(),
                self.output.default_format.clone(),
            ),
            ("output.color".to_string(), self.output.color.to_string()),
            (
                "output.show_scores".to_string(),
                self.output.show_scores.to_string(),
            ),
            (
                "index.use_xattr".to_string(),
                self.index.use_xattr.to_string(),
            ),
            (
                "security.sandbox_enabled".to_string(),
                self.security.sandbox_enabled.to_string(),
            ),
            (
                "security.verify_integrity".to_string(),
                self.security.verify_integrity.to_string(),
            ),
            (
                "security.telemetry_opt_in".to_string(),
                self.security.telemetry_opt_in.to_string(),
            ),
        ]
    }
}

// =============================================================================
// Errors
// =============================================================================

/// Configuration errors
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Unknown configuration key: {0}")]
    UnknownKey(String),

    #[error("Invalid value for {key}: '{value}' (expected {expected})")]
    InvalidValue {
        key: String,
        value: String,
        expected: String,
    },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_default_config() {
        let config = IxosConfig::default();
        assert_eq!(config.search.default_limit, 20);
        assert!(config.output.color);
        assert!(config.index.use_xattr);
    }

    #[test]
    fn test_config_path() {
        let path = IxosConfig::default_path();
        assert!(path.to_string_lossy().contains("ixos"));
        assert!(path.to_string_lossy().contains("config.toml"));
    }

    #[test]
    fn test_save_and_load() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("config.toml");

        let mut config = IxosConfig::default();
        config.search.default_limit = 50;
        config.output.color = false;

        config.save_to(config_path.clone()).unwrap();

        let loaded = IxosConfig::load_from(config_path);
        assert_eq!(loaded.search.default_limit, 50);
        assert!(!loaded.output.color);
    }

    #[test]
    fn test_load_nonexistent() {
        let config = IxosConfig::load_from(PathBuf::from("/nonexistent/config.toml"));
        // Should return defaults
        assert_eq!(config.search.default_limit, 20);
    }

    #[test]
    fn test_get() {
        let config = IxosConfig::default();
        assert_eq!(config.get("search.default_limit"), Some("20".to_string()));
        assert_eq!(config.get("output.color"), Some("true".to_string()));
        assert_eq!(config.get("invalid.key"), None);
    }

    #[test]
    fn test_set() {
        let mut config = IxosConfig::default();

        config.set("search.default_limit", "50").unwrap();
        assert_eq!(config.search.default_limit, 50);

        config.set("output.color", "false").unwrap();
        assert!(!config.output.color);

        config.set("output.default_format", "json").unwrap();
        assert_eq!(config.output.default_format, "json");
    }

    #[test]
    fn test_set_invalid_value() {
        let mut config = IxosConfig::default();

        let result = config.set("search.default_limit", "not_a_number");
        assert!(result.is_err());

        let result = config.set("output.default_format", "invalid_format");
        assert!(result.is_err());
    }

    #[test]
    fn test_set_unknown_key() {
        let mut config = IxosConfig::default();
        let result = config.set("unknown.key", "value");
        assert!(matches!(result, Err(ConfigError::UnknownKey(_))));
    }

    #[test]
    fn test_list() {
        let config = IxosConfig::default();
        let items = config.list();
        assert!(!items.is_empty());
        assert!(items.iter().any(|(k, _)| k == "search.default_limit"));
    }

    #[test]
    fn test_toml_serialization() {
        let config = IxosConfig::default();
        let toml = toml::to_string_pretty(&config).unwrap();
        assert!(toml.contains("[search]"));
        assert!(toml.contains("[output]"));
    }

    #[test]
    fn test_unversioned_config_migrates_to_current_version() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("legacy.toml");
        let legacy = r#"
[search]
personal_ranking_enabled = true
cache_mode = "memory"
"#;
        std::fs::write(&config_path, legacy).unwrap();

        let loaded = IxosConfig::load_from(config_path);
        assert_eq!(loaded.version, CONFIG_VERSION);
        assert!(!loaded.search.personal_ranking_enabled);
        assert_eq!(loaded.search.cache_mode, "ephemeral");
    }

    #[test]
    fn test_cache_mode_aliases_are_normalized() {
        let mut config = IxosConfig::default();
        config.set("search.cache_mode", "memory").unwrap();
        assert_eq!(config.search.cache_mode, "ephemeral");

        config.set("search.cache_mode", "local").unwrap();
        assert_eq!(config.search.cache_mode, "native-cache");
    }

    #[test]
    fn test_cache_mode_legacy_aliases_are_rejected() {
        let mut config = IxosConfig::default();
        for legacy in ["jit", "cache", "persistent", "nativecache", "memory-only"] {
            let result = config.set("search.cache_mode", legacy);
            assert!(result.is_err(), "legacy alias should fail: {legacy}");
        }
    }

    #[test]
    fn test_unknown_cache_mode_is_preserved_on_load() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("unknown-cache.toml");
        let legacy = r#"
[search]
cache_mode = "mystery-mode"
"#;
        std::fs::write(&config_path, legacy).unwrap();

        let loaded = IxosConfig::load_from(config_path);
        assert_eq!(loaded.search.cache_mode, "mystery-mode");
    }
}
