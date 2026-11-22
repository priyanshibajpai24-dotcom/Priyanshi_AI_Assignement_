# Part 1B Planning and Implementation Checklist

Status: Application and harness implementation are complete. The frozen install, package-backed contract checks, 46 unit/provider tests, and lint pass. The latest live local-model evaluation FAILed the fixed thresholds: 2/18 Qwen2.5 3B responses passed schema/invariant checks, with semantic mean 0.111 and minimum 0. Semgrep standard CLI failed, while the same pinned rules passed through the Core fallback with no findings/errors. These are actual results, not implied PASS results.

## Planning and Spec Kit workflow
- [x] Student-approved feature specification exists at specs/002-natural-language-reminder-agent/spec.md.
- [x] Request and output contracts exist and parse as JSON.
- [x] Student selected a configurable OpenAI-compatible API and approved plan.md on 2026-11-14.
- [x] tasks.md exists in Spec Kit checklist format with concrete paths, dependencies, stories, and requirement mapping.
- [ ] Pre-implementation analyze review is not evidenced. A post-implementation consistency check found all 28 FR/SC IDs mapped to task rows, but the Spec Kit prerequisite script resolves .specify/feature.json to 001-smart-todo-api, not this Part 1B feature. The active feature pointer was left unchanged to avoid disturbing Part 1A.
- [x] Post-implementation convergence/review confirmed Part 1B isolation and preserved all genuine results; no Part 1A application files or harness log were edited.
- [x] The user authorized publishing both parts to the specified AI_Assignment repository after the local implementation; repository upload is a publication step and does not change app behavior.

## Tools and dependencies
- [x] Node.js 24.22.1 and pnpm 11.25.0 are available.
- [x] Part-1B/pnpm-lock.yaml was generated and `pnpm install --frozen-lockfile` succeeded using the project-local store. Earlier EPERM retries remain preserved as genuine failed attempts. See evidence/part-1b/raw/pnpm-frozen-install-local-default-store.txt and its exit-code file.
- [x] Ajv 8.20.0, ajv-formats 3.0.1, and @js-temporal/polyfill 0.5.1 resolved after the frozen install; both Draft 2020-12 schemas compiled and Temporal.Instant parsed a timestamp. See evidence/part-1b/raw/runtime-pinned-dependencies-validation-retry.txt.
- [x] ESLint 10.14.0 Part 1B lint passes with installed project dependencies. See evidence/part-1b/raw/eslint-installed-deps.txt and its exit-code file.
- [x] Semgrep CE 1.185.0 and the p/javascript ruleset were run. The standard JSON CLI failed on the Windows socketpair RPC path (exit 2). The standalone Core fallback then ran the same 68 rules over 33 Part 1B source, harness, and test files: 0 findings and 0 engine errors. Both outcomes are preserved; this records the fallback result and does not claim the standard CLI succeeded. See evidence/part-1b/raw/semgrep-part1b-core-metadata.json and semgrep-part1b-core-status.json.
- [x] Node built-in test runner/assert, native fetch, child_process, JSON contracts, and loopback mock servers are used.
- [x] A real local Ollama OpenAI-compatible endpoint was used without hosted credentials. The 0.5B run was INCONCLUSIVE; the 1.5B run executed all 18 model cases and FAILed with schemaRate 0, invariantRate 0, and mean semantic score 0. Never put credentials in project files or evidence.

## Application
- [x] Separate Part-1B package, independently authored source, versioned prompt, and tests exist.
- [x] Request size, field, explicit-offset timestamp, timezone, reminder count, unique ID, and pre-provider validation are implemented.
- [x] Chat Completions JSON mode is used with separate policy/data messages, no tools, no retries, bounded timeouts, and proposal-only results.
- [x] Provider configuration is environment-only; errors are typed and redacted.
- [x] Output contract, decision consistency, supported intents, future time, timezone offset, exact target ID, snooze arithmetic, and evidence grounding checks are implemented.
- [x] Clarification, unsupported action, injection framing, DST gap/overlap, and no-side-effect behavior are covered by the application and harness tests.
- [x] CLI process exits 0, 2, 3, 4, and 5 are covered; error output is structured and stack-free.

## Dataset and independent evaluation harness
- [x] Synthetic dataset has 20 cases: 18 model cases and 2 deterministic input-rejection cases, exceeding the 15-case minimum.
- [x] Dataset includes ground truth, expected path, case-specific rubric criteria, and normalized weights; integrity check reports 20 unique IDs and no bad rubric weights.
- [x] Harness invokes the CLI per case as a child process and does not import Part 1B application internals.
- [x] Independent schema, invariant, time, semantic, guardrail, aggregation, and evidence stages are implemented.
- [x] Semantic scoring supports weighted concepts/paraphrases and equivalent timestamp instants; fixed thresholds remain unchanged.
- [x] Both invalid-input cases were rejected before provider invocation in the final live harness run.
- [x] Four genuine local live runs are preserved. Latest Qwen2.5 3B run (after an explicit output-shape prompt repair) evaluated all 18 model cases but FAILed: schemaRate 2/18, invariantRate 2/18, mean semantic 0.111, minimum semantic 0. The two invalid-input cases passed before provider invocation. Do not report the live suite as PASS.
- [x] Provider protocol and harness child-process boundary use loopback mocks only in automated tests and keep mock results separate from live evaluation.

## Evidence and delivery
- [x] Initial source archive contains 37 files; the prior final archive is preserved separately with 41 files; the refreshed final archive contains 42 files. All SHA-256 manifests and spec/dataset hashes verify in evidence/part-1b/raw/generation-integrity-after-prompt-repair.txt.
- [x] Actual test, lint, install, live-evaluation, SAST-tool, dependency-resolution, and repair outputs are preserved under evidence/part-1b/raw/.
- [x] evidence/part-1b/harness-log.md contains the AI Technical Review separately from blank student run narrative, reflection, and final Human Review decision.
- [x] No reflection answer or student-authored narrative/final decision was generated.
- [x] README and quickstart describe verified Windows commands, the frozen install, provider configuration, live-model failures, SAST fallback, student-owned fields, and known limits.
- [x] Publish-tree credential scan covers all 512 text files in the staged repository, including both applications, specifications, archives, and evidence: 0 matching paths and 0 read errors. The report prints no matched values. See evidence/part-1b/raw/credential-pattern-scan-publish.txt.
- [x] Part 1B isolation check finds no Part 1A source imports and no app-internal imports from the evaluation harness.

## Remaining submission actions
1. The latest local model run FAILed the approved live thresholds. A later run with a sufficiently capable compatible model can use the existing environment-variable configuration; preserve its actual result.
2. The standard Semgrep CLI JSON path remains blocked by the Windows socketpair RPC error. The pinned Core fallback result is recorded separately.
3. The pre-implementation Spec Kit Analyze review is not evidenced; do not claim that gate occurred before implementation.
4. The student reviews the raw evidence, writes the run narrative/reflection, and makes the final Human ACCEPT/REJECT decision.


