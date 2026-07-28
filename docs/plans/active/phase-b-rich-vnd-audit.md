# Phase B rich VND and long Vietnamese UI audit

**Status:** implementing  
**Owner:** agent  
**Issue/PR:** #72  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has repeatable browser evidence that realistic large VND values and long Vietnamese transaction notes remain readable and usable across the current responsive route matrix on the canonical Dashboard, Transactions, Reports and quick-capture flows.

## Repository reconnaissance

### Current behavior

- The general responsive audit covers empty/default demo states and already checks document overflow, clipped dialogs, small controls and potentially clipped money.
- PR #75 attempted rich-state coverage but was closed because it targeted the retired `/insights` layout and could not run while Actions were blocked.
- PR #103 restored a fully green public CI baseline and reconciled the browser suite with `/dashboard` and the current authored navigation model.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `e2e/audit/responsive-audit.ts` | Shared route audit, screenshot and JSON evidence | Reuse without changing ownership |
| `e2e/audit/*.responsive.audit.spec.ts` | Specs selected by every responsive Chromium project | Add one focused rich-state spec |
| `playwright.audit.config.ts` | Defines phone, tablet and desktop responsive projects | Reuse existing `responsive.audit.spec.ts` matcher |
| Demo local-storage transaction state | Supplies deterministic populated data without production credentials | Seed synthetic records only |

### Existing tests and constraints

- Related unit tests: existing domain/unit suite remains unchanged.
- Database/RLS tests: fresh Supabase reset and pgTAP remain required but this slice has no database change.
- Browser tests: `responsive.audit.spec.ts`, `critical-browser.audit.spec.ts` and the expense-path smoke are the baseline.
- Product/architecture rules: VND stays integer đồng; transfers do not count as income or expense; `/dashboard` is the canonical authenticated home.

### Similar implementation and recent history

- Existing pattern to reuse: `seedUiAuditState` plus `auditRoute` for route-level evidence.
- Relevant issue/PR/decision: #72 comment preserving the rich-state requirement after stale PR #75 was closed; PR #103 proved the public CI matrix can execute.

### Open questions

- [x] Scope the first rich-state slice to the responsive phone/tablet/desktop projects selected by the existing responsive-spec matcher.
- [x] Keep production runtime and financial calculations unchanged unless the new regression test exposes a real defect.

## Research

Not required. This is an internal browser-regression slice that reuses the repository's existing Playwright harness and product contracts; no external technology or product decision is introduced.

### Questions researched

1. Not applicable.

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Repository issue #72 and closed PR #75 | 2026-07-28 | Exact preserved stress-state requirement and stale route to replace | Internal project evidence only |
| Current audit helper and Playwright config | 2026-07-28 | Existing project matcher, responsive invariants and artifact format | Does not prove physical-device behavior |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Restore PR #75 unchanged | Minimal editing | Targets `/insights` and old assumptions | Rejected |
| Add route-specific CSS before evidence | Could pre-emptively handle overflow | Guesses at defects and creates unrelated scope | Rejected |
| Add a new current-main rich-state regression spec | Produces evidence first and exposes actual defects | Increases CI browser workload | Selected |

### Research decision

Rebuild the stress suite from current `main`, seed only synthetic demo data, reuse the shared audit helper, and allow CI evidence to determine whether a production UI fix is necessary.

## Specification

### Problem

The green baseline mostly proves empty/default states. Large integer VND amounts and long Vietnamese notes can still clip, force document overflow or move primary actions outside narrow viewports without being detected.

### User stories

- As a user with large-value transactions, I can read full amounts without horizontal clipping.
- As a user writing a long Vietnamese note, I can keep the form and save action usable on a narrow phone.
- As a maintainer, I receive reproducible PNG and JSON evidence for failures across the supported responsive matrix.

### Acceptance criteria

