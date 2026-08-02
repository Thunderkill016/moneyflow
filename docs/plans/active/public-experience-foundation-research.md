# Public experience foundation research

**Status:** specified  
**Execution state:** specified  
**Active role:** researcher  
**Permission scope:** branch_write  
**Owner:** ChatGPT agent, human owner approves  
**Issue/PR:** pending  
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Create a durable, concept-neutral foundation for MoneyFlow's brand color system and the design process for landing and authentication. The project must stop choosing colors or polishing screens before page goals, content hierarchy, user flows and required states have been wireframed and reviewed.

## Repository reconnaissance

### Current behavior

- The cumulative UI/UX ledger is the durable research source.
- Signal Ledger is rejected as a design baseline.
- `src/app/document-theme.css` still owns a project-wide warm-neutral/cobalt palette and contains historical Signal Ledger wording.
- The unmerged landing/auth branch uses a separate green-first palette in local CSS modules.
- Existing global aliases already map product components to semantic `--mf-*` roles, so a future palette can be changed centrally after owner approval.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Durable cumulative research | Update with new sources, limits and decisions |
| `docs/AI_UIUX_WORKFLOW.md` | Binding design workflow | Add wireframe and public-experience requirements |
| `docs/design/DESIGN_DIRECTION_STATUS.md` | Owner design authority | Preserve: no candidate palette becomes binding without approval |
| `src/app/document-theme.css` | Current semantic palette authority | Do not change in this research PR |
| `src/app/globals.css` | Compatibility aliases and semantic consumers | Do not add a second token owner |
| Landing/auth CSS modules on PR #213 | Candidate public experience | Treat as implementation evidence, not approved system |

### Existing tests and constraints

- Related unit tests: project knowledge and source contracts.
- Database/RLS tests: not applicable to documentation-only research.
- Browser tests: not applicable until implementation changes.
- Product/architecture rules: manual-first Vietnamese ledger, financial honesty, 44px primary touch targets, money not distinguished by color alone, owner visual approval before merge.

### Similar implementation and recent history

- Existing pattern to reuse: cumulative ledger + explicit design direction status + AI UI/UX workflow.
- Relevant issue/PR/decision: PR #210 merged the cumulative ledger and rejection of Signal Ledger; PR #213 is a candidate landing/auth implementation awaiting owner review.

### Open questions

- [x] Which evidence should govern a MoneyFlow-wide brand color system?
- [x] Which wireframe and design stages must happen before landing/auth visual polish?
- [ ] Which candidate palette and wireframe direction will the owner select for implementation?

## Research

### Research scope and source selection

