$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolRoot = Join-Path $projectRoot '.tools'
$archivePath = Join-Path $toolRoot 'ollama-windows-amd64-v0.40.16.zip'
$partialPath = "$archivePath.partial"
$destination = Join-Path $toolRoot 'ollama-portable-v0.40.16'
$expectedSha256 = '50fcf5ad54277f2fa5d173ebfc93bcb017adbc0c9ef2314daabc96ca9e6aa64e'
$downloadUrl = 'https://github.com/ollama/ollama/releases/download/v0.40.16/ollama-windows-amd64.zip'

if (Test-Path -LiteralPath (Join-Path $destination 'ollama.exe')) {
    Write-Output "Project-local Ollama is already available at $destination."
    return
}

if (-not (Test-Path -LiteralPath $archivePath)) {
    if (Test-Path -LiteralPath $partialPath) {
        Remove-Item -LiteralPath $partialPath -Force
    }

    Write-Output 'Downloading the pinned Ollama Windows standalone bundle. This is about 1.51 GB.'
    $node = Get-Command 'node' -ErrorAction Stop
    $downloader = Join-Path $PSScriptRoot 'download-ollama-runtime.mjs'
    & $node.Source '--use-env-proxy' $downloader $downloadUrl $partialPath
    if ($LASTEXITCODE -ne 0) { throw 'The pinned Ollama runtime download failed.' }
    Move-Item -LiteralPath $partialPath -Destination $archivePath
}

$actualSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha256 -ne $expectedSha256) {
    throw "Ollama archive checksum mismatch. Expected $expectedSha256, received $actualSha256. The archive was not extracted."
}

$staging = Join-Path $toolRoot ('ollama-portable-staging-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null
Write-Output 'Checksum verified. Extracting the Ollama runtime into the project-local .tools folder.'
Expand-Archive -LiteralPath $archivePath -DestinationPath $staging
if (-not (Test-Path -LiteralPath (Join-Path $staging 'ollama.exe'))) {
    throw 'The verified Ollama archive did not contain ollama.exe at its root; it was not installed.'
}
Move-Item -LiteralPath $staging -Destination $destination
Write-Output "Ollama runtime installed at $(Join-Path $destination 'ollama.exe')."
