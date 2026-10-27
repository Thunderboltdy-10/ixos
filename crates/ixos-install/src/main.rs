use clap::Parser;
use ixos_runtime::releases;

#[derive(Parser)]
#[command(about = "Install the shared Ixos CLI, MCP and skill, with the desktop app by default")]
struct Args {
    #[arg(long)]
    no_desktop: bool,
}
fn main() {
    if let Err(error) = install(Args::parse()) {
        eprintln!("Ixos installation incomplete: {error:#}\nFix the reported problem and run this installer again.");
        std::process::exit(1);
    }
}
fn install(args: Args) -> anyhow::Result<()> {
    let engine = releases::latest("engine")?;
    // Preflight both manifests before changing an existing installation.
    let desktop = if args.no_desktop {
        None
    } else {
        let release = releases::latest("desktop")?;
        release.manifest()?.asset()?;
        Some(release)
    };
    releases::install_engine(&engine)?;
    releases::add_to_path()?;
    if let Some(desktop) = desktop {
        releases::install_desktop(&desktop)?;
    }
    println!("Ixos is ready. Open a new terminal to use ixos. Register MCP with your agent using the README commands.");
    Ok(())
}
