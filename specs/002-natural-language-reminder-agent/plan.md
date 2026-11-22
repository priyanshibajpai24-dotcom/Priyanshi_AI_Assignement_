# Implementation Plan: Natural Language Reminder Agent

**Branch**: 002-natural-language-reminder-agent (logical feature ID only; no Git branch or repository will be created)  
**Date**: 2026-11-14  
**Spec**: specs/002-natural-language-reminder-agent/spec.md  
**Status**: Student-approved on 2026-11-14; implementation in progress.

## Summary

Build a separate local Part 1B CLI application that sends a natural-language reminder request and fixed time context to a configurable OpenAI-compatible Chat Completions endpoint. It returns a structured proposal, clarification, or unsupported response. It never schedules reminders or invokes tools. An independent child-process evaluation harness runs the planned 20-case dataset, checks output schema and invariants, scores case-specific semantic criteria that allow paraphrases, and reports PASS, FAIL, or INCONCLUSIVE under the threshold already declared in the approved specification.

The project is implemented under Part-1B in the user-selected local folder, using original source, prompt, fixtures, decomposition, and evidence for this student's project. Part 1A application files remain unchanged. The user later authorized publishing both parts to the specified GitHub repository; this changes the publication target, not the application scope.

## Technical Context

**Language/Version**: JavaScript ESM on Node.js 24  
**Package manager**: pnpm 11.25.0 with a frozen lockfile  
**Primary dependencies**: @js-temporal/polyfill 0.5.1, Ajv 8.20.0 Draft 2020-12 implementation, ajv-formats 3.0.1, ESLint 10.14.0, @eslint/js 10.0.1  
**Provider integration**: Node global fetch to configured OpenAI-compatible Chat Completions endpoint; no provider SDK and no tool definitions  
**Storage**: No application database or persistent reminders. Synthetic dataset and run evidence are local JSON files.  
**Testing**: Node built-in node:test/assert, independent child-process CLI harness, JSON Schema validation, explicit invariant checks, case-specific weighted semantic rubric, ESLint, Semgrep CE.  
**Target platform**: Windows local development environment; compatible Node 24 environments where possible  
**Project type**: Standalone command-line agent and independent evaluation harness  
**Performance goals**: Bounded input and provider timeout; sequential 20-case evaluation; record latency. No throughput goal is specified.  
**Constraints**: Up to 4,000 request-text characters, 16,384 serialized input bytes, up to 50 context reminders. One model call per valid model-evaluated case. No automatic retry in scored runs. No secret persistence. No calendar, notification, messaging, or phone side effects.  
**Scale/Scope**: One student's local assignment project; 20 synthetic cases; no multi-user service.  
**Dependency policy**: Lock all direct and transitive dependencies. Do not add SDKs, databases, frontend frameworks, or semantic-judge model calls without an approved spec change.

## Constitution Check — before design

1. Contract-first behavior: PASS. The approved spec and machine-readable input/output contracts define accepted data and decisions before code.
2. Durable JSON persistence: N/A. Part 1B has no application-owned persistent reminder store. Evaluation artifacts are append/new-run evidence.
3. Independent verification: PASS WITH DESIGN GATE. Harness starts the CLI in a child process and observes process I/O; it does not import implementation modules. It performs separate schema, invariant, semantic, and aggregate layers.
4. Safe local service: PASS. No listening service; loopback remains available only for isolated mock-provider tests. Production provider calls use the configured endpoint. Credentials are environment-only; output is redacted.
5. Small, traceable changes: PASS. Node ESM and built-ins cover core runtime; added dependencies have a narrow need and will be pinned. Tasks must trace to requirements.
6. Governance: PASS. The approved Part 1B spec scopes one external model endpoint. The student approved the implementation plan on 2026-11-14. Student-authored harness log, reflection, and final human ACCEPT/REJECT remain reserved.

## Approved behavior and threshold carried into implementation

Do not change the approved output schema, request limits, intent set, dataset categories, or threshold during implementation merely to improve results. The final gate remains:

- 100% structural/schema validity on model outputs.
- 100% invariant validity on model outputs.
- Zero guardrail violations.
- No provider infrastructure errors in a PASS run.
- Each model-evaluated case has semantic rubric score at least 0.75.
- Unweighted mean semantic score across model-evaluated cases is at least 0.85.
- Invalid-input cases have a separate deterministic pre-provider validation outcome and are not assigned a semantic score because no model output exists. They must pass their declared rejection property.
- Any future threshold or requirement change must be made in Spec Kit artifacts and approved before implementation/test changes or rerun.

