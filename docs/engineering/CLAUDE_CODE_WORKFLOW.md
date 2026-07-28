# Claude Code operating workflow

This document defines how Claude Code is used to change MoneyFlow safely and repeatably. It specializes the repository-wide process in [`AI_DELIVERY_WORKFLOW.md`](./AI_DELIVERY_WORKFLOW.md); it does not replace product, architecture, financial, security or delivery sources of truth.

Claude Code is an engineering agent inside a controlled system. It may inspect, plan, implement, test and evaluate, but it does not independently redefine the product, approve its own work, merge a pull request or declare production verified.

## 1. Operating model

```text
Human-approved outcome
        ↓
Repository reconnaissance
        ↓
Task contract / work packet
        ↓
Planning gate
        ↓
Focused implementation
        ↓
Independent evaluation
        ↓
Automated evidence
        ↓
Human merge decision
        ↓
Exact production verification
```

A successful Claude Code session is not measured by how much code it generated. It is measured by whether a bounded outcome was delivered with verifiable evidence and without violating MoneyFlow's product or financial invariants.

## 2. Context architecture

Keep three kinds of context separate.

### Stable project context

Claude Code automatically receives [`CLAUDE.md`](../../CLAUDE.md), which imports [`AGENTS.md`](../../AGENTS.md). These files are concise entrypoints for:

- product and financial laws;
- architecture boundaries;
- required sources of truth;
- repository commands;
- safety and delivery rules.

Do not turn `CLAUDE.md` into a project encyclopedia or a temporary status log. Durable detail belongs in the authoritative document for that subject.

### Task context

Every non-trivial change has one active work packet under `docs/plans/active/`. It contains:

- the user or system outcome;
- current verified behavior;
- acceptance criteria;
- constraints and out-of-scope behavior;
- planned repository changes;
- risks and counterexamples;
- required evidence.

Task context must be updated before implementation scope changes. The implementing agent must not silently reinterpret the specification.

### Evidence context

Completion evidence is produced after implementation:

- actual diff;
- command output and exit status;
- unit, database and browser results;
- screenshots, traces or artifacts for UI work;
- pull request and CI state;
- exact deployed commit and production-flow verification.

Agent summaries are not evidence by themselves.

## 3. Roles and separation of responsibility

### Human owner

- selects the problem worth solving;
- approves the outcome, acceptance criteria and risky trade-offs;
- reviews evidence rather than trusting generated explanations;
- decides whether to merge or deploy.

### Planner

The planner works read-only, normally through:

```bash
claude --permission-mode plan
```

It:

- reads the required project sources;
- inspects current behavior, tests and relevant history;
- classifies the task by risk;
- creates or completes the work packet;
- identifies reusable code and ownership boundaries;
- proposes verification before code is changed.

It does not implement.

### Builder

The builder receives an approved task contract and:

- works on a focused branch;
- implements one small task at a time;
- keeps the diff surgical;
- adds tests or counterexamples with the behavior;
- reports actual changed files and gate results;
- stops when the assigned task is complete.

The builder does not expand scope, merge, deploy or approve itself.

### Evaluator

The evaluator uses `.claude/agents/evaluator.md` in a clean context after implementation. It:

- checks the work packet against the actual diff;
- verifies every acceptance criterion has evidence;
- flags scope creep and missing states;
- checks finance, RLS, accessibility and architecture constraints;
- runs applicable gates independently;
- reports findings without fixing them.

### CI and production systems

CI enforces repeatable contracts. Production verification proves only the exact deployed commit and affected live flow. A successful build cannot substitute for database isolation, browser usability or production behavior.

## 4. Task classification

### Tiny mechanical change

Examples: typo, broken link, one-line safe correction or an obviously stale assertion.

Required flow:

```text
read affected source → short inline plan → edit → proportionate check → diff review → PR
```

A focused branch is still required for repository changes.

### Standard change

Examples: bounded bug fix, component behavior, form flow or multi-file refactor with no schema/security impact.

Required flow:

```text
reconnaissance → acceptance criteria → short work packet → implementation → evaluator → gates → PR
```

### High-risk change

Examples: financial calculation, ledger mutation, database schema, RLS, authentication, import/export, destructive behavior or deployment configuration.

Required flow:

```text
research → formal specification → counterexamples → implementation plan
→ unit/domain tests → database constraints/RLS tests → browser evidence
→ independent evaluation → human gate
```

When uncertain, classify upward.

## 5. Task state machine

Every non-trivial task moves through these states:

```text
discovery → specified → planned → implementing → evaluating
→ ready → merged → production verified → completed
```

Transition rules:

| From | To | Required gate |
|---|---|---|
| discovery | specified | Current behavior and unresolved decisions are documented |
| specified | planned | Acceptance criteria, out-of-scope behavior and constraints are approved |
| planned | implementing | Affected boundaries, tasks, risks and verification are explicit |
| implementing | evaluating | Assigned tasks are complete and local applicable gates have run |
| evaluating | ready | Evaluator finds no blocking defect and every criterion has evidence |
| ready | merged | CI is green and the human owner approves the pull request |
| merged | production verified | Exact deployed commit and affected live flow are checked |
| production verified | completed | Work packet is archived under `docs/plans/completed/` |

Do not jump directly from backlog or discovery to implementation for non-trivial work.

