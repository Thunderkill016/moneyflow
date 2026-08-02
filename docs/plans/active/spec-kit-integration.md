# Adopt Spec Kit as a MoneyFlow feature-artifact interface

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** draft PR pending  
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
- `.specify/` is absent from current `main`.
- Closed unmerged PR #89 piloted Spec Kit v0.8.14 with CycleWarden-specific and Calm-Ledger-specific assumptions that no longer fit current project governance.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | Highest procedural rules for agents | Extend with Spec Kit coexistence rules |
| `README.md` | Repository entrypoint and workflow | Add discoverability and mapping |
| `docs/templates/FEATURE_WORK_PACKET.md` | Existing cross-cutting execution artifact | Reuse; do not replace |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Change class and gate authority | Reuse unchanged |
| `.specify/` | Spec Kit-owned convention | Add compact adapter, constitution and MoneyFlow templates |
| `specs/` | Future feature-specific artifacts | Reserve; do not create a fake feature in this adoption PR |
| `.agents/skills/` | Official Codex skill output | Generate later only through pinned official CLI in a trusted local environment |

### Existing tests and constraints

- Related unit tests: not applicable; no runtime code changes.
- Database/RLS tests: not applicable; no database or ownership change.
- Browser tests: not applicable; no application behavior or UI change.
- Product/architecture rules: no second management layer, no direct main write, no merge by agent, current code/tests outrank prose.

### Similar implementation and recent history

- Existing pattern to reuse: `FEATURE_WORK_PACKET.md` sections for specification, plan, tasks, permissions and evaluation.
- Relevant issue/PR/decision: closed unmerged PR #89 proved a thin adapter was possible but coupled it to CycleWarden and a historical redesign slice.

### Open questions

- [x] Should Spec Kit replace the MoneyFlow work packet? No.
- [x] Should generated Codex skills be hand-authored in this environment? No; preserve official generation and record the exact pinned command.
- [x] Does this PR change current product capability truth? No.

## Research

### Research scope and source selection

