# Phase B — Fresh Product-Experience Research

**Status:** accepted/completed
**Execution state:** complete
**Completed role:** bounded research/evidence record
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** merged #366 at `main@60f91b7da46622abdf78908b4cf186b27ca9571c`
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. Phase B researches current,
first-party evidence about personal-finance and adjacent interaction patterns. It does
not choose an information architecture, visual direction, brand, UI implementation or
Phase C solution.

## Outcome

A later Phase C planner can use a bounded, source-led set of product-experience
principles that solve MoneyFlow’s real user problems while preserving its manual-first
ledger identity, financial invariants and Phase A/A0 constraints.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a Vietnamese manual-first ledger with explicit demo and authenticated
  modes, integer-VND facts, neutral internal transfers and recoverable destructive
  actions.
- Phase A’s completed audit is the current code-first route/runtime/presentation map;
  A0 is a retrospective guardrail, not a design direction.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| completed Phase A audit and current memory | executable product constraints and current capability truth | use as applicability filter; do not reopen the audit |
| A0 review and Design Harness V2 | evidence/ownership guardrails | derive later evidence requirements only; no Harness change |
| product/design authorities | preserve financial/product law and scoped current decisions | research input only; do not select a redesign |
| fresh first-party product sources | current interaction mechanisms and tradeoffs | cite and bound each finding; no layout/style copying |

### Existing tests and constraints

- Documentation-only Class 0 local gates and active-registry validation are required.
- No runtime/source/assets/UI/CSS/route/Design Harness/provider/production/database/Auth
  modification is in scope.
- Phase C is not started and has no packet.

## Research

### Research scope and source selection

- Decision question: which evidence-backed product-experience principles should Phase C
  evaluate for MoneyFlow’s core ledger jobs without importing another product’s identity?
- Reference map consulted: not required; this task is expressly fresh product research.
- Source budget: official product, help and release documentation across PFM and only
  relevant adjacent products; secondary material only for a named unavailable fact.
- Expected decision or uncertainty to resolve: reusable interaction mechanisms,
  tradeoffs and counterexamples—not final IA, design or implementation.

### Research decision

`docs/research/PHASE_B_FRESH_PRODUCT_EXPERIENCE_RESEARCH.md` now records fresh
first-party PFM and relevant-adjacent evidence. Every material finding separates source
fact from MoneyFlow interpretation, states a failure/tradeoff, and passes the
manual-first, integer-VND, transfer-neutrality, recovery, runtime-mode,
current-capability and A0 filters. It selects no Phase C answer.

### Adoption review

Not applicable. Phase B adds no dependency, provider, service, tool or architecture
pattern.

## Specification

### Problem

MoneyFlow has a functional MVP and an evidence-backed current-reality map, but Phase C
needs current, mechanism-level external research before it can frame product-experience
architecture. Generic competitor lists or copied aesthetics would not establish a safe
or relevant product principle.

### Acceptance criteria

- [x] One durable research artifact covers all twelve stated user-problem areas from
  current sources and separates fact from Phase B interpretation.
- [x] PFM findings include a useful spread of Copilot, Monarch, YNAB, Wallet/
  BudgetBakers, MISA Sổ Thu Chi and Money Lover where current first-party evidence is
  available.
- [x] Adjacent findings solve a named relevant interaction problem and do not copy a
  visual style or unrelated product identity.
- [x] Every material pattern records mechanism, tradeoff/failure mode, applicability,
  non-copy boundary, confidence and source.
- [x] MoneyFlow-specific principles preserve Phase A executable reality and A0
  guardrails without selecting Phase C IA, navigation, screens, brand or UI.
- [x] A fresh evaluator finds no stale/unsupported/source-monoculture claim, accidental
  design decision or Phase C start. Final evaluator evidence is recorded with delivery.
- [x] This PR stages post-merge lifecycle: Phase B accepted/completed, parent-only
  registry, Phase C immediate next/not started/no packet and PBT-AC15 open.

### Out of scope

- final IA/navigation/dashboard/screen design; brand/palette/type/creative direction;
  Design System v3; UI/CSS/component/route implementation; Design Harness V2 changes;
  Phase C packet; provider/production/database/Auth writes.

## Implementation plan

### Architecture fit

This is a research-only decision artifact. The Phase A audit remains the executable
reality owner; product principles and current design authorities remain scoped
constraints; the new research record does not become implementation authority.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| Phase B research artifact | source-led user-problem matrix and principles | give Phase C bounded evidence rather than copied product claims |
| active registry/current memory/Trust parent | explicit active and later staged-completed lifecycle | preserve a single discoverable execution truth |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation-only.
- Rollback: revert documentation; no runtime state changes.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| current-looking marketing is not interaction evidence | prefer official help/release/product documentation and record confidence limits |
| bank-sync/AI/household/wealth identity leaks into default product | apply explicit MoneyFlow filter and record rejection/counterexample |
| research turns into a design decision | use principles/questions, never final IA/screens/styles |
| generic advice obscures product mechanism | require reveal/defer/action/recovery/tradeoff detail for every material pattern |

### Verification plan

- Static: diff hygiene and active-registry guard.
- Research: source ledger, source diversity and fresh evaluator counterexample review.
- Unit/domain, database, browser, responsive/visual: not applicable by Class 0 policy.
- Production/manual: exact-head provider checks and owner merge only.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| B-T1 | reconcile baseline and deliberately activate Phase B | `main@efaba75` | active packet/registry/current memory/Trust | complete |
| B-T2 | collect current PFM and adjacent primary sources by user problem | B-T1 | source ledger | complete |
| B-T3 | synthesize mechanism/tradeoff/applicability principles | B-T2 | durable Phase B research artifact | complete |
| B-T4 | fresh evaluation, Class 0 gates and PR delivery | B-T3 | evaluator report, PR memory and merged #366 delivery | complete — #366 merged at `main@60f91b7da46622abdf78908b4cf186b27ca9571c` |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | human_owner | researcher | accepted/completed | #366 merged at `main@60f91b7da46622abdf78908b4cf186b27ca9571c`; Phase A/A0 constraints and the durable Phase B research artifact | Phase C is deliberately unopened until separately authorised | deliberately open Phase C only when authorised |

### Current permission boundary

- Granted scope: one documentation/research branch and current public web research.
- Forbidden writes: runtime/source/assets/UI/CSS/routes/Design Harness, providers,
  production, database, Auth and Phase C packet.
- Stop condition: a finding needs an implementation, design selection, provider action
  or product-scope exception; leave it as a Phase C question/counterexample.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| source-led research artifact | `PHASE_B_FRESH_PRODUCT_EXPERIENCE_RESEARCH.md` covers all twelve problem areas with a source ledger and counterexamples | PASS |
| lifecycle reconciliation | completed packet, parent-only registry, current memory and Trust parent on merged #366 | PASS |
| Class 0 local gates | `npm run check:migrations`, `npm run check:knowledge`, `npm run test:ci-policy` (8/8) and `node scripts/active-packet-registry.mjs` on 2026-08-13; fresh evaluator record | PASS |

### Remaining limitations

- Research evidence cannot prove MoneyFlow user demand or select a final design.
- #366 is historical merged delivery; subsequent work must use the current active
  registry rather than reopening Phase B.
