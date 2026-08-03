# Account reconciliation workspace

**Status:** implementing
**Execution state:** implementation_candidate
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #262 / #263
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns the user-facing reconciliation slice built on the domain contract merged through PR #261. It does not authorize production DDL, production-data writes or merge.

## Outcome

A MoneyFlow user can open one owned VND account, start a statement session, clear eligible account legs, see the exact live difference, complete only at zero, inspect stable completed history and reopen only the latest completed session.

## Repository reconnaissance

- Baseline: `main@2d8550f739f179fcd42a8fb029c1091467b97847`.
- Account register/detail exists at `/accounts/[accountId]` and derives signed account impact through `src/lib/account-register.ts`.
- Viewer-aware reads live in `src/server/**`; authenticated financial writes live in validated Server Actions and ownership-safe RPCs.
- PR #261 merged `pending` / `cleared` / `reconciled`, one open session per account, exact-zero completion, session-stable completed snapshots, latest-only reopen and review/reconciliation separation.
- The stable transaction feed intentionally does not expose entry IDs or reconciliation state. The UI uses a narrow companion read model instead of widening that contract.
- Demo mode is browser-local and never calls authenticated Server Actions.

## Research

External research is not required for this implementation slice. The governing evidence is the merged PR #261 schema/RPC contract, the current account register implementation, MoneyFlow's integer-money and transfer-neutrality invariants, and the repository's existing Server Action/demo/runtime patterns.

### Adoption review

Not applicable. No dependency, provider, framework, service or architecture layer is introduced.

## Specification

### Core flow

1. Open an account register.
2. Enter statement date and statement balance without changing account balance.
3. Start one open session for the account.
4. Mark eligible logical account legs pending or cleared.
5. Display statement balance, cleared balance and exact integer difference.
6. Complete only when difference is exactly zero.
7. Display completed history from stored session snapshots.
8. Reopen only the latest completed session; only its owned legs return to cleared.

### UI and interaction

- Route: `/accounts/[accountId]/reconcile`.
- Account detail exposes a contextual `Đối soát` link.
- Archived and non-VND tracking accounts may show history but cannot start a new session.
- Reconciled rows are visibly locked; state is never conveyed by color alone.
- Transfer source and destination legs remain separate because the workspace is account-scoped.
- Split entries for one transaction/account render as one logical row and mutate atomically through one representative entry ID.
- Transactions after the statement date are excluded from the active clearing list.
- Missing server reconciliation schema disables the feature calmly instead of breaking account detail after an application-first deploy.

### Data contract

- Preserve `transaction_feed` unchanged.
- Add `account_reconciliation_entry_feed`, a security-invoker companion view grouped by `(user_id, transaction_id, account_id)` with one representative `entry_id`, state, timestamps, reconciliation ID and physical entry count.
- Load sessions from `account_reconciliation_summaries`.
- Validate all database payloads with Zod and reject unsafe integer money.
- Authenticated writes call only the four RPCs merged in PR #261.

### Demo contract

- Use synthetic stable entry IDs derived from account and transaction IDs.
- Persist session/state data in versioned browser local storage.
- Apply the same exact-zero, statement-date, latest-reopen and reconciled-lock rules as authenticated mode.
- Never invent a discrepancy transaction or mutate account balance.

### Acceptance criteria

- [x] Start validates account, date and integer statement balance in the client/domain layer; RPC remains authoritative for authenticated users.
- [x] One open session per account is enforced in demo and by RPC.
- [x] Pending/cleared changes update a whole logical account leg.
- [x] Live summary includes opening balance plus reconciled and eligible cleared legs exactly once.
- [x] Complete is blocked until difference is zero.
- [x] Completed history uses stored session values.
- [x] Latest-only reopen restores only session-owned legs.
- [x] Review status remains independent and financial rewrites remain protected by the merged database contract.
- [x] Companion read model is security-invoker and account scoped.
- [x] Demo and authenticated code paths expose equivalent visible operations.
- [ ] Desktop, phone, keyboard and screen-reader-oriented checks pass on exact head.
- [x] Missing production schema degrades safely.
- [x] No production migration or production-data write occurred.

