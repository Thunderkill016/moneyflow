# MoneyFlow — competitive capability gap matrix

- **Status:** historical capability audit and reusable research index
- **Audit date:** 2026-08-03
- **Current-routing note:** this 2026-08-03 audit does not define current state or
  next work; use `docs/research/CURRENT_PROJECT_MEMORY.md` and
  `docs/plans/active/README.md`
- **Code baseline:** `main@3e3cb30e56d2d6325662a047fee35959a5811e12`
- **Implementation authority:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **MVP audit:** `docs/research/MVP_TRUTH_AUDIT_2026-08-03.md`
- **Competitive evidence:** `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`

## 1. Historical decision boundary

MoneyFlow has all 16 capabilities required by the locked MVP definition. The remaining roadmap is a mixture of release-evidence reconciliation and optional competitive depth.

Do not convert any of these into the same status:

- not merged on `main`;
- no current public evidence;
- owner has not performed the work;
- feature is absent.

“Competitive depth” means entry, review, correction, history, reporting and export connect coherently. It does not mean every competitive-depth improvement blocks MVP release.

## 2. Historical audit position (2026-08-03)

### Functional MVP

**Complete by the repository's own 16-capability definition.** Auth/demo, accounts, categories, quick income/expense entry, transfer neutrality, dashboard/monthly overview, budgets, recurring, goals, reports, export, soft delete, onboarding, privacy and Core/Lab navigation all have merged implementation baselines.

### Release acceptance

**Partially reconciled.** Repository evidence supports the main build/test/browser/financial gates. Current empty-state CTA coverage, current export click path, Lighthouse evidence and owner-held provider/device/deep-state evidence require reconciliation rather than an assumption that the work is undone.

### Competitive depth

Present but incomplete:

- account reconciliation integration and UI;
- ledger review and bounded correction;
- budget history and drill-down;
- recurring and goal lifecycle depth;
- report custom ranges and drill-down;
- import batch/mapping UX;
- export portability/restore;
- authenticated persisted rules;
- mutation audit and measured scale.

### Verified-unmerged work

PR #222 defined a substantial reconciliation database/domain contract and passed exact-head verification with 92 reconciliation pgTAP assertions. It is not current `main` behavior, but it supersedes the claim that reconciliation was never designed or tested.

### Owner-held work

The owner reported on 2026-08-03 that multiple items previously described as pending had already been completed. Exact details were not supplied in this conversation. Those areas are **not reconciled**, not marked absent.

## 3. Historical capability matrix

| Capability | Audited status | Merged behavior now | Real remaining decision/depth | Priority |
|---|---|---|---|---:|
| MVP release state | **Functional complete; evidence reconciliation pending** | all 16 locked capabilities implemented | reconcile unresolved acceptance artifacts and make release decision | P0 |
| Accounts | **Implemented, partial; register/detail merged** | CRUD/archive/restore, balances, transfers and viewer-scoped register | reconciliation integration, trends/export and richer controls | P1 |
| Reconciliation | **Verified unmerged; absent on main** | PR #222 contract exists outside main | decide integrate/rebuild, then add UI and production rollout | owner decision |
| Transactions | **Implemented, partial; date/amount filters merged** | create/search/filter/edit/delete/undo/split/transfer and truthful totals | review state, bounded bulk correction, split-line editing, audit | P1 |
| Budgets | **Implemented, basic MVP loop** | current-month category limit and spent | history, previous comparison, copy, rollover and drill-down | P1 |
| Recurring commitments | **Implemented, partial occurrence model** | template, current-month occurrence, transaction link and pay/undo | surfaced history, lifecycle, reminders and matching | P1 |
| Recurring income | **Implemented, partial occurrence model** | template, occurrence/link and expected totals | history, lifecycle, reminders and matching | P1 |
| Goals | **Implemented, partial depth** | target, allocation, deadline, pace and archive | contribution history, funding source and lifecycle | P1 |
| Reports | **Implemented, moderate depth** | week/month/year, prior comparison, categories, trends and transfer exclusion | arbitrary range, account/type dimensions and drill-down | P1 |
| Export | **Implemented** | period CSV and date-range CSV/JSON bundles | current discoverability acceptance, schema version, planning export and restore | P1/P2 |
| Import/Inbox | **Implemented + production evidenced** | multi-format parsing, provenance, dry-run, duplicate/transfer plan and atomic approval | mapping presets, batch history, bulk correction and retry UX | P1 |
| Rules | **Partial** | local deterministic rules | authenticated persistence, ordering, preview, version/audit and UI | P2 |
| Dashboard | **Implemented + production hardened** | bounded bundle, schema-skew fallback and planning/activity summaries | evidence-based attention and drill-down | P2 |
| Auth/security | **Repository readiness merged; owner evidence not reconciled** | auth/recovery, neutral responses, CAPTCHA plumbing, headers and runbook | reconcile hosted provider/edge evidence before making a state claim | P0 evidence |
| Mobile/accessibility | **Broad automation merged; owner evidence not reconciled** | route/dialog matrix, WebKit, rich VND, long labels, 44px and responsive fixes | reconcile physical-device/deep-state evidence; fix only observed defects | P0/P1 evidence |
| Performance/database | **Strong tooling; external acceptance separate** | one-RPC dashboard, fallback, k6 contracts, pgTAP and complete tested FK coverage | reconcile production advisor/staging/large-ledger evidence | P1/P2 evidence |

