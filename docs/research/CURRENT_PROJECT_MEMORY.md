# MoneyFlow — current project memory

**Status:** PR #572 is owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`; merged `PLAN_AUTHORITY.current` selects #570 production Supabase migration reconciliation. Hosted Supabase is still four canonical migrations behind repo main. No #570 production DDL has been performed.
**Last reconciled:** 2026-09-11
**Application production baseline:** PR #571 merge `3c9794926effd3d0f0f0786ac286a8619d0518ca` was previously Vercel READY with `/api/health` 200; selector PR #572 is docs/authority only and does not change runtime behavior.
**Hosted database baseline:** Supabase PostgreSQL 17.6; migration history still ends at `20260825090000_direct_csv_rule_atomic_ingestion`.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md`.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named PR provenance.

## 1. Current decision

MoneyFlow remains centered on one trustworthy user-owned ledger and progressively lower maintenance effort. Financial truth, ownership and recoverability outrank novelty.

Owner merge of PR #572 selected #570 as the current bounded Class-3 operational slice. Scope is limited to production reconciliation of four already-reviewed migrations plus bounded verification. No provider/Auth/WAF/UI work is selected. Runtime UI redesign remains explicitly deferred.

## 2. Financial and ownership truth

- VND is integer đồng.
- Transfers are equal/opposite and neutral to income/expense/net.
- Authenticated data is tenant-isolated by database policy; demo truth is separate browser-local state.
- Source/provider observations are evidence and never silently overwrite ledger facts.
- Corrections remain explicit and auditable.
- Completed reconciliation snapshots are historical facts.
- Sensitive financial mutations remain invariant-preserving and ownership-enforced.

## 3. Acquisition and reconciliation truth

MON-62 established versioned source adapters, strict source identity/date/amount evidence, non-truncating persistence and provenance.

MON-63 repository code contains replay-safe atomic preview→Inbox commit and privacy-safe bounded maintenance measurement. Hosted durable capability is not yet production truth because the required migrations remain pending #570.

Exception-first Inbox review is implemented. Ready classification never auto-posts. Reconciliation remains statement-oriented and account-leg based; start, clear, complete and reopen are database-controlled and cross-tenant tested.

## 4. #567 repository truth versus production truth

PR #571 is repository-merged and locally verified. Its two security migrations are not yet live in hosted Supabase. Production still has `reconciliation_snapshot_for_user(uuid,uuid,date)` as SECURITY DEFINER and no global postgres future-function default ACL override.

Pre-rollout Security Advisor evidence remains 43 authenticated-callable SECURITY DEFINER findings. The intended #570 delta for this narrow slice is 43 → 42, not zero. The separate leaked-password-protection warning remains #174/provider-control scope.

## 5. Current capability inventory

| Capability | Current truth |
| --- | --- |
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Reconciliation | statement/account-leg lifecycle and historical completed snapshots |
| Acquisition | generic CSV/XLSX/PDF, Direct CSV, Share Target, provenance-safe adapters |
| Import integrity | replay-safe atomic commit code is merged; hosted migration pending #570 |
| Maintenance evidence | bounded measurement code is merged; hosted migration pending #570 |
| Review/rules | deterministic Ready/Needs-attention; explicit approval; tenant-owned rules |
| Auth | authenticated/Supabase-RLS mode plus explicit demo-local mode |
| Privileged RPCs | repo projects 42 authenticated SECURITY DEFINER endpoints after #571; hosted remains pre-rollout |
| Executable authority | #570 selected on merged main via PR #572 |

## 6. Current production migration gap

Hosted `supabase_migrations.schema_migrations` still ends at `20260825090000_direct_csv_rule_atomic_ingestion`. Exact `main@ab02529b...` contains exactly four later migration files, so the repo/remote divergence is one contiguous pending chain:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

Read-only production preflight on 2026-09-11 confirms all four versions and their target objects/effects are absent. PostgreSQL is 17.6; `import_batches` had 1 row (~80 KiB) and `inbox_candidates` had 7 rows; there were no blocked sessions and no non-idle transaction older than 30 seconds at capture time. RLS is enabled with authenticated own-row policies on both affected import tables.

## 7. #570 selector and deployment truth

PR #572 is owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`. `PLAN_AUTHORITY.current` now selects `docs/plans/active/570-production-migration-reconciliation.md` via `selectedByPr: 572`.

