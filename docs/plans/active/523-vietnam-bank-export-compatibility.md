# #523 — Vietnam bank-export compatibility matrix and fixtures

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** ThunderK
**Issue/PR:** GitHub #523 / Linear MON-61
**Last updated:** 2026-09-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is the first bounded M1 slice. PR #545 selected this packet and was owner-merged to `main` as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`. Implementation is branch-scoped on `feat/523-vietnam-bank-export-contract`; no production DB/Auth/provider write is authorized.

## Outcome

MoneyFlow can describe and test the first production-oriented compatibility contract for Vietnamese bank exports without inventing provider semantics or bypassing the existing candidate/provenance/matching/ledger/reconciliation path. Phase A targets Vietcombank, ACB and VietinBank with an evidence-tagged compatibility matrix, privacy-safe synthetic evidence fixtures, deterministic parser-normalization/source-identity rules and calm guidance for supported or still-unverified export artifacts.

## Repository reconnaissance

### Current behavior

- `/imports/direct` is CSV-only with client-side mapping/dry-run and authenticated all-or-nothing commit through the existing provenance boundary.
- `src/lib/inbox/parse-csv.ts` owns generic date/amount/description/debit/credit heuristics and integer-VND parsing; it has no provider transaction-reference/source-ID contract.
- `src/lib/inbox/parse-xlsx.ts` reads XLS/XLSX with SheetJS and reuses `parseStatementFromMatrix`; no parallel spreadsheet parser is needed.
- `src/lib/inbox/direct-csv-import.ts` intentionally has no `sourceExternalId`; preview fingerprints are not persisted source identity.
- DB source-lineage already supports explicit `source_external_id` when source evidence actually supplies a stable ID; source lifecycle evidence cannot silently mutate ledger truth.
- Existing statement fixtures are generic/demo and do not prove VCB/ACB/VietinBank compatibility.

### Relevant repository areas

| Area | Decision |
|---|---|
| `src/lib/inbox/parse-csv.ts` | reuse canonical generic normalization; do not hard-code guessed bank headers |
| `src/lib/inbox/parse-xlsx.ts` | reuse extraction path; no second XLSX parser |
| `src/lib/inbox/direct-csv-import.ts` | preserve preview-only fingerprint and no invented source identity |
| `src/lib/inbox/fixtures/` | add privacy-safe evidence fixtures; add synthetic statement rows only after layout evidence exists |
| `docs/research/` | own evidence-tagged compatibility matrix and source limits |
| `supabase/migrations/20260822094500_source_lineage_lifecycle.sql` | preserve explicit source-identity law; no migration in Phase A |

### Existing tests and constraints

- Related unit tests: `parse-csv.test.ts`, `parse-xlsx.test.ts`, `direct-csv-import.test.ts` and provenance/detection/review suites.
- No DB contract change is planned; existing pgTAP/RLS tests remain the lower-level safety net.
- Product/architecture invariants: integer VND, no guessed financial/source semantics, one mutation owner, provider/parser cannot become a second financial truth.

### Open questions

- [ ] Exact downloadable consumer-account headers for VCB/ACB/VietinBank.
- [ ] Whether any target export exposes a provider-stable transaction identifier rather than a row/display/export-local reference.
- [ ] Exact pending/posted/reversed/removed representation in downloadable artifacts.
- [ ] Fee, FX, direction and overlapping-range semantics per artifact/version.

## Research

### Decision question

What can MoneyFlow safely encode for VCB/ACB/VietinBank compatibility today without inventing an export schema or stable provider identity?

### First-party sources refreshed 2026-09-04

| Provider/source | What it establishes | What it does **not** establish |
|---|---|---|
| Vietcombank VCB Digibank history guide — `https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsd-ib/pages/vi/tinh-nang-giao-dich-ngan-hang/tai-khoan/3-lich-su-giao-dich.html` and user guide PDF | account transaction history supports **Xuất excel**; UI material shows transaction date/system date/reference/amount concepts | exact exported Excel headers, stable reference semantics, status/fee/overlap contract |
| ACB store-management page/guide — `https://acb.com.vn/giai-phap-quan-ly-cua-hang` and `https://acb.com.vn/acbwebsite/files/ACB_HDSD_Quanlycuahang.pdf` | supported ACB ONE flow can download transaction history/statement as Excel; store-management material says Excel separates store/recipient information | universal consumer-account Excel layout, exact headers, stable transaction ID |
| ACB online-account FAQ — `https://acb.com.vn/thu-vien/nhung-cau-hoi-thuong-gap-khi-tao-tai-khoan-ngan-hang-online` | ACB ONE history has states `đã thực hiện`, `chờ xử lý`, `đặt lịch` | whether those states are exported in statement files or map directly to ledger/source lifecycle |
| VietinBank current card terms/guides under `https://www.vietinbank.vn/assets/` | current card products provide statements/history and iPay access; statement concepts include posted activity, fees and posting-date language in current material | consumer-account downloadable file format, headers, source-stable reference semantics |

