# MoneyFlow Trust P2 — Recover (complete versioned archive and restore)

**Status:** specifying
**Execution state:** specifying
**Active role:** planner
**Permission scope:** branch_write (documentation/specification only in this packet)
**Owner:** agent (planner) → human_owner (contract acceptance)
**Issue/PR:** parent #323; P2 contract PR pending
**Last updated:** 2026-08-11

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence
and next allowed actions, not percentage complete. This packet is Class 3: it
governs tenant financial data and a restore path that mutates a real ledger.

## Outcome

Give a MoneyFlow user a **complete, versioned, self-describing archive** of their
own tenant state, and a restore that either reconstructs that state faithfully or
fails without touching the ledger. P2 is accepted when export → validate →
restore round-trips with financial invariants intact and every rejection path
fails closed before mutation.

`main` at packet creation: `a6aaa7d832f518e9ce7d2eafbfa4b64ec2728f8f`.

## Repository reconnaissance

### Current behavior

There is **no archive and no restore.** What exists is a range-filtered report
export, and it is not a backup:

- `src/lib/export-data.ts` (292 lines) produces `ExportBundle = { exportedAt, range, transactions, candidates }`.
- `buildExportBundle` applies `filterByOccurredOnRange` to both collections, so
  anything outside the selected dates is **dropped by design**.
- Coverage is **2 of 19 tenant tables**. `accounts` and `categories` — the
  entities every transaction entry references — are not exported at all.
- Kinds are `transactions | candidates | all`, where `all` means "both of those
  two", not "all tenant state".
- There is no importer, no version field, no integrity metadata, and no
  restore RPC anywhere in `src/` or `supabase/`.

Conclusion: the existing export is a **reporting artifact**. Treating it as a
backup would silently lose seventeen tables. This packet does not extend it; it
specifies a separate archive contract.

### The authoritative tenant inventory already exists

`public.purge_user_tenant_data` (`supabase/migrations/20260804160000_financial_mutation_audit.sql`)
deletes exactly nineteen tables for one `user_id` and then re-counts all nineteen
to assert the tenant is empty. That function is the closest thing the repository
has to a definition of "everything that belongs to a user", and it is already
security-reviewed and exercised by the deletion path.

**Therefore the archive inventory is anchored to it:** every table
`purge_user_tenant_data` deletes must be either included in the archive or
excluded with a written reason. Any future drift becomes a test failure rather
than a silent gap. This is the single most valuable reconnaissance finding in
this packet — it converts "complete inventory" from a judgement call into a
checkable invariant.

### Restore ordering is derivable, not invented

The purge deletes children before parents. The reverse of that sequence is a
valid topological insert order.

**Correction of method.** The first version of this table was built by reading
foreign keys out of `CREATE TABLE` bodies only, which missed constraints added
later by `ALTER TABLE`. Review caught two of them. The graph below was rebuilt by
extracting `ALTER TABLE` constraint blocks as well, which surfaced exactly two
additional edges — `inbox_candidates.approved_transaction_id →
financial_transactions(id, user_id)` and
`transaction_entries.(reconciliation_id, user_id, account_id) →
account_reconciliations(id, user_id, account_id)` — plus one self-reference
treated separately below. Both additional edges are already satisfied by the
existing order, so the order did not change; the dependency column did.

| # | Table | Depends on |
|---|---|---|
| 1 | `profiles` | `auth.users` |
| 2 | `categories` | — |
| 3 | `accounts` | — |
| 4 | `import_batches` | — |
| 5 | `savings_goals` | — |
| 6 | `recurring_income_templates` | accounts, categories |
| 7 | `recurring_commitments` | accounts, categories |
| 8 | `monthly_budgets` | categories |
| 9 | `inbox_rules` | categories |
| 10 | `account_reconciliations` | accounts |
| 11 | `financial_transactions` | — |
| 12 | `inbox_candidates` | import_batches, accounts, categories, financial_transactions (`approved_transaction_id`), **itself** (`transfer_pair_id`) |
| 13 | `savings_goal_allocations` | savings_goals |
| 14 | `income_template_occurrences` | templates, transactions |
| 15 | `commitment_occurrences` | commitments, transactions |
| 16 | `transaction_import_provenance` | transactions, candidates, batches |
| 17 | `transaction_entries` | transactions, accounts, categories, account_reconciliations (`reconciliation_id`) |
| 18 | `account_reconciliation_events` | account_reconciliations |
| 19 | `financial_mutation_audit_events` | — |

