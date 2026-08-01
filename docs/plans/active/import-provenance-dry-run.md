# Atomic Inbox approval with import provenance and server dry-run

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** AI agent; human owner controls merge, production migration and acceptance  
**Issue/PR:** #182 / #183  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Authenticated Inbox approval is implemented as one atomic database operation. The server classifies a pending candidate, creates the ledger transaction and entries, stores an immutable provenance snapshot, links the candidate to the transaction and marks it approved. A failure cannot leave the ledger written while Inbox still reports the candidate as pending. Demo mode remains local.

The branch is ready for human review. It has not been merged and no production migration or provider write has occurred.

## Repository reconnaissance

### Original defect

Authenticated Inbox approval previously used two separate writes:

1. create a transaction or transfer;
2. update the Inbox candidate to `approved`.

The UI explicitly handled the inconsistent outcome `Đã ghi sổ nhưng chưa cập nhật được trạng thái Inbox.` The database also lacked durable candidate-to-transaction linkage and did not retain source row, source external ID, parser/mapping versions or server match evidence.

### Existing capabilities retained

MoneyFlow already had CSV/XLSX/PDF/paste parsing, preview, bounded raw snippets, client duplicate/transfer suggestions, persisted batches/candidates, manual review, integer VND and balanced-transfer invariants. This slice does not replace those systems or redesign the Inbox.

### Authorities after this slice

| Area | Authority |
|---|---|
| Mutable review queue | `inbox_candidates`, `import_batches` |
| Immutable approved-import lineage | `transaction_import_provenance` |
| Ledger facts | `financial_transactions`, `transaction_entries` |
| Server classification | `plan_inbox_candidate` |
| Atomic commit | `approve_inbox_candidate` |
| TypeScript provenance contract | `src/lib/inbox/provenance.ts` |
| Domain/Supabase mapping | `src/lib/inbox/inbox-map.ts` |
| Authenticated application boundary | `src/app/actions/inbox-approval.ts` |
| Transaction integration | `src/hooks/use-transactions.ts` |

## Research

### Research scope and source selection

Decision question: what is the smallest server-side import contract that preserves lineage and prevents partial Inbox approval without turning MoneyFlow into a generic importer platform?

Selected focused references:

| Source | Authority/type | Decision used | Limit |
|---|---|---|---|
| `actualbudget/actual` and official import/reconciliation material | Primary finance-product source | retain import identity, review duplicates before commit, keep reconciliation separate | local-first sync architecture was not copied |
| `firefly-iii/data-importer` and official importer material | Primary importer source | parse/convert/validate/preview before commit and retain mapping context | standalone importer breadth and AGPL code were not copied |
| Supabase/PostgreSQL guidance recorded in #53 | Primary platform guidance | tenant ownership below UI, narrow `SECURITY DEFINER`, database invariants | production operations remain separately approved |

### Decision

- Use a separate one-to-one provenance table rather than polluting all ledger transactions with import-only fields.
- Make a real external source ID unique only within tenant and source when present.
- Keep heuristic fingerprints versioned and indexed, but never unique.
- Classify on the server before commit.
- Commit candidate, transaction, entries and provenance in one database transaction.
- Keep statement reconciliation, imported-update policy and persisted rules outside this PR.

### Adoption review

No dependency, provider, service or runtime framework was added. The change uses existing PostgreSQL, Supabase RPC/RLS, Zod, Server Actions and current UI flow.

## Specification

### User stories

- Approving one Inbox item either completes fully or changes nothing.
- Retrying an approval does not create a duplicate transaction.
- An imported transaction can be traced to its candidate, batch, source identity and parser/mapping versions.
- A reviewer can distinguish `would_create`, `duplicate`, `suspected_transfer` and `invalid` before commit.
- A heuristic duplicate can be approved only after an explicit human confirmation; an exact external-ID duplicate cannot be overridden.

### Acceptance criteria

- [x] Authenticated approval creates, links and approves atomically at the database boundary.
- [x] Repeated approval returns the existing linked transaction without another ledger write.
- [x] Cross-tenant candidate/account/category references are rejected below the UI.
- [x] `transaction_import_provenance` is one-to-one with a tenant-owned transaction.
- [x] Source row, raw description, parser/mapping version and fingerprint version survive approval when supplied.
- [x] External-ID duplicates are explicit and cannot be overridden.
- [x] Fingerprint matches are classified while fingerprints remain non-unique evidence.
- [x] A heuristic duplicate requires an explicit review checkbox before override reaches the RPC.
- [x] Suspected transfers cannot be silently posted as income or expense.
- [x] Missing mappings can be intentionally resolved during money or transfer review.
- [x] Other invalid server classifications remain blocked.
- [x] Authenticated candidate posting uses the atomic action; demo remains local.
- [x] The authenticated path does not perform a second candidate-approval write after the atomic RPC.
- [x] Knowledge, architecture, lint, typecheck, unit/static RLS, build, fresh migration replay, pgTAP and browser gates pass on the implementation head.
- [ ] Human owner reviews the final diff and evidence.
- [ ] Production migration and deployment are separately approved and verified.

