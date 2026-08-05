# MoneyFlow UI migration — Phase 0 authority and baseline

**Status:** completed
**Execution state:** completed
**Active role:** human_owner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #297
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Last updated:** 2026-08-05

The owner approved starting the migration program on 2026-08-05 and explicitly instructed completion of Phase 0 on 2026-08-05. Phase 0 is accepted as a documentation, source/CI inspection and evidence-inventory baseline. It does not authorize production/provider operations or Phase 2.

## Outcome

Create and owner-accept a current-truth baseline for MoneyFlow's interface system: one authority index, measured CSS/contract debt, route-family ownership map, preserved audit evidence and a disposition recommendation for open UI work. The product remains unchanged.

## Baseline

- Baseline main: `9f31aa02a64bcff30705c187fceb09cf5fa61ded`
- Latest full UI-verifying candidate at capture time: PR #291 exact head `7ccaae55b910a5f0ec5132dee51ef3e3c9a91784`
- Merge candidate at capture time: `45a6689e2a913f74d8b41475c649f8fdb93663c4`
- CI: #1565, run `30940788160`
- UI evidence artifact: #8905362804
- Browser smoke artifact: #8905168099

The merge candidate passed policy, CSS ownership, architecture, lint, typecheck, 700 tests, production build, browser smoke and Chromium/WebKit cross-device audit before the final tree was squash-merged to main.

## Deliverables

| Artifact | Purpose | State |
|---|---|---|
| `docs/design/CURRENT_DESIGN_SYSTEM.md` | Current authority order and selected decisions | created and accepted as the current authority index |
| `docs/research/UI_PRESENTATION_BASELINE_2026-08-05.md` | Quantitative and structural baseline | created and accepted with recorded limitations |
| `docs/research/UI_OPEN_WORK_DISPOSITION_2026-08-05.md` | Open PR/issue recommendation without mutation | created; individual PR/issue actions remain separately governed |
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
| P0-T1 | Reconcile active design documents as current, mixed, historical/rejected or candidate | `CURRENT_DESIGN_SYSTEM.md` | done and owner-accepted |
| P0-T2 | Record selected identity, color, theme, typography, IA and safety boundaries | current authority table | done and owner-accepted |
| P0-T3 | Inventory global CSS imports, root contracts and known route ownership | source topology and route-family table | accepted baseline — high-level topology verified; exhaustive file/category command deferred to migration tooling |
| P0-T4 | Measure current-main debt counts | CI #1565 output | accepted baseline — root/legacy/important/allowlist counts verified; extended selector/module/inline/token totals deferred |
| P0-T5 | Map live class families and behavior enforced through CSS | baseline ownership findings | accepted baseline — critical families mapped; exhaustive live DOM consumer map deferred |
| P0-T6 | Capture representative current-main evidence | UI artifact #8905362804 and browser artifact #8905168099 | done and accepted as emulated evidence; physical-device acceptance remains a later gate |
| P0-T7 | Reconcile issue #72 and open UI PRs | open-work disposition table | done as recommendation; mutations remain separately authorized |
| P0-T8 | Present baseline and order to owner | PR #297 and artifacts | done and owner-accepted on 2026-08-05 |

## Owner decisions recorded

1. `CURRENT_DESIGN_SYSTEM.md` is accepted as the current authority index for this migration.
2. The baseline and measured figures are accepted with the documented limitations.
3. The migration order is accepted as the working sequence; each executable phase still keeps its own permission and review boundary.
4. PR #295 was resolved and merged to restore the all-ref secret-history gate. Other open PR/issue dispositions remain separate decisions and are not silently mutated by Phase 0 closure.
5. Guided Story remains preserved during architecture cleanup unless a separate redesign packet is approved.
6. Physical Android and iOS/Safari devices remain required for final program acceptance; device selection is deferred to that gate.
7. Phase 0 closure does not authorize Phase 2, deployment, provider changes or production-data access. Phase 1 remains governed by its own PR and exact-head evidence.

## Known limitations accepted

- Quantitative values come from the exact merge-candidate CI that produced the captured main tree and current source inspection.
- The repository does not yet emit a complete selector/specificity, CSS Module `:global`, inline-style, token-reference or live-DOM consumer inventory.
- Existing screenshots are preserved in the Actions artifact; this packet does not commit a large binary baseline.
- Automated UI success does not prove visual quality or physical-device readiness.
- Deferred measurements are migration-tooling work, not grounds to treat the accepted Phase 0 baseline as exhaustive.

## Verification

Pre-acceptance exact head: `607cf44c51ff1a3984ae4f337ed6124a8b5fb04a`.

- CI #1598 / run `30988805822`: passed.
- Protected CodeQL #729 / run `30988805864`: passed.
- Changed-file review: five documentation files only.
- Secret history scan #729 / run `30988805802`: failed on the existing all-ref finding at commit `a684722cba43b7d8efb2f05d510552d36d1103b2`, `tools/atoryn-design-plugin-v08/ui.html`; PR #295 independently resolved and merged the reviewed fingerprint.
- Runtime, browser and database gates: not applicable to the documentation-only Phase 0 diff; existing current-main UI evidence is referenced as baseline, not claimed as a test of this PR.
- Final exact-head checks after this acceptance record and the #295 sync must pass before merge.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | evaluating | Explicit instruction to start the plan | Execute Phase 0 only |
| 2026-08-05 | planner | human_owner | evaluating | PR #297, authority index, baseline, open-work disposition, CI #1598 and CodeQL #729 | Review findings and approve/revise Phase 0 |
| 2026-08-05 | human_owner | delivery | completed | Explicit instruction: “Hoàn thành phase 0 đi.” | Record acceptance, pass final exact-head gates and merge #297 |

### Current permission boundary

- Granted: finalize the Phase 0 documentation candidate, synchronize the independently merged reviewed secret fingerprint, run exact-head checks and merge #297.
- Forbidden: product/runtime files, CSS, tests, dependencies, workflow/provider changes, unrelated PR/issue mutation, deployment and production-data access.
- Stop condition: Phase 0 is closed after #297 merges and the resulting `main` checks are verified.

## Delivery record

- Branch: `agent/ui-phase-0-baseline`
- PR: #297
- Pre-acceptance CI: #1598 passed
- Pre-acceptance CodeQL: #729 passed
- Historical secret-history blocker: resolved by merged PR #295
- Product behavior changed: no
- Production deployment: not applicable
- Owner Phase 0 acceptance: accepted on 2026-08-05
