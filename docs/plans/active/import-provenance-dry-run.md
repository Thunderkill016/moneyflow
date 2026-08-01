# Atomic Inbox approval with import provenance and server dry-run

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** AI agent; human owner controls merge, production migration and acceptance  
**Issue/PR:** #182 / #183  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Authenticated Inbox approval is implemented as one atomic database operation. The server classifies a pending candidate, creates the ledger transaction and entries, stores an immutable provenance snapshot, links the candidate to the created transaction and marks it approved. A failure cannot leave the ledger written while Inbox still reports the candidate as pending. Demo mode remains local and unchanged.

## Repository reconnaissance

### Original defect

Before this slice, authenticated approval in the Inbox used two separate writes:

1. create a transaction or transfer;
2. update the Inbox candidate to `approved`.

The UI explicitly handled the inconsistent state `Đã ghi sổ nhưng chưa cập nhật được trạng thái Inbox.` The database also lacked a durable link from an approved candidate to its transaction and did not retain source row, external source ID, parser/mapping version or server match evidence.

### Existing capabilities retained

MoneyFlow already had:

- CSV/XLSX/PDF/paste parsing and preview;
- `import_batches` and `inbox_candidates` with tenant RLS;
- bounded raw snippets;
- client-side duplicate and transfer suggestions;
- manual review before posting low-confidence candidates;
- integer VND and balanced-transfer invariants.

This slice does not redesign the import UI or replace those capabilities.

### Relevant authorities

| Area | Authority after this slice |
|---|---|
| Candidate and batch review state | `inbox_candidates`, `import_batches` |
| Immutable approved-import lineage | `transaction_import_provenance` |
| Ledger facts | `financial_transactions`, `transaction_entries` |
| Dry-run and atomic commit | `plan_inbox_candidate`, `approve_inbox_candidate` |
| TypeScript provenance contract | `src/lib/inbox/provenance.ts` |
| Domain/Supabase mappings | `src/lib/inbox/inbox-map.ts` |
| Authenticated application boundary | `src/app/actions/inbox-approval.ts` |
| Transaction hook integration | `src/hooks/use-transactions.ts` |

## Research

### Decision question

What is the smallest server-side import contract that preserves lineage and prevents partial Inbox approval without turning MoneyFlow into a generic importer platform?

### Sources selected

| Source | What it establishes | What does not apply |
|---|---|---|
| `actualbudget/actual` and official import/reconciliation material | retain import identity, review duplicates before commit and keep reconciliation separate | local-first sync and its monorepo architecture are not copied |
| `firefly-iii/data-importer` and official importer material | parse/convert/validate/preview before commit and retain mapping context | standalone importer breadth and AGPL code are not copied |
| Supabase/PostgreSQL guidance already recorded in #53 | tenant ownership below UI, narrow `SECURITY DEFINER` functions and database invariants | provider operations remain separately approved |

### Decision

- Use a separate one-to-one provenance table rather than adding import-only fields to every ledger transaction.
- Make real external source IDs unique only within tenant and source when present.
- Keep heuristic fingerprints versioned and indexed, but not unique.
- Classify on the server before commit.
- Commit candidate, transaction, entries and provenance in one database transaction.
- Keep statement reconciliation, update/merge policy and persisted rules outside this PR.

No dependency, service or runtime framework is added.

## Specification

### User stories

- As a user, approving one Inbox item either completes fully or changes nothing.
- As a user, retrying approval does not create a duplicate transaction.
- As a maintainer, I can trace an imported transaction to its candidate, batch, source identity and parser/mapping versions.
- As a reviewer, I can distinguish `would_create`, `duplicate`, `suspected_transfer` and `invalid` before commit.

### Acceptance criteria

