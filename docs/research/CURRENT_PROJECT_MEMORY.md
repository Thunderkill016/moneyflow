# MoneyFlow — current project memory

**Status:** M0 Release Integrity is closed. M1 — Vietnam Acquisition Depth is active, with #523 / MON-61 as the single current executable slice.
**Last reconciled:** 2026-09-04
**Merged main baseline:** `2ac2026c3d5a27898b17482b36f503a32a3dd4f6` (PR #545 selector)
**Current authority:** `docs/plans/active/523-vietnam-bank-export-compatibility.md` (`selectedByPr: 545`)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 is complete across runtime, production database, provider decision and lifecycle governance.

The owner selected **M1 — Vietnam Acquisition Depth**. PR #545 was owner-merged to `main` as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`, so #523 / Linear MON-61 is now executable current authority. MON-62 and MON-63 remain unselected.

The current implementation branch is `feat/523-vietnam-bank-export-contract`, based exactly on `main@2ac2026c...`. Branch content is candidate evidence until owner merge.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.

M1 has not changed production DB/Auth/provider state.

## 3. Acquisition and reconciliation truth

Production contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`; M0 verified 56/56 migration identities and all later durable acquisition contracts.

Current file acquisition remains generic rather than bank-specific:

- `/imports/direct` is CSV-only, with client-side mapping/dry-run and authenticated all-or-nothing commit through the existing candidate/provenance path.
- `parse-csv.ts` supports generic date/amount/description/debit/credit heuristics and integer VND but no provider transaction-reference field.
- `parse-xlsx.ts` uses SheetJS extraction and then the same generic matrix parser.
- `direct-csv-import.ts` intentionally does not invent `sourceExternalId`; preview fingerprints are not persisted source identity.
- DB source-lineage can preserve explicit source IDs later, but only when the source artifact actually supplies reliable provider evidence.

## 4. Performance truth after #527

PR #538 completed #527. Same-methodology `/dashboard` lab medians improved modestly in performance/LCP and materially in TBT/JS bootup, while CLS remained 0. Dashboard LCP still exceeds 2.5 s and the owner-observed Vercel score 39 provenance remains unresolved.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | provenance/source-lineage, generic CSV/XLSX/PDF surfaces, Direct CSV atomic/rule-aware ingestion, Share Target atomic/rule-aware ingestion; bank-specific export auto-map is not shipped |
| Review | exception-first review plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Current authority | #523 / MON-61 M1 Phase A selected by merged PR #545 |

## 6. Security and delivery truth

Merged-main selector evidence is green on exact `main@2ac2026c...`: CI #3283, CodeQL #2315 and Secret history #2315 succeeded.

M1 implementation permission is branch/PR only. No direct `main`, merge without owner authorization, production DB/Auth/provider mutation, Vercel production configuration write, external bank account access or real customer statement data is authorized.

## 7. Supabase security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and existing Supabase Free-plan leaked-password-protection limitation. M1 Phase A does not modify this boundary.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523: **open and active** M1 Phase A. It was auto-closed when selector #545 merged and was reopened on 2026-09-04 because selector merge did not complete the feature slice.
- MON-50: M1 — Vietnam Acquisition Depth — In Progress.
- MON-61: first M1 bank-export compatibility/evidence contract — In Progress.
- MON-62 / MON-63: Todo; not selected.

## 9. Open pull-request memory

Implementation branch `feat/523-vietnam-bank-export-contract` currently contains candidate T2/T3 work:

- `docs/research/VIETNAM_BANK_EXPORT_COMPATIBILITY_2026.md` — evidence-tagged VCB/ACB/VietinBank matrix;
- `src/lib/inbox/bank-export-compatibility.ts` — pure compatibility/source-identity eligibility contract;
- three `*-export-evidence.fixture.json` privacy-safe evidence fixtures;
- `bank-export-compatibility.test.ts` counterexample tests;
- updated active packet and PR-memory candidate.

Important behavior decision: **no bank-specific auto-map is enabled** because exact current exported headers/layouts are unverified. VCB and ACB first-party material confirms Excel export in supported flows; current VietinBank evidence confirms statement/history access but does not establish the target consumer-account downloadable file schema.

`source_external_id` eligibility requires a non-empty reference with `evidence=confirmed` and `stability=source-stable`. UI/display references, row indexes, export-local IDs, generated hashes and MoneyFlow preview fingerprints fail closed.

T4 user-visible guidance and T5 evaluation remain before the PR can claim #523 complete.

## 10. True gaps after this audit

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions.
2. Provider-stable transaction identity across repeated/overlapping exports.
3. Exact export date/timezone, currency/direction, status and fee semantics.
4. Privacy-safe structural statement examples before any bank-specific parser aliases are enabled.
5. Minimal user-visible guidance for supported/unknown bank-export artifacts.
6. Exact-head implementation CI/CodeQL/Secret-history and evaluator review.
7. Same-PR lifecycle convergence (`current → null`, packet archive, memory projection) before owner merge if this PR completes #523.

## 11. Next allowed action

Open/continue the focused draft implementation PR from `feat/523-vietnam-bank-export-contract`, run exact-head checks for T2/T3, then add the smallest T4 guidance without changing parser or financial mutation ownership. Do not enable bank-specific auto-map unless stronger source evidence first changes the packet/spec.

## 12. Superseded-status register

- PR #545 is still pending — **false**; it merged as `2ac2026c3d5a27898b17482b36f503a32a3dd4f6`.
- `PLAN_AUTHORITY.current` is null — **false**; #523 is current authority selected by #545.
- #523 is completed because #545 merged — **false**; #545 only selected the packet; #523 is reopened/active.
- Existing generic `sample-bank.*` fixtures prove VCB/ACB/VietinBank compatibility — **false**.
- VCB/ACB first-party Excel availability proves exact current exported headers — **false**.
- Current VietinBank statement/history material proves the target consumer-account downloadable file format — **false**.
- A bank export row number, UI reference or MoneyFlow heuristic fingerprint is a stable provider transaction ID — **false**.
- Bank-specific auto-map is currently safe to enable for the three target banks — **false**; exact layout evidence is still missing.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
