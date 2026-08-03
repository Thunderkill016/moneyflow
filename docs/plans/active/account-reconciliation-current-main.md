# Account reconciliation current-main port

**Status:** evaluating
**Execution state:** scoped_candidate
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #260 / #261
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet ports the useful account-leg reconciliation model from draft PR #222 onto current `main`; it does not inherit #222's stale merge, verification or production claims.

## Outcome

MoneyFlow has a current-main database/domain contract for account reconciliation that preserves integer-VND ledger truth, treats reconciliation as account-leg state, keeps transaction review orthogonal, and maintains session-stable completed statement history.

## Repository reconnaissance

### Current baseline

- Baseline is `main@c1731e937394aa50a46bb07b5c0240069f3176d7` after merged transaction review and bounded bulk correction.
- `financial_transactions.review_status` is orthogonal quality metadata and must remain mutable even when account entries are reconciled.
- Financial balances remain derived from `accounts.initial_balance_minor` plus active `transaction_entries`.
- Transfers have independent account legs; split allocations can produce several entries for one transaction/account pair.
- Production currently serves the merged application, but reconciliation DDL is not authorized.

### Prior branch retained as design input only

Draft PR #222 established useful concepts: account-leg states, statement sessions, exact difference, latest reopen, transfer independence, split-leg atomicity, row locks, RLS and pgTAP. It is not a delivery branch because it is stale, not mergeable and uses out-of-order migrations.

### Blocking findings resolved in the current candidate

1. Reconciled transaction guards compare the financial row while excluding only `review_status` and `updated_at`; review updates remain allowed while financial rewrites remain blocked.
2. Completed sessions persist their balance and account-leg counts; the summary view uses those stored values rather than later live ledger state.
3. The current port uses one migration, `20260803142000_account_reconciliation_current_main.sql`, after the merged review migration.
4. Current project memory is not replaced by the stale #222 snapshot; memory integration remains pending exact-head verification.

## Research

External research is not required for the port. The governing evidence is current MoneyFlow schema, prior reconciliation tests, issue #260 and current product invariants.

### Adoption review

Not applicable. No dependency, provider, framework or architecture layer is added.

## Specification

### Domain model

- Entry state: `pending`, `cleared`, `reconciled`.
- State belongs to a logical account leg: all entries sharing `(user_id, transaction_id, account_id)` move together.
- Transfer source and destination legs remain independent because account IDs differ.
- A reconciliation session belongs to one owned account and one statement date/balance.
- At most one session is open per account.
- Completion requires exact zero difference and assigns currently cleared eligible account legs to that session.
- Only the latest completed session may reopen.
- Reopen restores only account legs assigned to that session from `reconciled` to `cleared`.
- Lifecycle events remain append-only through the narrow RPC surface.

### Session-stable balance rule

For a completed session, displayed cleared balance and difference use the stored completion snapshot. Later account legs, including backdated transactions reconciled in newer sessions, must not alter the older session.

For an open session, live balance is:

1. account opening balance;
2. plus account legs already reconciled for the account;
3. plus currently cleared account legs eligible for this statement;
4. each entry amount included once and each logical account leg counted once.

A later statement cannot coexist with an older open statement for the same account. Once a statement is completed, its displayed summary switches to the stored completion snapshot.

### Review/reconciliation separation

- `review_status` may change for a reconciled transaction.
- Financial mutation remains blocked when it could change a reconciled fact: kind, occurred date, account ownership/entries, amount, category allocation, soft deletion or hard deletion.
- Review updates must not reset clearing or reconciliation state.

### Acceptance criteria

- [x] Current-main canonical migration creates reconciliation types/tables/indexes/views/RPCs/triggers/grants.
- [x] Existing and new entries default pending without changing financial values.
- [x] Review-state changes have a permanent regression on reconciled transactions.
- [x] Amount/date/account/kind/category-entry/delete mutation guards have permanent coverage.
- [x] Split account-leg entries move together; transfer legs remain independent.
- [x] Completed-summary stability has a later-session backdated regression.
- [x] Open-session balance and account-leg counts have explicit coverage.
- [x] Latest reopen coverage checks session-owned membership only.
- [x] Cross-tenant mutation and summary visibility have coverage.
- [x] Tenant purge coverage includes reconciliation history.
- [ ] Fresh reset/full pgTAP pass on the exact candidate head.
- [ ] Forward-upgrade evidence from current-main migration order is recorded.
- [ ] Independent security/correctness review is complete.
- [ ] Exact-head CodeQL and secret scan pass.

