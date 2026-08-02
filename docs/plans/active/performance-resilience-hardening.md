# Performance and resilience hardening

**Status:** in progress
**Execution state:** ready for CI
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Codex with human-owner review
**Issue/PR:** `agent/performance-resilience-hardening` draft
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow keeps public pages cacheable at the edge, opens the authenticated dashboard with one bounded database API call instead of a large fan-out, preserves tenant isolation, and gains a documented load/DDoS verification path. No microservice, shared private-data cache, or background-job provider is introduced.

## Repository reconnaissance

### Current behavior

- Production is a Next.js 16.2 modular monolith on Vercel with Supabase/Postgres and RLS.
- An authenticated dashboard currently starts six parallel workspace loaders. Their database work expands to 17 Supabase queries: finance 5, budgets 2, commitments 4, recurring income 4, goals 1, and Inbox count 1.
- `getViewer()` is wrapped in React `cache()`, so repeated `requireViewer()` calls in the same render do not repeat the Auth/profile lookup. The bottleneck is the data-query fan-out, not repeated session validation.
- Dashboard transactions are already bounded to the current reporting window plus five recent rows. The full transaction-management route still loads the complete ledger and remains a separate future pagination task because its client-side filtering/totals contract cannot be safely truncated.
- `/` and `/landing` are prerendered static pages in an authenticated production build. Public requests without an Auth cookie skip Supabase session refresh in the proxy.
- The current production alias serves commit `8d8c79a`, while GitHub `main` is `7a43c43`. GitHub reports the newer commit's Vercel status as failed with `build-rate-limit`; code merged after `8d8c79a` is not yet production evidence.
- Production `mfvn.vercel.app` returned about 14 KB transferred HTML for `/` with compression. Sandbox-to-`iad1` latency was unstable, so those timings are not accepted as Core Web Vital evidence.
- Vercel runtime evidence on 2026-08-02 showed no grouped runtime errors in seven days and only six logged production requests in 24 hours, all HTTP 200. That sample is too small to choose a safe application rate-limit threshold.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/app/dashboard/page.tsx` | Authenticated dashboard orchestration | Change to one dashboard read-model owner |
| `src/server/*.ts` | Existing validated workspace mapping | Reuse mapping/domain helpers; preserve route-specific loaders |
| `src/lib/supabase/proxy.ts` | Public/auth request boundary | Reuse; public no-cookie bypass is already correct |
| `supabase/migrations/` | RLS-aware database read model and grants | Add one bounded invoker RPC |
| `supabase/tests/database/` | Tenant and privilege evidence | Add positive and cross-tenant bundle tests |
| `src/lib/dashboard-transaction-window.ts` | Bounded dashboard date/recent-row contract | Reuse exact bounds |
| `docs/configuration.md` | Vercel Firewall ownership | Extend operational evidence, not app-local counters |
| Vercel project `moneyflow` | Deployment, DDoS/WAF and production reality | Read only until a reversible provider write is explicitly approved |

### Existing tests and constraints

- Unit/source contract: `src/lib/dashboard-transaction-window.test.ts`.
- Database/RLS: fresh migrations plus pgTAP tenant, catalog and browser-role suites.
- Browser: expense/Auth smoke and multi-device UI audit.
- Product/architecture: keep the single-deployment modular monolith; no shared cache of private financial data; integer VND and transfer invariants unchanged.

### Similar implementation and recent history

- Existing pattern to reuse: database RPCs are versioned, least-privilege, identity-safe and tested with forged tenant claims.
- PRs #201–#205 hardened CI/security. Commit `7a43c43` changed only the visual system and is not yet deployed because of Vercel's build-rate limit.
- Reference maps explicitly identify Supabase database functions, Vercel/Next.js, Grafana k6 and Lighthouse CI as focused sources/tool candidates while rejecting premature microservices.

### Open questions

- [x] Can the public landing remain static? Yes; authenticated-mode production build marks `/` and `/landing` static.
- [x] Is repeated Auth the dashboard bottleneck? No; `getViewer()` is request-memoized.
- [x] Can dashboard reads be collapsed without a new runtime? Yes; one invoker database function can return the existing read models under RLS.
- [ ] What real production concurrency/SLO does the owner require? Unknown; do not claim capacity until a staged load test is run.
- [ ] Which Vercel WAF rules are active and what traffic do they match? Provider inspection remains read-only in this packet until explicit approval for a staged rule write.

## Research

### Research scope and source selection

- Decision question: How should MoneyFlow reduce database amplification and absorb abusive/public traffic without adding a new service or leaking private cache data?
- Reference maps consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` and `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget: four focused primary sources because the decision crosses framework rendering, database reads, edge protection and load evidence.
- Expected decision: keep static content on CDN, collapse data-intensive dashboard work inside Postgres, use Vercel Firewall for edge abuse controls, and define thresholds before claiming load capacity.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [Vercel DDoS mitigation](https://vercel.com/docs/vercel-firewall/ddos-mitigation) and [WAF custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules) | Official platform docs | 2026-08-02 | Automatic platform DDoS mitigation precedes the app; custom rules can log, challenge, deny or rate-limit | A rule can block real users; rollout must start in log mode and requires provider evidence |
| [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) | Official platform docs | 2026-08-02 | Data-intensive operations belong in database functions and are callable through the API | A function does not remove SQL work; it reduces network/connection amplification and still needs RLS/grant tests |
| [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors) | Official platform docs | 2026-08-02 | Missing indexes/RLS issues should be found with advisor/query evidence | Advisor output is provider state and is not available from repository CI |
| [Grafana k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/) | Official tool docs | 2026-08-02 | Load tests need explicit error/latency pass-fail thresholds | No automatic production stress test is added; target authorization and safe ramp-up remain required |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add microservices/Redis/queue | Independent scaling knobs | New runtime, secrets, cost and failure modes; no measured need | Rejected |
| Cache private dashboard data at CDN | Reduces reads | Cross-user leakage/invalidation risk; financial data is request-private | Rejected |
| Keep 17 parallel queries | Smallest code diff | Amplifies PostgREST requests/connections under concurrency | Rejected |
| One invoker Postgres read-model RPC | One API round-trip, existing RLS boundary, reversible migration | Larger SQL payload; one failure affects the dashboard bundle | Selected |
| In-memory app rate limiter | Easy local code | Serverless instances/regions do not share counters | Rejected |
| Vercel WAF log-first rules | Stops abuse before Functions/DB and provides match evidence | Provider change and false-positive risk | Selected for staged provider follow-up, not auto-published |

### Research decision

Use the existing Next.js/Supabase modular monolith. Preserve the static public shell and public no-cookie proxy bypass. Replace authenticated dashboard fan-out with one bounded, `security invoker` database function that enforces current date/recent-row limits, exposes no foreign tenant data, and has execute permission only for `authenticated`. Do not adopt another service, shared private cache, Sentry, Trigger.dev or a runtime rate-limit dependency. Load capacity remains unverified until a thresholded, authorized test runs against the exact deployed commit.

Patterns from Actual Budget, Cal.com, Dub and large system-design repositories do not justify copying their local-first sync, monorepo, packages, queues or service topology into MoneyFlow.

### Adoption review

- Observed problem: 17 Supabase queries per dashboard render amplify connection/request load.
- Existing or simpler alternatives considered: current `Promise.all`, per-loader specialization, client cache, shared CDN cache and microservices.
- License/code-reuse compatibility: no external code copied; SQL/TypeScript use existing project patterns.
- Secrets, user-data and privacy exposure: no new provider or telemetry; RPC remains RLS/invoker-scoped and returns only the caller's dashboard data.
- Runtime, bundle, deployment and operational cost: no runtime dependency; one migration and one server mapper; smaller PostgREST fan-out.
- Owning boundary: `src/server/dashboard.ts` and a versioned Supabase migration.
- Migration and rollback: dashboard can revert to existing loaders; the RPC can be dropped in a later migration after rollback.
- Verification plan: unit/source contract, fresh database reset, pgTAP tenant/grant tests, build, browser CI, exact deployment check.
- Removal condition: remove the bundle if query plans or production latency are worse, or if one dashboard section needs an independently scalable/readable boundary.

## Specification

### Problem

Authenticated users opening the dashboard multiply one navigation into many Supabase HTTP/database operations. Under a traffic spike this can exhaust database connections or CPU before Vercel's static/public layer becomes the bottleneck. Production capacity and WAF state are not currently proven.

### User stories

- As an authenticated user, I can open the dashboard with the same balances, transactions and planning data while the backend uses one bounded data API call.
- As an operator, I can distinguish code merged to GitHub from the exact commit live on Vercel.
- As an operator, I have a safe log-first path for rate limiting and a thresholded load-test plan rather than an unbounded production stress command.

### Acceptance criteria

- [ ] Authenticated dashboard uses exactly one Supabase dashboard RPC after viewer resolution.
- [ ] RPC date and recent-row inputs are bounded so callers cannot request unbounded history.
- [ ] Returned financial/planning values map through existing validators/calculators.
- [ ] Authenticated user B cannot receive user A dashboard transactions/data.
- [ ] `anon`/`public` cannot execute the dashboard RPC; `authenticated` can.
- [ ] Demo mode preserves existing seeded behavior.
- [ ] `/` and `/landing` remain static in authenticated production build.
- [ ] No private financial data is cached across users or added to telemetry.
- [ ] PR records that production deployment is blocked/stale until the Vercel build-rate condition is resolved.

### Required states

- Loading: existing route loading UI remains unchanged.
- Empty: empty arrays and zero balances preserve current empty dashboard behavior.
- Populated: all current dashboard sections receive equivalent values.
- Validation/error: malformed or failed bundle produces one calm dashboard data error with no invented values.
- Recovery/undo: mutations and transaction recovery are unchanged.
- Long data / large VND: integer-safe parsing remains; dashboard transaction history stays bounded.
- Mobile/tablet/desktop: no UI structure changes.
- Accessibility: no rendered interaction changes.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Function is invoker-scoped, RLS-aware, bounded and least-privilege.

### Out of scope

- Full transaction-list cursor pagination and global server-side search.
- Provider plan upgrades, Supabase instance upgrades or production database writes.
- Automatic production stress testing.
- Microservices, Redis, queues, Sentry, Trigger.dev or a new observability provider.

## Implementation plan

### Architecture fit

`src/server/dashboard.ts` owns a page-specific read model, while existing feature workspaces remain route owners elsewhere. A versioned Supabase function performs the data-intensive aggregation inside the current database and relies on existing RLS policies/views. The route remains responsible only for authorization, loading and composition.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `supabase/migrations/20260802010000_dashboard_read_bundle.sql` | Add bounded invoker JSON read model and grants | Collapse 17 API calls without a new service |
| `src/server/dashboard.ts` | Validate/map bundle and preserve demo adapter | One server owner for dashboard data |
| `src/app/dashboard/page.tsx` | Replace per-feature fan-out with bundle loader | Enforce one authenticated round-trip |
| `src/lib/dashboard-transaction-window.test.ts` | Update bounded-loader source contract | Prevent regression to full history/fan-out |
| `supabase/tests/database/dashboard_read_bundle.test.sql` | Prove shape, bounds, grant and tenant isolation | Database security/correctness evidence |
| `docs/performance-budgets.md` and `tests/load/public-smoke.js` | Record SLO, safe load test and WAF log-first runbook | Extend the existing performance owner instead of creating a parallel management layer |

### Data and migration impact

- Schema/migration: adds one stable, non-`security definer` function; no table/data change.
- Backfill: none.
- Compatibility: existing feature loaders remain available for their routes and as rollback path.
- Rollback: revert dashboard page/server call; later drop the unused function with a forward migration.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Direct caller asks for years of history | Validate today/start range and recent limit inside the function |
| Function bypasses RLS | Default invoker security, explicit caller filters, user-B test |
| One malformed section drops all dashboard data | Strict server validation and calm empty/error fallback; no guessed values |
| JSON aggregation changes integer VND | Safe-integer parsing and existing mapping helpers |
| WAF blocks legitimate auth/share traffic | Log-only stage, review traffic, preview enforcement before production |
| Claiming capacity from one laptop/sandbox | Require thresholded run plus DB/Function/Firewall metrics on exact deployment |

### Verification plan

- Static: knowledge, deployment, architecture, lint, typecheck.
- Unit/domain: dashboard bounds/source contract and full Node suite.
- Database: fresh reset and all pgTAP, including tenant/grant bundle tests.
- Browser flow: existing expense/Auth smoke.
- Responsive/visual: existing multi-device audit; no UI diff expected.
- Production/manual: verify exact commit deployment, route headers, Speed Insights and WAF/provider state; no capacity claim without load evidence.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record reconnaissance/research/specification | none | This packet | done |
| T2 | Implement bounded dashboard database function | T1 | Migration review + pgTAP | implemented; pgTAP pending CI |
| T3 | Implement server bundle mapping and route switch | T2 | Unit/type/build | done locally |
| T4 | Add operations/load/WAF runbook | T1 | Docs/knowledge check | done |
| T5 | Evaluate diff and run local gates | T2–T4 | Recorded command output | done except Docker-backed pgTAP/browser CI |
| T6 | Publish focused draft PR and let required CI run | T5 | Exact-head PR checks | blocked: GitHub CLI absent |
| T7 | Inspect/stage provider WAF only after explicit approval | T6 | Firewall diff/log evidence | blocked |
| T8 | Merge/deploy/production-load acceptance | T6–T7 | Human owner + exact deployment | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher | planner | specified | repo audit, production metadata, four primary sources | no real load/SLO or provider WAF evidence | finalize implementation plan |
| 2026-08-02 | planner | implementer | planned | this packet; branch `agent/performance-resilience-hardening` | exact SQL plan/runtime metrics unverified | implement T2–T4 |
| 2026-08-02 | implementer | evaluator | locally verified | lint, typecheck, architecture, knowledge, deployment guard, authenticated build, 629 unit tests, RLS shell | Docker/pgTAP unavailable; no Lighthouse browser; production traffic sample too small | publish draft PR when GitHub CLI is available |

### Current permission boundary

- Granted scope: focused repository branch/PR and read-only Vercel/GitHub inspection.
- Exact resources: `Thunderkill016/moneyflow`; Vercel project `moneyflow`.
- Forbidden writes: `main`, production database/data, Vercel Firewall publication, plan upgrade, unrelated provider settings.
- Human approval required before: any provider write, merge, deployment override or remote load test.
- Rollback/stop condition: stop if the function needs elevated privileges, weakens RLS, changes financial output, or cannot be verified on a fresh database.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Authenticated route uses one bounded RPC | source contract + typecheck/build | pass locally |
| Public routes remain static | authenticated `next build` route table | pass locally |
| Unit/domain regression suite | 629/629 tests | pass |
| Database tenant/grant behavior | pgTAP file added; Docker unavailable locally | pending CI |

### Research and adoption evidence

- Selected sources still support the planned architecture: yes, pending final diff.
- Important source limitations remain respected: no rule publication or capacity claim without provider/load evidence.
- New tool/dependency/pattern passed the adoption review: no dependency; database read-model pattern reviewed above.

### Review findings

- Correctness: TypeScript mapping and unit contracts pass; SQL runtime still requires fresh database CI.
- Security/ownership: invoker function, empty search path, authenticated-only grant and cross-tenant pgTAP are present; runtime evidence pending.
- UI/UX/accessibility: no UI change planned.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- Production remains on a stale commit because Vercel reported a build-rate-limit failure for current `main`.
- Full ledger pagination is intentionally separate.
- Actual concurrency capacity remains unknown until an authorized test runs against a deployed exact commit.
- Draft PR publication is blocked because the mandatory GitHub CLI prerequisite is absent in this workspace.

## Delivery record

- Branch: `agent/performance-resilience-hardening`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: no
- Work packet moved to `docs/plans/completed/`: no
