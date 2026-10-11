param(
    [string]$Catalog = 'eval/model_candidates.json',
    [string]$Destination = 'models/lab/artifacts',
    [string]$Receipt = 'reports/restoration/gate3-model-sources.json'
)
$ErrorActionPreference = 'Stop'
$modelCatalog = Get-Content -LiteralPath $Catalog -Raw | ConvertFrom-Json
if ($modelCatalog.schema -ne 1) { throw 'Unknown model catalog schema' }
$records = @()
foreach ($entry in $modelCatalog.models) {
    if ($entry.revision -notmatch '^[0-9a-f]{40}$' -or $entry.id -notmatch '^[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$') { throw 'Invalid pinned model identity' }
    $name = $entry.id.Split('/')[-1]
    $folder = Join-Path $Destination $name
    if (Test-Path -LiteralPath $folder) { throw "Use a new artifact folder; refusing to overwrite $folder" }
    $info = Invoke-RestMethod -Uri "https://huggingface.co/api/models/$($entry.id)/revision/$($entry.revision)?blobs=true"
    if ($info.sha -ne $entry.revision -or $info.cardData.license -ne $entry.license) { throw 'Pinned model revision/license differs' }
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    $files = @()
    foreach ($filename in @('model.safetensors', 'tokenizer.json', 'config.json', 'README.md')) {
        $sibling = $info.siblings | Where-Object rfilename -EQ $filename
        if (-not $sibling) { throw "Required artifact is absent: $filename" }
        $target = Join-Path $folder $filename
        Invoke-WebRequest -Uri "https://huggingface.co/$($entry.id)/resolve/$($entry.revision)/$filename" -OutFile $target
        $sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($sibling.lfs.sha256 -and $sha256 -ne $sibling.lfs.sha256) { throw "LFS artifact hash differs: $filename" }
        $files += [pscustomobject]@{name=$filename; bytes=(Get-Item -LiteralPath $target).Length; sha256=$sha256; upstream_lfs_sha256=$sibling.lfs.sha256}
    }
    $records += [pscustomobject]@{id=$entry.id; revision=$entry.revision; license=$entry.license; role=$entry.role; model_card=$entry.model_card; files=$files}
    $records | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Receipt -Encoding utf8
    Write-Output "$($entry.id): pinned artifacts downloaded and verified"
}