Official Supabase workflow refreshed 2026-09-11 remains `supabase migration list` → `supabase db push --dry-run` → `supabase db push`. Remote reset/production seed are forbidden. Direct remote SQL bypasses migration history and is not an acceptable substitute.

The connected Supabase MCP `apply_migration` surface accepts no caller-supplied canonical migration version. Upstream Supabase MCP issue #241 documents server-generated timestamp behavior, so that primitive is rejected for these four existing timestamped files. Current chat shell has no usable MoneyFlow checkout/Supabase CLI and no outbound DNS; repo search found no production Supabase deploy workflow.

Therefore #570 is active authority but blocked before first write solely on acquiring a version-preserving execution surface. No migration-history repair, ad-hoc SQL, remote reset, seed, or blind retry is allowed.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: repository implementation complete; hosted durable measurement pending #570.
- #511 / PR #522: completed.
- #557 / PR #561: completed.
- #559 / PRs #562–#566: design foundation completed; runtime UI deferred.
- #567 / PR #571: repository implementation merged; production DB verification depends on #570 S4.
- #570 / PR #572: selected current operational lane; production rollout blocked before first write by missing version-preserving executor.
- #573: Draft operational-evidence PR for #570; no production DDL.
- #569: open lifecycle/project-memory hardening lane; not selected.
- #174: open provider-control lane; separate from #570.

## 9. Open pull-request memory

### PR #573 — record #570 production preflight and executor blocker

Base: `main@ab02529b954c59dfe7335776ee9ec47c8cc18f9c` after owner merge of selector PR #572.

Scope is operational evidence/lifecycle documentation only. It records the active #570 authority, exact four-file chain, hosted read-only preflight, canonical file identities and the executor blocker. It does not apply migrations, repair history, change runtime/provider settings, touch user data or start UI work.

PR #573 remains Draft while production rollout is incomplete. Lifecycle impact is “implementation/operations continue under current slice #570”; it must not project current authority to null until hosted verification is complete.

## 10. True gaps after this audit

1. Hosted Supabase is four canonical migrations behind repository main.
2. A version-preserving production migration executor is required before #570 can perform its first write.
3. #567 security effects are code-complete but not production-verified.
4. MON-63 maintenance measurement is not durable production truth until #570 S3 passes.
5. Maintenance minutes/manual interventions still need a tighter semantic measurement contract after durable measurement rollout.
6. Exact Vietnamese bank export identity/layout evidence remains incomplete for bank-specific automation.
7. #174 provider-console controls remain a separate unresolved lane.
8. Lifecycle tooling should prevent repository completion claims before required hosted rollout evidence exists; #569 owns that hardening.

## 11. Next allowed action

Acquire or use an execution environment with an exact fresh MoneyFlow checkout and authenticated/linked Supabase CLI that preserves the canonical migration filenames/versions. Immediately before any write:

1. resolve authority and require #570 current;
2. repeat hosted migration/catalog/lock preflight;
3. run `supabase migration list`;
4. run `supabase db push --dry-run`;
5. require exactly the four selected versions and no unexpected history/object drift;
6. only then run one canonical `supabase db push` and perform bounded S3/S4 post-deploy verification.

Any mismatch or ambiguous result is a stop condition. Do not synthesize replacement migration history. Keep PR #573 Draft until rollout and hosted verification are complete.

## 12. Superseded-status register

- PR #572 is still candidate/unmerged — **false**; it is owner-merged as `ab02529b...` and #570 is current authority.
- Merge of #572 means the four migrations are production-live — **false**; hosted history/catalog remain pre-rollout.
- MCP `apply_migration` is equivalent to `db push` for these timestamped files — **false** unless canonical version preservation is proven.
- #570 may broaden into provider/Auth/WAF/UI work — **false**.
- #567 is production-verified merely because PR #571 merged — **false**.
- Plate priority or generic chat continuation overrides repository authority — **false**.
