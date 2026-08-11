# Authenticated financial-truth harness v1

**Status:** ready for review
**Execution state:** ready_for_review
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** #345
**Last updated:** 2026-08-12

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is Class 3 because it changes a cross-cutting verification boundary for financial semantics. It does not authorize provider or production-data writes.

## Outcome

Extend MoneyFlow's existing strict authenticated Playwright harness with one deterministic financial-truth scenario that proves the real authenticated application composes server ledger rows into factual dashboard balances and period totals without counting an internal transfer as income or expense. Reuse the existing Supabase double and browser harness; do not create a new agent framework, CLI, runtime or dependency.

## Repository reconnaissance

### Current behavior

- `playwright.auth.config.ts` owns the production-build authenticated browser environment; the ordinary browser/audit suites remain intentionally demo-owned.
- `e2e/auth/supabase-double.mjs` is strict and fail-closed: unknown table/RPC/filter paths return `501` and are recorded as misses.
- `e2e/auth/harness.ts` seeds synthetic authenticated rows and signs in through the real login form.
- `src/lib/finance.ts` already has pure tests for safe-integer totals, transfer-neutral total assets, period income/expense, split exactness and balance reconciliation.
- `src/server/dashboard.ts` uses `get_dashboard_bundle` as the healthy authenticated read path, maps the bundle through schemas/domain mappers and only falls back to focused loaders when the bundle is unavailable or invalid.
- `/dashboard` passes the authenticated server workspace through `MoneyFlowDashboard`, which derives the rendered statement from the mapped ledger facts.
- Existing authenticated browser tests primarily proved ownership/source selection. This PR adds the missing mixed income/expense/transfer outcome contract on the rendered authenticated dashboard.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `playwright.auth.config.ts` | Owns authenticated browser environment | Reuse unchanged |
| `e2e/auth/supabase-double.mjs` | Strict authenticated server double | Reuse unchanged |
| `e2e/auth/harness.ts` | Synthetic seed/control helpers | Extend narrowly |
| `e2e/auth/*.auth.spec.ts` | Authenticated outcome verification | Add one bounded spec |
| `src/lib/finance.ts` + tests | Pure financial truth | Reuse as conceptual contract; do not duplicate implementation |
| `src/server/dashboard.ts` + `src/server/finance.ts` | Authenticated bundle/read mapping | Exercise through the real route |
| `src/components/dashboard/*` | Rendered financial statement | Observe only; no UI change |
| database migrations/pgTAP | Own PostgreSQL/RLS truth | Do not infer from this harness |

### Existing tests and constraints

- `src/lib/finance.test.ts` already proves transfer neutrality, authenticated dashboard arithmetic, snapshot reconciliation and split totals.
- Existing pgTAP owns SQL/RLS/RPC truth; no database change is planned here.
- `e2e/auth/inbox-ownership.mobile.auth.spec.ts` proves authenticated source ownership and the harness authenticity boundary.
- Product/architecture rules require integer money, transfer neutrality, no authenticated fallback to demo, no invented financial facts and layer-specific evidence.

### Similar implementation and recent history

- Reuse the authenticated harness introduced by #336 rather than creating another environment.
- Reuse the false-green discipline from #337: important invariants should fail mechanically instead of relying on prose.
- #343 was current main at branch creation; P2 Recover remains separate and is not part of this slice.

### Resolved questions

- [x] Build a new `mf` harness CLI? **No.** It would duplicate the current harness/CI/operating model and create a second management layer.
- [x] Make the browser double prove RLS/PostgreSQL invariants? **No.** Those belong to pgTAP/local Supabase.
- [x] Missing proof worth adding? **Runtime composition parity:** deterministic server rows must produce the expected dashboard financial facts through the real authenticated bundled route and React render.

## Research

### Research scope

Decision question: How should MoneyFlow make coding-agent verification more reliable while preserving personal-finance ledger truth and avoiding a second orchestration platform?

