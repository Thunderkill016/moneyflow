# Production operations runbook — Neon era

**Scope:** operate `mfvn.vercel.app` (Vercel) backed by Neon `moneyflow-prod`
(`aws-ap-southeast-1`). Auth = managed Neon Auth (Better Auth). Data = Neon
Postgres via the Data API. This file owns operational procedure; the env contract
is `docs/configuration.md`, deploy workflow is `docs/deployment.md`.

Everything under "Owner-gated" requires an explicit owner decision plus a
rollback statement before execution.

## Source of truth

Neon is the **sole live source of truth**. Post-cutover (2026-10-08) writes
exist only in Neon. Supabase retains the pre-cutover snapshot but is
egress-locked; it is a historical artifact, not a rollback target.

## Health and provenance

```bash
curl -s https://mfvn.vercel.app/api/health
# Expect: {"status":"ok","build":"<7-char sha>"}
```

- `build:"dev"` on production = **provenance defect**, not downtime. The build
  lacks commit identity (CLI deploy without `MF_BUILD_COMMIT`). Redeploy via
  `node scripts/deploy-prod.mjs` — never ship an untraceable build.
- `/api/health` is intentionally shallow: no DB or provider calls. A 200 proves
  the function serves; it does not prove auth, RLS or data correctness.
- `scripts/probe-health.mjs` + the health-monitor workflow treat `dev` as
  failure — that is the intended tripwire.

## Deploying

```bash
node scripts/deploy-prod.mjs         # guarded full deploy (owner-authorized)
node scripts/deploy-prod.mjs --dry   # plan preview only
```

The script refuses dirty worktrees and commits that are not on a remote branch,
injects `MF_BUILD_COMMIT`, and post-checks `/api/health` for the expected SHA.
Pushing to `main` is the normal path (Vercel git integration, `main` only).

## Rollback

| Failure                          | Action                                                                |
| -------------------------------- | --------------------------------------------------------------------- |
| Bad build / regression           | `vercel rollback` or redeploy the last good commit via the guarded CLI |
| Bad env value                    | Fix in Vercel Project Settings (Production scope) + redeploy          |
| Neon outage                      | Wait or restore a Neon branch snapshot — **no Supabase rollback**      |
| Suspected secret leak in a build | Rotate affected values, redeploy clean, delete the tainted deployment |

Do **not** repoint `MF_BACKEND_PROVIDER` at Supabase as a quick fix: the Supabase
data is stale and egress-locked — a "rollback" there silently loses every
post-cutover transaction.

## Secrets

- `NEON_AUTH_COOKIE_SECRET` signs the `session_data` cache cookie — rotating it
  invalidates the cache layer only; real sessions survive via upstream
  `get-session`.
- Neon DB password rotation: rotate in Neon console, then redeploy (the app
  reads data only through the Data API + auth service, not a raw conn string).
- `.vercelignore` is the only exclusion contract for Vercel CLI uploads
  (`.gitignore` is ignored). `npm run check:deploy-hygiene` proves secret paths
  stay out of the upload set — keep it in CI.
- If a deployment file list ever contains `scripts/neon-poc/out/`, `.env*` or
  credential material: treat as breach — rotate, redeploy, delete deployment.

## Auth operations (owner-gated)

- Ban/unban a user: `neon_auth."user".banned` — ban revokes access immediately
  (Better Auth session-create hook blocks OAuth too), data untouched.
- Google sign-in links to an existing account only when the stored
  `emailVerified=true`; a verified Google email that matches links, otherwise a
  new empty account would be created — check `neon_auth.account` rows before
  assuming a merge.
- Account deletion on Neon is intentionally unimplemented; the UI fails closed
  with an honest message. Implement via the managed-auth admin API only as a
  reviewed change.
- Revoked/expired/malformed sessions resolve to unauthenticated — no partial
  viewer state.

## Known limitations

- Third-party OAuth client tokens (`client_id` consent flow, `candidates.propose`
  external writes) are a Supabase-only surface; under Neon the consent page fails
  closed honestly.
- `supabase_migrations.schema_migrations` is empty on Neon — migrations were
  applied via `db/neon/migrations` replay; schema parity is proven by the
  structure itself and the pgTAP suite, not the tracker table.
- The pre-cutover encrypted backup + rotated temp credentials previously lived
  in `scripts/neon-poc/out/` on the operator machine and have been purged. If a
  fresh backup is needed, take a Neon branch snapshot or re-export.
