# MoneyFlow CSS ownership

Status: Phase 0–1 foundation contract.

## Root owners

`src/app/layout.tsx` may import exactly two global CSS entry points:

1. `legacy.css` — frozen compatibility imports only.
2. `document-theme.css` — active document and theme authority.

Adding another root stylesheet is prohibited. New visual work belongs to a route-owned stylesheet or a component CSS Module.

## Document and theme authority

`src/app/document-theme.css` exclusively owns new work for:

- Calm Ledger semantic tokens;
- resolved light and dark theme variables;
- `html` and `body` background, margin and padding;
- document-level focus visibility;
- reduced-motion behavior.

Feature and route CSS must not target `html` or `body`. Existing violations are legacy debt and remain on the explicit allowlist in `scripts/check-css-ownership.mjs` until migrated and deleted.

## Legacy compatibility boundary

`src/app/legacy.css` preserves the previous global import order. Its import list is frozen. A route migration must:

1. establish a route or component owner;
2. add browser regression coverage;
3. remove replaced selectors from the legacy source immediately;
4. reduce the debt budget when declarations are removed.

Do not create files named refresh, guardrail, stabilization or override to solve new defects.

## Debt budgets

CI enforces:

- exactly two root global CSS owners;
- a frozen seven-file legacy import list;
- no new document selectors outside the authority or explicit legacy allowlist;
- no increase beyond the current `!important` budget;
- production-mode visual audits through `next build` and `next start`.

The budget is a ceiling, not a target. Every route migration should lower it.

## Layer model

All future styling fits one of these layers:

1. **Document/theme:** global tokens, canvas, focus and motion.
2. **Legacy compatibility:** temporary existing global selectors only.
3. **Route owner:** layout and presentation unique to a route family.
4. **Component owner:** reusable component CSS Module.

A selector must have one active owner. Copying the same selector into another stylesheet is not migration.