### Required states

- Existing loading, empty and populated Inbox states remain.
- Server failures leave candidate and ledger unchanged.
- Approval retry is idempotent.
- Existing safe-integer and bounded-string limits remain.
- Existing notices surface server errors.
- Bulk approval never silently opts into low-confidence or heuristic-duplicate overrides.

### Financial and security constraints

- VND remains integer đồng.
- Transfers create exactly two opposite entries and do not count as income or expense.
- `auth.uid()` is the tenant authority inside RPCs.
- The client never supplies `user_id` or an approved transaction ID.
- Only a caller-owned pending candidate may be approved.
- `SECURITY DEFINER` functions pin an empty search path and have narrow grants.
- No production DDL/data, provider configuration or secret was changed.

### Out of scope

- Statement date/balance and pending/cleared/reconciled state.
- Reconciliation sessions.
- Imported update/merge policy (`would_update`).
- Persisted rules or AI categorization.
- Bank sync, OCR expansion or background workers.
- Direct CSV UX redesign.
- Guessing historical candidate-to-transaction links.

## Implementation plan

### Database

- Added versioned candidate and batch provenance columns.
- Added one-to-one `transaction_import_provenance` with own-row RLS.
- Added partial tenant/source uniqueness for non-null external IDs.
- Added a versioned, non-unique server fingerprint and protected trigger.
- Added `plan_inbox_candidate` with four bounded outcomes.
- Added row-locked, idempotent `approve_inbox_candidate`.
- Added a follow-up guard migration so reviewed missing mappings resolve consistently for money and transfer, while unknown invalid states are rejected.
- Added schema, invariant, security-definer and review-resolution pgTAP coverage.

### Application

- Added typed provenance and dry-run parsing.
- Added authenticated dry-run and atomic approval Server Actions.
- Preserved candidate IDs in create-only transaction contracts.
- Routed authenticated Inbox money/transfer posting through atomic approval.
- Round-tripped source row, external ID and parser/mapping versions through client, actions, mappings and server reads.
- Added an explicit heuristic-duplicate confirmation control; automatic duplicate detection never enables the override by itself.
- Forwarded the reviewed override through transaction contracts and hooks to the RPC.
- Prevented authenticated approval status from being written a second time after the atomic RPC; the client reloads/accepts server-owned status instead.
- Kept demo approval local.

### Tests

- Provenance parsing/default tests.
- Candidate/batch mapping and migration tests.
- Review tests proving duplicate override defaults false and becomes true only after explicit review.
- 39-assertion import provenance invariant suite.
- Dedicated reviewed-invalid-transfer resolution suite with balanced-entry assertions.
- Existing static RLS, browser smoke and cross-device UI audit.

### Data and migration impact

- Existing rows receive nullable lineage fields; no provenance is invented.
- Existing approved candidates remain unlinked.
- Historical candidates may retain null version/fingerprint fields.
- New authenticated candidates receive explicit parser/mapping defaults when omitted.
- Before production adoption, rollback may remove the new functions/table/columns. After production provenance exists, rollback must be a forward migration that preserves lineage.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Candidate approved twice | row lock, approved link and idempotency pgTAP |
| Ledger succeeds but Inbox remains pending | single RPC transaction |
| Client performs another approval mutation | authenticated approved state is read back from server, not rewritten |
| Fingerprint collision blocks valid data | fingerprint is non-unique; explicit reviewed override |
| Automatic warning silently enables override | separate `allowHeuristicDuplicate`, default false |
| Exact external ID is overridden | RPC always rejects `source_external_id_match` |
| Missing mapping reviewed as transfer retains `invalid` provenance | follow-up RPC guard and dedicated pgTAP suite |
| Unknown invalid plan reaches ledger | `candidate_invalid` guard |
| Cross-tenant reference | ownership checks and forged-tenant pgTAP |
| Transfer counted as income/expense | suspected-transfer guard and two balanced entries |
| Historical provenance is guessed | nullable backfill and explicit scope boundary |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | Add migration schema and RPC contracts | done | migrations and fresh replay |
| T2 | Add schema, tenant, classification and atomicity pgTAP | done | database CI |
| T3 | Extend provenance contracts and mappings | done | mapping/provenance unit tests |
| T4 | Add server dry-run and atomic approval action | done | action, RPC mapping and build |
| T5 | Route authenticated Inbox posting through atomic action | done | transaction contracts and hook |
| T6 | Remove temporary codemod artifacts | done | temporary files removed |
| T7 | Independently evaluate application and RPC edge cases | done | duplicate override, redundant mutation and invalid-transfer fixes |
| T8 | Run implementation-head CI | done | CI #770 on `c70b2b2...` |
| T9 | Run exact-head CI after this evidence-only packet update | in progress | current PR synchronization run |
| T10 | Human merge and production rollout decision | blocked on T9 and owner review | owner-only |

