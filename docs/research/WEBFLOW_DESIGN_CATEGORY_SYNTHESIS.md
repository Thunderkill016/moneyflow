# Webflow Design category synthesis for MoneyFlow

**Status:** active, concept-neutral research companion  
**Accessed:** 2026-08-04  
**Scope:** the current public snapshot of Webflow's Design category and the reusable design-process articles linked from it  
**Applies to:** MoneyFlow public experience, authenticated product UI, design-system governance, accessibility, responsive behavior and design review  
**Does not authorize:** a migration to Webflow, copying Webflow layouts or assets, inventing social proof, or replacing explicit MoneyFlow owner decisions

## 1. Why this document exists

The Webflow Design category contains a mix of:

- durable UX and visual-design principles;
- process guidance;
- accessibility and responsive guidance;
- design-system and component guidance;
- motion, typography and color guidance;
- tools, trend roundups, portfolio inspiration and freelance advice.

MoneyFlow must not treat every article as an equal product requirement. This document separates reusable evidence from optional inspiration and records how the useful parts change the project workflow.

The category is a live archive and its public page uses a “Show more” boundary. This file records the complete public category snapshot available on the access date and deep-reads the articles that establish reusable process or product rules. It does not claim that no older, newly published or dynamically hidden Webflow article exists.

## 2. Source boundary

Primary category:

- https://webflow.com/blog/category/design

High-signal articles reviewed in depth:

- https://webflow.com/blog/how-to-learn-web-design
- https://webflow.com/blog/user-centered-design
- https://webflow.com/blog/user-journey-mapping
- https://webflow.com/blog/visual-user-flows
- https://webflow.com/blog/great-ux
- https://webflow.com/blog/homepage-design
- https://webflow.com/blog/hero-image-best-practices
- https://webflow.com/blog/simple-web-design
- https://webflow.com/blog/composition-for-web-design
- https://webflow.com/blog/design-systems
- https://webflow.com/blog/brand-design
- https://webflow.com/blog/from-components-to-systems-that-scale
- https://webflow.com/blog/aria-accessibility
- https://webflow.com/blog/cross-browser-testing
- https://webflow.com/blog/scroll-animations
- https://webflow.com/blog/dark-mode-design
- https://webflow.com/blog/color-theory

Additional category material was inventoried by topic: prototyping, navigation, menus, forms, testimonials, typography, font pairing, carousels, parallax, scrollytelling, animation, UI examples, branding inspiration, portfolios, design tools, freelance practice and visual trends.

## 3. Binding interpretation for MoneyFlow

1. Current MoneyFlow product truth and owner decisions outrank generic design advice.
2. Research evidence accumulates; named visual concepts remain provisional.
3. A reference can inform a decision without becoming the design authority.
4. Design work starts with a user job and success event, not a color or layout trend.
5. Real MoneyFlow behavior and screenshots outrank stock illustrations or generic fintech imagery.
6. Accessibility, responsive behavior and browser compatibility are design constraints, not post-launch polish.
7. The existing Fresh Blue semantic color authority remains active until the owner replaces it.
8. Public routes remain light-only; Light/Dark/System preference is available only inside the signed-in workspace.
9. Financial meaning must remain distinct from decorative brand color.
10. Do not invent user counts, testimonials, savings claims, performance claims or bank connectivity.

---

# 4. Knowledge synthesis

## 4.1 User-centered design

### Retained knowledge

- Research the people, context, constraints and language behind the task before designing a solution.
- Define user requirements separately from business or implementation preferences.
- Explore low-fidelity solutions before committing to visual detail.
- Evaluate and iterate with feedback throughout the lifecycle rather than treating user review as a final approval gate.
- Use behavioral evidence and qualitative feedback together; neither a designer's taste nor a single metric is sufficient.

### MoneyFlow application

Every material UI work packet must identify:

- the user or user segment;
- the job they are trying to complete;
- the context and likely device;
- the current failure or friction;
- the success event;
- the evidence available;
- assumptions that still need validation.

For the public experience, the primary user remains a Vietnamese person who wants to understand personal money without sharing bank credentials or learning accounting terminology.

## 4.2 Journey maps, task flows and information architecture

### Retained knowledge

A user journey and a task flow are not interchangeable:

- a **journey** describes the end-to-end experience, touchpoints, expectations, questions, emotions and blockers;
- a **flow** describes the exact steps and branches required to complete one task.

