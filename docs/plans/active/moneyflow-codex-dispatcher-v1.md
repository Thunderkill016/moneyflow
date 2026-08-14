# MoneyFlow Codex dispatcher hardening v1.1

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #379 / draft PR pending (supersedes the merged #377 implementation)
**Last updated:** 2026-08-14

## Outcome

Harden the merged owner-opt-in local `codex` dispatcher lane before further autonomous delivery. A command must retain its identity when unrelated source prose changes, reject Markdown examples, bind its base immediately before isolated worktree creation, and launch with local enforcement for no-main, no-merge and no-force-push. The dispatcher remains local-only, owner-started and grants no product, provider or production authority.

## Repository reconnaissance

### Current behavior

- `scripts/watch-pr-ci.mjs` uses the owner-authenticated `gh` CLI with Node built-ins and exported parser helpers.
- `npm run agent:doctor -- --json` projects risk/gates but grants no permission.
- `main@dd735700731c9718f8d2ae8e62488e35df87d859` contains the merged #377 dispatcher.
- The current implementation hashes the whole source body into body-command identity, scans markers line-by-line without Markdown context, and carries one cycle-level base validation into later worktree creation.
- GitHub review comment `5291210480` could not be read in this environment because `api.github.com` is unavailable; its four findings supplied by the owner are the acceptance source for this packet.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/watch-pr-ci.mjs` | Local `gh` wrapper convention | Reuse Node-only boundary pattern |
| `scripts/agent-policy.mjs` | Existing authority projection | Reuse, do not duplicate |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Handoff-policy owner | Extend concisely |
| `docs/plans/active/README.md` | Execution registry | Register packet |

### Existing tests and constraints

- Related unit tests: `scripts/watch-pr-ci.test.mjs`, `scripts/agent-doctor.test.mjs`.
- Database/RLS and browser tests: not directly applicable; no product/schema path.
- Constraints: no main/provider/production/financial/Auth write, no boot persistence or credential storage, and no #374 touch.

### Similar implementation and recent history

- Reuse exported parser/test helpers in `scripts/watch-pr-ci.mjs`.
- Owner-authorised #379 is independent of the active #374 UI worktree.

### Open questions

- [x] Installed `codex-cli 0.147.0` supports `exec`, `--cd` and `--approve-for-me`; the latter selects its workspace-write sandbox and cannot be combined with `--sandbox`.
- [x] `gh auth status` is authenticated as the owner; live smoke can use the existing session without a token file.
- [x] `codex exec --help` confirms the supported `workspace-write` sandbox surface; it does not expose a built-in Git branch/merge/push allowlist, so the dispatcher must add a local process guard.

## Research

### Research scope and source selection

- Decision question: how can the local dispatcher enforce its Git safety boundary without persisted credentials, privileged installation or provider changes?
- Reference map: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget: two first-party installed CLI help surfaces; no external dependency adoption.
- Expected decision: use supported `codex exec` and the existing `gh` session only.

### Questions researched

1. Does the installed Codex CLI expose a supported non-interactive surface?
2. Can `gh` route issue/PR/comment data without a token file?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `codex exec --help` | Installed first-party CLI | 2026-08-14 | Supports `workspace-write` sandbox but no Git-operation allowlist | Does not prove subscription auth or independently constrain Git |
| `gh auth status`, `gh api --help` | Installed GitHub CLI | 2026-08-14 | Issue/PR/API reads and concise comments use existing owner auth | Does not grant provider or production access |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Stored GitHub/OpenAI token | Easy headless calls | Secret/billing exposure | Rejected |
| GitHub Actions dispatcher | Always available | Provider/configuration boundary | Rejected |
| Local `gh` + `codex exec` plus per-run Git/gh guard | No new secret, retains owner opt-in and branch delivery | Guard is local process enforcement, not a hostile-host sandbox | Selected |

### Research decision

Observed CLI capability supports a local, owner-started shape but does not supply a Git allowlist. The dispatcher will validate exact `main` immediately before every worktree creation and run Codex through a per-command local guard that rejects direct Git main/merge/force-push operations and `gh pr merge`; its controlled environment clears token variables. The guard narrows ordinary agent execution but cannot defend against a malicious process deliberately bypassing its inherited PATH, so repository protection and owner review remain independent controls. Claude is explicitly deferred; no runtime agent architecture applies.

### Adoption review

Not applicable: no dependency, provider, service or runtime framework is added. The tooling's ignored state is removable with the focused dispatcher files.

## Specification

### Problem

The owner needs to issue a bounded GitHub command to the subscription-authenticated Codex CLI without manual prompt copy/paste or risk to `main`/#374.

### User stories

- As owner, I can opt in to one-shot or watch processing of my top-level `/agent codex` command exactly once, even when I later edit unrelated issue/PR prose.
- As owner, I receive a concise GitHub result while details remain local.

### Acceptance criteria

- [ ] An unrelated body edit does not redispatch the same body marker, while an explicit marker-note change remains a new command.
- [ ] Only a top-level standalone marker executes; fenced, blockquoted and prose examples do not.
- [ ] Exact local/remote `main` agreement is repeated immediately before each worktree creation and its fresh SHA is the worktree base.
- [ ] The launched process uses a local guard that blocks `git` main/merge/force-push and `gh pr merge`, and does not inherit GitHub token variables.
- [ ] Deterministic regression tests cover all four findings, prior duplicate suppression, isolated worktrees, concise summaries and owner-only filtering.
- [ ] One bounded real read-only smoke routes a new owner marker end-to-end without product/provider/production mutation.

### Required states

- Loading: deterministic cycle or named watch interval.
- Empty: zero processed commands.
- Populated: one worktree/local log per new command.
- Validation/error: block before dispatch on auth/repo/base/unknown lane; ignore non-command Markdown context; refuse a changed base before worktree creation.
- Recovery/undo: new command required after failure; ignored local state/worktree removal requires owner direction.
- Long data / large VND, mobile/tablet/desktop, accessibility: not applicable.

### Financial and security constraints

- No runtime, financial, RLS, schema, Auth, provider or production change.
- No token files or agent output posted to GitHub.
- No merge, force push or direct main write; enforce these ordinary Git/GitHub CLI paths through the local launched-process guard rather than prompt text alone.

### Out of scope

Claude execution/review, server daemon, GitHub Actions, protection/CI changes, #374 changes, automatic startup, credential storage and privileged installation.

## Implementation plan

### Architecture fit

`scripts/agent-dispatcher/dispatcher.mjs` is local orchestration beside `watch-pr-ci.mjs`, not product runtime. Node built-ins and injected process functions preserve deterministic tests.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/agent-dispatcher/dispatcher.mjs` | Stable command identity, Markdown-aware discovery, per-worktree base revalidation and guarded Codex launch | Keep the boundary in its existing owner-only lane |
| `scripts/agent-dispatcher/dispatcher.test.mjs` | Deterministic regressions for all four review findings | No paid/live mutation in tests |
| `docs/plans/active/moneyflow-codex-dispatcher-v1.md` | Current work packet and evidence | Required Class 3 handoff state |
| `package.json`, `.vscode/tasks.json`, `.gitignore` | Opt-in entrypoints and ignored state | Safe bootstrap |
| `docs/templates/AGENT_TASK.md` | Seven-section contract | Compact handoff |
| workflow/active packet/PR memory | Protocol and delivery evidence | Required lifecycle |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility: local tooling only.
- Rollback: delete focused tooling; ignored state is never committed.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Invalid `gh` login dispatches work | fail-closed prerequisite test |
| Unrelated body edit redispatches | stable body source key plus regression cycle |
| Markdown example dispatches | reject fenced, blockquoted and prose candidates before parsing |
| Remote main moves after cycle validation | revalidate exact main immediately before each worktree and use only that SHA |
| Agent tries ordinary forbidden Git/GitHub command | per-run guard rejects main, merge, force-push and PR merge; clear token variables |
| Restart repeats work | persisted command id/state test |
| Foreign comment invokes Codex | authenticated-author filter |
| Output discloses secrets | ignored local log; fixed GitHub summary |
| One issue endpoint is temporarily unreadable | skip that source, report it locally, and continue only with independently validated sources |

