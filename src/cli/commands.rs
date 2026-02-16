//! CLI command definitions for Ixos
//!
//! Defines all CLI commands and arguments using clap derive macros.
//!
//! ## Commands
//!
//! - `search` - Search files semantically
//! - `index` - Index directories for faster search
//! - `config` - Show or modify configuration
//! - `daemon` - Run background daemon
//! - `compliance` - Privacy and compliance management
//! - `version` - Show version and diagnostics

use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;

// =============================================================================
// Main CLI
// =============================================================================

/// Ixos - Privacy-first semantic file search
#[derive(Parser, Debug)]
#[command(name = "ixos")]
#[command(about = "Privacy-first semantic file search", long_about = None)]
#[command(version)]
#[command(propagate_version = true)]
pub struct Cli {
    /// Subcommand to execute
    #[command(subcommand)]
    pub command: Commands,

    /// Path to configuration file
    #[arg(long, global = true)]
    pub config: Option<PathBuf>,

    /// Enable verbose logging
    #[arg(short, long, global = true)]
    pub verbose: bool,

    /// Suppress all output except errors
    #[arg(short, long, global = true)]
    pub quiet: bool,
}

// =============================================================================
// Commands
// =============================================================================

/// Cache mode for embedding storage (CLI compatible)
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
pub enum CliCacheMode {
    /// Local mode: persist embeddings to ADS/xattr (recommended)
    #[default]
    #[value(alias = "local")]
    NativeCache,
    /// Memory mode: embeddings in memory only
    #[value(alias = "memory")]
    Ephemeral,
}

impl From<CliCacheMode> for crate::ixos_rank::semantic_engine::CacheMode {
    fn from(mode: CliCacheMode) -> Self {
        match mode {
            CliCacheMode::NativeCache => crate::ixos_rank::semantic_engine::CacheMode::NativeCache,
            CliCacheMode::Ephemeral => crate::ixos_rank::semantic_engine::CacheMode::Ephemeral,
        }
    }
}

/// Search mode selector (flash/pro/auto)
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
pub enum CliSearchMode {
    Flash,
    Pro,
    #[default]
    Auto,
}

/// Flash embedding model selector (CLI compatible)
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
pub enum CliFlashModelType {
    /// Ixos Flash (ixos-flash-v2): Default fast model
    #[default]
    IxosFlashV2,
    /// Flash Core (ixos-flash-v1): Legacy flash model
    #[value(hide = true)]
    IxosFlashV1,
}

impl From<CliFlashModelType> for crate::ixos_embed::ModelType {
    fn from(model: CliFlashModelType) -> Self {
        match model {
            CliFlashModelType::IxosFlashV2 => crate::ixos_embed::ModelType::IxosFlashV2,
            CliFlashModelType::IxosFlashV1 => crate::ixos_embed::ModelType::IxosFlashV1,
        }
    }
}

/// Pro model selector (CLI compatible)
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
pub enum CliProModelType {
    /// Ixos Pro (ixos-pro-v2): Fusion/cascade search model
    #[default]
    IxosProV2,
    /// Ixos-Pro-v1: Legacy Pro model
    #[value(hide = true)]
    IxosProV1,
}

impl From<CliProModelType> for crate::ixos_embed::ModelType {
    fn from(model: CliProModelType) -> Self {
        match model {
            CliProModelType::IxosProV2 => crate::ixos_embed::ModelType::IxosProV2,
            CliProModelType::IxosProV1 => crate::ixos_embed::ModelType::IxosProV1,
        }
    }
}

