# Feature Specification: Smart Todo Local Service

**Feature Branch**: `001-smart-todo-api`

**Created**: 2026-11-12

**Status**: Approved by student on 2026-11-13

**Input**: User description: Build the assignment's Part 1A Smart Todo application with task CRUD, tag filtering, JSON persistence, priority sorting, and task-status transitions.

## Clarifications

### Session 2026-11-13

- Q: Which task statuses are available and which transitions are allowed, including whether a completed task can be reopened? → A: Use queued/active/blocked/done: queued → active; active → blocked or done; blocked → active; done is terminal.
- Q: Which task priority values should the service allow, how should they be ordered, and how should ties be broken? → A: Use now > next > later; break equal-priority ties by task ID ascending.
- Q: When multiple tags are requested, must a task have all of them or may it have any one? → A: All selected tags must match (AND).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Tasks (Priority: P1)

A local client can create, view, edit, and delete task records so it can keep an accurate list of work.

**Why this priority**: Core task management is the minimum useful outcome and is explicitly required by the assignment.

**Independent Test**: Create one task, retrieve it, change its title or notes, retrieve the changed record, delete it, and verify it is no longer available.

**Acceptance Scenarios**:

1. **Given** an empty task list, **When** a client submits a valid task, **Then** the service returns a created task with a stable unique identifier and status queued.
2. **Given** an existing task, **When** a client requests it by identifier, **Then** the service returns its stored fields.
3. **Given** an existing task, **When** a client changes allowed fields, **Then** the returned and stored task reflects those changes while unrelated fields remain unchanged.
4. **Given** an existing task, **When** a client deletes it, **Then** the service confirms deletion and later retrieval reports that the task does not exist.

---

### User Story 2 - Preserve Tasks and Reject Invalid Changes (Priority: P1)

A local client can rely on accepted work surviving a normal restart and on invalid requests leaving the task list intact.

**Why this priority**: Persistence and safe validation are required for consistent behavior and protection of existing work.

**Independent Test**: Create tasks, restart the service with the same data location, retrieve the tasks, then submit invalid requests and compare the task list before and after.

**Acceptance Scenarios**:

1. **Given** one or more accepted tasks, **When** the service is stopped and started again with the same data, **Then** every accepted task remains available with the same fields and identifiers.
2. **Given** a malformed request or request with an invalid field, **When** the client submits it, **Then** the service returns a clear validation error and the stored task list remains unchanged.
3. **Given** a request for an unknown task identifier, **When** the client retrieves, edits, transitions, or deletes it, **Then** the service returns HTTP 404 and changes no other task.

---

### User Story 3 - Find and Order Tasks (Priority: P2)

A local client can narrow the list by tag and request tasks in priority order to focus on relevant work.

**Why this priority**: Tag filtering and priority sorting are explicit assignment requirements and improve task discovery.

**Independent Test**: Create a mixed set of tagged tasks with different priorities, request filtered and sorted views, and compare each result with the expected records and order.

**Acceptance Scenarios**:

1. **Given** tasks with different tags, **When** a client filters by one or more tags, **Then** every returned task contains all selected tags; tag matching is exact, case-insensitive, and trims surrounding whitespace.
2. **Given** tasks with different priorities, **When** a client requests priority sorting, **Then** tasks appear in now, next, later order; equal-priority tasks are ordered by task ID ascending.
3. **Given** a tag that no task has, **When** a client filters by that tag, **Then** the service returns an empty task list rather than an error.

---

### User Story 4 - Advance Task Status (Priority: P2)

A local client can move a task through a defined status lifecycle to represent work progress.

**Why this priority**: Status transitions are an explicit assignment requirement; rejecting invalid transitions prevents misleading task state.

**Independent Test**: Apply each allowed transition, verify the stored status, then try each prohibited transition and verify the status remains unchanged.

**Acceptance Scenarios**:

1. **Given** a task in status queued, active, or blocked, **When** the client requests queued → active, active → blocked or done, or blocked → active, **Then** the service stores and returns the new status.
2. **Given** a task in status done or any task asked to take a transition outside the allowed graph, **When** the client requests that transition, **Then** the service returns HTTP 409 and leaves the task unchanged.
3. **Given** a task with an unknown identifier, **When** the client requests a status transition, **Then** the service returns HTTP 404 and leaves all task data unchanged.

### Edge Cases

