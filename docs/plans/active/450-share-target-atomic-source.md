# #450 — PWA Share Target atomic acquisition source

**Status:** implementing
**Execution state:** active
**Change class:** Class 3 — financial acquisition / persistence boundary
**Parent:** #432 P1 Acquisition Foundation
**Active role:** planner / implementer
**Permission scope:** branch_write only; no merge, provider, deployment or production-data action
**Owner:** human owner
**Issue/PR:** #450 / PR pending
**Base at implementation start:** `main@9e709a2116a560da673539a3ff3994928b22262b`
**Last updated:** 2026-08-24

## Outcome

Migrate the existing installed-PWA Web Share Target path through the same deterministic candidate/provenance/reconciliation architecture as the rest of #432 P1. Authenticated shared text and CSV from one share action must persist through one bounded atomic server/database ingestion boundary, remain Inbox evidence until review, and never write directly to the ledger.

Demo mode remains explicitly browser-local.

## Repository reconnaissance

Fresh `main@9e709a2116a560da673539a3ff3994928b22262b` is the exact squash merge of PR #449. The Current Work Board still carries `Post-merge projection: PR #449`, but the resolver contract treats that as an activated `post-merge-projection` when the projection number matches the HEAD merge subject, the projected board was changed by that HEAD, and no current agent-executable slice remains. #432 therefore remains the active master and its next allowed child is one real file/share source.

Existing Share Target path:

1. `src/app/api/share-target/route.ts` accepts bounded `multipart/form-data`, limits total/file/text size and bridges a validated text representation into `sessionStorage` before `/capture/share`.
2. `src/lib/inbox/share-payload.ts` parses shared title/text/url plus text/CSV files into candidate drafts and CSV plans. Binary XLSX/PDF is deliberately rejected from this path.
3. `src/components/inbox/capture-share-page.tsx` consumes that plan in the browser.
4. Demo uses the local Inbox stores.
5. Authenticated mode currently persists text candidates with `createInboxCandidatesAction`; each CSV file separately creates an import batch, inserts candidates, then marks the batch committed. These are separate browser-orchestrated server mutations.
6. The path does not auto-approve candidates and therefore does not directly mutate ledger facts — that boundary is correct and must remain.

Existing contracts to reuse:

- candidate/import-batch provenance mapping in `src/lib/inbox/inbox-map.ts` and `src/lib/inbox/provenance.ts`;
- authenticated RLS/tenant ownership for `import_batches` and `inbox_candidates`;
- exact source identity / fallback fingerprint / review planning from the merged #435→#449 chain;
- source lifecycle review from #449: only reviewed exact `posted` evidence may establish `cleared`; never `reconciled` or overwrite ledger economics;
- import rate limiting and existing Share Target request-size/file-type guards.

## Research

Decision question: how should an installed PWA persist a received share without turning untrusted source material into partial or authoritative financial state?

Primary platform references checked on 2026-08-24:

- MDN Web App Manifest `share_target`: a receiving installed PWA declares a share target; files require `POST` with `multipart/form-data`; incoming shared material must be treated as untrusted input and validated.
- web.dev receive shared files: the standard file-share pattern is a `POST` multipart share target handled by the installed PWA.

MoneyFlow already performs bounded request parsing at the bridge. This slice therefore does not broaden accepted formats or move financial parsing into the route. The useful improvement is after deterministic parsing: make persistence of one authenticated share action transactional and source-inspectable while retaining review-before-ledger.

## Specification

### Accepted acquisition boundary

For authenticated mode, one share action is one atomic persistence request. It may contain:

- one optional shared-text batch (`source = paste`) with zero or more parsed text candidates;
- zero or more CSV batches (`source = csv`), each with its own parser metadata and row-indexed candidates.

All batch and candidate rows for that share action commit or roll back together. The browser must not orchestrate authenticated create-batch → create-candidates → mark-committed loops.

### Provenance and identity

- Reuse existing `import_batches` / `inbox_candidates`; no second source model.
- Persist parser/mapping versions already produced by MoneyFlow's deterministic parsers.
- Preserve bounded raw snippet and CSV source row index.
- Do not fabricate `source_external_id` where the shared source does not provide one.
- Existing database fingerprint/source identity rules remain authoritative for later review/dedup/replay.
- A `paste` batch gives shared text an inspectable source/batch owner without making it a ledger fact.