A useful journey map records:

- user and goal;
- entry point;
- touchpoints;
- user questions;
- blockers and uncertainty;
- expected outcome;
- measurement opportunities.

A useful flow diagram records:

- one objective;
- the main path first;
- decisions and system responses;
- optional branches;
- error, recovery and confirmation states.

### MoneyFlow application

Required public journey:

```text
Discover MoneyFlow
→ Understand what it does and does not do
→ See real product evidence
→ Decide to create a ledger
→ Register or authenticate
→ Enter the workspace
→ Record or review the first transaction
```

Required primary public task flow:

```text
Landing
→ Select “Tạo sổ”
→ Registration
→ Complete authentication
→ Workspace
→ First useful money action
```

Authentication is a family of flows, not one screen:

```text
Login
Registration
Forgot password
Reset/update password
OAuth redirect and callback
CAPTCHA loading/failure/success
Email confirmation where applicable
Session expiry
Return-to-intended-route behavior
```

Any material change to these flows must include the main path, recovery paths and expected system response before high-fidelity implementation begins.

## 4.3 Content-first web design

### Retained knowledge

- Define the page purpose, audience and primary success event before styling.
- Use real or representative final content early; placeholder content hides hierarchy problems.
- A homepage must state the value proposition, provide understandable navigation and make the next action obvious.
- A hero must communicate both value and the next step without requiring the user to decode a visual metaphor.
- Each section should answer a distinct user question.
- Headings, labels and calls to action must remain consistent through the journey.

### MoneyFlow application

Public copy must explain, in plain Vietnamese:

- MoneyFlow is a personal income and expense ledger;
- income, expense and internal transfer remain distinct;
- balances come from transactions rather than unexplained totals;
- users can reopen and inspect the transactions behind a number;
- bank passwords or bank connectivity are not required;
- users can correct, recover and export their data within current product capability.

The current landing narrative is retained because it follows the correct order:

```text
Value proposition
→ primary action
→ real product proof
→ three-step financial explanation
→ control and trust boundaries
→ final action
```

### Copy contract

- One page, one primary H1.
- One primary conversion action across header, hero and closing CTA.
- Secondary actions explain or provide a safe exit; they must not compete with registration.
- Login, registration, recovery and password-update modes require context-specific headings and supporting copy.
- Error, loading, success and empty-state copy must describe what happened and the next safe action.

## 4.4 Wireframes and prototypes

### Retained knowledge

- Flows precede wireframes; wireframes precede visual styling.
- Low fidelity is useful because it keeps discussion on structure, content and interaction rather than polish.
- Prototypes should test uncertain or consequential interactions rather than reproduce every static screen.
- Feedback is most useful when the review question is explicit.

### MoneyFlow application

A material redesign must produce at least two genuinely different low-fidelity structures before one becomes the implementation direction. Variations that only change color, radius or illustration do not count as different structures.

Each wireframe must annotate:

- section or screen purpose;
- content priority;
- primary and secondary action;
- required state and data;
- responsive behavior;
- error or recovery behavior where relevant;
- assumptions to validate.

A prototype is required when uncertainty involves navigation, task order, progressive disclosure, mobile keyboard behavior, gesture/scroll behavior, dialogs, bulk actions or destructive actions.

## 4.5 Visual hierarchy and composition

### Retained knowledge

- Scale, contrast and placement establish hierarchy.
- Whitespace is functional separation, not unused space.
- Proximity groups related information.
- Repetition creates consistency and recognition.
- Balance can be symmetrical or asymmetrical but must still feel intentional.
- Leading lines and directional cues should guide attention toward useful content or action.
- The rule of thirds and other composition heuristics are tools, not mandatory templates.

### MoneyFlow application

- Orientation and route purpose receive the strongest heading.
- A financial number is visually dominant only when it answers the current task.
- Related labels, values and actions stay in one perceptual group.
- Cards are used for meaningful grouping or elevation, not as decoration around every block.
- Borders carry routine structure; shadows are reserved for elevated, floating or primary layers.
- Dense ledger views use alignment and spacing before additional color.
- Long Vietnamese labels and large VND values must be tested without truncating critical meaning.

## 4.6 Homepage and hero

### Retained knowledge

A strong homepage or hero combines:

- a clear value proposition;
- an obvious next action;
- concise supporting explanation;
- purposeful visuals;
- legible typography;
- responsive behavior;
- accessible contrast;
- optimized media.

