# #442 — Explicit source lineage and lifecycle evidence

**Status:** active  
**Execution state:** implementing  
**Change class:** Class 3 — financial import/provenance boundary  
**Parent:** #432 P1 Acquisition Foundation  
**Active role:** implementer / evaluator  
**Permission scope:** focused `branch_write` only; no provider, production-data, deployment or main writes  
**Branch:** `feat/442-source-lineage-lifecycle`  
**PR:** pending  
**Base:** `main@6123d263c60fba98bd67b5c935a7179477ad7fcb`  
**Owner:** human owner  
**Last updated:** 2026-08-22

## Outcome

MoneyFlow can preserve explicit source-supplied lifecycle and predecessor/replacement identity across different source transaction IDs without fuzzy lineage and without treating source state as ledger truth. A reviewed replacement observation links to the existing financial transaction while leaving ledger, reconciliation, deletion state and canonical provenance unchanged.

## Repository reconnaissance

### Current behavior

- #441 is merged. Same-ID changed evidence is reviewable and durable without ledger overwrite.
- `transaction_import_provenance` remains one canonical row per financial transaction and uniquely anchors its original `(user_id, source, source_external_id)` when present.
- `inbox_candidates` persists each observation, is archive-covered, becomes immutable once approved, and can link multiple observations to one transaction through `approved_transaction_id`.
- `plan_inbox_candidate()` currently resolves exact source identity only through canonical provenance. It therefore cannot recognize a reviewed replacement ID as a later exact identity, and it compares repeated source revisions to the canonical fingerprint rather than the latest reviewed observation.
- There is no provider cursor/token/consent implementation or authorization.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/20260801084523_import_provenance_and_atomic_approval.sql` | canonical provenance + candidate fingerprint/identity | reuse invariants |
| `supabase/migrations/20260821184500_source_observation_precedence.sql` | exact-ID planning + changed observation RPC | extend carefully |
| `supabase/migrations/20260821190000_source_observation_guard_compat.sql` | approved evidence immutability | preserve |
| `src/lib/inbox/provenance.ts` | candidate wire metadata + dry-run reasons | extend |
| `src/app/actions/inbox-approval.ts` | authenticated reviewed operations | extend |
| `src/components/inbox/inbox-review-panel.tsx` | explicit hard-source review choices | extend minimally |
| archive/restore migrations/tests | durability/lifecycle compatibility | must remain green |

### Existing tests and constraints

- pgTAP covers exact source precedence, replay, tenant boundaries, changed observation resolution, archive restore and import-batch cleanup.
- `p_allow_heuristic_duplicate` may never bypass an exact or explicit source-identity decision.
- Browser role may insert ordinary pending/rejected candidates but may not fabricate approved observations.
- Approved observations are immutable except documented FK/archive shapes.
- Financial mutation audit records financial changes only; observation-only lineage must not fabricate audit events.

## Research

### Research scope and source selection

- Decision question: how should a provider-independent acquisition model represent pending/posted and different-ID replacement without assuming every source has the same identity lifecycle?
- Source budget: three focused official sources.
- Expected decision: separate source lifecycle metadata from explicit predecessor identity and from ledger/reconciliation state.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Plaid Transaction states | official provider docs | 2026-08-22 | pending→posted may remove old ID and add new ID with `pending_transaction_id`; details can change | design reference only; provider not selected |
| Plaid Transactions Sync | official provider docs | 2026-08-22 | source updates are added/modified/removed patches applied in order behind a cursor | cursor implementation deferred |
| Open Banking UK Transactions v3.1.5 | official standard docs | 2026-08-22 | transaction ID may be immutable while status changes between Pending/Booked | shows identity/state behavior varies by source |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| mutate canonical provenance ID from pending→posted | simple exact lookup | rewrites original source evidence; loses canonical anchor | reject |
| add a second source-identity table now | explicit aliases | duplicates ownership/archive/RLS surface before needed | defer unless candidate history proves insufficient |
| use approved candidates as durable identity observations | reuses archive/immutability/linkage already proven | needs consistency enforcement + exact-ID resolver | selected |
| infer replacement from amount/date/merchant/fingerprint | no adapter metadata required | false merges; violates exact-source precedence | reject |

### Research decision

Add nullable source-neutral lifecycle/predecessor metadata to candidates. A different-ID relationship exists only when predecessor identity is explicitly supplied. Exact-source resolution should use the latest durable approved observation for that source ID, falling back to canonical provenance only when no reviewed observation exists. This allows a reviewed replacement ID to become durable identity evidence without changing canonical provenance or creating another identity store.

Open Banking/Plaid semantics are not copied wholesale: source lifecycle is evidence, not MoneyFlow reconciliation truth.

### Adoption review

Not applicable. No provider, dependency or external service is added.

## Specification

### Planning precedence

For a pending candidate:

1. resolve current `(user, source, source_external_id)` through durable approved candidate observations first, then canonical provenance;
2. if exact identity resolves, compare fingerprint/version to the latest approved observation for that ID (or canonical provenance fallback) and return existing hard same-ID unchanged/changed/deleted reasons;
3. only if the current ID is not already resolved, and `source_predecessor_external_id` is explicitly present, resolve that predecessor through the same identity resolver;
4. live predecessor → hard `source_predecessor_match` with matched transaction;
5. deleted predecessor → hard `source_predecessor_deleted_match` with no restore path in this slice;
6. no predecessor metadata → no different-ID lineage inference; continue existing fingerprint/transfer/manual-match planning.

### Candidate lifecycle metadata

Add nullable source-neutral fields:

- `source_lifecycle_state`: `pending | posted | removed | null`;
- `source_predecessor_external_id`: optional source external ID supplied by the adapter/source contract.

Rules:

- manual candidates cannot carry predecessor identity;
- predecessor requires a non-null current `source_external_id` and must differ from it;
- lifecycle metadata remains observation evidence only;
- existing import/file paths remain backward-compatible with null lifecycle metadata.

### Reviewed replacement resolution

`record_source_replacement_observation_from_candidate(candidate_id, transaction_id)` must:

- authenticate and lock the candidate;
- require pending non-manual candidate, current source ID and explicit different predecessor ID;
- require plan `source_predecessor_match` for the reviewed live target;
- reject if current source ID is already durably linked to another transaction;
- mark only the candidate approved/linked with a replacement-specific match reason;
- leave transaction, entries, reconciliation, deletion state and canonical provenance unchanged;
- create no financial mutation audit event;
- be replay-idempotent for the same candidate/target.

### Identity consistency

Approved source observations must never make the same `(user, source, source_external_id)` point to two transactions. Enforce this at the server/database boundary without preventing repeated observations of the same ID linked to the same transaction.

### UX

- `source_predecessor_match` is a hard source identity decision; ordinary “Duyệt vào sổ” and heuristic override stay blocked.
- explicit reviewed action: **“Ghi nhận giao dịch thay thế”**;
- copy states that the source explicitly links the new source ID to an earlier source transaction and MoneyFlow will preserve the new source observation without changing ledger/reconciliation values;
- deleted predecessor is informational/hard-blocked with no restore shortcut;
- demo mode makes no server-lineage claim.

### Out of scope

Provider selection/integration, cursor/webhook/consent storage, fuzzy successor inference, automatic source removal effects, pending→cleared MoneyFlow reconciliation mutation, ledger overwrite, broad Inbox redesign, provider/production writes.

## Implementation plan

1. Reconcile #441 merge truth; archive #440 and promote #442 on the board.
2. Add pgTAP counterexamples first for replacement identity, exact-ID replay after replacement/revision, conflict and tenant/deleted cases.
3. Add nullable lifecycle/predecessor metadata and validation.
4. Add a source-identity resolver that prefers latest approved observation then canonical provenance.
5. Extend planning with hard predecessor reasons while preserving current precedence.
6. Add reviewed replacement RPC and identity-consistency enforcement.
7. Extend TypeScript provenance mapping, server action, user message and review panel CTA.
8. Cover archive/restore, batch cleanup, browser forgery guard and hard-source override compatibility.
9. Update migration identity/SECURITY DEFINER inventories and run exact-head Class 3 CI + CodeQL + secret scan.

Rollback: revert the #442 PR. #441 same-ID source-observation behavior remains the merged baseline.

## Risks and counterexamples

| Risk | Prevention/test |
|---|---|
| fuzzy different-ID false merge | predecessor required explicitly; no similarity inference |
| replacement ID later creates duplicate ledger fact | exact resolver recognizes approved observation ID |
| same source ID links to two transactions | DB/RPC consistency guard + pgTAP |
| repeated changed revision stays perpetually changed | exact comparison uses latest reviewed observation |
| deleted predecessor silently resurrects | distinct hard deleted reason, no action |
| source lifecycle mutates reconciliation accidentally | snapshot ledger/reconciliation/provenance before/after |
| archive/restore broken by new metadata | round-trip DB coverage + exact-head archive gates |

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| 442.1 | reconcile merged #441 + packet/board | #441 merge | docs + issue/branch | implementing |
| 442.2 | write database counterexamples | 442.1 | pgTAP tests | todo |
| 442.3 | lifecycle/predecessor schema + identity resolver | 442.2 | migration | todo |
| 442.4 | predecessor planning + replacement RPC | 442.3 | pgTAP | todo |
| 442.5 | TS/server/UI reviewed path | 442.4 | unit/static/UI | todo |
| 442.6 | archive/security compatibility evaluation | 442.4 | database/security | todo |
| 442.7 | exact-head Class 3 verification | all | CI/CodeQL/secret | todo |
| 442.8 | owner merge handoff | 442.7 | PR summary | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-22 | researcher/planner | implementer | implementing | issue #442, official Plaid + Open Banking evidence, branch | implementation/tests not yet proven | write DB counterexamples then migration |

### Current permission boundary

- Granted scope: focused branch writes for #442.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: provider, production data, deployment, `main` direct writes.
- Human approval required before: merge, provider/production actions.
- Stop condition: implementation requires fuzzy lineage, ledger overwrite, provider assumptions or a second identity store without proving candidate history insufficient.

## Evaluation

Pending exact-head implementation evidence.

## Delivery record

- Branch: `feat/442-source-lineage-lifecycle`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge
