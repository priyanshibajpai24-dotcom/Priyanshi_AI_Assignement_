# Tasks: Natural Language Reminder Agent

**Input**: Design documents from specs/002-natural-language-reminder-agent/  
**Prerequisites**: Approved spec, plan, research, data model, contracts, and quickstart.  
**Implementation approval**: Student approved plan on 2026-11-14.  
**Repository target**: The user later authorized publishing both assignment parts to `https://github.com/priyanshibajpai24-dotcom/AI_Assignment.git`; keep working files in the requested Desktop folder and exclude local tools, package stores, model files, and credentials from publication.

**Current completion note (2026-11-15):** Part 1B source/harness, the frozen install, package-backed Ajv/Temporal checks, 46 unit/provider tests, and lint pass. Actual local Qwen2.5 runs are preserved: 0.5B INCONCLUSIVE (one provider timeout, 17 invalid outputs); 1.5B FAIL (18 non-object outputs); 3B before prompt repair FAIL (18 non-object outputs); 3B after prompt repair FAIL (2/18 schema and invariant passes, semantic mean 0.111, minimum 0). The fixed dataset and thresholds were not changed. The standard Semgrep CE 1.185.0 CLI failed before analysis on Windows socketpair (exit 2); a standalone Core fallback ran the same 68 p/javascript rules over 33 source/harness/test files with 0 findings and 0 engine errors. Preserve both outcomes. A pre-implementation Analyze review is not evidenced; student narrative, reflection, and Human Review remain blank.

## Format

Every task uses the Spec Kit checklist format and includes a concrete path. User-story tasks carry a story label and trace to the matching story in spec.md. Tests are included because the assignment and user explicitly require execution and validation.

## Phase 1: Setup

**Purpose**: Create the separate Part 1B package and reproducible development environment.

- [x] T001 Create Part-1B/src, Part-1B/prompts, Part-1B/evals, Part-1B/harness, Part-1B/tests/unit, Part-1B/tests/provider, Part-1B/scripts, and evidence/part-1b directory structure.
- [x] T002 Create Part-1B/package.json, Part-1B/pnpm-workspace.yaml, and Part-1B/pnpm-lock.yaml for Node.js 24 and pnpm 11.25.0; pin Ajv 8.20.0, ajv-formats 3.0.1, @js-temporal/polyfill 0.5.1, ESLint 10.14.0, and @eslint/js 10.0.1, then install with pnpm install --frozen-lockfile. A project-local package store resolved the earlier Windows symlink blocker.
- [x] T003 [P] Configure Part-1B/eslint.config.mjs and package lint/test/harness/sast scripts in Part-1B/package.json.
- [x] T004 [P] Create Part-1B/.gitignore for node_modules, .env files, temporary outputs, and local secret material.
- [x] T005 Create Part-1B/README.md with local run scope, prerequisites, provider configuration safety, verified commands, and a notice that human log/reflection/acceptance fields remain student-authored.

## Phase 2: Foundational

**Purpose**: Establish safe input, configuration, process, and error boundaries before user-story behavior.

