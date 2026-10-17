---
description: Use when working on MoneyFlow mobile UI, theme, colors, screens, or branding (mobile/lib/theme/, mobile/lib/features/).
---

# Design System — MoneyFlow mobile

- **NEON GREEN theme (owner-approved 2026-10-16, supersedes Soft Pop purple).** Tokens:
  - brand primary `#00FF88` (neon green — CTA, FAB, active states, brand accents)
  - brand deep `#00CC6A` (gradient end)
  - dark background `#0A0E0C`, dark surface `#121715`
  - light background `#FFFFFF`, light surface `#F2F7F4`
  - text on dark `#FFFFFF`; green text accent `#00FF88`
  - **Dark-mode-first** (dark is the primary experience, light is the second token set).
- Theme lives in `mobile/lib/theme/mf_theme.dart` + `brand_mark.dart`. Use `MfTokens`/`MfTheme` tokens — never hardcode colors in features. Migrate token VALUES, keep semantic names stable.
- Reference: `docs/design/greenvault-reference/` (dark + green fintech) for rhythm and atmosphere.
- Entering an expense must take under 10 seconds. Vietnamese-first, one-handed, bright, modern, trustworthy.
- NEVER: repaint away from neon green; revert to Soft Pop purple; switch to the red (#D92D20) + water-buffalo direction (never approved).
- Money must not rely on color alone (icon/label carries the signal). One primary action per viewport.
- Honest affordances: a missing seam hides the control — never a dead button or a faked number. Empty/error states on every screen.
- SnackBars: always `showTimedSnackBar` (`features/shared/timed_snack_bar.dart`) — accessibleNavigation disables the framework's dismiss timer on real devices.
