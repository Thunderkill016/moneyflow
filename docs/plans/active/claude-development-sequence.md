# Claude-guided MoneyFlow development sequence

**Status:** evaluating
**Owner:** Codex with human product owner
**Issue/PR:** pending
**Last updated:** 2026-07-31

## Outcome

Claude Code can select and execute the next MoneyFlow initiative from one
evidence-backed phase sequence without reviving retired backlogs, skipping
higher-priority defects or confusing implementation with acceptance.

The sequence also distinguishes the product outcome to prove from the
engineering order required to pursue it safely.

The product plan is feature-first: after in-flight, P0/P1 and financial/tenant
blockers, Claude selects a user-facing feature vertical slice. Cross-cutting
quality is part of that feature's Definition of Done rather than an unlimited
reason to postpone product development.

## Repository reconnaissance

### Current behavior

- `CLAUDE.md` already imports `AGENTS.md` and gives session guardrails.
- `docs/engineering/AI_DELIVERY_WORKFLOW.md` defines how one selected task moves
  from research through delivery.
- GitHub issues and pull requests own live status; active packets own temporary
  handoff context.
- No durable document explains how to choose between active packets, P0/P1
  defects, correctness work, UI debt and issue #53's longer roadmap.
- No current brownfield product plan connects daily-ledger outcomes, primary
  user validation, reconciliation, planning, retention and commercialization
  without reviving retired safe-to-spend or inbox-first strategy.
- `.agents/skills/ship-feature/SKILL.md` still points to retired `IDEA.md`, which
  was deliberately removed on 2026-07-28.
- `README.md` still describes seven-day self-use as future work even though
  TRUST-7 was accepted and archived.
- Claude Code project skills are officially discovered from `.claude/skills/`;
  `.agents/skills/` cannot be assumed to load in Claude Code.

### Relevant repository areas

| Area | Why it matters | Change |
|---|---|---|
| `CLAUDE.md`, `AGENTS.md` | always-loaded orientation | link selection sequence |
| `docs/engineering/` | durable operating knowledge | add phase sequence |
| `docs/product/` | durable product knowledge | add outcome and learning sequence |
| `.claude/skills/` | on-demand Claude workflow | add `/next-initiative` |
| `scripts/hooks/` | deterministic session reminder | print sequence path |
| `scripts/check-project-knowledge.mjs` | knowledge regression gate | require new contract |
| `README.md`, `docs/MVP_DEFINITION.md` | current phase and authority | remove stale direction |
| `.agents/skills/ship-feature/` | compatibility workflow | remove retired queue |

### Existing tests and constraints

- `npm run check:knowledge` validates required operating files and active packet
  headings.
- `AGENTS.md` must remain under its 160-line knowledge budget.
- Official Claude guidance recommends concise `CLAUDE.md`, on-demand skills,
  verification feedback, context discipline and worktree isolation.
- No runtime, financial calculation, schema, RLS, UI or dependency change is
  required.
- Live GitHub reconciliation on 2026-07-31 found PRs #163-#165 merged, draft PR
  #119 still owner-gated, and issues #145, #156, #40, #72 and #53 still open.
  `origin/main` was fetched to `3e3d85e` before publication.

### Similar implementation and recent history

- PR #77 established the repository-native AI delivery system.
- PR #149 restored GitHub as the dynamic queue and active packets as handoff
  contracts rather than a second backlog.
- PR #160 added cloud-agent safety boundaries.
- This change extends those authorities; it does not install a new agent
  framework or project-management system.

### Open questions

- [x] Should the sequence become another live backlog? No. It owns stable phase
      gates; GitHub retains live status.
- [x] Should agent teams be enabled by default? No. They are experimental,
      costlier and unsafe for overlapping ownership.
- [x] Should Claude default to Plan mode for every task? No. The repository
      requires it for non-trivial work without burdening tiny mechanical fixes.

## Research

### Questions researched

1. Which Claude Code artifacts are always loaded versus on demand?
2. How should long-running work manage context and verification?
3. When should subagents, agent teams, hooks and worktrees be used?
4. How can the sequence remain durable without duplicating GitHub state?
5. Which product outcomes and real-world PFM practices should gate feature
   development beyond repository reliability?
