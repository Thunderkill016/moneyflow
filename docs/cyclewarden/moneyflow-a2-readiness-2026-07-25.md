# CycleWarden A2 — MoneyFlow real-use readiness

**Date:** 2026-07-25  
**Cycle ID:** `moneyflow:20260725-a2-real-use-readiness`  
**Objective:** Identify and execute the highest-value bounded next action after the repository-declared MVP.  
**Initial autonomy:** A2 — inspect, compare, decide and define the handoff  
**Executed delivery:** bounded A3-style infrastructure and defect PRs with independent verification  
**Current stage:** `verified-partial` — backend path accepted; public browser path blocked by deployment protection

## Decision question

What should MoneyFlow complete next before another product-feature PR is allowed?

## Decision

> Do not add another product feature. First prove that the existing product can run as an authenticated, persistent and tenant-isolated web application.

The required loop is:

```text
sign in
→ select wallet
→ add expense
→ read the persisted ledger
→ delete and restore safely
→ export
→ prove another user cannot access the rows
```

This is an internal readiness decision, not a claim of product-market fit.

## Evidence inspected

Repository evidence:

- `README.md`: Vietnamese personal income/expense web app; quick entry, multiple wallets, month view and export; no AI-advisor or bank-sync dependency.
- `docs/PRODUCT.md`: next priority is daily use, correct numbers, mobile entry and basic privacy.
- `docs/MVP_SHIPPED.md`: demo build, lint, typecheck, unit tests and demo E2E were green.
- `docs/research/05_PRODUCT_AND_ARCHITECTURE.md`: product wedge is entry under ten seconds, data ownership and lower complexity than heavyweight budgeting methods.
- `docs/security-rls-check.md`: static RLS existed, but runtime cross-user isolation was still a known gap.
- `docs/supabase-setup.md`: authenticated use requires a live project, current migrations and exact callback URLs.

Connected infrastructure at the beginning of the cycle:

- Supabase project `MoneyFlow` existed in Singapore but was `INACTIVE`.
- Its migration history stopped at `20260714000900`.
- No usable MoneyFlow Vercel deployment was available through the connected project list.
- The repository could deploy successfully while silently falling back to demo mode.

## External comparison

Primary references reviewed:

- Actual Budget: manual entry, imports, reconciliation, rules and an operating server for normal browser/mobile use.
- Money Lover: multi-wallet manual tracking, budgets, recurring entries, web access, synchronization and export.
- YNAB: transaction entry from core surfaces and broad export support.
- Firefly III: mature transaction/budget domain with greater operational complexity.
- Ivy Wallet: useful manual-entry UX reference, but archived and GPL-licensed.

References:

- https://actualbudget.org/docs/transactions/importing/
- https://actualbudget.org/docs/budgeting/rules/
- https://actualbudget.org/docs/install/
- https://moneylover.me/
- https://moneylover.zendesk.com/hc/en-us/articles/35836986998809-Premium-Main-features-and-purchase-instructions
- https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9
- https://www.ynab.com/whats-new/the-clearest-way-to-enter-transactions
- https://docs.firefly-iii.org/how-to/firefly-iii/finances/budgets/
- https://github.com/Ivy-Apps/ivy-wallet

## Opportunity comparison

| Option | Evidence | Decision |
|---|---|---|
| Repeat the previous transaction | Plausible convenience, but no real-use evidence showed it was the current bottleneck | Rejected for now; PR #1 closed unmerged |
| Expand imports/rules | Useful later; risks reviving the legacy inbox-first scope | Deferred |
| Add dashboard/budget/goal features | Repository already has broad MVP coverage | Rejected |
| Restore and verify authenticated operation | Directly addresses the unavailable backend, unproven isolation and lack of runtime evidence | Selected |

## Execution record

### Supabase restoration

- Restored project `MoneyFlow` from `INACTIVE` to `ACTIVE_HEALTHY`.
- Reviewed cloud and repository migration state before applying changes.
- Applied and aligned these cloud migration versions:
  - `20260725012037_import_batches_and_inbox_candidates`
  - `20260725012045_restore_money_transaction`
  - `20260725012059_category_archive`
  - `20260725012129_recurring_income_templates`
  - `20260725012245_readiness_security_hardening`
  - `20260725020400_transaction_entries_user_cascade`

### Database defects found and fixed

1. Trigger-only privileged functions were executable through the Data API roles.
   - Revoked execution from `PUBLIC`, `anon` and `authenticated` for `handle_new_user()` and `rls_auto_enable()`.
