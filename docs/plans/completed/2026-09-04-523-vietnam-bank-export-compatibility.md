# #523 — Vietnam bank-export compatibility matrix and fixtures — completed

**Status:** candidate M1 Phase A completion record; effective only when corrected PR #546 returns to exact-head green and owner-merges
**Issue:** GitHub #523 / Linear MON-61
**Selected by:** PR #545
**Implementation and lifecycle closeout:** PR #546
**Base:** `main@2ac2026c3d5a27898b17482b36f503a32a3dd4f6`
**Completed evidence date:** 2026-09-04; first-party evidence correction 2026-09-05
**Owner:** ThunderK

## Outcome

MoneyFlow has a bounded, evidence-backed compatibility contract for Vietcombank, ACB and VietinBank exports without inventing provider semantics or creating a second financial-truth path. The slice adds an evidence matrix, privacy-safe evidence fixtures, fail-closed source-identity eligibility, conservative Capture guidance and targeted browser coverage. Generic CSV/XLSX parsing, provenance, review, approval and ledger mutation ownership remain unchanged.

This slice deliberately does **not** enable bank-specific auto-mapping. Exact current consumer-export headers and provider-stable transaction identifiers remain unproven for the target flows. After this closeout merges, `PLAN_AUTHORITY.current` is `null`; no follow-on M1 packet is selected in PR #546.

A 2026-09-05 evidence refresh found stronger first-party VietinBank customer-support guidance: iPay Web can retrieve an Excel file with detailed transaction data on the account. That contradicted the prior branch claim that the VietinBank target downloadable artifact family was unknown. PR #546 was therefore moved back to Draft/evaluating and the contract, tests, fixture and research records were corrected before merge. The correction does not change the no-auto-map decision.

## Repository and architecture result

The implementation preserves the existing acquisition boundary:

- `parse-csv.ts` remains the generic matrix-normalization owner;
- `parse-xlsx.ts` continues to extract spreadsheet rows and reuse the shared matrix parser;
- Direct CSV still does not invent `sourceExternalId`, and preview fingerprints remain non-authoritative;
- provider-specific evidence cannot write financial tables or bypass candidate/provenance/review/approval;
- no schema, migration, RLS, Auth, provider or production-data change is part of this slice.

`src/lib/inbox/bank-export-compatibility.ts` adds only a pure compatibility/evidence contract. Bank-specific auto-map requires explicit support plus confirmed artifact and confirmed non-empty header evidence. All three target banks remain disabled because the required layout evidence does not exist yet.

## First-party evidence result

Research was refreshed from first-party bank material through 2026-09-05.

| Provider | Confirmed scope | Still unproven |
|---|---|---|
| Vietcombank | VCB Digibank transaction history supports **Xuất excel** | exact exported headers, `.xls` vs `.xlsx`, stable reference semantics, exported status/fee/overlap behavior |
| ACB | supported ACB first-party flows provide Excel history/statement download | universal consumer-account layout, `.xls` vs `.xlsx`, exact headers, stable provider transaction ID |
| VietinBank | iPay Web customer-support guidance confirms Excel detailed transaction data for the account; current material also confirms statement/history concepts | exact `.xls` vs `.xlsx`, exported headers/layout, field semantics and stable provider reference |

The implementation records artifact family as `excel` for all three scoped target-bank flows without strengthening first-party “Excel” evidence into an unsupported `.xlsx` claim.

Unsupported semantics stay `unknown` or `observed-but-unverified`; visible UI labels are not promoted to exported-file contracts.

## Source-identity law

A provider reference is eligible to become source identity only when all conditions hold:

```text
reference is non-empty
AND evidence == confirmed
AND stability == source-stable
→ eligible sourceExternalId
```

Display/UI references, row indexes, export-local identifiers, generated hashes and MoneyFlow preview fingerprints fail closed. The current Direct CSV payload remains unchanged and still has no provider `sourceExternalId` field.

## Privacy and fixture result

Three repository evidence fixtures cover Vietcombank, ACB and VietinBank. They contain capability metadata and explicit unknowns only:

- `containsCustomerData: false`;
- no customer names or account numbers;
- no real transaction references;
- no customer statement rows;
- no synthetic transaction rows while exact exported layouts remain unverified.

A bank-specific synthetic statement structure may be added later only when stronger first-party documentation or privacy-safe structural observation establishes the relevant exported layout/version without committing private values.

## User guidance result

`/capture/upload` includes a small “Sao kê ngân hàng Việt Nam” guidance region. It tells users that MoneyFlow does not yet auto-recognize bank file layouts, keeps files on the existing parser → Import Preview → Inbox review path, and does not request bank-login information.

