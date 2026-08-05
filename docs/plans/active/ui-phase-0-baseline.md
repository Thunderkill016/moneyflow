# MoneyFlow UI migration — Phase 0 authority and baseline

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** planner  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** pending  
**Parent packet:** `docs/plans/active/ui-system-migration.md`  
**Last updated:** 2026-08-05

The owner approved starting the migration program on 2026-08-05. This approval is interpreted as permission for Phase 0 only. This packet authorizes documentation, source/CI inspection and evidence inventory on a focused branch. It does not authorize product code, CSS, test, dependency, provider, issue-state, PR-state, merge or deployment changes.

## Outcome

Create an owner-reviewable current-truth baseline for MoneyFlow's interface system: one authority index, measured CSS/contract debt, route-family ownership map, preserved audit evidence and a disposition recommendation for open UI work. The product remains unchanged. Phase 1 is blocked until the owner reviews the baseline and explicitly approves the next scope.

## Baseline

- Current main: `9f31aa02a64bcff30705c187fceb09cf5fa61ded`
- Latest full UI-verifying candidate: PR #291 exact head `7ccaae55b910a5f0ec5132dee51ef3e3c9a91784`
- Merge candidate: `45a6689e2a913f74d8b41475c649f8fdb93663c4`
- CI: #1565, run `30940788160`
- UI evidence artifact: #8905362804
- Browser smoke artifact: #8905168099

The merge candidate passed policy, CSS ownership, architecture, lint, typecheck, 700 tests, production build, browser smoke and Chromium/WebKit cross-device audit before the final tree was squash-merged to main.

## Deliverables

| Artifact | Purpose | State |
|---|---|---|
| `docs/design/CURRENT_DESIGN_SYSTEM.md` | Current authority order and selected decisions | created; owner approval pending |
| `docs/research/UI_PRESENTATION_BASELINE_2026-08-05.md` | Quantitative and structural baseline | created |
| `docs/research/UI_OPEN_WORK_DISPOSITION_2026-08-05.md` | Open PR/issue recommendation without mutation | created; owner decisions pending |
| GitHub Actions UI artifact #8905362804 | Existing current-tree visual/responsive evidence | preserved by digest/reference; not committed |

## Measured findings

- Root CSS owners: 2.
- Legacy imports: 7.
- Legacy document-selector allowlist: 9 files.
- `!important`: 1,112 of budget 1,200; only 88 headroom remains.
- Unauthorized document selectors outside the allowlist: 0.
- Root-mounted invisible presentation contract components: 2.
- Product behavior/policy known to be enforced through CSS: withdrawn safe-to-spend visibility, duplicate Dashboard action visibility, canonical signed-in logo bridge and global mobile/sheet repair.
- Current automated unit/static baseline: 700 passing tests, 0 failures.
- Existing cross-device artifact: 32,050,506 bytes, digest recorded in the baseline document.

## Phase 0 task state

| ID | Task | Evidence | Status |
|---|---|---|---|
| P0-T1 | Reconcile active design documents as current, mixed, historical/rejected or candidate | `CURRENT_DESIGN_SYSTEM.md` | done, awaiting owner approval |
| P0-T2 | Record selected identity, color, theme, typography, IA and safety boundaries | current authority table | done, awaiting owner approval |
| P0-T3 | Inventory global CSS imports, root contracts and known route ownership | source topology and route-family table | partial — verified high-level topology; exhaustive file/category command remains future work |
| P0-T4 | Measure current-main debt counts | CI #1565 output | partial — root/legacy/important/allowlist counts verified; selector/module/inline/token totals not yet emitted by a merged command |
| P0-T5 | Map live class families and behavior enforced through CSS | baseline ownership findings | partial — critical families mapped; exhaustive live DOM consumer map remains future work |
| P0-T6 | Capture representative current-main evidence | UI artifact #8905362804 and browser artifact #8905168099 | done as preserved CI evidence; owner visual review pending |
| P0-T7 | Reconcile issue #72 and open UI PRs | open-work disposition table | done as recommendation; no item mutated |
| P0-T8 | Present baseline and order to owner | this PR and artifacts | pending |

## Decisions requested from owner

1. Approve or edit `CURRENT_DESIGN_SYSTEM.md` as the current authority index.
2. Confirm the migration baseline and measured figures.
3. Confirm the order: Phase 1 guardrails/tooling decision → Phase 2 primitives → Phase 3 App Shell → Phase 4 Dashboard → remaining flows.
4. Decide the disposition of PRs #293, #294, #295, #292, #170, #171 and #119; no automatic action is recommended.
5. Confirm whether Guided Story landing is preserved during architecture cleanup or receives a separate redesign packet.
6. Identify physical Android and iOS/Safari devices for final acceptance.
7. Explicitly approve Phase 1 before any executable repository change.

## Known limitations

- The current environment cannot clone GitHub directly, so no new local current-main command was invented or claimed.
- Quantitative values come from the exact merge-candidate CI that produced the current main tree and current source inspection.
- The repository does not yet emit a complete selector/specificity, CSS Module `:global`, inline-style, token-reference or live-DOM consumer inventory.
- Existing screenshots are preserved in the Actions artifact; this packet does not commit a large binary baseline.
- Automated UI success does not prove visual quality or physical-device readiness.

## Verification plan

This is a documentation-only Class 0 phase.

Required on final head:

- project-knowledge contract;
- CI policy contract;
- diff hygiene;
- protected CodeQL;
- changed-file review proving no runtime/CSS/test/dependency modification.

The secret-history scan may remain affected by the known all-ref finding handled independently by PR #295; this packet must not weaken or modify that control.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | evaluating | Explicit instruction to start the plan | Execute Phase 0 only |
| 2026-08-05 | planner | human_owner | evaluating | Authority index, baseline, open-work disposition and CI artifact references | Review findings and approve/revise Phase 1 |

### Current permission boundary

- Granted: Phase 0 source/CI inspection and documentation on `agent/ui-phase-0-baseline`.
- Forbidden: product/runtime files, CSS, tests, dependencies, workflow/provider/security settings, existing PR/issue mutation, merge and deployment.
- Stop condition: Phase 0 findings are presented to the owner. No Phase 1 write begins without a new explicit approval.

## Delivery record

- Branch: `agent/ui-phase-0-baseline`
- PR: pending
- CI: pending
- Product behavior changed: no
- Production deployment: not applicable
- Owner Phase 0 acceptance: pending
