# MoneyFlow — MVP truth audit

- **Audit date:** 2026-08-03
- **Repository baseline:** `main@3e3cb30e56d2d6325662a047fee35959a5811e12`
- **Purpose:** separate functional implementation, release evidence, verified-unmerged work and owner-reported external work
- **Authority:** merged code/migrations/tests first; exact-head and production evidence second; owner statements are recorded without inventing missing operational detail

## 1. Why this audit exists

The previous status summary incorrectly treated three different conditions as equivalent:

1. behavior is not merged into `main`;
2. public repository evidence is missing or stale;
3. the owner has not done the work.

Those conditions are not equivalent. In particular, PR #222 proves that a substantial reconciliation contract was designed and verified even though it was not merged, while the owner has also stated that additional project work exists beyond the evidence previously inspected.

This audit therefore uses four independent evidence states:

| State | Meaning |
|---|---|
| **Merged implementation** | Behavior exists on current `main` and is supported by relevant repository evidence. |
| **Verified unmerged** | A branch/PR reached meaningful exact-head verification but is not current product behavior. |
| **Owner-reported external** | The owner states the work was performed outside the public evidence inspected here; exact scope remains unasserted until reconciled. |
| **Not reconciled** | The audit cannot currently determine whether the work is complete; this does not mean it is undone. |

## 2. Functional MVP capability audit

The locked MVP definition contains 16 capabilities. All 16 have a merged implementation baseline on current `main`.

| # | MVP capability | Current truth | Representative evidence |
|---:|---|---|---|
| 1 | Auth + demo | **Merged implementation** | email/password, OAuth surfaces, recovery/reset, explicit demo and CAPTCHA token plumbing |
| 2 | Multi wallet | **Merged implementation** | account CRUD/archive/restore, common account kinds, balances and account register/detail through PR #228 |
| 3 | Categories | **Merged implementation** | income/expense category CRUD and archive behavior |
| 4 | Ghi chi / thu | **Merged implementation** | quick capture and transaction creation flows with integer-VND validation |
| 5 | Transfer ≠ expense | **Merged implementation** | balanced transfer model and transfer-neutral income/expense reports |
| 6 | Dashboard | **Merged implementation** | bounded dashboard RPC, planning/activity summaries and schema-skew fallback through PRs #206/#207 |
| 7 | Monthly overview | **Merged implementation** | period income, expense, net and account balance summaries |
| 8 | Category budgets | **Merged implementation — basic loop** | current-month limit, spent calculation and CRUD |
| 9 | Recurring light | **Merged implementation — partial occurrence model** | templates, current-month occurrence, transaction link and pay/undo |
| 10 | Goals light | **Merged implementation — partial depth** | target, allocation, deadline, planned pace and archive |
| 11 | Reports + period | **Merged implementation — moderate depth** | week/month/year, previous comparable period, category shares and trends |
| 12 | CSV export | **Merged implementation** | period CSV and broader date-range CSV/JSON export hub |
| 13 | Soft delete + undo | **Merged implementation** | recoverable transaction deletion and restore path |
| 14 | Onboarding short | **Merged implementation** | privacy promise → cash wallet confirmation → first expense or dashboard |
| 15 | Privacy / delete | **Merged implementation baseline** | privacy surfaces and recoverable ledger deletion behavior |
| 16 | Nav Core vs Lab | **Merged implementation** | core navigation and Inbox/advanced placement |

### Functional conclusion

MoneyFlow is **functional-MVP complete by the repository's own 16-capability definition**. Competitive-depth gaps in budgets, recurring, goals, reports, import or account operations are post-MVP depth unless a separate owner decision promotes one to a release blocker.

## 3. MVP exit-criteria evidence audit

Feature existence and release acceptance are separate questions.