Stock imagery and decorative motion weaken a hero when they do not explain the product.

### MoneyFlow application

- Keep the current direct H1 structure until evidence shows a better message.
- Keep a registration CTA in the first viewport.
- Use real MoneyFlow product evidence rather than generic banking imagery.
- Product screenshots must remain readable at the target viewport; on small screens, use task-focused crops or a linear sequence rather than shrinking a desktop collage beyond comprehension.
- Hero animation is optional. It must never delay content, hide the CTA or create motion without explanatory value.

## 4.7 Brand, identity and visual language

### Retained knowledge

Brand strategy, brand identity and brand design are related but distinct:

- strategy defines audience, purpose, position and promise;
- identity defines recognizable assets and voice;
- design applies the identity consistently across contexts.

A maintainable identity documents:

- logo and variants;
- typography;
- color roles;
- iconography and illustration;
- examples of correct and incorrect use;
- contextual applications.

### MoneyFlow application

Active identity constraints:

- approved B3.2 logo geometry;
- Fresh Blue brand identity;
- black primary text on light public surfaces;
- public Light-only experience;
- white-first neutral product surfaces;
- separate semantic roles for income, expense, transfer, warning and information;
- no decorative gradient or alternative logo geometry unless explicitly approved.

Brand trust is created by consistent behavior: correct balances, honest claims, understandable actions, recovery, export and privacy boundaries. Color reinforces trust but cannot replace product correctness.

## 4.8 Color

### Retained knowledge

- Hue, saturation and lightness affect hierarchy and tone.
- Color harmony can be monochromatic, analogous, complementary, triadic or tetradic, but context and legibility matter more than naming a scheme.
- High-contrast accent color is appropriate for primary action when it remains accessible.
- Color meaning depends on context and repeated use.
- Color must not be the only signal for state or financial meaning.

### MoneyFlow application

- Neutral canvas and surfaces dominate the interface.
- Fresh Blue is used selectively for identity, focus, primary action and selected state.
- Income green, expense red, warning amber and transfer violet/indigo are used only when those meanings exist.
- Labels, signs, icons, position or shape accompany financial color when misunderstanding matters.
- Contrast is measured against the effective composited background in every supported theme.
- No route or component creates a competing raw brand palette.

## 4.9 Typography

### Retained knowledge

- Legibility, hierarchy, line length, spacing and performance matter more than novelty.
- A type scale should be limited and purposeful.
- Font pairing must create useful contrast without fragmenting the brand.
- Body copy must remain readable on small screens and at text zoom.

### MoneyFlow application

- Inter remains the primary interface typeface unless the owner approves a tested replacement.
- Monetary values use stable numeric alignment and must not be truncated when the layout can reflow.
- Heading size is earned by orientation or narrative importance, not applied to every section.
- Body text targets comfortable line length and at least the project accessibility minimum.
- Font weight and color cannot be the only distinction between required form states.

## 4.10 Design systems and scalable components

### Retained knowledge

A design system is a shared source of truth, not a component gallery. It combines:

- design tokens;
- reusable components and variants;
- patterns and behavior;
- accessibility guidance;
- usage examples;
- governance and maintenance.

Components should have stable purpose, visible variants and documented constraints. A system is designed for evolution rather than declared perfect.

### MoneyFlow application

- `src/app/document-theme.css` is the project-wide semantic theme authority.
- Public roles are mapped through `src/components/public-brand-theme.module.css`.
- Components consume named semantic roles instead of creating local brand palettes.
- Component variants must be reviewed together so state and responsive differences remain coherent.
- New variants require a real recurring need; one-off visual deviations do not automatically become system primitives.
- Design-system drift is audited at least every six months and after a major visual-direction replacement.

Audit targets:

- raw and duplicated color values;
- shadow, radius and spacing drift;
- inaccessible focus or contrast;
- duplicate components with the same purpose;
- undocumented variants;
- stale examples;
- route-level overrides that contradict semantic authority.

## 4.11 Navigation, menus and disclosure

### Retained knowledge

- Navigation follows user goals and content hierarchy.
- Large menus are justified only by real information complexity.
- Progressive disclosure reduces initial complexity when hidden information remains easy to discover.
- Creative navigation must not reduce predictability or keyboard access.

### MoneyFlow application

