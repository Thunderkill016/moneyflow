# Webflow Design category synthesis for MoneyFlow

**Status:** active, concept-neutral research companion
**Accessed:** 2026-08-04
**Scope:** current public Webflow Design category snapshot and reusable process articles linked from it
**Applies to:** public experience, authenticated UI, design-system governance, accessibility, responsive behavior and design review
**Does not authorize:** migration to Webflow, copying layouts/assets, invented social proof or replacement of explicit MoneyFlow owner decisions

## 1. Purpose and research boundary

Webflow's Design category mixes durable design knowledge with tools, trends, portfolios and freelance advice. MoneyFlow must not treat every article as an equal product requirement.

The category is a live archive and exposes a “Show more” boundary. This document records the public snapshot available on the access date and deep-synthesizes the articles that establish reusable process or product rules. It does not claim permanent historical completeness.

Primary category:

- https://webflow.com/blog/category/design

The topic inventory and source map live in:

- `WEBFLOW_DESIGN_CATEGORY_INVENTORY.md`
- `WEBFLOW_DESIGN_CATEGORY_SOURCES.md`

The concise project decisions live in:

- `WEBFLOW_DESIGN_CATEGORY_DECISION_LOG.md`

## 2. MoneyFlow interpretation rules

1. Current product truth and explicit owner decisions outrank generic design advice.
2. Research evidence accumulates; named visual concepts remain provisional.
3. Design starts with a user job and success event, not a trend or palette.
4. Real MoneyFlow behavior and screenshots outrank stock fintech imagery.
5. Accessibility, responsive behavior and browser compatibility are design constraints.
6. B3.2 geometry, Fresh Blue, public Light-only routes and workspace theme choice remain active.
7. Financial semantic colors remain distinct from brand color.
8. No user count, testimonial, savings claim, bank connectivity or performance claim is invented.
9. Inspiration and tool lists generate options; they do not become design authority.
10. Material visual directions require owner selection before implementation becomes a baseline.

---

# 3. Knowledge synthesis

## 3.1 User-centered design

### Reusable knowledge

- Understand people, context, constraints and language before proposing a solution.
- Separate user requirements from business preferences and implementation convenience.
- Explore low-fidelity solutions before committing to visual detail.
- Involve feedback throughout the lifecycle rather than at final approval only.
- Combine qualitative findings and behavioral evidence.

### MoneyFlow contract

Every material UI packet identifies:

- user or segment;
- job to be completed;
- likely device and context;
- current failure or friction;
- success event;
- evidence available;
- assumptions still unverified.

For public work, the primary user is a Vietnamese person who wants to understand personal money without sharing bank credentials or learning accounting terminology.

## 3.2 Journey maps and task flows

A journey and a flow serve different purposes:

- **Journey:** end-to-end experience, touchpoints, questions, expectations, emotions and blockers.
- **Flow:** exact steps, decisions, system responses and recovery paths for one task.

A journey map records:

- user and goal;
- entry point;
- touchpoints;
- questions and uncertainty;
- blockers;
- desired outcome;
- measurement opportunities.

A task flow records:

- one objective;
- main path first;
- decisions;
- system responses;
- optional branches;
- error, recovery and confirmation states.

### Public journey

```text
Discover MoneyFlow
→ Understand what it does and does not do
→ See real product evidence
→ Decide to create a ledger
→ Register or authenticate
→ Enter the workspace
→ Complete the first useful money action
```

### Primary public flow

```text
Landing
→ Select “Tạo sổ”
→ Registration
→ Complete authentication
→ Workspace
→ Record or review the first transaction
```

Authentication remains a family of flows:

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

## 3.3 Information architecture and content-first design

### Reusable knowledge

- Define page purpose, audience and success event before styling.
- Use real content early because placeholders hide hierarchy problems.
- A homepage states the value proposition, provides understandable navigation and makes the next action obvious.
- A hero communicates value and next step without requiring users to decode a metaphor.
- Each section answers one user question.
- Labels and CTA language remain consistent across the journey.

### MoneyFlow public copy must explain