/// Available commands
#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Search files semantically
    Search {
        /// Search query
        query: String,

        /// Maximum number of results to return
        #[arg(short, long, default_value = "20")]
        limit: usize,

        /// Output format
        #[arg(short, long, value_enum, default_value = "human")]
        format: CliOutputFormat,

        /// Directory to search in
        #[arg(short, long)]
        dir: Option<PathBuf>,

        /// Output as JSON (shorthand for --format json)
        #[arg(long)]
        json: bool,

        /// Show progressive results (lexical then semantic)
        #[arg(long)]
        progressive: bool,

        /// Show score breakdown in output
        #[arg(long)]
        show_scores: bool,

        /// Include full evidence payload in JSON output
        ///
        /// When used with --json or --format json, includes detailed evidence
        /// explaining why each result matched (tags, explanation, semantic passage).
        #[arg(long)]
        evidence: bool,

        /// Restrict search to specific directory (sandbox mode)
        #[arg(long)]
        sandbox: Option<PathBuf>,

        /// Minimum similarity score (0.0-1.0) to include in results
        #[arg(long)]
        min_score: Option<f32>,

        /// Disable secure ranking (faster but less secure)
        #[arg(long)]
        no_secure_ranking: bool,

        /// Cache mode: local (ADS/xattr persistence) or memory (RAM only)
        #[arg(long, value_enum)]
        cache_mode: Option<CliCacheMode>,

        /// Use stub model for testing (fast, no semantic understanding)
        #[arg(long)]
        stub_model: bool,

        /// Search mode: flash, pro, or auto (defaults to config setting)
        #[arg(long, value_enum)]
        search_mode: Option<CliSearchMode>,

        /// Flash model to use (default: Ixos Flash / ixos-flash-v2)
        #[arg(long, value_enum)]
        model: Option<CliFlashModelType>,

        /// Pro model to use for auto/pro modes (default: Ixos Pro / ixos-pro-v2)
        #[arg(long, value_enum)]
        pro_model: Option<CliProModelType>,

        /// Enable secure timing mode (100ms floor for timing attack protection)
        ///
        /// By default, embeddings are as fast as possible. Enable this flag
        /// when processing sensitive data that may be exposed to timing analysis.
        #[arg(long)]
        secure_timing: bool,

        /// Number of lines of context to show around matches (default: 5)
        #[arg(short = 'C', long, default_value = "5")]
        context: usize,

        /// Enable Deep Search mode (thorough, slower, more comprehensive)
        #[arg(long = "deep-search")]
        deep_search: bool,
    },

    /// Index directories for faster search
    Index {
        /// Directories to index
        dirs: Vec<PathBuf>,

        /// Use xattr/ADS caching when available
        #[arg(long)]
        use_xattr: bool,

        /// Show progress during indexing
        #[arg(long)]
        progress: bool,

        /// Clear existing index before indexing
        #[arg(long)]
        clear: bool,
    },

    /// Show or modify configuration
    Config {
        /// Get a configuration value (e.g., search.default_limit)
        #[arg(long)]
        get: Option<String>,

        /// Set a configuration value (e.g., search.default_limit=50)
        #[arg(long)]
        set: Option<String>,

        /// List all configuration values
        #[arg(long)]
        list: bool,

        /// Reset configuration to defaults
        #[arg(long)]
        reset: bool,

        /// Show configuration file path
        #[arg(long)]
        path: bool,
    },

    /// Run background daemon for file watching
    Daemon {
        /// Run in foreground (don't daemonize)
        #[arg(long)]
        foreground: bool,

        /// Stop running daemon
        #[arg(long, hide = true)]
        stop: bool,

        /// Show daemon status
        #[arg(long, hide = true)]
        status: bool,
    },

    /// Manage embedding cache (P5)
    Cache {
        /// Cache action
        #[command(subcommand)]
        action: CacheCommands,
    },

    /// Compliance and privacy management
    Compliance {
        /// Compliance action
        #[command(subcommand)]
        action: ComplianceCommands,
    },

    /// Run installation and runtime diagnostics
    Doctor {
        /// Output diagnostics as JSON
        #[arg(long)]
        json: bool,

        /// Include detailed diagnostics
        #[arg(long)]
        verbose: bool,
    },

    /// Show version and diagnostics
    Version {
        /// Show detailed system information
        #[arg(long)]
        verbose: bool,
    },

    /// Run release readiness checks (stub; full flow in Phase 7)
    ReleaseCheck {
        /// Skip long-running suites
        #[arg(long)]
        quick: bool,
    },

    /// Download and manage embedding models
    Model {
        /// Model action
        #[command(subcommand)]
        action: ModelCommands,
    },

    /// Check for and install CLI updates
    Update {
        /// Only check for updates without installing
        #[arg(long)]
        check: bool,

        /// Skip confirmation prompt
        #[arg(long)]
        yes: bool,

        /// Install a specific version (e.g., 0.2.0)
        #[arg(long)]
        version: Option<String>,
    },
}

