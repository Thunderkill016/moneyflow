# Agent harness owner-opt-in auto-merge

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write; GitHub pull-request merge only after the owner-authored opt-in and the stated exact-head checks
**Owner:** human owner
**Issue/PR:** user-directed operational slice / PR pending
**Last updated:** 2026-08-25

## Outcome

An owner can put `/agent codex --automerge` at the first substantive line of an
open GitHub issue or PR. The local harness may complete the bounded run, find
only the draft PR created from that run's isolated branch, and squash-merge it
only when a fresh GitHub read proves the same head, unchanged `main`, clean
review threads and all selected checks have succeeded. Every other state stops
without merge or retry.

## Repository reconnaissance

### Current behavior

- `scripts/agent-harness/runtime.mjs` starts a guarded Codex worker from an
  owner-authored marker and records an append-only run journal.
- `scripts/agent-harness/command-guard.mjs` intentionally limits the child to
  a draft PR and blocks `gh pr merge`, main-branch control and force-push.
- The host has no merge capability. The board and project memory currently say
  no merge authority is granted to the harness.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/agent-harness/providers.mjs` | GitHub, workspace and Codex seams | extend with a host-only delivery provider |
| `scripts/agent-harness/runtime.mjs` | owns run state and worker lifecycle | invoke delivery only after a successful run |
| `scripts/agent-harness/command-guard.mjs` | protects the child process | retain all child restrictions |
| `scripts/agent-harness/*.test.mjs` | capability and runtime contracts | add fail-closed unit coverage before code |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | permission and handoff contract | update only if merged truth changes |

### Existing tests and constraints

- Related unit tests: `providers.test.mjs`, `runtime.test.mjs`,
  `command-guard.test.mjs`.
- Product/architecture rules: one isolated non-main branch; no force-push;
  squash only; exact-head checks; no direct `main` writes; no provider or
  production-data access.

### Open questions

- [x] GitHub supports an atomic expected-head merge mutation.
- [ ] Repository policy must identify which checks are sufficient for an
  automated merge without accepting a skipped required job.

## Research

### Research scope and source selection

- Decision question: which GitHub-supported operation closes the race between
  eligibility inspection and a squash merge?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget: two official GitHub sources plus the repository operating
  contract.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| GitHub GraphQL Pull requests reference | primary API documentation | 2026-08-25 | `mergePullRequest` accepts `expectedHeadOid` and `SQUASH`. | Does not decide MoneyFlow's checks or review policy. |
| GitHub REST Pull request merge reference | primary API documentation | 2026-08-25 | a supplied head SHA rejects a changed head rather than merging it. | Does not validate review threads by itself. |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | repository operating contract | 2026-08-25 | a run's child receives no merge permission; a human owner or approved policy controls merge. | Requires a narrow local policy implementation. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Enable GitHub auto-merge immediately | GitHub waits for CI | may merge after a later unresolved thread or state change | reject |
| Let guarded child call `gh pr merge` | simple | breaks isolation/token boundary | reject |
| Host direct squash merge with exact head after fresh eligibility reads | preserves isolation and closes head race | must fail closed on every incomplete fact | select |

### Research decision

The host, never the child, owns delivery. The host uses a fresh PR read and an
atomic squash merge that includes the observed head OID. It does not schedule
future auto-merge; it retries nothing and stops on every unavailable/ambiguous
fact. No dependency, product-runtime behavior, financial data, credentials or
provider setting is introduced.

## Specification

### User story

- As the owner, I can explicitly opt one `/agent codex` run into safe delivery
  so I do not need to issue a separate merge instruction after every clean run.

### Acceptance criteria

- [ ] Plain `/agent codex` retains the current draft-PR-only behavior.
- [ ] `--automerge` is parsed only from the owner-authored command marker and
  becomes part of command identity.
- [ ] A successful opted-in run can identify exactly one open PR whose head is
  the run's isolated branch, mark it ready, wait for the selected checks, and
  perform only a squash merge against its observed head OID.
- [ ] Ambiguous/missing PR, draft state, changed main/base/head, unresolved
  thread, pending/failed/skipped required check, missing review decision or
  API failure produces a terminal non-merge journal result.
- [ ] The worker never receives GitHub credentials or `gh pr merge` permission.

### Out of scope

- Automatic task selection, issue creation/closure, approval/review creation,
  branch-protection changes, queue bypass, provider/production writes,
  retries, merge of PRs not created by the same run, or deployment.

## Implementation plan

| File/area | Change | Reason |
|---|---|---|
| `providers.mjs` | parse opt-in and add host-only delivery read/merge seam | preserve capabilities and testability |
| `runtime.mjs` | journal delivery evidence and invoke it only after worker success | one auditable lifecycle |
| `providers.test.mjs` | test GitHub payload interpretation and atomic merge request | contract evidence |
| `runtime.test.mjs` | test opted-in success/failure paths and no child privilege | lifecycle evidence |
| board/memory/PR record | record current authority and final truth | durable handoff |

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Branch is pushed after checks | merge includes exact observed head OID |
| `main` advances | require PR base OID to equal fresh remote `main` before merge |
| Another PR shares branch/source | require exactly one open, run-owned branch PR |
| Required check skipped or thread unresolved | treat either as ineligible |
| Child escalates to merge | retain token stripping and command guard tests |

### Verification plan

- Static: formatter, lint, typecheck and diff hygiene.
- Unit/domain: agent harness tests plus targeted red/green tests.
- Provider: exact PR-head CI, CodeQL and Gitleaks.
- Manual: disposable owner-authored command only after PR review; no production
  or financial-data test.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | add tests for opt-in parsing and fail-closed delivery eligibility | specification | observed red tests | done |
| T2 | implement host-only delivery seam and journal facts | T1 | targeted green tests | done |
| T3 | independent contract review and full selected verification | T2 | gates and acceptance matrix | in progress |
| T4 | publish PR and merge only after exact-head evidence | T3 | provider checks and merge record | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-25 | researcher | planner | planned | current harness code, GitHub API references | exact required-check policy remains to specify in tests | write failing contract tests |
| 2026-08-25 | implementer | evaluator | evaluating | host-only delivery seam; 44 agent-harness tests; no worker merge permission | local Docker/Gitleaks unavailable; exact-head provider evidence pending | run remaining local gates and publish draft PR |

### Current permission boundary

- Granted scope: focused branch writes and a future GitHub PR merge only when
  the owner-authored opt-in and all acceptance criteria are satisfied.
- Forbidden writes: `main` direct writes, branch protection, queue bypass,
  reviews, deployment, provider configuration and financial data.
- Stop condition: any ambiguous eligibility evidence or a change outside the
  harness/operational-doc boundary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Owner-only opt-in and stable command identity | `providers.test.mjs` | pass (local) |
| Worker remains unable to merge | `command-guard.test.mjs` | pass (local) |
| Host rejects changed main or unresolved thread | `providers.test.mjs` | pass (local) |
| Exact-head squash merge request | `providers.test.mjs` | pass (local) |

### Remaining limitations

- The host will not retry failed, pending or ambiguous delivery state.
- A real production merge is not a test fixture; it remains conditional on the
  exact future PR's checks and GitHub policy at that time.
- Local Docker and Gitleaks are unavailable; database and secret-history proof
  remain provider/exact-head evidence.

## Delivery record

- Branch: `feat/agent-harness-auto-merge`
- PR: pending
