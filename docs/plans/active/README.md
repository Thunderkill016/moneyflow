# MoneyFlow — active plan packets

**Status:** packet directory, not a queue or authority source

Files in this directory are scoped work packets for non-trivial tasks. They may describe work that is active, paused, under review or historical-but-not-yet-archived; their presence or ordering does not select executable work.

Current task status and backlog live in GitHub Issues/PRs. Execution scope comes from the explicit owner task plus the applicable permission rules in `AGENTS.md` and `docs/engineering/AGENT_OPERATING_MODEL.md`.

Do not add a NOW/NEXT table, commit-baseline selector, post-merge projection or other parallel project-management state here. When a packet is finished and worth retaining, move it to `docs/plans/completed/`; superseded/abandoned packets belong in `docs/plans/archived/`.