// =============================================================================
// Output Format
// =============================================================================

/// CLI output format (clap-compatible)
#[derive(Clone, Copy, Debug, Default, ValueEnum)]
pub enum CliOutputFormat {
    /// Human-readable output with colors
    #[default]
    Human,
    /// JSON output for scripting
    Json,
    /// CSV output for spreadsheets
    Csv,
    /// Ripgrep-compatible output for fzf
    Ripgrep,
    /// Zotero CSV format
    Zotero,
    /// Mendeley XML format
    Mendeley,
    /// BibTeX format
    Bibtex,
}

impl From<CliOutputFormat> for super::output::OutputFormat {
    fn from(f: CliOutputFormat) -> Self {
        match f {
            CliOutputFormat::Human => super::output::OutputFormat::Human,
            CliOutputFormat::Json => super::output::OutputFormat::Json,
            CliOutputFormat::Csv => super::output::OutputFormat::Csv,
            CliOutputFormat::Ripgrep => super::output::OutputFormat::Ripgrep,
            CliOutputFormat::Zotero => super::output::OutputFormat::Zotero,
            CliOutputFormat::Mendeley => super::output::OutputFormat::Mendeley,
            CliOutputFormat::Bibtex => super::output::OutputFormat::Bibtex,
        }
    }
}

// =============================================================================
// Cache Commands (P5)
// =============================================================================

/// Cache management subcommands
#[derive(Subcommand, Debug)]
pub enum CacheCommands {
    /// Show cache statistics
    Stats {
        /// Directory to check (default: all watched directories)
        #[arg(short, long)]
        dir: Option<PathBuf>,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Clear cached embeddings
    Clear {
        /// Directory to clear (default: all)
        #[arg(short, long)]
        dir: Option<PathBuf>,

        /// Skip confirmation prompt
        #[arg(long)]
        force: bool,

        /// Only clear stale entries (older than N days)
        #[arg(long)]
        stale_days: Option<u32>,
    },

    /// Show cache health and disk usage
    Audit {
        /// Show detailed per-file information
        #[arg(long)]
        detailed: bool,

        /// Check for corruption
        #[arg(long)]
        verify: bool,
    },

    /// Set cache mode preference
    Mode {
        /// Mode: memory (RAM only) or local (ADS/xattr persistence)
        mode: CliCacheModePreference,
    },

    /// Rebuild cache for a directory
    Rebuild {
        /// Directory to rebuild
        dir: PathBuf,

        /// Number of parallel workers
        #[arg(long, default_value = "4")]
        workers: usize,

        /// Skip confirmation prompt
        #[arg(long)]
        force: bool,
    },
}

/// Model management subcommands
#[derive(Subcommand, Debug)]
pub enum ModelCommands {
    /// List available models
    List {
        /// Show all models including unavailable
        #[arg(long)]
        all: bool,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Download a model
    Download {
        /// Model type (ixos-flash-v2, ixos-pro-v2, etc.)
        model: String,

        /// Show progress
        #[arg(long)]
        progress: bool,
    },

    /// Preload a model into memory
    Preload {
        /// Model type (ixos-flash-v2, ixos-pro-v2, etc.)
        model: String,
    },

    /// Show model status
    Status {
        /// Model type
        #[arg(short, long)]
        model: Option<String>,
    },

    /// Delete a downloaded model
    Delete {
        /// Model type
        model: String,

        /// Skip confirmation prompt
        #[arg(long)]
        force: bool,
    },
}

/// Cache mode preference for CLI
#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum CliCacheModePreference {
    /// Memory-only, no persistence.
    Memory,
    /// Persist to ADS/xattr when available.
    Local,
}

// =============================================================================
// Compliance Commands
// =============================================================================

/// Compliance subcommands
#[derive(Subcommand, Debug)]
pub enum ComplianceCommands {
    /// Manage AI processing consent
    Consent {
        /// Show current consent status
        #[arg(long)]
        status: bool,

        /// Grant consent for AI processing
        #[arg(long)]
        grant: bool,

        /// Withdraw consent
        #[arg(long)]
        withdraw: bool,
    },

