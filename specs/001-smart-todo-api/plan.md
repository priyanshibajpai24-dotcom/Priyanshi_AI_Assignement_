# Implementation Plan: Smart Todo Local Service

**Branch**: `001-smart-todo-api` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification for Part 1A.

## Summary

Build a local-only Smart Todo REST API that implements task CRUD, durable JSON persistence, validated tag filters, priority sorting, and the approved status lifecycle. Use Node.js 24 and built-in HTTP, filesystem, and test-runner APIs, with no third-party runtime dependency. Keep the deterministic evaluation harness in a separate `harness/` directory; it starts the app as a child process, sends HTTP requests, and uses a temporary data file without importing application modules. Run lint and SAST independently and preserve unedited machine results. The design is different from the earlier Python command-line implementation; this folder contains no copied application code.

## Technical Context

**Language/Version**: JavaScript ES modules on Node.js 24; installed version is 24.22.1.

**Primary Dependencies**: Runtime uses Node.js built-ins only. Package manager is pnpm 11.25.0, configured for a project-local .pnpm-store and the hoisted linker due to Windows symlink restrictions. Development lint dependencies are ESLint 10.14.0 and `@eslint/js` 10.0.1, pinned by `pnpm-lock.yaml`. SAST uses Semgrep Community Edition 1.185.0 via the locally available `uv` tool; no login or token is required.

**Storage**: A versioned JSON envelope in the configured data file. Default path is `data/tasks.json` under the project root; `SMART_TODO_DATA_FILE` overrides it for local use and for isolated harness runs.

**Testing**: Node's built-in `node:test` for focused unit checks, plus a separate deterministic black-box harness using HTTP against a spawned service and a temporary data directory. ESLint and Semgrep have separate commands and results.

**Target Platform**: Windows desktop, loopback interface only (`127.0.0.1`). No external network requests are part of app or harness behavior.

**Project Type**: One local REST service and its independent evaluation harness.

**Performance Goals**: A filtered and priority-sorted response for 100 stored tasks completes within the specification's one-second limit on the user's local test machine.

**Constraints**: Body limit 65,536 bytes; one service instance; serialized mutations; no request-selected storage path; no credentials; every API response is JSON; rejected requests must not mutate persistent data. Any persistence strategy must preserve valid prior data on failure and be exercised on Windows before claiming the guarantee.

**Scale/Scope**: One local operator, one service process, up to 100 tasks in the required timing check. Browser UI, accounts, remote access, cloud sync, notifications, and integrations are excluded.

## Constitution Check

The constitution was ratified by the student on 2026-11-13 and its principles govern this implementation. The plan is approved; implementation begins after task generation and a read-only cross-artifact analysis with no unresolved blocking gaps.

| Principle | Plan response | Gate |
|---|---|---|
| Contract-first REST behavior | Define HTTP request/response/status contracts before code; keep ordering and response envelopes deterministic. | Pass |
| Durable validated JSON | Validate before mutation; serialize writes; persist a candidate state to a same-directory temporary file before replacement; retain prior valid data on failure. | Pass, subject to Windows replacement validation before claiming completion |
| Independent verification | Harness launches the process and exercises only HTTP with isolated temporary storage; it does not import app internals. | Pass |
| Safe local service | Bind loopback; validate fields and byte count; return generic storage errors without paths or stacks; keep credentials out of source and evidence. | Pass |
| Small traceable changes | Use Node built-ins at runtime; map implementation and harness cases to FR/SC IDs; keep tests and thresholds unchanged. | Pass |

**Constitution gate status**: Adopted on 2026-11-13. No architectural conflict identified; Windows replacement behavior remains a validation gate before completion.

## Design Decisions

