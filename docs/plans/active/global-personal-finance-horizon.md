# Global personal-finance capability horizon

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #258 / #259
**Last updated:** 2026-08-03

## Outcome

Define the owner-approved long-term product horizon for MoneyFlow: learn from the strongest personal-finance capabilities worldwide, select the parts that solve real user problems, and deliver them as coherent modules without weakening the trusted daily ledger or overwhelming new users.

## Repository reconnaissance

### Current behavior

- MoneyFlow is released as a functional MVP and remains a Vietnamese manual-first ledger.
- All 16 locked MVP capabilities have merged implementation baselines.
- Competitive depth remains partial in ledger review, reconciliation, planning history, reports, automation, wealth and collaboration.
- PR #255 and PR #257 are open candidate slices; neither is current product truth.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/product/PRINCIPLES.md` | binding product law | extend with long-term horizon, preserve daily-loop priorities |
| `docs/MVP_DEFINITION.md` | released MVP baseline | preserve as historical release definition, not final product ceiling |
| `docs/research/PRODUCT_COMPETITIVE_MEMORY.md` | prior competitor synthesis | reuse evidence and anti-copy discipline |
| `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md` | current-main gap view | keep as implementation-state evidence, not global product horizon |
| `ARCHITECTURE.md` | current modular-monolith boundaries | preserve current fit; define future seams without premature services |

### Existing tests and constraints

- Documentation-only change: diff hygiene, project knowledge and CI classification apply.
- CodeQL remains a repository-required exact-head workflow.
- No runtime, database, provider or production-data behavior changes.
- Owner review is mandatory because product direction changes.

## Research

### Research scope and source selection

- Decision question: which durable capabilities from leading personal-finance products belong in MoneyFlow's horizon, and what adoption boundaries prevent a feature pile?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` and existing competitive memory.
- Source budget exception: eight product families were reviewed because the decision spans ledger, planning, forecasting, automation, extensibility and collaboration.
- Only official product documentation and product-owned help centers are treated as current product evidence.

### Sources

| Source family | What it establishes | Limits/applicability |
|---|---|---|
| Actual Budget | reconciliation, schedules, ordered rules, user-owned data and customizable reports | concepts only; do not copy AGPL code or inherit local-first architecture automatically |
| YNAB | target-driven planning, zero-based method, debt/loan planning and household sharing | MoneyFlow must not force one budgeting philosophy on every user |
| Monarch | flex/category budgeting, goals, review and household collaboration | aggregation/provider breadth is not an immediate Vietnamese-market commitment |
| PocketSmith | calendar forecasting, scenarios, long-range account projections and multi-currency | forecasts must expose assumptions and confidence, never imply certainty |
| Lunch Money | tags, recurring, multi-currency, public API and extensibility | breadth must remain progressively disclosed |
| Copilot Money | review-first transactions, recurring/subscription attention and explainable alerts | AI assistance must remain optional and reversible |
| Tiller | user-controlled data, templates and customizable analysis | spreadsheet flexibility is a lesson, not the target interface |
| Firefly III | deterministic rules, bills, piggy-bank/goal links and accounting-rich workflows | avoid ERP complexity and respect AGPL code boundaries |

### Research decision

Adopt a capability-horizon model rather than copying a single competitor or treating every capability as an immediate commitment. MoneyFlow will keep one simple Core and add Plan, Understand, Automate, Wealth and Together modules behind progressive disclosure. Every individual feature still requires a researched specification, accepted financial semantics, migration/rollback design and owner approval.

### Adoption review

Not applicable. No dependency, provider, runtime or external service is added.

## Specification

### Problem

The released MVP definition became an accidental product ceiling. It can prove the MVP is complete, but it cannot describe the comprehensive personal-finance platform the owner wants to build.

### Acceptance criteria

- [x] A capability atlas covers the global feature horizon and records source-backed lessons.
- [x] A binding MoneyFlow vision selects a coherent product shape rather than an undifferentiated feature list.
- [x] A target architecture roadmap orders domain changes and preserves current financial laws.
- [x] The MVP definition remains a released baseline, not the final product definition.
- [x] High-risk future modules remain unauthorized until separately specified.
- [ ] Owner reviews and accepts the direction in the pull request.

