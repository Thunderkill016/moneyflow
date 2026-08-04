# Web design process convergence — UX Pilot, Framer and MoneyFlow

**Status:** active process companion
**Accessed:** 2026-08-04
**Sources:**

- https://uxpilot.ai/blogs
- https://uxpilot.ai/blogs/web-design-process
- https://www.framer.com/blog/web-design-process/
- https://www.framer.com/blog/tutorials
- https://www.framer.com/blog/inspiration
- https://www.framer.com/academy/
- https://www.framer.com/design/
- https://www.framer.com/brand

This document supplements `WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md`. It records what UX Pilot and Framer add to the MoneyFlow design operating system after reviewing their currently discoverable public design corpora.

## 1. Source roles

### UX Pilot contributes

- explicit discovery and competitor research;
- scope, objectives, milestones, ownership and change control;
- design thinking and methodology selection;
- user/persona/journey/flow mapping;
- wireframing, rapid prototyping and high-fidelity transition;
- product design specifications and handoff detail;
- usability heuristics, metrics and post-launch testing;
- design-system principles, governance and contribution models;
- ethical, privacy, accessibility and cross-device considerations;
- AI-assisted exploration with human review.

### Framer contributes

- written brief as the first deliverable;
- project-plan deliverables and approvals;
- sitemap and wireframes before visual system application;
- grids, breakpoints, forms, navigation, accessibility and media-performance rules inside the design system;
- separation of private exploration pages from production web pages;
- interactive prototype and staging review;
- centralized feedback and documented scope decisions;
- launch, publishing, SEO and post-launch measurement;
- component sizing, properties and reusable asset contracts;
- restrained motion that has purpose and clear responsive behavior.

### Webflow already contributes

- user-centered design;
- journeys and task flows;
- content-first hierarchy;
- composition, color, typography and brand systems;
- semantic HTML and accessibility;
- responsive and cross-browser verification;
- feedback and system maintenance.

## 2. What the three sources agree on

The sources converge on a stable sequence:

```text
Research
→ brief and scope
→ sitemap and user flows
→ content inventory
→ low-fidelity wireframes
→ design system and visual direction
→ high-fidelity prototype
→ feedback and usability testing
→ implementation and QA
→ launch
→ measurement and iteration
```

They also agree that:

- aesthetics cannot rescue unclear goals or structure;
- sitemap, flows and hierarchy are cheaper to change before code;
- real content exposes layout problems earlier than placeholders;
- systems reduce drift only when they include governance and documentation;
- accessibility and responsive behavior belong in the foundation;
- feedback should be structured and centralized;
- launch is not the end of design;
- AI accelerates ideation but does not remove judgment, review or testing.

## 3. Where the sources differ

### Wireframe content

UX Pilot's web-design process article recommends low-fidelity boxes and placeholder content to keep early review focused on function. Webflow emphasizes using realistic content early because placeholders hide hierarchy problems.

**MoneyFlow resolution:**

- first structural sketch may use labels and approximate blocks;
- before owner selection, wireframes must use representative Vietnamese headlines, CTA labels, long values and critical form copy;
- high fidelity must use production-intent content.

### Tool-to-production handoff

Framer promotes one-canvas design, prototype and publishing. UX Pilot promotes generation and handoff to design/development tools. MoneyFlow is a custom Next.js application with repository governance.

**MoneyFlow resolution:**

- use tools for exploration and evidence;
- source code, semantic tokens, tests and repository history remain implementation authority;
- no external canvas becomes production truth without code review and exact-head evidence.

### Numerical targets and marketing claims

UX Pilot and Framer articles contain example conversion targets, user-study sizes, performance values and marketing statistics.

**MoneyFlow resolution:**

- examples may illustrate how to define a metric;
- no number becomes a MoneyFlow target without baseline, event definition, denominator, time window, privacy boundary and owner approval;
- unverified vendor claims are not copied into product documentation.

### Trends and interaction effects

Both sites publish visual trends, animation, hover, parallax and inspiration content.

**MoneyFlow resolution:**

- trend material generates candidate directions only;
- motion must explain state, hierarchy, feedback or continuity;
- parallax and heavy scrollytelling are rejected for authenticated financial tasks;
- critical content and actions never depend on timed carousels or decorative effects.

---

# 4. MoneyFlow delivery contract

## Phase 0 — authority and current truth

Read:

- current code and rendered behavior;
- active work packet;
- `docs/product/PRINCIPLES.md`;
- `docs/design/DESIGN_DIRECTION_STATUS.md`;
- `docs/research/UI_UX_RESEARCH_LEDGER.md`;
- `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` for public work;
- `WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md`;
- this convergence document.

Record any owner decision that overrides generic advice.

## Phase 1 — written design brief

Every material design task begins with a brief containing:

- problem statement;
- affected user and job;
- product/business objective;
- primary success event;
- scope and non-scope;
- product-truth and forbidden-claim boundary;
- affected routes and states;
- target devices and browser engines;
- content requirements and owner;
- dependencies and constraints;
- financial, security and privacy boundaries;
- expected evidence;
- decision owner.

A small correction may use a compact brief in the work packet. A material redesign needs a standalone brief or equivalent packet section.

## Phase 2 — project plan and change control

Record:

- deliverables;
- milestones or sequence;
- responsible owner for design, content, implementation and QA;
- required sign-offs;
- dependency order;
- known risks;
- change-control rule;
- release boundary.

Scope changes after structure or visual-direction approval must be written into the packet or PR. They cannot enter silently through implementation.

## Phase 3 — research and evidence

Use the smallest sufficient research set:

- current product behavior;
- support/owner findings;
- analytics where approved;
- usability observations;
- competitor/reference patterns with Adopt / Adapt / Reject notes;
- accessibility and platform standards;
- technical constraints.

Do not claim market demand or user preference without evidence.

## Phase 4 — journey, flow and information architecture

Create or update:

- current journey;
- desired journey;
- primary task flow;
- error, recovery and confirmation branches;
- sitemap or route impact;
- navigation model;
- content inventory.

Every screen or section must have a purpose and a clear next action.

## Phase 5 — low-fidelity structures

For material redesigns, produce at least two genuinely different structures.

Each structure shows:

- information hierarchy;
- first attention target;
- primary and secondary actions;
- real or representative Vietnamese copy;
- required data and states;
- responsive transformation;
- long-label and long-value behavior;
- assumptions to test.

Review structures in grayscale before committing to color, effects or illustration.

## Phase 6 — selected direction and design system

Owner selection is required before a material visual direction becomes active.

Apply or define:

- grid and layout rules;
- responsive breakpoints based on content failure, not device names alone;
- semantic color roles;
- typography scale and line lengths;
- spacing and density;
- component variants and states;
- form behavior;
- navigation behavior;
- motion rules;
- image/media budgets;
- accessibility requirements;
- content voice.

The system must distinguish:

- principles — how decisions are made;
- tokens — named values;
- components — reusable coded elements;
- patterns — multi-component task solutions;
- documentation — examples and constraints;
- governance — ownership, contribution and versioning.

## Phase 7 — high-fidelity prototype

High fidelity uses production-intent content and covers:

- default state;
- hover/focus/active/disabled state;
- loading, empty, error and success state;
- keyboard and screen-reader semantics;
- mobile/tablet/desktop behavior;
- software-keyboard behavior where forms are involved;
- reduced-motion fallback;
- long Vietnamese copy and VND values;
- real product media or evidence.

Prototype only uncertain or consequential interactions; do not spend time reproducing static screens without a review question.

## Phase 8 — structured feedback

Feedback is centralized and classified:

- blocker;
- in-scope improvement;
- out-of-scope request;
- subjective preference;
- evidence-backed usability issue;
- technical constraint;
- follow-up hypothesis.

Each review asks targeted questions, for example:

- Can the user explain the page purpose?
- Is the next action obvious?
- Can the task be completed without instruction?
- Is navigation predictable?
- Is the content readable at target sizes?
- Does the design still match the original brief?

Document accepted, rejected and deferred feedback with reason.

## Phase 9 — design specification and implementation handoff

The implementation contract includes:

- exact component and route ownership;
- token and variant usage;
- dimensions only where behavior requires them;
- responsive rules;
- interaction states;
- content source;
- accessibility semantics;
- data/state requirements;
- performance/media requirements;
- analytics events only when approved;
- acceptance tests;
- forbidden shortcuts or parallel systems.

The specification describes intent and behavior, not just pixels.

## Phase 10 — implementation and QA

Risk-proportional verification includes:

- diff hygiene;
- lint and typecheck;
- relevant unit and contract tests;
- production build;
- semantic/keyboard/focus review;
- color and contrast review;
- target size and 200% text;
- reduced motion;
- browser smoke;
- 320/360/390 phone, tablet and desktop;
- Chromium and WebKit;
- long content and money values;
- no horizontal overflow;
- no hidden critical action;
- physical-device review for high-impact mobile changes.

## Phase 11 — staging and release sign-off

Before merge or production release, record:

- exact head SHA;
- required checks and their conclusions;
- visual evidence location;
- content proofread result;
- route/link/form result;
- SEO/metadata impact where applicable;
- production and provider boundaries;
- owner sign-off required;
- known residual risk.

Exploration pages, mockups and design canvases are not production evidence.

## Phase 12 — post-launch learning

After release, record the smallest useful learning loop:

- intended signal;
- event definition and privacy boundary;
- observation window;
- qualitative feedback source;
- defects or confusion found;
- decision: keep, refine, revert or investigate.

