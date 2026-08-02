# Adopt Spec Kit as a MoneyFlow feature-artifact interface

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** human_owner  
**Permission scope:** read_only  
**Owner:** Thunderkill016  
**Issue/PR:** #226  
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is cross-cutting workflow/tool adoption, so a full packet is used even though the repository changes are documentation-only.

## Outcome

MoneyFlow can use GitHub Spec Kit to structure feature specifications, clarification, implementation plans, tasks, checklists and consistency analysis without replacing the repository's existing product law, work-packet lifecycle, risk-proportional CI, project memory, permission boundaries or owner-controlled merge/deployment decisions.

## Repository reconnaissance

### Current behavior

- MoneyFlow already has specification, planning, task, handoff, evaluation and delivery sections in `docs/templates/FEATURE_WORK_PACKET.md`.
- `AGENTS.md` forbids creating another management layer and requires full packets for cross-cutting adoption work.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` selects planning artifacts and verification by realistic risk.
- Every PR requires a bounded record under `docs/research/pr-memory/`.
- `.specify/` was absent from current `main` when this work began.
- Closed unmerged PR #89 piloted Spec Kit v0.8.14 with CycleWarden-specific and Calm-Ledger-specific assumptions that do not fit current project governance.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | Highest procedural rules for agents | Extended with Spec Kit coexistence rules |
| `README.md` | Repository entrypoint and workflow | Added discoverability and mapping |
| `docs/templates/FEATURE_WORK_PACKET.md` | Existing cross-cutting execution artifact | Reused; not replaced |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Change class and gate authority | Reused unchanged |
| `.specify/` | Spec Kit-owned convention | Added compact adapter, constitution and MoneyFlow templates |
| `specs/` | Future feature-specific artifacts | Reserved; no fake feature added in this adoption PR |
| `.agents/skills/` | Official Codex skill output | Deferred to the pinned official CLI in a trusted local environment |

### Existing tests and constraints

- Related unit tests: not applicable; no runtime code changes.
- Database/RLS tests: not applicable; no database or ownership change.
- Browser tests: not applicable; no application behavior or UI change.
- Product/architecture rules: no second management layer, no direct main write, no merge by agent, current code/tests outrank prose.

### Similar implementation and recent history

- Existing pattern reused: `FEATURE_WORK_PACKET.md` sections for specification, plan, tasks, permissions and evaluation.
- Historical evidence: closed unmerged PR #89 proved a thin adapter was possible but coupled it to obsolete CycleWarden and historical redesign assumptions.

### Open questions

- [x] Should Spec Kit replace the MoneyFlow work packet? No.
- [x] Should generated Codex skills be hand-authored in this environment? No.
- [x] Does this PR change current product capability truth? No.

## Research

### Research scope and source selection

- Decision question: How should current GitHub Spec Kit be integrated into a brownfield repository that already has stronger domain governance and delivery controls?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Sources: official Spec Kit repository/docs, exact release commit and prior MoneyFlow pilot.
- Decision resolved: official Codex layout, pinned version and coexistence boundaries.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `github/spec-kit` README and official docs | Primary upstream | 2026-08-02 | Core lifecycle: constitution, specify, clarify, plan, tasks, analyze, implement and checklist | Generic workflow; does not know MoneyFlow financial/security rules |
| `github/spec-kit` release `v0.14.2`, commit `2930d06f...` | Primary exact release | 2026-08-02 | Reproducible version and release date | Future upgrades require separate review |
| Codex integration source at `v0.14.2` | Primary source code | 2026-08-02 | Codex uses `.agents/skills/speckit-<name>/SKILL.md` | Does not authorize blindly committing generated changes |
| MoneyFlow PR #89 | Internal historical evidence | 2026-08-02 | Prior pilot identified the need to avoid a second specification engine | Closed, unmerged and tied to obsolete context |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Run unpinned latest `specify init` and commit everything | Fast, complete generated command set | Silent drift and template overwrite | Rejected |
| Copy PR #89 | Existing work | Obsolete version and assumptions | Rejected |
| Add only an external documentation link | Minimal diff | No MoneyFlow constitution or authority mapping | Rejected |
| Add a pinned adapter, constitution and templates; generate official skills later | Structured SDD without duplicate governance | Trusted-local CLI refresh remains | Selected |

### Research decision

Adopt Spec Kit as a feature-artifact interface. Keep MoneyFlow's work packet as the execution, permission and handoff authority. Pin upstream `v0.14.2` and commit `2930d06f41e3ab491ef7d111cfe7676de5ddeabd`. Record, but do not falsely claim, official CLI execution because this environment's shell could not resolve external hosts.

### Adoption review

- Observed problem: feature requirements, technical plans and tasks were embedded only in a broad packet, limiting lightweight standard SDD usage.
- Simpler alternatives: current packet only or external docs link; neither supplies the requested interface.
- License/code-reuse: no upstream runtime code copied; templates are MoneyFlow adaptations of the documented artifact model.
- Secrets/privacy: no exposure; documentation-only.
- Runtime/deployment cost: none.
- Ownership: `.specify/` is repository engineering governance; MoneyFlow policy remains authoritative.
- Rollback: revert PR #226.
- Removal condition: remove the adapter if real feature trials show duplication without reduced ambiguity or scope drift.

## Specification

### Problem

Blindly initializing Spec Kit would create overlapping governance and could weaken financial, permission and verification rules. MoneyFlow needs an explicit compatibility layer.

### User stories

- As the owner, I can request feature work through Spec Kit while retaining MoneyFlow safety and merge boundaries.
- As an implementation agent, I can create a spec, plan and tasks without guessing which artifact owns permissions or handoffs.
- As a reviewer, I can trace upstream version, local deviations and rollback.

### Acceptance criteria

- [x] `.specify/README.md` defines authority, workflow mapping, pinned upstream and upgrade policy.
- [x] `.specify/memory/constitution.md` captures compact MoneyFlow invariants and governance.
- [x] MoneyFlow-adapted specification, plan, task and checklist templates exist.
- [x] `AGENTS.md` and `README.md` expose coexistence rules.
- [x] Existing work packet, risk policy, PR memory and owner decisions remain authoritative.
- [x] No application, database, CI, provider or production behavior changes.
- [x] Exact-head documentation classification and repository checks are green on PR #226.
- [ ] Human owner reviews and decides whether to merge.

### Financial and security constraints

- No financial semantics, RLS, authentication, schema or provider changes.
- Constitution preserves integer VND, transfers, ownership and recovery invariants.
- Generated artifacts cannot grant provider or production writes.

### Out of scope

- Installing Python/uv dependencies in the application.
- Hand-authoring imitations of official Codex skills.
- Converting every historical packet into `specs/`.
- Changing runtime code, CI workflows, branch protection, required checks or product scope.

## Implementation plan

### Architecture fit

The integration belongs to repository engineering governance. `.specify/` contains the SDD adapter and templates; `AGENTS.md` and `README.md` route contributors to it. Existing MoneyFlow documents remain authoritative for product, architecture, memory, permissions and verification.

### Planned and completed changes

| File/area | Change | Reason |
|---|---|---|
| `.specify/README.md` | Added pinned adapter and authority mapping | Prevent duplicate governance and unpinned drift |
| `.specify/memory/constitution.md` | Added compact MoneyFlow constitution | Feed invariants into Spec Kit stages |
| `.specify/templates/` | Added spec/plan/tasks/checklist templates | Fit generated artifacts to MoneyFlow |
| `AGENTS.md` | Added read-order and coexistence rules | Bind agents to correct authority |
| `README.md` | Added discoverability and workflow step | Make adoption visible |
| This packet | Recorded cross-cutting adoption evidence | Satisfy existing workflow |
| `docs/research/pr-memory/2026/Q3/PR-226.md` | Added bounded PR record | Satisfy memory contract |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: additive documentation convention.
- Rollback: revert PR #226.

### Verification plan and evidence

| Layer | Result | Evidence/reason |
|---|---|---|
| Changed-path classification | pass | Documentation-only; no full verify, database, browser smoke or UI audit selected |
| CI | pass | PR #226 CI #1078 and #1079 succeeded before the final packet-only state update; final exact-head status is surfaced on the PR |
| CodeQL | pass | Runs #237 and #238 succeeded |
| Secret history scan | pass | Runs #237 and #238 succeeded |
| Runtime/unit/build | not applicable | No executable application or dependency change |
| Database/RLS | not applicable | No schema, migration, policy or ownership change |
| Browser/UI | not applicable | No user-facing runtime change |
| Production/provider | not applicable | No deployment, provider or production-data change |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Inspect current governance and prior pilot | AGENTS, risk policy, packet and PR #89 reviewed | done |
| T2 | Research current official Spec Kit and Codex integration | Official v0.14.2 sources recorded | done |
| T3 | Add adapter and constitution | `.specify/README.md`, constitution | done |
| T4 | Add adapted templates | `.specify/templates/` | done |
| T5 | Update repository entrypoints | AGENTS and README | done |
| T6 | Open draft PR and add bounded PR memory | PR #226 and record | done |
| T7 | Run and evaluate risk-selected CI | Successful PR runs and docs-only classifier | done |
| T8 | Owner review and merge decision | Owner-only action | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher/planner | implementer | planned | Official sources and adapter design | Official CLI unavailable in shell | Create branch artifacts only |
| 2026-08-02 | implementer | evaluator | evaluating | Branch, adapter, constitution, templates and entrypoint updates | Exact-head CI and PR memory | Open PR and inspect CI |
| 2026-08-02 | evaluator | human owner | ready_for_review | PR #226, bounded memory and successful risk-selected checks | Official Codex skills require a separate trusted-local refresh | Review; merge, request changes or reject |

### Current permission boundary

- Granted scope: read-only review of PR #226.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: merge, `main`, provider configuration, deployment and production data.
- Human approval required before: merge and any later official CLI-generated skill adoption.
- Rollback: close/revert PR #226.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Adapter and pinned upstream | `.specify/README.md` | pass |
| Compact constitution | `.specify/memory/constitution.md` | pass |
| Adapted templates | `.specify/templates/` | pass |
| Existing governance retained | AGENTS/README and unchanged existing policies | pass |
| Documentation-only scope | Classifier and compare diff | pass |
| Risk-selected checks | PR #226 checks | pass |

### Review findings

- Correctness: feature artifacts are separated from execution permissions.
- Security/ownership: invariants remain intact; no data/provider access.
- Maintainability: feature templates link to repository truth instead of copying the project encyclopedia.
- Scope: documentation/governance only.

### Remaining limitations

- Official `$speckit-*` Codex skill files are not yet generated. A trusted local checkout must run the pinned command and review that separate diff.
- Value should be measured on future real feature work against the recorded removal condition.

## Delivery record

- Branch: `chore/adopt-spec-kit`
- PR: #226
- Squash commit: pending owner decision
- CI: successful risk-selected PR checks; final exact-head status visible on PR #226
- Production deployment: not applicable
- Production verification: not applicable
- Work packet archive: move to `docs/plans/completed/` only after owner merge and acceptance