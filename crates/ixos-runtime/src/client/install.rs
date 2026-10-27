//! Reuse the shared CLI, or provision it through the same verified binary installer.
use super::*;
use sha2::{Digest, Sha256};
use std::sync::Mutex;
const VERSION: &str = env!("CARGO_PKG_VERSION");
static INSTALL: Mutex<()> = Mutex::new(());
fn executable() -> &'static str {
    if cfg!(windows) {
        "ixos.exe"
    } else {
        "ixos"
    }
}
fn compatible(path: &Path) -> bool {
    Session::start(path).is_ok()
}
fn target() -> anyhow::Result<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => Ok("Windows-X64"),
        ("linux", "x86_64") => Ok("Linux-X64"),
        ("macos", "aarch64") => Ok("macOS-ARM64"),
        ("macos", "x86_64") => Ok("macOS-X64"),
        _ => anyhow::bail!(
            "No prebuilt Ixos runtime for this platform; build ixos-cli and set IXOS_ENGINE_PATH"
        ),
    }
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Manifest {
    protocol_major: u32,
    version: String,
    assets: Vec<Asset>,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Asset {
    target: String,
    file: String,
    sha256: String,
}
fn asset<'a>(manifest: &'a Manifest, platform: &str) -> anyhow::Result<&'a Asset> {
    anyhow::ensure!(
        manifest.protocol_major == PROTOCOL_MAJOR && manifest.version == VERSION,
        "Incompatible runtime release manifest"
    );
    let asset = manifest
        .assets
        .iter()
        .find(|asset| asset.target == platform)
        .context("Runtime release lacks this platform")?;
    let expected = format!("ixos-{platform}{}", if cfg!(windows) { ".exe" } else { "" });
    anyhow::ensure!(
        asset.file == expected
            && asset.sha256.len() == 64
            && asset.sha256.bytes().all(|b| b.is_ascii_hexdigit()),
        "Invalid runtime asset metadata"
    );
    Ok(asset)
}
fn verify(path: &Path, expected: &str) -> anyhow::Result<()> {
    let mut input = std::fs::File::open(path)?;
    let mut hash = Sha256::new();
    std::io::copy(&mut input, &mut hash)?;
    let actual = hash
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    anyhow::ensure!(
        actual.eq_ignore_ascii_case(expected),
        "Runtime SHA256 mismatch; refusing installation"
    );
    Ok(())
}
pub fn ensure_runtime() -> anyhow::Result<PathBuf> {
    let _guard = INSTALL
        .lock()
        .map_err(|_| anyhow::anyhow!("Runtime installer lock poisoned"))?;
    if let Some(path) = std::env::var_os("IXOS_ENGINE_PATH").map(PathBuf::from) {
        anyhow::ensure!(
            compatible(&path),
            "IXOS_ENGINE_PATH does not provide a compatible Ixos runtime: {}",
            path.display()
        );
        return Ok(path);
    }
    let home = crate::config::data_dir().join("runtime").join(VERSION);
    if let Some(source) = std::env::var_os("IXOS_RUNTIME_FROM") {
        return install_offline(&home, Path::new(&source));
    }
    let shared = crate::releases::engine_path();
    if shared.is_file() && compatible(&shared) {
        return Ok(shared);
    }
    if let Some(path) = std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|p| p.join(executable()))
            .find(|p| p.is_file() && compatible(p))
    }) {
        return Ok(path);
    }
    let latest = crate::releases::latest("engine")?;
    let release = if latest.manifest()?.protocol_major == PROTOCOL_MAJOR {
        latest
    } else {
        crate::releases::Release {
            tag_name: format!("engine-v{VERSION}"),
            draft: false,
            prerelease: false,
        }
    };
    crate::releases::install_engine(&release)?;
    crate::releases::add_to_path()?;
    Ok(shared)
}
/// The manifest and asset use the same verification path for online and offline installs.
fn install_asset(
    home: &Path,
    installed: &Path,
    asset: &Asset,
    input: impl Read,
) -> anyhow::Result<()> {
    let mut download = tempfile::Builder::new()
        .prefix("ixos-download-")
        .suffix(if cfg!(windows) { ".exe" } else { "" })
        .tempfile_in(home)?;
    let count = std::io::copy(&mut input.take(256 * 1024 * 1024 + 1), &mut download)?;
    anyhow::ensure!(count <= 256 * 1024 * 1024, "Runtime binary exceeds limit");
    download.flush()?;
    verify(download.path(), &asset.sha256)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        download
            .as_file()
            .set_permissions(std::fs::Permissions::from_mode(0o755))?;
    }
    download.as_file().sync_all()?;
    let download = download.into_temp_path();
    drop(Session::start(&download).context("Downloaded runtime fails compatibility handshake")?);
    if let Err(error) = download.persist(installed) {
        // Another desktop process may have completed the same atomic install.
        anyhow::ensure!(compatible(installed), "Installing runtime: {}", error.error);
    }
    Ok(())
}
fn install_offline(home: &Path, source: &Path) -> anyhow::Result<PathBuf> {
    std::fs::create_dir_all(home)?;
    let mut bytes = Vec::new();
    std::fs::File::open(source.join("runtime-manifest.json"))?
        .take(512 * 1024 + 1)
        .read_to_end(&mut bytes)?;
    anyhow::ensure!(bytes.len() <= 512 * 1024, "Runtime manifest exceeds limit");
    let manifest: Manifest = serde_json::from_slice(&bytes)?;
    let asset = asset(&manifest, target()?)?;
    let installed = home.join(executable());
    install_asset(
        home,
        &installed,
        asset,
        std::fs::File::open(source.join(&asset.file))?,
    )?;
    Ok(installed)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn verifies_exact_download_bytes_before_execution() {
        let file = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(file.path(), b"verified runtime").unwrap();
        let hash = Sha256::digest(b"verified runtime")
            .iter()
            .map(|b| format!("{b:02X}"))
            .collect::<String>();
        verify(file.path(), &hash).unwrap();
        std::fs::write(file.path(), b"altered runtime").unwrap();
        assert!(verify(file.path(), &hash).is_err());
    }
    #[test]
    fn manifest_is_versioned_and_asset_names_cannot_escape_destination() {
        let platform = target().unwrap();
        let expected = format!("ixos-{platform}{}", if cfg!(windows) { ".exe" } else { "" });
        let mut manifest = Manifest {
            protocol_major: PROTOCOL_MAJOR,
            version: VERSION.into(),
            assets: vec![Asset {
                target: platform.into(),
                file: expected,
                sha256: "ab".repeat(32),
            }],
        };
        assert!(asset(&manifest, platform).is_ok());
        manifest.assets[0].file = "../other.exe".into();
        assert!(asset(&manifest, platform).is_err());
        manifest.protocol_major += 1;
        assert!(asset(&manifest, platform).is_err());
    }
    #[test]
    fn offline_install_is_verified_atomic_repeatable_and_recovers_after_corruption() {
        let (_worker_dir, worker) = super::super::tests::fixture();
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("source");
        let home = root.path().join("managed");
        std::fs::create_dir(&source).unwrap();
        let platform = target().unwrap();
        let file = format!("ixos-{platform}{}", if cfg!(windows) { ".exe" } else { "" });
        let bytes = std::fs::read(worker).unwrap();
        let hash = Sha256::digest(&bytes)
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>();
        let manifest = json!({"protocol_major":PROTOCOL_MAJOR,"version":VERSION,"assets":[{"target":platform,"file":file,"sha256":hash}]});
        std::fs::write(
            source.join("runtime-manifest.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();
        std::fs::write(source.join(&file), b"corrupt").unwrap();
        assert!(install_offline(&home, &source).is_err());
        assert!(!home.join(executable()).exists());
        std::fs::write(source.join(&file), &bytes).unwrap();
        let installed = install_offline(&home, &source).unwrap();
        assert!(compatible(&installed));
        let homes: Vec<_> = (0..3)
            .map(|_| {
                let home = home.clone();
                let source = source.clone();
                std::thread::spawn(move || install_offline(&home, &source).unwrap())
            })
            .collect();
        for thread in homes {
            assert_eq!(thread.join().unwrap(), installed);
        }
        assert_eq!(std::fs::read(&installed).unwrap(), bytes);
        std::fs::write(source.join(&file), b"corrupt again").unwrap();
        assert!(install_offline(&home, &source).is_err());
        assert_eq!(std::fs::read(&installed).unwrap(), bytes);
        assert_eq!(std::fs::read_dir(&home).unwrap().count(), 1);
    }
}
