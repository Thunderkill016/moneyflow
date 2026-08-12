# Phase B safety and review state audit

**Status:** ready_for_owner_merge
**Execution state:** verified
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #274 / #276
**Parent:** #72
**Baseline:** `main@105d6e6e3d77b6efbae385f83f7fe54d2393724b`
**Verified implementation head:** `fb01a6af85583900325ec9fe89c5b1570a31a1dd`
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet authorizes a focused demo-safe browser audit and P0/P1 remediation only. It does not authorize merge, production data access, production deletion, provider changes or physical-device acceptance claims.

## Outcome

MoneyFlow permanently exercises representative validation, destructive-confirmation and Inbox review states across the existing phone/tablet/desktop Playwright matrix, preserving review-before-ledger and typed-confirmation safety while producing screenshot and JSON evidence.

## Repository reconnaissance

- Phase B route/create-dialog coverage already exists in `e2e/audit/critical-browser.audit.spec.ts` and `dialog-responsive.audit.spec.ts`.
- PR #104 already covers large VND and long Vietnamese transaction/report states.
- Remaining CI-verifiable #72 scope included validation errors, destructive confirmations and Inbox/import review states.
- `/capture/paste` owns a real parser error state and a preview that explicitly has no direct ledger-post action.
- Demo `/inbox` can seed real sample candidates, open the actual review dialog and expose domain validation without a test-only runtime path.
- `/settings/delete-account` requires exact typed `XÓA`; the audit never submits the destructive form.
- Physical Android/iOS verification cannot be proven by browser emulation and remains separate.

## Research

No external library, service or competitor implementation was adopted. The task is grounded in current MoneyFlow source, the merged Phase B evidence in #72, WAI-ARIA state semantics already used by the product (`role="alert"`, `aria-invalid`, disabled destructive actions), and the repository's existing Playwright responsive-audit contract. Emulation is treated as repeatable browser evidence, not as proof of physical Android/iOS behavior.

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

- [x] Paste validation error is visible, associated and responsive.
- [x] Paste preview explicitly preserves review-before-ledger and has no direct post action.
- [x] Inbox sample candidate opens the real review dialog.
- [x] Inbox domain validation displays an alert without ledger/candidate mutation.
- [x] Incorrect delete confirmation keeps destructive submit disabled.
- [x] Exact `XÓA` enables submit without the test activating it.
- [x] All state screenshots and JSON evidence are uploaded by the existing UI-audit workflow.
- [x] No P0/P1 product defect was found; therefore no JSX/CSS remediation was required.
- [x] Policy/static/unit/build, browser smoke, cross-device audit, CodeQL and secret scan pass on the verified implementation head.

## Implementation plan

1. Add the state-focused Playwright audit using the existing demo state and product controls. **Done.**
2. Run the full cross-device matrix and inspect screenshot/JSON evidence. **Done.**
3. If a P0/P1 appears, identify the shared/root-cause owner before changing product CSS or JSX. **No product P0/P1 found.**
4. Add a regression at the failing viewport and make the narrowest product fix. **Not applicable.**
5. Run exact-head repository gates and independent review. **Done.**
6. Hand off for a separate owner merge decision; keep physical-device and production actions separate. **Current state.**

## Evaluation

The first expanded run exposed a coverage defect rather than a product defect: the new spec existed but no Playwright project selected it. `playwright.audit.config.ts` now includes the safety spec in seven responsive Chromium projects and five critical-browser projects, with a source contract preventing orphaned audit specs.

The first real matrix then exposed test-only selector/hydration issues: generic `role=alert` and `role=status` locators also matched Next.js shell elements, and WebKit could receive input before React hydration retained controlled state. The audit now targets product-specific state and waits for the controlled field plus submit button to settle. No production JSX or CSS was changed.

CI #1438 on `fb01a6af85583900325ec9fe89c5b1570a31a1dd` passed policy, static quality, unit/static RLS, production build, browser smoke and cross-device UI audit. The downloaded Playwright artifact reported 542 total tests, 417 expected, 125 skipped, zero unexpected and zero flaky. It included 33/33 expected safety-state cases across 11 Chromium/WebKit projects and 110 unique screenshot/JSON safety attachments. CodeQL #574 and secret-history scan #574 passed.

Independent review found no remaining blocking safety, financial-authority, destructive-action, privacy, responsive-geometry or audit-discovery issue. Physical Android/iOS acceptance remains unproven and separate.

## Risks and defenses

| Risk | Defense |
|---|---|
| test accidentally deletes account | never click either destructive submit; demo mode only |
| validation test writes ledger data | trigger a domain-invalid transfer and compare local transaction/candidate state before/after |
| test-only runtime diverges from product | seed and open states only through visible product actions |
| audit spec exists but CI never selects it | source contract locks responsive/critical project registration counts |
| hydration overwrites browser input | poll controlled value and submit-enabled state before action |
| duplicated audit framework | reuse existing project matrix and keep the state helper focused |
| responsive bug hidden by screenshots alone | attach measured JSON and fail on geometry/state assertions |
| physical readiness overstated | explicitly retain physical Android/iOS acceptance outside this packet |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | reconcile #72 remaining scope | done | issue comments and current audit files |
| T2 | create child issue and branch | done | #274, `test/phase-b-safety-review-states` |
| T3 | add state audit first | done | `safety-review-states.audit.spec.ts` |
| T4 | evaluate P0/P1 findings | done | CI #1438 artifact; no product P0/P1 |
| T5 | exact-head CI and independent review | done | `fb01a6a`, CI #1438, CodeQL/secret #574 |
| T6 | owner merge decision | blocked | separate explicit command |
| T7 | physical-device acceptance | blocked | separate manual evidence |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | explicit `tiếp theo`; #72 remaining scope | non-default safety states unproven | add browser audit and evaluate findings |
| 2026-08-04 | implementer | evaluator | audit_first | PR #276 | audit discovery and selectors required evidence | run exact-head gates and fix evidence-backed findings only |
| 2026-08-04 | evaluator | owner | verified | CI #1438, 33/33 safety cases, 110 artifacts, security scans #574 | physical-device acceptance remains separate | decide whether to merge PR #276 |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, demo-safe Playwright state creation, tests and CI.

Forbidden without separate owner command: merge, production data/schema/provider writes, destructive production smoke, real account deletion and physical-device acceptance claims.

## Delivery record

- Branch: `test/phase-b-safety-review-states`
- Issue: #274
- PR: #276
- Baseline: `105d6e6e3d77b6efbae385f83f7fe54d2393724b`
- Verified implementation head: `fb01a6af85583900325ec9fe89c5b1570a31a1dd`
- CI: #1438 success
- CodeQL / secret history: #574 success
- Production actions: none
