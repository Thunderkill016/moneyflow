# #447 — Agent harness v2

**Status:** implementing  
**Execution state:** implementing  
**Change class:** Class 3 — agent execution/security/governance boundary  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner  
**Issue/PR:** #446 / #447  
**Last updated:** 2026-08-23

## Outcome

Replace MoneyFlow's monolithic local Codex dispatcher with a small, provider-neutral agent harness whose execution state is reconstructable from an append-only event log, whose capabilities are registered behind explicit seams, and whose run ownership/permission boundaries fail closed. Preserve the existing Git/GitHub safety contract and exact-main worktree isolation while making the runtime extensible beyond one hard-coded Codex lane.

## Repository reconnaissance

### Current behavior

- `scripts/agent-dispatcher/dispatcher.mjs` owns source discovery, command parsing, mutable state, worktree creation, Codex invocation, local logs and GitHub summary posting in one module.
- `SUPPORTED_LANE = "codex"` makes the execution provider a compile-time constant rather than a capability.
- `.agent-dispatcher/state.json` is mutable last-state storage; detailed execution output is a raw local log. A run cannot be reconstructed as a durable sequence of accepted lifecycle facts.
- `command-guard.mjs` provides strong fail-closed Git/GitHub boundaries, but that policy is wired specifically into the dispatcher/Codex environment rather than exposed as a reusable harness capability.
- `agent-doctor.mjs` and `agent-policy.mjs` already separate environment diagnostics from repository policy and remain authoritative for risk/gate decisions.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/agent-dispatcher/` | current local runtime | replace implementation; preserve tested security semantics |
| `scripts/agent-policy.mjs` | repository risk/evidence policy | reuse; do not duplicate |
| `scripts/agent-doctor*.mjs` | environment/authority entry | reuse |
| `scripts/plan-*.mjs` | task-selection authority | reuse unchanged except documented integration |
| `package.json` | harness entrypoints/tests | repoint to v2 |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | permission/handoff contract | update runtime architecture |

### Existing tests and constraints

- Existing dispatcher tests pin exact-main revalidation, source-author trust, command deduplication, isolated non-main worktrees, token stripping, guarded Git/GitHub operations, draft-only PR creation and fail-closed prerequisites.
- Harness changes are Class 3 and must select full policy/database/browser/UI/CodeQL/secret-history gates.
- Merge, provider write and production-data write remain owner-only boundaries.

## Research

### Decision question

Which DeepSeek Harness architecture patterns improve MoneyFlow's local agent harness without importing a developer-preview framework or weakening MoneyFlow-specific safety boundaries?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| DeepSeek Harness official architecture/reference | upstream official docs/source projection | 2026-08-23 | thin/swappable loop; capability seams; event-sourced sessions; plugin/effect lifecycle | developer preview; do not adopt compatibility assumptions |
| DeepSeek Harness tools/subagent/workflow references | upstream official docs/source projection | 2026-08-23 | guarded tool pipeline, holder-owned runs, fail-loud capability negotiation, bounded cancellation/disposal | MoneyFlow v2 only needs a small subset now |
| DeepSeek Harness sandbox/approval references | upstream official docs/source projection | 2026-08-23 | per-call policy resolution and fail-closed approval/sandbox behavior | MoneyFlow keeps its stricter branch/provider boundaries |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Import DeepSeek Harness/Cordis | mature reference architecture | developer-preview dependency, migration cost, excess capability | reject |
| Refactor current dispatcher only | smaller diff | preserves monolith/mutable-state design debt | reject |
| Native MoneyFlow micro-harness using learned patterns | keeps repository policy; incremental; no dependency | requires explicit contracts/tests | selected |

### Research decision

Adopt the patterns, not the framework: a thin coordinator, explicit capability registry, append-only run journal, provider-neutral execution handles, fail-loud provider selection and effect-owned cleanup. Keep MoneyFlow's repository policy, exact-main isolation and command guard as stricter local invariants.

## Specification

### Acceptance criteria

- [ ] `npm run agent:dispatch` uses the new harness rather than the monolithic dispatcher implementation.
- [ ] The runtime registers source/workspace/permission/agent providers behind explicit capability seams; unknown or conflicting providers fail loudly.
- [ ] Codex is one named agent provider, not a hard-coded lane constant.
- [ ] Each accepted command has an append-only JSONL run journal with contiguous sequence numbers; terminal/dedup state is derived from the journal, not mutable `state.json`.
- [ ] A journal containing an interrupted/non-terminal prior run is not silently re-executed.
- [ ] Provider execution returns an owned run handle with result/cancel/dispose semantics; cleanup reaches quiescence on every path.
- [ ] Existing Git/GitHub guard semantics, token stripping, exact-main revalidation, isolated worktree creation and trusted-author command admission remain tested.
- [ ] Old dispatcher implementation is removed or reduced to a compatibility entrypoint with no independent state machine.
- [ ] Harness policy paths select full CI verification.

### Financial and security constraints

- No provider or production-data write capability is introduced.
- No GitHub token reaches an agent child environment.
- No merge/main/force-push capability is granted.
- Journal data contains lifecycle metadata only; detailed model output remains local/private and is not copied into repository memory.

### Out of scope

- Importing Cordis or DeepSeek Harness packages.
- Autonomous dynamic plugin installation/self-modification.
- Provider/production writes.
- Building a general distributed multi-agent scheduler in this PR.

## Implementation plan

### Architecture fit

```text
CLI / polling consumer
        |
        v