- Public navigation remains intentionally small.
- Do not add mega menus, carousels or complex navigation to a product with a short public sitemap.
- Signed-in navigation groups work by user task and capability rather than by internal architecture.
- Hidden mobile actions must remain discoverable, reachable and large enough to activate.

## 4.12 Forms and authentication

### Retained knowledge

- Forms should ask only for necessary information.
- Labels remain visible; placeholders are examples, not replacements for labels.
- Validation appears near the relevant field and explains the recovery action.
- Primary action and submission state remain obvious.
- Confirmation must tell the user what happened and what comes next.

### MoneyFlow application

- Preserve visible labels and accessible field relationships.
- Keep login, registration, recovery and update copy mode-specific.
- Preserve generic account-existence-safe server responses where required by security.
- CAPTCHA loading, blocked, failed and successful states must remain understandable.
- Preserve the intended destination after authentication when safe.
- Registration privacy acceptance remains explicit.
- Never request bank credentials.

## 4.13 Accessibility and semantic HTML

### Retained knowledge

- Prefer native semantic HTML before adding ARIA.
- ARIA supplements semantics; it does not repair an incorrect interaction model.
- Interactive controls require accessible names and keyboard operation.
- Focus must remain visible.
- Do not hide a focusable control from assistive technology.
- Test with screen readers and keyboard, not only automated rules.

### MoneyFlow application

Required checks for affected surfaces:

- semantic landmarks and heading order;
- label and accessible-name accuracy;
- keyboard navigation and focus order;
- visible focus in every theme;
- text and control contrast;
- color-independent financial meaning;
- target sizes;
- 200% text zoom;
- reduced-motion behavior;
- screen-reader smoke for new interaction patterns.

Use ARIA only when a native element cannot express the required behavior. Custom widgets carry a higher implementation and testing burden.

## 4.14 Responsive, mobile and cross-browser design

### Retained knowledge

- Responsive design starts from content priority and task completion, not desktop shrinking.
- Browser engines differ; cross-browser testing is a release requirement.
- Test real content, long labels, keyboard behavior, media, zoom and orientation.
- Mobile-first means choosing what remains most important under constraint.

### MoneyFlow application

Required automated viewport coverage remains:

- 320 px phone;
- 360 px phone;
- 390 px phone;
- tablet;
- desktop;
- Chromium and WebKit where the audit supports them.

For affected critical flows also test:

- software keyboard obstruction;
- landscape where relevant;
- long VND values;
- long Vietnamese labels;
- no horizontal overflow;
- no hidden primary action;
- touch target size;
- 200% text;
- Light/Dark workspace behavior;
- public Light-only behavior.

Physical-device review remains necessary for high-impact mobile work because automation cannot fully represent keyboard, browser chrome, touch precision and perceived readability.

## 4.15 Motion, scrolling and carousels

### Retained knowledge

Motion is useful when it:

- guides attention;
- explains hierarchy or transition;
- provides feedback;
- preserves continuity.

Motion is harmful when it:

- delays required information;
- competes with the task;
- causes performance or motion-sensitivity problems;
- hides content behind scroll choreography;
- exists only to imitate a trend.

### MoneyFlow application

- Prefer short state transitions and reveal motion with a static fallback.
- Respect `prefers-reduced-motion`.
- Do not use parallax for financial tasks.
- Do not place critical proof or actions inside an auto-advancing carousel.
- A carousel is allowed only when sequence is genuinely useful, controls are accessible and all content remains reachable without timing pressure.
- Scrollytelling is inappropriate for routine authenticated work and must clear a high evidence bar on marketing pages.

## 4.16 Feedback, testing and iteration

### Retained knowledge

- State the review question before collecting feedback.
- Feedback must be tied to user goals and constraints rather than personal taste alone.
- Validate a journey with real behavior and update it after meaningful product changes.
- Use both qualitative findings and quantitative signals.
- Treat the design system as a maintained product.

### MoneyFlow application

Each material design PR records:

- what was tested;
- device/browser/theme/state coverage;
- evidence artifact location;
- what passed;
- what remains uncertain;
- owner review required;
- post-release signal to observe.

Do not invent a conversion target before a baseline exists. When instrumentation is approved, define the event, denominator, time window and privacy boundary before reporting a number.

---

# 5. Adopt / Adapt / Reject matrix

