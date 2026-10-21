mod agent_view;
mod args;
mod commands;
mod mcp;
mod runtime;
mod skill;
mod source_read;
use clap::Parser;

fn main() {
    let cli = args::Cli::parse();
    if let Err(error) = skill::ensure() {
        eprintln!("Ixos skill setup: {error:#}");
    }
    if let Err(error) = commands::run(cli) {
        eprintln!("{error:#}");
        std::process::exit(1);
    }
}
