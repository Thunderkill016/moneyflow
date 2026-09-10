# MoneyFlow — current project memory

**Status:** PR #571 is owner-merged and application production is healthy at that commit, but hosted Supabase is still four migrations behind repo main. Draft selector PR #572 is the candidate authority transition for #570 production migration reconciliation; merged main remains `PLAN_AUTHORITY.current = null` until owner merge.
**Last reconciled:** 2026-09-10
**Last verified production runtime baseline:** `3c9794926effd3d0f0f0786ac286a8619d0518ca` (PR #571), Vercel READY; `/api/health` returned 200 with that exact commit and `cache-control: no-store` on 2026-09-10.
**Hosted database baseline:** Supabase migration history still ends at `20260825090000_direct_csv_rule_atomic_ingestion`; production has not yet applied the four later repo migrations selected by #570.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md` remains long-term strategy authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

Owner-merged PR #571 completed the repository implementation for #567, but post-merge production inspection proved the hosted database has not received those migrations. Repository completion and hosted production truth must therefore remain distinct.

Draft PR #572 selects #570 as a bounded Class-3 operational slice whose only purpose is to reconcile the exact four-migration gap with production and verify affected behavior. The selector itself performs no production DDL.

The owner has explicitly deferred UI work. #559 remains design/reference foundation only; no runtime redesign slice is selected.

## 2. Financial and ownership truth

- VND is integer đồng; never floating point.
- Transfers are equal/opposite and neutral to income/expense/net.
- Authenticated user-owned data is database-enforced tenant-isolated; demo mode is explicit browser-local state.
- Source/provider observations are evidence, not permission to overwrite ledger facts.
- Corrections remain explicit, auditable and recoverable where required.
- Full archive/restore remains separate from scoped/report export.
- Sensitive financial tables remain browser-read-oriented; reviewed RPCs own invariant-preserving mutations.
- Missing source coverage, provider semantics, balances, dates or financial intent are never guessed by authoritative paths.

## 3. Acquisition and reconciliation truth

MON-62 established versioned source adapters, strict source identity/date/amount evidence, non-truncating persistence and parser/mapping/lifecycle provenance.

MON-63 established versioned remembered mappings, dry-run/review, atomic authenticated preview→Inbox commit, exact-intent replay, changed-intent fail-closed behavior and privacy-safe import-maintenance evidence in the repository implementation. Hosted durable measurement capability is not yet production truth because its migration is still pending #570.

Exception-first Inbox review is implemented by #511/PR #522. Ready classification never auto-posts; duplicate/transfer/low-confidence or unresolved evidence remains attention-required.

Reconciliation is statement-oriented and account-leg based. Completed snapshots are historical facts; later backdated activity does not silently rewrite them. Start, clear, complete and reopen transitions remain database-controlled and cross-tenant tested.

VCB/ACB/VietinBank bank-specific automatic mapping remains disabled until exact current layouts and stable transaction identity are proven.

## 4. #567 repository truth versus production truth

The privileged-RPC audit established that 43 authenticated-callable `SECURITY DEFINER` functions were a reviewed privileged surface, not 43 confirmed vulnerabilities. Zero were executable by anon/PUBLIC; the reviewed endpoints pinned safe search paths and derived tenant identity from `auth.uid()`.

PR #571, merged as `3c9794926effd3d0f0f0786ac286a8619d0518ca`, passed final CI including fresh database reset/full pgTAP, archive round trips, static/unit/build, browser smoke, cross-device audit, CodeQL and Secret History. Repository implementation:

- adds a global postgres function-default ACL override so future postgres-owned functions do not inherit automatic PUBLIC EXECUTE;
- changes only `reconciliation_snapshot_for_user(uuid,uuid,date)` to SECURITY INVOKER;
- reduces the reviewed authenticated SECURITY DEFINER inventory from 43 to 42 in repo-local tests.

Hosted Supabase is still pre-#571 for those effects: no global postgres function-default ACL override is live and `reconciliation_snapshot_for_user(uuid,uuid,date)` remains SECURITY DEFINER. #567/THU-47 is therefore code-complete but production verification remains dependent on #570.

## 5. Current capability inventory

| Capability | Current truth |
| --- | --- |
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe adapters; explicit remembered mapping |
| Import integrity | replay-safe/atomic migration code is in repo; hosted production migration still pending #570 |
| Review | deterministic Ready/Needs-attention semantics; explicit approval; no automatic posting |
| Rules | deterministic tenant-owned candidate-stage categorization rules with version evidence |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Auth CAPTCHA | real-token gated with finite stalled-script recovery |
| Privileged RPCs | repo tests project 42 authenticated SECURITY DEFINER endpoints after #571; hosted production remains at pre-#571 execution identity until #570 rollout |
| Executable authority | merged main is `current = null`; PR #572 is candidate selection only |

## 6. Current production migration gap

Read-only production inspection after PR #571 merge proves hosted migration history stops at `20260825090000`. Current main contains exactly four later migrations that are absent from hosted history:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

Expected measurement columns/RPC are not live. This does not by itself prove ledger corruption because measurement is best-effort, but it does mean durable production maintenance evidence cannot yet be claimed. The atomic commit and security migrations require their own production verification rather than being treated as harmless omissions.

## 7. #570 selector and deployment truth

Draft PR #572 is docs/authority only. It projects `PLAN_AUTHORITY.current` to `docs/plans/active/570-production-migration-reconciliation.md` with `selectedByPr: 572`, but this projection has no execution force until owner merge.

The #570 packet freezes the production operation to the four canonical merged migrations above. Before any write it requires fresh authority resolution, local/remote migration-history reconciliation, an exact dry-run/preview, private baseline capture and fail-closed handling of any unexpected remote drift.

Current Supabase documentation uses `supabase migration list` to compare local and remote history and `supabase db push --dry-run` to preview pending migrations before `supabase db push`. Once migration history is authoritative, remote schema changes should come from migration files rather than direct Dashboard/SQL-editor edits. Remote reset is destructive and must never be used on production.

Repository CI currently proves local migrations via fresh reset/pgTAP but does not deploy hosted Supabase schema. Merge and Vercel deployment therefore cannot be used as evidence that database migrations reached production.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program.
- #523 / MON-61: completed.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: repository implementation/lifecycle completed; hosted maintenance measurement remains pending #570.
- #511 / PR #522: completed.
- #557 / PR #561: completed and merged.
- #559 / PRs #562–#566: design foundation completed; runtime UI deferred.
- #567 / PR #571: repository implementation merged; production DB effects pending #570 verification.
- #570 / PR #572: open production-migration reconciliation lane; selector candidate only until owner merge.
- #569: open deterministic project-memory/lifecycle hardening lane; not currently selected.
- #174: open provider-control lane; separate from #570.
- #426: stale original simplification recipe is not executable authority.

## 9. Open pull-request memory

### PR #572 — select #570 production Supabase migration reconciliation

Base: owner-merged `main@3c9794926effd3d0f0f0786ac286a8619d0518ca` after PR #571.

Scope is documentation/authority only: one #570 packet, `PLAN_AUTHORITY` candidate projection, this reconciled snapshot and PR-memory record. The selected future operation is exactly the four missing canonical migrations; no migration/runtime/provider/user-data/UI change is contained in the selector.

Production application and database truth are deliberately separated: Vercel is READY at `3c979492...` and `/api/health` returns 200, while hosted Supabase still lacks all four selected migration versions and their catalog effects.

PR #572 must pass exact-head governance/security checks and independent selector evaluation before Ready handoff. Production DDL remains forbidden while the PR is open. Merge remains an explicit owner decision.

## 10. True gaps after this audit

1. Hosted Supabase is four migrations behind repository main; #570 owns reconciliation.
2. Maintenance minutes and true manual interventions are not honestly derivable from generic timestamps/edits; instrumentation or a tighter semantic event contract is still required after durable measurement rollout.
3. Real-world maintenance reduction needs repeated cohort evidence, not feature-count claims.
4. Exact Vietnamese bank export layouts and stable identity remain incomplete evidence for bank-specific automation.
5. #174 provider-console controls still require provider-side verification and reversible operational changes.
6. Physical-device and post-deploy production evidence remain separate release gates.
7. Lifecycle tooling should eventually prevent repository completion claims when required hosted rollout evidence is still absent; #569 owns deterministic hardening.

## 11. Next allowed action

Finish exact-head governance/security checks and independent evaluation for selector PR #572.

Do not apply production migrations while #572 is open. If the owner explicitly merges #572, refresh from merged main, require `PLAN_AUTHORITY.current` to resolve #570, re-check hosted migration history/catalog, verify the actual Supabase CLI commands with `--help`, preview the exact four-migration chain and stop on any unexpected divergence before writing.

Do not start UI/redesign work; it remains deferred.

## 12. Superseded-status register

- PR #571 is still open — **false**; it is owner-merged as `3c979492...`.
- Merge of #571 means its Supabase migrations are production-live — **false**; hosted migration history proves otherwise.
- #570 contains only two missing migrations — **false**; the contiguous gap is now four after #571.
- #570 is authorized merely because it is next in Plate — **false**; PR #572 must be owner-merged first.
- Supabase Advisor's earlier SECURITY DEFINER count means every flagged function is a vulnerability — **false**.
- Schema-scoped default-function REVOKE removes PostgreSQL's global PUBLIC EXECUTE default — **false**; #571 corrects this at the global layer.
- #559 is current executable UI work — **false**; UI is explicitly deferred.
- Plate priority or chat continuation alone overrides repository authority — **false**.
