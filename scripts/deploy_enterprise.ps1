<#
.SYNOPSIS
    Deploys Ixos to an enterprise workstation.
.DESCRIPTION
    Installs Ixos binary, configures path, and sets up global configuration.
.PARAMETER InstallPath
    The directory to install Ixos (default: C:\Program Files\Ixos)
.PARAMETER ConfigFile
    Path to a source config.toml to deploy globally
.PARAMETER AddToPath
    Switch to add the install directory to the system PATH
#>
param(
    [string]$InstallPath = "C:\Program Files\Ixos",
    [string]$ConfigFile = "",
    [switch]$AddToPath
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying Ixos to $InstallPath..."

# 1. Create Directory
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
}

# 2. Copy Binary (Assume script is run from source root or adjacent to binary)
$SourceBin = Join-Path $PSScriptRoot "..\target\release\ixos.exe"
if (-not (Test-Path $SourceBin)) {
    Write-Warning "Binary not found at $SourceBin. Please build release first."
    # Try looking in current dir
    $SourceBin = "ixos.exe"
}

if (Test-Path $SourceBin) {
    Copy-Item $SourceBin -Destination $InstallPath -Force
    Write-Host "Binary installed."
} else {
    Write-Error "Could not find ixos.exe to install."
}

# 3. Deploy Config
if ($ConfigFile -and (Test-Path $ConfigFile)) {
    $GlobalConfigDir = "C:\ProgramData\Ixos"
    if (-not (Test-Path $GlobalConfigDir)) {
        New-Item -ItemType Directory -Force -Path $GlobalConfigDir | Out-Null
    }
    Copy-Item $ConfigFile -Destination "$GlobalConfigDir\config.toml" -Force
    Write-Host "Configuration deployed to $GlobalConfigDir"
}

# 4. Add to Path
if ($AddToPath) {
    $CurrentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($CurrentPath -notlike "*$InstallPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$InstallPath", "Machine")
        Write-Host "Added to system PATH."
    } else {
        Write-Host "Already in PATH."
    }
}

Write-Host "Deployment complete."