thin Harness loop
        |
        +--> source capability  -> GitHub provider
        +--> workspace capability -> local git worktree provider
        +--> permission capability -> guarded environment provider
        +--> agent capability registry -> Codex provider (future providers may register)
        |
        v
append-only RunJournal (source of run lifecycle truth)
```

The coordinator owns ordering only. Provider-specific behavior stays behind seams. Repository risk/authority policy remains in the existing `agent-policy`/`plan-*` owners.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/agent-harness/context.mjs` | capability registry + effect cleanup | provider-neutral composition |
| `scripts/agent-harness/journal.mjs` | append-only JSONL run log + projection | reconstructable state |
| `scripts/agent-harness/providers/*` | GitHub/workspace/guard/Codex providers | isolate implementations |
| `scripts/agent-harness/runtime.mjs` | thin command execution + cycle orchestration | remove dispatcher monolith |
| `scripts/agent-harness/cli.mjs` | `--once` / `--watch` entrypoint | stable operator surface |
| `scripts/agent-harness/*.test.mjs` | adversarial/runtime tests | machine contracts |
| `scripts/agent-dispatcher/*` | remove or compatibility bridge | replace old harness |
| `package.json` | point scripts/tests to v2 | activate new harness |
| engineering docs | describe v2 invariants and DeepSeek-derived patterns | durable handoff |

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| provider name silently falls back | registry throws typed error |
| duplicate provider shadows another | atomic registration conflict |
| crash after side effect then rerun | incomplete journal projects `interrupted`; no automatic replay |
| mutable state diverges from logs | no state file; projection derives from event stream |
| child process outlives caller | owned run `dispose()` kills/waits |
| provider gains GitHub token | environment scrub regression test |
| new harness bypasses command guard | permission provider is mandatory seam |
| old dispatcher remains second source | package entrypoint moves; legacy module becomes bridge or is removed |

## Verification plan

- `npm run check:knowledge`
- `npm run test:ci-policy`
- new harness unit tests, including crash/interrupted replay, provider conflict/missing capability and disposal
- existing command-guard security tests carried forward
- full Class 3 exact-head CI/database/browser/UI + CodeQL + Secret History because harness policy changes execution authority

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-23 | human owner | implementer | implementing | explicit request to replace MoneyFlow harness using DeepSeek Harness learnings; #447 branch | final provider/run API and compatibility tests not yet proven | implement v2 seams + journal + Codex provider |

## Current permission boundary

- Granted scope: branch writes inside PR #447 for repository harness/governance only.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, merge, force-push, provider/deployment/production data.
- Human approval required before: merge or any provider/production write.
