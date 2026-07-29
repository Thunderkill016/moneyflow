# MoneyFlow — Real-Use Readiness Contract

**Status:** complete with owner waiver; R0–R6 accepted, R7 seven-day use accepted, exit review not performed  
**Product boundary:** Vietnamese personal income/expense web app for one person managing their own wallets  
**Primary job:** record income/expense quickly, know the current balance and monthly spending, and retain ownership through export  
**Readiness period:** seven days of owner self-use after all technical gates pass

## Purpose

This contract separates three claims:

1. **Code-complete demo:** the app builds and demo tests pass.
2. **Authenticated product-ready:** the deployed app persists data correctly and protects each user's rows.
3. **Useful in daily life:** the owner actually uses it instead of a spreadsheet or notes across a seven-day real-use period.

`npm run lint && npm run typecheck && npm run test && npm run build` support claim 1. This contract governs claims 2 and 3.

## Non-goals

- adding another transaction-entry shortcut;
- bank synchronization or Open Banking;
- AI financial advice;
- reviving the inbox/capture product identity;
- shared family finance;
- investment or crypto tracking;
- OCR, receipt scanning or voice entry;
- broad visual redesign;
- claiming demand or market validation;
- storing secrets or real financial descriptions in evidence.

## Evidence rules

Allowed:

- commit SHA, PR and issue references;
- deployment ID and public origin;
- migration identifiers;
- pass/fail command summaries;
- redacted synthetic identities;
- direct owner confirmation of manual use;
- row counts, booleans, timings and HTTP status classes.

Forbidden:

- passwords, session cookies, JWTs, service-role keys or database credentials;
- real bank identifiers;
- raw real transaction descriptions;
- unredacted personal email addresses;
- screenshots containing sensitive financial data;
- invented daily dates or reconstructed private transaction history.

## Environment contract

### Demo

- Browser-local data only.
- Used for deterministic UI and public-preview checks.
- Never counts as proof of authenticated persistence or tenant security.

### Synthetic readiness environment

- Active MoneyFlow Supabase project with synthetic users and sanitized amounts/descriptions.
- All migrations, RLS tests, auth checks and cleanup tests run here before real self-use.

### Production/self-use

- Canonical HTTPS origin: `https://mfvn.vercel.app`.
- Public page access must not require a Vercel account.
- Application authentication remains mandatory.
- Supabase Site URL and callback allow-list must match production exactly.
- R0–R6 were accepted on 2026-07-27.
- On 2026-07-29 the owner explicitly confirmed that MoneyFlow had already been used for seven days. That owner confirmation is accepted as evidence of the seven-day use duration; exact private daily dates and transaction details are not reconstructed.
- On 2026-07-29 the owner chose to skip the remaining exit-review checks. Those checks are recorded as waived and must not be represented as passed.

## Readiness gates

A checkbox is accepted only with reproducible technical evidence or explicit owner evidence for manual-use claims.

### R0 — Source and scope

- [x] Source-of-truth repository and current `main` commit are identified.
- [x] Feature PR #1 remains closed and unmerged.
- [x] Readiness work was split into bounded PRs.
- [x] Permanent CI and deployment commands are documented and enforced.

### R1 — Active Supabase environment

- [x] MoneyFlow Supabase project reports `ACTIVE_HEALTHY`.
- [x] Project region and intended environment are recorded without secrets.
- [x] Repository migrations were compared with cloud migration history.
- [x] Required migrations were reviewed and applied.
- [x] The frontend uses only the public client configuration; privileged secrets remain absent from the repository.

Applied cloud versions:

```text
20260725012037 import_batches_and_inbox_candidates
20260725012045 restore_money_transaction
20260725012059 category_archive
20260725012129 recurring_income_templates
20260725012245 readiness_security_hardening
20260725020400 transaction_entries_user_cascade
20260725035128 restore_split_feed_and_account_currency
```

### R2 — Database security