- MoneyFlow is a personal income and expense ledger.
- Income, expense and internal transfer remain distinct.
- Balances come from transactions rather than unexplained totals.
- Users can reopen transactions behind a number.
- Bank passwords or bank connectivity are not required.
- Correction, recovery and export claims stay within current capability.

### Current landing narrative retained

```text
Value proposition
→ primary action
→ real product proof
→ three-step financial explanation
→ control and trust boundaries
→ final action
```

### Copy rules

- One primary H1 per page.
- One primary conversion action across header, hero and closing CTA.
- Secondary actions explain or provide a safe exit; they do not compete.
- Login, registration, recovery and password update need context-specific copy.
- Error, loading, success and empty states describe what happened and the next safe action.

## 3.4 Wireframes and prototypes

- Flows precede wireframes; wireframes precede visual styling.
- Low fidelity keeps review focused on content, hierarchy and interaction.
- Prototypes test uncertainty rather than reproduce every static screen.
- Feedback is more useful when the review question is explicit.

A material redesign produces at least two genuinely different low-fidelity structures. Variants that only change color, radius or illustration do not count.

Wireframes annotate:

- purpose;
- content priority;
- primary and secondary action;
- required data and state;
- responsive behavior;
- error/recovery behavior;
- assumptions to validate.

Prototype when uncertainty involves:

- navigation or task order;
- progressive disclosure;
- mobile keyboard behavior;
- gesture or scroll behavior;
- dialogs;
- bulk actions;
- destructive actions.

## 3.5 Visual hierarchy and composition

### Reusable knowledge

- Scale, contrast and placement establish hierarchy.
- Whitespace is functional separation.
- Proximity groups related information.
- Repetition creates recognition and consistency.
- Balance may be symmetrical or asymmetrical but must be intentional.
- Directional cues guide attention toward useful information or action.
- Composition heuristics are tools, not mandatory templates.

### MoneyFlow application

- Route purpose receives the strongest heading.
- A financial number is dominant only when it answers the current task.
- Related label, value and action stay in one perceptual group.
- Cards represent meaningful grouping or elevation, not decoration around everything.
- Borders carry routine structure; shadows are reserved for elevated or primary layers.
- Dense ledger views use alignment and spacing before more color.
- Long Vietnamese labels and VND values must reflow without losing critical meaning.

## 3.6 Homepage and hero

A strong hero combines:

- clear value proposition;
- obvious next action;
- concise supporting explanation;
- purposeful visual evidence;
- legible typography;
- accessible contrast;
- responsive and optimized media.

MoneyFlow applies this by:

- keeping a direct H1 until evidence supports a better message;
- keeping registration visible in the first viewport;
- using real product evidence rather than generic banking imagery;
- making screenshots readable at target viewports;
- using task-focused crops or a linear sequence on mobile when a desktop collage becomes unreadable;
- treating hero motion as optional and never allowing it to delay content or hide the CTA.

## 3.7 Brand, identity and visual language

Brand strategy, identity and design are distinct:

- strategy defines audience, purpose, position and promise;
- identity defines recognizable assets and voice;
- design applies the identity consistently across contexts.

Maintainable identity documentation covers:

- logo and variants;
- typography;
- color roles;
- iconography and illustration;
- correct and incorrect use;
- contextual applications.

Active MoneyFlow constraints:

- approved B3.2 geometry;
- Fresh Blue identity;
- black primary text on light public surfaces;
- public Light-only experience;
- white-first neutral surfaces;
- separate income, expense, transfer, warning and information roles;
- no decorative gradient or alternative logo geometry without approval.

Trust comes from consistent product behavior: correct balances, honest claims, understandable actions, recovery, export and privacy boundaries. Color supports trust but cannot create it alone.

## 3.8 Color

### Reusable knowledge

- Hue, saturation and lightness affect hierarchy and tone.
- Harmony schemes are tools; context and legibility matter more than naming a scheme.
- High-contrast accent color can support primary action.
- Color meaning depends on context and repeated use.
- Color cannot be the only state or financial signal.

### MoneyFlow application