- [x] T006 [P] Add failing unit tests in Part-1B/tests/unit/config.test.mjs for required AI_BASE_URL, AI_MODEL, AI_API_KEY, bounded AI_TIMEOUT_MS, and credential redaction without printing secret values.
- [x] T007 Implement validated provider configuration and secret-safe metadata in Part-1B/src/config.mjs; never persist or log AI_API_KEY.
- [x] T008 [P] Add failing input-validation tests in Part-1B/tests/unit/input-validation.test.mjs for requestId 1-64 chars, requestText 1-4,000 chars, required referenceNow with explicit RFC 3339 offset, nullable IANA timeZone, 0-50 reminders, reminder id 1-64 chars, title 1-160 chars, unique reminder IDs, unknown-field rejection, and 16,384-byte JSON limit.
- [x] T009 Implement pre-provider request validation and controlled validation errors in Part-1B/src/input-validator.mjs using the approved request schema at specs/002-natural-language-reminder-agent/contracts/request.schema.json.
- [x] T010 [P] Add CLI process contract tests in Part-1B/tests/unit/cli.test.mjs for one JSON request on stdin, one structured agent output on stdout, typed JSON failures on stderr, exact exit codes 0=accepted output, 2=invalid input, 3=provider/configuration/network error, 4=invalid model JSON, 5=output schema/invariant violation, and no stack trace.
- [x] T011 Implement Part-1B/src/errors.mjs and Part-1B/src/cli.mjs with the specified process/error protocol; invalid input must fail before provider invocation, successful output must conform to the approved agent contract, and error details must not expose secrets.
- [x] T012 Add provider HTTP protocol tests in Part-1B/tests/provider/provider-protocol.test.mjs for JSON mode request formation, bounded timeout, non-2xx, rate limit, timeout, malformed response, missing content, and credential-safe errors using a local loopback mock only.
- [x] T013 Implement the shared provider adapter in Part-1B/src/provider.mjs with native fetch, bounded timeout, one request per evaluated case, Chat Completions JSON mode, no tool definitions, no automatic scored-run retry, and safe provider error categories.

## Phase 3: User Story 1 — Create a reminder proposal (Priority: P1)

**Goal**: Convert a complete request into a proposal with grounded subject and a future timestamp.

**Independent test**: With fixed referenceNow/timeZone and a local mock provider, a complete create request produces one schema-valid create proposal with grounded subject, future RFC 3339 dueAt, and no side effect.

- [x] T014 [P] [US1] Add failing create-flow tests in Part-1B/tests/unit/create-agent.test.mjs for a clear absolute-time request, a fixed-context relative-time request, proposal title, intent, dueAt offset, and no external action.
- [x] T015 [P] [US1] Add prompt-policy tests in Part-1B/tests/unit/prompt-builder.test.mjs requiring JSON-only response instructions, untrusted request/context framing, supported intents, no tools, and proposal-only behavior.
- [x] T016 [US1] Create the versioned create/decision policy in Part-1B/prompts/reminder-agent-v1.md; use separate system policy and user data messages and never include provider credentials.
- [x] T017 [US1] Implement request-specific Chat Completions message construction in Part-1B/src/prompt-builder.mjs; explicitly request JSON and no tool/action execution.
- [x] T018 [US1] Implement create intent orchestration and provider response JSON parsing in Part-1B/src/reminder-agent.mjs; do not auto-repair malformed outputs into valid results.
- [x] T019 [US1] Wire the CLI to the agent and approved output schema in Part-1B/src/cli.mjs; return only the structured proposal on stdout and categorized redacted failures on stderr.

## Phase 4: User Story 2 — Clarify missing or ambiguous information (Priority: P1)

**Goal**: Ask concise clarification questions instead of inventing subject, date/time, timezone, or interpretation.

**Independent test**: Fixed requests missing one required fact, or describing an ambiguous/DST-invalid local time, return clarification_required, no proposal, the required missingInformation item, and a question about that item.

- [x] T020 [P] [US2] Add failing clarification tests in Part-1B/tests/unit/clarification-agent.test.mjs for missing title/date/time/time zone, ambiguous 12-hour time, ambiguous weekday, DST gap, DST overlap, and past due time.
- [x] T021 [P] [US2] Add failing time-helper tests in Part-1B/tests/unit/time-zone.test.mjs for IANA zone validation, explicit-offset timestamp parsing, future comparison against referenceNow, and Temporal reject behavior for nonexistent/repeated local times.
- [x] T022 [US2] Implement deterministic IANA-zone and timestamp helpers in Part-1B/src/time/zone-time.mjs using @js-temporal/polyfill and reject-style disambiguation.
- [x] T023 [US2] Extend Part-1B/prompts/reminder-agent-v1.md to require clarification when title/date/time/time zone is missing, interpretation is ambiguous, DST local time is nonexistent/repeated, or a proposed time is not future.
- [x] T024 [US2] Implement clarification decision invariants in Part-1B/src/reminder-agent.mjs; require null proposal, a nonempty question, at least one accurate missingInformation item, and no invented mandatory value.