- Listing or filtering when no tasks exist returns an empty task list.
- Retrieving, editing, transitioning, or deleting a missing identifier returns HTTP 404.
- Blank, missing, or overlong title; overlong notes; duplicate or malformed tags.
- Unknown fields, invalid priority values, invalid status values, and prohibited status transitions.
- Malformed request data returns HTTP 400; request bodies larger than 65,536 bytes return HTTP 413.
- Multiple tag filters require all selected tags to match; tag comparison is exact, case-insensitive, and trims surrounding whitespace.
- Equal-priority tasks use task ID ascending as a stable tie-break.
- A malformed or unreadable data file causes a safe startup failure; a failed replacement returns a generic storage error and does not discard valid existing data.
- A normal restart after accepted mutations preserves tasks and identifiers.
- Concurrent mutations are serialized by the service so each accepted change is reflected in the next operation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST allow a local client to create a task with a trimmed title of 1 to 120 characters, optional notes of at most 2,000 characters, a priority, and zero or more tags. Omitted notes MUST be stored as an empty string; omitted tags MUST be stored as an empty array.
- **FR-002**: The service MUST assign each accepted task a stable unique identifier, MUST NOT reuse an identifier after deletion, and MUST set the initial status to queued.
- **FR-003**: The service MUST allow a client to list all tasks and retrieve one task by identifier. Listing and retrieval MUST return HTTP 200. An unfiltered list MUST be ordered by task ID ascending and MUST return an object containing a tasks array.
- **FR-004**: The service MUST allow a client to edit title, notes, priority, and tags without changing unrelated fields, and MUST return HTTP 200 after a successful edit. Status changes MUST use the status-transition behavior in FR-008. Unsupported fields MUST be rejected.
- **FR-005**: The service MUST allow a client to delete an existing task. It MUST return HTTP 200 with a JSON result containing deleted=true and the task identifier; later retrieval MUST return HTTP 404.
- **FR-006**: The service MUST allow filtering by exact tag match after trimming and case-folding. When multiple tags are supplied, a task MUST contain every selected tag (AND matching). Each task MUST have at most 10 non-empty tags; each tag MUST be at most 32 characters; duplicates after trimming and case-folding MUST be rejected.
- **FR-007**: The service MUST support priorities now, next, and later, sorted now first, next second, and later third. Tasks with equal priority MUST be ordered by task ID ascending.
- **FR-008**: The service MUST use statuses queued, active, blocked, and done. It MUST allow queued → active, active → blocked or done, and blocked → active. Status done is terminal; every other transition MUST return HTTP 409 without changing the task.
- **FR-009**: The service MUST persist accepted tasks in a JSON file and restore them after a normal restart using the same configured local data location. The location MUST be selected by local configuration, never by request data. The service MUST NOT report a mutation as successful before persistence succeeds.
- **FR-010**: The service MUST return HTTP 400 with error code INVALID_REQUEST for malformed JSON, invalid field values, missing required fields, unknown fields, or invalid status values. Request bodies larger than 65,536 bytes MUST return HTTP 413 with error code REQUEST_TOO_LARGE. Rejected requests MUST leave stored task state unchanged.
- **FR-011**: The service MUST return HTTP 404 with error code NOT_FOUND for unknown task identifiers without modifying any task.
- **FR-012**: The service MUST return HTTP 500 with error code STORAGE_ERROR and a generic message when task data cannot be read or written during a request. The response MUST NOT expose filesystem paths, stack traces, or secret values. At startup, malformed or unreadable existing data MUST cause a safe startup failure and MUST NOT be silently replaced. A failed write MUST preserve the prior valid data.
- **FR-013**: Every application response MUST use JSON. Creation MUST return HTTP 201 with an object containing a task field. Successful retrieval, listing, editing, status transition, and deletion MUST return HTTP 200; a single-task result MUST contain task, a list MUST contain tasks, and deletion MUST contain deleted=true and id. Errors MUST return an error object with stable code and message fields; invalid transitions use code INVALID_TRANSITION and HTTP 409.
- **FR-014**: By default, the service MUST be available only from the local machine and MUST NOT expose task data to remote network clients.

### Key Entities *(include if feature involves data)*

- **Task**: A unit of work represented by id, title, notes, priority, status, and tags. Priority is now/next/later; status is queued/active/blocked/done. Notes is an empty string and tags is an empty array when omitted. The record has no automatic timestamps so equivalent inputs and state produce repeatable results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A client can create, retrieve, edit, and delete tasks and receives the expected task state for every valid acceptance scenario.
- **SC-002**: After a normal restart, 100% of accepted tasks remain retrievable with unchanged identifiers and fields.
- **SC-003**: Every invalid-input scenario in the approved suite returns its documented HTTP status and error code and leaves the persisted task list unchanged.
- **SC-004**: For a list of 100 tasks, a filtered and priority-sorted result contains exactly the expected records in the agreed order and completes within one second on the local test machine.
- **SC-005**: Every prohibited status transition in the approved transition table is rejected without changing the task.

## Assumptions

- The service is used by one local operator through a local client; accounts, collaboration, authentication, cloud sync, and a graphical interface are outside the initial scope.
- JSON-file persistence is mandatory. The service will use a configured local data file and will not accept a storage path from task requests.
- Each task may have at most 10 non-empty tags, each at most 32 characters; tag comparison is exact and case-insensitive after trimming. Duplicate tags after this normalization are rejected.
- Unknown task fields are rejected rather than silently stored. Deletion is an immediate service operation; any confirmation belongs to a future graphical client.
- Due dates, reminders, recurring tasks, notifications, external integrations, accounts, and third-party services are excluded.
- The service does not add timestamps to task records in the initial scope.
- Statuses and transitions are queued → active; active → blocked or done; blocked → active; done is terminal. Priorities are now > next > later, with task ID ascending for equal-priority ties. Multiple selected tags use AND matching.
- Concurrent task mutations are serialized. Only one service instance is in scope.

