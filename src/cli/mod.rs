//! CLI module for Ixos
//!
//! Provides the command-line interface with:
//!
//! - Multiple output formats (Human, JSON, CSV, Ripgrep)
//! - Configuration file support
//! - Progressive search with streaming results
//! - Pipe-friendly output for fzf integration
//!
//! ## Usage
//!
//! ```bash
//! # Basic search
//! ixos search "quarterly report"
//!
//! # JSON output for scripting
//! ixos search "api docs" --json | jq '.results[0].path'
//!
//! # Pipe to fzf
//! ixos search "" --format ripgrep | fzf --preview 'head -20 {}'
//!
//! # Progressive search with streaming
//! ixos search "query" --progressive
//!
//! # Configuration management
//! ixos config --list
//! ixos config --set search.default_limit=50
//! ```
//!
//! ## Module Structure
//!
//! - `commands`: CLI command definitions using clap
//! - `output`: Output formatters for different formats
//! - `config`: Configuration file handling

pub mod commands;
pub mod config;
pub mod output;
pub mod self_update;

// Re-exports for convenience
pub use commands::{
    CacheCommands, CcpaCommands, Cli, CliCacheMode, CliCacheModePreference, CliFlashModelType,
    CliOutputFormat, CliProModelType, CliSearchMode, Commands, ComplianceCommands, GdprCommands,
    ModelCommands,
};
pub use config::{
    ConfigError, IndexConfig, IxosConfig, OutputConfig, SearchConfig, SecurityConfig,
};
pub use output::{create_formatter, create_formatter_with_options, OutputFormat, OutputFormatter};
