# Execution plans

Non-trivial product and engineering work is tracked as versioned work packets.

## Authority discovery

Before selecting work, run `npm run plan:resolve`.

The resolver combines three independent facts instead of trusting whichever page looks newest:

1. `docs/plans/PLAN_AUTHORITY.json` names the current master plan and its explicit predecessor chain;
2. `docs/plans/active/README.md` independently identifies the active master and current agent-executable slice;
3. Git first-parent history verifies the PR that introduced the current master and the board baseline is checked against the actual main/base commit.

If those disagree, task selection fails closed. A newer filename, open PR, modification date or chat message is never enough to replace merged authority.

A future master-plan replacement must update the authority graph and active registry in the same reviewed change. The old plan may remain as historical evidence; the graph records that it was superseded, so adding more plan pages does not make discovery ambiguous.

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

- Resolve plan authority before reading `NOW`/`NEXT` as executable work.
- Complete reconnaissance before proposing architecture.
- Complete required research before finalizing the specification.
- Acceptance criteria must be observable.
- Planning names exact repository boundaries and verification layers.
- Implementation discoveries update the packet; they do not silently rewrite requirements.
- Completed packets preserve why decisions were made and how they were verified.
- A merged/completed child packet cannot remain the current agent-executable active packet.

Do not use this folder as a speculative backlog. GitHub issues hold proposed work;
active packets represent work that has been deliberately started. The active-packet
registry in `docs/plans/active/README.md` is the filename-level authority for what is
currently executing, while `docs/plans/PLAN_AUTHORITY.json` owns master-plan
supersession. Both are checked mechanically by the standard knowledge flow.
