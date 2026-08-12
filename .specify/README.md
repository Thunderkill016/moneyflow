# MoneyFlow Spec Kit adapter

MoneyFlow adopts GitHub Spec Kit as a **feature-artifact interface**, not as a second
project-management or governance system. It is an adapter: its current authority
route is `AGENTS.md` → `docs/context/README.md` → the registered active packet.

Spec Kit may generate and maintain feature specifications, implementation plans, task lists, checklists and consistency analysis. MoneyFlow's existing repository law remains authoritative for product scope, architecture, permissions, verification, PR memory and owner acceptance.

## Pinned upstream reference

- Project: `github/spec-kit`
- Release: `v0.14.2`
- Release commit: `2930d06f41e3ab491ef7d111cfe7676de5ddeabd`
- Released: 2026-07-24
- Integration: Codex CLI skills mode
- Generated command location: `.agents/skills/speckit-<command>/SKILL.md`
- Feature artifact location: `specs/<feature>/`

The tag and commit are recorded together so an upgrade is an explicit adoption decision rather than silent template drift.

## Authority and responsibility boundary

```text
Owner decision
  > AGENTS.md and active acceptance criteria
  > current code, migrations and tests
  > current project memory and MoneyFlow product/architecture policy
  > .specify/memory/constitution.md
  > feature artifacts under specs/
  > historical research and closed PR artifacts
```

Spec Kit does not replace:

- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` for change classification and gates;
- `docs/templates/FEATURE_WORK_PACKET.md` when a full packet is required;
- `docs/engineering/AGENT_OPERATING_MODEL.md` for execution state, permissions and handoffs;
- `docs/research/pr-memory/` for one truthful record per PR;
- human owner decisions to merge, deploy or perform production/provider writes.

A generated `spec.md`, `plan.md` or `tasks.md` is candidate execution guidance. It cannot grant permission, lower a required gate or override a financial invariant.

## Install or refresh the official Codex integration

Run from a trusted local checkout with Python 3.11+, `uv`, Git and Codex CLI available:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@2930d06f41e3ab491ef7d111cfe7676de5ddeabd
specify version
specify init --here --force --integration codex
```

Codex is skills-based in this pinned release, so the integration installs commands under `.agents/skills/` and exposes them as `$speckit-<command>`.

Before committing generated output:

1. inspect every changed file;
2. preserve MoneyFlow-owned templates and constitution customizations;
3. reject new management layers, workflows or dependencies that are not part of the approved scope;
4. run the risk-selected MoneyFlow checks;
5. ensure the protected CodeQL workflow uploads a real analysis for the exact pull-request head;
6. record the upstream version and any local template divergence in the PR.

The official CLI command above is recorded but was not executed by this repository change. The repository-owned constitution and templates provide the adopted contract until a trusted local refresh generates and reviews the Codex skill files.

## MoneyFlow workflow mapping

| Spec Kit stage | MoneyFlow requirement |
|---|---|
| `constitution` | Keep `.specify/memory/constitution.md` aligned with authoritative MoneyFlow policy. Do not copy entire policy documents into it. |
| `specify` | Describe observable outcomes, user stories, states, financial/security constraints and out-of-scope behavior. |
| `clarify` | Resolve material ambiguity before planning; never guess financial data, ownership or product scope. |
| `plan` | Map the accepted spec to existing boundaries, current code/tests, risk class, rollback and exact verification. |
| `tasks` | Produce small reviewable tasks with paths, dependencies, evidence and permission boundaries. |
| `analyze` | Check cross-artifact consistency against the constitution and active MoneyFlow packet. |
| `implement` | Work only on the authorized task and focused branch; update the spec before changing requirements. |
| `checklist` | Validate requirements quality and acceptance evidence, not merely implementation completion. |

## Artifact coexistence rules

- Class 0/1 and bounded Class 2 changes may use `specs/<feature>/` plus a concise PR plan.
- Class 3, cross-cutting, multi-day/multi-agent, provider/production, non-obvious rollback or unresolved-research work still requires `docs/plans/active/<slug>.md`.
- When both exist, the active packet owns execution state, permissions, handoffs and delivery evidence. The Spec Kit directory owns feature requirements, technical planning and task decomposition.
- Do not duplicate current-project memory, PR history or entire architecture documents inside every feature directory. Link to the relevant source and record only feature-specific decisions.
- Never treat an unmerged feature directory as current product truth.

## Verification compatibility

Application, database and browser gates remain risk-proportional. The repository CodeQL rule is an explicit provider exception: every pull request must initialize, run and upload a real JavaScript/TypeScript analysis even when the product diff is documentation-only.

A successful check-name shell with skipped CodeQL initialization/analysis is not acceptable evidence and may leave the pull request unmergeable.

## Upgrade policy

Upgrade only in a dedicated branch and PR. Record:

- old and new release plus commit SHA;
- generated file diff;
- changed command/template semantics;
- compatibility impact on MoneyFlow's constitution, work packet and risk gates;
- rollback to the prior pinned commit.

Do not run an unpinned `specify init` in a feature branch.
