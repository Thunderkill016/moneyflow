# Implementation Plan: Calm Ledger foundation and landing/auth

**Branch**: `pilot/mfvn-003-speckit` | **Date**: 2026-07-27 | **Spec**: `specs/003-calm-ledger-foundation/spec.md`

**Input**: Feature specification selected by CycleWarden task `MFVN-003`.

## Summary

Consolidate the existing MoneyFlow visual foundation around the canonical tokens in `src/app/globals.css`, then update only the public landing and shared authentication presentation so the first viewport explains the manual-first ledger with one dominant CTA and auth states remain consistent and financially honest. Reuse all current runtime, auth, data and financial behavior.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Next.js 16.2 App Router

**Primary Dependencies**: Tailwind CSS 4, CSS modules, Radix primitives, Lucide icons, existing repository components

**Storage**: Existing Supabase PostgreSQL for authenticated mode and browser-local demo stores; no storage change

**Testing**: repository knowledge/deployment checks, ESLint, TypeScript, Node unit tests where affected, Next production build, Playwright responsive UI audit and screenshots

**Target Platform**: Responsive web; Chromium/WebKit entry states at 320–1440px, light/dark, keyboard and 200% text

**Project Type**: Existing Next.js web application

**Performance Goals**: Do not regress first-view rendering or add a new webfont, UI runtime or client-side data dependency

**Constraints**: Presentation-only slice; one token source; no financial, auth-action, schema, RLS, export or runtime-mode behavior change

**Scale/Scope**: `src/app/globals.css`, landing component/module, shared auth component/module and focused entry-state tests/evidence

## Constitution Check

### Before implementation

- **PASS — Financial correctness**: No domain or persistence change is planned.
- **PASS — Ownership/recovery**: No schema, RLS, auth action or destructive behavior change is planned.
- **PASS — Bounded slice**: Only visual foundation and landing/auth entry states are included.
- **PASS — Repository evidence**: Spec traces to issue #81, product principles, architecture and current source files.
- **PASS — Proportional verification**: Browser evidence is required; database checks become mandatory only if scope unexpectedly touches data.
- **PASS — Simplicity**: No new library, service, token system or global override layer.

### Re-check after design

The patch must still satisfy all six gates. Any domain, schema, RLS, runtime-mode or later-route change stops the task and requires a new approved specification.

## Project Structure

### Documentation for this feature

```text
specs/003-calm-ledger-foundation/
├── spec.md
├── research.md
├── plan.md
├── quickstart.md
└── tasks.md
```

No `data-model.md` or `contracts/` directory is created because this presentation slice introduces no entity, persistence shape or API contract.

### Source code

```text
src/
├── app/
│   ├── globals.css
│   ├── page.tsx
│   └── (auth)/
│       ├── login/page.tsx
│       ├── register/page.tsx
│       ├── forgot-password/page.tsx
│       └── update-password/page.tsx
└── components/
    ├── landing-page.tsx
    ├── landing-page.module.css
    ├── auth-form.tsx
    └── auth-form.module.css

tests/
├── existing entry/auth Playwright coverage
└── responsive UI-audit projects through playwright.audit.config.ts
```

**Structure Decision**: Keep route composition in `src/app`, shared entry-state presentation in `src/components`, canonical tokens in `src/app/globals.css`, and use repository-owned Playwright audit infrastructure. Do not create a new design-system package.

## Implementation approach

### Phase 0 — Inventory and lock the foundation

1. Search canonical token declarations, aliases, literal repeated values and global override sections.
2. Classify each finding as canonical, compatibility alias, route-local value or obsolete override.
3. Define the smallest safe consolidation patch in `globals.css` and affected modules.
4. Record any compatibility alias that cannot yet be removed and its later removal condition.

### Phase 1 — Landing first viewport

1. Preserve existing route/runtime behavior in `src/app/page.tsx`.
2. Refine hero content and hierarchy in `landing-page.tsx` without adding a new feature section.
3. Ensure registration is the single visually dominant CTA; secondary exploration stays subordinate.
4. Consume canonical tokens in `landing-page.module.css` and remove entry-specific literals or overrides that duplicate them.
5. Capture phone and desktop first-view evidence including dark and 200% text where applicable.

### Phase 2 — Shared auth presentation

1. Preserve `AuthForm` actions, validation, OAuth and safe redirect logic.
2. Review all `copy` entries plus story/demo messaging against the product principles.
3. Align auth hierarchy and tokens with the landing entry state.
4. Verify demo notice appears only in supported demo runtime and does not leak into authenticated production presentation.
5. Exercise login, registration, recovery and update states with keyboard and responsive checks.

### Phase 3 — Verification and acceptance

1. Review diff for scope escape and new override layers.
2. Run the applicable repository checks listed in `quickstart.md`.
3. Save responsive screenshots or audit artifacts for affected states.
4. Move MFVN-003 to `verify`; owner acceptance remains required before MFVN-004 can activate.

## Complexity Tracking

No constitutional violation is planned. A new component framework, token package, backend change or design-system abstraction is explicitly rejected as unnecessary complexity.
