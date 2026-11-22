$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$rawDirectory = Join-Path $projectRoot "evidence\part-1a\raw"
$toolDirectory = Join-Path $projectRoot ".tools"
New-Item -ItemType Directory -Force -Path $rawDirectory | Out-Null

$uvxCommand = Get-Command uvx -ErrorAction SilentlyContinue
if ($uvxCommand) {
    $uvx = $uvxCommand.Source
} else {
    $uvx = Join-Path $toolDirectory "bootstrap\Scripts\uvx.exe"
}
if (-not (Test-Path $uvx)) {
    throw "uvx was not found. Install uv and make uvx available on PATH."
}

$env:UV_CACHE_DIR = Join-Path $toolDirectory "uv-cache"
$env:UV_TOOL_DIR = Join-Path $toolDirectory "uv-tools"
$env:UV_PYTHON_INSTALL_DIR = Join-Path $toolDirectory "uv-python"
$pythonInstall = Get-ChildItem -LiteralPath $env:UV_PYTHON_INSTALL_DIR -Directory -Filter "cpython-3.12.*-windows-x86_64-none" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
$pythonExe = if ($pythonInstall) { Join-Path $pythonInstall.FullName "python.exe" } else { $null }
if ($pythonExe) {
    $env:UV_PYTHON = $pythonExe
}

$env:XDG_CONFIG_HOME = Join-Path $toolDirectory "semgrep-config"
$env:XDG_CACHE_HOME = Join-Path $toolDirectory "semgrep-cache"
$env:SEMGREP_LOG_FILE = Join-Path $toolDirectory "semgrep.log"
$env:SEMGREP_SETTINGS_FILE = Join-Path $toolDirectory "semgrep-settings.yml"
$env:SEMGREP_SEND_METRICS = "off"
New-Item -ItemType Directory -Force -Path $env:XDG_CONFIG_HOME, $env:XDG_CACHE_HOME | Out-Null

$semgrepPin = "semgrep==1.185.0"
$uvxArgs = @()
if ($pythonExe) {
    $uvxArgs += @("--python", $pythonExe)
} else {
    $uvxArgs += @("--python", "3.12")
}
$uvxArgs += @("--from", $semgrepPin, "semgrep")
$ruleset = "p/javascript"
$rawResults = Join-Path $rawDirectory "sast.json"
$cliRawResults = Join-Path $rawDirectory "sast-cli-output.json"
$cliOutputPath = Join-Path $rawDirectory "sast-cli.txt"
$metadataPath = Join-Path $rawDirectory "sast-metadata.json"
$statusPath = Join-Path $rawDirectory "sast-status.json"
$startedAt = [DateTime]::UtcNow.ToString("o")

$versionLines = @(& $uvx @uvxArgs --version 2>&1)
$versionExit = $LASTEXITCODE
$version = ($versionLines | Select-Object -Last 1).ToString().Trim()
if ($versionExit -ne 0) {
    $versionLines | Out-String | Set-Content -Encoding utf8 $cliOutputPath
    $metadata = [ordered]@{
        scanner = "Semgrep Community Edition"
        version = $version
        package = $semgrepPin
        ruleset = $ruleset
        scannedPath = "src"
        startedAtUtc = $startedAt
        finishedAtUtc = [DateTime]::UtcNow.ToString("o")
    }
    $metadata | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $metadataPath
    $status = [ordered]@{
        command = "uvx $($uvxArgs -join ' ') --version"
        exitCode = $versionExit
        findingCount = -1
        errorCount = -1
        passed = $false
        phase = "scanner initialization"
    }
    $status | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $statusPath
    exit $versionExit
}

# First try Semgrep's normal local CLI and JSON formatter.
$cliOutput = @(& $uvx @uvxArgs scan --config $ruleset --metrics off --json --output $cliRawResults src 2>&1)
$cliExit = $LASTEXITCODE
$cliOutput | Out-String | Set-Content -Encoding utf8 $cliOutputPath
$cliReport = $null
$cliParseError = $null
if (Test-Path $cliRawResults) {
    try {
        $cliReport = Get-Content -Raw $cliRawResults | ConvertFrom-Json
    } catch {
        $cliParseError = $_.Exception.Message
    }
}

$executionMode = "Semgrep CE CLI JSON"
$coreExit = $null
$coreStderrPath = $null
$coreVersion = $version
$ruleFileCount = 0
$ruleFiles = @()
$targetCount = 0
$report = $cliReport
$parseError = $cliParseError

