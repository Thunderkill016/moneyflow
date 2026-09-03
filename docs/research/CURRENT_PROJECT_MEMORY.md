# MoneyFlow — current project memory

**Status:** #536 remains the selected Class 3 slice only until repository lifecycle closure converges. Runtime remediation and production database parity are verified. The owner explicitly accepts the Supabase Free-plan leaked-password-protection limitation for the current M0 closure; no paid-plan/Auth write is authorized.
**Last reconciled:** 2026-09-03
**Merged main baseline:** `10c832aaaf27a6bf5406578871708789f4b1b14d` (PR #540)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. Runtime security and the Aug-21–25 production database parity gap are now closed by evidence. #536 remains current only because `PLAN_AUTHORITY.current` still points to its active packet; lifecycle closeout must move that authority to `null` before follow-on work is selected.

The owner chose to remain on Supabase Free and explicitly accepted leaked-password protection as a provider-plan limitation for this M0 closure. That is an accepted limitation, not a remediated control; do not claim the feature is enabled or silently upgrade the plan.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data remains tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.

Production runtime is patched: Vercel deployment `dpl_Ch4Vfpdxw8mbUJ5ynjozZRTGLhYw` is READY from exact `main@10c832aaaf27a6bf5406578871708789f4b1b14d`; fresh `/api/health` after the database rollout returned HTTP 200 and that full commit. Vercel reported no runtime errors in the post-migration one-hour window.

## 3. Acquisition and reconciliation truth

Production now contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`.

The owner-authorized linked CLI push preserved exact repository migration identities. Fresh remote history contains **56 migrations** and ends at `20260825090000`; there are no orphan MCP-generated timestamps.

Post-write production verification passed all **14 durable later contracts**: batch atomic approval, manual attachment, deleted-source restore, changed-source observation, approved-evidence guard, owner-preserving import-batch FK, source-lineage columns/replacement observation, source-aware archive producer/restore, archive updated-at owner guard, source-lifecycle review, lock-order hardening, Share Target atomic ingestion, Share Target rule-aware ingestion and Direct CSV rule-aware preparation.

Fresh source-identity verification after the write reports zero approved-candidate/candidate conflicts and zero candidate/provenance conflicts. Production authenticated-callable SECURITY DEFINER count increased from 36 to the expected **43**.

#523 remains candidate-only while lifecycle authority still points at #536.

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
| Acquisition | production supports provenance, exact-source matching, Direct CSV atomic approval/rules, Share Target atomic/rule-aware ingestion and source-lineage lifecycle |
| Review | exception-first Ready/Needs-attention grouped review |
| Ownership | versioned archive/export/validation/restore with current source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Runtime security | production runs `main@10c832aa...` / Next 16.3.4 |
| Performance | #527 materially reduced dashboard client cost; field score 39 unresolved |
| M0 | technical gates complete; repository lifecycle closeout remains |

## 6. Security and delivery truth

Merged-main CI #3260 (`33735497335`) passed the fresh local Supabase reset, full migration chain, **39 pgTAP files / 747 tests**, archive producer/restore round trips and selected browser/ownership/UI/e2e gates.

The production rollout followed the packet safety model: verified private backup, exact linked migration list and dry-run, explicit owner authorization, forward `db push`, then independent remote history/schema/ACL/data/runtime/advisor verification. No migration-history repair, remote reset or production seed was used.

Postgres logs show the later DDL/function/grant statements executing on project `fwpldsdkpzhswpuctbke` around 2026-09-03 12:33 UTC with no migration-adjacent ERROR/PANIC/FATAL evidence in the inspected window.

## 7. Supabase security and production-schema truth

Fresh Security Advisor still reports the authenticated `SECURITY DEFINER` warning class and **Leaked Password Protection Disabled**.

The seven newly introduced authenticated-callable SECURITY DEFINER RPCs were individually re-classified after rollout: owner `postgres`, empty `search_path`, authenticated execute only, no anon/PUBLIC execute, `auth.uid()` plus explicit authentication/tenant binding, and no dynamic SQL/role-switch/service-role pattern. The two Share Target ingestion RPCs are SECURITY INVOKER and authenticated-only. The warning class therefore remains an intentional privileged API disposition, not a reproduced ownership defect.

Supabase organization `aqnjchplxbyrucgofsep` remains on plan `free`. Leaked-password protection is available on Pro and above. Owner decision for M0: remain Free, perform no workaround/provider write, and record the limitation explicitly.

The verified pre-write encrypted logical backup remains private/off-repository. Do not expose backup keys or plaintext material.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536: production runtime + database work verified; remains open only pending repository lifecycle convergence and truthful closure record.
- #539: merged selector for #536.
- #540: merged runtime/security remediation; production verified on `10c832aa...`.
- #544: open evidence-only reconciliation PR; now records successful production parity but does not itself clear `PLAN_AUTHORITY.current`.
- #523: candidate Vietnam bank-export compatibility slice; unselected.

## 9. Open pull-request memory

- PR #544: `docs/research/pr-memory/2026/Q3/PR-544.md`; reconciles post-#540 and post-production-migration truth. It does not merge itself, clear current authority or select follow-on work.
- PR #540 durable record remains historical merged implementation evidence.

## 10. True gaps after this audit

1. Complete repository lifecycle convergence for #536: archive the active packet and change `PLAN_AUTHORITY.current` from #536 to `null` in one policy-valid PR.
2. Merge that lifecycle closeout only with owner authorization and exact-head green checks.
3. Close #536/M0 only when GitHub, Linear and merged repository authority all agree on the same truth.
4. Select M1/follow-on work only from fresh main after current authority is null.
5. Continue to state the Supabase Free leaked-password limitation explicitly; do not call it remediated.

## 11. Next allowed action

Prepare lifecycle closeout from fresh `main@10c832aa...` without selecting follow-on work. Repository/document work is allowed; merge remains owner-controlled.

Do not perform further production database/Auth/provider writes for this closure. The authorized 15-migration operation is complete and verified.

## 12. Superseded-status register

- Production still runs Next.js 16.2.11 — **false**; production is on Next 16.3.4 / `10c832aa...`.
- Production still lacks Aug-21–25 acquisition migrations — **false**; remote history is 56/56 through `20260825090000` and 14/14 durable contracts pass.
- SECURITY DEFINER count is still 36 — **false**; expected post-rollout count is 43 and the seven new privileged RPCs were individually classified.
- `migration repair` is needed for the completed rollout — **false**; exact repository migration versions were applied by linked CLI.
- Leaked-password protection is enabled — **false**; it remains disabled and explicitly accepted as a Free-plan limitation for M0 closure.
- #536 lifecycle is already closed — **false**; `PLAN_AUTHORITY.current` on merged main still points to the active #536 packet.
- Owner-observed Vercel score 39 was fixed by #527 — **false**; lab cost improved, field provenance remains unresolved.