## Phase 5: User Story 4 — Reject unsupported or adversarial actions (Priority: P1)

**Goal**: Reject undeclared actions and treat user/context text as untrusted data.

**Independent test**: Unsupported cancellation/deletion and injection requests produce no proposal or tool call, remain within the output contract, and do not expose secrets.

- [x] T025 [P] [US4] Add failing unsupported-action and injection tests in Part-1B/tests/unit/guardrails.test.mjs for cancel/delete/send/call/notification requests, instruction override attempts, secret-disclosure prompts, and malicious reminder context text.
- [x] T026 [US4] Extend Part-1B/prompts/reminder-agent-v1.md with explicit no-tool/no-side-effect rules, supported-intent allowlist, and instruction-boundary treatment for requestText and reminder context.
- [x] T027 [US4] Implement unsupported decision handling and no-proposal invariants in Part-1B/src/reminder-agent.mjs and Part-1B/src/invariants.mjs; do not add calendar, messaging, phone, notification, or other tool execution.

## Phase 6: User Story 5 — Evaluate non-deterministic output (Priority: P1)

**Goal**: Run one transparent evaluation pipeline with independent validation layers, rubric scores, structured evidence, and fixed thresholds.

**Independent test**: Using the real CLI with a loopback mock provider in tests, the harness records per-case outputs and layer outcomes, treats provider failures as INCONCLUSIVE, redacts credentials, and computes the predeclared result without importing application modules.

- [x] T028 [P] [US5] Add failing evaluator unit tests in Part-1B/tests/unit/schema-validator.test.mjs for approved Draft 2020-12 request/output contracts, extra fields, bad types, enums, RFC 3339 offset, and proposal/decision mismatch.
- [x] T029 [US5] Implement Part-1B/harness/schema-validator.mjs using Ajv Draft 2020-12 and ajv-formats against specs/002-natural-language-reminder-agent/contracts/agent-output.schema.json.
- [x] T030 [P] [US5] Add failing invariant tests in Part-1B/tests/unit/invariants.test.mjs for decision consistency, supported intent, future dueAt, timezone-offset consistency, exactly-one target ID, snooze base calculation, source grounding, clarification behavior, and zero side effects.
- [x] T031 [US5] Implement independent cross-field and time/target/grounding/guardrail checks in Part-1B/harness/invariant-checks.mjs; keep validator logic separate from app implementation.
- [x] T032 [P] [US5] Add failing semantic evaluator tests in Part-1B/tests/unit/semantic-evaluator.test.mjs for weighted binary case criteria, concept alternatives, equivalent timestamp instants, paraphrased clarification questions, and cases where semantic score is not applicable.
- [x] T033 [US5] Implement Part-1B/harness/semantic-evaluator.mjs with case-specific weighted criteria summing to 1; do not use a second model or exact full-response matching as the sole criterion.
- [x] T034 [US5] Create the 20-case synthetic dataset in Part-1B/evals/dataset.json covering clear create, fixed relative time, month/year boundary, date-only, time-only, missing subject, ambiguous 12-hour time, ambiguous weekday, missing zone, DST gap, DST overlap, unique reschedule, ambiguous target, duration snooze, cross-day snooze, incomplete snooze, unsupported cancel/delete, malformed envelope, invalid timeZone as a pre-provider rejection, and prompt injection/side-effect request; define ground truth, expected path, criteria, and rubric weights per case. Cover past-due clarification separately in T020.
- [x] T035 [P] [US5] Add failing aggregation tests in Part-1B/tests/unit/aggregate.test.mjs for exact predeclared thresholds: 100% schema, 100% invariants, zero guardrail violations, no provider infrastructure errors for PASS, every model-evaluated semantic score >=0.75, and unweighted mean >=0.85.
- [x] T036 [US5] Implement Part-1B/harness/aggregate.mjs for PASS/FAIL/INCONCLUSIVE outcomes without altering thresholds or counting provider infrastructure failures as application semantic failures.
- [x] T037 [US5] Implement independent child-process evaluation runner in Part-1B/harness/run.mjs; load and hash dataset/contracts, invoke Part-1B/src/cli.mjs as a child process per case, sanitize environment, impose timeout, and never import app modules.
- [x] T038 [US5] Implement redacted per-case/run evidence writing in Part-1B/harness/evidence-writer.mjs under evidence/part-1b/raw/<run-id>/; exclude keys, Authorization headers, and secret-bearing URLs or provider errors.
- [x] T039 [US5] Add harness integration tests in Part-1B/tests/provider/harness-process.test.mjs using the real child-process boundary and loopback test provider; confirm malformed inputs make no provider call, provider outage yields INCONCLUSIVE, and mock results are labeled test-only.

