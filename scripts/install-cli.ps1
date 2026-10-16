# Build the CLI and complete model setup for the current user.
$ErrorActionPreference = 'Stop'
$taskCrate = Join-Path $PSScriptRoot '../crates/ixos-cli'
cargo install --path $taskCrate --locked
if ($LASTEXITCODE -ne 0) { throw 'CLI installation failed' }
$taskCargoHome = if ($env:CARGO_HOME) { $env:CARGO_HOME } else { Join-Path $HOME '.cargo' }
$taskBinary = Join-Path $taskCargoHome 'bin/ixos.exe'
if (-not (Test-Path -LiteralPath $taskBinary)) { $taskBinary = Join-Path $taskCargoHome 'bin/ixos' }
& $taskBinary setup
if ($LASTEXITCODE -ne 0) { throw 'Model setup failed. Check your connection and retry with ixos setup.' }
