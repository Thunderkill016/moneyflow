# Atomic Inbox approval with import provenance and server dry-run

**Status:** planned  
**Execution state:** planned  
**Active role:** planner  
**Permission scope:** branch_write  
**Owner:** AI agent; human owner controls merge, production migration and acceptance  
**Issue/PR:** #182 / pending  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Authenticated Inbox approval becomes one atomic database operation. The server classifies a pending candidate, creates the ledger transaction and entries, stores an immutable provenance snapshot, links the candidate to the created transaction and marks it approved. A failure cannot leave the ledger written while Inbox still reports the candidate as pending. Demo mode remains local and unchanged.

## Repository reconnaissance

### Current behavior

MoneyFlow already has a substantial import pipeline:

- CSV/XLSX/PDF/paste parsing and preview;
- `import_batches` and `inbox_candidates` persisted with tenant RLS;
- bounded `raw_snippet` retention;
- client-side fingerprint duplicate detection against Inbox and ledger rows;
- transfer-pair suggestions;
- direct CSV planning with same-file and ledger dedupe;
- manual review before posting low-confidence candidates.

The real gap is the approval boundary. In `src/components/inbox/inbox-page.tsx`, authenticated approval currently:

1. calls `addTransaction` or `addTransfer`;
2. receives a successful ledger transaction;
3. separately changes the candidate to `approved` through Inbox persistence.

The component explicitly handles the inconsistent outcome: `Đã ghi sổ nhưng chưa cập nhật được trạng thái Inbox.` This proves the two writes are not atomic.

The current database has no approved-transaction link, source row, external source ID, parser/mapping version or durable match reason. Client-computed fingerprint/transfer annotations are not persisted.

### Relevant repository areas

| Area | Current ownership | Planned change |
|---|---|---|
| `src/lib/inbox/candidate-store.ts` | Inbox candidate domain shape | Add bounded provenance and dry-run/link fields |
| `src/lib/inbox/import-batch-store.ts` | Batch metadata | Add parser and mapping versions |
| `src/lib/inbox/detect.ts` | Client heuristic fingerprint and transfer suggestions | Reuse algorithm/version semantics; do not make heuristic globally unique |
| `src/lib/inbox/inbox-map.ts` | Domain ↔ Supabase row mapping | Map new fields |
| `src/lib/inbox/review.ts` | Candidate → editable ledger input | Preserve existing review behavior |
| `src/app/actions/inbox.ts` | Authenticated Inbox writes | Add server dry-run and atomic approval actions |
| `src/components/inbox/inbox-page.tsx` | Review orchestration | Authenticated path calls atomic approval; demo path remains local |
| `supabase/migrations/` | Schema/RPC authority | Add provenance fields/table and narrow RPCs |
| `supabase/tests/database/` | pgTAP authority | Add tenant, idempotency, classification and atomicity evidence |

### Existing tests and constraints

- Money is integer VND and bounded by `Number.MAX_SAFE_INTEGER` at application boundaries.
- Transfers use exactly two opposite entries and never count as income/expense.
- Existing RPCs obtain `auth.uid()`, validate tenant-owned account/category rows and use idempotency keys.
- `import_batches` and `inbox_candidates` already have own-row RLS and composite tenant foreign keys.
- The browser-facing role must not receive broad table/function privileges.
- Fresh migration replay and pgTAP are mandatory before any production application.

### Similar implementation and recent history

- Issue #53 PR B defines provenance/versioning and a server-side dry-run as the next import correctness layer.
- Issue #182 narrows the work to atomic approval and four dry-run outcomes.
- PR #180 established neutral transaction contracts and explicit demo fixture boundaries.
- The former `agent/transaction-provenance-clearing` branch is not reused because it mixed provenance with premature reconciliation state.

### Open questions

- [x] Add provenance directly to `financial_transactions` or a separate table? Use a separate one-to-one table so manual ledger rows remain simple and import metadata has an explicit owner.
- [x] Make fingerprints unique? No. Only real external source IDs may be tenant/source unique; heuristic fingerprints remain match evidence.
- [x] Include `would_update`? No. MoneyFlow has no explicit imported-update policy.
- [x] Add reconciliation state? No. Account statement reconciliation remains a separate later slice.

