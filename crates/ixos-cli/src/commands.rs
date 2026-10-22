use crate::args::*;
use ixos_core::{
    config::Config,
    engine::{Engine, RetrievalMode},
};
use std::io::Write;

pub fn run(cli: Cli) -> anyhow::Result<()> {
    let path = cli.config.unwrap_or_else(Config::path);
    let config = Config::load(&path)?;
    match cli.command {
        Command::Runtime { command } => match command {
            RuntimeCommand::Licenses => println!(
                "{}\n{}\n{}",
                include_str!("../../../LICENSE"),
                include_str!("../../../docs/licenses/model2vec-rs-MIT.txt"),
                include_str!("../../../docs/licenses/evidence-MIT.txt")
            ),
            RuntimeCommand::Info => println!("{}", crate::runtime::info()),
            RuntimeCommand::Serve => crate::runtime::serve(config)?,
        },
        Command::Setup { skip_models } => {
            let report = crate::skill::ensure()?;
            report.print();
            if skip_models {
                anyhow::ensure!(
                    !report.needs_attention(),
                    "Some skill targets need attention; see the per-host report above"
                );
                return Ok(());
            }
            for profile in [
                ixos_core::config::Profile::Code,
                ixos_core::config::Profile::Documents,
            ] {
                eprintln!("Setting up the {} model…", profile.name());
                let destination =
                    ixos_core::model::install::install(profile, &config.model_dir, None)?;
                println!("Installed {} at {}", profile.name(), destination.display());
            }
            anyhow::ensure!(
                !report.needs_attention(),
                "Models are ready; some skill targets need attention in the per-host report above"
            );
        }
        Command::Search(args) => {
            let profile = args.location.profile.unwrap_or(config.profile);
            let mut options = config.options(profile);
            options.mode = args.mode.unwrap_or(RetrievalMode::Hybrid);
            options.limit = args.limit.unwrap_or(options.limit);
            options.context = args.context.unwrap_or(options.context);
            let model = config.model_path(profile, args.location.model_path);
            if options.mode != RetrievalMode::Lexical {
                ixos_core::model::install::ensure(&config, profile, &model)?;
            }
            let mut engine = Engine::new(&args.location.dir, Some(&model), options)?;
            anyhow::ensure!(
                args.evidence != ixos_core::evidence::EvidenceMode::Functions
                    || cfg!(feature = "evidence-functions"),
                "This build has no function evidence support; use passages"
            );
            engine.configure_evidence(args.evidence);
            let (raw, _) = engine.search(&args.query)?;
            output(&raw, args.json)?;
        }
        Command::Grep {
            pattern,
            dir,
            fixed,
            ignore_case,
            context,
            limit,
            json,
        } => {
            let (raw, _) =
                ixos_core::tools::grep(&dir, &pattern, fixed, ignore_case, context, limit, 6000)?;
            output(&raw, json)?;
        }
        Command::Read {
            path,
            dir,
            start,
            lines,
            end,
            expected_source_hash,
            characters,
            character_offset,
            json,
        } => {
            let count = match end {
                Some(end) => end
                    .checked_sub(start)
                    .and_then(|n| n.checked_add(1))
                    .ok_or_else(|| anyhow::anyhow!("End must be at least start"))?,
                None => lines.unwrap_or(40),
            };
            let raw = ixos_core::tools::read_range(
                &dir,
                &path,
                start,
                count,
                characters,
                character_offset,
                6000,
            )?;
            if let Some(expected) = expected_source_hash {
                let v: serde_json::Value = serde_json::from_slice(&raw)?;
                anyhow::ensure!(
                    v["source_hash"].as_str() == Some(expected.as_str()),
                    "Source changed; inspect the current source before reusing coordinates"
                );
            }
            if json {
                std::io::stdout().write_all(&raw)?;
            } else {
                let value: serde_json::Value = serde_json::from_slice(&raw)?;
                let snippet = value.get("snippet").or_else(|| value.get("slice")).unwrap();
                println!("{}", snippet["text"].as_str().unwrap_or(""));
            }
        }
        Command::Mcp { location } => crate::mcp::serve(config, location)?,
        Command::Cache { command } => cache::run(&config, command)?,
        Command::Model { command } => match command {
            ModelCommand::Install { profile, from } => {
                let destination = ixos_core::model::install::install(
                    profile,
                    &config.model_dir,
                    from.as_deref(),
                )?;
                println!("Installed {} at {}", profile.name(), destination.display());
            }
            ModelCommand::List => {
                for profile in [
                    ixos_core::config::Profile::Code,
                    ixos_core::config::Profile::Documents,
                ] {
                    let model = config.model_dir.join(profile.name());
                    println!(
                        "{}: {}",
                        profile.name(),
                        if ixos_core::model::install::verify(&model, profile).is_ok() {
                            model.display().to_string()
                        } else {
                            "not installed".into()
                        }
                    );
                }
            }
        },
        Command::Doctor { location } => doctor::run(&config, location)?,
        Command::Config { key, value } => {
            let mut settings = serde_json::to_value(config)?;
            if let Some(key) = key {
                let slot = settings
                    .get_mut(&key)
                    .ok_or_else(|| anyhow::anyhow!("Unknown setting: {key}"))?;
                if let Some(value) = value {
                    *slot = match slot {
                        serde_json::Value::Bool(_) => serde_json::json!(value.parse::<bool>()?),
                        serde_json::Value::Number(_) | serde_json::Value::Array(_) => {
                            serde_json::from_str(&value)?
                        }
                        _ => serde_json::json!(value),
                    };
                    serde_json::from_value::<Config>(settings)?.save(&path)?;
                } else {
                    println!("{slot}");
                }
            } else {
                println!(
                    "{}",
                    toml::to_string_pretty(&serde_json::from_value::<Config>(settings)?)?
                );
            }
        }
    }
    Ok(())
}
fn output(raw: &[u8], json: bool) -> anyhow::Result<()> {
    if json {
        std::io::stdout().write_all(raw)?;
    } else {
        ixos_core::tools::print_human(raw)?;
    }
    Ok(())
}

mod cache {
    use super::*;
    pub fn run(config: &Config, command: CacheCommand) -> anyhow::Result<()> {
        let (locations, all, clear, yes) = match command {
            CacheCommand::Stats { dir } => (vec![dir], false, false, false),
            CacheCommand::Clear { dir, all, yes } => (
                if all {
                    config.locations.clone()
                } else {
                    vec![dir.unwrap_or_else(|| ".".into())]
                },
                all,
                true,
                yes,
            ),
        };
        let stats = ixos_core::cache::manage(&locations, all, yes)?;
        println!(
            "{}: {} files, {} record bytes, {} native records, {} fallback entries, {} old records",
            if clear {
                if yes {
                    "Removed"
                } else {
                    "Would remove (use --yes)"
                }
            } else {
                "Ixos cache"
            },
            stats.files_with_records,
            stats.record_bytes,
            stats.native_records,
            stats.fallback_entries,
            stats.old_records
        );
        Ok(())
    }
}
mod doctor {
    use super::*;
    pub fn run(config: &Config, location: Location) -> anyhow::Result<()> {
        crate::skill::ensure()?.print();
        let profile = location.profile.unwrap_or(config.profile);
        let path = config.model_path(profile, location.model_path);
        ixos_core::model::install::ensure(config, profile, &path)?;
        let report = ixos_core::doctor::check(config, profile, &path)?;
        println!(
            "Model: {} ({} dimensions)",
            profile.name(),
            report.dimensions
        );
        println!("Cache: writable");
        println!("Search: works");
        Ok(())
    }
}