### Financial/reconciliation boundary

- Ingestion creates only pending Inbox evidence.
- No financial transaction, entry or `transaction_import_provenance` row is created by the Share Target ingestion call.
- Review remains the only path from candidate evidence to financial truth.
- #449 remains the only source-lifecycle→clearing policy: reviewed exact `posted` evidence may advance eligible `pending → cleared`; source evidence never establishes `reconciled`, deletes/demotes facts or overwrites user/statement truth.

### Failure/security boundary

- Authenticated identity derives from `auth.uid()` / `requireViewer`; browser-supplied tenant IDs are never trusted.
- Database operation is one transaction and fails closed on any invalid/foreign batch/candidate relation.
- SECURITY DEFINER, if used, pins an empty/search-path-safe environment and is denied to `PUBLIC`/`anon` with only the required authenticated execute grant.
- No raw share body is logged or copied into project memory.
- Existing POST body/file limits and unsupported-format behavior remain unchanged.

## Implementation plan

1. Promote #450 against exact merged #449 main truth and keep one active child.
2. Add a narrow transactional database RPC for a bounded array of prepared Share Target batches/candidates, reusing current tables and tenant constraints.
3. Add a server action that validates the planned Share Target payload, derives server-owned provenance versions/IDs, invokes the RPC once and returns only safe IDs/counts.
4. Route authenticated `CaptureSharePage` through that one action; keep demo local.
5. Add pure mapping tests plus pgTAP counterexamples for mixed text+CSV success, late invalid-row rollback, tenant isolation, provenance/source identity and no-ledger-write behavior.
6. Add/update browser/static coverage proving review-before-ledger and one authenticated ingestion boundary.
7. Run independent adversarial review and exact-head Class 3 gates.
8. Before owner handoff, perform same-PR lifecycle convergence: archive this packet, clear current work, project memory with this PR number, and do not pre-promote the next child.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Resolve fresh-main authority and choose one real source | main #449 merge + resolver source + Current Work | done |
| T2 | Reconcile existing Share Target implementation and failure modes | route/parser/client/action review | done |
| T3 | Validate platform share-target constraints | MDN + web.dev | done |
| T4 | Promote #450 packet/board/memory | repo governance artifacts | in_progress |
| T5 | Implement atomic authenticated source persistence | migration + server action + client wiring | pending |
| T6 | Prove atomicity/ownership/provenance/no-ledger-write | pgTAP + unit/static tests | pending |
| T7 | Exercise browser Share Target / Inbox review flow | browser evidence | pending |
| T8 | Independent adversarial evaluation | review findings + fixes | pending |
| T9 | Same-PR lifecycle convergence | packet archive + board/memory projection | pending |
| T10 | Exact-head Class 3 verification | CI/database/browser/UI/CodeQL/Secret History | pending |

## Evaluation

Required counterexamples before handoff:

- mixed shared text + multiple CSV files persist all artifacts or none;
- an invalid final candidate cannot leave earlier batch/candidate rows from the same share action;
- unauthenticated/other-tenant callers cannot create or bind rows for another tenant;
- text candidates have a durable `paste` batch and CSV rows retain their own batch + source row index;
- no source external ID is invented;
- parser/mapping versions and bounded raw snippets survive persistence;
- ingestion creates zero ledger transactions/entries/provenance and leaves candidates pending;
- replay/dedup remains governed by existing review/source identity rules rather than a Share Target special case;
- demo continues to work locally without claiming server atomicity;
- XLSX/PDF binary Share Target and oversized/unsupported payload behavior remain fail-closed.

No exact-head verification claim may survive a later branch mutation.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-24 | owner | planner/implementer | implementing | user instruction; merged #449; issue #450; exact-main branch | code/tests not implemented | promote #450, then implement bounded slice |

## Current permission boundary

Allowed: issue/branch/PR tracking for #450; branch-local documentation, migration, application and test changes required by this slice; read-only web/GitHub/provider research; exact-head CI/evaluation.

Forbidden: merge without a fresh owner decision; direct `main` write; provider/deployment/production-data writes; secrets/credentials; bank/e-wallet integration; native Android listener; binary XLSX/PDF Share Target expansion; automatic candidate approval; fuzzy lineage; source-driven `reconciled`; transfer lifecycle expansion; starting the next #432 child before #450 converges.