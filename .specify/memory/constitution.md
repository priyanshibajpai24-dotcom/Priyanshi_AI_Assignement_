# Project AI Smart Todo API Constitution

## Core Principles

### I. Contract-First REST Behavior
Every route MUST have a documented request, response, and HTTP status contract in the approved specification. The API MUST return JSON for application responses. Given the same stored state and the same valid request sequence, it MUST produce the same task state and ordering. Generated task identifiers MUST come from a persisted monotonic counter so restarts do not change identifier allocation.

### II. Durable and Validated JSON Persistence
The application MUST validate a complete request before changing task state. A rejected request MUST leave the persisted file unchanged. Each accepted mutation MUST preserve valid JSON by writing a temporary file in the same directory and atomically replacing the configured data file. The API MUST never accept a storage path from a request.

### III. Independent, Requirement-Derived Verification
The deterministic harness MUST verify behavior through HTTP requests to a running application process and an isolated temporary data file; it MUST NOT import application internals. Automated tests MUST map to approved acceptance criteria. The harness MUST expose separate, unambiguous outcomes for tests, lint, and security analysis. An automated PASS MUST be followed by the student's human review.

### IV. Safe Local Service
The service MUST bind to the loopback interface by default. It MUST validate allowed fields, values, and request sizes before processing input. It MUST not return stack traces or filesystem details in API responses. No credentials, tokens, or secrets may be stored in source, fixtures, or submitted evidence.

### V. Small, Traceable Changes
The runtime MUST use Node.js and built-in HTTP and filesystem modules unless the approved plan justifies an added runtime dependency. Every production behavior MUST trace to an approved requirement and task. Tests, thresholds, and specifications MUST NOT be weakened to obtain PASS; any legitimate requirement change must be made through Spec Kit artifacts first.

## Technical & Security Constraints

- The application is a local REST API with JSON-file persistence. A graphical interface, cloud sync, authentication, and external services are outside the initial scope unless the approved specification changes.
- The service MUST use the configured data-file path or its documented local default. Untrusted request data MUST never select files or directories.
- The API MUST reject malformed JSON, invalid field types, unsupported values, oversized bodies, and invalid state transitions with documented 4xx responses; rejected mutations MUST not change stored state.
- The implementation and harness MUST avoid network access beyond loopback requests. Test fixtures MUST use temporary storage isolated from user data.

## Workflow & Acceptance

- Work MUST follow the initialized Spec Kit workflow: constitution, specify, clarify, plan, tasks, analyze, implement, and convergence/review where applicable.
- The feature specification and acceptance criteria MUST be reviewed before implementation begins. Implementation tasks and tests MUST trace back to those approved artifacts.
- Lint, security analysis, deterministic tests, and black-box harness checks MUST run using their documented commands. Raw outputs and machine-generated results MUST be preserved without manual alteration.
- Genuine failures MUST be preserved with the failing case, expected and observed behavior, relevant output, repair, and rerun result. A failure MUST NOT be manufactured for evidence.
- The assignment prohibits AI-generated reflection answers and narrative harness-log entries. The student MUST write those entries and make the final human ACCEPT/REJECT decision after reviewing the actual evidence. AI assistance MUST not be misrepresented as unaided work.

## Governance

This constitution governs the Smart Todo API and takes precedence over implementation convenience. Changes to requirements, acceptance criteria, or these principles MUST be documented in the relevant Spec Kit artifacts before dependent code or tests are changed. Constitution changes MUST use semantic versioning: MAJOR for incompatible principle changes, MINOR for new or materially expanded principles, and PATCH for clarifications that do not change policy. The student reviews the constitution and each feature specification before implementation, inspects the preserved validation evidence, and makes the final acceptance decision. The temporary Sync Impact Report at the top of this draft MUST be removed after review and before the constitution is committed.

**Version**: 1.0.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13