| Exit criterion | Evidence state | Audit conclusion |
|---|---|---|
| lint + typecheck + test green | **Repository evidenced** | `scripts/mvp-verify.sh` owns this gate; recent exact-head full-verification runs passed. |
| expense-path e2e green | **Repository evidenced** | repeated Chromium/WebKit and responsive runs passed on the latest affected runtime slices. |
| demo production build green | **Repository evidenced** | production build is part of the MVP and CI gates and has passed on relevant exact heads. |
| transfer excluded from expense | **Repository evidenced** | load-bearing financial invariant with unit/database/browser regression coverage. |
| landing G5 copy regression | **Repository evidenced for implementation** | merged landing/auth candidate built, deployed and smoke-tested; final visual approval remains a separate owner decision. |
| core empty states have one primary CTA | **Not fully reconciled** | broad route audits exist, but this audit did not locate one current-main acceptance record proving the rule across every core empty state. Do not label it undone. |
| export reachable in at most two clicks | **Implemented; acceptance wording needs refresh** | export surfaces are merged, but the old criterion names the retired `Insights` surface. Recheck the current dashboard/reports path rather than treating route wording as a missing feature. |
| no P0 money bugs | **No known public blocker; inherently conditional** | extensive ledger invariants and tests exist. Absence of all P0 bugs cannot be proven solely from a green suite. |
| Lighthouse lab scores documented | **Not located in inspected repository evidence** | this may exist in an owner-held artifact; do not claim it is missing until external evidence is reconciled. |

### Release conclusion

The truthful state is:

> **Functional MVP is complete. Release-evidence reconciliation is incomplete.**

The remaining work is not automatically feature development. It is to reconcile owner-held evidence, refresh stale acceptance wording, run only the unresolved acceptance checks, and fix actual blockers if found.

## 4. Important corrected classifications

### Reconciliation

PR #222 is not current product behavior because it was closed unmerged. However, it is also not accurate to say reconciliation was never built.

Verified-unmerged evidence includes:

- pending, cleared and reconciled account-leg states;
- statement sessions with integer statement balance and exact difference;
- zero-difference completion and latest-session reopen history;
- independent transfer-leg reconciliation and grouped split behavior;
- correction/deletion reset semantics and reconciled mutation guards;
- RLS, ownership constraints, lock ordering and least-privilege grants;
- 92 reconciliation pgTAP assertions;
- exact-head CI, CodeQL and secret-scan success.

Correct status: **verified-unmerged contract; not integrated into `main` and not deployed**.

### Provider controls

Repository-side Auth/CAPTCHA readiness and a public-safe provider runbook are merged. Issue #174's public record still shows provider execution as pending at its last update. The owner has stated that multiple items previously described as pending were already done, but did not identify which provider operations in this conversation.

Correct status: **public evidence is not reconciled; do not infer either incomplete or complete provider state**.

### Physical-device and deep-state work

Issue #72 and merged PRs prove broad responsive, WebKit, rich-VND and long-Vietnamese coverage. The public issue retained physical-device and some deep states as open at its last update. The owner may hold later evidence outside the inspected public record.

Correct status: **broad automated acceptance merged; exact owner-held physical-device/deep-state completion not reconciled**.

## 5. Current release-closure plan

1. Treat all 16 MVP capabilities as implemented unless current code/test evidence disproves them.
2. Collect only unresolved exit evidence: current empty-state CTA audit, current export click path, Lighthouse artifact and any owner-held provider/device acceptance.
3. Record owner-held evidence without exposing secrets, provider IDs, thresholds, request IDs or user data.
4. Run `npm run mvp-verify` and the focused MVP browser journey on the exact release candidate.
5. Fix only observed P0/P1 release blockers.
6. Make a human release decision; do not expand competitive-depth scope during release closure.

## 6. Post-MVP work is a separate decision

The following may be valuable but do not invalidate functional MVP completion:

- integrating or rebuilding the verified-unmerged reconciliation contract;
- transaction review state and bounded bulk correction;
- budget history/copy/rollover/drill-down;
- recurring and goal lifecycle depth;
- report arbitrary ranges and drill-down;
- richer import/rules/export portability;
- measured staging/large-ledger acceptance.

## 7. Evidence boundary

This audit can establish repository truth and identify stale classifications. It cannot inspect private provider dashboards, private screenshots, unpublished device notes or other owner-held artifacts unless they are explicitly supplied or summarized. Missing public evidence is recorded as **not reconciled**, never silently converted into **not done**.
