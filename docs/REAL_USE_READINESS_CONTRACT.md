# MoneyFlow — Real-Use Readiness Contract

**Status:** active; R0–R6 accepted, R7 real-use proof not yet complete  
**Product boundary:** Vietnamese personal income/expense web app for one person managing their own wallets  
**Primary job:** record income/expense quickly, know the current balance and monthly spending, and retain ownership through export  
**Readiness period:** seven consecutive days of self-use after all technical gates pass

## Purpose

This contract separates three claims:

1. **Code-complete demo:** the app builds and demo tests pass.
2. **Authenticated product-ready:** the deployed app persists data correctly and protects each user's rows.
3. **Useful in daily life:** the owner actually uses it instead of a spreadsheet or notes for seven consecutive days.

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
- row counts, booleans, timings and HTTP status classes.

Forbidden:

- passwords, session cookies, JWTs, service-role keys or database credentials;
- real bank identifiers;
- raw real transaction descriptions;
- unredacted personal email addresses;
- screenshots containing sensitive financial data.

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
- R0–R6 were accepted on 2026-07-27. R7 counts only from consecutive owner-use evidence; task activation alone is not Day 1 proof.

## Readiness gates

A checkbox is accepted only with reproducible evidence.

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

### R7 — Seven-day self-use

R0–R6 are accepted. The seven-day task was activated on 2026-07-27, but activation does not prove that Day 1 or any later day was completed.

For seven consecutive calendar days:

- [ ] Open MoneyFlow at least once.
- [ ] Record all selected daily test expenses in MoneyFlow rather than a note or spreadsheet.
- [ ] Confirm daily balance and monthly expense totals are plausible.
- [ ] Record defects as reproducible issues without sensitive data.
- [ ] Do not add features unless a blocking defect requires a bounded fix.

At the end of day 7:

- [ ] Export successfully.
- [ ] Compare a sanitized sample against receipts/notes for missing or duplicate entries.
- [ ] Record median entry time from at least five timed entries.
- [ ] Record how many days MoneyFlow replaced the previous method.
- [ ] Decide: continue, fix blocking defects, simplify or stop.

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

## Accepted export-safety evidence

The disposable production run recorded in closed, unmerged PR #25 reported:

```text
stored note = =1+1
export navigation = Tổng quan → Xuất CSV → /settings/export
transaction rows = 1
raw CSV note = '=1+1
formula trigger at exported cell start = false
spreadsheet displayed value = =1+1
spreadsheet formula records = 0
consoleErrors = 0
account cleanup = 0 remaining tenant rows
```

The production file retained its UTF-8 BOM, Vietnamese headers, `2026-07-25` date, `-1000` integer VND amount and the expected account/category values. The apostrophe prevented formula interpretation while the spreadsheet engine displayed the intended user text. The temporary workflow, CSV and fixture were closed unmerged and the branch was reset to `main`.

## Accepted manual readiness evidence

Issue #27 records owner confirmation on 2026-07-27 that:

```text
production auth email callback = pass
CSV in a normal end-user spreadsheet = pass
physical-phone keyboard transaction flow = pass
```

This evidence contains no email address, callback token, password, session data or real financial description.

## Latest stabilization evidence

PR #125 fixed Dashboard keep-open ownership and reconciled demo balance from the current ledger. GitHub Actions run #501 passed verification, database and browser jobs. Vercel deployed squash commit `470f4ac6a79dd925eef6a834d745b768c7650967` as production deployment `dpl_14kdUsxkxruYnBVYThQWUu9msJzh` with state `READY`.

On 2026-07-29 the canonical origin and unauthenticated Dashboard-to-login path returned HTTP 200, and Vercel reported no runtime error clusters in the preceding 24 hours. A new local interactive production run was not claimed because the execution container blocked outbound browser navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; the exact P1 interaction regressions remain covered by CI browser tests.

## Current gap register

| Reference | Severity | Gap | Required result |
|---|---|---|---|
| #40 | P2 / plan-blocked | Supabase leaked-password protection remains unavailable on the current Free plan | Upgrade to Pro or above, enable the setting, rerun Security Advisor and verify a synthetic strong-password flow |
| R7 | P2 | Seven consecutive owner-use days are not evidenced | Record each completed day and perform the exit review without inferring continuity from task activation |

No known P0 or P1 blocker remains on core auth, capture, balance or export after PR #125. The open #40 warning is managed-service hardening constrained by plan availability, not a repository correctness defect.

## Defect priority

| Priority | Meaning | Action |
|---|---|---|
| P0 | Cross-user access, secret exposure, data loss, incorrect transfer/ledger balance | Stop immediately |
| P1 | Auth, persistence, export or mobile-entry blocker | One bounded fix PR |
| P2 | Non-blocking operational or quality gap | Record and schedule |
| P3 | New feature idea | Defer until after day 7 |

## Change-control rule

Every readiness implementation PR must contain:

1. the failed gate and exact reproduction;
2. the smallest required files;
3. tests or runtime evidence proving the gate now passes;
4. security and rollback notes;
5. explicit out-of-scope features.

Only one bounded defect may be fixed per PR.

## Exit decision

### Ready for self-use

R0–R6 are accepted. Owner self-use is allowed, but this does not authorize marketing, handling other people's financial data or claiming R7 completion.

### Ready for the next product decision

Allowed only after the seven-day run identifies a repeated, evidence-backed bottleneck. Repeated-entry shortcuts, faster capture and import improvements are not pre-approved.
