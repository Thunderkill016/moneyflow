# MoneyFlow public entry wireframe blueprint

Date: 2026-08-02
Status: active design process for PR #213
Scope: public landing, login, registration, recovery and password-update entry points

## Purpose

This document inserts the missing structural design stage between research and visual styling.

The sequence is now:

1. product truth and user jobs;
2. content hierarchy;
3. user flows;
4. low-fidelity wireframes;
5. responsive and state validation;
6. brand color system;
7. high-fidelity composition;
8. implementation and browser evidence.

No brand color, illustration style, gradient or named visual concept may decide the layout before the low-fidelity stage is accepted.

## Research basis

### Authoritative process references

- Figma prototyping guidance: map complete journeys as flows, create multiple starting points, test interactions early, and share individual flows for feedback.
- GOV.UK homepage guidance: a homepage is not exhaustive; it should prioritise the most relevant tasks and content rather than expose every feature.
- GOV.UK start-using-a-service pattern: use one primary start action, keep sign-in available as a secondary route, and provide only information users need before beginning.
- GOV.UK headings and page-template guidance: preserve a clear semantic heading hierarchy and consistent page regions.
- GOV.UK account and password patterns: keep account creation focused on that task; label fields by the action users need to take; make password controls and recovery clear.
- OWASP authentication guidance: login and recovery errors must not expose whether an account exists; generic responses must still help legitimate users recover.
- MoneyFlow cumulative UI/UX research ledger, product principles, existing browser evidence and verified product behaviour.

### Visual wireframe references

Representative wireframes were reviewed for structural patterns only:

- mobile-first fintech landing alternatives;
- hero → benefit/proof → problem/solution landing structures;
- desktop/mobile credit-product landing wireframes;
- login, signup, verification, recovery and password-change flow maps;
- low-fidelity versus mid-fidelity authentication screens.

These references are not copied. Their value is the separation of structure, task order and state flow from visual styling.

## Shared process

Landing and authentication use the same design process but solve different jobs.

| Stage | Landing question | Authentication question | Deliverable |
|---|---|---|---|
| 1. Product truth | What can MoneyFlow prove before registration? | What login and account actions already work? | Verified claim/action inventory |
| 2. User intent | What must a first-time visitor understand? | What must a returning or new user complete? | Priority jobs and failure risks |
| 3. Content hierarchy | What appears before the first CTA? | What appears before the submit action? | Ordered content outline |
| 4. User flow | Which route follows each CTA? | How do login, signup and recovery connect? | Flow map with start/end states |
| 5. Low-fi wireframe | Does the story work without color or polish? | Can the task be completed without distraction? | Grayscale phone + desktop frames |
| 6. State matrix | What changes on loading, error or narrow screens? | What changes on invalid credentials, CAPTCHA or recovery? | Responsive/state matrix |
| 7. Validation | Can users explain the proposition and find the action? | Can users complete and recover without confusion? | Task-based review notes |
| 8. Visual system | Which brand roles reinforce hierarchy? | Which brand roles support trust without overpowering the form? | Color/type/elevation application |
| 9. Prototype | Do routes and interactions feel coherent? | Do auth branches and error recovery work? | Clickable prototype |
| 10. Implementation | Does the browser match the accepted structure? | Are security and accessibility preserved? | Exact-head code and evidence |

## Landing-page design process

### 1. Define the single landing job

A first-time Vietnamese visitor must be able to answer within the first viewport:

1. MoneyFlow là gì?
2. Tôi dùng nó để làm gì?
3. Nó khác ghi chú hoặc bảng tính ở điểm nào?
4. Tôi phải làm gì tiếp theo?

The answer must come from current product truth, not a future roadmap.

### 2. Build the content model before the layout

Priority order:

1. category and proposition;
2. one supporting explanation;
3. primary registration action;
4. returning-user sign-in route;
5. factual trust boundary;
6. real product evidence;
7. traceable three-step workflow;
8. ownership and correction capabilities;
9. final start action.

Secondary features that do not strengthen this sequence stay out of the landing page.

### 3. Create three low-fi alternatives

All alternatives use grayscale blocks, real copy length and no decorative color.

#### Alternative A — proof-led split hero

- left: category, headline, supporting text, primary CTA and secondary anchor;
- right: composed real-product evidence;
- trust boundary directly below actions;
- suitable when product screenshots are understandable at first glance.

#### Alternative B — task-led single column

- centred proposition and actions;
- three-step workflow immediately after the hero;
- product evidence follows each step;
- suitable when the operating sequence is more persuasive than one hero image.

#### Alternative C — evidence-first stage

- first viewport begins with one large product screen and annotated task callouts;
- proposition and CTA sit beside or above the evidence;
- suitable when MoneyFlow's real interface is the strongest differentiator.

