# Post-Neon production reliability & release safety (#779)

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write (read_only production; no provider/production writes)
**Owner:** Devin
**Issue/PR:** #779 (this packet), companion to #774 cutover record
**Last updated:** 2026-10-09

## Outcome

Bring the Neon-backed MoneyFlow to an auditable, repeatably verifiable
release candidate: production builds carry verifiable commit provenance,
deployment file-storage cannot receive secrets, Neon auth/RLS paths have
explicit test evidence, docs match the real provider, and the owner gets a
single reviewed PR plus an operations runbook.

## Repository reconnaissance

### Current behavior (verified 2026-10-09)

- `next.config.ts` bakes `NEXT_PUBLIC_BUILD_COMMIT` from
  `VERCEL_GIT_COMMIT_SHA ?? GITHUB_SHA`. Vercel populates
  `VERCEL_GIT_COMMIT_SHA` **only for git-connected builds**. The production
  cutover deployed via `vercel deploy --prod` (CLI), so the live build has
  `build:"dev"` and `commit:null`. `scripts/probe-health.mjs` treats `dev`
  as a failure — the two scheduled monitor runs cited in #779 failed for
  exactly this reason. This is a provenance defect, not downtime.
- `.vercelignore` exists (added during remediation) and excludes
  `scripts/neon-poc/out/`, `.env*`, keys, build artifacts. Prior incident:
  Vercel CLI uploads ignore `.gitignore` when `.vercelignore` is absent —
  that gap caused the `out/` secrets upload.
- `MF_BACKEND_PROVIDER` env contract already validated by
  `scripts/check-deployment-env.mjs` (neon branch: `NEON_AUTH_BASE_URL`,
  `NEON_DATA_API_URL`, `NEON_AUTH_COOKIE_SECRET >= 32`; production requires
  `NEXT_PUBLIC_APP_MODE=authenticated`).
- OAuth return leg fixed in `a81281f3` (middleware verifier exchange) and
  proven live: owner's Google sign-in linked to the migrated account and
  minted a session (DB evidence in `neon-migration.md`).
- Vercel git integration was reconnected after #775 merged; `vercel.json`
  keeps `deploymentEnabled: {"**": false, "main": true}`.
- Scratch project `polished-pine-75721729` deleted; `verify-target.mjs`
  allowlist now contains only `moneyflow-prod`.
- Dependabot PR #778 fails on `npm ci` (missing AJV lockfile nodes) —
  unrelated third-party failure, not evidence about this branch.

### Relevant repository areas

| Area                                                                          | Why it matters            | Reuse/change/avoid                               |
| ----------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------ |
| `next.config.ts`                                                              | commit provenance source  | change (add `MF_BUILD_COMMIT`, prod fail-closed) |
| `src/lib/build-identity.ts`                                                   | display/health identity   | reuse; extract pure resolver for tests           |
| `src/app/api/health/route.ts`                                                 | `/api/health` surface     | reuse; keep shallow                              |
| `scripts/probe-health.mjs` + `health-monitor.yml`                             | monitor                   | reuse; do not weaken                             |
| `scripts/check-deployment-env.mjs`                                            | env contract              | reuse; add build-commit guard wiring if needed   |
| `.vercelignore`                                                               | secret exclusion          | verify + canary test                             |
| `src/lib/supabase/proxy.ts`                                                   | session/OAuth middleware  | contract-test the verifier exchange              |
| `src/lib/neon/*`, `src/server/auth.ts`                                        | Neon auth/RLS path        | audit + tests                                    |
| `scripts/neon-poc/*`                                                          | e2e harnesses             | reuse where possible                             |
| `docs/deployment.md`, `docs/configuration.md`, `README.md`, `ARCHITECTURE.md` | stale Supabase-era claims | reconcile truthfully                             |

### Existing tests and constraints

- `node --test` runner (`*.test.ts`, strip-types) — contract tests read
  source files; unit tests must be dependency-free.
- `npm run test:db` → `supabase test db` (pgTAP, needs local Supabase).
- `test:e2e` → Playwright (browser).
- No `ignore`/`minimatch` dependency — canary matcher must be
  self-contained or add a tiny dep.

### Open questions

- [ ] Does `vercel deploy`/`vercel build` accept `-b/--build-env`?
      Confirmed: `vercel deploy --help` lists `-b, --build-env`.
- [ ] Is a Neon-auth synthetic A/B RLS run on production a "production
      write"? Yes — creating auth users is a provider write → OWNER-GATE.
      Substitute: local pgTAP RLS suites (already exist for Supabase
      schema) + prod read-only negative JWT probes + scratch-project
      re-creation documented as owner-gated option.

