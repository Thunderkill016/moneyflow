# MoneyFlow development sequence

**Status:** current execution policy
**Owner:** human product owner
**Last reconciled:** 2026-07-31
**Live status authority:** GitHub issues and pull requests

## Purpose

This document tells Claude Code and other coding agents how to choose and order
MoneyFlow work when the owner has not named one exact task.

It is not a second backlog. GitHub owns changing issue and pull-request state.
Active work packets own the specification and handoff for deliberately started
initiatives. This document owns only the stable sequence, phase gates and
selection rules.

`docs/product/PRODUCT_DEVELOPMENT_PLAN.md` owns the brownfield product outcomes,
research and learning gates. This document owns the engineering order required
to pursue those outcomes safely. A later product stage never bypasses an
earlier engineering gate that affects the same flow.

## Sources and precedence

Use the precedence in `CLAUDE.md`. Before selecting work, read:

1. `README.md`
2. `ARCHITECTURE.md`
3. `docs/product/PRINCIPLES.md`
4. `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`
5. `docs/MVP_DEFINITION.md`
6. `docs/engineering/AI_DELIVERY_WORKFLOW.md`
7. this document
8. live GitHub issues and pull requests
9. the controlling active work packet

Historical research and completed packets explain decisions. They do not
authorize new implementation when current product truth or a human decision
disagrees.

## Non-negotiable ordering law

When priorities compete, choose in this order:

1. reconcile already-implemented or conflicting work;
2. remove P0/P1 defects in a core flow;
3. protect financial correctness and tenant ownership;
4. select the next user-facing feature outcome from
   `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`;
5. include authenticated behavior, recovery, mobile accessibility and
   comprehension in that feature's Definition of Done;
6. implement only the technical enablers directly required by that feature;
7. reduce measured maintainability or performance debt when it blocks the
   feature or has independent user-visible evidence.

Never choose visual polish, architecture cleanup or a new feature while an
implementable higher-priority core defect is open in the same ownership area.
When a higher item is blocked by an external setting or owner decision, record
the blocker. Work may continue only on an independent area that cannot conceal
or worsen the blocker.

After the blocking conditions in items 1-3 are clear, do not postpone the
feature roadmap for a broad hardening or cleanup program. Quality work travels
inside the selected vertical slice unless it has an independently proven
release-blocking reason.

## Session selection algorithm

Claude Code must perform this sequence at the start of unnamed continuation
work:

1. Inspect `git status`, branch, recent commits and `origin/main`.
2. Fetch or query current GitHub state when network/tooling is available.
3. List open pull requests before open issues. An implemented PR normally takes
   priority over starting new code.
4. Reconcile every active packet with its branch, PR, merge, CI, deployment and
   owner-review state.
5. Identify P0/P1 defects affecting transaction entry, accounts, balances,
   reporting, authentication, recovery or export.
6. Name the current product feature, stage and unmet outcome gate from
   `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`.
7. Apply the engineering phase order below.
8. Recommend one bounded vertical slice with user-visible behavior, evidence,
   dependencies and both product and engineering exit gates.
9. Create or update exactly one controlling work packet after the initiative is
   deliberately selected.
10. Use a focused branch or isolated worktree.
11. Implement and verify one task checkpoint at a time.

If live GitHub state cannot be queried, say that the selection is provisional.
Do not present repository prose or a stale remote branch as confirmed-current.

## Phase 0: close and reconcile in-flight work

### Goal

Turn already-implemented work into an honest final state before opening another
large implementation stream.

### Current reconciliation targets

This table is a dated snapshot, not live status. Revalidate it every session.

| Target at 2026-07-31 | Claude may do | Human-only gate |
|---|---|---|
| merged PR #165, dead-CSS detector/auth cluster | reconcile the still-active packet and remaining cluster scope | production visual acceptance when still missing |
| merged PR #164, one owner for Vietnam date | reconcile packet, merge commit and deployed-flow evidence | production boundary-flow acceptance when still missing |
| merged PR #163, money never wraps | reconcile packet, merge commit and deployed-route evidence | production visual acceptance when still missing |
| Minimum target-size packet | reconcile merged PR #159 with packet and production evidence | physical/visual acceptance when still missing |
| Public brand consistency packet | preserve evidence and reconcile packet state | visual acceptance |
| Draft PR #119 logo candidate | report drift/conflicts; do not revive automatically | choose, revise or close the candidate |
| stale branches and completed packets | identify exact safe cleanup candidates | destructive/shared branch cleanup approval |

### Exit gate

- No implemented PR waits on an agent-fixable review blocker.
- Active packets accurately say `specified`, `implemented`, `verified`,
  `deployed`, `accepted` or `blocked`.
- Completed or abandoned work is not represented as the next initiative.
- Conflicting branches are resolved or explicitly parked.

## Phase 1: core-flow blockers

### Goal

No P0/P1 defect blocks recording, correcting, reading or exporting trustworthy
money data.

