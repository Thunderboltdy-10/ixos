# Ixplorer — one-command build & run
# Usage: powershell -ExecutionPolicy Bypass -File build_and_run.ps1
#   Flags: -SkipBuild   (just run, no rebuild)
#          -Deploy       (copy Qt DLLs next to exe for standalone use)

param(
    [switch]$SkipBuild,
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"

# ── Paths (edit these if your Qt install moves) ──
$QtRoot      = "C:\Qt\6.10.2\mingw_64"
$MinGW       = "C:\Qt\Tools\mingw1310_64\bin"
$CMakeBin    = "C:\Qt\Tools\CMake_64\bin"
$NinjaBin    = "C:\Qt\Tools\Ninja"
$ProjectDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir    = Join-Path $ProjectDir "build"
$Exe         = Join-Path $BuildDir "Ixplorer.exe"

# ── Environment ──
$env:PATH = "$MinGW;$CMakeBin;$NinjaBin;$QtRoot\bin;$env:PATH"
$env:CMAKE_PREFIX_PATH = $QtRoot

# ── Build ──
if (-not $SkipBuild) {
    Write-Host "Configuring..." -ForegroundColor Cyan
    cmake -B $BuildDir -S $ProjectDir -G Ninja -DCMAKE_BUILD_TYPE=Release
    if ($LASTEXITCODE -ne 0) { throw "CMake configure failed" }

    Write-Host "Building..." -ForegroundColor Cyan
    cmake --build $BuildDir
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }

    Write-Host "Build OK" -ForegroundColor Green
}

# ── Deploy (optional: copy DLLs so exe is self-contained) ──
if ($Deploy) {
    Write-Host "Deploying Qt DLLs..." -ForegroundColor Cyan
    & "$QtRoot\bin\windeployqt.exe" $Exe
    Write-Host "Deploy OK" -ForegroundColor Green
}

# ── Run ──
Write-Host "Launching Ixplorer..." -ForegroundColor Cyan
& $Exe