- [x] Authenticated approval creates, links and approves atomically at the database boundary.
- [x] Repeated approval returns the existing linked transaction without a second ledger write.
- [x] Cross-tenant candidate/account/category references are rejected below the UI.
- [x] `transaction_import_provenance` is one-to-one with a tenant-owned transaction.
- [x] Source row, raw description, parser/mapping version and fingerprint version survive approval when supplied.
- [x] Real external-ID duplicates are explicit and cannot be overridden.
- [x] Fingerprint matches are classified but fingerprints remain non-unique evidence.
- [x] Suspected transfers cannot be silently posted as income or expense.
- [x] Invalid candidates require review resolution before approval.
- [x] Authenticated transaction creation routes candidates through atomic approval; demo remains local.
- [ ] Final exact-head static, unit, build, database and browser gates pass after the packet/PR synchronization commit.
- [ ] Human owner reviews the final diff and browser evidence.
- [ ] Production migration and exact deployment are separately approved and verified.

### Required states

- Existing loading, empty and populated Inbox states remain.
- Server classification and approval failures leave candidate and ledger unchanged.
- Approval retry is idempotent.
- Existing safe-integer and bounded-string limits remain.
- No structural mobile/desktop redesign is introduced.
- Existing notices surface server errors.

### Financial and security constraints

- VND remains integer đồng.
- Transfers create exactly two opposite entries and do not count as income or expense.
- `auth.uid()` is the tenant authority inside RPCs.
- The client never supplies `user_id` or an approved transaction ID.
- Only a caller-owned pending candidate may be approved.
- `SECURITY DEFINER` functions pin an empty search path and use narrow grants.
- No production DDL/data or provider setting is changed by this branch.

### Out of scope

- Statement date/balance and pending/cleared/reconciled state.
- Reconciliation sessions.
- Imported update/merge policy (`would_update`).
- Persisted user rules or AI categorization.
- Bank sync, OCR expansion or background workers.
- Rewriting direct CSV import UX.
- Guessing links for historical approved candidates.

## Implementation plan

### Database

- Added versioned candidate and batch provenance columns.
- Added one-to-one `transaction_import_provenance` with own-row RLS.
- Added a server fingerprint trigger without a unique fingerprint constraint.
- Added partial uniqueness for non-null external IDs within tenant/source.
- Added `plan_inbox_candidate` with four bounded outcomes.
- Added row-locked, idempotent `approve_inbox_candidate`.
- Added schema, invariant and security-definer pgTAP coverage.

### Application

- Added typed provenance and dry-run parsing in `src/lib/inbox/provenance.ts`.
- Added `src/app/actions/inbox-approval.ts` for authenticated dry-run and atomic approval.
- Routed authenticated candidate money/transfer posting through the atomic action in `use-transactions.ts`.
- Preserved candidate IDs in transaction input contracts.
- Extended Inbox mappings, server reads and create actions to round-trip source row, external ID and parser/mapping versions.
- Added focused mapping/provenance unit coverage.
- Removed temporary patch-emitter scripts and their temporary test after the real source files were updated.

### Data and migration impact

- Existing rows receive nullable lineage fields; no provenance is invented.
- Existing approved candidates remain unlinked.
- Old candidates may have null fingerprint/version data.
- New authenticated candidates receive explicit parser/mapping defaults when callers do not provide versions.
- Before production adoption, rollback may remove the new functions/table/columns. After provenance is used in production, rollback must be a forward migration that preserves lineage.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Candidate approved twice | row lock, approved link and idempotency pgTAP |
| Ledger write succeeds but candidate update fails | one RPC transaction and atomicity assertions |
| Fingerprint collision blocks a valid row | fingerprint is not unique; reviewed heuristic override is supported |
| Same external ID in another source/user | partial tenant/source uniqueness |
| Cross-tenant account/category reference | ownership checks and forged-user pgTAP |
| Transfer pair counted as income/expense | suspected-transfer guard and balanced two-entry assertion |
| Client provenance is dropped | mapping, action and client-facade round-trip plus unit tests |
| Historical provenance is guessed | nullable backfill and explicit out-of-scope rule |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | Add migration schema and RPC contracts | done | migration and fresh replay evidence |
| T2 | Add schema/tenant/classification/atomicity pgTAP | done | database job; 39 planned assertions in invariant suite |
| T3 | Extend provenance contracts and mappings | done | provenance/map unit tests and TypeScript gates |
| T4 | Add server dry-run and atomic approval action | done | `inbox-approval.ts`, RPC mapping and build |
| T5 | Route authenticated Inbox posting through atomic action | done | candidate ID transaction contracts and `use-transactions.ts` |
| T6 | Remove temporary codemod artifacts | done | four temporary emitter/runner/test files removed |
| T7 | Run final exact-head CI and evaluate the diff | in progress | final CI after this packet synchronization |
| T8 | Human merge and production rollout decision | blocked on T7 | owner-only |

