# Open Design UI recovery

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** MoneyFlow owner  
**Issue/PR:** draft PR pending  
**Last updated:** 2026-08-05

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Give MoneyFlow one portable, current and non-competing design entrypoint for Open Design/Codex, then use that governed workflow to remove visible interface defects and redesign representative surfaces without creating another global CSS layer or changing financial behavior.

## Repository reconnaissance

### Current behavior

- MoneyFlow has a mature but split design corpus: brand, logo, Calm Ledger v2, UX principles, design-system documentation, route CSS modules and legacy compatibility styles.
- Current executable theme authority is Fresh Blue in `src/app/document-theme.css` and the canonical B3.2 logo in `docs/design/MONEYFLOW_LOGO.md`.
- Parts of older design prose still describe the retired green identity. Code and the newer logo contract outrank those stale values.
- The authenticated shell owns the actual fixed phone navigation in `src/components/layout/app-shell.module.css`.
- Legacy global tokens and `ui-refresh.css` still reserve clearance for a floating action button that the Calm Ledger shell removed.
- Existing open PRs #170/#171 are old CSS-cleanup candidates and are not current product truth.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | agent and delivery law | reuse |
| `src/app/document-theme.css` | executable color and theme authority | reuse; do not duplicate |
| `docs/design/MONEYFLOW_LOGO.md` | approved identity | reuse |
| `docs/design/CALM_LEDGER_V2.md` | interaction/layout principles with stale identity values | reuse principles; reconcile conflicts separately |
| `src/components/layout/app-shell.module.css` | actual phone nav and shell clearance | owning code for shell fixes |
| `src/app/globals.css` | legacy compatibility tokens and stale FAB clearance | reduce, never extend as new authority |
| `src/app/ui-refresh.css` | live compatibility overrides, including dashboard bottom padding | remove ownership incrementally |
| `src/components/landing-page.*` | current guided-story public entry | redesign only after visual direction selection |
| `e2e/` and UI audit tests | responsive evidence | reuse and extend |

### Existing tests and constraints

- Related unit/static tests: `src/lib/mobile-layout.test.ts`, `src/lib/ui-refresh.test.ts`, CSS ownership and design/brand source contracts.
- Database/RLS tests: not applicable unless a future UI slice changes data behavior, which this packet forbids.
- Browser tests: baseline smoke, expense path and production cross-device UI audit.
- Product/architecture rules: one primary action per viewport, no new global override layer, money must not truncate, physical-device claims require physical evidence.

### Similar implementation and recent history

- Existing pattern to reuse: route and component CSS modules consuming `--mf-*` semantic tokens.
- Relevant decisions: PR #277 approved Fresh Blue/B3.2; PR #280 restored Fresh Blue public behavior; PR #282 implemented the guided-story landing; PR #283 was parked because implementation preceded required design gates.

### Open questions

- [ ] Which of the three representative visual directions will the owner select for implementation?
- [ ] Which current production screenshots will be accepted as the before-state reference set?
- [ ] Which physical Android device/browser combination will provide the final mobile acceptance evidence?

## Research

### Research scope and source selection

- Decision question: can Open Design improve the MoneyFlow design workflow without becoming a runtime dependency or replacing repository authority?
- Reference map consulted: not required; this is a focused tool-adoption review.
- Source budget: official Open Design Codex guide and canonical GitHub repository.
- Expected decision or uncertainty to resolve: use as a local design workflow and MCP/file source only, not as shipped product code.

### Questions researched

1. What does Open Design add around Codex?
2. Where do generated artifacts and credentials live?
3. How should MoneyFlow prevent external design systems from overriding its product and financial rules?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `https://open-design.ai/agents/codex-design/` | official product guide | 2026-08-05 | Codex workflow uses design rules, references and browser verification; Open Design packages skills, design systems and a local render workflow | marketing claims do not prove fit for MoneyFlow |
| `https://github.com/nexu-io/open-design` | canonical open-source repository | 2026-08-05 | local-first, Apache-2.0, BYOK, MCP/file access and portable `DESIGN.md` workflow | fast-moving preview software; no runtime adoption authorized |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Continue ad-hoc CSS/UI prompting | no setup | repeats conflicting directions and weak evidence | reject |
| Make Penpot bridge the immediate MoneyFlow design authority | editable canvas and future Atoryn value | duplicates a large toolchain before MoneyFlow direction is stable | keep isolated research only |
| Use Open Design as a local design workflow around existing authority | portable, local-first and supports Codex/browser loop | external systems can cause generic or conflicting output | adopt with a strict adapter and no runtime dependency |
| Replace MoneyFlow tokens/components with an external Open Design system | fast visual change | breaks brand, semantics, accessibility and CSS ownership | reject |

