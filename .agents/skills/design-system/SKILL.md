---
description: Use when working on MoneyFlow mobile UI, theme, colors, screens, or branding (mobile/lib/theme/, mobile/lib/features/).
---

# Design system — Fresh Blue (keep it)

- Theme lives in `mobile/lib/theme/mf_theme.dart` + `brand_mark.dart`. Use `MfTokens`/`MfTheme` tokens — never hardcode colors in features.
- An UNAPPROVED red (#D92D20) + water-buffalo direction exists in old docs — do NOT adopt it; owner decision pending (see DECISIONS.md).
- Vietnamese-first UI copy; no English strings leaking into UI. Number/money formatting via `formatMoney`/`parseMoneyInput` (vi-VN, int đồng).
- Capture bar: entering an expense must take <10s — quick amounts, recent categories, minimal taps. Test with widget tests, not vibes.
- Money must not rely on color alone (icon/label carries the signal). One primary action per viewport.
- Honest affordances: a missing seam hides the control — never render a dead button or a faked number. Empty/error states on every screen.
- SnackBars: always `showTimedSnackBar` (`features/shared/timed_snack_bar.dart`) — accessibleNavigation on real devices disables the framework's dismiss timer; the watchdog closes it.