The chosen structure must win on comprehension, not visual novelty.

### 4. Recommended landing wireframe candidate

#### Desktop skeleton

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Brand       Cách hoạt động   Quyền kiểm soát      Đăng nhập   [Tạo sổ] │
├──────────────────────────────────────────────────────────────────────────┤
│ [Category]                         │                                    │
│ H1 proposition                     │  Product evidence composition       │
│ Supporting explanation             │  - transaction entry               │
│ [Primary CTA]  [See how it works]  │  - account change                  │
│ Manual-first · no bank password    │  - ledger verification             │
├──────────────────────────────────────────────────────────────────────────┤
│                 Three-step traceable workflow                            │
│  01 Ghi đúng bản chất → 02 Thấy số dư đổi → 03 Mở sổ kiểm tra           │
├──────────────────────────────────────────────────────────────────────────┤
│ Product proof 01                     Explanation + factual caption        │
├──────────────────────────────────────────────────────────────────────────┤
│ Explanation + factual caption        Product proof 02                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Control / ownership facts: edit · restore · export · no bank password    │
├──────────────────────────────────────────────────────────────────────────┤
│ Final proposition                                      [Tạo sổ]          │
├──────────────────────────────────────────────────────────────────────────┤
│ Minimal footer                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Mobile skeleton

```text
┌──────────────────────────────┐
│ Mark    Đăng nhập  [Tạo sổ]  │
├──────────────────────────────┤
│ Category                     │
│ H1 proposition               │
│ Supporting explanation       │
│ [Primary CTA — full width]   │
│ [See how it works]           │
│ Manual-first / trust note    │
│ Product evidence             │
├──────────────────────────────┤
│ 01 Ghi đúng bản chất         │
│ 02 Thấy số dư đổi            │
│ 03 Mở sổ kiểm tra            │
├──────────────────────────────┤
│ Product proof + caption      │
├──────────────────────────────┤
│ Product proof + caption      │
├──────────────────────────────┤
│ Control facts                │
├──────────────────────────────┤
│ Final CTA                    │
│ Footer                       │
└──────────────────────────────┘
```

### 5. Landing validation tasks

A reviewer should be able to complete these without explanation:

1. State what MoneyFlow does after viewing only the first viewport.
2. Find registration and returning-user login.
3. Explain the three-step relationship between transaction, balance and ledger.
4. Identify one product boundary MoneyFlow states honestly.
5. Reach every action at 320 px without collision or horizontal scroll.

### 6. Landing acceptance criteria before visual styling

- The first viewport works in grayscale.
- The proposition is understandable without the product screenshot.
- The product screenshot strengthens proof but is not required to decode the headline.
- One action is visibly primary; Login remains available but secondary.
- The page is not a complete feature catalogue.
- Section order still makes sense when read as plain text.
- Mobile is a deliberate stack, not a collapsed desktop layout.
- No section depends on color for meaning.

## Authentication design process

Authentication is not a smaller landing page. Its job is completion, recovery and trust.

### 1. Map the full authentication flow

```text
Landing
  ├─ Đăng nhập
  │    ├─ Google OAuth
  │    ├─ Email + password
  │    ├─ Invalid credentials → generic actionable error
  │    ├─ CAPTCHA required / failed
  │    └─ Quên mật khẩu
  │          ├─ Enter email
  │          ├─ Generic confirmation
  │          └─ Reset link → new password → return to login
  └─ Tạo sổ / tạo tài khoản
       ├─ Google OAuth
       ├─ Email + password
       ├─ Privacy acceptance
       ├─ CAPTCHA required / failed
       └─ Existing account / confirmation handling without enumeration
```

Only branches supported by current MoneyFlow behaviour may appear in the final implementation.

### 2. Separate modes by task

Each screen has one task and one primary heading:

- `Đăng nhập vào MoneyFlow`;
- `Tạo tài khoản MoneyFlow`;
- `Khôi phục quyền truy cập`;
- `Đặt mật khẩu mới`.

Do not combine login and registration into one ambiguous form. Do not place a second marketing page beside the form.

### 3. Recommended login wireframe candidate

#### Desktop skeleton

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Brand                                                    Về trang chủ │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────┐  ┌──────────────────────┐ │
│   │ Eyebrow / current task               │  │ Compact trust rail   │ │
│   │ H1 Đăng nhập vào MoneyFlow           │  │ - no bank password  │ │
│   │ Short task explanation               │  │ - data boundary     │ │
│   │                                      │  │ - support/recovery  │ │
│   │ [Continue with Google]               │  └──────────────────────┘ │
│   │ -------- hoặc dùng email ----------  │                           │
│   │ Email                                │                           │
│   │ [                              ]     │                           │
│   │ Password             Quên mật khẩu?  │                           │
│   │ [                         Show ]     │                           │
│   │ CAPTCHA / status                    │                           │
│   │ [Đăng nhập]                         │                           │
│   │ Chưa có tài khoản? Tạo tài khoản    │                           │
│   └──────────────────────────────────────┘                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

