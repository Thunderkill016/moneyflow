# Make Inbox approval atomic

**Status:** implemented; database runtime verification pending  
**Owner:** Codex  
**Issue/PR:** Issue #53, import provenance/reconciliation sequence B  
**Last updated:** 2026-07-29

## Outcome

Approving an Inbox candidate creates exactly one ledger transaction and marks
the candidate approved with a durable transaction link in the same database
transaction. A failed approval leaves both the ledger and candidate unchanged,
and retrying an uncertain successful request returns the original result
instead of creating another transaction.

## Repository reconnaissance

### Current behavior

- `InboxPage.postOne` first calls `addTransaction` or `addTransfer`, then calls a
  separate candidate update.
- The UI explicitly reports “Đã ghi sổ nhưng chưa cập nhật được trạng thái
  Inbox” when the second operation fails.
- Authenticated transaction creation already uses hardened, tenant-scoped
  `create_money_transaction` and `create_account_transfer` RPCs.
- `inbox_candidates` has no financial transaction reference.
- Candidate approval updates do not become idempotent until both independent
  network operations have returned.
- The live MoneyFlow database is healthy on PostgreSQL 17.6, but its migration
  history currently stops before the local parse-lineage migration.
- Existing Inbox composite foreign keys use `ON DELETE SET NULL` without a
  target column list. PostgreSQL therefore attempts to null `user_id` as well
  as the optional reference, conflicting with `user_id NOT NULL`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/inbox/inbox-page.tsx` | Owns single and bulk approval orchestration | Replace two-step authenticated flow |
| `src/app/actions/inbox.ts` | Authenticated candidate actions | Add one validated approval action |
| `src/hooks/use-transactions.ts` | Maintains the live client ledger | Merge an atomically-created transaction |
| `src/lib/inbox/candidate-store.ts` | Candidate domain/local persistence | Add immutable transaction linkage |
| `src/lib/inbox/inbox-map.ts` | Candidate row mapping | Round-trip linkage |
| Existing money/transfer RPCs | Enforce account, category, currency, amount, and ledger laws | Call inside the approval RPC |
| `supabase/tests/database` | Permanent database behavior | Add atomicity/idempotency/tenant tests |

### Existing tests and constraints

- Related unit tests: Inbox review, candidate store, Inbox map, transaction
  hooks/source contracts.
- Database/RLS tests: finance invariants, tenant isolation, browser privileges,
  schema/RLS, and migration-source checks.
- Browser tests: the desktop/mobile financial path and Inbox shell regression.
- Product/architecture rules: integer minor units, transfers never count as
  income/expense, no guessed values, low-confidence bulk opt-in remains.

### Similar implementation and recent history

- Existing pattern to reuse: security-definer financial RPCs with
  `auth.uid()`, empty `search_path`, fully qualified relations, explicit
  execute revocation, and authenticated-only grants.
- Previous slice: commit `2394ba7` preserves import row lineage and batch
  parser/mapping versions.

### Open questions

- [x] Should the browser supply a transaction idempotency key? No. The locked
      candidate row is the idempotency anchor; the RPC generates a key only
      after confirming the candidate is still pending.
- [x] Should an already-approved candidate be mutable on retry? No. Return the
      existing linked transaction without applying new payload values.
- [x] Should a rejected or legacy approved-but-unlinked candidate create a
      transaction? No. Fail closed as already reviewed.

## Research

### Questions researched

1. What function security and privilege pattern does current Supabase guidance
   require?
2. How should a composite tenant foreign key clear only its optional reference?
3. Are there current Supabase breaking changes affecting this RPC?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) | 2026-07-29 | Prefer invoker; if definer is necessary, use empty `search_path`, fully qualified objects, and explicit execute grants | The existing ledger RPC boundary requires definer to write protected ledger tables |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | 2026-07-29 | RLS remains necessary; update also requires row visibility; definer functions bypass RLS and must enforce ownership | RPC must check `auth.uid()` and candidate ownership itself |
| [Supabase breaking-change changelog](https://supabase.com/changelog?types=breaking-change) | 2026-07-29 | No current breaking change alters PostgreSQL RPC semantics; PostgreSQL 17 is now relevant | Live project version was separately verified |
| [PostgreSQL 17 CREATE TABLE](https://www.postgresql.org/docs/17/sql-createtable.html) | 2026-07-29 | `SET NULL` clears all referencing columns unless a subset is named; `ON DELETE SET NULL (optional_id)` preserves tenant key | PostgreSQL extension, compatible with live PG17 |
| Live MoneyFlow catalog (read-only) | 2026-07-29 | Existing financial RPC grants are correct; Inbox FKs omit the required column subset; parse-lineage migration is not deployed | No production mutation performed |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep two server actions and retry candidate update | Small client diff | Cannot guarantee atomicity; duplicate ledger rows remain possible | Reject |
| Create ledger row first and compensate on server failure | Reuses actions | Compensation can also fail and is not one transaction | Reject |
| One approval RPC calling existing ledger RPCs | Atomic, reuses financial laws, row lock gives idempotency | Requires careful ownership and grants | Selected |
| Reimplement all ledger insert logic in approval RPC | Full control | Duplicates high-risk financial invariants | Reject |

### Research decision

Use one authenticated `SECURITY DEFINER` RPC because direct ledger writes are
intentionally revoked from the browser role. It locks the owned candidate,
returns the existing linked transaction on retry, calls the existing hardened
money/transfer RPC only for a pending candidate, and links/updates the candidate
before the surrounding PostgreSQL transaction can commit. The function uses an
empty search path, fully qualified names, explicit auth checks, and
authenticated-only execution.

Repair optional composite Inbox foreign keys with target-column `SET NULL`
actions so deleting a parent preserves the non-null tenant owner.

## Specification

### Problem

Authenticated users can successfully create a financial transaction while the
Inbox update fails. The same candidate then remains pending and can be approved
again, creating duplicate ledger activity with no durable audit link.

### User stories

- As a person approving an Inbox item, I either get one completed approval or
  no financial mutation at all.
- As a person retrying after a network uncertainty, I get the original
  transaction instead of a duplicate.
- As a person reviewing history, I can identify the transaction created by a
  candidate.
- As a tenant, I cannot approve or link another tenant's candidate, account,
  category, or transaction.

### Acceptance criteria

- [x] One authenticated RPC atomically approves income, expense, and transfer
      candidates.
- [ ] A successful approval creates exactly one transaction with correct ledger
      entries, updates reviewed candidate fields, and stores one durable link.
- [ ] Retrying an approved linked candidate returns the original transaction
      and never creates extra entries.
- [ ] Invalid account/category/currency/amount/date/note, rejected candidates,
      and cross-tenant candidate IDs leave candidate and ledger unchanged.
- [x] The RPC is executable only by `authenticated`, enforces `auth.uid()`,
      locks the candidate row, and has an empty search path.
- [x] Single, bulk, and keyboard approval use the same atomic authenticated
      primitive.
- [x] Demo approval stores the transaction link and compensates a failed
      candidate write by removing the just-created transaction.
- [x] New transactions immediately participate in duplicate detection without
      a page reload.
- [ ] Deleting an import batch clears only `import_batch_id`; deleting optional
      account/category parents preserves candidate ownership.
- [x] Existing money, transfer, low-confidence, and static RLS invariants remain
      green.

### Required states

- Loading: existing busy states remain.
- Empty: unchanged.
- Populated: approved rows leave the pending list and ledger state updates.
- Validation/error: calm Vietnamese errors; no raw SQL or financial snippets.
- Recovery/undo: retry is idempotent; demo performs local compensation on a
  failed second write.
- Long data / large VND: safe integer maximum remains enforced.
- Mobile/tablet/desktop: no visual redesign; shared handlers cover all layouts.
- Accessibility: existing keyboard approval uses the same mutation contract.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Candidate ownership, account/category ownership, and financial transaction
  ownership must all equal `auth.uid()`.
- `anon` and `PUBLIC` receive no function execution.
- The linked transaction remains visible only through existing own-row RLS and
  security-invoker views.

### Out of scope

- External source IDs and provider namespaces.
- Fuzzy fingerprint persistence or uniqueness.
- Split-expense approval from one candidate.
- UI, brand, or visual redesign.
- Applying migrations to production or deploying the application.

## Implementation plan

### Architecture fit

PostgreSQL owns the atomic business transaction. The server action owns input
validation and safe result mapping. The Inbox component chooses demo versus
authenticated orchestration, while the transaction hook only merges or removes
already-decided ledger state.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| Supabase migration | Add linkage, repair composite FKs, add approval RPC/grants | Durable atomic invariant |
| Database pgTAP | Exercise success, rollback, retry, transfer, and tenant isolation | Prove real behavior |
| Candidate domain/mappers | Add immutable `financialTransactionId` | Local/server parity |
| Inbox server action | Validate RPC payload and return candidate + transaction | One authenticated boundary |
| Inbox client orchestration | Use RPC when authenticated; compensate demo failures | Eliminate split-brain approval |
| Transaction hook | Merge atomic result and support demo rollback | Immediate live ledger |

### Data and migration impact

- Schema/migration: nullable `financial_transaction_id` with tenant composite
  FK and partial unique index; corrected optional-reference delete actions.
- Backfill: existing approved candidates remain unlinked because inferring a
  transaction would be guessed financial data.
- Compatibility: pending/rejected candidates and local demo records remain
  readable; linkage is optional.
- Rollback: application can ignore the new column/function, but dropping
  populated links is destructive and is not automated.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Two concurrent approval calls create two rows | Candidate `FOR UPDATE` lock plus status/link retry branch |
| RPC links another tenant's candidate | Owned-row lock/query and tenant composite FK |
| Existing ledger law is duplicated incorrectly | Call hardened money/transfer RPCs |
| Ledger succeeds but candidate update fails | Same PostgreSQL transaction rolls back both |
| Retry payload differs | Approved linked row returns original without mutation |
| Parent deletion nulls tenant key | Column-targeted `SET NULL (reference_id)` |
| Demo localStorage second write fails | Delete just-created transaction and report failure |

### Verification plan

- Static: lint, typecheck, architecture, knowledge, CSS ownership, static RLS,
  migration source checks, build.
- Unit/domain: candidate validation/link mapping, review mutation, client source
  contracts, server action mapping where pure.
- Database: fresh replay and dedicated pgTAP atomicity tests when a runner is
  available; read-only live catalog inspection for drift.
- Browser flow: existing desktop/mobile suite plus Inbox approval regression if
  fixture support permits.
- Responsive/visual: not applicable.
- Production/manual: no production mutation or deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Audit approval split and live schema | None | Source and catalog evidence | done |
| T2 | Lock atomicity/security behavior with tests | T1 | Red unit/pgTAP contracts | done |
| T3 | Generate and implement migration/RPC | T2 | Migration review/static tests | implemented |
| T4 | Integrate action, domain, and client flow | T3 | Focused unit/typecheck | done |
| T5 | Run broad verification and criterion audit | T4 | Evaluation table | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| One atomic authenticated boundary | Migration source contract and server action integration | pass |
| Candidate-to-transaction domain link | Candidate validation, mapping, serialization, and immutability tests | pass |
| Demo approval and compensation | Source contract plus desktop/mobile Inbox E2E | pass |
| Immediate duplicate detection | Inbox consumes live transaction-hook state | pass |
| RPC grants, ownership, lock, search path | Migration/static RLS contracts and read-only live pattern audit | pass |
| Success, retry, rollback, transfer ledger laws | Dedicated 58-assertion pgTAP test | runtime pending |
| Targeted optional-parent delete actions | Migration/static source contract and pgTAP assertions | runtime pending |
| Unit/domain suite | 584 passed | pass |
| Browser regression suite | 10 desktop/mobile tests passed | pass |
| Static/build gates | lint, typecheck, knowledge, architecture, CSS ownership, static RLS, 43-route build | pass |

### Review findings

- Correctness: authenticated approval now has one database transaction and a
  row-locked idempotency anchor; demo compensates its unavoidable local
  two-write path. Real database execution remains pending.
- Security/ownership: the definer RPC checks `auth.uid()`, locks only the owned
  candidate, delegates account/category/currency laws to existing hardened
  RPCs, and is not granted to `anon` or `PUBLIC`.
- UI/UX/accessibility: no redesign; single, bulk, and keyboard paths converge on
  the same mutation handler.
- Maintainability/duplication: ledger insert laws are reused rather than copied;
  candidate linkage is mapped once at the domain boundary.
- Scope compliance: no production mutation, deployment, provider identifiers,
  fuzzy matching, or visual redesign.

### Remaining limitations

- Local Docker is unavailable, so database runtime tests require another
  compatible runner or CI before database-dependent criteria can pass.
- The connected live project is intentionally read-only for this task and does
  not yet include local migrations after `20260726011134`.

## Delivery record

- Branch: `feat/atomic-inbox-approval`
- PR:
- Squash commit:
- CI run:
- Production deployment:
- Production flow verified:
- Work packet moved to `docs/plans/completed/`:
