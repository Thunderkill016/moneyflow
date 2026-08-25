# #460 Remembered Direct CSV column mappings

**Status:** draft PR open
**Execution state:** local verification complete; exact-head provider verification pending
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #460 / PR #461; branch `feat/p2-direct-csv-mapping-presets`
**Last updated:** 2026-08-25

## Outcome

When a person imports another CSV with the same column-header shape on the same device, they can explicitly reuse a mapping they previously chose. The ordinary mapping screen and dry-run remain visible before the existing explicit import commit, reducing one repeated setup intervention without treating a preset as a financial decision.

## Repository reconnaissance

### Current behavior

- `DirectCsvImportPage` always runs `mapCsvColumns` after reading a file and keeps the result only in component state; it has no mapping-preset lookup or explicit remember action.
- `parseCsvStatement` accepts an explicit `CsvColumnMap`, so an offered preset can reuse the established parser boundary rather than adding a second parser.
- Direct CSV still runs duplicate/transfer planning and the existing demo/authenticated commit paths after the user opens the review dialog.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/inbox/direct-csv-import-page.tsx` | owns upload, mapping, dry-run and explicit commit UI | change narrowly |
| `src/lib/inbox/parse-csv.ts` | owns map type and parse override | reuse unchanged |
| `src/lib/inbox/direct-csv-import.ts` | owns Direct CSV domain tests | reuse test fixture only |
| `src/lib/inbox/import-batch-store.ts` | established browser-local storage style | reuse only the browser-safety pattern |

### Existing tests and constraints

- `src/lib/inbox/direct-csv-import.test.ts` proves direct planning and explicit map parsing.
- No database, RLS, source-evidence or financial contract changes are permitted.
- A preset must not retain CSV rows, filename, raw snippet, account/category selection or monetary data.

### Open questions

- [x] The existing explicit parse-map boundary is enough; no provider-specific CSV contract or external integration is required.

## Research

### Research scope and source selection

- Decision question: can repeated mapping effort be reduced without turning source interpretation into an unreviewed financial action?
- Reference map consulted: `docs/context/README.md`.
- Source budget: two focused first-party sources because this is an internal browser-local interaction, not an external format/provider decision.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `docs/product/PRINCIPLES.md` | product law | 2026-08-25 | acquisition should reduce repeated work, but source material remains reviewable and explainable | does not validate a particular bank format |
| `src/lib/inbox/parse-csv.ts` + `src/components/inbox/direct-csv-import-page.tsx` | current implementation | 2026-08-25 | column maps are already explicit parser input and are lost after each page session | code cannot establish user-cohort effect |

### Research decision

Use one explicit browser-local preset keyed only to a normalized ordered header shape. The product judgment is that reducing a repeated manual mapping is a bounded intervention reduction. The user must opt in to save and opt in to apply; the existing preview/duplicate/transfer/commit flow remains the financial decision boundary. Provider formats, bank sync, automatic approval and automatic row classification do not apply.

### Adoption review

Not applicable: no dependency, provider, service or architecture pattern is added.

## Specification

### Problem

Direct CSV asks a returning user to reconstruct a known column map even when their bank/e-wallet export shape has not changed. Auto-detection is retained, but it cannot preserve user correction for ambiguous/generic headers.

### User stories

- As a returning importer, I can choose a mapping I explicitly remembered for this exact header shape so I do not repeat the same column selection.
- As a cautious importer, I can inspect the remembered mapping and its dry-run before any existing import confirmation.

### Acceptance criteria

- [x] The user can explicitly remember a valid current column map on this device.
- [x] A later CSV with the same normalized ordered headers offers, but does not silently apply, that mapping.
- [x] A different header shape, malformed preset or out-of-range column index falls back to ordinary auto-map.
- [x] Stored data contains only preset version, header-shape key and column-map indices; no row, filename, raw source, account/category or money value is stored.
- [x] No candidate is auto-approved and existing duplicate/transfer/dry-run/commit behavior remains unchanged.

### Required states

- Empty/error upload: no preset read or write.
- Matching map: an explanatory optional action is shown.
- No match/stale map: ordinary auto-map only.
- Storage unavailable: ordinary auto-map only, no blocking error.
- Mobile/tablet/desktop: actions remain in the existing mapping section.
- Accessibility: remembered-map actions have visible Vietnamese labels and are disabled only while the current flow is busy.

### Financial and security constraints

- Money remains integer VND and transfer handling is unchanged.
- Browser-local preference never posts, approves, edits or sources a ledger fact.
- No ownership/RLS surface is introduced; malformed browser storage fails closed.

### Out of scope

- Bank/e-wallet-specific adapters, saved account/category choices, cross-device sync, auto-application, rule changes, source persistence or provider work.

## Implementation plan

### Architecture fit

A small pure preset helper owns header normalization, validation and storage payload construction. The existing Direct CSV page owns browser storage and the deliberate offer/apply UI. `parseCsvStatement` remains the sole parser and receives the selected map as it already does.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/direct-csv-mapping-preset.ts` + test | pure header-shape and safe preset validation | prove mismatch/stale storage cannot apply a map |
| `src/components/inbox/direct-csv-import-page.tsx` | explicit remember and optional reuse actions | reduce repeat mapping work without auto-action |
| `docs/plans/*`, memory, PR record | task lifecycle evidence | keep active authority truthful |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: old/no/malformed browser storage is ignored.
- Rollback: remove the browser-local key and helper; ledger/source data is unaffected.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| a changed export shape maps the wrong column | ordered normalized header key plus index bounds validation; no silent application |
| local storage reveals financial source data | store no rows, filename, values, account/category or raw snippets |
| remembered mapping bypasses review | page still reparses, renders dry-run and uses existing confirmation |
| unavailable storage blocks import | storage errors fall back to existing auto-map |

