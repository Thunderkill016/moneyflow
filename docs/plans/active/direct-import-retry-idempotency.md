# Make direct CSV import retry-safe

**Status:** implementing  
**Owner:** Codex  
**Issue/PR:** Issue #53, import provenance/reconciliation sequence B  
**Last updated:** 2026-07-29

## Outcome

A direct CSV import keeps one idempotency key for each unchanged row until that
row is confirmed. If a database write committed but the response was lost, the
user can retry the failed row without creating a second financial transaction.
Partial failures remain retryable on the same screen.

## Repository reconnaissance

### Current behavior

- `DirectCsvImportPage.runImport` rebuilds every post with a new
  `crypto.randomUUID()` on every attempt.
- The financial RPCs correctly make one idempotency key unique per user, but a
  retry with a different key is a different financial request.
- A server action can return an error after the RPC committed when reading
  `transaction_feed` fails.
- Partial success sets the page to `done`, removes the commit button, and only
  reports a count. The failed rows cannot be retried in place.
- Client planning deduplicates against the loaded ledger and within the file,
  but it cannot prove whether an uncertain server response committed.

### Relevant areas

| Area | Role | Change |
|---|---|---|
| `src/lib/inbox/direct-csv-import.ts` | Pure plan/post builder | Give rows stable semantic identities and reuse keys |
| `src/components/inbox/direct-csv-import-page.tsx` | Import orchestration | Retain unresolved posts and expose partial retry |
| `src/app/actions/transactions.ts` | Existing idempotent financial boundary | Reuse unchanged |
| `src/lib/inbox/direct-csv-import.test.ts` | Domain/source contracts | Lock retry and reset behavior |

### Decision

Retain unresolved post payloads in a component ref. A row identity covers its
row number, transaction kind, account, category, amount, date, note, and
fingerprint. An unchanged retry reuses the original UUID; changing financial
meaning creates a new UUID. Confirmed rows are removed from the unresolved set.

This slice intentionally does not pretend that client retry state is a
server-side dry-run or durable import receipt. Page-reload recovery and
cross-device concurrency belong to the later server-side import-plan slice.

## Research

### Questions

1. Does the existing financial boundary already make repeated requests safe
   when the idempotency key is unchanged?
2. Can a fuzzy import fingerprint safely become a permanent uniqueness key?
3. What is the smallest correction that preserves the wider PR B sequence?

### Sources and findings

| Source | Date accessed | Finding |
|---|---|---|
| [Issue #53](https://github.com/Thunderkill016/moneyflow/issues/53) | 2026-07-29 | Financial writes already use idempotency keys; fuzzy fingerprints must not be globally unique; durable server-side dry-run remains a separate PR B deliverable |
| `create_money_transaction` migrations and finance pgTAP | 2026-07-29 | Reusing one user/idempotency key returns the original transaction |
| `createTransactionAction` | 2026-07-29 | A committed RPC can still return an application error if the subsequent feed read fails |
| Direct import component/domain source | 2026-07-29 | Every retry currently generates new keys and partial success closes the action |

No additional external API or framework behavior is introduced. The selected
change reuses the repository's tested idempotency contract and deliberately
keeps fuzzy fingerprinting advisory.

## Specification

### Acceptance criteria

- [ ] Retrying an unchanged failed row reuses its original idempotency key.
- [ ] Changing account/category/kind/amount/date/note produces a new key.
- [ ] Confirmed rows are removed from the unresolved retry set.
- [ ] Partial failures keep the page actionable and retry only rows still ready.
- [ ] Full success closes the attempt and preserves existing summary behavior.
- [ ] Existing dedupe, transfer skipping, integer money, and mapping behavior
      remain green.
- [ ] No schema, UI redesign, production mutation, push, or deployment.

### Required states

- Loading/importing: existing progress remains.
- Partial: show confirmed/failed counts and a retry action.
- Success: show final summary and transaction link.
- Error: calm Vietnamese message without raw financial payloads.
- Mapping changes: changed row semantics receive a new request key.

## Implementation plan

1. Add failing unit/source contracts for stable retry identity and partial state.
2. Extend the pure post builder to reuse a prior unresolved post only when its
   financial identity is unchanged.
3. Retain/remove unresolved posts in the page orchestration.
4. Keep partial failures in a retryable phase.
5. Run focused tests, full unit, lint, typecheck, static gates, E2E, and build.

## Risks and counterexamples

| Risk | Control |
|---|---|
| Reuse a key after category/account edit | Semantic identity includes both |
| Repost rows already confirmed | Remove successful identities immediately |
| Fuzzy fingerprint treated as global uniqueness | Identity only scopes one in-memory attempt |
| Retry after full page reload | Explicitly deferred to durable server import receipts |
| Partial import presented as all-or-nothing | Summary distinguishes confirmed and failed |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Audit uncertain commit and partial flow | Source trace | done |
| T2 | Add red retry contracts | Focused test failure | in progress |
| T3 | Implement stable unresolved posts | Focused tests | todo |
| T4 | Run broad gates and audit | Evaluation | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Pending implementation | | pending |

### Remaining limitations

- Retry identity is retained for the mounted import attempt only. Durable
  recovery after a page/browser restart needs a server-side import receipt.
- Client fingerprint planning remains advisory; the broader Issue #53
  server-side dry-run/reconciliation slice is still open.

## Delivery record

- Branch: `fix/direct-import-retry-idempotency`
- PR:
- Commit:
- CI run:
- Production deployment:
