# Account register and detail

- **Status:** completed
- **Execution state:** accepted_and_archived
- **Active role:** none
- **Permission scope:** read_only
- **Owner:** Thunderkill016
- **Implementation PR:** #228
- **Merge commit:** `52c1eac9197e16f5f7398bb25c20af4833de1993`
- **Completed:** 2026-08-02

## Outcome

MoneyFlow now lets a user open any visible active or archived account and inspect the ledger movements that affect that account. The view keeps the existing derived balance authoritative, separates income, expense, transfer-in and transfer-out, and presents a newest-first read-only register.

## Repository reconnaissance

Before PR #228, `/accounts` exposed balances and account-management actions but no account detail route. Existing viewer-scoped account and finance workspaces already provided the authoritative account/balance and transaction inputs.

The implementation reused those loaders unchanged and added only:

- a pure account-leg projection;
- a viewer-scoped `/accounts/[accountId]` route;
- a responsive read-only account detail component;
- `Xem sổ` links on active and archived account cards;
- focused unit and Playwright coverage.

Reconciliation remained explicitly out of scope. Closed PR #222 was not revived.

## Research

No external research or dependency adoption was required. Current code, financial invariants and recorded owner direction established the implementation boundary.

## Specification and acceptance

The retained feature artifacts are under `specs/001-account-register-detail/`.

Accepted behavior:

- active and archived accounts expose `Xem sổ`;
- account identity, type, currency, current balance, initial balance and archive state are represented;
- income and expense affect only their source account;
- transfer source impact is negative and destination impact is positive;
- transfers remain excluded from income and expense totals;
- movements are grouped newest-first by day;
- no-movement accounts show an honest empty state;
- history-load failures hide unverified movement totals instead of presenting false zeros;
- inaccessible account IDs use a generic not-found state;
- phone layouts wrap without horizontal overflow;
- no database, migration, RLS, RPC, provider or financial-mutation contract changed.

## Implementation plan

| Path | Accepted change |
|---|---|
| `src/lib/account-register.ts` | Related-row filtering, signed impacts, ordering and separate totals |
| `src/lib/account-register.test.ts` | Income, expense, both transfer legs, unrelated rows, ordering and invalid-input counterexamples |
| `src/app/accounts/[accountId]/page.tsx` | Viewer-scoped account detail route |
| `src/components/account-detail-page.tsx` | Trusted summary, grouped register and empty/error states |
| `src/components/account-detail-page.module.css` | Scoped responsive presentation |
| `src/components/accounts-page.tsx` | Active and archived `Xem sổ` navigation |
| `src/components/accounts-page.module.css` | Account action layout and target sizing |
| `e2e/account-register-detail.spec.ts` | Populated, empty, inaccessible and phone-width evidence |

The change was additive. Rollback is the revert of merge commit `52c1eac9197e16f5f7398bb25c20af4833de1993`.

## Evaluation

### Financial and ownership review

- Transfer-neutral income/expense totals are protected by pure-domain tests.
- Both source and destination transfer legs are represented.
- Existing viewer-scoped loaders remain the authorization boundary.
- The page is read-only and does not duplicate transaction mutation ownership.
- No reconciliation state, statement balance, direct balance adjustment or matching model was introduced.

### Exact-head verification

Final PR head: `642315e9c1ac96a0fa983426fc40f1bec56fc707`.

- CI #1095: success;
- diff hygiene, project knowledge and CI policy: success;
- deployment configuration, CSS ownership and architecture: success;
- lint, typecheck, unit/static-RLS tests and production build: success;
- browser smoke and cross-device UI audit: success;
- database job: success with database checks correctly not required;
- CodeQL #252: success;
- Secret history scan #252: success.

An earlier unrelated SAFE-09 audit failure passed on a same-head rerun without source changes. No transaction or audit code outside the feature scope was modified.

### Post-merge production evidence

- Vercel deployment `dpl_84aJGAS3jkFRApiy66DBFXHkQgiu` is `READY`, target `production`, and is tied to merge commit `52c1eac9197e16f5f7398bb25c20af4833de1993`.
- Canonical `/accounts` returned the login surface and preserved `next=/accounts`.
- Canonical `/accounts/not-a-real-account` returned the login surface and preserved the full account-detail `next` path.
- No runtime-error cluster was found for `/accounts` or `/accounts/[accountId]` in the checked two-hour window.
- No authenticated production account data was used or inspected; exact financial/UI behavior remains supported by the merged unit and browser evidence rather than a production user-session probe.

## Handoff record

| Date | From | To | State | Evidence | Remaining limitation |
|---|---|---|---|---|---|
| 2026-08-02 | owner | planner | specified | owner instruction and current repository audit | reconciliation deferred |
| 2026-08-02 | planner | implementer | planned | spec, plan, tasks and checklist | runtime unverified |
| 2026-08-02 | implementer | evaluator | evaluating | source, tests and PR #228 | exact-head gates pending |
| 2026-08-02 | evaluator | owner | ready_for_review | final green head and bounded review | production pending |
| 2026-08-02 | owner | completed record | accepted_and_archived | squash merge, READY deployment and route/auth-boundary smoke | no authenticated production data probe |

## Remaining limitations

This slice does not provide statement reconciliation, account trends, account-specific export, account-register filtering, or transaction correction inside the register.

## Delivery record

- PR: #228
- Merge method: squash
- Merge commit: `52c1eac9197e16f5f7398bb25c20af4833de1993`
- Production deployment: `dpl_84aJGAS3jkFRApiy66DBFXHkQgiu`, `READY`
- Canonical production domain checked: `mfvn.vercel.app`
- Active packet archived to this completed record
