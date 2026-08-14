# MoneyFlow Codex dispatcher v1

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #375
**Last updated:** 2026-08-14

## Outcome

Create one owner-opt-in local `codex` dispatcher lane: GitHub `/agent codex` commands route through the existing authenticated CLIs into an isolated non-main worktree, persist idempotency locally, and publish only concise status. It grants no new product, provider or production authority.

## Repository reconnaissance

### Current behavior

- `scripts/watch-pr-ci.mjs` uses the owner-authenticated `gh` CLI with Node built-ins and exported parser helpers.
- `npm run agent:doctor -- --json` projects risk/gates but grants no permission.
- The exact #375 base has no dispatcher, task contract or VSCode dispatcher task.

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
- Constraints: no main/provider/production/financial/Auth write and no #374 touch.

### Similar implementation and recent history

- Reuse exported parser/test helpers in `scripts/watch-pr-ci.mjs`.
- Owner-authorised #375 is independent of the active #374 UI worktree.

### Open questions

- [x] Installed `codex-cli 0.147.0` supports `exec`, `--cd`, `--sandbox workspace-write` and `--ask-for-approval never`.
- [x] Current `gh auth status` is invalid; live smoke/push/PR cannot be claimed until re-authenticated.

## Research

### Research scope and source selection

- Decision question: which installed commands safely provide non-interactive Codex execution and GitHub routing?
- Reference map: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget: two first-party installed CLI help surfaces; no external dependency adoption.
- Expected decision: use supported `codex exec` and the existing `gh` session only.

### Questions researched

1. Does the installed Codex CLI expose a supported non-interactive surface?
2. Can `gh` route issue/PR/comment data without a token file?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `codex --help`, `codex exec --help` | Installed first-party CLI | 2026-08-14 | Supported non-interactive controls | Does not prove subscription auth |
| `gh issue view --help`, `gh api --help` | Installed GitHub CLI | 2026-08-14 | Issue/PR/API reads and concise comments use existing auth | Current login is invalid |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Stored GitHub/OpenAI token | Easy headless calls | Secret/billing exposure | Rejected |
| GitHub Actions dispatcher | Always available | Provider/configuration boundary | Rejected |
| Local `gh` + `codex exec` | No new secret, owner opt-in | Local auth prerequisite | Selected |

### Research decision

Observed CLI capability supports the selected shape. The dispatcher revalidates auth/repo/main every cycle and only accepts the authenticated GitHub user's marker. Claude is explicitly deferred; no runtime agent architecture applies.

### Adoption review

Not applicable: no dependency, provider, service or runtime framework is added. The tooling's ignored state is removable with the focused dispatcher files.

## Specification

### Problem

The owner needs to issue a bounded GitHub command to the subscription-authenticated Codex CLI without manual prompt copy/paste or risk to `main`/#374.

### User stories

- As owner, I can opt in to one-shot or watch processing of my `/agent codex` command exactly once.
- As owner, I receive a concise GitHub result while details remain local.

### Acceptance criteria

- [x] `--once` and `--watch` recognize owner-authored `/agent codex` from open issues or PRs.
- [x] Auth, repository identity and exact local/remote `main` agreement gate dispatch.
- [x] Commands derive a non-main branch/worktree and persist suppression across restart.
- [x] Only Codex is enabled; `claude-review` is documented future-only.
- [x] Deterministic mocks cover parsing, suppression, unsafe prereqs, isolation and Codex construction.
- [ ] One bounded real no-product smoke proves transport after auth repair.

### Required states

- Loading: deterministic cycle or named watch interval.
- Empty: zero processed commands.
- Populated: one worktree/local log per new command.
- Validation/error: block before dispatch on auth/repo/base/unknown lane.
- Recovery/undo: new command required after failure; ignored local state/worktree removal requires owner direction.
- Long data / large VND, mobile/tablet/desktop, accessibility: not applicable.

### Financial and security constraints

- No runtime, financial, RLS, schema, Auth, provider or production change.
- No token files or agent output posted to GitHub.
- No merge, force push or direct main write.

### Out of scope

Claude execution/review, server daemon, GitHub Actions, protection/CI changes, #374 changes and automatic startup.

