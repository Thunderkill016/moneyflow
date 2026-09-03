# #523 — Vietnam bank-export compatibility matrix and fixtures

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** ThunderK
**Issue/PR:** GitHub #523 / Linear MON-61
**Last updated:** 2026-09-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is the first bounded M1 slice. The selector PR changes planning authority only; runtime implementation starts only after owner merge and fresh plan resolution/doctor.

## Outcome

MoneyFlow can describe and test the first production-oriented compatibility contract for Vietnamese bank exports without inventing provider semantics or bypassing the existing candidate/provenance/matching/ledger/reconciliation path. Phase A targets Vietcombank, ACB and VietinBank with an evidence-tagged compatibility matrix, privacy-safe synthetic fixtures, deterministic parser-normalization expectations and calm user guidance for supported export artifacts.

## Repository reconnaissance

### Current behavior

- `/imports/direct` is CSV-only and provides client-side map/dry-run plus an authenticated all-or-nothing commit through the existing acquisition/provenance boundary.
- `src/lib/inbox/parse-csv.ts` provides generic date/amount/description/debit/credit heuristics, integer-VND parsing, uncertainty and transfer hints. It does not expose a provider transaction reference or source external ID.
- `src/lib/inbox/parse-xlsx.ts` reads XLS/XLSX with SheetJS, first sheet by default, then reuses the same generic matrix parser.
- `src/lib/inbox/direct-csv-import.ts` deliberately does not invent `sourceExternalId`; preview fingerprints are not persisted source identity.
- Production DB source-lineage contracts already support explicit `source_external_id`, lifecycle state and predecessor identity when source evidence actually supplies them. Source lifecycle is evidence only and cannot mutate ledger truth automatically.
- Existing fixtures are generic/demo artifacts only: `sample-bank.csv`, `sample-bank.xlsx`, `sample-generic.csv`, `sample-mf-demo-bank.pdf`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/inbox/parse-csv.ts` | canonical generic matrix normalization | reuse; extend only through evidence-backed adapters/contracts |
| `src/lib/inbox/parse-xlsx.ts` | existing Excel extraction | reuse; avoid a parallel spreadsheet parser |
| `src/lib/inbox/direct-csv-import.ts` | conservative preview/dedupe planning | reuse; do not turn preview fingerprints into source identity |
| `src/app/actions/direct-csv-import.ts` | authenticated all-or-nothing commit boundary | reuse later; no Phase A provider write |
| `src/lib/inbox/fixtures/` | current structural fixture home | add privacy-safe bank-specific synthetic fixtures |
| `supabase/migrations/20260822094500_source_lineage_lifecycle.sql` | durable explicit source identity/lifecycle law | preserve; map only proven stable source IDs later |
| `docs/product/PRINCIPLES.md` | ledger truth and explicit uncertainty | preserve |

### Existing tests and constraints

- Related unit tests: `parse-csv.test.ts`, `parse-xlsx.test.ts`, `direct-csv-import.test.ts`, provenance/detection/review tests.
- Database/RLS tests: source identity, provenance, direct CSV preparation/approval and cross-tenant contracts already exist; no DB change is planned in Phase A.
- Browser tests: direct-import and authenticated ownership smoke exist; implementation PR must rerun browser coverage if user flow changes.
- Product/architecture rules: integer VND; no guessed dates/balances/source semantics; one mutation owner; provider/parser never becomes a second financial truth.

### Similar implementation and recent history

- Existing pattern to reuse: generic CSV/XLSX → candidate evidence → deterministic planning/rules/dedupe → authenticated approval RPC → ledger/provenance.
- Relevant issue/PR/decision: #432/#433 long-term Vietnam strategy; #523 is the owner-selected M1 Phase A slice; #536/M0 is completed and `PLAN_AUTHORITY.current` is null on the pre-selector main baseline.

### Open questions

- [ ] What exact downloadable artifact types and field headers are produced today for consumer transaction-history exports by each target bank?
- [ ] Which target exports expose a stable provider transaction identifier rather than row number, display reference or export-local identifier?
- [ ] How are pending/posted/removed/reversed transactions represented, if at all, in downloadable artifacts?
- [ ] How are fees, foreign-currency transactions and debit/credit direction represented per artifact/version?
- [ ] What overlap behavior occurs when users export intersecting date ranges?

## Research

### Research scope and source selection

- Decision question: what can MoneyFlow safely claim and encode for VCB/ACB/VietinBank export compatibility before seeing validated real export structures?
- Reference map consulted: not required; this decision is governed by first-party bank documentation plus current repository contracts.
- Source budget: three focused first-party bank sources, one per target bank.
- Expected decision or uncertainty to resolve: prove export/statement availability where public evidence permits, and explicitly retain unknown field-level semantics rather than guessing.

### Questions researched

1. Does the bank expose transaction history/statement retrieval or export through its official digital channel?
2. Does public first-party material establish file type or enough layout information to build a structural fixture?
3. Does public material establish transaction status/reference semantics strongly enough to map source identity?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Vietcombank VCB Digibank user guide — `https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsdib/hdsd.pdf` | first-party user guide | 2026-09-03 | VCB Digibank includes account transaction-history and statement workflows | public material reviewed does not establish a complete current downloadable-file column schema or stable reference semantics |
| ACB ONE store-management guide — `https://acb.com.vn/acbwebsite/files/ACB_HDSD_Quanlycuahang.pdf` | first-party user guide | 2026-09-03 | ACB documents downloading transaction history in Excel for the supported flow; details are intended for reconciliation | this flow is store-management specific and cannot be treated as proof that every consumer-account export has identical columns |
| VietinBank current card user guide — `https://www.vietinbank.vn/assets/1149f1b0-3f81-436a-9041-87430eaa02e4` | first-party user guide | 2026-09-03 | VietinBank documents statement delivery/reading for current card products and iPay access | this source does not establish a consumer-account export file format, headers or stable source ID; those remain unresolved |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Hard-code guessed bank headers from screenshots/search snippets | fast apparent coverage | false compatibility, silent financial misclassification | reject |
| Build separate provider-specific ledger import paths | simple local adapters | creates second financial truth and bypasses provenance/review | reject |
| Evidence-tagged compatibility matrix + synthetic fixtures + shared normalization contract | honest uncertainty, testable, reuses existing boundary | requires incremental source research/real-export validation | selected |
| Native/Open Banking/provider credential integration in Phase A | potentially less user effort | high privacy/provider/operational scope; unsupported by current evidence | defer to separately authorized later slice |

