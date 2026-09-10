# MoneyFlow — current project memory

**Status:** PR #572 is owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`; merged `PLAN_AUTHORITY.current` selects #570 production Supabase migration reconciliation. Hosted Supabase is still four canonical migrations behind repo main. Open PR #573 proposes a temporary version-preserving production runner, but no #570 production DDL has occurred.
**Last reconciled:** 2026-09-11
**Application production baseline:** PR #571 merge `3c9794926effd3d0f0f0786ac286a8619d0518ca` was previously Vercel READY with `/api/health` 200; selector PR #572 is docs/authority only and did not change runtime behavior.
**Hosted database baseline:** Supabase PostgreSQL 17.6, ACTIVE_HEALTHY; migration history still ends at `20260825090000_direct_csv_rule_atomic_ingestion`.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md`.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named PR provenance.

## 1. Current decision

MoneyFlow remains centered on one trustworthy user-owned ledger and progressively lower maintenance effort. Financial truth, ownership and recoverability outrank novelty.

Owner merge of PR #572 selected #570 as the current bounded Class-3 operational slice. Scope is limited to reconciling the four already-reviewed production migrations, a temporary fail-closed executor needed to preserve canonical migration identity, and bounded post-deploy verification. Provider/Auth/WAF/UI work remains outside this slice. Runtime UI redesign is explicitly deferred.

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
| Production migration executor | temporary fail-closed Supabase CLI runner proposed in open PR #573; unmerged/unexecuted |
| Executable authority | #570 selected on merged main via PR #572 |

## 6. Current production migration gap

Hosted `supabase_migrations.schema_migrations` still ends at `20260825090000_direct_csv_rule_atomic_ingestion`. Exact `main@ab02529b...` contains exactly four later migration files, so the repo/remote divergence is one contiguous pending chain:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

Read-only production preflight on 2026-09-11 confirms all four versions and their target objects/effects are absent. PostgreSQL is 17.6; `import_batches` had 1 row (~80 KiB) and `inbox_candidates` had 7 rows; there were no blocked sessions and no non-idle transaction older than 30 seconds at capture time. RLS is enabled with authenticated own-row policies on both affected import tables.

The four migration files are identity-pinned by Git blob in #570/PR #573. Repository search found no `set role`/`reset role` choreography in the selected files.

## 7. #570 selector and deployment truth

PR #572 is owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`. `PLAN_AUTHORITY.current` selects `docs/plans/active/570-production-migration-reconciliation.md` via `selectedByPr: 572`.

Official Supabase guidance refreshed 2026-09-11 recommends CI/CD/GitHub Actions for production migrations and continues to define `supabase migration list` → `supabase db push --dry-run` → `supabase db push` as the canonical migration-file workflow. Current stable CLI is 2.117.0. Remote reset and production seed remain forbidden.

The connected Supabase MCP `apply_migration` cannot accept an existing canonical version; upstream issue #241 documents server-generated timestamp behavior. It remains rejected for this four-file reconciliation.

PR #573 proposes `.github/workflows/production-supabase-migrations.yml` as the separately reviewed temporary executor. The workflow pins Supabase CLI 2.117.0, runs only through repository-owner `workflow_dispatch` or exact OWNER-authored commands on GitHub issue #570, checks current #570 authority, validates all four canonical Git blobs, validates a SHA-256 fingerprint of the intended production project ref, requires production connection secrets without printing them, rejects remote-only/history drift, requires the local-only set to equal exactly the four selected versions, requires dry-run to include all four versions, serializes execution, and refuses a second apply after convergence.

This runner remains unmerged and therefore has no production execution force. First allowed run after explicit owner merge is preflight-only. Apply remains conditional on every gate passing.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: repository implementation complete; hosted durable measurement pending #570.
- #511 / PR #522: completed.
- #557 / PR #561: completed.
- #559 / PRs #562–#566: design foundation completed; runtime UI deferred.
- #567 / PR #571: repository implementation merged; production DB verification depends on #570 S4.
- #570 / PR #572: selected current operational lane; production still four migrations behind.
- #573: open temporary production runner + operational evidence enabler for #570; no production DDL yet.
- #569: open lifecycle/project-memory hardening lane; not selected.
- #174: open provider-control lane; separate from #570.

## 9. Open pull-request memory

### PR #573 — #570 production runner and execution evidence

Base: `main@ab02529b954c59dfe7335776ee9ec47c8cc18f9c` after owner merge of selector PR #572.

PR #573 is no longer docs-only. It adds one temporary, tightly scoped GitHub Actions runner plus the active packet/current-memory/PR-memory evidence required to review that execution surface. The runner never deploys on PR or push and cannot run from this unmerged branch against production.

After owner merge, preflight-only is the first allowed execution. Apply requires exact current authority, frozen migration blobs, intended production-project fingerprint, exact migration-list divergence, exact dry-run, repository-owner execution and explicit confirmation. The runner must be removed when #570 closes.

## 10. True gaps after this audit

1. Hosted Supabase is four canonical migrations behind repository main.
2. PR #573 temporary executor must pass exact-head CI/security review and explicit owner merge before it can provide the version-preserving production surface.
3. Production connection secrets required by the runner cannot be assumed until a merged preflight actually executes; missing configuration must fail closed.
4. #567 security effects are code-complete but not production-verified.
5. MON-63 maintenance measurement is not durable production truth until #570 S3 passes.
6. Maintenance minutes/manual interventions still need a tighter semantic measurement contract after durable measurement rollout.
7. Exact Vietnamese bank export identity/layout evidence remains incomplete for bank-specific automation.
8. #174 provider-console controls remain a separate unresolved lane.
9. Lifecycle tooling should prevent repository completion claims before required hosted rollout evidence exists; #569 owns that hardening.

## 11. Next allowed action

Validate open enabler PR #573 exact head, including GitHub workflow syntax, project-knowledge/lifecycle contracts, CodeQL and Secret History. Do not merge automatically.

If exact-head checks pass, perform independent review of the runner against #570. Then the next gate is explicit owner merge of PR #573. Only after that merge:

1. trigger **preflight only**;
2. require correct project fingerprint, #570 authority, canonical blobs, exact local/remote history and exact dry-run;
3. refresh hosted catalog/lock state read-only;
4. only if every gate is green, trigger one explicit apply;
5. verify hosted migration history/catalog before any retry if result is ambiguous;
6. run bounded S3/S4 production verification and application-health checks;
7. remove the temporary runner and close lifecycle only after evidence is complete.

Any mismatch is a stop condition. Do not synthesize replacement migration history.

## 12. Superseded-status register

- PR #572 is still candidate/unmerged — **false**; it is owner-merged as `ab02529b...` and #570 is current authority.
- Merge of #572 means the four migrations are production-live — **false**; hosted history/catalog remain pre-rollout.
- #570 has no possible version-preserving execution design — **false at branch-design level**; PR #573 now proposes one, but it remains unmerged/unexecuted.
- MCP `apply_migration` is equivalent to `db push` for these timestamped files — **false** unless canonical version preservation is proven.
- PR #573 is docs-only — **false**; it contains the temporary runner and requires workflow/security review.
- #570 may broaden into provider/Auth/WAF/UI work — **false**.
- #567 is production-verified merely because PR #571 merged — **false**.
- Plate priority or generic chat continuation overrides repository authority/merge gates — **false**.
