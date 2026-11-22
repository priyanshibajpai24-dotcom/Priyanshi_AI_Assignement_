# Tasks: Smart Todo Local Service

**Input**: Approved design documents in `/specs/001-smart-todo-api/`

**Prerequisites**: Approved `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, and `quickstart.md`.

**Tests**: Tests and evaluation are explicitly required. Unit and black-box harness cases are written before their story implementation, and their actual initial outcomes are preserved.

**Organization**: Tasks follow the four approved user stories. Story work is sequenced by priority because the stories share the HTTP and storage modules, but each story has its own independent acceptance checks.

## Format

Every task uses `- [ ] T### [P?] [Story?] Description with exact file path`. `[P]` is used only where the work is in different files and has no incomplete dependency. User-story tasks include `[US1]` through `[US4]`.

## Phase 1: Setup

**Purpose**: Establish the local Node.js project and independent quality tools.

- [X] T001 Create the Node.js ES module package, scripts, Node engine requirement, and package-manager metadata in `package.json`.
- [X] T002 [P] Add ESLint 10.14.0 and `@eslint/js` 10.0.1 as pinned development dependencies and generate `pnpm-lock.yaml`.
- [X] T003 [P] Configure flat ESLint rules for source, tests, and harness JavaScript with explicit Node globals in `eslint.config.mjs`.
- [X] T004 Add the pinned Semgrep 1.185.0 local SAST invocation and JSON-output handling in `scripts/run-sast.ps1`.
- [X] T005 Create `src/`, `tests/unit/`, `tests/helpers/`, `harness/`, `scripts/`, and `data/` directories at the project root; configure the project-local pnpm store and hoisted linker in `pnpm-workspace.yaml` to avoid Windows symlink requirements.

---

## Phase 2: Foundational

**Purpose**: Build shared HTTP, validation, storage, test, harness, and evidence infrastructure before story behavior.

- [X] T006 Implement startup configuration, loopback-only binding, port selection, startup readiness output, and graceful shutdown in `src/server.mjs`. (covers FR-014)
- [X] T007 Define stable JSON error objects and HTTP error mapping for invalid requests, missing tasks, invalid transitions, oversized bodies, and storage errors in `src/errors.mjs`. (covers FR-010, FR-011, FR-013)
- [X] T008 Implement JSON response helpers, basic JSON body parsing, route dispatch scaffolding, and generic uncaught-error handling in `src/http-api.mjs`. (covers FR-013)
- [X] T009 Define shared title, notes, tag, priority, and status constraints for use by story-level validation in `src/validation.mjs`.
- [X] T010 Create the versioned JSON envelope, missing-file empty state, basic load/save operations, and persisted monotonic `nextId` in `src/json-store.mjs`; leave serialized atomic replacement and failure preservation to User Story 2. (covers FR-002, FR-009)
- [X] T011 Configure the built-in unit-test command and temporary-directory cleanup conventions in `package.json` and `tests/helpers/temp-data.mjs`.
- [X] T012 Implement an independent runner that starts the service as a child process, uses only loopback HTTP, selects an isolated temporary data file, emits machine-readable case results, and always cleans up in `harness/run.mjs`. (covers FR-014)
- [X] T013 Create the initial deterministic case registry and result format in `harness/cases.mjs`.
- [X] T014 Create `evidence/part-1a/initial-generation/`, `evidence/part-1a/final-generation/`, and `evidence/part-1a/raw/`; add a blank student-authored narrative scaffold at `evidence/part-1a/harness-log.md` without writing narrative results.
- [X] T015 Add a source-archive and SHA-256 manifest command for the initial and final code generations in `scripts/capture-generation.ps1`.

**Checkpoint**: The app can start on loopback with isolated storage, shared error/validation/persistence infrastructure exists, and the independent harness can manage a child process. No task behavior is claimed complete yet.

---

## Phase 3: User Story 1 — Manage Tasks (Priority: P1)

**Goal**: Create, retrieve, edit, and delete task records through the documented HTTP contract.

**Independent Test**: Through HTTP, create a task, retrieve it, update allowed fields, verify omitted fields are preserved, delete it, and verify retrieval returns `404 NOT_FOUND`.

### Tests first

