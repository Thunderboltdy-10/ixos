//! Install the bundled canonical skill without overwriting user-authored content.
use anyhow::Context;
use std::{
    io::Write,
    path::{Path, PathBuf},
};
const SOURCE: &str = include_str!("../../../skills/ixos/SKILL.md");
const OWNER: &str = ".ixos-owned-skill";

fn write_atomic(path: &Path, bytes: &[u8]) -> anyhow::Result<()> {
    let mut file = tempfile::NamedTempFile::new_in(path.parent().unwrap())?;
    file.write_all(bytes)?;
    file.as_file().sync_all()?;
    file.persist(path).map_err(|error| error.error)?;
    Ok(())
}
fn install_at(directory: &Path) -> anyhow::Result<()> {
    if let Ok(meta) = std::fs::symlink_metadata(directory) {
        // Host-native linked skills are user-managed. Accept an exact canonical
        // copy through the link, but never follow it to overwrite its target.
        if meta.file_type().is_symlink() {
            anyhow::ensure!(
                std::fs::read(directory.join("SKILL.md"))? == SOURCE.as_bytes(),
                "Preserving a linked skill with different contents at {}",
                directory.display()
            );
            return Ok(());
        }
        anyhow::ensure!(
            !meta.file_type().is_symlink() && meta.is_dir(),
            "Skill destination is not an ordinary directory: {}",
            directory.display()
        );
    }
    std::fs::create_dir_all(directory)?;
    let path = directory.join("SKILL.md");
    let receipt = directory.join(OWNER);
    let desired = ixos_core::digest::sha256(SOURCE.as_bytes());
    if path.exists() {
        anyhow::ensure!(
            !std::fs::symlink_metadata(&path)?.file_type().is_symlink(),
            "Skill file is a symlink: {}",
            path.display()
        );
        let current = std::fs::read(&path)?;
        if current == SOURCE.as_bytes() {
            return Ok(());
        }
        let previous = std::fs::read_to_string(&receipt).unwrap_or_default();
        anyhow::ensure!(previous.trim()==hex(&ixos_core::digest::sha256(&current)), "Preserving an existing or edited skill at {}; install this version manually or choose another skill home",path.display());
    }
    write_atomic(&path, SOURCE.as_bytes())?;
    write_atomic(&receipt, hex(&desired).as_bytes())?;
    Ok(())
}
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
pub fn install(home: &Path) -> anyhow::Result<Vec<PathBuf>> {
    // The shared Agent Skills location is supported by Codex and other hosts.
    let mut targets = vec![home.join(".agents/skills/ixos")];
    if home.join(".codex").is_dir() {
        targets.push(home.join(".codex/skills/ixos"));
    }
    if home.join(".claude").is_dir() {
        targets.push(home.join(".claude/skills/ixos"));
    }
    for target in &targets {
        install_at(target)
            .with_context(|| format!("Installing Ixos skill in {}", target.display()))?;
    }
    Ok(targets)
}
pub fn ensure() -> anyhow::Result<Vec<PathBuf>> {
    let home = std::env::var_os("IXOS_SKILL_HOME")
        .map(PathBuf::from)
        .or_else(dirs::home_dir)
        .context("No user home for Ixos skill installation")?;
    let mut targets = install(&home)?;
    if std::env::var_os("IXOS_SKILL_HOME").is_none() {
        if let Some(codex) = std::env::var_os("CODEX_HOME")
            .map(PathBuf::from)
            .filter(|path| path.is_absolute() && path.is_dir() && path != &home.join(".codex"))
        {
            let target = codex.join("skills/ixos");
            install_at(&target)?;
            targets.push(target);
        }
    }
    Ok(targets)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn installs_detected_hosts_idempotently_and_preserves_edited_skills() {
        let home = tempfile::tempdir().unwrap();
        std::fs::create_dir(home.path().join(".claude")).unwrap();
        std::fs::create_dir(home.path().join(".codex")).unwrap();
        let targets = install(home.path()).unwrap();
        assert_eq!(targets.len(), 3);
        install(home.path()).unwrap();
        let p = targets[0].join("SKILL.md");
        std::fs::write(&p, "user changes").unwrap();
        assert!(install(home.path()).is_err());
        assert_eq!(std::fs::read_to_string(p).unwrap(), "user changes");
    }
    #[test]
    fn updates_only_a_previously_owned_unmodified_skill() {
        let home = tempfile::tempdir().unwrap();
        let d = home.path().join(".agents/skills/ixos");
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(d.join("SKILL.md"), "previous Ixos skill").unwrap();
        std::fs::write(
            d.join(OWNER),
            hex(&ixos_core::digest::sha256(b"previous Ixos skill")),
        )
        .unwrap();
        install(home.path()).unwrap();
        assert_eq!(std::fs::read_to_string(d.join("SKILL.md")).unwrap(), SOURCE);
    }
    #[test]
    fn refuses_unowned_content_and_file_destinations() {
        let home = tempfile::tempdir().unwrap();
        let d = home.path().join(".agents/skills/ixos");
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(d.join("SKILL.md"), "another skill").unwrap();
        assert!(install(home.path()).is_err());
        assert!(!d.join(OWNER).exists());
        std::fs::remove_file(d.join("SKILL.md")).unwrap();
        std::fs::remove_dir(&d).unwrap();
        std::fs::write(&d, "user file").unwrap();
        assert!(install(home.path()).is_err());
        assert_eq!(std::fs::read_to_string(d).unwrap(), "user file");
    }
}