## Verification evidence

### Diagnostic history

- CI #750 exposed one stale temporary codemod test and a pgTAP plan mismatch.
- The temporary patch emitters were removed after their intended source changes were implemented.
- `import_provenance_invariants.test.sql` was corrected from `plan(38)` to `plan(39)`; the assertions themselves were already passing.

### Implementation-head evidence

On implementation head `9058d09b16f3e3f0d55aaf4853dea08ce00fe483`, CI #760 established before this documentation synchronization:

- knowledge, deployment, CSS ownership and architecture checks passed;
- lint and typecheck passed;
- unit/static RLS tests passed;
- production build passed;
- fresh Supabase reset and pgTAP passed;
- expense-path browser smoke passed;
- cross-device UI audit was still running when this packet was updated.

Because this packet update changes the PR head, CI #760 is supporting evidence rather than final exact-head evidence. A new exact-head run is required.

### Evidence limits

- The standard Playwright workflow runs in demo mode and proves regression safety, not the authenticated Supabase Inbox RPC end to end.
- Authenticated atomicity, ownership, duplicate and transfer behavior are proven at the database/RPC layer.
- After approved production migration, a synthetic authenticated candidate must be dry-run and approved in production before acceptance.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-01 | researcher/planner | implementer | implementing | #53, #182, original packet and repository reconnaissance | SQL/application shape unverified | implement migration and tests on branch |
| 2026-08-01 | implementer | CI/evaluator | evaluating | PR #183, migrations, RPCs, application integration | CI #750 failures | use artifacts to fix real blockers |
| 2026-08-01 | evaluator | implementer | implementing | CI #750 artifacts | stale emitter test and pgTAP plan mismatch | remove temporary artifacts and correct plan |
| 2026-08-01 | implementer | evaluator | evaluating | implementation head `9058d09...`, passing static/unit/build/database evidence | final exact-head CI and authenticated production smoke pending | synchronize packet/PR, run final CI, request owner review |

### Current permission boundary

- Granted: branch writes on `agent/import-provenance-dry-run` and read-only inspection of CI/provider state.
- Forbidden: direct `main` writes, merge, production DDL/data, provider configuration and unrelated feature work.
- Human approval required before merge, production migration, deployment acceptance or scope expansion.
- Stop if the work requires guessing historical provenance, weakening ledger/RLS invariants or introducing another service/framework.

## Evaluation

### Current assessment

- Correctness: database atomicity, idempotency, duplicate classification and transfer neutrality are covered.
- Security: tenant ownership is enforced below the UI; provenance has own-row RLS.
- Maintainability: provenance has an explicit module and mappings; temporary codemod infrastructure has been removed.
- Scope: no reconciliation system, rules engine, AI, dependency or provider write was added.
- UX: existing review flow is retained; no visual redesign is claimed.

### Remaining gates

1. Final exact-head CI after packet and PR body synchronization.
2. Review final changed-file list for accidental scope.
3. Human owner review and merge decision.
4. Separately approved production migration with rollback preparation.
5. Authenticated production smoke proving one candidate link, one transaction and one provenance row; retry must create no duplicate.

## Rollout

No production migration has been applied.

After owner-approved merge:

1. confirm backup/rollback readiness;
2. apply the exact merged migration;
3. create one synthetic authenticated candidate;
4. run server dry-run;
5. approve it once and verify candidate, transaction, entries and provenance;
6. approve it again and verify idempotency;
7. inspect runtime/database errors;
8. record exact deployment evidence before moving this packet to `docs/plans/completed/`.