- [x] Static migration/RLS tests pass in permanent CI.
- [x] Local Supabase pgTAP suite passes after a fresh PostgreSQL 17 start and full local reset.
- [x] Supabase security advisor findings were reviewed.
- [x] A synthetic user can read their own default account and categories.
- [x] User B sees zero account, transaction and inbox rows belonging to User A.
- [x] A cross-tenant transaction RPC rejects User A's account UUID when called as User B.
- [x] Privileged trigger-only functions are not executable by browser Data API roles.
- [x] Ledger views used by the client use the intended security-invoker/RLS boundary.
- [x] Assigning an archived category during transaction edit is rejected.
- [x] Deleting an Auth user with ledger data removes all tenant rows without weakening individual account/category restrictions.
- [x] Production `transaction_feed` retains recurring metadata and split-expense lines after migration repair.
- [x] Split-expense and multi-currency account RPCs derive tenant identity from `auth.uid()` and expose only authenticated execution.
- [x] A 2026-07-29 live catalog audit verified all 23 authenticated `SECURITY DEFINER` mutation RPCs have an empty `search_path`, authentication and ownership predicates; none are executable by `anon` or `PUBLIC`.

Security Advisor still reports leaked-password protection disabled. Issue #40 records that this managed Auth feature requires Supabase Pro or above; it cannot be repaired by repository code or a SQL migration. The warning remains open and plan-blocked without weakening application validation.

**Stop condition:** any cross-user access, ledger corruption or incomplete cleanup blocks real-data use.

### R3 — Deployed application

- [x] A MoneyFlow Vercel project exists and is connected to the repository.
- [x] Vercel previews report `Ready` only after lint, typecheck, full tests and production build.
- [x] Required Supabase public client configuration is present.
- [x] Missing or placeholder configuration causes the deployment to fail.
- [x] `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS origin `https://mfvn.vercel.app`.
- [x] The public Supabase OAuth request contains `https://mfvn.vercel.app/auth/callback` as `redirect_to` and contains neither localhost nor the retired origin.
- [x] A real delivered email-confirmation or password-reset link completed the full callback flow on the canonical origin; owner-confirmed on 2026-07-27.
- [x] No privileged secret was committed.
- [x] Production `/login` is reachable from an external runner without Vercel Authentication.

### R4 — Authenticated core flow

Backend/public-client evidence:

- [x] Password authentication succeeds through the public Supabase client.
- [x] An authenticated user sees their own wallet and categories.
- [x] Creating an expense through the public RPC succeeds.
- [x] The created transaction reads back with the exact amount and note.
- [x] Soft-delete hides the transaction from the feed.
- [x] Restore returns the transaction to the feed.

Production browser evidence on a 390×844 viewport:

- [x] Sign in through the production MoneyFlow page.
- [x] Open the authenticated quick-entry form.
- [x] Add one synthetic expense and confirm it appears exactly once.
- [x] Confirm balance, month and category totals change exactly once.
- [x] Reload and confirm UI persistence.
- [x] Edit the note and amount and confirm the updated row appears exactly once.
- [x] Soft-delete and use the UI undo action.
- [x] Confirm a transfer moves account balances but does not alter income, expense, net, total balance or category totals.
- [x] Permanently delete the authenticated account through the UI.
- [x] Confirm re-login is rejected and Auth, identity, profile, account, category, transaction and ledger row counts are all zero.

### R5 — Export and ownership

- [x] Export authenticated data through the production UI.
- [x] Import the downloaded production CSV into a spreadsheet engine and verify columns, date, amount, displayed value and absence of formula records.
- [x] Exercise a formula-leading value in a production export and confirm escaping.
- [x] Exported note and amount match the ledger row.
- [x] Tenant-isolation evidence and the single-tenant export show no other user's rows.
- [x] Confirm export is discoverable through normal navigation without directly entering the settings URL.
- [x] Open the same production CSV in an end-user desktop or mobile spreadsheet application; owner-confirmed on 2026-07-27.

