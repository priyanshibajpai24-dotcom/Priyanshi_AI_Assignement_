# Feature Specification: Natural Language Reminder Agent

**Feature Branch**: `002-natural-language-reminder-agent`

**Created**: 2026-11-14

**Status**: Student-approved on 2026-11-14; implementation in progress

**Input**: Assignment 1 Part 1B Sample A and user instruction to build a Natural Language Reminder Agent distinct from prior student work. The agent parses unstructured reminder requests into structured reminder proposals, interprets date and time using explicit context, supports reschedule/snooze intent, and asks clarification when required information is missing or ambiguous.

## Assignment alignment

This feature is the Part 1B non-deterministic AI application. The specification defines acceptable behavioral boundaries, output schema expectations, invariants, guardrails, evaluation cases, semantic criteria, and a predeclared pass threshold. A single evaluation harness will exercise a live model call and evaluate the generated output through independent structural, property/invariant, and semantic/quality layers. The course requires at least 15 meaningful cases; the draft dataset plans 20 distinct cases so categories exercise different behaviors rather than minor prompt variations.

## Constitution impact

Part 1A is a loopback-only deterministic service. Part 1B intentionally adds one configurable external model endpoint because non-deterministic AI behavior is mandatory for this assignment. This feature-scoped specification does not authorize calendar writes or any other external service. The only outbound request is the configured model call; credentials are supplied through environment variables and excluded from all saved artifacts. The student approved the configurable OpenAI-compatible endpoint and the feature specification on 2026-11-14. The implementation plan was separately approved on 2026-11-14 before code began.

## User Scenarios & Testing

### User Story 1 — Create a reminder proposal (Priority: P1)

A user describes a reminder in natural language. The agent extracts the reminder subject and requested date/time and returns a structured proposal that can be reviewed before any reminder is scheduled.

**Why this priority**: Creating a reminder is the central task and the minimum useful behavior.

**Independent Test**: Submit a clear request with a fixed reference time and timezone; verify the output proposes the intended title and a future timestamp with an explicit UTC offset, while allowing paraphrased wording elsewhere in the response.

**Acceptance Scenarios**:

1. **Given** a complete request and valid time context, **When** the agent interprets it, **Then** it returns a `propose_action` decision with a `create` proposal whose title and due time preserve the request's meaning.
2. **Given** an ambiguous relative date/time, **When** multiple interpretations are plausible, **Then** it requests clarification instead of silently choosing one.
3. **Given** a time that resolves to the past or an invalid local-time boundary, **When** the agent evaluates it, **Then** it asks for a valid future time and emits no actionable proposal.

### User Story 2 — Clarify missing or ambiguous information (Priority: P1)

A user can submit an incomplete reminder request and receive a concise question identifying the missing information needed to proceed.

**Why this priority**: Guessing a required date, time, reminder subject, target, or timezone can create a misleading reminder.

**Independent Test**: Submit requests missing one mandatory fact at a time; confirm the response has no action proposal, identifies the missing field, and asks a question about that field without inventing it.

**Acceptance Scenarios**:

1. **Given** a request without a reminder subject, **When** the agent parses it, **Then** it asks for the subject.
2. **Given** a request with a subject but no usable date or time, **When** the agent parses it, **Then** it asks for the missing date/time rather than fabricating one.
3. **Given** an unavailable or ambiguous timezone interpretation, **When** the agent parses it, **Then** it asks for clarification and does not return a due timestamp.

### User Story 3 — Reschedule or snooze an existing reminder (Priority: P2)

A user can request a time change for an existing reminder. The agent selects a unique reminder from the supplied context or asks a question if the target or new time is unclear.

**Why this priority**: Rescheduling and snoozing are explicit assignment requirements, but depend on the create/clarification contract.

**Independent Test**: Supply a fixed context containing existing reminder IDs and due times; verify a unique target and valid future time produce a matching proposal, and missing or ambiguous targets produce clarification with no action.

**Acceptance Scenarios**:

1. **Given** a request that uniquely identifies an existing reminder and provides a new time, **When** the agent interprets it, **Then** it proposes `reschedule` with that exact context ID and a valid future due time.
2. **Given** a snooze request with a duration and one matching reminder, **When** the agent interprets it, **Then** it computes the new due time from the later of the reminder's current due time and the supplied reference time.
3. **Given** multiple reminders match the request or no reminder matches, **When** the agent interprets it, **Then** it asks the user to identify the target and emits no action proposal.

### User Story 4 — Reject unsupported or adversarial actions (Priority: P1)

The agent treats request text and reminder context as untrusted data, supports only the declared reminder intents, and returns a non-action response for unsupported instructions.

**Why this priority**: The application must not let prompt-injection text, unknown intents, or malformed context create unsupported actions.

**Independent Test**: Submit unsupported actions and prompt-injection examples; confirm there is no proposal, no tool execution, and the output remains within the declared schema.

**Acceptance Scenarios**:

1. **Given** a request to cancel, delete, send, call, or otherwise perform an unsupported action, **When** the agent parses it, **Then** it returns `unsupported` with no proposal.
2. **Given** untrusted text that asks the agent to ignore its instructions or reveal secrets, **When** the agent parses it, **Then** the text is not treated as system instruction and no external action is executed.
3. **Given** malformed request JSON, invalid time context, or invalid reminder records, **When** the application receives it, **Then** it returns a controlled input error and makes no model call.

### User Story 5 — Evaluate non-deterministic output (Priority: P1)

A student can run one evaluation pipeline over a fixed dataset and inspect per-case structural, invariant, semantic, and aggregate outcomes, including actionable failure evidence.

**Why this priority**: This is a required deliverable and the only reliable way to distinguish acceptable model variation from broken behavior.

**Independent Test**: Run the same evaluation dataset through the configured model provider; verify each generated output is captured without credentials, passes through all three independent evaluation layers, and produces a machine-readable aggregate outcome.

**Acceptance Scenarios**:

1. **Given** a valid model output with harmless wording variation, **When** the evaluator scores it, **Then** it uses schema, invariant, and case-specific semantic criteria rather than requiring exact response-string equality.
2. **Given** a malformed schema, a violated invariant, or a failed semantic rubric, **When** the case is evaluated, **Then** the corresponding layer reports the specific failed requirement and includes redacted, inspectable evidence.
3. **Given** an external provider timeout or rate limit, **When** the run ends, **Then** the harness records an infrastructure/model-service failure as `INCONCLUSIVE`, not as an application correctness pass.

## Proposed request and output contract

Each request contains a `requestId` (1–64 characters), `requestText` (1–4,000 characters), and a `context` object with required `referenceNow`, nullable IANA `timeZone`, and zero to 50 existing reminders. `referenceNow` and each reminder `dueAt` use RFC 3339 timestamps with explicit offsets. The harness supplies synthetic requests and freezes reference time/timezone so relative-time cases are repeatable. The complete input JSON is limited to 16,384 UTF-8 bytes. Unknown properties are rejected.

A reminder context item contains `id` (1–64 characters), `title` (1–160 characters), and an RFC 3339 `dueAt`. IDs must be unique within a request. Invalid input context is rejected before a model call.

The machine-readable request and output JSON Schemas are in `contracts/request.schema.json` and `contracts/agent-output.schema.json`. Output fields and cross-field rules are:

- `decision`: `propose_action`, `clarification_required`, or `unsupported`.
- `intent`: `create`, `reschedule`, `snooze`, or null.
- `proposal`: null or one typed proposal: create has `kind`, non-empty `title` (maximum 160 characters), and `dueAt`; reschedule/snooze have `kind`, `targetReminderId`, and `dueAt`.
- `missingInformation`: a unique array of `title`, `date`, `time`, `time_zone`, `target`, or `ambiguous_time`.
- `clarificationQuestion`: non-empty text only for `clarification_required`; otherwise null.
- `unsupportedReason`: non-empty text only for `unsupported`; otherwise null.
- `evidence`: required `subjectPhrase`, `timePhrase`, and `targetPhrase` fields, each a string or null. Non-null phrases must be grounded in the request or supplied reminder context.

