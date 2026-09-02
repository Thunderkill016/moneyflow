# Execution plans

Non-trivial product and engineering work is tracked as versioned work packets.

## Authority discovery

Before selecting or resuming executable work, run:

```bash
npm run plan:resolve
npm run agent:doctor -- --json
```

`docs/plans/PLAN_AUTHORITY.json` is the **single machine-readable executable plan authority**. It names:

- one merged master packet;
- zero or one current agent-executable packet;
- the PR that introduced each authority entry;
- the master supersession chain.

Git first-parent history proves whether an `introducedByPr` is merged. A candidate authority in its own PR can validate structurally, but it is not executable until merged history proves it.

The former Markdown Current Work Board at `docs/plans/active/README.md` is retired and kept only as a compatibility pointer. It must not contain `NOW`/`NEXT`, commit baselines, post-merge projections, or a duplicate authority table.

Human backlog, priority, blockers and follow-up work belong in GitHub Issues and pull requests. Active packets hold detailed scope/evidence, not queue ordering.

## Lifecycle

```text
docs/templates/FEATURE_WORK_PACKET.md
        ↓ copy/select via PLAN_AUTHORITY.json
docs/plans/active/<slug>.md
        ↓ implement/evaluate
same PR completes current authority to null
        ↓
docs/plans/completed/<YYYY-MM-DD>-<slug>.md
```

A PR that completes the current executable slice must, in that same PR:

1. declare `Lifecycle impact: completes current slice` in its PR-memory record;
2. change `PLAN_AUTHORITY.json.current` from that packet to `null`;
3. remove the packet from `docs/plans/active/` and archive it under `docs/plans/completed/`;
4. update `docs/research/CURRENT_PROJECT_MEMORY.md` to the resulting truth;
5. **not** select a follow-on current packet.

A separate planning PR from fresh `main` may later select the next packet by setting `PLAN_AUTHORITY.json.current` with the introducing PR number. This avoids hand-maintained SHA baselines and merge-activation markers.

`npm run check:knowledge` enforces these transitions through `scripts/lifecycle-projection.mjs`.

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

- Machine authority is not duplicated in Markdown.
- GitHub Issues/PRs are the human work tracker.
- Active packet filenames do not imply execution authority by themselves.
- A newer filename, modification date, open PR or chat message never selects work.
- Complete reconnaissance and required research before implementation.
- Acceptance criteria must be observable.
- Implementation discoveries update the packet; they do not silently rewrite requirements.
- Completed packets preserve decision and verification provenance.
- Zero current executable slices is valid between work items.
