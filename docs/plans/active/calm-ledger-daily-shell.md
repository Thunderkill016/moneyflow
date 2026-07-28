# Calm Ledger daily shell and dashboard

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #81 / #92 / #93 / #94 / #98  
**Supersedes:** #83  
**Last updated:** 2026-07-28

## Outcome

The signed-in MoneyFlow home uses the Calm Ledger system established for the public surfaces. On phone, tablet and desktop, users can understand current balance and monthly movement, reach the primary expense action without content being covered, and navigate through one coherent information architecture.

The canonical signed-in route is `/dashboard`. `/insights` remains a compatibility redirect only.

## Repository reconnaissance

### Current behavior

- `/dashboard` is the canonical signed-in home.
- `/insights` redirects for backward compatibility.
- The shell uses component-scoped CSS Modules.
- Phone navigation has five destinations and one center capture action; the duplicate floating action button is gone.
- Dashboard data assembly and financial calculations remain owned by existing server/domain modules.
- The latest production UI polish and dark-theme token repair are on `main`.
- Assertions stale from the `/insights` to `/dashboard` migration were corrected in #98.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell.tsx` | Shared authenticated navigation, account surfaces, dialogs and capture entry | Reuse behavior; keep presentation scoped |
| `src/components/layout/app-shell.module.css` | Phone/tablet/desktop shell presentation | Current shell owner |
| `src/app/dashboard/page.tsx` | Canonical signed-in route and server data assembly | Keep bounded dashboard loader |
| `src/app/dashboard/calm-ledger-overview.css` | Dashboard hierarchy and responsive presentation | Current route owner |
| `src/app/dashboard/calm-ledger-overview-actions.css` | Temporary suppression of the obsolete in-page action | Remove only in a focused JSX cleanup |
| `src/components/moneyflow-dashboard.tsx` | Existing calculations, states and mutation behavior | Do not change financial semantics here |
| `src/lib/nav-ia.ts` | Navigation source of truth | Keep `/dashboard` canonical |
| `e2e/expense-path.spec.ts` | Core signed-in expense flow | Target `/dashboard` |
| `e2e/audit/critical-browser.audit.spec.ts` | Cross-device shell and route contracts | Preserve viewport and accessibility coverage |

### Existing tests and constraints

- Related unit tests cover auth redirect, navigation IA, manifest start URL, dashboard loader boundaries, shell account access, demo banner and mobile layout.
- Database/RLS behavior is unchanged by this presentation slice.
- Browser checks cover the expense path and critical responsive states.
- VND remains integer đồng.
- Transfers remain excluded from income and expense.
- No guessed safe-to-spend or daily spending recommendation is allowed.
- GitHub Actions in the private repository are currently blocked before checkout by issue #86, so the absence of a run is not evidence that checks passed.

### Similar implementation and recent history

- #90 made `/dashboard` canonical.
- #91 established CSS ownership boundaries.
- #92 migrated the authenticated shell and dashboard presentation.
- #93 synchronized verified MoneyValue, Dashboard and Transactions work.
- #94 restored the omitted dashboard planning dependency after the first production build failure.
- Commit `86eb5c1d23296264d5d703c09f9e4cf8bee92767` synchronized the verified UI/UX polish and dark-theme token repair.
- #98 updated stale route and CSS Module assertions; squash commit `73caa790d30bf8111bef432d3b6d830d71022721`.

### Open questions

- [ ] Do authenticated production flows pass for direct `/dashboard`, `/insights` redirect, expense capture, recent transaction display and export?
- [ ] Does the final light/dark phone and desktop screenshot review reveal any remaining P0/P1 defect?
- [ ] Does the flow pass on a physical phone, not only browser emulation?
- [ ] When will private GitHub Actions runner/billing access in #86 be restored?

## Research

External research was not required for this reconciliation. The implementation decisions were internal repository decisions governed by issue #81, current architecture boundaries and verified product behavior.

### Questions researched

