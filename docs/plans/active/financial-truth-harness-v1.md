# Authenticated financial-truth harness v1

**Status:** planned  
**Execution state:** planned  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner  
**Issue/PR:** pending  
**Last updated:** 2026-08-12

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is Class 3 because it changes a cross-cutting verification boundary for financial semantics. It does not authorize provider or production-data writes.

## Outcome

Extend MoneyFlow's existing strict authenticated Playwright harness with one deterministic financial-truth scenario that proves the real authenticated application composes server ledger rows into factual dashboard balances and period totals without counting an internal transfer as income or expense. Reuse the existing Supabase double and browser harness; do not create a new agent framework, CLI, runtime or dependency.

## Repository reconnaissance

### Current behavior

- `playwright.auth.config.ts` is the only browser harness that boots the production Next.js app with `NEXT_PUBLIC_APP_MODE=authenticated`; the ordinary browser/audit suites intentionally remain demo-owned.
- `e2e/auth/supabase-double.mjs` is strict and fail-closed: unknown table/RPC/filter paths return `501` and are recorded as misses, while tests assert the miss ledger is empty.
- `e2e/auth/harness.ts` seeds synthetic authenticated rows and signs in through the real login form. Its current seed surface is intentionally narrow: candidates and transactions vary, while accounts/categories/balances are fixed.
- `src/lib/finance.ts` already has pure tests for safe-integer totals, transfer-neutral total assets, period income/expense, split exactness and balance reconciliation.
- `src/server/finance.ts` maps authenticated `transaction_feed` rows through Zod, rejects invalid/unsafe amounts and computes the current VND account-balance total from server rows.
- `/dashboard` passes the authenticated server workspace through `MoneyFlowDashboard`, which reconciles the current balance and derives income, expense and net from the live transaction list.
- Existing authenticated browser tests primarily prove ownership/source selection (server Inbox/export versus stale demo storage). They do not yet prove that a mixed income/expense/transfer server ledger reaches the rendered dashboard with the same financial truth as the domain contract.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `playwright.auth.config.ts` | Owns authenticated browser environment | Reuse unchanged |
| `e2e/auth/supabase-double.mjs` | Strict authenticated server double | Reuse unchanged |
| `e2e/auth/harness.ts` | Synthetic seed/control helpers | Extend narrowly |
| `e2e/auth/*.auth.spec.ts` | Authenticated outcome verification | Add one bounded spec |
| `src/lib/finance.ts` + tests | Pure financial truth | Reuse as conceptual contract; do not duplicate implementation |
| `src/server/finance.ts` | Authenticated row mapping/read composition | Exercise through the real route |
| `src/components/dashboard/*` | Rendered financial statement | Observe only; no UI change |
| database migrations/pgTAP | Own PostgreSQL/RLS truth | Do not infer from this harness |

### Existing tests and constraints

- Related unit tests: `src/lib/finance.test.ts` already proves transfer neutrality, authenticated dashboard arithmetic, snapshot reconciliation and split totals.
- Database/RLS tests: existing pgTAP owns SQL/RLS/RPC truth; no database change is planned here.
- Browser tests: `e2e/auth/inbox-ownership.mobile.auth.spec.ts` proves authenticated source ownership and the harness authenticity boundary.
- Product/architecture rules: integer money; transfers are balanced movements and not income/expense; authenticated failures never fall back to demo; missing financial facts are never invented; evidence from one layer must not be used to claim another.

### Similar implementation and recent history

- Reuse the authenticated harness introduced by #336 rather than creating another environment.
- Reuse the false-green discipline from #337: important invariants should fail mechanically instead of relying on prose.
- #343 is current main at the start of this packet; P2 Recover remains separate and is not part of this slice.

### Open questions

- [x] Should MoneyFlow build a new `mf` harness CLI? **No.** The current repository already has an authenticated harness, CI classifier and repository-backed operating model; another management layer would duplicate ownership and violate the existing architecture rule.
- [x] Should this browser harness try to prove RLS or PostgreSQL ledger invariants? **No.** That belongs to pgTAP/local Supabase; the authenticated double explicitly does not emulate those guarantees.
- [x] What missing proof is worth adding? **Runtime composition parity:** deterministic server rows should produce the expected dashboard financial facts through the actual authenticated route and React render.

## Research

### Research scope and source selection

