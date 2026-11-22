# Part 1B Quickstart

## Prerequisites
- Windows PowerShell
- Node.js 24
- pnpm 11.25.0
- A live OpenAI-compatible Chat Completions JSON-mode endpoint for final evaluation

## Install
From `C:\Users\hp\Desktop\project Ai\Part-1B`, generate the lockfile and install exact dependencies:

    pnpm install --lockfile-only
    pnpm install --frozen-lockfile

The managed Codex terminal could not create pnpm's project registry symlink (EPERM), so this environment did not produce the Part 1B pnpm lockfile. The first command must be run in a Windows terminal with pnpm symlink support; preserve its actual result. As a result, Ajv, ajv-formats, and the Temporal polyfill were not resolved here; the executed checks used the local contract and Intl fallbacks. Verify the pinned dependency paths after a successful install.

## Live provider configuration
Set `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` in a secret-safe local environment. Do not store or print the API key. Optional `AI_TIMEOUT_MS` is 1000 to 120000 milliseconds; default 30000.

Example shape (replace values locally; do not commit them):

    $env:AI_BASE_URL = 'https://provider.example/v1'
    $env:AI_MODEL = 'your-model'
    $env:AI_API_KEY = '<your-secret>'

## Run
From Part-1B:

    pnpm test
    pnpm lint
    pnpm sast
    pnpm harness

For this managed session, direct commands were used where pnpm was blocked:

    node --test
    node harness/run.mjs
    node ..\node_modules\eslint\bin\eslint.js .

The harness uses the 20-case synthetic dataset. It makes a real model call for every valid case only when provider settings are configured. Invalid-envelope/time-zone cases are checked before any provider call. Provider failures produce INCONCLUSIVE. Never substitute loopback mock outputs for a live evaluation.

## CLI
The CLI accepts one request JSON object on stdin. Example request fields: requestId, requestText, context.referenceNow (RFC 3339 with offset), context.timeZone (IANA zone or null), and context.reminders (zero to 50 records). It emits one output JSON object on stdout; typed errors go to stderr with exit code 2 (input), 3 (configuration/provider), 4 (model JSON), or 5 (output schema/invariant).

## Evidence
Raw run files are written beneath `evidence/part-1b/raw/<run-id>`. Do not edit raw output. The AI Technical Review may be filled from actual results. The student must write the run narrative and reflection and make the final human ACCEPT/REJECT decision.

## Static analysis status
`pnpm sast` invokes `scripts/run-sast.ps1`. The cached Semgrep CE 1.185.0 CLI was run with the recorded p/javascript ruleset. semgrep-core failed rule validation with exit code 2, so no source findings report was produced. See evidence/part-1b/raw/semgrep-scan-final-configured.txt. Resolve the engine failure and rerun before submission.
