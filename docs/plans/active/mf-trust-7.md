# MF TRUST-7 — stabilization and real-use proof

**Status:** evaluating  
**Owner:** MoneyFlow  
**Issue/PR:** #123 / #124  
**Last updated:** 2026-07-29

## Outcome

MoneyFlow stops parallel expansion, fixes known core correctness gaps, aligns repository tracking with delivered reality, and proves seven consecutive days of real owner use before reopening redesign or feature breadth.

## Repository reconnaissance

### Current behavior

- Financial, database, RLS, build and browser gates are already substantial and passed on the PR #120 baseline.
- The repository still had delivered work packets marked `evaluating` or `in progress` under `docs/plans/active/`.
- Draft PRs #105 and #107 represented additional documentation/workflow systems that had drifted behind current `main`.
- PR #119 was a ready-for-review logo candidate despite an explicit owner visual approval gate.
- Issues #70, #72 and #81 overlapped as cross-device, route/state and Calm Ledger umbrella trackers.
- Issue #27 recorded owner confirmation that the real auth email callback, normal spreadsheet application and physical-phone keyboard gates passed on 2026-07-27.
- Seven-day self-use remains incomplete.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/plans/active/` | Must represent deliberately active work only | Keep README + this packet |
| `docs/plans/completed/` | Preserves delivery decisions and evidence | Add reconciliation/evidence records |
| `docs/REAL_USE_READINESS_CONTRACT.md` | Defines readiness and R7 evidence | Preserve as authority; do not mark R7 complete |
| GitHub #123 | Durable master tracker | Use as progress source |
| GitHub #72 | Remaining route/state UI tracker | Freeze until TRUST-7 exit review |
| GitHub #121 / #122 | Known correctness gaps | Phase 1 only |

### Existing tests and constraints

- Related unit tests: financial/domain suite under `src/lib`.
- Database/RLS tests: fresh Supabase reset + pgTAP in CI.
- Browser tests: expense path and cross-device Chromium/WebKit audit.
- Product/architecture rules: correctness and daily usefulness precede visual polish and feature breadth.
- Repository knowledge contract: active packets must contain the standard work-packet headings.

### Similar implementation and recent history

- PR #109 previously moved merged packets to `completed/` and removed stale active artifacts.
- `docs/plans/README.md` defines active packets as execution state, not speculative backlog.
- Issue #81 itself delegated remaining route/state remediation to #72.

### Open questions

- [ ] Did the seven consecutive-day period actually begin, and on which calendar date?
- [ ] Does issue #40 require a paid Supabase plan, or can leaked-password protection be enabled in the current project?

Neither question blocks Phase 0 repository cleanup.

## Research

Not required. Phase 0 is an internal repository-state reconciliation based on current files, merged PR history and owner-confirmed issue evidence. No external technology or product decision is introduced.

### Questions researched

1. Which open PRs and issues still represent active work versus delivered or superseded work?
2. Which files in `docs/plans/active/` contradict current merged state?
3. Which readiness claims are accepted without implying R7 completion?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Repository `main` and PR history | 2026-07-29 | Delivered packets and current architecture | Does not prove real-world daily usefulness |
| Issues #27, #70, #72, #81, #123 | 2026-07-29 | Owner evidence and tracker relationships | Issue text may be stale until reconciled |
| PRs #105, #107, #119 | 2026-07-29 | Parallel initiatives and approval state | Closed/deferred branches remain historical references |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Leave all trackers and packets open | No administrative changes | Continues false work-in-progress and duplicate authority | Rejected |
| Delete history without records | Smallest active folder | Loses delivery rationale and handoff context | Rejected |
| Rebase and merge all open PRs | Preserves proposed work | Expands scope before real-use proof and duplicates current systems | Rejected |
| Freeze, archive delivered state, retain one tracker | Clear authority and reversible GitHub state | Requires documentation cleanup | Selected |

### Research decision

Use #123 and this packet as the only TRUST-7 execution authority. Preserve delivered/superseded packet history in one completed reconciliation record. Keep #72 open but frozen as the sole remaining route/state UI tracker. Defer PR #119 for owner review and close stale workflow/documentation PRs #105 and #107.

## Specification

### Problem

Future agents and the owner cannot reliably determine what MoneyFlow is currently doing because delivered packets remain active, multiple UI umbrellas overlap, and proposed workflow/brand work remains open after the project selected seven-day self-use as its next gate.

### User stories

- As the owner, I can see one active execution plan so that project state is understandable without chat history.
- As an implementing agent, I can distinguish delivered work, frozen work and allowed correctness fixes so that I do not duplicate or expand scope.
- As a reviewer, I can verify accepted manual readiness evidence without mistaking it for seven-day completion.

### Acceptance criteria

- [x] PR #105 is closed unmerged with a TRUST-7 rationale.
- [x] PR #107 is closed unmerged with a TRUST-7 rationale.
- [x] PR #119 is draft and retains explicit owner approval requirements.
- [x] Issues #70 and #81 are closed with remaining work delegated to #72.
- [x] Issue #72 is the only remaining route/state UI tracker and is frozen under #123.
- [x] Eight delivered/superseded packets are removed from `docs/plans/active/`.
- [x] Delivery mapping is preserved under `docs/plans/completed/`.
- [x] Owner-confirmed manual gate evidence is recorded without secrets or real financial descriptions.
- [x] R7 remains explicitly incomplete.
- [x] PR #124 passes repository CI.

### Required states

- Loading: not applicable; documentation/tracking change.
- Empty: active folder still retains its lifecycle README and this packet.
- Populated: completed records name delivered PRs and superseding trackers.
- Validation/error: `check:knowledge` rejected the malformed first packet and passed after the packet was corrected.
- Recovery/undo: closed issues/PRs and deleted packet paths are recoverable from Git history.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: no runtime UI change.
- Accessibility: no runtime UI change.

### Financial and security constraints

- No financial calculations or persisted data are changed.
- Integer VND and transfer invariants remain untouched.
- No RLS, auth, migration or privilege behavior changes.
- Evidence must not contain credentials, tokens, email addresses or real transaction descriptions.

### Out of scope

- Fixing #121 or #122.
- Resolving #40.
- Beginning or claiming seven-day self-use.
- Merging PR #119.
- UI redesign, dependency adoption or domain roadmap implementation.

## Implementation plan

### Architecture fit

GitHub issues own backlog/status; `docs/plans/active/` owns deliberately started multi-session execution; `docs/plans/completed/` preserves delivery history. Phase 0 changes only those governance boundaries.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| GitHub PR #105 | Close unmerged | Stale/duplicative documentation workflow |
| GitHub PR #107 | Close unmerged | Stale/duplicative Claude workflow |
| GitHub PR #119 | Convert to draft | Preserve owner approval gate |
| GitHub issues #70/#81 | Close completed umbrellas | Remove duplicate UI authority |
| GitHub issue #72 | Add freeze notice | Retain one remaining UI tracker |
| `docs/plans/active/mf-trust-7.md` | Add controlling packet | One active execution source |
| `docs/plans/completed/2026-07-29-active-packet-reconciliation.md` | Add delivery mapping | Preserve history while cleaning active state |
| `docs/plans/completed/2026-07-29-manual-readiness-gates.md` | Add sanitized accepted evidence | Record R0–R6 manual gates without claiming R7 |
| Eight stale active packets | Remove from active folder | Eliminate false work-in-progress |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation links to deleted active packet paths may require later cleanup if a future check identifies them.
- Rollback: reopen GitHub items and restore files from Git history.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Active packet violates repository template | `npm run check:knowledge` |
| Deleted packet is still referenced as active | CI knowledge checks and reviewer diff inspection |
| Manual gates are mistaken for R7 | Evidence record explicitly states R7 incomplete |
| UI work resumes through another umbrella | #70/#81 closed; #72 freeze comment; #123 authority |
| Owner logo decision is lost | PR #119 remains open as Draft with approval gate |

### Verification plan

- Static: `check:knowledge`, deployment env, CSS ownership, architecture, lint, typecheck — passed in CI #497.
- Unit/domain: normal repository unit suite — passed in CI #497.
- Database: fresh reset + pgTAP — passed in CI #497.
- Browser flow: expense path — passed in CI #497.
- Responsive/visual: production cross-device Chromium/WebKit audit — passed in CI #497.
- Production/manual: not applicable; no production behavior changed.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-1 | Close PR #105 | none | PR state/comment | done |
| P0-2 | Close PR #107 | none | PR state/comment | done |
| P0-3 | Defer PR #119 as Draft | none | PR state/comment | done |
| P0-4 | Consolidate #70/#72/#81 | none | issue states/comments | done |
| P0-5 | Add TRUST-7 packet | P0-1..4 | branch diff | done |
| P0-6 | Archive stale active packet state | P0-5 | completed reconciliation record | done |
| P0-7 | Record manual readiness gates | P0-5 | sanitized completed record | done |
| P0-8 | Pass PR #124 CI | P0-5..7 | GitHub Actions #497 | done |

Rules:

- Phase 1 does not begin before this PR is merged.
- New discoveries update this packet before scope changes.
- No feature or visual expansion is bundled into the cleanup.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Parallel PR state reconciled | #105/#107 closed; #119 Draft | pass |
| UI umbrellas consolidated | #70/#81 closed; #72 frozen | pass |
| One active execution packet | PR #124 diff | pass |
| Delivery history preserved | completed reconciliation record | pass |
| Manual evidence sanitized | completed manual-gates record | pass |
| R7 not falsely completed | packet and evidence wording | pass |
| Repository contracts | GitHub Actions #497 | pass |

### Review findings

- Correctness: no runtime behavior changed.
- Security/ownership: no secrets or sensitive financial evidence added.
- UI/UX/accessibility: no runtime UI change.
- Maintainability/duplication: eight false active packets removed and two stale workflow PRs closed.
- Scope compliance: Phase 0 governance cleanup only.

### Remaining limitations

- `docs/REAL_USE_READINESS_CONTRACT.md` still needs a focused Phase 2 reconciliation of its individual checkboxes/status wording.
- Seven-day self-use has not been proven.
- Phase 1 correctness issues #121 and #122 remain open.

## Delivery record

- Branch: `agent/mf-trust-7-phase-0`
- PR: #124
- Squash commit: pending merge
- CI run: #497 — verify, database and e2e jobs passed
- Production deployment: not applicable for documentation-only cleanup
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: after TRUST-7 completion, not Phase 0