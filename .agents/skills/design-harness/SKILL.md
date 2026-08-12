---
name: design-harness
description: Code-first visual design loop for MoneyFlow UI work.
---

# MoneyFlow Design Harness

Use for UI creation, redesign, layout changes, and visual polish.

1. Read `AGENTS.md`, affected UI code, `frontend-design`, and `frontend-qa` skills.
2. Reuse existing primitives from `src/components/ui/**` and nearby feature components.
3. Implement the smallest coherent UI change in production React/CSS.
4. Run `npm run design:capture` or `DESIGN_ROUTES=/route npm run design:capture`.
5. Inspect phone and desktop screenshots in `output/design-harness/screenshots/`.
6. Critique hierarchy, density, spacing, typography, alignment, responsive behavior, action prominence, states, and money readability.
7. Revise and repeat capture → critique → revise.
8. Run the risk-selected MoneyFlow verification gates before completion.

Do not approve a visual change from source code alone when browser evidence is available. Screenshots prove appearance, not behavior or accessibility.

For component-level agent discovery, Storybook MCP can be added later with the official installer. Keep Storybook as component knowledge and this harness as route-level visual evidence.
