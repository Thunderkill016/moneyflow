# MoneyFlow deployment workflow

## Rules

1. Never commit product changes directly to `main`.
2. Create one `agent/<scope>` branch for the complete change.
3. Keep the pull request in draft while the change is incomplete. Draft PRs do not run the full CI suite.
4. When the diff is final, mark the PR ready once. GitHub runs lint, typecheck, unit/static-RLS tests, the production Next.js build, a fresh Supabase reset, and pgTAP.
5. Fix failures on the same branch. New commits cancel stale CI runs automatically.
6. Squash-merge only after both CI jobs pass.
7. Vercel automatically deploys only commits on `main`. Feature, verification, and temporary branches must never create preview deployments.
8. Do not create temporary marker files or empty commits merely to trigger CI. Use `workflow_dispatch` for a manual verification run.

## Responsibility split

- GitHub Actions: install, lint, typecheck, tests, production build verification, and database verification.
- Vercel: validate production environment variables and build the already-verified `main` commit.
- Supabase: database and Auth services; no deployment workflow changes should alter its production configuration.

## Emergency production redeploy

Use Vercel's Redeploy action on the last `main` deployment and explicitly bypass the ignored-build setting only when a rebuild of the same commit is required. Do not push a no-op commit.
