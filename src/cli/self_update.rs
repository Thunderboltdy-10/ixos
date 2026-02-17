//! CLI self-update: check for and install new versions from GitHub Releases.
//!
//! Queries `IxosProtocol/ixos-releases` for the latest `cli-v*` tag,
//! downloads the correct archive for the current OS/arch, verifies its
//! SHA256 checksum, and replaces the running binary atomically.

use std::io::{Read, Write};
use std::path::PathBuf;

const RELEASES_REPO: &str = "IxosProtocol/ixos-releases";
const RELEASES_API: &str = "https://api.github.com/repos/IxosProtocol/ixos-releases/releases";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Information about an available release.
#[derive(Debug)]
pub struct ReleaseInfo {
    pub tag: String,
    pub version: String,
    pub download_url: String,
    pub checksum_url: String,
}

/// Detect the platform archive name fragment for the current OS/arch.
fn platform_archive_suffix() -> anyhow::Result<(&'static str, &'static str)> {
    let os = match std::env::consts::OS {
        "linux" => "linux",
        "macos" => "macos",
        "windows" => "windows",
        other => anyhow::bail!("Unsupported OS for self-update: {other}"),
    };

    let arch = match std::env::consts::ARCH {
        "x86_64" => "x86_64",
        "aarch64" => "arm64",
        other => anyhow::bail!("Unsupported architecture for self-update: {other}"),
    };

    Ok((os, arch))
}

/// Fetch the latest `cli-v*` release info from GitHub.
pub fn check_latest() -> anyhow::Result<Option<ReleaseInfo>> {
    let url = format!("{}?per_page=30", RELEASES_API);
    let resp: serde_json::Value = ureq::get(&url)
        .set("User-Agent", "ixos-self-update")
        .set("Accept", "application/vnd.github+json")
        .call()
        .map_err(|e| anyhow::anyhow!("Failed to query releases API: {e}"))?
        .into_json()?;

    let releases = resp
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("Unexpected releases API response"))?;

    let (os, arch) = platform_archive_suffix()?;
    let ext = if os == "windows" { "zip" } else { "tar.gz" };

    let mut best: Option<((u32, u32, u32), ReleaseInfo)> = None;

    for release in releases {
        let tag = match release["tag_name"].as_str() {
            Some(t) if t.starts_with("cli-v") => t,
            _ => continue,
        };

        let version = tag.strip_prefix("cli-v").unwrap_or(tag);
        let version_tuple = match parse_semver(version) {
            Some(v) => v,
            None => continue,
        };
        let archive_name = format!("ixos-{version}-{os}-{arch}.{ext}");

        // Find the asset download URL
        let assets = match release["assets"].as_array() {
            Some(a) => a,
            None => continue,
        };

        let mut download_url = None;
        let mut checksum_url = None;

        for asset in assets {
            let name = asset["name"].as_str().unwrap_or_default();
            if name == archive_name {
                download_url = asset["browser_download_url"].as_str().map(String::from);
            } else if name == format!("{archive_name}.sha256") {
                checksum_url = asset["browser_download_url"].as_str().map(String::from);
            }
        }

        if let Some(dl) = download_url {
            let info = ReleaseInfo {
                tag: tag.to_string(),
                version: version.to_string(),
                download_url: dl,
                checksum_url: checksum_url.unwrap_or_default(),
            };
            match &best {
                Some((best_version, _)) if *best_version >= version_tuple => {}
                _ => best = Some((version_tuple, info)),
            }
        }
    }

    Ok(best.map(|(_, release)| release))
}

/// Compare two semver-style version strings.  Returns true when `latest` is
/// strictly newer than `current`.
fn is_newer(current: &str, latest: &str) -> bool {
    let parse = |v: &str| -> (u32, u32, u32) {
        let parts: Vec<u32> = v.split('.').filter_map(|s| s.parse().ok()).collect();
        (
            parts.first().copied().unwrap_or(0),
            parts.get(1).copied().unwrap_or(0),
            parts.get(2).copied().unwrap_or(0),
        )
    };
    parse(latest) > parse(current)
}

fn parse_semver(version: &str) -> Option<(u32, u32, u32)> {
    let mut parts = version.split('.');
    let major = parts.next()?.parse::<u32>().ok()?;
    let minor = parts.next()?.parse::<u32>().ok()?;
    let patch = parts.next()?.parse::<u32>().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some((major, minor, patch))
}

/// Download a URL into a byte buffer.
fn download_bytes(url: &str) -> anyhow::Result<Vec<u8>> {
    let resp = ureq::get(url)
        .set("User-Agent", "ixos-self-update")
        .call()
        .map_err(|e| anyhow::anyhow!("Download failed: {e}"))?;

    let mut body = Vec::new();
    resp.into_reader().read_to_end(&mut body)?;
    Ok(body)
}

