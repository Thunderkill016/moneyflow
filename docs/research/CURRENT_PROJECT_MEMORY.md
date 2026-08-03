# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-03
- **Code baseline audited:** `main@b7b0e1fb2c13e82061d7641f86e6b3c2a9b2bed4`
- **Owner direction:** reconcile and close the locked MVP release gate before broadening scope; validation is required inside each workstream but is not a global feature freeze
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Detailed MVP audit:** `docs/research/MVP_TRUTH_AUDIT_2026-08-03.md`
- **Release acceptance ledger:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`

## 1. Purpose and authority

This snapshot answers what is merged, verified-unmerged, owner-reported externally, not reconciled, partial or absent. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. verified production or exact-head evidence;
3. explicit owner statements, recorded without inventing missing operational detail;
4. this snapshot;
5. architecture, product principles, MVP and delivery policy;
6. current issues, specs and work packets;
7. historical research and PR records.

Open pull requests and unmerged feature artifacts are not current product behavior.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Behavior exists on current `main` with relevant repository evidence. |
| **Implemented + production evidenced** | Merged behavior was verified through the affected production path or migration. |
| **Verified unmerged** | A branch/PR reached meaningful exact-head verification but is not current product behavior. |
| **Owner-reported external** | Owner states work was performed outside inspected public evidence; exact scope remains unasserted until reconciled. |
| **Not reconciled** | Current evidence cannot determine completion; this does not mean the work is undone. |
| **Partial** | Useful merged behavior exists but lacks competitive depth. |
| **Absent on main** | No merged user-facing/domain implementation exists on `main`. |
| **Candidate only** | Exists only in an open PR or branch. |
| **Historical/superseded** | Preserved for provenance, not current direction. |

## 3. Product identity

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs: record income/expense/split/transfer; know account balances; inspect ledger movements; understand period income, expense, net and categories; correct and recover records; plan with budgets/recurring/goals; import controlled data and export user-owned data.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and invariant snapshot

- Next.js App Router modular monolith on Vercel; React, TypeScript, Tailwind and shadcn/Base UI/Radix.
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Server workspaces own viewer-aware reads; validated Server Actions and ownership-safe RPCs own financial writes.
- VND is integer đồng. Transfers are balanced and excluded from income/expense. Split totals remain exact.
- Destructive ledger actions use soft delete and recovery. Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or planning assumptions are never invented.
- `scripts/mvp-verify.sh` owns deployment-contract, lint, typecheck, unit-test and build verification.
- Playwright, pgTAP, k6, secret-history scanning and risk-proportional CI cover selected boundaries.
- Protected CodeQL performs real JavaScript/TypeScript analysis for every pull request.
- Spec Kit is a feature-artifact interface; MoneyFlow governance, permissions, work packets, PR memory and owner decisions remain authoritative.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.

## 5. Current capability inventory

### MVP summary

All 16 capabilities in `docs/MVP_DEFINITION.md` have a merged implementation baseline. MoneyFlow is **functional-MVP complete**. Competitive depth and public-beta hardening are separate from the locked MVP feature set.

| Capability | Current status | Merged behavior now | Remaining distinction |
|---|---|---|---|
| Authentication/demo | **Merged implementation; provider detail not reconciled** | email/password, OAuth surfaces, recovery/reset, explicit demo, neutral responses and CAPTCHA token plumbing | hosted provider acceptance remains separate public-beta evidence |
| Accounts | **Merged implementation, partial depth** | common account kinds, balances, CRUD/archive/restore, same-currency transfer and viewer-scoped register/detail | reconciliation integration and richer controls are post-MVP depth |
| Reconciliation | **Verified unmerged; absent on main** | PR #222 defined and tested the database/domain contract with 92 pgTAP assertions | owner decides whether to integrate or rebuild; no UI or production migration |
| Categories | **Merged implementation** | income/expense categories, archive and cross-feature use | clearer archive impact only if evidence requires it |
| Transactions | **Merged implementation, partial depth** | create/search/filter/edit, soft delete/undo, split/transfer handling, grouping/pagination and truthful totals | review state, bulk correction and split-line editing are post-MVP depth |
| Transfers | **Merged implementation** | balanced semantics, currency guard, report neutrality, idempotency and register presentation | reconciliation integration only |
| Dashboard | **Merged implementation + production hardened** | bounded one-RPC bundle, planning/activity/Inbox summaries and schema-skew fallback | attention/drill-down depth |
| Budgets | **Merged implementation — MVP basic loop** | current-month category limits, spend calculation and CRUD | history, comparison, copy, rollover and drill-down |
| Recurring commitments | **Merged implementation — partial occurrence model** | templates, current-month occurrence, transaction link, pay/undo and reserved totals | history/states/calendar/reminders/matching |
| Recurring income | **Merged implementation — partial occurrence model** | templates, current-month occurrence/link and expected totals | history/lifecycle/calendar/reminders/matching |
| Goals | **Merged implementation — MVP light depth** | target, allocation, deadline, planned pace and archive | contribution history, funding source and lifecycle |
| Reports | **Merged implementation — moderate depth** | week/month/year, previous comparison, totals/change/category/trends and transfer exclusion | arbitrary range, account/type dimensions and drill-down |
| Export | **Merged implementation** | direct period CSV from `/reports` plus date-range CSV/JSON transaction/candidate/all bundles | restore docs and broader planning portability |
| Import/Inbox | **Merged implementation + production evidenced** | CSV/XLSX/PDF, staging/review, provenance, dry-run, duplicate/transfer planning and atomic approval | presets, batch UX, bulk correction and resume/retry depth |
| Rules | **Partial** | deterministic local parse rules | authenticated persisted rules are post-MVP work |
| Privacy/deletion | **Merged implementation baseline** | privacy surfaces and recoverable ledger deletion | deep destructive acceptance may remain public-beta hardening |
| Onboarding/navigation | **Merged implementation** | privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance only |
| Responsive/accessibility | **Merged broad automation; external detail not reconciled** | broad route/dialog matrix, WebKit, rich VND, long Vietnamese, 44px targets and responsive regressions | owner-held physical-device evidence remains separate |
| CI/security/performance tooling | **Merged implementation** | risk-selected CI, CodeQL, secret scan, grouped Dependabot, dashboard bundle/fallback, k6 contracts, FK coverage and Lighthouse documentation | provider/staging capacity claims remain evidence-specific |

## 6. MVP exit evidence

The locked MVP definition has nine exit criteria.

| Criterion group | Current truth |
|---|---|
| lint/typecheck/test, expense e2e, demo build | **Repository evidenced** through `mvp-verify` and exact-head runtime checks |
| transfer neutrality | **Repository evidenced** through unit/database/browser invariants |
| landing G5 copy implementation | **Repository evidenced**; final visual approval is a separate owner decision |
| export ≤2 clicks | **Repository evidenced**; `/reports` exposes direct CSV and `/settings/export` |
| Lighthouse documented | **Repository evidenced** in `docs/performance-budgets.md`, including LCP miss, CLS pass and mitigation plan |
| no known P0 money bug | **Conditional**; no known public blocker, but universal absence cannot be proven from a suite |
| one primary CTA across all core empty states | **Only unresolved focused release-candidate gate**; shared source contract exists, but cross-route current-candidate browser acceptance remains |

Functional MVP is complete. Eight of nine locked exit criteria are reconciled. Provider controls, physical-device proof, final visual direction and approved staging load evidence are separate public-beta gates unless the owner explicitly promotes them.

## 7. Load-bearing merged and verified truth

- PR #183/#184 merged, migrated and production-smoked atomic Inbox approval, provenance, dry-run, transfer planning and idempotency.
- PR #206/#207 merged dashboard one-RPC hardening and schema-skew fallback.
- PR #213 merged/deployed one landing/auth/color candidate; implementation evidence is not final visual approval.
- PR #215 established layered project memory and code/migrations/tests as final executable truth.
- PR #228/#229 merged account register/detail and deployment/auth-routing evidence.
- PR #231 merged the Spec Kit adapter without replacing MoneyFlow governance.
- PR #234/#235 merged transaction date/amount filters and completed their Spec Kit lifecycle.
- PR #236/#244 merged fourteen FK indexes plus complete-coverage pgTAP; production advisor closure remains separate.
- PR #245 merged grouped monthly Dependabot configuration.
- PR #249 merged the public-safe provider runbook without provider writes.
- PR #250 merged the functional-MVP truth audit as `b7b0e1fb2c13e82061d7641f86e6b3c2a9b2bed4`.
- PR #222 remains **verified unmerged**, not current behavior and not evidence that reconciliation was never built.
- On 2026-08-03 the owner stated that several items previously described as undone had already been completed; exact private details must not be invented.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants/import | **Substantially implemented**; import/provenance production evidenced and complete public-FK coverage merged |
| #53 reconciliation | **Verified-unmerged contract through PR #222; absent on main** |
| #53 authenticated rules | **Absent on main; local rules exist** |
| #53 audit/performance | **Partial**; strong tooling and lab evidence exist, while capacity claims remain profile/provider-specific |
| #72 UI audit | **Broad automated coverage merged**; exact owner-held physical-device detail not reconciled |
| #172 product assessment | market-validation warnings remain useful; old feature-freeze framing is superseded |
| #174 provider controls | repository readiness and runbook merged; later owner execution is **not reconciled** |

## 9. Open pull-request memory

Open PRs are not product truth. Refresh and reverify against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #170/#171 | old stacked CSS cleanup candidates; compare current CSS ownership and tests before reuse |
| #119 | logo candidate requiring current browser evidence and explicit owner visual approval |

PR #250 is merged and must not remain candidate-only.

## 10. True gaps after this audit

### Locked MVP release closure

1. run `npm run mvp-verify` on the exact release candidate;
2. run the stable expense-path browser smoke;
3. assert exactly one visible primary action across current core empty states;
4. confirm no known open P0 money blocker;
5. fix only observed P0/P1 blockers;
6. make an explicit human MVP release decision.

### Separate public-beta hardening

- reconcile owner-held provider/device/deep-state evidence without exposing private identifiers or data;
- decide whether final visual-direction approval is required before broader use;
- run approved staging/provider load or advisor checks only when a capacity claim is needed.

### Post-MVP depth

1. decide whether to integrate or rebuild PR #222 reconciliation;
2. transaction review state, bounded bulk correction and split-line correction;
3. budget/recurring/goal history and lifecycle;
4. report arbitrary range/account/type/drill-down;
5. import batch UX, authenticated persisted rules, portability and mutation audit.

## 11. Current implementation direction

Wave 0 is now a bounded release-candidate gate, not an open-ended evidence hunt. Do not start another broad feature because an old issue says work is pending.

After release closure, tracks may proceed independently: ledger trust, planning depth, reports/export, import/rules and measured scale. Reconciliation is post-MVP unless explicitly promoted.

Validation remains embedded in each PR: financial/data work uses unit + migration replay + pgTAP + affected browser evidence; UI work uses responsive/browser and physical-device proof only where claimed; provider changes require before/after evidence, rollback and production smoke. CodeQL remains required on every PR.

## 12. Superseded-status register

Do not repeat these as current facts:

- CSV import is absent.
- Rules are entirely absent.
- Import provenance/dry-run/atomic approval are future work.
- Reports lack previous-period comparison or trends.
- Recurring items have no occurrence linkage.
- Goals lack deadline or pace calculation.
- Export only supports a current-month CSV.
- Export still depends on retired `/insights` wording.
- Lighthouse lab scores are not documented.
- Dashboard still performs the original authenticated fan-out.
- CAPTCHA application plumbing is missing.
- Account register/detail is absent.
- Transaction date/amount filters are missing or candidate-only.
- Reconciliation was never designed or tested.
- Closed-unmerged PR #222 is current product behavior.
- Missing public evidence proves the owner did not perform the work.
- Functional MVP requires every competitive-depth item in the capability matrix.
- Provider/device acceptance is automatically part of the locked nine-item MVP exit definition.
- A merged repository test proves private provider state or physical-device acceptance.
- A successful CodeQL job shell proves scanning when initialization or analysis was skipped.
- Spec Kit replaces MoneyFlow governance.
- The merged public-experience candidate is owner-approved final design.
- Feature development must freeze until a seven-day trial.

## 13. Update and compaction protocol

Every PR creates exactly one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md`. A status-changing PR also updates the affected row or section here.

Budgets:

- snapshot target: **150–250 lines**;
- soft warning: above **300 lines** or **32 KiB**;
- hard failure: above **500 lines** or **64 KiB**;
- PR record hard failure: above **140 lines** or **12 KiB**.

Record private operational evidence only as redacted summaries. Never store secrets, provider identifiers, exact defensive thresholds, request IDs, user financial data or unredacted screenshots here.