### Work order

1. Reproduce and fix issue #145, the desktop dialog positioning defect, at its
   actual shared/reset owner.
2. Extend the dialog audit to cover the transaction chooser, expense dialog and
   account dialog on desktop and mobile. Containment alone is not enough;
   position, usable width, focus, escape, scroll and mobile sheet behavior need
   evidence.
3. Resolve any newly observed P0 money, data-loss, silent-mutation, auth or
   recovery defect before continuing.
4. Reconcile the open route/state quality issue #72 after shared P0/P1 causes
   are fixed; do not start a broad restyle.

### Required evidence

- Regression test fails on the reproduced defect before the fix.
- Static, type, unit and build gates pass.
- Relevant browser and responsive gates pass.
- Screenshots are reviewed at the failing viewport and its mobile counterpart.
- Exact production flow is verified after merge.

### Exit gate

No open P0/P1 defect blocks a core flow, and the relevant audit would catch each
fixed regression.

## Phase 2: financial correctness and ownership

### Goal

Every financial fact has one deterministic owner and remains correct at storage,
domain and presentation boundaries.

### Work order

1. Add a bounded test and fix for cumulative account totals exceeding the
   JavaScript safe-integer range. Individual safe values do not prove a safe
   sum.
2. Reconcile merged PR #164 and its still-active packet. The current Vietnam
   date computation now belongs to one injectable domain helper; do not expand
   into the deliberately excluded notification-date contract without a new
   specification.
3. Implement issue #156 by separating stable transaction contracts, category
   presentation metadata and demo fixtures without behavior changes.
4. Re-audit issue #53 PR A against current pgTAP coverage. Add only missing
   database invariant tests; do not duplicate tests that now exist.
5. Promote a new architecture check only after the replacement ownership
   boundary exists and a real regression risk is demonstrated.

### Required evidence

- Counterexamples and boundary tests are written before implementation.
- VND stays integer and all accumulated totals stay safe.
- Transfers remain balanced and excluded from income/expense.
- Tenant isolation is proven in pgTAP where persistence changes.
- Demo and authenticated behavior retain the same public contract.

### Exit gate

No active production contract is owned by demo fixtures, duplicated current-date
logic is removed, cumulative money boundaries are tested, and the database
invariant inventory is current.

## Phase 3: authenticated confidence and security

### Goal

CI and production evidence cover the real authenticated path rather than
inferring it from demo-mode browser tests.

### Work order

1. Design a synthetic authenticated smoke covering login, create, reload,
   edit, soft delete, restore and export.
2. Run it in a secure environment with disposable users and deterministic
   cleanup. Never expose real financial descriptions, tokens or credentials in
   artifacts.
3. Add the narrowest sustainable CI or scheduled gate. Keep demo-mode browser
   tests for fast deterministic coverage.
4. Complete issue #40 through Supabase Dashboard when the managed setting is
   available. Do not simulate leaked-password protection in repository code.
5. Verify deletion and recovery paths after any auth, schema or RLS change.

### Exit gate

The authenticated ledger path has recent repeatable evidence, cleanup is proven,
and external security settings are either accepted or accurately blocked.

## Phase 4: mobile, accessibility and CSS ownership

### Goal

The daily ledger works across supported viewports while style ownership becomes
simpler rather than gaining another override layer.

### Work order

1. Reconcile and close the 44px minimum-target packet.
2. Complete the representative route/state matrix from issue #72, including
   empty, populated, error, long Vietnamese text, large VND, dark mode,
   keyboard and 200% text states.
3. Reconcile merged PR #165: the detector and replaced auth globals are done.
   Continue `retire-dead-css.md` only with the next evidence-backed cluster,
   screenshot proof and no conflict with the selected product feature.
4. Reduce `!important` and global-layer ownership only when an actual owner is
   known. Do not set an arbitrary deletion target.
5. Treat logo or broad visual direction as owner-selected work. A green build
   cannot approve a brand candidate.

### Exit gate

No route-state P0/P1 remains, the target-size contract is blocking, removed CSS
has reviewed before/after evidence, and CSS ownership/debt checks do not regress.

## Phase 5: provenance, reconciliation and auditability

### Goal

MoneyFlow can explain where imported and edited financial facts came from and
help the user reconcile them without turning into accounting software.

### Work order

Follow issue #53 only after revalidating each step against current code:

1. Import provenance and server-side dry-run:
   source batch/row, original description, external ID when present, versioned
   fallback fingerprint, parser/mapping versions, match reason/confidence and
   candidate-to-transaction linkage.
2. Account reconciliation vertical slice:
   pending/cleared/reconciled state, statement date/balance, difference and
   explicit reopen behavior.
3. Authenticated deterministic rules:
   user-owned RLS, explicit priority/version, preview before commit and no
   low-confidence auto-posting.
4. Append-only mutation audit metadata without sensitive note text.

