# MF CORE-01 — One Transfer Mutation Owner

**Status:** implementing  
**Owner:** MoneyFlow  
**Issue/PR:** #152 / pending  
**Last updated:** 2026-07-30

## Outcome

Give account and ledger surfaces one client-side owner for transfer validation, demo persistence and authenticated mutation execution, while preserving their separate UI-state responsibilities.

## Repository reconnaissance

### Current behavior

- `useTransactions.addTransfer()` validates account identity, constructs demo transfer rows, writes local storage or calls `createTransferAction`.
- `AccountsPage.transfer()` independently performs the same branching and construction.
- The implementations have already drifted: AccountsPage blocks cross-currency transfers before submit, while the ledger hook did not.
- PostgreSQL/RPC remains the authenticated financial authority and already rejects currency mismatch.

### Relevant files

| Area | Responsibility | Decision |
|---|---|---|
| `src/hooks/use-transactions.ts` | ledger state reconciliation | keep; delegate mutation |
| `src/components/accounts-page.tsx` | account balances and notices | keep; delegate mutation |
| `src/hooks/transfer-mutation.ts` | shared client transfer execution | add |
| `src/lib/transfer-mutation.ts` | pure validation and demo row construction | add |
| `src/app/actions/transactions.ts` | authenticated Server Action/RPC | keep unchanged |
| `src/lib/transfers.ts` | pure account-balance application | keep unchanged |

### Existing constraints

- Integer money only.
- Source and destination must differ, be active and share currency.
- Transfer remains neutral to total assets and period income/expense.
- Authenticated writes continue through Server Action, viewer validation, RPC and RLS.
- Demo storage must not become an authenticated fallback.

## Research

### Question

Should the duplicate implementations be replaced by a generic repository/service layer, a full transaction hook reuse, or a transfer-specific executor?

### Evidence

- MF ARCH-01 found a real duplicated authority but rejected forcing AccountsPage to adopt all ledger state.
- Existing MoneyFlow fixes favor the smallest owner extraction that removes a demonstrated failure mode.
- The independent UI reactions are valid: AccountsPage updates account balances; useTransactions updates the ledger list.

### Decision

Use one bounded transfer executor plus a pure preparation contract. Do not add a generic mutation framework, repository class or transaction-domain rewrite.

## Specification

### Problem

Two client owners can diverge in validation, error handling, demo construction and authenticated result handling. Cross-currency behavior has already diverged.

### Acceptance criteria

- [x] Both account and ledger surfaces call one transfer executor.
- [x] Same-account, inactive/missing-account and cross-currency validation are shared.
- [x] Demo transaction construction is shared and deterministic for supplied identifiers/timestamps.
- [x] Account balances remain owned by AccountsPage.
- [x] Ledger reconciliation remains owned by useTransactions.
- [ ] Unit, type, build, database and browser gates pass.

### Financial and security constraints

- Transfer must remain one transaction with source/destination identity.
- Transfer must not affect income/expense totals.
- No schema, RPC, grant, RLS or production-data change.
- No sensitive owner evidence in repository files.

### Out of scope

- #145 dialog layout.
- Spending-advice cleanup.
- Full `sample-data.ts` authority split.
- Update-transfer refactor.
- Component splitting or visual redesign.

## Implementation plan

### Changes

1. Add pure transfer input/account resolution and demo row builder.
2. Add one client executor for demo storage or authenticated Server Action.
3. Replace both direct implementations with executor calls.
4. Add unit and source-contract tests.
5. Run full CI; change database/RPC only if a real invariant fails.

### Risks and counterexamples

| Risk | Mitigation |
|---|---|
| generic abstraction grows beyond one use case | transfer-specific API only |
| account balance applies twice in demo retry | executor reports whether the idempotency-key row is new |
| client validation diverges from RPC | RPC remains final authority; shared client rules cover observable account/currency constraints |
| storage failure rejects without calm result | executor must normalize persistence/network failures |

### Verification plan

- Unit: preparation, invalid combinations, demo row and transfer neutrality.
- Static: both surfaces delegate; only the executor imports `createTransferAction`.
- Existing suite: architecture, lint, typecheck, unit/static RLS and production build.
- Database: fresh reset and pgTAP.
- Browser: expense smoke and cross-device audit, including existing transfer coverage.

## Tasks

| ID | Task | Status |
|---|---|---|
| C1 | Confirm duplicate behavior and drift | done |
| C2 | Add pure preparation contract | done |
| C3 | Add shared client executor | done |
| C4 | Migrate both callers | done |
| C5 | Add tests and review error paths | doing |
| C6 | Open PR and run final CI | todo |

## Evaluation

### Current findings

- Correctness: cross-currency client drift is removed by one preparation contract.
- Security: authenticated authority remains unchanged.
- Maintainability: two mutation implementations become one without coupling AccountsPage to ledger state.
- UI/UX: no layout or copy redesign; existing success notices remain route-owned.

### Remaining limitations

- Update-transfer still has its own demo construction and is deliberately out of scope.
- Authenticated idempotent replay is enforced by RPC; UI double-submit protection remains the dialog/form responsibility.

## Delivery record

- Branch: `agent/mf-core-01-transfer-owner`
- PR: pending
- Final CI: pending
- Merge commit: pending
- Production deployment: pending only if runtime changes merge
- Work packet destination: `docs/plans/completed/2026-07-30-mf-core-01.md`
