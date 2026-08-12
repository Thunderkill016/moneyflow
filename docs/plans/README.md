# Execution plans

Non-trivial product and engineering work is tracked as versioned work packets.

## Lifecycle

```text
docs/templates/FEATURE_WORK_PACKET.md
        ↓ copy
docs/plans/active/<slug>.md
        ↓ update during work
docs/plans/completed/<YYYY-MM-DD>-<slug>.md
```

Packets that are useful provenance but were superseded, abandoned or never accepted
belong in `docs/plans/archived/`. Archive is deliberately distinct from
`completed/`: it must not imply a merge, deployment or accepted product outcome.

The active packet is the handoff contract between human owner, implementing agent, reviewer and future sessions. Chat history is not a durable source of truth.

## When a packet is required

Create one for:

- product behavior or financial calculations;
- schema, migration, RLS or auth changes;
- multi-file UI/UX work;
- new dependencies or integrations;
- performance, security or architecture changes;
- work likely to span more than one agent session.

A typo or one-line mechanical correction may use an inline plan when product behavior is unchanged.

## Rules

- Complete reconnaissance before proposing architecture.
- Complete required research before finalizing the specification.
- Acceptance criteria must be observable.
- Planning names exact repository boundaries and verification layers.
- Implementation discoveries update the packet; they do not silently rewrite requirements.
- Completed packets preserve why decisions were made and how they were verified.

Do not use this folder as a speculative backlog. GitHub issues hold proposed work;
active packets represent work that has been deliberately started. The active-packet
registry in `docs/plans/active/README.md` is the only filename-level authority for
what is currently executing.