Do not A/B test financial truth, security behavior or accessibility obligations. A/B tests are for legitimate alternatives where users are not misled or harmed.

---

# 5. Design-system principles adopted for MoneyFlow

## 5.1 Consistency over sameness

Preserve familiar logic, semantics, spacing rationale and state behavior while allowing route-specific composition.

## 5.2 Accessibility by default

Accessibility lives in tokens, components, patterns and tests so teams do not need to remember it manually on every screen.

## 5.3 Product truth before persuasion

A clear limitation is better than an attractive unsupported claim.

## 5.4 One semantic authority

Components consume named roles. A route cannot create a second brand palette or competing component system.

## 5.5 Reuse follows recurring need

A one-off visual does not become a reusable primitive until a second real use and stable purpose exist.

## 5.6 Governance is part of the system

Every system asset needs ownership, status, usage guidance and a path for change or deprecation.

## 5.7 AI output is a proposal

Generated screens, components, copy and code remain proposals until reviewed against product truth, accessibility, design authority and repository tests.

---

# 6. Performance, SEO and content thresholds

Generic sources recommend setting technical thresholds during design. MoneyFlow adopts the principle, not arbitrary numbers.

For each material public change, define applicable budgets for:

- image dimensions and file size;
- font loading;
- first-viewport media;
- route bundle impact;
- layout stability;
- metadata and canonical URL;
- heading hierarchy;
- descriptive links and alt text;
- sitemap/robots implications;
- redirect behavior when routes move.

Use project measurements and repository policy to select thresholds. Do not copy a vendor's example limit without context.

---

# 7. MoneyFlow-specific public workflow

## Objective

Help a Vietnamese user understand MoneyFlow and confidently create a personal ledger.

## Public journey

```text
Discover
→ understand product truth
→ inspect real proof
→ understand the money flow
→ understand control/privacy
→ register or login
→ enter workspace
→ complete first useful action
```

## Public design rules

- public routes remain Light-only;
- B3.2 geometry remains canonical;
- Fresh Blue is identity/action, not financial meaning;
- login text on light public surfaces uses primary black text;
- one primary registration action remains consistent;
- real MoneyFlow proof outranks stock imagery;
- proof must remain readable at 320/360/390 px;
- auth copy is mode-specific;
- no invented testimonials, user counts or savings claims;
- no bank-password or bank-sync implication;
- SEO content must remain natural and truthful.

---

# 8. Current implementation findings

## P0

- Auth proof-rail heading currently uses login language across multiple modes and should become mode-specific.
- `landing-page.module.css` retains old green/dark fallback declarations even though semantic public Fresh Blue/light-only roles override them; these should be removed or quarantined to eliminate a parallel palette.
- Material public packets must include the public journey, flow and content inventory.

## P1

- Verify whether the layered hero screenshots remain understandable at 320/360/390 px. Replace with task-focused crops or a linear sequence only when evidence shows unreadability.
- Review public image/media budgets and metadata as part of the next landing implementation PR.

## P2

- Establish a privacy-safe public funnel baseline before setting conversion targets.
- Add a recurring design-system drift audit after major identity/theme changes and at least every six months.

## Boundary

These findings are recorded by the research PR. They are not silently implemented inside a documentation-only change.

---

# 9. Adopt / Adapt / Reject

## Adopt

- written brief;
- scope, ownership and change control;
- research and competitor audit;
- sitemap, journey and task flow;
- multiple low-fidelity structures;
- representative content before selection;
- design-system principles, tokens, components, patterns and governance;
- high-fidelity state coverage;
- centralized feedback and decision log;
- design specification and acceptance tests;
- responsive, accessibility and cross-browser QA;
- staging sign-off and post-launch learning.

## Adapt

- AI-assisted wireframe and high-fidelity generation;
- conversion guidance;
- usability metrics and A/B testing;
- SEO and performance examples;
- animation and interaction tutorials;
- testimonials and social proof;
- Framer's design-to-publish model.

## Reject

- copying layouts or cloned UI as a final design method;
- arbitrary vendor metrics as MoneyFlow targets;
- tool-specific architecture replacing Next.js/repository authority;
- trend-led redesign without user problem and owner selection;
- heavy decorative motion in finance workflows;
- auto-advancing critical content;
- invented proof or persuasive dark patterns.

## Reference only

- tool pricing and comparisons;
- portfolios and creator stories;
- style/trend galleries;
- vendor speed claims;
- platform sales material.

# 10. Final operating principle

MoneyFlow uses tools to explore, systems to stay coherent, evidence to decide and repository gates to ship.

```text
Brief the real problem
→ map the real journey
→ structure the real content
→ explore multiple solutions
→ select explicitly
→ specify behavior and system roles
→ implement accessibly
→ verify exact output
→ release deliberately
→ learn from real use
```