The compact rail is optional. The form must remain visually dominant and the rail must disappear or move below the form when it competes for space.

#### Mobile skeleton

```text
┌──────────────────────────────┐
│ Brand              Trang chủ │
├──────────────────────────────┤
│ H1 Đăng nhập vào MoneyFlow   │
│ Short explanation            │
│ [Continue with Google]       │
│ -------- hoặc --------       │
│ Email                        │
│ [                          ] │
│ Password      Quên mật khẩu? │
│ [                    Show ]  │
│ CAPTCHA / status             │
│ [Đăng nhập — full width]     │
│ Tạo tài khoản                │
│ Trust note                   │
└──────────────────────────────┘
```

### 4. Required authentication states

Every state must be wireframed before high fidelity:

| State | Required behaviour |
|---|---|
| Default | Clear labels, visible password recovery and one primary submit action |
| Field validation | Error adjacent to field, preserves safe submitted values |
| Invalid credentials | Generic message that does not reveal which credential failed |
| Loading | Submit text changes and duplicate submissions are prevented |
| OAuth loading/failure | Provider action remains identifiable; recovery route remains available |
| CAPTCHA pending/failure | Status is visible but secondary; task is not replaced by a puzzle narrative |
| Recovery submitted | Generic confirmation whether or not the account exists |
| Reset success | Clear route back to normal login |
| Service error | Explains retry/support action without leaking system detail |
| 200% text | No clipped labels, hidden actions or horizontal scroll |

### 5. Authentication validation tasks

1. A returning user can find the fastest supported sign-in method.
2. A user who forgot the password can start recovery without searching the page.
3. A user can distinguish login from account creation.
4. An error explains the next action without revealing account existence.
5. Password-manager, paste, keyboard and show/hide-password workflows remain usable.
6. The form remains the primary object on phone, tablet and desktop.

### 6. Authentication acceptance criteria before visual styling

- Each screen has one task and one H1.
- Labels are persistent and are not replaced by placeholders.
- Password recovery is adjacent to the password task.
- Security messaging is factual and compact.
- Generic error messages remain actionable.
- Google and email routes are clearly separated.
- Required privacy and CAPTCHA behaviour stays visible without dominating.
- The full flow works in grayscale and with keyboard only.

## Responsive wireframe matrix

Minimum frames required before high fidelity:

| Surface | 320 | 390 | 768 | 1366 | Dark structure check |
|---|---:|---:|---:|---:|---:|
| Landing first viewport | required | required | required | required | required |
| Landing full page | required | required | optional | required | required |
| Login default | required | required | required | required | required |
| Login error | required | required | optional | required | required |
| Register default | required | required | optional | required | required |
| Recovery submitted | required | optional | optional | required | optional |
| Password update | required | optional | optional | required | optional |

Dark mode at the wireframe stage checks structure and elevation only. Brand and semantic hues are applied later.

## Review gates

### Gate 1 — content

- Claims map to current product behaviour.
- Copy order works without layout.
- Primary and secondary actions are unambiguous.

### Gate 2 — low fidelity

- Three landing alternatives and at least two auth compositions are compared.
- Grayscale mobile and desktop frames exist.
- Owner selects or rejects the structural direction.

### Gate 3 — flow and states

- Login, registration, recovery and reset routes are connected.
- Error, loading, CAPTCHA and service-failure states exist.
- Keyboard and password-manager constraints are represented.

### Gate 4 — brand color system

- Brand, neutral, semantic, chart and light/dark token roles are approved.
- Semantic finance colors are not reused decoratively.
- Color is applied to the accepted wireframe rather than used to choose it.

### Gate 5 — high fidelity and prototype

- Responsive frames use the approved brand system.
- Clickable flows are reviewed on a physical phone and desktop.
- The prototype does not introduce unsupported product claims.

### Gate 6 — implementation

- Code matches accepted hierarchy and routes.
- Automated browser assertions and visual evidence pass.
- Human owner reviews screenshots before merge.

## Immediate decision for PR #213

PR #213 is no longer ready for final visual approval.

The next deliverables are:

1. grayscale landing wireframe board with three alternatives;
2. grayscale login/auth flow board with at least two compositions and all required states;
3. owner selection of the structural direction;
4. project-wide brand color-system research and candidate palettes;
5. application of the selected palette to the selected wireframe;
6. code revision and browser validation.

Existing implementation remains useful as a behaviour-preserving prototype, but it is not the final design authority.