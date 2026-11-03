//! The native installer and portable app use the same local setup, without downloads.
use anyhow::Context;
use std::path::{Path, PathBuf};

pub fn provision() -> anyhow::Result<()> {
    let source = std::env::current_exe()?;
    let destination = ixos_runtime::releases::engine_path();
    std::fs::create_dir_all(destination.parent().unwrap())?;
    let same = source.canonicalize()? == destination.canonicalize().unwrap_or_default()
        || (destination.is_file()
            && ixos_core::digest::sha256(&std::fs::read(&source)?)
                == ixos_core::digest::sha256(&std::fs::read(&destination)?));
    if !same {
        let mut file = tempfile::NamedTempFile::new_in(destination.parent().unwrap())?;
        std::io::copy(&mut std::fs::File::open(&source)?, &mut file)?;
        std::fs::set_permissions(file.path(), std::fs::metadata(&source)?.permissions())?;
        let backup = destination.with_extension("previous");
        if backup.exists() {
            std::fs::remove_file(&backup).context("Restart running Ixos clients and try again")?;
        }
        if destination.exists() {
            std::fs::rename(&destination, &backup)?;
        }
        if let Err(error) = file.persist(&destination) {
            if backup.exists() {
                let _ = std::fs::rename(&backup, &destination);
            }
            return Err(error.error.into());
        }
        let _ = std::fs::remove_file(backup);
    }
    let home = std::env::var_os("IXOS_SKILL_HOME")
        .map(PathBuf::from)
        .or_else(dirs::home_dir)
        .context("No user home")?;
    let codex = if std::env::var_os("IXOS_SKILL_HOME").is_some() {
        home.join(".codex")
    } else {
        std::env::var_os("CODEX_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| home.join(".codex"))
    };
    register(&home, &codex, &destination)?;
    ixos_runtime::releases::add_to_path()?;
    Ok(())
}

fn save(path: &Path, bytes: &[u8]) -> anyhow::Result<()> {
    std::fs::create_dir_all(path.parent().unwrap())?;
    // Keep symlinked configuration in its original location.
    let path = path.canonicalize().unwrap_or_else(|_| path.to_owned());
    let mut file = tempfile::NamedTempFile::new_in(path.parent().unwrap())?;
    use std::io::Write;
    file.write_all(bytes)?;
    file.as_file().sync_all()?;
    file.persist(path)?;
    Ok(())
}

fn register(home: &Path, codex: &Path, executable: &Path) -> anyhow::Result<()> {
    let path = codex.join("config.toml");
    let existing = match std::fs::read_to_string(&path) {
        Ok(text) => text,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(e) => return Err(e.into()),
    };
    let mut config: toml_edit::DocumentMut = existing
        .parse()
        .context("Invalid Codex config.toml; existing file preserved")?;
    if config.get("mcp_servers").is_none() {
        config["mcp_servers"] = toml_edit::Item::Table(toml_edit::Table::new());
    }
    if let Some(table) = config
        .get("mcp_servers")
        .and_then(toml_edit::Item::as_inline_table)
        .cloned()
    {
        config["mcp_servers"] = toml_edit::Item::Table(table.into_table());
    }
    anyhow::ensure!(
        config.get("mcp_servers").is_none_or(|item| item.is_table()),
        "Invalid Codex MCP table; existing file preserved"
    );
    let mut entry = toml_edit::Table::new();
    entry["command"] = toml_edit::value(executable.to_string_lossy().as_ref());
    let mut args = toml_edit::Array::new();
    args.push("mcp");
    entry["args"] = toml_edit::value(args);
    config["mcp_servers"]["ixos"] = toml_edit::Item::Table(entry);

    let claude_path = home.join(".claude.json");
    let mut claude: serde_json::Value = match std::fs::read(&claude_path) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .context("Invalid .claude.json; existing file preserved")?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => serde_json::json!({}),
        Err(e) => return Err(e.into()),
    };
    anyhow::ensure!(
        claude.is_object() && claude.get("mcpServers").is_none_or(|v| v.is_object()),
        "Invalid Claude MCP configuration; existing file preserved"
    );
    claude["mcpServers"]["ixos"] =
        serde_json::json!({"type":"stdio","command":executable,"args":["mcp"]});
    save(&path, config.to_string().as_bytes())?;
    save(&claude_path, &serde_json::to_vec_pretty(&claude)?)?;
    std::fs::create_dir_all(home.join(".claude/skills"))?;
    std::fs::create_dir_all(codex.join("skills"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn new_and_inline_agent_configs_can_be_installed_repeatedly() {
        for initial in ["", "mcp_servers = { other = { command = 'other' } }\n"] {
            let home = tempfile::tempdir().unwrap();
            let codex = home.path().join(".codex");
            std::fs::create_dir(&codex).unwrap();
            std::fs::write(codex.join("config.toml"), initial).unwrap();
            for _ in 0..2 {
                register(home.path(), &codex, Path::new("/installed/ixos")).unwrap();
            }
            let config: toml::Value =
                toml::from_str(&std::fs::read_to_string(codex.join("config.toml")).unwrap())
                    .unwrap();
            assert_eq!(
                config["mcp_servers"]["ixos"]["args"][0].as_str(),
                Some("mcp")
            );
            if !initial.is_empty() {
                assert_eq!(
                    config["mcp_servers"]["other"]["command"].as_str(),
                    Some("other")
                );
            }
        }
    }
    #[test]
    fn setup_preserves_other_servers_comments_and_claude_settings_and_is_repeatable() {
        let home = tempfile::tempdir().unwrap();
        let codex = home.path().join(".codex");
        std::fs::create_dir(&codex).unwrap();
        std::fs::write(
            codex.join("config.toml"),
            "# keep me\nmodel = 'example'\n[mcp_servers.other]\ncommand = 'other'\n",
        )
        .unwrap();
        std::fs::write(
            home.path().join(".claude.json"),
            r#"{"theme":"dark","mcpServers":{"other":{"command":"other"}}}"#,
        )
        .unwrap();
        let executable = home.path().join("bin with spaces/ixos");
        register(home.path(), &codex, &executable).unwrap();
        let first = std::fs::read(codex.join("config.toml")).unwrap();
        register(home.path(), &codex, &executable).unwrap();
        assert_eq!(first, std::fs::read(codex.join("config.toml")).unwrap());
        let text = String::from_utf8(first).unwrap();
        assert!(text.contains("# keep me"));
        let config: toml::Value = toml::from_str(&text).unwrap();
        assert_eq!(
            config["mcp_servers"]["other"]["command"].as_str(),
            Some("other")
        );
        assert_eq!(
            config["mcp_servers"]["ixos"]["command"].as_str(),
            executable.to_str()
        );
        let config: serde_json::Value =
            serde_json::from_slice(&std::fs::read(home.path().join(".claude.json")).unwrap())
                .unwrap();
        assert_eq!(config["theme"], "dark");
        assert_eq!(config["mcpServers"]["other"]["command"], "other");
    }
    #[test]
    fn invalid_configuration_is_not_overwritten() {
        let home = tempfile::tempdir().unwrap();
        std::fs::write(home.path().join("config.toml"), "broken = [").unwrap();
        assert!(register(home.path(), home.path(), Path::new("ixos")).is_err());
        assert_eq!(
            std::fs::read_to_string(home.path().join("config.toml")).unwrap(),
            "broken = ["
        );
    }
}
