# Feature Specification: Calm Ledger foundation and landing/auth

**Feature Branch**: `pilot/mfvn-003-speckit`

**Created**: 2026-07-27

**Status**: Draft for implementation review

**Input**: CycleWarden task `MFVN-003`, issue #81 rollout step 1, current product principles and repository source audit.

## User Scenarios & Testing

### User Story 1 - Understand MoneyFlow immediately (Priority: P1)

A logged-out Vietnamese visitor sees the first viewport and understands that MoneyFlow is a manual-first personal ledger for recording income, expenses, transfers and balances. The visitor sees one visually dominant action to create an account; secondary exploration does not compete with it.

**Why this priority**: The landing page is the first product explanation. If it is unclear or presents competing actions, the rest of the redesign cannot compensate.

**Independent Test**: Open `/` in authenticated runtime at 320, 390 and desktop widths. Without scrolling, verify the product purpose, manual-first positioning and one dominant CTA are visible and usable.

**Acceptance Scenarios**:

1. **Given** a logged-out visitor on a supported viewport, **When** the first viewport renders, **Then** the visitor sees a Vietnamese product statement, one dominant registration CTA and no unsupported spending recommendation.
2. **Given** a keyboard user, **When** focus moves through the first viewport, **Then** focus is visible and navigation order follows the visual hierarchy.
3. **Given** 200% text zoom, **When** the first viewport renders, **Then** content remains readable without horizontal overflow or hidden primary action.

### User Story 2 - Enter authentication with consistent, honest context (Priority: P1)

A person signing in, registering or recovering access sees the same Calm Ledger product character and clear task-specific copy. Auth screens do not mention safe-to-spend or advertise demo behavior that is unavailable in the configured runtime.

**Why this priority**: Landing and authentication form one entry journey. Contradictory copy breaks trust before the user reaches their ledger.

**Independent Test**: Open login, register, forgot-password and update-password states in authenticated and supported demo configurations; verify task copy, demo notice behavior, keyboard focus and mobile layout.

**Acceptance Scenarios**:

1. **Given** authenticated runtime, **When** login or register renders, **Then** no demo CTA or stale spending-advice copy appears.
2. **Given** demo runtime with a valid demo route, **When** login renders, **Then** the demo notice accurately states browser-local storage and links only to the supported route.
3. **Given** an auth validation error, **When** the form returns feedback, **Then** the error remains associated with the correct field and does not disturb the primary action hierarchy.

### User Story 3 - Maintain one visual foundation (Priority: P2)

A maintainer can change the Calm Ledger palette, typography, spacing and interaction tokens through one source of truth. Existing compatibility aliases may remain temporarily, but new feature styling must not create another global override layer.

**Why this priority**: The redesign cannot remain coherent if each slice redeclares tokens or depends on increasingly specific overrides.

**Independent Test**: Audit token declarations and changed entry-state styles. Verify canonical tokens are declared in `src/app/globals.css`, affected modules consume them, and no new global override block or duplicate canonical token set is introduced.

**Acceptance Scenarios**:

1. **Given** the changed CSS, **When** token declarations are searched, **Then** each canonical Calm Ledger token has one authoritative declaration per theme.
2. **Given** landing and auth modules, **When** visual values are reviewed, **Then** shared colors, spacing, radii, typography and focus treatments use canonical tokens rather than new literal systems.
3. **Given** income/success and brand actions, **When** they appear together, **Then** token names plus text/icon meaning distinguish semantic money state from brand/action styling.

### Edge Cases

- Missing `NEXT_PUBLIC_APP_MODE` must continue to fail validation rather than silently change runtime behavior.
- Demo mode must not be advertised when its route is unavailable.
- Long Vietnamese labels and currency examples must not cause horizontal overflow.
- Dark mode must not rely on pure-black surfaces or lose focus visibility.
- Large VND examples must remain readable and must not imply a recommended spendable amount.
- Entry-state work must not change redirect targets, auth actions, financial calculations, database schema, RLS or export behavior.

## Requirements

### Functional Requirements

- **FR-001**: The public first viewport MUST identify MoneyFlow as a Vietnamese manual-first personal ledger.
- **FR-002**: The public first viewport MUST expose exactly one visually dominant primary action.
- **FR-003**: Secondary navigation or explanation MUST remain visually subordinate to the primary action.
- **FR-004**: Landing and auth copy MUST avoid safe-to-spend, daily spending advice or other recommendations unsupported by the financial model.
- **FR-005**: Auth states MUST preserve existing login, registration, password recovery, OAuth and safe redirect behavior.
- **FR-006**: Demo messaging MUST appear only when the configured runtime supports the linked demo flow.
- **FR-007**: Canonical design tokens MUST remain in one source of truth and affected modules MUST consume them.
- **FR-008**: The implementation MUST NOT add another global refresh, guardrail or override layer.
- **FR-009**: Brand/action green MUST remain distinguishable from semantic income/success through token usage and contextual labels/icons.
- **FR-010**: Entry states MUST remain usable at 320, 360, 390, 768, 1024, 1366 and 1440 widths without horizontal overflow.
- **FR-011**: Critical entry states MUST support light mode, dark mode, 200% text and keyboard focus.
- **FR-012**: Financial semantics, VND integer handling, transfers, ownership/RLS, runtime mode and export behavior MUST remain unchanged.
- **FR-013**: MFVN-003 MUST NOT implement authenticated daily flows, planning, reports, settings or cross-device redesign work assigned to later CycleWarden tasks.

### Key Entities

No new business or persistence entity is introduced. The feature changes only presentation contracts:

- **Design token**: A named reusable value for palette, typography, spacing, radius, elevation, motion or focus behavior, with light/dark declarations where applicable.
- **Entry state**: Landing, login, registration, password recovery or password update presentation shown before the main authenticated application flow.
- **Runtime mode**: Existing explicit `authenticated` or `demo` configuration that determines available entry behavior.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At every required viewport, the first landing viewport displays the product purpose and primary registration action without horizontal overflow.
- **SC-002**: Visual review identifies one dominant CTA in the first viewport and no competing action with equal hierarchy.
- **SC-003**: Login, registration and recovery states contain no safe-to-spend or unavailable-demo claim.
- **SC-004**: Search and diff review find no new canonical token declaration outside the approved token source and no new global override layer.
- **SC-005**: `check:knowledge`, lint, typecheck and build pass for the final patch.
- **SC-006**: Applicable responsive UI-audit projects pass for phone, tablet, desktop, dark, 200% text, keyboard and WebKit entry states.
- **SC-007**: Diff review confirms no financial domain, database migration, RLS policy, export or runtime-mode contract change.

## Assumptions

- The existing Next.js/React/Tailwind/Radix stack remains sufficient.
- Existing auth actions and redirect logic are correct and reused.
- `src/app/globals.css` remains the canonical global token source.
- Landing and auth may retain route-specific CSS modules while consuming shared tokens.
- MFVN-003 ends after foundation plus landing/auth acceptance; later application routes remain separate tasks.
