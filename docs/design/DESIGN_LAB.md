# MoneyFlow design lab

- **Status:** candidate branch operating model
- **Branch:** `design/video-informed-design-lab`
- **Risk class:** Class 0 while this branch changes research and design documentation only
- **Purpose:** create a dedicated, evidence-driven design workspace for MoneyFlow
- **Activation rule:** nothing in this lab becomes product direction until the owner explicitly selects it and the accepted change merges

## 1. Mission

This branch exists to make MoneyFlow better at product design, UX, UI systems and design engineering without turning AI into a random interface generator.

The lab must:

1. learn from supplied videos and other focused references;
2. separate source facts from interpretation;
3. translate reusable principles into MoneyFlow-specific hypotheses;
4. explore multiple genuinely different structures before polishing visuals;
5. test candidates against real product behavior and financial truth;
6. preserve decisions and rejected directions as reviewable repository evidence.

It must not imitate a video's visual style without understanding the user problem, interaction model and trade-offs behind it.

## 2. Authority order

Design work on this branch follows this order:

1. current code, tests and actual product behavior;
2. `AGENTS.md` and `docs/research/CURRENT_PROJECT_MEMORY.md`;
3. `docs/design/DESIGN_DIRECTION_STATUS.md`;
4. `docs/research/UI_UX_RESEARCH_LEDGER.md`;
5. `docs/AI_UIUX_WORKFLOW.md`;
6. `docs/product/PRINCIPLES.md` and `docs/MVP_DEFINITION.md`;
7. `docs/UX_PRINCIPLES.md` and `docs/design-system.md` where they do not conflict with newer authority;
8. source-specific research such as `docs/research/design-sources/YOUTUBE_GZTP0Z_YHI0.md`;
9. candidate protocols such as `docs/design/AI_ART_DIRECTION_PROTOCOL.md`;
10. candidate concepts created on this branch.

A source, mockup, AI output, old concept or open branch is evidence—not authority.

### Known interpretation rule

`docs/design/DESIGN_DIRECTION_STATUS.md` rejects `Signal Ledger v3` as a default and keeps layout concepts provisional. Any older wording that treats a named concept as controlling must be interpreted through the newer design-direction status.

## 3. Specialist roles

The design lab works as five explicit roles. One agent may perform several roles, but the outputs stay separate.

### Design researcher

- verifies sources and captures timestamped evidence;
- distinguishes claims, demonstrations and personal taste;
- records applicability limits and contradictions;
- avoids turning unverified transcript guesses into project memory.

### UX architect

- defines user job, decision, primary action and flow;
- maps loading, empty, error, long-data and recovery states;
- creates low-fidelity information structures before visual polish;
- minimizes steps and cognitive load without hiding financial truth.

### UI system designer

- defines hierarchy, typography, spacing and semantic visual language;
- reuses or intentionally evolves tokens and components;
- preserves color semantics for income, expense, warning and transfer;
- ensures dark mode, long Vietnamese content and non-color meaning.

### Design engineer

- audits implementation constraints and existing components;
- builds the smallest production-code vertical slice;
- avoids detached prototypes that cannot be maintained;
- gathers browser, responsive and accessibility evidence.

### Independent reviewer

- compares implementation with stated rationale;
- looks for “design theater”: claims not reflected in the interface;
- checks that the selected candidate actually improves the target task;
- reports uncertainty and rejected assumptions.

## 4. Source-learning protocol

For every video, article, product or screenshot:

1. register the source in `docs/research/design-sources/`;
2. verify metadata and capture timestamped notes;
3. extract atomic observations, not a vague summary;
4. classify each observation as:
   - product principle;
   - UX flow or information architecture;
   - interaction pattern;
   - visual-system technique;
   - design workflow;
   - tool-specific implementation trick;
   - unsupported opinion;
5. record what the source establishes and does not establish;
6. map useful observations to a specific MoneyFlow user job and state;
7. define a small experiment or candidate direction;
8. keep source-derived evidence separate from MoneyFlow interpretation;
9. retain only lessons that survive owner, product and verification review.

The first extracted operating method is formalized in `docs/design/AI_ART_DIRECTION_PROTOCOL.md`. It treats AI design as staged art direction: strategy first, controlled refinement second, system synthesis only after the core direction is resolved.

## 5. Standard design loop

### Step 1 — Frame the problem

Write:

- target user;
- job to complete;
- question the screen must answer;
- primary action;
- trusted data available;
- prohibited assumptions or advice;
- success and failure signals.

### Step 2 — Audit current behavior

Inspect current code and capture:

- information hierarchy;
- repeated or competing actions;
- confusing language;
- component and token ownership;
- responsive failures;
- accessibility failures;
- behavior that must not regress.

