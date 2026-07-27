# Research: Calm Ledger foundation and landing/auth

## Scope decision

MFVN-003 is a brownfield presentation slice, not a new product or architecture. The owner uses MoneyFlow, the three manual readiness checks passed, and issue #81 records concrete entry-state and CSS-foundation defects. The build-or-not decision is therefore `build`, while later authenticated flows remain blocked.

## Repository evidence

| Evidence | Implication |
|---|---|
| `docs/product/PRINCIPLES.md` | Calm, factual, manual-first, Vietnamese and mobile-first behavior are product requirements. Financial advice without enough data is forbidden. |
| `ARCHITECTURE.md` | UI may present domain results but must not own accounting rules. Entry-state changes do not require storage, schema or RLS changes. |
| `src/app/globals.css` | The repository already declares this file as the design-token source of truth. The work should consolidate consumption instead of adding a new system. |
| `src/components/landing-page.tsx` | The current first viewport, CTA hierarchy and product preview are bounded in one component plus its CSS module. |
| `src/components/auth-form.tsx` | Login/register/recovery copy and demo messaging share one component and can be corrected without changing auth actions. |
| Issue #81 | Establishes Calm Ledger outcome, rollout order and acceptance boundaries. |

## External method evidence

This pilot uses Spec Kit release `v0.8.14` as a reproducible workflow reference. Official Spec Kit templates require prioritized, independently testable user stories, technology-agnostic success criteria, an implementation plan grounded in the real project structure and tasks grouped by user story.

CycleWarden does not reproduce that workflow. It owns the assessment, initiative dependency and current-task boundary, then references the Spec Kit artifacts.

## Decisions

### Reuse the existing stack

**Decision**: Keep Next.js 16, React 19, TypeScript, Tailwind 4, Radix primitives and CSS modules.

**Reason**: The change is presentation-only. Adding a new component or styling framework would create migration cost and another source of visual truth.

### Keep `globals.css` as canonical token source

**Decision**: Canonical shared tokens remain in `src/app/globals.css`; landing/auth modules consume those tokens.

**Reason**: The file already declares itself the source of truth. A new token file or global refresh layer would repeat the failure identified in issue #81.

### No data model or API design

**Decision**: `data-model.md` and API contracts are unnecessary for this slice.

**Reason**: No business entity, persistence shape, endpoint or auth action changes. Adding empty architecture artifacts would be ceremony without information.

### Verification is browser-led

**Decision**: Static checks plus responsive browser evidence are required. Database tests are not required unless implementation unexpectedly touches data or RLS, in which case work stops and the scope is re-approved.

**Reason**: A successful build cannot prove hierarchy, overflow, dark mode, text zoom or keyboard focus.

### First implementation task is token inventory, not redesign coding

**Decision**: Before changing the landing or auth UI, map canonical tokens, duplicate declarations, aliases and affected modules; produce the smallest consolidation patch.

**Reason**: Entry-state styling built before the foundation is bounded would likely create another override layer.

## Rejected alternatives

- Replace the application with another finance product: cannot improve this repository or preserve its owner-specific data/workflow.
- Adopt a new design system: not justified by the bounded slice.
- Redesign all authenticated routes together: violates issue #81 rollout dependencies and CycleWarden one-task policy.
- Change auth, database or finance logic while touching entry pages: unrelated risk with no supporting requirement.
