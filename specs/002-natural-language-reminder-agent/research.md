# Research: Natural Language Reminder Agent

Date: 2026-11-14  
Feature: 002-natural-language-reminder-agent  
Status: Planning input; no Part 1B implementation has started.

## Decisions

| Topic | Decision | Reason and boundary |
|---|---|---|
| Runtime | Node.js 24, ECMAScript modules, pnpm 11.25.0 | Matches the local project toolchain and supports built-in fetch and node:test. Part 1B remains a separate package under Part-1B. |
| Provider protocol | Configurable OpenAI-compatible Chat Completions endpoint | User selected a configurable OpenAI-compatible API. Configure base URL, model, and key outside source. Implement only the declared protocol; do not silently switch endpoints or use a mock as final evaluation. |
| Provider output format | Request JSON mode with response_format type json_object and an explicit JSON instruction; parse and validate locally | JSON mode can produce valid JSON without guaranteeing schema conformance. The approved schema and independent invariant checks remain authoritative. Unsupported JSON mode or malformed output cannot become a pass. |
| Provider tools | No tool definitions or tool execution | The agent proposes reminder changes only. Calendar, notification, messaging, phone, and other side effects remain out of scope. |
| Time handling | Use the fixed reference instant and IANA zone; use @js-temporal/polyfill with reject-style disambiguation in deterministic validation helpers | This allows DST gaps and overlaps to trigger clarification rather than silently selecting an instant. Output dueAt remains RFC 3339 with an explicit offset. |
| Input/output contracts | Keep the approved request and agent-output JSON Schemas; compile with Ajv's Draft 2020-12 implementation and ajv-formats | Ajv requires a separate implementation for Draft 2020-12. ajv-formats provides date-time validation requiring timezone offsets. Cross-field behavior is checked separately. |
| Harness boundary | Launch the Part 1B CLI as a child process per case and observe stdin/stdout/stderr/exit status; do not import app modules | Preserves independent black-box evaluation. The harness may read the approved schemas and dataset as test inputs. |
| Semantic scoring | Deterministic, case-specific weighted criteria; no second model as judge | Keeps scoring reproducible and avoids another source of non-determinism. Criteria assess decision, intent, subject concepts, timestamp instant, target ID, missing information, clarification purpose, and safety as applicable. Paraphrases can pass when they preserve required meaning; exact full-response equality is not used. |
| Evaluation status | PASS only when the predeclared gate is met; FAIL for observed application violations; INCONCLUSIVE for missing provider configuration or provider/network infrastructure errors | Separates application behavior from model-service availability. Provider failure is neither a pass nor a semantic failure. |
| Evidence | Preserve actual first and final runs, both code generations, command statuses, redaction checks, and a student-authored harness-log scaffold | Machine evidence must be genuine. The student writes run narratives, reflections, and final human ACCEPT/REJECT. |
| Repository | Keep the working copy in the user-selected local folder; publish the reviewable assignment files to the named repository after the user later authorized GitHub publication | The latest user instruction supersedes the earlier local-only constraint. Exclude credentials, local tools, model weights, package stores, and caches. |

## Provider request and failure handling

The planned provider adapter sends one HTTPS POST per valid model-evaluable case to the configured base URL plus the Chat Completions path. It sends system and user messages, JSON mode, and no tools. It accepts only a successful HTTP response with a usable message content string. It records a returned request identifier and safe metadata such as HTTP status, latency, provider/model labels, and error class. It must redact authorization headers, key values, and error bodies that could echo credentials. It applies a bounded timeout and does not retry automatically during a scored evaluation; a retry changes cost and model sample. Explicit user-triggered reruns are separate runs with distinct IDs.

The provider must support the expected Chat Completions behavior and JSON mode. An endpoint that does not support JSON mode is unsupported configuration and yields INCONCLUSIVE unless a later approved specification change defines another protocol.

## Runtime and development dependencies planned

Versions will be locked in pnpm-lock.yaml during implementation. Planned direct packages:

- @js-temporal/polyfill 0.5.1 for local civil-time interpretation and explicit rejection of ambiguous/nonexistent zoned times.
- ajv 8.20.0, configured with the Draft 2020-12 export.
- ajv-formats 3.0.1 for date-time checks.
- eslint 10.14.0 and @eslint/js 10.0.1, matching the versions already pinned in the local Part 1A package.

Use Node built-ins for HTTP fetch, process creation, file I/O, the test runner, assertions, hashes, and redaction. Do not add an OpenAI SDK; the narrow compatible HTTP protocol needs no provider SDK. No database, vector store, queue, frontend framework, or calendar SDK is required.

Development tools: Node 24, pnpm 11.25.0, initialized local GitHub Spec Kit workflow artifacts, ESLint, Semgrep CE 1.185.0 with the explicitly recorded JavaScript ruleset, and the Node built-in test runner. Network access will be needed if pinned packages or the scanner bootstrap are unavailable locally. No user credential will be requested in chat or written into project files.

## Source findings

1. OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create  
   The documented operation is a POST to the Chat Completions resource and supports JSON response format. Every result will still be validated locally; endpoint incompatibility is a non-pass.
2. OpenAI Structured Outputs guide: https://developers.openai.com/api/docs/guides/structured-outputs  
   JSON mode formats output as JSON but does not guarantee conformance to an arbitrary schema. The selected compatible protocol will use JSON mode and local schema validation, not assume schema compliance.
3. OpenAI API overview: https://developers.openai.com/api/reference/overview  
   Authentication uses a secret bearer credential. The project will load it from an environment variable and never log it.
4. Node.js v24 globals: https://nodejs.org/download/release/latest-v24.x/docs/api/globals.html  
   Node 24 supplies stable global fetch, so a provider SDK is unnecessary.
5. Ajv JSON Schema guide: https://ajv.js.org/json-schema  
   Ajv has a separate implementation for Draft 2020-12; it must not be mixed with earlier drafts in one instance.
6. Ajv formats package: https://ajv.js.org/packages/ajv-formats.html  
   ajv-formats supplies RFC 3339 date-time validation and requires a timezone for date-time values.
7. Temporal polyfill documentation: https://www.npmjs.com/package/%40js-temporal/polyfill  
   Temporal supports explicit handling of repeated and nonexistent local times; the chosen validation policy is reject followed by clarification.
8. npm package metadata: https://www.npmjs.com/package/ajv?activeTab=versions, https://www.npmjs.com/package/ajv-formats?activeTab=versions, and https://www.npmjs.com/package/%40js-temporal/polyfill?activeTab=versions  
   The planned exact versions at research time are Ajv 8.20.0, ajv-formats 3.0.1, and @js-temporal/polyfill 0.5.1. All will be pinned in package.json and pnpm-lock.yaml.

## Unresolved before implementation

- The actual provider/model and compatible base URL will be selected locally by the student. The app must not assume one brand-specific endpoint.
- Live evaluation cannot be reported as passing until local provider configuration and network access are available. If unavailable, preserve the real INCONCLUSIVE result; never substitute mock outputs for final model evidence.
- Semantic rubric feasibility and false acceptance must be checked against actual cases. Do not tune thresholds after observing model output; any threshold change first requires a spec change and approval.
