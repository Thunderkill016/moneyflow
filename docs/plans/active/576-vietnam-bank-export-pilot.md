# #576 Vietnam bank-export acquisition pilot

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** GitHub #576 / PR pending  
**Last updated:** 2026-09-11

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is scoped specification/evidence only; GitHub #576 and the explicit owner instruction select the work.

## Outcome

A Vietnamese user can inspect a real XLS/XLSX bank export locally, understand what MoneyFlow can and cannot infer from its structure, and explicitly continue into the existing Import Preview → Inbox → ledger path without MoneyFlow inventing bank-specific headers, reference identity or financial semantics. The pilot should make real VCB/ACB evidence safe to collect while preserving the generic acquisition contract.

## Repository reconnaissance

### Current behavior

- `/capture/upload` accepts CSV, XLS/XLSX and PDF and routes parsed rows into Import Preview before Inbox; no upload writes directly to ledger truth.
- `parseXlsxStatement` already uses SheetJS and the generic CSV matrix parser, but `parseStatementFromMatrix` evaluates only the first non-empty worksheet row as the candidate header. Real bank exports may contain title/account/date-range preamble rows before the transaction table.
- `readXlsxSourceEvidence` already provides a strict evidence-only XLS/XLSX path: real binary/container checks, typed cells, number formats, workbook date system and formulas, with no persistence or financial inference.
- `bank-export-compatibility.ts` already records Vietcombank, ACB and VietinBank conservatively. Excel availability is confirmed while exact exported headers and stable identity remain unknown; bank-specific auto-map is disabled.
- Existing source identity guards only persist an external id when the reference is confirmed, source-stable and namespaced by proven source scope.
- Production usage observed read-only on 2026-09-11 is sparse: five auth users, 164 live transactions, one import batch, seven inbox candidates, zero persisted rules and zero reconciliation sessions. This is enough to justify gathering acquisition evidence, not enough to justify richer automation/telemetry infrastructure.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/inbox/capture-upload-page.tsx` | user upload gate before Import Preview | add local XLSX preflight; preserve CSV/PDF flow |
| `src/lib/inbox/parse-xlsx.ts` | generic parser + strict source-evidence reader | reuse, do not weaken strict evidence rules |
| `src/lib/inbox/parse-csv.ts` | generic header mapping and row parsing | reuse mapping confidence; do not add bank-specific guesses |
| `src/lib/inbox/bank-export-compatibility.ts` | current evidence limits per Vietnamese bank | preserve unknowns/auto-map off |
| `src/lib/inbox/source-adapter.ts` | stable identity/date/amount safety contract | preserve; no new source identity in this slice |
| `src/lib/inbox/source-adapter-bridge.ts` | future evidence-aware rows feed existing pipeline | reuse boundary; no second ledger/import pipeline |

### Existing tests and constraints

- Related unit tests: `parse-xlsx.test.ts`, `parse-csv.test.ts`, `bank-export-compatibility.test.ts`, source-adapter tests, import/provenance/review tests.
- Database/RLS tests: existing import atomicity, provenance, tenant isolation and browser-role privilege pgTAP remain authoritative; no DB contract changes in this slice.
- Browser tests: capture/import smoke and risk-selected UI audit through PR CI.
- Product/architecture rules: one neutral acquisition pipeline; evidence is not automatically financial truth; unknown source coverage/semantics are never guessed; no raw personal statement content in repo evidence.

### Similar implementation and recent history

- Existing pattern to reuse: strict `readXlsxSourceEvidence` plus generic parser/Import Preview/Inbox.
- Relevant issue: #576, Plate THU-46. #570 already made import commit/measurement migrations durable in production; this task does not alter them.

### Open questions

- [ ] Exact personal-account exported headers for a current VCB file.
- [ ] Exact personal-account exported headers for a current ACB file.
- [ ] Whether any displayed/exported transaction reference is stable across repeated/overlapping exports.
- [ ] Exact fee-row/fee-column and debit/credit conventions in real files.

These questions require privacy-scrubbed real export evidence; they are not implementation blockers for the structural preflight.

## Research

### Research scope and source selection

- Decision question: can MoneyFlow safely begin a Vietnamese bank-export pilot without a bank-specific adapter or stable-id claim?
- Reference map consulted: current bank-compatibility code and official institution material.
- Source budget: two focused first-party bank sources because the decision is specifically VCB/ACB file availability and source-contract limits.
- Expected decision: confirm that Excel export is real while keeping exact layout/reference semantics unknown until a real sanitized export is inspected.

### Questions researched

1. Does the bank officially support exporting transaction/account history to Excel?
2. Does official documentation establish exact exported headers or a provider-stable transaction identifier?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Vietcombank, official VCB Digibank user guide, `digibankm5.vietcombank.com.vn/.../hdsd.pdf`, transaction-history page | first-party bank documentation | 2026-09-11 | account transaction history can be searched and exported to Excel; UI shows incoming/outgoing activity and a displayed reference | screenshot/UI documentation does not establish the downloaded workbook schema or reference stability across exports |
| ACB, official ACB Online personal Internet Service guide, `online.acb.com.vn/acbib/trogiup/HDSD_IS_KHCN_7_2014.pdf`, p.14 | first-party bank documentation | 2026-09-11 | transaction listing can be exported to Excel; listing can be queried by reference | older ACB Online material and UI wording do not establish the current ACB ONE personal-export workbook contract or stable source identity |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Hard-code VCB/ACB column maps from screenshots/guides | fast-looking demo | fabricates exported schema; can misclassify money/dates | reject |
| Treat visible reference as stable transaction id | stronger dedupe | stability/scope unproven; alias/collision risk | reject |
| Build provider/Open API integration now | potentially lower future maintenance | no usage/economics/contract proof; larger security/ops scope | defer |
| Generic structural XLSX preflight + existing import pipeline | gathers real evidence without bypassing review or inventing semantics | still requires real sanitized files to resolve unknowns | select |

### Research decision

Observed fact: official VCB and ACB documentation support Excel export. Observed limitation: neither source establishes the exact current downloaded workbook header schema or source-stable reference contract required for bank-specific mapping/identity. Product judgment: ship only a generic structural preflight, keep unknowns explicit, and require real sanitized export evidence before any bank-specific adapter behavior.

### Adoption review

Not applicable. The slice reuses the existing SheetJS dependency, parser, evidence reader and import pipeline; no new package, provider, service or architecture pattern is introduced.

## Specification

### Problem

MoneyFlow can already parse Excel statements, but a real Vietnamese bank workbook may include preamble rows before its transaction table. The current generic first-row assumption can produce a poor map or fail even when a valid table exists later. At the same time, official bank documentation is too weak to justify bank-specific auto-mapping or stable transaction identity. A pilot needs to help inspect and proceed safely without converting uncertain source structure into asserted financial truth.

### User stories

- As a user with an exported bank workbook, I can see a privacy-safe structural preflight before MoneyFlow persists an import batch, so I know what it recognized and what remains uncertain.
- As a user with a workbook that contains title/preamble rows, I can still reach Import Preview when a later generic header row is strongly recognizable.
- As the product owner, I can use real sanitized exports to resolve source-contract unknowns without committing transaction content to the repository.

### Acceptance criteria

- [ ] XLS/XLSX is structurally inspected locally before creating a persistent import batch.
- [ ] Preflight output contains structural metadata only: sheet ordinal, used dimensions, candidate header row, generic role map/confidence, numeric/date-like column positions, date system, formula count and fixed unknown categories.
- [ ] Preflight output does not expose/persist sheet name, cell text, amounts, descriptions, account numbers or raw rows as pilot evidence.
- [ ] A high-confidence later generic header can skip leading preamble rows while retaining correct original worksheet row indices for review provenance.
- [ ] Ambiguous/unproven input falls back conservatively; no bank-specific mapping or stable source id is created.
- [ ] The user must explicitly continue from Excel preflight before the existing import batch/draft is created.
- [ ] CSV/PDF and the downstream Import Preview → Inbox → commit contracts remain unchanged.
- [ ] Exact-head risk-selected CI is green.

### Required states

- Loading: existing file-reading state.
- Empty: no preflight before an XLS/XLSX is selected.
- Populated: compact structural report plus explicit unknowns.
- Validation/error: unsupported/corrupt files keep existing safe error behavior; strict-evidence failure is shown as a limitation, not upgraded to bank evidence.
- Recovery/undo: choose another file before persistence; downstream import retains existing recovery/preview behavior.
- Long data / large VND: no amount values are displayed by the preflight; existing upload size limit remains 10 MB.
- Mobile/tablet/desktop: report uses existing capture surface and responsive CSS.
- Accessibility: semantic heading/list/dl and existing buttons; no financial meaning depends on color.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- No schema/RLS/ownership change.
- No bank credentials, provider tokens, raw statements or user financial rows are committed as evidence.
- A displayed/exported reference cannot become `sourceExternalId` without confirmed source-stable evidence and proven namespace.

### Out of scope

- Bank/Open API connectivity or payment initiation.
- Bank-specific auto-map or parser profiles.
- Stable-id claims, fee normalization or overlap-dedupe claims without real evidence.
- New analytics vendor/platform or broad maintenance telemetry.
- Production/provider/database writes.

## Implementation plan

### Architecture fit

The behavior stays inside the existing Inbox acquisition boundary. A new pure `xlsx-pilot` helper composes the existing strict XLSX evidence reader and generic column mapper, then hands accepted parsed rows back to the existing Import Preview/Inbox flow. It does not introduce another persistence path, adapter framework or ledger authority.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/xlsx-pilot.ts` | structural inspection + high-confidence preamble/header scan | support real workbook evidence without bank guesses |
| `src/lib/inbox/xlsx-pilot.test.ts` | synthetic workbook and privacy/ambiguity tests | prove preamble handling and evidence minimization |
| `src/components/inbox/capture-upload-page.tsx` | require Excel preflight/explicit continue before batch persistence | make pilot inspectable and reversible |
| `src/components/inbox/capture-upload-page.module.css` | bounded responsive presentation | keep report readable without design-system change |
| this packet + PR record | research/evidence/provenance | Class 3 delivery requirement |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: CSV/PDF unchanged; Excel continues to use generic parse semantics, with a new local preflight gate and better preamble handling only when a generic header row is high confidence.
- Rollback: revert the helper/UI gate; existing `parseXlsxStatement` path remains intact.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| account/title preamble mistaken for transaction headers | require at least two text cells and high generic map confidence before skipping rows |
| bank-specific semantics accidentally inferred | only generic mapper; explicit unknown list; compatibility auto-map remains false |
| real statement values leak into pilot evidence | inspection type excludes cell text/values/sheet name; unit test serializes inspection and asserts synthetic private values absent |
| malformed text renamed `.xlsx` is treated as evidence | strict evidence reader requires Excel-family binary signature/container marker |
| row provenance changes after skipping preamble | offset parsed row/source-row indices to original worksheet positions |
| UI creates persistence before review | Excel holds parsed rows in component state until explicit continue action |
| existing CSV/PDF behavior regresses | keep those paths using existing parser/persistence flow; browser/unit CI |