- Decision question: What durable process and evidence should govern project-wide brand colors and the landing/auth design workflow?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` and cumulative UI/UX ledger.
- Source budget: expanded beyond four sources because this packet covers two linked decisions: color-system governance and public-experience wireframing.
- Expected decision or uncertainty to resolve: prevent screen-by-screen palettes and prevent visual polish before hierarchy, flow and states are validated.

### Questions researched

1. What can color psychology reliably establish, and what must not be overstated?
2. How should a finance product separate brand color from financial semantic colors?
3. What is the correct sequence from page goal to wireframe, visual system, prototype and implementation?
4. What sections and states should a MoneyFlow landing page and authentication flow wireframe cover?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Elliot & Maier, *Color Psychology*, Annual Review of Psychology | Peer-reviewed review | 2026-08-02 | Color can affect affect, cognition and behavior | Research remains context-dependent; does not justify universal claims like “blue always creates trust” |
| W3C WCAG 2.2, Use of Color | Accessibility standard | 2026-08-02 | Color cannot be the sole carrier of meaning | Applies to financial states, charts, links, focus and validation |
| W3C WCAG contrast/focus guidance already preserved in ledger | Accessibility standard | 2026-08-02 | Text, controls and focus need measurable contrast | Compliance floor, not a complete brand decision |
| Carbon Design System color tokens | Mature design system | 2026-08-02 | Neutral surfaces and semantic roles should be separated from action color | Do not copy IBM identity or exact palette |
| Atlassian Design System color foundations | Mature design system | 2026-08-02 | Brand, neutral, information, success, warning and danger need separate roles | Product context differs; role separation is the useful lesson |
| Figma, “How to wireframe” | Primary design-tool guidance | 2026-08-02 | Wireframes communicate structure and enable feedback before aesthetics | Tool choice is optional; process is the retained lesson |
| Webflow, “UX wireframing 101” | Practitioner workflow | 2026-08-02 | Define page goals, choose fidelity, sketch essentials, iterate and gather feedback | Marketing source; use process, not conversion claims |
| Webflow, sitemap and wireframe process | Practitioner workflow | 2026-08-02 | Content hierarchy and annotations belong in wireframes | Do not treat a generic website sitemap as MoneyFlow IA |
| Relume sitemap/wireframe/style workflow, already in ledger | Product workflow | 2026-08-02 | Brief → sitemap → wireframe → style exploration → refinement | AI output is not user validation |
| GOV.UK Design System patterns | Evidence-led service patterns | 2026-08-02 | Design around user tasks, clear labels, recovery and confirmation states | Do not copy GOV.UK visual identity |
| GOV.UK confirm email pattern | Evidence-led auth pattern | 2026-08-02 | Confirmation screens must state destination, next action and resend/change recovery | Adapt to MoneyFlow auth and provider behavior |
| OWASP Authentication Cheat Sheet | Security standard/guidance | 2026-08-02 | Login, recovery and registration messages must avoid user enumeration | Security may require generic messages; UX must still provide a recovery path |
| Baymard account sign-in flow research | Large-scale usability research | 2026-08-02 | Preserve the user's intended path after sign-in/reset; account access and recovery are a flow | Ecommerce context; do not import guest-checkout patterns into MoneyFlow |
| Current MoneyFlow code and PR #213 evidence | Primary product evidence | 2026-08-02 | Existing auth logic, CAPTCHA, OAuth, product proof and responsive constraints | Candidate composition and colors are not approved brand law |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Change landing/auth colors locally | Fast | Creates another palette owner and product inconsistency | Rejected |
| Adopt the existing cobalt palette without study | Low implementation cost | Reintroduces a rejected concept's aesthetic as default | Rejected |
| Make the product monochrome only | High neutrality | Weak action hierarchy and insufficient financial semantics | Rejected |
| Define project-wide semantic roles, test candidate palettes, then apply centrally | Consistent, accessible, reversible | Requires owner selection and migration work | Selected |
| Polish high-fidelity screens before wireframes | Visually fast | Feedback gets trapped in colors and decoration; flows/states remain unresolved | Rejected |
| Wireframe landing and auth as complete task flows before style | Exposes hierarchy, content and recovery problems early | Adds an explicit review stage | Selected |

### Research decision

**Observed evidence:** color effects depend on context and cannot be reduced to universal psychological rules. Mature systems separate neutral surfaces, brand/action color and semantic states. Wireframes are most useful before visual polish because they keep feedback on hierarchy, content, flow and required states.

**MoneyFlow judgment:** create one project-wide semantic color system after owner review. White and neutral surfaces should carry most of the interface. A trust-oriented brand hue may be tested, but income/success green, expense/danger red, warning amber and transfer/info must remain independent semantic roles. No screen may create a local brand palette.

Landing and authentication must follow a shared process: product truth → page goal → content inventory → user flow → low-fidelity variants → annotated mid-fidelity wireframe → state matrix → accessibility/security review → owner selection → brand/style application → interactive prototype → implementation and evidence.

**Remaining uncertainty:** no specific brand hue, ramp or final wireframe is binding until the owner reviews side-by-side candidates in MoneyFlow content and light/dark contexts.

### Adoption review

Not applicable. This packet adds research and process documentation only; it does not add a dependency, tool, provider or runtime architecture.

## Specification

### Problem

MoneyFlow currently has historical project-wide tokens, candidate landing/auth local tokens and rejected named concepts. Without an explicit brand-color and wireframe process, each screen can drift into a different palette or become visually polished before its information hierarchy and states are validated.

### User stories

- As the owner, I can review structure before color so that visual preference does not hide flow problems.
- As a future agent, I can find one documented process for landing and auth instead of reconstructing chat context.
- As a MoneyFlow user, I see a consistent brand and understandable financial states across public and authenticated screens.

### Acceptance criteria

- [x] A durable research document records color-system and wireframe findings, sources, boundaries and MoneyFlow decisions.
- [x] The cumulative ledger links the new research and records its cross-source conclusions.
- [x] The AI UI/UX workflow requires wireframes and state matrices before visual polish for landing/auth.
- [ ] A later implementation PR presents owner-reviewable palette and wireframe candidates before changing global tokens.

### Required states

- Loading: landing proof media; auth submit/OAuth/CAPTCHA.
- Empty: unavailable proof or optional content must not leave broken structure.
- Populated: real product proof, not fabricated financial outcomes.
- Validation/error: field-level guidance plus safe generic authentication response where security requires it.
- Recovery/undo: forgot password, resend confirmation, change email where supported, return to intended route after successful auth.
- Long data / large VND: not central to public forms, but product screenshots and proof must survive realistic Vietnamese copy and values.
- Mobile/tablet/desktop: wireframe 320, 390, 768 and 1366 widths before high-fidelity approval.
- Accessibility: labels remain visible, focus order is logical, controls meet target policy, contrast passes, meaning never depends on color alone.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none in this documentation PR.
- Authentication errors must not reveal whether an account exists.

### Out of scope

- Selecting the final MoneyFlow brand palette.
- Changing project tokens or landing/auth CSS.
- Rebuilding product screens.
- Changing Supabase Auth, OAuth, CAPTCHA, callback or provider settings.

## Implementation plan

### Architecture fit

Research belongs in the cumulative ledger and a focused public-experience foundation document. Binding workflow changes belong in `docs/AI_UIUX_WORKFLOW.md`. No new management layer or token owner is introduced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` | Add consolidated color and landing/auth wireframe research | Durable task-specific source |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Link and synthesize the new evidence | Preserve cumulative memory |
| `docs/AI_UIUX_WORKFLOW.md` | Add required public-experience workflow | Make future agents follow the sequence |
| this work packet | Record scope, sources, decisions and handoff | Durable delivery evidence |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation only.
- Rollback: revert the documentation commit/PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Color psychology becomes pseudoscientific brand law | Record context dependence and require product testing |
| Research doc silently selects a palette | Mark all palette examples candidate-only |
| Wireframes become another permanent named concept | Store structure, rationale and status; owner selects/rejects candidates |
| Auth aesthetics obscure security requirements | Include OWASP and existing provider behavior in state matrix |
| New document duplicates the cumulative ledger | Keep detailed task research in one file and add a concise ledger index/synthesis |