Ordering is **mandatory**, not an optimisation: no foreign key in the schema is
declared `DEFERRABLE`, so every FK is checked immediately on insert.

**The self-reference needs a two-phase insert.** `inbox_candidates.transfer_pair_id`
references `inbox_candidates (id, user_id)`, so no table ordering can satisfy it:
two candidates in the same table can point at each other. Because the column is
nullable and the constraint is `on delete set null`, restore inserts every
candidate with `transfer_pair_id = NULL` in phase one, then applies the pair
links in a single `UPDATE` in phase two, inside the same transaction. Validation
must confirm each `transfer_pair_id` resolves to a candidate **present in the
same archive** before either phase runs; a dangling pair link is a rejection, not
a silently nulled field.

### Tenant isolation is mostly structural — with one exception

Almost every tenant foreign key is **composite `(id, user_id)`**, for example
`transaction_entries → financial_transactions(id, user_id)` and
`monthly_budgets → categories(id, user_id)`. The database therefore makes a
cross-tenant link *structurally impossible*, which is a very strong property for
a restore: even a buggy importer cannot attach one user's transaction to another
user's account.

The exception is `inbox_rules.category_id uuid not null references public.categories(id)`
— a **single-column** FK. Isolation there comes from the
`inbox_rules_validate_category` BEFORE trigger, which requires
`categories.user_id = new.user_id` **and `is_archived = false`**.

That second condition is a concrete restore hazard: an archive containing an
enabled rule pointing at a category that was archived before export will be
rejected at insert with `rule_category_not_available`. Restore must handle this
explicitly rather than discovering it as a runtime failure.

### Invariants live in RPCs, not in constraints

There is **no database constraint forcing a transfer's entries to sum to zero.**
Transfer balance, split exactness and income/expense neutrality are enforced by
the `SECURITY DEFINER` write RPCs (`create_money_transaction`,
`create_account_transfer`, `create_split_expense`, `update_account_transfer`, …).
`transaction_entries` only guarantees `amount_minor <> 0`.

This is the decisive architectural fact for P2: **a restore that bulk-inserts
rows bypasses every financial invariant the application relies on.** The contract
below therefore requires the restore to re-assert those invariants itself, in the
database, in the same transaction — it cannot inherit them.

One invariant *is* deferred to commit: the constraint trigger
`transaction_entries_reconciliation_account_leg_consistent` is
`deferrable initially deferred`, so reconciliation-leg consistency is checked at
`COMMIT`. Restore may insert entries in any intra-transaction order, but a
violation surfaces at commit time and rolls the whole restore back.

### Existing tests and constraints

- `src/lib/export-data.test.ts` covers the reporting export only.
- pgTAP suites under `supabase/tests/` cover RLS and tenant isolation; they are
  the right home for restore ownership and atomicity proof.
- Money is `amount_minor bigint`. VND is integer đồng; floating-point money is
  forbidden by `AGENTS.md`.
- Soft delete: `financial_transactions.deleted_at`. Archived state exists on
  accounts, categories, goals, commitments and templates. Restore must preserve
  soft-deleted and archived rows, or the ledger's history changes.
- `financial_transactions` has `unique (user_id, idempotency_key)` — a ready-made
  idempotency handle for restore.

### Open questions

1. Does restore target the **current** authenticated tenant only, or may an
   archive be restored into a different account the owner also controls?
2. Is restore permitted into a **non-empty** ledger, or only an empty one?
3. Must `financial_mutation_audit_events` be restorable, or is it append-only
   history that a restore should re-derive rather than replay?

These are owner decisions and are recorded as blocking the contract, not guessed.

## Research

### Research scope and source selection

Repository and schema truth were mapped first; research was limited to the two
questions repository code could not answer: what transaction boundary a Supabase
RPC actually gives, and how plpgsql exception handling interacts with all-or-
nothing semantics. Two primary sources.

### Sources

