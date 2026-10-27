# Download the lightweight binary installer; no Rust, Node or source checkout needed.
param([switch]$NoDesktop)
$ErrorActionPreference = 'Stop'
if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') { throw 'Prebuilt Windows installers require x64.' }
$taskBase = 'https://github.com/Thunderboltdy-10/ixos/releases/latest/download'
$taskName = 'ixos-install-Windows-X64.exe'
$taskTemp = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $taskTemp | Out-Null
try {
    $taskInstaller = Join-Path $taskTemp $taskName
    Invoke-WebRequest "$taskBase/$taskName" -OutFile $taskInstaller -UseBasicParsing
    $taskSumsPath = Join-Path $taskTemp 'SHA256SUMS'
    Invoke-WebRequest "$taskBase/SHA256SUMS" -OutFile $taskSumsPath -UseBasicParsing
    $taskSums = Get-Content -LiteralPath $taskSumsPath -Raw
    $taskMatch = [regex]::Match($taskSums, "(?m)^([a-fA-F0-9]{64})  $([regex]::Escape($taskName))\r?$")
    if (-not $taskMatch.Success -or (Get-FileHash -LiteralPath $taskInstaller -Algorithm SHA256).Hash -ne $taskMatch.Groups[1].Value) { throw 'Installer checksum mismatch; retry the download.' }
    $taskArgs = @()
    if ($NoDesktop) { $taskArgs += '--no-desktop' }
    & $taskInstaller @taskArgs
    if ($LASTEXITCODE -ne 0) { throw 'Ixos installation did not complete; see the error above.' }
} finally {
    # Only this newly-created, verified temporary directory is removed.
    if ((Split-Path -Parent ([IO.Path]::GetFullPath($taskTemp))) -eq ([IO.Path]::GetTempPath().TrimEnd('\'))) {
        Remove-Item -LiteralPath $taskTemp -Recurse -Force
    }
}