- Use Node's `node:http` directly instead of a framework because the API is small, local, and has no UI or external integrations.
- Use built-in `fetch`, `assert`, and `node:test` for test work; the independent harness has its own process lifecycle and HTTP-only boundary.
- Use `SMART_TODO_DATA_FILE` for trusted local configuration. Never accept a path in a request.
- Store a monotonic `nextId` in the JSON envelope so deletion and restart cannot cause ID reuse.
- Normalize tags by trimming and case-folding for comparisons while preserving the validated submitted spelling in task records.
- Order unfiltered tasks by ID ascending; apply priority order and ID tie-break only when the client requests priority sorting.
- For writes, serialize mutation operations and write a complete candidate document to a uniquely named temporary file in the data file's directory before replacing the data file. On Windows, verify replacement behavior and injected failure handling against the approved preservation requirement. If the native approach cannot meet it, stop and request a design/spec review rather than relaxing the requirement.
- Use Semgrep CE's local scan with an explicit JavaScript ruleset, not automatic project detection; record scanner version, ruleset, exit status, finding count, and raw JSON. A successful process exit alone is not treated as a clean scan.
- Keep test, lint, and SAST outcomes separate. Preserve first-pass and final source snapshots with SHA-256 manifests. Do not write reflection responses or narrative harness-log entries; leave student-authored fields blank.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-todo-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md                 # Generated in the tasks phase after plan approval
```

### Source Code (repository root)

```text
src/
├── server.mjs               # Config, startup, loopback bind, graceful close
├── http-api.mjs             # Request parsing, routes, JSON responses
├── task-service.mjs         # CRUD, filtering, sorting, transition rules
├── validation.mjs           # Request and stored-data validation
├── json-store.mjs           # Versioned envelope, serialized atomic persistence
└── errors.mjs               # Stable API error types and codes

harness/
├── run.mjs                  # Independent process-and-HTTP evaluation runner
└── cases.mjs                # Deterministic acceptance cases and expected outcomes

tests/
└── unit/
    ├── validation.test.mjs
    └── task-service.test.mjs

evidence/part-1a/
├── initial-generation/      # Immutable first-pass source archive and hash manifest
├── final-generation/        # Final source archive and hash manifest
├── raw/                     # Unedited test, harness, lint, and SAST outputs
└── harness-log.md           # Blank student-authored narrative scaffold

README.md                    # Local installation, operation, and validation guide
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
eslint.config.mjs
```

**Structure Decision**: Single Node.js project with a clearly separate black-box harness. No frontend, remote service, GitHub workflow, or application framework is part of the application design. The user initially requested local-only delivery, then later authorized publishing both assignment parts to the named GitHub repository. This changes publication only; the Part 1A app remains loopback-only. A video is not included in this code repository.

## Validation and Evidence Strategy

1. Run focused unit tests and record the original machine output.
2. Run the independent HTTP harness against a clean temporary data file. Cases cover each acceptance scenario, invalid inputs, body limit, tag AND semantics, sorting ties, all allowed and denied transitions, restart durability, and failed persistence without state loss.
3. Run lint and SAST separately with explicit versions/configuration; preserve raw outputs and machine-readable results.
4. Save the initial-generation source archive before repairs prompted by actual checks. Never overwrite it. After all repairs and reruns, save final source and hashes separately.
5. Record failures, repairs, and reruns as raw machine evidence. The student writes narrative log entries and makes the final human accept/reject decision.
6. Do not claim a pass where a required command did not run or a tool failed to initialize.

## Risks and Open Validation Points

- Node documents file operations but does not promise cross-platform atomicity for every replacement scenario. The actual Windows rename/replace and failure behavior must be validated; a failing guarantee is a stop-and-review item.
- Semgrep's current Windows installation guidance labels support beta. Its pinned Community Edition wheel is available for Windows on PyPI, but the exact install and scan commands must be validated on this computer before the tool can be reported as working.
- Registry rules can change. Use an explicit JavaScript ruleset and capture the scanner/ruleset identity with raw JSON; avoid `--config=auto` and any credential-based service.
- The initial local-only delivery instruction was later superseded by the user's explicit request to publish both parts to the named AI_Assignment repository. No video artifact is included.

## Complexity Tracking

No constitution exception is proposed. If the Windows persistence test demonstrates that the approved durability guarantee cannot be met using the selected built-in APIs, implementation stops for a separate design review.