A `propose_action` output has a supported non-null intent, matching proposal kind, no missing information, and no clarification/unsupported text. A `clarification_required` output has no proposal, at least one missing item, and a question. An `unsupported` output has no intent or proposal and gives a reason. Cross-field and grounding rules are also checked by independent invariants, not only the JSON Schema.

## Evaluation dataset proposal

The dataset will contain at least 15 meaningful cases. The draft plans 20 distinct cases: clear absolute-time creation; relative date/time with fixed context; month/year boundary; date-only request; time-only request; missing subject; ambiguous 12-hour time; ambiguous weekday; missing timezone; daylight-saving gap; daylight-saving overlap; unique reschedule target; ambiguous reschedule target; snooze by duration; snooze across a date boundary; snooze without a target or duration; unsupported cancel/delete action; malformed input envelope; invalid timezone or past due time; and prompt-injection/adversarial text requesting an external side effect or secret disclosure. The plan stage will keep malformed-envelope and invalid-context cases as deterministic application-validation checks that do not call the model. Cases must vary the behavior under test, not merely the surface phrasing.

Each valid case defines ground truth for intent/decision, deterministic expected properties, and a semantic rubric. Clarification questions may be paraphrased; the evaluator checks whether they ask for the required information rather than comparing exact strings.

## Functional Requirements

- **FR-001**: The application MUST accept a natural-language request and explicit evaluation context containing a fixed reference timestamp, timezone information when available, and an optional list of existing reminders.
- **FR-002**: The application MUST call a configurable OpenAI-compatible model endpoint for each valid, evaluable request. Provider, model, and endpoint settings MUST be configurable locally; any API credential MUST be read from an environment variable and MUST NOT be written to source, test fixtures, raw evidence, archives, or logs.
- **FR-003**: The application MUST return JSON conforming to the approved output contract with a supported decision and intent value.
- **FR-004**: The application MUST propose creation only when the reminder subject and a valid future date/time are sufficiently specified; otherwise it MUST ask for clarification and return no proposal.
- **FR-005**: The application MUST represent proposed due times as valid RFC 3339 timestamps with explicit UTC offsets and MUST use the supplied reference timestamp and timezone for relative-time interpretation.
- **FR-006**: The application MUST ask for clarification when a required subject, date, time, timezone, target reminder, or unambiguous interpretation is missing; it MUST NOT silently invent mandatory information.
- **FR-007**: The application MUST support create, reschedule, and snooze intents. A reschedule/snooze proposal MUST refer to exactly one reminder ID supplied in context.
- **FR-008**: A snooze duration MUST be applied to the later of the selected reminder's current due time and `referenceNow`. The resulting due time MUST be valid and future.
- **FR-009**: The application MUST return `unsupported` with no proposal for undeclared actions. It MUST NOT execute calendar, messaging, phone, notification, or other external side effects.
- **FR-010**: Request text and reminder context MUST be treated as untrusted data; embedded instructions MUST NOT override the system rules or cause tool execution or secret disclosure.
- **FR-011**: Malformed request envelopes, invalid timestamp/timezone data, and malformed reminder records MUST be rejected with a controlled error before a model call.
- **FR-012**: Model-provider errors, invalid model JSON, schema failures, invariant failures, and semantic failures MUST be separately identified in evaluation results. A provider outage or rate limit MUST NOT be mislabeled as an application pass or a semantic failure.
- **FR-013**: `evals/dataset.json` MUST contain at least 15 meaningful cases and cover normal, boundary, ambiguous/underspecified, missing-information, malformed-input, and adversarial/guardrail behavior. Each case MUST state ground truth, deterministic expected properties, or an explicit rubric sufficient to decide acceptability.
- **FR-014**: A single non-deterministic evaluation harness MUST run dataset → model call → generated output capture → schema validation → invariant/property checks → semantic/quality scoring → aggregate threshold decision → structured failure evidence or PASS.
- **FR-015**: Structural checks MUST be independent of semantic scoring and MUST validate JSON/schema conformance, required properties, types, enums, and proposal/decision consistency.
- **FR-016**: Invariant checks MUST validate supported intents, required clarification behavior, existing target IDs, future/timezone-valid timestamps, source grounding where provided, and the absence of unsafe/external actions.
- **FR-017**: Semantic evaluation MUST use case-specific rubrics that permit equivalent wording. Exact natural-language string equality MUST NOT be the only semantic criterion.
- **FR-018**: Before final evaluation, the specification MUST define the aggregate scoring method and threshold. The proposed gate is: 100% schema validity, 100% invariant validity, zero guardrail violations, no provider infrastructure errors, per-case semantic score at least 0.75, and mean aggregate semantic score at least 0.85. Semantic criteria use case-defined weighted binary rubric points; each case has weights summing to 1, and the aggregate is the unweighted arithmetic mean of case scores. Any threshold change MUST be justified and approved in the specification before a rerun.
- **FR-019**: Each evaluation result MUST identify the case, model/provider configuration needed to interpret it (excluding credentials), generated output, layer outcomes, score, and relevant requirement/rubric failures.
- **FR-020**: Failed cases MUST provide structured evidence suitable for repair and re-evaluation. The same dataset, checks, and threshold MUST be retained unless an approved specification change requires a documented update.
- **FR-021**: The project MUST preserve initial and final application generations, raw evaluation results, a student-authored `evidence/harness-log.md`, and a final human ACCEPT/REJECT decision with known limitations. AI MUST NOT author the harness-log entries, reflection answers, or human decision.