### Step 3 — Diverge structurally

Produce at least three directions that differ in hierarchy, flow or interaction—not merely color.

Each direction needs:

- low-fidelity mobile and desktop structure;
- rationale;
- strengths;
- risks;
- failure condition;
- implementation impact.

### Step 4 — Evaluate before polishing

Score candidates against:

| Criterion | Weight |
|---|---:|
| Answers the primary question quickly | 30% |
| Works on mobile and with long data | 25% |
| Preserves financial truth and trust | 20% |
| Feasible and maintainable | 15% |
| Accessible without color dependence | 10% |

The score informs discussion; it does not replace owner judgment.

### Step 5 — Owner selection

Do not establish typography, palette, component composition or motion for a candidate until the owner selects its structure or asks for a focused visual exploration.

Unselected candidates become rejected/historical evidence, not hidden constraints.

### Step 6 — Controlled visual refinement

After a provisional direction is selected, use the iterative art-direction protocol:

- preserve the core concept while naming the exact defect or variable;
- change one or a small number of related properties per iteration;
- test representative sizes and contexts;
- record what improved and what regressed;
- avoid vague requests such as “make it premium” or “make it professional.”

A comprehensive system prompt is allowed only after the core direction is stable and owner-selected.

### Step 7 — Implement one vertical slice

A UI slice should include the real route, real data states and real responsive behavior. Avoid broad redesigns when one screen can validate the hypothesis.

### Step 8 — Verify the claim

For an executable UI change, use risk-selected gates and record exact evidence. At minimum, verify affected flows, responsive layouts, keyboard/focus behavior, long Vietnamese text, empty/loading/error states and light/dark behavior where applicable.

Do not claim physical-device readiness without physical-device evidence.

## 6. MoneyFlow design constraints

Every candidate must preserve:

- calm, factual and non-judgmental language;
- Vietnamese-first labels and realistic long text;
- fast manual capture;
- clear balances and period reporting;
- integer-VND presentation and tabular numerals;
- transfers as neutral money movement;
- no invented spending guidance;
- one primary action per viewport;
- undo or recovery for destructive ledger actions;
- 44px touch targets where interaction requires it;
- meaning beyond color alone;
- white-first neutral surfaces and the selected semantic color roles unless the owner opens a project-wide color decision.

## 7. Prohibited shortcuts

Do not:

- copy a video's finished UI as the design rationale;
- claim lessons from unavailable details beyond the supplied notes;
- treat the latest AI output as the best candidate;
- generate three color variants and call them three directions;
- start public experience work with gradient, shadow or high-fidelity code;
- generate a full brand system before resolving the core artifact;
- ask AI to “make it professional” without naming the defect;
- add a new global CSS override layer;
- use financial red/green as decoration;
- change product scope through a design experiment;
- write directly to `main`;
- merge or deploy without owner decision.

## 8. Expected artifacts for each design task

A reviewable design task should leave:

- a problem statement;
- linked source notes;
- current-state audit;
- three candidate structures or concepts;
- provisional selection rationale;
- iteration log with named variables;
- selection rationale or owner decision;
- state matrix;
- token/component impact;
- implementation plan;
- responsive/accessibility evidence;
- rejected ideas and remaining uncertainty.

Put task state in a work packet when the risk classifier requires one. Do not create another management layer.

## 9. Initial registered source and retained lesson

The first owner-supplied source is:

- `docs/research/design-sources/YOUTUBE_GZTP0Z_YHI0.md`

The repository now contains owner-supplied timestamped notes covering:

- strategy and initial concepts at 0:32–1:23;
- iterative refinement at 1:23–6:37;
- pixel-grid density, simplification, scale, padding and squircle examples;
- brand-guideline synthesis at 6:37–10:36;
- HTMLPub MCP publishing at 11:30–13:01.

The retained cross-project lesson is the staged art-direction process, not Granular's pixel style or exact visual decisions. The title and complete transcript remain independently unverified, so claims beyond the supplied notes are prohibited.

## 10. Completion boundary for this branch setup

The design-lab setup is established because:

- the branch exists from current `main`;
- the design lab charter is committed;
- the supplied video is registered as a source;
- timestamped owner notes are recorded with evidence limits;
- an iterative AI art-direction protocol is committed;
- no product direction is silently activated.

## 11. Next bounded work

The next task should apply the protocol to one bounded MoneyFlow artifact rather than redesigning the whole application.

The experiment should:

1. define a strategic frame;
2. generate at least three independent concepts;
3. choose one provisional candidate;
4. run controlled iterations with named variables;
5. stop for owner selection;
6. create a compact system sheet only after selection;
7. implement nothing beyond the selected scope without a new risk-classified task.
