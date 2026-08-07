# MoneyFlow task bootstrap CLI

`npm run task:brief` compiles the existing MoneyFlow context router, risk policy and local Git state into one bounded task brief for a human or coding agent.

It reduces repeated repository scanning at the start of a task. It does not replace `AGENTS.md`, the context router, risk classification, a required work packet, code review or CI.

## Why this tool exists

MoneyFlow already has strong sources of truth, but each new agent session still has to reconstruct the same startup state: which documents to load, where the affected code lives, what risk class applies, whether the branch is safe and which verification layers matter.

Manual reconstruction creates two opposite failure modes:

- too much context: historical PRs and unrelated domain documents crowd out the current task;
- too little context: the agent misses an invariant, required packet or verification layer.

The CLI keeps authority in the existing documents and turns them into a small, explicit startup manifest.

## Basic use

```bash
npm run task:brief -- \
  --task "Migrate the Reports workspace" \
  --boundary ui \
  --class 2
```

List supported aliases:

```bash
npm run task:brief -- --list-boundaries
```

Class 3 work must name an existing active packet:

```bash
npm run task:brief -- \
  --task "Add an account-closing financial contract" \
  --boundary accounts \
  --class 3 \
  --packet docs/plans/active/account-closing-contract.md
```

`--packet` must stay inside the repository and resolve to a Markdown file under `docs/plans/active/`. A historical/completed packet or an arbitrary existing file does not satisfy the Class 3 requirement.

## Starting sequence

The generated brief preserves the project-owned read order:

1. `AGENTS.md`;
2. `README.md`;
3. affected code, tests and migrations;
4. `docs/research/CURRENT_PROJECT_MEMORY.md`;
5. `docs/context/README.md`;
6. `ARCHITECTURE.md`, product principles and MVP definition;
7. risk-proportional delivery policy;
8. only the references selected by the boundary router.

Class 3 additionally loads the AI delivery workflow, agent operating model and supplied active packet. This command does not preload PR history.

## Output modes

The default Markdown output includes:

- task, selected boundary and explicit risk class;
- branch, exact head, dirty state and changed files;
- the ordered startup sequence;
- the selected row from `docs/context/README.md`;
- planning and verification requirements;
- blocking errors, warnings and owner boundaries;
- a ready-to-use prompt for Codex, Claude Code or another coding agent.

Machine-readable JSON:

```bash
npm run task:brief -- \
  --task "Audit import retry behavior" \
  --boundary import \
  --class 3 \
  --packet docs/plans/active/import-retry.md \
  --format json
```

Prompt-only output:

```bash
npm run task:brief -- \
  --task "Repair one bounded UI regression" \
  --boundary ui \
  --class 2 \
  --format prompt
```

Write the result to a repository-local file:

```bash
npm run task:brief -- \
  --task "Review CI latency evidence" \
  --boundary ci \
  --class 3 \
  --packet docs/plans/active/ci-system-hardening-2026-08.md \
  --output .tmp/task-brief.md
```

`--output` cannot escape the repository root. `.tmp/` output remains local evidence unless the task explicitly requires a reviewed repository artifact.

## Git base truth and freshness

The task brief does not fetch from the network. It compares against refs already present in the checkout and prints the selected base so the scope is auditable.

For the default `main` comparison:

1. use `origin/main` when that fetched remote-tracking ref exists;
2. otherwise fall back to local `main`;
3. if neither can produce a merge base, emit a visible warning instead of claiming an empty committed diff.

This matters because local `main` does not automatically advance when the remote branch changes. A stale local `main` can make files already merged upstream appear to belong to the current task. `origin/main` is normally the better local representation of fetched merged truth, but it is only as fresh as the last `git fetch`.

When server-fresh merged truth matters, fetch before running the brief. The command intentionally does not hide network/authentication work inside task startup.

The work-packet checker follows the same default preference. An explicitly supplied packet `--base <ref>` remains exact and is not silently rewritten to another ref.

## Work-packet reliability contract

