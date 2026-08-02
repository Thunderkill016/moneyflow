# MoneyFlow UI/UX design direction status

Status: active owner decision

Last confirmed: 2026-08-02

## Rejected direction

`Signal Ledger v3` is rejected as an active MoneyFlow design direction.

It must not be used as:

- the default starting point for future UI/UX work;
- a binding visual system or design framework;
- a constraint on typography, layout, composition or product narrative;
- the source of current acceptance criteria;
- evidence that MoneyFlow should follow the Signal Ledger information structure.

`docs/design/SIGNAL_LEDGER_V3.md` is historical material only. It records one explored direction, not the current design authority.

## Current selected color direction

The owner instructed the project to merge the public-experience research and implement the recommended project-wide color system.

The selected implementation direction is:

- white-first neutral surfaces across public and authenticated routes;
- one trust-blue brand/action family;
- green reserved for income and success;
- red reserved for expense, danger and destructive errors;
- amber reserved for warning and attention;
- violet reserved for transfers and neutral money movement;
- color never used as the only carrier of financial meaning;
- light and dark modes derived from one semantic token authority in `src/app/document-theme.css`.

The exact token contract and usage rules are recorded in `docs/design/BRAND_COLOR_SYSTEM.md`.

This selection applies to color architecture only. It does not make a named layout, editorial style, card treatment or information structure permanent. Those remain task-specific and must still follow cumulative research and owner review.

## Public experience process

Landing and authentication must follow `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md`:

1. product truth and claim boundaries;
2. page goal and content inventory;
3. user flow and required states;
4. multiple low-fidelity wireframe directions;
5. owner selection;
6. brand/style application;
7. implementation, browser evidence and physical-device review.

Authentication is a family of login, registration, recovery, confirmation, OAuth, CAPTCHA and session states—not one isolated screen.

## Cumulative research source

The concept-neutral research source for all future UI/UX work is:

`docs/research/UI_UX_RESEARCH_LEDGER.md`

That ledger consolidates internal documents, product and competitor references, accessibility standards, AI design tools, verified MoneyFlow evidence, contradictions, rejected decisions and known evidence gaps.

Do not substitute the newest concept document for the cumulative ledger.

## What remains useful

Research gathered while exploring rejected concepts may be retained only after it is separated from their aesthetic conclusions and recorded neutrally in the cumulative UI/UX research ledger.

Retain evidence such as:

- observed interaction and information-hierarchy patterns;
- accessibility findings;
- product and competitor observations;
- patterns deliberately rejected and their reasons.

## Rule for future design work

Future MoneyFlow design work must begin from:

1. current product behavior and real user jobs;
2. `docs/research/UI_UX_RESEARCH_LEDGER.md`;
3. `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` for brand, landing or auth work;
4. product principles and financial truth;
5. accessibility and responsive requirements;
6. multiple genuinely different candidate structures before one is selected.

No named design concept becomes permanent merely because it was documented or implemented. A concept is active only when the owner explicitly approves it as the current direction.

## Required interpretation

Accumulating research does not mean accumulating rejected design decisions.

- Research evidence is cumulative.
- The selected semantic color architecture is active until the owner replaces it.
- Layout and visual concepts remain provisional.
- Rejected concepts are not defaults.
- The owner can replace any visual direction without discarding the underlying research.
