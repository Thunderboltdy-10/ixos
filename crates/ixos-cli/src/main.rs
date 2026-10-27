mod agent_view;
mod args;
mod commands;
mod mcp;
mod runtime;
mod skill;
mod source_read;
mod updates;
use clap::Parser;

fn main() {
    let cli = args::Cli::parse();
    if !matches!(
        cli.command,
        args::Command::Runtime { .. } | args::Command::Update { .. } | args::Command::Setup { .. }
    ) {
        updates::suggest();
    }
    match skill::ensure() {
        Ok(report) if report.needs_attention() => {
            for target in report.targets.iter().filter(|t| t.detail.is_some()) {
                eprintln!(
                    "Ixos skill {:?} at {}: {}",
                    target.status,
                    target.path.display(),
                    target.detail.as_deref().unwrap()
                );
            }
        }
        Err(error) => eprintln!("Ixos skill setup: {error:#}"),
        _ => {}
    }
    if let Err(error) = commands::run(cli) {
        eprintln!("{error:#}");
        std::process::exit(1);
    }
}
