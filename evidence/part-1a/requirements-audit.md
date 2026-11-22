# Part 1A Requirements and Evidence Audit

**Scope:** Smart Todo application only (Part 1A). This audit was originally written before Part 1B began and before repository publication was authorized. As of 2026-11-15, both parts are included in the named GitHub repository at the user's request; the Part 1A application and harness log remain unchanged.

## Approved decisions

- Statuses: `queued`, `active`, `blocked`, `done`; allowed transitions are queued → active, active → blocked or done, blocked → active; `done` is terminal.
- Priority order: `now > next > later`; equal priorities sort by ascending task ID.
- Multiple selected tags use AND matching.
- Storage is a locally configured JSON file. HTTP binds to loopback. Request body limit is 65,536 bytes.

## Functional requirements traceability

| Requirement | Implementation and evidence |
|---|---|
| FR-001 task creation, title/notes constraints, defaults, tags and priority | `src/validation.mjs`, `src/task-service.mjs`, `src/http-api.mjs`; unit cases in `evidence/part-1a/raw/final-unit-tests.tap`; US1 create case in `final-harness.json`. |
| FR-002 stable unique IDs, no reuse, initial `queued` | `src/task-service.mjs`, `src/json-store.mjs`; final unit cases for increasing IDs, deletion, concurrent creation; US1 create harness case. |
| FR-003 list/retrieve, HTTP 200, ID order and `{ tasks }` envelope | `src/http-api.mjs`, `src/task-service.mjs`; US1 list/retrieve cases and US3 default-order case in final harness. |
| FR-004 partial edits preserve omitted fields; reject unsupported fields | `src/task-service.mjs`, `src/validation.mjs`; final unit update cases and US1 partial-update harness case. |
| FR-005 delete response and later 404 | `src/http-api.mjs`; US1 delete harness case. |
| FR-006 exact normalized tags, AND matching, tag count/length/duplicates | `src/validation.mjs`, `src/task-service.mjs`; final unit validation/filter cases and all US3 harness cases. |
| FR-007 priority order and ascending-ID tie break | `src/task-service.mjs`; final unit sort case and US3 ordering harness case. |
| FR-008 complete status transition graph and 409 rejection | `src/task-service.mjs`, `src/http-api.mjs`; final unit allowed/denied edges and US4 harness case covering every ordered pair. |
| FR-009 JSON persistence, configured path, restart durability, persist-before-success | `src/json-store.mjs`, `src/server.mjs`, `src/task-service.mjs`; final unit persistence/atomic-replacement tests and US2 restart harness case. |
| FR-010 malformed/invalid/unknown input responses, 65,536-byte limit, no mutation | `src/http-api.mjs`, `src/validation.mjs`; US2 invalid-request and oversized-body harness cases plus final unit cases. |
| FR-011 unknown task IDs return 404 without mutation | `src/http-api.mjs`; US1, US2, and US4 missing-ID harness cases. |
| FR-012 generic storage errors, safe startup failure, prior-data preservation | `src/errors.mjs`, `src/json-store.mjs`, `src/http-api.mjs`; JSON-store unit failure test; US2 malformed-file and Windows replacement-failure cases. |
| FR-013 JSON envelopes, status codes, stable error codes | `src/http-api.mjs`, `src/errors.mjs`; all final HTTP cases validate returned JSON and relevant status/error values. |
| FR-014 local-only access | `src/server.mjs` binds to `127.0.0.1`; `pnpm start` smoke record `raw/quickstart-start.json` confirms the loopback listener and HTTP requests. |

## Success criteria

| Criterion | Evidence and observed result |
|---|---|
| SC-001 CRUD acceptance scenarios | Six US1 cases pass in `raw/final-harness.json`. |
| SC-002 accepted tasks survive restart | US2 restart case passes in `raw/final-harness.json`; JSON-store restore test passes in `raw/final-unit-tests.tap`. |
| SC-003 invalid inputs have specified errors and preserve state | US2 validation, oversized-body, unknown-ID, malformed-storage, and storage-error cases pass; case output is in `raw/final-harness.json`. |
| SC-004 100-task filter and sort completes within 1,000 ms with expected order | Final independent harness: 100 tasks, 20 expected matches, **1.598 ms**, passed; measurement is in `raw/final-harness.json`. |
| SC-005 all prohibited status transitions leave state unchanged | Complete US4 transition-table case and unit matrix pass in final harness and unit output. |

## Spec Kit workflow and local tools

The Part 1A Spec Kit artifacts are under `specs/001-smart-todo-api/`: approved feature spec, plan, research, data model, OpenAPI contract, quickstart, requirements checklist, and phased task checklist. Constitution and Spec Kit templates/configuration are under `.specify/`. Tasks follow setup, foundation, test-first user stories US1–US4, initial generation snapshot, and cross-cutting validation. The approved spec analysis recorded all 19 FR/SC checks and a format-clean task list.

- Node.js 24 and pnpm 11.25.0 run the app and tests. The app has no runtime package dependencies.
- ESLint 10.14.0 and `@eslint/js` 10.0.1 are pinned in the lockfile.
- Semgrep Community Edition 1.185.0, ruleset `p/javascript`, is pinned by the local SAST script; `uv` is used by the documented scanner setup. The CLI JSON RPC failed on this Windows host, so the script used bundled Semgrep Core with the same generated rules and six explicit JavaScript source targets. Raw CLI failure and fallback results remain in `raw/`.

## Actual run results and genuine failures

- Final unit suite: `raw/final-unit-tests.tap` (20 tests, pass; exit 0).
- Final independent deterministic HTTP harness: `raw/final-harness.json` (18 cases, pass; exit 0).
- ESLint: `raw/lint.txt` and `raw/lint-status.json` (pass; exit 0).
- Semgrep Core fallback: `raw/sast.json`, `raw/sast-metadata.json`, `raw/sast-status.json` (68 rules, six targets, zero findings, zero engine errors; fallback exit 0). Standard CLI JSON did not pass; its Windows `socketpair` RPC error is preserved in `raw/sast-cli.txt` and `raw/sast-cli-status.json`.
- Quickstart install and `pnpm start` HTTP smoke: `raw/quickstart-install*` and `raw/quickstart-start*` (pass). The smoke used an isolated data file and performed GET, POST, GET on loopback.
- One complete-harness attempt failed because the execution sandbox returned `EACCES` for loopback connections. That unmodified output and status are preserved as `raw/final-harness-sandbox-blocked.json` and `raw/final-harness-sandbox-blocked-status.json`; after loopback access was enabled, all 18 cases passed. This was an environment failure, not a product-code failure.
- A lint run initially failed because ESLint lacked a `performance` global declaration. The genuine output is `raw/lint-initial.txt`; the configuration repair is recorded in `raw/lint-repair.txt`, and the rerun passed.
- Test-first red runs for US1–US4 and their passing reruns are preserved under the corresponding `raw/us*-red-*` and `raw/us*-rerun-*` names.

## Deliverables and student-authored work

- Source, tests, independent harness, local README, OpenAPI contract, and Spec Kit artifacts are present in the project folder.
- Initial and final source/test generations are separate ZIP archives with SHA-256 manifests under `evidence/part-1a/`.
- Machine-generated command results remain under `evidence/part-1a/raw/`.
- The run-entry table in `evidence/part-1a/harness-log.md` remains blank for student authorship because the assignment prohibits AI-generated log entries. A separate, explicitly AI-authored client review section was added at user request; it does not replace the student run log or required human ACCEPT/REJECT decision. No reflection answers were generated.
- Part 1B and its nondeterministic reminder agent/evaluation harness remain unstarted as directed.



