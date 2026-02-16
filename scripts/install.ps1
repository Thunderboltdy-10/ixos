Param(
    [string]$Repo = $env:IXOS_REPO,
    [string]$Tag = $env:IXOS_TAG,
    [string]$AssetUrl = $env:IXOS_ASSET_URL,
    [string]$InstallDir = $env:IXOS_INSTALL_DIR,
    [switch]$SkipPathPersist
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = "IxosProtocol/ixos-releases"
}

function Resolve-Arch {
    switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()) {
        "X64" { return "x86_64" }
        default { throw "Unsupported architecture for Windows: $([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture). Supported: X64." }
    }
}

function Resolve-Tag {
    param([string]$RepoName, [string]$ExplicitTag)

    if (-not [string]::IsNullOrWhiteSpace($ExplicitTag)) {
        return $ExplicitTag
    }

    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoName/releases?per_page=30" -Headers @{ "User-Agent" = "ixos-install-script" }
    $cli = $releases | Where-Object { $_.tag_name -like "cli-v*" } | Select-Object -First 1
    if ($null -ne $cli) {
        return $cli.tag_name
    }

    throw "No cli-v* release tags found for $RepoName. Set IXOS_TAG=cli-vX.Y.Z explicitly."
}

function Verify-Checksum {
    param([string]$ArchivePath, [string]$ChecksumUrl)

    try {
        $checksumContent = Invoke-RestMethod -Uri $ChecksumUrl -Headers @{ "User-Agent" = "ixos-install-script" }
        $expected = ($checksumContent -split '\s+')[0].ToLower()
        $actual = (Get-FileHash -Path $ArchivePath -Algorithm SHA256).Hash.ToLower()

        if ($expected -ne $actual) {
            throw "Checksum verification FAILED`n  Expected: $expected`n  Got:      $actual"
        }

        Write-Host "Checksum verified OK"
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($statusCode -eq 404) {
            Write-Host "Warning: SHA256 checksum file not available, skipping verification" -ForegroundColor Yellow
            return
        }

        throw
    }
}

$arch = Resolve-Arch
$os = "windows"
$resolvedTag = Resolve-Tag -RepoName $Repo -ExplicitTag $Tag
$version = $resolvedTag -replace "^cli-v", ""
$asset = "ixos-$version-$os-$arch.zip"
$url = if (-not [string]::IsNullOrWhiteSpace($AssetUrl)) { $AssetUrl } else { "https://github.com/$Repo/releases/download/$resolvedTag/$asset" }

$installRoot = if (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir
} else {
    Join-Path $env:LOCALAPPDATA "IxosCLI"
}
$binDir = Join-Path $installRoot "bin"
$tmpDir = Join-Path $env:TEMP ("ixos-install-" + [System.Guid]::NewGuid().ToString("N"))

New-Item -ItemType Directory -Path $binDir -Force | Out-Null
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$archivePath = Join-Path $tmpDir $asset
Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $archivePath

# Verify SHA256 checksum
$checksumUrl = "https://github.com/$Repo/releases/download/$resolvedTag/$asset.sha256"
Verify-Checksum -ArchivePath $archivePath -ChecksumUrl $checksumUrl

Expand-Archive -Path $archivePath -DestinationPath $tmpDir -Force

$exePath = Join-Path $tmpDir "ixos.exe"
if (-not (Test-Path $exePath)) {
    throw "Archive does not contain ixos.exe"
}

Copy-Item $exePath (Join-Path $binDir "ixos.exe") -Force

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($null -eq $userPath) { $userPath = "" }
if (-not $SkipPathPersist -and $env:IXOS_SKIP_PATH_PERSIST -ne "1") {
    if (-not ($userPath -split ';' | Where-Object { $_.Trim() -ieq $binDir })) {
        $newPath = ($userPath.TrimEnd(';') + ";" + $binDir).Trim(';')
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "Updated user PATH with $binDir"
    }
}

Remove-Item -Path $tmpDir -Recurse -Force

Write-Host "Installed Ixos CLI to $binDir\ixos.exe"
if (-not ($env:Path -split ';' | Where-Object { $_.Trim() -ieq $binDir })) {
    $env:Path = "$binDir;$env:Path"
}
& (Join-Path $binDir "ixos.exe") --version
