# Money Clarity public surfaces

**Status:** ready for CI and human visual review  
**Scope:** public landing and authentication surfaces only  
**Branch:** `design/money-clarity-final`

## Decision

This is the final focused redesign pass for the MoneyFlow landing and authentication pages. It removes the Signal Ledger marketing narrative from these public surfaces without changing the signed-in product design system or financial behavior.

## Landing

- Direct Vietnamese value proposition: know where money is, record cash flow correctly, and inspect what needs attention.
- No invented balances, testimonials, usage statistics, or advisory claims in page source.
- Real MoneyFlow screenshots taken from the repository's Playwright audit are used as product evidence.
- Screenshot captions state that the data is illustrative and comes from the test environment.
- Five sections only: hero, benefits, product walkthrough, data ownership, final CTA.

## Authentication

- One centered card instead of a marketing/story split-screen.
- Direct labels: Đăng nhập, Tạo tài khoản, Gửi liên kết, Lưu mật khẩu mới.
- Google OAuth, email/password, recovery, privacy acceptance, demo handling and Turnstile behavior are unchanged.
- The only supporting trust statement is that MoneyFlow does not request bank passwords.

## Acceptance gates

- Lint, typecheck, unit tests and production build pass.
- Auth CAPTCHA browser test passes for login, register and password recovery.
- Landing and auth fit a 320 px viewport without horizontal overflow.
- Light and dark mode screenshots are reviewed on desktop and mobile.
- No merge until the human owner accepts the preview.