6. What current competitor patterns and failure modes should shape each
   F01-F12 feature without turning the roadmap into a feature clone?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Claude Code memory | 2026-07-30 | concise `CLAUDE.md`, imports, rules and compaction behavior | instructions influence behavior; hooks enforce deterministic events |
| Claude Code best practices | 2026-07-30 | context is scarce; tests/screenshots are high-leverage feedback | does not define MoneyFlow priorities |
| Claude Code skills | 2026-07-30 | project skills live in `.claude/skills/` and load on demand | `.agents/skills/` is not listed as a Claude path |
| Claude Code subagents/agents | 2026-07-30 | isolated research/review contexts; parallelism costs context/tokens | agents do not replace ownership boundaries |
| Claude Code worktrees | 2026-07-30 | parallel edits need checkout isolation | worktrees do not prevent logical scope overlap |
| Claude Code hooks/permissions/security | 2026-07-30 | hooks suit deterministic enforcement; sensitive actions retain permissions | no hook can approve product judgment |
| MoneyFlow product/architecture/workflow | 2026-07-30 | finance priority, active packet lifecycle and evidence layers | repository status must still be revalidated live |
| Actual/YNAB official import and reconciliation docs | 2026-07-30 | imported identity, dedupe, dry-run, cleared and reconciled workflows | patterns require MoneyFlow-specific user validation |
| Supabase/WCAG/Vietnam legal sources | 2026-07-30 | RLS, Auth settings/logs, accessibility minimums and current privacy-law gate | legal application requires qualified review |
| YNAB, Actual, Monarch, Copilot, Lunch Money, Rocket Money, Wallet and Money Lover official product/help docs | 2026-07-30 | current capture, workspace, report, reconciliation, import, rules, budget, recurring, goal, attention and packaging patterns | documentation shows supported behavior, not MoneyFlow user demand |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| One permanent Markdown backlog | simple to read | duplicates GitHub and becomes stale | reject |
| Enable autonomous agent teams | parallel throughput | overlapping edits, higher cost, experimental state | reject as default |
| Put the full plan in `CLAUDE.md` | always visible | wastes context and reduces adherence | reject |
| Stable sequence + on-demand skill + executable knowledge check | durable, current-state aware, low startup cost | requires GitHub reconciliation each session | select |

### Research decision

Keep `CLAUDE.md` short, store the detailed stable sequence in
`docs/engineering/`, expose selection as `/next-initiative`, retain GitHub as the
live queue and use existing packets for one initiative at a time. Add a
separate `docs/product/` plan for product outcomes and learning gates; the
engineering sequence remains responsible for safe implementation order.

## Specification

### Problem

Claude Code knows how to deliver a selected task but has no reliable rule for
which task comes next. Stale instructions can send it to a deleted queue, and
current docs can make completed readiness work look unfinished.

### User stories

- As the owner, I can say "continue" and receive one justified next initiative.
- As Claude Code, I can distinguish phase order from live work status.
- As a reviewer, I can see why lower-priority work did not bypass a blocker.
- As a future session, I can resume from repository evidence without chat
  history.

### Acceptance criteria

- [x] One durable document orders work from in-flight closure through
      evidence-backed feature expansion.
- [x] Every phase has a goal, ordered work and observable exit gate.
- [x] Claude Code has an on-demand skill that reconciles GitHub before selecting
      one initiative.
- [x] `CLAUDE.md` and `AGENTS.md` point to the sequence without exceeding their
      context budgets.
- [x] Retired `IDEA.md` is absent from the live `ship-feature` workflow.
- [x] README and MVP authority match accepted current truth.
- [x] Session hook and knowledge check make the new entrypoint discoverable and
      regression-resistant.
- [x] One brownfield product plan covers trust, daily use, understanding,
      provenance/reconciliation, explicit planning, retention, commercial
      readiness and controlled scale.
- [x] Every product stage defines ordered work, metrics, evidence, exit gates
      and non-goals without becoming a live backlog.