### Verification plan

- Static: `check:knowledge`, architecture/deployment contracts, lint, typecheck.
- Unit/domain: all existing tests plus `xlsx-pilot.test.ts`.
- Database: classifier may run; no DB semantic change expected.
- Browser flow: capture/import smoke selected because runtime flow changed.
- Responsive/visual: UI audit selected because a new preflight surface is rendered.
- Production/manual: no production write in this PR; real VCB/ACB sanitized-file validation remains a follow-up evidence step after merge/owner choice.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Reconcile repo pipeline and official VCB/ACB export evidence | none | code + first-party docs | done |
| T2 | Implement privacy-safe XLSX structural preflight | T1 | helper + tests | implementing |
| T3 | Gate Excel import persistence behind explicit preflight continue | T2 | capture upload UI | implementing |
| T4 | Independent evaluation + exact-head CI | T2/T3 | PR jobs + review | todo |
| T5 | Use sanitized real VCB/ACB export to resolve source unknowns | owner-provided/private real evidence | bounded evidence record, no raw statement in repo | todo / follow-up |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-11 | researcher | implementer | implementing | #576, THU-46, official VCB/ACB docs, current parser/source-adapter contracts | real exported headers/stable reference/fees/overlap remain unverified | finish branch implementation and exact-head evaluation |

