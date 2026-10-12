mod args;
mod commands;
use clap::Parser;

fn main() {
    if let Err(error) = commands::run(args::Cli::parse()) {
        eprintln!("{error:#}");
        std::process::exit(1);
    }
}
