# MoneyFlow — current project memory

**Status:** M0 #536 technical/runtime/database work is complete. This lifecycle-closeout state leaves `PLAN_AUTHORITY.current` as `null` and selects no follow-on work. Supabase leaked-password protection remains disabled by an explicitly owner-accepted Free-plan limitation; do not call that control remediated.
**Last reconciled:** 2026-09-03
**Merged runtime baseline:** `10c832aaaf27a6bf5406578871708789f4b1b14d` (PR #540)
**Lifecycle closeout:** PR #544; merge remains owner-controlled until exact-head checks are green
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. #536 has satisfied its bounded runtime, database and security-evidence objectives. This closeout archives the #536 packet and leaves executable current authority **unselected (`null`)**; M1 or any other follow-on must be selected later from fresh main in a separate lifecycle transition.

The owner chose to remain on Supabase Free and explicitly accepted leaked-password protection as a provider-plan limitation for the current M0 closure. That is an accepted limitation, not an enabled or remediated control.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data remains tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.

Production runtime is patched. Vercel deployment `dpl_Ch4Vfpdxw8mbUJ5ynjozZRTGLhYw` is READY from exact `main@10c832aaaf27a6bf5406578871708789f4b1b14d` and runs Next.js 16.3.4. Fresh `/api/health` after the database rollout returned HTTP 200 and that full commit; Vercel reported no runtime errors in the inspected post-rollout hour.

## 3. Acquisition and reconciliation truth

Production contains the repository acquisition/source-lineage contracts through `20260825090000_direct_csv_rule_atomic_ingestion`.

The owner-authorized linked CLI push preserved exact repository migration identities. Fresh remote history contains **56 migrations** and ends at `20260825090000`; no orphan MCP-generated timestamps exist.

Post-write production verification passed all **14 durable later contracts**: batch atomic approval, manual attachment, deleted-source restore, changed-source observation, approved-evidence guard, owner-preserving import-batch FK, source-lineage/replacement observation, source-aware archive producer/restore, archive updated-at owner guard, source-lifecycle review, lock-order hardening, Share Target atomic ingestion, Share Target rule-aware ingestion and Direct CSV rule-aware preparation.

Fresh source-identity verification reports zero candidate/candidate conflicts and zero candidate/provenance conflicts. Production authenticated-callable SECURITY DEFINER count is the repository-expected **43**.

#523 remains candidate-only and is **not selected** by this closeout.

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
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Runtime security | production runs `main@10c832aa...` / Next 16.3.4 |
| Performance | #527 reduced dashboard client cost; field score 39 provenance unresolved |
| Current authority | `null` in this lifecycle-closeout state; no follow-on selected |

## 6. Security and delivery truth

Merged-main CI #3260 (`33735497335`) passed the fresh local Supabase reset, complete migration chain, **39 pgTAP files / 747 tests**, archive producer/restore round trips and selected browser/ownership/UI/e2e gates.

The production rollout followed the packet safety model: verified private backup, exact linked migration list and dry-run, explicit owner authorization, forward `db push`, then independent remote history/schema/ACL/data/runtime/advisor verification. No migration-history repair, remote reset or production seed was used.

Postgres logs show the later DDL/function/grant statements executing on project `fwpldsdkpzhswpuctbke` around 2026-09-03 12:33 UTC with no migration-adjacent ERROR/PANIC/FATAL evidence in the inspected window.

## 7. Supabase security and production-schema truth

Fresh Security Advisor still reports the authenticated `SECURITY DEFINER` warning class and **Leaked Password Protection Disabled**.

The seven newly introduced authenticated-callable SECURITY DEFINER RPCs were individually re-classified after rollout: owner `postgres`, empty `search_path`, authenticated execute only, no anon/PUBLIC execute, `auth.uid()` plus explicit authentication/tenant binding, and no dynamic SQL/role-switch/service-role pattern. The two Share Target ingestion RPCs are SECURITY INVOKER and authenticated-only. No evidence-backed ownership defect was reproduced.

Supabase organization `aqnjchplxbyrucgofsep` remains on plan `free`. Owner decision for this M0 closure: remain Free, perform no workaround/provider write, and record the leaked-password limitation explicitly.

The verified pre-write encrypted logical backup remains private/off-repository. Never expose backup keys or plaintext material.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536: technical/runtime/database objectives complete; lifecycle-closeout PR #544 transitions current authority to `null`. Close the issue only after that PR is owner-merged and merged-main authority is re-read.
- #539: merged selector for #536.
- #540: merged runtime/security remediation; production verified on `10c832aa...`.
- #544: lifecycle closeout; archives #536, clears current authority, updates durable memory and selects no follow-on work. Merge remains owner-controlled.
- #523: candidate Vietnam bank-export compatibility slice; unselected.

## 9. Open pull-request memory

- PR #544: `docs/research/pr-memory/2026/Q3/PR-544.md`; owns #536 lifecycle convergence and must retain exact-head CI/CodeQL/Secret-history success before owner merge.
- PR #540 durable record remains historical merged implementation evidence.

## 10. True gaps after this audit

1. Obtain exact-head green checks for lifecycle-closeout PR #544 after its authority/archive changes.
2. Owner-merge #544 only if those checks and review state remain clean.
3. Re-read merged `PLAN_AUTHORITY.current` and require `null`.
4. Then close #536 and mark M0/Linear closure truthfully.
5. Select M1/follow-on work only from fresh main in a separate authority-transition PR.
6. Continue to state the Supabase Free leaked-password limitation explicitly; do not call it remediated.

## 11. Next allowed action

Verify PR #544 exact-head policy/lifecycle/CodeQL/Secret-history checks. Merge remains an owner decision.

Do not perform further production database/Auth/provider writes for this closure. The authorized 15-migration operation is complete and verified.

## 12. Superseded-status register

- Production still runs Next.js 16.2.11 — **false**; production is on Next 16.3.4 / `10c832aa...`.
- Production still lacks Aug-21–25 acquisition migrations — **false**; remote history is 56/56 through `20260825090000` and 14/14 durable contracts pass.
- SECURITY DEFINER count is still 36 — **false**; expected post-rollout count is 43 and the seven new privileged RPCs were individually classified.
- `migration repair` is needed for the completed rollout — **false**; exact repository migration versions were applied by linked CLI.
- Leaked-password protection is enabled — **false**; it remains disabled and explicitly accepted as a Free-plan limitation for this M0 closure.
- #536 is still an executable current slice in this closeout state — **false**; `PLAN_AUTHORITY.current` is `null` and the packet is archived.
- M1 is selected by this closeout — **false**; follow-on selection is intentionally deferred to fresh main.
- Owner-observed Vercel score 39 was fixed by #527 — **false**; lab cost improved, field provenance remains unresolved.
