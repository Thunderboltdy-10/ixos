use clap::{Args, Parser, Subcommand};
use ixos_core::{config::Profile, engine::RetrievalMode};
use std::path::PathBuf;

#[derive(Parser)]
#[command(
    name = "ixos",
    version,
    about = "Local hybrid search over code and documents"
)]
pub struct Cli {
    #[arg(long, global = true)]
    pub config: Option<PathBuf>,
    #[command(subcommand)]
    pub command: Command,
}
#[derive(Args)]
pub struct Search {
    pub query: String,
    #[command(flatten)]
    pub location: Location,
    #[arg(long, value_enum)]
    pub mode: Option<RetrievalMode>,
    #[arg(long)]
    pub limit: Option<usize>,
    #[arg(long)]
    pub context: Option<usize>,
    #[arg(long)]
    pub json: bool,
}
#[derive(Args)]
pub struct Location {
    #[arg(long, default_value = ".")]
    pub dir: PathBuf,
    #[arg(long, value_enum)]
    pub profile: Option<Profile>,
    /// Load a local model directory during development.
    #[arg(long)]
    pub model_path: Option<PathBuf>,
}
#[derive(Subcommand)]
pub enum Command {
    /// Find files by concept, keywords, or both.
    Search(Search),
    /// Find exact text or a regular expression.
    Grep {
        pattern: String,
        #[arg(long, default_value = ".")]
        dir: PathBuf,
        #[arg(short = 'F', long)]
        fixed: bool,
        #[arg(short = 'i', long)]
        ignore_case: bool,
        #[arg(long, default_value_t = 2)]
        context: usize,
        #[arg(long, default_value_t = 10)]
        limit: usize,
        #[arg(long)]
        json: bool,
    },
    /// Read lines from a file, including extracted PDF and Office text.
    Read {
        path: PathBuf,
        #[arg(long, default_value = ".")]
        dir: PathBuf,
        #[arg(long, default_value_t = 1)]
        start: usize,
        #[arg(long, default_value_t = 40)]
        lines: usize,
        #[arg(long)]
        characters: Option<usize>,
        #[arg(long, default_value_t = 0)]
        character_offset: usize,
        #[arg(long)]
        json: bool,
    },
    /// Serve search, grep and read tools over MCP stdio.
    Mcp {
        #[command(flatten)]
        location: Location,
    },
    /// Inspect or remove Ixos metadata.
    Cache {
        #[command(subcommand)]
        command: CacheCommand,
    },
    /// Install or list the code and documents models.
    Model {
        #[command(subcommand)]
        command: ModelCommand,
    },
    /// Check models, cache storage and a small search.
    Doctor {
        #[command(flatten)]
        location: Location,
    },
    /// Show settings, or change one key.
    Config {
        key: Option<String>,
        value: Option<String>,
    },
}
#[derive(Subcommand)]
pub enum CacheCommand {
    Stats {
        #[arg(default_value = ".")]
        dir: PathBuf,
    },
    Clear {
        #[arg(default_value = ".")]
        dir: PathBuf,
        #[arg(long)]
        yes: bool,
    },
}
#[derive(Subcommand)]
pub enum ModelCommand {
    Install {
        #[arg(value_enum, default_value = "code")]
        profile: Profile,
        /// Install already-built artifacts from a local folder.
        #[arg(long)]
        from: Option<PathBuf>,
    },
    List,
}
