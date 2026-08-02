# Performance and resilience acceptance

**Status:** in progress  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write + provider_read  
**Owner:** Codex with human-owner review  
**Branch:** `agent/performance-resilience-acceptance`  
**Last updated:** 2026-08-02

This packet continues the implementation introduced by PR #206 without redefining its architecture. The earlier work reduced dashboard request amplification; this follow-up creates the missing acceptance mechanism needed before anyone can claim concurrent-load readiness.

## Outcome

MoneyFlow has reproducible, bounded and auditable public-route and authenticated-dashboard load profiles for an approved preview or staging target. The profiles identify the exact deployment, reject production and unapproved hosts, use only synthetic read-only data, stop on threshold failure and require provider metrics before a capacity conclusion.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a Next.js/Supabase modular monolith; static public pages are served through Vercel and private data remains request-scoped under PostgreSQL RLS.
- PR #206 merged the bounded `get_dashboard_bundle` RPC and reduced the authenticated dashboard from roughly 17 Supabase requests to one Data API call.
- The existing public k6 script allowed only a small smoke profile and did not provide a fixed acceptance sequence or authenticated coverage.
- PR #207 is a separate open hotfix for application/database schema skew. This packet does not modify or supersede that branch.
- Production database recovery is complete, but no approved preview/staging load run has established p95, p99, error rate, database headroom or a safe Firewall threshold.

### Provider-read evidence

- A read-only authenticated production `EXPLAIN (ANALYZE, BUFFERS)` completed one dashboard RPC in approximately 50.168 ms with 3,242 shared buffer hits.
- The largest current tenant observed for that plan had 36 financial transactions.
- Ten calls with varying recent limits completed in approximately 92.097 ms with 4,363 shared buffer hits. Warm-cache and PL/pgSQL reporting limitations mean this is not a per-call capacity guarantee.
- Supabase Performance Advisor reports informational foreign-key coverage notices, but relevant dashboard query paths already have user/month, user/status, user/account, user/category and transaction lookup indexes.

### Relevant repository areas

| Area | Role in this change |
|---|---|
| `tests/load/public-smoke.js` | Fixed public smoke, baseline and ramp profiles |
| `tests/load/authenticated-dashboard.js` | Synthetic-user authenticated RPC load profile |
| `src/lib/performance-budgets.test.ts` | Static safety and threshold regression contracts |
| `docs/performance-load-acceptance.md` | Exact execution, evidence and rollback protocol |
| `package.json` | Explicit load-test commands |

### Constraints

- No production stress test.
- No real user credentials or financial data.
- No service-role key.
- No mutations.
- No provider configuration write, Firewall publication, schema migration, compute upgrade or new runtime dependency.
- Maximum configured concurrency is 50 virtual users.

## Research

### Decision question

How can MoneyFlow obtain trustworthy concurrent-load evidence without turning a one-off local test into an unsafe production action or an unsupported capacity claim?

### Sources and applicability

| Source | Establishes | Limit for MoneyFlow |
|---|---|---|
| Grafana k6 thresholds documentation | Thresholds are explicit pass/fail criteria and can stop a run when an SLO fails | k6 output alone does not prove database or provider headroom |
| Grafana k6 ramping-VUs documentation | Controlled staged concurrency can expose the first failing level | A ramp must remain bounded and target an approved environment |
| Vercel Firewall documentation | Custom rules can be staged as drafts and use log, challenge, deny or rate-limit actions | Publishing can block legitimate users and requires a separate owner-approved provider action |
| Supabase performance, advisors and reports documentation | Query plans, CPU, memory, PostgREST latency and connection usage are required performance evidence | Advisor warnings are leads, not proof that an index should be added |

### Alternatives considered

| Alternative | Decision |
|---|---|
| Stress production immediately | Rejected: unsafe and not authorized |
| Use the owner's real account | Rejected: privacy and data-integrity risk |
| Add Redis, queues or microservices first | Rejected: no measured need and new operational failure modes |
| Add every advisor-suggested index | Rejected: write cost without query-plan evidence |
| Fixed staged k6 profiles plus provider metrics | Selected |

### Adoption review

- New runtime dependency: none; k6 remains an operator tool.
- Secrets: supplied at runtime and never committed.
- User data: synthetic tenant only.
- Operational cost: bounded preview/staging traffic, maximum 50 VUs.
- Rollback: delete/revert the scripts and documentation; no schema or provider state is changed.
- Removal condition: remove or redesign the profiles if they cannot correlate with provider metrics or no longer represent the canonical dashboard path.

## Specification

### Problem

The application path was optimized, but the repository lacked a safe authenticated load profile and an evidence contract. As a result, no one could honestly state how the exact deployed version behaves at 10, 25 or 50 concurrent virtual users.

### User stories