### Research decision

Observed facts: generic CSV/XLSX normalization and durable provenance/source-lineage machinery already exist in MoneyFlow; ACB first-party material explicitly supports an Excel transaction-history export in at least one current flow; Vietcombank and VietinBank first-party material confirms statement/history capabilities but the reviewed public sources do not prove a complete current field schema for the target personal-account exports.

Product decision: Phase A records fields as `confirmed`, `observed-but-unverified`, or `unknown`; it never manufactures exact headers/reference semantics. Bank-specific adapters may only normalize evidence they can justify, and all normalized rows continue through shared candidate/provenance/matching/ledger/reconciliation ownership.

Remaining uncertainty: exact artifacts for current VCB/ACB/VietinBank consumer-account exports still need privacy-safe real-export or stronger first-party documentation validation before any field is treated as a stable provider contract.

### Adoption review

Not applicable. Phase A adds no dependency, provider service or new runtime architecture. SheetJS already owns Excel extraction.

## Specification

### Problem

Today MoneyFlow can parse generic CSV/XLSX statements, but users of Vietnamese banks still need manual mapping and cannot know whether provider-specific transaction references, statuses, fees or overlapping exports are preserved safely. Guessing those semantics would damage provenance and dedupe. M1 therefore begins with an explicit evidence-backed compatibility contract before deeper parser implementation.

### User stories

