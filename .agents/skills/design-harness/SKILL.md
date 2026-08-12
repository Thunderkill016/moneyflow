---
name: design-harness
description: Code-first visual design loop for MoneyFlow UI work.
---

# MoneyFlow Design Harness

Use for UI creation, redesign, layout changes, and visual polish.

## Generator role

1. Read `AGENTS.md`, affected UI code, `frontend-design`, and `frontend-qa` skills.
2. Treat the task acceptance criteria / active work packet as the design contract. Do not create a parallel product-spec system.
3. Reuse existing primitives from `src/components/ui/**` and nearby feature components.
4. Implement the smallest coherent UI change in production React/CSS.
5. Run `npm run design:capture` or `DESIGN_ROUTES=/route npm run design:capture`.
6. Inspect phone and desktop screenshots in `output/design-harness/screenshots/` and self-critique obvious defects before handoff.
7. Hand the result to a separate evaluator session/agent using the `design-evaluator` skill. Do not act as both generator and final evaluator.

## Evaluation loop

The evaluator must use the browser, perform meaningful interaction, inspect visual evidence, and return a structured evaluation based on `docs/templates/DESIGN_EVALUATION.json`.

- `pass` → run `npm run design:check -- <evaluation.json>` and continue to risk-selected MoneyFlow verification.
- `refine` → generator fixes the concrete findings, captures new evidence, and requests a fresh evaluation.
- `pivot` → revise the design contract/direction before more implementation.

The machine gate requires design quality >= 8, originality >= 7, craft >= 8, functionality >= 9; phone + desktop evidence; passing responsive/accessibility/financial-semantics/MoneyFlow-consistency gates; at least one exercised interaction; and no blocking/P1 finding.

Do not approve a visual change from source code alone when browser evidence is available. Screenshots prove appearance, not behavior or accessibility.

For component-level agent discovery, Storybook MCP is the preferred optional layer once installed through its official project-aware setup. Keep Storybook as component context and this harness as route-level browser/evaluation evidence.
