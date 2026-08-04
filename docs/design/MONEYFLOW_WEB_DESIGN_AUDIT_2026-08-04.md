# MoneyFlow web design audit

**Date:** 2026-08-04
**Baseline:** `main@d941ae07b53f6ec74592f3dd38254a36b73868c2`
**Scope:** landing, authentication family and the transition into the signed-in workspace

## Product truth

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger. Public pages must explain current capability honestly: separate income, expense and internal transfer; account balances derived from ledger activity; correction/recovery; CSV export; no bank password requirement.

## Primary public journey

```text
Discover
→ Understand value and boundaries
→ Inspect real product proof
→ Select Tạo sổ
→ Register or authenticate
→ Enter workspace
→ Complete first useful money action
```

## Current strengths

- One clear primary CTA family: `Tạo sổ` / `Tạo sổ của bạn` / `Tạo tài khoản`.
- One direct H1 explaining location and cause of money changes.
- Real product screenshots rather than generic fintech imagery.
- Correct three-step narrative from record to account change to inspection.
- Clear trust boundaries: no bank password, transfer correctness, correction/recovery and export.
- Public routes are light-only; theme choice is correctly scoped to the workspace.
- Fresh Blue brand authority and financial semantic colors are separated.

## Current problems

### 1. Product proof loses readability on narrow screens

The current hero uses overlapping screenshot composition. At 320–390 px, supporting screenshots become small and captions disappear. This keeps visual drama but weakens evidence.

**Required correction:** on mobile, replace collage behavior with a linear sequence of readable task-focused product cards.

### 2. Route-local legacy palette declarations remain in landing CSS

The semantic public theme overrides current output, but old green and public-dark declarations remain in the route module. This creates two competing mental models and increases regression risk.

**Required correction:** remove or quarantine stale route-local brand declarations after confirming no fallback path depends on them.

### 3. Authentication proof rail copy is not mode-specific

The proof rail headline currently says `Đăng nhập để tiếp tục từ dữ liệu của chính bạn.` for login, registration, recovery and password update.

**Required correction:** define proof headline and supporting context per mode:

- Login: continue from your own data.
- Register: start a ledger whose numbers can be checked.
- Forgot: recover access without changing ledger truth.
- Update: secure access with a new password.

### 4. Conversion is not yet a design evidence loop

The landing has a success path but no documented privacy-safe event contract or baseline.

**Required correction:** define events and denominator before setting conversion targets. Do not invent uplift claims.

## Page and flow inventory

### Public routes

- `/`
- `/landing`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/auth/*`

### Authentication state family

| Mode/state | Required copy | Required recovery |
|---|---|---|
| Login default | continue from existing ledger | register, forgot password |
| Login error | generic safe error | retry, forgot password |
| Register default | start a checkable ledger | login |
| Register validation | field-specific action | retain safe input |
| Forgot password | explain email step | return to login |
| Reset/update | explain password requirement | return to login on completion |
| OAuth callback | progress and safe failure | retry or return |
| CAPTCHA loading/blocked | explain verification state | retry when available |
| Session expiry | explain loss of session | authenticate and preserve intended route |

## Responsive acceptance

Affected public surfaces must be evaluated at:

- 320 px
- 360 px
- 390 px
- tablet
- desktop
- Chromium and WebKit
- 200% text
- keyboard-only navigation
- reduced motion

Critical assertions:

- primary CTA remains visible and reachable;
- no horizontal overflow;
- product proof is readable, not merely visible;
- long Vietnamese copy reflows without clipping;
- public routes remain light under a saved dark workspace preference;
- focus remains visible;
- headings retain semantic order.

## Design-system acceptance

- No route creates an independent brand palette.
- Raw brand values live in the semantic authority only.
- Financial meaning never depends on color alone.
- Borders and spacing establish routine structure; shadows indicate genuine elevation.
- One primary action per viewport.
- Motion is optional and has a reduced-motion/static fallback.

## Recommended first vertical slice

1. Make auth proof copy mode-specific.
2. Remove stale route-local green/dark palette declarations.
3. Convert mobile hero proof to a linear readable sequence while preserving desktop proof-first composition.
4. Add permanent tests for the copy and mobile structure.
5. Run full UI verification and owner visual review.

This slice is bounded, reversible and directly supported by the audit. It does not change financial behavior, authentication security behavior or product capability.