## Research

### Sources

| Source                      | Authority/type | Date       | What it establishes                                                 | Limits                       |
| --------------------------- | -------------- | ---------- | ------------------------------------------------------------------- | ---------------------------- |
| Vercel system env vars docs | official       | 2026-10-09 | `VERCEL_GIT_COMMIT_SHA` exists only for git-connected builds        | CLI/prebuilt deploys lack it |
| Vercel CLI `deploy --help`  | tool output    | 2026-10-09 | `-b/--build-env` injects build-time env per deploy                  | operator must supply value   |
| `server-b0OzGjXl.mjs` (SDK) | package source | 2026-10-08 | `handleAuthRequest`/`handleAuthResponse` are the reference exchange | version-pinned behavior      |

### Research decision

Release provenance: keep one code path (`next.config.ts` resolves
`VERCEL_GIT_COMMIT_SHA ?? GITHUB_SHA ?? MF_BUILD_COMMIT`), make the
production build **fail closed** when the resolved commit is missing or
malformed on `VERCEL_ENV=production`, and add `scripts/deploy-prod.mjs`
as the only sanctioned CLI path — it refuses to deploy unless HEAD is
pushed, clean, and matches an origin ref, then passes `-b
MF_BUILD_COMMIT=<sha>` and post-checks `/api/health`.

## Specification

### Acceptance matrix (start state)

| #   | Criterion                                          | State                                             | Evidence                                           |
| --- | -------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| 1   | Production build carries verifiable commit         | FAIL (live build = `dev`)                         | `/api/health` probe + deploy inspect               |
| 2   | Untraceable prod build fails closed at build time  | NOT YET PROVEN                                    | implement + test                                   |
| 3   | Secrets/`out/`/env cannot reach deployment storage | PARTIAL (vercelignore exists, no automated proof) | canary test + file-list verify                     |
| 4   | Neon OAuth verifier exchange covered by test       | PARTIAL (live prod proof only)                    | contract + behavior test                           |
| 5   | A/B RLS isolation                                  | PASS on prod (2026-10-08), REPEATABLE PROOF thin  | record + local pgTAP + prod read-only negatives    |
| 6   | pgTAP/db gates on Neon-relevant schema             | NOT RUN locally this mission                      | run `test:db`                                      |
| 7   | Docs match Neon reality                            | FAIL                                              | README/ARCHITECTURE/configuration/deployment stale |
| 8   | Ops runbook + rollback                             | MISSING                                           | write `docs/operations/` runbook                   |
| 9   | Clean-checkout reproducibility                     | NOT YET PROVEN                                    | fresh clone + npm ci + gates                       |
| 10  | Independent review of diff                         | NOT YET PROVEN                                    | reviewer subagent on final diff                    |
| 11  | Deletion/reauth + OAuth/MCP scoped-token audit     | NOT YET PROVEN                                    | code audit + contract tests                        |

### Financial and security constraints

- No production writes, no provider mutations, no real-user data export.
- Synthetic secrets in canary tests must be obviously fake fixtures.
- Never weaken the health monitor, env contract or RLS to pass.

### Out of scope

Redesign, new features, dependency upgrades beyond what tests require,
another provider migration, restoring Supabase as authoritative, merging.

## Implementation plan

| File/area                                                                     | Change                                                                               | Reason                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| `src/lib/build-identity.ts`                                                   | export pure `resolveBuildCommit(env)`                                                | testable precedence/validation     |
| `next.config.ts`                                                              | use resolver; throw on prod w/o commit                                               | fail-closed provenance             |
| `scripts/deploy-prod.mjs`                                                     | guarded CLI release (clean tree, pushed ref, `-b MF_BUILD_COMMIT`, health postcheck) | repeatable safe release            |
| `scripts/check-deploy-hygiene.mjs`                                            | gitignore-semantics canary test for `.vercelignore`                                  | automated secret-upload prevention |
| `src/lib/build-identity.test.ts` + new tests                                  | resolver unit tests, proxy exchange contract, hygiene matrix                         | regression evidence                |
| `docs/deployment.md`, `docs/configuration.md`, `README.md`, `ARCHITECTURE.md` | Neon-era truth reconciliation                                                        | stale authority claims             |
| `docs/operations/production-runbook.md`                                       | ops runbook (health/provenance/secrets/quota/rollback/owner gates)                   | #779 E16                           |

## Handoff / owner gates

- Deploy to production, any Neon/Supabase production write, env changes:
  OWNER-GATED with a prepared approval package.
- #776 (docs closeout, still open) — appends to `neon-migration.md` only;
  this packet is a separate file. No overlap; merge order irrelevant.