1. Which signed-in route is canonical after the migration?
2. Which files own shell and dashboard presentation?
3. Which verification claims are supported by repository evidence, and which remain manual?
4. Which stale assertions and delivery records no longer matched `main`?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Issue #81 | 2026-07-28 | Calm Ledger outcome, route, financial and UX constraints | Product decision record, not execution evidence |
| PRs #90–#94 | 2026-07-28 | Canonical route, CSS ownership, shell migration, synchronization and dependency repair | Individual PR evidence |
| Commit `86eb5c1` | 2026-07-28 | Latest UI polish and dark-token repair on private `main` | Does not prove authenticated manual flows |
| PR #98 / commit `73caa79` | 2026-07-28 | Stale tests corrected for current route and CSS Modules | Test-only change |
| Issue #86 | 2026-07-28 | Private Actions jobs fail before checkout with no executable steps | Account/runner problem, not application failure |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Mark the packet completed immediately | Reduces active-document noise | Would falsely claim manual production and device verification | Rejected |
| Leave the stale packet unchanged | No documentation edit | `check:knowledge` fails and future agents receive false delivery status | Rejected |
| Reconcile evidence and keep status `evaluating` | Accurate, passes required document structure and preserves open gates | Packet remains active until manual verification | Selected |

### Research decision

Keep this packet active in `evaluating`. Record proven implementation and automated evidence, explicitly separate blocked or missing checks, and move it to `completed` only after the remaining authenticated production, visual and physical-device gates are verified.

## Specification

### Problem

The Calm Ledger shell and dashboard work shipped, but its work packet still described merge and deployment as pending and omitted sections required by the project-knowledge contract. This caused stale project context and made `npm run check:knowledge` fail even though the runtime work was already present.

### User stories

- As the owner, I can see which parts of the redesign are actually shipped and which checks remain.
- As an implementing agent, I can identify the canonical route and current CSS ownership without relying on chat history.
- As a reviewer, I can distinguish automated evidence from unverified production claims.

### Acceptance criteria

- [x] `/dashboard` is recorded as the canonical signed-in route.
- [x] `/insights` is recorded as a compatibility redirect.
- [x] Shell and dashboard ownership boundaries match current `main`.
- [x] Merged PRs and relevant commits are recorded.
- [x] Private GitHub Actions blockage is explicitly recorded without treating it as a code failure.
- [x] All headings required by `scripts/check-project-knowledge.mjs` exist.
- [ ] Authenticated production flows are manually verified.
- [ ] Final light/dark phone and desktop screenshots are reviewed.
- [ ] Physical-phone verification is completed.
- [ ] The packet is moved to `docs/plans/completed/`.

### Required states

- Loading: existing server loading behavior remains unchanged.
- Empty ledger: one useful first action; no blank placeholder wall.
- Populated ledger: exact large VND values and long Vietnamese labels remain readable.
- Validation/error: data errors remain visible and unsafe mutations remain disabled.
- Recovery/undo: toast and undo behavior remain available.
- Long data / large VND: layouts wrap or truncate intentionally without changing exact detail values.
- Mobile/tablet/desktop: authored layouts rather than accidental wrapping.
- Accessibility: semantic landmarks/dialogs, visible focus, 44 px targets, reduced motion and safe-area spacing.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- No schema, migration, ownership or RLS behavior changes are authorized by this packet.
- Runtime mode and deployment configuration remain explicit.

### Out of scope

- Quick-capture field redesign.
- Final migration of every secondary route.
- Financial calculation changes.
- Schema, auth, RLS or environment changes.
- Fixing GitHub account billing or runner permissions from repository code.

## Implementation plan

### Architecture fit