### Research decision

Adopt Open Design only as a local-first design workspace and structured reference pipeline. MoneyFlow's code, tests and reviewed design documents remain authoritative. External skills/design systems may influence composition but may not introduce token values, product claims, financial behavior or a new runtime dependency.

### Adoption review

- Observed problem: UI work has produced several parallel visual directions and legacy CSS layers while visible defects remain.
- Existing or simpler alternatives considered: repository-only prompts, Penpot-first workflow and manual Figma handoff.
- License/code-reuse compatibility: Open Design states Apache-2.0; no Open Design source code is copied into MoneyFlow in this slice.
- Secrets, user-data and privacy exposure: credentials remain local according to the official project; never place keys, private financial screenshots or production data in repository artifacts.
- Runtime, bundle, deployment and operational cost: zero product-runtime dependency; local designer tooling only.
- Owning boundary and maintenance responsibility: root `DESIGN.md` adapter plus normal MoneyFlow design docs.
- Migration and rollback: delete the adapter and stop the local MCP integration; product runtime remains unchanged.
- Verification plan: inspect generated directions against current screenshots, repository rules and browser evidence before any implementation.
- Removal condition if the expected benefit does not appear: remove the adapter if it creates duplicate authority, generic output or additional handoff cost without improving accepted UI evidence.

## Specification

### Problem

The owner sees the current interface as unresolved. The repository has strong individual design artifacts but no single portable entrypoint for design agents, while current executable Fresh Blue identity conflicts with parts of older green design prose. This allows agents to select different authorities and continue layering overrides rather than resolving visible problems.

### User stories

- As the owner, I can compare three genuinely different MoneyFlow directions on the same screens and data, so that I choose based on the product rather than prompt variation.
- As an implementer, I can read one portable adapter that points to current authority, so that generated UI does not revive retired branding or financial semantics.
- As a phone user, I can reach the final content row without excessive blank space or overlap from fixed navigation.

### Acceptance criteria

- [x] Root `DESIGN.md` exists and explicitly acts as an adapter, not a competing design system.
- [x] The adapter reflects Fresh Blue/B3.2 current executable truth and separates financial semantic colors.
- [x] Open Design remains local tooling with no product runtime dependency.
- [ ] A before-state screenshot set exists for landing, Tổng quan, Giao dịch and Ghi nhanh at representative breakpoints.
- [ ] Three visual directions use identical content/data and are reviewed by the owner.
- [ ] One direction is explicitly selected before broad implementation.
- [ ] Mobile bottom clearance matches the actual fixed navigation and removed controls leave no reserved space.
- [ ] The selected implementation adds no new global refresh/guardrail stylesheet.
- [ ] Affected browser and responsive evidence is reviewed before merge.

### Required states

- Loading: representative screens include real skeleton/loading behavior where applicable.
- Empty: one primary action only.
- Populated: realistic ledger/account data without private user information.
- Validation/error: show affected form errors adjacent to fields.
- Recovery/undo: preserve existing recoverable ledger behavior.
- Long data / large VND: use existing stress fixtures and never truncate money.
- Mobile/tablet/desktop: 320/360/390, 768/1024 and 1366/1440.
- Accessibility: keyboard focus, 44×44 targets, non-color financial distinctions and reduced motion.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none for design-only and CSS slices; any data-flow change requires a new Class 3 packet.

### Out of scope

- New financial features.
- Bank sync, AI advice or OCR identity.
- Runtime integration of Open Design.
- Replacing the canonical logo.
- Merging old CSS cleanup PRs without current-main reconciliation.
- Production/provider writes.

## Implementation plan

### Architecture fit

