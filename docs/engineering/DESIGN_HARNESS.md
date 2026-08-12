# MoneyFlow Design Harness V2

MoneyFlow uses a code-first visual design loop. Production React/CSS is the design artifact; browser rendering is the visual truth.

V2 separates **generation** from **evaluation** so the agent that made the UI is not the final authority on whether the design is good enough.

## Architecture

```text
product intent / acceptance criteria
            ↓
        generator
            ↓
    production React/CSS
            ↓
      browser evidence
       ↙          ↘
 phone/desktop   interaction
       ↘          ↙
     independent evaluator
            ↓
   pass | refine | pivot
      ↘      ↓       ↙
       machine evaluation gate
```

The existing MoneyFlow work packet/specification remains the design contract. Do not add a parallel planning system.

## Generator loop

1. Read `AGENTS.md`, affected code, `.agents/skills/frontend-design/SKILL.md`, and `.agents/skills/frontend-qa/SKILL.md`.
2. Reuse components from `src/components/ui/**` and nearby feature components before adding new ones.
3. Implement the smallest coherent UI change.
4. Capture real routes in phone and desktop viewports:

```bash
npm run design:capture
```

Limit evidence while iterating:

```bash
DESIGN_ROUTES=/dashboard,/transactions npm run design:capture
```

5. Inspect `output/design-harness/screenshots/` and fix obvious defects.
6. Hand off to a **different evaluator session/agent**.

## Independent evaluator

Use `.agents/skills/design-evaluator/SKILL.md`.

The evaluator must:

- inspect both phone and desktop;
- interact with the affected UI in a real browser;
- judge the live product, not source code alone;
- record evidence and concrete findings;
- score design quality, originality, craft, and functionality;
- verify responsive, accessibility, financial-semantics, and MoneyFlow-consistency gates;
- return one decision: `pass`, `refine`, or `pivot`.

Current pass thresholds:

| Criterion | Minimum |
|---|---:|
| Design quality | 8/10 |
| Originality | 7/10 |
| Craft | 8/10 |
| Functionality | 9/10 |

Any unresolved `blocking` or `P1` finding prevents a pass.

## Machine-checkable evaluation

Copy `docs/templates/DESIGN_EVALUATION.json` into local evidence or a work-packet evidence area and fill it with the evaluator result.

Validate it with:

```bash
npm run design:check -- path/to/evaluation.json
```

The gate also requires:

- generator and evaluator identities to differ;
- phone + desktop evidence;
- at least one meaningful interaction to pass;
- all required boolean gates to pass;
- final `decision` and `verdict` to be `pass`.

The contract itself is unit-tested through `npm run test:agent-harness`.

## Evidence policy

- Do not approve a visual change from source alone when browser rendering is available.
- Screenshots are local evidence and must not be committed by default.
- Screenshots prove appearance, not interaction or accessibility.
- Use the existing E2E/UI-audit gates for behavioral and responsive guarantees.
- A self-critique is useful during generation but cannot replace independent evaluation.

## Browser tooling

MoneyFlow already uses Playwright. Keep route-level evidence and critical user-flow checks in Playwright rather than introducing another browser dependency just for the harness.

When a coding environment supports Playwright agent CLI/skills, prefer those for exploratory browser work because they can keep browser interaction separate from the model's application-code context. The checked-in Playwright tests remain the reproducible verification layer.

## Storybook MCP optional layer

For isolated component discovery, add Storybook through its official project-aware installer rather than hand-editing dependency versions:

```bash
npm create storybook@latest
npx storybook add @storybook/addon-mcp
```

Storybook MCP can then expose component documentation, stories, and story tests to an MCP-capable coding agent. It complements this harness; it does not replace route-level browser evidence or independent evaluation.

## Why V2

The harness optimizes the environment around the model instead of assuming a stronger prompt will solve design quality. It supplies real application state, reproducible browser evidence, an independent critic, explicit thresholds, and a machine gate. Keep the mechanism as small as possible and remove scaffolding later if stronger models make a layer unnecessary.