## Phase 7: User Story 3 — Reschedule or snooze an existing reminder (Priority: P2)

**Goal**: Propose a time change only for one supplied reminder and compute snooze from the later of dueAt and referenceNow.

**Independent test**: With fixed request/context, a unique target plus valid time/duration yields a proposal for that exact ID; missing or ambiguous target yields clarification and no proposal.

- [x] T040 [P] [US3] Add failing reschedule/snooze tests in Part-1B/tests/unit/reschedule-snooze.test.mjs for unique target, ambiguous target, absent target, absolute reschedule time, positive duration snooze, later(existing dueAt, referenceNow) base, cross-day rollover, and invalid/nonpositive duration.
- [x] T041 [US3] Extend Part-1B/prompts/reminder-agent-v1.md with reschedule/snooze target selection rules and the exact snooze base rule.
- [x] T042 [US3] Implement reschedule/snooze proposal generation and target matching in Part-1B/src/reminder-agent.mjs; only allow IDs present exactly once in supplied context.
- [x] T043 [US3] Extend Part-1B/src/time/zone-time.mjs and Part-1B/src/invariants.mjs to validate the new dueAt, positive snooze duration, future instant, and later(existing dueAt, referenceNow) calculation.
- [x] T044 [US3] Extend Part-1B/harness/invariant-checks.mjs and Part-1B/evals/dataset.json with exact target-ID and snooze arithmetic checks for the unique/ambiguous target and snooze cases.

## Phase 8: Polish, evidence, and final validation

**Purpose**: Preserve genuine initial/final generations and complete all project checks without filling student-owned log/reflection decisions.

- [x] T045 Capture the first complete Part-1B source generation before repair cycles under evidence/part-1b/initial-generation/ and create its SHA-256 manifest.
- [x] T046 Create evidence/part-1b/harness-log.md with the required scaffold, a separate AI Technical Review section, and clearly blank student run narrative/reflection/final human ACCEPT/REJECT fields.
- [x] T047 Run and preserve actual Part-1B frozen install and unit/provider-boundary test output/status in evidence/part-1b/raw/; record and retain genuine failures and repairs without editing raw outputs.
- [x] T048 Run and preserve actual Part-1B live dataset evaluation output/status in evidence/part-1b/raw/; if provider configuration/network is unavailable, record the actual INCONCLUSIVE outcome and do not substitute mocks.
- [x] T049 Run and preserve actual Part-1B ESLint output/status in evidence/part-1b/raw/.
- [x] T050 Implement Part-1B/scripts/run-sast.ps1, then run and preserve actual Semgrep CE output/status, ruleset/target metadata, and any genuine CLI/engine failure in evidence/part-1b/raw/.
- [x] T051 Verify Part-1B/README.md and specs/002-natural-language-reminder-agent/quickstart.md commands on this Windows host; update documentation only to match observed behavior.
- [x] T052 Run a credential-pattern redaction check over Part-1B source, fixtures, archives, and evidence; report only match counts/paths and never print secret values.
- [x] T053 Capture the final Part-1B source generation under evidence/part-1b/final-generation/ and create its SHA-256 manifest.
- [x] T054 Complete the AI Technical Review section in evidence/part-1b/harness-log.md from actual raw run results; leave student narrative, reflection, and final human ACCEPT/REJECT untouched.
- [x] T055 Re-run the credential-pattern redaction check over the final archive and all evidence, verify initial/final archive manifests and dataset/spec hashes, and confirm Part-1B isolation; keep Part 1A and its harness log unchanged.
- [x] T056 Mark completed tasks [X] in specs/002-natural-language-reminder-agent/tasks.md only after corresponding work and validation actually complete.