### Verification plan

- Static: `check:migrations`, `check:knowledge`, CI-policy tests, lint, typecheck and build (selected for executable tooling).
- Unit/domain: focused dispatcher test and full script policy suite.
- Database/browser/responsive/production: database/browser surfaces are not applicable because no product, schema or UI path changes; the doctor’s no-diff fail-safe selection will be superseded by the actual changed-file plan.
- Provider: read-only exact-head required-check lookup after draft PR; report unavailable rather than treating it as green.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Update Class 3 packet and confirm review scope | #379 task source | current state and stop conditions | done |
| T2 | Add failing tests for identity, Markdown, fresh-base and launch guard | T1 | focused RED output | done |
| T3 | Implement the minimum dispatcher hardening | T2 | focused GREEN output | done |
| T4 | Evaluate against acceptance and selected local gates | T3 | exact command evidence | blocked: unrelated repository gate failures |
| T5 | Safe read-only smoke, focused commit/push/draft PR and provider reads | T4 | smoke + draft PR or reported external limitation | in progress: draft allowed with the known local-gate blocker recorded honestly |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-14 | researcher | planner | specified | local CLI help + #375 | invalid `gh` auth | plan implementation |
| 2026-08-14 | planner | implementer | planned | this packet and worktree | live flow still unproven | test-first implementation |
| 2026-08-14 | implementer | evaluator | evaluating | dispatcher test red/green evidence | local gates/live smoke pending | inspect diff and verify |
| 2026-08-14 | evaluator | implementer | delivery | fixed result-stdout extraction, CLI flag incompatibility and per-source read isolation via red/green tests; owner GitHub auth confirmed; #376 smoke completed in a clean isolated worktree | full unit/browser gates have pre-existing/provider failures | run final local gates, commit and publish draft PR |
| 2026-08-14 | implementer | evaluator | draft_pr | draft #377 from `agent/issue-375`; bounded PR-memory record | exact-head provider checks and owner review pending; baseline full-suite/CAPTCHA limits remain | inspect exact head and resolve only actionable review/gate findings |
| 2026-08-14 | owner task source | implementer | planned | #379 four review findings, current `main@dd735700` and this packet | review API unavailable; no hostile-host sandbox is available | add focused failing regressions |
| 2026-08-14 | implementer | evaluator | evaluating | deterministic RED/GREEN for all four findings; focused dispatcher suite 20/20 passes, including real child-process environment propagation; Enterprise token-variable regression added from installed `gh help environment` | selected static/policy gates, provider reads and a real authenticated smoke remain unverified | run exact changed-tree local gates and acceptance review |
| 2026-08-14 | evaluator | implementer | remediation | found that `defaultRun` dropped the guarded environment before the actual Codex process; added a failing child-process regression, then forwarded `env` to `spawnSync` and reran focused tests 20/20 | full repository unit gate remains red outside dispatcher scope | complete draft delivery with limitation recorded |
| 2026-08-14 | evaluator | owner | evaluating | migrations, knowledge, CI policy and dispatcher tests pass; lint/typecheck reached cleanly; independent acceptance/diff review completed | `npm run verify:prepush` stops at three unrelated repository tests; a fresh build stayed in compilation with no completion and was interrupted; GitHub API/auth unavailable | repair or waive repository-wide gates, then rerun before commit/publish |

