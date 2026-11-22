# Requirements Quality Checklist: Natural Language Reminder Agent

**Purpose**: Review whether the draft specification is testable and covers the Part 1B assignment rubric before planning.
**Created**: 2026-11-14
**Feature**: [spec.md](../spec.md)
**Review status**: Draft; student review/approval pending.

## Assignment and scope

- [x] The selected Part 1B application matches the requested Natural-Language Reminder Agent sample.
- [x] The spec describes non-deterministic model behavior and acceptable behavioral boundaries.
- [x] Create, reschedule, snooze, clarification, unsupported intent, and no-side-effect boundaries are specified.
- [x] The separate Part 1A application and evidence are explicitly kept unchanged.

## Contract and safety

- [x] Output decisions/intents/proposals, timestamps, clarification fields, and unsupported cases are described.
- [x] Structural validation is separate from invariant and semantic evaluation.
- [x] Timezone, future-time, target-ID, grounding, and no-external-action invariants are testable.
- [x] API credentials are environment-only and excluded from evidence and archives.
- [x] Provider failures are distinct from application/evaluation failures.

## Evaluation

- [x] Dataset minimum is at least 15 meaningful cases and the proposal covers every required category.
- [x] Cases use ground truth, expected properties, or explicit semantic rubrics.
- [x] Evaluation pipeline follows dataset → model call → schema → invariants → semantic score → threshold → structured result.
- [x] Threshold and scoring criteria are declared before evaluation and cannot be weakened to obtain PASS.
- [x] Repair and re-evaluation preserve the same dataset and threshold absent an approved spec change.

## Student review gate

- [ ] Student approves or edits the specification before plan/research work proceeds.
- [ ] Provider response format and dependency choices are confirmed by research during planning.
- [ ] Student approves the implementation plan before tasks/code implementation.

## Notes

- This is a draft generated from the assignment requirements and user choices. No code or evaluation cases have been implemented.
- The assignment prohibits AI-generated harness-log entries, reflection answers, and the student's final human decision; those remain student-authored.
