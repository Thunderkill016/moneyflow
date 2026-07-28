# Codex + Apple design workflow research

**Status:** completed research  
**Date accessed:** 2026-07-28  
**Scope:** A repeatable workflow for designing and implementing MoneyFlow web UI with OpenAI Codex, informed by Apple design principles without copying Apple platform styling.

## Research question

How should MoneyFlow use Codex to design, implement and verify web interfaces while preserving product truth, financial safety, accessibility and a coherent design system?

## Primary sources

| Source | What it establishes | MoneyFlow use |
|---|---|---|
| OpenAI, *How OpenAI uses Codex* | Start large changes in Ask mode; write prompts like GitHub issues; improve the agent environment; use `AGENTS.md`; use Best-of-N for alternatives. | Separate reconnaissance and planning from code generation. Give Codex exact files, constraints, evidence and checks. Generate competing structural directions before implementation. |
| OpenAI, *Introducing upgrades to Codex* | Codex can accept screenshots and wireframes, inspect browser output, iterate on frontend work, run tests and attach visual evidence. | Treat screenshots as input and output. Require Codex to compare implementation evidence with the selected design contract. |
| OpenAI, *Introducing Codex* | Codex works best with a configured repository, clear documentation, test commands and human validation of agent output. | Keep `AGENTS.md`, sources of truth and test commands current. Generated code is never self-approving. |
| Apple HIG, *Design principles* and WWDC26 *Principles of great design* | Purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and delight guide product decisions. Simplicity is not visual minimalism; every feature spends user time, attention and trust. | Judge every UI change by usefulness, control, transparency, consistency, adaptability, clarity and quality rather than visual novelty. |
| Apple HIG, *Accessibility* | Interfaces must be intuitive, perceivable and adaptable. Touch targets and spacing must prevent accidental activation. | Keep a minimum 44×44 CSS-pixel target for primary touch controls, visible focus, non-color cues and text scaling support. |
| Apple HIG, *Feedback* | Feedback should communicate status, success, failure, warnings and recovery in proportion to significance. | Use inline validation, passive status, toast/undo and explicit destructive confirmation according to risk. |
| Apple HIG, *Layout*, *Typography* and *Motion* | Layout must adapt to context; typography creates legibility and hierarchy; motion should be purposeful and optional. | Test phone through desktop, preserve readable Vietnamese text and VND values, and respect `prefers-reduced-motion`. |

### Source URLs

- https://openai.com/business/guides-and-resources/how-openai-uses-codex/
- https://openai.com/index/introducing-upgrades-to-codex/
- https://openai.com/index/introducing-codex/
- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/videos/play/wwdc2026/250/
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/motion

## What Codex is good at in UI work

1. **Repository reconnaissance** — locating routes, components, tokens, state models, fixtures and tests.
2. **Divergent exploration** — producing multiple structural solutions with explicit trade-offs.
3. **Implementation** — applying a selected direction across production components while respecting repository rules.
4. **Verification** — running static and browser checks, inspecting screenshots and finding inconsistencies.
5. **Review** — comparing a diff with a written specification and identifying missing states or unsafe assumptions.

Codex is not the product owner. It must not decide that MoneyFlow should add advice, gamification, bank sync, new financial assumptions or a new visual language.

## Apple principles translated for MoneyFlow

### 1. Purpose

Start with the user decision and daily job, not an aesthetic style. A screen must help someone record a transaction, verify balances, understand observed cash flow or manage a plan they explicitly created.

**Reject:** decorative redesigns with no measurable usability outcome.

### 2. Agency

People remain in control. Preserve escape routes, back navigation, undo, edit and recovery. Do not force users through coaching, upsells or irreversible flows.

**MoneyFlow rule:** destructive ledger actions remain recoverable; imported data stays review-required until confirmed.

### 3. Responsibility

Be transparent about data provenance and uncertainty. Never turn a balance into a spending recommendation without a valid planning contract. Never imply bank connectivity or automated knowledge that does not exist.

### 4. Familiarity

Use stable placement, labels and behavior. Components that look the same behave the same. Prefer familiar web controls and existing MoneyFlow components over novel interactions.

### 5. Flexibility

Support phone, tablet, desktop, keyboard, touch, dark mode, text scaling, long Vietnamese labels, large VND values and reduced motion. Flexibility is verified behavior, not a responsive screenshot at one width.

### 6. Simplicity

Simplicity means removing friction, not hiding functionality. Use concise Vietnamese copy, clear hierarchy and progressive disclosure. Add context when context prevents a financial misunderstanding.

### 7. Craft

Trust in a finance product depends on detail: alignment, number formatting, loading dimensions, focus treatment, empty/error states, performance and precise copy. A visually attractive happy path with broken edge states is unfinished.

### 8. Delight

MoneyFlow's desired emotion is **calm confidence**. Delight comes from fast capture, trustworthy feedback, predictable recovery and polished details — not confetti, streaks, AI glow or attention-seeking motion.

## Selected operating model

### Phase 0 — Prepare the Codex environment

Codex must be able to install, run and verify the repository using documented commands. Keep these inputs current:

- `AGENTS.md` and task-specific source-of-truth links;
- setup and environment validation;
- deterministic fixtures/demo data;
- lint, typecheck, unit, build and Playwright commands;
- screenshot output paths and viewport definitions.

A repeated environment failure is a repository problem to fix, not a prompt to work around forever.

### Phase 1 — Ask mode reconnaissance

Before code, ask Codex to produce a short map:

- affected routes and user flow;
- existing reusable components and semantic tokens;
- current states and missing states;
- related tests and screenshot baselines;
- financial/product constraints;
- unresolved decisions.

The output becomes the repository reconnaissance section of the active work packet.

### Phase 2 — Issue-like design brief

The implementation prompt must read like a good GitHub issue and include:

- problem and affected user;
- primary decision and primary action;
- exact in-scope routes/components;
- source-of-truth file paths;
- required states;
- mobile/accessibility/long-data constraints;
- explicit out-of-scope behavior;
- acceptance criteria and commands;
- screenshot evidence required.

Avoid prompts such as “make it premium,” “make it like Apple,” or “redesign the dashboard.” They lack observable outcomes and invite random visual output.

### Phase 3 — Best-of-N structural exploration

Ask Codex for three directions before implementation. Each direction must provide:

- named concept;
- information hierarchy;
- primary action placement;
- component reuse plan;
- phone and desktop behavior;
- state handling;
- accessibility risks;
- maintenance trade-offs;
- reasons it fits or conflicts with Calm Ledger v2.

Use low-fidelity structure or production-component sketches. Do not spend time polishing three complete visual systems.

### Phase 4 — Human selection

The human owner selects or combines a direction using this weighted score:

| Criterion | Weight |
|---|---:|
| Solves the primary user decision/action | 25% |
| Financial honesty and responsibility | 20% |
| Phone usability and flexibility | 20% |
| Familiarity and design-system consistency | 15% |
| Accessibility and recovery | 10% |
| Maintainability and implementation cost | 10% |

No implementation begins until the selected direction and rejected trade-offs are recorded.

### Phase 5 — Production vertical slice

Give Codex one reviewable slice at a time. A slice includes the real route, real components, real states and tests. It must not create a disconnected prototype that later needs to be reimplemented.

Recommended slice order:

1. page shell and hierarchy;
2. primary action and critical flow;
3. loading/empty/error/recovery states;
4. long VND and Vietnamese text;
5. responsive and keyboard behavior;
6. visual polish and motion.

### Phase 6 — Visual feedback loop

For every slice:

1. run the route with deterministic data;
2. capture phone, tablet and desktop screenshots;
3. capture light and dark mode where supported;
4. inspect long-data, empty and error states;
5. ask Codex to compare evidence against the design contract;
6. fix concrete mismatches, not subjective “premium” requests;
7. repeat until acceptance criteria are evidenced.

Screenshots are evidence, not proof by themselves. Keyboard behavior, announcements, focus order and action recovery require browser or manual checks.

### Phase 7 — Independent evaluation

A reviewer or separate Codex task evaluates the implementation against the work packet, not the implementing agent's summary. It checks:

- missing reachable states;
- duplicated or hard-coded tokens;
- color-only financial meaning;
- covered content under fixed navigation;
- clipped Vietnamese labels or VND values;
- misleading advice or invented data;
- inaccessible focus, labels or motion;
- scope creep and unrelated cleanup.

### Phase 8 — Delivery

Open a focused PR containing:

- problem and selected design direction;
- research/work-packet links;
- important rejected alternatives;
- checks and screenshot evidence;
- known limitations;
- exact production verification steps.

Codex review is an additional reviewer, not a merge authority.

## Prompt contract for a UI implementation task

```text
Goal
- <observable user outcome>

Read first
- AGENTS.md
- docs/product/PRINCIPLES.md
- docs/design/CALM_LEDGER_V2.md
- docs/AI_UIUX_WORKFLOW.md
- <active work packet>

Scope
- Routes/components: <exact paths or names>
- Reuse: <existing components/tokens>
- Do not change: <domain behavior, API, unrelated styles>

Required states
- loading, empty, populated, error/recovery
- long Vietnamese labels and large VND
- phone/tablet/desktop, light/dark, keyboard, reduced motion

Acceptance criteria
- <observable criteria>

Evidence
- Commands: <exact checks>
- Screenshots: <viewports and states>
- Report failures honestly; do not claim completion without evidence.
```

## Anti-patterns

- One prompt from blank page directly to polished code.
- “Make it Apple-like” interpreted as copying Apple materials, glass or platform chrome.
- Multiple agents editing the same UI ownership area without a shared contract.
- Accepting a screenshot while ignoring forms, errors, keyboard and long data.
- Creating new tokens/components before auditing existing ones.
- Letting Codex silently change requirements to make implementation easier.
- Treating generated tests or self-review as independent evidence.

## Final decision

MoneyFlow will use Codex as a supervised design-and-engineering agent inside the existing work-packet lifecycle. Apple guidance is applied as decision principles — purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and calm delight — rather than as a visual theme. Every accepted UI change must be grounded in a real user decision, constrained by Calm Ledger v2, implemented as a production vertical slice and verified through code, browser behavior and reviewed visual evidence.