### Current permission boundary

- Granted: `branch_write` for #379 dispatcher tooling/docs and one draft PR.
- Resources: local MoneyFlow worktree and post-validation GitHub reads/concise comments only.
- Forbidden: main, merge, force-push, protections, CI, provider/production/database/Auth, credential storage, privileged OS changes and #374 worktree writes.
- Human approval: merge/deploy or any unlisted provider/production boundary.
- Stop: unsupported Codex exec, ambiguous auth/base, or unguaranteed isolation.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| #379 deterministic dispatcher regressions | focused dispatcher suite: 20/20 pass, including runtime `env` propagation | pass |
| Static and policy contract | migrations, knowledge and CI-policy tests pass; lint/typecheck pass with three existing warnings; full `verify:prepush` does not complete | blocked: 151/154 unit pass; ownership/dead-CSS/deployment guard test failures are outside this diff |
| Safe read-only transport | `agent:dispatch --once --repo owner/repo` | blocked: fails closed at GitHub authentication; no worktree or comment created |

### Research and adoption evidence

- Installed Codex CLI confirms sandbox support but no built-in Git command allowlist; local guard is therefore required.
- Source limits: installed CLI does not prove auth; respected.
- Adoption review: no dependency/provider adoption.

### Review findings

- Correctness: stable body IDs include the marker note, Markdown examples are ignored, and fresh `main` validation supplies the worktree SHA; deterministic tests cover each case.
- Security/ownership: launched Codex receives a guard-first `PATH` and no documented GitHub token variable; `defaultRun` forwards that environment to the actual child process. The guard blocks ordinary `git` main/merge/force-push and `gh pr merge` paths; direct absolute-binary bypass remains outside its stated threat model.
- Maintainability: the launcher is per-command in ignored dispatcher state; tests inject process functions and do not call paid services.
- Scope compliance: exact diff is limited to dispatcher tooling/tests and delivery packet/registry; no runtime, financial, schema/RLS, Auth, workflow, provider or production file changed.
- UI/UX/accessibility: not applicable.

### Remaining limitations

GitHub’s review/provider API is currently unreachable from this environment, so the post-hardening authenticated smoke and draft-PR provider evidence cannot run. The local process guard is defense in depth for normal Codex execution, not a security boundary against a malicious process that deliberately bypasses its inherited PATH; provider branch protections and owner review remain required. The selected local pre-push gate is also not green: its 151/154 unit result contains the existing CSS ownership, dead-CSS and deployment-environment guard test failures; a separately started `npm run build` did not progress past compilation and was interrupted.

## Delivery record

- Branch: `agent/dispatcher/issue-379-9401a588`.
- PR/CI: draft PR pending; exact-head provider evidence pending after publication.
- Squash/deployment/production verification: not applicable.
- Packet move: only after owner acceptance.