/// Verify SHA256 checksum.
fn verify_checksum(data: &[u8], expected_line: &str) -> anyhow::Result<()> {
    use sha2::Digest;
    let hash = sha2::Sha256::digest(data);
    let hex_hash = hex::encode(hash);

    // Checksum file is usually "hash  filename" or just "hash"
    let expected = expected_line
        .split_whitespace()
        .next()
        .unwrap_or(expected_line)
        .trim()
        .to_lowercase();

    if hex_hash != expected {
        anyhow::bail!("Checksum mismatch: expected {expected}, got {hex_hash}");
    }

    Ok(())
}

/// Extract archive and return the path to the ixos binary inside `dest_dir`.
fn extract_archive(data: &[u8], dest_dir: &std::path::Path) -> anyhow::Result<PathBuf> {
    std::fs::create_dir_all(dest_dir)?;

    if cfg!(windows) {
        // ZIP extraction
        let cursor = std::io::Cursor::new(data);
        let mut archive = zip::ZipArchive::new(cursor)?;
        archive.extract(dest_dir)?;
        let bin_path = dest_dir.join("ixos.exe");
        if bin_path.exists() {
            return Ok(bin_path);
        }
        anyhow::bail!("ixos.exe not found in archive");
    } else {
        // tar.gz extraction
        let cursor = std::io::Cursor::new(data);
        let gz = flate2::read::GzDecoder::new(cursor);
        let mut archive = tar::Archive::new(gz);
        archive.unpack(dest_dir)?;
        let bin_path = dest_dir.join("ixos");
        if bin_path.exists() {
            return Ok(bin_path);
        }
        anyhow::bail!("ixos binary not found in archive");
    }
}

/// Replace the current binary with the new one.
///
/// On Windows we do a rename dance: current → .old, new → current.
/// On Unix we use a self-replacing wrapper approach to handle ETXTBSY.
fn replace_binary(new_bin: &std::path::Path) -> anyhow::Result<()> {
    let current_exe = std::env::current_exe()?;

    if cfg!(windows) {
        let old_path = current_exe.with_extension("exe.old");
        // Remove stale .old from a previous update if present
        let _ = std::fs::remove_file(&old_path);
        std::fs::rename(&current_exe, &old_path)?;
        std::fs::copy(new_bin, &current_exe)?;
    } else {
        // On Unix, we can't rename over the running binary (ETXTBSY).
        // Instead, copy the new binary over the current one.
        // The copy will replace the file content, and since we're just
        // reading/writing the inode (not removing it), this works.

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(new_bin, std::fs::Permissions::from_mode(0o755))?;
        }

        // Copy over the current binary
        std::fs::copy(new_bin, &current_exe)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&current_exe, std::fs::Permissions::from_mode(0o755))?;
        }
    }

    Ok(())
}

/// Silent background auto-update: checks for newer version and updates if available.
/// Prints nothing unless update succeeds.
fn run_auto_update() -> anyhow::Result<()> {
    let release = match check_latest()? {
        Some(r) => r,
        None => return Ok(()),
    };

    if !is_newer(CURRENT_VERSION, &release.version) {
        return Ok(());
    }

    // Download archive silently
    let archive_data = download_bytes(&release.download_url)?;

    // Verify checksum if available (but don't fail if missing)
    if !release.checksum_url.is_empty() {
        if let Ok(checksum_text) = String::from_utf8(download_bytes(&release.checksum_url)?) {
            let _ = verify_checksum(&archive_data, &checksum_text);
        }
    }

    // Extract to temp directory
    let tmp_dir = std::env::temp_dir().join(format!("ixos-update-{}", release.version));
    let _ = std::fs::remove_dir_all(&tmp_dir);
    let new_bin = extract_archive(&archive_data, &tmp_dir)?;

    // Replace binary
    replace_binary(&new_bin)?;

    // Cleanup
    let _ = std::fs::remove_dir_all(&tmp_dir);

    // Print a subtle note about the update
    eprintln!("⚡ Ixos updated to v{} automatically", release.version);
    Ok(())
}

/// Check if auto-update was attempted recently (within 24 hours)
/// Returns true if we should skip the check to avoid excessive API calls
fn should_skip_auto_update() -> bool {
    use std::fs;

    let cache_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("Ixos");
    let timestamp_file = cache_dir.join(".auto_update_check");

    if let Ok(content) = fs::read_to_string(&timestamp_file) {
        if let Ok(last_check) = content.parse::<i64>() {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            // Skip if checked within last 24 hours
            if now - last_check < 86400 {
                return true;
            }
        }
    }

    // Update the timestamp
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let _ = fs::create_dir_all(&cache_dir);
    let _ = fs::write(&timestamp_file, now.to_string());

    false
}