## 4. Module decisions

### 4.1 Release closure

Build next only when it closes a specific unresolved exit criterion:

1. current empty-state primary-action audit;
2. current dashboard/reports-to-export click path;
3. Lighthouse artifact reconciliation;
4. owner-held provider/device/deep-state evidence reconciliation;
5. exact release-candidate `npm run mvp-verify` and focused browser journey;
6. observed P0/P1 fixes only.

### 4.2 Reconciliation

PR #222 established a credible contract:

- pending/cleared/reconciled account-leg states;
- statement sessions and exact difference;
- zero-difference completion and reopen history;
- transfer-leg and split semantics;
- mutation guards, locking, RLS and 92 pgTAP assertions.

Do not merge the stale branch unchanged. If the owner selects reconciliation after MVP, re-evaluate it against current main, preserve the financial invariants and build the missing UI/production rollout.

### 4.3 Transaction operations

Post-MVP candidates:

- ledger review state distinct from Inbox candidate status;
- safe multi-select and bounded correction;
- eligible type changes with preview and guards;
- split-line correction;
- non-sensitive mutation audit.

### 4.4 Planning

Post-MVP depth:

- budget month history, copy and explicit rollover policy;
- recurring occurrence history, lifecycle, matching and reminders;
- goal contribution ledger, funding semantics and lifecycle.

### 4.5 Reports/export/import

Post-MVP depth:

- arbitrary report ranges and transaction drill-down;
- account/type filter parity;
- export schema and restore path;
- import mapping presets, batch history and bulk review;
- authenticated rules only after an accepted contract.

## 5. Evidence model

Use these labels consistently:

| Label | Allowed claim |
|---|---|
| Merged implementation | current main contains the behavior |
| Production evidenced | affected deployment/provider/data path was verified |
| Verified unmerged | useful candidate evidence only; not current behavior |
| Owner-reported external | owner says it exists; details remain unasserted until reconciled |
| Not reconciled | audit cannot determine completion; never synonymous with undone |

A screenshot, route existence, green build or old issue checkbox alone does not prove completion. Conversely, missing public evidence does not prove the owner did not perform the work.

## 6. Delivery waves

Tracks may run in parallel only after release closure and when their ownership boundaries do not conflict.

### Wave 0 — MVP truth and release closure

- reconcile owner-held acceptance evidence;
- refresh stale route/acceptance wording;
- run exact release-candidate MVP gates;
- fix observed blockers;
- make the release decision.

### Wave 1 — selected trust depth

- reconciliation integration only if explicitly selected;
- transaction review-state contract;
- budget history/drill-down;
- report arbitrary range/drill-down;
- remaining observed mobile/error-state fixes.

### Wave 2 — connected planning

- recurring history/lifecycle/matching;
- goal contribution history/lifecycle;
- report shared filter state;
- account trends/export and richer register controls.

### Wave 3 — efficiency and ownership

- bounded bulk correction;
- mapping presets and Inbox batch UX;
- export schema/restore path;
- dashboard attention/drill-down;
- measured staging and large-ledger acceptance;
- non-sensitive mutation audit.

### Wave 4 — deterministic automation

- authenticated persisted rules;
- rule ordering/preview/version/audit;
- rule management UI;
- integration with import, recurring and ledger review.

## 7. Validation contract

Validation belongs inside each selected workstream and does not globally freeze development.

- financial/data: tests first, migration replay, pgTAP, affected browser and production evidence;
- UI: responsive/browser evidence and physical-device proof only where claimed;
- provider: before/after evidence, one reversible change, rollback and production smoke;
- performance: measured baseline and acceptance, never intuition;
- status: update `CURRENT_PROJECT_MEMORY.md` without converting missing evidence into an absence claim.

## 8. Superseded claims

Do not repeat these as current gaps or facts:

- MoneyFlow lacks one or more of the 16 functional MVP capabilities.
- Transaction date/amount filters are missing or candidate-only.
- Account register/detail is missing.
- Reports have no previous-period comparison or trends.
- Recurring items have no occurrence-to-transaction linkage.
- Goals have no deadline or pace calculation.
- Export is only a simple monthly CSV.
- Import provenance/dry-run/atomic approval are future work.
- Dashboard still uses the original authenticated fan-out.
- CAPTCHA application plumbing is absent.
- Reconciliation was never designed or tested.
- PR #222 is merged current behavior.
- Missing public evidence proves owner work is incomplete.
- Every competitive-depth gap blocks MVP release.
- Automated responsive evidence proves physical-device acceptance.