## Planned architecture

### Application path

1. CLI parses one JSON request from stdin or an explicit documented input path; validates byte/character limits, request schema, timestamps, timezone IDs, duplicate reminder IDs, and unknown fields before a provider request.
2. Prompt builder places system policy and untrusted request/context data in separate messages. It explicitly tells the model to return only JSON following the approved shape, treats embedded instructions as data, and requests no tools/actions.
3. Provider adapter reads AI_BASE_URL, AI_MODEL, and AI_API_KEY from process environment. It sends Chat Completions JSON mode with a bounded timeout and no automatic scored-run retry. It never prints authorization data or stores credentials.
4. Response parser rejects non-2xx, empty/refusal/unusable content, invalid JSON, and oversized provider output with categorized errors. The response is not repaired into a pass. CLI exit codes are stable: 0 accepted structured output, 2 invalid input, 3 provider/configuration/network error, 4 invalid model JSON, and 5 output schema/invariant violation; error details are JSON on stderr and never include stack traces or secrets.
5. Output contract validation and cross-field/time/target/grounding invariants run before the CLI returns the structured output. No real-world action is taken.

### Independent harness path

1. Load and hash the fixed evaluation dataset and approved schemas.
2. For each case, spawn the application CLI as a child process with bounded time and sanitized environment. Observe stdout, stderr, exit status, and timing only.
3. Invalid-envelope/context cases must be rejected before provider calls. Valid model cases use the real configured provider and capture actual generated output; no mocked final outputs.
4. Run structural validation, invariant/property checks, case-specific semantic rubric, guardrail checks, and redaction checks independently.
5. Write per-case and aggregate JSON to a new run-specific raw evidence directory. Preserve failed cases and provider errors.
6. Compute status without changing the fixed threshold. PASS only if all applicable gates pass; FAIL for observed behavior violations; INCONCLUSIVE for provider/configuration/network infrastructure blockers.

### Planned structure

Part-1B/
- package.json, pnpm-lock.yaml, pnpm-workspace.yaml
- README.md
- .gitignore (exclude node_modules, local secret material, temporary outputs)
- src/cli.mjs
- src/config.mjs
- src/input-validator.mjs
- src/prompt-builder.mjs
- src/provider.mjs
- src/reminder-agent.mjs
- prompts/reminder-agent-v1.md
- evals/dataset.json
- evals/semantic-rubric.json (or rubric embedded in dataset; one canonical source)
- harness/run.mjs
- harness/schema-validator.mjs
- harness/invariant-checks.mjs
- harness/semantic-evaluator.mjs
- harness/aggregate.mjs
- tests/unit/
- tests/provider/ (local loopback mock protocol tests only)
- scripts/run-sast.ps1
- evidence/part-1b/harness-log.md
- evidence/part-1b/initial-generation/
- evidence/part-1b/final-generation/
- evidence/part-1b/raw/<run-id>/

Spec Kit documents remain in specs/002-natural-language-reminder-agent. Exact source module boundaries may be refined in tasks, but the CLI/harness boundary and independent checks may not be removed.

## Requirement-to-workstream trace

| Requirements | Planned workstream |
|---|---|
| FR-001, FR-004 to FR-008 | Request parsing, prompt design, Temporal-backed time validation, decision invariants, semantic cases |
| FR-002, FR-009, FR-010 | Provider/config adapter, no-tool boundary, prompt-injection defenses, secret redaction |
| FR-003, FR-005, FR-006, FR-007 | Output schemas, response parser, cross-field and temporal invariants |
| FR-011 | Input validation and deterministic invalid-input cases |
| FR-012 | Typed provider/parse/schema/invariant/semantic failures and INCONCLUSIVE status rules |
| FR-013, SC-001 | 20-case synthetic dataset and coverage audit |
| FR-014 to FR-020, SC-002 to SC-005 | Independent evaluation stages, rubric, fixed aggregate gate, structured results |
| FR-021, SC-006, SC-007 | Initial/final generation archives, secret scan, evidence log scaffold, student-only narrative and human decision |

## Planned implementation checklist

This is a plan checklist, not a claim that work has been completed.