### Verification plan

- Static: diff hygiene.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable until implementation.
- Production/manual: owner reviews the research and candidate process before palette/wireframe implementation.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Research color psychology, finance semantics and accessibility | none | source table | done |
| T2 | Research landing/auth wireframe process and state coverage | T1 | source table + decision | done |
| T3 | Create durable public-experience research document | T1, T2 | repository file | todo |
| T4 | Update cumulative ledger and AI UI/UX workflow | T3 | repository diff | todo |
| T5 | Run documentation CI and open PR | T4 | exact-head checks | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher | implementer | specified | web sources + repository reconnaissance + work packet | final palette and wireframe are not selected | Write documentation branch |

### Current permission boundary

- Granted scope: create/update documentation on a focused branch and open a PR.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` GitHub repository only.
- Forbidden writes: `main`, production, providers, database, runtime code and global color tokens.
- Human approval required before: selecting a palette, changing tokens, merging or deploying.
- Rollback or stop condition: stop if research is being presented as a selected visual direction rather than evidence/process.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Durable research exists | pending | pending |
| Ledger updated | pending | pending |
| Workflow updated | pending | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending documentation write.
- Important source limitations remain respected: color psychology context dependence and non-ecommerce applicability are explicit.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: auth enumeration and path-preservation requirements included.
- UI/UX/accessibility: wireframe-first and non-color cues included.
- Maintainability/duplication: detailed research separated from concise cumulative index.
- Scope compliance: documentation only.

### Remaining limitations

- The owner has not selected a final palette or wireframe.
- Competitor visuals are reference evidence only and are not stored as copied assets.

## Delivery record

- Branch: `research/public-experience-foundation`.
- PR: pending.
- Squash commit: pending.
- CI run: pending.
- Production deployment: not applicable.
- Production flow verified: not applicable.
- Work packet moved to `docs/plans/completed/`: after merge and owner acceptance.