Each numbered item is a separate researched specification and delivery packet.
Do not implement this phase as one schema migration or one PR.

### Exit gate

An imported or corrected transaction has explainable lineage, reconciliation is
recoverable, rules are deterministic and user-owned, and audit metadata avoids
sensitive content.

## Phase 6: measured reliability and performance

### Goal

Improve operational quality only where measurements identify a user-visible or
costly bottleneck.

### Work order

1. Establish realistic ledger-size fixtures and query budgets.
2. Measure transaction feed, dashboard, reports and RLS policy performance.
3. Fix the highest measured bottleneck at its owner.
4. Add cache only with explicit invalidation tests for historical edits.
5. Recheck bundle, LCP and CSS costs after correctness and route-state gates
   remain green.

### Exit gate

Performance work has before/after measurements, correctness tests cover
invalidation, and no product behavior is changed merely to improve a lab score.

## Phase 7: evidence-backed product expansion

### Goal

Continue the feature roadmap after the trusted daily-ledger loop is stable,
selecting one evidence-backed user problem and one coherent vertical slice.

### Entry requirements

- Earlier phase gates relevant to the proposed surface are accepted.
- The proposal answers every question under `docs/product/PRINCIPLES.md`
  "Evidence before features".
- A human approves the problem and out-of-scope boundaries.
- Research uses primary sources and distinguishes observed need from inference.

### Delivery rule

Implement one smallest coherent vertical slice. Do not introduce bank sync, AI
financial advice, OCR as a core workflow, family finance, native mobile, full
envelope budgeting or multi-currency calculation without a new researched
specification and explicit approval.

Maintenance that is unrelated to the selected feature returns to the backlog.

## Claude Code operating model

### Persistent context

`CLAUDE.md` stays concise and always loaded. Detailed procedures live here or in
on-demand skills. Do not paste this whole document into another always-loaded
instruction file.

### Skills

Use `/next-initiative` for unnamed continuation work. Reusable workflows belong
under `.claude/skills/`; project-specific rules that must always apply belong in
`CLAUDE.md` or `AGENTS.md`.

### Plan and context discipline

- Use Plan mode for non-trivial work until the packet has observable acceptance
  criteria and a file-level implementation plan.
- Use `/clear` between unrelated initiatives.
- Use `/compact` deliberately during long work and preserve the packet,
  acceptance criteria, changed files, commands, failures and remaining tasks.
- Resume the named session for the same initiative rather than reconstructing
  state from memory.

### Subagents and parallelism

- Use a read-only Explore or focused subagent when research would fill the main
  context.
- Use `.claude/agents/evaluator.md` after implementation; it reports findings
  and does not fix its own review.
- Use worktrees for parallel editing sessions.
- Parallel tasks must have non-overlapping files and ownership.
- Agent teams are experimental and costlier. Use them only with owner approval
  for independent research/review or clearly partitioned work, never as the
  default implementation mode.

### Hooks and permissions

Hooks enforce only deterministic safety or verification events. They do not
replace product judgment. Never weaken `.claude/settings.json` or safety hooks
to make an operation pass. Network, destructive, shared-state, merge and
deployment actions retain human permission boundaries.

## Completion audit

Before claiming a phase or initiative complete, report:

| Requirement | Evidence | Result |
|---|---|---|
| Acceptance criteria | file, test, screenshot or production observation | pass/fail/no evidence |
| Scope boundaries | diff against work packet | pass/fail |
| Static/type gates | exact commands and exits | pass/fail/not run |
| Domain/database gates | exact commands and exits | pass/fail/not applicable |
| Browser/visual gates | report and reviewed artifacts | pass/fail/not run |
| Production | exact deployment and affected flow | verified/not verified |
| Human gate | review/merge/acceptance decision | accepted/pending |

Tests prove only their layer. `implemented`, `verified`, `deployed` and
`accepted` are different states.

## Claude Code research basis

Official sources accessed 2026-07-30:

- Project memory and concise `CLAUDE.md`:
  https://code.claude.com/docs/en/memory
- Best practices, context management and verification:
  https://code.claude.com/docs/en/best-practices
- Project skills and progressive loading:
  https://code.claude.com/docs/en/slash-commands
- Subagents:
  https://code.claude.com/docs/en/sub-agents
- Parallel sessions and worktrees:
  https://code.claude.com/docs/en/worktrees
- Agent teams:
  https://code.claude.com/docs/en/agent-teams
- Hooks:
  https://code.claude.com/docs/en/hooks
- Permission modes and Plan mode:
  https://code.claude.com/docs/en/permission-modes
- Security and prompt-injection boundaries:
  https://code.claude.com/docs/en/security

Repository-specific product, architecture, finance, UX, Supabase and personal
finance knowledge remains in the sources listed by `AGENTS.md`, especially
`docs/product/PRINCIPLES.md`, `ARCHITECTURE.md`, current migrations/tests,
`docs/research/` and issue #53.
