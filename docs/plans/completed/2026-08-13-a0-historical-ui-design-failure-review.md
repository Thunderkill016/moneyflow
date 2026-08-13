# A0 — Historical UI / Design Failure Review

**Status:** accepted/completed
**Execution state:** complete
**Active role:** historical completed record — merged #364
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** PR [#364](https://github.com/Thunderkill016/moneyflow/pull/364)
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This completed record preserves
A0, a bounded retrospective that:
it turns repository-backed UI/design failure mechanisms into auditable guardrails for
later Brand/Product Experience work. It does not authorize a redesign, CSS/token or
component change, Design Harness V2.1 work, provider/production/database/Auth write,
or a Phase A packet.

## Outcome

A future agent can read one compact review and avoid repeating the mechanisms behind
presentation drift, false-green evidence, cascade regressions and mobile geometry
failures, while preserving useful inputs for later replace-and-retire slices.

## Repository reconnaissance

### Baseline reviewed

- Source `main@c248176` was the A0 review baseline; merged #364 recorded the accepted
  A0 lifecycle at `main@157ba76795c4ddc1add726e6fb6d4dd82c881c04`.
- The current product retains a controlled presentation compatibility boundary and
  Design Harness V2; neither is changed by this review.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| UI research ledger and open-work disposition | observed historical symptoms and decisions | inspect as evidence, never promote as current authority |
| completed UI/presentation packets and named PR memory | mechanisms and provenance | inspect only where a finding needs proof |
| CSS ownership architecture and presentation guards | present executable boundaries | derive requirements only; do not modify |
| P3 physical-phone packet and PP-03/07/12/16 evidence | real device/flow limitations | distinguish owner-observed results from generic UI claims |
| Design Harness V2 | future operationalization candidate | inspect only; no V2.1 implementation |

### Existing tests and constraints

- Documentation-only doctor gates, knowledge/CI-policy tests and active-packet registry
  validation are required.
- No runtime, source, assets, CSS, tests, Design Harness, provider, production,
  database or Auth modification is in scope.

### Similar implementation and recent history

- Reset 1 provides the active-packet/current-memory lifecycle; Reset 2 preserves
  historical UI evidence while retiring only unowned leaves.

## Research

Not required externally. This retrospective relies on repository-primary historical
evidence; no competitor, dependency or product research is authorized.

### Adoption review

Not applicable. A0 adds no dependency, provider, tool or architecture pattern.

## Specification

### Problem

Previous UI/brand/design-system efforts produced expensive rework when design intent,
runtime ownership and acceptance evidence drifted apart. Later Brand/Product Experience
work needs causal guardrails, not a list of historical symptoms.

### Acceptance criteria

- [x] One durable review traces every material finding from observed symptom through
  mechanism, evidence, missed verification, lesson and mandatory future guard.
- [x] The review distinguishes reusable inputs, historical evidence only, live legacy,
  candidate authority and later retire/replace items.
- [x] Any Design Harness V2.1 need is a requirement only, never implemented.
- [x] A fresh evaluator finds conclusions evidence-backed, no old design document
  promoted to authority, and no A0 implementation started.
- [x] The post-merge registry/current memory/Trust parent make A0 accepted/completed,
  Phase A immediate next/not started/no packet, and Brand/Product Experience
  implementation unstarted.

### Out of scope

- UI/CSS/token/component/route/brand implementation; Design System v3; Design Harness
  V2.1; source cleanup; provider/production/database/Auth actions; competitor research.

## Implementation plan

### Architecture fit

The existing research ledger, completed packets, current CSS ownership guards and P3
evidence remain their own authorities. The A0 review only links their causal lessons;
it creates no parallel design or delivery system.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| durable A0 review | synthesize evidence-backed failure matrix and future guardrail requirements | preserve causal learning for later packets |
| A0 packet/current-memory/Trust parent | record accepted retrospective state and Phase A next-state | durable, singular execution truth |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or audit |
|---|---|
| historical symptom is claimed as root cause | require mechanism and cited primary evidence for each matrix row |
| historical doc becomes current design authority | label all inputs by reuse/authority status |
| guardrail becomes an unapproved implementation plan | write requirements and evidence shapes only |
| false-green claims are repeated | separate demo, authenticated, retry and real-device evidence explicitly |

### Verification plan

- Documentation: doctor-selected gates, knowledge/CI-policy tests, registry validation,
  diff hygiene and fresh-context evaluation.
- No build, database, browser or Design Harness run unless later selected by a changed
  executable path; A0 changes none.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| A0-T1 | map historical UI/design evidence and guards | packet | named primary evidence map | complete |
| A0-T2 | write durable causal failure review | A0-T1 | `docs/research/A0_HISTORICAL_UI_DESIGN_FAILURE_REVIEW.md` | complete |
| A0-T3 | fresh-context evaluation and delivery | A0-T2 | evaluator findings, selected gates and PR memory | complete — merged #364 |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | human_owner | researcher | discovery | `main@c248176`; active packet; required historical evidence list | failure mechanisms not yet synthesized; no implementation authority | inspect named repository evidence only |
| 2026-08-13 | researcher | independent evaluator | review | durable A0 review; active registry/current-memory/parent updates | fresh-context attack and final docs-only gates remain | evaluate conclusions and scope before PR delivery |
| 2026-08-13 | independent evaluator | human_owner | accepted | fresh recheck clean; #364 later merged at `main@157ba767` | dynamic exact-head provider detail remains PR provenance | Phase A was later opened only under its own packet |

### Current permission boundary

- Granted scope: one branch; A0 packet, durable retrospective review and minimal
  current-state/parent registry updates.
- Forbidden writes: runtime/source/assets/CSS/tests, Design Harness, Brand/Product
  Experience implementation, providers, production, database, Auth and Phase A packet.
- Stop condition: a proposed conclusion needs external research, a product decision or
  implementation; record it as uncertainty/requirement for a later authorized phase.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| historical causal review | durable review drafted from named repository-primary evidence; fresh evaluator clean after corrections | pass |
| classification and guardrails | explicit reusable/historical/legacy/candidate classification and requirements; fresh evaluator clean | pass |
| scope/lifecycle coherence | merged #364 made registry parent-only and A0 completed; Phase A/implementation remained not started at that point; no runtime/UI diff | pass |

### Remaining limitations

- A0 can specify future evidence requirements but cannot prove a future v3 redesign.

## Delivery record

- Branch: `review/a0-historical-ui-design-failures`
- PR: [#364](https://github.com/Thunderkill016/moneyflow/pull/364) merged
- CI run: merge-time dynamic exact-head detail remains in PR provenance; selected
  Class 0 local gates are recorded in PR memory
- Work packet moved to `docs/plans/completed/`: yes — accepted/completed record made
  authoritative on `main` by merged #364
