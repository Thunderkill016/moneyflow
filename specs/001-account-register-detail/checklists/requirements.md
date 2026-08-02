# Requirements Quality Checklist: Account register and detail

**Feature:** `specs/001-account-register-detail/spec.md`  
**Created:** 2026-08-02

## Scope and evidence

- [x] Problem is grounded in current account/finance code.
- [x] Outcomes are observable and do not prescribe new persistence.
- [x] Out-of-scope excludes reconciliation, mutation duplication and PR #223 filters.
- [x] PR #222 is used only for the owner's priority decision.

## User scenarios

- [x] Active, archived, populated, empty and inaccessible behavior is defined.
- [x] Source and destination transfer behavior is explicit.
- [x] Phone width, long text and large money are covered.
- [x] Failure behavior avoids invented movement data.

## Financial, data and security

- [x] Integer money and current derived balance remain authoritative.
- [x] Transfers are separate from income and expense.
- [x] Existing viewer-scoped/RLS-backed loaders remain the ownership boundary.
- [x] No schema, mutation, provider or production-data impact exists.
- [x] No balance, history, permission or reconciliation state is guessed.

## Product and UX

- [x] The feature deepens the manual-first account loop.
- [x] Vietnamese labels are factual and transfer direction is textual.
- [x] Empty, populated and error states are explicit.
- [x] Direction and meaning do not rely on color.
- [x] Account register remains read-only and preserves existing mutation owners.

## Measurability and governance

- [x] Requirements and success criteria map to unit/browser/scope evidence.
- [x] Change class and permission boundary are recorded.
- [x] Owner-only merge/deployment boundaries remain intact.
- [x] No unresolved question blocks implementation.

No requirements-quality finding blocks exact-head verification. Runtime acceptance remains pending until selected checks execute.