- Decision question: How should current GitHub Spec Kit be integrated into an existing brownfield repository that already has stronger domain governance and delivery controls?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`
- Source budget: official repository, official documentation and the exact release commit; prior MoneyFlow pilot used as internal evidence.
- Expected decision or uncertainty to resolve: official Codex layout, core command lifecycle, pinned version and coexistence boundaries.

### Questions researched

1. What is the current official Spec Kit lifecycle and artifact model?
2. How does the pinned release integrate with Codex?
3. Which generated responsibilities would duplicate MoneyFlow's existing workflow?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `github/spec-kit` README and official docs | Primary upstream | 2026-08-02 | Core lifecycle: constitution, specify, clarify, plan, tasks, analyze, implement and checklist | Generic workflow; does not know MoneyFlow financial/security rules |
| `github/spec-kit` release `v0.14.2`, commit `2930d06...` | Primary exact release | 2026-08-02 | Reproducible version and release date | Future upgrades require separate review |
| `src/specify_cli/integrations/codex/__init__.py` at `v0.14.2` | Primary source code | 2026-08-02 | Codex is skills-based and writes `.agents/skills/speckit-<name>/SKILL.md` | Does not authorize committing generated changes blindly |
| MoneyFlow PR #89 | Internal historical evidence | 2026-08-02 | Prior pilot identified the need to avoid a second spec engine | Closed, unmerged and tied to obsolete CycleWarden/Calm Ledger context |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Run unpinned latest `specify init` and commit everything | Fast, complete generated command set | Silent upstream drift; may overwrite local governance/templates; unavailable shell network | Rejected |
| Copy the old PR #89 integration | Existing work | Obsolete version and project assumptions; stacked historical branch | Rejected |
| Add only a link to Spec Kit docs | Minimal diff | No MoneyFlow constitution, templates or authority mapping | Rejected |
| Add a pinned, MoneyFlow-owned adapter/constitution/templates and generate official Codex skills later from the pinned CLI | Immediate structured SDD contract; avoids duplicated governance and hand-written upstream commands | One trusted-local refresh remains before `$speckit-*` commands appear | Selected |

### Research decision

Adopt Spec Kit as a feature-artifact interface. Keep MoneyFlow's work packet as the execution/permission/handoff authority. Pin upstream `v0.14.2` and commit `2930d06f...`. Add MoneyFlow-specific constitution and templates now. Record, but do not falsely claim, official CLI execution because this environment's shell cannot resolve external hosts.

### Adoption review

- Observed problem: feature requirements, technical plan and tasks are currently embedded in a broad packet, making lightweight SDD reuse and standard agent commands harder.
- Existing or simpler alternatives considered: current packet only and docs-only link; both preserve safety but do not provide the requested Spec Kit interface.
- License/code-reuse compatibility: no upstream source code copied into runtime; repository-owned templates are original adaptations of the documented artifact model.
- Secrets, user-data and privacy exposure: none; documentation-only.
- Runtime, bundle, deployment and operational cost: none in application runtime; maintenance cost is explicit version/template review on upgrade.
- Owning boundary and maintenance responsibility: `.specify/` is repository engineering governance; MoneyFlow policy remains authoritative.
- Migration and rollback: delete `.specify/` additions and revert README/AGENTS references.
- Verification plan: project knowledge, CI policy and diff review; GitHub exact-head CI after PR creation.
- Removal condition if the expected benefit does not appear: remove the adapter if two or more real feature trials show duplicated artifacts without reduced ambiguity or scope drift.

## Specification

### Problem

The owner requested Spec Kit for MoneyFlow, but blindly initializing it would create overlapping governance and could weaken financial, permission and verification rules. The repository needs an explicit compatibility layer.

### User stories

- As the owner, I can ask for a feature through Spec Kit while retaining MoneyFlow's safety and merge boundaries.
- As an implementation agent, I can create a feature spec, plan and tasks without guessing which artifact owns permissions or handoffs.
- As a reviewer, I can trace upstream version, local deviations and rollback.

### Acceptance criteria

- [x] `.specify/README.md` defines authority, workflow mapping, pinned upstream and upgrade policy.
- [x] `.specify/memory/constitution.md` captures compact MoneyFlow invariants and governance.
- [x] MoneyFlow-adapted spec, plan, tasks and checklist templates exist.
- [x] `AGENTS.md` and `README.md` expose coexistence rules.
- [x] Existing work packet, risk policy, PR memory and owner decisions remain authoritative.
- [x] No application, database, CI, provider or production behavior changes.
- [ ] Exact-head documentation checks pass in the pull request.
- [ ] Human owner reviews and decides whether to merge.

### Required states

Not applicable to user-facing runtime. Documentation must distinguish draft, accepted, active, blocked, evaluated and unmerged candidate artifacts.

### Financial and security constraints

- No financial semantics, RLS, authentication, schema or provider changes.
- Constitution must preserve integer VND, transfer, ownership and recovery invariants.
- Generated artifacts cannot grant provider/production writes.

### Out of scope

- Installing Python/uv dependencies in the application.
- Committing hand-written imitations of official Codex skills.
- Converting every existing work packet or historical plan into `specs/`.
- Changing CI, branch protection, required checks, runtime code or product scope.

## Implementation plan

### Architecture fit

The integration belongs to repository engineering governance. `.specify/` contains the SDD adapter and templates; `AGENTS.md` and `README.md` route users to it. Existing MoneyFlow documents remain the sources of product, architecture, memory, permissions and verification truth.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `.specify/README.md` | Add pinned adapter and authority mapping | Prevent duplicate governance and unpinned drift |
| `.specify/memory/constitution.md` | Add compact MoneyFlow constitution | Feed invariants into Spec Kit stages |
| `.specify/templates/` | Add adapted spec/plan/tasks/checklist templates | Make generated artifacts fit MoneyFlow |
| `AGENTS.md` | Add read-order and coexistence rules | Bind agents to the correct authority |
| `README.md` | Add discoverability and workflow step | Make adoption visible to contributors |
| `docs/plans/active/spec-kit-integration.md` | Record cross-cutting adoption evidence | Satisfy existing packet policy |
| `docs/research/pr-memory/2026/Q3/PR-<number>.md` | Add bounded PR record after PR creation | Satisfy memory contract |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: additive documentation convention.
- Rollback: revert the focused branch/PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Spec Kit becomes a second management layer | Explicit authority map and packet coexistence rules |
| Generated artifacts override current truth | Constitution and AGENTS hierarchy |
| Upstream drift | Pin release and commit; dedicated upgrade PR |
| Commands are claimed available when not generated | Document environment limitation and trusted-local bootstrap command |
| Templates duplicate entire repository memory | Require links and feature-specific decisions only |

### Verification plan

- Static: not applicable; no executable changes.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Documentation/policy: `npm run check:knowledge`, `npm run test:ci-policy`, diff review and GitHub exact-head CI.
- Production/manual: not applicable.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Inspect current governance and prior pilot | none | AGENTS, risk policy, packet and PR #89 reviewed | done |
| T2 | Research current official Spec Kit and Codex integration | T1 | official v0.14.2 sources recorded | done |
| T3 | Add adapter and constitution | T2 | `.specify/README.md`, constitution | done |
| T4 | Add adapted spec/plan/tasks/checklist templates | T3 | `.specify/templates/` | done |
| T5 | Update repository entrypoints | T3 | AGENTS and README diff | done |
| T6 | Open draft PR and add bounded PR memory | T1-T5 | PR and memory record | active |
| T7 | Run/evaluate exact-head CI | T6 | CI links/results | todo |
| T8 | Owner review and merge decision | T7 | owner decision | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher/planner | implementer | planned | official sources, selected adapter design | official CLI not runnable in shell | Create branch artifacts only |
| 2026-08-02 | implementer | evaluator | evaluating | branch `chore/adopt-spec-kit`, adapter, constitution, templates and entrypoint updates | exact-head CI and PR memory pending | Open draft PR; add memory record; inspect CI |

### Current permission boundary

- Granted scope: branch writes for documentation and `.specify/` artifacts.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, branch `chore/adopt-spec-kit`.
- Forbidden writes: application runtime, database, RLS, CI workflows, branch protection, provider configuration, production data, `main`.
- Human approval required before: merge, deployment, official local CLI refresh result acceptance.
- Rollback or stop condition: stop if adoption requires weakening current governance or adding runtime dependencies.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Adapter and pinned upstream | `.specify/README.md` | pass |
| Compact MoneyFlow constitution | `.specify/memory/constitution.md` | pass |
| Adapted artifact templates | `.specify/templates/` | pass |
| Existing governance remains authoritative | AGENTS/README wording and no deletion of existing policy | pass |
| No runtime/data/CI change | changed paths only documentation/governance | pending final diff confirmation |
| Exact-head checks | PR CI | pending |

### Research and adoption evidence

- Selected official sources support the Codex skills layout and Spec Kit lifecycle.
- Generic upstream governance does not replace MoneyFlow's financial/security rules.
- No new runtime dependency or provider is adopted.

### Review findings

- Correctness: adapter deliberately separates feature artifacts from execution permissions.
- Security/ownership: invariants are preserved; no data or provider access.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: templates are feature-specific; repository-wide truth is linked, not copied.
- Scope compliance: documentation-only, focused branch.

### Remaining limitations

- Official Codex skill files are not generated in this environment. A trusted local checkout must run the pinned command and review the generated diff before committing those skills.
- Real value must be measured on future feature work; removal criteria are recorded.

## Delivery record

- Branch: `chore/adopt-spec-kit`
- PR: pending
- Squash commit: pending owner merge
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: after merge and acceptance only