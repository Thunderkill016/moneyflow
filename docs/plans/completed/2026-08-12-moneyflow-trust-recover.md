# MoneyFlow Trust P2 — Recover (complete versioned archive and restore)

**Status:** accepted/completed
**Execution state:** accepted 2026-08-12 with one named limitation; ready to archive
**Active role:** evaluator
**Permission scope:** branch_write (repository code and tests; no provider, production or database write)
**Owner:** agent (implementer/evaluator) → human_owner (merge decision)
**Issue/PR:** parent #323; #342 contract; R5 PR pending
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

### Owner decisions — resolved 2026-08-11

The three questions recorded in #342 are closed. These are decisions, not
inferences, and the R5 code implements them.

**D1 — target tenant.** Restore always targets the **current authenticated
tenant**, and the eventual restore authority is `auth.uid()` alone — never a
caller-supplied `target_user_id`, never a `user_id` carried in the archive, never
the source account identity.

An archive **may** be restored into a *different* MoneyFlow account. The
legitimate lifecycle is: export from the old account → the old account is gone or
a new one is created → restore into the newly authenticated account. Archive
portability is therefore **source-account independent, current-authenticated
target**.

Consequently owner fields are not serialized at all: no row carries `user_id`,
and `profiles` carries no `id`, because `profiles.id` *is* the auth user id and
must never overwrite the target's. An unexpected owner-authority field in a
record is **rejected**, not trusted and not silently dropped.

**D2 — target must be empty.** Restore v1 is **empty-only**: no merge, no
deduplication, no row replacement, no best-effort, no silently skipped conflicts.

The exact bootstrap exception is measured, not assumed. `handle_new_user` fires on
`auth.users` insert and creates, in one trigger: one `profiles` row, one
`accounts` row (`Tiền mặt`, `cash`, `VND`) and **eleven** `categories` rows with
`is_default = true`. A freshly created account is therefore never literally
empty, and an all-zero precondition would lock out exactly the user who most
needs to recover. Nothing beyond those three is allowed, and one financial
transaction — or one user-made category, or one row in any other tenant table —
makes the target ineligible.

**D3 — financial audit history is non-replayable.** Historical
`financial_mutation_audit_events` are **never** inserted into the live audit
table: they describe mutations from the source lifecycle, and replaying them
would fabricate live provenance in the target tenant. They are preserved as
sanitized, clearly non-replayable history for the user's own evidence. The
eventual restore must create **new** restore-time provenance tied to
`restore_batch_id`, and that new provenance is not to be described as
"re-derived historical audit". No audit schema changed in R5.

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

- [x] **P2-AC1** Archive envelope is versioned and self-describing:
      `archive_version`, `produced_at`, `schema_generation`, `tenant_row_counts`.
      (Specified as `app_schema_generation`; the shipped envelope names the field
      `schema_generation`. Same fact, shorter name — recorded rather than silently
      renamed.)
- [x] **P2-AC2** Archive inventory covers every table `purge_user_tenant_data`
      deletes, or names the exclusion reason. A test fails if the two drift.
- [x] **P2-AC3** Archive contains **no** secret: no password hash, JWT, access or
      refresh token, OAuth or CAPTCHA secret, service-role key, provider
      configuration or private infrastructure metadata. Asserted by a
      key/value scan over a populated archive, not by inspection.
- [x] **P2-AC4** Integer money survives the round trip exactly: `amount_minor`
      is never parsed through a lossy float, and any value outside the
      IEEE-754 safe-integer range (±9007199254740991) is rejected rather than
      silently rounded. This matches an existing repository rule rather than
      inventing one: `create_money_transaction` already raises
      `amount_exceeds_safe_integer` at exactly that bound.
- [x] **P2-AC5** Restore validates the **entire** archive before its first
      write. Unsupported version, missing referenced entity, malformed
      structure, non-integer money, unbalanced transfer, inexact split and
      foreign-tenant identifiers all fail with no row written.
- [x] **P2-AC6** Restore is atomic: a failure at any point leaves the ledger
      exactly as it was. Two different strengths of evidence, kept apart:
      every refusal pgTAP exercises fires during pre-write validation and is
      **measured** to write zero rows; a failure *after* writing has begun is not
      injected by any test and rests on the structural argument that the whole
      restore is one statement in one transaction with `SET CONSTRAINTS ALL
      IMMEDIATE`. Accepted on that basis, not on a measured mid-write abort.
- [x] **P2-AC7** Restore re-asserts financial invariants in the database:
      transfers balance to zero and stay neutral to income/expense, splits sum
      exactly to their parent, entries never have `amount_minor = 0`.
- [x] **P2-AC7a** Restore validates **per-kind entry shape**, which the
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
- [x] **P2-AC7b** Archived categories are treated differently from live
      creation. `create_money_transaction` raises `category_archived`, but a
      faithful restore **must** accept a historical transaction whose category
      was archived after the fact. Restore therefore validates category
      ownership and kind but not archival state for historical rows, and the
      distinction is written down rather than inherited by accident.
- [x] **P2-AC8** Tenant ownership is preserved: every restored row is owned by
      the authenticated caller. An archive naming another `user_id` is
      rejected; ownership isolation is proven under RLS.
- [x] **P2-AC9** Duplicate restore of the same archive is defined and tested —
      no duplicated ledger, no partial second copy.
- [x] **P2-AC10** Conflict policy for empty vs non-empty target is explicit,
      documented and tested. No silent merge.
- [x] **P2-AC11** Soft-deleted and archived rows round-trip as soft-deleted and
      archived — restore does not resurrect deleted history.
- [x] **P2-AC12** Archives from an unsupported future or retired version are
      rejected with an actionable Vietnamese message — with the message's
      *specificity* named as a limitation. The rejection itself is proven at every
      layer (`archive_version_unsupported` in the database, a distinct validator
      code, refusal before any write). The user-facing text is the generic
      "Đây không phải bản sao lưu MoneyFlow hợp lệ. Không có dữ liệu nào bị thay
      đổi.", because ingress collapses every validator rejection into
      `archive_invalid`. Actionable and truthful, but it does not tell the user
      *that the version is the problem*. A version-specific message is deferred
      work, not a shipped claim.
- [x] **P2-AC13** `inbox_rules` whose category is archived are handled by a
      written rule, not by an unhandled `rule_category_not_available`.

- [x] **P2-AC14** Every row a restore writes is attributable to a restore batch,
      and removing a committed bad restore by that batch is a defined, tested
      operation. Attribution is a **side table**, not a column: no tenant table
      gained a `restore_batch_id`; `archive_restore_rows (batch_id, table_name,
      row_id, row_hash)` records what was written, and
      `remove_archive_restore_batch` removes only rows still byte-identical to
      the recorded hash, so a row the user edited after the restore is left
      alone. A restore that commits malformed data must be identifiable and
      reversible; an unidentifiable restored row is an accepted-defect, not a
      completed feature.

P2 may be marked accepted only when P2-AC1–14 are evidenced or explicitly
recorded as owner-accepted limitations, without fabricating pass evidence.

