# MoneyFlow public entry selection

**Status:** selected for implementation

**Owner instruction:** merge the public-experience research and implement it

**Decision date:** 2026-08-02

## Selected landing structure

Selected candidate: **proof-led split hero**.

Reasons:

- the first viewport answers what MoneyFlow is, what it helps with and what the next action is;
- real MoneyFlow product evidence appears beside the proposition rather than fabricated social proof;
- the CTA remains primary while returning-user login stays available;
- the three-step relationship `ghi giao dịch → cập nhật tài khoản → mở sổ đối chiếu` provides the page narrative;
- the structure becomes a deliberate single-column stack on mobile.

The product screenshot is supporting evidence. The proposition and CTA must remain understandable when the screenshot is unavailable.

## Selected authentication structure

Selected candidate: **task-first form with compact factual proof rail**.

Reasons:

- each route has one task and one H1;
- login, registration, recovery and password update remain distinct modes;
- Google OAuth, email/password, CAPTCHA, privacy acceptance and recovery keep their current behavior;
- the form remains dominant;
- the proof rail contains only factual product and security boundaries;
- the rail moves below or disappears when it competes with the form on narrow screens.

Authentication is treated as a connected flow, not an isolated login mockup.

## Selected color architecture

Selected system: **white-first neutral foundation with trust-blue brand/action roles**.

- neutral and white surfaces carry most of each screen;
- brand blue identifies primary action, focus, selection and navigation;
- green is reserved for income/success;
- red is reserved for expense/danger;
- amber is reserved for warning;
- violet is reserved for transfers and neutral money movement;
- light and dark modes share one semantic token authority.

Exact values and usage rules live in `docs/design/BRAND_COLOR_SYSTEM.md`.

## Implementation mapping

| Decision | Runtime owner |
|---|---|
| Project color roles | `src/app/document-theme.css` |
| Public compatibility bridge | `src/components/public-brand-theme.module.css` |
| Landing structure and content | `src/components/landing-page.tsx` and its CSS module |
| Auth flow and content | `src/components/auth-form.tsx` and its CSS module |
| Color/brand source contract | `src/lib/brand-ui-contract.test.ts` |

The public compatibility bridge exists because the landing/auth CSS modules predate the project token authority. It maps their local role names to `--mf-*`; it must not evolve into a separate palette.

## Acceptance boundary

The selected color system is project-wide. The selected landing and auth structures are current public-entry decisions. Neither decision revives Signal Ledger or turns unrelated layout, typography or composition choices into permanent rules.

Merge still requires exact-head CI, browser evidence, responsive screenshots and owner-visible review artifacts.