### Verification plan

- Static/unit: TDD tests for matching, mismatch and malformed presets; lint/typecheck/full unit suite.
- Database: not applicable; no SQL/RLS/schema path changes.
- Browser/responsive: Direct CSV upload → remember → reset/re-upload matching headers → optional apply → dry-run; selected browser/UI audit.
- Production/manual: no deployment claim.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add failing pure preset contract tests | — | expected RED failure | complete |
| T2 | Implement minimal pure preset validation | T1 | focused GREEN unit test | complete |
| T3 | Add explicit page remember/reuse flow | T2 | browser evidence | complete |
| T4 | Independent evaluation and selected gates | T3 | exact-head PR checks | in progress |
| T5 | Same-PR lifecycle convergence | T4 | completed packet + projection | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-25 | planner | implementer | implementing | issue #460, packet and current-code reconnaissance | cohort-level intervention reduction is not yet measured | TDD pure helper |

### Current permission boundary

- Granted scope: focused branch and GitHub issue #460.
- Forbidden writes: provider, production, schema/RLS, ledger/source mutations outside existing import flow, merge and deployment.
- Human approval required before: merge or any scope expansion beyond local mapping reuse.
- Stop condition: any requirement for server persistence, automatic application, account/category recall or provider-specific formats.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Explicit, safe local mapping reuse | focused unit contract: 18/18; browser demo upload → remember → reload → matching-file offer; manual 390×568 screenshot | pass locally |
| No implicit ledger/source action | browser flow remained on existing dry-run; no commit action invoked; map helper stores only version/header shape/index map | pass locally |
| Static/domain/build gates | migration identity, knowledge, CI policy (190), CSS ownership, full pre-push verification (1,113 unit tests and production build) | pass locally |
| Full E2E gate | 120 passed; 4 pre-existing auth CAPTCHA cases could not render a token because the local environment lacks provider configuration | environment-limited, not accepted as green |
| Full UI audit | 503 passed, 141 skipped; 54 WebKit iPhone/Tablet cases fail before app assertions with `WebKit encountered an internal error` at `page.goto` across unrelated routes | browser-runner-limited, not accepted as green |

### Remaining limitations

- This reduces a repeated UI step but does not prove cohort-level maintenance minutes or error-rate impact.
- Local CAPTCHA/Turnstile configuration and the WebKit runner must be healthy in exact-head provider checks before this slice can be accepted.

## Delivery record

- Branch: `feat/p2-direct-csv-mapping-presets`
- PR: #461 (draft; no merge/deployment decision)
