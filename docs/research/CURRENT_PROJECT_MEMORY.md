# MoneyFlow — current project memory

**Status:** PR #572 is owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`; merged `PLAN_AUTHORITY.current` selects #570 production Supabase migration reconciliation. Hosted Supabase is still four canonical migrations behind repo main. Production DDL has not been performed in #570.
**Last reconciled:** 2026-09-11
**Application production baseline:** PR #571 merge `3c9794926effd3d0f0f0786ac286a8619d0518ca` was previously Vercel READY with `/api/health` 200; selector PR #572 is docs/authority only and does not itself change runtime behavior.
**Hosted database baseline:** Supabase PostgreSQL 17.6; migration history still ends at `20260825090000_direct_csv_rule_atomic_ingestion`.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md`.

## 1. Current decision

MoneyFlow remains centered on one trustworthy user-owned ledger and progressively lower maintenance effort. Financial truth, ownership and recoverability outrank novelty.

Owner merge of PR #572 selected #570 as the current bounded Class-3 operational slice. The exact scope is production reconciliation of four already-reviewed migrations; no provider/Auth/WAF/UI work is selected.

The owner has explicitly deferred runtime UI redesign. #559 remains reference/design-foundation history only.

## 2. Financial and ownership truth

- VND is integer đồng.
- Transfers are equal/opposite and neutral to income/expense/net.
- Authenticated data is tenant-isolated by database policy; demo truth is separate browser-local state.
- Source/provider observations are evidence and never silently overwrite ledger facts.
- Corrections remain explicit and auditable.
- Completed reconciliation snapshots are historical facts.
- Sensitive financial mutations remain invariant-preserving and ownership-enforced.

## 3. Current #570 authority

Merged `main@ab02529b954c59dfe7335776ee9ec47c8cc18f9c` contains:

```json
"current": {
  "path": "docs/plans/active/570-production-migration-reconciliation.md",
  "selectedByPr": 572
}
```

The selected migration chain is exactly:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

Repository migration-directory inspection at exact `main@ab02529b...` confirms those are the only migrations after the hosted tail `20260825090000`, so the repo/remote divergence is one contiguous four-file chain.

## 4. Production preflight — 2026-09-11

Read-only hosted inspection after selector merge confirms:

- all four selected versions are absent from `supabase_migrations.schema_migrations`;
- `public.commit_import_batch_candidates(uuid,text,jsonb)` is absent;
- `public.record_import_batch_measurement(uuid,text)` is absent;
- all five selected `import_batches` columns are absent;
- no postgres global future-function default ACL override is live;
- `public.reconciliation_snapshot_for_user(uuid,uuid,date)` remains STABLE + `SECURITY DEFINER`, executable by authenticated and denied to anon/PUBLIC;
- `import_batches` and `inbox_candidates` have RLS enabled with authenticated own-row policies matching the SECURITY INVOKER assumptions;
- `import_batches` had 1 row and about 80 KiB total relation size; `inbox_candidates` had 7 rows at capture time;
- no blocked sessions and no non-idle transaction older than 30 seconds were present at capture time.

Canonical migration files were re-read from exact main. The selected chain contains no destructive reset, seed, direct user-data backfill or unrelated schema redesign.

## 5. Execution-surface blocker

The remaining blocker is not schema ambiguity; it is version-preserving execution.

Current official Supabase workflow remains:

- `supabase migration list` to reconcile local/remote history;
- `supabase db push --dry-run` to preview the exact pending set;
- `supabase db push` to apply timestamped migration files and register their canonical versions;
- never use `db reset --linked` or seed on production.

The current chat runtime has no MoneyFlow repository checkout, no usable Supabase CLI, and no outbound shell DNS. Repository search shows no production Supabase deploy workflow.

The connected Supabase MCP `apply_migration` action accepts only `name + query`, not a caller-supplied canonical version. Upstream Supabase MCP issue #241 documents that this path generates a server-side timestamp and can create remote-only migration-history entries. Therefore it is **not** an acceptable substitute for replaying these four existing timestamped files under #570.

Do not use manual `schema_migrations` insertion/repair, ad-hoc SQL copies, remote reset, seed or blind retry to work around the missing executor. If a version-preserving CLI/project execution surface is unavailable, #570 must remain blocked before first write.

## 6. #567 and MON-63 dependency truth

PR #571 repository implementation is merged and locally verified, but its hosted security effects remain pending #570. Until production rollout proves otherwise:

- hosted reconciliation snapshot is still SECURITY DEFINER;
- hosted postgres global future-function default ACL hardening is absent;
- pre-rollout Security Advisor baseline remains 43 authenticated-callable SECURITY DEFINER findings.

MON-63 repository code contains replay-safe import commit and privacy-safe maintenance measurement, but hosted durable capability cannot be claimed until the first two #570 migrations are live and verified.

## 7. Plate/GitHub routing

- THU-53 / GitHub #570: current executable operational lane; In Progress.
- THU-47 / #567: repository implementation merged; production verification depends on #570 S4.
- THU-44: maintenance-effort measurement depends on #570 S3 before durable production evidence is claimed.
- THU-48 / #174: provider-control lane remains separate and is not selected.
- THU-52 / #569: lifecycle/project-memory hardening remains separate and is not selected.
- #559 UI runtime work remains deferred.

## 8. Next allowed action

Acquire or use an execution environment that has:

1. exact repository checkout at fresh `main`;
2. Supabase CLI authenticated/linked to the intended production project;
3. a version-preserving path for the canonical migration filenames.

Then, immediately before any write:

1. resolve authority and require #570 to remain current;
2. rerun hosted migration/catalog preflight;
3. run `supabase migration list`;
4. run `supabase db push --dry-run`;
5. require the preview to contain exactly the four selected versions and no unexpected remote/local drift;
6. only then run the canonical `supabase db push` and perform bounded post-deploy verification.

Any mismatch, ambiguous result or unexpected object/role delta is a stop condition. Do not synthesize a replacement migration history.

## 9. Superseded-status register

- PR #572 is still a candidate/unmerged selector — **false**; it is owner-merged as `ab02529b...` and #570 is current authority.
- Merge of #572 means the four migrations are production-live — **false**; hosted history/catalog still show pre-rollout state.
- MCP `apply_migration` is equivalent to `db push` for these timestamped files — **false** under the currently exposed schema because canonical version preservation is not available.
- #570 may broaden into provider/Auth/WAF/UI work — **false**.
- Plate priority or generic chat continuation can override the selected packet — **false**.
