# MoneyFlow — MVP truth audit

- **Audit date:** 2026-08-03
- **Repository baseline:** `main@b7b0e1fb2c13e82061d7641f86e6b3c2a9b2bed4`
- **Purpose:** separate functional implementation, release evidence, verified-unmerged work and owner-reported external work
- **Authority:** merged code/migrations/tests first; exact-head and production evidence second; owner statements are recorded without inventing missing operational detail
- **Release ledger:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`

## 1. Why this audit exists

The previous status summary incorrectly treated three different conditions as equivalent:

1. behavior is not merged into `main`;
2. public repository evidence is missing or stale;
3. the owner has not done the work.

Those conditions are not equivalent. PR #222 proves that a substantial reconciliation contract was designed and verified even though it was not merged, while the owner has stated that additional project work exists beyond the evidence previously inspected.

This audit uses four independent evidence states:

| State | Meaning |
|---|---|
| **Merged implementation** | Behavior exists on current `main` and is supported by relevant repository evidence. |
| **Verified unmerged** | A branch/PR reached meaningful exact-head verification but is not current product behavior. |
| **Owner-reported external** | The owner states the work was performed outside the public evidence inspected here; exact scope remains unasserted until reconciled. |
| **Not reconciled** | The audit cannot currently determine whether the work is complete; this does not mean it is undone. |

## 2. Functional MVP capability audit

All 16 capabilities in the locked MVP definition have a merged implementation baseline on current `main`.

| # | MVP capability | Current truth | Representative evidence |
|---:|---|---|---|
| 1 | Auth + demo | **Merged implementation** | email/password, OAuth surfaces, recovery/reset, explicit demo and CAPTCHA token plumbing |
| 2 | Multi wallet | **Merged implementation** | account CRUD/archive/restore, balances and account register/detail through PR #228 |
| 3 | Categories | **Merged implementation** | income/expense category CRUD and archive behavior |
| 4 | Ghi chi / thu | **Merged implementation** | quick capture and transaction creation with integer-VND validation |
| 5 | Transfer ≠ expense | **Merged implementation** | balanced transfer model and transfer-neutral income/expense reports |
| 6 | Dashboard | **Merged implementation** | bounded dashboard RPC, planning/activity summaries and schema-skew fallback through PRs #206/#207 |
| 7 | Monthly overview | **Merged implementation** | period income, expense, net and account balance summaries |
| 8 | Category budgets | **Merged implementation — basic loop** | current-month limit, spent calculation and CRUD |
| 9 | Recurring light | **Merged implementation — partial occurrence model** | templates, current-month occurrence, transaction link and pay/undo |
| 10 | Goals light | **Merged implementation — partial depth** | target, allocation, deadline, planned pace and archive |
| 11 | Reports + period | **Merged implementation — moderate depth** | week/month/year, previous comparable period, category shares and trends |
| 12 | CSV export | **Merged implementation** | direct period CSV from `/reports` and broader date-range CSV/JSON hub |
| 13 | Soft delete + undo | **Merged implementation** | recoverable transaction deletion and restore path |
| 14 | Onboarding short | **Merged implementation** | privacy promise → cash wallet confirmation → first expense or dashboard |
| 15 | Privacy / delete | **Merged implementation baseline** | privacy surfaces and recoverable ledger deletion behavior |
| 16 | Nav Core vs Lab | **Merged implementation** | core navigation and Inbox/advanced placement |

### Functional conclusion

MoneyFlow is **functional-MVP complete by the repository's own 16-capability definition**. Competitive-depth gaps are post-MVP unless an explicit owner decision promotes one to a release blocker.

## 3. MVP exit-criteria evidence audit

Feature existence and release acceptance are separate questions. The detailed evidence map is in the release ledger.

| Exit criterion | Evidence state | Audit conclusion |
|---|---|---|
| lint + typecheck + test green | **Repository evidenced** | `scripts/mvp-verify.sh` owns this gate; relevant runtime exact-head runs passed. |
| expense-path e2e green | **Repository evidenced** | repeated Chromium/WebKit and responsive runs passed on affected runtime slices. |
| demo production build green | **Repository evidenced** | production build is part of the MVP and CI gates and passed on relevant heads. |
| transfer excluded from expense | **Repository evidenced** | load-bearing invariant with unit/database/browser coverage. |
| landing G5 copy regression | **Repository evidenced for implementation** | merged implementation built, deployed and route-smoked; final visual approval is separate. |
| core empty states have one primary CTA | **Release-candidate gate** | shared `EmptyState` contract explicitly prefers one primary CTA, and inspected Transactions/Reports paths follow it; one focused current-candidate browser assertion remains before universal acceptance. |
| export reachable in at most two clicks | **Repository evidenced** | `/reports` exposes direct CSV and direct `/settings/export`; the retired `Insights` wording was stale. |
| no P0 money bugs | **No known public blocker; conditional** | extensive invariants exist, but universal bug absence cannot be proven from a green suite alone. |
| Lighthouse lab scores documented | **Repository evidenced** | `docs/performance-budgets.md` records Lighthouse 13.4 mobile scores, LCP/CLS/TBT, misses and mitigation plan. |

### Release conclusion

> **Functional MVP is complete. Eight of nine locked exit criteria are reconciled; the remaining focused release-candidate gate is the cross-route empty-state primary-action assertion.**

Provider, physical-device, final visual-direction and staging-load evidence may still matter for broader public beta, but they are not silently added to the locked nine-item MVP definition.

## 4. Important corrected classifications

### Reconciliation

PR #222 is not current behavior because it closed unmerged, but it is inaccurate to say reconciliation was never built. It includes pending/cleared/reconciled states, statement sessions, exact-difference completion, reopen history, transfer-leg behavior, correction guards, RLS/locking and 92 pgTAP assertions.

Correct status: **verified-unmerged contract; not integrated into `main` and not deployed**.

### Provider controls

Repository-side Auth/CAPTCHA readiness and the public-safe runbook are merged. Public issue #174 showed provider execution pending at its last update, while later owner-held work may exist.

Correct status: **public evidence not reconciled; do not infer either incomplete or complete provider state**.

### Physical-device and deep-state work

Broad responsive, WebKit, rich-VND and long-Vietnamese evidence is merged. Exact later owner-held physical-device/deep-state completion remains unknown to the repository audit.

Correct status: **broad automated acceptance merged; private/external detail not reconciled**.

### Lighthouse

The earlier audit failed to locate an existing repository artifact. `docs/performance-budgets.md` already records three Lighthouse passes and explicitly documents the LCP miss, CLS pass and mitigation plan.

Correct status: **locked MVP criterion satisfied by documented lab evidence**.

### Export discoverability

The locked text still referenced the retired `Insights` route. Current `/reports` exposes direct period CSV and direct advanced export navigation.

Correct status: **implemented and within the ≤2-click gate; definition wording updated to Báo cáo**.

## 5. Current release-closure plan

1. Keep all 16 MVP capabilities classified as implemented unless current executable evidence disproves them.
2. Run `npm run mvp-verify` on the exact release candidate.
3. Run the existing expense-path browser smoke.
4. Add or run one focused browser assertion that each core empty-state action region has exactly one visible primary action.
5. Confirm no known open P0 money blocker for the exact candidate.
6. Fix only observed P0/P1 release blockers.
7. Make an explicit human MVP/public-beta release decision.

## 6. Post-MVP work is separate

Potential post-MVP depth includes reconciliation integration, transaction review/bulk correction, planning history, richer reports, persisted rules, portability, mutation audit and measured scale acceptance. None of these invalidates functional MVP completion.

## 7. Evidence boundary

This audit cannot inspect private provider dashboards, unpublished device notes, user financial data or owner-held screenshots unless explicitly supplied or summarized. Missing private evidence is recorded as **not reconciled**, never silently converted into **not done**.