- As a Vietcombank, ACB or VietinBank user, I can see whether my exported statement artifact is supported and what MoneyFlow still needs me to review.
- As a user importing overlapping bank exports, I do not get silent duplicate ledger writes from provider-specific shortcuts.
- As a reviewer, I can distinguish a bank-provided stable transaction identifier from a MoneyFlow heuristic fingerprint or export-local row number.

### Acceptance criteria

- [ ] A compatibility matrix covers Vietcombank, ACB and VietinBank with artifact type, evidence level, layout/header evidence, date/timezone, currency, debit/credit direction, status, transaction reference, fee representation and overlap/dedupe behavior; unsupported facts remain explicitly unknown.
- [ ] Privacy-safe synthetic fixtures exist for each target bank only where structure is supported; no real account holder, account number, transaction reference or private customer data is committed.
- [ ] Parser-normalization contract/tests define canonical row fields plus optional provider evidence without creating a second ledger/import authority.
- [ ] `source_external_id` is populated only when the artifact exposes a source-stable transaction identity backed by evidence; row indexes, generated hashes and display-only references are never promoted to source identity.
- [ ] Ambiguous amount direction/date/status/reference cases fail closed or remain uncertain/reviewable; they are not silently guessed.
- [ ] Existing generic CSV/XLSX fixtures and parsers remain valid.
- [ ] User guidance describes supported export workflow/artifact without collecting bank credentials or claiming live bank sync.

### Required states

- Loading: unchanged unless implementation adds a guidance lookup.
- Empty: unsupported/unknown artifact displays clear guidance rather than fabricated support.
- Populated: parsed rows show source/evidence confidence and existing review state.
- Validation/error: unsupported layout or ambiguous required fields fail closed with actionable export/mapping guidance.
- Recovery/undo: preserve existing batch/review navigation; no blind retry after ambiguous commit response.
- Long data / large VND: integer-safe VND and existing row/file limits remain enforced.
- Mobile/tablet/desktop: no broad redesign; guidance must fit existing import surfaces.
- Accessibility: existing semantic controls and focus behavior remain intact for any changed import UI.

### Financial and security constraints

- No guessed financial data, transaction status, ownership or provider identity.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS: file content or account-holder text never establishes tenant ownership; authenticated viewer/RLS remains authoritative.
- Parser/provider-specific code cannot write financial tables directly.
- Stable source identity must be explicit provider evidence, not a MoneyFlow-derived fingerprint.

### Out of scope

- Direct bank credentials, screen scraping, browser automation, Open Banking or provider API connectivity.
- Broad UI/brand redesign.
- Automatic reconciliation state changes from source lifecycle/status evidence.
- Wallet/card coverage beyond the three-bank Phase A contract.
- Production DB/Auth/provider mutation.

## Implementation plan

### Architecture fit

