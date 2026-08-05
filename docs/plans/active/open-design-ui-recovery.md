# Open Design UI recovery

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** PR #293
**Last updated:** 2026-08-05

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Give MoneyFlow one portable, current and non-competing design entrypoint for Open Design/Codex, then use that governed workflow to remove visible interface defects and redesign representative surfaces without creating another global CSS layer or changing financial behavior.

## Repository reconnaissance

### Current behavior

- MoneyFlow has a split design corpus: brand, logo, Calm Ledger v2, UX principles, design-system documentation, route CSS modules and legacy compatibility styles.
- Current executable theme authority is Fresh Blue in `src/app/document-theme.css`; the canonical logo is B3.2 in `docs/design/MONEYFLOW_LOGO.md`.
- Parts of older prose still describe the retired green identity. Current executable tokens and the newer logo contract outrank those stale values.
- The authenticated shell owns fixed phone navigation in `src/components/layout/app-shell.module.css`.
- Legacy global tokens and `ui-refresh.css` still reserve clearance for a removed floating action button.
- Open PRs #170/#171 are old CSS-cleanup candidates, not current product truth.

### Relevant areas

| Area | Role | Decision |
|---|---|---|
| `AGENTS.md` | delivery law | reuse |
| `src/app/document-theme.css` | executable theme authority | reuse; do not duplicate |
| `docs/design/MONEYFLOW_LOGO.md` | approved identity | reuse |
| `docs/design/CALM_LEDGER_V2.md` | interaction/layout principles with stale color values | reuse principles; reconcile conflicts separately |
| `src/components/layout/app-shell.module.css` | shell/nav owner | use for shell fixes |
| `src/app/globals.css` and `ui-refresh.css` | legacy compatibility/debt | reduce incrementally; never extend as new authority |
| `src/components/landing-page.*` | current public entry | redesign only after visual selection |
| `e2e/` and UI audit tests | responsive evidence | reuse and extend |

### Existing tests and constraints

- Related source contracts include mobile layout, UI refresh, CSS ownership, architecture, brand and design tests.
- Browser evidence comes from baseline smoke, expense path and production cross-device audit.
- One obvious primary action, readable VND, no new global override layer and no physical-device claim from emulation remain binding.

### Relevant history

- PR #277 approved Fresh Blue/B3.2.
- PR #280 restored Fresh Blue public behavior.
- PR #282 implemented the guided-story landing.
- PR #283 was parked because implementation preceded design gates.

### Open questions

- [ ] Which of three representative directions will the owner select?
- [ ] Which production screenshots become the accepted before-state set?
- [ ] Which physical Android/browser combination provides final device evidence?

## Research

### Decision question

Can Open Design improve MoneyFlow's workflow without becoming a runtime dependency or replacing repository authority?

### Sources

| Source | Authority/type | Accessed | Establishes | Limits |
|---|---|---|---|---|
| Open Design Codex guide | official product guide | 2026-08-05 | design rules, references, local render/browser workflow and portable `DESIGN.md` | product claims do not prove MoneyFlow fit |
| `nexu-io/open-design` | canonical repository | 2026-08-05 | local-first, Apache-2.0, BYOK and MCP/file access | preview software; no runtime adoption authorized |

### Alternatives considered

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Continue ad-hoc CSS prompting | no setup | repeats conflicting directions and weak evidence | reject |
| Make Penpot bridge immediate authority | editable canvas | duplicates toolchain before direction is stable | keep isolated research only |
| Use Open Design around existing authority | portable and supports Codex/browser loop | external systems may produce generic/conflicting UI | adopt through strict adapter |
| Replace MoneyFlow system with external tokens/components | fast visual change | breaks brand, semantics and ownership | reject |

### Research decision

Adopt Open Design only as a local design workspace and structured reference pipeline. MoneyFlow code, tests, reviewed documents and owner decisions remain authoritative. External skills may influence composition but cannot introduce product claims, financial behavior, token authority or runtime dependencies.

### Adoption review

- No Open Design source or dependency ships in MoneyFlow.
- Credentials stay local; private financial screenshots and production data are forbidden in artifacts.
- Runtime, bundle and deployment cost is zero.
- Ownership remains root `DESIGN.md` plus existing MoneyFlow documents.
- Rollback is deletion of the adapter and local-tool configuration.
- Remove the workflow if it creates duplicate authority or additional handoff cost without better accepted evidence.

## Specification

### Problem

The owner sees the interface as unresolved. Multiple valid-looking design sources can lead agents to different authorities and more override layers instead of fixing visible product problems.

### User stories

