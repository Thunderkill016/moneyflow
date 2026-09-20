# Financial well-being product strategy

**Status:** completed
**Execution state:** completed
**Active role:** human_owner
**Permission scope:** branch_write
**Owner:** human owner; ChatGPT drafting/evaluation
**Issue/PR:** PR #594
**Last updated:** 2026-09-13

## Outcome

Create a durable, discoverable MoneyFlow product-strategy layer that reframes the long-term user outcome as **Financial Reality → Financial Resilience → Financial Progress → Financial Choice** while preserving the existing trustworthy-ledger, acquisition, financial-honesty and owner-authorization laws. Separate ecosystem architecture and measurement/stage-gate detail so future missions can be derived from strategy without turning the strategy itself into implementation permission.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a Vietnamese personal-finance product built on a trustworthy user-owned ledger.
- Current shipped capability remains manual/import-assisted and provider-independent.
- `PRINCIPLES.md` owns product law.
- `MONEYFLOW_PRODUCT_VISION.md` owns the existing long-term platform vision, including Core, Acquire, Understand, Plan, Automate, Connect, Wealth, Together and Intelligence.
- Current `main` baseline for this task is `20c4ae8825d97d379b0c59684138ea20a0c54c2b` (merged PR #593).
- This task changes strategy documentation only; it does not change runtime behavior, released scope or product implementation state.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/product/PRINCIPLES.md` | highest product law | reuse; do not weaken or silently override |
| `docs/product/MONEYFLOW_PRODUCT_VISION.md` | existing long-term product shape | reuse and complement; do not create competing implementation sequence |
| `docs/product/REORIENTATION_2026-08.md` | historical warning about capability/process sprawl | reuse feature-elimination lesson |
| `README.md` | authority router | update only for discoverability |
| `docs/context/README.md` | warm-context router | update only for strategy routing |
| `Thunderkill016/moneyflow-research` PR #6 | supporting financial-well-being/ecosystem research | evidence only; no execution authority |

### Existing tests and constraints

- Related unit tests: not applicable; docs-only Class 0.
- Database/RLS tests: not applicable; no financial/data contract changes.
- Browser tests: not applicable; no runtime/UI changes.
- Product/architecture rules: `AGENTS.md`, `PRINCIPLES.md`, `RISK_PROPORTIONAL_DELIVERY.md`; owner review is mandatory for product-direction changes.

### Similar implementation and recent history

- Existing pattern to reuse: binding product-law/vision docs separated from implementation truth and work authorization.
- Relevant decision: current product vision already rejects feature popularity as evidence and preserves provider-independent one-ledger architecture.

### Open questions

- [x] How can financial well-being framing improve the North Star without replacing the trustworthy-ledger foundation? Answer: ledger becomes the Reality foundation; the long-term outcome expands to Resilience, Progress and Choice.
- [x] Should ecosystem tracks have a fixed release order? Answer: no; preserve lower-layer dependencies and explicit specs, but select optional expansion tracks by evidence rather than category convention.
- [x] How should strategy avoid becoming implementation permission? Answer: explicit authority boundary in every new document and existing owner/spec gates remain unchanged.

## Research

### Research scope and source selection

- Decision question: Which established financial-well-being/planning frameworks are useful for defining MoneyFlow's long-term outcome, stage gates and feature-elimination logic?
- Reference map consulted: external `moneyflow-research` evidence base plus current MoneyFlow product authority.
- Source budget: three focused external sources plus the existing MoneyFlow research synthesis.
- Expected decision: distinguish financial truth/maintenance from resilience, progress and choice without turning MoneyFlow into an autonomous adviser or generic financial super-app.

### Questions researched

1. What constitutes financial well-being beyond income/net worth?
2. What sequence separates understanding circumstances, goals, alternatives and actions?
3. Which financial dimensions argue against treating wealth/investment as the immediate next maturity step?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| CFPB, `Why financial well-being?` | US public consumer-finance research | 2026-09-13 | control of current finances, shock absorption, goal progress and freedom of choice are distinct well-being outcomes; income/net worth alone are insufficient | not Vietnam-specific product demand or advice |
| CFP Board, financial-planning Practice Standards FAQ | professional standards/process | 2026-09-13 | separate circumstances, goals, alternatives, recommendations/actions and monitoring | MoneyFlow is not a CFP professional and must not imply regulated advice |
| Financial Health Network, `What is Financial Health?` | practitioner/research framework | 2026-09-13 | spend, save, borrow and plan/protect support a broader resilience model than wealth alone | proprietary score/framework is not adopted as a MoneyFlow score |
| `moneyflow-research` PR #6 | project-specific synthesis | 2026-09-13 | applies the above to MoneyFlow and records Vietnam/provider/privacy/product comparisons | open research PR is evidence, not product authority |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep only `Trusted periods with decreasing maintenance` as the entire product strategy | simple and operationally measurable | under-specifies why the trusted data matters after maintenance is solved | retain as operational north-star system, not sole long-term outcome |
| Expand linearly into Acquire → Plan → Wealth → Household → AI | easy roadmap narrative | category-led, encourages feature ladder and premature wealth/AI work | reject as strategic model |
| Reality → Resilience → Progress → Choice with evidence-gated ecosystem tracks | ties trusted data to human outcomes while preserving dependency honesty | needs careful authority wording to avoid scope creep | adopt |

### Research decision

Adopt the four-outcome strategic model while preserving the existing ledger/acquisition laws. Treat Reality as the financial source-of-truth foundation, Resilience as the protection/near-term stability layer, Progress as explicit goal-linked planning and Choice as alternatives/trade-offs. Keep automation, providers, mobile, wealth, household and AI as capability tracks subject to lower-layer readiness and separate authorization.

### Adoption review

Not applicable. No dependency, provider, service, tool or runtime architecture is added.

## Specification

### Problem

MoneyFlow has strong product laws and a long-term platform vision, but the strategy layer is still mostly expressed as capability/dependency order. That makes it easier for future work to confuse “what the system could contain” with “what human financial outcome it should improve,” and it leaves feature elimination/stage-gate criteria distributed across multiple documents.

### User stories

- As the product owner, I can evaluate a proposed mission against a stable strategic outcome before authorizing implementation.
- As a future agent/contributor, I can distinguish product law, strategic direction, ecosystem structure, metrics and implementation permission.
- As a product decision-maker, I can reject attractive but premature features using explicit dependency and evidence tests.

### Acceptance criteria

- [x] `PRODUCT_STRATEGY.md` defines North Star, target user, moat, stage gates and feature-elimination rules around Reality → Resilience → Progress → Choice.
- [x] `ECOSYSTEM_STRATEGY.md` defines how Personal/Core, Acquire, Resilience, Plan, Wealth, Together, Automation, Intelligence, Connect and Mobile share one financial truth model.
- [x] `PRODUCT_METRICS.md` defines trust, maintenance, resilience, progress, agency, automation/provider economics and stage-gate evidence without creating hidden release criteria.
- [x] Root/context authority routing makes the new layer discoverable without replacing `PRINCIPLES.md`.
- [x] No new strategy document authorizes provider, wealth, household, AI, schema or production implementation by itself.
- [x] External framework applicability and limits are explicit.

### Required states

Not applicable to runtime/UI. Documentation states are candidate while PR is open and strategic authority only after owner-reviewed merge.

### Financial and security constraints

- No financial recommendation or user-specific prescriptive ratio is introduced.
- Existing integer VND, transfer, RLS, source-provenance and financial-honesty laws remain unchanged.
- No provider/production data is read or written for this task.

### Out of scope

- runtime code/UI changes;
- changing released MVP scope;
- choosing a bank/provider;
- implementing wealth, household, AI or native mobile;
- changing financial calculations;
- changing CI/security policy;
- merging the PR.

## Implementation plan

### Architecture fit

This is a product-strategy documentation layer under `docs/product/`. `PRINCIPLES.md` remains product law. Strategy explains how to prioritize within that law; ecosystem strategy explains modular expansion; metrics defines evidence. GitHub issues/PRs and work packets continue to own executable scope.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/product/PRODUCT_STRATEGY.md` | add strategic thesis and elimination rules | durable direction |
| `docs/product/ECOSYSTEM_STRATEGY.md` | add ecosystem contract/map | avoid super-app/module drift |
| `docs/product/PRODUCT_METRICS.md` | add measurement/stage-gate system | prevent vanity metrics and premature promotion |
| `README.md` | route strategy docs | discoverability |
| `docs/context/README.md` | route product-strategy context | warm-context correctness |
| `docs/research/pr-memory/2026/Q3/PR-594.md` | bounded provenance | knowledge contract |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation only.
- Rollback: remove new strategy docs and routing links; existing product law/runtime remain unchanged.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| strategy conflicts with `PRINCIPLES.md` | explicitly subordinate strategy; preserve current product laws |
| strategy becomes roadmap permission | repeat horizon-not-permission boundary and keep separate owner/spec gates |
| “financial well-being” becomes a proprietary score | explicitly reject opaque score as default |
| wealth/AI scope creep | stage gates + feature-elimination rules + ecosystem dependency tests |
| docs create another current-state database | contain only durable direction; no current task queue/status beyond this packet |

### Verification plan

- Static: repository diff hygiene gate.
- Unit/domain: not applicable.
- Database: not applicable by Class 0 classification.
- Browser flow: not applicable by Class 0 classification.
- Responsive/visual: not applicable.
- Repository: project knowledge contract, CI classification/retry contract and required exact-head CodeQL/secret scan.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Draft product strategy | current product law + research | `PRODUCT_STRATEGY.md` | done |
| T2 | Define ecosystem boundaries | T1 | `ECOSYSTEM_STRATEGY.md` | done |
| T3 | Define metrics/stage gates | T1 | `PRODUCT_METRICS.md` | done |
| T4 | Add discoverability routing | T1–T3 | README/context diff | done |
| T5 | Open draft PR and add PR memory | T4 | PR #594 + PR-594 memory | done |
| T6 | Check Class 0 exact-head strategy-content CI | T5 | CI #3727, CodeQL #2728, Secret history scan #2728 on `e5d4beb17bb11b00867b391ead5ed9df8691ac78` | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-13 | researcher | planner | specified | current product docs + 3 external frameworks + research PR #6 | market demand and willingness-to-pay remain unproven | draft strategy |
| 2026-09-13 | planner | implementer | implementing | three-doc architecture and acceptance criteria | none requiring runtime work | write docs/routing |
| 2026-09-13 | implementer | evaluator | evaluating | strategy/ecosystem/metrics docs, authority routing, PR #594 and PR memory | exact-head verification | evaluate contracts and scope |
| 2026-09-13 | evaluator | human_owner | ready_for_review | strategy-content head `e5d4beb17bb11b00867b391ead5ed9df8691ac78`: CI #3727 success, CodeQL #2728 success, Secret history scan #2728 success; docs consistency review | final handoff bookkeeping commit must also retain green exact-head checks before merge; numeric stage thresholds remain intentionally uncommitted | owner reviews PR #594; do not merge automatically |

### Current permission boundary

- Granted scope: branch-write product strategy documentation and review artifacts requested by owner.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, provider state, production data, schema/runtime behavior, branch protection/CI policy.
- Human approval required before: merge and any implementation derived from the strategy.
- Rollback/stop condition: if strategy requires weakening existing product law or silently authorizing a high-risk horizon, stop and return to owner review.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| four-outcome North Star | `PRODUCT_STRATEGY.md` | pass |
| target user + moat | `PRODUCT_STRATEGY.md` | pass |
| stage gates + feature elimination | `PRODUCT_STRATEGY.md` and `PRODUCT_METRICS.md` | pass |
| one ecosystem financial truth | `ECOSYSTEM_STRATEGY.md` | pass |
| no runtime/provider permission | all three document boundaries | pass |
| authority routing and PR provenance | README/context + PR-594 memory | pass |
| Class 0 policy contracts | CI #3727 on `e5d4beb17bb11b00867b391ead5ed9df8691ac78` | pass |
| Code/security repository checks | CodeQL #2728 + Secret history scan #2728 on the same head | pass |

### Research and adoption evidence

- CFPB, CFP Board and Financial Health Network sources were re-opened during final evaluation and still support the framing used in the strategy.
- Source limits remain explicit: they do not prove Vietnam product-market fit, specific user advice or regulated-advice authority.
- New tool/dependency/pattern: not applicable.

### Review findings

- Correctness: strategy preserves current ledger/source/product laws and distinguishes strategic outcomes from shipped capability.
- Authority consistency: `PRINCIPLES.md` remains product law, `MONEYFLOW_PRODUCT_VISION.md` remains compatible long-horizon product shape, and the new docs do not select an executable mission.
- Security/ownership: no ownership/runtime change; privacy cost is explicitly treated as product cost.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: strategy, ecosystem boundaries and metrics have separated responsibilities rather than creating one mixed current-state document.
- Scope compliance: exactly seven documentation files changed relative to the stated base; no runtime, migration, provider or CI-policy file changed.

### Remaining limitations

- Stage thresholds remain intentionally qualitative until MoneyFlow has enough real product telemetry/user evidence to define defensible numeric thresholds.
- Research PR #6 is supporting evidence only until separately reviewed/merged in the research repository.
- This handoff-state commit is documentation-only bookkeeping; its own exact-head repository checks must remain green before owner merge.

## Delivery record

- Branch: `docs/financial-wellbeing-product-strategy`
- PR: #594 — merged 2026-09-13
- Squash commit: `a7e45d30`
- CI run: strategy-content head `e5d4beb17bb11b00867b391ead5ed9df8691ac78` — CI #3727 (`34760424856`) success; CodeQL #2728 (`34760424822`) success; Secret history scan #2728 (`34760424859`) success
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: this closeout