The task-start command validates that Class 3 points to a real active packet. A separate repository check validates the content of the canonical template and every active packet changed by the branch:

```bash
npm run check:work-packets
```

Changed active packets must resolve four external control sections:

- **State:** authoritative location, writer/owner and propagation path;
- **Feedback:** expected failing signal, deterministic success signal and semantic/user-path evidence;
- **Removal impact:** what breaks if removed and how rollback is verified;
- **Action safety:** permissions, reversibility, escalation and failure containment.

The check rejects missing or empty fields plus unresolved `TODO`, `TBD`, `unknown` and angle-bracket placeholders. Historical packets are not mass-rewritten; they adopt the contract when next changed.

A green build or successful request is not semantic evidence by itself. For bugs and new behavior, record the expected failing signal before accepting green evidence, or explain why red-first is impossible for that task type.

## Risk-proportional verification

Risk class is an explicit input. The command does not infer financial, data, security or operational meaning from filenames or natural-language task text.

The brief separates always-required commands from conditional evidence. Examples:

- Class 1 does not automatically require deployment or architecture contracts unless those boundaries change;
- Class 2 requires browser smoke, while CSS ownership and the cross-device UI audit apply only to presentation, layout, shared-component or audit-contract changes;
- Class 3 selects database, browser, responsive and production evidence according to the actual changed boundary.

The generated plan is a startup aid, not proof that a selected command ran.

## Safety behavior

The command exits with code `3` when startup is blocked, including:

- implementation is being started from `main`;
- Class 3 lacks an existing active work packet;
- a packet or output path escapes repository ownership;
- required authority documents are missing.

Use `--allow-main` only for read-only reconnaissance. It does not authorize implementation on `main`.

The tool warns, but does not silently decide, when:

- the working tree is dirty;
- a selected boundary commonly reaches a higher risk class;
- a routed reference cannot be found locally;
- Git branch/head state cannot be verified;
- the selected base cannot produce a committed comparison.

## Boundary aliases

| Alias | Project-owned route |
|---|---|
| `product` | Product scope/current status |
| `ledger` | Ledger, transactions, transfers, splits |
| `accounts` | Accounts/reconciliation |
| `planning` | Budgets/recurring/goals |
| `reports` | Reports/export |
| `import` | Import/Inbox/rules |
| `auth` | Auth/provider/security |
| `ui` | UI/mobile/accessibility |
| `tooling` | Architecture/dependency/tooling |
| `ci` | CI/deployment/performance |
| `brand` | Brand/landing |

Aliases resolve to rows parsed from `docs/context/README.md`. Tests verify every alias against the current router so a renamed route fails visibly instead of silently drifting.

## Relationship to other tools

- `task:brief` starts and scopes work.
- `check:work-packets` verifies externalized task decisions.
- `ci:status` and `ci:watch` inspect exact-head pull-request checks.
- PR #314 owns stale or unresponsive Actions recovery.
- GitHub Actions remains the source of truth for protected checks.

The task bootstrap command never runs tests automatically, reruns CI, edits packets, creates branches, opens pull requests, changes provider settings, merges or deploys.

## Verification and maintenance

Focused tests cover:

- argument and Class 0 parsing;
- router-table parsing and every current alias;
- risk-proportional required versus conditional gates;
- main-branch blocking;
- Class 3 packet ownership;
- repository path containment;
- mandatory read order and Class 3 operating-model context;
- missing semantic evidence and unresolved work-packet fields;
- permissions, reversibility, escalation and failure containment;
- committed, staged, unstaged and untracked active-packet discovery;
- default `origin/main` preference when local `main` is stale;
- exact preservation of an explicit packet base.

The test files are registered directly in `npm run test:ci-policy`.

When `docs/context/README.md`, the authority read order, risk policy, packet contract or base-selection semantics change, run:

```bash
npm run test:ci-policy
npm run check:work-packets
npm run task:brief -- --list-boundaries
```

Rollback is bounded: remove the npm scripts, CLI, contract checker, tests and runbook/template changes. No product runtime, database, provider or production state is involved.
