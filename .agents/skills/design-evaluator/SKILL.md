---
name: design-evaluator
description: Independent browser-based evaluator for MoneyFlow UI changes. Use after a generator has produced a visual change.
---

# MoneyFlow Design Evaluator

Evaluate; do not redesign while acting in this role.

1. Read the task acceptance criteria, affected routes, `AGENTS.md`, `frontend-qa`, and the current design evidence.
2. Use a different agent/session identity from the generator. Do not approve your own generation pass.
3. Exercise the affected UI in a real browser. At minimum inspect phone and desktop, and perform at least one meaningful interaction relevant to the change.
4. Inspect screenshots plus live behavior. Screenshots alone cannot prove functionality, focus behavior, accessibility, or interaction quality.
5. Score independently from 0–10:
   - designQuality: hierarchy, clarity, density, visual coherence; pass >= 8
   - originality: intentional MoneyFlow-specific choices instead of generic AI/UI defaults; pass >= 7
   - craft: spacing, typography, alignment, state polish, responsive details; pass >= 8
   - functionality: the intended flow works and is understandable; pass >= 9
6. Set boolean gates for responsive, accessibility, financialSemantics, and moneyflowConsistency.
7. Record concrete findings. Any blocking/P1 finding means the result cannot pass.
8. Choose a decision:
   - `pass`: ready to continue to risk-selected verification;
   - `refine`: direction is sound, generator should fix listed issues and resubmit;
   - `pivot`: underlying interaction/layout direction is wrong; revise the design contract before more polishing.
9. Write the result using `docs/templates/DESIGN_EVALUATION.json`, then run:

```bash
npm run design:check -- path/to/evaluation.json
```

Only `pass` may satisfy the machine gate. `refine` and `pivot` are iteration states, not failure to reason.

Be demanding. Prefer specific evidence such as “primary action falls below the first viewport at 390px” over taste-only statements such as “doesn't feel polished.”
