//! Published component releases. The CLI, installers and desktop share this contract.
use anyhow::Context;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};

pub const REPO: &str = "Thunderboltdy-10/ixos";
#[cfg(windows)]
#[path = "windows_install.rs"]
mod windows_install;

/// Install into the user's Windows environment, not a packaged terminal's
/// private AppData/registry overlay. This also keeps model setup in the same
/// environment as the desktop which will use it.
pub fn relaunch_installer_if_packaged() -> anyhow::Result<bool> {
    #[cfg(windows)]
    if windows_install::is_packaged()? {
        anyhow::ensure!(std::env::var_os("IXOS_INSTALL_UNVIRTUALIZED").is_none(),
            "Windows still redirects this installation into a packaged app. Run the installer from Windows Terminal outside the packaged app.");
        let executable = std::fs::canonicalize(std::env::current_exe()?)?;
        windows_install::run_outside_package(
            &executable,
            &std::env::args_os().skip(1).collect::<Vec<_>>(),
        )?;
        return Ok(true);
    }
    Ok(false)
}
fn server() -> Option<String> {
    // Local release fixtures are available only in development/test binaries.
    if cfg!(debug_assertions) {
        std::env::var("IXOS_RELEASES_TEST_SERVER")
            .ok()
            .filter(|v| v.starts_with("http://127.0.0.1:"))
    } else {
        None
    }
}
pub fn is_newer(new: &str, old: &str) -> bool {
    semver::Version::parse(new)
        .ok()
        .zip(semver::Version::parse(old).ok())
        .is_some_and(|(new, old)| new > old && new.pre.is_empty())
}
/// Spawn a probe without inheriting agent/MCP output pipes. On Windows even
/// unused inheritable handles can otherwise keep a finished command's pipes open.
pub fn spawn_update_check(executable: &Path) -> anyhow::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::{
            Foundation::CloseHandle,
            System::Threading::{
                CreateProcessW, CREATE_NO_WINDOW, PROCESS_INFORMATION, STARTUPINFOW,
            },
        };
        let application: Vec<u16> = executable
            .as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect();
        let mut args = std::ffi::OsString::from("\"");
        args.push(executable);
        args.push("\" update --check --background");
        let mut args: Vec<u16> = args.encode_wide().chain(Some(0)).collect();
        let mut startup: STARTUPINFOW = unsafe { std::mem::zeroed() };
        startup.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        let mut process: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };
        // All buffers live through the call; bInheritHandles=FALSE deliberately
        // prevents the detached child from holding any of the caller's pipes.
        let success = unsafe {
            CreateProcessW(
                application.as_ptr(),
                args.as_mut_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                0,
                CREATE_NO_WINDOW,
                std::ptr::null(),
                std::ptr::null(),
                &startup,
                &mut process,
            )
        };
        if success == 0 {
            return Err(std::io::Error::last_os_error().into());
        }
        unsafe {
            CloseHandle(process.hThread);
            CloseHandle(process.hProcess);
        }
    }
    #[cfg(not(windows))]
    {
        let mut child = std::process::Command::new(executable)
            .args(["update", "--check", "--background"])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()?;
        std::thread::spawn(move || {
            let _ = child.wait();
        });
    }
    Ok(())
}
pub fn install_dir() -> PathBuf {
    std::env::var_os("IXOS_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().expect("User home directory").join(".ixos"))
}
pub fn engine_path() -> PathBuf {
    install_dir()
        .join("bin")
        .join(if cfg!(windows) { "ixos.exe" } else { "ixos" })
}
pub fn platform() -> anyhow::Result<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => Ok("Windows-X64"),
        ("linux", "x86_64") => Ok("Linux-X64"),
        ("macos", "aarch64") => Ok("macOS-ARM64"),
        ("macos", "x86_64") => Ok("macOS-X64"),
        _ => anyhow::bail!("No release binary for this platform; build from source"),
    }
}
fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .user_agent("ixos-release-check")
        .timeout(Duration::from_secs(30))
        .build()
}
fn json<T: serde::de::DeserializeOwned>(url: &str) -> anyhow::Result<T> {
    let mut bytes = Vec::new();
    agent()
        .get(url)
        .call()?
        .into_reader()
        .take(2 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)?;
    anyhow::ensure!(
        bytes.len() <= 2 * 1024 * 1024,
        "Release metadata exceeds limit"
    );
    Ok(serde_json::from_slice(&bytes)?)
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Release {
    pub tag_name: String,
    pub draft: bool,
    pub prerelease: bool,
}
impl Release {
    pub fn version(&self) -> anyhow::Result<semver::Version> {
        Ok(semver::Version::parse(
            self.tag_name
                .split_once("-v")
                .context("Invalid component tag")?
                .1,
        )?)
    }
    pub fn url(&self, file: &str) -> String {
        if let Some(base) = server() {
            return format!("{base}/download/{}/{file}", self.tag_name);
        }
        format!(
            "https://github.com/{REPO}/releases/download/{}/{file}",
            self.tag_name
        )
    }
    pub fn manifest(&self) -> anyhow::Result<Manifest> {
        let file = if self.tag_name.starts_with("engine-") {
            "runtime-manifest.json"
        } else {
            "desktop-manifest.json"
        };
        let manifest: Manifest = json(&self.url(file))?;
        anyhow::ensure!(
            semver::Version::parse(&manifest.version)? == self.version()?,
            "Release manifest version mismatch"
        );
        Ok(manifest)
    }
}
pub fn select(releases: Vec<Release>, component: &str) -> Option<Release> {
    releases
        .into_iter()
        .filter(|r| !r.draft && !r.prerelease && r.tag_name.starts_with(&format!("{component}-v")))
        .filter(|r| r.version().is_ok_and(|v| v.pre.is_empty()))
        .max_by_key(|r| r.version().ok())
}
pub fn latest(component: &str) -> anyhow::Result<Release> {
    // Pagination matters when one component ships much more frequently than the other.
    let mut releases = Vec::new();
    for page in 1..=10 {
        let base = server().unwrap_or_else(|| format!("https://api.github.com/repos/{REPO}"));
        let batch: Vec<Release> = json(&format!("{base}/releases?per_page=100&page={page}"))?;
        let done = batch.len() < 100;
        releases.extend(batch);
        if done {
            break;
        }
    }
    select(releases, component).context("No published stable component release yet")
}
#[derive(Deserialize)]
pub struct Manifest {
    pub version: String,
    pub protocol_major: u32,
    pub assets: Vec<Asset>,
}
#[derive(Debug, Deserialize)]
pub struct Asset {
    pub target: String,
    pub file: String,
    pub sha256: String,
}
impl Manifest {
    pub fn asset(&self) -> anyhow::Result<&Asset> {
        anyhow::ensure!(
            self.protocol_major == crate::PROTOCOL_MAJOR,
            "Release requires a different engine/desktop protocol; update the components together"
        );
        self.assets
            .iter()
            .find(|a| a.target == platform().unwrap_or(""))
            .context("Release lacks this platform")
    }
}
pub fn download(
    release: &Release,
    asset: &Asset,
    directory: &Path,
) -> anyhow::Result<tempfile::NamedTempFile> {
    anyhow::ensure!(
        !asset.file.is_empty()
            && asset
                .file
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b))
            && !asset.file.contains("..")
            && asset.sha256.len() == 64
            && asset.sha256.bytes().all(|b| b.is_ascii_hexdigit()),
        "Invalid release asset metadata"
    );
    std::fs::create_dir_all(directory)?;
    let suffix = Path::new(&asset.file)
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("");
    let mut file = tempfile::Builder::new()
        .prefix("ixos-download-")
        .suffix(&format!(".{suffix}"))
        .tempfile_in(directory)?;
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(300))
        .build();
    let mut input = agent
        .get(&release.url(&asset.file))
        .call()?
        .into_reader()
        .take(512 * 1024 * 1024 + 1);
    let mut hash = Sha256::new();
    let mut bytes = [0u8; 64 * 1024];
    let mut length = 0;
    loop {
        let n = input.read(&mut bytes)?;
        if n == 0 {
            break;
        }
        length += n;
        anyhow::ensure!(
            length <= 512 * 1024 * 1024,
            "Release download exceeds limit"
        );
        hash.update(&bytes[..n]);
        file.write_all(&bytes[..n])?;
    }
    anyhow::ensure!(
        format!("{:x}", hash.finalize()).eq_ignore_ascii_case(&asset.sha256),
        "Release SHA256 mismatch; refusing installation"
    );
    file.as_file().sync_all()?;
    Ok(file)
}
pub fn install_engine(release: &Release) -> anyhow::Result<bool> {
    let manifest = release.manifest()?;
    let asset = manifest.asset()?;
    let expected = format!(
        "ixos-{}{}",
        platform()?,
        if cfg!(windows) { ".exe" } else { "" }
    );
    anyhow::ensure!(asset.file == expected, "Unexpected engine asset name");
    let destination = engine_path();
    let directory = destination.parent().unwrap();
    std::fs::create_dir_all(directory)?;
    let lock = std::fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(directory.join(".install.lock"))?;
    lock.lock()?;
    let download = download(release, asset, directory)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        download
            .as_file()
            .set_permissions(std::fs::Permissions::from_mode(0o755))?;
    }
    // Close the writable handle before Windows executes it, then verify capabilities.
    let download = download.into_temp_path();
    let mut session = crate::client::Session::start(&download)?;
    let info = session.call("hello", serde_json::json!({}))?;
    drop(session);
    anyhow::ensure!(
        info["version"].as_str() == Some(&manifest.version),
        "Downloaded engine version mismatch"
    );
    // The new executable verifies both HF models and provisions its embedded skill
    // before the current engine is replaced. Failures leave the working engine intact.
    run(std::process::Command::new(&download).arg("setup"))?;
    let backup = directory.join("ixos-previous");
    if backup.exists() {
        std::fs::remove_file(&backup)
            .context("Previous engine is still running; restart Ixos and retry")?;
    }
    if destination.exists() {
        std::fs::rename(&destination, &backup)?;
    }
    if let Err(error) = download.persist(&destination) {
        if backup.exists() {
            let _ = std::fs::rename(&backup, &destination);
        }
        return Err(error.error.into());
    }
    let _ = std::fs::remove_file(backup); // Windows may retain an in-use image until next update.
    Ok(true)
}