### Financial and security constraints

- Integer-money, transfer-neutrality, RLS, recoverability and no-guessed-finance laws remain binding.
- Forecasts distinguish facts, user assumptions and derived projections.
- Automation is previewable, reversible and confidence-bounded.
- Household, providers, investments and currencies require dedicated ownership and migration models.

### Out of scope

- Implementing any runtime feature.
- Changing the database or deployment.
- Selecting a bank-data provider.
- Declaring market demand, pricing or public-beta readiness.

## Implementation plan

| File/area | Change | Reason |
|---|---|---|
| `docs/research/GLOBAL_PERSONAL_FINANCE_CAPABILITY_ATLAS.md` | create evidence-backed horizon | maintain the complete reference set |
| `docs/product/MONEYFLOW_PRODUCT_VISION.md` | create binding product vision | turn feature breadth into a coherent product system |
| `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md` | create staged domain roadmap | prevent schema and UI accretion |
| `docs/product/PRINCIPLES.md` | add long-term horizon law | align binding product truth |
| `README.md` | route future work to the new authorities | make the direction discoverable |

### Risks and counterexamples

| Risk | Prevention |
|---|---|
| "Horizon" is read as permission to code everything | explicit per-module specification and owner gates |
| feature breadth damages daily capture | progressive disclosure and Core-first navigation |
| future architecture is treated as an immediate rewrite | extraction criteria and staged seams, not target microservices |
| forecasts become advice or invented certainty | provenance, assumptions and confidence are first-class |
| commercial features are copied blindly | capability adoption rules and source limitations |

### Verification plan

- Static: documentation diff hygiene, knowledge contract and CI classification.
- Unit/database/browser/production: not applicable; no executable behavior changes.
- Human: owner review of product direction and scope boundaries.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Research official product sources | source table and research notes | done |
| T2 | Define capability atlas | atlas document | done |
| T3 | Define MoneyFlow product vision | vision document | done |
| T4 | Define target architecture roadmap | architecture roadmap | done |
| T5 | Align binding principles and README | focused documentation diff | done |
| T6 | Open PR, add PR memory and verify exact head | PR #259 + CI | doing |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | human_owner | researcher | discovery | explicit owner request to pursue the best global capabilities | scope could become unbounded | research and define adoption boundaries |
| 2026-08-03 | researcher | implementer | implementing | official-source synthesis and selected modular model | owner acceptance pending | write branch documents and open PR |
| 2026-08-03 | implementer | evaluator | evaluating | PR #259, atlas, vision, architecture roadmap, principles and README | exact-head CI and owner review pending | evaluate actual diff and verification |

### Current permission boundary

- Granted scope: documentation and product-direction writes on `docs/global-personal-finance-horizon`.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, runtime, database, providers and production data.
- Human approval required before: merge or implementation of any newly listed high-risk capability.
- Rollback: close the PR; no product/runtime state changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Capability horizon is comprehensive but not an automatic backlog | atlas adoption rules and explicit non-decisions | pass |
| Product shape preserves a simple default Core | progressive product layers in vision | pass |
| Architecture avoids premature rewrite | modular-monolith retention and extraction criteria | pass |
| Financial distinctions remain honest | fact/expectation/assumption/projection model | pass |
| Current behavior is not overstated | all new documents distinguish horizon from merged truth | pass |
| Exact-head repository verification | CI pending | pending |
| Owner acceptance | PR review pending | pending |

### Remaining limitations

- The documents do not select feature dates, providers, pricing or market order.
- The horizon is broader than current validated user demand; bounded delivery still depends on self-use and user evidence.
- PR #255 and PR #257 remain independent candidate work and are not accepted by this documentation PR.

## Delivery record

- Branch: `docs/global-personal-finance-horizon`
- PR: #259
- Squash commit: not merged
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: no