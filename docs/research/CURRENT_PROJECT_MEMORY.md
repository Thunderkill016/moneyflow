# MoneyFlow — current project memory

**Status:** M0 is closed. M1 Phase A #523 implementation/evaluation is complete on PR #546; the PR is Ready for review and this branch projects lifecycle closeout. Owner merge and post-merge verification remain pending.
**Last reconciled:** 2026-09-04
**Merged main baseline before PR #546:** `2ac2026c3d5a27898b17482b36f503a32a3dd4f6` (PR #545 selector)
**Projected authority after PR #546 merge:** `PLAN_AUTHORITY.current: null`; no follow-on slice is selected in #546.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 Release Integrity is complete.

The owner selected **M1 — Vietnam Acquisition Depth** and PR #545 selected #523 / MON-61 as the first executable slice. PR #546 now contains the bounded Phase A implementation, independent evaluation and same-PR lifecycle projection and is Ready for review. It does not select MON-62, MON-63 or any other follow-on packet.

Until PR #546 is explicitly owner-merged, merged `main@2ac2026c...` still has #523 as current authority and GitHub #523 / Linear MON-61 remain open/In Progress. If #546 merges after its final exact-head documentation checks are green, current authority becomes `null`; follow-on M1 work must be selected from fresh main.

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

Phase A adds an evidence contract, not a new parser or posting authority.

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
| Acquisition | provenance/source-lineage, generic CSV/XLSX/PDF surfaces, Direct CSV atomic/rule-aware ingestion, Share Target atomic/rule-aware ingestion; #523 adds evidence-backed VCB/ACB/VietinBank compatibility guidance but no bank-specific auto-map |
| Review | exception-first review plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority after #546 merge | none; `current: null`, follow-on selection required from fresh main |

## 6. Security and delivery truth

Selector merged-main evidence is green on exact `main@2ac2026c...`: CI #3283, CodeQL #2315 and Secret history #2315 succeeded.

PR #546 lifecycle-converged implementation head `dfb38edec9714437b26771566464103c79d40e9b` passed CI #3303, CodeQL #2335 and Secret history #2335. CI #3303 also passed policy/knowledge/migration identity, lint/typecheck, architecture/CSS ownership, unit/static-RLS, production build, fresh local Supabase reset + pgTAP, archive producer/restore round trips, Browser smoke, Cross-device UI audit and final verify/e2e aggregators. T5 review is blocker-free after the recorded fixes.

A final documentation-only reconciliation records that evidence and Ready-for-review state. Because it changes the PR head, its own exact-head checks must pass before owner merge; this does not reopen implementation findings.

No production DB/Auth/provider/Vercel write, external bank access or real customer statement data is part of #546.

## 7. Supabase security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation. M1 Phase A does not modify this boundary.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523: open until explicit owner merge/post-merge verification. Its implementation/evaluation is represented by Ready-for-review PR #546; selector auto-close was previously corrected by reopening the issue.
- PR #546: Ready for review, mergeable, lifecycle-converged; exact-head checks for the final docs-only evidence reconciliation are the remaining pre-merge gate. Merge remains owner-controlled.
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

Important evidence boundary: VCB and ACB first-party material confirms **Excel** export in supported scopes, not an exact `.xls`/`.xlsx` extension or exported header contract. Current VietinBank evidence confirms statement/history access but does not establish the target consumer-account downloadable file format. All three bank-specific auto-map flags remain disabled.

`source_external_id` eligibility requires a non-empty reference with `evidence=confirmed` and `stability=source-stable`. UI/display references, row indexes, export-local IDs, generated hashes and MoneyFlow preview fingerprints fail closed.

## 10. True gaps after this audit

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions.
2. Provider-stable transaction identity across repeated/overlapping exports.
3. Exact exported date/timezone, currency/direction, status and fee semantics.
4. Privacy-safe structural statement examples before any bank-specific parser aliases are enabled.
5. Exact-head checks for the final docs-only #546 evidence reconciliation.
6. Explicit owner merge and post-merge #523/MON-61 closure verification.
7. A fresh-main owner selection before MON-62, MON-63 or any follow-on executable slice starts.

## 11. Next allowed action

Verify the final docs-only #546 head. If its exact-head CI/CodeQL/Secret-history gates pass, keep #546 Ready for review and wait for explicit owner merge authorization. After owner merge, verify merged-main authority/current memory and runtime health, then close #523 and mark MON-61 Done. Do not start MON-62/MON-63 before that closure.

## 12. Superseded-status register

- PR #545 is pending — **false**; it merged as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`.
- #523 was completed by selector PR #545 — **false**; #545 only selected it.
- PR #546 enables bank-specific auto-map — **false**; all target-bank auto-map flags remain disabled.
- VCB/ACB “Excel” evidence proves `.xlsx` — **false**; exact extension remains unproven.
- Existing generic `sample-bank.*` fixtures prove VCB/ACB/VietinBank compatibility — **false**.
- Current VietinBank statement/history material proves the target downloadable file format — **false**.
- A bank export row number, display reference or MoneyFlow heuristic fingerprint is a stable provider transaction ID — **false**.
- PR #546 may select MON-62/MON-63 while closing #523 — **false**; lifecycle law requires current → null and follow-on selection from fresh main.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