## Implementation plan

### Architecture fit

`scripts/agent-dispatcher/dispatcher.mjs` is local orchestration beside `watch-pr-ci.mjs`, not product runtime. Node built-ins and injected process functions preserve deterministic tests.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/agent-dispatcher/dispatcher.mjs` | Parser, prereqs, state, GitHub scan, worktree/Codex run | One maintainable lane |
| `scripts/agent-dispatcher/dispatcher.test.mjs` | Mocked regression tests | No paid/live test mutation |
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
| Remote main moves | compare `origin/main` to `git ls-remote` |
| Restart repeats work | persisted command id/state test |
| Foreign comment invokes Codex | authenticated-author filter |
| Output discloses secrets | ignored local log; fixed GitHub summary |

### Verification plan

- Static: migrations, knowledge, CI policy, lint, typecheck, build as selected.
- Unit/domain: focused dispatcher test and full script policy suite.
- Database/browser/responsive/production: not applicable except the requested local no-product smoke after valid auth.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Packet/task contract | reconnaissance | registry evidence | done |
| T2 | Failing dispatcher tests | T1 | missing module observed | done |
| T3 | Dispatcher/bootstrap | T2 | focused test green | done |
| T4 | Local gates and review | T3 | focused tests/typecheck/lint pass; baseline suite failures recorded | in_progress |
| T5 | Live smoke, commit/push/draft PR | T4 + valid `gh` auth | exact head/result | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-14 | researcher | planner | specified | local CLI help + #375 | invalid `gh` auth | plan implementation |
| 2026-08-14 | planner | implementer | planned | this packet and worktree | live flow still unproven | test-first implementation |
| 2026-08-14 | implementer | evaluator | evaluating | dispatcher test red/green evidence | local gates/live smoke pending | inspect diff and verify |
| 2026-08-14 | evaluator | implementer | evaluating | focused dispatcher test, lint and typecheck pass; migration/knowledge/CI-policy pass | full unit/browser gates have pre-existing/provider failures; `gh` auth invalid | record honest limits; wait for auth to smoke/publish |

### Current permission boundary

- Granted: `branch_write` for #375 tooling/docs.
- Resources: local MoneyFlow worktree and post-validation GitHub reads/concise comments only.
- Forbidden: main, force-push, protections, CI, provider/production/database/Auth and #374 worktree writes.
- Human approval: merge/deploy or any unlisted provider/production boundary.
- Stop: unsupported Codex exec, ambiguous auth/base, or unguaranteed isolation.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Deterministic dispatcher contract | `npm run test:agent-dispatcher` pass | pass |
| Static type contract | `npm run typecheck` pass | pass |
| Repository migration/knowledge/CI policy | `check:migrations`, `check:knowledge`, CI-policy tests pass | pass |
| Full unit suite | 151 pass, 3 pre-existing failures in CSS/deployment environment gates | blocked outside scope |
| Browser smoke | 25 pass; CAPTCHA provider tests fail because no `captchaToken`; run interrupted | blocked outside scope |
| Live bounded transport | repaired `gh auth status` required | blocked |

### Research and adoption evidence

- Final CLI surface check: pending final review.
- Source limits: installed CLI does not prove auth; respected.
- Adoption review: no dependency/provider adoption.

### Review findings

- Correctness: command parser, prerequisite guard, idempotency and worktree naming have direct deterministic coverage.
- Security/ownership: marker author must equal `gh api user`; detailed output is local and ignored.
- Maintainability: one Node-only module, no package dependency.
- Scope compliance: no product/runtime/schema/Auth/provider/CI workflow change.
- UI/UX/accessibility: not applicable.

### Remaining limitations

Live dispatch, push and draft PR remain blocked by invalid GitHub CLI authentication. The full unit suite also has three failures reproduced on the untouched checkout (`code-css-ownership`, `dead-css-scanner`, `deployment-env-guard`); the browser run's CAPTCHA tests cannot find the expected provider token. Neither is changed by this packet.

## Delivery record

- Branch: `agent/issue-375`.
- PR/CI: pending valid GitHub authentication and exact-head evidence.
- Squash/deployment/production verification: not applicable.
- Packet move: only after owner acceptance.