- [ ] Approve the Part 1B implementation plan before code changes.
- [ ] Create the independent Part-1B package and pin runtime/tool dependencies in a frozen lockfile.
- [X] Create a requirement trace matrix and Spec Kit tasks after plan approval.
- [ ] Implement request limits, JSON Schema validation, timezone validation, duplicate-ID rejection, and controlled pre-provider errors.
- [ ] Implement prompt policy and provider adapter with environment-only configuration, JSON mode, bounded timeout, no tools, no scored-run retries, and secret-safe errors.
- [ ] Implement output parsing and typed provider/format/application errors without auto-repairing outputs into passes.
- [ ] Implement all cross-field, future-time, IANA-zone, DST, snooze, target-ID, source-grounding, unsupported-action, and no-side-effect checks.
- [ ] Author 20 behaviorally distinct synthetic cases and explicit per-case ground truth, expected properties, and weighted semantic criteria.
- [ ] Implement independent child-process harness stages for schema, invariants, semantic criteria, guardrails, aggregation, and structured failure evidence.
- [ ] Add unit and local mock-provider tests, including malformed data, provider error classes, timeout, redaction, DST, injection, and no-tool behavior.
- [ ] Capture the first complete source generation and its hash manifest before repair iterations.
- [ ] Run and preserve genuine unit, evaluation, lint, SAST, README/quickstart, and secret-redaction results; preserve failures and repairs.
- [ ] Repair only against approved requirements; do not weaken tests, rubrics, thresholds, or specs to force PASS.
- [ ] Run final live dataset only with a valid locally configured provider; record INCONCLUSIVE if provider access is unavailable.
- [ ] Capture the final source generation, raw results, dataset/spec hashes, and verify no credentials are present.
- [ ] Leave student run-log narrative, reflection, and final human ACCEPT/REJECT for the student.

## Validation strategy and planned commands

Final script names will be confirmed by package.json. Intended separate checks:

- pnpm test: deterministic unit, contract, and local mock-provider tests.
- pnpm harness: actual 20-case evaluation with real provider for valid model cases; invalid input cases make no provider call.
- pnpm lint: ESLint.
- pnpm sast: pinned Semgrep scan with transparent raw output and explicit target/rule metadata.
- pnpm install --frozen-lockfile: reproducible installation.
- README quickstart smoke: run one synthetic request against configured provider and verify safe output, only after local credentials are available.
- Evidence integrity check: verify archive manifests and run-result hashes; scan project evidence for key patterns without printing secret values.

No test/evaluation result is asserted in this planning artifact. Every execution result will be captured from actual commands.

## Risks and controls

| Risk | Control |
|---|---|
| OpenAI-compatible vendor does not support JSON mode or exact route | Validate preflight, categorize incompatibility as INCONCLUSIVE, do not silently change protocol. |
| Model misinterprets relative time, target, or ambiguity | Frozen reference context, strict time/target invariants, weighted case rubrics, and repair with unchanged gates. |
| DST conversion silently chooses an instant | Use explicit reject disambiguation in deterministic helpers; ambiguity/gap cases expect clarification. |
| Secrets leak in prompts/logs/error text | Environment-only key, sanitized child environment, output/error redaction, scanning, no key in fixtures or archives. |
| Harness accidentally tests internal helpers rather than app behavior | Harness invokes CLI as an external process and imports only contract/test utilities. |
| Model outage blocks final evaluation | Preserve honest INCONCLUSIVE result; do not call mocked responses final evidence. |
| Requirements are distorted during repairs | Spec Kit change-control; unchanged approved threshold and dataset unless student approves formal spec update. |
| User initially requested local-only storage, then explicitly requested a public GitHub submission | Preserve the local working folder and publish reviewable assignment source/evidence to the named repository, excluding credentials and local tool/model artifacts. |

## Constitution re-check after design

- Contract-first and requirement traceability: PASS.
- No application persistence or user-data writes: PASS.
- Independent black-box evaluation boundary: PASS.
- Credential safety and proposal-only behavior: PASS.
- Added external model endpoint: explicitly scoped by the approved Part 1B feature spec; no other external service added.
- Student review gates and authored log/reflection/human decision: PASS.
- Local development under the requested folder: PASS. The later request to publish both parts to the named repository supersedes the earlier no-GitHub instruction.

## Approval gate

Student review required: approve this plan before any Part 1B application, harness, dataset, or implementation test code is written. Following approval, create Spec Kit tasks, run analyze/consistency checks, then implement incrementally. The student retains the human log, reflection, and final acceptance decision.
