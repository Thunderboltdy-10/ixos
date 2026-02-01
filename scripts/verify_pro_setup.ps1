# Check core environment variables for Ixos Pro

Write-Host "Checking Ixos Pro Environment Setup..." -ForegroundColor Cyan

$envFile = "src-tauri/.env"
$envLocal = "src-tauri/.env.local"

if (Test-Path $envFile) {
    Write-Host "Found .env file at $envFile" -ForegroundColor Green
    $content = Get-Content $envFile
} elseif (Test-Path $envLocal) {
    Write-Host "Found .env.local file at $envLocal" -ForegroundColor Green
    $content = Get-Content $envLocal
} else {
    Write-Host "WARNING: No .env or .env.local file found in src-tauri/" -ForegroundColor Yellow
    $content = @()
}

function Check-Var ($name) {
    $val = [System.Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($val)) {
        # Try finding in .env content manually
        $match = $content | Select-String "^$name=(.*)"
        if ($match) {
             Write-Host "  [OK] $name (found in .env)" -ForegroundColor Green
             return $true
        }
        Write-Host "  [MISSING] $name" -ForegroundColor Red
        return $false
    } else {
        Write-Host "  [OK] $name (found in process env)" -ForegroundColor Green
        return $true
    }
}

$hasUrl = Check-Var "IXOS_PRO_MODULE_BASE_URL"
$hasPub = Check-Var "IXOS_PRO_MODULE_PUBKEY"

if (-not $hasUrl) {
    Write-Host "`nACTION REQUIRED: Set IXOS_PRO_MODULE_BASE_URL" -ForegroundColor Red
    Write-Host "Example: https://my-store.public.blob.vercel-storage.com"
}

if (-not $hasPub) {
    Write-Host "`nACTION REQUIRED: Set IXOS_PRO_MODULE_PUBKEY" -ForegroundColor Red
    Write-Host "This must match the private key used to sign the module in CI."
}

Write-Host "`nDone."
