# MoneyFlow Constitution

This file applies the Spec Kit constitution pattern to MoneyFlow. It does not replace `docs/product/PRINCIPLES.md`, `ARCHITECTURE.md`, repository tests or owner decisions; those sources remain authoritative.

## Core Principles

### I. Financial correctness before presentation

VND remains integer đồng. Internal transfers remain balanced and excluded from income/expense totals. UI and copy must distinguish assets, plans, allocations and obligations. A visual change must not alter ledger calculations, persistence or reporting semantics.

### II. Ownership and recovery are non-negotiable

Authenticated user-owned data remains isolated by RLS and ownership constraints. Destructive ledger actions remain recoverable. Entry-state redesign work must not change schema, policies, authentication behavior or runtime-mode contracts unless a separate approved specification requires it.

### III. One bounded vertical slice

Every implementation must trace to one independently testable user story. MFVN-003 contains only visual foundation plus public landing/auth states. Daily flows, planning, settings, reports and cross-device acceptance remain separate dependent initiatives.

### IV. Repository evidence over invented requirements

Specifications and plans must cite current repository sources, tests and approved issues. Unknowns stay explicit. Existing solutions and simpler approaches must be considered before adding libraries, services or abstractions.

### V. Proportional verification

Verification must match the change: knowledge checks, lint, typecheck and build for source integrity; browser and responsive evidence for entry-state UI; dark mode, enlarged text, keyboard and WebKit checks when affected. Build success alone is not UI acceptance.

## Calm Ledger constraints

- The existing Next.js, React, Tailwind, Radix and CSS-module stack is reused.
- `src/app/globals.css` is the intended design-token source of truth; no additional override layer may be introduced.
- Green brand/action tokens remain distinct from semantic income/success meaning through token names, text and icons.
- The public first viewport has one visually dominant action and explains the manual-first ledger without unsupported financial advice.
- Production auth does not advertise a demo route unless the configured runtime actually supports it.
- Vietnamese copy, 320–390px phone layouts, dark mode and 200% text are first-class constraints.

## Development workflow

1. CycleWarden assessment must decide `build` before Spec Kit artifacts authorize implementation.
2. `spec.md` defines user-observable outcomes and non-goals.
3. `plan.md` maps the specification to the existing repository structure without changing the approved stack.
4. `tasks.md` exposes exact, independently reviewable tasks.
5. Only the task selected by CycleWarden may be active.
6. The coding agent records checks and evidence but cannot accept, merge or deploy its own work.

## Governance

Conflicts are resolved in this order: explicit owner decision, active task/spec acceptance criteria, `docs/product/PRINCIPLES.md`, `ARCHITECTURE.md`, repository tests, current implementation, historical material. Amendments require a reason, affected sources and owner approval.

**Version**: 1.0.0 | **Ratified**: 2026-07-27 | **Last Amended**: 2026-07-27
