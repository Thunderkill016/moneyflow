# Preserve import parse lineage

**Status:** implemented; database runtime verification pending  
**Owner:** Codex  
**Issue/PR:** Issue #53, import provenance/reconciliation sequence B  
**Last updated:** 2026-07-28

## Outcome

Every candidate created from an imported statement keeps enough immutable parse
lineage to identify the exact source row and the parser/mapping contract that
produced it. Existing browser and database batches continue to load without
data loss.

## Repository reconnaissance

### Current behavior

- CSV, XLSX, and PDF parsers produce `ParsedCsvRow.rowIndex`.
- Import drafts and preview tables retain and display that row index.
- `toCsvCandidateInputs` drops the row index when confirmed rows become Inbox
  candidates, so post-import review cannot trace a candidate to its source row.
- Import batches retain source/file/map metadata but no parser or mapping
  version, so later parser changes cannot be distinguished from old results.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/inbox/parse-csv.ts` | Shared parsed-row to candidate boundary | Preserve row index |
| `src/lib/inbox/candidate-store.ts` | Candidate domain and browser persistence | Add validated immutable lineage |
| `src/lib/inbox/import-batch-store.ts` | Batch domain and browser persistence | Add version metadata and legacy hydration |
| `src/lib/inbox/inbox-map.ts` | Supabase/domain mapping and migration | Round-trip lineage |
| `src/app/actions/inbox.ts` | Server input validation and selected columns | Accept/read new fields |
| `src/server/inbox.ts` | Authenticated Inbox reads | Select new fields |
| `supabase/migrations` | Durable authenticated storage | Add constrained columns |

### Existing tests and constraints

- Related unit tests: parser, candidate store, batch store, and Inbox mapping.
- Database/RLS tests: `schema_and_rls.test.sql` plus static migration checks.
- Browser tests: existing import flows cover confirmation; no visible UI change
  is required for this metadata-only slice.
- Product/architecture rules: integer money, own-row RLS, no guessed financial
  data, backward-compatible local-first demo behavior.

### Similar implementation and recent history

- Existing pattern to reuse: domain validators plus pure Supabase row mappers.
- Relevant issue/PR/decision: Issue #53 sequence A is already represented by
  permanent database invariant tests; sequence B calls for import provenance.

### Open questions

- [x] Can the current `source` field safely namespace external transaction IDs?
      No. It identifies file format, not a bank/provider.
- [x] Should the current fuzzy fingerprint be made unique or persisted now?
      No. It is derived from mutable fields and the issue explicitly forbids
      treating a fuzzy fingerprint as a unique key.

## Research

Not required for this slice. This repairs an internal data-flow loss and uses
the provenance requirements already accepted in Issue #53.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add all provenance fields at once | Broad schema coverage | Fake external-ID namespace, stale fingerprints, non-atomic approval link | Reject |
| Preserve row lineage and batch versions first | Coherent, testable, backward compatible | Does not yet link approval to ledger | Selected |
| Store row index only in raw text | No schema change | Not queryable or reliably structured | Reject |

### Research decision

Add structured `source_row_index` to candidates and `parser_version` /
`mapping_version` to batches. New versions are explicit and bounded. Existing
records hydrate as `legacy-v1`. External IDs, durable matching evidence,
candidate-to-transaction linkage, and dry-run status remain separate slices
because each needs its own correctness contract.

## Specification

### Problem

People reviewing an imported candidate after confirmation cannot determine
which statement row produced it. Maintainers also cannot tell which parser and
mapping behavior produced an old batch, making reconciliation and parser
upgrades unsafe.

### User stories

- As a person reviewing an import, I can trace a candidate back to its source
  row so that I can reconcile it with the statement.
- As a maintainer, I can identify the parser and mapping version for a batch so
  that parser changes remain auditable.
- As an existing demo user, my previously stored batches still load after the
  metadata contract changes.

### Acceptance criteria

- [x] CSV, XLSX, and PDF candidate inputs preserve the parsed source row index.
- [x] Candidate browser persistence and Supabase mapping round-trip a valid
      source row index.
- [x] New batches receive explicit parser and mapping versions.
- [x] Legacy browser batches hydrate as `legacy-v1` instead of being deleted.
- [ ] Existing database batches remain readable through migration defaults
      (implemented; fresh database replay unavailable locally).
- [ ] Invalid row indices or version strings are rejected at domain/server/DB
      boundaries.
- [x] Existing ownership/RLS behavior remains unchanged.

### Required states

- Loading: unchanged.
- Empty: unchanged.
- Populated: provenance is retained without new visual noise.
- Validation/error: reject non-integer/out-of-range row indices and empty or
  oversized versions.
- Recovery/undo: existing rows survive rollback as unused extra metadata; the
  migration is additive.
- Long data / large VND: money behavior is unchanged; row index is capped at
  the existing one-million-row import limit.
- Mobile/tablet/desktop: no layout change.
- Accessibility: no interaction or semantic change.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: new columns inherit the existing own-row table
  policies; no policy broadening.

### Out of scope

- UI/brand redesign.
- External transaction IDs until a bank/provider namespace exists.
- Durable fingerprint lifecycle and match reason/confidence.
- Atomic candidate approval and financial-transaction linkage.
- Server-side import dry-run states.

## Implementation plan

### Architecture fit

The parser owns source row production, candidate/batch stores own validated
domain persistence, Inbox mappers own server serialization, and an additive
migration owns durable authenticated storage. No UI component should recreate
or infer provenance.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| Parser and candidate domain | Carry and validate `sourceRowIndex` | Close preview-to-Inbox data loss |
| Batch domain | Default versions and hydrate legacy data | Auditable parser evolution without data loss |
| Inbox mappings/actions/server | Select, validate, insert, and map new fields | Preserve local/authenticated parity |
| Supabase migration/tests | Add constrained columns and pgTAP assertions | Durable schema contract |

### Data and migration impact

- Schema/migration: additive nullable candidate row index; non-null batch
  versions with `legacy-v1` defaults and bounded checks.
- Backfill: existing batches receive `legacy-v1`; existing candidates keep a
  null row index because reconstructing it would be guessed data.
- Compatibility: old browser batches normalize to the same legacy versions.
- Rollback: application code can ignore added columns; removing populated
  columns would be destructive and is not automated.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Old browser batch fails stricter validation and gets deleted | Pure legacy normalization test |
| Row index is lost during local-to-server migration | Mapper payload test |
| Invalid or huge source row reaches DB | Domain, Zod, and SQL checks |
| Batch version differs across file formats | Source-specific default tests |
| Migration changes RLS | Existing policy assertions and static RLS check |

### Verification plan

- Static: lint, typecheck, architecture, knowledge, CSS ownership, build, RLS.
- Unit/domain: parser, candidate store, batch legacy hydration, row mappers.
- Database: pgTAP schema assertions when a local database runner is available.
- Browser flow: existing import E2E regression suite if environment permits.
- Responsive/visual: not applicable; no visible change.
- Production/manual: no deployment in this task.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Lock lineage behavior with failing tests | Reconnaissance | Focused red tests | done |
| T2 | Add migration and database assertions | T1 | SQL/static checks green; pgTAP pending | implemented |
| T3 | Implement domain and server round-trip | T1, T2 | Focused green tests | done |
| T4 | Run repository-wide verification | T3 | Gate results | done |
| T5 | Audit acceptance criteria and remaining roadmap | T4 | Evaluation table | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| CSV/XLSX/PDF row lineage | Parser tests compare candidate row to parsed row | pass |
| Candidate validation and mapping | Candidate store and Inbox mapper tests | pass |
| New batch versions | Batch source/version tests | pass |
| Legacy browser compatibility | Pure normalization test and storage integration path | pass |
| Existing RLS unchanged | Static RLS migration suite | pass |
| Database column constraints | Migration and 86-assertion pgTAP contract | runtime pending |
| Unit/domain suite | 577 passed | pass |
| Browser regression suite | 8 desktop/mobile tests passed | pass |
| Static/build gates | lint, typecheck, knowledge, architecture, CSS ownership, static RLS, 43-route build | pass |

### Review findings

- Correctness: row lineage is immutable after creation and round-trips through
  local-to-server migration. Existing candidates are not assigned guessed row
  numbers.
- Security/ownership: no policies, grants, or table ownership changed; new
  columns remain under existing own-row RLS.
- UI/UX/accessibility: no visible behavior planned.
- Maintainability/duplication: parser/mapping versions default at the batch
  domain boundary; UI call sites do not duplicate version selection.
- Scope compliance: external IDs, fuzzy matching, approval linkage, and
  dry-run state remain explicitly out of scope.

### Remaining limitations

- Runtime pgTAP cannot run on the current machine until Docker or a compatible
  local PostgreSQL/Supabase runner is available.
- The next correctness slice should make candidate approval and ledger creation
  one atomic database operation before adding a transaction linkage column.

## Delivery record

- Branch: `feat/import-provenance-foundation`
- PR:
- Squash commit:
- CI run:
- Production deployment:
- Production flow verified:
- Work packet moved to `docs/plans/completed/`:
