# MoneyFlow current design-system authority

**Status:** current and owner-approved
**Program provenance:** `docs/plans/completed/2026-08-08-ui-system-migration.md`
**Phase:** 0 — authority, inventory and baseline
**Baseline ref:** `main@9f31aa02a64bcff30705c187fceb09cf5fa61ded`
**Last reviewed:** 2026-08-05

This index does not select a new layout or aesthetic direction. It records the current decisions that future UI work must preserve unless the owner explicitly replaces them.

## Authority order

When sources disagree, use this order:

1. current product behavior, tests and executable code on `main`;
2. explicit owner decisions, especially `docs/design/DESIGN_DIRECTION_STATUS.md`;
3. current product law in `AGENTS.md`, `docs/product/PRINCIPLES.md`, `docs/MVP_DEFINITION.md` and `docs/research/CURRENT_PROJECT_MEMORY.md`;
4. cumulative concept-neutral evidence in `docs/research/UI_UX_RESEARCH_LEDGER.md`;
5. current implementation contracts such as `src/app/document-theme.css`, App Shell ownership and route tests;
6. historical concept documents, completed packets and old PR evidence.

Open branches, draft PRs, design-tool output and generated concepts are candidate evidence only until merged and owner-accepted.

## Current selected decisions

| Boundary | Current decision | Executable/document authority |
|---|---|---|
| Product identity | Vietnamese manual-first personal income-and-expense ledger | `AGENTS.md`, product principles and current runtime |
| Canonical identity | B3.2 Neutral Flow/Gate mark and MoneyFlow lockup | `docs/design/MONEYFLOW_LOGO.md`, current brand components/assets |
| Brand/action color | Fresh Blue | `docs/design/DESIGN_DIRECTION_STATUS.md`, `src/app/document-theme.css` |
| Neutral surfaces | White-first neutral hierarchy | `docs/design/DESIGN_DIRECTION_STATUS.md`, current tokens |
| Income/success | Green, never as the only carrier of meaning | semantic tokens and finance components |
| Expense/danger | Red, never as the only carrier of meaning | semantic tokens and finance components |
| Warning/attention | Amber | semantic tokens |
| Transfer/money movement | Violet/indigo family | semantic tokens |
| Public theme | Light-only | root theme bootstrap, route theme boundary and public tests |
| Signed-in theme | Light, Dark and System | `src/app/document-theme.css`, App Shell theme controls |
| UI typography | Inter with Vietnamese support | root `next/font` setup and theme authority |
| Money typography | Inter/tabular numerals; full values must remain readable | `src/app/document-theme.css`, `MoneyValue` contracts |
| Primary signed-in IA | Tổng quan, Giao dịch, Ghi, Tài khoản, Thêm | `src/lib/nav-ia.ts`, App Shell |
| Canonical overview route | `/dashboard`; `/insights` is compatibility redirect only | routes, App Shell and current test direction |
| Public narrative | Guided Story Direction B currently shipped | PR #282 and current landing implementation |
| Safe-to-spend | Withdrawn until reliable income-cycle, commitment and reserve data exist | product law and withdrawal contracts |
| Primary action | One primary action per viewport | product/UI tests and App Shell contracts |
| Important action target | MoneyFlow product target: 44 CSS px for important financial/navigation controls | accessibility/product contract |
| Responsive support | 320, 360, 390, 768, 1024, 1366 and 1440 representative widths | Playwright audit matrix |
| Accessibility | keyboard, visible focus, accessible names, 200% text, reduced motion and relevant forced-colors behavior | UI audit and component contracts |

## Current implementation authorities

| Area | Current owner | Migration interpretation |
|---|---|---|
| Document semantic tokens and theme switching | `src/app/document-theme.css` | Keep as executable source of truth during migration |
| Root CSS compatibility | `src/app/legacy.css` | Temporary frozen boundary; shrink, never extend |
| Signed-in chrome | `src/components/layout/app-shell.tsx` and `.module.css` | Target sole owner of sidebar, topbar, mobile navigation and safe areas |
| Public landing | `src/components/landing-page.tsx` and `.module.css` plus bounded route repair | Preserve current direction until separate owner redesign decision |
| Authentication family | `src/components/auth-form.tsx` and `.module.css` | Preserve auth behavior; reconcile stale presentation declarations later |
| Financial values | `MoneyValue`, money formatting/domain helpers and route contracts | Never truncate, guess or change semantic meaning during UI migration |
| Cross-device evidence | `e2e/audit/**` and Playwright audit configs | Structural authority; repair stale route/evidence naming as a bounded task |

## Document classification

### Current

- `docs/design/DESIGN_DIRECTION_STATUS.md`
- `docs/design/MONEYFLOW_LOGO.md`
- `docs/design/BRAND_COLOR_SYSTEM.md` for semantic roles, with executable values resolved from `src/app/document-theme.css`
- `docs/research/UI_UX_RESEARCH_LEDGER.md`
- `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md`
- `docs/research/WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md`
- `docs/research/WEB_DESIGN_PROCESS_CONVERGENCE.md`
- `docs/product/PRINCIPLES.md`
- `docs/MVP_DEFINITION.md`
- this index

### Mixed: retain principles, do not treat literal visual values as current

- `docs/design/MONEYFLOW_BRAND_GUIDELINES.md`
- `docs/design/UX_PRINCIPLES.md`
- `docs/design/design-system.md`
- `docs/design/CALM_LEDGER_V2.md`

Useful material includes truthful claims, calm hierarchy, progressive disclosure, non-truncated money, borders over decorative effects, motion restraint and accessibility. Retired green identity, old logo geometry, obsolete route/navigation structures and old money-font rules do not override current code.

### Historical or rejected

- `docs/design/SIGNAL_LEDGER_V3.md` — rejected as an active direction
- completed design work packets and dated concept explorations
- old PR branches and screenshots that do not match current `main`

### Candidate only

- PR #293 Open Design adapter and recovery packet
- PR #292 Penpot bridge prototype
- any Figma, Penpot, Open Design, Webflow, Framer or image-generated direction
- unmerged route or CSS cleanup PRs

## Rules for new UI work

1. Begin from current product jobs and real content/state, not from a named visual concept.
2. Read this index and `UI_UX_RESEARCH_LEDGER.md` before changing presentation.
3. Do not add another root refresh, fix, final, guardrail or override stylesheet.
4. Do not add product presentation to global CSS when a component or route can own it.
5. Do not add a new `!important` without a separately reviewed, narrow exception.
6. Do not use `/insights` in current UI or tests except the compatibility redirect and explicit historical records.
7. Do not use CSS alone to disable a product behavior or safety-sensitive feature.
8. Do not treat a generated candidate as approved production direction.
9. Preserve full integer VND, balanced-transfer meaning, recovery and truthful error states.
10. Every visual phase requires owner-reviewed browser evidence before merge.

## Deferred decisions

- Whether the currently shipped Guided Story landing later receives a separate redesign packet. During architecture cleanup it remains preserved.
- Whether to adopt a development-only component-state harness such as Storybook after a bounded spike.
- Whether stable tokens later move to a DTCG-format generated artifact.
- Which physical Android and iOS/Safari devices will be used for final acceptance.

## Approval record

- Owner approval: accepted
- Approved date: 2026-08-05
- Evidence: explicit owner instruction to complete Phase 0
- Superseding decision: none