## Implementation plan

1. Add pure reconciliation types, calculation helpers and demo reducer tests.
2. Add companion entry-state view and pgTAP ownership/grouping coverage.
3. Add viewer-aware server loader with schema-skew fallback.
4. Add validated Server Actions and canonical post-mutation reload.
5. Add account reconciliation route and responsive client workspace.
6. Link account detail to the new workspace.
7. Add focused desktop/mobile Playwright coverage.
8. Run independent evaluation and exact-head Class 3 gates.
9. Update bounded PR memory and current project memory truth only when required by status impact.

## Evaluation

### Findings before exact-head verification

1. The companion view groups split rows by logical account leg and retains account-scoped transfer independence.
2. The authenticated mutation path uses only the four existing ownership-safe reconciliation RPCs and requires a canonical reload after success.
3. The application-first deployment boundary is explicit: missing read model/RPCs disable the workspace rather than showing fabricated data.
4. Demo behavior is isolated to versioned local storage and does not call authenticated Server Actions.
5. Exact-head verify, browser, type/build and full database gates remain the authority for candidate acceptance.

### Current evidence

- CI #1317 database job: fresh local reset and all pgTAP suites passed on candidate head `576aed261c90b8253b52cae5e01e8138c66551b1`.
- CI #1317 verify stopped at the project knowledge contract before install/typecheck/tests/build; no later application gate is claimed from that run.
- CodeQL #457 and secret-history scan #457 passed on the same candidate head.

## Risks and defenses

| Risk | Defense |
|---|---|
| Application deploys before reconciliation DDL | detect missing view/RPC and render feature unavailable without false data |
| split expense produces several entry rows | companion view groups one logical account leg and exposes one representative entry ID |
| transfer legs are accidentally coupled | account-scoped feed and RPC preserve independent account IDs |
| local demo diverges from database rules | pure reducer mirrors exact-zero, eligibility and reopen constraints with unit tests |
| historical summary recalculates | completed UI reads stored summary columns only |
| stale mutation response misleads user | authenticated actions require a canonical post-RPC reload |
| non-VND input rounds incorrectly | first UI slice starts sessions only for VND accounts |
| reconciled row appears editable | locked control plus server RPC rejection |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | close superseded PR #222 and completed issue #260 | lifecycle metadata | done |
| T2 | issue #262, branch, packet and PR #263 | `d43d33b` | done |
| T3 | domain helpers and demo reducer | `src/lib/reconciliation*` | candidate |
| T4 | companion read model and pgTAP | migration + database test | database gate passed |
| T5 | server loader and actions | server/action files | candidate |
| T6 | route, component, responsive CSS and account-detail link | application files | candidate |
| T7 | unit/browser evidence | permanent tests authored | pending execution after knowledge fix |
| T8 | independent review and exact-head gates | CI/CodeQL/secret scan | in progress |
| T9 | owner merge decision | separate command | blocked on owner |
| T10 | production migration and smoke | separate command | blocked on owner |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | owner | implementer | implementing | explicit `làm đi`, issue #262, branch from `2d8550f` | no UI/read model yet | implement focused branch and PR |
| 2026-08-03 | implementer | evaluator | candidate | domain, read model, loader/actions, route/UI and tests authored | exact-head application verification incomplete | fix findings and rerun Class 3 gates |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, repository tests and CI.

Forbidden without a separate owner command: merge, direct `main` writes, production migration, production data mutation, provider/config changes and release claims.

## Delivery record

- Branch: `feat/account-reconciliation-workspace`
- Issue: #262
- PR: #263
- Baseline: `2d8550f739f179fcd42a8fb029c1091467b97847`
- Production DDL: not authorized
- Production data: not accessed or changed
