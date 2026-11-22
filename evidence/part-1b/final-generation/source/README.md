# Natural Language Reminder Agent — Part 1B

Part 1B is an independent Node.js CLI and non-deterministic evaluation harness for the BITS Pilani Assignment 1. It returns a reminder proposal, asks for clarification, or rejects an unsupported action. It does not schedule or send reminders and does not import Part 1A application code.

## Requirements and install

- Windows PowerShell
- Node.js 24
- pnpm 11.25.0
- An OpenAI-compatible Chat Completions endpoint supporting JSON mode for live model evaluation

From this directory:

    pnpm install --frozen-lockfile

The project-local pnpm store is configured in pnpm-workspace.yaml. Ajv 8.20.0, ajv-formats 3.0.1, @js-temporal/polyfill 0.5.1, ESLint 10.14.0, and @eslint/js 10.0.1 are pinned in the lockfile.

## Run and validate

    pnpm test
    pnpm lint
    pnpm sast
    pnpm harness

The test suite uses Node's built-in test runner. It exercises the CLI child-process boundary and uses loopback mock providers only for deterministic protocol tests. Mock-provider results are not substituted for live model evaluation.

The live harness reads AI_BASE_URL, AI_MODEL, and AI_API_KEY from the current process environment. Set them through an approved local environment manager; do not put credentials in source, fixtures, evidence, or command logs. For Ollama on loopback, use its local OpenAI-compatible endpoint and an installed local model. If a local server requires the client API-key field, use only a non-secret placeholder in that process; never use or publish a hosted credential for this local run.

The dataset contains 20 synthetic cases: 18 model-evaluated cases and two deterministic invalid-input cases. The independent harness invokes the CLI as a child process, then checks the approved schema, invariants, guardrails, semantic rubric, aggregation thresholds, and evidence. The fixed thresholds are documented in the approved specification and are not relaxed to obtain a passing result.

## Recorded validation and known limitations

- Frozen pnpm install completed successfully with the checked-in lockfile.
- The installed Ajv and Temporal packages compiled both Draft 2020-12 contracts and parsed the timestamp check.
- Unit/provider suite: 46 passed, 0 failed. ESLint: passed.
- Qwen2.5 0.5B local run: INCONCLUSIVE after one provider timeout; 17 outputs were invalid.
- Qwen2.5 1.5B local run: FAIL; all 18 model outputs were rejected as non-objects.
- Qwen2.5 3B before prompt repair: FAIL; all 18 outputs were rejected as non-objects.
- Qwen2.5 3B after the prompt explicitly listed the seven required output keys: FAIL; 2/18 outputs passed schema and invariant checks, semantic mean was 0.111, and the minimum was 0. The dataset and thresholds were unchanged.
- Semgrep CE 1.185.0 standard CLI failed before analysis because of a Windows Core RPC socketpair error. The standalone Core fallback ran the same 68 p/javascript rules over 33 Part 1B source, harness, and test files with zero findings and zero engine errors. Both the standard CLI failure and fallback evidence are preserved.

See ../evidence/part-1b/harness-log.md and ../evidence/part-1b/raw/ for command output, exit codes, model run IDs, and failures. The pre-implementation Spec Kit Analyze review is not evidenced; the implementation checklist records this gap.

## Student-authored sections

The run narrative, reflection answers, and final Human Review decision in ../evidence/part-1b/harness-log.md are reserved for the student. No reflection or human decision has been generated.

## Scope and privacy

Every model result is a proposal requiring user review. Calendar writes, reminder persistence, notification delivery, messaging, calls, and other external actions are out of scope. Real API credentials must remain in local environment variables or a secret manager and must never be committed.