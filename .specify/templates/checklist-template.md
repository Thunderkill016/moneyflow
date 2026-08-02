# Requirements Quality Checklist: <feature or concern>

**Feature:** `specs/<feature-slug>/spec.md`  
**Purpose:** Validate requirement quality and acceptance coverage before implementation or review.  
**Created:** YYYY-MM-DD

> This checklist tests whether requirements are complete, clear and internally consistent. It is not an implementation test list and checking boxes does not grant permission to merge or deploy.

## Scope and Evidence

- [ ] The observed problem cites current repository or user evidence.
- [ ] Intended outcomes are user/system observable rather than implementation instructions.
- [ ] Out-of-scope behavior excludes adjacent product expansion.
- [ ] Old issues, historical research and unmerged artifacts are not treated as current truth without verification.

## User Scenarios

- [ ] Each user story has a clear actor, action and value.
- [ ] Each priority is justified.
- [ ] Each story can be tested independently.
- [ ] Acceptance scenarios include normal, failure and recovery behavior where applicable.
- [ ] Edge cases with long data, large integer VND, duplicate/retry or network interruption are covered when relevant.

## Financial, Data and Security

- [ ] Integer VND behavior is explicit or demonstrably unaffected.
- [ ] Transfer treatment is explicit or demonstrably unaffected.
- [ ] Balance/reporting consequences are defined.
- [ ] Ownership, RLS and tenant isolation are defined or demonstrably unaffected.
- [ ] Destructive behavior includes recovery.
- [ ] Authentication, secrets, provider and privacy impacts are explicit.
- [ ] No requirement invents financial data, planning assumptions, permissions or provider state.

## Product and UX

- [ ] The feature aligns with MoneyFlow's manual-first ledger identity and core jobs.
- [ ] Unsupported bank sync, AI advice, OCR identity, family finance, business accounting or full envelope budgeting is not introduced implicitly.
- [ ] Loading, empty, populated, error and recovery states are defined when applicable.
- [ ] Vietnamese terminology is clear and non-judgmental.
- [ ] Mobile/tablet/desktop, keyboard, screen reader and enlarged-text behavior is defined for affected UI.
- [ ] Money meaning does not depend on color alone.

## Measurability and Traceability

- [ ] Functional requirements are observable and uniquely identifiable.
- [ ] Success criteria are measurable and implementation-independent.
- [ ] Every user story and requirement maps to planned evidence.
- [ ] Material assumptions and dependencies are explicit.
- [ ] Unresolved questions block planning instead of being silently guessed.

## Governance

- [ ] The change class and full-packet decision are recorded.
- [ ] The specification does not weaken `AGENTS.md`, the constitution or financial invariants.
- [ ] Permission boundaries and owner-only actions are preserved.
- [ ] New tools/dependencies/providers include adoption and rollback criteria.
- [ ] A requirement change will update `spec.md` before implementation scope changes.

## Findings

| ID | Severity | Requirement/section | Finding | Required correction |
|---|---|---|---|---|
| C001 | high/medium/low | | | |

Unchecked items and findings remain open evidence; do not mark them complete without verification.