### Out of scope

- account register or reconciliation UI;
- Server Actions/client hooks;
- automatic matching or bank feeds;
- direct balance overwrite;
- adjustment rows created outside existing financial transaction paths;
- production DDL or authenticated production writes.

## Implementation plan

### Migration shape

One canonical migration follows `20260803090000_transaction_review_bulk_correction.sql` and encodes final definitions directly. The three superseding #222 migrations are not copied into current history.

The canonical migration:

1. creates enums, sessions and events;
2. adds account-leg reconciliation columns/constraints/indexes;
3. creates live-open and stored-completed summary behavior;
4. creates lock helper and ownership-safe lifecycle RPCs;
5. creates precise financial mutation guards that allow `review_status`;
6. preserves tenant purge compatibility by allowing physical account deletion to use existing cascades after entries are removed;
7. applies least-privilege grants and RLS.

### Permanent tests

The candidate adds 82 pgTAP assertions across:

- `account_reconciliation_current_main.test.sql` — 43 assertions for schema, review separation, stable history, reopen, cross-tenant and purge;
- `account_reconciliation_account_legs.test.sql` — 21 assertions for transfer independence and split atomicity;
- `account_reconciliation_correction.test.sql` — 13 assertions for cleared-state reset on financial correction/deletion;
- `account_reconciliation_locking.test.sql` — 5 assertions for account-scoped lifecycle lock ownership.

### Documentation integration

Create a new PR memory record and update current project memory only after exact-head verification. No runtime or production claim is allowed from a local/fresh-reset result alone.

## Risks and counterexamples

| Risk | Required defense | Candidate evidence |
|---|---|---|
| later backdated entry rewrites old statement | completed snapshot | before/after later completion and reopen assertions |
| review and reconciliation become coupled | field-precise transaction trigger | bulk review succeeds and state remains reconciled |
| split allocations count multiple times | state by account leg, amount by entry | two split rows, one summary account-leg assertion |
| transfer legs lock together | account-scoped state | source and destination complete in different sessions |
| stale IDs or cross-tenant rows mutate | auth-derived owner and RLS | foreign entry ID rejection and empty summary view |
| stale migration order | one current timestamp | canonical migration after review migration |
| purge trigger blocks account deletion | no physical-delete guard; existing dependency order | purge regression |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | issue, branch and packet | #260, #261 | done |
| T2 | port tests for corrected semantics | 82 pgTAP assertions | done |
| T3 | canonical migration | `20260803142000...sql` | candidate |
| T4 | independent security/correctness review | findings resolved | pending |
| T5 | exact-head Class 3 gates | CI, CodeQL, secret scan | running after ready-for-review transition |
| T6 | owner merge / production decision | separate commands | blocked on owner |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | evaluator | implementer | implementing | #222 blocker review and issue #260 | corrected contract not yet encoded | write tests and canonical migration on current-main branch |
| 2026-08-03 | implementer | evaluator | evaluating | canonical migration plus 82 assertions | gates have not run while PR is draft | mark PR ready to trigger exact-head database checks |

### Current permission boundary

- Granted: focused branch writes, issue/PR metadata and repository checks.
- Forbidden: direct writes to `main`, production schema/data/provider settings and release claims.
- Human approval required before merge and separately before production migration.

## Evaluation

Candidate implementation exists. The earlier CI run on the draft PR intentionally skipped verify/database by workflow policy and is not evidence. Evaluation starts only with the ready-for-review run on the resulting exact head.

## Delivery record

- Branch: `feat/account-reconciliation-current-main`
- Issue: #260
- PR: #261 (ready only for verification; not merge-ready)
- Baseline: `c1731e937394aa50a46bb07b5c0240069f3176d7`
- Candidate migration: `20260803142000_account_reconciliation_current_main.sql`
- Candidate tests: 82 pgTAP assertions
- Production DDL: not authorized