# Signal Ledger v3

Status: candidate visual system for the full MoneyFlow product.

Signal Ledger replaces the previous green-first public identity with a warmer,
more editorial financial interface. The product keeps its manual-first and
explainable-data principles, but presents them as a decision system instead of
as a traditional expense notebook.

## Product idea

MoneyFlow should answer three questions in order:

1. What money exists right now?
2. What part of it already has a job?
3. What needs attention next?

Every screen should reveal the next useful decision before exposing secondary
analytics.

## Visual language

- Warm paper canvas instead of clinical white or green-tinted backgrounds.
- Graphite text and dark information stages for high-density financial views.
- Cobalt is the single product/action accent.
- Income, expense, transfer and warning retain independent semantic colors.
- Large editorial headings are reserved for orientation and route purpose.
- Monetary figures remain tabular, never truncated when the product can reflow.
- Cards are grouped by meaning, not used as decoration around every element.
- Borders carry structure; shadows are reserved for floating or primary layers.
- Motion explains entry and hierarchy, never hides required information.

## Product-wide tokens

`src/app/document-theme.css` is the only theme authority. Changing these roles
updates all existing product routes without adding a second styling system.

### Light

- canvas: `#f7f5f0`
- surface: `#ffffff`
- text: `#171a1f`
- brand: `#3157d5`
- brand subtle: `#e9edff`

### Dark

- canvas: `#111318`
- surface: `#181b22`
- text: `#f4f2ed`
- brand: `#85a3ff`
- brand subtle: `#202b55`

The brand/on-brand pairs and semantic text/subtle pairs meet WCAG AA for normal
text. Focus remains visible in both themes.

## Landing page

The landing page is no longer a feature catalogue. It is an ordered narrative:

1. The hero reframes MoneyFlow as a financial operating view.
2. The product stage shows money with assigned purpose, not a generic chart.
3. The signal strip demonstrates the three numbers that matter first.
4. The clarity section explains the decision order.
5. The dark workflow section explains the daily loop.
6. The principles section explains ownership and reversibility.
7. FAQ and final CTA remove practical uncertainty without invented social proof.

No user count, testimonial, savings claim or fabricated performance metric is
used.

## Authentication

Authentication uses a dark information panel beside a quiet form surface.
Content changes by login, registration, recovery and password-update mode.

The form behaviour remains unchanged:

- Google OAuth stays separate from email authentication.
- minimum password guidance stays at 12 characters;
- privacy acceptance remains required for registration;
- Turnstile still gates email login, registration and password reset when the
  production feature flag is enabled;
- generic account-existence-safe responses remain server-owned.

The explanatory note clarifies that Turnstile may verify automatically and does
not always show a checkbox.

## Open-source research

This is a representative audit of mature and relevant GitHub projects, not a
literal claim that every UI repository on GitHub was inspected.

| Repository | Pattern retained | Pattern deliberately not copied |
| --- | --- | --- |
| `actualbudget/actual` | local-first ownership and a clear path from setup to budgeting | its envelope-specific product model |
| `chancenhq/sure` / `maybe-finance/maybe` | data-heavy personal-finance hierarchy and self-owned data positioning | branded assets, copy and implementation |
| `midday-ai/midday` | task-oriented financial workflow, inbox/export framing and cohesive product narrative | bank integrations and AI assistant claims not present in MoneyFlow |
| `firefly-iii/firefly-iii` | comprehensive finance information architecture | its feature density and backend model |
| `shadcn-ui/ui` | open, composable primitives that remain product-owned | generic default theme values |
| `tremorlabs/tremor` | accessible dashboard hierarchy and restrained analytics components | chart-first screens without a user decision hierarchy |
| `calcom/cal.com` | focused authentication and responsive SaaS entry patterns | scheduling-specific layout and copy |
| `dubinc/dub` | editorial landing rhythm, strong contrast and direct calls to action | marketing claims and brand styling |

No external source code, image, logo, copy or proprietary asset is copied into
MoneyFlow. The redesign uses MoneyFlow's existing React, CSS Modules, Lucide,
Next.js and accessibility contracts.

## Accessibility and responsive rules

- Every primary action is at least 44px high.
- A skip link remains available on the public page.
- Heading order remains one `h1` followed by route/section `h2` headings.
- Native `details` elements keep FAQ content keyboard accessible.
- Reduced-motion preferences disable reveal and button transitions.
- Mobile layouts reflow financial rows instead of shrinking values below a
  readable size.
- CAPTCHA status remains live-region text supplied by `AuthTurnstile`.

## Non-goals

- No database, authentication provider, CAPTCHA provider or deployment setting
  changes.
- No new runtime dependency.
- No feature behaviour, business rule, financial calculation or RLS change.
- No auto-merge or production deployment from this design branch.