### Research decision

Observed facts: VCB and ACB have first-party evidence for Excel export in supported flows. VietinBank has current first-party evidence for statements/history but not enough evidence for a target consumer-account export file format. None of the reviewed sources proves an exact current export-header schema plus a provider-stable transaction identifier across the target flows.

Product decision: Phase A records `confirmed`, `observed-but-unverified`, or `unknown` evidence. It **does not** add bank-specific auto-mapping from guessed headers and **does not** create `source_external_id` from row numbers, UI/display references, generated hashes or MoneyFlow fingerprints. Exact-layout adapters remain disabled until stronger first-party or privacy-safe real-export structural evidence exists.

### Alternatives rejected

- Guess bank headers from screenshots/search snippets — rejected: false compatibility and silent financial misclassification.
- Treat a displayed reference as source-stable identity — rejected: stability across exports/ranges is unproven.
- Create provider-specific ledger posting paths — rejected: second financial truth and provenance bypass.
- Add native/Open Banking connectivity now — rejected: outside Phase A and requires separate provider/security/economics authorization.

### Adoption review

No new dependency, provider service or runtime architecture. Existing SheetJS path remains the spreadsheet owner.

## Specification

### Problem

MoneyFlow parses generic CSV/XLSX, but it cannot truthfully claim current bank-specific VCB/ACB/VietinBank layouts or stable source identity. The first M1 slice must make support and uncertainty explicit before deeper parser automation.

### Acceptance criteria

- [ ] Compatibility matrix covers all three banks with artifact type, evidence level, layout/header evidence, date/timezone, currency, direction, status, transaction reference, fee and overlap/dedupe semantics; unsupported facts remain unknown.
- [ ] Privacy-safe evidence fixtures exist for all three providers; synthetic statement rows exist only when source-backed layout structure exists. No real customer/account/reference data is committed.
- [ ] Pure normalization/source-identity contract exposes provider evidence without creating a second import/ledger authority.
- [ ] `source_external_id` is derivable only from a non-empty, **confirmed source-stable** provider reference; display-only/export-local/unknown references fail closed.
- [ ] Existing generic CSV/XLSX parsing and Direct CSV behavior remain backward compatible.
- [ ] User-facing guidance never claims live bank sync or unsupported automatic mapping.

### Required states

- Unknown/unsupported layout: explain what is confirmed and direct user to generic/manual mapping; never fabricate support.
- Supported artifact but unverified layout: allow existing generic import path only; require review.
- Ambiguous amount/date/status/reference: remain uncertain/reviewable or fail closed.
- Recovery, VND integer, mobile and accessibility contracts remain unchanged unless UI work is added.

### Financial and security constraints

- No guessed amount/date/status/ownership/provider identity.
- File content never establishes tenant ownership; viewer/RLS remains authoritative.
- Provider-specific code cannot write financial tables directly.
- No credentials, customer exports or real account identifiers in repository fixtures.

### Out of scope

Bank credentials/screen scraping/browser automation/Open Banking; broad redesign; automatic reconciliation-state mutation from source lifecycle; wallet/card expansion beyond the three-bank contract; production DB/Auth/provider mutation.

## Implementation plan

### Architecture fit

Add a small pure compatibility/evidence module in `src/lib/inbox/` plus evidence fixtures and tests. It describes support and source-identity eligibility but does not alter `parse-csv.ts`, `parse-xlsx.ts` or commit ownership unless later evidence justifies an adapter. Generic parsing remains the only executable parser for unverified layouts.

### Planned changes