**All fourteen are now evidenced (2026-08-12), with one owner-accepted
limitation on hosted restore recorded below.**

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

## R5 implementation truth

Three modules under `src/lib/archive/`, no dependency added, no migration, no
database access:

| File | Role |
|---|---|
| `moneyflow-archive.ts` | canonical inventory, dispositions, restore order, enum vocabularies, row field specs, envelope type |
| `moneyflow-archive-validator.ts` | `validateMoneyFlowArchive(input: unknown)` — pure, fail-closed |
| `restore-target-state.ts` | `evaluateRestoreTargetState(snapshot)` — pure empty-target policy |

The nineteen table names live in `ARCHIVE_TABLE_INVENTORY` only. Restore order,
collection names and the drift test all derive from it, so no future file copies
the list.

### Disposition matrix

Eighteen tables are `restorable`; `financial_mutation_audit_events` is `history`;
none is `excluded`. Every non-restorable disposition must carry a written reason,
asserted by a test.

### What the validator enforces beyond the #342 contract

Four rules were added because the evaluator pass found that validation would
otherwise have passed an archive that then failed *mid-restore* — which would
break the promise that a rejection means nothing was written:

- **Positive-money CHECKs.** `savings_goals.target_minor > 0`,
  `monthly_budgets.limit_minor > 0`, commitment and template
  `amount_minor > 0`, `inbox_candidates.amount_minor > 0`,
  `accounts.credit_limit_minor >= 0`, and the non-zero rules on
  `transaction_entries.amount_minor` and `savings_goal_allocations.amount_minor`.
- **`allocated_minor <= target_minor`** — a cross-field CHECK no single field
  spec can express.
- **`month_start` must be the first of its month** — all three of
  `monthly_budgets`, `commitment_occurrences` and
  `income_template_occurrences` carry
  `check (month_start = date_trunc('month', month_start)::date)`.
- **`currency_code ~ '^[A-Z]{3}$'`** and trimmed minimum lengths on names.

### Transaction shapes, read from the write RPCs

Every entry-producing path in the schema was enumerated
(`create_money_transaction`, `create_split_expense`, `create_account_transfer`,
`pay_recurring_commitment`, `record_recurring_income_template`,
`approve_inbox_candidate`), and they agree:

| Kind | Entries | Sign | Category |
|---|---|---|---|
| `income` | exactly 1 | positive | non-null, `kind = 'income'` |
| `expense` | 1–12 | all negative | non-null, `kind = 'expense'` |
| `transfer` | exactly 2 | one negative, one positive, summing to 0 | both NULL |

A split expense is stored as `kind = 'expense'` with 2–12 entries — so the
expense entry count is a **range**, not one. Multi-entry expenses must share one
account and use distinct categories, and transfers must be between two different
accounts with equal `currency_code`.

### Historical-state exceptions, evidenced

- A transaction whose category was archived **after** the fact is **accepted**,
  even though `create_money_transaction` raises `category_archived` at creation
  time. Archival state is deliberately not checked for historical rows; ownership
  and category *kind* still are.
- An `inbox_rules` row whose category was archived later is **accepted**, and
  this is evidenced rather than assumed: `inbox_rules_validate_category` fires
  only `before insert or update of user_id, category_id, contains_text,
  merchant_name, enabled`, and no migration cascades from archiving a category to
  its rules — so real tenants reach this state simply by archiving a category a
  rule points at.

  The restore-time consequence is recorded for R7 and deliberately not solved
  here: the trigger *does* fire on INSERT and always requires an active category
  there, so restoring such a rule will raise `rule_category_not_available`. That
  is an insertion-order problem for the restore implementation.

### Evidence boundaries — no false claims

- **Parsed objects only.** The validator receives an already-parsed value.
  RFC 8259 §4 notes duplicate object member names are not interoperable, and
  `JSON.parse` keeps the last and discards the rest *before* the validator runs.
  So R5 does **not** protect against duplicate raw JSON keys, and no hand-written
  JSON parser was added to pretend otherwise. A test records the limitation as
  executable evidence. Raw-text ingress belongs to the later file slice.
- **Duplicate restore.** `archive_id` shape is validated, but a pure function
  cannot know whether that archive was already restored — that needs persistent
  restore metadata, so same-archive detection belongs to the database slice.
- **`accounts` has no `is_default` column**, unlike `categories`. The bootstrap
  account allowance is therefore count-based (at most one) rather than
  structurally identified. Named limitation.
- **`difference_minor` is omitted, not carried.** The schema allows
  ±18014398509481982 — twice the JavaScript safe-integer bound — and it is
  exactly `statement_balance_minor - calculated_balance_minor`, so restore
  recomputes it rather than serializing a number JavaScript cannot represent.

## R6 implementation truth

### Architecture: SECURITY INVOKER, not SECURITY DEFINER

`public.export_user_archive()` takes **no arguments**, derives identity from
`auth.uid()`, and raises `authentication_required` when there is none.

It is deliberately **SECURITY INVOKER**. All nineteen tenant tables have RLS
enabled with a permissive owner-based SELECT policy for `authenticated` and a
plain SELECT grant, so running as the invoker makes tenant isolation
*structural*: RLS filters every row to the caller no matter what the function's
own predicates say, and a projection bug cannot leak another tenant's ledger.
`SECURITY DEFINER` would move that guarantee into this function's correctness and
would grow the repository's reviewed privileged inventory — which
`security_definer_contract.test.sql` pins at 34 — for no benefit. The explicit
`user_id` predicates are defence in depth, not the isolation mechanism.

Tenant spoofing is impossible by API shape: there is no parameter to spoof.

### Volatility: deliberately VOLATILE

`get_dashboard_bundle` is `stable`; this producer is not. Each call mints a fresh
`archive_id` and `produced_at`, so labelling it `stable` would promise the planner
something untrue and permit result reuse. Volatility is an optimiser contract,
not a write permission, so this does not weaken read-only behaviour — which is
proven by a pgTAP assertion that every tenant row count is unchanged across a
call, and by a drift test asserting the body contains no DML, rather than by a
label.

### Two functions, one migration

| Object | Role |
|---|---|
| `public.archive_timestamp(timestamptz)` | immutable ISO 8601 / microsecond / explicit-UTC formatter, null-safe |
| `public.export_user_archive()` | the producer |

Timestamps are formatted explicitly because the implicit timestamptz-to-jsonb
cast follows the session `DateStyle`; the contract pins the shape, so the
producer pins it too.

### Coverage: 19 of 19

Eighteen restorable collections plus sanitized `auditHistory`. Every array
`coalesce`s to `'[]'::jsonb`, so the contract never sees null. `profile` is
emitted in the source-neutral shape — five preference fields, and **no `id`**,
because `profiles.id` *is* the auth user id.

`tenant_row_counts` is derived from the serialized payload itself via
`jsonb_each` + `jsonb_array_length`, never from separate `COUNT(*)` queries that
could disagree with what was actually emitted.

