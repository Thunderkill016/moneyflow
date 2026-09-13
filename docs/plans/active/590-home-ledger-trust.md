# #590 — Home ledger trust and next maintenance action

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** GitHub #590 / PR pending  
**Last updated:** 2026-09-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is the bounded execution artifact for #590; #559 remains program intent only.

## Outcome

Make signed-in Home show a compact, truthful ledger-trust state derived from the existing `public.ledger_trust_summary()` contract, plus at most one next maintenance action when known work limits or blocks trust. The surface must never imply that all external bank/provider activity has been observed.

## Repository reconnaissance

### Current behavior

- `main@b7956f7ea7cbd54cda8ed0421362d108cf09c6bd` is the #589 dashboard simplification baseline.
- `/dashboard` currently presents the current financial statement, generic attention items, compact planning navigation, category spend and recent activity.
- PR #588 added `public.ledger_trust_summary()` and its pgTAP counterexamples. The migration was reconciled to production separately on 2026-09-13.
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
| `e2e/audit/responsive.audit.spec.ts` | phone/desktop presentation gate | add affected-surface evidence if needed |

### Existing tests and constraints

- `ledger_trusted_through.test.sql` already proves missing/dirty reconciliation, pending Inbox, needs-review facts, unreconciled account legs, archived accounts, tenant isolation and clean advancement.
- `dashboard_read_bundle.test.sql` proves SECURITY INVOKER, empty search path, grants, bounded inputs and tenant-separated bundle data.
- `dashboard-performance-contract.test.ts` requires exactly one `.rpc()` call and no shared/static private-data cache.
- Class 3 policy requires database tests, application/static/build evidence, browser evidence for changed flow, UI audit for visual change, CodeQL/secret checks, rollback and owner review.

### Similar implementation and recent history

- #207 is the schema-skew incident precedent: application code must not turn an absent/newer additive dashboard contract into a false-empty ledger.
- #415 established the one-bounded-RPC performance contract.
- #589 removed duplicate Home planning UI and reduced dashboard client script bytes; this slice must not reverse that simplification.

### Open questions

None blocking implementation. The original two-RPC idea was rejected after current-code reconnaissance and issue #590 was updated before implementation.

## Research

### Research scope and source selection

- Decision question: what interaction pattern best reduces repeated maintenance while strengthening trust in a personal-finance ledger?
- Reference map consulted: historical `docs/research/PRODUCT_COMPETITIVE_MEMORY.md` plus current product principles.
- Source budget: four focused product sources plus local-market cross-check.
- Expected decision: whether to add breadth, automation or a small review/trust loop to Home.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| YNAB approving/matching transactions | official product support | 2026-09-13 | imported activity is explicitly reviewed/matched rather than silently trusted | MoneyFlow does not copy YNAB budgeting method |
| YNAB reconciliation guide | official product support | 2026-09-13 | reconciliation exists to establish trust in account numbers | does not establish external-source completeness for MoneyFlow |
| Actual Budget import + rules docs | official open-source product docs | 2026-09-13 | dedupe/matching and explainable user-owned rules reduce repetitive cleanup | no wholesale architecture/UI adoption |
| Copilot Money quick-start review flow | official product support | 2026-09-13 | `To Review` makes maintenance visible on the daily dashboard | AI categorization is out of scope |
| Money Lover / MISA current product surfaces | official local-market product pages | 2026-09-13 | Vietnamese daily-finance language and quick entry remain familiar expectations | marketing breadth is not evidence to add features |

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

MoneyFlow now computes a deterministic trusted-through boundary, but Home does not expose it. A user can see balances and monthly activity without knowing whether every active account has a clean reconciliation or whether known unresolved work limits that confidence.

### User stories

- As a MoneyFlow user, I can see the date through which my known ledger state is trusted so I know how current my reconciled picture is.
- When trust is blocked or limited, I can open one relevant existing work surface instead of discovering maintenance work by navigation hunting.
- As a demo user, I am never shown a fabricated reconciliation/trust date.

### Acceptance criteria

- [ ] `get_dashboard_bundle` remains the single authenticated dashboard Data API call.
- [ ] Its additive `ledger_trust` field is exactly the existing tenant-scoped trust result.
- [ ] Application parsing accepts the old payload shape without `ledger_trust`.
- [ ] `trusted`, `trusted_limited`, `missing_clean_reconciliation`, and `no_active_accounts` have truthful Vietnamese copy.
- [ ] `known_ledger_state_only` is reflected in the UI wording; no source-completeness claim.
- [ ] Limited state chooses at most one existing maintenance destination.
- [ ] Demo mode renders no authoritative trust date.
- [ ] Existing Home attention/planning/ledger behavior is unchanged.

### Required states

