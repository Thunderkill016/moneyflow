# MoneyFlow CycleWarden pilot

This directory is a repository-local brownfield pilot for the lightweight CycleWarden Project OS model.

It does not replace MoneyFlow's existing product, architecture, issue, test, or security sources of truth. It summarizes them into a small project-state model so a new coding-agent session can answer four questions without inventing a new direction:

1. What is this project building?
2. What decisions and invariants are already fixed?
3. What task is active now?
4. What work is blocked and why?

## Files

- `project.json` — product mission, target user, foundation stack, invariants, sources, and known unknowns.
- `roadmap.json` — immutable task IDs, dependencies, acceptance criteria, and required evidence.
- `status.json` — current phase, exactly one active task, blockers, unresolved decisions, and the deterministic next result.

## Current result

The active task is `MFVN-003`: implement the bounded Calm Ledger foundation and landing/auth slice from issue #81.

The owner confirmed that all three manual readiness gates passed. The proposed seven-consecutive-day self-use gate was not marked complete; it was explicitly dropped by the owner as unnecessary after real use.

The later redesign slices remain dependency-bound:

```text
MFVN-003 foundation + landing/auth     active
→ MFVN-004 daily flows                 blocked
→ MFVN-005 planning + settings         blocked
→ MFVN-006 cross-device acceptance     blocked
```

A coding agent must complete and verify `MFVN-003` before starting the later slices.

## One-active-task rule

`status.json.activeTaskId` must identify at most one roadmap task whose status is `active`.

A task may become ready or active only when every ID in `dependsOn` has status `done`. A new idea may be recorded as proposed or blocked, but it must not silently replace the active task.

A dropped gate is recorded as `dropped`, not falsely reported as `done`. Later dependencies must be updated explicitly when the owner changes the project contract.

## Pilot value being tested

`AGENTS.md` explains how an agent should work inside the repository. This pilot tests a different responsibility: preserving project-level sequencing and making owner decisions and unfinished dependencies visible across sessions.

The first observed value was preventing an agent from jumping to the broad redesign before real readiness checks. The next test is whether the same state model keeps the redesign itself bounded to one accepted slice at a time.

## Safety

Do not store raw email links, tokens, passwords, session cookies, production secrets, or personal financial data in these files. Manual evidence must use synthetic data and minimal pass/fail metadata.
