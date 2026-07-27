# Token and override inventory — MFVN-003 T001

**Task**: T001  
**Date**: 2026-07-27  
**Scope**: Source inspection only. No application code or styling was changed.

## Executive finding

MoneyFlow does not currently have one visual source of truth in runtime order. The intended Calm Ledger v2 entry states use `--mf-*` tokens from `src/app/calm-ledger-tokens.css`, but the root layout also loads older global tokens, multiple refresh/guardrail layers and legacy global landing/auth selectors before the current CSS modules.

The smallest safe next step is **not** a global token rewrite. It is a bounded entry-state consolidation:

1. keep Calm Ledger v2 `--mf-*` tokens as the canonical contract for the current landing and auth modules;
2. prove which legacy global landing/auth selectors still have consumers;
3. remove or quarantine only proven redundant entry-state rules;
4. add a deterministic guard against new entry-state global overrides;
5. defer authenticated-app token migration to later CycleWarden slices.

## Import order and cascade layers

`src/app/layout.tsx` loads these global styles in order:

| Order | File | Observed role | T001 classification |
|---:|---|---|---|
| 1 | `src/app/globals.css` | Original token set, aliases, base styles, authenticated UI, legacy landing/auth styles and later global patches | Legacy app-wide foundation; not safe to rewrite wholesale in MFVN-003 |
| 2 | `src/app/ui-refresh.css` | Authenticated-shell consistency pass with its own layout tokens and extensive `!important` overrides | Later authenticated-app migration concern; out of entry-state implementation scope |
| 3 | `src/app/benchmark-ux.css` | Focused authenticated-product refinements | Later slice; no entry-state ownership observed in inspected section |
| 4 | `src/app/safe-to-spend-withdrawal.css` | Temporary product-safety override hiding an unsupported safe-to-spend card | Product-safety constraint; preserve until its owning feature is redesigned separately |
| 5 | `src/app/cross-device-stabilization.css` | Root-cause responsive fixes for authenticated layout | Preserve; later route work may absorb it when consumers migrate |
| 6 | `src/app/ai-uiux-refresh.css` | Another authenticated visual layer with separate `--aiux-*` tokens and `!important` overrides | Explicit duplicate visual layer; later authenticated-app cleanup, not landing/auth T002 |
| 7 | `src/app/ai-uiux-guardrails.css` | Post-review authenticated dashboard fixes using `!important` | Preserve as historical stabilization until affected dashboard routes migrate |
| 8 | `src/app/calm-ledger-tokens.css` | Calm Ledger v2 semantic tokens, dark tokens, focus and reduced-motion contract | Canonical token source for current landing/auth modules |

**Implication**: Import order currently resolves conflicts. Adding a ninth refresh/guardrail file would worsen the problem and violates the Calm Ledger v2 migration rule.

## Token namespaces

### A. Calm Ledger v2 — canonical for MFVN-003

**File**: `src/app/calm-ledger-tokens.css`  
**Namespace**: `--mf-*`

Observed categories:

- canvas and surfaces: `--mf-canvas`, `--mf-surface`, `--mf-surface-muted`, `--mf-surface-strong`;
- text and borders: `--mf-text`, `--mf-text-muted`, `--mf-text-soft`, `--mf-border`, `--mf-border-strong`;
- brand/action: `--mf-brand`, hover, pressed, subtle, text and on-brand;
- financial semantics: `--mf-income`, `--mf-expense`, `--mf-transfer` and subtle variants;
- warning/focus/overlay;
- shadows, radii, content width, UI/money fonts and motion.

This namespace matches the controlling values in `docs/design/CALM_LEDGER_V2.md`. Current `landing-page.module.css` and `auth-form.module.css` consume it directly.

**Decision for MFVN-003**: Keep this as the canonical entry-state contract. Do not create a third token namespace.

### B. Original global design tokens — legacy app-wide contract

**File**: `src/app/globals.css`  
**Namespaces**: `--color-*`, `--font-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--z-*`, `--duration-*`, plus aliases such as `--ink`, `--muted`, `--line`, `--surface`, `--canvas`, `--green` and `--danger`.

These tokens still support the large authenticated application and many global selectors. `docs/design-system.md` documents this older semantic system, while explicitly stating that Calm Ledger v2 wins where they conflict.

**Decision for MFVN-003**: Do not rename or remove this namespace globally. Entry-state modules should not add new dependencies on it. Migration of authenticated routes belongs to MFVN-004 and later tasks.

### C. Authenticated refresh-local tokens

**Files**:

- `src/app/ui-refresh.css`: `--mf-shell-width`, card/control radii and shell shadows;
- `src/app/ai-uiux-refresh.css`: separate `--aiux-*` surfaces, lines, text, brand, radii and shadows.

The `--aiux-*` set repeats concepts already represented in both `--color-*` and `--mf-*`, and the file relies on cascade order plus `!important`.