The existing inbox acquisition boundary owns this work. A thin evidence-aware compatibility layer may identify/normalize known bank-export structures, then must hand a canonical matrix/row shape to the existing CSV/XLSX parser and shared candidate/provenance/matching/approval pipeline. Provider code is an adapter, never mutation authority.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/` | add evidence-tagged Vietnam bank export compatibility matrix | durable source truth and limits |
| `src/lib/inbox/fixtures/` | add privacy-safe synthetic structural fixtures where evidence supports them | regression coverage without customer data |
| `src/lib/inbox/parse-csv*` / focused adapter module | add normalization contract and tests without duplicating parser core | deterministic bank-aware normalization |
| `src/lib/inbox/parse-xlsx*` | reuse extraction; add only structure-selection tests if needed | preserve one matrix parsing path |
| direct import/upload guidance | minimal supported/unknown bank export guidance if required by acceptance | user-visible safe workflow |

### Data and migration impact

- Schema/migration: none planned for Phase A.
- Backfill: none.
- Compatibility: existing generic parser and direct import must remain backward compatible.
- Rollback: revert the implementation PR; no production data migration should be required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Bank changes export headers/version | evidence/version notes; unknown layout fails closed; fixture contract does not imply universal version support |
| Same value/date appears twice legitimately | never use heuristic fingerprint as stable provider identity; preserve shared duplicate review semantics |
| Export row number looks unique | test that row numbers/export-local IDs do not become `source_external_id` |
| Debit/credit or sign convention differs | fixture/contract must encode evidence; ambiguous direction remains reviewable |
| Pending/reversed rows appear | do not post automatically; preserve lifecycle evidence separately from ledger/reconciliation truth |
| Real fixture leaks customer data | only synthetic fixtures in repo; real export validation stays private and structural |

### Verification plan

- Static: `npm run lint`, `npm run typecheck`, `npm run build` for executable implementation PR.
- Unit/domain: focused CSV/XLSX/adapter fixtures + existing import/provenance/dedupe suites.
- Database: no DB gate for Phase A unless implementation changes DB contracts; if it does, reclassify and run fresh reset + pgTAP.
- Browser flow: direct/upload import smoke if guidance or mapping behavior changes; authenticated ownership smoke remains required for changed financial flow.
- Responsive/visual: targeted only if UI guidance changes; no broad visual work.
- Production/manual: after owner merge/deploy, validate supported artifact guidance and one synthetic/private structural flow without exposing customer data.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Select #523 as M1 Phase A authority and reconcile durable memory | owner M1 selection | selector PR + exact-head policy checks | in_progress |
| T2 | Build evidence-tagged VCB/ACB/VietinBank compatibility matrix | T1 | first-party source table with explicit unknowns | todo |
| T3 | Add privacy-safe structural fixtures and normalization contract/tests | T2 | focused fixture/unit tests | todo |
| T4 | Add minimal user guidance for supported/unknown export artifacts | T2/T3 | browser/manual evidence if UI changes | todo |
| T5 | Evaluate full Phase A against architecture/provenance/dedupe constraints | T2–T4 | exact-head CI/CodeQL/secret + review record | todo |
| T6 | Owner-controlled merge/deploy verification and lifecycle closeout | T5 | owner authorization + production evidence + current→null closeout | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-03 | human_owner | researcher | discovery | owner selected M1; #523/MON-61 identified as first slice | exact current export schemas unresolved | inspect repo and first-party sources |
| 2026-09-03 | researcher | planner | specified | repo reconnaissance + 3 first-party source review + this packet | VCB/VietinBank file schemas and stable transaction-ID semantics remain unknown | create selector PR; after owner merge run plan resolver/doctor before implementation |

### Current permission boundary

- Granted scope: M1 planning/research and branch/PR work for #523.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; public first-party bank documentation; Linear MON-50/MON-61.
- Forbidden writes: direct `main`, production database, Supabase Auth/provider settings, Vercel production configuration, external bank accounts/providers.
- Human approval required before: selector PR merge; later implementation merge/deploy; any production/provider mutation.
- Rollback or stop condition: if the selector conflicts with fresh-main authority or research cannot support a claimed provider contract, stop and leave the field unknown rather than infer it.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| selector authority and packet | pending selector PR exact head | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: must be rechecked at evaluation.
- Important source limitations remain respected: exact file headers/reference semantics are not currently claimed for VCB/VietinBank.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending implementation.
- Security/ownership: no runtime/provider write in selector; implementation must preserve viewer/RLS authority.
- UI/UX/accessibility: no selector UI change.
- Maintainability/duplication: shared parser/provenance path selected; parallel ledger path rejected.
- Scope compliance: first three banks only for Phase A.

### Remaining limitations

- Exact current consumer-account export artifacts for all three banks require stronger first-party documentation or privacy-safe real-export structural validation.
- No claim of live bank sync or universal bank/version coverage.

## Delivery record

- Branch: `docs/523-vietnam-bank-export-matrix`
- PR: #545
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable to selector PR
- Production flow verified: not applicable to selector PR
- Work packet moved to `docs/plans/completed/`: no; active only after selector is owner-merged
