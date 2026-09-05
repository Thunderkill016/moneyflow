# MoneyFlow — current project memory

**Status:** M0 is closed. M1 Phase A #523 implementation/evaluation is complete on PR #546, which is Ready for review. Owner merge and post-merge verification remain pending.
**Last reconciled:** 2026-09-05
**Merged main baseline before PR #546:** `2ac2026c3d5a27898b17482b36f503a32a3dd4f6` (PR #545 selector)
**Projected authority after PR #546 merge:** `PLAN_AUTHORITY.current: null`; no follow-on slice is selected in #546.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 Release Integrity is complete.

PR #545 owner-merged and selected #523 / MON-61 as M1 Phase A executable authority. PR #546 now contains the bounded implementation, independent evaluation and same-PR lifecycle projection. A 2026-09-05 evidence refresh corrected VietinBank from `artifactFormat: unknown` to evidence-supported `excel` after first-party customer-support guidance established iPay Web Excel detailed transaction data. The correction did not enable bank-specific auto-map or change parser/mutation ownership.

A later first-party ACB ONE standard KHCN guide also confirms a consumer transaction-list workflow with **Xuất file excel**. This strengthens the ACB consumer-scope artifact evidence but still does not prove `.xls` versus `.xlsx`, exact exported headers/layout or provider-stable transaction identity.

Until PR #546 is explicitly owner-merged, merged main still has #523 as current authority and GitHub #523 / Linear MON-61 remain open/In Progress. If #546 merges, current authority becomes `null`; follow-on M1 work must be selected from fresh main.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.

PR #546 does not modify production DB/Auth/provider state or financial mutation ownership.

## 3. Acquisition and reconciliation truth

Production contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`; M0 verified 56/56 migration identities and later durable acquisition contracts.

The #523 implementation preserves generic acquisition ownership:

- `/imports/direct` remains CSV-only with client-side mapping/dry-run and authenticated all-or-nothing commit through the existing candidate/provenance path.
- `parse-csv.ts` remains the generic matrix-normalization path and does not expose a provider transaction-reference field.
- `parse-xlsx.ts` continues to extract XLS/XLSX and reuse the shared matrix parser.
- `direct-csv-import.ts` does not invent `sourceExternalId`; preview fingerprints remain non-authoritative.
- DB source-lineage can preserve an explicit provider source ID only when actual source evidence proves a stable identity.

Phase A adds an evidence contract, not a new parser or posting authority. First-party evidence confirms an **Excel artifact family** in scoped Vietcombank, ACB and VietinBank flows. Exact extension, exported headers/layout versions, field semantics and provider-stable transaction identity remain unproven, so all three bank-specific auto-map flags remain disabled.

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
| Executable authority after #546 merge | none; `current: null`, follow-on selection required from fresh main |

## 6. Security and delivery truth

Selector merged-main evidence is green on exact `main@2ac2026c...`: CI #3283, CodeQL #2315 and Secret history #2315 succeeded.

Corrected PR #546 head `5f168d2ffb492aa75a38d2094b7b25c71b6314b0` passed CI #3316, CodeQL #2347 and Secret history #2347 **without retry**. CI #3316 passed policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke including authenticated ownership, Cross-device UI audit and final verify/e2e aggregators.

A final documentation/evidence reconciliation after that green head updates durable state and the stronger ACB KHCN source. Its own exact-head checks are required before owner merge. Historical green results remain evidence but never substitute for latest-head verification.

No production DB/Auth/provider/Vercel write, external bank access or real customer statement data is part of #546.

## 7. Supabase security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation. M1 Phase A does not modify this boundary.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523: open until explicit owner merge/post-merge verification.
- PR #546: Ready for review after corrected head `5f168d2f...` passed CI #3316 / CodeQL #2347 / Secret history #2347; latest docs-only reconciliation must be exact-head green before merge. Merge remains owner-controlled.
- MON-50: M1 — Vietnam Acquisition Depth — In Progress.
- MON-61: #523 Phase A — In Progress until owner merge/post-merge verification.
- MON-62 / MON-63: Todo; not selected by #546.

## 9. Open pull-request memory

PR #546 contains the evidence-tagged VCB/ACB/VietinBank matrix, fail-closed source-identity eligibility, privacy-safe evidence fixtures, focused counterexample tests, conservative Capture guidance, Playwright coverage, server-only research projection, completed packet and `PLAN_AUTHORITY.current → null` lifecycle projection.

Important evidence boundary: first-party material confirms **Excel** export/data retrieval in scoped VCB, ACB and VietinBank flows. The ACB ONE standard KHCN guide strengthens consumer-scope Excel availability, and VietinBank customer-support guidance confirms iPay Web Excel detailed transaction data. None of these sources proves exact `.xls`/`.xlsx`, exported headers/layout, field semantics or stable transaction identity. All three bank-specific auto-map flags remain disabled.

`source_external_id` eligibility requires a non-empty reference with `evidence=confirmed` and `stability=source-stable`. UI/display references, row indexes, export-local IDs, generated hashes and MoneyFlow preview fingerprints fail closed.

## 10. True gaps after this audit

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions.
2. Exact Excel extension/version where first-party sources only say “Excel”.
3. Provider-stable transaction identity across repeated/overlapping exports.
4. Exact exported date/timezone, currency/direction, status and fee semantics.
5. Privacy-safe structural statement examples before bank-specific parser aliases are enabled.
6. Exact-head checks for the final docs/evidence reconciliation.
7. Explicit owner merge and post-merge #523/MON-61 closure verification.
8. Fresh-main owner selection before MON-62, MON-63 or any follow-on executable slice starts.

## 11. Next allowed action

Verify the final docs/evidence reconciliation head. If CI/CodeQL/Secret-history and selected browser/UI gates pass, keep PR #546 Ready for review and wait for explicit owner merge authorization. After owner merge, verify merged-main authority/current memory and affected runtime health, then close #523 and mark MON-61 Done. Do not start MON-62/MON-63 before that closure.

## 12. Superseded-status register

- PR #545 is pending — **false**; it merged as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`.
- #523 was completed by selector PR #545 — **false**; #545 only selected it.
- PR #546 enables bank-specific auto-map — **false**; all target-bank auto-map flags remain disabled.
- VCB/ACB/VietinBank “Excel” evidence proves `.xlsx` — **false**; exact extension remains unproven.
- Existing generic `sample-bank.*` fixtures prove VCB/ACB/VietinBank compatibility — **false**.
- VietinBank target account downloadable artifact format is wholly unknown — **false**; first-party guidance confirms Excel detailed transaction data on iPay Web while layout/reference semantics remain unknown.
- ACB consumer Excel availability is supported only by store-management evidence — **false**; the ACB ONE standard KHCN guide also documents `Xuất file excel` for transaction listing, without proving exported headers or stable IDs.
- A bank export row number, display reference or MoneyFlow heuristic fingerprint is a stable provider transaction ID — **false**.
- PR #546 may select MON-62/MON-63 while closing #523 — **false**; lifecycle law requires current → null and follow-on selection from fresh main.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