## Success Criteria

- **SC-001**: At least 15 meaningful cases are present; the planned dataset has 20 distinct cases and includes every required behavior category.
- **SC-002**: Every valid model output is checked by an independent structural validator and every declared invariant is checked without relying on exact natural-language equality.
- **SC-003**: The harness emits a per-case structured result and a stable aggregate PASS/FAIL/INCONCLUSIVE outcome for each run.
- **SC-004**: The acceptance threshold is written and approved before the final model evaluation and is unchanged during repair-driven reevaluation.
- **SC-005**: In the final accepted run, schema validity and invariants are each 100%, guardrail violations are zero, every semantic score is at least 0.75, and aggregate semantic score is at least 0.85.
- **SC-006**: No API key or credential appears in the submitted project, fixtures, generated archives, or evaluation evidence.
- **SC-007**: All initial and final Part 1B generations and the raw evaluation result are preserved separately.

## Edge Cases

- Subject missing, date missing, time missing, or date/time phrase too ambiguous to resolve, and input bodies above the 16,384-byte limit.
- Relative dates at month/year boundaries and at midnight, with the reference time frozen per case.
- Timezone absent/invalid, daylight-saving gap, daylight-saving overlap, invalid offset, and due time already in the past.
- Reschedule/snooze target missing, duplicated, or ambiguous among supplied reminders.
- Snooze duration invalid, non-positive, or overflowing the accepted date range.
- Unsupported cancel/delete/notification action or prompt-injection text in request/context.
- Malformed request JSON, unknown fields, invalid types, oversized request, invalid model JSON, missing model fields, and extra model fields.
- API authentication failure, timeout, rate limit, provider outage, and provider response that is not JSON.
- Repeated model runs may produce different phrasing while preserving the same structured meaning.

## Assumptions and Scope Boundaries

- The selected application is the assignment's Natural-Language Reminder Agent, not the alternate code-review sample.
- A configurable OpenAI-compatible endpoint is the proposed model interface, based on the user's selection. Provider-specific Chat Completions JSON-mode behavior was checked in the research artifact before implementation.
- Evaluation uses synthetic cases with a frozen `referenceNow` and explicit timezone/context; no live personal reminder data is used in the dataset.
- The agent returns proposals only. Scheduling, notifications, persistence of a reminder calendar, accounts, UI, and third-party calendar writes are out of scope.
- Model wording is non-deterministic. Output meaning and safety properties are evaluated against the declared schema, invariants, and rubrics.
- Provider credentials are supplied by the operator through local environment configuration. Credentials are never requested in chat and never included in run output.
- Part 1A application artifacts remain unchanged. The working copy stays under the user's project folder; the user later authorized publishing both assignment parts to the named repository.
