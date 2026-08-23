# #447 — Agent harness v2

**Status:** completed implementation; merge pending owner decision
**Execution state:** ready_for_review
**Change class:** Class 3 — agent execution/security/governance boundary
**Active role:** evaluator / owner handoff
**Permission scope:** branch_write only; no provider, deployment, production-data or main-branch write occurred
**Owner:** human owner
**Issue/PR:** #446 / #447
**Projected completion:** 2026-08-23

## Outcome

Replace MoneyFlow's monolithic local Codex dispatcher with a small provider-neutral harness whose run lifecycle is reconstructable from append-only events, whose provider capabilities are explicit, and whose execution/permission ownership fails closed. Preserve the repository's exact-main worktree isolation and Git/GitHub security boundaries while making Codex one replaceable provider rather than the loop itself.

This packet is archived in PR #447 as a same-PR completion projection. The implementation is not shipped until the owner merges #447.

## Repository reconnaissance

The replaced v1 runtime combined GitHub source discovery, command parsing, mutable `state.json`, worktree creation, permission wiring, Codex execution, logging and summary posting in one dispatcher and hard-coded `codex` as the only lane. The v1 command guard already carried important security behavior and was treated as an invariant to preserve rather than redesign away.

Existing `agent-policy`, `agent-doctor`, `plan-*` and lifecycle authority modules remain the repository authorities. Harness v2 consumes them instead of creating a second policy system.

## Research

### Decision question

Which DeepSeek Harness architecture patterns improve MoneyFlow's local agent harness without importing a developer-preview framework or weakening MoneyFlow-specific safety boundaries?

### Sources and applicability

- Official DeepSeek Harness architecture/reference: thin/swappable coordination, capability seams, event-sourced sessions and owned plugin/effect lifecycle.
- Official DeepSeek Harness tools/subagent/workflow material: fail-loud capability negotiation and holder-owned run cleanup.
- Official DeepSeek Harness sandbox/approval material: policy/approval should be an independent boundary rather than provider-specific business logic.
- Official Node.js child-process documentation: a termination signal does not guarantee process exit, supporting bounded SIGTERM → SIGKILL escalation during owned-run disposal.

DeepSeek Harness/Cordis itself, dynamic self-modification, unrestricted agent swarms and provider/production writes were explicitly not adopted.

## Specification

### Accepted behavior

- `npm run agent:dispatch` and `agent:dispatch:watch` use `scripts/agent-harness/cli.mjs`.
- Source, workspace, permission and agent implementations are registered behind named capability seams.
- Unknown, duplicate, under-capable or unready providers fail loudly; there is no silent provider fallback.
- Codex is one named agent provider.
- Accepted command lifecycle is persisted as append-only JSONL with contiguous replayable sequence numbers.
- Terminal/dedup/interrupted state derives from the journal rather than mutable v2 state.
- Accepted but non-terminal history projects as interrupted and is not automatically replayed.
- Legacy `.agent-dispatcher/state.json` identities migrate fail-closed and idempotently so old completed/failed/running commands are not rediscovered as unseen work.
- Provider execution returns an owned handle with `result`, `cancel` and `dispose`; cancellation escalates from SIGTERM to SIGKILL when needed.
- One bad/unknown provider command cannot starve another valid command in the same polling cycle.
- Fresh remote `main` is revalidated immediately before isolated worktree creation.
- GitHub tokens are stripped from the child environment; Git/GitHub operations remain behind the preserved command guard.
- Detailed agent output remains local/private; GitHub receives concise status only.

### Security boundaries

The regression matrix preserves no-main-control, no merge/rebase/pull, no force/refspec push, no remote mutation, no hook bypass/amend, no token disclosure, no `gh api`, no issue/PR mutation except bounded draft PR creation, and no run cancel/rerun/delete. Draft PR creation is constrained to the current isolated branch and `main` base.

No provider, production-data, financial, schema/RLS or deployment write capability is introduced.

## Implementation plan

```text
CLI / serial polling consumer
        |
        v
thin harness coordinator
        |
        +--> source/github
        +--> workspace/local
        +--> permission/guarded
        +--> agent/<named provider>  -> codex today
        |
        v
append-only RunJournal
```

Key implementation areas:

- `scripts/agent-harness/context.mjs`
- `scripts/agent-harness/journal.mjs`
- `scripts/agent-harness/legacy-migration.mjs`
- `scripts/agent-harness/providers.mjs`
- `scripts/agent-harness/runtime.mjs`
- `scripts/agent-harness/cli.mjs`
- `scripts/agent-harness/command-guard.mjs`
- corresponding harness/security tests
- `package.json` runtime/test entrypoints
- CI classifier and durable agent operating documentation

The old `scripts/agent-dispatcher/*` executable implementation has been removed. `.agent-dispatcher/` remains ignored only as a local legacy-state migration input.

## Tasks

| ID | Result | Status |
|---|---|---|
| T1 | capability context + conflict/missing-provider behavior | completed |
| T2 | append-only run journal + replay/corruption/interruption projection | completed |
| T3 | GitHub/workspace/permission/Codex providers | completed |
| T4 | thin runtime + serial polling + owned run lifecycle | completed |
| T5 | fail-closed legacy-state migration | completed |
| T6 | full v1 Git/GitHub security regression matrix port | completed |
| T7 | remove legacy dispatcher as a second state machine and obsolete test alias | completed |
| T8 | update operating docs + projected memory/PR record | completed |
| T9 | exact-head Class 3 verification and owner handoff | in progress; repository content is now in handoff shape |

## Verification plan

Final owner handoff requires exact-head:

- project knowledge + lifecycle projection + CI-policy contracts;
- harness/context/journal/migration/provider/runtime/security tests;
- static RLS, lint, typecheck and production build;
- fresh database/pgTAP plus archive producer/restore round trip;
- Browser smoke and Cross-device UI audit selected by Class 3 policy;
- CodeQL and Secret History.

Earlier-head diagnostics are historical after this archive mutation.

## Evaluation

### Findings resolved

- Mutable `state.json` is no longer v2 lifecycle authority.
- Codex is no longer a hard-coded lane in the coordinator.
- Crash/interruption ambiguity is fail-closed rather than silently retried.
- Upgrade from v1 does not forget prior command identities.
- Capability/readiness negotiation occurs before accepted-work/workspace side effects.
- Owned child cleanup is bounded instead of waiting indefinitely after SIGTERM.
- One malformed/unsupported provider command is isolated from other queued commands.
- The complete old command-guard matrix remains machine-tested.
- The old dispatcher executable/test surface is removed, preventing two independent state machines.

### Remaining boundary

Exact-head Class 3 provider checks must be green before this projection is handed to the owner as merge-ready. Merge itself remains owner-only and will be the transition from this projected `ready_for_review` state to shipped repository truth.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-23 | implementer/evaluator | human owner | ready_for_review projection | PR #447 diff; harness/security contracts; exact-head provider checks selected | final exact-head checks must finish green | owner may decide merge only after green evidence |

## Rollback

Revert PR #447. That restores the deleted v1 dispatcher together with its package entrypoint; the migration deliberately does not delete `.agent-dispatcher/state.json`, so original local legacy data remains available. Task selection continues to fail closed on stale authority rather than guessing.