Omitted on purpose: `user_id` everywhere; `profiles.id`; audit `actor_user_id`,
`request_id` and `idempotency_key`; and
`account_reconciliation_events.difference_minor`, which the schema permits up to
twice the JavaScript safe-integer bound and which restore recomputes.

### Deterministic ordering

Every collection declares an explicit `ORDER BY` ending in the primary key, so no
output depends on physical row order or planner choice. A drift test fails any
collection that lacks one. Two consecutive exports of the same tenant produce an
identical `tables` payload (pgTAP asserts this); only `archive_id` and
`produced_at` differ by design.

### Round-trip evidence — the acceptance proof

`scripts/verify-archive-producer.sh` runs against the freshly reset local
database in CI:

```
real tenant state → export_user_archive() → psql → JSON.parse → validateMoneyFlowArchive
```

The producer's output is piped **unmodified** into the R5 validator. Nothing
reshapes, fills in or repairs it, so an archive that only validates after a
fix-up cannot pass. The fixture deliberately populates **all eighteen array
collections**, and the verifier asserts each is non-empty — a producer that
quietly stopped emitting one table would fail rather than look fine against a
thin fixture.

### Drift evidence

`archive-producer-contract.test.ts` parses the migration (test-only, one file)
and asserts the SQL projects **every** field of every `ARCHIVE_ROW_SPECS` entry,
and **no** field the contract does not declare. Both directions were proven with
negative fixtures: deleting one projected field and adding one undeclared field
each turn the gate red. Adding a field to the contract without touching the SQL
now fails a test instead of silently truncating real archives.

Separately, all **192** projected column references were verified to exist on
their tables in the current schema.

### Review findings on #344

CI found the first one before the reviewer did; both agreed on it.

1. **`supabase test db` ran the round-trip fixture as a pgTAP test (P1).** The
   CLI globs every `.sql` under `supabase/tests/` with `pg_prove --ext .sql -r`,
   so a fixture with no `plan()` failed the database job with "No plan found in
   TAP output" — even though all 40 assertions in `export_user_archive.test.sql`
   passed. Worse, because the pgTAP step is `continue-on-error`, its *conclusion*
   read `success` while its *outcome* was `failure`, and the round-trip step
   correctly skipped, so the visible symptom looked like a pgTAP regression
   rather than a misplaced file. The fixture moved to `supabase/fixtures/` and its
   header now records why, so the placement is not undone later.
2. **The fixture wrote three tables as the owner on a false premise (P2).** The
   comment claimed they were SELECT-only for `authenticated`; in fact
   `import_batches`, `inbox_candidates` and `inbox_rules` all hold full DML
   grants and owner-based RLS policies. It worked only because
   `request.jwt.claim.sub` is transaction-local and survives `reset role` —
   `inbox_rules` has a BEFORE INSERT trigger raising `rule_tenant_mismatch`
   unless `auth.uid()` matches. Those three are now written as the authenticated
   caller, removing the hidden dependency; only
   `transaction_import_provenance`, which genuinely has no INSERT policy or
   grant, is still written as the owner, and the comment says so.
3. **The verifier scripts selected no CI gate (P2).** Editing only
   `verify-archive-producer.{sh,mjs}` ran nothing that executes them. Both are
   now in `databaseMatchers`, with a classifier test.
4. **The extra-field drift check silently exempted the profile (P3).** Its
   matcher required eight leading spaces while the profile projection is indented
   four, so an undeclared profile field would have passed the gate. Fixed to four
   — which immediately exposed that the last collection's block ran to end of
   file and swallowed the envelope keys, now bounded at the payload region.
5. **The ordering guard did not check uniqueness (P3).** `order by rule.priority`
   alone satisfied it. It now requires the ordering to end on the collection's
   primary key, so a regression to a tie-prone key fails.
6. **The no-write guard was case- and whitespace-sensitive (P3).** `UPDATE` or
   `update\n` slipped past a plain substring check; it is now a regex.
7. **`archive_timestamp` was labelled IMMUTABLE (P3).** `to_char(timestamp, text)`
   reads `DateStyle`/`lc_time` and is only STABLE. The numeric-only template means
   the output does not in fact vary, but IMMUTABLE was a false promise that could
   permit constant folding or index use. Now `stable`.
8. **Seven date fields relied on an implicit cast (P3).** `to_char(date, text)`
   does not exist; resolution prefers `timestamptz`, which reads the session
   `TimeZone` — precisely the dependency the migration header claims to avoid.
   All seven now cast to `timestamp` explicitly.

Findings 4, 5 and 6 were each re-proven with a negative fixture after fixing, so
none of the three guards can pass vacuously again.

**Accepted trade-off, not a defect.** Granting `authenticated` EXECUTE on
`archive_timestamp` exposes `/rest/v1/rpc/archive_timestamp`, a new browser-callable
endpoint, which the least-privilege posture otherwise works to shrink. It is
required by the SECURITY INVOKER design; making the helper SECURITY DEFINER would
break the pinned inventory of 34. The endpoint takes a timestamp and returns a
string, reaching no tenant data and holding no state, and one shared formatter is
worth more than forty inlined copies of a format string that could diverge. The
reasoning is recorded in the migration header.

### Known interaction, recorded rather than silently handled

`import_batches.headers` and `column_map` pass through as opaque JSON, and the
validator's defence-in-depth scan rejects forbidden key names at any depth. A
bank statement whose column header was literally named e.g. `password` would
therefore produce an archive the validator refuses. Stripping such a key would
lose user data silently, so the producer does not; the interaction is recorded
here as a bounded limitation for the file-ingress slice to surface properly.

## R7 implementation truth

### Privilege: SECURITY DEFINER, proven not inherited

Fifteen of the nineteen tenant tables have **no INSERT grant and no INSERT
policy** for `authenticated` — only `categories`, `import_batches`,
`inbox_candidates` and `inbox_rules` do. That is deliberate: live financial
writes must pass through the reviewed RPCs. SECURITY INVOKER would therefore
require granting the browser direct INSERT on `financial_transactions` and
`transaction_entries`, permanently bypassing every invariant those RPCs enforce.
DEFINER confines the elevated right to two reviewed functions; the pinned
inventory moved 34 → 36 with the reason recorded in the test.

### Atomicity, concurrency, validation

One RPC, one transaction; no `COMMIT` inside, no per-row `EXCEPTION` recovery,
and `SET CONSTRAINTS ALL IMMEDIATE` so the deferred reconciliation-leg trigger
fires inside the call. Concurrency is serialized by `pg_advisory_xact_lock` keyed
by tenant; a test rejects session locks. Validation re-proves the contract in SQL
before the first domain write, with a drift test keeping it aligned to the pure
validator.

### Restore batch and removal

`archive_restore_batches` (unique `(user_id, archive_id)`) plus
`archive_restore_rows` give exact attribution without adding a column to eighteen
domain tables. Removal is deliberately bounded to a **pristine** batch: once the
user edits restored rows or adds their own, `remove_archive_restore_batch`
refuses rather than guessing which rows to destroy. It deletes in reverse
dependency order and does not erase the audit events the restore created.

