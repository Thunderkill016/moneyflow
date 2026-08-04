# MoneyFlow web design program

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** #282
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet applies the merged Webflow, UX Pilot and Framer research to the current MoneyFlow web product. External design tools may accelerate exploration, but repository code, tests and owner decisions remain authoritative.

## Outcome

Run one repeatable design process across MoneyFlow: product truth and user jobs first, then journeys, content, multiple structures, owner selection, system application, bounded implementation, responsive/accessibility evidence and post-release learning. The first slice covers the landing and authentication entry journey.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.
- Public routes are Light-only; Light/Dark/System selection is restored only inside the signed-in workspace.
- The landing already follows value → primary action → real product proof → workflow → control → final action.
- The current mobile hero uses an overlapping screenshot composition that weakens proof readability at narrow widths.
- Login, registration, recovery and password update share a proof rail whose headline currently uses login-specific language.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` | Current production public narrative | Do not change before owner selection |
| `src/components/landing-page.module.css` | Current proof composition and responsive behavior | Later bounded implementation target |
| `src/components/auth-form.tsx` | Shared authentication family | Later mode-specific copy target |
| `src/components/public-brand-theme.module.css` | Public Light-only Fresh Blue authority | Reuse unchanged |
| `src/app/document-theme.css` | Project semantic theme authority | Preserve |
| `src/components/design-preview/**` | Coded review prototypes | Review-only; delete before final production merge |
| `src/app/design-preview/**` | Noindex prototype routes | Review-only; never treat as production evidence |
| browser/UI audit harness | Responsive and accessibility evidence | Run on selected implementation |

### Existing tests and constraints

- B3.2 logo geometry and Fresh Blue remain canonical.
- Public pages remain Light-only.
- Financial semantics remain separate from brand color.
- No invented social proof, bank connectivity, savings claim or conversion uplift.
- One primary action per viewport.
- Production landing/auth behavior cannot change until owner selects or combines a direction.

### Similar implementation and recent history

- PR #280 restored Fresh Blue and public Light-only behavior.
- PR #281 merged the Webflow, UX Pilot and Framer design operating system.
- PR #282 is the first execution of that process and remains a draft review PR.

### Open questions

- [ ] Which prototype—or combination—should become the selected production direction?
- [ ] Which details need revision after desktop and mobile review?
- [ ] What privacy-safe event contract will support post-release learning?

## Research

### Research scope and source selection

- Decision question: how should MoneyFlow redesign public entry without allowing a design tool or trend to override product truth?
- Sources: merged Webflow synthesis, UX Pilot inventory, Framer inventory and cross-source convergence.
- Expected decision: select one structural direction and define the first production vertical slice.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `docs/research/WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md` | merged internal synthesis | 2026-08-04 | content-first hierarchy, systems, accessibility and verification | does not select an aesthetic |
| `docs/research/UXPILOT_DESIGN_CORPUS_INVENTORY.md` | merged source inventory | 2026-08-04 | flows, wireframes, prototypes and evaluation | UX Pilot itself is not required |
| `docs/research/FRAMER_DESIGN_CORPUS_INVENTORY.md` | merged source inventory | 2026-08-04 | responsive layout, components and delivery | no Framer migration |
| `docs/research/WEB_DESIGN_PROCESS_CONVERGENCE.md` | merged MoneyFlow synthesis | 2026-08-04 | unified process from brief to learning | owner and code remain superior |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Depend on UX Pilot generation | fast visual artifact when available | connector returned restricted/suggestion-only state | rejected as dependency |
| Depend on Figma MCP generation | editable canvas | Starter plan reached MCP write limit | deferred, not blocking |
| Coded prototypes in current stack | real responsive behavior, existing tokens/assets, Vercel review | temporary routes must not leak into final product | selected |
| Redesign production immediately | fastest visible replacement | skips owner selection and increases rollback risk | rejected |

### Research decision

Use design-in-code as the review medium. Three structurally different prototypes run in the current Next.js stack under noindex `/design-preview/*` routes. They use current product truth, Fresh Blue, B3.2 and test-environment product assets. They do not replace production landing/auth routes and must be removed before the selected production implementation is merged.

### Adoption review

No dependency, provider, framework or architecture pattern was added. The prototypes reuse existing Next.js, React, CSS Modules, Lucide, brand components and product media.

## Specification

### Problem

The design process required comparable, responsive artifacts, but UX Pilot access was restricted and Figma generation reached the connected plan limit. Blocking on those tools would turn the process into documentation only. MoneyFlow needs reviewable alternatives without changing production behavior.

### User stories

- As the owner, I can open three real responsive prototypes and compare hierarchy and flow.
- As a mobile reviewer, I can read each product proof as a linear card rather than a shrunken collage.
- As the implementation team, I can translate the selected prototype using existing tokens and components.

### Acceptance criteria

- [x] Public journey and current problems are audited.
- [x] Three directions differ by hierarchy/flow, not just color.
- [x] Each direction has a coded responsive route and representative Vietnamese content.
- [x] Preview routes are marked `noindex, nofollow` and are not linked from production navigation.
- [x] Production landing, auth, financial, database and provider behavior are unchanged.
- [ ] Exact-head static, unit, build, CodeQL, secret and selected browser gates pass.
- [ ] A reviewable deployment URL is available or the preview limitation is recorded honestly.
- [ ] Owner selects, combines or rejects the prototypes.
- [ ] Selected production implementation removes the temporary preview routes.

### Required states

- Mobile/tablet/desktop: prototypes reflow at 320–390px, tablet and desktop intent.
- Long content: representative Vietnamese copy can wrap without clipping.
- Accessibility: semantic sections, named navigation, keyboard links, focus and reduced motion.
- Product media: only existing test-environment screenshots with truthful alt text.

### Financial and security constraints

- No guessed balances, savings or financial advice.
- No financial logic, authentication semantics, RLS or provider changes.
- Preview CTAs point to existing public routes and do not bypass authentication.

### Out of scope

- Production redesign before owner selection.
- Bank sync, AI advice, OCR identity, investment or household-finance expansion.
- New design/runtime framework.
- Keeping `/design-preview/*` after the review lifecycle.

## Implementation plan

### Architecture fit

Review prototypes live in isolated App Router pages and one isolated component/CSS module. They consume the current public theme and shared brand component. Production routes remain untouched.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/design-preview/**` | Three coded prototypes and review toolbar | Compare real responsive structures |
| `src/app/design-preview/**` | Isolated noindex review routes | Open each direction directly |
| packet/PR memory | Record tool limitations and review state | Durable truthful handoff |
| production landing/auth | No change until owner selection | Preserve gate order |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility: existing production URLs and behavior unchanged.
- Rollback: delete isolated preview routes/components.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Prototype becomes accidental production surface | noindex, no production navigation link, delete before final merge |
| Tool failure is presented as successful generation | record exact UX Pilot/Figma limitation |
| Three directions collapse into styling variants | distinct proof-first, story-led and task-led structures |
| Mobile proof remains unreadable | full-width linear proof cards below responsive breakpoint |
| Preview copy implies unsupported capability | reuse current MoneyFlow product truth only |

### Verification plan

- Static: diff hygiene, knowledge contract, CSS ownership, architecture, lint, typecheck.
- Unit/build: existing test suite and production build.
- Browser: prototype routes load; no horizontal overflow; links and headings work.
- Responsive: 320/360/390/tablet/desktop and Chromium/WebKit where selected.
- Manual: owner reviews desktop and phone before selecting production direction.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Create active packet and lock scope | PR #281 | packet | done |
| T2 | Audit public journey/content/responsive risks | T1 | audit document | done |
| T3 | Define three structural directions | T2 | direction document | done |
| T4 | Build coded responsive prototypes | T3 | `/design-preview/*` routes | done |
| T5 | Exact-head verification and preview deployment | T4 | CI/deployment evidence | in_progress |
| T6 | Owner selects, combines or rejects | T5 | recorded owner decision | blocked |
| T7 | Implement selected production slice and remove previews | T6 | focused production diff | blocked |
| T8 | Independent UI/accessibility review | T7 | review evidence | blocked |
| T9 | Merge, production verification and archive | T8 | merge/deployment record | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | researcher | planner | specified | PR #281 + audit + three directions | selection unresolved | Generate review artifacts |
| 2026-08-04 | planner | implementer | implementing | UX Pilot restricted; Figma limit recorded | external design canvas unavailable | Build isolated coded prototypes |
| 2026-08-04 | implementer | evaluator | evaluating | four noindex preview routes on PR #282 | final CI and share URL pending | Verify exact head and present prototypes |

### Current permission boundary

- Granted scope: branch/PR artifacts and isolated review routes.
- Exact repository: `Thunderkill016/moneyflow` branch `design/moneyflow-web-design-program`.
- Forbidden writes: direct main, provider configuration, production data, database/auth changes and production landing replacement before owner selection.
- Human approval required before: selecting a direction, applying it to production routes and merge.
- Stop condition: unsupported claims, product-scope expansion or financial/auth behavior changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Audit and three distinct directions | design docs | pass |
| Real responsive review artifacts | coded prototype routes | pass pending deployment smoke |
| Production routes untouched | branch diff | pass |
| Exact-head CI/browser evidence | active workflow runs | pending |
| Owner selection | pending review | pending |

### Research and adoption evidence

- The final artifact preserves the source-derived process without depending on a vendor tool.
- No new dependency/provider was adopted.
- Tool limitations are recorded rather than presented as successful output.

### Review findings

- Correctness: prototypes use existing routes/assets and product claims.
- Security/ownership: no auth/provider/data behavior changed.
- UI/UX/accessibility: final browser and owner review pending.
- Maintainability: isolated temporary component and routes; no parallel production theme.
- Scope: public-entry review artifacts only.

### Remaining limitations

- UX Pilot generation is unavailable through the current connector.
- Figma MCP canvas generation is limited by the connected Starter plan.
- Preview deployment URL and exact-head checks remain pending.
- Owner has not selected a production direction.

## Delivery record

- Branch: `design/moneyflow-web-design-program`
- PR: #282, draft
- Squash commit: pending
- CI run: pending final exact head
- Preview deployment: pending
- Production deployment: not applicable
- Production flow verified: not applicable; production routes unchanged
- Work packet moved to `docs/plans/completed/`: pending
