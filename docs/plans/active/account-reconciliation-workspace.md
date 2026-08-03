# Account reconciliation workspace

**Status:** implementing
**Execution state:** active
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #262 / pending
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns the user-facing reconciliation slice built on the domain contract merged through PR #261. It does not authorize production DDL, production-data writes or merge.

## Outcome

A MoneyFlow user can open one owned VND account, start a statement session, clear eligible account legs, see the exact live difference, complete only at zero, inspect stable completed history and reopen only the latest completed session.

## Repository reconnaissance

- Baseline: `main@2d8550f739f179fcd42a8fb029c1091467b97847`.
- Account register/detail already exists at `/accounts/[accountId]` and derives signed account impact through `src/lib/account-register.ts`.
- Viewer-aware reads live in `src/server/**`; authenticated financial writes live in validated Server Actions and ownership-safe RPCs.
- PR #261 merged the database contract: `pending` / `cleared` / `reconciled`, one open session per account, exact-zero completion, session-stable completed snapshots, latest-only reopen and review/reconciliation separation.
- The existing transaction feed intentionally does not expose entry IDs or reconciliation state. The UI therefore needs a narrow companion read model rather than changing the stable transaction feed.
- Demo mode is browser-local and must not call authenticated Server Actions.

## Specification

### Core flow

1. Open an account register.
2. Enter statement date and statement balance without changing the account balance.
3. Start one open session for the account.
4. Mark eligible logical account legs pending or cleared.
5. Display statement balance, cleared balance and exact integer difference.
6. Complete only when the difference is exactly zero.
7. Display completed history from stored session snapshots.
8. Reopen only the latest completed session; only its owned legs return to cleared.

### UI and interaction

- Route: `/accounts/[accountId]/reconcile`.
- Account detail exposes a contextual `Đối soát` link.
- Archived and non-VND tracking accounts may show history but cannot start a new session.
- Reconciled rows are visibly locked; state is never conveyed by color alone.
- Transfer source and destination legs remain separate because the workspace is account-scoped.
- Split entries for one transaction/account render as one logical row and mutate atomically through one representative entry ID.
- Later transactions outside the statement date are excluded from the active clearing list.
- Missing server reconciliation schema disables the feature calmly instead of breaking account detail after an application-first deploy.

### Data contract

- Preserve `transaction_feed` unchanged.
- Add `account_reconciliation_entry_feed`, a security-invoker companion view grouped by `(user_id, transaction_id, account_id)` with one representative `entry_id`, state, timestamps, reconciliation ID and physical entry count.
- Load sessions from `account_reconciliation_summaries`.
- Validate all database payloads with Zod and reject unsafe integer money.
- Authenticated writes call only:
  - `start_account_reconciliation`;
  - `set_account_entry_reconciliation_state`;
  - `complete_account_reconciliation`;
  - `reopen_account_reconciliation`.

### Demo contract

- Use synthetic stable entry IDs derived from account and transaction IDs.
- Persist session/state data in versioned browser local storage.
- Apply the same exact-zero, statement-date, latest-reopen and reconciled-lock rules as authenticated mode.
- Never invent a discrepancy transaction or mutate account balance.

### Acceptance criteria

- [ ] Start validates account, date and integer statement balance.
- [ ] One open session per account is enforced visibly and by RPC.
- [ ] Pending/cleared changes update a whole logical account leg.
- [ ] Live summary includes opening balance plus reconciled and eligible cleared legs exactly once.
- [ ] Complete is blocked until difference is zero.
- [ ] Completed history remains stable after later activity.
- [ ] Latest-only reopen restores only session-owned legs.
- [ ] Review status remains independent and financial rewrites remain protected.
- [ ] Cross-tenant IDs cannot be observed or mutated.
- [ ] Demo and authenticated user-visible behavior are equivalent.
- [ ] Desktop, phone, keyboard and screen-reader-oriented checks pass.
- [ ] Missing production schema degrades safely.
- [ ] No production migration or production-data write occurs.

## Implementation plan

1. Add pure reconciliation types, merge/calculation helpers and demo reducer tests.
2. Add companion entry-state view and pgTAP ownership/grouping coverage.
3. Add viewer-aware server loader with schema-skew fallback.
4. Add validated Server Actions and canonical post-mutation reload.
5. Add account reconciliation route and responsive client workspace.
6. Link account detail to the new workspace.
7. Add focused desktop/mobile Playwright coverage.
8. Run independent evaluation and exact-head Class 3 gates.
9. Add bounded PR memory and update current project memory only with truthful candidate status.

## Risks and defenses

| Risk | Defense |
|---|---|
| Application deploys before reconciliation DDL | detect missing view/RPC and render feature unavailable without false data |
| split expense produces several entry rows | companion view groups one logical account leg and exposes one representative entry ID |
| transfer legs are accidentally coupled | account-scoped feed and RPC preserve independent account IDs |
| local demo diverges from database rules | pure reducer mirrors exact-zero, eligibility and reopen constraints with unit tests |
| historical summary recalculates | completed UI reads stored summary columns only |
| stale mutation response misleads user | authenticated actions return a canonical post-RPC state snapshot |
| non-VND input rounds incorrectly | first UI slice starts sessions only for VND accounts; other currencies remain view-only |
| reconciled row appears editable | locked control plus server RPC rejection |

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | close superseded PR #222 and completed issue #260 | done |
| T2 | issue #262, branch and packet | done |
| T3 | domain helpers and demo reducer | implementing |
| T4 | companion read model and pgTAP | pending |
| T5 | server loader and actions | pending |
| T6 | route, component and responsive CSS | pending |
| T7 | unit/browser evidence | pending |
| T8 | independent review and exact-head gates | pending |
| T9 | owner merge decision | blocked on owner |
| T10 | production migration and smoke | separately blocked on owner |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | owner | implementer | implementing | explicit `làm đi`, issue #262, branch from `2d8550f` | no UI/read model yet | implement focused branch and draft PR |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, repository tests and CI.

Forbidden without a separate owner command: merge, direct `main` writes, production migration, production data mutation, provider/config changes and release claims.

## Delivery record

- Branch: `feat/account-reconciliation-workspace`
- Issue: #262
- Baseline: `2d8550f739f179fcd42a8fb029c1091467b97847`
- Production DDL: not authorized
- Production data: not accessed or changed