The portable design adapter belongs at repository root because external/local agents discover project instructions there. It points inward to existing authorities. Actual styles remain owned by current CSS modules and semantic tokens. Legacy globals are reduced only in focused slices with regression evidence.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `DESIGN.md` | add portable design-agent adapter | make current authority discoverable without duplication |
| this packet | record research, scope, permissions and gates | multi-flow redesign requires a full packet |
| mobile shell/compatibility CSS | remove stale FAB clearance in a separate focused implementation branch | fix measured blank space at its owner |
| representative prototype artifacts | generate three directions after current screenshots are captured | owner selection gate |
| selected route modules | implement one chosen direction incrementally | avoid broad override rewrite |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: current product behavior stays authoritative until a reviewed implementation merges.
- Rollback: revert focused UI commits; remove local Open Design configuration independently.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| External design system replaces MoneyFlow tokens | adapter forbids copied tokens; CSS ownership tests |
| Stale green documentation revives retired identity | adapter points to executable theme and canonical logo |
| Generated direction changes content/features | identical content/data across all directions |
| Broad redesign adds another override layer | CSS module ownership and no-new-global rule |
| Phone fix causes content to sit under nav | geometry assertions and 320/360/390 browser evidence |
| Visual polish hides financial traceability | representative transaction drill-down and exact-value review |

### Verification plan

- Static: knowledge, CI policy, CSS ownership, architecture, lint and typecheck.
- Unit/domain: affected source-contract and UI tests; full `npm test` for executable slices.
- Database: not applicable unless scope changes.
- Browser flow: landing → register explanation path; dashboard → capture → transactions; affected mobile end-of-content flow.
- Responsive/visual: current PR matrix plus screenshot review.
- Production/manual: owner-controlled after merge; physical-device evidence is a separate explicit claim.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add portable `DESIGN.md` adapter | reconnaissance | reviewed diff | done |
| T2 | Record tool adoption and UI recovery packet | T1 | this packet | done |
| T3 | Reconcile stale design-authority prose with Fresh Blue executable truth | T1 | focused docs diff + knowledge checks | todo |
| T4 | Fix stale mobile FAB clearance in a separate branch | T2 | code/tests + responsive evidence | todo |
| T5 | Capture current representative screenshots | T2 | accepted screenshot set | todo |
| T6 | Generate three directions with identical content/data | T5 | three comparable artifacts | todo |
| T7 | Owner selects one direction | T6 | explicit decision record | todo |
| T8 | Implement selected foundation and representative screens | T7 | focused PRs and browser evidence | todo |
| T9 | Expand selected system route by route | T8 | per-route acceptance | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-05 | researcher | implementer | implementing | official Open Design sources + repository reconnaissance + `DESIGN.md` | no screenshots or generated directions yet | open docs-only draft PR and start separate mobile fix |

### Current permission boundary

- Granted scope: branch writes for design documentation and focused UI fixes.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branches only; Vercel read-only.
- Forbidden writes: `main`, merge, production deployment, provider settings, production data and secrets.
- Human approval required before: direction selection, merge, deployment and any production verification involving user data.
- Rollback or stop condition: stop if implementation requires new financial behavior, a new global CSS layer, external credentials in repository content or an unselected visual direction.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| portable non-competing adapter | `DESIGN.md` | pass |
| Fresh Blue/B3.2 current truth | adapter references executable tokens and canonical logo | pass |
| no runtime dependency | documentation-only diff | pass |
| representative screenshots and directions | not created yet | pending |
| mobile clearance fix | not implemented yet | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending final evaluation.
- Important source limitations remain respected: Open Design is workflow tooling, not product authority.
- New tool/dependency/pattern passed the adoption review, or not applicable: local workflow adopted without runtime dependency.

### Review findings

- Correctness: design-authority conflict is explicitly identified rather than silently resolved.
- Security/ownership: no credentials or private data recorded.
- UI/UX/accessibility: adapter preserves current product constraints; executable evidence still pending.
- Maintainability/duplication: adapter points to current files instead of repeating complete token tables.
- Scope compliance: documentation foundation only on this branch so far.

### Remaining limitations

- Open Design cannot be installed or authenticated through repository-only GitHub access; the owner runs the local installer/desktop authentication.
- No current-flow screenshots were captured in this branch.
- No visual direction is selected.
- No executable UI fix is claimed yet.

## Delivery record

- Branch: `agent/open-design-ui-recovery`
- PR: pending
- Squash commit: not merged
- CI run: pending
- Production deployment: not authorized
- Production flow verified: no
- Work packet moved to `docs/plans/completed/`: no
