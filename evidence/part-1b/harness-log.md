# Part 1B Harness Log

Student: complete the run narrative and reflection yourself after reviewing the actual machine-generated results under `raw/`. The AI Technical Review below summarizes only checks that were actually executed.

| Run | Date and command | Result from raw evidence | Genuine failures and repair | Student review |
|---|---|---|---|---|
|  |  |  |  |  |

## AI Technical Review for Client

**Authorship:** AI-generated technical review, updated 2026-11-18 from preserved machine output. The student run table, reflection, and Human Review section remain student-authored.

**Outcome:** Part 1B application and harness implementation, dependency installation, package-backed contract checks, lint, and the current 50-test unit/provider-boundary suite pass. The latest recorded live model evaluation does not pass: the local Qwen2.5 3B run scored 2 of 18 model responses as schema-valid and invariant-valid. Keep the fixed thresholds and report that live outcome as FAIL. The new native Ollama client has not yet completed a live evaluation run.

| Check | Recorded result |
|---|---|
| Dependency install and contracts | pnpm install --frozen-lockfile passed after setting the Part 1B pnpm store to a project-local path. Ajv 8.20.0 compiled both Draft 2020-12 contracts and Temporal.Instant parsed the timestamp check. Earlier Windows EPERM attempts remain preserved. See raw/pnpm-frozen-install-local-default-store.txt and raw/runtime-pinned-dependencies-validation-retry.txt with status files. |
| Unit and provider-boundary suite | pnpm test: 46 passed, 0 failed, exit 0, after the prompt repair and after local network access was restored. The prompt-policy regression test passed. An earlier rerun failed because the assertion phrase did not match the prompt wording; the assertion was corrected. A subsequent attempt failed when the sandbox denied ephemeral loopback sockets with EACCES; that attempt is preserved and was not counted as the final run. See raw/unit-provider-tests-final-network-granted.txt, raw/prompt-policy-repair-test.txt, and the earlier failed repair logs. |
| Current-code verification (2026-11-18) | After adding native Ollama structured output, one contract-invalid-response retry, the interactive proposal CLI, and the project-local portable runtime paths, `pnpm test` passed 50/50 and `pnpm lint` exited 0. The latest output and exit codes are in `../project-validation/2026-11-18-part-1b-tests-portable-runtime.*` and `2026-11-18-part-1b-lint-portable-runtime.*`. This verifies local code paths and protocol tests; it is not a live model evaluation. |
| ESLint | pnpm lint passed with installed Part 1B dependencies, exit 0. See raw/eslint-final-repair.txt and its exit-code file. |
| Earlier test failure and repair | The expanded CLI run initially had 37 passed and 1 failed because its successful mock response cited a subject phrase absent from the fixture. The implementation correctly rejected ungrounded evidence; the fixture was aligned and the rerun passed. The initial implementation test and first lint run also exposed missing modules and five lint issues; those were repaired. See raw/unit-provider-tests-cli-fixture-failure.txt, raw/unit-provider-tests-final.txt, raw/tdd-red-before-implementation.txt, raw/eslint-direct.txt, and raw/eslint-final-complete.txt. |
| Dataset integrity | The synthetic dataset has 20 unique cases: 18 model cases and 2 deterministic invalid-input cases. The 18 model rubrics sum to 1, and both invalid requests are rejected before provider invocation. See raw/dataset-integrity.txt and the latest run folder. |
| Qwen2.5 0.5B live run | **INCONCLUSIVE**, run ID 2026-11-15T10-37-07-528Z: 18 model cases executed; one provider timeout and 17 invalid non-object model outputs; two deterministic invalid-input cases were checked. See raw/live-evaluation-local-qwen2.5-0.5b.txt and raw/2026-11-15T10-37-07-528Z/results.json. |
| Qwen2.5 1.5B live run | **FAIL**, run ID 2026-11-15T10-48-17-555Z: all 18 model responses were rejected as non-object outputs; schema, invariant, and semantic metrics were zero. Both deterministic invalid-input cases were checked. See raw/live-evaluation-local-qwen2.5-1.5b.txt and raw/2026-11-15T10-48-17-555Z/results.json. |
| Qwen2.5 3B before prompt repair | **FAIL**, run ID 2026-11-15T12-43-40-850Z: all 18 model responses were rejected as non-object outputs. See raw/live-evaluation-local-qwen2.5-3b.txt and raw/2026-11-15T12-43-40-850Z/results.json. |
| Qwen2.5 3B after prompt repair | **FAIL**, run ID 2026-11-15T14-13-49-865Z: 2/18 responses passed schema and invariant checks; 12 had schema errors and 4 had invariant errors. Semantic mean was 0.111 and minimum was 0, below the approved thresholds. The prompt now spells out all seven output keys and decision shapes; thresholds and dataset were unchanged. See raw/live-evaluation-local-qwen2.5-3b-prompt-repair.txt and raw/2026-11-15T14-13-49-865Z/results.json. |
| Semgrep | The standard Semgrep CE 1.185.0 CLI JSON path failed before analysis on a Windows Core RPC socketpair error (exit 2). A separate standalone Core fallback using the same p/javascript rules then ran 68 rules over 33 Part 1B source, harness, and test files: 0 findings and 0 engine errors. The fallback result does not claim the standard CLI path succeeded. See raw/semgrep-part1b-core-metadata.json, raw/semgrep-part1b-core-status.json, and the preserved standard CLI failures. |
| Provider credentials | All live model runs used a loopback Ollama server and a local compatibility value; no hosted provider credential was available or written to the project. The server was bound to 127.0.0.1 and stopped after each run. |
| Publish-tree credential scan | Scanned 512 text files in the repository staging tree, including source, specifications, archives, and evidence: 0 matching paths and 0 read errors. The report omits matched values. See raw/credential-pattern-scan-publish.txt. |
| Spec Kit workflow | The approved spec, plan, research, contracts, data model, quickstart, task list, and implementation checklist are present. A pre-implementation Analyze review is not evidenced, and this report does not claim it occurred. The checklist records the gap. |
| Generation archives and isolation | The initial archive has 37 files; the prior final archive is preserved separately with 41 files; the refreshed final archive has 42 files. All manifests match their contents, the final snapshot matches the current Part 1B source, and current spec/dataset hashes match. See raw/generation-integrity-after-prompt-repair.txt. Part 1B does not import Part 1A source, and its independent harness does not import application internals. |

**Required student follow-up:** Review the actual model FAIL results and limitations, write the student run narrative and reflection, and make the final Human ACCEPT/REJECT decision. A stronger compatible model endpoint may be configured locally for a later live run; keep credentials out of project files and evidence. Do not record the current live evaluation as PASS.
## Student Reflection

[Reserved for the student. No reflection answer has been generated.]

## Human Review

**Final human decision (ACCEPT/REJECT):** [Reserved for the student]

**Student review and known limitations:** [Reserved for the student]


