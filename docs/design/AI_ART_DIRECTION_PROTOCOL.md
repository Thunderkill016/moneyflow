# MoneyFlow — iterative AI art-direction protocol

- **Status:** candidate design-lab protocol
- **Branch:** `design/video-informed-design-lab`
- **Source basis:** `docs/research/design-sources/YOUTUBE_GZTP0Z_YHI0.md`
- **Scope:** bounded logo, identity, visual-system and interface explorations
- **Activation:** this protocol guides candidate work; it does not activate any generated design direction

## 1. Core lesson

Professional-looking AI design should not be treated as a one-prompt generation task.

Use AI as an execution partner under explicit art direction:

1. establish strategy;
2. generate alternatives;
3. choose a provisional direction;
4. critique specific visible properties;
5. refine through controlled iterations;
6. resolve the core artifact;
7. expand it into a system;
8. validate and publish it for review.

A large synthesis prompt belongs near the end of the process, not at the beginning.

## 2. Stage A — strategic frame

Before generating visual work, define:

- the user or audience;
- the product promise;
- the feeling the artifact should create;
- the tension it must balance;
- the ideas it must communicate;
- the ideas it must avoid;
- the contexts in which it must work;
- the criteria by which candidates will be judged.

For MoneyFlow, strategy must remain consistent with a calm, factual, Vietnamese-first manual ledger. Do not invent a brand promise that changes product scope.

## 3. Stage B — independent concepts

Generate at least three concepts that differ in their underlying idea, geometry, hierarchy or interaction model.

Do not count these as distinct concepts:

- the same mark in three colors;
- the same layout with different gradients;
- minor radius or shadow variants;
- arbitrary stylistic remixes without different rationale.

Each candidate must state:

- concept;
- rationale;
- recognizable feature;
- strength;
- risk;
- failure condition;
- likely implementation cost.

Selection at this stage is provisional. It means “worth refining,” not “approved direction.”

## 4. Stage C — controlled art direction

Every refinement instruction must name the defect or variable being changed.

Useful variables include:

- silhouette;
- visual density;
- number of internal elements;
- proportion;
- optical balance;
- scale;
- padding;
- container geometry;
- stroke or weight;
- alignment;
- typography relationship;
- small-size recognition;
- contrast and semantic role.

A refinement request should include:

1. what must remain unchanged;
2. the exact variable to modify;
3. the intended effect;
4. contexts or sizes to show;
5. the success criteria.

Example pattern:

> Preserve the candidate's core concept and silhouette. Reduce internal density, simplify competing details and rebalance optical padding. Show the result at 16px, 32px, app-icon and wordmark sizes. Do not alter the selected semantic color roles.

Avoid vague instructions such as:

- make it better;
- make it premium;
- make it modern;
- make it professional;
- add more creativity.

If critique cannot name the problem, do not regenerate yet.

## 5. Stage D — review each iteration

For every iteration, record:

- changed variable;
- reason for change;
- before/after evidence;
- improvement observed;
- regression introduced;
- next unresolved problem;
- decision: retain, revise or reject.

Do not change many unrelated properties at once unless the composition must be regenerated. Small controlled deltas make judgment and rollback possible.

## 6. Stage E — resolve before expanding

Do not generate a full brand book or interface system while the core artifact is still unstable.

The core is ready to expand only when:

- its strategic rationale is clear;
- owner review selected it;
- major geometry and hierarchy are stable;
- it works in representative sizes and contexts;
- obvious alternatives and failure cases were considered;
- unresolved problems are recorded rather than hidden.

Owner selection is mandatory before a candidate becomes active MoneyFlow direction.

## 7. Stage F — system synthesis

After the core direction is selected, a comprehensive synthesis prompt may generate a candidate system containing applicable items such as:

- philosophy and positioning summary;
- voice and writing characteristics;
- logo or mark construction;
- clear space and minimum size;
- usage rules and prohibited treatments;
- typography roles;
- color roles;
- spacing and shape language;
- icon or illustration principles;
- representative mockups;
- implementation-token proposal.

Generated system documentation is a first draft. It requires review for internal consistency, accessibility, legal risk and implementation feasibility.

## 8. MoneyFlow validation overlay

Any MoneyFlow identity or UI system must also pass:

### Product truth

- reflects a personal income-and-expense ledger;
- does not imply bank sync, investment advice or capabilities that do not exist;
- remains calm, factual and non-judgmental.

### Financial semantics

- green remains available for income/success;
- red remains available for expense/danger;
- amber remains available for warning;
- violet remains available for transfers;
- meaning never depends on color alone.

### Typography and language

- supports Vietnamese diacritics;
- works with realistic long labels;
- uses tabular numerals for money where applicable;
- remains legible at 200% text.

### Responsive and accessibility

- works on small mobile widths before desktop polish;
- maintains adequate effective contrast;
- preserves keyboard focus and touch targets;
- remains understandable under common color-vision deficiencies.

### Implementation

- maps to owned semantic tokens and maintainable components;
- does not create a new global override layer;
- documents migration and rollback when replacing shared tokens;
- keeps repository documentation as durable authority.

## 9. Publishing and handoff

A live URL, prototype or MCP-published artifact can improve review speed, but it is not the source of truth.

Before publishing:

- remove secrets and private user or provider data;
- confirm assets and fonts can legally be shared;
- mark the artifact as candidate or approved accurately;
- link back to the repository decision or task record;
- ensure the artifact can be reproduced or archived.

Publishing proves accessibility to reviewers, not design quality or product readiness.

## 10. Required evidence for a completed exploration

A reviewable art-direction batch should contain:

- strategic frame;
- at least three independent concepts;
- provisional selection rationale;
- iteration log with named variables;
- representative size/context tests;
- owner decision;
- candidate system sheet when selected;
- MoneyFlow validation findings;
- rejected options and known uncertainty;
- implementation recommendation or explicit no-build decision.

## 11. First application boundary

Apply this protocol to one bounded MoneyFlow artifact first. Do not redesign the entire application from the source video.

Suitable first experiments include:

- the canonical MoneyFlow mark and its app-icon behavior;
- the visual hierarchy of one core dashboard region;
- one transaction-capture surface;
- one small semantic component family.

The experiment must use real product constraints and end with owner review before implementation expands.
