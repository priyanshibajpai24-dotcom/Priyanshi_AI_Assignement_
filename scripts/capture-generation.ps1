[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("initial", "final")]
    [string]$Generation
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$generationDirectory = Join-Path $projectRoot "evidence\part-1a\$Generation-generation"
New-Item -ItemType Directory -Force -Path $generationDirectory | Out-Null
$archivePath = Join-Path $generationDirectory "smart-todo-$Generation.zip"
$manifestPath = Join-Path $generationDirectory "sha256-manifest.json"
if ((Test-Path $archivePath) -or (Test-Path $manifestPath)) {
    throw "The $Generation generation already exists; refusing to overwrite it."
}

$rootFiles = @(".gitignore", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "eslint.config.mjs", "README.md", "CLIENT-DEMO.md")
$sourceDirectories = @("src", "tests", "harness", "scripts")
$archiveItems = @($rootFiles | Where-Object { Test-Path (Join-Path $projectRoot $_) })
$archiveItems += @($sourceDirectories | Where-Object { Test-Path (Join-Path $projectRoot $_) })
$files = @()
foreach ($item in $archiveItems) {
    $itemPath = Join-Path $projectRoot $item
    if ((Get-Item $itemPath).PSIsContainer) {
        $files += Get-ChildItem -LiteralPath $itemPath -Recurse -File
    } else {
        $files += Get-Item -LiteralPath $itemPath
    }
}
$manifestEntries = @(
    $files | Sort-Object FullName | ForEach-Object {
        $relativePath = $_.FullName.Substring($projectRoot.Length).TrimStart([char[]]@("\", "/"))
        [pscustomobject]@{
            path = $relativePath
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
)

Push-Location -LiteralPath $projectRoot
try {
    Compress-Archive -Path $archiveItems -DestinationPath $archivePath
} finally {
    Pop-Location
}
[pscustomobject]@{
    generation = $Generation
    fileCount = $manifestEntries.Count
    files = $manifestEntries
} | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $manifestPath
Write-Output "Created $archivePath with $($manifestEntries.Count) hashed files."
