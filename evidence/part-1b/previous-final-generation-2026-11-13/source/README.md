# Natural Language Reminder Agent — Part 1B

This is the local Part 1B CLI for the BITS Pilani Assignment 1. It turns a natural-language reminder request into a structured proposal, a clarification question, or an unsupported-action response. It does not schedule or send reminders.

Part 1B is separately authored and does not import Part 1A source. All work stays under the local project folder. No GitHub repository or remote is used.

## Requirements

- Windows 10/11 and PowerShell
- Node.js 24
- pnpm 11.25.0
- A configurable OpenAI-compatible Chat Completions endpoint supporting JSON mode for live evaluation
- Semgrep CE CLI for the SAST scan

## Dependency install status

The project pins Ajv 8.20.0, ajv-formats 3.0.1, and @js-temporal/polyfill 0.5.1, plus ESLint 10.14.0. The managed Codex terminal could not create pnpm's project-registry symlink (Windows EPERM), even with the pinned pnpm options recorded in raw evidence. Therefore a Part 1B frozen install and pnpm lockfile were not produced here. No lockfile is fabricated. The Ajv, ajv-formats, and Temporal polyfill packages are consequently unresolved in this terminal; the executed checks used the documented local contract and Intl fallbacks. The pinned dependency code paths still need verification after a successful install. In a regular Windows terminal with pnpm symlink support, run:

    pnpm install --lockfile-only
    pnpm install --frozen-lockfile

For this managed session, the actual tests were run directly with `node --test`; the local code has safe contract-validation fallback behavior until the pinned packages are installed. The cached Semgrep CE 1.185.0 CLI is available under .tools but not on PATH. The Part 1B runner now names the p/javascript ruleset and was executed with that CLI; semgrep-core failed rule validation with exit code 2, so no findings report was produced. See evidence/part-1b/raw/semgrep-scan-final-configured.txt. Resolve the engine failure and rerun SAST before submission. A final frozen-install verification is still required after generating the lockfile.

## Configure live evaluation

Set `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` in the current PowerShell process or a secret manager. Optional `AI_TIMEOUT_MS` is an integer from 1000 through 120000 and defaults to 30000. Never paste credentials into chat or save them in source, fixtures, command output, archives, or logs.

The CLI reads one JSON request from stdin. It validates input before loading provider configuration, makes one Chat Completions JSON-mode request per valid case, and returns one proposal-only JSON object. It has no tool definitions or external side effects.

## Commands

After dependencies and the lockfile are available:

    pnpm test
    pnpm lint
    pnpm sast
    pnpm harness

Commands verified in this managed environment:

    node --test
    node harness/run.mjs
    node ..\node_modules\eslint\bin\eslint.js .

The evaluation harness has 20 synthetic cases, invokes the CLI as a child process, performs independent schema/invariant/semantic checks, records safe per-case results, and applies the threshold written in the approved spec. A missing live provider configuration produces INCONCLUSIVE; loopback mocks are test-only and never replace the live model evaluation.

## Evidence and student-owned fields

Initial and final source generations and raw command/evaluation outputs belong under the sibling `evidence/part-1b` folder. The AI Technical Review is separately labeled in `evidence/part-1b/harness-log.md`. The student must write the run narrative and reflection and make the final human ACCEPT/REJECT decision. Those fields are intentionally left blank.

## Scope limitations

The agent only returns proposals. Calendar writes, reminder persistence, notification delivery, messaging, phone calls, and any other external action are out of scope. Wording can vary between provider runs; evaluation uses the approved structural, invariant, and semantic checks.