| Webflow knowledge area | MoneyFlow decision | Application |
|---|---|---|
| User-centered process | **Adopt** | User, job, evidence, requirement, low-fi exploration and iterative evaluation |
| Journey mapping | **Adopt** | Public discovery-to-first-action journey and task-specific flows |
| Real content before polish | **Adopt** | Vietnamese production copy and real product evidence before visual refinement |
| Low-fidelity alternatives | **Adopt** | Multiple structural directions for material redesigns |
| Visual hierarchy and whitespace | **Adopt** | Orientation, action and financial meaning determine prominence |
| Design systems | **Adopt** | One semantic authority, documented components and periodic drift audits |
| Semantic HTML before ARIA | **Adopt** | Native controls first, custom widgets only when justified |
| Cross-browser and mobile testing | **Adopt** | Required Chromium/WebKit and constrained viewport evidence |
| Motion that explains | **Adapt** | Use sparingly; reduced-motion and task continuity are mandatory |
| Dark mode guidance | **Adapt** | Workspace user choice only; public routes remain Light by owner decision |
| Homepage social proof | **Adapt** | Use only verified evidence; never invent testimonials, logos or metrics |
| Color psychology | **Adapt** | Use as a hypothesis and role system, never as proof of trust |
| Carousels | **Generally reject** | No critical content or CTA in timed/hidden slides; use only for a real sequence |
| Parallax and heavy scrollytelling | **Reject for product UI** | Performance, comprehension and accessibility cost exceed value |
| Mega menus | **Reject for current public IA** | Public sitemap is too small to justify them |
| Stock hero imagery | **Reject** | Real MoneyFlow screenshots explain the product better |
| Trend-led visual replacement | **Reject as authority** | Trends may inspire options but cannot bypass product truth and owner selection |
| Portfolio/freelance advice | **Reference only** | Useful for communication, not a product acceptance source |
| Tool roundups | **Reference only** | Tools do not replace the project workflow or authorize new dependencies |

---

# 6. MoneyFlow design operating system

Every material design initiative follows this order:

## Gate 0 — Resolve authority

Read:

1. current code and rendered behavior;
2. current work packet;
3. `docs/design/DESIGN_DIRECTION_STATUS.md`;
4. `docs/research/UI_UX_RESEARCH_LEDGER.md`;
5. `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` for public work;
6. this synthesis for Webflow-derived process evidence.

Record explicit owner decisions that override generic advice.

## Gate 1 — Product truth

Record:

- actual capability;
- forbidden claims;
- financial truth boundary;
- security/privacy boundary;
- affected user and task;
- current production behavior.

## Gate 2 — Goal and evidence

Record:

- user job;
- current problem;
- primary success event;
- available behavioral or qualitative evidence;
- assumptions;
- post-release signal.

## Gate 3 — Journey and flow

Create or update:

- current journey;
- desired journey;
- primary task flow;
- error, recovery and confirmation branches.

## Gate 4 — Content inventory and IA

List:

- required content;
- content owner/source;
- priority;
- page/screen destination;
- label and CTA vocabulary;
- unsupported content to exclude.

## Gate 5 — Low-fidelity structures

For material redesigns, produce genuinely different structures. Review them in grayscale against hierarchy, flow, responsive behavior and product truth.

## Gate 6 — Owner selection

No visual or structural direction becomes authority without explicit owner selection. Document rejected alternatives and the reason without turning them into defaults.

## Gate 7 — Brand and component application

Apply approved:

- logo geometry;
- semantic color roles;
- typography;
- spacing and layout roles;
- components and variants;
- responsive rules;
- motion rules.

Do not create a route-local replacement design system.

## Gate 8 — Implementation evidence

Run the repository's risk-proportional checks. For affected UI, include:

- lint and typecheck;
- relevant unit/contract tests;
- production build;
- keyboard and accessibility checks;
- browser smoke;
- cross-device audit;
- screenshots or video where visual review is required;
- physical-device review when the risk justifies it.

## Gate 9 — Release and learning

Record:

- exact merged/deployed SHA;
- production verification boundary;
- observed user or product signal;
- unresolved uncertainty;
- whether the journey, component or design-system documentation changed.

---

# 7. Required artifacts by change size

## Small visual correction

Examples: one text color, spacing defect, copy correction.

Required:

- current behavior;
- desired behavior;
- semantic role or content source;
- affected states/viewports;
- focused test or visual evidence.

## Bounded component or flow change

Required:

- user job and success event;
- task flow;
- state inventory;
- responsive behavior;
- component/token impact;
- accessibility evidence;
- browser evidence.

