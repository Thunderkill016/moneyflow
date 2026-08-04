# MoneyFlow web design program

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** pending
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet applies the merged Webflow, UX Pilot and Framer research to the current MoneyFlow web product. It is a design program, not permission to replace current product truth or financial behavior.

## Outcome

MoneyFlow will use one repeatable design process across public pages and the signed-in product: product truth and user jobs first, then flows and content, multiple low-fidelity structures, owner selection, system application, vertical-slice implementation, responsive/accessibility evidence and post-release learning. The first execution slice covers landing and the authentication family because those surfaces form the entry journey and already have concrete evidence gaps.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.
- Public routes are Light-only; Light/Dark/System selection is restored only inside the signed-in workspace.
- The public landing already follows value proposition → primary action → real product proof → workflow explanation → trust/control → final action.
- Login, registration, password recovery and password update share one auth component and one supporting proof rail.
- The landing uses real MoneyFlow screenshots from the test environment.
- Broad responsive and browser automation exists, but final owner visual approval and physical-device evidence remain separate.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` | Public narrative and conversion path | Reuse current product truth; change only after wireframe selection |
| `src/components/landing-page.module.css` | Landing hierarchy, proof composition and responsive behavior | Audit stale local palette and mobile proof readability |
| `src/components/auth-form.tsx` | Login/register/recovery/update family | Reuse behavior; make supporting content mode-specific |
| `src/components/auth-form.module.css` | Auth layout and responsive states | Audit hierarchy and long/error states before visual change |
| `src/components/public-brand-theme.module.css` | Public Light-only Fresh Blue authority | Keep as public semantic mapping; remove competing route-local identity values |
| `src/app/document-theme.css` | Project semantic theme authority | Preserve identity/financial semantic separation |
| `src/components/route-theme-boundary.tsx` | Public Light-only and workspace theme selection | Preserve current owner decision |
| `tests/e2e/**` and UI audit harness | Browser, responsive and state evidence | Extend only for selected affected flows |
| `docs/AI_UIUX_WORKFLOW.md` | Existing required UI/UX process | Use as execution policy |
| `docs/research/WEB_DESIGN_PROCESS_CONVERGENCE.md` | Merged Webflow/UX Pilot/Framer synthesis | Use as operating-process evidence |

### Existing tests and constraints

- Related unit tests: brand/theme contracts, landing/public-light guardrails and auth behavior contracts.
- Browser tests: public landing/auth smoke and cross-device Chromium/WebKit audit.
- Product rules: no invented financial advice, no unsupported social proof, one primary action per viewport, semantic financial colors remain separate from brand color.
- Public pages must stay Light-only.
- No high-fidelity redesign is allowed before owner selects a low-fidelity structure.

### Similar implementation and recent history

- PR #280 restored Fresh Blue, black landing Login text and public Light-only behavior.
- PR #281 merged the Webflow, UX Pilot and Framer research corpus and the unified design operating system.
- Current landing and auth implementation are candidates for improvement, not a permanent named design concept.

### Open questions

- [ ] Which low-fidelity public-entry structure should become the selected direction?
- [ ] Does the mobile proof collage remain readable at 320/360/390 px under real-device conditions?
- [ ] Which signed-in route should be the first workspace vertical slice after public entry: Dashboard, Transactions or Accounts?
- [ ] What privacy-safe event contract will be used for post-release learning?

## Research

### Research scope and source selection

- Decision question: how should MoneyFlow execute a complete, repeatable web-design process without allowing external design inspiration to override product truth?
- Reference map consulted: merged UI/UX research ledger and the Webflow/UX Pilot/Framer corpus.
- Source budget exception: the owner explicitly requested reading the public design corpus from all three sources; PR #281 records the discoverable snapshot and limits.
- Expected decision: one MoneyFlow-specific process and the first bounded implementation slice.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `docs/research/WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md` | merged internal synthesis | 2026-08-04 | user-centered process, content-first design, hierarchy, systems, accessibility and verification | does not select an aesthetic |
| `docs/research/UXPILOT_DESIGN_CORPUS_INVENTORY.md` | merged source inventory | 2026-08-04 | UX research, flows, wireframes, prototypes, metrics and AI-assisted iteration | tool-specific claims are not binding |
| `docs/research/FRAMER_DESIGN_CORPUS_INVENTORY.md` | merged source inventory | 2026-08-04 | responsive layout, components, animation, publishing and delivery practice | does not authorize a Framer migration |
| `docs/research/WEB_DESIGN_PROCESS_CONVERGENCE.md` | merged MoneyFlow synthesis | 2026-08-04 | unified process from brief through post-launch learning | current product and owner decisions remain superior |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Redesign the full product immediately | fast visible change | skips evidence, creates scope explosion and inconsistent routes | rejected |
| Only document a process | low implementation risk | process would not change product behavior or review practice | rejected |
| Run a phased program with a public-entry pilot | proves the process on a coherent journey and limits rollback | requires owner selection before visual implementation | selected |

### Research decision

Use a phased design program. The public entry journey is the pilot because it has one clear conversion path, shared brand authority, real product proof and a bounded auth family. Three genuinely different low-fidelity structures will be generated and reviewed before any high-fidelity visual redesign. Current Fresh Blue identity, B3.2 geometry, public Light-only behavior and financial semantic colors remain active.

### Adoption review

Not applicable. No new runtime dependency, provider, framework or platform migration is authorized.

## Specification

### Problem

MoneyFlow has extensive design research and strong implementation coverage, but the process has not yet been executed as one durable end-to-end program across the web. Current landing/auth surfaces contain known inconsistencies: auth supporting copy is not mode-specific, route-local legacy palette declarations still exist beside the semantic authority, and the mobile screenshot collage has not been accepted as readable evidence on real devices.

### User stories

- As a first-time visitor, I can understand what MoneyFlow does, see real product evidence and choose the next action without decoding decorative content.
- As a returning user, I can reach login quickly and read supporting content that matches the task I am performing.
- As a registering or recovering user, I receive mode-specific context and recovery guidance.
- As a mobile user, I can read the product proof and activate the primary action without horizontal overflow or hidden controls.
- As the owner, I can compare genuinely different structures before committing implementation effort.

### Acceptance criteria

- [ ] A complete route and journey audit exists for public entry and the first signed-in destination.
- [ ] Three low-fidelity public-entry directions differ in hierarchy or flow, not only styling.
- [ ] Each direction includes 320/390 mobile and desktop intent, content order, primary action and trade-offs.
- [ ] Owner selects one direction before high-fidelity implementation.
- [ ] Auth supporting content is mode-specific in the selected implementation.
- [ ] Public Fresh Blue roles come from the semantic authority; no competing legacy brand palette remains active.
- [ ] Mobile product proof is readable at 320/360/390 px or replaced with a task-focused linear/cropped proof structure.
- [ ] Selected changes pass exact-head static, unit, build, Chromium/WebKit and responsive checks.
- [ ] Public routes remain Light-only and workspace theme choice remains unchanged.
- [ ] No financial, database, auth-provider or production-data behavior changes.

### Required states

- Loading: auth submission and CAPTCHA state remain visible and understandable.
- Empty: public proof never depends on private user data.
- Populated: representative Vietnamese copy and long labels are used.
- Validation/error: field-local errors and generic account-safe responses remain understandable.
- Recovery/undo: forgot/reset/session recovery paths remain explicit.
- Long data / large VND: screenshots and signed-in pilot route must not truncate important values.
- Mobile/tablet/desktop: 320, 360, 390, tablet and desktop intent are documented and verified.
- Accessibility: semantic landmarks, heading order, keyboard focus, target size, contrast, 200% text and reduced motion.

### Financial and security constraints

- No guessed financial data, savings claim or recommendation.
- Integer VND and transfer invariants remain untouched.
- No RLS, ownership, provider or authentication semantics change in this design slice.
- No invented testimonials, user counts, bank connectivity or performance claims.

### Out of scope

- Bank sync, AI advice, OCR identity, investments, household finance or full budgeting-method changes.
- A full product-wide high-fidelity rewrite in one PR.
- Replacing Next.js with Webflow, UX Pilot or Framer.
- Changing B3.2 logo geometry or the approved Fresh Blue identity without a new owner decision.

## Implementation plan

### Architecture fit

The existing React components, CSS Modules and semantic theme authority own the public experience. UX Pilot may be used only to generate review artifacts; selected implementation must live in the existing production codebase. The packet owns execution state and evidence.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/plans/active/moneyflow-web-design-program.md` | Track the program, decisions, tasks and evidence | Durable execution authority |
| UX Pilot workspace | Generate three public-entry wireframe directions | Required divergence before convergence |
| `docs/design/` or packet appendix | Record selected wireframe and rejected alternatives | Prevent implicit concept reuse |
| `src/components/auth-form.tsx` | Make proof-rail copy mode-specific after structure selection | Current content mismatch |
| `src/components/landing-page.module.css` | Remove/quarantine stale local identity palette; adjust mobile proof only with evidence | One semantic authority and readable mobile proof |
| `src/components/public-brand-theme.module.css` | Keep public Fresh Blue Light-only mapping authoritative | Prevent design-system drift |
| relevant unit/browser tests | Lock selected content, theme and responsive behavior | Permanent regression evidence |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: public and auth routes keep existing URLs and behavior.
- Rollback: revert the focused visual/content commit; semantic theme and route behavior remain independently protected.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Attractive wireframe weakens product truth | score against user job, financial honesty and real feature evidence |
| Three directions are only color variants | require different content hierarchy or interaction structure |
| Mobile screenshot proof becomes unreadable | 320/360/390 screenshots plus physical-device review before acceptance |
| Auth copy exposes account existence | preserve server-owned generic responses and security contract |
| Local CSS reintroduces brand drift | CSS ownership and permanent theme tests |
| Process becomes documentation-only | complete one vertical slice and archive evidence after merge |

### Verification plan

- Static: diff hygiene, knowledge contract, CSS ownership, architecture, lint and typecheck.
- Unit/domain: public theme, landing/auth copy and route contracts.
- Database: not applicable.
- Browser flow: landing → register/login; auth mode navigation and recovery links.
- Responsive/visual: 320/360/390/tablet/desktop, Chromium/WebKit, 200% text and reduced motion.
- Production/manual: owner visual review and physical-phone proof before claiming mobile-ready.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Create active packet and lock scope | merged PR #281 | this packet | done |
| T2 | Audit public route journey, content and responsive evidence | T1 | route/content/state matrix | in_progress |
| T3 | Generate three low-fidelity public-entry directions | T2 | UX Pilot artifacts + rationale | todo |
| T4 | Owner selects or requests iteration | T3 | recorded owner decision | blocked |
| T5 | Implement selected public-entry vertical slice | T4 | focused code diff | blocked |
| T6 | Independent UI/UX and accessibility evaluation | T5 | review findings | blocked |
| T7 | Exact-head verification and owner visual review | T6 | CI/browser/physical evidence | blocked |
| T8 | Merge, production verification and archive packet | T7 | PR/deployment record | blocked |
| T9 | Select first signed-in route and repeat process | T8 | next active packet/slice | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | researcher | planner | specified | merged PR #281 + active packet | mobile proof readability and selected structure unresolved | audit current public journey and generate low-fidelity directions |

### Current permission boundary

- Granted scope: create branch/PR artifacts, wireframes and bounded public-entry implementation after owner selection.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; UX Pilot design workspace for review artifacts.
- Forbidden writes: direct `main`, provider configuration, production data, database/auth changes and unapproved high-fidelity redesign.
- Human approval required before: selecting one wireframe direction, merging and production rollout.
- Rollback or stop condition: stop if a direction requires unsupported product claims, financial behavior changes or a new brand decision.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Program scope and authority recorded | active packet | pass |
| Three different low-fidelity structures | pending | pending |
| Owner selection before implementation | pending | pending |
| Public Light-only and Fresh Blue preserved | pending implementation evidence | pending |
| Mobile/browser/accessibility verification | pending | pending |

### Research and adoption evidence

- Selected sources support the phased process and low-fidelity divergence.
- Vendor/tool claims remain non-binding and no platform migration is authorized.
- No new runtime tool or dependency is adopted.

### Review findings

- Correctness: pending.
- Security/ownership: current auth/provider behavior must remain unchanged.
- UI/UX/accessibility: pending wireframe and implementation review.
- Maintainability/duplication: semantic theme authority must remain single-source.
- Scope compliance: only public entry in the first slice.

### Remaining limitations

- Owner selection is required before visual implementation.
- Physical-device evidence has not yet been produced.
- Privacy-safe conversion measurement contract is not yet specified.

## Delivery record

- Branch: `design/moneyflow-web-design-program`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable until implementation slice
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