- Decision question: How should MoneyFlow make coding-agent verification more reliable while preserving personal-finance ledger truth and avoiding a second orchestration platform?
- Reference maps consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` and `docs/research/REPOSITORY_REFERENCE_MAP.md`.
- Source budget: four focused primary/official sources.
- Expected decision: select a bounded harness pattern and the financial invariants it should expose mechanically.

### Questions researched

1. What makes a coding-agent harness useful rather than another layer of instructions?
2. How should an agent eval distinguish environment correctness from model output claims?
3. Which personal-finance ledger properties deserve outcome-level verification?
4. What evidence belongs in this harness versus database/provider verification?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [OpenAI — Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) | Primary engineering experience | 2026-08-12 | Reliable agent work compounds when the repository exposes deterministic environments, legible runtime state and mechanical feedback loops; repository knowledge should be a map/system of record rather than one giant instruction file. | Their scale, worktree infrastructure and automation volume exceed MoneyFlow; this is a pattern reference, not permission to reproduce their platform. |
| [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Primary evaluation guidance | 2026-08-12 | Agent evaluation needs a task, tools/environment and graders; outcome/state checks are stronger than trusting what the agent says it accomplished; trials should start from isolated, stable state. | MoneyFlow is evaluating product behavior and coding changes, not benchmarking models; no LLM grader is required for objective ledger facts. |
| [Actual Budget — Transfers](https://actualbudget.org/docs/transactions/transfers/) | Official personal-finance product documentation | 2026-08-12 | Linked internal transfers must not distort reports; equal/opposite transfer sides represent movement between owned accounts rather than ordinary spending/income. | Actual's on-budget/off-budget model is not MoneyFlow's product model. Only the transfer/reporting invariant applies. |
| [GnuCash — Reconciling an Account to a Statement](https://wiki.gnucash.org/docs/C/gnucash-manual/acct-reconcile.html) | Official bookkeeping documentation | 2026-08-12 | Reconciliation compares ledger entries to a statement, tracks cleared/reconciled state, and completion depends on reconciled balance matching the statement so the difference is zero. | This slice does not change reconciliation UI/RPCs; the source reinforces the broader trust model but does not justify expanding scope here. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| New `mf boot/inspect/prove/evidence` CLI | One visible entrypoint | Duplicates existing CI/harness/policy, creates a new management layer and maintenance owner before proven need | Reject |
| Full local Supabase stack for every authenticated browser test | More realistic database behavior | Docker/runtime cost, overlaps pgTAP, increases infrastructure noise and conflates browser composition with DB truth | Reject for this slice |
| Permissive HTTP mocks | Cheap and easy to extend | Missing queries can become empty-data false greens | Reject; preserve strict 501/miss ledger |
| Extend the existing authenticated harness with one named financial scenario | Small diff, exercises real authenticated route/server components/rendering, preserves strict boundaries | Still does not prove PostgreSQL/RLS/provider behavior | Select |

### Research decision

Observed: the repository already contains the main harness ingredients advocated by current agent-engineering guidance—explicit runtime mode, strict deterministic server double, browser-driving tests, layered verification and repository-backed context. The missing evidence is not another agent runtime; it is a financial outcome scenario that connects server data to rendered product facts.

Product judgment: v1 will encode one canonical authenticated ledger with two VND accounts, one income, one expense and one internal transfer. The expected balance/income/expense/net values are fixed in the test fixture rather than computed using the same production summarizer, so the browser test remains an independent outcome check. The transfer must be visibly present in recent transactions while remaining absent from income/expense/net totals.

Not applicable: OpenAI's large worktree/observability platform, Anthropic model grading infrastructure, Actual's envelope/on-budget semantics and GnuCash's full reconciliation workflow are not adopted.

### Adoption review

Not applicable. No dependency, provider, service, framework or new architecture layer is added.

## Specification

### Problem

The authenticated harness can prove that MoneyFlow reads the server instead of stale demo state, but a coding agent can still change the authenticated read/composition/render path in a way that misstates money while pure finance unit tests remain green. The repository lacks one browser-level financial-truth contract over mixed transaction kinds.

### User stories

- As the MoneyFlow owner, I can trust a green authenticated browser check to prove that a mixed server ledger reaches the dashboard without reclassifying an internal transfer as income or expense.
- As a coding agent, I get a deterministic failing example when I break the server-to-dashboard financial path instead of inferring correctness from a build or unrelated demo test.

### Acceptance criteria

- [ ] Existing authenticated harness defaults remain backward-compatible for current tests.
- [ ] A named synthetic scenario contains two VND accounts, one income, one expense and one internal transfer.
- [ ] The server balance snapshot totals exactly `2,700,000` VND.
- [ ] `/dashboard` renders exactly `2,000,000` VND income, `300,000` VND expense and `1,700,000` VND net for the scenario period.
- [ ] The internal transfer is visibly rendered as a transfer transaction but does not change income, expense or net.
- [ ] The test proves authenticated mode and fails if the app makes any unimplemented request to the Supabase double.
- [ ] Expected financial totals are fixture constants/counterexamples, not calculated by importing the production dashboard summarizer under test.
- [ ] No new dependency, runtime, CLI, schema, migration, provider write or production-data operation is introduced.

### Required states

- Loading: existing production Next.js startup owns it; no new state.
- Empty: covered elsewhere; not part of this scenario.
- Populated: canonical financial-truth fixture.
- Validation/error: strict double miss ledger remains the fail-closed boundary.
- Recovery/undo: not changed.
- Long data / large VND: values remain safe integers; extreme-boundary arithmetic remains unit-test owned.
- Mobile/tablet/desktop: run in the existing authenticated phone project because dashboard mobile composition is a core release surface; no responsive styling change.
- Accessibility: read semantic `MoneyValue` labels/data attributes rather than fragile visual positions.

### Financial and security constraints

- Integer VND only.
- Internal transfer is a movement between owned accounts, not income or expense.
- Do not derive expected totals from production arithmetic under test.
- Synthetic test data only; no secrets or user financial data.
- This harness does not claim RLS, tenant isolation, SQL constraints or provider correctness.

### Out of scope

- Reconciliation mutation/completion behavior.
- Archive/export/restore P2 Recover work.
- Database/RLS/RPC verification.
- Production/provider checks.
- New agent framework, CLI, model API or LLM grader.
- UI redesign or presentation changes.

## Implementation plan

### Architecture fit

`e2e/auth/harness.ts` already owns authenticated synthetic fixture construction and server seeding. The new scenario belongs there. A new Playwright spec under `e2e/auth/` is the smallest layer that can exercise real authenticated route loaders/server components/client rendering while keeping database truth separate.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `e2e/auth/harness.ts` | Allow optional account/category/balance seed overrides; add canonical financial-truth scenario constants/helper | Reuse one harness owner without changing existing defaults |
| `e2e/auth/financial-truth.mobile.auth.spec.ts` | Assert dashboard financial facts + visible transfer + strict authenticated boundary | Fill the missing runtime-composition proof |
| `docs/research/pr-memory/2026/Q3/PR-<n>.md` | Add after PR number exists | Required repository provenance |
| this packet | Record implementation/evaluation evidence and PR | Required Class 3 state/handoff |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing seed defaults remain unchanged.
- Rollback: revert the test/helper slice; there is no persisted or provider state to unwind.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Fixture accidentally uses production summarizer to compute expected values | Hard-code independent expected totals in scenario contract |
| Transfer row exists but totals accidentally include it | Include a large enough transfer and assert all three period totals plus visible transfer row |
| Test passes in demo mode | Reuse `assertAuthenticatedMode` and require served `/auth/v1/user` via strict report path |
| New seed flexibility changes old tests | Optional overrides with current constants as defaults |
| HTTP double silently misses a new query | Preserve strict 501 + `assertNoUnservedRequests()` |
| Browser proof overclaimed as DB proof | State boundary in packet/test comments; do not add pgTAP claims |

### Verification plan

- Static: `npm run check:knowledge`, `npm run test:ci-policy`, `npm run check:architecture`, lint, typecheck.
- Unit/domain: existing repo unit suite; no production domain implementation changes.
- Database: not applicable to this diff; no schema/RLS/RPC code changes.
- Browser flow: `npm run test:e2e:auth`, especially the new authenticated-phone contract.
- Responsive/visual: not applicable as a UI-change gate; the selected phone project still exercises the user-visible surface.
- Production/manual: not applicable; no production behavior/code changes.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Extend authenticated seed helper without changing defaults | packet | existing auth specs remain compatible | todo |
| T2 | Add canonical financial-truth authenticated browser spec | T1 | expected balance/period totals + visible transfer + zero misses | todo |
| T3 | Open draft PR and add bounded PR memory record | T1–T2 | PR + knowledge contract | todo |
| T4 | Evaluate exact diff and CI evidence | T3 | selected CI/browser results, no overclaim | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | researcher | planner | specified | repo reconnaissance + four focused sources | exact browser selectors still need implementation-level confirmation | produce bounded plan |
| 2026-08-12 | planner | implementer | planned | this packet + branch `agent/financial-truth-harness-v1` | CI has not run; no implementation exists yet | implement T1–T2 only |

### Current permission boundary

- Granted scope: `branch_write` for this focused MoneyFlow branch/PR.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, merge, force-push, provider settings, production database/data, secrets.
- Human approval required before: merge or any provider/production action.
- Rollback or stop condition: stop/return to planning if the slice requires schema changes, production data, a new dependency/runtime, or changes to financial product semantics.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| pending | pending | pending |

### Research and adoption evidence

- Selected sources still support the planned pattern: pending final-diff review.
- Important source limitations remain respected: pending final-diff review.
- New tool/dependency/pattern passed the adoption review, or not applicable: no adoption planned.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- Authenticated HTTP double remains a browser/server-composition harness, not a PostgreSQL/RLS emulator.
- One canonical scenario is a regression contract, not exhaustive financial property-based testing.

## Delivery record

- Branch: `agent/financial-truth-harness-v1`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending acceptance