| Source | Establishes | Does not apply | Mapping to MoneyFlow |
|---|---|---|---|
| [PostgreSQL 18 — PL/pgSQL Transaction Management](https://www.postgresql.org/docs/current/plpgsql-transactions.html) | A block with an `EXCEPTION` clause forms a **subtransaction**; transactions cannot be ended inside such a block. `COMMIT`/`ROLLBACK` are available in *procedures* and `DO` blocks, not in functions. | Procedure-level transaction control — restore is a function called through PostgREST and must not end its caller's transaction. | Restore is a `FUNCTION`: atomicity is free. Per-row `BEGIN … EXCEPTION` blocks are **forbidden** in the restore body, because they would commit a subtransaction and leave a half-restored ledger — exactly the ambiguous state P2 must prevent. |
| [PostgREST — Transactions](https://docs.postgrest.org/en/v13/references/transactions.html) | Each HTTP request runs in **one** transaction; any database failure or `RAISE` rolls it back; otherwise it commits. Default isolation is `READ COMMITTED`. | Per-role isolation customisation is not needed. | Restore **must be a single RPC call**. A client-side loop of nineteen inserts is nineteen transactions and cannot be atomic. `RAISE` is the correct rejection mechanism. `READ COMMITTED` means two concurrent restores can interleave, so idempotency needs a real guard, not a read-then-write check. |

### Alternatives considered

- **Client-side restore via supabase-js** — rejected: not atomic (one
  transaction per request), and it would bypass invariant re-assertion.
- **Restore by replaying the existing write RPCs** — attractive because
  invariants come for free, but rejected as the primary mechanism: the RPCs
  generate new ids and `created_at`, so provenance, reconciliation history and
  audit rows could not be reconstructed faithfully. Considered again for a
  future "import as new data" feature, which is not P2.
- **`pg_dump`/`pg_restore` per tenant** — rejected: needs privileges no user
  session has, and would carry other tenants' structures.
- **Adding an archive library** — rejected: nothing here needs a dependency.
  `AGENTS.md` forbids adding one because it exists.

### Research decision

Restore is **one `SECURITY DEFINER` plpgsql function**, taking the whole archive
as a single `jsonb` argument, validating everything before its first write, and
using `RAISE` for every rejection. No per-row exception handlers.

## Specification

### Problem

A MoneyFlow user cannot currently recover their ledger. If tenant data is lost,
the only artifact they hold is a date-filtered transaction report with no
accounts or categories, which cannot reconstruct a ledger.

### Acceptance criteria

- [ ] **P2-AC1** Archive envelope is versioned and self-describing:
      `archive_version`, `produced_at`, `app_schema_generation`, `tenant_row_counts`.
- [ ] **P2-AC2** Archive inventory covers every table `purge_user_tenant_data`
      deletes, or names the exclusion reason. A test fails if the two drift.
- [ ] **P2-AC3** Archive contains **no** secret: no password hash, JWT, access or
      refresh token, OAuth or CAPTCHA secret, service-role key, provider
      configuration or private infrastructure metadata. Asserted by a
      key/value scan over a populated archive, not by inspection.
- [ ] **P2-AC4** Integer money survives the round trip exactly: `amount_minor`
      is never parsed through a lossy float, and any value outside the
      IEEE-754 safe-integer range (±9007199254740991) is rejected rather than
      silently rounded. This matches an existing repository rule rather than
      inventing one: `create_money_transaction` already raises
      `amount_exceeds_safe_integer` at exactly that bound.
- [ ] **P2-AC5** Restore validates the **entire** archive before its first
      write. Unsupported version, missing referenced entity, malformed
      structure, non-integer money, unbalanced transfer, inexact split and
      foreign-tenant identifiers all fail with no row written.
- [ ] **P2-AC6** Restore is atomic: a failure at any point leaves the ledger
      exactly as it was. Proven by pgTAP, not asserted.
- [ ] **P2-AC7** Restore re-asserts financial invariants in the database:
      transfers balance to zero and stay neutral to income/expense, splits sum
      exactly to their parent, entries never have `amount_minor = 0`.
- [ ] **P2-AC7a** Restore validates **per-kind entry shape**, which the
      invariants above do not cover. An `expense` transaction whose entry is
      positive, or an `income` transaction whose entry is negative, passes
      transfer/split/non-zero checks and would still corrupt every balance and
      report. `create_money_transaction` writes
      `case when p_kind = 'income' then p_amount_minor else -p_amount_minor end`
      and rejects `category_kind_mismatch`, so restore must assert, per
      transaction kind: the expected entry **sign**, the expected entry
      **count**, and that each entry's `categories.kind` matches the
      transaction's `kind`. These rules exist only in the write RPCs and are
      lost the moment rows are inserted directly.
- [ ] **P2-AC7b** Archived categories are treated differently from live
      creation. `create_money_transaction` raises `category_archived`, but a
      faithful restore **must** accept a historical transaction whose category
      was archived after the fact. Restore therefore validates category
      ownership and kind but not archival state for historical rows, and the
      distinction is written down rather than inherited by accident.
- [ ] **P2-AC8** Tenant ownership is preserved: every restored row is owned by
      the authenticated caller. An archive naming another `user_id` is
      rejected; ownership isolation is proven under RLS.
- [ ] **P2-AC9** Duplicate restore of the same archive is defined and tested —
      no duplicated ledger, no partial second copy.
- [ ] **P2-AC10** Conflict policy for empty vs non-empty target is explicit,
      documented and tested. No silent merge.
- [ ] **P2-AC11** Soft-deleted and archived rows round-trip as soft-deleted and
      archived — restore does not resurrect deleted history.
- [ ] **P2-AC12** Archives from an unsupported future or retired version are
      rejected with an actionable Vietnamese message.
- [ ] **P2-AC13** `inbox_rules` whose category is archived are handled by a
      written rule, not by an unhandled `rule_category_not_available`.

- [ ] **P2-AC14** Every row a restore writes carries a `restore_batch_id`, and
      removing a committed bad restore by that batch is a defined, tested
      operation. A restore that commits malformed data must be identifiable and
      reversible; an unidentifiable restored row is an accepted-defect, not a
      completed feature.

P2 may be marked accepted only when P2-AC1–14 are evidenced or explicitly
recorded as owner-accepted limitations, without fabricating pass evidence.

### Required states

Export: idle → building → ready → download failed.
Restore: idle → file selected → validating → **rejected (no mutation)** →
confirming → restoring → restored → failed and rolled back.

The rejected and rolled-back states are first-class: the user must be able to
tell "nothing happened" from "something happened and was undone".

### Financial and security constraints

- Integer đồng only; no floating-point monetary coercion anywhere in the path.
- Transfers stay balanced and never count as income or expense.
- Splits sum exactly to their parent.
- Never invent a balance, date, or missing financial fact to make a restore
  succeed. A gap is a rejection, not a default.
- Tenant ownership is preserved; cross-tenant references are rejected.
- The archive is user data and must never contain a credential or provider
  secret.

### Out of scope

Cross-account migration, merge semantics for two different ledgers, scheduled or
server-side backups, provider-level PITR, physical-device acceptance (P3), and
any change to Auth, deletion or recent-auth architecture.

## Implementation plan

### Architecture fit

| Layer | Change |
|---|---|
| `supabase/migrations/` | `export_user_archive(...)` returning `jsonb`; `restore_user_archive(p_archive jsonb)`; both `SECURITY DEFINER`, both tenant-scoped |
| `src/lib/archive/` | envelope types, version constants, pure validators (unit-testable without a database) |
| `src/app/settings/` | export/restore surface with the required states |
| `supabase/tests/` | pgTAP: atomicity, rollback, ownership, invariants, idempotency |

Validation is written **twice on purpose**: pure TypeScript for fast feedback and
a clear rejection message, and again in the restore function, which is the only
authority. The client check is a convenience; the database check is the contract.

### Data and migration impact

New functions plus one restore-batch marker. Restore writes tenant rows for the
caller and nothing else.

**Correction.** An earlier version of this packet claimed "rollback is dropping
the functions; no data unwind". That is wrong, and review was right to reject it.
Dropping the functions only prevents *future* calls. If a defective restore
validates successfully and **commits**, the malformed rows are already in the
ledger, and a functions-only design leaves no way to tell a restored row from one
the user entered by hand — so there would be nothing to unwind *with*.

Two consequences, both now part of the contract:

- Restore records a **batch identity** (`restore_batch_id` plus `restored_at`)
  that marks every row it writes, so a bad restore is identifiable after commit.
  Whether this lives in a dedicated table or a column on restored rows is an
  implementation decision for R7; the requirement is that no restored row is
  anonymous.
- Undoing a committed bad restore is a **defined operation**, specified and
  tested before implementation ships — not an incident improvised later.

Rollback of the *change itself* (before any user has restored) remains dropping
the functions. Rollback *after* a restore is the batch-scoped removal above.

### Risks and counterexamples

| Risk | Handling |
|---|---|
| Bulk insert bypasses RPC-level invariants | restore re-asserts them in SQL before commit (P2-AC7) |
| Wrong-signed entry or mismatched category kind passes every other check | per-kind sign/count/category-kind assertions (P2-AC7a) |
| Restore rejects legitimately archived historical categories | ownership and kind checked, archival state not (P2-AC7b) |
| Self-referencing `transfer_pair_id` cannot be ordered | two-phase insert then update, dangling links rejected |
| A committed bad restore is unidentifiable | `restore_batch_id` on every restored row, defined batch removal (P2-AC14) |
| Dependency graph incomplete | rebuilt from `ALTER TABLE` blocks as well as `CREATE TABLE` |
| `EXCEPTION` block silently commits a subtransaction | no per-row handlers; `RAISE` only |
| bigint truncated by JSON parsing | safe-integer bound asserted both sides (P2-AC4) |
| Half-restored ledger | single RPC, single transaction, pgTAP proof (P2-AC6) |
| Cross-tenant link | composite FKs plus explicit ownership rejection (P2-AC8) |
| Archived-category rule rejected at insert | explicit rule (P2-AC13) |
| Reconciliation leg check fires at commit | anticipated in validation; deferred trigger documented |
| Concurrent double restore under READ COMMITTED | real guard, not read-then-write |
| Archive leaks a secret | automated key scan (P2-AC3) |

### Verification plan

Export → validate → restore round trip with semantic equality; integer-money
preservation; transfer neutrality; split exactness; ownership isolation;
corrupted, partial, missing-reference and unsupported-version archives all
rejected before mutation; duplicate restore; forced mid-restore failure rolls
back; credential scan; inventory-versus-purge drift test.

Added after review, each as an explicit negative case:

- an `expense` transaction with a **positive** entry is rejected;
- an `income` transaction whose entry points at an `expense`-kind category is
  rejected;
- a transaction whose entry count is wrong for its kind is rejected;
- a historical transaction on an **archived** category is **accepted**;
- a `transfer_pair_id` pointing outside the archive is rejected;
- mutually paired candidates restore correctly through the two-phase insert;
- a committed restore is fully removable by its `restore_batch_id`.

A dependency-graph test asserts the restore order still satisfies every foreign
key found in both `CREATE TABLE` and `ALTER TABLE` statements, so the omission
review caught here cannot recur silently.

Database and RLS gates are **required** for this work because it changes the
database boundary. Note for honesty: a green `database` job can mean
"Database checks not required"; that is not pgTAP execution and must never be
reported as such.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| R1 | Map tenant inventory, ordering, invariants | — | this reconnaissance | done |
| R2 | Research transaction boundary and plpgsql semantics | R1 | two primary sources | done |
| R3 | Owner decisions on the three open questions | R2 | — | blocked on owner |
| R4 | Accept the archive contract | R3 | this packet reviewed | pending |
| R5 | Envelope types and pure validators + unit tests | R4 | — | not started |
| R6 | `export_user_archive` + inventory drift test | R4 | — | not started |
| R7 | `restore_user_archive` + pgTAP atomicity/ownership | R6 | — | not started |
| R8 | Settings surface with required states | R7 | — | not started |
| R9 | Round-trip and rejection acceptance evidence | R7, R8 | — | not started |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-11 | human_owner | planner | planned | P1 accepted; `main@a6aaa7d` | no archive or restore exists | Map tenant truth, then specify |
| 2026-08-11 | planner | human_owner | specifying | inventory, ordering, invariant findings, two sources, P2-AC1–14 | three open questions in R3; nothing implemented | Owner answers R3 and accepts or amends the contract |

### Current permission boundary

- **Granted scope:** `branch_write` for documentation and specification.
- **Forbidden writes:** production DB mutation, production financial-data
  creation or change, destructive account deletion, Supabase provider config or
  secrets, Auth identity mutation, Edge deployment or config write.
- **Human approval required before:** any implementation commit under this
  contract, and any provider or production write.
- **Rollback or stop condition:** documentation only in this packet; revert the
  commit. Nothing to unwind on a provider.

## Evaluation

Not yet evaluable — no implementation exists. Acceptance evidence will be
recorded against P2-AC1–14 as R5–R9 complete.

### Remaining limitations

- The archive inventory is anchored to `purge_user_tenant_data` as it stands on
  `a6aaa7d`. That anchor is only as complete as the purge function; if a future
  table is added to neither, both stay wrong together. The drift test catches
  divergence between them, not a table absent from both.
- Restore correctness for `financial_mutation_audit_events` depends on the R3
  answer about whether audit history is replayable at all.