| File/area | Change |
|---|---|
| `docs/research/VIETNAM_BANK_EXPORT_COMPATIBILITY_2026.md` | evidence-tagged VCB/ACB/VietinBank matrix |
| `src/lib/inbox/bank-export-compatibility.ts` | pure provider/evidence/source-ID contract + guidance |
| `src/lib/inbox/bank-export-compatibility.test.ts` | counterexamples and fixture contract tests |
| `src/lib/inbox/fixtures/*-export-evidence.fixture.json` | synthetic evidence fixtures with no real transaction/customer data |
| active packet / PR memory | durable implementation/evaluation truth |

### Data and migration impact

No schema/migration/backfill. Rollback is a normal code/docs revert. Existing generic parsers must remain unchanged in this first implementation checkpoint.

### Risks and counterexamples

| Risk | Prevention/test |
|---|---|
| UI/display reference mistaken for stable source ID | confirmed+source-stable gate test |
| row index/hash promoted to source identity | explicit rejection tests |
| provider changes export layout | no auto-layout claim without confirmed evidence/version |
| ACB store flow generalized to personal accounts | scope field + guidance/test keeps it bounded |
| VietinBank history mistaken for export-format proof | artifact format stays unknown |
| real data leaks into fixtures | fixtures contain evidence metadata only; no real rows/accounts/references |

### Verification plan

- Focused unit test for compatibility/source-ID contract.
- Existing `parse-csv`, `parse-xlsx`, direct import/provenance tests via CI.
- `npm run lint`, `npm run typecheck`, `npm run build` on implementation PR.
- No DB/provider gate unless scope changes.
- Browser/responsive gate only if T4 changes UI; otherwise guidance is contract/docs only at this checkpoint.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Select #523 as M1 Phase A authority and reconcile durable memory | owner M1 selection | #545 merged; main CI #3283 + CodeQL/Secret #2315 green | done |
| T2 | Build evidence-tagged VCB/ACB/VietinBank compatibility matrix | T1 | first-party source table with explicit unknowns | in_progress |
| T3 | Add privacy-safe evidence fixtures + normalization/source-ID contract tests | T2 | focused unit tests + exact-head CI | in_progress |
| T4 | Add minimal user guidance for supported/unknown export artifacts | T2/T3 | targeted UI/browser evidence if UI changes | todo |
| T5 | Evaluate full Phase A against architecture/provenance/dedupe constraints | T2–T4 | exact-head CI/CodeQL/secret + review record | todo |
| T6 | Owner-controlled merge/deploy verification and same-PR lifecycle closeout | T5 | owner authorization + post-merge evidence | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-03 | human_owner | researcher | discovery | owner selected M1; #523/MON-61 | exact export schemas unresolved | research + packet |
| 2026-09-03 | researcher | planner | specified | repository reconnaissance + first-party sources | field-level export semantics unresolved | selector PR |
| 2026-09-03 | human_owner | implementer | implementing | #545 merged as `2ac2026c...`; merged-main CI #3283, CodeQL/Secret #2315 green; branch `feat/523-vietnam-bank-export-contract` | exact headers/stable IDs remain unproven | implement T2/T3 without guessed layouts |

### Current permission boundary

Allowed: research + branch/PR writes for #523 in `Thunderkill016/moneyflow`. Forbidden: direct `main`, merge without owner authorization, production DB/Auth/provider/Vercel writes, external bank-account access, customer data. Stop if implementation needs an unproven provider layout or broader production/provider permission.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| #523 is current merged authority | `PLAN_AUTHORITY.current` selected by #545 on `main@2ac2026c...` | pass |
| merged-main selector gates | CI #3283 + CodeQL/Secret #2315 | pass |
| matrix/fixtures/source-ID contract | implementation branch | pending |

### Research and adoption evidence

First-party sources were refreshed on 2026-09-04. VCB/ACB Excel availability is supportable only at the stated scope; exact headers and stable reference semantics remain unverified. No dependency adoption is needed.

### Review findings

Pending implementation evaluation. The main counterexample is a display/export-local identifier that looks unique but is not proven stable across overlapping exports.

### Remaining limitations

No claim of live sync, universal bank/version coverage, exact current exported headers or stable provider transaction IDs without stronger source evidence.

## Delivery record

- Base: `main@2ac2026c3d5a27898b17482b36f503a32a3dd4f6`
- Branch: `feat/523-vietnam-bank-export-contract`
- PR: pending
- CI: pending implementation exact head
- Production/provider mutation: none authorized or required for T2/T3
- Lifecycle: packet remains active; same implementation PR must project closeout before owner merge if it completes #523.
