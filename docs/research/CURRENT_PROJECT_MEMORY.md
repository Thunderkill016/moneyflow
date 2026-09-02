# MoneyFlow — current project memory

**Status:** PR #538 is the non-draft replacement merge vehicle for #527; merged `main` still selects #527 until #538 merges
**Last reconciled:** 2026-09-02
**Merged main baseline:** `0585caea055797cf3c0bfe45494946629ae5a7d0` (PR #531)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It is functional but **not public-beta ready**.

Merged #432/#433 remains the master product program. Merged #531 made `docs/plans/PLAN_AUTHORITY.json` the single executable selector and activated current slice #527. PR #532 produced the canonical #527 implementation/evidence tree and reached full exact-head green at `6ae948e553309d28bcb3ee6132324241cfa0e2ac`, but GitHub REST refuses to merge it while Draft and the connected Ready-for-review mutation is broken upstream on `Repository.fullDatabaseId`.

PR #538 is therefore the non-draft replacement merge vehicle, created directly from that exact-green #532 head. Its replacement delta is provenance only. If #538 merges, it leaves `current: null`; it does not select follow-on work.

A separate whole-project audit on 2026-09-02 found a release-blocking runtime security gap: main still pins Next.js 16.2.11 while the current upstream patched 16.x floor for the August Critical advisories is 16.3.3. Issue #536 and draft PR #537 record the future Class 3 security packet, but #536 remains unselected and non-executable until #527 closes and a later selector merges from fresh main.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.
- The #532/#538 performance tree changes loading ownership only; it does not add a second financial authority.

## 3. Acquisition and reconciliation truth

Merged acquisition lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse through PR #464.

The generic file importer remains shallow relative to real Vietnam consumer bank exports. Exact schemas still require privacy-safe structural fixtures. #523 remains candidate-only and is not selected by #538.

## 4. Current execution state

The #532/#538 tree applies three bounded #527 mechanisms:

- remove eager `priority` from the below-fold landing story image;
- mount dashboard AddTransactionDialog and TransferDialog only while needed;
- lazy-load the shared AppShell Sheet on first More-sheet use, then keep it mounted after first use so close/focus restoration remains correct.

The first Sheet attempt unmounted immediately on close and exact-head browser/UI CI caught a real focus-restoration regression. The corrected one-way lazy mount passed the previously failing authenticated focus assertion. No accessibility assertion was weakened.

The canonical same-methodology Lighthouse 13.4.1 comparison uses production build/start, mobile simulated throttling, authenticated loopback Supabase double and three samples per route.

PR #532 final exact head passed CI #3209, CodeQL #2244 and Secret history #2244, including fresh Supabase reset + pgTAP + archive round-trip, Browser smoke, authenticated ownership, Cross-device UI audit and `e2e`. PR #538 must still pass its own exact-head checks after the provenance-only replacement delta before merge.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target, deterministic rules |
| Review | exception-first Ready/Needs-attention grouped review from PR #522 |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Performance | #532/#538 materially reduces dashboard client cost; field score 39 is not claimed fixed |
| Public beta | not approved; security issue #536 remains release-blocking candidate work |

## 6. Performance truth

Owner-reported Vercel score **39** remains field provenance and has not been reproduced by the repository harness or queried from Speed Insights through the connected provider surface.

Same-methodology `/dashboard` medians, merged main `0585caea...` -> #532/#538 candidate:

- performance score 86 -> 87;
- LCP 4009.7 -> 3793.9 ms (-5.4%);
- TBT 140.0 -> 77.9 ms (-44.4%);
- script transfer 319,931 -> 303,886 B (-5.0%);
- total transfer 553,643 -> 534,785 B (-3.4%);
- main-thread 1735 -> 1585 ms (-8.7%);
- JS bootup 805 -> 630 ms (-21.7%);
- CLS remains 0.

`/` is a regression/control route and remained effectively flat: score 94 -> 94; LCP 2958 -> 2881 ms; script transfer and main-thread work changed only within a small range.

LCP remains above 2.5 s. Current attribution names the remaining bottleneck rather than hiding it: dashboard server response is small (~16 ms TTFB in the harness), while render-blocking CSS still carries roughly 1.24 s estimated delay and residual dashboard main-thread work remains about 1.58 s. The tested dashboard LCP element is the empty-state statement paragraph; its render delay improved materially but did not reach the target.

`npm run analyze -- --output` was executed on both merged-main baseline and the #532 candidate under Node 22 with real installs. Analyzer output is written to `.next/diagnostics/analyze` as the Next.js module graph. Detailed module-owner evidence remains in PR #532 memory; PR #538 carries the exact same runtime tree.

## 7. Security and delivery truth

- 21/21 audited public application tables have RLS enabled; the audited anonymous role has no application-table CRUD.
- No cross-tenant P0 was found in the 2026-09-02 database/RPC audit.
- Supabase Security Advisor reports leaked-password protection disabled; current docs expose this as `password_hibp_enabled`, available on Pro and above.
- Main pins Next.js 16.2.11; issue #536 records the requirement to move to patched 16.3.3+ and triage the remaining npm High advisory.
- No Next upgrade, Supabase Auth write, provider change or deployment belongs in #538.
- `docs/plans/PLAN_AUTHORITY.json` remains the only executable selector.
- Completing current work must leave zero current slice and cannot preselect #536 or #523.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531: selected and governance-recovered performance slice; PR #538 is now its canonical non-draft merge vehicle.
- #532: detailed implementation/evidence predecessor; exact-head full-green but still Draft because the connected Ready-for-review mutation is broken upstream.
- #538: open non-draft replacement created from #532 exact-green head; provenance-only delta must pass its own exact-head gates before merge.
- #533/#534/#535: closed duplicate performance PRs.
- #536: open release-blocking security issue; future Class 3 execution only after explicit selection.
- #537: draft packet-preparation PR; exact-head green, no authority change, no runtime/provider write.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Open pull-request memory

PR #538 durable record: `docs/research/pr-memory/2026/Q3/PR-538.md`.

PR #532 durable record: `docs/research/pr-memory/2026/Q3/PR-532.md`; it retains detailed mechanism, analyzer, Lighthouse and regression provenance for the tree carried by #538.

PR #537 durable record: `docs/research/pr-memory/2026/Q3/PR-537.md` on its separate branch. It prepares #536 only; it does not activate it.

The connected GitHub Ready-for-review mutation currently fails because its response requests nonexistent GraphQL field `Repository.fullDatabaseId`. GitHub REST correctly refuses to merge Draft PRs. #538 exists only as the non-draft delivery workaround and must not be used to bypass required checks.

## 10. True gaps after this audit

1. Run and require exact-head checks for non-draft replacement PR #538, then merge it only under the owner's explicit approval already given on 2026-09-02.
2. Do not claim Vercel score 39 resolved without new field evidence; retain render-blocking CSS/residual client work as explicit future performance debt rather than silently extending #527.
3. From fresh main with `current: null`, persist/merge the #536 packet if needed and select #536 in a separate authority PR.
4. Under active #536, upgrade Next to a patched 16.3.x release at least 16.3.3, run exact `npm audit --json`, and verify auth/browser/financial regressions.
5. Enable and verify Supabase leaked-password protection only through an authorized reversible provider change under #536.
6. Reconsider #523 or other product work only after release-blocking security work is dispositioned.

## 11. Next allowed action

On the #538 branch, only replacement provenance plus #527 closure verification is allowed. Do not change runtime behavior, security dependencies, provider settings or plan selection. Require exact-head CI/CodeQL/Gitleaks/browser/UI for #538; if green, owner approval already authorizes squash merge. After successful #538 merge, close #532 unmerged as the superseded draft predecessor.

After #538 merges, the next execution decision must start from fresh `main`. #536 is the recommended release-blocking candidate from the 2026-09-02 audit, but it still requires a separate selector; it is not auto-selected by this memory.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by #529/#531.
- Hand-written Current main SHA / Post-merge projection activation — superseded by manifest authority.
- #511 materially reducing manual-entry friction or 40% grouped clicks — superseded.
- SMS as a primary acquisition bet — unsupported.
- AI as MoneyFlow positioning — unsupported; use only where safely reducing capture/reconcile friction.
- #523 already selected — false; it remains candidate-only.
- Owner-observed Vercel score 39 already fixed by #532/#538 — false; repository lab cost improved but field score is not reproduced.
- #536 already executable — false until a separate post-#527 selector merges.
- Master #432 alone authorizes provider/bank/native/OCR/security-provider work — false; each needs a bounded researched slice.
