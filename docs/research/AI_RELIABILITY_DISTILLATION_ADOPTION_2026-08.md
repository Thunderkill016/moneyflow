# AI reliability distillation adoption — 2026-08

**Source basis:** user-provided `DISTILLATION.md` dated 2026-08-06, checked against current MoneyFlow repository policy and focused primary/first-party sources on 2026-08-07.

## Decision

Do not add another agent framework, hidden memory store or review model. Apply the useful findings through the repository surfaces MoneyFlow already owns:

1. work packets externalize state, feedback, deletion impact and action safety;
2. changed active packets fail the existing policy test when those fields are missing or unresolved;
3. deterministic success and semantic/user-path evidence are recorded separately;
4. bug/new-behavior work records the expected failing signal before accepting green evidence, or explains why red-first is impossible;
5. permission, reversibility, escalation and failure containment are explicit before an agent acts.

This is intentionally incremental: historical packets are not mass-rewritten. The contract applies when an active packet is created or changed.

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

### Removal and rollback understanding

Every changed active packet states what breaks if the change is removed and how rollback is verified. This makes maintainability and ownership reviewable instead of relying on the agent's confidence.

### Red before green

For bugs and new behavior, the packet records the expected failing signal before implementation. This does not force a synthetic failing test for pure documentation/mechanical work; such exceptions must be explained rather than silently skipped.

### Action safety

Before writes or external actions, the packet records:

- permissions;
- reversibility;
- escalation condition;
- failure containment.

This complements, rather than replaces, the repository's existing permission model.

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

These sources do not define MoneyFlow's financial semantics, permission scope or merge authority. Those remain project-owned decisions.

## Repository implementation

| Surface | Change |
|---|---|
| `docs/templates/FEATURE_WORK_PACKET.md` | adds the control contract |
| `scripts/work-packet-contract.mjs` | validates the template and active packets changed from the branch base |
| `scripts/work-packet-contract.test.mjs` | covers missing semantic evidence, unresolved placeholders and action-safety fields |
| `package.json` | registers `check:work-packets` and the contract under `test:ci-policy` |
| `docs/plans/active/task-bootstrap-cli.md` | first real packet to adopt the contract |

## Removal condition

Remove or redesign the contract if review shows that fields are routinely ceremonial, duplicate existing evidence without improving decisions, or create more task-start friction than the failures they prevent. Do not remove it merely because tests are green; evaluate whether it improves semantic review and task closure.