if ($null -eq $cliReport -or $cliExit -ne 0) {
    if (Test-Path $cliRawResults) {
        Copy-Item -LiteralPath $cliRawResults -Destination (Join-Path $rawDirectory "sast-cli-failed-output.txt") -Force
    }
    [ordered]@{
        command = "uvx $($uvxArgs -join ' ') scan --config $ruleset --metrics off --json --output evidence/part-1a/raw/sast-cli-output.json src"
        exitCode = $cliExit
        validJsonOutput = ($null -ne $cliReport)
        parseError = $cliParseError
    } | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $rawDirectory "sast-cli-status.json")

    # On this Windows host, Semgrep's JSON formatter cannot use the core RPC
    # transport. Ask the same pinned CLI to materialize its rules and targets,
    # then run the bundled Semgrep Core directly and capture its JSON output.
    $targets = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot "src") -Filter "*.mjs" -File | ForEach-Object { $_.FullName })
    $dumpArguments = $uvxArgs + @(
        "scan", "--config", $ruleset, "--x-rule-validation=none", "--x-parmap",
        "--metrics=off", "--jobs", "1", "--text", "--dump-command-for-core"
    ) + $targets
    $dumpOutputPath = Join-Path $rawDirectory "sast-core-plan.txt"
    $dumpOutput = @(& $uvx @dumpArguments 2>&1)
    $dumpExit = $LASTEXITCODE
    $dumpOutput | Out-String | Set-Content -Encoding utf8 $dumpOutputPath

    $userDataDirectory = Join-Path $env:XDG_CONFIG_HOME ".semgrep"
    $ruleFiles = @(Get-ChildItem -LiteralPath $userDataDirectory -Filter "semgrep_rules_*.json" -File -ErrorAction SilentlyContinue | Sort-Object Name)
    $targetFile = Join-Path $userDataDirectory "semgrep_targets.txt"
    $ruleFileCount = $ruleFiles.Count
    if (Test-Path $targetFile) {
        $targetDocument = Get-Content -Raw $targetFile | ConvertFrom-Json
        $targetCount = @($targetDocument.targets).Count
    }

    $coreCandidates = @(
        Get-ChildItem -LiteralPath (Join-Path $env:UV_CACHE_DIR "archive-v0") -Directory -ErrorAction SilentlyContinue |
            ForEach-Object {
                $candidate = Join-Path $_.FullName "Lib\site-packages\semgrep\bin\semgrep-core.exe"
                if (Test-Path $candidate) { Get-Item -LiteralPath $candidate }
            } |
            Sort-Object LastWriteTime -Descending
    )
    $core = $coreCandidates | Select-Object -First 1
    $coreStderrPath = Join-Path $rawDirectory "sast-core-stderr.txt"
    if ($dumpExit -eq 0 -and $core -and $ruleFiles.Count -gt 0 -and (Test-Path $targetFile)) {
        $coreArguments = @("-json_nodots")
        foreach ($ruleFile in $ruleFiles) {
            $coreArguments += @("-rules", $ruleFile.FullName)
        }
        $coreArguments += @(
            "-use_parmap", "-j", "1", "-targets", $targetFile,
            "-timeout", "5", "-timeout_threshold", "3", "-max_memory", "0", "-fast"
        )
        & $core.FullName @coreArguments 1> $rawResults 2> $coreStderrPath
        $coreExit = $LASTEXITCODE
        try {
            $report = Get-Content -Raw $rawResults | ConvertFrom-Json
            $parseError = $null
        } catch {
            $report = $null
            $parseError = $_.Exception.Message
        }
        $executionMode = "Semgrep Core 1.185.0 standalone JSON fallback"
    } else {
        $coreExit = if ($dumpExit -ne 0) { $dumpExit } else { 1 }
        $report = $null
        $parseError = "The local Semgrep CLI did not produce core rule and target files for the fallback."
    }
}

$findingCount = if ($null -ne $report) { @($report.results).Count } else { -1 }
$errorCount = if ($null -ne $report) { @($report.errors).Count } else { -1 }
$rulesRunCount = if ($null -ne $report -and $null -ne $report.rules_by_engine) { @($report.rules_by_engine).Count } else { -1 }
$scannedTargetCount = if ($null -ne $report -and $null -ne $report.paths.scanned) { @($report.paths.scanned).Count } else { -1 }
$ruleFileNames = @($ruleFiles | Select-Object -ExpandProperty Name)
$passed = ($null -ne $report -and $coreExit -eq 0 -and $findingCount -eq 0 -and $errorCount -eq 0)
if ($executionMode -eq "Semgrep CE CLI JSON") {
    $passed = ($null -ne $report -and $cliExit -eq 0 -and $findingCount -eq 0 -and $errorCount -eq 0)
    if ($passed) {
        Copy-Item -LiteralPath $cliRawResults -Destination $rawResults -Force
    }
}

$metadata = [ordered]@{
    scanner = "Semgrep Community Edition"
    version = $version
    package = $semgrepPin
    ruleset = $ruleset
    scannedPath = "src"
    executionMode = $executionMode
    cliJsonExitCode = $cliExit
    coreExitCode = $coreExit
    ruleFileCount = $ruleFileCount
    rulesRunCount = $rulesRunCount
    targetCount = $targetCount
    scannedTargetCount = $scannedTargetCount
    generatedRuleFiles = $ruleFileNames
    startedAtUtc = $startedAt
    finishedAtUtc = [DateTime]::UtcNow.ToString("o")
}
$metadata | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $metadataPath
$status = [ordered]@{
    command = if ($executionMode -eq "Semgrep CE CLI JSON") {
        "uvx $($uvxArgs -join ' ') scan --config $ruleset --metrics off --json --output evidence/part-1a/raw/sast.json src"
    } else {
        "Semgrep Core 1.185.0 -json_nodots with rules from p/javascript and explicit src/*.mjs targets"
    }
    exitCode = if ($passed) { 0 } else { if ($coreExit -ne 0) { $coreExit } else { $cliExit } }
    cliJsonExitCode = $cliExit
    coreExitCode = $coreExit
    findingCount = $findingCount
    errorCount = $errorCount
    rulesRunCount = $rulesRunCount
    scannedTargetCount = $scannedTargetCount
    passed = $passed
    executionMode = $executionMode
    parseError = $parseError
}
$status | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $statusPath
if (-not $passed) { exit 1 }
exit 0