## Material route redesign or new public experience

Required:

- product truth and claim boundary;
- user/journey evidence;
- content inventory;
- sitemap/IA impact;
- multiple low-fidelity structures;
- owner-selected direction;
- component/design-system impact;
- accessibility and responsive plan;
- full browser evidence;
- post-release learning plan.

---

# 8. Current MoneyFlow audit against this synthesis

## Already aligned

- Landing has one primary product promise and a first-viewport registration CTA.
- The narrative moves from value to real product proof, workflow, control and a final CTA.
- Product screenshots are real test-environment evidence rather than stock imagery.
- Public copy states manual-first behavior and no bank-password requirement.
- B3.2 logo geometry and Fresh Blue identity are documented.
- Semantic financial colors are separated from brand action color.
- Public routes are light-only and workspace theme remains user-selectable.
- CI includes production build, browser smoke and cross-device Chromium/WebKit audit.
- Reduced-motion handling exists.

## Gaps to close

### P0 — governance and content consistency

1. Add this synthesis to active research navigation and design-direction authority.
2. Keep authentication proof copy specific to login, registration, recovery and update modes.
3. Remove or quarantine stale route-local green/dark palette declarations that conflict with the public Fresh Blue/light-only semantic authority.
4. Record the primary public journey and first-use task flow in every material public-experience packet.

### P1 — mobile product proof

The current mobile hero composes several screenshots in a compact layered stage. Audit whether labels and task evidence remain readable at 320, 360 and 390 px. If not, replace desktop-style overlap with task-focused crops or a linear evidence sequence. Do not change this solely because a reference article prefers another composition.

### P2 — measurement baseline

Define a privacy-safe baseline only after the event contract is approved:

```text
landing viewed
→ register CTA selected
→ registration reached
→ registration completed
→ first workspace action completed
```

Do not publish conversion claims without a defined denominator, time window and sufficient data.

### P3 — recurring design-system audit

Run at least every six months and after a major brand or theme replacement. Record drift, accessibility failures, duplicate components and stale documentation as bounded work rather than silently accumulating overrides.

---

# 9. Review checklist

## Strategy and content

- [ ] User and job are named.
- [ ] Current problem and success event are defined.
- [ ] Claims match current capability.
- [ ] Content is real, specific and proofread.
- [ ] CTA vocabulary is consistent.
- [ ] No invented testimonials, metrics or partner logos.

## Flow and structure

- [ ] Journey and task flow are documented at the appropriate change size.
- [ ] Primary path is obvious.
- [ ] Error, recovery and confirmation paths are covered.
- [ ] One H1 communicates route purpose.
- [ ] Primary action is visible and not competing with unrelated actions.

## Visual system

- [ ] Approved B3.2 geometry is unchanged unless explicitly authorized.
- [ ] Semantic tokens are used instead of a local palette.
- [ ] Financial colors retain their meanings.
- [ ] Typography hierarchy is limited and legible.
- [ ] Whitespace and grouping communicate structure before decoration.

## Accessibility and responsive behavior

- [ ] Native semantic elements are preferred.
- [ ] Accessible names and labels are accurate.
- [ ] Keyboard and focus behavior pass.
- [ ] Contrast passes on effective backgrounds.
- [ ] Meaning does not depend on color alone.
- [ ] 200% text and reduced motion pass.
- [ ] 320/360/390, tablet and desktop pass.
- [ ] Chromium and WebKit pass.
- [ ] Critical mobile actions are not obscured by the software keyboard.

## Evidence and governance

- [ ] Review question and evidence are recorded.
- [ ] Owner selection is recorded for material visual directions.
- [ ] Rejected options are not retained as defaults.
- [ ] Design-system impact is documented.
- [ ] Exact-head verification and production boundary are explicit.
- [ ] Post-release signal or remaining uncertainty is recorded.

## 10. Final interpretation

The durable lesson from the Webflow Design category is not a preferred aesthetic. It is a disciplined sequence:

```text
Understand the user
→ define the goal
→ map the journey and flow
→ organize real content
→ explore structure at low fidelity
→ select a direction
→ apply a coherent system
→ implement accessibly and responsively
→ verify across browsers and devices
→ learn and maintain the system
```

MoneyFlow adopts this sequence while preserving its own product truth, financial semantics, brand authority, public Light-only rule and owner-controlled design decisions.
