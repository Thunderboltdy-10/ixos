use crate::args::*;
use ixos_core::{
    config::Config,
    retrieval::{self, Engine, RetrievalMode},
};
use std::io::Write;

pub fn run(cli: Cli) -> anyhow::Result<()> {
    let path = cli.config.unwrap_or_else(Config::path);
    let config = Config::load(&path)?;
    match cli.command {
        Command::Search(args) => {
            let profile = args.location.profile.unwrap_or(config.profile);
            let mut options = config.options(profile);
            options.mode = args.mode.unwrap_or(RetrievalMode::Hybrid);
            options.limit = args.limit.unwrap_or(options.limit);
            options.context = args.context.unwrap_or(options.context);
            options.typo_correction = args.typo_correction;
            options.evidence_policy = args.evidence_policy;
            let model = config.model_path(profile, args.location.model_path);
            let mut engine = Engine::new(&args.location.dir, Some(&model), options)?;
            let (raw, _) = engine.search(&args.query, "search", None)?;
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
            let (raw, _) = retrieval::commands::grep(
                &dir,
                &pattern,
                fixed,
                ignore_case,
                context,
                limit,
                6000,
            )?;
            output(&raw, json)?;
        }
        Command::Read {
            path,
            dir,
            start,
            lines,
            characters,
            character_offset,
            json,
        } => {
            let raw = retrieval::commands::read_range(
                &dir,
                &path,
                start,
                lines,
                characters,
                character_offset,
                6000,
            )?;
            if json {
                std::io::stdout().write_all(&raw)?;
            } else {
                let value: serde_json::Value = serde_json::from_slice(&raw)?;
                let snippet = value.get("view").or_else(|| value.get("slice")).unwrap();
                println!("{}", snippet["text"].as_str().unwrap_or(""));
            }
        }
        Command::Serve { location, session } => {
            let profile = location.profile.unwrap_or(config.profile);
            let mut options = config.options(profile);
            options.session = session;
            let model = config.model_path(profile, location.model_path);
            retrieval::commands::serve(&location.dir, Some(&model), options)?;
        }
        Command::Cache { command } => cache::run(command)?,
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
                        if model.join("model.safetensors").is_file() {
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
                        serde_json::Value::Number(_) => serde_json::from_str(&value)?,
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
        retrieval::commands::print_human(raw)?;
    }
    Ok(())
}

mod cache {
    use super::*;
    pub fn run(command: CacheCommand) -> anyhow::Result<()> {
        let (dir, clear, yes) = match command {
            CacheCommand::Stats { dir } => (dir, false, false),
            CacheCommand::Clear { dir, yes } => (dir, true, yes),
        };
        let root = dir.canonicalize()?;
        anyhow::ensure!(root.is_dir(), "Location must be a directory");
        let mut cache = retrieval::cache::DocumentCache::new([0; 32]);
        let mut records = 0;
        let mut bytes = 0;
        for entry in ixos_core::discover::search_walk(&root, true, true, false, None)
            .build()
            .filter_map(Result::ok)
        {
            if !entry.file_type().is_some_and(|t| t.is_file()) {
                continue;
            }
            let Some(text) =
                ixos_core::extract::extract_text(entry.path(), 16 * 1024 * 1024, 16 * 1024 * 1024)
            else {
                continue;
            };
            let (present, _, size) = cache.inspect(entry.path(), &[0; 32], &text);
            if present {
                records += 1;
                bytes += size;
                if clear && yes {
                    cache.remove(entry.path())?;
                }
            }
        }
        println!(
            "{}: {records} files, {bytes} record bytes",
            if clear {
                if yes {
                    "Removed"
                } else {
                    "Would remove (use --yes)"
                }
            } else {
                "Ixos cache"
            }
        );
        Ok(())
    }
}
mod doctor {
    use super::*;
    pub fn run(config: &Config, location: Location) -> anyhow::Result<()> {
        let profile = location.profile.unwrap_or(config.profile);
        let path = config.model_path(profile, location.model_path);
        let model = ixos_core::model::Model::load(&path)?;
        println!(
            "Model: {} ({} dimensions)",
            profile.name(),
            model.dimensions()
        );
        let cache_dir = dirs::cache_dir()
            .ok_or_else(|| anyhow::anyhow!("No application cache directory"))?
            .join("ixos");
        std::fs::create_dir_all(&cache_dir)?;
        let check = tempfile::NamedTempFile::new_in(cache_dir)?;
        drop(check);
        println!("Cache: writable");
        let folder = tempfile::tempdir()?;
        std::fs::write(folder.path().join("check.txt"), "Ixos search check")?;
        let mut options = config.options(profile);
        options.persist = false;
        let mut engine = Engine::new(folder.path(), Some(&path), options)?;
        let (raw, _) = engine.search("Ixos search check", "doctor", None)?;
        anyhow::ensure!(
            !serde_json::from_slice::<serde_json::Value>(&raw)?["results"]
                .as_array()
                .unwrap()
                .is_empty(),
            "Search check returned no results"
        );
        println!("Search: works");
        Ok(())
    }
}
