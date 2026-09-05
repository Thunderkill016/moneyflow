# MoneyFlow — current project memory

**Status:** M0 is closed. M1 Phase A #523 / MON-61 is closed after implementation, owner merge, production verification, durable-memory reconciliation and tracker synchronization.
**Last reconciled:** 2026-09-05
**Runtime baseline:** `0bf9335c748aeddfdd988aa458298d2edc8ae437` (PR #546); later docs-only reconciliation does not change runtime behavior.
**Current authority:** `PLAN_AUTHORITY.current: null`; no follow-on slice is selected.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 Release Integrity is complete, and the first M1 Vietnam Acquisition Depth slice is now fully closed.

PR #546 owner-merged #523 / MON-61 as `0bf9335c748aeddfdd988aa458298d2edc8ae437`. The slice added a bounded, evidence-backed Vietnam bank-export compatibility contract and conservative Capture guidance while preserving the existing generic acquisition, provenance, approval and ledger ownership model.

First-party evidence currently confirms an **Excel artifact family** in scoped Vietcombank, ACB and VietinBank flows. The ACB ONE standard KHCN guide confirms `Xuất file excel` for transaction listing; VietinBank customer-support guidance confirms iPay Web Excel detailed transaction data; Vietcombank Digibank confirms transaction-history `Xuất excel`. None of these sources proves exact `.xls` versus `.xlsx`, exported headers/layout, field semantics or provider-stable transaction identity.

Post-merge verification confirmed authority `current: null`, Vercel production READY on the exact runtime commit, `/api/health` 200 with that commit and `cache-control: no-store`, and no runtime errors in the checked one-hour production window. Docs-only PR #547 then reconciled stale project memory and owner-merged as `897807cb2ee3e21d53197810bfd418f44d37f9a3`. GitHub #523 is closed completed and Linear MON-61 is Done. MON-62 / MON-63 remain unselected.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.
- PR #546 did not modify production DB/Auth/provider state or financial mutation ownership.

## 3. Acquisition and reconciliation truth

Production contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`; M0 verified 56/56 migration identities and later durable acquisition contracts.

The completed #523 slice preserves generic acquisition ownership:

- `/imports/direct` remains CSV-only with client-side mapping/dry-run and authenticated all-or-nothing commit through the existing candidate/provenance path.
- `parse-csv.ts` remains the generic matrix-normalization path and does not expose a provider transaction-reference field.
- `parse-xlsx.ts` continues to extract XLS/XLSX and reuse the shared matrix parser.
- `direct-csv-import.ts` does not invent `sourceExternalId`; preview fingerprints remain non-authoritative.
- DB source-lineage can preserve an explicit provider source ID only when actual source evidence proves a stable identity.
- `source_external_id` eligibility requires a non-empty reference with `evidence=confirmed` and `stability=source-stable`.
- Row indexes, UI/display references, export-local IDs, generated hashes and MoneyFlow preview fingerprints fail closed.
- All target-bank bank-specific auto-map flags remain disabled because exact headers/layout and stable reference semantics are unproven.

## 4. Performance truth after #527

PR #538 completed #527. Dashboard lab medians improved in performance/LCP and materially in TBT/JS bootup while CLS remained 0. Dashboard LCP still exceeds 2.5 s and the owner-observed Vercel score 39 provenance remains unresolved.

For #523, the full compatibility/source-URL matrix stays server-side; the Capture client receives only `{ provider, displayName, guidance }`.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | provenance/source-lineage, generic CSV/XLSX/PDF surfaces, Direct CSV atomic/rule-aware ingestion, Share Target atomic/rule-aware ingestion; #523 adds evidence-backed VCB/ACB/VietinBank Excel-family compatibility guidance but no bank-specific auto-map |
| Review | exception-first review plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | none; `PLAN_AUTHORITY.current: null`, follow-on selection required from fresh main |

## 6. Security and delivery truth

Selector baseline `main@2ac2026c...` was green before implementation. Final PR #546 exact head `44f281df135b43747af77e6efc7580b5db606333` passed CI #3323, CodeQL #2353 and Secret history #2353 without retry; a later CI #3324 on the same exact head also succeeded.

CI covered policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke including authenticated ownership, Cross-device UI audit and final verify/e2e aggregators.

The failed reconciliation head `a8668ff...` is not acceptance evidence; CI #3322 caught the accidental omission of `canUseBankSpecificAutoMap`, and the export was restored unchanged before final exact-head acceptance.

Post-merge production evidence: Vercel deployment `dpl_HWvZJNht8Yo1WzWi8NWCowbLnKBT` is READY for exact runtime commit `0bf9335c748aeddfdd988aa458298d2edc8ae437`; `/api/health` returned 200 with that commit and `no-store`; no runtime errors were found in the checked one-hour window.

Docs-only PR #547 final exact head `8cd17e3ed3026442b6612b13b920ef67213ef84a` passed CI #3329, CI #3330, CodeQL #2358 and Secret history #2358 without retry before owner merge as `897807cb2ee3e21d53197810bfd418f44d37f9a3`.

No production DB/Auth/provider write, external bank access or real customer statement data was part of #546/#547 verification.

## 7. Supabase security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation. M1 Phase A did not modify this boundary.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- PR #546: owner-merged as `0bf9335c748aeddfdd988aa458298d2edc8ae437`; post-merge authority and production runtime verified.
- PR #547: docs-only durable-memory reconciliation merged as `897807cb2ee3e21d53197810bfd418f44d37f9a3`.
- GitHub #523: closed completed.
- Linear MON-61: Done.
- MON-50: M1 — Vietnam Acquisition Depth — remains the broader program.
- MON-62 / MON-63: Todo; not selected.

## 9. Open pull-request memory

No executable pull request or bounded implementation packet is active. `PLAN_AUTHORITY.current` is `null`.

Historical PR #546 delivered the evidence-tagged VCB/ACB/VietinBank matrix, fail-closed source-identity eligibility, privacy-safe evidence fixtures, focused counterexample tests, conservative Capture guidance, Playwright coverage, server-only research projection, completed packet and `PLAN_AUTHORITY.current → null` lifecycle transition. PR #547 reconciled stale post-merge project memory. Docs-only maintenance or reconciliation PRs do not establish executable product authority by themselves.

Important evidence boundary: first-party material confirms **Excel** export/data retrieval in scoped VCB, ACB and VietinBank flows, but does not prove exact `.xls`/`.xlsx`, exported headers/layout, field semantics or stable transaction identity. All three bank-specific auto-map flags remain disabled.

## 10. True gaps after this audit

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions.
2. Exact Excel extension/version where first-party sources only say “Excel”.
3. Provider-stable transaction identity across repeated/overlapping exports.
4. Exact exported date/timezone, currency/direction, status and fee semantics.
5. Privacy-safe structural statement examples before bank-specific parser aliases are enabled.
6. Fresh-main owner selection before MON-62, MON-63 or any follow-on executable slice starts.

Preparation note only, not executable authority: current official SheetJS guidance confirms spreadsheet date cells are commonly numeric serials plus number formats and formatted date text can be locale-sensitive; future source adapters should preserve raw cell values and normalize dates deterministically rather than trust rendered strings. External transaction APIs such as UK Open Banking and Plaid explicitly distinguish immutable transaction IDs from references and pending/posted linkage; that supports MoneyFlow's existing fail-closed identity rule but is **not** evidence that Vietnamese bank exports contain such stable IDs.

## 11. Next allowed action

Keep `PLAN_AUTHORITY.current` null. The dependency order is MON-61 → MON-62 → MON-63, so MON-62 is the next logical candidate, but it remains Todo/unselected. Before any executable work begins, perform fresh-main owner selection and encode the selected bounded packet through the repository authority mechanism. Do not start MON-62/MON-63 merely because the dependency predecessor is complete.

## 12. Superseded-status register

- PR #545 is pending — **false**; it merged as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`.
- PR #546 is pending / Ready for review — **false**; it owner-merged as `0bf9335c748aeddfdd988aa458298d2edc8ae437` and production verification passed.
- PR #547 is the current open reconciliation PR — **false**; it owner-merged as `897807cb2ee3e21d53197810bfd418f44d37f9a3`.
- #523 / MON-61 closure synchronization is pending — **false**; GitHub #523 is closed completed and Linear MON-61 is Done.
- #523 was completed by selector PR #545 — **false**; #545 only selected it; #546 implemented and closed the slice technically.
- PR #546 enables bank-specific auto-map — **false**; all target-bank auto-map flags remain disabled.
- VCB/ACB/VietinBank “Excel” evidence proves `.xlsx` — **false**; exact extension remains unproven.
- Existing generic `sample-bank.*` fixtures prove VCB/ACB/VietinBank compatibility — **false**.
- VietinBank target account downloadable artifact format is wholly unknown — **false**; first-party guidance confirms Excel detailed transaction data on iPay Web while layout/reference semantics remain unknown.
- ACB consumer Excel availability is supported only by store-management evidence — **false**; the ACB ONE standard KHCN guide also documents `Xuất file excel` for transaction listing, without proving exported headers or stable IDs.
- A bank export row number, display reference or MoneyFlow heuristic fingerprint is a stable provider transaction ID — **false**.
- PR #546 may select MON-62/MON-63 while closing #523 — **false**; lifecycle law requires current → null and follow-on selection from fresh main.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