## Verification evidence

### Diagnostic history

- Earlier CI exposed temporary codemod residue and a pgTAP plan mismatch; both were corrected.
- Evaluation then found three application-contract gaps not exposed by the original green run:
  1. the heuristic duplicate override existed in SQL but was hardcoded false in the application;
  2. the UI still attempted a second candidate-status persistence after atomic approval;
  3. an invalid candidate resolved as transfer could retain `invalid` provenance.
- All three were corrected with focused code and tests before handoff.

### Implementation-head evidence

CI #770 on implementation head `c70b2b2c9bf67aa466845d60234f18e24718eff1` passed:

- project knowledge contract;
- deployment, CSS ownership and architecture contracts;
- lint and typecheck;
- unit tests and static RLS checks;
- production build;
- fresh Supabase reset and all pgTAP suites;
- expense-path browser smoke;
- production cross-device UI audit;
- Playwright evidence upload.

This packet update changes documentation only. Its exact-head CI must remain green before the owner merge decision.

### Evidence limits

- The standard browser workflow runs in demo mode and proves UI regression safety, not authenticated Supabase approval end to end.
- Authenticated atomicity, ownership, duplicate behavior, review resolution and transfer neutrality are proven at the database/RPC layer.
- Production acceptance still requires one synthetic authenticated dry-run/approval/idempotency smoke after an approved migration.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-01 | researcher/planner | implementer | implementing | #53, #182 and repository reconnaissance | SQL/application shape unverified | implement on branch |
| 2026-08-01 | implementer | CI/evaluator | evaluating | migrations, RPCs and application integration | temporary artifacts and test mismatch | use CI diagnostics |
| 2026-08-01 | evaluator | implementer | implementing | CI artifacts | real blockers identified | correct branch only |
| 2026-08-01 | implementer | evaluator | evaluating | passing initial implementation CI | application edge cases remained | independent review |
| 2026-08-01 | evaluator | human owner | ready_for_review | CI #770, final changed-file review and this packet | production migration and authenticated smoke not run | review diff; decide merge |

### Current permission boundary

- Granted: branch writes on `agent/import-provenance-dry-run` and read-only inspection of CI/provider state.
- Forbidden: direct `main` writes, merge, production DDL/data, provider configuration and unrelated feature work.
- Human approval is required before merge, production migration, deployment acceptance or scope expansion.
- Stop if work would require guessing historical provenance, weakening ledger/RLS invariants or introducing another service/framework.

## Evaluation

### Current assessment

- **Correctness:** atomicity, idempotency, duplicate classification, explicit heuristic override, invalid-state guarding and transfer neutrality are covered.
- **Security:** tenant ownership is enforced below UI; provenance has own-row RLS; protected functions use narrow grants.
- **Maintainability:** provenance has an explicit module and mapping owner; temporary patch infrastructure is gone; corrective migration is isolated.
- **Scope:** no reconciliation system, rules engine, AI, new dependency or provider write was added.
- **UX:** existing review flow remains; heuristic override now requires clear human confirmation.

### Merge recommendation

Ready for owner review after the documentation-only exact-head CI completes successfully. Do not merge if the final run differs from the recorded head, if any required check is not green, or if the owner has not reviewed the migration and rollback boundary.

### Remaining gates

1. Exact-head CI for this packet synchronization.
2. Human review of the 21-file final diff and migration ordering.
3. Owner-controlled merge.
4. Separately approved production migration with rollback preparation.
5. Authenticated production smoke proving one candidate link, one transaction and one provenance row; retry creates no duplicate.

## Rollout

No production migration has been applied.

After owner-approved merge:

1. confirm backup and rollback readiness;
2. apply the exact merged migrations in order;
3. create one synthetic authenticated candidate;
4. run server dry-run;
5. approve once and verify candidate, transaction, entries and provenance;
6. approve again and verify idempotency;
7. inspect runtime/database errors;
8. record exact deployment evidence;
9. only then move this packet to `docs/plans/completed/` and close #182.
