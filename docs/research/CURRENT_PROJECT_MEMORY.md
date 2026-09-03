# MoneyFlow — current project memory

**Status:** M0 Release Integrity is closed. The owner has selected M1 — Vietnam Acquisition Depth; PR #545 is the selector for the first bounded M1 slice, #523 / MON-61. Until #545 is owner-merged, merged `main` still has `PLAN_AUTHORITY.current: null`.
**Last reconciled:** 2026-09-03
**Merged main baseline:** `43020263333317ee8be8c7a8adea7ee502e7585d` (PR #544 lifecycle closeout)
**M1 selector:** PR #545; merge remains owner-controlled
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 is complete across runtime, production database, provider decision and lifecycle governance. Merged `main@43020263...` has `PLAN_AUTHORITY.current: null` and the #536 packet archived.

The owner has now explicitly selected **M1 — Vietnam Acquisition Depth**. The first bounded slice is **GitHub #523 / Linear MON-61: Vietnam bank-export compatibility matrix and privacy-safe fixture contract**, initially targeting Vietcombank, ACB and VietinBank. PR #545 is a separate selector PR from fresh main; only if it is owner-merged does `docs/plans/active/523-vietnam-bank-export-compatibility.md` become executable current authority.

MON-50 and MON-61 are In Progress as product/control-plane intent. MON-62 and MON-63 remain Todo and are not selected by this transition.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data remains tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.

Production is healthy on merged `main@43020263333317ee8be8c7a8adea7ee502e7585d`. Vercel deployment `dpl_68Tn1ZqGdofT66vBycoYjryxv32N` is READY on that exact commit, `/api/health` returned HTTP 200 with the full build commit, and no recent runtime errors were observed during M0 closeout verification.

## 3. Acquisition and reconciliation truth

Production contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`.

The owner-authorized linked CLI push preserved exact repository migration identities. Fresh remote history contains **56 migrations** and ends at `20260825090000`; no orphan MCP-generated timestamps exist.

Post-write production verification passed all **14 durable later contracts**: batch atomic approval, manual attachment, deleted-source restore, changed-source observation, approved-evidence guard, owner-preserving import-batch FK, source-lineage/replacement observation, source-aware archive producer/restore, archive updated-at owner guard, source-lifecycle review, lock-order hardening, Share Target atomic ingestion, Share Target rule-aware ingestion and Direct CSV rule-aware preparation.

Fresh source-identity verification reports zero candidate/candidate conflicts and zero candidate/provenance conflicts. Production authenticated-callable SECURITY DEFINER count is the repository-expected **43**.

Current file acquisition is still generic rather than bank-specific:

- `/imports/direct` is CSV-only, with client-side mapping/dry-run and authenticated all-or-nothing commit through the existing candidate/provenance path.
- `parse-csv.ts` supports generic date/amount/description/debit/credit heuristics and integer VND but no provider transaction-reference field.
- `parse-xlsx.ts` uses SheetJS first-sheet extraction and then the same generic matrix parser.
- `direct-csv-import.ts` intentionally does not invent `sourceExternalId`; preview fingerprints are not persisted source identity.
- DB source-lineage contracts can store explicit source IDs/lifecycle later, but only when the source artifact actually supplies reliable evidence.
- Existing committed fixtures are generic/demo only; no VCB/ACB/VietinBank production-claim fixture exists yet.

## 4. Performance truth after #527

PR #538 completed #527. Same-methodology `/dashboard` medians versus its pre-#527 baseline: performance 86 -> 87; LCP 4009.7 -> 3793.9 ms; TBT 140.0 -> 77.9 ms; script transfer -5.0%; total transfer -3.4%; main-thread -8.7%; JS bootup -21.7%; CLS remained 0.

Dashboard LCP still exceeds 2.5 s. Owner-observed Vercel score 39 remains unresolved field provenance and is not claimed fixed.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | production supports provenance, exact-source matching, generic CSV/XLSX/PDF parsing surfaces, Direct CSV atomic approval/rules, Share Target atomic/rule-aware ingestion and source-lineage lifecycle; bank-specific export compatibility is not yet implemented |
| Review | exception-first Ready/Needs-attention grouped review |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Runtime security | production runs `main@43020263...` / Next 16.3.4 |
| Performance | #527 reduced dashboard client cost; field score 39 provenance unresolved |
| Current authority | merged main is `null`; PR #545 proposes #523 as current M1 Phase A slice |

## 6. Security and delivery truth

Merged-main CI #3273 (`33769087032`) succeeded on `43020263333317ee8be8c7a8adea7ee502e7585d`, including fresh local Supabase reset + pgTAP, archive producer/restore round trips, production build, static quality, unit/static-RLS, Browser smoke, authenticated ownership smoke, Cross-device UI audit and final aggregators. Main CodeQL #2307 and Secret history #2307 also succeeded.

The M0 production rollout followed the packet safety model: verified private backup, exact linked migration list and dry-run, explicit owner authorization, forward `db push`, then independent remote history/schema/ACL/data/runtime/advisor verification. No migration-history repair, remote reset or production seed was used.

PR #545 is planning/authority only. It must not change runtime code, production database/Auth/provider state, Vercel production configuration or external bank accounts. If merged, implementation begins from fresh main with `npm run plan:resolve` and `npm run agent:doctor -- --json` before executable changes.

## 7. Supabase security and production-schema truth

Fresh Security Advisor at M0 closeout still reported the authenticated `SECURITY DEFINER` warning class and **Leaked Password Protection Disabled**.

The seven newly introduced authenticated-callable SECURITY DEFINER RPCs were individually re-classified after rollout: owner `postgres`, empty `search_path`, authenticated execute only, no anon/PUBLIC execute, `auth.uid()` plus explicit authentication/tenant binding, and no dynamic SQL/role-switch/service-role pattern. The two Share Target ingestion RPCs are SECURITY INVOKER and authenticated-only. No evidence-backed ownership defect was reproduced.

Supabase organization `aqnjchplxbyrucgofsep` remains on plan `free`. Owner decision for M0: remain Free, perform no workaround/provider write, and record the leaked-password limitation explicitly. It remains disabled and is not a remediated control.

The verified pre-write encrypted logical backup remains private/off-repository. Never expose backup keys or plaintext material.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed; GitHub #536 closed completed; merged authority returned to null.
- #523: owner-selected M1 Phase A candidate; PR #545 proposes it as current authority.
- MON-50: M1 — Vietnam Acquisition Depth — In Progress by owner selection.
- MON-61: first M1 compatibility/fixture contract — In Progress.
- MON-62 / MON-63: Todo; not selected by PR #545.

## 9. Open pull-request memory

- PR #545: M1 selector only. Adds the #523 Class 3 packet, proposes `PLAN_AUTHORITY.current` from null to #523 with `selectedByPr: 545`, reconciles this snapshot and records its own PR memory. It must retain exact-head policy/CI/CodeQL/Secret-history success before owner merge.
- There is no open M0 lifecycle PR; #544 is merged historical evidence.

## 10. True gaps after this audit

1. Complete PR #545 authority/memory records and exact-head checks; owner merge remains required before #523 becomes executable current authority.
2. Establish an evidence-tagged compatibility matrix for Vietcombank, ACB and VietinBank without inventing headers, status semantics or stable transaction IDs.
3. Validate privacy-safe structural fixtures and normalization contracts against stronger first-party evidence or private real-export structure before claiming bank/version support.
4. Reuse one candidate/provenance/matching/ledger/reconciliation path; never create a provider-specific financial truth or promote a heuristic fingerprint/row number to `source_external_id`.
5. Keep MON-62/MON-63 unselected until Phase A contract evidence supports the next slice.
6. Continue to state the Supabase Free leaked-password limitation explicitly; do not call it remediated.

## 11. Next allowed action

Finish selector PR #545: add the required PR-memory record, verify the authority transition and exact-head CI/CodeQL/Secret-history gates, then hand off for explicit owner merge authorization.

If #545 is owner-merged, re-read fresh merged authority, run `npm run plan:resolve` and `npm run agent:doctor -- --json`, then begin #523 implementation on a separate focused branch. No production DB/Auth/provider write is authorized by M1 selection.

## 12. Superseded-status register

- PR #544 is still open — **false**; it merged as `43020263333317ee8be8c7a8adea7ee502e7585d`.
- #536 is still open/current — **false**; it is closed completed and merged current authority is null.
- M0 is still at risk/in progress — **false**; MON-47 is Done and project health was reconciled on-track at closure.
- Production still lacks Aug-21–25 acquisition migrations — **false**; remote history is 56/56 through `20260825090000` and 14/14 durable contracts pass.
- SECURITY DEFINER count is still 36 — **false**; expected post-rollout count is 43 and the seven new privileged RPCs were individually classified.
- Leaked-password protection is enabled — **false**; it remains disabled and explicitly accepted as a Free-plan limitation for M0.
- M1 is executable current authority merely because the owner said “tiếp theo m1” — **false**; owner selection activates product/control-plane intent, while repository executable authority changes only if selector PR #545 is owner-merged.
- Existing generic `sample-bank.*` fixtures prove Vietcombank/ACB/VietinBank compatibility — **false**; they are generic structural/demo fixtures only.
- A bank export row number or MoneyFlow heuristic fingerprint is a stable provider transaction ID — **false**; stable source identity requires explicit source evidence.
- Owner-observed Vercel score 39 was fixed by #527 — **false**; lab cost improved, field provenance remains unresolved.