## Research

### Research scope and source selection

- Decision question: What is the smallest server-side import contract that preserves lineage and prevents partial Inbox approval without turning MoneyFlow into an importer platform?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md`.
- Selected sources: `actualbudget/actual`, `firefly-iii/data-importer`, Supabase/PostgreSQL primary guidance already captured in issue #53.
- Expected decision: source ID first, versioned heuristic fingerprint second, dry-run before commit and atomic tenant-owned approval.

### Questions researched

1. Which imported facts must survive after approval?
2. Which matching evidence may be unique?
3. Where should approval atomicity be enforced?
4. Which import and reconciliation concerns must remain separate?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `actualbudget/actual` and official import/reconciliation docs | Primary finance product source | 2026-08-01 | Retain import identity, reconcile duplicates before commit and keep reconciliation separate | Actual is local-first and its sync architecture is not copied |
| `firefly-iii/data-importer` and official importer docs | Primary importer source | 2026-08-01 | Convert/validate/preview before commit; preserve mapping/import context | Its standalone importer, configuration breadth and AGPL code are not copied |
| Supabase/PostgreSQL docs summarized in #53 | Primary platform guidance | 2026-08-01 | Tenant ownership below UI, exact money, narrow SECURITY DEFINER functions and constraints | Provider-specific implementation remains MoneyFlow-owned |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep current two-step client approval | No migration | Proven ledger/Inbox inconsistency remains | Reject |
| Add source columns only to `financial_transactions` | Fewer tables | Manual ledger polluted; provenance lifecycle mixed with core fact | Reject |
| One-to-one provenance table + candidate link + atomic RPC | Explicit ownership, auditable and bounded | Migration/RPC complexity | Select |
| Build a generic import job/workflow service | Broad future flexibility | Excess architecture, cost and hidden retries | Reject |
| Full reconciliation in same PR | End-to-end bookkeeping feature | Statement/session/lock semantics are unresolved | Reject |

### Research decision

Use concepts, not copied code. The server owns classification and commit authority. `inbox_candidates` retains mutable review-stage lineage and the resulting transaction link. `transaction_import_provenance` stores the immutable snapshot associated with an approved ledger transaction. Real source external IDs may be unique within `(user, source)` when present. Fingerprints are explicitly versioned, indexed for matching and never globally unique.

### Adoption review

No dependency, provider or framework is added. The change uses existing PostgreSQL, Supabase RPC/RLS, Zod, server actions and current UI flow. Production application remains a separately approved provider write after merge and CI.

## Specification

### Problem

Authenticated Inbox approval can write a ledger transaction successfully and then fail to persist the candidate’s approved status. Imported transactions also lose durable lineage after approval, so duplicate decisions cannot be audited or reproduced from server data.

### User stories

- As a user, approving one Inbox item either completes fully or changes nothing.
- As a user, approving the same item twice does not create two transactions.
- As a maintainer, I can trace an imported transaction to its candidate, batch, source row, source identity and parser/mapping versions.
- As a reviewer, I can see whether the server would create, reject as duplicate, flag as suspected transfer or mark invalid before commit.

### Acceptance criteria

- [ ] Authenticated approval creates/links/approves atomically.
- [ ] Repeated approval returns the linked transaction ID without a second ledger write.
- [ ] Cross-tenant candidate/account/category/transaction references are rejected below the UI.
- [ ] `transaction_import_provenance` is one-to-one with a tenant-owned financial transaction.
- [ ] Raw/original description, source row, parser/mapping version and fingerprint version survive approval.
- [ ] A real external ID duplicate is classified explicitly and protected by a partial tenant/source unique constraint.
- [ ] A fingerprint match is classified but the fingerprint itself is not unique.
- [ ] Suspected transfer is not silently posted as money income/expense.
- [ ] Invalid candidates cannot be approved.
- [ ] Authenticated UI uses atomic approval; demo UI keeps current local flow.
- [ ] Exact-head static, unit, build, fresh migration replay, pgTAP and browser gates pass.

### Required states

- Loading: existing review busy state remains.
- Empty/populated: existing Inbox list remains.
- Validation/error: server dry-run reason is returned; atomic RPC errors leave both candidate and ledger unchanged.
- Recovery/undo: repeating approval is idempotent; no retry creates a duplicate.
- Long data/large VND: existing bounded raw snippet/note and safe-integer money constraints remain.
- Mobile/tablet/desktop: no structural redesign; existing review panel and bulk flow remain usable.
- Accessibility: existing button/status semantics remain; server errors are surfaced through existing notices.

### Financial and security constraints

- Financial transaction and entry invariants remain in PostgreSQL.
- `auth.uid()` is the only tenant authority inside RPCs.
- The client never supplies `user_id` or an approved transaction ID.
- Only pending candidate-owned data may be approved.
- Provenance stores bounded imported descriptions already accepted by the candidate model; no secret, token or bank credential is stored.
- `SECURITY DEFINER` functions use `set search_path = ''` and narrow execution grants.

### Out of scope

- Account statement date/balance, pending-cleared-reconciled status and reconciliation sessions.
- Imported transaction update/merge policy (`would_update`).
- Persisted user rules or AI categorization.
- Bank sync, OCR expansion, background workers or Trigger.dev.
- Rewriting direct CSV import UX.

## Implementation plan

### Architecture fit

- `inbox_candidates` remains the mutable review queue.
- `transaction_import_provenance` becomes the immutable import lineage owner after approval.
- `financial_transactions` remains the ledger fact owner and does not absorb import-specific columns.
- A read-only dry-run RPC classifies candidates using tenant-scoped server data.
- One atomic approval RPC owns candidate lock, validation, ledger creation, provenance insert and candidate transition.
- Server actions map RPC responses and return existing `Transaction` contracts.
- Demo remains explicitly local and never calls the authenticated RPC.

### Planned schema

Candidate additions:

- `source_row_index integer`;
- `source_external_id text`;
- `fingerprint_version smallint`;
- `fingerprint text`;
- `parser_version text`;
- `mapping_version integer`;
- `match_status import_match_status`;
- `match_reason text`;
- `match_confidence real`;
- `approved_transaction_id uuid`;
- `approved_at timestamptz`.

Batch additions:

- `parser_version text`;
- `mapping_version integer`.

Provenance table:

- one row per imported financial transaction;
- tenant-composite foreign keys to transaction, candidate and batch;
- bounded source/raw/version/match fields;
- RLS select-own; browser writes only through approval RPC;
- partial unique index for non-null source external IDs;
- non-unique fingerprint match index.

### RPCs

- `plan_inbox_candidate(p_candidate_id uuid) returns jsonb`:
  - validates tenant ownership and candidate shape;
  - external-ID duplicate first;
  - versioned fingerprint match second;
  - transfer suggestion from opposite pending candidate third;
  - otherwise `would_create`;
  - returns matched IDs, status, reason and confidence.
- `approve_inbox_candidate(...) returns uuid`:
  - supports money and transfer draft fields;
  - locks candidate;
  - returns existing link when already approved;
  - refuses `duplicate`, `suspected_transfer` submitted as money or `invalid` unless the reviewed draft intentionally resolves the transfer path;
  - creates transaction/entries directly in the same database transaction;
  - stores provenance and updates candidate atomically.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| New migration | enums, columns, provenance table, indexes, RLS and RPCs | Database authority |
| pgTAP files | schema, classification, tenant and atomic approval tests | Prove invariants below UI |
| Candidate/batch stores | typed lineage/dry-run fields | Domain contract |
| Inbox mapper/server columns | round-trip new fields | Persistence contract |
| Inbox server action | dry-run and atomic approval | Authenticated application boundary |
| Inbox page | branch authenticated approval from demo local flow | Remove two-step inconsistency |
| Unit tests | mapping and response validation | Type/runtime safety |

### Data and migration impact

- Existing rows backfill nullable lineage fields; no guessed provenance.
- `fingerprint_version`/`fingerprint` remain nullable for old candidates.
- Existing approved candidates remain unlinked; no retrospective guessed transaction link.
- New batch versions use defaults only for future creation, not reinterpretation of historical parser behavior.
- Rollback requires dropping RPCs/table/columns only before production data relies on them; after production adoption, rollback is forward migration preserving provenance.

### Risks and counterexamples

| Risk/counterexample | Prevention/test |
|---|---|
| Candidate approved twice | row lock + approved link idempotency test |
| Ledger write succeeds but candidate update fails | one RPC transaction + forced-error pgTAP counterexample |
| Fingerprint collision blocks legitimate transaction | no unique fingerprint constraint; reason/confidence only |
| Same external ID across different sources/users | unique only on tenant + source + external ID |
| Candidate points to another user’s account/category | composite ownership validation and cross-tenant pgTAP |
| Suspected transfer posted as expense | dry-run classification and RPC guard/test |
| Raw description leaks beyond bounds | existing 2000-char bound and provenance check |
| Bulk approval creates partial set | each candidate atomic; UI reports per-item results; full batch transaction is out of scope |

### Verification plan

- Static: knowledge, deployment, CSS, architecture, lint and typecheck.
- Unit/domain: candidate/map/dry-run response tests and existing import/detection tests.
- Database: fresh reset plus schema/RLS and dedicated approval pgTAP tests.
- Browser: authenticated approval path plus existing expense smoke and cross-device audit.
- Production/manual: after merge and approved migration, approve a synthetic candidate and confirm one candidate link, one ledger transaction and one provenance row.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add migration schema and RPC contracts | plan | migration diff | in progress |
| T2 | Add pgTAP schema/tenant/classification/atomicity tests | T1 | fresh reset + pgTAP | todo |
| T3 | Extend candidate/batch contracts and mappings | T1 | unit/typecheck | todo |
| T4 | Add server actions for dry-run and atomic approval | T2/T3 | action tests/build | todo |
| T5 | Route authenticated Inbox approval through atomic action | T4 | browser flow | todo |
| T6 | Evaluate diff, run exact-head CI and document rollout | T1–T5 | PR/CI | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-01 | researcher/planner | implementer | planned | #53, #182, current schema/RPC/UI reconnaissance, this packet | Exact SQL shape and pgTAP fixtures not yet implemented | Add migration and tests on branch only |

### Current permission boundary

- Granted scope: `branch_write` on `agent/import-provenance-dry-run`; read-only Supabase schema inspection.
- Exact resources: issue #182 and files listed in this packet.
- Forbidden writes: `main`, Supabase production DDL/data, provider configuration, unrelated transaction/reconciliation/UI changes.
- Human approval required before: merge, production migration/application or scope expansion.
- Stop condition: need to guess historical provenance, weaken ledger/RLS invariants or introduce a new service/framework.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Atomic approval | pending pgTAP | pending |
| Durable provenance | pending migration/map tests | pending |
| Dry-run classifications | pending pgTAP/unit tests | pending |
| Authenticated UI path | pending browser evidence | pending |
| No reconciliation/framework expansion | diff review | pending |

### Research and adoption evidence

- Actual/Firefly patterns are applied as independent product/database concepts only.
- Local-first sync, standalone importer architecture, AGPL code and broad rule systems remain unadopted.
- No new tool/dependency/provider is introduced.

### Review findings

- Correctness: pending.
- Security/ownership: pending cross-tenant tests.
- UI/UX/accessibility: no redesign intended; pending browser evidence.
- Maintainability/duplication: one database authority for authenticated approval; pending diff review.
- Scope compliance: pending.

### Remaining limitations

- Dry-run does not implement imported updates.
- Bulk approval is candidate-by-candidate atomic, not all-or-nothing across a batch.
- Historical approved candidates are not backfilled with guessed transaction links.
- Reconciliation remains a later account-level feature.

## Delivery record

- Branch: `agent/import-provenance-dry-run`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production migration: not applied
- Production flow verified: pending after merge/approved rollout
- Work packet moved to completed: pending