Reference maps consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` and `docs/research/REPOSITORY_REFERENCE_MAP.md`.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [OpenAI — Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) | Primary engineering experience | 2026-08-12 | Agent reliability compounds through deterministic environments, legible runtime state, repository-backed knowledge and mechanical feedback loops. | Their worktree/observability scale exceeds MoneyFlow; pattern reference only. |
| [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Primary evaluation guidance | 2026-08-12 | Agent evals need explicit task/environment/grading boundaries; outcome/state checks are stronger than trusting agent claims; isolated stable state matters. | MoneyFlow is verifying product behavior, not benchmarking models; objective ledger facts need no LLM grader. |
| [Actual Budget — Transfers](https://actualbudget.org/docs/transactions/transfers/) | Official personal-finance product documentation | 2026-08-12 | Linked internal transfers must not distort reports; equal/opposite sides represent movement between owned accounts rather than ordinary spending/income. | Actual's on/off-budget model is not adopted. |
| [GnuCash — Reconciling an Account to a Statement](https://wiki.gnucash.org/docs/C/gnucash-manual/acct-reconcile.html) | Official bookkeeping documentation | 2026-08-12 | Reconciliation compares ledger entries against an external statement and completes when reconciled and statement balances match with zero difference. | This PR does not change reconciliation behavior. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| New `mf boot/inspect/prove/evidence` CLI | One visible entrypoint | Duplicates existing CI/harness/policy and creates a new owner before proven need | Reject |
| Full local Supabase for every authenticated browser test | More realistic DB behavior | Runtime cost and infrastructure noise; overlaps pgTAP; conflates browser composition with DB truth | Reject for this slice |
| Permissive HTTP mocks | Cheap | Missing queries can silently become empty-data false greens | Reject |
| Extend existing strict authenticated harness with one named scenario | Small, owner-aligned, exercises real route/components, preserves evidence boundary | Does not prove PostgreSQL/RLS/provider behavior | Select |

### Research decision

Observed: MoneyFlow already has the main harness ingredients supported by current agent-engineering guidance: explicit runtime mode, strict deterministic server double, browser-driving tests, layered verification and repository-backed context. The missing evidence is a financial outcome scenario, not another agent runtime.

Product judgment: v1 encodes one canonical authenticated ledger with two VND accounts, one income, one expense and one internal transfer. Expected balance/income/expense/net are independent fixture literals rather than values calculated by the production summarizer. The transfer must be visibly present while remaining absent from income/expense/net totals.

No dependency, provider, framework or new architecture layer is adopted.

## Specification

### Problem

Pure finance tests can remain green while a change to the authenticated read/composition/render path misstates money. The repository therefore needs one browser-level financial-truth contract over mixed transaction kinds.

### Acceptance criteria

- [x] Existing authenticated harness defaults remain backward-compatible by using optional seed overrides with the old constants as defaults.
- [x] A named synthetic scenario contains two VND accounts, one income, one expense and one internal transfer.
- [x] Fixture balance snapshot totals exactly `2,700,000` VND.
- [x] Browser contract expects `2,000,000` VND income, `300,000` VND expense and `1,700,000` VND net.
- [x] Internal transfer is required to be visibly rendered with transfer semantics and excluded from period totals.
- [x] Test proves authenticated mode, requires the healthy `get_dashboard_bundle` path and fails on any unimplemented Supabase-double request.
- [x] Expected totals are independent fixture constants; the test imports neither the production dashboard summarizer nor production money formatter.
- [x] No new dependency, runtime, CLI, schema, migration, provider write or production-data operation was introduced.
- [x] Selected CI and authenticated browser execution passed on PR head `d1579613d6b020ea61d90a47a7656d18b1dcda9b` through merge ref `d2b2707043332b8007b0c5fd32739e0618fad5b0` in CI run `31518814384`.

### Required states and boundaries

- Populated state: canonical financial-truth fixture.
- Error boundary: strict double miss ledger remains fail-closed.
- Large-value boundary: safe-integer extremes remain unit-test owned.
- Device: existing authenticated-phone project exercises the user-visible dashboard surface; no responsive styling changes are made.
- Accessibility: assertions use semantic `MoneyValue` labels/data attributes, not geometry.
- Database/RLS/provider/production correctness is explicitly out of scope for this browser harness.

## Implementation plan

### Changed files

| File/area | Change | Reason |
|---|---|---|
| `e2e/auth/harness.ts` | Optional account/category/balance seed overrides plus canonical financial-truth constants/helper | Extend the existing owner without changing prior defaults |
| `e2e/auth/financial-truth.mobile.auth.spec.ts` | Dashboard outcome assertions, visible transfer, healthy bundle path and zero misses | Fill the runtime-composition proof |
| `docs/research/pr-memory/2026/Q3/PR-345.md` | Candidate provenance/evidence boundary | Required repository memory |
| this packet | Research/spec/plan/evaluation record | Required Class 3 artifact |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Production data/provider: none.
- Rollback: revert this test/helper/documentation slice; no persisted state needs unwinding.

### Counterexamples covered

| Counterexample | Prevention/proof |
|---|---|
| Expected values accidentally reuse production arithmetic | Independent literal expected values |
| Transfer is rendered but counted as income/expense/net | Assert all three period outcomes and visible transfer semantics |
| Test passes in demo mode | `assertAuthenticatedMode` plus served `/auth/v1/user` requirement |
| Test silently exercises dashboard fallback | Require served `/rest/v1/rpc/get_dashboard_bundle` |
| HTTP double omits a new query | Strict `501` + zero-miss assertion |
| Browser evidence is overclaimed as DB evidence | Explicit packet/spec/test boundary |

## Verification plan

- Policy: `git diff --check`, `npm run check:knowledge`, `npm run test:ci-policy`.
- Static: deployment-env, CSS ownership, architecture, lint, typecheck.
- Unit: existing repo unit suite.
- Build: production build + code→CSS ownership gate.
- Browser: ordinary e2e plus `npm run test:e2e:auth` selected by the classifier.
- Database: classifier selected `database=false`; the successful database job means checks-not-required, not pgTAP execution.
- UI audit: classifier selected `uiAudit=false`; no presentation code changed.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Extend authenticated seed helper without changing defaults | focused diff | done |
| T2 | Add canonical financial-truth authenticated browser spec | focused diff | done |
| T3 | Open PR #345 and add PR memory record | PR + memory file | done |
| T4 | Evaluate exact diff and CI evidence | CI run 31518814384 + browser logs | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | researcher | planner | specified | repo reconnaissance + four focused sources | browser proof not yet implemented | bounded plan |
| 2026-08-12 | planner | implementer | implementing | branch `agent/financial-truth-harness-v1` | CI not yet run | T1–T3 |
| 2026-08-12 | implementer | evaluator | evaluating | PR #345; first ready-for-review run | initial packet failed `git diff --check` on Markdown trailing whitespace | fix hygiene, do not bypass |
| 2026-08-12 | evaluator | implementer | evaluating | second run passed diff hygiene but `check:knowledge` required exact `## Implementation plan` heading | bounded docs contract defect | restore required heading |
| 2026-08-12 | evaluator | human owner | ready_for_review | head `d1579613d6b020ea61d90a47a7656d18b1dcda9b`; merge ref `d2b2707043332b8007b0c5fd32739e0618fad5b0`; CI 31518814384; 938 unit, 102 normal browser, 19 authenticated browser all pass | browser double is not DB/RLS/provider evidence; final evidence-doc commit must rerun CI | review PR; merge only by owner after final head stays green |