2. The recurring-income migration replaced `update_money_transaction` and dropped the archived-category invariant.
   - Restored the `category_archived` rejection while retaining commitment and recurring-income locks.
3. Full Auth-user deletion failed when ledger entries existed.
   - Added a direct tenant cascade from `transaction_entries.user_id` to `auth.users.id` while preserving restrictions on individual account/category deletion.

### Runtime database verification

Accepted results:

- Every public user-data table reports RLS enabled.
- User B saw zero accounts, transactions and inbox rows belonging to User A.
- A cross-tenant create RPC using User A's account UUID as User B failed with `account_not_found`.
- Editing a transaction onto an archived category failed with `category_archived`.
- A rollback-only tenant deletion test left zero users, profiles, accounts, categories, transactions and entries.
- Public Supabase client smoke passed:
  - password authentication;
  - own account/category reads;
  - transaction creation through RPC;
  - exact transaction read-back;
  - soft-delete hidden from the feed;
  - restore visible in the feed.

Disposable synthetic users and all generated rows were removed after verification.

### Repository and deployment controls

Merged bounded PRs:

- PR #4 — align cloud migrations, restore invariants, harden privileged functions and add permanent CI.
- PR #5 — block Vercel deployments that lack real Supabase public configuration.
- PR #7 — complete tenant hard-delete cascade.
- PR #9 — set and validate the canonical production auth origin.

Permanent source gates now run:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

The Vercel build runs the same verification and additionally refuses missing, placeholder or localhost production configuration.

Production origin recorded by the app:

```text
https://moneyflow-vn.vercel.app
```

### Independent verification

- GitHub Actions passed lint, typecheck, the complete unit/static-RLS suite and production build for each merged readiness PR.
- Vercel reported each merged readiness preview as `Ready` after running the full build command.
- No service-role key, database password or JWT signing secret was committed.

## Current blockers

### Issue #8 — Vercel production protection

`https://moneyflow-vn.vercel.app/login` is intercepted by **Log in to Vercel** before MoneyFlow renders. Preview aliases are protected as well. The connected Vercel tooling could not disable protection or create a temporary share URL.

Acceptance:

- Production `/login` opens MoneyFlow for a signed-out browser without requiring a Vercel account.
- Application authentication remains enabled.

### Issue #10 — Supabase Auth URL allow-list

The application now produces callbacks against the canonical production origin, but the connected Supabase tooling does not expose writes to Authentication → URL Configuration.

Required operator values:

```text
Site URL:     https://moneyflow-vn.vercel.app
Redirect URL: https://moneyflow-vn.vercel.app/auth/callback
```

Leaked-password protection is also still reported disabled by the Supabase security advisor.

## Gate status

| Gate | Status |
|---|---|
| Source CI and production build | Accepted |
| Supabase active and migrations aligned | Accepted |
| RLS and cross-user isolation | Accepted |
| Public client auth/ledger/delete/restore | Accepted |
| Tenant hard-delete cascade | Accepted |
| Vercel project and production deployment | Accepted |
| Canonical production callback origin in code | Accepted |
| Public browser access | **Blocked — issue #8** |
| Supabase dashboard callback allow-list | **Pending — issue #10** |
| Browser expense/reload/export smoke | Blocked by issue #8 |
| Seven-day self-use | Not started |

## Next authorized action

1. Resolve issue #8 in Vercel Project Settings by allowing public access to the production environment while retaining application authentication.
2. Resolve issue #10 in Supabase Authentication URL Configuration.
3. Re-run the disposable browser smoke:
   - open production login;
   - authenticate;
   - add one synthetic expense;
   - confirm UI update and reload persistence;
   - soft-delete and undo;
   - export and inspect the CSV;
   - remove the disposable user and generated rows.
4. Only after the browser gates pass, begin the seven-day self-use protocol in `docs/REAL_USE_READINESS_CONTRACT.md`.

## Guardrails

- No bank sync, AI advisor, family sharing, investing/crypto, OCR or inbox-brand revival.
- No feature PR before the readiness blockers are closed and the browser smoke is accepted.
- No production secrets or real financial descriptions in evidence.
- One reproduced defect per PR.
- Failure of tenant isolation, ledger correctness or cleanup stops the readiness run immediately.

## Limitations

- Passing backend and deployment checks does not prove the protected production site is usable.
- Seven-day self-use is owner evidence, not external user validation.
- This cycle does not establish demand, retention or market fit.