### Named fidelity limitations

Trigger-owned and unrepairable, because `version_inbox_rule` force-restores
`created_at` from `old`:

- `inbox_rules.version`, `created_at`, `updated_at` — restore-time values,
  version 1; rule behaviour preserved exactly;
- `inbox_candidates.fingerprint`, `fingerprint_version` — recomputed by trigger;
- `applied_rule_version` — realigned to the restored rule, since the evidence
  trigger demands an exact match and every restored rule is version 1.

Archived ids are preserved, which gives the strongest possible fidelity, so a
restore beside a **still-live source tenant** is refused as
`restore_archive_id_conflict` rather than failing on a primary key part-way
through. The documented lifecycle — old account gone, new account created — is
what the tests exercise.

### Audit

Archived `auditHistory` is never replayed. The ordinary audit triggers fire; their
events are true about the target tenant, and every entity they name is
attributable to the batch, which pgTAP asserts alongside "no archived audit event
id appears in the target" and "no historical `request_id` is replayed".

### Evidence

Real pgTAP: **28 files, 559 tests**, `restore_user_archive.test.sql ok` with 38
assertions. Both CI round trips green, proving
`database → archive → restore into a different fresh tenant → archive → R5
validator` with the producer output unmodified. Sixteen collections compare
identical; rules and candidates compare identical minus exactly the named fields.

### Review findings on #346

1. A duplicate-id check grouped by `collection.key` while its subquery referenced
   `collection.value` — invalid SQL, caught by CI. It failed closed inside
   validation, before any domain write, but masked every later assertion.
2. Preserved ids collide with a still-live source tenant. Rather than remap ids
   and weaken the round trip to "same shape, different identifiers", the
   constraint is explicit and the lifecycle is what the tests follow.
3. A test compared restored categories against a source tenant the lifecycle now
   purges first; it compares against the archive instead.

## R8 implementation truth

`src/lib/archive/archive-ingress.ts` is the single boundary between an untrusted
file and an R5-validated archive:

```
bytes → size bound → strict UTF-8 → structural scan → JSON.parse → R5 validator
```

Nothing repairs, normalizes or fills in an archive; R5 remains the only judge of
domain validity. Pure — its only imports are the contract and the validator.

### Duplicate member names — the reason this layer exists

R5 recorded that it *could not* claim duplicate-key protection, because
`JSON.parse` keeps the last member and discards the rest before a validator ever
runs. `scanJsonStructure` reads the raw text first and rejects a duplicate at any
depth.

It is deliberately **not** a JSON parser: it builds no values and decides no
types, only tracking object scopes well enough to know which strings are member
names. `JSON.parse` remains the syntax authority, and any structural
disagreement is reported as a syntax error for it to confirm.

Two properties matter and are attacked in tests:

- comparison uses the **decoded** name, so `"\u0061rchive_id"` collides with
  `"archive_id"`; raw-spelling comparison would miss it;
- scopes are separate, so the same name in sibling objects stays valid.

A regex over `"key":` was rejected outright — tests include strings that contain
`\"id\": 1`, braces, escaped quotes and backslashes, all of which such a regex
would fire on.

### No dependency

None was added. The scanner is ~120 bounded lines against a well-specified grammar,
and it needs only name-and-scope tracking rather than value construction, so a
third-party parser would have been more supply-chain surface for less fit. A test
asserts no JSON-parsing dependency appears in the manifest.

### UTF-8 and BOM

Decoding uses `TextDecoder("utf-8", { fatal: true })`. `fatal` is the point: the
default decoder rewrites malformed bytes to U+FFFD, silently turning a corrupt
file into a parseable one. A test proves the lenient decoder would have accepted
the same bytes.

A leading UTF-8 BOM is tolerated and stripped, because editors and spreadsheet
tools add one and it is unambiguous. Nothing else is: no encoding sniffing, no
legacy encodings, no UTF-16.

### Bounds, derived not invented

- **64 MiB.** Measured from the real contract shapes: a serialized transaction is
  ~334 B and an entry ~348 B, so a transaction with its typical 1.3 entries costs
  ~786 B. The cap holds roughly 85,000 transactions — about 23 years at ten a day,
  or eleven at twenty. Checked before any decoding, and oversized input is
  rejected outright: half an archive is not a smaller archive.
- **Depth 24.** A real archive nests five deep. The exact value is deliberate:
  R5's forbidden-key scan stops descending past depth 24, so capping ingress at
  the same bound guarantees the validator inspects every level of what it
  accepts. Without it, a secret buried at depth 30 would pass that scan
  unexamined. A test asserts the two bounds stay aligned.

### Error contract

Stable codes for a later Vietnamese UI: `file_empty`, `file_too_large`,
`invalid_utf8`, `invalid_json_syntax`, `duplicate_member_name`,
`max_depth_exceeded`, `archive_invalid`.

Rejections carry a byte offset and depth, never a member name and never a value —
`column_map` keys are user-derived statement headers, so even a key name can be
private. `JSON.parse`'s own message is discarded for the same reason: it quotes
the offending source text.

### Review findings on #347

Six, all real, all fixed. Two were resource bugs in the very layer meant to bound
untrusted work:

1. **Out-of-memory on a legitimate-sized file (P1).** The scanner decoded *every*
   string, including values it never inspects, building the text one character at
   a time. A 40 MiB string value — well under the 64 MiB cap — aborted the process
   with a fatal OOM, so the caller received no result at all. Values are now
   skipped without accumulating; only a possible member name is decoded.
2. **Unbounded member set in one object (P2).** Scope frames pop as objects
   close, so the scanner's memory is bounded by the largest single object — which
   a crafted object with millions of short unique names could still blow up.
   Capped at 4096 members, against a widest real row of 34 fields.
3. **Rejections leaked user-derived member names (P2).** R5 builds paths from
   real object keys, and inside `column_map` those keys are the user's own
   imported statement headers — so forwarding them verbatim contradicted this
   module's own no-member-name guarantee. Segments outside the contract are now
   redacted while the structure is kept.
4. **`byteOffset` was not a byte offset (P2).** It was a UTF-16 code-unit index,
   which a single Vietnamese `đ` already makes wrong. It is now converted to a
   true UTF-8 offset, counted without allocating and only on the rejection path.
5. **A caller-supplied byte count could understate the bound (P3).** The measured
   length now always applies.
6. **A comment described a BOM check that did not exist (P3).** Corrected; a
   mid-stream BOM is rejected as a syntax error, which was already the behaviour.

The evaluator also ran 600,000 differential fuzz cases against an independent
reference parser and found **no** duplicate-detection false negative or false
positive, and no depth-accounting hole.

### Integration proof

`scripts/verify-archive-producer.mjs` now feeds the producer's **raw bytes**
through this boundary instead of calling `JSON.parse` itself, so both CI round
trips prove the full chain — `database → archive → file ingress → validated
archive` — with no test-only reshaping anywhere in it.

