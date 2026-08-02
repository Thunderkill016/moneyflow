# Performance load acceptance

This document is the execution appendix for [`docs/performance-budgets.md`](./performance-budgets.md). It defines how MoneyFlow may gather reproducible load evidence without turning a preview test into an unsupported production-capacity claim.

## Scope

The protocol covers two read-only surfaces:

1. Public static routes through `tests/load/public-smoke.js`.
2. The authenticated bounded `get_dashboard_bundle` RPC through `tests/load/authenticated-dashboard.js`.

It does not authorize production stress testing, provider configuration changes, mutation load, real-user credentials, service-role credentials, plan upgrades or a capacity claim beyond the exact tested commit, target and profile.

## Required safeguards

- Use local, preview or staging only. The scripts reject a remote target unless `ALLOW_REMOTE_LOAD_TEST=yes` is present.
- Set `LOAD_TEST_TARGET=preview` or `LOAD_TEST_TARGET=staging` for a remote run.
- Set `APPROVED_TARGET_HOST` to the exact hostname under test. A mismatch stops the run.
- Set `DEPLOYMENT_SHA` to the exact 7–40 character Git commit SHA represented by the deployment.
- For authenticated tests, use one isolated synthetic tenant and set `LOAD_TEST_USER_CONFIRMED_SYNTHETIC=yes`.
- Never use a real user, production financial data, a service-role key or mutation endpoints.
- Keep Vercel and Supabase CPU, memory, connections, errors and latency visible during every remote run.
- Stop when any k6 threshold fails, 429/5xx responses rise, database CPU or connection utilization stays above 70%, or the tested target becomes unstable.
- Maximum configured concurrency is 50 virtual users. Raising that ceiling requires a new reviewed specification.

## Profiles and sequence

Run one profile at a time and preserve the result before advancing:

1. Contract tests.
2. Public `smoke`.
3. Authenticated `smoke`.
4. Public and authenticated `baseline`.
5. Public and authenticated `ramp`, progressing through 10, 25 and 50 virtual users where applicable.
6. Correlate k6 output with Vercel and Supabase metrics.
7. Decide whether the next action is query work, provider configuration, compute sizing or no change.

Do not skip directly to the ramp profile. A failed lower profile blocks the higher profile.

## Commands

### Static contracts

```bash
npm run test:load:contracts
```

### Public preview or staging

```bash
BASE_URL=https://approved-preview.example \
LOAD_TEST_TARGET=preview \
APPROVED_TARGET_HOST=approved-preview.example \
DEPLOYMENT_SHA=<exact-git-sha> \
ALLOW_REMOTE_LOAD_TEST=yes \
LOAD_PROFILE=smoke \
npm run test:load:public
```

Repeat with `LOAD_PROFILE=baseline`, then `LOAD_PROFILE=ramp` only when the previous profile passes.

### Authenticated preview or staging

```bash
SUPABASE_URL=https://approved-preview-project.supabase.co \
SUPABASE_PUBLISHABLE_KEY=<preview-publishable-key> \
LOAD_TEST_USER_EMAIL=<synthetic-user-email> \
LOAD_TEST_USER_PASSWORD=<synthetic-user-password> \
LOAD_TEST_USER_CONFIRMED_SYNTHETIC=yes \
DASHBOARD_TODAY=2026-08-02 \
LOAD_TEST_TARGET=preview \
APPROVED_TARGET_HOST=approved-preview-project.supabase.co \
DEPLOYMENT_SHA=<exact-git-sha> \
ALLOW_REMOTE_LOAD_TEST=yes \
LOAD_PROFILE=smoke \
npm run test:load:dashboard
```

`DASHBOARD_TODAY` must be the test date because the RPC rejects dates outside its bounded calendar window. Repeat with `baseline`, then `ramp` only after the prior profile passes.

## Acceptance criteria

| Signal | Pass condition |
|---|---:|
| HTTP failure rate | < 1% |
| Contract checks | > 99% |
| p95 response time | < 800 ms |
| p99 response time | < 1,500 ms |
| Database CPU | < 70% sustained |
| Database connections | < 70% of available capacity sustained |
| 429/5xx trend | No sustained rise |
| Private-data exposure | 0 |
| Real-user or service-role use | 0 |

These thresholds are release evidence, not a universal throughput guarantee. Record the exact provider plan and configuration because a result does not transfer automatically to another environment.

## Evidence record

Every remote run must record:

- deployment URL and exact Git SHA;
- target kind and approved hostname;
- profile, start time and end time in UTC;
- k6 version and exact command with secret values redacted;
- total requests, virtual users, failure rate, checks, p95 and p99;
- Vercel errors, status-code distribution and latency during the same window;
- Supabase CPU, memory, PostgREST latency and database/pooler connections during the same window;
- pass/fail result, stop reason and next allowed action.

Do not commit credentials or raw user payloads with the evidence.

## Current read-only baseline

Provider inspection on 2026-08-02 measured the production RPC under an authenticated RLS role:

- one bounded dashboard call completed in approximately 50.168 ms inside PostgreSQL;
- the top-level execution reported 3,242 shared buffer hits;
- the largest current tenant used for the read-only plan had 36 financial transactions;
- an aggregate of ten calls with varying recent limits completed in approximately 92.097 ms and reported 4,363 shared buffer hits.

These figures show that the RPC is measurable and bounded, but they do not prove concurrent capacity. Warm-cache effects and PL/pgSQL top-level plan reporting also prevent treating the aggregate result as a guaranteed per-call latency.

## Index decision

No index migration is included in this acceptance change. Supabase Performance Advisor reports informational foreign-key coverage warnings, but the access patterns used by the dashboard already have relevant indexes for user/month, user/status, user/account, user/category and transaction lookup. Adding indexes without a demonstrated query-plan bottleneck would increase write and maintenance cost without proven benefit.

Index changes require query-level evidence from the staged load window or a representative larger synthetic dataset.

## Firewall rollout boundary

Vercel custom rules must follow a reversible sequence:

1. Derive the route, method and threshold from observed traffic.
2. Create the narrow rule as disabled or Log-only draft.
3. Inspect matches across a normal traffic cycle.
4. Move to challenge or rate limiting only after owner approval.
5. Publish separately from application code.
6. Roll back by disabling or removing the rule if legitimate traffic is affected.

This repository change does not publish a Firewall rule. Provider publication requires explicit `provider_write_approved` permission and a recorded rollback target.