**Decision for MFVN-003**: Record as debt, do not absorb it into landing/auth work. A later authenticated-route migration must replace consumers before deleting it.

## Entry-state ownership

### Current landing

- Component: `src/components/landing-page.tsx`
- Styles: `src/components/landing-page.module.css`
- Token contract: `--mf-*`

The module already defines its own page, navigation, hero, CTA, preview, trust, responsive and focus presentation. It does not require a new global landing stylesheet.

### Current auth

- Component: `src/components/auth-form.tsx`
- Styles: `src/components/auth-form.module.css`
- Token contract: `--mf-*`

The shared component owns login, registration, forgot-password and update-password presentation. Auth actions, validation and redirects remain outside the styling migration.

### Legacy global entry-state families

`src/app/globals.css` still contains global selector families including:

- `.landing-page`, `.landing-nav`, `.landing-hero`, `.landing-hero-ctas`, `.landing-section`, `.landing-cta-band`, `.preview-dash-*` and related responsive rules;
- `.auth-page`, `.auth-story`, `.auth-panel`, `.auth-card`, `.auth-form`, `.google-button`, `.auth-submit` and mobile rules;
- entry-state overrides such as `.landing-nav-cta` with `!important`;
- a legacy preview family named `.preview-dash-safe*`, despite the current product rule against presenting an unproven safe-to-spend concept.

The present landing/auth components use CSS modules with different local class ownership. However, T001 does **not** declare every global selector unused: exact consumer search plus browser verification is required before deletion.

## Duplicate and override risks

### 1. Three overlapping visual vocabularies

The repository currently contains:

```text
--color-* / legacy aliases
--mf-* / Calm Ledger v2
--aiux-* / AI refresh
```

This creates competing values for surfaces, text, borders, brand color, radii and shadows.

### 2. Cascade-order dependency

The root layout imports eight global CSS files. Later files intentionally override earlier files. This makes a visually correct screen insufficient evidence that the underlying source is coherent.

### 3. `!important` as migration glue

Inspected refresh and guardrail files use `!important` to override shell, navigation, dashboard, card and focus behavior. Some rules are justified emergency fixes; copying this pattern into landing/auth would create another permanent layer.

### 4. Documentation split

- `docs/design-system.md` documents the older `--color-*` system;
- `docs/design/CALM_LEDGER_V2.md` is the controlling visual contract where they conflict;
- `calm-ledger-tokens.css` implements v2 values;
- `globals.css` still labels itself the source of truth.

The code comments and documentation therefore do not yet describe one unambiguous runtime authority.

### 5. Literal and fallback values

`globals.css` includes raw colors and fallbacks such as `var(--token, #hex)` alongside semantic tokens. Some are component-specific and valid; others preserve old palettes. T002 must change only entry-state values proven to duplicate v2.

## Smallest safe consolidation proposal for T002

### Included

1. **Clarify authority**
   - Update the misleading source-of-truth comment in `globals.css` so it describes the legacy app-wide token layer.
   - Keep `docs/design/CALM_LEDGER_V2.md` plus `calm-ledger-tokens.css` as the entry-state authority.

2. **Prove legacy entry-state consumers**
   - Search JSX/TSX and generated class contracts for each global `.landing-*` and `.auth-*` family.
   - Produce an explicit keep/remove table before deletion.

3. **Remove only proven redundant entry-state rules**
   - Delete global landing/auth selectors that have no consumer and are fully replaced by the current CSS modules.
   - Do not touch authenticated dashboard, transaction, planning or navigation selectors.

4. **Prevent regression**
   - Add a repository check that fails when new global `.landing-*` or `.auth-*` rules, a new entry-state stylesheet import, or new `!important` usage is introduced for the migrated entry states without an approved exception.

5. **Preserve product-safety withdrawal**
   - Keep `safe-to-spend-withdrawal.css` and financial-honesty checks until its authenticated consumer is handled in a separate approved slice.

### Explicitly deferred

- global migration from `--color-*` to `--mf-*`;
- removal of `ui-refresh.css`, `benchmark-ux.css`, `cross-device-stabilization.css`, `ai-uiux-refresh.css` or `ai-uiux-guardrails.css`;
- dashboard, navigation, daily-flow, planning or report redesign;
- renaming every old alias;
- any financial, auth-action, database, RLS, export or runtime-mode change.

## T001 result

```text
Inventory completeness: sufficient for a bounded T002 proposal
Application code changed: no
Token source added: no
Override layer added: no
Scope escape found: no
T002 automatically authorized: no — inventory review is required
```

## Review questions before T002

1. Is `--mf-*` accepted as the canonical contract for the already-migrated landing/auth modules?
2. Which legacy global landing/auth selectors have verified remaining consumers?
3. Is the first implementation patch smaller if it only removes obsolete selectors and adds a guard, rather than changing token values?
4. Does any proposed deletion alter a public/auth state under light, dark, mobile, 200% text, keyboard or WebKit conditions?