fn run(command: &mut std::process::Command) -> anyhow::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    anyhow::ensure!(
        command.status()?.success(),
        "Installer command failed: {command:?}"
    );
    Ok(())
}
/// Initial desktop installation. Subsequent desktop updates use Tauri's signed updater.
pub fn install_desktop(release: &Release) -> anyhow::Result<()> {
    let manifest = release.manifest()?;
    let asset = manifest.asset()?;
    let file = download(release, asset, &install_dir().join("downloads"))?.into_temp_path();
    #[cfg(windows)]
    {
        anyhow::ensure!(
            asset.file.ends_with("-setup.exe"),
            "Expected per-user NSIS installer"
        );
        if windows_install::is_packaged()? {
            windows_install::run_outside_package(
                &std::fs::canonicalize(&file)?,
                &["/S".into(), "/CURRENTUSER".into()],
            )?;
        } else {
            run(std::process::Command::new(&file).args(["/S", "/CURRENTUSER"]))?;
        }
        let app = dirs::data_local_dir()
            .context("Local application directory")?
            .join("Ixos/Ixos.exe");
        anyhow::ensure!(
            app.is_file(),
            "Desktop installer exited without installing Ixos"
        );
    }
    #[cfg(target_os = "macos")]
    {
        anyhow::ensure!(asset.file.ends_with(".dmg"), "Expected macOS disk image");
        let mount = tempfile::tempdir()?;
        run(std::process::Command::new("hdiutil")
            .arg("attach")
            .arg(&file)
            .args(["-nobrowse", "-readonly", "-mountpoint"])
            .arg(mount.path()))?;
        let app = dirs::home_dir()
            .context("Home directory")?
            .join("Applications/Ixos.app");
        std::fs::create_dir_all(app.parent().unwrap())?;
        let result = run(std::process::Command::new("ditto")
            .arg(mount.path().join("Ixos.app"))
            .arg(&app));
        let detach = run(std::process::Command::new("hdiutil")
            .arg("detach")
            .arg(mount.path()));
        result?;
        detach?;
        anyhow::ensure!(
            app.join("Contents/MacOS/Ixos").is_file(),
            "Desktop installation is incomplete"
        );
    }
    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        anyhow::ensure!(asset.file.ends_with(".AppImage"), "Expected Linux AppImage");
        std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o755))?;
        file.persist(install_dir().join("Ixos.AppImage"))?;
        let applications = dirs::data_dir()
            .context("User applications directory")?
            .join("applications");
        std::fs::create_dir_all(&applications)?;
        let path = install_dir().join("Ixos.AppImage");
        let escaped = path
            .to_string_lossy()
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('`', "\\`")
            .replace('$', "\\$")
            .replace('%', "%%");
        std::fs::write(applications.join("ixos.desktop"), format!("[Desktop Entry]\nType=Application\nName=Ixos\nExec=\"{escaped}\"\nTerminal=false\nCategories=Utility;\n"))?;
    }
    std::fs::write(install_dir().join("desktop-version"), &manifest.version)?;
    Ok(())
}
pub fn add_to_path() -> anyhow::Result<()> {
    // An explicit portable/test installation must never change the user's login environment.
    if std::env::var_os("IXOS_HOME").is_some() {
        return Ok(());
    }
    let bin = install_dir().join("bin");
    #[cfg(windows)]
    {
        // Environment values are passed separately; never interpolate paths into shell code.
        run(std::process::Command::new("powershell.exe").args(["-NoProfile", "-NonInteractive", "-Command",
            "$p=[Environment]::GetEnvironmentVariable('Path','User'); if (($p -split ';') -notcontains $env:IXOS_INSTALL_BIN) { [Environment]::SetEnvironmentVariable('Path', ($env:IXOS_INSTALL_BIN+';'+$p), 'User') }"])
            .env("IXOS_INSTALL_BIN", &bin))?;
    }
    #[cfg(unix)]
    {
        let home = dirs::home_dir().context("Home directory")?;
        let escaped = bin.to_string_lossy().replace('\'', "'\\''");
        let line = format!("\n# Ixos CLI\nexport PATH='{escaped}':\"$PATH\"\n");
        let mut profiles = vec![home.join(".profile")];
        if cfg!(target_os = "macos") || std::env::var("SHELL").unwrap_or_default().contains("zsh") {
            profiles.push(home.join(".zshrc"));
        }
        if home.join(".bashrc").exists() {
            profiles.push(home.join(".bashrc"));
        }
        for profile in profiles {
            let existing = std::fs::read_to_string(&profile).unwrap_or_default();
            if !existing.contains(&line) {
                std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(profile)?
                    .write_all(line.as_bytes())?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn components_select_highest_stable_version_independently() {
        let releases = vec![
            ("desktop-v9.0.0", false, false),
            ("engine-v1.9.0", false, false),
            ("engine-v1.10.0", false, false),
            ("engine-v2.0.0", true, false),
            ("engine-v3.0.0-beta.1", false, false),
            ("engine-v4.0.0", false, true),
        ]
        .into_iter()
        .map(|(tag, draft, prerelease)| Release {
            tag_name: tag.into(),
            draft,
            prerelease,
        })
        .collect::<Vec<_>>();
        assert_eq!(
            select(releases.clone(), "engine").unwrap().tag_name,
            "engine-v1.10.0"
        );
        assert_eq!(
            select(releases, "desktop").unwrap().tag_name,
            "desktop-v9.0.0"
        );
    }
    #[test]
    fn incompatible_manifest_is_rejected() {
        let manifest = Manifest {
            version: "1.0.0".into(),
            protocol_major: crate::PROTOCOL_MAJOR + 1,
            assets: vec![],
        };
        assert!(manifest
            .asset()
            .unwrap_err()
            .to_string()
            .contains("protocol"));
    }
}