    /// GDPR data subject rights (EU)
    Gdpr {
        /// GDPR action
        #[command(subcommand)]
        action: GdprCommands,
    },

    /// CCPA consumer rights (California)
    Ccpa {
        /// CCPA action
        #[command(subcommand)]
        action: CcpaCommands,
    },

    /// Generate technical documentation
    Docs {
        /// Output format: json or markdown
        #[arg(short, long, default_value = "json")]
        format: String,

        /// Output file path
        #[arg(short, long)]
        output: Option<PathBuf>,
    },

    /// View audit log
    Audit {
        /// Number of days to show
        #[arg(short, long, default_value = "7")]
        days: u32,

        /// Show counts only
        #[arg(long)]
        summary: bool,
    },
}

/// GDPR subcommands
#[derive(Subcommand, Debug)]
pub enum GdprCommands {
    /// Request access to your data (Article 15)
    Access,

    /// Request data erasure (Article 17)
    Erase {
        /// Scope: all, history, cache, consent
        #[arg(long, default_value = "all")]
        scope: String,

        /// Skip confirmation prompt
        #[arg(long)]
        force: bool,
    },

    /// Export data in portable format (Article 20)
    Export {
        /// Output file path
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
}

/// CCPA subcommands
#[derive(Subcommand, Debug)]
pub enum CcpaCommands {
    /// View collected data categories (Right to Know)
    Know,

    /// Request deletion of data
    Delete {
        /// Skip confirmation prompt
        #[arg(long)]
        force: bool,
    },

    /// Opt out of data sales (N/A but required for compliance)
    OptOut,

    /// View CCPA privacy notice
    Notice,
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use clap::CommandFactory;

    #[test]
    fn test_cli_parse() {
        // Test that CLI can be constructed
        Cli::command().debug_assert();
    }

    #[test]
    fn test_search_command() {
        let cli = Cli::try_parse_from(["ixos", "search", "test query"]).unwrap();
        match cli.command {
            Commands::Search { query, limit, .. } => {
                assert_eq!(query, "test query");
                assert_eq!(limit, 20); // default
            }
            _ => panic!("Expected Search command"),
        }
    }

    #[test]
    fn test_search_with_options() {
        let cli = Cli::try_parse_from([
            "ixos",
            "search",
            "test",
            "--limit",
            "50",
            "--format",
            "json",
            "--progressive",
        ])
        .unwrap();

        match cli.command {
            Commands::Search {
                limit,
                format,
                progressive,
                ..
            } => {
                assert_eq!(limit, 50);
                assert!(matches!(format, CliOutputFormat::Json));
                assert!(progressive);
            }
            _ => panic!("Expected Search command"),
        }
    }

    #[test]
    fn test_config_command() {
        let cli = Cli::try_parse_from(["ixos", "config", "--list"]).unwrap();
        match cli.command {
            Commands::Config { list, .. } => {
                assert!(list);
            }
            _ => panic!("Expected Config command"),
        }
    }

    #[test]
    fn test_version_command() {
        let cli = Cli::try_parse_from(["ixos", "version", "--verbose"]).unwrap();
        match cli.command {
            Commands::Version { verbose } => {
                assert!(verbose);
            }
            _ => panic!("Expected Version command"),
        }
    }

