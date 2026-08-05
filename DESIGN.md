# MoneyFlow design adapter

This file is the portable design entrypoint for Open Design, Codex and other UI agents. It is an adapter to MoneyFlow's existing authorities, not a second design system.

## Authority order

When sources conflict, use this order:

1. Product and financial truth: `docs/product/PRINCIPLES.md` and executable financial tests.
2. Current executable visual tokens: `src/app/document-theme.css`.
3. Canonical logo: `docs/design/MONEYFLOW_LOGO.md` and the shared brand assets it names.
4. Current interaction and layout principles: `docs/design/CALM_LEDGER_V2.md`, except any legacy green identity or token values that conflict with the current Fresh Blue executable tokens.
5. UX behavior: `docs/UX_PRINCIPLES.md`.
6. Component and migration guidance: `docs/design-system.md` and `docs/AI_UIUX_WORKFLOW.md`.
7. This adapter.

Do not copy token values from an external design system into MoneyFlow. Open Design systems and skills are references for composition and craft only. MoneyFlow's repository remains the source of truth.

## Product thesis

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger. It helps a person:

- record income, expense and internal transfer quickly;
- know where money is held;
- trace totals back to transactions;
- correct mistakes and recover deleted ledger records;
- export trustworthy, user-owned data.

The product should feel calm, precise, factual and easy to inspect. It must not look or speak like a bank, accounting ERP, crypto product, gamified savings app or AI financial adviser.

## Current identity

- Canonical symbol: B3.2 Neutral in `docs/design/MONEYFLOW_LOGO.md`.
- Identity hue: Fresh Blue `--mf-brand-identity` from `src/app/document-theme.css`.
- Filled actions: `--mf-brand`, with `--mf-on-brand` text.
- Income: green semantic roles only.
- Expense/destructive: red semantic roles only.
- Transfer: indigo semantic roles only.
- Warning: yellow semantic roles only.
- Functional information: the dedicated info roles, not the identity color by assumption.

Never revive the retired green M, rice/coin, M/F/O or parallel logo directions.

## Visual language

- Neutral surfaces occupy most of every functional screen.
- Structure comes from spacing, alignment and borders before shadows.
- Shadows are reserved for floating layers: menus, toasts, dialogs and sheets.
- Cards group one coherent idea. Do not nest cards or wrap entire pages in decorative cards.
- Money and the page title are the strongest scan targets.
- Use one obvious primary action per viewport or state.
- Use at most two type families. Reuse repository font tokens.
- Use a 4px spacing rhythm and existing `--mf-*` radius tokens.
- Do not introduce glassmorphism, AI glow, decorative gradients, 3D, oversized rounded containers or meaningless charts.

## Financial presentation

- Store and display VND without floating-point assumptions.
- Never truncate a money value in a row, detail view, form or dialog.
- Income, expense and transfer must differ through text, sign/icon and semantics, never color alone.
- A transfer names both accounts and never appears as income or expense.
- Do not invent balances, dates, plans, commitments, income cycles or spending recommendations.
- Charts must have a text or table alternative and must not hide the underlying transactions.

## Content and tone

- Vietnamese first.
- Calm, direct, natural and non-judgmental.
- Explain what happened and what the user can do next.
- Do not celebrate ordinary money movement or shame spending.
- Do not claim that MoneyFlow knows what the user should spend.
- Technical terms require explanation, except product names and CSV.

## Responsive contract

Design from narrow phone widths first, then expand:

- phone evidence: 320, 360 and 390px;
- tablet evidence: 768 and 1024px;
- desktop evidence: 1366 and 1440px.

Rules:

- practical interactive target is at least 44×44px;
- fixed bottom navigation must reserve exactly the space it occupies and must not leave clearance for removed controls;
- financial values and long Vietnamese labels wrap without document overflow;
- dialogs become usable bottom sheets on phone and retain internal scrolling;
- primary actions remain visible above navigation, safe areas and virtual-keyboard-sensitive layouts;
- emulation is evidence for responsive behavior, not proof of physical-device readiness.

## Navigation

Phone navigation has at most five destinations:

1. Tổng quan
2. Giao dịch
3. Ghi
4. Tài khoản
5. Thêm

Desktop keeps the daily loop prominent. Planning and advanced tools are grouped and progressively disclosed; Inbox/import/rules must not become the product identity.

## Public entry

The first desktop viewport must contain:

- one concise product truth;
- one primary registration action;
- one secondary in-page explanation action;
- a representative product preview visible without scrolling;
- trust proof: no bank password, exportable data and correct transfer handling.

The landing page should explain the product with the fewest sections that make the decision clear. Do not repeat the same promise in multiple oversized story bands.

## Authenticated workspace

The daily loop is:

1. inspect Tổng quan;
2. record through Ghi;
3. verify in Giao dịch;
4. inspect account balances and history;
5. open planning or advanced tools only when needed.

Shared shell behavior belongs to `src/components/layout/app-shell.module.css`. New or migrated route styling belongs to CSS modules. Do not add another global refresh or guardrail stylesheet.

## States

Every affected screen must deliberately cover the states it can reach:

- loading;
- empty;
- populated;
- validation/error;
- recovery/undo;
- long Vietnamese text;
- large VND;
- light/dark when the route supports workspace themes;
- phone/tablet/desktop;
- keyboard focus and reduced motion.

Skeletons match real content dimensions. Empty states expose exactly one primary action.

## Open Design and Codex workflow

1. Read `AGENTS.md`, this file and the affected code before generating artifacts.
2. Use current MoneyFlow screenshots and real component/content states as references.
3. For a redesign, create three genuinely different directions on the same representative screens before implementation.
4. Do not treat a generated artifact, external design system or selected Open Design skill as product authority.
5. After owner selection, implement the smallest coherent slice using existing tokens and components.
6. Render in a real browser and compare at the required breakpoints.
7. Record overflow, clipping, hierarchy, touch-target, focus and state evidence.
8. Update the owning specification before changing the approved direction.
9. Never merge or deploy without the repository's normal owner gates.

## Representative design set

Use the same four surfaces for direction comparison:

1. public landing;
2. Tổng quan;
3. Giao dịch;
4. Ghi nhanh.

Each direction must show the same content, data and viewport so visual judgment is not confused with feature or copy changes.

## Rejected defaults

Do not generate:

- purple/blue AI gradients as decoration;
- a floating hero card as the whole product story;
- glass panels over abstract blobs;
- dashboard grids where every item has equal visual weight;
- giant metrics without traceability;
- hidden or ellipsized VND;
- English-first labels;
- extra navigation destinations;
- a new global CSS override layer;
- a redesign that changes financial behavior.

## Verification minimum for UI implementation

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:deployment-env`
- `npm run check:css-ownership`
- `npm run check:architecture`
- `npm run lint`
- `npm run typecheck`
- affected tests and `npm run test`
- `npm run build`
- affected browser smoke
- responsive/cross-browser audit for layout or shared visual changes
- human review of screenshot evidence

State exactly which checks ran. A build alone is not visual verification.