## R9 implementation truth

### Surface: a separate route, not a repurposed export

`/settings/backup` — "Bản sao lưu MoneyFlow" — is its own destination beside the
existing `/settings/export`, which stays "Xuất giao dịch và Inbox" and keeps its
own wording that it is *chưa phải bản sao lưu đầy đủ*. Folding the archive into
the CSV page would let someone reach for the export they already know and believe
they held a recoverable backup.

### Transport: server actions, and the ceiling that creates

The first implementation called Supabase from the browser, reasoning that the
RPCs were designed for it. `check:architecture` rejected that outright:
`src/components` may not import Supabase, and no hook in this codebase talks to
it either — every client data path goes through a server action. The repository
contract won.

That has a measured cost, and it is stated rather than hidden. Server action
requests cap at **1 MB** by default (Next's own bundled documentation), which at
~786 B per transaction breaks at roughly 1,300 transactions. `bodySizeLimit` is
raised to **4 MB** — as far as it is worth raising, because the hosting platform
caps serverless request bodies near 4.5 MB — giving about 5,000 transactions. The
surface refuses a larger archive **before** upload with a clear Vietnamese
message instead of letting the platform fail mid-flight with an opaque 413.

R8's 64 MiB bound is unchanged and still correct: that is a *parser* limit. This
is *transport*, and lifting it needs a different upload path (direct object
storage or a chunked endpoint) — its own slice, not something to fake here.

### Backend deployment safety (capability gap handling)

Both archive migrations were merged before they were deployed, so the UI shipped
ahead of the capability — and as of Mission 17C they are live in production. The
fail-closed path below remains for any future capability gap. PostgREST reports an absent function as `PGRST202`, which is
classified as `capability_missing` and shown as *"Chức năng … chưa sẵn sàng trên
máy chủ"* — an honest deployment state, not a user error and not a retry loop.
When the migrations are applied the surface becomes usable with no code change.

### Restore state machine

`idle → validating → rejected` (nothing written), or
`idle → validating → confirming → restoring → restored`, or
`restoring → failed`. Validation and mutation are never the same press: the RPC
is reachable only from `confirming`, and a `useRef` guard refuses a second submit
before React can re-render.

### Confirmation

A dialog showing **counts only** — produced-at, accounts, categories,
transactions, budgets, goals. No merchant, note or imported snippet is previewed
to prove the file was read, because the wrong file would put a stranger's history
on screen. It states plainly that restore does not merge, needs a fresh account,
replaces bootstrap state, and rolls back atomically on failure.

### Validation happens three times, deliberately

The browser runs R8 ingress on the raw bytes; the server action re-validates
because a server action is a public entrypoint and the browser's word is not
evidence; the database validates again before its first write. Nothing normalizes
the archive between any of them.

### Post-restore state

`revalidatePath("/", "layout")` in the action plus `router.refresh()` and a
navigation to `/dashboard`. Every route reads the server, so stale pre-restore
numbers cannot survive.

### Review findings on #348

Two, both real:

1. **The route rendered outside the app shell.** It was a bare `<div>` under the
   root layout, so it lost the navigation, workspace sizing and the way back to
   Settings that every other settings surface has. Now wrapped in
   `AppShell` + `SecondaryWorkspace`/`SecondaryHeader` like its siblings.
2. **A failed restore left the file input populated.** Re-selecting the same
   backup does not fire `onChange`, so after a transient server failure the user
   could not retry without picking a different file or reloading. The input is
   now cleared on every failed outcome.

### Demo mode

Told the truth and given inert controls: complete backup/restore is a
server-account feature, and both actions refuse a demo viewer before reaching an
RPC. The report export still works there.

## Production rollout preflight (2026-08-12)

**Mission 17B is complete.** The Supabase project is MoneyFlow-only, the Atoryn
Edge Functions and database subsystem are removed, the cleanup migration is
mirrored, the retimestamped migrations are reconciled, the two missing-history
migrations are repaired, and the linked history is fully aligned — the dry-run
now proposes exactly the two Recover migrations and nothing else.

**Recover schema is deployed (Mission 17C, 2026-08-12).** Approval A was consumed
to apply exactly the two migrations with `supabase db push --linked --include-all`
— `--include-all` was required because the cleanup migration carries a later
timestamp. History is 41/41 aligned and the follow-up dry-run reports *"Remote
database is up to date"*. Aggregate rows were 228 before and after across the same
19 financial relations; the two new tables arrived empty.

Live read-back confirmed all five new functions exist and deny the anon key
(`42501`, versus `PGRST202` for a function that does not exist), and both new
tables deny anon SELECT and INSERT.

**Hosted backup acceptance passed (Mission 17D, 2026-08-12).** The owner
downloaded a backup from hosted `/settings/backup` after the R6 deployment. Its
exact raw bytes went into the shipped `ingestArchiveBytes`, which ran the shipped
`validateMoneyFlowArchive`: **R8 PASS, R5 PASS with zero contract violations.** No
`JSON.parse` first, no normalization, no reconstruction, no synthetic fixture.

Safe evidence: artifact `sha256 f2fb8228…`, 63216 bytes, `produced_at
2026-08-12T07:40:43Z`, version 1, 19 dispositions (18 restorable + 1
non-replayable history), 189 archived rows, credential/authority keys none,
profile carries no source id.

The brief quoted an earlier download (`c339dc2b…`); the supplied file hashed
`f2fb8228…` at the identical byte length, which is exactly what a second export of
an unchanged ledger produces, since `archive_id` and `produced_at` are fixed-width.
The owner confirmed it supersedes. The archive was handled only outside the
repository and never committed.

**P2 Recover is still not accepted.** Hosted **restore** acceptance has not run;
it mutates a ledger and needs a separate Approval B plus a designated
bootstrap-only throwaway account.

The Recover migrations are still **unapplied**. Preflight found the deployment
path itself was broken, and fixing that came first.

### The Supabase project is now MoneyFlow-only

It had been shared with another product ("Atoryn"). That subsystem was removed by
production migration `20260812043219_remove_atoryn_from_moneyflow_project`
(7 `atoryn_*` tables, 11 `atoryn_cloud_*` functions, plus its own history rows),
and the five Atoryn Edge Functions were deleted under explicit owner
authorization. Only `delete-account` remains — v6, `verify_jwt=true`, bundle SHA
`56bdec4f7b0d5a97…`, unchanged.

That cleanup migration is mirrored into the repository as history. It is kept
despite its name because it is *evidence of removal*, not an active subsystem.

**Data safety:** `table-stats` captured immediately before and after the Edge
deletion — 19 relations both times, zero Atoryn relations, **zero row-count drift**
across every table, 224 rows total both times.

### Why deployment was blocked, and what was actually wrong

`supabase db push` refused to run at all: 12 remote versions had no local file.
The CLI's suggested remedy (`migration repair --status reverted`) would have
falsified another product's record of its own database.

Worse, had it been forced, the push would have applied **seven** unrelated
MoneyFlow migrations, not two — and
`20260801043000_import_provenance_and_atomic_approval` contains six
non-idempotent statements, so it would have failed partway through.

### Migration concordance

Five migrations were the **same migration retimestamped**, proven byte-identical
after normalizing comments and the `;;` the history table appends:

| Repository (was) | Production (canonical) | Verdict |
|---|---|---|
| `20260726000100` | `20260726004445` | SAME_MIGRATION_RETIMESTAMPED |
| `20260726011000` | `20260726011134` | SAME_MIGRATION_RETIMESTAMPED |
| `20260801043000` | `20260801084523` | SAME_MIGRATION_RETIMESTAMPED |
| `20260801043100` | `20260801084534` | SAME_MIGRATION_RETIMESTAMPED |
| `20260801043200` | `20260801084604` | SAME_MIGRATION_RETIMESTAMPED |

Each was renamed to the production version keeping the reviewed local content —
git recorded pure renames, so no behaviour changed.

The migration history table stores SQL with **comments stripped** and a trailing
`;;`, so a fetched copy is a lossy normalization. All 31 files the fetch
overwrote were reverted to the reviewed originals; only genuinely new files were
kept.

### The two remaining migrations — ALREADY_LIVE_HISTORY_MISSING

`20260715001400_split_expense` and `20260715001500_account_currency_on_create`
have no production history entry. They are **superseded**:
`20260725035128_restore_split_feed_and_account_currency` — which *is* applied —
redefines exactly the same three objects, and nothing between them depends on
those functions.

So their effects are live, but pushing them now would run them *after* `035128`
and **downgrade two live functions to older definitions**. They must never be
applied to this database.

**Resolved.** The owner approved and completed a narrowly-scoped
`migration repair --status applied` for exactly those two versions. It changed
the history table only — it did not execute their SQL — and independent
post-write checks confirmed the 19 MoneyFlow table counts and the live
`create_split_expense`, `create_financial_account` and `transaction_feed`
definitions were unchanged. Both are now aligned local/remote, and the linked
dry-run proposes only the two Recover migrations.

### Recurrence prevention

`check:migrations` pins every migration's version, filename and a **raw content
hash**. It fails on a retimestamp, a post-hoc edit of an applied migration, or two
byte-identical versions — each proven with a negative fixture. It is offline by
design: no database call in normal CI.

Review caught a real hole in the first version, which normalized comments,
whitespace and case before hashing: lowercasing the whole file also lowercases
*string literals*, so changing a default note from `'Chuyển tiền'` to
`'CHUYỂN TIỀN'` hashed identically while a fresh database would genuinely behave
differently. Any normalizer that is not SQL-aware has that class of hole, and an
SQL parser is far too much machinery for one guard — so it hashes raw bytes. The
cost is that even a comment edit now needs a deliberate `--write`, which for a
migration the database has already run is the right amount of friction.

## P2 Recover acceptance decision (2026-08-12)

**P2 Recover is ACCEPTED**, with one explicit owner-accepted limitation.

### Verdicts

| Criterion | Verdict | Evidence |
|---|---|---|
| P2-AC1 versioned self-describing envelope | **PASS** | real production archive validated through shipped R8→R5 |
| P2-AC2 inventory anchored to `purge_user_tenant_data` | **PASS** | drift test; 19 dispositions in the production artifact |
| P2-AC3 no secret in archive | **PASS** | R5 structured scan + key sweep on the production artifact: none |
| P2-AC4 exact integer money | **PASS** | R5 safe-integer rules; pgTAP round trip preserves 9007199254740991 |
| P2-AC5 validate before first write | **PASS** | three independent layers; pgTAP proves refusal writes zero rows |
| P2-AC6 atomicity | **PASS (deterministic)** | pgTAP: one transaction, no per-row recovery, `SET CONSTRAINTS ALL IMMEDIATE` |
| P2-AC7 / 7a / 7b invariants, entry shape, archived categories | **PASS** | pgTAP + R5, rules read from every entry-producing RPC |
| P2-AC8 tenant ownership | **PASS** | no `user_id` serialized; ownership from `auth.uid()`; pgTAP cross-tenant isolation |
| P2-AC9 duplicate restore | **PASS** | partial unique index; pgTAP proves refusal then retry-after-removal |
| P2-AC10 empty-vs-non-empty policy | **PASS** | pgTAP refuses a populated tenant before mutation |
| P2-AC11 soft-deleted/archived round-trip | **PASS** | pgTAP semantic round trip |
| P2-AC12 unsupported version rejected | **PASS** | R5 + database validator |
| P2-AC13 archived-category rules | **PASS** | pgTAP: rule survives its category being archived |
| P2-AC14 restore batch attribution and removal | **PASS** | `archive_restore_rows` with content digests; pgTAP pristine-only removal |
| PBT-AC10 export→validate→restore with invariants intact | **PASS (deterministic) / hosted limitation** | pgTAP full round trip on a real Postgres; hosted half proven for export only |
| PBT-AC11 restore fails safely on bad archives | **PASS** | pgTAP: unsupported version, unsafe money, owner-authority field, missing field — each writes zero rows |

### Hosted evidence

- **Hosted backup: PASS.** A real production archive downloaded from
  `/settings/backup` passed the shipped `ingestArchiveBytes` → `validateMoneyFlowArchive`
  path on its exact raw bytes (Mission 17D).
- **Hosted restore: NOT EXECUTED — owner-accepted limitation.**

### The accepted limitation, stated precisely

R7 preserves archived row ids, which is what makes the round-trip proof
identity-exact rather than merely shape-equal. Ids are globally unique, so a
restore is refused with `restore_archive_id_conflict` while the source account's
rows are still live — the documented lifecycle assumes the source account is gone.

Two production archives were handled across Missions 17D and 17E, and the blocker
was the **source**, not the target:

| Archive | Origin | Role | Status in 17E |
|---|---|---|---|
| `sha256 f2fb8228…`, 63216 bytes, 189 rows | owner's **primary account, which still exists** | the only populated archive, i.e. the only usable restore *source* | **not available** — securely deleted at the end of 17D under the privacy boundary, and it would have been refused by the id-conflict guard anyway |
| `sha256 749cb4fb…` inner / `570d0e26…` ZIP, 3560 bytes, 13 rows | the designated disposable test account | the restore *target*, verified eligible | available; R8 PASS, R5 PASS, bootstrap-only confirmed (profile 1, categories 11, accounts 1, every other collection 0) |

So the target was genuinely eligible and was verified read-only through the shipped
R8/R5 path. What was missing was a source archive whose rows are not still live.
Producing one would have required either purging the owner's real account or
building a third account, populating it, exporting, then purging it — neither
justified for acceptance. On 2026-08-12 the owner accepted this as a named
limitation rather than manufacture a destructive probe. The target archive was
**never** substituted as the source.

What stands in its place is not weaker in kind, only in venue: pgTAP executes the
**complete** `source → archive → restore into a different fresh tenant → re-export
→ semantic comparison` chain against a real PostgreSQL on every CI run that touches the database boundary and on every push to `main` (`classify-ci-changes.mjs` selects the pgTAP job by changed path, and non-pull-request events force the full gate set — so a docs-only PR such as this closure does not re-run it), comparing
sixteen collections as identical and rules/candidates identical apart from the
documented trigger-owned fields. The restore code path proven there is the same
code path production now runs.

**Not claimed:** no hosted restore was executed, so no production ledger has been
reconstructed by restore. That remains true until a future mission runs it against
a disposable source.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| R1 | Map tenant inventory, ordering, invariants | — | this reconnaissance | done |
| R2 | Research transaction boundary and plpgsql semantics | R1 | two primary sources | done |
| R3 | Owner decisions on the three open questions | R2 | D1/D2/D3 recorded above | done |
| R4 | Accept the archive contract | R3 | this packet, contract now executable | done |
| R5 | Envelope types and pure validators + unit tests | R4 | 92 assertions across 3 modules; see below | done |
| R6 | `export_user_archive` + producer drift test | R5 | 40 pgTAP assertions + real DB round trip into the R5 validator; see below | done |
| R7 | `restore_user_archive` + restore batch + pgTAP atomicity/ownership | R6 | 38 pgTAP assertions; full archive→restore→archive round trip | done |
| R8 | Strict archive file ingress | R7 | 32 attack assertions; producer bytes routed through ingress in CI | done |
| R9 | Backup & Restore settings surface | R8 | separate `/settings/backup` route; 21 surface assertions; browser evidence in CI | done |
| R9 | Round-trip and rejection acceptance evidence | R7, R8 | — | not started |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-11 | human_owner | planner | planned | P1 accepted; `main@a6aaa7d` | no archive or restore exists | Map tenant truth, then specify |
| 2026-08-11 | planner | human_owner | specifying | inventory, ordering, invariant findings, two sources, P2-AC1–14 | three open questions in R3; nothing implemented | Owner answers R3 and accepts or amends the contract |
| 2026-08-11 | human_owner | implementer | implementing | D1/D2/D3 decided | contract not yet executable | Implement R5 envelope, types and pure validators |
| 2026-08-11 | implementer | evaluator | evaluating | 3 modules, 92 assertions; 938/938 repo unit tests | no producer, no restore, no pgTAP | Attack the validator, then open the PR |
| 2026-08-12 | human_owner | implementer | implementing | R5 merged as `bc26a6f` | producer absent | Build the authenticated archive producer |
| 2026-08-12 | implementer | evaluator | evaluating | producer RPC, 40 pgTAP assertions, DB→validator round trip, drift gate proven by negative fixtures | restore absent; migration not applied to production | Adversarial review, then merge under the standing rule |
| 2026-08-12 | implementer | human_owner | blocked | rollout preflight: `db push` refused (12 remote-only versions) and would have applied 7 unrelated migrations | required pre-write evidence (production DEFINER inventory, row baseline, grants) unobtainable — no arbitrary read-only SQL, no credential | Owner decides how to reconcile shared history |
| 2026-08-12 | human_owner | implementer | provider_write_approved | scoped approval: delete five named Atoryn Edge Functions | `delete-account` must survive untouched | Delete one named function at a time, then read back |
| 2026-08-12 | implementer | evaluator | evaluating | Edge 6→1; `table-stats` pre/post identical (19 relations, zero drift, 224 rows); 5 retimestamps reconciled as pure renames; identity guard proven by negative fixtures | two superseded migrations still pending; repair blocked by permission guard | Merge #349, then request the scoped repair |
| 2026-08-12 | human_owner | implementer | provider_write_approved | scoped approval: `migration repair --status applied` for `20260715001400`, `20260715001500` | history-table write only; must not execute their SQL | Repair, then verify independently |
| 2026-08-12 | implementer | human_owner | complete | linked CLI verified: 39 aligned, zero remote-only, dry-run proposes exactly the two Recover migrations; post-write checks showed table counts and live function definitions unchanged | Recover migrations still unapplied at that point; no hosted acceptance | Mission 17B closed; next is scoped approval to deploy the two Recover migrations |
| 2026-08-12 | human_owner | implementer | provider_write_approved | Approval A: apply exactly the two Recover migrations | must apply nothing else; no seed, roles or repair | Push with `--include-all`, then read back |
| 2026-08-12 | implementer | human_owner | backup_accepted | applied 06:41:39–06:41:43Z; history 41/41 aligned; dry-run "Remote database is up to date"; 228 rows before and after; all five functions live and anon-denied against a PGRST202 control | live catalog posture not directly readable (no psql/DB password); hosted **restore** acceptance not run | Hosted backup acceptance passed on a real production artifact; hosted restore needs Approval B and a throwaway account |

### Current permission boundary

- **Granted scope:** `branch_write`, plus two **consumed** scoped production
  approvals recorded below. The provider scope is not standing: it was granted
  per action and is spent.
- **Consumed production approvals (2026-08-12):**
  1. *Delete five named Atoryn Edge Functions.* Owner-authorized explicitly by
     name. Executed one function at a time, no wildcards. `delete-account` was
     out of scope and verified unchanged afterwards (v6, `verify_jwt=true`,
     bundle SHA `56bdec4f7b0d5a97…`).
  2. *`migration repair --status applied` for `20260715001400` and
     `20260715001500`.* Owner-approved after the need was proven: both are
     superseded by the applied `20260725035128`, and pushing them would have
     downgraded two live functions. It wrote the history table only and did not
     execute their SQL.
- **Consumed production approval (Mission 17C, 2026-08-12):** *Apply exactly the
  two Recover migrations.* Executed with `--include-all`; nothing else was
  applied and the follow-up dry-run reports zero pending.
- **Still forbidden without a new scoped approval:** any hosted restore, any schema or tenant-data mutation, destructive account deletion,
  Supabase provider/Auth config or secrets, further Edge deployment or deletion.
- **Human approval required before:** any further provider or production write.
  A Git merge authorization is never a provider authorization.
- **Rollback or stop condition:** the Edge deletions are forward-fix only — the
  five functions would have to be redeployed from their own source, which does
  not live in this repository. The history repair is reversible with
  `migration repair --status reverted` for exactly those two versions.
  Everything else in this packet is documentation; revert the commit.

## Evaluation

### R5 acceptance evidence

| Criterion | R5 status | Evidence |
|---|---|---|
| P2-AC1 envelope versioned/self-describing | **contract done** | `archive_version`, `archive_id`, `produced_at`, `schema_generation`, `tenant_row_counts`; unsupported version/generation rejected |
| P2-AC2 inventory anchored to purge | **executable** | drift test parses `purge_user_tenant_data` (test-only) and asserts set equality on nineteen tables; R6 adds a producer-vs-contract field drift gate proven with negative fixtures |
| P2-AC3 no secrets | **executable** | strict schemas plus recursive forbidden-key scan; nested secrets inside opaque `column_map` JSON rejected; legitimate field names proven not to trip it |
| P2-AC4 integer money | **executable** | boundary values ±9007199254740991 accepted, ±1 beyond rejected, fractional/NaN/Infinity/stringified rejected, never coerced |
| P2-AC5 validate before mutation | **pure part done** | every structural, reference and CHECK-mirroring rule rejects before any write path exists |
| P2-AC6 atomicity | not started | needs the restore RPC and pgTAP |
| P2-AC7/7a/7b invariants and entry shape | **executable** | per-kind sign, count and category-kind rules from the write RPCs; archived-category historical acceptance |
| P2-AC8 ownership isolation | **pure part done** | no `user_id` serialized; owner-authority fields rejected; RLS proof needs the DB slice |
| P2-AC9 duplicate restore | **semantics pinned** | `archive_id` validated; persistent detection deferred with the reason recorded |
| P2-AC10 empty-only conflict policy | **executable** | `evaluateRestoreTargetState`; bootstrap exception measured from `handle_new_user` |
| P2-AC11 soft-delete/archived fidelity | **executable** | `deleted_at` and `is_archived` round-trip asserted |
| P2-AC12 unsupported version rejected | **executable** | version and schema-generation rejections; Vietnamese UI wording is a later UI concern, codes are stable for it |
| P2-AC13 archived-category rule | **executable** | accepted with evidence; restore-time trigger consequence recorded for R7 |
| P2-AC14 restore batch identity | not started | needs the DB slice |

**As of R6** — this paragraph is a historical stage record, superseded by the
acceptance decision at the end of this packet — P2 was not accepted and restore did
not exist. The exporter existed and was proven against a real database, but the
archive could not yet be restored, so the Recover capability was still absent end to
end. Restore shipped in R7 (#346) and the phase was accepted on 2026-08-12.

### R6 acceptance evidence

| Criterion | R6 status | Evidence |
|---|---|---|
| complete archive produced for the authenticated tenant | **done** | 19/19 dispositions; all 18 arrays non-empty in the fixture and asserted so |
| raw producer output satisfies the R5 contract | **done** | `verify-archive-producer.sh`: psql → `JSON.parse` → `validateMoneyFlowArchive`, unmodified |
| auth boundary | **done** | anon holds no EXECUTE; a cleared subject claim raises `authentication_required`; an identity with no tenant raises `archive_profile_missing` |
| tenant isolation | **done** | SECURITY INVOKER + RLS; pgTAP asserts neither tenant's archive contains the other's rows |
| ownership never serialized | **done** | no `user_id`/`actor_user_id` anywhere; profile carries no `id` |
| sanitized audit history | **done** | no `request_id`, no `idempotency_key`; seven fields only |
| empty collections are `[]` | **done** | bootstrap-only tenant emits 16 empty arrays, zero nulls |
| counts match the payload | **done** | derived from the payload; asserted per collection in pgTAP and in the verifier |
| archived and soft-deleted state survives | **done** | asserted in pgTAP and the verifier |
| exact integer money | **done** | 9007199254740991 round-trips exactly; every entry asserted safe-integer |
| deterministic ordering | **done** | explicit `ORDER BY` per collection; two exports byte-identical |
| read-only | **done** | row counts unchanged across a call; no DML in the body |
| restore | **not started** | R7 |

### Independent evaluator findings on R5

Four real findings, all fixed before the PR:

1. **CHECK constraints were not mirrored.** Money that was a safe integer but
   violated the owning table's CHECK (`target_minor = -5`, `limit_minor = 0`,
   a zero goal allocation, a negative credit limit) passed validation and would
   have failed at INSERT — defeating validate-before-mutation. Now rejected.
2. **`allocated_minor <= target_minor` was unenforced** — a cross-field CHECK.
   Added.
3. **`month_start` was validated only as a date**, though three tables require
   the first of the month. Added as its own field kind.
4. **`currency_code` was length-checked but not pattern-checked**, so `"vnd"`
   would have passed and then failed the `^[A-Z]{3}$` CHECK. Added, along with
   trimmed minimum lengths so `"   "` is not a valid name.

One self-inflicted test defect was also fixed: the purity check scanned the
module's prose and tripped on its own documentation naming `process.env` as
something it avoids. It now strips comments and scans executable code.

### Review findings on #343

Four more, all verified against source before accepting, all fixed:

1. **Persisted columns were missing from the contract (P1).** `import_batches.parser_version`
   and `mapping_version`, `transaction_import_provenance.match_confidence` and
   `created_at`, and `inbox_candidates.applied_rule_id` and `applied_rule_version`
   were absent. Because unknown fields are rejected, a producer could not have
   preserved them without failing validation — so faithful round trip was
   impossible for any tenant using imports or deterministic rules. All six added.
   `applied_rule_id` is modelled as a plain uuid, **not** a reference, because the
   schema gives it no foreign key: the rule it names may since have been deleted,
   and requiring its presence would reject valid archives.
   `financial_mutation_audit_events.idempotency_key` stays excluded, now
   explicitly: it deduplicates live writes, and this history is never replayed.
2. **Cross-field CHECKs beyond `savingsGoals` were unenforced (P2).** A `pending`
   entry with a non-null `cleared_at`, an `open` reconciliation carrying
   completion fields, a candidate with an approval link but no approved status,
   and a half-populated applied-rule pair all passed. Each now mirrors its named
   constraint: `transaction_entries_reconciliation_shape_check`,
   `account_reconciliations_status_shape_check`,
   `inbox_candidates_approval_link_check` and
   `inbox_candidates_applied_rule_pair_check`.
3. **`Date.parse` normalizes impossible dates (P2).**
   `Date.parse("2026-02-30T10:00:00Z")` returns a valid time for 2 March rather
   than `NaN`, so an impossible calendar timestamp would have reached a
   `timestamptz` INSERT. Timestamps now validate the date part as strictly as
   dates do, and range-check the clock, since the regex alone accepted `99:99:99`.
4. **UUID letter casing split identity (P2).** The uuid pattern is
   case-insensitive but rows were indexed by raw string, so two ids differing only
   in hex case were two rows here and one row in PostgreSQL — missing
   `duplicate_row_id` and failing later on the primary key. Identity and reference
   lookups are now canonicalized to lower case.

### Remaining limitations

- The archive inventory is anchored to `purge_user_tenant_data` as it stands on
  `a6aaa7d`. That anchor is only as complete as the purge function; if a future
  table is added to neither, both stay wrong together. The drift test catches
  divergence between them, not a table absent from both.
- `financial_mutation_audit_events` is settled by D3: preserved as
  non-replayable history, never inserted into the live audit table.
- R5 still validates parsed objects only; duplicate raw JSON member names are
  now caught upstream by the R8 ingress boundary, which is where that claim
  legitimately lives.
- The bootstrap account allowance is count-based because `accounts` has no
  `is_default` column.
- No pgTAP ran in R5 and none was required. Real pgTAP becomes mandatory for the
  restore slice, which changes the database boundary.
