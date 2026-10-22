//! Install the bundled skill independently for each detected host.
use anyhow::Context;
use serde::Serialize;
use std::{
    io::Write,
    path::{Path, PathBuf},
};
const SOURCE: &str = include_str!("../../../skills/ixos/SKILL.md");
const OWNER: &str = ".ixos-owned-skill";
#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Installed,
    Current,
    Linked,
    Preserved,
    Failed,
}
#[derive(Debug, Serialize)]
pub struct Target {
    pub path: PathBuf,
    pub status: Status,
    pub installed_sha256: Option<String>,
    pub detail: Option<String>,
}
#[derive(Debug, Serialize)]
pub struct Report {
    pub bundled_version: &'static str,
    pub bundled_sha256: String,
    pub targets: Vec<Target>,
}
impl Report {
    pub fn needs_attention(&self) -> bool {
        self.targets
            .iter()
            .any(|t| matches!(t.status, Status::Preserved | Status::Failed))
    }
    pub fn print(&self) {
        println!(
            "Ixos skill {} ({})",
            self.bundled_version, self.bundled_sha256
        );
        for t in &self.targets {
            println!(
                "  {:?}: {}{}",
                t.status,
                t.path.display(),
                t.detail
                    .as_ref()
                    .map(|s| format!(" — {s}"))
                    .unwrap_or_default()
            );
        }
    }
}
fn linked(path: &Path) -> bool {
    std::fs::symlink_metadata(path).is_ok_and(|meta| {
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            meta.file_attributes() & 0x400 != 0
        }
        #[cfg(not(windows))]
        {
            meta.file_type().is_symlink()
        }
    })
}
fn write_atomic(path: &Path, bytes: &[u8]) -> anyhow::Result<()> {
    let mut file = tempfile::NamedTempFile::new_in(path.parent().unwrap())?;
    file.write_all(bytes)?;
    file.as_file().sync_all()?;
    file.persist(path).map_err(|error| error.error)?;
    Ok(())
}
fn install_at(directory: &Path) -> anyhow::Result<Status> {
    let path = directory.join("SKILL.md");
    let receipt = directory.join(OWNER);
    // Junctions, directory links and file links are host/user managed. Never
    // overwrite their targets, even when an old ownership receipt is present.
    if linked(directory) || linked(&path) || linked(&receipt) {
        return Ok(
            if std::fs::read(&path).is_ok_and(|b| b == SOURCE.as_bytes()) {
                Status::Linked
            } else {
                Status::Preserved
            },
        );
    }
    if path.exists() {
        let current = std::fs::read(&path)?;
        if current == SOURCE.as_bytes() {
            return Ok(Status::Current);
        }
        let previous = std::fs::read_to_string(&receipt).unwrap_or_default();
        if previous.trim() != hex(&ixos_core::digest::sha256(&current)) {
            return Ok(Status::Preserved);
        }
    }
    std::fs::create_dir_all(directory)?;
    write_atomic(&path, SOURCE.as_bytes())?;
    write_atomic(
        &receipt,
        hex(&ixos_core::digest::sha256(SOURCE.as_bytes())).as_bytes(),
    )?;
    Ok(Status::Installed)
}
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
fn install_targets(targets: Vec<PathBuf>) -> Report {
    let targets = targets
        .into_iter()
        .map(|path| {
            let (status, detail) = match install_at(&path) {
                Ok(Status::Preserved) => (
                    Status::Preserved,
                    Some(
                        "User-managed or edited skill preserved; update this target manually"
                            .into(),
                    ),
                ),
                Ok(status) => (status, None),
                Err(error) => (Status::Failed, Some(format!("{error:#}"))),
            };
            let installed_sha256 = std::fs::read(path.join("SKILL.md"))
                .ok()
                .map(|b| hex(&ixos_core::digest::sha256(&b)));
            Target {
                path,
                status,
                installed_sha256,
                detail,
            }
        })
        .collect();
    Report {
        bundled_version: env!("CARGO_PKG_VERSION"),
        bundled_sha256: hex(&ixos_core::digest::sha256(SOURCE.as_bytes())),
        targets,
    }
}
fn targets(home: &Path) -> Vec<PathBuf> {
    let mut targets = vec![home.join(".agents/skills/ixos")];
    for host in [".codex", ".claude"] {
        if home.join(host).is_dir() {
            targets.push(home.join(host).join("skills/ixos"));
        }
    }
    targets
}
#[cfg(test)]
fn install(home: &Path) -> Report {
    install_targets(targets(home))
}
pub fn ensure() -> anyhow::Result<Report> {
    let home = std::env::var_os("IXOS_SKILL_HOME")
        .map(PathBuf::from)
        .or_else(dirs::home_dir)
        .context("No user home for Ixos skill installation")?;
    let mut paths = targets(&home);
    if std::env::var_os("IXOS_SKILL_HOME").is_none() {
        if let Some(codex) = std::env::var_os("CODEX_HOME")
            .map(PathBuf::from)
            .filter(|p| p.is_absolute() && p.is_dir())
        {
            let path = codex.join("skills/ixos");
            if !paths.contains(&path) {
                paths.push(path);
            }
        }
    }
    Ok(install_targets(paths))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn installs_detected_hosts_idempotently_and_preserves_edited_skills() {
        let home = tempfile::tempdir().unwrap();
        std::fs::create_dir(home.path().join(".claude")).unwrap();
        std::fs::create_dir(home.path().join(".codex")).unwrap();
        let report = install(home.path());
        assert_eq!(report.targets.len(), 3);
        assert!(!report.needs_attention());
        let targets: Vec<_> = report.targets.into_iter().map(|t| t.path).collect();
        assert!(!install(home.path()).needs_attention());
        let p = targets[0].join("SKILL.md");
        std::fs::write(&p, "user changes").unwrap();
        assert!(install(home.path()).needs_attention());
        assert_eq!(std::fs::read_to_string(p).unwrap(), "user changes");
        std::fs::remove_file(targets[2].join("SKILL.md")).unwrap();
        let report = install(home.path());
        assert!(matches!(report.targets[0].status, Status::Preserved));
        assert!(matches!(report.targets[2].status, Status::Installed));
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
        assert!(!install(home.path()).needs_attention());
        assert_eq!(std::fs::read_to_string(d.join("SKILL.md")).unwrap(), SOURCE);
    }
    #[test]
    fn refuses_unowned_content_and_file_destinations() {
        let home = tempfile::tempdir().unwrap();
        let d = home.path().join(".agents/skills/ixos");
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(d.join("SKILL.md"), "another skill").unwrap();
        assert!(install(home.path()).needs_attention());
        assert!(!d.join(OWNER).exists());
        std::fs::remove_file(d.join("SKILL.md")).unwrap();
        std::fs::remove_dir(&d).unwrap();
        std::fs::write(&d, "user file").unwrap();
        assert!(install(home.path()).needs_attention());
        assert_eq!(std::fs::read_to_string(d).unwrap(), "user file");
    }
}

#[cfg(test)]
mod links {
    use super::*;
    #[test]
    fn linked_targets_are_reported_and_never_overwritten() {
        let temp = tempfile::tempdir().unwrap();
        let actual = temp.path().join("actual");
        let link = temp.path().join("link");
        std::fs::create_dir(&actual).unwrap();
        std::fs::write(actual.join("SKILL.md"), SOURCE).unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(&actual, &link).unwrap();
        #[cfg(windows)]
        {
            // Junctions require no developer-mode or administrator privileges.
            let status = std::process::Command::new("cmd")
                .args(["/c", "mklink", "/J"])
                .arg(&link)
                .arg(&actual)
                .output()
                .unwrap();
            assert!(status.status.success());
        }
        let report = install_targets(vec![link.clone()]);
        assert!(matches!(report.targets[0].status, Status::Linked));
        std::fs::write(actual.join("SKILL.md"), "user version").unwrap();
        assert!(matches!(
            install_targets(vec![link]).targets[0].status,
            Status::Preserved
        ));
        assert_eq!(
            std::fs::read_to_string(actual.join("SKILL.md")).unwrap(),
            "user version"
        );
    }
}
