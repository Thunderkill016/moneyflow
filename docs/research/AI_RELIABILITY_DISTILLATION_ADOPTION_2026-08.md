# AI reliability distillation adoption — 2026-08

**Source basis:** user-provided `DISTILLATION.md` dated 2026-08-06, checked against current MoneyFlow repository policy and focused primary/first-party sources on 2026-08-07.

## Decision

Do not add another agent framework, hidden memory store or review model. Apply the useful findings through the repository surfaces MoneyFlow already owns:

1. work packets externalize state, feedback, deletion impact and action safety;
2. changed active packets fail the existing policy test when those fields are missing, unresolved or structurally misplaced;
3. deterministic success and semantic/user-path evidence are recorded separately;
4. bug/new-behavior work records the expected failing signal before accepting green evidence, or explains why red-first is impossible;
5. permission, reversibility, escalation and failure containment are explicit before an agent acts;
6. the gate fails closed when Git cannot prove which active packets changed.

This is intentionally incremental: historical packets are not mass-rewritten. The contract applies when an active packet is created or changed, including committed, staged, unstaged and untracked packet files.

## What was adopted from the supplied distillation

### External state

The model is not the source of durable project truth. A consequential task records:

- where authoritative state lives;
- who or what may write it;
- how changes propagate to the rest of the system.

### Two kinds of feedback

A green build, successful request or `200 OK` proves only that a mechanism returned. Work packets therefore separate:

- **success signal:** deterministic command, exit code or artifact;
- **semantic evidence:** proof that the real user/system outcome is correct.

The checker rejects identical success and semantic signals so one copied sentence cannot satisfy both meanings.

### Removal and rollback understanding

Every changed active packet states what breaks if the change is removed and how rollback is verified. This makes maintainability and ownership reviewable instead of relying on the agent's confidence.

### Red before green

For bugs and new behavior, the packet records the expected failing signal before implementation. This does not force a synthetic failing test for pure documentation/mechanical work; such exceptions must be explained rather than silently skipped. The checker also rejects an expected-failure signal that is identical to the success signal.

### Action safety

Before writes or external actions, the packet records:

- permissions;
- reversibility;
- escalation condition;
- failure containment.

This complements, rather than replaces, the repository's existing permission model.

### Fail-closed scope

A policy gate that cannot determine its changed-file scope must not report success. The checker therefore fails when:

- neither `main` nor `origin/main` is resolvable;
- an explicitly requested base ref does not exist;
- no merge base can be found;
- any committed, staged, unstaged or untracked Git query fails.

The canonical CI checkout already uses `fetch-depth: 0`. The official `actions/checkout` documentation states that this fetches all history for all branches and tags, so the protected policy job is expected to have the base history required by the fail-closed check.

## What was not adopted

- No automatic risk inference from prompt text or filenames.
- No AI judge as acceptance authority.
- No hidden context injection or retrieval service.
- No second task-start command or workflow.
- No requirement to preload this research note in every session.
- No claim that all numerical statements in the supplied synthesis were independently reproduced.

The adoption is based on the actionable structure of the synthesis. Source-specific empirical claims remain bounded by their original evidence.

## External cross-check

- OpenAI states that Codex performs best with repository instructions, configured environments, reliable tests and clear documentation. This supports keeping the contract in repository-owned files and tests.
- OpenAI's internal Codex workflow guidance recommends issue-like task descriptions with explicit paths and persistent repository context. This supports extending the existing work packet rather than relying on free-form prompts.
- Martin Fowler's TDD description defines the red-green-refactor cycle as writing a test, seeing it fail, making it pass and then improving structure. This supports recording the expected failing signal as evidence, while retaining risk-based exceptions.
- The official `actions/checkout` README states that `fetch-depth: 0` fetches all history for all branches and tags. This supports fail-closed branch-base validation in the existing protected policy job.

These sources do not define MoneyFlow's financial semantics, permission scope or merge authority. Those remain project-owned decisions.

## Repository implementation

| Surface | Change |
|---|---|
| `docs/templates/FEATURE_WORK_PACKET.md` | adds the control contract |
| `scripts/work-packet-contract.mjs` | validates the template and changed active packets; fails closed when scope is unavailable |
| `scripts/work-packet-contract.test.mjs` | covers structure, duplicate fields, unresolved values, distinct feedback signals, valid literal angle-bracket syntax and every local Git change state |
| `package.json` | registers `check:work-packets` and runs it explicitly after `test:ci-policy` tests |
| `docs/plans/active/task-bootstrap-cli.md` | first real packet to adopt the contract |

## Verification evidence

- `node --check scripts/work-packet-contract.mjs`: passed in the isolated implementation fixture.
- `node --test scripts/work-packet-contract.test.mjs`: 14/14 passed.
- Synthetic Git coverage includes committed, staged, unstaged and untracked active packets without duplicate paths.
- Missing Git scope and an explicitly invalid base both fail closed.
- Control subsections outside `## Control contract`, duplicate fields, unresolved marker values and copied success/semantic signals fail.
- Legitimate evidence containing inline syntax such as ``<button>`` remains valid; only a whole-field angle-bracket placeholder is unresolved.
- The actual PR #315 control contract passed as one changed active packet against a synthetic `main` base.
- Replacing its semantic evidence with bare `Not applicable` failed with exit code `1`.
- Protected exact-head MoneyFlow CI remains unavailable because GitHub has not produced a workflow run/status for the PR head.

## Removal condition

Remove or redesign the contract if review shows that fields are routinely ceremonial, duplicate existing evidence without improving decisions, or create more task-start friction than the failures they prevent. Do not remove it merely because tests are green; evaluate whether it improves semantic review and task closure.
