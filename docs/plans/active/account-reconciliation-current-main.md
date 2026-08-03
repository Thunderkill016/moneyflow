# Account reconciliation current-main port

**Status:** implementing
**Execution state:** scoped_candidate
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #260 / pending
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

### Blocking findings to resolve

1. Its transaction trigger blocks every update on reconciled transactions, conflicting with current review-state mutation.
2. Its completed summaries are dynamic across all later cleared/reconciled entries and can change historical sessions retroactively.
3. Its four old migrations repeatedly override functions and precede migrations already merged to current main.
4. Its project-memory replacement predates the MVP release, global horizon and PR #255.

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
2. plus account legs reconciled by sessions whose statement sequence is not later than the open session;
3. plus currently cleared account legs eligible for this statement;
4. each logical account leg counted exactly once.

The implementation must not infer historical membership only from `occurred_on` and current state.

### Review/reconciliation separation

- `review_status` may change for a reconciled transaction.
- Financial mutation remains blocked when it could change a reconciled fact: kind, occurred date, account ownership/entries, amount, category allocation where financially relevant, soft deletion or hard deletion.
- Review updates must not reset clearing or reconciliation state.

### Acceptance criteria

- [ ] Current-main canonical migration creates reconciliation types/tables/indexes/views/RPCs/triggers/grants.
- [ ] Existing and new entries default pending without changing financial values.
- [ ] Review-state changes succeed on reconciled transactions.
- [ ] Amount/date/account/kind/category-entry/delete mutations that would change reconciled facts fail atomically.
- [ ] Split account-leg entries move together; transfer legs remain independent.
- [ ] Completed summaries remain unchanged after a backdated entry is reconciled in a later session.
- [ ] Open-session balance counts prior reconciled and current cleared account legs exactly once.
- [ ] Latest reopen changes only entries assigned to that session.
- [ ] Cross-tenant IDs and rows are unavailable through views/RPCs.
- [ ] Tenant purge removes reconciliation rows safely.
- [ ] Fresh reset/full pgTAP and current-main forward-upgrade fixture pass.

### Out of scope

- account register or reconciliation UI;
- Server Actions/client hooks;
- automatic matching or bank feeds;
- direct balance overwrite;
- adjustment rows created outside existing financial transaction paths;
- production DDL or authenticated production writes.

## Implementation plan

### Migration shape

Create one canonical migration after `20260803090000_transaction_review_bulk_correction.sql`, unless a minimal second migration is required by PostgreSQL dependency ordering. Do not copy the three superseding #222 migrations as separate history.

The canonical migration will:

1. create enums, sessions and events;
2. add account-leg reconciliation columns/constraints/indexes;
3. create session-stable summary/read contracts;
4. create lock helper and ownership-safe lifecycle RPCs;
5. create precise financial mutation guards that allow `review_status`;
6. update tenant purge using the current-main definition;
7. apply least-privilege grants and RLS.

### Tests first

Port and rewrite permanent pgTAP around final semantics rather than preserving old implementation details. Add explicit regressions for:

- reconciled transaction review-state mutation;
- backdated entry reconciled in a later session;
- stored completed-session zero difference;
- open-session account-leg counting;
- split/transfer behavior;
- mutation guard field precision;
- two-tenant attacks;
- purge and forward upgrade.

### Documentation integration

Create a new PR memory record. Update current project memory only after exact-head verification and only by merging reconciliation facts into the current snapshot.

## Risks and counterexamples

| Risk | Required defense |
|---|---|
| later backdated entry rewrites old statement | session-owned membership plus stored completed snapshot tests |
| review and reconciliation become coupled | field-precise mutation trigger and review RPC regression |
| split allocations count multiple times | logical account-leg grouping/counting |
| transfer legs lock together | account-scoped state and tests for independent source/destination |
| stale IDs or cross-tenant rows mutate | auth-derived owner, exact row locks/counts and two-user pgTAP |
| forward migration history rejects old timestamps | new canonical timestamp after current main and upgrade fixture |
| purge trigger blocks account deletion | delete reconciliation entries in current dependency order and verify zero remainder |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | issue, branch and packet | #260, current-main branch | done |
| T2 | port tests for corrected semantics | focused pgTAP | pending |
| T3 | canonical migration | fresh reset and upgrade fixture | pending |
| T4 | independent security/correctness review | findings resolved | pending |
| T5 | exact-head Class 3 gates | CI, CodeQL, secret scan | pending |
| T6 | owner merge / production decision | separate commands | blocked on owner |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | evaluator | implementer | implementing | #222 blocker review and issue #260 | corrected contract not yet encoded | write tests and canonical migration on current-main branch |

### Current permission boundary

- Granted: focused branch writes, issue/PR metadata and repository checks.
- Forbidden: direct writes to `main`, production schema/data/provider settings and release claims.
- Human approval required before merge and separately before production migration.

## Evaluation

Pending corrected implementation and exact-head evidence.

## Delivery record

- Branch: `feat/account-reconciliation-current-main`
- Issue: #260
- Draft PR: pending
- Baseline: `c1731e937394aa50a46bb07b5c0240069f3176d7`
- Production DDL: not authorized
