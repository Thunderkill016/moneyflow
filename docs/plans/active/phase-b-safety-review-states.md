# Phase B safety and review state audit

**Status:** implementing
**Execution state:** in_progress
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #274 / pending
**Parent:** #72
**Baseline:** `main@105d6e6e3d77b6efbae385f83f7fe54d2393724b`
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet authorizes a focused demo-safe browser audit and P0/P1 remediation only. It does not authorize merge, production data access, production deletion, provider changes or physical-device acceptance claims.

## Outcome

MoneyFlow permanently exercises representative validation, destructive-confirmation and Inbox review states across the existing phone/tablet/desktop Playwright matrix, preserving review-before-ledger and typed-confirmation safety while producing screenshot and JSON evidence.

## Repository reconnaissance

- Phase B route/create-dialog coverage already exists in `e2e/audit/critical-browser.audit.spec.ts` and `dialog-responsive.audit.spec.ts`.
- PR #104 already covers large VND and long Vietnamese transaction/report states.
- Remaining CI-verifiable #72 scope includes validation errors, destructive confirmations and Inbox/import review states.
- `/capture/paste` owns a real parser error state and a preview that explicitly has no direct ledger-post action.
- Demo `/inbox` can seed real sample candidates, open the actual review dialog and expose domain validation without a test-only runtime path.
- `/settings/delete-account` requires exact typed `XÓA`; the audit must never submit the destructive form.
- Physical Android/iOS verification cannot be proven by browser emulation and remains separate.

## Specification

### Paste states

- Trigger a real parser validation error from user-entered text.
- Assert the textarea exposes invalid state and the alert remains visible and in bounds.
- Recover through the real edit path and render a parsed preview.
- Assert the preview keeps the explicit review-before-ledger copy and exposes `Vào Inbox`, not a direct ledger-post action.

### Inbox review state

- Seed demo candidates using the visible `Nạp dữ liệu mẫu` action.
- Open the real `Duyệt giao dịch` dialog.
- Trigger domain validation without writing a transaction or changing candidate status.
- Assert the alert, controls and dialog remain usable across the audit matrix.

### Destructive confirmation state

- Enter an incorrect confirmation and assert `aria-invalid`, explanatory copy and disabled destructive submit.
- Enter exact `XÓA` and assert the confirmation becomes valid and the submit becomes enabled.
- Never activate the destructive submit.

### Evidence and blocking rules

For every state, attach a full-page screenshot plus JSON geometry/state evidence. Fail on:

- document horizontal overflow;
- visible interactive controls outside the viewport;
- a visible dialog outside the horizontal viewport;
- a vertically clipped dialog with no scroll path;
- an alert outside the viewport or hidden by the state transition;
- mutation of demo ledger/candidate status during failed review validation;
- a destructive button enabled for an incorrect typed confirmation.

## Acceptance criteria

- [ ] Paste validation error is visible, associated and responsive.
- [ ] Paste preview explicitly preserves review-before-ledger and has no direct post action.
- [ ] Inbox sample candidate opens the real review dialog.
- [ ] Inbox domain validation displays an alert without ledger/candidate mutation.
- [ ] Incorrect delete confirmation keeps destructive submit disabled.
- [ ] Exact `XÓA` enables submit without the test activating it.
- [ ] All state screenshots and JSON evidence are uploaded by the existing UI-audit workflow.
- [ ] Every discovered P0/P1 is fixed by shared/root-cause ownership and receives a viewport-specific regression.
- [ ] Policy/static/unit/build, browser smoke, cross-device audit, CodeQL and secret scan pass on the exact final head.

## Implementation plan

1. Add the state-focused Playwright audit using the existing demo state and product controls.
2. Run the full cross-device matrix and inspect screenshot/JSON evidence.
3. If a P0/P1 appears, identify the shared/root-cause owner before changing product CSS or JSX.
4. Add a regression at the failing viewport and make the narrowest product fix.
5. Run exact-head repository gates and independent review.
6. Hand off for a separate owner merge decision; keep physical-device and production actions separate.

## Evaluation

Evaluation begins from failing browser evidence, not source inspection alone. A green route/default-state audit is not evidence that validation or destructive states are usable. Final evaluation must distinguish emulated browser coverage from physical-device acceptance.

## Risks and defenses

| Risk | Defense |
|---|---|
| test accidentally deletes account | never click either destructive submit; demo mode only |
| validation test writes ledger data | trigger a domain-invalid transfer and compare local transaction/candidate state before/after |
| test-only runtime diverges from product | seed and open states only through visible product actions |
| duplicated audit framework | reuse existing project matrix and keep the state helper focused |
| responsive bug hidden by screenshots alone | attach measured JSON and fail on geometry/state assertions |
| physical readiness overstated | explicitly retain physical Android/iOS acceptance outside this packet |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | reconcile #72 remaining scope | done | issue comments and current audit files |
| T2 | create child issue and branch | done | #274, `test/phase-b-safety-review-states` |
| T3 | add state audit first | in_progress | Playwright spec pending |
| T4 | evaluate P0/P1 findings | blocked | requires browser evidence |
| T5 | exact-head CI and independent review | blocked | requires candidate head |
| T6 | owner merge decision | blocked | separate explicit command |
| T7 | physical-device acceptance | blocked | separate manual evidence |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | explicit `tiếp theo`; #72 remaining scope | non-default safety states unproven | add browser audit and evaluate findings |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, demo-safe Playwright state creation, tests and CI.

Forbidden without separate owner command: merge, production data/schema/provider writes, destructive production smoke, real account deletion and physical-device acceptance claims.

## Delivery record

- Branch: `test/phase-b-safety-review-states`
- Issue: #274
- PR: pending
- Baseline: `105d6e6e3d77b6efbae385f83f7fe54d2393724b`
- Production actions: none
