//! Packaged terminals can redirect an installer's AppData and Start menu writes
//! into their private MSIX cache. Ask the user's Explorer shell to run the
//! installer in the normal desktop environment, without elevation or a console.
use anyhow::Context;
use std::{ffi::OsString, io::Write, path::Path, time::Duration};

#[link(name = "kernel32")]
extern "system" {
    fn GetCurrentPackageFullName(length: *mut u32, name: *mut u16) -> u32;
}

pub(super) fn is_packaged() -> anyhow::Result<bool> {
    let mut length = 0;
    // A null buffer queries the required length; no memory is dereferenced.
    match unsafe { GetCurrentPackageFullName(&mut length, std::ptr::null_mut()) } {
        122 => Ok(true), // ERROR_INSUFFICIENT_BUFFER: a package identity exists.
        15700 => {
            // Descendants of packaged apps can lose their package identity yet
            // retain AppData redirection. Verify the physical destination too.
            let directory = dirs::data_local_dir().context("Local application directory")?;
            let parent = std::fs::canonicalize(&directory)?;
            let probe = tempfile::Builder::new()
                .prefix("ixos-install-environment-")
                .tempfile_in(directory)?;
            let physical = std::fs::canonicalize(probe.path())?;
            Ok(physical.parent() != Some(parent.as_path()))
        }
        error => anyhow::bail!("Could not inspect Windows package identity: {error}"),
    }
}

fn literal(value: &std::ffi::OsStr) -> anyhow::Result<String> {
    let text = value
        .to_str()
        .context("Installer path is not valid Unicode")?;
    Ok(format!("'{}'", text.replace('\'', "''")))
}

pub(super) fn run_outside_package(program: &Path, args: &[OsString]) -> anyhow::Result<()> {
    // USERPROFILE/.ixos is outside AppData redirection. A virtualized %TEMP%
    // path would be invisible to Explorer and its child process.
    let directory = super::install_dir().join("downloads");
    std::fs::create_dir_all(&directory)?;
    let mut script = tempfile::Builder::new()
        .prefix("ixos-desktop-install-")
        .suffix(".ps1")
        .tempfile_in(&directory)?;
    let result = script.path().with_extension("result");
    let output = script.path().with_extension("log");
    let arguments = args
        .iter()
        .map(|a| literal(a))
        .collect::<anyhow::Result<Vec<_>>>()?
        .join(", ");
    script.write_all(&[0xef, 0xbb, 0xbf])?; // Windows PowerShell reads UTF-8 with a BOM.
    write!(script, "$ErrorActionPreference = 'Continue'\n$env:IXOS_INSTALL_UNVIRTUALIZED = '1'\ntry {{\n  & {} @({arguments}) 2>&1 | Out-File -LiteralPath {} -Encoding utf8 -ErrorAction Stop\n  $taskExit = $LASTEXITCODE\n  if ($null -eq $taskExit) {{ $taskExit = 1 }}\n}} catch {{\n  $_ | Out-File -LiteralPath {} -Append -Encoding utf8\n  $taskExit = 1\n}}\n[IO.File]::WriteAllText({}, [string]$taskExit)\n",
        literal(program.as_os_str())?, literal(output.as_os_str())?, literal(output.as_os_str())?, literal(result.as_os_str())?)?;
    script.flush()?;
    // PowerShell opens scripts without sharing write access. Close the writable
    // handle before handing the path to Explorer, retaining automatic cleanup.
    let script = script.into_temp_path();
    let parameters = format!(
        "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"{}\"",
        script.display()
    );
    super::run(std::process::Command::new("powershell.exe").args([
        "-NoProfile", "-NonInteractive", "-Command",
        &format!("$ErrorActionPreference = 'Stop'; $taskShell = New-Object -ComObject Shell.Application; [int]$taskHwnd = 0; $taskDesktop = $taskShell.Windows().FindWindowSW(0, $null, 8, [ref]$taskHwnd, 1); if (!$taskDesktop) {{ throw 'Windows Explorer is unavailable; run this installer from Windows Terminal' }}; $taskDesktop.Document.Application.ShellExecute('powershell.exe', {}, {}, 'open', 0)", literal(std::ffi::OsStr::new(&parameters))?, literal(directory.as_os_str())?),
    ]))?;
    let deadline = std::time::Instant::now() + Duration::from_secs(20 * 60);
    let status = loop {
        if let Ok(status) = std::fs::read_to_string(&result) {
            break status;
        }
        anyhow::ensure!(std::time::Instant::now() < deadline,
            "Windows did not finish the desktop installation. Run the installer from Windows Terminal outside the packaged app. Diagnostic log: {}", output.display());
        std::thread::sleep(Duration::from_millis(200));
    };
    if let Ok(log) = std::fs::read_to_string(&output) {
        print!("{log}");
    }
    let success = status.trim() == "0";
    let _ = std::fs::remove_file(&result);
    if success {
        let _ = std::fs::remove_file(&output);
    }
    anyhow::ensure!(
        success,
        "Desktop installation failed outside the packaged app; see {}",
        output.display()
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn packaged_parent_installs_in_the_normal_windows_environment() {
        if !super::is_packaged().unwrap() {
            return;
        }
        let probe = r#"
Add-Type 'using System;using System.Text;using System.Runtime.InteropServices;using Microsoft.Win32.SafeHandles;public class PathProbe{[DllImport("kernel32.dll",CharSet=CharSet.Unicode)]public static extern uint GetFinalPathNameByHandle(SafeFileHandle h,StringBuilder p,uint n,uint f);}'
$taskPath = Join-Path $env:LOCALAPPDATA ('ixos-install-probe-' + [guid]::NewGuid() + '.tmp')
try {
  [IO.File]::WriteAllText($taskPath, 'probe')
  $taskFile = [IO.File]::OpenRead($taskPath)
  try {
    $taskBuffer = New-Object Text.StringBuilder 32768
    [void][PathProbe]::GetFinalPathNameByHandle($taskFile.SafeFileHandle, $taskBuffer, 32768, 0)
  } finally { $taskFile.Dispose() }
  if ($taskBuffer.ToString() -ine ('\\?\' + $taskPath)) { exit 1 }
} finally { Remove-Item -LiteralPath $taskPath }
exit 0
"#;
        let directory = super::super::install_dir().join("downloads");
        std::fs::create_dir_all(&directory).unwrap();
        let mut script = tempfile::Builder::new()
            .suffix(".ps1")
            .tempfile_in(directory)
            .unwrap();
        use std::io::Write;
        script.write_all(probe.as_bytes()).unwrap();
        let script = script.into_temp_path();
        super::run_outside_package(
            std::path::Path::new("powershell.exe"),
            &[
                "-NoProfile".into(),
                "-NonInteractive".into(),
                "-File".into(),
                script.as_os_str().into(),
            ],
        )
        .unwrap();
    }
}