- Neutral canvas and surfaces dominate.
- Fresh Blue is selective: identity, focus, primary action and selected state.
- Income green, expense red, warning amber and transfer violet/indigo appear only when those meanings exist.
- Labels, signs, icons, position or shape accompany financial color where misunderstanding matters.
- Contrast is measured on the effective composited background.
- Routes and components do not create competing brand palettes.

## 3.9 Typography

- Legibility, hierarchy, line length, spacing and performance outrank novelty.
- Use a limited, purposeful type scale.
- Font pairing creates useful contrast without fragmenting identity.
- Body copy remains readable on small screens and at text zoom.

MoneyFlow rules:

- Inter remains the primary interface typeface until an approved tested replacement exists.
- Monetary values use stable numeric alignment.
- Values are not truncated when layout can reflow.
- Large headings are reserved for orientation or narrative importance.
- Body text uses comfortable line length and accessible size/contrast.
- Required form states cannot depend only on weight or color.

## 3.10 Design systems and scalable components

A design system is a maintained shared source of truth combining:

- tokens;
- reusable components and variants;
- interaction patterns;
- accessibility guidance;
- usage examples;
- governance.

MoneyFlow authority:

- `src/app/document-theme.css` owns project-wide semantic theme roles.
- `src/components/public-brand-theme.module.css` maps public roles.
- Components consume named roles rather than local palettes.
- Variants are reviewed together so states and responsive behavior remain coherent.
- A new variant requires a recurring need.
- Design-system drift is audited at least every six months and after major visual replacement.

Audit for:

- raw or duplicated color values;
- spacing, radius and shadow drift;
- inaccessible focus or contrast;
- duplicate components with the same purpose;
- undocumented variants;
- stale examples;
- route-level overrides contradicting semantic authority.

## 3.11 Navigation and disclosure

- Navigation follows user goals and content hierarchy.
- Large menus require real information complexity.
- Progressive disclosure may reduce initial complexity when hidden information remains discoverable.
- Creative navigation cannot reduce predictability or keyboard access.

MoneyFlow decisions:

- Keep public navigation small.
- Reject mega menus for the current public sitemap.
- Group signed-in navigation by user task and capability, not internal architecture.
- Keep hidden mobile actions discoverable, reachable and large enough to activate.

## 3.12 Forms and authentication

### Reusable knowledge

- Ask only for necessary information.
- Keep labels visible; placeholders are examples, not labels.
- Put validation near the field and explain recovery.
- Keep primary action and submission state obvious.
- Confirmation states explain what happened and what comes next.

### MoneyFlow application

- Preserve visible labels and accessible field relationships.
- Keep login, registration, recovery and update copy mode-specific.
- Preserve account-existence-safe server responses where security requires them.
- Make CAPTCHA loading, blocked, failed and successful states understandable.
- Preserve intended destination after authentication when safe.
- Keep registration privacy acceptance explicit.
- Never request bank credentials.

## 3.13 Accessibility and semantic HTML

- Prefer native semantic HTML before ARIA.
- ARIA supplements semantics; it does not repair a wrong interaction model.
- Interactive controls need accessible names and keyboard operation.
- Focus remains visible.
- Do not hide focusable controls from assistive technology.
- Test keyboard and screen-reader behavior, not automated rules alone.

Affected surfaces require checks for:

- landmarks and heading order;
- label and accessible-name accuracy;
- keyboard navigation and focus order;
- visible focus;
- text/control contrast;
- color-independent financial meaning;
- target size;
- 200% text zoom;
- reduced motion;
- screen-reader smoke for new interaction patterns.

## 3.14 Responsive, mobile and cross-browser design

- Responsive design starts from content priority and task completion, not desktop shrinking.
- Browser engines differ; cross-browser testing is a release requirement.
- Test real content, long labels, keyboards, media, zoom and orientation.
- Mobile-first means deciding what remains most important under constraint.

Required automated viewports remain:

- 320 px;
- 360 px;
- 390 px;
- tablet;
- desktop;
- Chromium and WebKit where supported.

Critical-flow checks include:

- software keyboard obstruction;
- landscape where relevant;
- long VND values and Vietnamese labels;
- horizontal overflow;
- hidden primary action;
- touch target size;
- 200% text;
- workspace Light/Dark behavior;
- public Light-only behavior.

Physical-device review remains necessary for high-impact mobile work.

## 3.15 Motion, scrolling and carousels

Motion is useful when it guides attention, explains hierarchy or transition, provides feedback or preserves continuity.

Motion is harmful when it delays required information, competes with the task, causes performance/motion-sensitivity problems or hides content behind scroll choreography.

MoneyFlow decisions:

- Prefer short state transitions and reveal motion with static fallback.
- Respect `prefers-reduced-motion`.
- Reject parallax for financial tasks.
- Do not place critical proof or action in an auto-advancing carousel.
- Allow a carousel only for a genuine sequence with accessible controls and no timing pressure.
- Heavy scrollytelling is inappropriate for routine authenticated work.

## 3.16 Feedback, testing and iteration

- State the review question before collecting feedback.
- Tie feedback to user goals and constraints, not taste alone.
- Validate journeys with behavior and update them after meaningful changes.
- Use qualitative and quantitative signals together.
- Treat the design system as a maintained product.

Material design PRs record:

- what was tested;
- browser/device/theme/state coverage;
- evidence location;
- what passed;
- remaining uncertainty;
- owner review required;
- post-release signal.

Do not invent a conversion target before a baseline exists. Instrumentation requires an event definition, denominator, time window and privacy boundary.

---

# 4. Adopt / Adapt / Reject

## Adopt

- User/job/evidence before visual work.
- Journey and task-flow distinction.
- Real content before polish.
- Multiple low-fidelity structures for material redesign.
- Visual hierarchy and whitespace as functional tools.
- One semantic design authority.
- Native HTML before ARIA.
- Mobile, text-zoom, keyboard and cross-browser verification.
- Explicit feedback and maintenance loops.

## Adapt

- Dark mode: workspace choice only; public remains Light by owner decision.
- Social proof: verified evidence only; no invented testimonials or metrics.
- Color psychology: hypothesis and role discipline, not proof of trust.
- Motion: short, explanatory and optional with reduced-motion fallback.
- Conversion measurement: establish a privacy-safe baseline before targets.
- Homepage examples: borrow principles, not exact structure or styling.

## Reject for the current product

- Mega-menu public navigation.
- Stock hero imagery.
- Parallax or heavy scrollytelling in authenticated finance flows.
- Critical information hidden in timed carousels.
- Trend-led visual replacement without evidence and owner selection.
- Platform/tool migration justified by roundup content.

## Reference only

- Portfolio and freelance advice.
- Tool and course roundups.
- Inspiration galleries.
- Trend/style lists.

---

# 5. MoneyFlow design operating system

## Gate 0 — resolve authority

Read current code/rendered behavior, work packet, design-direction status, cumulative UI/UX ledger, public foundation for public work and this synthesis.

## Gate 1 — product truth

Record actual capability, forbidden claims, financial truth, privacy/security boundary, affected user/task and current production behavior.

## Gate 2 — goal and evidence

Record user job, problem, success event, available evidence, assumptions and post-release signal.

## Gate 3 — journey and flow

Create/update current journey, desired journey, primary flow and error/recovery/confirmation branches.

## Gate 4 — content and IA

List required content, source, priority, destination, CTA vocabulary and unsupported content to exclude.

## Gate 5 — low-fidelity structures

Produce genuinely different structures for material redesigns. Review in grayscale against hierarchy, flow, responsive behavior and product truth.

## Gate 6 — owner selection

No structural or visual direction becomes authority without explicit owner selection. Record rejected alternatives without retaining them as defaults.

## Gate 7 — system application

Apply approved logo, semantic color, typography, spacing, components, responsive rules and motion rules. Do not create a route-local replacement design system.

## Gate 8 — implementation evidence

Run risk-proportional checks. Affected UI includes relevant unit contracts, build, accessibility, browser smoke, cross-device audit and visual evidence where needed.

## Gate 9 — release and learning

Record exact merged/deployed SHA, production verification boundary, observed signal, unresolved uncertainty and documentation changes.

