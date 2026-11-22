# BITS Pilani Assignment 1 — Parts 1A and 1B

This local project folder contains two separately specified applications and their independent evaluation harnesses. It has not been published to GitHub or deployed to a public hosting service.

## Applications

### Part 1A — Smart Todo API

A loopback-only Node.js REST service with JSON-file persistence, validated task operations, and an independent deterministic HTTP harness. The harness launches the service as a child process and checks the public HTTP behavior without importing application modules.

### Part 1B — Natural Language Reminder Agent

A separate Node.js CLI that converts natural-language reminder requests into a proposal, a clarification request, or an unsupported-action result. It does not create reminders, send notifications, or perform other external actions. Its independent evaluation harness runs 20 synthetic cases, including 18 model cases and two deterministic input-rejection cases.

Part 1B does not import Part 1A source. The source, prompts, test fixtures, specifications, and evaluation datasets were developed separately for this project.

## Local client demo

On Windows, after installing Node.js 24 and pnpm 11.25.0, run `pnpm client-demo` from this repository root. The launcher installs missing locked dependencies, downloads and checksum-verifies the Ollama runtime into the ignored `.tools/` folder when needed, starts Part 1A with an isolated temporary database, seeds three demo tasks, downloads the local model on first use, starts Part 1B, and opens the Part 1A API in the browser. See [CLIENT-DEMO.md](CLIENT-DEMO.md) for setup, a recording walkthrough, and known boundaries. The first run needs internet access and several GB of free space. Part 1A remains loopback-only; this command does not deploy either application publicly.

## Repository layout

- src/, tests/, harness/, scripts/ — Part 1A application, tests, deterministic harness, and validation scripts.
- Part-1B/ — Part 1B application, provider adapter, prompts, independent harness, tests, dataset, and package files.
- specs/001-smart-todo-api/ and specs/002-natural-language-reminder-agent/ — Spec Kit specifications, plans, contracts, data models, quickstarts, tasks, and checklists.
- evidence/part-1a/ and evidence/part-1b/ — harness logs, raw command outputs, and preserved initial/final source-generation archives.
- evidence/project-validation/ — current root-level test, lint, harness outputs and the test-discovery failure/repair record.

## Requirements

- Windows PowerShell
- Node.js 24
- pnpm 11.25.0

The two applications have separate package manifests and lockfiles. Run each install from its own project directory.

## Install and validate Part 1A

From the repository root:

    pnpm install --frozen-lockfile
    pnpm test
    pnpm harness
    pnpm lint
    pnpm sast

The application binds only to 127.0.0.1. The deterministic harness uses isolated temporary storage. See evidence/part-1a/harness-log.md for recorded outcomes and limitations.

## Install and validate Part 1B

From the repository root:

    Set-Location Part-1B
    pnpm install --frozen-lockfile
    pnpm test
    pnpm lint
    pnpm harness
    pnpm sast

For a no-hosted-key local model, `pnpm start:local` starts the Part 1B interactive CLI through Ollama's OpenAI-compatible Chat Completions endpoint (default model `qwen3.5:2b`) and downloads that model on first use. For evaluation, set `AI_PROVIDER=ollama-openai-compatible`, `AI_BASE_URL=http://127.0.0.1:11434/v1`, and `AI_MODEL=qwen3.5:2b` before `pnpm harness`. The hosted OpenAI-compatible provider remains available with `AI_PROVIDER=openai-compatible`; its live harness requires `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`. Never commit credentials or place them in command transcripts, evidence, fixtures, or source files.

## Recorded validation status

Part 1A has a passing recorded unit suite (20 tests), deterministic HTTP harness (18 cases), lint, and a Semgrep Core fallback that ran 68 p/javascript rules over six source files with zero findings and zero engine errors. The standard Semgrep CLI JSON path failed on the Windows Core RPC socketpair error; the fallback result and CLI failure are both preserved.

Part 1B has 52 passing unit/provider-boundary tests and passing ESLint. Previously recorded live results are preserved: Qwen2.5 0.5B was INCONCLUSIVE (one provider timeout); Qwen2.5 1.5B and 3B before prompt repair FAILed with 18 non-object outputs each; Qwen2.5 3B after prompt repair FAILed with 2/18 schema/invariant-valid outputs, semantic mean 0.111, and minimum 0. The Qwen3.5 0.8B run on 2026-11-18 also failed the unchanged thresholds (schema 0.222, invariant 0.167, one guardrail violation, semantic mean 0.144). The stronger Qwen3.5 2B model and compatible runtime are being tested; no live PASS is claimed yet. The standard Semgrep CLI hit the Windows socketpair error; the pinned Core fallback ran the same 68 JavaScript rules across 33 Part 1B source, harness, and test files with zero findings and zero engine errors.

The Part 1B Spec Kit files contain the approved feature and implementation artifacts. The pre-implementation Analyze review is not evidenced; see the implementation checklist. The evaluation thresholds remain unchanged.

## Student-owned work

The student run narrative, reflection answers, and final Human Review decision in each harness log are intentionally left for the student to complete after reviewing the raw evidence. No reflection answers or human acceptance decision are provided here.

## Evidence integrity and credentials

Initial and final code-generation snapshots include SHA-256 manifests. Raw command output and exit status files preserve actual runs, including failures and repairs. Local tools, package stores, caches, Ollama runtime/model files, installed dependencies, and generated runtime data are excluded from this repository. No real API credentials are included.
