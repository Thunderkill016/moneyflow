# MoneyFlow Design Harness

MoneyFlow uses a code-first visual design loop. Production React/CSS is the design artifact; browser rendering is the visual truth.

## Loop

1. Read `AGENTS.md`, affected code, `.agents/skills/frontend-design/SKILL.md`, and `.agents/skills/frontend-qa/SKILL.md`.
2. Reuse components from `src/components/ui/**` and nearby feature components before adding new ones.
3. Implement the smallest coherent UI change.
4. Capture real routes in phone and desktop viewports:

```bash
npm run design:capture
```

Limit evidence to one or more routes when iterating:

```bash
DESIGN_ROUTES=/dashboard,/transactions npm run design:capture
```

5. Inspect `output/design-harness/screenshots/`.
6. Critique hierarchy, density, spacing, typography, alignment, action prominence, responsive behavior, state coverage, and financial readability.
7. Revise and repeat.
8. Run the risk-selected MoneyFlow verification gates before claiming completion.

## Evidence policy

- Do not approve a visual change from source alone when browser rendering is available.
- Inspect both phone and desktop evidence.
- Screenshots are local evidence and must not be committed.
- Screenshots prove appearance, not interaction or accessibility; keep the existing UI-audit and E2E gates.

## Storybook MCP upgrade

The route-level harness works with dependencies already in MoneyFlow. For isolated component discovery, add Storybook through the official project-aware installer rather than hand-editing dependency versions:

```bash
npm create storybook@latest
npx storybook add @storybook/addon-mcp
```

The Storybook MCP server then exposes component documentation, stories, and story tests to an MCP-capable coding agent. Storybook complements this harness; it does not replace route-level browser evidence.