    #[test]
    fn test_index_command() {
        let cli = Cli::try_parse_from([
            "ixos",
            "index",
            "/path/to/dir1",
            "/path/to/dir2",
            "--use-xattr",
        ])
        .unwrap();

        match cli.command {
            Commands::Index {
                dirs, use_xattr, ..
            } => {
                assert_eq!(dirs.len(), 2);
                assert!(use_xattr);
            }
            _ => panic!("Expected Index command"),
        }
    }

    #[test]
    fn test_global_options() {
        let cli = Cli::try_parse_from(["ixos", "--verbose", "version"]).unwrap();
        assert!(cli.verbose);
    }

    #[test]
    fn test_output_format_conversion() {
        use super::super::output::OutputFormat;

        assert!(matches!(
            OutputFormat::from(CliOutputFormat::Human),
            OutputFormat::Human
        ));
        assert!(matches!(
            OutputFormat::from(CliOutputFormat::Json),
            OutputFormat::Json
        ));
    }

    #[test]
    fn test_search_cache_mode() {
        let cli = Cli::try_parse_from([
            "ixos",
            "search",
            "test",
            "--cache-mode",
            "local",
            "--stub-model",
        ])
        .unwrap();

        match cli.command {
            Commands::Search {
                cache_mode,
                stub_model,
                ..
            } => {
                assert!(matches!(cache_mode, Some(CliCacheMode::NativeCache)));
                assert!(stub_model);
            }
            _ => panic!("Expected Search command"),
        }
    }

    #[test]
    fn test_search_cache_mode_new_values() {
        let cli =
            Cli::try_parse_from(["ixos", "search", "test", "--cache-mode", "ephemeral"]).unwrap();

        match cli.command {
            Commands::Search { cache_mode, .. } => {
                assert!(matches!(cache_mode, Some(CliCacheMode::Ephemeral)));
            }
            _ => panic!("Expected Search command"),
        }
    }

    #[test]
    fn test_search_cache_mode_memory_alias() {
        let cli =
            Cli::try_parse_from(["ixos", "search", "test", "--cache-mode", "memory"]).unwrap();

        match cli.command {
            Commands::Search { cache_mode, .. } => {
                assert!(matches!(cache_mode, Some(CliCacheMode::Ephemeral)));
            }
            _ => panic!("Expected Search command"),
        }
    }

    #[test]
    fn test_update_command() {
        let cli = Cli::try_parse_from(["ixos", "update", "--check"]).unwrap();
        match cli.command {
            Commands::Update { check, yes, version } => {
                assert!(check);
                assert!(!yes);
                assert!(version.is_none());
            }
            _ => panic!("Expected Update command"),
        }
    }

    #[test]
    fn test_update_command_with_version() {
        let cli = Cli::try_parse_from(["ixos", "update", "--yes", "--version", "0.2.0"]).unwrap();
        match cli.command {
            Commands::Update { check, yes, version } => {
                assert!(!check);
                assert!(yes);
                assert_eq!(version, Some("0.2.0".to_string()));
            }
            _ => panic!("Expected Update command"),
        }
    }

    #[test]
    fn test_search_cache_mode_legacy_aliases_rejected() {
        for legacy in ["jit", "cache", "persistent", "nativecache"] {
            let parsed = Cli::try_parse_from(["ixos", "search", "test", "--cache-mode", legacy]);
            assert!(parsed.is_err(), "legacy alias should fail: {legacy}");
        }
    }

    #[test]
    fn test_journalist_mode_flag_removed() {
        let parsed = Cli::try_parse_from(["ixos", "search", "test", "--journalist-mode"]);
        assert!(parsed.is_err(), "legacy deep-search flag alias should fail");
    }

    #[test]
    fn test_cache_mode_default() {
        let cli = Cli::try_parse_from(["ixos", "search", "test"]).unwrap();

        match cli.command {
            Commands::Search {
                cache_mode,
                stub_model,
                ..
            } => {
                assert!(cache_mode.is_none());
                assert!(!stub_model);
            }
            _ => panic!("Expected Search command"),
        }
    }
}
