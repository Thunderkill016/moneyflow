# MoneyValue display contract

Status: Phase 2 migration in progress.

Financial values are product data, not decorative text. A balance, total, limit, due amount or signed transaction value must never be silently shortened with an ellipsis or clipped by a fixed card width.

## Owner

- Component: `src/components/money-value.tsx`
- Component styles: `src/components/money-value.module.css`
- Pure display model: `src/lib/money-display.ts`
- Contract tests: `src/lib/money-display.test.ts`

The component is a CSS Module owner under the layering rules in `CSS_OWNERSHIP.md`. It does not add root or route-global selectors.

Dashboard composition is split into bounded owners:

- controller and live calculations: `src/components/moneyflow-dashboard.tsx`
- header, monthly KPIs and ledger sections: `src/components/dashboard/dashboard-overview-sections.tsx`
- weekly and planning sections: `src/components/dashboard/dashboard-planning-sections.tsx`

Transactions uses the shared primitive for filtered income, expense and net totals,
daily net totals and every ledger row amount. Split-line amounts inside descriptive
subtitles remain text until the dialog/capture family migration.

The Transactions summary surface is owned by `transactions-page.module.css` and uses
`--mf-surface`, `--mf-text` and `--mf-border`. Legacy route classes may continue to
provide layout during migration, but they must not override MoneyValue tone colors.
Browser coverage requires every summary value to remain visible with at least 4.5:1
contrast in light and dark themes.

## Required behavior

- Keep integer VND behavior and existing multi-currency minor-unit formatting.
- Use tabular money numerals.
- Express income, expense and transfer direction in text (`+`, `−`, `↔`), never with color alone.
- Provide an accessible label that describes the direction without requiring screen readers to interpret arrows.
- Allow normal line wrapping at existing spaces before clipping or ellipsis.
- Never use `overflow: hidden`, `overflow: clip` or `text-overflow: ellipsis` on the primitive.
- Use only semantic `--mf-*` color and typography tokens.

## Display modes

- `plain`: balances, limits and due amounts.
- `signed`: net values where the numeric sign determines income/expense tone.
- `kind`: ledger rows where the stored transaction kind determines the sign and optional direction arrow.

## Migration sequence

- [x] Land and verify the primitive independently.
- [x] Migrate Dashboard monthly KPI and recent-transaction values.
- [x] Migrate remaining Dashboard category, weekly and planning values.
- [x] Migrate Transactions summaries, date totals and ledger rows.
- [ ] Migrate accounts, budgets, commitments, income, goals, reports and export.
- [ ] Remove obsolete legacy money selectors once their final call sites are gone, lowering the CSS debt budget in the same PR.

Every migration PR must include 320/360/390 px, tablet, desktop and 200% text evidence for the affected route family.