- [ ] `/dashboard`, `/transactions` and `/reports` load with synthetic large-VND data on every responsive audit project.
- [ ] 987.654.321 ₫ expense and 12.345.678.900 ₫ income remain visible where relevant.
- [ ] The Transactions route shows a 4.567.890.123 ₫ transfer without whole-document overflow.
- [ ] Visible money elements are not clipped by hidden or clipped overflow.
- [ ] A long Vietnamese quick-capture note keeps the input and Save action inside the viewport.
- [ ] Each audited route/state emits PNG and JSON evidence.
- [ ] Full configured CI remains green.

### Required states

- Loading: shared audit waits for visible loading states to settle.
- Empty: covered by the baseline responsive suite, not duplicated here.
- Populated: expense, income and transfer records are seeded.
- Validation/error: out of scope for this slice and remains open under #72.
- Recovery/undo: out of scope.
- Long data / large VND: primary focus of this slice.
- Mobile/tablet/desktop: existing 320, 360, 390, 768, 1024, 1366 and 1440 Chromium projects.
- Accessibility: assertions use labels, roles and current authored landmarks where interaction is required.

### Financial and security constraints

- No guessed financial advice or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none; only browser-local synthetic demo state is used.

### Out of scope

- Production database changes, migrations, Auth or RLS changes.
- New product features or visual redesign.
- Validation, destructive confirmation, import review and physical-device acceptance.
- Claiming Android or iOS physical readiness from emulation.

## Implementation plan

### Architecture fit

The test belongs in `e2e/audit/` because the behavior is a populated-state extension of the existing responsive audit. Naming the file `*.responsive.audit.spec.ts` lets the current Playwright matcher execute it on the established responsive projects without adding another configuration layer.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `e2e/audit/rich-state.responsive.audit.spec.ts` | Seed dynamic current-month synthetic transactions, audit three routes and a filled quick-capture form | Recreate the preserved #72 requirement against current routes |
| `docs/plans/active/phase-b-rich-vnd-audit.md` | Record scope, acceptance and evidence | Keep non-trivial work reviewable and knowledge-contract compliant |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: demo local-storage keys remain unchanged.
- Rollback: delete the new spec and work packet if the approach is rejected.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Fixed dates fall outside the current reporting period | Generate Vietnam-local current and previous dates at test runtime |
| A formatted amount appears in one route but is clipped | Check visible money elements for hidden/clip overflow in addition to text presence |
| Long single-line input text has internal scrolling | Assert the control rectangle and Save action remain inside the viewport; do not treat internal input scrolling as document overflow |
| Test passes only one device width | Execute through the existing responsive project matcher |
| Synthetic transfer accidentally affects income/expense expectations | Assert transfer display only on Transactions; preserve existing domain tests for totals |

### Verification plan

- Static: `npm run check:knowledge`, lint and typecheck.
- Unit/domain: full unit/static-RLS suite.
- Database: fresh local Supabase reset and pgTAP through CI.
- Browser flow: expense-path browser smoke remains green.
- Responsive/visual: new rich-state spec plus current production cross-device audit.
- Production/manual: not required because this slice changes tests/docs only; physical-device checks remain open.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Create current-main rich-state seed and route assertions | PR #103 merged | New Playwright spec | in progress |
| T2 | Verify quick-capture filled form remains inside narrow viewports | T1 | PNG/JSON artifacts and assertions | todo |
| T3 | Run complete configured CI and classify any failures | T1, T2 | GitHub Actions run | todo |
| T4 | Update #72 with result and remaining limits | T3 | Issue comment | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Current routes use rich synthetic state | Pending CI | pending |
| No document overflow or clipped money | Pending JSON evidence | pending |
| Quick capture remains usable | Pending screenshots and browser result | pending |
| Full CI remains green | Pending PR run | pending |

### Review findings

- Correctness: pending CI.
- Security/ownership: no production data or ownership boundary change.
- UI/UX/accessibility: pending responsive artifacts.
- Maintainability/duplication: shared helper reused; no new audit framework.
- Scope compliance: tests and documentation only unless a real failure requires a separately documented fix.

### Remaining limitations

- Emulated browsers cannot establish physical Android/iOS readiness.
- Validation, destructive confirmation and import-review states remain open under #72.

## Delivery record

- Branch: `agent/phase-b-rich-vnd-audit`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending
