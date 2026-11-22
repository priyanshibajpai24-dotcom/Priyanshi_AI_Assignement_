# Quickstart: Smart Todo Local Service

This guide records the Windows PowerShell commands validated for the local Part 1A implementation. Raw outcomes are preserved under `evidence/part-1a/raw/`.

## Prerequisites

- Windows PowerShell
- Node.js 24
- pnpm 11.25.0 or a compatible pnpm release
- `uv` for the pinned Semgrep Community Edition CLI

## Install

From the project root:

```powershell
pnpm install --frozen-lockfile
```

## Run locally

```powershell
pnpm start
```

The service binds only to `127.0.0.1`, defaults to port 3000, and uses `data/tasks.json`. To select a local data file for a PowerShell session:

```powershell
$env:SMART_TODO_DATA_FILE = (Join-Path (Get-Location) 'data\quickstart.json')
pnpm start
```

## Validate

Run each check separately so results remain attributable:

```powershell
pnpm test
pnpm harness
pnpm lint
pnpm sast
```

The unit suite and independent HTTP harness are run separately. Lint and SAST are separate checks. The Semgrep wrapper first attempts the standard CLI JSON output and preserves its result; if the Windows core RPC transport fails, it runs the pinned Semgrep Core directly against the same generated JavaScript rules and explicit source targets, then records both the CLI failure and direct-core JSON result. A failed command is never reported as a pass.

Machine outputs belong under `evidence/part-1a/raw/`. `evidence/part-1a/harness-log.md` is a student-authored narrative scaffold; the student fills it from the real run and makes the final human review decision.

## Performance check

The independent harness creates 100 tasks in isolated storage, requests tag filtering and priority ordering, verifies the complete ordered result, and measures the local request against the one-second success criterion. It excludes process startup from the request timing.
