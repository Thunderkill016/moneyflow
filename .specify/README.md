# MoneyFlow Spec Kit adapter

MoneyFlow adopts GitHub Spec Kit as a **feature-artifact interface**, not as a second project-management or governance system.

Current authority route:

`AGENTS.md` → `docs/plans/PLAN_AUTHORITY.json` / `npm run plan:resolve` → manifest-selected active packet → affected code/tests.

The retired `docs/plans/active/README.md` is a compatibility pointer only. GitHub Issues/PRs track human backlog and status.

Spec Kit may generate feature specifications, plans, tasks, checklists and consistency analysis. MoneyFlow's repository law remains authoritative for product scope, architecture, permissions, verification, PR memory and owner acceptance.

## Pinned upstream reference

- Project: `github/spec-kit`
- Release: `v0.14.2`
- Release commit: `2930d06f41e3ab491ef7d111cfe7676de5ddeabd`
- Released: 2026-07-24
- Integration: Codex CLI skills mode
- Generated command location: `.agents/skills/speckit-<command>/SKILL.md`
- Feature artifact location: `specs/<feature>/`

## Authority and responsibility boundary

```text
Owner decision
  > PLAN_AUTHORITY.json + selected packet
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

Run only from a trusted local checkout with Python 3.11+, `uv`, Git and Codex CLI available:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@2930d06f41e3ab491ef7d111cfe7676de5ddeabd
specify version
specify init --here --force --integration codex
```

Before committing generated output:

1. inspect every changed file;
2. preserve MoneyFlow-owned templates and constitution customizations;
3. reject new management layers, workflows or dependencies outside approved scope;
4. run the risk-selected MoneyFlow checks;
5. ensure protected CodeQL uploads real analysis for the exact PR head;
6. record upstream version and local template divergence.

## MoneyFlow workflow mapping

| Spec Kit stage | MoneyFlow requirement |
|---|---|
| `constitution` | Keep `.specify/memory/constitution.md` aligned with authoritative MoneyFlow policy. |
| `specify` | Describe observable outcomes, states and financial/security constraints. |
| `clarify` | Resolve material ambiguity; never guess financial data, ownership or product scope. |
| `plan` | Map accepted spec to existing boundaries, risk class, rollback and verification. |
| `tasks` | Produce small reviewable tasks with paths, dependencies and evidence. |
| `analyze` | Check artifacts against the constitution and selected MoneyFlow packet. |
| `implement` | Work only on authorized tasks; update the spec before changing requirements. |
| `checklist` | Validate requirements quality and acceptance evidence. |

## Artifact coexistence rules

- Class 0/1 and bounded Class 2 changes may use `specs/<feature>/` plus a concise PR plan.
- Class 3, cross-cutting, multi-day, provider/production, non-obvious rollback or unresolved-research work still requires `docs/plans/active/<slug>.md`.
- When both exist, the manifest-selected packet owns execution state, permissions, handoffs and delivery evidence. Spec Kit owns feature requirements/planning/task decomposition.
- Never treat an unmerged feature directory as current product truth.

## Upgrade policy

Upgrade only in a dedicated branch and PR. Record old/new release + commit, generated diff, changed semantics, compatibility impact and rollback. Do not run an unpinned `specify init` in a feature branch.
