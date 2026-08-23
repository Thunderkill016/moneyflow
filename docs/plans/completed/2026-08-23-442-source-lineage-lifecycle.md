# #442 — Explicit source lineage and lifecycle evidence

**Status:** completed
**Execution state:** merged
**Change class:** Class 3 — financial import/provenance boundary
**Parent:** #432 P1 Acquisition Foundation
**Active role:** none
**Permission scope:** completed branch work only; no provider, production-data or deployment action occurred
**Branch:** `feat/442-source-lineage-lifecycle`
**PR:** #445
**Base at implementation start:** `main@99257178ff416e5b1c875f62aea05035824ca9a5`
**Squash merge:** `e0b30350c1e819237ce769a9d5af40cc2d0324c0`
**Final reviewed head:** `631386482cea3261d53567e709ae7b765fa53976`
**Owner:** human owner
**Completed:** 2026-08-23

## Outcome

MoneyFlow now preserves explicit source-supplied lifecycle and predecessor/replacement identity across different source transaction IDs without fuzzy lineage and without treating source state as ledger truth. A reviewed replacement observation links to the existing financial transaction while leaving ledger, entries, reconciliation, deletion state and canonical provenance unchanged.

## Shipped behavior

- Candidate observations can carry nullable `source_lifecycle_state` and `source_predecessor_external_id` evidence.
- Different-ID lineage exists only when predecessor identity is supplied explicitly by the source contract; amount/date/merchant/fingerprint similarity never creates lineage.
- Exact source identity resolves through durable approved candidate observations first, then canonical provenance.
- Same-ID revised observations compare against the latest safe reviewed observation baseline rather than remaining perpetually “changed”.
- A live explicit predecessor returns hard `source_predecessor_match`; a deleted predecessor remains hard-blocked and is not silently restored.
- `record_source_replacement_observation_from_candidate(...)` can preserve a reviewed replacement observation against the same transaction without changing ledger/reconciliation/canonical provenance.
- One `(user, source, source_external_id)` cannot be reviewed into two different financial transactions.
- Browser callers cannot fabricate approved observation evidence; observation-only linkage creates no financial mutation audit event.
- Archive/export/restore understands the source-lineage schema generation while retaining the proven legacy ingress scanner and historical archive compatibility.

## Research basis

Three official references were used for the bounded design decision:

1. Plaid transaction-state documentation: pending→posted may use a new ID with explicit predecessor identity and details may change.
2. Plaid Transactions Sync: source updates are ordered added/modified/removed observations behind a cursor.
3. Open Banking UK Transactions v3.1.5: transaction identity/status semantics vary by source; status may change without a universal ID replacement model.

Applicability limit: these references informed provider-neutral lifecycle semantics only. #442 selected no provider and implemented no cursor/token/webhook/consent contract.

## Accepted invariants

- Canonical `transaction_import_provenance` remains the original identity anchor and is not rewritten to the replacement ID.
- Source lifecycle evidence does not automatically mutate MoneyFlow clearing/reconciliation state.
- User-owned financial facts and corrections remain stronger than source observations.
- Heuristic duplicate override cannot bypass exact or explicit source-identity decisions.
- Approved source observations remain durable/immutable except documented archive/FK cleanup behavior.
- Tenant/source boundaries remain database-enforced.

## Key implementation areas

- `supabase/migrations/20260822094500_source_lineage_lifecycle.sql`
- source-observation precedence/compatibility migrations and pgTAP coverage
- `src/lib/inbox/provenance.ts`
- `src/app/actions/inbox-approval.ts`
- `src/components/inbox/inbox-review-panel.tsx`
- source-lineage archive validator/ingress compatibility path
- archive producer acceptance harness and restore coverage

## Counterexamples proved

- explicit predecessor match to the existing owned live transaction;
- no different-ID lineage when predecessor metadata is absent;
- wrong-source/foreign/missing predecessor rejection;
- replacement-ID replay deduplicates to the same transaction;
- changed-after-review same-ID evidence uses the latest reviewed baseline;
- conflicting source-ID binding is rejected;
- deleted predecessor is not silently restored;
- replacement observation leaves ledger/reconciliation/provenance unchanged;
- no financial mutation audit event is fabricated;
- archive/restore and import-batch cleanup remain compatible.

## Verification

Exact final head `631386482cea3261d53567e709ae7b765fa53976` passed:

- CI #2839 — success;
- policy/knowledge/migration identity — success;
- static quality, lint and typecheck — success;
- unit tests + static RLS — success;
- production build + presentation ownership — success;
- fresh Supabase reset + full pgTAP — success;
- archive producer round trip — success;
- archive restore round trip — success;
- Browser smoke, including authenticated ownership — success;
- Cross-device UI audit — success;
- aggregate `verify` and `e2e` — success;
- CodeQL #1897 — success;
- Secret history #1897 — success.

The final acceptance run occurred after the compatibility-test and archive-harness corrections, so earlier failing heads are historical diagnostics only.

## Delivery record

- Issue: #442 — completed by merged PR #445.
- PR: #445 — merged 2026-08-23.
- Squash commit: `e0b30350c1e819237ce769a9d5af40cc2d0324c0`.
- Runtime/provider deployment: not applicable; no provider or production write occurred.
- Rollback: revert PR #445 to return to #441 same-ID observation behavior while preserving #444 plan-authority governance.

## Deferred boundary

The next P1 decision is **source lifecycle → ledger/reconciliation policy**: define when `pending/posted/removed/modified` source evidence may affect MoneyFlow clearing, completeness and reconciliation state without silently becoming ledger truth. That work requires a fresh-main authority pass and its own bounded issue/spec/packet; this completed packet does not authorize it.
