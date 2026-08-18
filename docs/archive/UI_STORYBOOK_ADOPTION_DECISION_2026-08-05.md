# Storybook adoption decision — 2026-08-05

## Decision

**Defer installation. Reassess during Phase 2 after the first MoneyFlow primitive API and state matrix are approved.**

This is not a rejection of component-state isolation. It is a sequencing decision: Phase 1 prevents new presentation debt; Phase 2 defines the actual Button, LinkButton, IconButton, form, Dialog/Sheet, Card, Alert/Toast, EmptyState and MoneyValue contracts that would become the first durable stories.

## Problem being evaluated

Current critical UI states are often reached through route fixtures and page-level Playwright. This makes it expensive to review combinations such as:

- loading, empty, rich and error states;
- long Vietnamese and large VND;
- disabled, pending and destructive actions;
- light/dark and 200% text;
- dialog/sheet open states;
- forced colors and reduced motion.

A component-state harness may reduce that cost, but only after the component boundary is real.

## Evidence considered

- The repository already has Playwright browser smoke and a broad Chromium/WebKit responsive audit.
- Current shared primitives do not yet own the complete MoneyFlow product contracts; global repair layers still affect their rendered behavior.
- Storybook would add development dependencies, configuration, state fixtures and a second build surface.
- Stories written against the current compatibility architecture would likely be rewritten during Phase 2.
- No hosted visual-review provider is required or authorized.

## Alternatives

| Option | Result |
|---|---|
| Install Storybook in Phase 1 and catalogue current components | Rejected for now: high setup/story churn before component ownership is stable |
| Continue only with page-level Playwright forever | Not selected: component-state isolation remains useful for migrated primitives |
| Use temporary test routes | Not selected as a default: risks adding runtime/test-route surface and duplicating route behavior |
| Reassess with five migrated critical components in Phase 2 | Selected |

## Phase 2 adoption gate

A bounded Storybook or equivalent spike may proceed only when all conditions are met:

1. The owner has approved the primitive API/state matrix.
2. At least five high-value states cannot be reviewed efficiently through existing route tests.
3. Stories use synthetic data and no provider/network calls.
4. The tool remains development-only and does not affect the production bundle.
5. The spike demonstrates lower review cost rather than duplicating Playwright.
6. Removal is limited to package/config/story deletion.
7. Any hosted service requires a separate privacy, cost and provider approval.

## Current consequence

- No dependency or lockfile change in Phase 1.
- No Storybook config, stories or hosted provider.
- Existing semantic/browser audits remain authoritative until the Phase 2 spike decision.