- [x] Claude selection names both the product outcome and engineering gate.
- [x] The plan defines F01-F12 with user outcome, existing baseline,
      build slices, dependencies, completion gate and explicit non-goals.
- [x] The immediate Claude queue prioritizes product features after current
      in-flight, P0/P1 and financial/tenant blockers.
- [x] Standalone technical work is admitted only when it blocks a feature,
      protects a release invariant or has measured user-visible evidence.
- [x] F01-F12 are mapped to current official web evidence, explicit
      adopt/adapt/reject decisions and competitor failure modes.
- [x] `/next-initiative` requires the relevant feature evidence and a fresh
      source check when external behavior affects the specification.
- [x] No runtime, schema, finance or UI behavior changes.

### Required states

- Loading: not applicable.
- Empty: no open issue means Claude reports no authorized implementation rather
  than inventing a feature.
- Populated: open PRs/issues/packets produce one ranked recommendation.
- Validation/error: unavailable GitHub access makes selection provisional.
- Recovery/undo: all changes are versioned Markdown/config/script changes.
- Long data / large VND: phase rules preserve existing money invariants.
- Mobile/tablet/desktop: no rendered change.
- Accessibility: sequence prioritizes mobile/a11y before maintainability and
  feature breadth.

### Financial and security constraints

- Product principles remain above the sequence.
- Integer VND, transfers, RLS and recoverability are unchanged.
- No merge, deploy, provider change or secret access is authorized.
- Agent teams and parallel edits do not bypass owner or worktree boundaries.

### Out of scope

- Implementing any current MoneyFlow product issue.
- Closing, merging or reprioritizing GitHub items.
- Enabling Claude agent teams or auto permission mode.
- Installing dependencies, plugins or MCP servers.
- Replacing the existing work packet lifecycle.

## Implementation plan

### Architecture fit

