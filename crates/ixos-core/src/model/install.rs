//! Install the two attributed model derivatives, checking every runtime file.
use crate::{config::Profile, digest::sha256_file};
use anyhow::Context;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;

pub struct ModelSpec {
    pub profile: Profile,
    pub repository: &'static str,
    pub revision: &'static str,
    pub hashes: [&'static str; 3],
}
pub const FILES: [&str; 3] = ["model.safetensors", "tokenizer.json", "config.json"];
// Immutable Hugging Face revisions; runtime bytes are verified independently.
pub const MODELS: [ModelSpec; 2] = [
    ModelSpec {
        profile: Profile::Code,
        repository: "Thunderboltdy10/ixos-code",
        revision: "dfc6e3a26c732efcd3b5f623d9497a16eae9d23a",
        hashes: [
            "75cf7a6c2171b230ad19b1e7d8e0b1aee86da5a02af8e7cacedd9921d227623c",
            "936b2d026b9e81fb683eab537ea37c5a1a65a4d02ad9cb92ce269fb8bc561ebf",
            "148e5691a6fcc553437156859701fba017a1ba5d340b170f17e0f3668fb861a7",
        ],
    },
    ModelSpec {
        profile: Profile::Documents,
        repository: "Thunderboltdy10/ixos-documents",
        revision: "179b9c586ca8744d3a73dbfd82b9b5ed357748f4",
        hashes: [
            "f3a9a9297a228914ca7cd0dc9601616ccb81a198676172ff6ff52658f5251ee2",
            "7d75cbc54318138807c401b0f0c9721117c628b39de8e8e0edb6cb17e0ee7d18",
            "63c00d90824c832c04ec1d02b6a983fb90489bf049f29fbff15ba481b8a432ee",
        ],
    },
];
pub fn verify(path: &Path, profile: Profile) -> anyhow::Result<()> {
    let spec = MODELS.iter().find(|s| s.profile == profile).unwrap();
    for (name, hash) in FILES.iter().zip(spec.hashes) {
        anyhow::ensure!(
            hex::encode(sha256_file(&path.join(name))?) == hash,
            "Model checksum mismatch: {name}"
        );
    }
    super::Model::load(path)?;
    Ok(())
}
pub fn install(
    profile: Profile,
    directory: &Path,
    source: Option<&Path>,
) -> anyhow::Result<PathBuf> {
    std::fs::create_dir_all(directory)?;
    // CLI and desktop share storage. Serialize installation across processes so
    // neither can observe or replace another installer's partial download.
    let lock = std::fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(directory.join(format!(".{}.lock", profile.name())))?;
    lock.lock()?;
    let target = directory.join(profile.name());
    if target.exists() && verify(&target, profile).is_ok() {
        return Ok(target);
    }
    let work = tempfile::tempdir_in(directory)?;
    let spec = MODELS.iter().find(|s| s.profile == profile).unwrap();
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(20))
        .timeout_read(Duration::from_secs(60))
        .timeout(Duration::from_secs(300))
        .build();
    for name in FILES {
        let path = work.path().join(name);
        if let Some(source) = source {
            std::fs::copy(source.join(name), path)?;
        } else {
            let url = format!(
                "https://huggingface.co/{}/resolve/{}/{name}",
                spec.repository, spec.revision
            );
            let response = agent.get(&url).call().with_context(|| {
                format!("Cannot download the {} model ({name}). Check your connection and retry, or use `ixos model install {} --from PATH`", profile.name(), profile.name())
            })?;
            let maximum = 256 * 1024 * 1024;
            let mut input = response.into_reader().take(maximum + 1);
            let copied = std::io::copy(&mut input, &mut std::fs::File::create(path)?)?;
            anyhow::ensure!(
                copied <= maximum,
                "Model download exceeds size limit: {name}"
            );
        }
    }
    verify(work.path(), profile)?;
    // A changed pinned revision or interrupted/corrupt old model can be repaired.
    // Keep the old directory until every new byte has passed verification.
    let previous = tempfile::tempdir_in(directory)?;
    let backup = previous.path().join("model");
    if target.exists() {
        std::fs::rename(&target, &backup)?;
    }
    if let Err(error) = std::fs::rename(work.path(), &target) {
        if backup.exists() {
            let _ = std::fs::rename(&backup, &target);
        }
        return Err(error.into());
    }
    Ok(target)
}

/// Install a missing managed model on first use. Explicit paths remain local
/// overrides: a typo must never silently download a different model there.
pub fn ensure(config: &crate::config::Config, profile: Profile, path: &Path) -> anyhow::Result<()> {
    if path == config.model_dir.join(profile.name()) && !path.exists() {
        eprintln!(
            "Downloading the {} model from Hugging Face…",
            profile.name()
        );
        install(profile, &config.model_dir, None)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_local_artifacts_are_never_installed() {
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("source");
        let destination = root.path().join("installed");
        std::fs::create_dir(&source).unwrap();
        for name in FILES {
            std::fs::write(source.join(name), b"invalid").unwrap();
        }
        let error = install(Profile::Code, &destination, Some(&source)).unwrap_err();
        assert!(error.to_string().contains("checksum mismatch"));
        assert!(!destination.join("code").exists());
        // No partial downloads remain; only the reusable lock file survives.
        assert_eq!(std::fs::read_dir(destination).unwrap().count(), 1);
    }

    #[test]
    fn failed_install_preserves_existing_artifacts() {
        let root = tempfile::tempdir().unwrap();
        let target = root.path().join("code");
        std::fs::create_dir(&target).unwrap();
        std::fs::write(target.join("model.safetensors"), b"existing").unwrap();
        assert!(install(Profile::Code, root.path(), Some(root.path())).is_err());
        assert_eq!(
            std::fs::read(target.join("model.safetensors")).unwrap(),
            b"existing"
        );
    }

    #[test]
    fn explicit_missing_paths_do_not_trigger_downloads() {
        let root = tempfile::tempdir().unwrap();
        let config = crate::config::Config {
            model_dir: root.path().join("managed"),
            ..Default::default()
        };
        let explicit = root.path().join("custom");
        ensure(&config, Profile::Code, &explicit).unwrap();
        assert!(!explicit.exists());
        assert!(!config.model_dir.exists());
    }
}