- Loading: existing truthful `/dashboard/loading.tsx`; do not add fabricated trust skeleton values.
- Empty: no active account → blocked/no trust date; existing empty-ledger capture remains independent.
- Populated: trusted date and compact coverage explanation.
- Validation/error: old bundle/no trust field or parse failure hides the trust surface without hiding ledger data.
- Recovery/undo: maintenance CTA uses existing `/inbox`, `/transactions?review=needs_review`, or `/accounts`; no new mutation.
- Long data / large VND: no amount added to the trust surface.
- Mobile/tablet/desktop: one compact row/surface, no horizontal overflow, CTA >=44px where rendered.
- Accessibility: semantic heading/text/link; state meaning expressed in words, not color alone.

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

The database already owns the trust computation. `get_dashboard_bundle` already owns the bounded request-private Home read model. The new migration composes the existing trust function into that existing bundle rather than creating a parallel read path. The server maps the optional payload; the dashboard presentation owns only wording and routing.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| new migration | `CREATE OR REPLACE get_dashboard_bundle` with additive `ledger_trust` object | preserve one Data API call |
| migration identity | pin new raw-byte SHA-256 identity | repository migration contract |
| `dashboard_read_bundle.test.sql` | assert field presence, tenant-specific result and wording boundary | DB/RLS proof |
| `src/lib/ledger-trust.ts` + test | typed status/reason/action/copy mapping | keep UI logic deterministic/testable |
| `src/server/dashboard.ts` | optional schema/map field and demo `null` | schema-skew safety |
| dashboard page/client/header | thread and render compact trust state | user-visible outcome |
| CSS module / UI audit | bounded responsive presentation evidence | Class 2 visual layer inside Class 3 slice |

### Data and migration impact

- Schema/migration: additive replacement of existing read-only `get_dashboard_bundle` function body; no table/RLS/data mutation.
- Backfill: none.
- Compatibility: `ledger_trust` optional in application parser; old DB keeps Home functional but trust surface absent.
- Rollback: restore previous bundle function in a new migration/revert PR and remove presentation. Never edit already-applied migration history.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| second dashboard network call regresses performance | preserve one `.rpc()` source contract |
| bundle calls trust under wrong identity | pgTAP with two tenants / known distinct states |
| app deploys before DB migration | optional parser field + hidden trust surface |
| wording overclaims bank/source completeness | literal `known ledger` wording + unit/source contract |
| unresolved work has multiple causes | show counts/context but choose at most one CTA; never claim CTA resolves all |
| trust UI competes with capture | compact secondary surface; AppShell primary capture remains unchanged |

### Verification plan

- Static: knowledge, architecture, migration identity, lint, typecheck, production build.
- Unit/domain: trust view-model mapping and existing finance suites.
- Database: fresh reset + pgTAP including dashboard bundle + existing ledger trust suite.
- Browser flow: authenticated dashboard reads trust field via strict harness; existing capture/ledger flows remain green.
- Responsive/visual: affected dashboard in phone/desktop light/dark, no overflow, 44px CTA.
- Production/manual: none in this branch; after owner merge/migration approval, exact deployed commit + DB migration + affected-flow smoke required.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| 590.1 | research + current-state reconciliation | none | #590 + this packet | done |
| 590.2 | preserve one-call DB bundle while adding trust | 590.1 | migration + pgTAP | in_progress |
| 590.3 | add typed application mapping and schema-skew fallback | 590.2 contract | unit/static tests | todo |
| 590.4 | render compact Home trust surface | 590.3 | browser/UI audit | todo |
| 590.5 | exact-head evaluation + CI | 590.2–590.4 | CI/CodeQL/secret/database/browser | todo |
| 590.6 | owner review / merge decision | 590.5 | PR | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-13 | researcher | planner | specified | #590, product research, current code | initial two-RPC idea contradicted performance contract | revise architecture |
| 2026-09-13 | planner | implementer | implementing | revised #590 + this packet, branch `feat/590-home-ledger-trust` | exact runtime/tests not yet executed | implement bounded slice |

### Current permission boundary

- Granted scope: branch/PR repository writes for #590.
- Exact repository: `Thunderkill016/moneyflow`, branch `feat/590-home-ledger-trust`.
- Forbidden writes: `main`, merge, Supabase/Vercel/provider configuration, production data/migration.
- Human approval required before: merge and any production migration/deployment intervention.
- Stop condition: any required change alters trust semantics, tenant ownership, provider state, or requires a second dashboard Data API call.

## Evaluation

Pending implementation and exact-head CI.

## Delivery record

- Branch: `feat/590-home-ledger-trust`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: none authorized
- Production flow verified: no
- Work packet moved to `docs/plans/completed/`: no
