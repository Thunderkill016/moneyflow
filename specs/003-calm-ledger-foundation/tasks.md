---
description: "Tasks for the bounded Calm Ledger foundation and landing/auth slice"
---

# Tasks: Calm Ledger foundation and landing/auth

**Input**: `spec.md`, `research.md`, `plan.md`, `quickstart.md`

**Organization**: Tasks are grouped by independently testable user story and executed sequentially because each later entry-state task depends on the token-foundation result.

## Format

`[ID] [Story] Description`

Only the task named by CycleWarden may be active. Completing this file does not authorize later MoneyFlow roadmap slices.

## Phase 1: Foundation inventory

**Purpose**: Prevent the redesign from adding another override layer.

- [ ] **T001 [US3] Inventory canonical tokens, compatibility aliases, duplicate declarations, literal repeated visual values and global override sections in `src/app/globals.css`, `src/components/landing-page.module.css` and `src/components/auth-form.module.css`; record the smallest consolidation proposal in `specs/003-calm-ledger-foundation/token-inventory.md` without changing runtime code.**

**Independent Test**: Another reviewer can identify the canonical declaration, each retained alias, every proposed removal and the affected module from the inventory alone.

**Checkpoint**: Stop for review. T002 cannot start until the inventory proves the patch will reduce or preserve complexity rather than add another layer.

---

## Phase 2: Canonical token consolidation

**Purpose**: Establish the visual foundation used by both entry journeys.

- [ ] **T002 [US3] Apply the approved smallest token consolidation in `src/app/globals.css`, `src/components/landing-page.module.css` and `src/components/auth-form.module.css`; preserve required compatibility aliases, remove only proven redundant entry-state overrides, and add no new dependency or global refresh section.**
- [ ] **T003 [US3] Add or update repository checks that can detect duplicate canonical token declarations or prohibited new entry-state override layers, using existing scripts/tests rather than a new framework.**

**Independent Test**: Token search, diff review, lint, typecheck and build demonstrate one authoritative shared token source and unchanged runtime behavior.

**Checkpoint**: Foundation accepted before landing/auth presentation changes begin.

---

## Phase 3: User Story 1 — Understand MoneyFlow immediately (P1)

**Goal**: The first viewport explains the product and presents one dominant action.

- [ ] **T004 [US1] Refine product statement, CTA hierarchy and first-viewport structure in `src/components/landing-page.tsx` without adding a new feature section or changing route/runtime behavior in `src/app/page.tsx`.**
- [ ] **T005 [US1] Update `src/components/landing-page.module.css` to consume canonical tokens and remain usable at required phone, tablet and desktop widths, dark mode, keyboard focus and 200% text.**
- [ ] **T006 [US1] Add or update focused Playwright/UI-audit assertions for the first viewport: product statement visible, exactly one dominant CTA contract, no horizontal overflow and no unsupported spending recommendation.**

**Independent Test**: Open `/` in authenticated runtime at required audit projects; the product purpose and registration CTA are visible before scrolling and all acceptance scenarios pass.

**Checkpoint**: Landing story can be reviewed and demonstrated independently from auth changes.

---

## Phase 4: User Story 2 — Consistent, honest authentication (P1)

**Goal**: Login, registration and recovery share the same Calm Ledger entry contract without changing auth behavior.

- [ ] **T007 [US2] Review and update task-specific copy and shared story content in `src/components/auth-form.tsx`; preserve actions, validation, OAuth and redirect logic; remove any stale or unsupported financial claim.**
- [ ] **T008 [US2] Update `src/components/auth-form.module.css` to consume the canonical token foundation and preserve field/error/focus semantics across mobile, desktop, light and dark modes.**
- [ ] **T009 [US2] Add or update focused browser coverage for login, register, forgot-password and update-password states, including authenticated/demo notice behavior, keyboard focus and validation feedback.**

**Independent Test**: Entry-state browser tests pass without modifying auth actions, database behavior or redirect contracts.

**Checkpoint**: Landing and auth stories are independently acceptable and visually coherent.

---

## Phase 5: Verification and CycleWarden handback

- [ ] **T010 Run `npm run check:knowledge`, `npm run check:deployment-env`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`; record exact results.**
- [ ] **T011 Run `npm run test:ui-audit:pr`; store entry-state artifacts for phone, tablet, desktop, dark, WebKit, keyboard and 200% text projects.**
- [ ] **T012 Review the final diff for financial, schema, RLS, export, runtime-mode and later-slice scope escape; any such change fails MFVN-003.**
- [ ] **T013 Update `.cyclewarden/roadmap.json` and `.cyclewarden/status.json` with completed task/evidence references and move MFVN-003 to `verify`; do not activate MFVN-004.**
- [ ] **T014 Obtain owner acceptance or rejection for MFVN-003; only explicit acceptance may mark it `done`.**

## Dependencies & execution order

```text
T001
→ T002 → T003
→ T004 → T005 → T006
→ T007 → T008 → T009
→ T010 → T011 → T012 → T013 → T014
```

Tasks are sequential by default for this solo-agent pilot. Parallel execution is not a goal; reducing scope drift and preserving review checkpoints is more important than throughput.

## Current CycleWarden handoff

**Active Spec Kit task**: `T001`

The coding agent must produce only `token-inventory.md` and evidence from current source inspection. It must not change application code, redesign the landing page or edit auth presentation during T001.
