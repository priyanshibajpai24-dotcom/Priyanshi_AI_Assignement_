$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$partBRoot = Join-Path $projectRoot 'Part-1B'
$pnpm = Get-Command 'pnpm.cmd' -ErrorAction SilentlyContinue
if (-not $pnpm) { throw 'pnpm.cmd was not found. Install pnpm 11.25.0, then run this script again.' }

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
    Write-Host 'Installing the root dependencies from the frozen lockfile...'
    & $pnpm.Source install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Root dependency installation failed.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $partBRoot 'node_modules\ajv'))) {
    Write-Host 'Installing Part 1B dependencies from the frozen lockfile...'
    Push-Location -LiteralPath $partBRoot
    try {
        & $pnpm.Source install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'Part 1B dependency installation failed.' }
    } finally {
        Pop-Location
    }
}

$ollamaExe = Join-Path $projectRoot '.tools\ollama-portable-v0.40.16\ollama.exe'
if (-not (Test-Path -LiteralPath $ollamaExe)) {
    & (Join-Path $PSScriptRoot 'install-local-ollama.ps1')
}
if (-not (Test-Path -LiteralPath $ollamaExe)) { throw 'The project-local Ollama runtime is missing after setup.' }
$env:OLLAMA_EXE = $ollamaExe
$env:OLLAMA_MODELS = Join-Path $projectRoot '.tools\ollama-models'

$port = 3000
$tcp = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
try {
    $tcp.Start()
    $tcp.Stop()
} catch {
    throw "Port $port is already in use. Stop the process using it, then run this script again."
}

$demoData = Join-Path $env:TEMP ('smart-todo-client-demo-' + [guid]::NewGuid().ToString('N') + '.json')
$env:PORT = [string]$port
$env:SMART_TODO_DATA_FILE = $demoData
$partAProcess = Start-Process -FilePath $pnpm.Source -ArgumentList @('start') -WorkingDirectory $projectRoot -PassThru

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:$port/tasks" -TimeoutSec 2
        $ready = $true
        break
    } catch {
        if ($partAProcess.HasExited) { throw 'Part 1A stopped before its API became ready.' }
    }
}
if (-not $ready) { throw 'Part 1A did not become ready within 30 seconds.' }

$demoTasks = @(
    @{ title = 'Review client brief'; priority = 'now'; tags = @('client', 'demo') },
    @{ title = 'Prepare demo recording'; priority = 'next'; tags = @('client', 'video') },
    @{ title = 'Send project summary'; priority = 'later'; tags = @('client') }
)
foreach ($task in $demoTasks) {
    $payload = $task | ConvertTo-Json -Compress
    $null = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$port/tasks" -ContentType 'application/json' -Body $payload -TimeoutSec 5
}

$env:AI_PROVIDER = 'ollama-openai-compatible'
$env:AI_BASE_URL = 'http://127.0.0.1:11434/v1'
$env:AI_MODEL = 'qwen3.5:2b'
$env:AI_API_KEY = 'ollama'
$env:AI_TIMEOUT_MS = '120000'
$partBProcess = Start-Process -FilePath $pnpm.Source -ArgumentList @('start:local') -WorkingDirectory $partBRoot -PassThru
try {
    Start-Process "http://127.0.0.1:$port/tasks?sort=priority" -ErrorAction Stop
} catch {
    Write-Host 'Could not open the browser automatically. Open the Part 1A URL shown below.'
}

Write-Host 'Client demo is running locally.'
Write-Host "Part 1A tasks: http://127.0.0.1:$port/tasks?sort=priority"
Write-Host "Part 1A process ID: $($partAProcess.Id)"
Write-Host "Part 1B process ID: $($partBProcess.Id)"
Write-Host "Part 1A demo data is isolated at: $demoData"
Write-Host 'Leave this launcher window open during the demo. Press Ctrl+C here to stop both applications.'

$partBExitWarned = $false
try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($partAProcess.HasExited) { throw 'Part 1A stopped. Review its window and restart the demo if needed.' }
        if ($partBProcess.HasExited -and -not $partBExitWarned) {
            Write-Warning 'Part 1B has exited. Review its window for the actual result.'
            $partBExitWarned = $true
        }
    }
} finally {
    $taskkill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
    foreach ($process in @($partBProcess, $partAProcess)) {
        if ($process -and -not $process.HasExited) {
            & $taskkill /PID $process.Id /T /F | Out-Null
        }
    }
}
