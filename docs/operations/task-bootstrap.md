# MoneyFlow task bootstrap CLI

`npm run task:brief` compiles the existing MoneyFlow context router, risk policy and local Git state into one bounded task brief for a human or coding agent.

It exists to reduce repeated repository scanning at the start of a task. It does not replace `AGENTS.md`, the task context router, the risk classifier, a required work packet, code review or CI.

## Why this tool exists

MoneyFlow already has strong source-of-truth documents, but a new agent session still has to choose the correct subset, restate the risk class, inspect the branch and remember the relevant verification gates. Repeating that manually creates two opposite failure modes:

- too much context: old PR history and unrelated domain documents crowd out the current task;
- too little context: the agent misses an invariant, required packet or verification layer.

The CLI keeps the authority in the existing documents and turns them into a small, explicit startup manifest.

## Basic use

```bash
npm run task:brief -- \
  --task "Migrate the Reports workspace" \
  --boundary ui \
  --class 2
```

List the supported aliases:

```bash
npm run task:brief -- --list-boundaries
```

Class 3 work must name the active packet:

```bash
npm run task:brief -- \
  --task "Add an account-closing financial contract" \
  --boundary accounts \
  --class 3 \
  --packet docs/plans/active/account-closing-contract.md
```

## Output modes

The default Markdown output includes:

- task, selected boundary and explicit risk class;
- branch, exact head, dirty state and changed files;
- the minimum starting document list;
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

Write the result to a local file:

```bash
npm run task:brief -- \
  --task "Review CI latency evidence" \
  --boundary ci \
  --class 3 \
  --packet docs/plans/active/ci-system-hardening-2026-08.md \
  --output .tmp/task-brief.md
```

`.tmp/` output is local evidence unless a task explicitly requires a reviewed repository artifact.

## Safety behavior

The command exits with code `3` when startup is blocked, including:

- implementation is being started from `main`;
- a Class 3 task does not supply an existing active work packet;
- required baseline context is missing.

Use `--allow-main` only for read-only reconnaissance. It does not authorize implementation on `main`.

The tool warns, but does not silently decide, when:

- the working tree is dirty;
- a selected boundary commonly requires a higher class than the supplied class;
- a routed reference cannot be found locally;
- Git branch/head state cannot be verified.

Risk class remains an explicit input. The CLI does not infer financial, data, security or operational meaning from filenames or a natural-language prompt.

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

Aliases resolve to rows parsed from `docs/context/README.md`; the CLI does not maintain a second copy of each row's loading and verification guidance.

## Relationship to other tools

- `task:brief` starts and scopes work.
- `ci:status` and `ci:watch` inspect exact-head pull-request checks.
- the candidate CI recovery tool in PR #314 handles stale or unresponsive Actions runs.
- GitHub Actions remains the source of truth for protected checks.

The task bootstrap command never reruns CI, edits packets, creates branches, opens pull requests, changes provider settings or deploys production.

## Verification and maintenance

Focused tests cover argument validation, context-router parsing, alias selection, risk-proportional gate output, main-branch blocking and Class 3 packet enforcement.

The tests are loaded by the existing project-knowledge contract test, because the CLI compiles the project-owned knowledge router rather than application runtime behavior.

When `docs/context/README.md` changes, run:

```bash
npm run test:ci-policy
npm run task:brief -- --list-boundaries
```

Rollback is bounded: remove the npm script, the CLI, its tests and this runbook. No product runtime, database, provider or production state is involved.