## 6. Standard session workflow

### A. Start on a focused branch

```bash
git switch main
git pull --ff-only
git status
git switch -c feat/<task-slug>
```

Never implement directly on `main`.

### B. Reconnaissance prompt

```text
Read CLAUDE.md and the sources it requires.

For this task, do not edit files yet. Verify current behavior from the repository,
relevant tests and recent history. Classify the task by risk. Create or update the
matching work packet with acceptance criteria, out-of-scope behavior, affected
boundaries, risks and verification. End with unresolved product decisions only;
do not ask questions that repository inspection can answer.
```

The owner approves the task contract before implementation.

### C. Builder prompt

```text
Implement only task <ID> from <work-packet-path>.

Do not implement later tasks, perform drive-by refactors or change acceptance
criteria. Reuse existing boundaries and components. Add the required tests.
After the task, stop and report changed files, actual commands and results,
remaining risk and the updated task status.
```

Inspect after each task:

```bash
git status
git diff --stat
git diff
```

### D. Evaluation

Start the evaluator with a clean context and provide the work packet path. The evaluator must not inherit the builder's assumptions or repair findings itself.

Expected evaluator output:

1. acceptance-criterion table: `pass`, `fail` or `no evidence`;
2. findings ranked P0–P3 with file/line or command evidence;
3. scope-compliance result;
4. actual gate results and unrun gates;
5. final verdict: `Ready to merge` or `Not ready`.

### E. Delivery

The pull request records:

- problem and outcome;
- work packet;
- important decisions and scope limits;
- actual test results;
- browser or screenshot evidence where relevant;
- remaining risks;
- exact production verification steps.

Default to a draft pull request until evaluation and applicable gates are complete.

## 7. Permission policy

Shared project permissions live in `.claude/settings.json`.

Safe read-only and verification commands may be allowlisted to reduce repetitive prompts. Destructive or production-changing commands remain denied or human-gated.

Never run Claude Code with `--dangerously-skip-permissions` for normal MoneyFlow work.

### Always prohibited for the agent

- force-pushing or rewriting shared Git history;
- implementing through direct edits on `main`;
- reading or editing local secrets and committed credential material;
- merging pull requests or deploying production autonomously;
- destructive production database operations;
- disabling, skipping or weakening tests to manufacture a passing result;
- creating no-op commits to retrigger deployment.

### Hooks

`SessionStart` prints compact repository state and the available active work packets.

`PreToolUse` blocks known dangerous actions before the normal permission prompt, including destructive Git commands, writes on `main`, secret-file access and production deployment/database commands.

Hooks enforce hard safety invariants. Product requirements remain in specifications and tests, not shell pattern matching.

## 8. Verification matrix

Use the smallest complete evidence set for the risk involved.

| Change | Minimum evidence |
|---|---|
| Documentation/product truth | `npm run check:knowledge` and affected-link/source review |
| Type/component behavior | lint, typecheck and focused unit/source-contract tests |
| Financial calculation | domain unit tests plus explicit counterexamples |
| Ledger mutation | unit tests, database constraints/RLS tests and browser flow |
| New owned database data | migration, ownership FK/policy, local reset and pgTAP |
| UI hierarchy/form behavior | browser flow, required states, responsive audit and screenshots |
| Auth/configuration | deployment contract plus real callback/config verification |
| Import/export | parser/serializer fixtures, security tests and manual file verification |

The evaluator maps each acceptance criterion to concrete evidence. A criterion with no evidence remains incomplete even when the implementation looks plausible.

## 9. Context and parallelism rules

- Use a fresh session when moving from builder to evaluator.
- Resume an implementation session only when continuing the same approved task.
- Open a new session when the task, ownership boundary or role changes.
- Keep exactly one primary implementation task active per branch.
- Parallel agents may work only on non-overlapping files/boundaries with explicit contracts.
- Do not use multiple agents to generate competing changes in the same ownership area.
- Summarize discoveries into the work packet; do not depend on hidden chat history for continuation.

## 10. Failure and recovery

When a gate fails:

1. preserve the failure output;
2. identify whether it is caused by the current diff, stale baseline or infrastructure;
3. do not weaken the gate;
4. update the work packet if a verified fact changes the plan;
5. fix one root cause at a time;
6. rerun the smallest relevant gate, then the complete applicable set.

When implementation reveals a wrong requirement, stop implementation and return the task to `specified` or `planned`. Requirements are updated before code.

When CI cannot execute, report `no CI evidence`; do not substitute an unrelated Vercel build or a claimed local run.

## 11. Definition of done

A task is not done because Claude generated code, the builder says tests pass or a pull request exists.

It is done only when:

- the actual diff matches the approved work packet;
- all acceptance criteria have concrete evidence;
- no prohibited or out-of-scope behavior was introduced;
- applicable static, domain, database, browser and responsive gates pass;
- UI artifacts are reviewed where applicable;
- the evaluator reports no blocking finding;
- the human owner approves and merges;
- the exact production deployment is verified when production is affected;
- the work packet is archived.

## 12. Workflow maintenance

Review this workflow when Claude Code changes its settings, permission, hook or subagent contracts, or when repeated failures reveal a missing control.

Prefer converting important prose rules into executable tests, scripts, schema constraints or hooks when the rule is deterministic. Keep product judgment and trade-offs under human control.
