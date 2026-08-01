# Signal Ledger product-wide UI refresh

Execution state: in_progress

## Repository reconnaissance

- Base branch: `main` at `7527c147bfaaa2deae6912e7873c7234fd1c47c9`.
- Public home is rendered by `src/components/landing-page.tsx` with a dedicated
  CSS Module.
- Login, registration, forgot-password and update-password share
  `src/components/auth-form.tsx` and its CSS Module.
- `src/app/document-theme.css` is the semantic theme authority used by the full
  application, so token changes propagate across authenticated routes.
- Auth actions, Turnstile token forwarding, password policy and provider
  enforcement are intentionally outside the visual implementation.
- Existing open PRs are not used as a base and are not modified by this packet.

## Research

A representative source review covered open-source personal finance products,
dashboard systems, component libraries and modern SaaS entry surfaces:

- `actualbudget/actual`
- `chancenhq/sure`
- `maybe-finance/maybe`
- `midday-ai/midday`
- `firefly-iii/firefly-iii`
- `shadcn-ui/ui`
- `tremorlabs/tremor`
- `calcom/cal.com`
- `dubinc/dub`

The review extracted hierarchy, workflow and accessibility patterns only. No
external source code, copy, image, logo or branded asset is copied.

The detailed synthesis is recorded in `docs/design/SIGNAL_LEDGER_V3.md`.

## Specification

Create a materially different MoneyFlow visual and content direction while
preserving product behaviour.

Required outcomes:

1. Replace the green-first global theme with warm neutral surfaces, graphite
   information hierarchy and a cobalt action accent in light and dark modes.
2. Rewrite the landing page narrative, section structure, preview and calls to
   action around financial decisions rather than a feature checklist.
3. Rewrite authentication copy for every mode and replace the prior neutral
   split layout with a dark information stage plus focused form panel.
4. Preserve all existing auth actions, form fields, privacy acceptance,
   Turnstile behaviour and generic error handling.
5. Preserve responsive, keyboard, reduced-motion and semantic heading
   contracts.
6. Add no dependency and make no provider, database or deployment change.

## Implementation plan

1. Update root landing metadata and structured-data description.
2. Rebuild `landing-page.tsx` with an original editorial information hierarchy.
3. Replace `landing-page.module.css` with responsive Signal Ledger styling.
4. Rebuild `auth-form.tsx` content and composition without changing actions.
5. Replace `auth-form.module.css` with the new authentication layout.
6. Update `document-theme.css` so the authenticated application inherits the
   new product-wide visual language.
7. Document the visual system and source research.
8. Run exact-head CI and browser evidence before changing the packet to
   `ready_for_review`.

## Tasks

- [x] Repository and active-PR reconnaissance.
- [x] Representative GitHub UI/UX research.
- [x] New landing positioning and metadata.
- [x] Full landing component rewrite.
- [x] Full landing CSS rewrite.
- [x] Authentication content and composition rewrite.
- [x] Authentication CSS rewrite.
- [x] Product-wide theme-token replacement.
- [x] Signal Ledger design specification.
- [ ] Inspect exact PR diff for accidental behaviour changes.
- [ ] Run lint, typecheck, unit tests and production build in CI.
- [ ] Run database and browser suites in CI.
- [ ] Review phone/desktop, light/dark visual evidence.
- [ ] Mark packet `ready_for_review` only after exact-head evidence is green.

## Evaluation

Acceptance requires:

- landing, login, register, forgot-password and update-password compile;
- no auth Server Action or CAPTCHA logic changes;
- no runtime dependency or package-lock change;
- semantic tokens remain complete for all current routes;
- no overflow or hidden primary action at 390px;
- Turnstile status and submit gating remain visible and operable;
- production build, repository contracts, unit tests, database tests and browser
  suites pass on the exact PR head;
- the PR remains unmerged until explicit owner approval.

Current evidence: implementation committed; exact-head CI not yet evaluated.
