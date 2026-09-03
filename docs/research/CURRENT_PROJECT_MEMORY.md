# MoneyFlow — current project memory

**Status:** #536 remains the selected active Class 3 security/runtime/auth/database-parity slice. PR #540 is merged and the patched runtime is live. Production database parity and Supabase Auth/provider acceptance remain release blockers and owner-gated.
**Last reconciled:** 2026-09-03
**Merged main baseline:** `10c832aaaf27a6bf5406578871708789f4b1b14d` (PR #540)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 is the master product program. PR #538 completed performance slice #527. PR #539 selected `docs/plans/active/536-security-runtime-auth-hardening.md`; PR #540 then merged and shipped the runtime remediation. #536 remains active for two unresolved production gates: the Aug-21–25 database parity gap and leaked-password protection/provider-plan acceptance.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.
- Performance work from #532/#538 changed loading ownership only and did not add a second financial authority.

Production runtime is now patched: Vercel deployment `dpl_Ch4Vfpdxw8mbUJ5ynjozZRTGLhYw` is READY from exact `main@10c832aaaf27a6bf5406578871708789f4b1b14d`; its build detects **Next.js 16.3.4** and `/api/health` reports that full commit. The shipped tree also retains React/React DOM 19.2.4 and the Sharp 0.35.4, Browserslist 4.28.8, qs 6.16.0 and fast-uri 3.1.6 floors from #540.

## 3. Acquisition and reconciliation truth

Repository lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, deterministic rules and Direct CSV mapping/rule reuse.

**Production database parity remains behind that repository lineage.** Remote migration history still ends at `20260812043219_remove_atoryn_from_moneyflow_project`; merged `main` contains 15 later versions through `20260825090000_direct_csv_rule_atomic_ingestion`. Earlier live contract probes found all 14 durable later postconditions absent; the one data-only source-identity preflight passes. A fresh read-only preflight on 2026-09-03 again found zero approved-candidate identity conflicts and zero candidate/provenance conflicts.

The exact pending versions are:

1. `20260821014500_direct_csv_batch_atomic_approval`
2. `20260821062000_manual_import_reconciliation`
3. `20260821093500_deleted_source_reimport_precedence`
4. `20260821184500_source_observation_precedence`
5. `20260821190000_source_observation_guard_compat`
6. `20260821203000_import_batch_owner_preserving_fk`
7. `20260822094400_source_identity_consistency_preflight`
8. `20260822094500_source_lineage_lifecycle`
9. `20260822094600_source_lineage_archive_compat`
10. `20260822094700_source_lineage_archive_mode_guard`
11. `20260823124000_source_lifecycle_reconciliation_policy`
12. `20260823124500_source_lifecycle_reconciliation_lock_order`
13. `20260824083000_share_target_atomic_ingestion`
14. `20260824170000_share_target_rule_atomic_ingestion`
15. `20260825090000_direct_csv_rule_atomic_ingestion`

All 15 files were re-read from exact merged `main@10c832aa...`. Do not describe later Direct CSV, source-lineage or Share Target DB capabilities as production-reconciled until forward application and live verification complete. #523 remains candidate-only while #536 is active.

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
| Acquisition | repository supports provenance, exact-source matching, Direct CSV atomic approval, Share Target and deterministic rules; production DB still lacks Aug-21–25 contracts |
| Review | exception-first Ready/Needs-attention grouped review |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Runtime security | production runs `main@10c832aa...` / Next 16.3.4 |
| Performance | #527 materially reduced dashboard client cost; field score 39 unresolved |
| Public beta | blocked by production DB parity + provider/Auth acceptance under #536 |

## 6. Security and delivery truth

Merged-main CI #3260 (`33735497335`) ran on exact `10c832aa...` and passed. Its database shard started/reset a fresh local Supabase instance, applied the full migration chain through `20260825090000`, and passed **39 pgTAP files / 747 tests**, archive producer and restore round trips. Policy/static/unit/build/browser/authenticated-ownership/UI/e2e gates also passed. This satisfies the packet's fresh local reset + pgTAP prerequisite but does not substitute for linked production dry-run or authorize a write.

The Share Target Strict Mode regression found during #540 was repaired before merge by consuming the one-shot ref only inside an executing `requestAnimationFrame` while cleanup cancels abandoned work.

## 7. Supabase security and production-schema truth

Fresh Security Advisor on 2026-09-03 still reports the authenticated `SECURITY DEFINER` warning class plus **Leaked Password Protection Disabled**. The current live warned function set remains evidence-dispositioned as intentional tenant-bound privileged APIs: owner `postgres`, empty `search_path`, authenticated execute retained, no anon/PUBLIC execute, `auth.uid()`/tenant predicate present, and no dynamic SQL/role-switch/service-role/raw-metadata trust pattern found. Repository cross-tenant and browser-role tests cover the ownership boundary. Re-classify after later migrations add/change RPCs; do not bulk revoke/convert merely to silence the advisor.

The Supabase organization `aqnjchplxbyrucgofsep` remains on plan `free`; leaked-password protection is still plan-gated to an eligible paid tier. No SQL workaround should simulate that provider capability.

### Production database handoff

The private pre-write rollback gate is complete. A private off-repository encrypted logical backup was verified at 136,423 bytes with SHA-256 `bb72136f1992bb8b3b5ccbf60b642cdbbdf422086cbaa304e13d8935ba4d3de1`; private decryption produced 1,089,839 plaintext bytes with expected MD5 `0233a34c5de347373fa045bddee8906e`. Verification plaintext and temporary production staging were removed; encrypted backup/key remain private.

The remaining pre-write requirement is literal linked CLI `supabase db push --dry-run`, which must list exactly the 15 versions above in order. Do not substitute MCP `apply_migration`: its migration endpoint creates a server-side timestamp and cannot preserve these existing repository version IDs. Do not use `migration repair` to make history appear aligned when SQL effects are actually missing.

Only after exact dry-run evidence exists may explicit owner authorization be requested for the production database/history write. Generic “continue/go” is not authorization. Post-write verification must re-read migration history and durable contracts, exercise tenant/browser acquisition/recovery behavior, and re-run Security Advisor.

Any Supabase plan/Auth mutation is separate: record the previous provider value, obtain explicit owner authorization, run login/registration/password-reset/recent-auth smoke flows, and re-read Security Advisor.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531/#538: performance slice completed.
- #536: **open** selected release-blocking Class 3 slice; runtime shipped, database/provider acceptance remains.
- #537: historical packet-preparation evidence; superseded by merged selector #539.
- #539: merged selector for #536 at `425af450...`.
- #540: **merged** runtime/security remediation; current `main` is `10c832aa...`; production deployment verified.
- #523: candidate Vietnam bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

#536 was briefly auto-closed when #540 merged despite unmet packet acceptance. It was reopened on 2026-09-03 and its body reconciled to current production truth.

## 9. Open pull-request memory

- PR #544: `docs/research/pr-memory/2026/Q3/PR-544.md`; evidence-only reconciliation of post-#540 runtime/database/provider truth. It performs no production database/Auth/provider mutation and does not close #536.
- PR #540 durable record remains historical merged implementation evidence at `docs/research/pr-memory/2026/Q3/PR-540.md`.
- PR #537 remains historical packet-preparation evidence; PR #532/#538 records remain historical #527 provenance.

## 10. True gaps after this audit

1. Capture linked `supabase db push --dry-run` showing exactly the expected 15 pending migrations.
2. Obtain explicit owner authorization for the production database/history write.
3. Forward-apply exactly those 15 migrations using CLI semantics that preserve repository timestamps; no seed, remote reset or history repair.
4. Re-read migration history/contracts and run tenant/browser/provider/advisor verification.
5. Resolve leaked-password protection through an eligible plan/provider decision and auth-flow verification, or keep public beta blocked.
6. Close/archive #536 only after database and provider acceptance are truthful; then advance `PLAN_AUTHORITY.current` under lifecycle policy.
7. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

Obtain an authenticated **linked Supabase CLI dry-run** from exact `main@10c832aa...`. This environment has Supabase MCP access but no exposed linked CLI credential/DB-password channel, and MCP `apply_migration` is deliberately rejected because it cannot preserve the 15 repository timestamps.

Until the correct dry-run is captured, do not request or perform the production DB write. Do not mutate Supabase Auth configuration, migration history, database privileges/functions/schema or tenant data without crossing the packet's explicit authorization boundary.

## 12. Superseded-status register

- Production still runs Next.js 16.2.11 / pre-#540 main — **false**; production is verified on `10c832aa...` / Next 16.3.4.
- PR #540 is still open/Ready for review — **false**; it is merged.
- #536 is complete because #540 merged — **false**; DB parity and provider/Auth acceptance remain.
- Every authenticated SECURITY DEFINER warning proves a vulnerability — false; the live set is evidence-classified as intentional tenant-bound privileged API surface with controls.
- Repository acquisition lineage proves production DB parity — false; production is missing Aug-21–25 contracts.
- `migration repair --status applied` is the correct fix — false; schema effects are actually missing.
- MCP `apply_migration` is equivalent to pushing the timestamped repo files — false; it would generate different migration identity.
- `supabase db push --dry-run` validates SQL — false; it previews pending versions; merged-main reset + pgTAP is SQL/contract validation evidence.
- Supabase Free supplies automatic rollback for this operation — false; the verified private logical backup is the prepared rollback asset.
- Generic “continue/go” authorizes production DB/Auth/provider mutation — false; explicit owner authorization is required.
- Owner-observed Vercel score 39 was fixed by #527 — false; lab cost improved, field provenance remains unresolved.
