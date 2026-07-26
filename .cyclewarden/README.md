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

The active task is `MFVN-001`: complete the final manual readiness gates tracked by issue #27.

This is not an implementation task for a coding agent. It requires the owner to use:

- an inbox they control for the production email callback;
- a normal spreadsheet application for synthetic CSV verification;
- a physical phone for the transaction-form keyboard check.

CycleWarden must not simulate those checks or mark them complete.

The Calm Ledger redesign in issue #81 is represented as later dependency-bound slices. It is not the next task while issue #27 and the following seven-day self-use period remain incomplete.

## One-active-task rule

`status.json.activeTaskId` must identify at most one roadmap task whose status is `active`.

A task may become ready or active only when every ID in `dependsOn` has status `done`. A new idea may be recorded as proposed or blocked, but it must not silently replace the active task.

## Pilot value being tested

`AGENTS.md` explains how an agent should work inside the repository. This pilot tests a different responsibility: preserving project-level sequencing and making unfinished dependencies visible across sessions.

The concrete value observed in this adoption is that a broad redesign request exists, but the current readiness contract explicitly forbids new feature work. The project-state model makes that constraint visible to `next` selection instead of allowing an agent to follow the newest or largest issue.

## Safety

Do not store raw email links, tokens, passwords, session cookies, production secrets, or personal financial data in these files. Manual evidence must use synthetic data and minimal pass/fail metadata.
