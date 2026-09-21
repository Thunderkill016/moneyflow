# #590 — Home ledger trust and next maintenance action

**Status:** completed
**Execution state:** completed
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** GitHub #590 / PR #591
**Last updated:** 2026-09-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is the bounded execution artifact for #590; #559 remains program intent only.

## Outcome

Make signed-in Home show a compact, truthful ledger-trust state derived from the existing `public.ledger_trust_summary()` contract, plus at most one next maintenance action when known work limits or blocks trust. The surface must never imply that all external bank/provider activity has been observed.

## Repository reconnaissance

### Current behavior

- `main@b7956f7ea7cbd54cda8ed0421362d108cf09c6bd` is the #589 dashboard simplification baseline.
- `/dashboard` presents the current financial statement, generic attention items, compact planning navigation, category spend and recent activity.
- PR #588 added `public.ledger_trust_summary()` and its pgTAP counterexamples. The standalone migration was reconciled to production separately on 2026-09-13; this #590 bundle migration is not authorized for production by this packet.
- `src/server/dashboard.ts` uses exactly one authenticated Data API call, `get_dashboard_bundle`, and `src/lib/dashboard-performance-contract.test.ts` mechanically forbids a second `.rpc()` or direct `.from()` read.
- `get_dashboard_bundle` is `STABLE`, `SECURITY INVOKER`, pins an empty search path, bounds its input range and relies on existing RLS-aware reads.
- `/transactions` already supports `review=needs_review`; `/inbox` and `/accounts` already own the other maintenance destinations.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/20260911150000_ledger_trusted_through.sql` | authoritative trust semantics | reuse unchanged |
| `supabase/migrations/20260802022923_dashboard_read_bundle.sql` | single-call Home read shape | extend in new migration; never edit old migration |
| `supabase/tests/database/dashboard_read_bundle.test.sql` | RPC security/isolation contract | extend |
| `src/server/dashboard.ts` | request-private bundle parsing | extend compatibly |
| `src/lib/dashboard-performance-contract.test.ts` | guards one-RPC/no-cache boundary | preserve |
| `src/components/dashboard/dashboard-overview-sections.tsx` | current Home hierarchy | add bounded trust surface |
| `e2e/auth/*` | authenticated ownership and presentation proof | extend with strict synthetic fixture |
| `e2e/audit/*` | broad cross-device regression gate | keep as independent demo/geometry coverage |

### Existing tests and constraints

- `ledger_trusted_through.test.sql` proves missing/dirty reconciliation, pending Inbox, needs-review facts, unreconciled account legs, archived accounts, tenant isolation and clean advancement.
- `dashboard_read_bundle.test.sql` proves SECURITY INVOKER, empty search path, grants, bounded inputs and tenant-separated bundle data.
- `dashboard-performance-contract.test.ts` requires exactly one `.rpc()` call and no shared/static private-data cache.
- Class 3 policy requires database tests, application/static/build evidence, browser evidence for changed flow, UI audit for visual change, CodeQL/secret checks, rollback and owner review.

### Similar implementation and recent history

- #207 is the schema-skew incident precedent: application code must not turn an absent/newer additive dashboard contract into a false-empty ledger.
- #415 established the one-bounded-RPC performance contract.
- #589 removed duplicate Home planning UI and reduced dashboard client script bytes; this slice must not reverse that simplification.

### Open questions

No implementation question remains open. Owner merge review and any later production migration/deployment remain separate decisions.

## Research

### Research scope and source selection

- Decision question: what interaction pattern best reduces repeated maintenance while strengthening trust in a personal-finance ledger?
- Reference map consulted: historical `docs/research/PRODUCT_COMPETITIVE_MEMORY.md` plus current product principles.
- Source budget: focused product sources plus local-market and test-method cross-check.
- Expected decision: whether to add breadth, automation or a small review/trust loop to Home.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| YNAB approving/matching transactions | official product support | 2026-09-13 | imported activity is explicitly reviewed/matched rather than silently trusted | MoneyFlow does not copy YNAB budgeting method |
| YNAB reconciliation guide | official product support | 2026-09-13 | reconciliation exists to establish trust in account numbers | does not establish external-source completeness for MoneyFlow |
| Actual Budget import + rules docs | official open-source product docs | 2026-09-13 | dedupe/matching and explainable user-owned rules reduce repetitive cleanup | no wholesale architecture/UI adoption |
| Copilot Money quick-start review flow | official product support | 2026-09-13 | `To Review` makes maintenance visible on the daily dashboard | AI categorization is out of scope |
| Money Lover / MISA current product surfaces | official local-market product pages | 2026-09-13 | Vietnamese daily-finance language and quick entry remain familiar expectations | marketing breadth is not evidence to add features |
| Playwright emulation docs | official test framework docs | 2026-09-13 | viewport should be established before navigation; `emulateMedia({ colorScheme })` grades `prefers-color-scheme` | test-method guidance only, not product semantics |
| PostgreSQL `CREATE FUNCTION` docs | official database docs | 2026-09-13 | `SECURITY INVOKER` is the default; `CREATE OR REPLACE` retains ownership/permissions while other properties use command values/defaults | review evidence only; repository pgTAP remains the executable security proof |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add more dashboard metrics/cards | easy visual change | increases cognitive load; no new trust loop | reject |
| Add second `ledger_trust_summary()` RPC | smallest DB diff | violates one-RPC performance contract and reintroduces fan-out | reject |
| Add AI categorization / provider sync | reduces manual work eventually | unproven, broad, provider/security/economics boundaries | reject |
| Add trust field to existing bundle + compact Home surface | preserves one request, uses existing deterministic truth, bounded UX | Class 3 migration and schema-skew compatibility required | select |

### Research decision

Adopt the maintenance-loop pattern, not competitor feature breadth: expose trust state and one next action, keep reconciliation/provenance detail progressively disclosed, and preserve the wording boundary `known_ledger_state_only`. No new dependency, provider, AI model or design system is adopted.

### Adoption review

Not applicable. No dependency/provider/service/framework is added.

## Specification

### Problem

MoneyFlow computes a deterministic trusted-through boundary, but Home does not expose it. A user can see balances and monthly activity without knowing whether every active account has a clean reconciliation or whether known unresolved work limits that confidence.

### User stories

- As a MoneyFlow user, I can see the date through which my known ledger state is trusted so I know how current my reconciled picture is.
- When trust is blocked or limited, I can open one relevant existing work surface instead of discovering maintenance work by navigation hunting.
- As a demo user, I am never shown a fabricated reconciliation/trust date.

### Acceptance criteria

- [x] `get_dashboard_bundle` remains the single authenticated dashboard Data API call in source and strict auth-browser proof.
- [x] Its additive `ledger_trust` field is the existing tenant-scoped trust result.
- [x] Application parsing accepts the old payload shape without `ledger_trust`.
- [x] `trusted`, `trusted_limited`, `missing_clean_reconciliation`, and `no_active_accounts` have deterministic truthful Vietnamese copy.
- [x] `known_ledger_state_only` is reflected in the UI wording; no source-completeness claim.
- [x] Limited state chooses at most one existing maintenance destination.
- [x] Demo mode renders no authoritative trust date.
- [x] Existing Home attention/planning/ledger behavior is unchanged by source contract.
- [x] Source/runtime acceptance head `f1ee094c852a376ebaf44436409bb3db2e9c25e4` is green across CI/CodeQL/Secret/browser/UI evidence.

### Required states

- Loading: existing truthful `/dashboard/loading.tsx`; no fabricated trust skeleton values.
- Empty: no active account → blocked/no trust date; existing empty-ledger capture remains independent.
- Populated: trusted date and compact coverage explanation.
- Validation/error: old bundle/no trust field or parse failure hides the trust surface without hiding ledger data.
- Recovery/undo: maintenance CTA uses existing `/inbox`, `/transactions?review=needs_review`, or `/accounts`; no new mutation.
- Long data / large VND: no amount is added to the trust surface.
- Mobile/tablet/desktop: compact surface with no horizontal overflow; authenticated 320px phone and 1280px desktop explicitly grade it, while the existing cross-device audit guards broader layout regression.
- Accessibility: semantic region/text/link; state meaning expressed in words, not color alone; CTA target is graded at >=44px.
- Theme: authenticated phone and desktop both grade light and dark via Playwright color-scheme emulation.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants unchanged.
- Trust is derived under caller identity/RLS; no caller-provided user ID.
- `ledger_trust_summary()` semantics remain unchanged.
- Never call the trust result external-source completeness.

### Out of scope

Provider sync, AI, new rules engine behavior, navigation redesign, planning redesign, full #559 redesign, production migration, provider write, merge.

## Implementation plan

### Architecture fit

The database already owns the trust computation. `get_dashboard_bundle` already owns the bounded request-private Home read model. Migration `20260913103000_dashboard_bundle_ledger_trust.sql` composes the existing trust function into that bundle rather than creating a parallel read path. The server maps the optional payload; the dashboard presentation owns only wording and routing.

### Implemented changes

| File/area | Change | Reason |
|---|---|---|
| new migration | `CREATE OR REPLACE get_dashboard_bundle` with additive `ledger_trust` object | preserve one Data API call |
| migration identity | pinned new raw-byte SHA-256 identity | repository migration contract |
| `dashboard_read_bundle.test.sql` | tenant-specific trust result and coverage boundary assertions | DB/RLS proof |
| `src/lib/ledger-trust.ts` + test | typed status/reason/action/copy mapping | deterministic/testable presentation |
| `src/server/dashboard.ts` | optional schema/map field, non-negative count guard, demo `null` | schema-skew and truth safety |
| dashboard page/client/header | thread and render compact trust state | user-visible outcome |
| strict auth browser fixture/specs | 320px phone + desktop, light/dark, CTA/overflow/one-RPC assertions | affected-surface runtime proof |
| existing cross-device audit | unchanged broad demo geometry regression gate | independent presentation safety |

### Data and migration impact

- Schema/migration: additive replacement of existing read-only `get_dashboard_bundle` function body; no table/RLS/data mutation.
- Backfill: none.
- Compatibility: `ledger_trust` is optional in application parsing; old DB keeps Home functional but trust surface absent.
- Rollback: restore previous bundle function in a new migration/revert PR and remove presentation. Never edit already-applied migration history.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| second dashboard network call regresses fan-out | one `.rpc()` source contract + strict served-request assertion |
| bundle calls trust under wrong identity | pgTAP with two tenants / distinct states |
| app deploys before DB migration | optional parser field + hidden trust surface |
| wording overclaims bank/source completeness | literal known-ledger wording + unit/browser contract |
| unresolved work has multiple causes | expose context but choose at most one CTA; never claim CTA resolves all |
| trust UI competes with capture | compact secondary surface; AppShell primary capture unchanged |
| auth-only UI gets false-green from demo audit | dedicated authenticated phone/desktop presentation tests |
| mobile proof resizes after load rather than grading true mobile navigation | set 320px viewport before login/navigation per Playwright guidance |
| test itself creates a second dashboard RPC | grade first post-login dashboard render; no second `page.goto('/dashboard')` |
| extra DB work silently becomes a performance claim | preserve one network request but make no latency/LCP claim without benchmark |

### Verification plan

- Static: knowledge, architecture, migration identity, lint, typecheck, production build.
- Unit/domain: trust view-model mapping, strengthened count guard and existing finance suites.
- Database: fresh reset + pgTAP including dashboard bundle and existing ledger-trust suite.
- Browser flow: authenticated dashboard reads trust field through strict synthetic Supabase double; one bundle RPC and zero trust network RPCs.
- Responsive/visual: explicit authenticated phone 320px and desktop 1280px in light/dark, no overflow, CTA >=44px; existing cross-device audit remains an independent broad regression gate.
- Production/manual: none in this branch; after owner merge/migration approval, exact deployed commit + DB migration + affected-flow smoke would be required.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| 590.1 | research + current-state reconciliation | none | #590 + this packet | done |
| 590.2 | preserve one-call DB bundle while adding trust | 590.1 | migration + pgTAP | done |
| 590.3 | add typed application mapping and schema-skew fallback | 590.2 contract | unit/static tests | done |
| 590.4 | render compact Home trust surface | 590.3 | auth browser proof + broad UI audit | done |
| 590.5 | exact-head evaluation + CI | 590.2–590.4 | CI #3687 / CodeQL #2690 / Secret #2690 / database / browser / UI audit | done |
| 590.6 | owner review / merge decision | 590.5 | PR #591 | ready |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-13 | researcher | planner | specified | #590, product research, current code | initial two-RPC idea contradicted performance contract | revise architecture |
| 2026-09-13 | planner | implementer | implementing | revised #590 + branch `feat/590-home-ledger-trust` | runtime evidence not yet complete | implement bounded slice |
| 2026-09-13 | implementer | evaluator | evaluating | PR #591, migration, unit/pgTAP/auth-browser coverage; pre-final CI #3681 mostly green | final exact-head still required; no DB latency benchmark | complete exact-head evaluation |
| 2026-09-13 | evaluator | owner | review_ready | source/runtime head `f1ee094c852a376ebaf44436409bb3db2e9c25e4`; CI #3687, CodeQL #2690, Secret #2690, DB/browser/UI all green | no DB latency benchmark; production migration not applied | owner review / merge decision |

### Current permission boundary

- Granted scope: branch/PR repository writes for #590.
- Exact repository: `Thunderkill016/moneyflow`, branch `feat/590-home-ledger-trust`.
- Forbidden writes: `main`, merge, Supabase/Vercel/provider configuration, production data/migration.
- Human approval required before: merge and any production migration/deployment intervention.
- Stop condition: any required change alters trust semantics, tenant ownership, provider state, or requires a second dashboard Data API call.

## Evaluation

### Findings closed during evaluation

1. The initial two-RPC design contradicted the existing dashboard performance boundary; architecture was corrected before implementation.
2. CI caught diff hygiene and migration-identity maintenance errors; fixes changed metadata/tests only and did not edit applied migration SQL.
3. The SAFE-03 count contract was stale relative to the stronger `safeCount` implementation; the test now proves integer and non-negative semantics.
4. Demo-only cross-device audit could not prove an authenticated-only trust surface; dedicated authenticated 320px phone and desktop light/dark tests were added.
5. A second dashboard navigation inside the test would have manufactured a second bundle RPC; tests now observe the first post-login render.
6. Playwright official guidance recommends setting viewport before navigation; the 320px phone viewport is now established before login/dashboard navigation.
7. Preserving one network RPC does not prove unchanged DB latency. Existing relevant indexes were reviewed; no speculative index was added and no performance-win claim is made.
8. Final independent review checked the replacement function against PostgreSQL `CREATE OR REPLACE FUNCTION` semantics: the outer bundle remains invoker-rights, ownership/permissions stay stable, and repository pgTAP continues to prove ACL/search-path/RLS behavior.

### Final source/runtime evidence

On `f1ee094c852a376ebaf44436409bb3db2e9c25e4`, CI #3687 completed SUCCESS. Policy, migration identity, project knowledge, unit/static RLS, production build, presentation ownership, deployment/CSS/architecture, lint/typecheck, fresh reset + pgTAP, archive producer/restore and aggregate `verify` all passed. Generic browser smoke passed 146/146. Authenticated browser passed 24 tests with one pre-existing unrelated performance-attribution skip; both new ledger-trust tests ran and passed on desktop and 320px phone. Cross-device UI audit passed. CodeQL #2690 and Secret history scan #2690 succeeded. `main` remained at `b7956f7ea7cbd54cda8ed0421362d108cf09c6bd`, so no base drift affected this acceptance run.

### Acceptance state

Implementation/source review has no known semantic blocker and is ready for owner review. This documentation-only closeout does not alter runtime code; the current PR head must still satisfy its GitHub checks before merge. Merge and production migration/deployment remain separate owner decisions.

## Delivery record

- Branch: `feat/590-home-ledger-trust`
- PR: #591 — merged 2026-09-13
- Squash commit: `77def221`
- Accepted source/runtime head: `f1ee094c852a376ebaf44436409bb3db2e9c25e4`
- Accepted CI run: #3687 SUCCESS
- Accepted CodeQL/Secret runs: #2690 / #2690 SUCCESS
- Production migration: not authorized/applied for `20260913103000_dashboard_bundle_ledger_trust.sql`
- Production deployment: none authorized by this packet
- Production flow verified for this bundle change: no
- Work packet moved to `docs/plans/completed/`: this closeout
