# Requirements Quality Checklist: Account register and detail

**Feature:** `specs/001-account-register-detail/spec.md`  
**Purpose:** Validate the feature contract before exact-head evaluation.  
**Created:** 2026-08-02

## Scope and Evidence

- [x] The observed problem cites current account and finance workspaces.
- [x] Outcomes are user-observable and do not prescribe a new persistence model.
- [x] Out-of-scope behavior excludes reconciliation, mutation duplication and transaction-filter work.
- [x] Closed PR #222 is treated as owner-decision provenance, not implementation authority.

## User Scenarios

- [x] Account-card navigation and direct-route access are independently testable.
- [x] Populated and empty account registers are defined.
- [x] Source and destination transfer behavior is explicit.
- [x] Archived and inaccessible account behavior is explicit.
- [x] Long data, large integer money and phone-width behavior are covered.

## Financial, Data and Security

- [x] Integer minor-unit behavior is preserved.
- [x] Transfers remain separate from income and expense.
- [x] Existing derived account balance remains authoritative.
- [x] Existing viewer-scoped loaders and RLS remain the ownership boundary.
- [x] No destructive behavior is added.
- [x] No schema, provider, secret or production-data impact exists.
- [x] No requirement invents balance, history, permission or reconciliation state.

## Product and UX

- [x] The feature deepens the manual-first ledger and current account loop.
- [x] No bank sync, advice, statement matching or accounting-heavy workflow is introduced.
- [x] Loading/error, empty and populated states are defined.
- [x] Vietnamese copy is factual and labels transfers explicitly.
- [x] Phone/desktop, keyboard and enlarged-content constraints are represented.
- [x] Signed text communicates direction without relying on color.

## Measurability and Traceability

- [x] Functional requirements are observable and uniquely identified.
- [x] Success criteria include unit, browser and scope evidence.
- [x] Each story maps to current code evidence and planned verification.
- [x] Dependencies on PR #226 and separation from PR #223 are explicit.
- [x] No unresolved question blocks implementation.

## Governance

- [x] Change class and full-packet decision are recorded.
- [x] The specification preserves `AGENTS.md` and the MoneyFlow constitution.
- [x] Owner-only merge/deploy actions remain protected.
- [x] No new tool, dependency or provider is adopted.
- [x] Requirement changes must update the spec before implementation scope changes.

## Findings

No open requirements-quality finding blocks implementation. Exact-head tests and human review remain acceptance evidence, not specification-quality checkboxes.