### Current permission boundary

- Granted scope: branch implementation and PR for #576/THU-46.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; first-party bank documentation read-only.
- Forbidden writes: production database/data, Supabase/Vercel/provider configuration, bank/provider systems, `main`.
- Human approval required before: merge; any production/provider/data write; any bank-specific source contract based on real private financial evidence.
- Rollback or stop condition: stop if implementation requires guessing exported semantics, persisting raw bank content as research evidence, or creating a second financial/import truth path.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Structural preflight before Excel batch persistence | pending exact-head browser/code review | pending |
| Preamble handling remains generic and high-confidence | `xlsx-pilot.test.ts` | pending CI |
| No private cell values in structural inspection | serialized-inspection unit assertion | pending CI |
| No bank-specific map/stable identity | compatibility + adapter guards | pending CI |
| Existing import path green | exact-head CI | pending |

### Research and adoption evidence

- Selected first-party bank sources still support only Excel availability, not exact exported schema/stable identity.
- Source limitations remain explicit in runtime compatibility data and this packet.
- No new dependency/pattern introduced.

### Review findings

- Correctness: pending CI/evaluator.
- Security/ownership: no DB/provider write; preflight minimizes source content exposure.
- UI/UX/accessibility: pending browser/UI audit.
- Maintainability/duplication: new helper composes existing parser/evidence functions rather than adding a second pipeline.
- Scope compliance: pending final diff review.

### Remaining limitations

- Real VCB/ACB export semantics remain intentionally unknown until a privacy-scrubbed real file is inspected.
- The pilot does not prove lower maintenance effort yet; it creates the safe evidence path needed to measure it.

## Delivery record

- Branch: `feat/576-vietnam-bank-export-pilot`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not part of this branch work
- Production flow verified: not applicable pre-merge; no production write
- Work packet moved to `docs/plans/completed/`: pending completion
