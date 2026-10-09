# MoneyFlow deployment workflow

**Authority scope:** this document owns Git branch-to-deployment behavior. The
environment-variable/provider-setting contract is `docs/configuration.md`; this file
does not redefine those values.

## Production reality (Neon era, #774/#779)

- Production backend is **Neon** (`MF_BACKEND_PROVIDER=neon`): managed Neon Auth +
  Neon Data API on project `moneyflow-prod`. Neon is the **sole live source of
  truth** — post-cutover transactions exist only there.
- Vercel git integration deploys `main` only. CLI deploys bypass git provenance,
  so they must go through `scripts/deploy-prod.mjs` (below).
- A Vercel production build **fails closed** without resolvable commit provenance
  (`VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA` or explicit `MF_BUILD_COMMIT`). A build
  reporting `build:"dev"` on `/api/health` is a provenance defect, not downtime —
  investigate before assuming rollback is needed.
- Rollback to Supabase is **not** a data-safe path anymore: Supabase is
  egress-locked and holds only the pre-cutover snapshot. Rollback = redeploy a
  known-good commit; data stays on Neon.

## Rules

1. Never commit product changes directly to `main`.
2. Create one `agent/<scope>` branch for the complete change.
3. Keep the pull request in draft while the change is incomplete. Draft PRs do not run the full CI suite.
4. When the diff is final, mark the PR ready once. GitHub runs lint, typecheck, unit/static-RLS tests, the production Next.js build, a fresh Supabase reset, and pgTAP.
5. Fix failures on the same branch. New commits cancel stale CI runs automatically.
6. Squash-merge only after both CI jobs pass.
7. Vercel automatically deploys only commits on `main`. Feature, verification, and temporary branches must never create preview deployments.
8. Do not create temporary marker files or empty commits merely to trigger CI. Use `workflow_dispatch` for a manual verification run.
9. Deploy-context hygiene is CI-enforced: `npm run check:deploy-hygiene` proves
   `.vercelignore` keeps secrets (`.env*`, credentials, backups, keys, passphrases,
   `scripts/neon-poc/out/`) out of the Vercel upload set. Vercel CLI uploads do not
   honor `.gitignore` — `.vercelignore` is the only exclusion contract.

## Vercel branch rule

`vercel.json` must keep `git.deploymentEnabled` as:

```json
{
  "**": false,
  "main": true
}
```

The `**` globstar is intentional: MoneyFlow branches contain `/`, for example `agent/...`, `fix/...`, and `perf/...`. Do not replace it with `*`. Vercel treats branches not matched by any rule as deployment-enabled, which can silently recreate preview deployments and exhaust the daily deployment quota.

## Responsibility split

- GitHub Actions: install, lint, typecheck, tests, production build verification, and database verification.
- Vercel: validate production environment variables and build the already-verified `main` commit.
- Neon: database + managed auth services; no deployment workflow changes should alter its production configuration.

## Manual production deploy (guarded CLI path)

`scripts/deploy-prod.mjs` is the only sanctioned CLI release path:

```bash
node scripts/deploy-prod.mjs          # full deploy (owner-authorized)
node scripts/deploy-prod.mjs --dry    # plan only — no upload, no deploy
```

It refuses to deploy unless the worktree is clean and `HEAD` exists on a remote
branch, injects `-b MF_BUILD_COMMIT=<sha>` so the build carries provenance, and
post-checks that `/api/health` reports the deployed commit.

## Emergency production redeploy

Use Vercel's Redeploy action on the last `main` deployment and explicitly bypass the ignored-build setting only when a rebuild of the same commit is required. Do not push a no-op commit.

Operational incident/rollback detail lives in
`docs/operations/production-runbook.md`.
