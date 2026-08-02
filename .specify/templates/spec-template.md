# Feature Specification: <feature name>

**Feature directory:** `specs/<feature-slug>/`
**Status:** draft | clarified | accepted | superseded
**Owner:** <human owner>
**Issue/PR:** <references>
**Created:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD

> This artifact defines feature-specific requirements. It does not grant implementation, provider or production permission. Read `AGENTS.md`, `.specify/memory/constitution.md` and any required active MoneyFlow work packet.

## Problem and Outcome

### Observed problem

Describe who is affected, what happens today, how the behavior was verified and why it matters. Separate observed facts from inference and product judgment.

### Intended outcome

Describe the user-visible or system outcome without prescribing implementation.

### Current evidence

| Evidence | What it establishes | Limits |
|---|---|---|
| Current code/test/path | | |
| Current project memory or accepted decision | | |

## User Scenarios and Testing

Prioritize each scenario as P1, P2 or P3. Each scenario MUST be independently testable and valuable.

### User Story 1 — <title> (Priority: P1)

As a <user>, I can <action>, so that <value>.

**Why this priority:**

**Independent test:**

**Acceptance scenarios:**

1. **Given** <state>, **When** <action>, **Then** <observable result>.
2. **Given** <state>, **When** <action>, **Then** <observable result>.

### User Story 2 — <title> (Priority: P2)

As a <user>, I can <action>, so that <value>.

**Why this priority:**

**Independent test:**

**Acceptance scenarios:**

1. **Given** <state>, **When** <action>, **Then** <observable result>.

## Edge Cases and Required States

- Loading:
- Empty:
- Populated:
- Validation/error:
- Recovery/undo:
- Long data or large integer VND:
- Mobile/tablet/desktop:
- Keyboard/screen reader/enlarged text:
- Offline/network interruption, when applicable:
- Duplicate/retry/idempotency behavior, when applicable:

## Requirements

### Functional Requirements

- **FR-001:** The system MUST ...
- **FR-002:** The system MUST ...
- **FR-003:** The system MUST NOT ...

Requirements MUST be observable or verifiable. Avoid implementation details unless they are an accepted external contract.

### Financial and Data Requirements

- VND representation and calculation impact:
- Transfer treatment:
- Balance/reporting impact:
- Ownership/RLS impact:
- Soft-delete/recovery impact:
- Import/export integrity impact:
- Existing data compatibility:

Write `Not applicable` with a reason when a boundary is unaffected.

### Authentication, Security and Privacy Requirements

- Authentication/authorization impact:
- Secrets/provider impact:
- Personal or user-owned data exposure:
- Abuse/failure behavior:
- Audit or provenance requirements:

### Product and UX Requirements

- Product identity/core-job alignment:
- Vietnamese copy and terminology:
- Primary action and hierarchy:
- Accessibility:
- Responsive behavior:
- Dark/light mode, when affected:

## Success Criteria

Define measurable, implementation-independent outcomes.

- **SC-001:** <metric or observable threshold>.
- **SC-002:** <metric or observable threshold>.
- **SC-003:** <correctness/reliability outcome>.

Do not use “tests pass” as the only success criterion; tests are evidence for an outcome.

## Out of Scope

- <explicitly excluded behavior>
- <adjacent feature that requires a separate specification>

## Assumptions and Dependencies

- Assumption:
- Dependency:
- Owner decision required:

Assumptions MUST NOT invent balances, dates, commitments, income, planning data, permissions or provider state.

## Clarifications

Use this section to record resolved material ambiguity. Do not bury unresolved blockers here.

| Date | Question | Decision | Decided by | Impact |
|---|---|---|---|---|
| YYYY-MM-DD | | | | |

## Unresolved Questions

- [ ] Question that blocks planning or acceptance.

## Traceability

| Requirement/story | Source or decision | Planned evidence |
|---|---|---|
| FR-001 / US1 | | |

## Spec Acceptance

- [ ] Current repository behavior was inspected.
- [ ] User stories are independently testable.
- [ ] Financial/security/data implications are explicit.
- [ ] Required states and accessibility are covered where applicable.
- [ ] Success criteria are measurable and implementation-independent.
- [ ] Out-of-scope behavior prevents adjacent scope drift.
- [ ] Material questions are resolved or planning is blocked.
- [ ] Human owner accepted the specification when required.