## Requirement and success-criteria coverage

| Requirement | Planned task coverage |
|---|---|
| FR-001 | T008-T009 |
| FR-002 | T006-T007, T012-T013, T048 |
| FR-003 | T011, T018-T019, T028-T029 |
| FR-004 | T014, T018, T020, T024 |
| FR-005 | T014, T020-T024, T029-T031, T043 |
| FR-006 | T020-T024, T031 |
| FR-007 | T040-T044 |
| FR-008 | T040-T044 |
| FR-009 | T025-T027 |
| FR-010 | T015, T025-T026, T038, T052 |
| FR-011 | T008-T011, T012, T039, T047 |
| FR-012 | T012-T013, T036-T039, T048 |
| FR-013 | T034 |
| FR-014 | T037 |
| FR-015 | T028-T029 |
| FR-016 | T030-T031, T043-T044 |
| FR-017 | T032-T033 |
| FR-018 | T035-T036 |
| FR-019 | T037-T038 |
| FR-020 | T038, T047-T048 |
| FR-021 | T045-T046, T052-T054 |
| SC-001 | T034 |
| SC-002 | T028-T033 |
| SC-003 | T035-T039 |
| SC-004 | T035-T036, T048 |
| SC-005 | T035, T048 |
| SC-006 | T052-T054 |
| SC-007 | T045, T053-T055 |

## Dependencies and execution order

### Phase dependencies

- Phase 1 creates the package and tool scripts.
- Phase 2 depends on Phase 1 and blocks all application behavior.
- User-story phases follow the approved story priorities: US1, US2, US4, US5, then US3. The full live evaluation is deferred to Phase 8 so its reschedule/snooze cases run after US3 is implemented.
- Phase 8 depends on all app/harness stories.

### User-story dependencies

- US1 depends on Phase 2 only.
- US2 depends on the shared request/CLI/provider foundation and US1 prompt/agent.
- US4 depends on the shared provider and output contract foundation.
- US5 builds the independent evaluator and dataset; its final full-dataset live run waits for US3.
- US3 depends on US1's create/output foundation and US2's time helpers.

### Parallel opportunities

- T003 and T004 touch independent config/ignore files after T001.
- T006, T008, T010, and T012 are tests on separate files and can be authored in parallel after setup.
- Within a story, tests on separate files may be written together; implementation tasks that share prompt/agent modules remain sequential.
- T028, T030, T032, and T035 use separate evaluator test files and can be authored in parallel.
- Live provider evaluations are sequential by design and are never parallelized.

## Implementation strategy

Implement the create proposal as the MVP, then clarification and unsupported/adversarial behavior, then the evaluator, then reschedule/snooze. Use TDD within each story: write the specified tests first, observe genuine failures, implement the feature, and rerun unchanged tests. Only after all behavior is present, capture the first complete source generation and perform repair-driven validation. The final provider run uses the real configured endpoint; mocks are confined to automated protocol tests.

## Gate and evidence rules

- Keep the approved spec, schema, and FR-018 threshold unchanged unless the student approves a Spec Kit change before implementation/test changes.
- Every command result is genuine and captured raw; do not fabricate, edit, or replace failures with mock results.
- No API key or credential is saved in source, fixture, transcript, generation archive, or raw evidence.
- The student writes run narratives/reflections and makes the final human ACCEPT/REJECT decision.
- Keep API credentials, local model binaries/weights, package stores, caches, and generated runtime state out of the repository. Publish only reviewable source, specifications, and evidence authorized by the user.