The shared shell remains owned by `src/components/layout/app-shell.tsx` and its CSS Module. Dashboard presentation remains route-owned. Existing finance loaders and domain calculations are reused. This reconciliation changes documentation only and does not introduce a new runtime owner.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/plans/active/calm-ledger-daily-shell.md` | Add required work-packet sections and reconcile current delivery evidence | Restore accurate project truth and `check:knowledge` compatibility |
| GitHub PR state | Supersede stale documentation PRs after the reconciled change lands | Reduce conflicting project narratives |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: no runtime impact.
- Rollback: revert the documentation commit.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Documentation claims production behavior that was not manually tested | Mark those gates pending and keep status `evaluating` |
| A build/deploy status is mistaken for database or browser proof | List each verification layer separately |
| Future agents treat `/insights` as canonical | State `/dashboard` in current behavior, specification and evidence |
| Packet is moved to completed too early | Require remaining manual gates and an explicit move step |
| Private CI absence is interpreted as success | Link the blockage to #86 and state that no workflow ran |

### Verification plan

- Static: run `npm run check:knowledge`, `npm run lint` and `npm run typecheck` when an executable environment or restored CI is available.
- Unit/domain: #98 reports the stale assertions updated and its branch passing all unit tests before merge.
- Database: no database change; retain existing pgTAP/RLS gates for releases.
- Browser flow: verify `/dashboard` expense capture and `/insights` redirect in authenticated production.
- Responsive/visual: review light/dark screenshots on phone and desktop and retain the audit viewport matrix.
- Production/manual: verify the exact deployed commit, recent transactions and export.
- CI limitation: private Actions are blocked by #86 and currently produce no runnable workflow steps.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Make `/dashboard` canonical | #81 | #90 | done |
| T2 | Establish CSS ownership | T1 | #91 | done |
| T3 | Migrate shell and dashboard presentation | T2 | #92 | done |
| T4 | Synchronize verified dashboard/transactions work | T3 | #93 | done |
| T5 | Restore omitted dashboard dependency | T4 | #94 | done |
| T6 | Apply UI polish and dark-token repair | T5 | commit `86eb5c1` | done |
| T7 | Update stale route/CSS Module tests | T6 | #98 / `73caa79` | done |
| T8 | Reconcile this work packet | T7 | documentation PR | implementing |
| T9 | Verify authenticated production flows | T8, #86 or manual access | production checklist | todo |
| T10 | Review final responsive screenshots and physical phone | T9 | audit evidence | todo |
| T11 | Move packet to completed | T9, T10 | completed packet path | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Canonical route and compatibility redirect | #90, current auth/navigation code, #98 test updates | pass |
| Scoped shell and route CSS ownership | #91 and #92 | pass |
| No duplicate mobile FAB | #92 and updated mobile-layout assertion in #98 | pass |
| Dashboard dependency present in production build | #94 and subsequent Vercel success | pass |
| Dark-theme token cascade repaired | commit `86eb5c1` | pass |
| Static/unit checks match current implementation | #98 reports lint/typecheck clean and all unit tests passing before merge | pass with private-CI limitation |
| Authenticated production core flow | No final manual evidence recorded | pending |
| Final cross-device screenshot review | Partial audit evidence exists; final owner review not recorded | pending |
| Physical phone readiness | Not verified | pending |

### Review findings

- Correctness: route and test expectations now align; no financial calculation change was introduced.
- Security/ownership: no schema, auth or RLS changes; private CI blockage remains external to runtime code.
- UI/UX/accessibility: shell hierarchy, single capture action and dark token repair are implemented; final production visual review remains.
- Maintainability/duplication: shell presentation is scoped, but the temporary dashboard action CSS owner should be removed in a focused cleanup after JSX deletion.
- Scope compliance: this reconciliation is documentation-only.

### Remaining limitations

- Private GitHub Actions do not currently execute because of #86.
- Authenticated production flows have not been recorded as manually verified after the latest sequence.
- Final light/dark phone and desktop screenshot approval is missing.
- Physical-device verification is missing.
- The temporary `calm-ledger-overview-actions.css` compatibility layer remains.

## Delivery record

- Original implementation branch: `design/calm-ledger-dashboard-shell`
- Merged implementation PRs: #90, #91, #92, #93 and #94
- Latest UI polish commit: `86eb5c1d23296264d5d703c09f9e4cf8bee92767`
- Test reconciliation PR: #98
- Test reconciliation squash commit: `73caa790d30bf8111bef432d3b6d830d71022721`
- CI run: private GitHub Actions unavailable because of #86; no runnable workflow was produced for #98
- Production deployment: Vercel succeeded for the pre-#98 production UI commit; the #98 change is test-only and its deployment status must be checked separately
- Production flow verified: pending authenticated manual verification
- Work packet moved to `docs/plans/completed/`: no; remains `evaluating`
