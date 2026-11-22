# Data Model: Smart Todo Local Service

## Task entity

| Field | Type | Required | Validation / invariant |
|---|---|---:|---|
| `id` | positive integer | Server-assigned | Stable and unique; never reused after deletion; allocation is monotonic across restarts. |
| `title` | string | Yes | Trim surrounding whitespace, then require 1–120 characters. |
| `notes` | string | No | At most 2,000 characters; omission is stored as an empty string. |
| `priority` | enum | Yes | `now`, `next`, or `later`; order is now, next, later. |
| `status` | enum | Server-assigned on create | `queued`, `active`, `blocked`, or `done`; starts as `queued`. |
| `tags` | string array | No | Omission is an empty array; at most 10 non-empty tags, each at most 32 characters. Tags that duplicate after trim and case-folding are invalid. |

No timestamps or additional task fields are stored. Unknown request fields and invalid persisted records are rejected.

## Persistent document

The configured JSON file contains one object:

| Field | Type | Rule |
|---|---|---|
| `formatVersion` | positive integer | Starts at `1`; unknown versions fail startup without rewriting the file. |
| `nextId` | positive integer | Next unused ID; remains greater than every allocated ID, including deleted IDs. |
| `tasks` | array of Task | Unique IDs; each record satisfies the Task invariants above. |

A missing file represents an empty task collection with `nextId: 1`. An existing malformed, unreadable, or invalid document causes startup to fail safely and is not replaced. Persist candidate mutations before publishing them as successful or updating the live state. All mutations are serialized.

## State transitions

| Current status | Allowed next status |
|---|---|
| `queued` | `active` |
| `active` | `blocked`, `done` |
| `blocked` | `active` |
| `done` | none |

A syntactically invalid status is `400 INVALID_REQUEST`; a valid status outside this transition table is `409 INVALID_TRANSITION`. Unknown task IDs remain `404 NOT_FOUND`.

## Derived views

- Default list order: numeric task ID ascending.
- Priority list order when requested: `now`, `next`, `later`, then numeric task ID ascending within a priority.
- Tag filters are normalized by trimming and case-folding for comparison. With multiple selected filter values, a task must contain every selected tag (AND).
- Stored display spelling is preserved after surrounding whitespace is trimmed.