- [X] T016 [P] [US1] Add unit cases for title trimmed to 1–120 characters, notes up to 2,000 characters, required priority, empty-string/empty-array defaults, unique IDs for concurrent creates, and allowed update fields in `tests/unit/task-service.test.mjs`. (covers FR-001, FR-002, FR-004)
- [X] T017 [P] [US1] Add black-box HTTP cases for create, list, get, update, delete, response envelopes, and unknown IDs in `harness/cases.mjs`. (covers FR-001, FR-003, FR-004, FR-005, FR-011, FR-013, SC-001)
- [X] T018 [US1] Run the new US1 unit and HTTP cases before feature implementation; preserve the genuine outcomes in `evidence/part-1a/raw/us1-red-unit.tap`, `us1-red-harness.json`, and `us1-red-status.json`.

### Implementation

- [X] T019 [US1] Implement task creation, retrieval, listing, partial updates, and deletion with serialized mutation calls that persist candidate state before reporting success in `src/task-service.mjs`. (covers FR-001, FR-002, FR-004, FR-005)
- [X] T020 [US1] Connect `POST /tasks`, `GET /tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, and `DELETE /tasks/{id}` to the service in `src/http-api.mjs`. (covers FR-001, FR-003, FR-004, FR-005, FR-013)
- [X] T021 [US1] Run the US1 unit and HTTP cases after implementation and save the unedited results to `evidence/part-1a/raw/us1-rerun-unit.tap`, `us1-rerun-harness.json`, and `us1-rerun-status.json`.

**Checkpoint**: The CRUD story passes independently, including created-task defaults, stable identifiers, and not-found behavior.

---

## Phase 4: User Story 2 — Preserve Tasks and Reject Invalid Changes (Priority: P1)

**Goal**: Preserve accepted mutations across restart and ensure invalid requests leave state unchanged.

**Independent Test**: Restart with the same data file, verify every accepted record and ID, then submit malformed, oversized, unsupported, and invalid-field requests and compare persisted state before and after.

### Tests first

- [X] T022 [P] [US2] Add unit cases for JSON envelope validation, malformed persisted data, monotonic IDs after deletion, serialized mutations in `tests/unit/task-service.test.mjs`, and injected replacement failure preserving the previous valid file in `tests/unit/json-store.test.mjs`. (covers FR-002, FR-009, FR-012)
- [X] T023 [P] [US2] Add HTTP cases for restart durability; malformed persisted data safe startup failure; malformed JSON; blank or overlong title; overlong notes; invalid priority/status; unknown fields; empty, overlong, excessive, or duplicate tags; missing IDs; generic storage-write failure; bodies larger than 65,536 bytes for every HTTP operation, including GET/DELETE requests sent through a raw HTTP client; and persisted-state comparisons after every rejection in `harness/cases.mjs`. (covers FR-009, FR-010, FR-011, FR-012, FR-013, SC-002, SC-003)
- [X] T024 [US2] Run new US2 cases before story-specific repairs; preserve raw outputs in `evidence/part-1a/raw/us2-red-unit.tap`, `us2-red-harness.json`, and `us2-red-status.json`.

### Implementation and verification

- [X] T025 [US2] Complete strict stored-document validation, serialized mutations, same-directory temporary writes and replacement, cleanup after failures, and generic `500 STORAGE_ERROR` responses in `src/json-store.mjs` and `src/http-api.mjs`; verify the prior valid file is preserved on a failed replacement. (covers FR-009, FR-012, FR-013)
- [X] T026 [US2] Complete request rejection behavior for malformed JSON, invalid or unknown fields, invalid values, oversized bodies, and unknown IDs in `src/validation.mjs` and `src/http-api.mjs`. (covers FR-010, FR-011, FR-013)
- [X] T027 [US2] Run US2 restart, rejection, error-code, and no-mutation cases and preserve the unedited results in `evidence/part-1a/raw/us2-rerun-unit.tap`, `us2-rerun-harness.json`, and `us2-rerun-status.json`. (covers SC-002, SC-003)

**Checkpoint**: Persistence and validation independently satisfy FR-009 through FR-013; malformed or unreadable existing storage fails safely and is not overwritten.

---

## Phase 5: User Story 3 — Find and Order Tasks (Priority: P2)

**Goal**: Filter by all selected tags and return deterministic priority ordering on request.

**Independent Test**: Create a known mix of tags and priorities; verify exact AND-filter membership, empty results for unmatched tags, and both default and priority order including ID ties.

### Tests first

- [X] T028 [P] [US3] Add unit cases for trimmed case-folded tag comparison, duplicate rejection, AND matching, and `now > next > later` with ID ties in `tests/unit/task-service.test.mjs`. (covers FR-006, FR-007)
- [X] T029 [P] [US3] Add black-box cases for one and multiple tags, no-match results, default ID order, priority order, and equal-priority ties in `harness/cases.mjs`. (covers FR-006, FR-007)
- [X] T030 [US3] Add the 100-task filtered-and-sorted one-second acceptance measurement; preserve pre-implementation outputs in `evidence/part-1a/raw/us3-red-unit.tap`, `us3-red-harness.json`, and `us3-red-status.json`. (covers SC-004)

### Implementation and verification

- [X] T031 [US3] Implement tag filtering that requires every selected tag and validates at most 10 non-empty tags of at most 32 characters, rejecting duplicates after trim and case-folding in `src/task-service.mjs` and `src/validation.mjs`. (covers FR-006)
- [X] T032 [US3] Implement default ID-ascending order and requested priority order `now`, `next`, `later`, with task ID ascending as the equal-priority tie-break in `src/task-service.mjs` and `src/http-api.mjs`. (covers FR-003, FR-006, FR-007, SC-004)
- [X] T033 [US3] Run US3 membership, ordering, and timing cases and preserve the unedited results in `evidence/part-1a/raw/us3-rerun-unit.tap`, `us3-rerun-harness.json`, and `us3-rerun-status.json`. (covers SC-004)

**Checkpoint**: Filter and sort results match the approved criteria; the 100-task measurement is reported without changing its one-second threshold.

---

## Phase 6: User Story 4 — Advance Task Status (Priority: P2)

**Goal**: Enforce the exact status transition graph and terminal `done` state.

**Independent Test**: Exercise each allowed transition and every prohibited transition through HTTP; verify successful state changes and unchanged state after each rejection.

### Tests first

- [X] T034 [P] [US4] Add unit cases for all allowed and prohibited edges in the status transition graph in `tests/unit/task-service.test.mjs`. (covers FR-008, SC-005)
- [X] T035 [P] [US4] Add HTTP cases for status transitions, `409 INVALID_TRANSITION`, invalid status values, and unknown task IDs in `harness/cases.mjs`. (covers FR-008, FR-010, FR-011, FR-013, SC-005)
- [X] T036 [US4] Run the new US4 cases before transition implementation; preserve pre-implementation outputs in `evidence/part-1a/raw/us4-red-unit.tap`, `us4-red-harness.json`, and `us4-red-status.json`.

### Implementation and verification

- [X] T037 [US4] Implement queued → active, active → blocked or done, blocked → active, and terminal done behavior in `src/task-service.mjs`. (covers FR-008)
- [X] T038 [US4] Connect `PATCH /tasks/{id}/status` with JSON response mapping for `400 INVALID_REQUEST`, `404 NOT_FOUND`, and `409 INVALID_TRANSITION` in `src/http-api.mjs`. (covers FR-008, FR-010, FR-011, FR-013)
- [X] T039 [US4] Run the complete US4 transition table and no-mutation checks and preserve the unedited results in `evidence/part-1a/raw/us4-rerun-unit.tap`, `us4-rerun-harness.json`, and `us4-rerun-status.json`. (covers FR-008, SC-005)

**Checkpoint**: Every transition in the approved graph has a passing result and each prohibited transition leaves persisted state unchanged.

---

## Phase 7: Initial Generation Snapshot

**Purpose**: Preserve the first complete implementation before full regression and harness-driven repairs.

- [X] T040 Archive the complete first-pass source and test generation (17 files), with SHA-256 manifest, in `evidence/part-1a/initial-generation/` before the full acceptance repair cycle.

---

## Phase 8: Polish and Cross-Cutting Validation

**Purpose**: Run the full required checks, repair only demonstrated production defects, and prepare the local handoff.

- [X] T041 Run the entire deterministic black-box harness and save structured results to `evidence/part-1a/raw/full-harness.json`, process metadata to `evidence/part-1a/raw/full-harness-metadata.json`, and exit status to `evidence/part-1a/raw/full-harness-status.json`. (covers FR-001 through FR-014, SC-001 through SC-005)
- [X] T042 Repair only demonstrated production defects in affected files among `src/server.mjs`, `src/http-api.mjs`, `src/task-service.mjs`, `src/validation.mjs`, `src/json-store.mjs`, and `src/errors.mjs`; do not weaken specifications, thresholds, or test cases, and preserve each failure and rerun output under `evidence/part-1a/raw/`. Review found no production defect; the first final harness failure was a loopback `EACCES` sandbox restriction, and the unchanged rerun passed after enabling loopback access.
- [X] T043 Run all unit tests and the full harness again; save `evidence/part-1a/raw/final-unit-tests.tap`, `evidence/part-1a/raw/final-harness.json`, and `evidence/part-1a/raw/final-harness-status.json` unchanged. (covers FR-001 through FR-014, SC-001 through SC-005)
- [X] T044 Run ESLint separately and save its raw output and exit status in `evidence/part-1a/raw/lint.txt` and `evidence/part-1a/raw/lint-status.json`.
- [X] T045 Run pinned Semgrep CE locally with the explicit JavaScript ruleset; if the CLI JSON formatter fails on Windows, use the bundled Semgrep Core with the same generated rules and targets; save raw engine JSON to `evidence/part-1a/raw/sast.json`, CLI/Core/ruleset/finding metadata to `evidence/part-1a/raw/sast-metadata.json`, and exit status to `evidence/part-1a/raw/sast-status.json`.
- [X] T046 Validate the quickstart commands and explain local configuration, loopback access, data location, and separate test/lint/SAST commands in `README.md`.
- [X] T047 Archive the final source and test generation with SHA-256 manifest in `evidence/part-1a/final-generation/` without modifying the initial snapshot.
- [ ] T048 Student authors the required harness-log entries from actual raw evidence and completes the final human ACCEPT/REJECT review and limitations in `evidence/part-1a/harness-log.md`; AI must not generate log entries or reflection answers. The requirements-to-evidence audit is saved at `evidence/part-1a/requirements-audit.md`.

## Dependencies and Execution Order

### Phase dependencies

- Setup (Phase 1) precedes Foundational (Phase 2).
- Foundational (Phase 2) blocks all user stories.
- User stories run in the listed priority order because they share the service, validation, storage, and harness files; each still has a separate independent test criterion.
- The initial source archive (Phase 7) follows the first implementation of all stories and precedes the full acceptance repair cycle.
- Polish (Phase 8) follows the initial archive. The final archive follows all required reruns.

### Story dependencies

- US1 (P1) depends on the server, validation, persistence, and harness foundations.
- US2 (P1) depends on the CRUD baseline to compare state across restart and rejection cases.
- US3 (P2) depends on stored CRUD tasks.
- US4 (P2) depends on persisted task retrieval and update behavior.

### Parallel opportunities

- T002 and T003 use separate dependency/configuration files and can proceed in parallel after T001.
- Within each story, unit tests and black-box case authoring use different files and can proceed in parallel; the red run waits for both.
- Implementation tasks touching `src/http-api.mjs` or `src/task-service.mjs` remain sequential to avoid conflicting edits.

## Implementation Strategy

1. Complete setup and shared foundations.
2. Implement and validate the P1 CRUD increment.
3. Add persistence/rejection checks, then tag/priority behavior, then status behavior in priority order.
4. Preserve the first complete generation before the full acceptance repair cycle.
5. Run the independent harness, unit tests, lint, and SAST as separate checks; preserve actual failures and rerun outputs.
6. Create and verify the final generation archive and local README. Stop before filling narrative harness logs or reflections for the student.

## Evidence and student-authored work

- Machine results are stored unchanged under `evidence/part-1a/raw/`.
- Initial and final code archives are stored separately and receive SHA-256 manifests.
- `evidence/part-1a/harness-log.md` is a blank scaffold; the student writes its narrative from real evidence.
- No assignment reflection answer or final human accept/reject decision is generated by the assistant.
- The user later authorized publishing both assignment parts to the specified AI_Assignment repository; this publication instruction supersedes the original local-only preference.





