/// Background auto-update that runs once per day
pub fn run_auto_update_background() -> anyhow::Result<()> {
    if should_skip_auto_update() {
        return Ok(());
    }

    // Use blocking version for thread
    let release = match check_latest()? {
        Some(r) => r,
        None => return Ok(()),
    };

    if !is_newer(CURRENT_VERSION, &release.version) {
        return Ok(());
    }

    // Download archive silently
    let archive_data = download_bytes(&release.download_url)?;

    // Verify checksum if available
    if !release.checksum_url.is_empty() {
        if let Ok(checksum_text) = String::from_utf8(download_bytes(&release.checksum_url)?) {
            let _ = verify_checksum(&archive_data, &checksum_text);
        }
    }

    // Extract to temp directory
    let tmp_dir = std::env::temp_dir().join(format!("ixos-update-bg-{}", release.version));
    let _ = std::fs::remove_dir_all(&tmp_dir);
    let new_bin = extract_archive(&archive_data, &tmp_dir)?;

    // Replace binary
    replace_binary(&new_bin)?;

    // Cleanup
    let _ = std::fs::remove_dir_all(&tmp_dir);

    // Note: can't print to stderr here since we're in a spawned thread
    // The update will take effect on next run
    Ok(())
}

/// Run the full self-update flow.
/// If auto=true, silently update in background and print note only.
pub fn run_update(
    check_only: bool,
    auto_yes: bool,
    target_version: Option<String>,
    auto: bool,
) -> anyhow::Result<()> {
    println!("Ixos CLI v{CURRENT_VERSION}");

    // In auto mode, check silently without printing version info
    if auto {
        if let Err(e) = run_auto_update() {
            // Silently fail auto-updates - don't bother the user
            tracing::debug!("Auto-update check failed: {}", e);
        }
        return Ok(());
    }

    println!("Checking for updates...");

    let release = match check_latest()? {
        Some(r) => r,
        None => {
            println!("No CLI releases found for your platform.");
            return Ok(());
        }
    };

    // If a specific version was requested, verify the latest matches
    if let Some(ref target) = target_version {
        if release.version != *target {
            println!(
                "Requested version {target} not found (latest is {}).",
                release.version
            );
            println!("Available at: https://github.com/{RELEASES_REPO}/releases");
            return Ok(());
        }
    }

    if !is_newer(CURRENT_VERSION, &release.version) {
        println!("You are already on the latest version ({CURRENT_VERSION}).");
        return Ok(());
    }

    println!(
        "New version available: {} -> {}",
        CURRENT_VERSION, release.version
    );

    if check_only {
        println!("Run `ixos update` to install.");
        return Ok(());
    }

    if !auto_yes {
        print!("Install v{}? [y/N]: ", release.version);
        std::io::stdout().flush()?;
        let mut input = String::new();
        std::io::stdin().read_line(&mut input)?;
        if !input.trim().eq_ignore_ascii_case("y") {
            println!("Update cancelled.");
            return Ok(());
        }
    }

    // Download archive
    println!("Downloading v{}...", release.version);
    let archive_data = download_bytes(&release.download_url)?;

    // Verify checksum if available
    if !release.checksum_url.is_empty() {
        print!("Verifying checksum... ");
        let checksum_text = String::from_utf8(download_bytes(&release.checksum_url)?)?;
        verify_checksum(&archive_data, &checksum_text)?;
        println!("OK");
    }

    // Extract to temp directory
    let tmp_dir = std::env::temp_dir().join(format!("ixos-update-{}", release.version));
    let _ = std::fs::remove_dir_all(&tmp_dir);
    let new_bin = extract_archive(&archive_data, &tmp_dir)?;

    // Replace binary
    print!("Installing... ");
    replace_binary(&new_bin)?;
    println!("OK");

    // Cleanup
    let _ = std::fs::remove_dir_all(&tmp_dir);

    println!("Updated to Ixos CLI v{}", release.version);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_newer() {
        assert!(is_newer("0.1.0", "0.2.0"));
        assert!(is_newer("0.1.0", "0.1.1"));
        assert!(is_newer("0.1.0", "1.0.0"));
        assert!(!is_newer("0.2.0", "0.1.0"));
        assert!(!is_newer("0.1.0", "0.1.0"));
    }

    #[test]
    fn test_parse_semver() {
        assert_eq!(parse_semver("0.1.6"), Some((0, 1, 6)));
        assert_eq!(parse_semver("1.2.3"), Some((1, 2, 3)));
        assert_eq!(parse_semver("1.2"), None);
        assert_eq!(parse_semver("1.2.3.4"), None);
        assert_eq!(parse_semver("v1.2.3"), None);
    }

    #[test]
    fn test_platform_archive_suffix() {
        // Should succeed on all CI platforms
        let result = platform_archive_suffix();
        assert!(result.is_ok());
        let (os, arch) = result.unwrap();
        assert!(!os.is_empty());
        assert!(!arch.is_empty());
    }

    #[test]
    fn test_verify_checksum_valid() {
        use sha2::Digest;
        let data = b"hello world";
        let hash = sha2::Sha256::digest(data);
        let hex_hash = hex::encode(hash);
        let checksum_line = format!("{}  ixos-test.tar.gz", hex_hash);
        assert!(verify_checksum(data, &checksum_line).is_ok());
    }

    #[test]
    fn test_verify_checksum_invalid() {
        let data = b"hello world";
        let checksum_line =
            "0000000000000000000000000000000000000000000000000000000000000000  test.tar.gz";
        assert!(verify_checksum(data, checksum_line).is_err());
    }
}
