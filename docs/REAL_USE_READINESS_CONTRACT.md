# MoneyFlow — Real-Use Readiness Contract

**Status:** active; technical backend gates partially accepted  
**Product boundary:** Vietnamese personal income/expense web app for one person managing their own wallets  
**Primary job:** record income/expense quickly, know the current balance and monthly spending, and retain ownership through export  
**Readiness period:** seven consecutive days of self-use after all technical gates pass

## Purpose

This contract separates three claims:

1. **Code-complete demo:** the app builds and demo tests pass.
2. **Authenticated product-ready:** the deployed app persists data correctly and protects each user's rows.
3. **Useful in daily life:** the owner actually uses it instead of a spreadsheet or notes for seven consecutive days.

`docs/MVP_SHIPPED.md` supports claim 1. This contract governs claims 2 and 3.

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

- HTTPS production origin.
- Public page access must not require a Vercel account.
- Application authentication remains mandatory.
- Supabase Site URL and callback allow-list must match production exactly.
- Begin only after R0–R6 pass.

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
```

### R2 — Database security

- [x] Static migration/RLS tests pass in permanent CI.
- [ ] Local Supabase pgTAP suite has been run against a fresh local reset.
- [x] Supabase security advisor findings were reviewed.
- [x] A synthetic user can read their own default account and categories.
- [x] User B sees zero account, transaction and inbox rows belonging to User A.
- [x] A cross-tenant transaction RPC rejects User A's account UUID when called as User B.
- [x] Privileged trigger-only functions are not executable by browser Data API roles.
- [x] Ledger views used by the client use the intended security-invoker/RLS boundary.
- [x] Assigning an archived category during transaction edit is rejected.
- [x] Deleting an Auth user with ledger data removes all tenant rows without weakening individual account/category restrictions.

**Stop condition:** any cross-user access, ledger corruption or incomplete cleanup blocks real-data use.

### R3 — Deployed application

- [x] A MoneyFlow Vercel project exists and is connected to the repository.
- [x] Vercel previews report `Ready` only after lint, typecheck, full tests and production build.
- [x] Required Supabase public client configuration is present.
- [x] Missing or placeholder configuration causes the deployment to fail.
- [x] `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS origin `https://moneyflow-vn.vercel.app`.
- [ ] Supabase Authentication Site URL and redirect allow-list are verified in the dashboard — issue #10.
- [x] No privileged secret was committed.
- [ ] Production `/login` is reachable without Vercel Authentication — issue #8.

### R4 — Authenticated core flow

Backend/public-client evidence:

- [x] Password authentication succeeds through the public Supabase client.
- [x] An authenticated user sees their own wallet and categories.
- [x] Creating an expense through the public RPC succeeds.
- [x] The created transaction reads back with the exact amount and note.
- [x] Soft-delete hides the transaction from the feed.
- [x] Restore returns the transaction to the feed.

Browser/UI evidence still required:

- [ ] Register or sign in through the production MoneyFlow page.
- [ ] Open the quick-entry form on a phone viewport.
- [ ] Add one expense in under ten seconds after the form opens.
- [ ] Confirm balance, month and category totals change exactly once.
- [ ] Reload and confirm UI persistence.
- [ ] Edit and confirm totals recalculate exactly once.
- [ ] Soft-delete and use the UI undo action.
- [ ] Confirm a transfer does not alter income/expense totals.

Browser evidence is blocked until issue #8 is resolved.

### R5 — Export and ownership

- [ ] Export authenticated data through the production UI.
- [ ] CSV opens correctly in a spreadsheet.
- [ ] Formula-leading values are escaped.
- [ ] Exported dates and amounts match the ledger.
- [ ] No other user's rows appear.
- [ ] Export is discoverable without entering the advanced capture workflow.

### R6 — Mobile daily path

On a normal phone viewport/browser:

- [ ] Sign in without layout obstruction.
- [ ] Open “Ghi chi tiêu” from the primary action/FAB.
- [ ] Amount input receives focus and the correct keyboard mode.
- [ ] Category, wallet, date and note controls require no horizontal scrolling.
- [ ] Save success is clear and the transaction appears immediately.
- [ ] Navigation, keyboard and modal do not cover primary controls.

### R7 — Seven-day self-use

Start only after R0–R6 pass.

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

## Current blocker register

| Reference | Severity | Blocker | Required result |
|---|---|---|---|
| Issue #8 | P1 | Vercel Authentication intercepts production before MoneyFlow renders | Public production page, application login still required |
| Issue #10 | P1 | Supabase Auth dashboard Site URL/redirect allow-list not verified | Exact production Site URL and `/auth/callback` allowed |
| R2 pgTAP | P2 | Fresh local Docker database suite not executed in this connected run | `npm run test:db` passes after reset |

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

Allowed only when R0–R6 pass. It does not authorize marketing or handling other people's financial data.

### Ready for the next product decision

Allowed only after the seven-day run identifies a repeated, evidence-backed bottleneck. Repeated-entry shortcuts, faster capture and import improvements are not pre-approved.
