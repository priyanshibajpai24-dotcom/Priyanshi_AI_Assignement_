# Data Model: Natural Language Reminder Agent

Status: Planning artifact derived from the approved feature specification. These are evaluation and process records; the app does not persist a reminder calendar.

## Input entities

### ReminderRequest

| Field | Type / bounds | Validation and use |
|---|---|---|
| requestId | string, 1-64 chars | Required unique label within a dataset run; no credentials or personal data. |
| requestText | string, 1-4,000 chars | Required untrusted natural-language instruction. Treated only as user data, never as system/developer instructions. |
| context.referenceNow | RFC 3339 date-time with explicit offset | Required fixed instant for relative date and snooze calculations. |
| context.timeZone | IANA time-zone string or null | Required context member. Null means local-time interpretation cannot be silently guessed. Invalid IDs are rejected before provider call. |
| context.reminders | array of 0-50 ReminderContext items | Required array; synthetic evaluation context only. IDs must be unique. |
| serialized request | UTF-8 JSON, at most 16,384 bytes | Size checked before provider call. Unknown properties rejected. |

### ReminderContext

| Field | Type / bounds | Validation and use |
|---|---|---|
| id | string, 1-64 chars | Unique within request; only valid target ID for reschedule/snooze. |
| title | string, 1-160 chars | Existing reminder text; untrusted context, never instructions. |
| dueAt | RFC 3339 date-time with explicit offset | Existing reminder instant; used with referenceNow for snooze base. |

## AgentOutput

| Field | Type / allowed values | Cross-field rule |
|---|---|---|
| decision | propose_action, clarification_required, unsupported | Required. |
| intent | create, reschedule, snooze, or null | Must match proposal kind for propose_action; null for unsupported. |
| proposal | null or typed proposal | Present only for propose_action. Create requires title and dueAt; reschedule/snooze require targetReminderId and dueAt. |
| missingInformation | unique list of title, date, time, time_zone, target, ambiguous_time | Empty when proposing or unsupported; non-empty when clarification is required. |
| clarificationQuestion | non-empty string or null | Text only for clarification_required. It asks for missing information and must not imply an action already occurred. |
| unsupportedReason | non-empty string or null | Required text only for unsupported. |
| evidence.subjectPhrase | string or null | If non-null, exact source phrase from request or supplied reminder title. |
| evidence.timePhrase | string or null | If non-null, exact source phrase from request/context. |
| evidence.targetPhrase | string or null | If non-null, exact source phrase from request/context. |

### Proposal variants

- CreateProposal: kind=create, title 1-160 chars, dueAt RFC 3339 with explicit offset.
- ExistingReminderProposal: kind=reschedule or snooze, targetReminderId equal to one context reminder ID, dueAt RFC 3339 with explicit offset.
- NoProposal: null.

## Evaluation entities

### EvaluationCase

Each dataset case contains caseId, category, request (valid request or deliberately invalid raw input), expected execution path, expected decision/intent where applicable, expected deterministic properties, and weighted semantic criteria. Invalid-input cases expect controlled validation error and no provider invocation; semantic score is not applicable because no model output exists. Model-call cases have semantic rubric weights summing to 1.

The 20 planned cases span clear creation, fixed relative time, month/year rollover, missing date, missing time, missing subject, ambiguous 12-hour time, ambiguous weekday, missing zone, daylight-saving gap, daylight-saving overlap, unique reschedule, ambiguous reschedule target, duration snooze, snooze across day boundary, incomplete snooze, unsupported cancellation, malformed request envelope, invalid zone or past due time, and prompt injection/side-effect request.

### CaseResult

A result records runId, caseId/category, provider and model labels, endpoint host label (without key or query secrets), returned model version/request ID when available, elapsed milliseconds, execution classification, generated output or redacted parse error, schema result, invariant result, semantic criteria and score when applicable, guardrail result, status, and structured failure list.

Execution classifications: model_evaluated, input_rejected, provider_error, invalid_model_json. Final case statuses: PASS or FAIL for evaluated behavior; INCONCLUSIVE for provider/configuration/network infrastructure failures. input_rejected is the expected PASS path only for cases declared invalid-input. No credential, Authorization header, secret-bearing URL, or unredacted provider error body is stored.

### EvaluationRun

A run has runId, UTC start/end, dataset SHA-256, app-generation identifier, prompt version, non-secret provider/model settings, threshold version, counts by outcome, per-case results, aggregate semantic score over model-evaluated cases, and final PASS/FAIL/INCONCLUSIVE. Threshold rules are copied from approved FR-018 and cannot be edited by the evaluator.

### Evidence artifacts

Under evidence/part-1b:
- initial-generation: first complete source generation archive and SHA-256 manifest, captured before repair cycles.
- final-generation: accepted final source generation archive and SHA-256 manifest.
- raw: unaltered command output/status, individual evaluation JSON, aggregate result, and SAST/lint/test results, with secrets excluded.
- harness-log.md: student-authored run-entry scaffold and final human review area; AI must not fill narrative entries or final decision.

## Time and target invariants

- Every proposal is a future instant relative to request.referenceNow.
- dueAt parses as RFC 3339 and carries an explicit offset.
- When a zone is supplied, the instant and local civil date/time must be consistent with the IANA zone; DST gaps and overlaps require clarification rather than arbitrary disambiguation.
- reschedule/snooze targetReminderId matches exactly one supplied reminder.
- Snooze uses later(existing dueAt, referenceNow) plus the stated positive duration.
- Non-null evidence phrases are source-grounded.
- Unsupported and clarification decisions have no actionable proposal; no external side effect is executed.
