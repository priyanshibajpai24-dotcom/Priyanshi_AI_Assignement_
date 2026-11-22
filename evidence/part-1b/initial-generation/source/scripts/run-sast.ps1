$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Write-Output 'Tool: Semgrep Community Edition CLI'
Write-Output 'Ruleset: auto (Semgrep managed default ruleset)'
Write-Output ('Target: '+$projectRoot)
$semgrep=Get-Command semgrep -ErrorAction SilentlyContinue
if(-not $semgrep){
 Write-Output 'Status: TOOL_UNAVAILABLE'
 Write-Output 'Semgrep CE executable was not found on PATH; no scan was run.'
 exit 2
}
$version=& semgrep --version 2>&1
if($LASTEXITCODE -ne 0){Write-Output 'Status: TOOL_ERROR';Write-Output 'Semgrep version check failed.';exit 2}
Write-Output ('Version: '+($version -join ' '))
& semgrep scan --config auto --json --metrics off --timeout 60 $projectRoot
$scanCode=$LASTEXITCODE
if($scanCode -eq 0){Write-Output 'Status: SCAN_COMPLETE_NO_FINDINGS';exit 0}
if($scanCode -eq 1){Write-Output 'Status: SCAN_COMPLETE_WITH_FINDINGS';exit 1}
Write-Output ('Status: SCAN_ERROR exit='+$scanCode)
exit $scanCode
