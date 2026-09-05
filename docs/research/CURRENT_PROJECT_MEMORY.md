# MoneyFlow — current project memory

**Status:** M0 is closed. M1 Phase A #523 implementation remains on PR #546; a 2026-09-05 first-party VietinBank evidence correction moved the PR back to Draft/evaluating. Lifecycle closeout is still projected in the branch, but latest-head exact checks and owner merge/post-merge verification remain pending.
**Last reconciled:** 2026-09-05
**Merged main baseline before PR #546:** `2ac2026c3d5a27898b17482b36f503a32a3dd4f6` (PR #545 selector)
**Projected authority after PR #546 merge:** `PLAN_AUTHORITY.current: null`; no follow-on slice is selected in #546.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 Release Integrity is complete.

The owner selected **M1 — Vietnam Acquisition Depth** and PR #545 selected #523 / MON-61 as the first executable slice. PR #546 contains the bounded Phase A implementation, evaluation and same-PR lifecycle projection. On 2026-09-05, refreshed first-party VietinBank customer-support evidence established that iPay Web can retrieve an Excel file with detailed account transaction data. That contradicted the branch's prior `artifactFormat: unknown` claim for VietinBank, so PR #546 was moved back to Draft/evaluating and the evidence contract, tests, fixtures and durable research were corrected. The correction does not enable bank-specific auto-map or change parser/mutation ownership.

Until PR #546 is explicitly owner-merged, merged `main@2ac2026c...` still has #523 as current authority and GitHub #523 / Linear MON-61 remain open/In Progress. If #546 later returns to Ready after latest-head exact checks and is owner-merged, current authority becomes `null`; follow-on M1 work must be selected from fresh main.

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

Production contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`; M0 verified 56/56 migration identities and all later durable acquisition contracts.

The #523 implementation preserves generic acquisition ownership:

- `/imports/direct` remains CSV-only with client-side mapping/dry-run and authenticated all-or-nothing commit through the existing candidate/provenance path.
- `parse-csv.ts` remains the generic matrix-normalization path and does not expose a provider transaction-reference field.
- `parse-xlsx.ts` continues to extract XLS/XLSX and reuse the shared matrix parser.
- `direct-csv-import.ts` still does not invent `sourceExternalId`; preview fingerprints remain non-authoritative.
- DB source-lineage can preserve an explicit provider source ID only when actual source evidence proves a stable identity.

Phase A adds an evidence contract, not a new parser or posting authority. First-party evidence now confirms an **Excel artifact family** in the scoped flows for Vietcombank, ACB and VietinBank. Exact `.xls`/`.xlsx` extension, exported headers/layout versions, field semantics and provider-stable transaction identity remain unproven, so all three bank-specific auto-map flags remain disabled.

## 4. Performance truth after #527

PR #538 completed #527. Same-methodology `/dashboard` lab medians improved modestly in performance/LCP and materially in TBT/JS bootup, while CLS remained 0. Dashboard LCP still exceeds 2.5 s and the owner-observed Vercel score 39 provenance remains unresolved.

For #523, T5 moved the full compatibility/source-URL matrix out of the client component. The server page passes only `{ provider, displayName, guidance }` to the Capture client surface.

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

PR #546 head `b9db4f372a851dbdaea47e0445f7f87606129c7b` previously passed CI #3307, CodeQL #2338 and Secret history #2338, including policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke, Cross-device UI audit and final verify/e2e aggregators.

That green head is now superseded by the 2026-09-05 VietinBank evidence correction. Because the correction changes runtime evidence data, tests, fixture and durable research, the new exact head must pass its own risk-selected CI/CodeQL/Secret-history gates before PR #546 can return to Ready for review. Prior green runs remain historical evidence only.

No production DB/Auth/provider/Vercel write, external bank access or real customer statement data is part of #546.

## 7. Supabase security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation. M1 Phase A does not modify this boundary.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523: open until explicit owner merge/post-merge verification. Selector auto-close was previously corrected by reopening the issue.
- PR #546: open Draft/evaluating after the 2026-09-05 VietinBank first-party evidence correction; latest-head exact checks are required before returning to Ready. Merge remains owner-controlled.
- MON-50: M1 — Vietnam Acquisition Depth — In Progress.
- MON-61: #523 Phase A — In Progress until owner merge/post-merge verification.
- MON-62 / MON-63: Todo; not selected by #546.

## 9. Open pull-request memory

PR #546 on `feat/523-vietnam-bank-export-contract` contains:

- evidence-tagged VCB/ACB/VietinBank compatibility matrix and research record;
- pure fail-closed source-identity eligibility contract;
- three privacy-safe evidence fixtures with no customer rows/data;
- focused counterexample unit tests;
- conservative `/capture/upload` user guidance;
- targeted Playwright guidance coverage on the normal desktop/mobile suite;
- server-only projection of research metadata into minimal client guidance props;
- same-PR packet archive plus `PLAN_AUTHORITY.current → null` lifecycle projection.

Important evidence boundary: first-party material confirms **Excel** export/data retrieval in the scoped VCB, ACB and VietinBank flows, but does not prove an exact `.xls`/`.xlsx` extension, universal consumer layout or exported header contract. For VietinBank specifically, official customer-support guidance says iPay Web can retrieve an Excel file with detailed transaction data on the account. Exact headers, field semantics and stable provider transaction identity remain unverified. All three bank-specific auto-map flags remain disabled.

`source_external_id` eligibility requires a non-empty reference with `evidence=confirmed` and `stability=source-stable`. UI/display references, row indexes, export-local IDs, generated hashes and MoneyFlow preview fingerprints fail closed.

## 10. True gaps after this audit

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions.
2. Exact Excel extension/version where first-party sources only say “Excel”.
3. Provider-stable transaction identity across repeated/overlapping exports.
4. Exact exported date/timezone, currency/direction, status and fee semantics.
5. Privacy-safe structural statement examples before any bank-specific parser aliases are enabled.
6. Exact-head checks for the latest #546 correction head.
7. Explicit owner merge and post-merge #523/MON-61 closure verification.
8. A fresh-main owner selection before MON-62, MON-63 or any follow-on executable slice starts.

## 11. Next allowed action

Finish reconciling PR #546's issue/PR/memory records to the corrected VietinBank evidence, then verify the latest exact head. If CI/CodeQL/Secret-history and selected browser/UI gates pass, mark #546 Ready for review and wait for explicit owner merge authorization. After owner merge, verify merged-main authority/current memory and affected runtime health, then close #523 and mark MON-61 Done. Do not start MON-62/MON-63 before that closure.

## 12. Superseded-status register

- PR #545 is pending — **false**; it merged as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`.
- #523 was completed by selector PR #545 — **false**; #545 only selected it.
- PR #546 enables bank-specific auto-map — **false**; all target-bank auto-map flags remain disabled.
- VCB/ACB/VietinBank “Excel” evidence proves `.xlsx` — **false**; exact extension remains unproven.
- Existing generic `sample-bank.*` fixtures prove VCB/ACB/VietinBank compatibility — **false**.
- VietinBank target account downloadable artifact format is still wholly unknown — **false**; first-party customer-support guidance confirms Excel detailed transaction data on iPay Web, while exact layout/header/reference semantics remain unknown.
- A bank export row number, display reference or MoneyFlow heuristic fingerprint is a stable provider transaction ID — **false**.
- PR #546 may select MON-62/MON-63 while closing #523 — **false**; lifecycle law requires current → null and follow-on selection from fresh main.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
