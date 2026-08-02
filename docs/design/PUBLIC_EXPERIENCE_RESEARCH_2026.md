# MoneyFlow public experience research

Date: 2026-08-02  
Status: implementation brief for PR #208  
Scope: public landing page and authentication surfaces

## Why this document exists

The previous redesign started from an internal visual concept called **Signal Ledger**.
That reversed the correct order of work: a style was selected first and product
content was then forced to fit it. The first revision of PR #208 removed much of
that concept, but overcorrected into a generic minimal SaaS landing page.

This brief replaces style-first decision making with evidence from:

- MoneyFlow's current product and proven behaviour;
- competitor websites in Vietnam and internationally;
- maintained open-source personal-finance products;
- established accessibility and form-design guidance;
- AI-assisted design tools used only as an implementation and validation loop.

This is a representative research set, not a claim that every finance product,
UI gallery or GitHub repository was inspected.

## MoneyFlow's actual product truth

MoneyFlow is a manual-first personal-finance product. It does not currently sell
bank aggregation, financial advice or a proprietary budgeting method.

The public experience may only promise behaviour already supported by the
product:

1. Record income, expense and internal transfer as different transaction types.
2. Track balances across accounts without requiring a bank password.
3. Open the ledger behind displayed totals and inspect individual transactions.
4. Edit mistakes, soft-delete data and restore supported records.
5. Export transaction history to CSV.
6. Use the core product when AI or external automation is unavailable.

The strongest differentiator is therefore not “clarity” in the abstract. It is
**traceable clarity**: users can understand why a balance changed because totals
lead back to the transactions that produced them.

## Competitor review

### Vietnam

#### Money Lover

Observed public pattern:

- leads with a simple personal-finance promise;
- follows with security, user-count, rating and store-recognition proof;
- explains tracking, budgeting and reports through a long feature sequence;
- supports both manual entry and connected-wallet automation.

What MoneyFlow should learn:

- the first screen must explain the product in everyday Vietnamese;
- trust must be visible early;
- product screens are stronger proof than decorative illustrations.

What MoneyFlow must not copy:

- unverified user counts, ratings or awards;
- connected-bank or automatic-entry claims;
- a long catalogue that gives every feature equal weight.

Source: https://moneylover.me/vi/

#### MISA MoneyKeeper / Sổ Thu Chi MISA

Observed public pattern:

- uses download totals, ratings, testimonials and company scale as authority;
- presents a broad feature inventory including reports, debt, savings, shared
  books, export, synchronisation and AI-assisted entry;
- uses a dense, conversion-led landing structure.

What MoneyFlow should learn:

- local users need concrete language rather than abstract product philosophy;
- a finance product needs explicit data and security reassurance;
- feature language should match familiar Vietnamese money tasks.

What MoneyFlow must not copy:

- corporate-scale proof MoneyFlow cannot substantiate;
- AI and automation as decoration;
- excessive testimonials or repeated calls to action.

Source: https://moneykeeper.misa.vn/

### International

#### Copilot Money

Observed public pattern:

- one short emotional promise in the hero;
- polished product imagery carries most of the persuasion;
- the narrative is organised around automatically tracked accounts, spending
  and investments.

Retain: product-led presentation and strong visual hierarchy.  
Reject: automatic account aggregation and investment claims.

Source: https://www.copilot.money/

#### Monarch Money

Observed public pattern:

- positions the product as a home base for financial clarity;
- groups the product by user outcomes: track, budget, collaborate and plan;
- combines product captures with feature deep-dives.

Retain: outcome-based information architecture.  
Reject: household collaboration and bank-sync promises not yet proven in
MoneyFlow.

Source: https://www.monarchmoney.com/

#### YNAB

Observed public pattern:

- owns a distinct method and repeats it consistently;
- uses emotional outcomes and a strong verbal identity;
- keeps authentication direct and conventional.

Retain: one memorable product idea and a focused auth surface.  
Reject: borrowing “give every dollar a job” or implying MoneyFlow has an
established behavioural method.

Source: https://www.ynab.com/

#### Spendee, Wallet, Lunch Money and PocketGuard

Cross-product observations:

- Spendee explains value with a short three-step flow;
- Wallet clearly distinguishes a tracking product from a bank;
- Lunch Money speaks to intentional users and web-first control;
- PocketGuard foregrounds safe-to-spend outcomes and extensive social proof.

Retain: a simple operating sequence, explicit product boundaries and clear
ownership.  
Reject: bank-sync dependency, safe-to-spend advice and unverified authority
claims.

Sources:

- https://www.spendee.com/
- https://budgetbakers.com/en/products/wallet/
- https://lunchmoney.app/
- https://pocketguard.com/

## Open-source product review

### Actual Budget

Actual identifies itself as local-first, free and open source, with device sync.
Its useful lesson is that ownership and control can be a primary product value,
not a legal footnote.

Source: https://github.com/actualbudget/actual

### Firefly III

Firefly III emphasises insight, control, self-hosting and the ability to inspect
income and expenses. It demonstrates the credibility of precise financial
language, but its feature density and technical audience are not appropriate
models for MoneyFlow's public landing page.

Source: https://github.com/firefly-iii/firefly-iii

### Sure / Maybe lineage

Sure is a community-maintained fork of the abandoned Maybe Finance product. Its
interface is a useful reference for data-heavy finance hierarchy, but its
history is also a warning: visual polish and broad feature scope do not by
themselves establish a sustainable consumer product.

Source: https://github.com/we-promise/sure

### Midday

Midday provides a cohesive task-oriented financial interface for freelancers
and solo businesses. Its product framing is useful, but invoicing, document
matching, time tracking and bank integrations are outside this redesign.

Source: https://github.com/midday-ai/midday

## Professional UX constraints

The implementation must preserve the following requirements:

- Focused controls remain visible and are not obscured by sticky content.
- Interactive targets meet or exceed the existing 44 px MoneyFlow contract,
  which is stricter than WCAG 2.2's 24 by 24 CSS-pixel minimum target criterion.
- Authentication must not require cognitive puzzles or block password-manager
  and paste workflows.
- Field errors are direct, associated with the relevant field and explain what
  the user needs to correct.
- Submitted values remain available after validation errors where the current
  server action supports it.
- No action relies on colour alone.
- Reduced-motion preferences disable decorative transitions.

Primary references:

- https://www.w3.org/TR/WCAG22/
- https://design-system.service.gov.uk/components/error-message/
- https://design-system.service.gov.uk/components/password-input/
- https://baymard.com/blog/password-requirements-and-password-reset

## AI-assisted design constraints

AI repositories are workflow references, not design authorities.

- `onlook-dev/onlook` supports visual editing on real DOM/code, branching and
  checkpoints. MoneyFlow should keep experiments isolated and reversible.
- `abi/screenshot-to-code` demonstrates a render-and-visually-check loop. A
  generated implementation is not accepted until browser evidence is reviewed.

No external source code, screenshot, logo, copy or proprietary asset is copied
into MoneyFlow.

## Positioning decision

### Product category

A personal financial ledger that makes account balances understandable and
correctable without requiring a bank connection.

### Primary audience

A Vietnamese user who wants more structure than notes or spreadsheets, but does
not want to give another service access to a bank account.

### Core promise

> **Biết tiền đang ở đâu. Biết vì sao nó thay đổi.**

Supporting explanation:

> Ghi thu, chi và chuyển tiền đúng bản chất. Theo dõi từng tài khoản và mở lại
> mọi con số để kiểm tra — không cần liên kết ngân hàng.

### Proof sequence

1. A transaction is entered with type, amount, category and account.
2. The relevant account balance and summary update.
3. The user can open the ledger behind the number, inspect the transaction and
   correct it when needed.

This sequence is the centre of the landing page. Features that do not strengthen
it are secondary.

## Landing-page architecture

### Header

- brand;
- `Cách hoạt động`, `Quyền kiểm soát`;
- `Đăng nhập`;
- one primary registration action.

### Hero

- specific two-part headline from the positioning decision;
- one supporting paragraph;
- one primary CTA and one anchor CTA;
- a composed product proof using real MoneyFlow captures, not a fabricated
  marketing dashboard;
- compact factual boundary: manual-first and no bank password required.

### Traceable workflow

Three connected steps:

1. **Ghi đúng bản chất** — income, expense and internal transfer are separate.
2. **Thấy số dư thay đổi** — accounts and summaries update from the ledger.
3. **Mở lại để kiểm tra** — users can inspect, filter, edit and restore.

### Product proof

Use the current MoneyFlow captures to demonstrate the workflow. Captions state
that data comes from a test environment. Screenshots must be integrated into the
story rather than presented as an unrelated gallery.

### Control and ownership

Four factual statements:

- no bank password is required;
- transfer is not counted as expense;
- supported mistakes can be edited or restored;
- history can be exported to CSV.

### Final CTA

One short reminder of the core task. No repeated feature list, FAQ, testimonial
or invented urgency.

## Authentication architecture

Authentication remains task-first.

- The form is always the primary visual object.
- Desktop may use a restrained branded frame or a compact proof rail, but not a
  second marketing page beside the form.
- Login title: `Đăng nhập vào MoneyFlow`.
- Registration title: `Tạo tài khoản MoneyFlow`.
- Google and email remain clearly separated.
- Password recovery appears next to the password label.
- Turnstile status remains visible but secondary.
- The single trust statement is factual: MoneyFlow never asks for a bank
  password.

## Visual direction

There is no new named style system.

- Product screenshots and transaction semantics lead the visual identity.
- Neutral surfaces, clear borders and controlled contrast remain.
- Cobalt may remain a product token, but it is no longer a mandatory narrative
  device or the definition of the brand.
- Remove ambient gradients and oversized editorial staging where they do not
  improve comprehension.
- Use one compact accent treatment to connect transaction entry, balance change
  and ledger verification.
- Avoid generic fintech gradients, glassmorphism, decorative charts, floating
  currency symbols and AI glow effects.

## Acceptance criteria

The redesign is not ready for merge until all of the following are true:

1. The first viewport explains the actual product without a generic “clarity”
   claim.
2. No source contains Signal Ledger as the active design authority.
3. Every public claim maps to an implemented MoneyFlow behaviour.
4. Landing and auth retain identity without competing with the user's task.
5. Light and dark themes work at 320, 360, 390, tablet and desktop widths.
6. Keyboard focus, form errors, loading, CAPTCHA and reduced motion are tested.
7. Production build, unit contracts, database checks and browser tests pass.
8. Browser screenshots are reviewed by the owner before the PR leaves draft.

## Non-goals

- No database, RLS, financial-calculation or authentication-provider change.
- No bank connection, AI assistant or automatic transaction import claim.
- No global signed-in application redesign in this PR.
- No new runtime dependency.
- No merge or deployment without owner approval.
