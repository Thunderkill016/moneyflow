# MoneyFlow — current project memory

**Status:** #536 remains the selected active Class 3 security/runtime/auth/database-parity slice. PR #540 is merged and its patched runtime is live in production. Production database parity and Supabase Auth/provider acceptance remain release blockers and owner-gated.
**Last reconciled:** 2026-09-03
**Merged main baseline:** `10c832aaaf27a6bf5406578871708789f4b1b14d` (PR #540)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #538 completed performance slice #527. PR #539 selected `docs/plans/active/536-security-runtime-auth-hardening.md` as the single current executable slice. PR #540 has now merged and shipped the repository/runtime remediation, but it did not perform production database or Supabase Auth/provider writes.

#536 therefore remains active for two unresolved production gates:

1. reconcile the Aug-21–25 production database migration/schema gap using the exact repository migration identities and explicit owner authorization;
2. resolve leaked-password protection/provider-plan acceptance under a separate explicit owner decision.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.
- Performance work from #532/#538 changed loading ownership only and did not add a second financial authority.

### Production runtime now patched

Current `main` is `10c832aaaf27a6bf5406578871708789f4b1b14d` from merged PR #540.

Vercel production deployment `dpl_Ch4Vfpdxw8mbUJ5ynjozZRTGLhYw` is READY from that exact commit. Its build log detects **Next.js 16.3.4**, uses Turbopack, and completes successfully. `https://mfvn.vercel.app/api/health` reports build `10c832a` and the full commit `10c832aaaf27a6bf5406578871708789f4b1b14d`.

The shipped runtime tree includes:

- Next.js / `eslint-config-next` 16.3.4;
- React / React DOM 19.2.4;
- Sharp 0.35.4 override;
- Browserslist 4.28.8;
- qs 6.16.0;
- fast-uri 3.1.6;
- permanent dependency-floor guards.

The Share Target Strict Mode regression found during the runtime upgrade was repaired before merge by consuming the one-shot ref only inside an executing `requestAnimationFrame` while cleanup cancels abandoned work.

## 3. Merged-main verification truth

Merged-main CI #3260 (`33735497335`) ran on exact `main@10c832aa...` and completed successfully.

Unlike the pre-merge #540 run whose database shard was not selected, the **main push** run selected the full database gate and actually executed:

- Supabase CLI 2.111.0;
- fresh local database start/reset;
- the full migration chain through `20260825090000_direct_csv_rule_atomic_ingestion`;
- pgTAP: **39 files / 747 tests, all successful**;
- archive producer round trip;
- archive restore round trip;
- browser smoke including authenticated ownership;
- cross-device UI audit;
- policy/static/unit/build/e2e gates.

This satisfies the packet's fresh local reset + pgTAP prerequisite for the current migration tree. It does **not** authorize or substitute for the remaining linked production `db push --dry-run` or production write.

## 4. Acquisition and reconciliation truth

Repository lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse.

**Production database parity remains behind that repository lineage.** Production migration history still ends at `20260812043219_remove_atoryn_from_moneyflow_project`, while merged `main` contains 15 later migrations through `20260825090000_direct_csv_rule_atomic_ingestion`.

The final read-only contract matrix previously found all 14 durable postconditions absent; the one data-only source-identity preflight passes. The source-identity preflight was re-run immediately before the current handoff and still reports:

- zero approved candidate/candidate source-identity conflicts;
- zero candidate/provenance source-identity conflicts.

Do not describe later Direct CSV, source-lineage or Share Target database capabilities as production-reconciled until the forward migration and live verification complete.

The generic file importer remains shallow relative to real Vietnam consumer bank exports. Exact schemas still require privacy-safe structural fixtures. #523 remains candidate-only and is not selected while #536 is active.

## 5. Production database parity handoff

The exact 15 pending repository migration files on `main@10c832aa...` are:

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

All 15 files were re-read from the exact merged commit rather than reconstructed from memory.

### Backup gate

Because the Supabase organization remains on Free and does not provide the required automatic backup/PITR safety net for this operation, a private logical production backup was created and verified before any migration write:

- encrypted backup size: 136,423 bytes;
- encrypted SHA-256: `bb72136f1992bb8b3b5ccbf60b642cdbbdf422086cbaa304e13d8935ba4d3de1`, matching the server-side source;
- a private decryption verification produced 1,089,839 plaintext bytes with MD5 `0233a34c5de347373fa045bddee8906e`;
- plaintext verification material was removed after the check;
- encrypted backup/key remain private and off-repository;
- temporary production backup staging schema was removed after verification.

### Remaining pre-write gate

The remaining pre-write requirement is the literal linked CLI preview:

`supabase db push --dry-run`

It must show **exactly the 15 versions above, in order**.

Do not substitute Supabase MCP `apply_migration` for this operation. The MCP/Management migration endpoint generates its own server-side timestamp and currently has no version parameter for preserving the repository migration timestamp. Using it for these already-versioned repository files would create remote-only migration identities and force forbidden history repair later.

Do not use `migration repair` merely to make history appear aligned. The schema effects are actually missing, so the prepared direction remains forward application through normal CLI migration semantics.

After exact dry-run evidence is captured, the production database/history write still requires **explicit owner authorization**. Generic “continue/go” is not authorization.

Post-write verification must re-read remote migration history and durable postconditions, then exercise tenant/browser acquisition/recovery contracts and Security Advisor. On failure, stop further mutations and prefer a bounded forward corrective migration where appropriate; use the verified backup only for catastrophic integrity/availability recovery.

## 6. Supabase security and provider truth

Fresh Security Advisor on 2026-09-03 still reports:

- `authenticated_security_definer_function_executable` warnings;
- **Leaked Password Protection Disabled**.

The current live authenticated-callable SECURITY DEFINER set was previously fully dispositioned function-by-function as intentional tenant-bound privileged API surface: owner `postgres`, empty `search_path`, authenticated execution retained, no anon/PUBLIC execution, `auth.uid()` and direct tenant predicate present, with no dynamic SQL/role-switch/service-role/raw-metadata trust pattern found. Repository cross-tenant and browser-role tests cover the ownership boundary.

Do not bulk-convert these functions to SECURITY INVOKER or revoke authenticated execution merely to silence the advisor. Re-run the classification after the authorized migration because the later migrations add/change RPCs.

The Supabase organization `aqnjchplxbyrucgofsep` still reports plan `free`. Leaked-password protection remains plan-gated to an eligible paid tier. No SQL workaround should simulate the Auth-provider capability.

Any plan/Auth mutation must:

1. record the previous provider value immediately before mutation;
2. receive explicit owner authorization for that provider operation;
3. run login, registration, password-reset and recent-auth/account-deletion smoke flows;
4. re-read Security Advisor.

Until then, public beta remains blocked even though the runtime patch is shipped.

## 7. Performance truth after #527

PR #538 completed the #527 performance slice. Same-methodology `/dashboard` medians versus its pre-#527 baseline were:

- performance score 86 -> 87;
- LCP 4009.7 -> 3793.9 ms (-5.4%);
- TBT 140.0 -> 77.9 ms (-44.4%);
- script transfer -5.0%;
- total transfer -3.4%;
- main-thread -8.7%;
- JS bootup -21.7%;
- CLS remained 0.

Dashboard LCP still exceeds 2.5 s. Owner-observed Vercel score 39 remains unresolved field provenance and is not claimed fixed.

## 8. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | repository supports batches/candidates/provenance, exact-source matching, Direct CSV atomic approval, Share Target and deterministic rules; production DB still lacks Aug-21–25 contracts |
| Review | exception-first Ready/Needs-attention grouped review |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Runtime security | production now runs `main@10c832aa...` / Next 16.3.4 |
| Performance | #527 materially reduced dashboard client cost; field score 39 unresolved |
| Public beta | blocked by production DB parity + provider/Auth acceptance under active #536 |

## 9. Reconciled issue/PR status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531/#538: performance slice selected, governance-recovered and completed.
- #536: **open** selected active release-blocking Class 3 slice; runtime is shipped, database/provider acceptance remains.
- #537: historical packet-preparation evidence; superseded as activation vehicle by merged #539.
- #539: merged selector for #536 at `425af450...`.
- #540: **merged** runtime/security remediation; current `main` is `10c832aa...`; production deployment verified.
- #523: candidate Vietnam bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

GitHub #536 was briefly auto-closed/completed when #540 merged even though its packet acceptance was not satisfied. It was reopened on 2026-09-03 and its body reconciled to current production truth.

## 10. True remaining gaps

1. Capture linked `supabase db push --dry-run` output showing exactly the expected 15 pending migrations.
2. Obtain explicit owner authorization for the production database/history write.
3. Forward-apply exactly those 15 migrations using CLI semantics that preserve repository timestamps; no seed, no remote reset, no history repair.
4. Re-read migration history/contracts and run tenant/browser/provider/advisor verification.
5. Resolve leaked-password protection through an eligible Supabase plan/provider decision and auth-flow verification, or keep public beta blocked.
6. Close/archive #536 only after database and provider acceptance are truthful; then advance `PLAN_AUTHORITY.current` under lifecycle policy.
7. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

The runtime deployment and fresh merged-main database verification are complete. The next safe operation is to obtain an authenticated **linked Supabase CLI dry-run** from the exact `main@10c832aa...` tree. This environment currently has Supabase read/write MCP access but not a CLI credential/DB-password channel; MCP `apply_migration` is deliberately rejected because it cannot preserve the 15 existing repository timestamps.

Until a correct CLI dry-run is captured, do not request or perform the production database write.

Do not mutate Supabase Auth configuration, migration history, database privileges/functions/schema or tenant data without crossing the packet's explicit authorization boundary. Do not claim production acquisition/recovery parity until the forward migration and live postconditions are verified.

## 12. Superseded-status register

- Production still runs Next.js 16.2.11 / pre-#540 main — **false**; production is verified on `10c832aa...` / Next 16.3.4.
- PR #540 is still open/Ready for review — **false**; it is merged.
- #536 is complete because #540 merged — **false**; production DB parity and provider/Auth acceptance remain.
- Every authenticated SECURITY DEFINER advisor warning proves a vulnerability — false; the current live set is evidence-classified as intentional authenticated tenant-bound privileged API surface with controls.
- Repository acquisition lineage proves production database parity — false; production is missing later Aug-21–25 contracts.
- Missing migration-history rows alone prove every later effect absent — superseded; contract probes independently proved the 14 durable postconditions absent.
- `migration repair --status applied` is the correct fix for the 15-version gap — false; the schema effects are actually missing.
- Supabase MCP `apply_migration` is equivalent to pushing these existing timestamped repo files — false; it generates a new migration timestamp and would drift history.
- `supabase db push --dry-run` validates migration SQL — false; it previews the pending list; merged-main fresh reset + pgTAP is the SQL/contract validation evidence.
- Supabase Free supplies an automatic production rollback for this migration — false; the verified private logical backup is the prepared rollback asset.
- Generic “continue/go” authorizes production DB/Auth/provider mutation — false; explicit owner authorization is required.
- Owner-observed Vercel score 39 was fixed by #527 — false; lab cost improved, but field provenance remains unresolved.
