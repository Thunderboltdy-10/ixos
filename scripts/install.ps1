Param(
    [string]$Repo = $env:IXOS_REPO,
    [string]$Tag = $env:IXOS_TAG
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = "Thunderboltdy-10/Ixos"
}

function Resolve-Arch {
    switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()) {
        "X64" { return "x86_64" }
        "Arm64" { return "arm64" }
        default { throw "Unsupported architecture: $($_)" }
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

    $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoName/releases/latest" -Headers @{ "User-Agent" = "ixos-install-script" }
    return $latest.tag_name
}

$arch = Resolve-Arch
$os = "windows"
$resolvedTag = Resolve-Tag -RepoName $Repo -ExplicitTag $Tag
$version = $resolvedTag -replace "^cli-v", ""
$asset = "ixos-$version-$os-$arch.zip"
$url = "https://github.com/$Repo/releases/download/$resolvedTag/$asset"

$installRoot = Join-Path $env:LOCALAPPDATA "Ixos"
$binDir = Join-Path $installRoot "bin"
$tmpDir = Join-Path $env:TEMP ("ixos-install-" + [System.Guid]::NewGuid().ToString("N"))

New-Item -ItemType Directory -Path $binDir -Force | Out-Null
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$archivePath = Join-Path $tmpDir $asset
Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $archivePath
Expand-Archive -Path $archivePath -DestinationPath $tmpDir -Force

$exePath = Join-Path $tmpDir "ixos.exe"
if (-not (Test-Path $exePath)) {
    throw "Archive does not contain ixos.exe"
}

Copy-Item $exePath (Join-Path $binDir "ixos.exe") -Force

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($null -eq $userPath) { $userPath = "" }
if (-not ($userPath -split ';' | Where-Object { $_ -eq $binDir })) {
    $newPath = ($userPath.TrimEnd(';') + ";" + $binDir).Trim(';')
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Updated user PATH with $binDir"
}

Remove-Item -Path $tmpDir -Recurse -Force

Write-Host "Installed Ixos CLI to $binDir\ixos.exe"
& (Join-Path $binDir "ixos.exe") --version
