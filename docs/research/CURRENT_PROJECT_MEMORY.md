# MoneyFlow — current project memory

**Status:** PR #532 closure candidate for #527; merged `main` still selects #527 until owner merge
**Last reconciled:** 2026-09-02
**Merged main baseline:** `0585caea055797cf3c0bfe45494946629ae5a7d0` (PR #531)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It is functional but **not public-beta ready**.

Merged #432/#433 remains the master product program. Merged #531 made `docs/plans/PLAN_AUTHORITY.json` the single executable selector and activated current slice #527. PR #532 is the canonical #527 implementation/closure candidate. If #532 merges, it leaves `current: null`; it does not select follow-on work.

A separate whole-project audit on 2026-09-02 found a release-blocking runtime security gap: main still pins Next.js 16.2.11 while the current upstream patched 16.x floor for the August Critical advisories is 16.3.3. Issue #536 and draft PR #537 record the future Class 3 security packet, but #536 remains unselected and non-executable until #527 closes and a later selector merges from fresh main.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.
- Performance work in #532 changes loading ownership only; it does not add a second financial authority.

## 3. Acquisition and reconciliation truth

Merged acquisition lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse through PR #464.

The generic file importer remains shallow relative to real Vietnam consumer bank exports. Exact schemas still require privacy-safe structural fixtures. #523 remains candidate-only and is not selected by #532.

## 4. Current execution state

PR #532 applies three bounded #527 mechanisms:

- remove eager `priority` from the below-fold landing story image;
- mount dashboard AddTransactionDialog and TransferDialog only while needed;
- lazy-load the shared AppShell Sheet on first More-sheet use, then keep it mounted after first use so close/focus restoration remains correct.

The first Sheet attempt unmounted immediately on close and exact-head browser/UI CI caught a real focus-restoration regression. The corrected one-way lazy mount passed the previously failing authenticated focus assertion. No accessibility assertion was weakened.

The canonical same-methodology Lighthouse 13.4.1 comparison uses production build/start, mobile simulated throttling, authenticated loopback Supabase double and three samples per route.

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
| Performance | #532 materially reduces dashboard client cost; field score 39 is not claimed fixed |
| Public beta | not approved; security issue #536 remains release-blocking candidate work |

## 6. Performance truth

Owner-reported Vercel score **39** remains field provenance and has not been reproduced by the repository harness or queried from Speed Insights through the connected provider surface.

Same-methodology `/dashboard` medians, merged main `0585caea...` -> #532 candidate:

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

`npm run analyze -- --output` has been executed on both merged-main baseline and #532 candidate under Node 22 with real installs. Analyzer output is written to `.next/diagnostics/analyze` as the Next.js module graph. Final module-owner details are recorded in PR #532 memory.

## 7. Security and delivery truth

- 21/21 audited public application tables have RLS enabled; the audited anonymous role has no application-table CRUD.
- No cross-tenant P0 was found in the 2026-09-02 database/RPC audit.
- Supabase Security Advisor reports leaked-password protection disabled; current docs expose this as `password_hibp_enabled`, available on Pro and above.
- Main pins Next.js 16.2.11; issue #536 records the requirement to move to patched 16.3.3+ and triage the remaining npm High advisory.
- No Next upgrade, Supabase Auth write, merge or deployment belongs in #532.
- `docs/plans/PLAN_AUTHORITY.json` remains the only executable selector.
- Completing current work must leave zero current slice and cannot preselect #536 or #523.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531: selected and governance-recovered performance slice; PR #532 is its canonical implementation/closure candidate.
- #532: open draft; bounded performance work plus same-PR lifecycle closure candidate; owner merge required.
- #533/#534/#535: closed duplicate performance PRs; canonical work is #532.
- #536: open release-blocking security issue; future Class 3 execution only after explicit selection.
- #537: draft packet-preparation PR; exact-head green, no authority change, no runtime/provider write.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Open pull-request memory

PR #532 durable record: `docs/research/pr-memory/2026/Q3/PR-532.md`.

PR #537 durable record: `docs/research/pr-memory/2026/Q3/PR-537.md` on its separate branch. It prepares #536 only; it does not activate it.

The connected GitHub ready-for-review mutation currently fails because of an upstream GraphQL field mismatch, so a green draft may still require the owner to change draft state in GitHub UI. This is a tooling limitation, not verification evidence.

## 10. True gaps after this audit

1. Owner review/merge of exact-head-green #532 after lifecycle closure verifies cleanly.
2. Do not claim Vercel score 39 resolved without new field evidence; retain render-blocking CSS/residual client work as explicit future performance debt rather than silently extending #527.
3. From fresh main with `current: null`, persist/merge the #536 packet if needed and select #536 in a separate authority PR.
4. Under active #536, upgrade Next to a patched 16.3.x release at least 16.3.3, run exact `npm audit --json`, and verify auth/browser/financial regressions.
5. Enable and verify Supabase leaked-password protection only through an authorized reversible provider change under #536.
6. Reconsider #523 or other product work only after release-blocking security work is dispositioned.

## 11. Next allowed action

On the #532 branch, only #527 closure/evidence work is allowed: remove the one-shot analyzer capture test, archive #527, set `current` to null, update this memory and the PR #532 record, then verify exact-head CI/CodeQL/Gitleaks/browser/UI.

After owner merge of #532, the next execution decision must start from fresh `main`. #536 is the recommended release-blocking candidate from the 2026-09-02 audit, but it still requires a separate selector; it is not auto-selected by this memory.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by #529/#531.
- Hand-written Current main SHA / Post-merge projection activation — superseded by manifest authority.
- #511 materially reducing manual-entry friction or 40% grouped clicks — superseded.
- SMS as a primary acquisition bet — unsupported.
- AI as MoneyFlow positioning — unsupported; use only where safely reducing capture/reconcile friction.
- #523 already selected — false; it remains candidate-only.
- Owner-observed Vercel score 39 already fixed by #532 — false; repository lab cost improved but field score is not reproduced.
- #536 already executable — false until a separate post-#527 selector merges.
- Master #432 alone authorizes provider/bank/native/OCR/security-provider work — false; each needs a bounded researched slice.
