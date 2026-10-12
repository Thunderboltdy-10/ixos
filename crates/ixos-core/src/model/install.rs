//! Install the two attributed model derivatives, checking every runtime file.
use crate::{config::Profile, digest::sha256_file};
use std::io::Read;
use std::path::{Path, PathBuf};

pub struct ModelSpec {
    pub profile: Profile,
    pub repository: &'static str,
    pub revision: &'static str,
    pub hashes: [&'static str; 3],
}
pub const FILES: [&str; 3] = ["model.safetensors", "tokenizer.json", "config.json"];
// Pablo will confirm these repository names and immutable published revisions.
pub const MODELS: [ModelSpec; 2] = [
    ModelSpec {
        profile: Profile::Code,
        repository: "PABLO_HF_USER/ixos-code",
        revision: "main",
        hashes: [
            "75cf7a6c2171b230ad19b1e7d8e0b1aee86da5a02af8e7cacedd9921d227623c",
            "936b2d026b9e81fb683eab537ea37c5a1a65a4d02ad9cb92ce269fb8bc561ebf",
            "148e5691a6fcc553437156859701fba017a1ba5d340b170f17e0f3668fb861a7",
        ],
    },
    ModelSpec {
        profile: Profile::Documents,
        repository: "PABLO_HF_USER/ixos-documents",
        revision: "main",
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
    let target = directory.join(profile.name());
    if target.exists() {
        verify(&target, profile)?;
        return Ok(target);
    }
    let work = tempfile::tempdir_in(directory)?;
    let spec = MODELS.iter().find(|s| s.profile == profile).unwrap();
    for name in FILES {
        let path = work.path().join(name);
        if let Some(source) = source {
            std::fs::copy(source.join(name), path)?;
        } else {
            anyhow::ensure!(
                !spec.repository.starts_with("PABLO_HF_USER"),
                "Model repository is awaiting publication; install local artifacts with --from"
            );
            let url = format!(
                "https://huggingface.co/{}/resolve/{}/{name}",
                spec.repository, spec.revision
            );
            let response = ureq::get(&url).call()?;
            let mut input = response.into_reader().take(256 * 1024 * 1024);
            std::io::copy(&mut input, &mut std::fs::File::create(path)?)?;
        }
    }
    verify(work.path(), profile)?;
    std::fs::rename(work.path(), &target)?;
    Ok(target)
}