### R6 — Mobile daily path

On a 390×844 Chromium viewport:

- [x] Sign in without layout obstruction or horizontal overflow.
- [x] Open “Ghi chi tiêu” from the production mobile FAB rather than direct route navigation.
- [x] Amount input receives focus and uses decimal input mode.
- [x] The quick-entry form requires no horizontal scrolling.
- [x] Save succeeds and the transaction appears in the manager immediately.
- [x] Exercise the real mobile keyboard and confirm it does not cover primary controls; owner-confirmed on 2026-07-27.

### R7 — Seven-day self-use and owner waiver

Owner-use evidence:

- [x] The owner explicitly confirmed on 2026-07-29 that MoneyFlow had already been used for seven days.
- [x] Multiple defects were discovered during that real use.
- [x] The owner is not required to repeat another seven-day window because the structured log was created after the use had already occurred.
- [x] Exact private daily dates, descriptions and amounts are not invented or published.
- [x] Defect details and remediation are deferred to a separate evidence-driven plan.
- [x] The owner explicitly chose to skip the remaining exit-review phase and proceed to the next plan.

The seven-day use-duration gate is accepted. The following checks were waived and are **not verified**:

- [~] Export the final self-use CSV and open it in a normal spreadsheet application — waived.
- [~] Compare a sanitized sample for missing or duplicate entries — waived.
- [~] Record median entry time from at least five timed entries — waived and not measured.
- [~] Record how many of the seven days MoneyFlow replaced the previous method — waived and not measured.

Exit direction:

- [x] Proceed to a separate evidence-driven blocker/defect plan.

TRUST-7 is closed with an explicit owner waiver. The waiver unblocks defect planning but does not validate unrestricted redesign, feature expansion, #72, PR #119 or roadmap work under #53. Separately scoped P0/P1 production blockers remain the first priority.

## Accepted production smoke evidence

The final disposable-tenant run on `https://mfvn.vercel.app` reported:

```text
productionAuthRedirect = true
publicLogin = true
passwordResetRequest = true
passwordLogin = true
mobileQuickAdd = true
persistence = true
edit = true
deleteUndo = true
export = true
accountCleanup = true
consoleErrors = 0
finalUrl = https://mfvn.vercel.app/login?deleted=1
```

The password-reset checkbox above means only that the production UI accepted the request and displayed its generic response. The separate owner-confirmed R3 gate proves that a real delivered callback completed on the canonical origin.

## Accepted fresh-database evidence

PR #21 and GitHub Actions run #79 established a permanent database gate:

```text
PostgreSQL = 17
initial migration replay = pass
supabase db reset --local = pass
seed application = pass
pgTAP = 78/78 pass
Docker cleanup = pass
Next.js lint/typecheck/unit/static-RLS/build = pass
```

The run also proved that historical migrations can reconstruct the final split-expense, recurring-income, account-currency and security-hardening contracts without relying on cloud-only state.

## Accepted dashboard and transfer evidence

The disposable production run recorded in closed, unmerged PR #23 reported:

```text
initial total balance = 1.000.000 ₫
expense = 123.456 ₫
after-expense balance = 876.544 ₫
monthly income = 0 ₫
monthly expense = 123.456 ₫
net = −123.456 ₫
Ăn uống = 123.456 ₫
reload duplicate count = 0
transfer = 50.000 ₫
source after transfer = 826.544 ₫
destination after transfer = 50.000 ₫
after-transfer total balance = 876.544 ₫
after-transfer monthly income/expense/net/category = unchanged
transfer ledger shape = 1 transaction / 2 entries
consoleErrors = 0
account cleanup = 0 remaining tenant rows
```

The mobile production FAB opened the entry dialog, so the accepted path did not depend on direct navigation to `/capture/quick`. The temporary workflow and fixture were closed unmerged and the branch was reset to `main`.