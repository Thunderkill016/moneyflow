# #523 — Vietnam bank-export compatibility matrix and fixtures — completed

**Status:** completed M1 Phase A implementation/evaluation slice; effective when PR #546 merges
**Issue:** GitHub #523 / Linear MON-61
**Selected by:** PR #545
**Implementation and lifecycle closeout:** PR #546
**Base:** `main@2ac2026c3d5a27898b17482b36f503a32a3dd4f6`
**Completed evidence date:** 2026-09-04
**Owner:** ThunderK

## Outcome

MoneyFlow now has a bounded, evidence-backed compatibility contract for Vietcombank, ACB and VietinBank exports without inventing provider semantics or creating a second financial-truth path. The slice adds an evidence matrix, privacy-safe evidence fixtures, fail-closed source-identity eligibility, conservative Capture guidance and targeted browser coverage. Generic CSV/XLSX parsing, provenance, review, approval and ledger mutation ownership remain unchanged.

This slice deliberately does **not** enable bank-specific auto-mapping. Exact current consumer-export headers and provider-stable transaction identifiers remain unproven for the target flows. After this closeout merges, `PLAN_AUTHORITY.current` is `null`; no follow-on M1 packet is selected in PR #546.

## Repository and architecture result

The implementation preserves the existing acquisition boundary:

- `parse-csv.ts` remains the generic matrix-normalization owner;
- `parse-xlsx.ts` continues to extract spreadsheet rows and reuse the shared matrix parser;
- Direct CSV still does not invent `sourceExternalId`, and preview fingerprints remain non-authoritative;
- provider-specific evidence cannot write financial tables or bypass candidate/provenance/review/approval;
- no schema, migration, RLS, Auth, provider or production-data change is part of this slice.

`src/lib/inbox/bank-export-compatibility.ts` adds only a pure compatibility/evidence contract. Bank-specific auto-map requires explicit support plus confirmed artifact and confirmed non-empty header evidence. All three target banks remain disabled because the required layout evidence does not exist yet.

## First-party evidence result

Research was refreshed from first-party bank material on 2026-09-04.

| Provider | Confirmed scope | Still unproven |
|---|---|---|
| Vietcombank | VCB Digibank transaction history supports **Xuất excel** | exact exported headers, `.xls` vs `.xlsx`, stable reference semantics, exported status/fee/overlap behavior |
| ACB | supported ACB first-party flows provide Excel history/statement download | universal consumer-account layout, `.xls` vs `.xlsx`, exact headers, stable provider transaction ID |
| VietinBank | current first-party material confirms statement/history and iPay/card-history concepts | target consumer-account downloadable file format, headers and stable provider reference |

The implementation records artifact family as `excel` for VCB/ACB rather than strengthening first-party “Excel” evidence into an unsupported `.xlsx` claim. VietinBank target artifact format remains `unknown`.

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

`/capture/upload` now includes a small “Sao kê ngân hàng Việt Nam” guidance region. It tells users that MoneyFlow does not yet auto-recognize bank file layouts, keeps files on the existing parser → Import Preview → Inbox review path, and does not request bank-login information.

The full research matrix remains server-side. The client component receives only `{ provider, displayName, guidance }`, avoiding unnecessary source URLs/evidence metadata in the browser bundle.

Presentation is owned by `capture-upload-page.module.css`; no new legacy global CSS class is registered.

## Tests and counterexamples

Focused unit coverage verifies:

- exactly the three selected banks are represented;
- VCB/ACB are recorded as confirmed Excel-family availability without claiming exact extension or headers;
- VietinBank target downloadable format remains unknown;
- display references, row IDs and hashes cannot become source identity;
- only a non-empty confirmed source-stable reference is eligible;
- fixtures contain no customer rows and match the conservative runtime profiles;
- guidance does not claim live bank sync.

`e2e/vietnam-bank-export-guidance.spec.ts` verifies user-visible Capture guidance using accessible role/name locators and web-first assertions. The normal Playwright configuration exercises the baseline suite on Desktop Chrome and Pixel 5.

Existing generic parser/import tests remain the regression boundary; no parallel bank parser or mutation path was introduced.

## Independent evaluation findings

T5 review found two issues before lifecycle closeout and both were corrected:

1. The first UI implementation imported the full compatibility/research matrix into a client component. It was moved to the server page, which now passes only display guidance to the client.
2. Initial evidence typed VCB/ACB artifact availability as `.xlsx`, stronger than the first-party sources. The contract, fixtures, tests and research record were corrected to the evidence-supported `excel` family.

Earlier CI also caught and drove fixes for trailing Markdown whitespace, required PR-memory fields, TypeScript nullable-reference narrowing and attempted reuse of the legacy global `panel` class. Validators were not weakened or bypassed.

No remaining architecture, provenance, source-identity, privacy or presentation-ownership blocker was identified in the reviewed diff.

Lifecycle-converged implementation head `dfb38edec9714437b26771566464103c79d40e9b` passed CI #3303, CodeQL #2335 and Secret history #2335. CI #3303 also passed policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke, Cross-device UI audit and final verify/e2e aggregators. PR #546 was then marked Ready for review. A documentation-only evidence reconciliation supersedes that head and must receive its own exact-head checks before owner merge.

## Tasks

| ID | Task | Result |
|---|---|---|
| T1 | Select #523 as M1 Phase A authority | done — PR #545 merged as `2ac2026c...` |
| T2 | Evidence-tagged VCB/ACB/VietinBank compatibility matrix | done |
| T3 | Privacy-safe fixtures + source-ID contract/tests | done |
| T4 | Minimal user-visible supported/unknown guidance | done |
| T5 | Full architecture/provenance/dedupe/privacy/performance review | done — findings fixed; implementation exact-head gates passed |
| T6 | Owner-controlled merge and post-merge lifecycle verification | pending owner authorization; PR #546 projects lifecycle convergence but does not self-merge |

## Verification boundary

Implementation head `dfb38edec9714437b26771566464103c79d40e9b` is fully green on CI #3303 / CodeQL #2335 / Secret history #2335, including browser and cross-device UI evidence. The final documentation-only evidence reconciliation must receive its own exact-head CI/CodeQL/Secret-history checks before owner handoff/merge.

No database/provider gate is required because the diff contains no database, migration, RLS, Auth or provider mutation.

## Remaining limitations

Phase A does not prove or ship:

- exact current consumer-export headers/layout versions;
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