---

# 6. Required artifacts by change size

## Small visual or copy correction

- current behavior;
- desired behavior;
- semantic role/content source;
- affected states and viewports;
- focused test or visual evidence.

## Bounded component or flow change

- user job and success event;
- task flow;
- state inventory;
- responsive behavior;
- component/token impact;
- accessibility evidence;
- browser evidence.

## Material route redesign

- product truth and claims;
- journey evidence;
- content inventory;
- sitemap/IA impact;
- multiple low-fidelity structures;
- owner-selected direction;
- system impact;
- accessibility/responsive plan;
- full browser evidence;
- learning plan.

---

# 7. Current MoneyFlow audit

## Already aligned

- Landing has one primary promise and first-viewport registration CTA.
- Narrative moves from value to real product proof, workflow, control and final CTA.
- Screenshots are real test-environment evidence rather than stock imagery.
- Public copy states manual-first behavior and no bank-password requirement.
- B3.2 and Fresh Blue are documented.
- Financial semantic colors are separate from brand action.
- Public routes are Light-only; workspace theme is selectable.
- CI includes build, browser smoke and Chromium/WebKit audit.
- Reduced-motion handling exists.

## P0 gaps

1. Keep authentication proof copy specific to login, registration, recovery and update.
2. Remove or quarantine stale route-local green/dark declarations competing with public Fresh Blue/light-only authority.
3. Record the public journey and first-use flow in material public packets.
4. Keep this synthesis linked from research navigation and design authority.

## P1 — mobile product proof

Audit the layered mobile screenshot stage at 320/360/390 px. Replace it with task-focused crops or a linear sequence only if evidence shows unreadability.

## P2 — measurement baseline

Define a privacy-safe funnel only after event approval:

```text
landing viewed
→ registration CTA selected
→ registration reached
→ registration completed
→ first workspace action completed
```

Do not report conversion without denominator, time window and sufficient data.

## P3 — recurring system audit

Run at least every six months and after major brand/theme replacement. Record drift, accessibility failures, duplicate components and stale documentation as bounded work.

---

# 8. Review checklist

## Strategy and content

- [ ] User, job, problem and success event are named.
- [ ] Claims match current capability.
- [ ] Content is real, specific and proofread.
- [ ] CTA vocabulary is consistent.
- [ ] No invented social proof or metrics.

## Flow and structure

- [ ] Journey and flow are documented at the right change size.
- [ ] Main path is obvious.
- [ ] Error, recovery and confirmation paths are covered.
- [ ] One H1 communicates route purpose.
- [ ] Primary action is visible and not competing.

## Visual system

- [ ] B3.2 is unchanged unless authorized.
- [ ] Semantic tokens replace local palettes.
- [ ] Financial colors retain meaning.
- [ ] Typography is limited and legible.
- [ ] Grouping and whitespace carry structure before decoration.

## Accessibility and responsive behavior

- [ ] Native semantics are preferred.
- [ ] Names and labels are accurate.
- [ ] Keyboard/focus behavior passes.
- [ ] Contrast passes on effective backgrounds.
- [ ] Meaning does not depend on color.
- [ ] 200% text and reduced motion pass.
- [ ] 320/360/390, tablet and desktop pass.
- [ ] Chromium and WebKit pass.
- [ ] Mobile keyboard does not hide critical actions.

## Evidence and governance

- [ ] Review question and evidence are recorded.
- [ ] Owner selection exists for material directions.
- [ ] Rejected options are not defaults.
- [ ] Design-system impact is documented.
- [ ] Exact-head verification and production boundary are explicit.
- [ ] Remaining uncertainty and post-release signal are recorded.

## 9. Final interpretation

The durable sequence is:

```text
Understand the user
→ define the goal
→ map journey and flow
→ organize real content
→ explore low-fidelity structure
→ select a direction
→ apply one coherent system
→ implement accessibly and responsively
→ verify across browsers and devices
→ learn and maintain the system
```

MoneyFlow adopts that sequence while preserving its product truth, financial semantics, brand authority, public Light-only rule and owner-controlled design decisions.