Selection policy belongs in durable engineering docs. Claude-specific invocation
belongs in `.claude/skills/`. Always-on orientation remains concise. Repeatable
knowledge constraints belong in the existing check script and hook.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/DEVELOPMENT_SEQUENCE.md` | add phase gates and operating model | durable selection authority |
| `docs/product/PRODUCT_DEVELOPMENT_PLAN.md` | add brownfield outcomes, metrics and stage gates | durable product sequence |
| `.claude/skills/next-initiative/SKILL.md` | reconcile/select/execute workflow | on-demand Claude procedure |
| `CLAUDE.md`, `AGENTS.md` | link sequence and selection rule | discoverability |
| `README.md`, `docs/MVP_DEFINITION.md` | correct stale phase/authority | prevent wrong selection |
| `.agents/skills/ship-feature/SKILL.md` | remove `IDEA.md` dependency | retire stale instruction |
| `scripts/hooks/session-start.sh` | print sequence entrypoint | session reminder |
| `scripts/check-project-knowledge.mjs` | enforce required files/links | prevent regression |
| `.gitignore` | ignore Claude worktree directory | isolated-session hygiene |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation and Claude tooling only.
- Rollback: revert the focused branch.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| sequence becomes stale backlog | dated snapshot; GitHub explicitly owns live status |
| Claude reads too much at startup | detailed plan stays outside `CLAUDE.md` |
| skill selects from stale local refs | requires live reconciliation or provisional label |
| parallel agents collide | one ownership area per worktree; teams not default |
| process blocks tiny fixes | non-trivial threshold remains in existing workflow |
| new gate overfits today's issue numbers | only files/entrypoints are enforced, not dynamic issue state |

### Verification plan

- Static: `npm run check:knowledge`.
- Syntax/config: JSON parse `.claude/settings.json`; shell syntax for hooks.
- Unit/domain: `npm run test` to catch knowledge/source contract interactions.
- Type: `npm run typecheck` because the knowledge script is JavaScript tooling
  adjacent to a TypeScript project.
- Database/browser/production: not applicable; no runtime behavior changes.
- Manual: inspect source hierarchy, sequence, stale-reference search and diff.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Audit current Claude/repository controls | none | reconnaissance and official sources | done |
| T2 | Define stable phase sequence | T1 | development sequence document | done |
| T3 | Add `/next-initiative` | T2 | project skill | done |
| T4 | Reconcile entrypoints and stale instructions | T2 | focused doc/config diff | done |
| T5 | Add executable knowledge protection | T3, T4 | knowledge check | done |
| T6 | Run verification and requirement audit | T5 | commands and findings | done |
| T7 | Research and define detailed product stage sequence | T1 | repository plus official primary sources | done |
| T8 | Integrate product outcomes into Claude selection | T7 | entrypoints, skill, hook and knowledge check | done |
| T9 | Re-run verification and final requirement audit | T8 | commands and findings | done |
| T10 | Reframe the plan around F01-F12 user-facing feature delivery | T7 | feature roadmap plus executable selection markers | done |
| T11 | Refresh official web benchmarks and map evidence to F01-F12 | T10 | benchmark section 13, product evidence map and skill gate | done |

Rules:

- This packet controls only the operating-system change.
- It does not authorize implementation of the phases it describes.
- The packet moves to `docs/plans/completed/` after merge and final evidence.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| durable ordered sequence | `docs/engineering/DEVELOPMENT_SEQUENCE.md`, phases 0-7 with entry/exit gates | pass |
| Claude invocation workflow | `.claude/skills/next-initiative/SKILL.md` | pass |
| concise discoverability | `CLAUDE.md` 68 lines; `AGENTS.md` 136 lines | pass |
| stale queue removed | live selection files contain no `IDEA.md` reference | pass |
| executable protection | `npm run check:knowledge` | pass |
| brownfield product sequence | `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`, stages 0-8 | pass |
| product stage content | every stage has ordered work, evidence/metrics, exit gate and guarded scope | pass |
| product/engineering separation | product plan owns outcomes; development sequence owns safe implementation order | pass |
| real-world PFM basis | official Actual/YNAB import, dedupe, rules, export and reconciliation sources | pass |
| current feature benchmark | official competitor docs mapped to F01-F12 with adopt/adapt/reject and failure modes | pass |
| security/accessibility/legal basis | official Supabase, W3C and Vietnam law sources with explicit legal-review boundary | pass |
| Claude product selection | `/next-initiative` names product stage and unmet outcome before implementation | pass |
| no runtime scope | final changed-path review: docs, skills, hook, check script and ignore file only | pass |

### Review findings

- Correctness: README/MVP authority now matches accepted TRUST-7 and product
  precedence; live selection no longer targets a deleted queue.
- Security/ownership: no permissions were widened; merge, deployment, provider,
  secret and destructive actions remain human-gated.
- UI/UX/accessibility: no rendered change; the sequence preserves mobile/a11y
  before maintenance and feature breadth.
- Maintainability/duplication: GitHub remains the only live queue; the sequence
  owns stable gates and the skill owns invocation.
- Scope compliance: no runtime, dependency, schema, finance or UI file changed.

### Remaining limitations

- The local environment currently has no `claude` executable, so actual Claude
  Code discovery/invocation cannot be exercised here.
- Primary Vietnamese user interviews, private-beta recruitment, legal review and
  pricing experiments are future human-authorized product work; the plan does
  not present them as completed evidence.
- GitHub status remains dynamic and must be revalidated when the skill runs.
- Repository instructions guide behavior; they do not make model judgment
  infallible.

### Verification evidence

- `npm run check:knowledge`: pass.
- `npm run check:architecture`: pass.
- `npm run check:css-ownership`: pass, 1,152/1,200 `!important`.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test`: 590/590 pass outside the restricted sandbox after the product
  plan and web-evidence integration. The first
  sandboxed run failed only because `deployment-env-guard.test.ts` could not use
  `spawnSync`; the unrestricted rerun passed all seven guard cases.
- `bash -n scripts/hooks/session-start.sh scripts/hooks/pre-tool-safety.sh`:
  pass.
- `.claude/settings.json` JSON parse: pass.
- `git diff --check`: pass.
- Database, browser, build and production: not run; no runtime, database or UI
  behavior changed.

## Delivery record

- Branch: `codex/claude-development-sequence`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge
