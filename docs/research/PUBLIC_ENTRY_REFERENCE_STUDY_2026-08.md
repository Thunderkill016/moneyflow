# MoneyFlow public entry reference study — August 2026

**Status:** focused research for an unapproved candidate  
**Decision boundary:** this study informs a landing/authentication candidate. It does not record owner approval of copy, layout, color or visual direction.

## Question

How do real personal-finance products explain themselves and present account access without producing the repetitive, over-styled patterns that made MoneyFlow candidates look AI-generated?

## Sources reviewed

Accessed 2026-08-02.

| Product | Official source | What was studied | Useful lesson | What does not apply to MoneyFlow |
|---|---|---|---|---|
| Money Lover | https://moneylover.me/vi/ | Vietnamese landing copy, product screenshots, feature progression | State the job in ordinary language; explain recording, reporting and recurring work with concrete examples | Unverified user counts, ratings and broad security claims must not be copied |
| Money Lover Auth | https://oauth.moneylover.me/auth | Login composition | Keep login visually quiet: brand, provider option, email/password, forgot-password link and primary action | Exact identity-provider behavior and styling are product-owned |
| Monefy | https://www.monefy.com/ | Hero promise and capture emphasis | Lead with the main action and make speed/product use visible instead of inventing a philosophy | Download counts, ratings, app-store positioning and savings claims are not MoneyFlow evidence |
| Spendee | https://www.spendee.com/ | Product-first hero and feature walkthrough | Use a real app screen as the main visual; let later sections explain specific jobs | Bank connection, crypto and shared-finance claims are outside current scope |
| Lunch Money | https://lunchmoney.app/ | Web-first product story, founder/team tone and explicit trial details | Human tone comes from specificity and honest constraints, not decorative informality | Bank import, API, crypto, subscription pricing and international claims do not transfer automatically |
| Lunch Money registration | https://my.lunchmoney.app/register | Registration information and field hierarchy | Registration may be direct and practical; explain the immediate next step rather than repeat marketing copy | Currency/billing/referral fields are not needed for MoneyFlow account creation |
| Copilot Money | https://www.copilot.money/ | Product screenshots, restrained hierarchy and feature sequencing | Give the product screen visual priority and keep each section tied to one user outcome | Automatic bank aggregation, investments, AI categorization and recommendations are explicit MoneyFlow non-goals |
| Copilot sign-up | https://www.copilot.money/sign-up | Minimal authentication entry | Authentication can be a compact decision between supported providers, with account switching close by | Apple sign-in, paid trial and review claims do not apply |
| Monarch | https://www.monarch.com/homepage | Long-form feature sequencing | Alternate product evidence and explanatory copy instead of repeating equal feature cards | Bank aggregation, collaboration, investments and advice language are outside scope |

## Common patterns found

1. **One understandable first promise.** The strongest pages say what the product helps the user do before explaining philosophy or architecture.
2. **One primary product visual in the hero.** Screenshots carry more trust than abstract illustration or a collage of several screens.
3. **Feature sections follow real jobs.** Each section explains one action or outcome and pairs it with the relevant screen.
4. **The layout is allowed to be plain.** Spacing, typography and product imagery do most of the work; decorative icon grids are optional, not required.
5. **Authentication is a task, not a second landing page.** Login and registration are usually compact and do not compete with a large marketing panel.
6. **Credibility is specific.** Real products use verifiable screenshots, prices, platform availability or user evidence. MoneyFlow must omit any proof it cannot support.

## MoneyFlow-specific application

### Landing

- First promise: `Ghi thu chi, xem tiền còn ở đâu.`
- Supporting copy states manual recording, account-level tracking, search/correction and export.
- Hero uses one real MoneyFlow quick-capture screen.
- Later sections use the matching screens for capture, accounts and transaction history.
- No testimonial, user count, bank logo, pricing or savings outcome.
- No decorative feature-icon grid and no named visual concept.

### Authentication

- One centered form surface.
- Mode-specific direct titles: `Đăng nhập`, `Tạo tài khoản`, `Quên mật khẩu?`, `Đặt mật khẩu mới`.
- Preserve Google, email/password, CAPTCHA, privacy acceptance, recovery and redirect behavior.
- Add a text show/hide password control.
- Keep one factual note after the form: MoneyFlow does not ask for a bank password.
- Remove the unconditional proof rail.

## Rejected patterns

- oversized slogan typography;
- eyebrow → giant heading → three equal cards repeated through the page;
- generic shields, wallets, arrows and feature icons used as decoration;
- multiple product screenshots stacked in the hero;
- abstract language about control, clarity or trust without showing the product action;
- marketing content beside recovery/password-reset forms;
- copying bank-sync, AI, investment, collaboration or savings claims from competitors.

## Candidate status

The reference-led implementation on branch `design/public-entry-reference-led-v2` is a browser-testable candidate only. It must be reviewed by the owner before merge or production promotion. Passing CI cannot convert it into an approved design direction.
