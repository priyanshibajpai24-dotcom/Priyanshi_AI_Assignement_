# Natural Language Reminder Agent — Part 1B

Part 1B is an independent Node.js CLI and non-deterministic evaluation harness for the BITS Pilani Assignment 1. It returns a reminder proposal, asks for clarification, or rejects an unsupported action. It does not schedule or send reminders and does not import Part 1A application code.

## Requirements and install

- Windows PowerShell
- Node.js 24
- pnpm 11.25.0
- A project-local Ollama runtime for a local no-key interactive run, or an OpenAI-compatible Chat Completions endpoint for hosted live evaluation

From this directory:

    pnpm install --frozen-lockfile

The project-local pnpm store is configured in pnpm-workspace.yaml. Ajv 8.20.0, ajv-formats 3.0.1, @js-temporal/polyfill 0.5.1, ESLint 10.14.0, and @eslint/js 10.0.1 are pinned in the lockfile.

## Run and validate

    pnpm test
    pnpm lint
    pnpm sast
    pnpm harness

For a local interactive proposal flow, install Ollama once and run:

    pnpm start:local

This starts the project-local Ollama runtime on loopback when needed, downloads the default `qwen3.5:2b` model when missing, and opens an interactive request prompt. The local model uses Ollama's OpenAI-compatible Chat Completions endpoint; no hosted API key is needed. The program returns a proposal and does not save or schedule a reminder. By default, the runtime, model cache, and Ollama profile/signing key are kept in the ignored root `.tools/` directory so the local setup stays with this project. The model download is about 2.7 GB; leave extra disk space for the runtime and cache. The root `pnpm client-demo` command installs missing dependencies and the verified portable runtime automatically.

The test suite uses Node's built-in test runner. It exercises the CLI child-process boundary and uses loopback mock providers only for deterministic protocol tests. Mock-provider results are not substituted for live model evaluation.

The live harness defaults to the OpenAI-compatible provider. For the local model, start `pnpm start:local` once to start Ollama, then set `AI_PROVIDER=ollama-openai-compatible`, `AI_BASE_URL=http://127.0.0.1:11434/v1`, and `AI_MODEL=qwen3.5:2b` before running `pnpm harness`. The local adapter uses OpenAI-compatible Chat Completions JSON mode and disables hidden reasoning for bounded responses. To use a hosted OpenAI-compatible provider, set `AI_PROVIDER=openai-compatible`, `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`. Never put real credentials in source, fixtures, evidence, or command logs.

The dataset contains 20 synthetic cases: 18 model-evaluated cases and two deterministic invalid-input cases. The independent harness invokes the CLI as a child process, then checks the approved schema, invariants, guardrails, semantic rubric, aggregation thresholds, and evidence. The fixed thresholds are documented in the approved specification and are not relaxed to obtain a passing result.

## Recorded validation and known limitations

- Frozen pnpm install completed successfully with the checked-in lockfile.
- The installed Ajv and Temporal packages compiled both Draft 2020-12 contracts and parsed the timestamp check.
- Unit/provider suite after local provider, retry, and interactive CLI changes: 50 passed, 0 failed. ESLint: passed.
- Qwen2.5 0.5B local run: INCONCLUSIVE after one provider timeout; 17 outputs were invalid.
- Qwen2.5 1.5B local run: FAIL; all 18 model outputs were rejected as non-objects.
- Qwen2.5 3B before prompt repair: FAIL; all 18 outputs were rejected as non-objects.
- Qwen2.5 3B after the prompt explicitly listed the seven required output keys: FAIL; 2/18 outputs passed schema and invariant checks, semantic mean was 0.111, and the minimum was 0. The dataset and thresholds were unchanged.
- Semgrep CE 1.185.0 standard CLI failed before analysis because of a Windows Core RPC socketpair error. The standalone Core fallback ran the same 68 p/javascript rules over 33 Part 1B source, harness, and test files with zero findings and zero engine errors. Both the standard CLI failure and fallback evidence are preserved.
- The Qwen3.5 0.8B live run on 2026-11-18 failed the unchanged thresholds: schema rate 0.222, invariant rate 0.167, one guardrail violation, and mean semantic score 0.144. This failure is preserved. The Qwen3.5 2B model and OpenAI-compatible local adapter are being evaluated; no passing live result is claimed until a full run meets the unchanged thresholds.

See ../evidence/part-1b/harness-log.md and ../evidence/part-1b/raw/ for command output, exit codes, model run IDs, and failures. The pre-implementation Spec Kit Analyze review is not evidenced; the implementation checklist records this gap.

## Student-authored sections

The run narrative, reflection answers, and final Human Review decision in ../evidence/part-1b/harness-log.md are reserved for the student. No reflection or human decision has been generated.

## Scope and privacy

Every model result is a proposal requiring user review. Calendar writes, reminder persistence, notification delivery, messaging, calls, and other external actions are out of scope. Real API credentials must remain in local environment variables or a secret manager and must never be committed.