The full research matrix remains server-side. The client component receives only `{ provider, displayName, guidance }`, avoiding unnecessary source URLs/evidence metadata in the browser bundle.

Presentation is owned by `capture-upload-page.module.css`; no new legacy global CSS class is registered.

## Tests and counterexamples

Focused unit coverage verifies:

- exactly the three selected banks are represented;
- VCB/ACB/VietinBank are recorded as confirmed Excel-family availability in the stated scopes without claiming exact extension or headers;
- all three bank-specific auto-map paths remain disabled while header evidence is unknown;
- display references, row IDs and hashes cannot become source identity;
- only a non-empty confirmed source-stable reference is eligible;
- fixtures contain no customer rows and match the conservative runtime profiles;
- guidance does not claim live bank sync.

`e2e/vietnam-bank-export-guidance.spec.ts` verifies user-visible Capture guidance using accessible role/name locators and web-first assertions. The normal Playwright configuration exercises the baseline suite on Desktop Chrome and Pixel 5.

Existing generic parser/import tests remain the regression boundary; no parallel bank parser or mutation path was introduced.

## Independent evaluation findings

T5/evaluation caught three substantive evidence or implementation issues before owner merge:

1. The first UI implementation imported the full compatibility/research matrix into a client component. It was moved to the server page, which now passes only display guidance to the client.
2. Initial evidence typed VCB/ACB artifact availability as `.xlsx`, stronger than the first-party sources. The contract, fixtures, tests and research record were corrected to the evidence-supported `excel` family.
3. A 2026-09-05 first-party VietinBank customer-support source established iPay Web Excel detailed transaction-data retrieval, contradicting the prior `artifactFormat: unknown` branch claim. PR #546 was moved back to Draft/evaluating and the evidence contract/tests/fixture/research were corrected while keeping headers and source identity unknown.

Earlier CI also caught and drove fixes for trailing Markdown whitespace, required PR-memory fields, TypeScript nullable-reference narrowing and attempted reuse of the legacy global `panel` class. Validators were not weakened or bypassed.

Previous head `b9db4f372a851dbdaea47e0445f7f87606129c7b` passed CI #3307, CodeQL #2338 and Secret history #2338, including policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke, Cross-device UI audit and final verify/e2e aggregators. That evidence is historical after the 2026-09-05 correction; the corrected latest head must receive its own exact-head gates before Ready-for-review handoff.

## Tasks

| ID | Task | Result |
|---|---|---|
| T1 | Select #523 as M1 Phase A authority | done — PR #545 merged as `2ac2026c...` |
| T2 | Evidence-tagged VCB/ACB/VietinBank compatibility matrix | corrected 2026-09-05 for stronger VietinBank evidence |
| T3 | Privacy-safe fixtures + source-ID contract/tests | corrected 2026-09-05; no source-ID relaxation |
| T4 | Minimal user guidance for supported/unknown export artifacts | corrected wording for VietinBank Excel evidence; generic review path preserved |
| T5 | Full architecture/provenance/dedupe/privacy/performance review | evaluating latest correction; exact-head gates required |
| T6 | Owner-controlled merge and post-merge lifecycle verification | pending; PR #546 projects lifecycle convergence but does not self-merge |

## Verification boundary

Previous head `b9db4f372a851dbdaea47e0445f7f87606129c7b` was fully green on CI #3307 / CodeQL #2338 / Secret history #2338, including browser and cross-device UI evidence. It is superseded by the VietinBank evidence correction. The corrected latest head must pass its own risk-selected CI/CodeQL/Secret-history and selected browser/UI gates before PR #546 returns to Ready for review.

No database/provider gate is required because the diff contains no database, migration, RLS, Auth or provider mutation.

## Remaining limitations

Phase A does not prove or ship:

- exact current consumer-export headers/layout versions;
- exact Excel extension/version where first-party material only says “Excel”;
- stable provider transaction identity across repeated/overlapping exports;
- exact exported date/timezone, currency/direction, status or fee semantics;
- live bank sync, bank credentials, screen scraping or Open Banking;
- bank-specific automatic mapping or automatic ledger posting.

Those are follow-on evidence/implementation questions and must be selected from fresh main after this closeout if the owner wants to continue M1.

## Final lifecycle decision

PR #546 performs same-PR lifecycle convergence required by repository policy:

- preserve this completion/evaluation record under `docs/plans/completed/`;
- remove `docs/plans/active/523-vietnam-bank-export-compatibility.md`;
- set `PLAN_AUTHORITY.current` to `null`;
- update current project memory and PR memory;
- select no MON-62/MON-63 or other follow-on slice.

GitHub #523 and Linear MON-61 remain open/In Progress until explicit owner merge and post-merge verification. Merging PR #546 is an owner decision, not implied by implementation completion.