- As an operator, I can run repeatable public and authenticated read tests against an explicitly approved non-production target.
- As an owner, I can see the exact commit, environment, thresholds and provider metrics behind any readiness claim.
- As a user, my real account and financial data are never used for load testing.

### Acceptance criteria

- [x] Public profiles are fixed, ramped and capped at 50 VUs.
- [x] Authenticated profile exercises the canonical bounded RPC.
- [x] Remote runs require explicit approval flag, preview/staging target and exact approved hostname.
- [x] Every remote run identifies an exact deployment SHA.
- [x] Authenticated runs require an explicitly confirmed synthetic user.
- [x] Scripts contain no service-role credential and perform no mutations.
- [x] Thresholds cover error rate, contract checks, p95 and p99.
- [x] Documentation requires correlated Vercel and Supabase metrics and stop conditions.
- [ ] Exact-head repository CI passes.
- [ ] An approved preview/staging smoke, baseline and ramp sequence is executed and recorded.

### Non-goals

- Production load testing.
- Guaranteed user or request capacity.
- Firewall publication.
- Database index or compute changes without staged evidence.
- Mutation, import/export or transaction-write load testing.

## Implementation plan

1. Replace arbitrary public VU/duration inputs with fixed smoke, baseline and ramp stages.
2. Add a direct authenticated read profile that signs in one synthetic tenant and calls `get_dashboard_bundle`.
3. Enforce target kind, exact hostname, exact commit SHA and synthetic-user declarations before network traffic starts.
4. Add static tests so the safety gates and thresholds cannot be silently weakened.
5. Document the execution sequence, evidence record, current baseline, index decision and Firewall permission boundary.
6. Open a focused PR and use exact-head CI as repository evidence.
7. Leave remote load execution and any Firewall publication outside this branch until separately approved.

### Risks and controls

| Risk | Control |
|---|---|
| Accidental production target | Only local, preview or staging accepted; exact hostname required |
| Real-user exposure | Explicit synthetic-user confirmation and documented prohibition |
| Runaway test | Fixed stages, maximum 50 VUs, abort-on-failure thresholds |
| Misleading capacity claim | Exact SHA/target plus Vercel and Supabase metrics required |
| Unnecessary DB indexes | No migration without plan evidence from a representative load window |
| Firewall false positives | Draft/log-first separate provider change with rollback |

### Verification plan

- Repository contracts: `npm run test:load:contracts`.
- Required project gates: knowledge, deployment environment, architecture, lint, typecheck, unit tests and build.
- Database and browser gates remain required by repository CI even though this diff does not change schema or UI.
- Remote acceptance: public and authenticated smoke → baseline → ramp on an approved preview/staging target while recording provider metrics.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Inspect prior performance work and provider state | PR #206, PR #207, Supabase plan/advisors | done |
| T2 | Define safety and acceptance contract | Specification and research above | done |
| T3 | Add fixed public profiles | `tests/load/public-smoke.js` | done |
| T4 | Add authenticated synthetic read profile | `tests/load/authenticated-dashboard.js` | done |
| T5 | Add regression contracts and commands | test file + `package.json` | done |
| T6 | Document run/evidence/rollback protocol | `docs/performance-load-acceptance.md` | done |
| T7 | Evaluate exact diff and CI | PR checks | in progress |
| T8 | Run approved preview/staging sequence | k6 and provider metrics record | blocked: separate owner approval and target required |
| T9 | Decide Firewall/query/compute follow-up | measured evidence | blocked by T8 |

## Evaluation

### Current findings

- The change stays inside the modular monolith and adds no runtime dependency.
- It does not alter financial calculations, RLS, schema, application UI or production provider state.
- The authenticated profile is read-only and calls the same bounded RPC used by the application.
- Target and identity safety is enforced before the test begins rather than relying only on operator prose.
- Existing database indexes appear sufficient for current RPC access patterns; no speculative migration is warranted.

### Evidence still required

- Exact-head GitHub CI.
- Actual k6 output on an approved preview/staging deployment.
- Vercel and Supabase metrics for the same UTC window.
- Human decision on whether the measured result justifies a Firewall rule, query change, compute adjustment or no action.

### Handoff record

| Date | From | To | State | Evidence | Unverified claim | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher/planner | implementer | planned | repo audit, official docs, provider-read baseline | staged capacity unknown | implement bounded profiles |
| 2026-08-02 | implementer | evaluator | evaluating | focused branch, scripts, tests and protocol | exact-head CI and remote load not run | open PR and inspect CI |

### Current permission boundary

Allowed: one focused branch/PR and read-only GitHub, Vercel and Supabase inspection.  
Not allowed: merge, push to `main`, production load, real-data mutation, Firewall publication, provider plan/configuration change or production database DDL.  
Stop condition: any required test would need real credentials/data, production stress, more than 50 VUs or a provider write without explicit narrow approval.
