# #523 — Vietnam bank-export compatibility matrix and fixtures — completed

**Status:** candidate M1 Phase A completion record; effective only after final exact-head verification and explicit owner merge of PR #546
**Issue:** GitHub #523 / Linear MON-61
**Selected by:** PR #545
**Implementation and lifecycle closeout:** PR #546
**Base:** `main@2ac2026c3d5a27898b17482b36f503a32a3dd4f6`
**Completed evidence date:** 2026-09-04; evidence refreshed 2026-09-05
**Owner:** ThunderK

## Outcome

MoneyFlow has a bounded, evidence-backed compatibility contract for Vietcombank, ACB and VietinBank exports without inventing provider semantics or creating a second financial-truth path. The slice adds an evidence matrix, privacy-safe evidence fixtures, fail-closed source-identity eligibility, conservative Capture guidance and targeted browser coverage. Generic CSV/XLSX parsing, provenance, review, approval and ledger mutation ownership remain unchanged.

This slice deliberately does **not** enable bank-specific auto-mapping. Exact current consumer-export headers and provider-stable transaction identifiers remain unproven. After this closeout merges, `PLAN_AUTHORITY.current` is `null`; no follow-on M1 packet is selected in PR #546.

Two evidence corrections were made before owner merge:

1. first-party VietinBank customer-support guidance established that iPay Web can retrieve an Excel file with detailed transaction data on the account, correcting the prior `artifactFormat: unknown` claim;
2. the ACB ONE standard KHCN guide directly established a consumer transaction-list **`Xuất file excel`** workflow, strengthening the earlier store-management-only consumer-scope evidence.

Neither correction establishes exact exported headers, exact Excel extension/version or provider-stable transaction identity. The no-auto-map decision remains unchanged.

## Repository and architecture result

- `parse-csv.ts` remains the generic matrix-normalization owner.
- `parse-xlsx.ts` continues to extract spreadsheet rows and reuse the shared matrix parser.
- Direct CSV still does not invent `sourceExternalId`; preview fingerprints remain non-authoritative.
- Provider-specific evidence cannot write financial tables or bypass candidate/provenance/review/approval.
- No schema, migration, RLS, Auth, provider or production-data change is part of this slice.

`src/lib/inbox/bank-export-compatibility.ts` adds only a pure compatibility/evidence contract. Bank-specific auto-map requires confirmed artifact and confirmed non-empty header evidence; all three target banks remain disabled because layout evidence does not exist yet.

## First-party evidence result

| Provider | Confirmed scope | Still unproven |
|---|---|---|
| Vietcombank | VCB Digibank transaction history supports **Xuất excel** | exact exported headers, `.xls` vs `.xlsx`, stable reference semantics, exported status/fee/overlap behavior |
| ACB | ACB ONE standard KHCN transaction listing supports **Xuất file excel**; store-management material independently confirms Excel export | exact consumer headers/layout, `.xls` vs `.xlsx`, debit/credit/status representation, stable provider transaction ID |
| VietinBank | iPay Web customer-support guidance confirms Excel detailed transaction data for the account | exact `.xls` vs `.xlsx`, exported headers/layout, field semantics and stable provider reference |

The implementation records artifact family as `excel` for all three scoped target-bank flows without strengthening first-party “Excel” evidence into an unsupported `.xlsx` claim.

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

Three repository evidence fixtures cover Vietcombank, ACB and VietinBank. They contain capability metadata and explicit unknowns only: no customer names/account numbers, real transaction references or statement rows. Synthetic statement rows remain prohibited until stronger first-party documentation or privacy-safe structural observation establishes the exported layout/version.

## User guidance result

`/capture/upload` includes “Sao kê ngân hàng Việt Nam” guidance. It tells users MoneyFlow does not yet auto-recognize bank file layouts, keeps files on the existing parser → Import Preview → Inbox review path, and does not request bank-login information. Full research/source metadata stays server-side; the client receives only `{ provider, displayName, guidance }`.

## Tests and counterexamples

Focused unit coverage verifies all three selected banks, confirmed Excel-family availability only within supported scopes, disabled bank-specific auto-map while headers remain unknown, fail-closed source identity, privacy-safe fixtures and no live-sync claim. `e2e/vietnam-bank-export-guidance.spec.ts` verifies the user-visible Capture guidance under normal desktop/mobile coverage.

## Independent evaluation findings

Evaluation caught and corrected three substantive issues before owner merge:

1. client-bundle overexposure of the full research matrix;
2. unsupported strengthening of first-party “Excel” evidence to `.xlsx`;
3. stale VietinBank `artifactFormat: unknown` after stronger first-party iPay Web evidence was found.

Later research strengthened ACB consumer-scope Excel availability via the ACB ONE standard KHCN guide without relaxing layout/source-ID uncertainty. CI also caught lifecycle/PR-memory schema wording during reconciliation; validators were not weakened or bypassed.

Corrected implementation/evaluation head `5f168d2ffb492aa75a38d2094b7b25c71b6314b0` passed CI #3316, CodeQL #2347 and Secret history #2347 without retry. CI #3316 passed policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke including authenticated ownership, Cross-device UI audit and final verify/e2e aggregators.

A final documentation/evidence reconciliation follows that green head and requires its own exact-head verification before owner merge.

## Tasks

| ID | Task | Result |
|---|---|---|
| T1 | Select #523 as M1 Phase A authority | done — PR #545 merged as `2ac2026c...` |
| T2 | Evidence-tagged VCB/ACB/VietinBank compatibility matrix | done; refreshed for VietinBank and ACB KHCN evidence |
| T3 | Privacy-safe fixtures + source-ID contract/tests | done; no source-ID relaxation |
| T4 | Minimal user guidance for supported/unknown export artifacts | done; generic review path preserved |
| T5 | Full architecture/provenance/dedupe/privacy/performance review | done; corrected implementation head green |
| T6 | Owner-controlled merge and post-merge lifecycle verification | pending; PR #546 projects lifecycle convergence but does not self-merge |

## Verification boundary

Corrected implementation/evaluation head `5f168d2ffb492aa75a38d2094b7b25c71b6314b0` is fully green on CI #3316 / CodeQL #2347 / Secret history #2347. The final docs/evidence reconciliation must pass its own exact-head required gates before owner handoff/merge.

No production database/provider gate is required because the diff contains no database, migration, RLS, Auth or provider mutation.

## Remaining limitations

Phase A does not prove or ship exact consumer-export headers/layout versions, exact Excel extension/version, stable provider transaction identity, exact exported date/timezone/currency/direction/status/fee semantics, live bank sync, bank credentials, screen scraping, Open Banking, bank-specific automatic mapping or automatic ledger posting.

## Final lifecycle decision

PR #546 performs same-PR lifecycle convergence required by repository policy:

- preserve this completion/evaluation record under `docs/plans/completed/`;
- remove `docs/plans/active/523-vietnam-bank-export-compatibility.md`;
- set `PLAN_AUTHORITY.current` to `null`;
- update current project memory and PR memory;
- select no MON-62/MON-63 or other follow-on slice.

GitHub #523 and Linear MON-61 remain open/In Progress until explicit owner merge and post-merge verification. Merging PR #546 is an owner decision, not implied by implementation completion.
