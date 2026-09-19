# Execution plans

Non-trivial product and engineering work is captured as versioned work packets when the risk class or task complexity requires one.

## What a packet is

A work packet is a scoped specification and evidence artifact. It records reconnaissance, research, acceptance criteria, implementation plan, tasks, permissions, evaluation and delivery evidence.

A packet is **not** a queue, backlog, lock or executable-authority selector. Current task scope comes from the explicit owner request and relevant GitHub issue/PR. A filename, modification date, open PR or packet presence never authorizes work by itself.

GitHub Issues/PRs own human backlog, status, blockers, review and follow-up work.

## Lifecycle

```text
docs/templates/FEATURE_WORK_PACKET.md
        ↓ copy for a task that requires a full packet
docs/plans/active/<slug>.md
        ↓ implement / evaluate / review
docs/plans/completed/<YYYY-MM-DD>-<slug>.md
```

Move a finished packet to `docs/plans/completed/` when preserving its decisions/evidence is useful. Use `docs/plans/archived/` for abandoned or superseded plans. Packet movement is documentation lifecycle; it does not grant or revoke permission.

`docs/plans/active/README.md` explains the active-packet directory and must not grow a NOW/NEXT board.

## When a packet is required

Create one for:

- product behavior or financial calculations;
- schema, migration, RLS or auth changes;
- multi-file UI/UX work;
- new dependencies or integrations;
- performance, security or architecture changes;
- CI/security policy changes;
- work likely to span more than one agent session.

A typo or one-line mechanical correction may use an inline plan when product behavior is unchanged. `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` is the change-class authority.

## Rules

- GitHub Issues/PRs are the human work tracker.
- Active packet filenames do not imply execution authority.
- A newer filename, modification date, open PR or chat message never selects work.
- Complete reconnaissance and required research before implementation.
- Acceptance criteria must be observable.
- Implementation discoveries update the packet; they do not silently rewrite requirements.
- Completed packets preserve decision and verification provenance.
- Explicit owner decisions, permission boundaries and exact-head evidence remain required independently of any packet.