- As owner, I compare three genuinely different directions on the same screens/data.
- As implementer, I read one portable adapter that points to current authority.
- As phone user, I reach final content without obsolete blank clearance or navigation overlap.

### Acceptance criteria

- [x] Root `DESIGN.md` acts as an adapter, not a competing system.
- [x] It reflects Fresh Blue/B3.2 and separates financial semantic colors.
- [x] Open Design remains local tooling with no runtime dependency.
- [ ] Before-state screenshots exist for landing, Tổng quan, Giao dịch and Ghi nhanh.
- [ ] Three directions use identical content/data.
- [ ] Owner explicitly selects one direction before broad implementation.
- [ ] Mobile clearance matches actual navigation.
- [ ] Selected implementation adds no global refresh/guardrail layer.
- [ ] Affected browser/responsive evidence is reviewed before merge.

### Required states

- Loading, empty, populated, validation/error and recovery/undo.
- Long Vietnamese labels and large VND.
- 320/360/390, 768/1024 and 1366/1440 widths.
- Keyboard focus, 44×44 targets, reduced motion and non-color financial distinctions.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Any data-flow or RLS change requires a separate Class 3 packet.

### Out of scope

- New financial features, bank sync, AI advice or OCR identity.
- Runtime Open Design integration.
- Logo replacement.
- Merging stale CSS PRs without current-main reconciliation.
- Production/provider writes.

## Implementation plan

### Architecture fit

The adapter belongs at repository root for agent discovery and points inward to existing authorities. Actual styles remain owned by semantic tokens and CSS modules. Legacy globals are removed only through focused regression-backed slices.

### Planned changes

| Area | Change | Reason |
|---|---|---|
| `DESIGN.md` | portable design-agent adapter | discover current authority |
| this packet | research, permissions and gates | govern multi-flow work |
| mobile clearance branch | detach current Dashboard from obsolete class | fix measured visible defect |
| representative prototypes | three directions after screenshot capture | owner selection gate |
| selected modules | incremental implementation | avoid broad override rewrite |

### Data and migration impact

None. Current product behavior remains authoritative until reviewed implementation merges. Rollback is per focused PR.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| External design system replaces tokens | adapter prohibition + CSS ownership tests |
| Retired green identity returns | executable theme/logo authority |
| Direction changes content/features | same content/data across comparisons |
| Redesign adds override layer | module ownership and no-new-global rule |
| Phone content moves under nav | geometry tests and responsive evidence |
| Polish hides traceability | transaction drill-down and exact-value review |

### Verification plan

- Policy/static: knowledge, CI policy, deployment, CSS ownership, architecture, lint and typecheck as selected by changed paths.
- Unit/domain: full tests for executable slices.
- Browser: landing decision path, dashboard → capture → transactions and affected end-of-content flow.
- Responsive: current PR matrix plus screenshot review.
- Production/physical-device evidence remains owner-controlled and separate.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Add portable adapter | `DESIGN.md` | done |
| T2 | Record adoption/recovery packet | this file | done |
| T3 | Reconcile stale design-authority prose | focused docs PR | todo |
| T4 | Fix obsolete Dashboard clearance | PR #294 | evaluating |
| T5 | Capture representative screenshots | accepted set | todo |
| T6 | Generate three comparable directions | artifacts | todo |
| T7 | Record owner selection | explicit decision | todo |
| T8 | Implement selected foundation/screens | focused PRs | todo |
| T9 | Expand route by route | per-route acceptance | todo |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-05 | researcher/implementer | evaluator | evaluating | official sources + `DESIGN.md` + PR #294 | screenshots/directions not created | evaluate exact-head checks, then capture references |

### Current permission boundary

- Granted: branch writes for design documentation and focused UI fixes.
- Resources: `Thunderkill016/moneyflow` branches; Vercel read-only.
- Forbidden: direct `main`, merge, deployment, provider settings, production data and secrets.
- Human approval required before: direction selection, merge, deployment and production verification involving user data.
- Stop if: work requires financial behavior changes, a new global CSS layer, external credentials in repo or an unselected direction.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| portable adapter | `DESIGN.md` | pass |
| current identity authority | adapter references executable tokens/logo | pass |
| no runtime dependency | three-file docs diff | pass |
| exact-head policy checks | workflow rerun | running |
| screenshots/directions | not yet created | pending |

### Remaining limitations

- Open Design cannot be installed/authenticated through repository-only GitHub access; the owner runs local installer/authentication.
- No current-flow screenshots or visual directions are claimed.
- No executable UI fix is part of PR #293; PR #294 is separate.

## Delivery record

- Branch: `agent/open-design-ui-recovery`
- PR: #293
- Merge: not authorized
- Production deployment: not authorized
- Production flow verified: no