### Current permission boundary

- Granted scope: `branch_write` on this focused branch/PR.
- Forbidden writes: `main`, merge, force-push, provider settings, production database/data, secrets.
- Human approval required before merge or any provider/production action.
- Stop condition: return to planning if the slice requires schema changes, production data, new dependency/runtime or new financial semantics.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Financial scenario exercises authenticated healthy bundle path | authenticated test requires `/auth/v1/user`, `/rest/v1/rpc/get_dashboard_bundle` and zero misses | PASS |
| Balance/income/expense/net facts survive server-to-render composition | `financial-truth.mobile.auth.spec.ts` passed as authenticated-phone test #6 | PASS |
| Internal transfer remains visible and transfer-neutral | same test asserts visible `HARNESS-TRANSFER`, transfer semantic label and independent period totals | PASS |
| Existing automated contract remains intact | CI run 31518814384: policy, static, production build, code→CSS ownership and verify all successful | PASS |
| Unit regression suite | CI log: 938 tests, 938 pass, 0 fail | PASS |
| Ordinary browser suite | CI log: 102 passed, no retries/flakes reported | PASS |
| Authenticated browser suite | CI log: 19 passed, including the new financial-truth test | PASS |
| Security scans | CodeQL run 31518814382 and Secret history scan 31518814455 | PASS |
| Database/RLS | classifier selected database=false; pgTAP did not run | NOT REQUIRED / NOT CLAIMED |
| Cross-device UI audit | classifier selected uiAudit=false; audit did not run | NOT REQUIRED / NOT CLAIMED |

### Review findings

- Correctness: expected money outcomes are independent literals; the test exercises the healthy bundled dashboard path and fails closed on unknown double requests.
- Security/ownership: synthetic data only; authenticated session is created through the real login boundary; no DB/provider claims are inferred.
- UI/UX/accessibility: no UI change; assertions observe semantic money labels and transfer tone rather than layout geometry.
- Maintainability/duplication: existing harness owner is extended; no new framework, CLI, dependency or runtime was introduced.
- Scope compliance: no production/domain/recovery code, migration or provider state was changed.

### Remaining limitations

- Authenticated HTTP double is a browser/server-composition harness, not a PostgreSQL/RLS emulator.
- One canonical scenario is a regression contract, not exhaustive financial property-based testing.
- Evidence recorded above belongs to head `d157961...`; this documentation update itself must pass the final PR checks before owner merge.

## Delivery record

- Branch: `agent/financial-truth-harness-v1`
- PR: #345
- Evaluated implementation head: `d1579613d6b020ea61d90a47a7656d18b1dcda9b`
- Evaluated merge ref: `d2b2707043332b8007b0c5fd32739e0618fad5b0`
- CI: run `31518814384` successful; CodeQL and secret-history scans successful
- Current state: `ready_for_review`; do not merge automatically
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet move to completed: only after owner acceptance/merge according to the repository state machine
