# MoneyFlow — public experience foundation

**Status:** active research and required process  
**Scope:** project-wide brand color research, landing-page wireframes, authentication wireframes and public-experience design workflow  
**Last researched:** 2026-08-02  
**Decision boundary:** this document defines evidence, roles and process. It does **not** select a final palette, landing composition or auth composition without explicit owner approval.

## 1. Why this document exists

MoneyFlow must not solve color, landing and login as three unrelated styling tasks.

A coherent public experience requires:

1. one project-wide brand and semantic color architecture;
2. page goals and content hierarchy before visual styling;
3. complete landing and authentication flows, not isolated attractive screens;
4. real product evidence and financial honesty;
5. owner review of multiple wireframe and palette candidates before implementation becomes design authority.

This document is the durable handoff for those rules. Future agents must not reconstruct them from chat history.

---

## 2. Decision questions

The research addressed four questions:

1. What can color psychology reliably contribute to a finance brand?
2. How should MoneyFlow separate brand color from financial semantic colors?
3. What design sequence should be used for a landing page?
4. How should the same sequence be adapted to login, registration and recovery?

---

## 3. Source inventory

Access date for every source below: **2026-08-02**.

### 3.1 Color psychology and accessibility

| Source | What it supports | What it does not support |
|---|---|---|
| Elliot & Maier, “Color Psychology: Effects of Perceiving Color on Psychological Functioning in Humans”, *Annual Review of Psychology* — `https://www.annualreviews.org/content/journals/10.1146/annurev-psych-010213-115035/` | Color can carry meaning and affect affect, cognition and behavior | Universal prescriptions such as “blue always creates trust” or “green always calms users”; the review explicitly notes boundary conditions and limited real-world generalizability |
| W3C WCAG 2.2, Use of Color — `https://www.w3.org/WAI/WCAG22/Understanding/use-of-color` | Color cannot be the sole carrier of information, action, response or distinction | Passing this criterion does not by itself make a palette usable or branded |
| WCAG contrast, focus and target guidance already preserved in `UI_UX_RESEARCH_LEDGER.md` | Text, focus indicators and controls need measurable contrast and visibility | Minimum compliance is not a complete visual direction |
| Carbon Design System color tokens — `https://carbondesignsystem.com/elements/color/tokens/` | Mature systems separate neutral surfaces, interaction color and semantic roles | MoneyFlow must not copy IBM's identity or palette |
| Atlassian Design System color foundations — `https://atlassian.design/foundations/color-new/` | Brand, neutral, information, success, warning and danger require distinct roles | Atlassian's product density and exact values are not MoneyFlow requirements |

### 3.2 Wireframing and design process

| Source | What it supports | Limits |
|---|---|---|
| Figma, “How to wireframe” — `https://www.figma.com/blog/how-to-wireframe/` | Wireframes are skeletal guides used to communicate structure, gather feedback and iterate before aesthetics | Figma is optional; the process is the retained lesson |
| Figma wireframe tool — `https://www.figma.com/wireframe-tool/` | Flows and layouts can be explored collaboratively at different fidelity levels | Tool output is not evidence of user comprehension |
| Webflow, “UX wireframing 101” — `https://webflow.com/blog/what-is-a-wireframe` | Define the page goal, choose fidelity, sketch essentials, iterate and gather feedback | Practitioner guidance, not MoneyFlow product truth |
| Webflow, sitemap and wireframe process — `https://webflow.com/blog/the-modern-web-design-process-creating-sitemaps-and-wireframes` | Content hierarchy and annotations belong in wireframes; wireframes expose content requirements | A generic marketing sitemap must not become MoneyFlow's IA |
| Webflow, visual-design process — `https://webflow.com/blog/the-web-design-process-creating-the-visual-design` | Goals, audience, competitor study, mood boards and style tiles should precede final visual design | Visual inspiration does not replace product evidence |
| Relume workflow, preserved in the cumulative ledger | Brief → sitemap → wireframe → style exploration → refinement | AI-generated structure still requires owner and user review |

### 3.3 Landing and authentication patterns

| Source | What it supports | Limits |
|---|---|---|
| GOV.UK Design System patterns — `https://design-system.service.gov.uk/patterns/` | Design around user tasks, clear questions, validation, recovery and confirmation | Do not copy the GOV.UK visual identity |
| GOV.UK confirm-email pattern — `https://design-system.service.gov.uk/patterns/confirm-an-email-address/` | Confirmation must state where the email went, what the user must do and how to resend/change the address | Adapt to MoneyFlow's actual provider flow |
| OWASP Authentication Cheat Sheet — `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html` | Login, registration and recovery responses must avoid revealing whether an account exists | Generic messages must still provide understandable recovery guidance |
| Baymard, account sign-in flows — `https://baymard.com/blog/account-sign-in-flows` | Preserve the user's intended path after sign-in or password reset | Findings are ecommerce-derived; checkout/guest patterns do not automatically apply |
| Baymard, accounts and self-service research — `https://baymard.com/research/self-service` | Sign-in, password reset, account lockout and post-auth routing form one account-access experience | Paid research limits the detail available publicly |
| Current MoneyFlow product behavior and PR #213 | Real OAuth, email/password, CAPTCHA, recovery, product proof, responsive and test constraints | PR #213's colors and composition remain a candidate, not approved brand law |

### 3.4 Visual-reference examples

The following were used only to compare wireframe structure, not as design authority or copy sources:

- MockFlow SaaS landing wireframe: hero, proof/product view, benefits, feature walkthrough and CTA progression.
- Penpot sign-in wireframe: focused form, visible labels, primary action and recovery link.
- Uxcel login-state sketches: default, failure and success need separate wireframes.
- Lucid login/sign-up template: sign-in and sign-up are related but distinct task flows.

Do not copy their placeholder content, pricing, testimonials, imagery or exact layout.

---

## 4. Brand color research

## 4.1 What color psychology can and cannot decide

Color psychology is useful as a hypothesis generator, not a deterministic rulebook.

Supported interpretation:

- color changes perceived tone and can influence attention and behavior;
- meaning depends on context, culture, neighboring colors, saturation, lightness, content and learned brand associations;
- repeated, consistent use creates stronger brand meaning than a one-time choice justified by a generic emotion chart.

Unsupported interpretation:

- blue automatically makes a finance product trustworthy;
- green automatically means wealth or safety in every context;
- white automatically means simplicity when hierarchy and contrast are weak;
- one color can compensate for unclear copy, false claims or broken financial logic.

For MoneyFlow, trust must primarily come from correct balances, understandable transactions, recovery, export, privacy boundaries and honest claims. Color reinforces that trust; it cannot create it alone.

## 4.2 Finance-specific semantic conflict

MoneyFlow already needs color for domain meaning:

- **income / positive movement / completed success**;
- **expense / negative movement / destructive error**;
- **warning / budget pressure / attention**;
- **transfer / neutral movement between accounts**;
- **information / focus / selection**.

Therefore the brand must not consume the entire green/red/amber semantic space.

A green-first brand is risky because green already carries income/success meaning. If large backgrounds, buttons and headings are also green, users lose a clean distinction between brand action and financial state.

A red-first or amber-first finance brand creates an even stronger collision with danger and warning.

## 4.3 Required color architecture

MoneyFlow must use semantic roles rather than screen-local colors.

### Layer A — neutral foundation

Used for 75–85% of the interface:

- canvas;
- surface;
- muted surface;
- elevated surface;
- primary, secondary and soft text;
- borders and dividers;
- overlays and shadows.

A white-first design means white is the main surface, not that every layer is identical white. Subtle neutral steps are required to show grouping, elevation and interaction without tinting the entire product.

### Layer B — brand and action

Used for roughly 8–15% of a screen:

- primary CTA;
- active navigation;
- selected state;
- focus ring;
- branded links and highlights;
- logo applications where appropriate.

This color must remain distinguishable from income, expense, warning and transfer.

### Layer C — financial semantic colors

Used sparingly and only when the meaning exists:

- income / success;
- expense / danger;
- warning;
- transfer / information.

A semantic color always requires another cue where misunderstanding matters: label, sign, icon, shape, pattern or position.

### Layer D — chart palette

Charts require a separate ordered categorical/series palette. It must:

- distinguish adjacent series under common color-vision deficiencies;
- reserve income/expense colors only when the series truly represent those meanings;
- work on light and dark backgrounds;
- include direct labels or legends;
- avoid presenting red versus green as the only distinction.

## 4.4 Candidate direction for testing, not approval

The current strongest hypothesis is **white-first neutral surfaces with a trust-oriented blue brand hue**, because it avoids collision with income green, expense red and warning amber while remaining familiar for high-trust digital products.

This is a candidate to test, not a binding palette.

### Candidate brand ramp

| Step | Value |
|---:|---|
| 50 | `#EFF4FF` |
| 100 | `#DFE8FF` |
| 200 | `#C5D3FF` |
| 300 | `#9FB5FF` |
| 400 | `#7592F5` |
| 500 | `#5273E8` |
| 600 | `#2F55D4` |
| 700 | `#2445B7` |
| 800 | `#1D378E` |
| 900 | `#192E6E` |
| 950 | `#111B3E` |

### Candidate light roles

| Role | Value |
|---|---|
| Canvas | `#F6F8FC` |
| Surface | `#FFFFFF` |
| Surface muted | `#F0F3F8` |
| Surface strong | `#E7ECF3` |
| Text | `#111827` |
| Text muted | `#4B5563` |
| Text soft | `#6B7280` |
| Border | `#D7DEE8` |
| Border strong | `#B7C1D0` |
| Brand | `#2F55D4` |
| Brand hover | `#2445B7` |
| Brand pressed | `#1D378E` |
| Brand subtle | `#EAF0FF` |
| Brand text | `#2443A8` |
| On brand | `#FFFFFF` |
| Focus | `#2F55D4` |

### Candidate dark roles

| Role | Value |
|---|---|
| Canvas | `#0D111B` |
| Surface | `#151A24` |
| Surface muted | `#1D2430` |
| Surface strong | `#283140` |
| Text | `#F7F8FA` |
| Text muted | `#B9C1CC` |
| Text soft | `#8E98A6` |
| Border | `#303A49` |
| Border strong | `#475365` |
| Brand | `#8EA7FF` |
| Brand hover | `#A7B9FF` |
| Brand pressed | `#7693F3` |
| Brand subtle | `#1C2854` |
| Brand text | `#B8C7FF` |
| On brand | `#0E1638` |
| Focus | `#9FB5FF` |

### Candidate semantic roles

| Meaning | Solid | Subtle | Text | Dark solid | Dark subtle | Dark text |
|---|---|---|---|---|---|---|
| Income / success | `#0C7A55` | `#E6F6EF` | `#086044` | `#4DD4A0` | `#12392D` | `#8AE7C2` |
| Expense / danger | `#C83E46` | `#FDEBEC` | `#9F2D35` | `#FF858B` | `#462126` | `#FFB5B9` |
| Warning | `#9A6100` | `#FFF2D8` | `#764900` | `#F4BE65` | `#433119` | `#F8D391` |
| Transfer | `#7054CC` | `#F0ECFF` | `#523CAD` | `#B29EFF` | `#302858` | `#CEBFFF` |

Before adoption, this candidate must be tested in:

- landing and auth;
- navigation, form, table, dialog, toast and empty states;
- income, expense, transfer and warning rows;
- chart series;
- light and dark mode;
- deuteranopia, protanopia and tritanopia simulation;
- WCAG contrast measurements using effective composited backgrounds;
- Android physical-device review.

## 4.5 Color rules for the project

1. No page or component creates its own brand palette.
2. Raw color values belong in one project theme authority after approval.
3. Component code consumes semantic tokens.
4. Green is not a decorative brand fill; it is reserved primarily for income/success.
5. Red is not used for ordinary negative numbers unless the meaning is expense, danger or error.
6. Transfer is visually distinct from both income and expense.
7. Focus is visible in both light and dark modes.
8. Text and interaction states pass contrast requirements on their effective background.
9. Color never carries financial meaning alone.
10. Marketing illustrations may use broader color, but they must not redefine product semantics or reduce readability.

---

## 5. Shared design workflow for landing and authentication

MoneyFlow public experience must use this sequence:

### Gate 1 — product truth

Record:

- what MoneyFlow actually does;
- who the page is for;
- what data is real;
- which claims are forbidden or unsupported;
- current auth/provider behavior;
- the single success event for the page.

No wireframe starts before this is written.

### Gate 2 — content inventory

List every required piece of content before layout:

- headline and supporting statement;
- CTA labels;
- product proof;
- trust/privacy statements;
- navigation;
- legal/support links;
- validation and recovery copy;
- loading, error and confirmation messages.

Use real or production-intended Vietnamese copy. Lorem ipsum can hide content-fit problems and is not sufficient for approval.

### Gate 3 — user flow

Map the path as boxes and arrows before individual screens.

For landing:

`arrive → understand product → inspect proof → understand workflow/trust → choose create account or login`

For authentication:

`entry route → login/register/OAuth → CAPTCHA/validation → success or recoverable failure → intended destination`

Include alternate paths before styling.

### Gate 4 — low-fidelity divergence

Create at least three genuinely different grayscale wireframes.

They must differ in hierarchy or flow, not merely button position or color.

Each candidate includes:

- desktop and 320/390px mobile structure;
- primary action;
- content order;
- product proof position;
- major trade-off;
- reason it may fail.

### Gate 5 — annotated mid-fidelity wireframe

After narrowing candidates, create an annotated wireframe with:

- real copy length;
- component names;
- responsive behavior;
- interaction notes;
- state transitions;
- content source and claim status;
- accessibility notes;
- analytics event points where relevant.

The wireframe remains neutral or grayscale. Brand color is not used to conceal weak hierarchy.

### Gate 6 — state matrix

No public screen is complete without its states.

| State group | Landing | Authentication |
|---|---|---|
| Default | complete page and primary CTA | login/register/recovery form |
| Loading | proof media or route transition | email/OAuth submit, CAPTCHA, reset |
| Empty/unavailable | missing optional proof degrades cleanly | provider unavailable or no session |
| Validation | malformed form or navigation edge | field error, privacy requirement, password rule |
| Service error | asset/API failure | safe generic auth error, rate limit, callback failure |
| Success | CTA routes correctly | signed in, registered, link sent, password updated |
| Recovery | alternate route remains clear | forgot password, resend, change email where supported |
| Session | not applicable | expired session, signed-out state, intended-route preservation |

### Gate 7 — accessibility and security review

Before high-fidelity styling:

- visible labels remain visible;
- heading order is logical;
- keyboard order follows visual order;
- target size meets MoneyFlow policy;
- links state their purpose;
- error messages are associated with fields;
- generic auth messages do not enumerate accounts;
- color is not the only state cue;
- reduced motion is supported;
- 200% text does not hide actions.

### Gate 8 — owner structure selection

The owner selects a wireframe or requests another round.

Rejected candidates are recorded with reasons. They do not become hidden constraints.

### Gate 9 — brand and style application

Only after structure selection apply:

- approved project color tokens;
- typography;
- radius, border and elevation;
- imagery and iconography;
- motion;
- final component styling.

### Gate 10 — interactive prototype and implementation

Prototype critical paths, then implement in production code.

Required evidence:

- Chromium and WebKit critical paths;
- 320, 360, 390, 768, 1024, 1366 and 1440px where selected by repository policy;
- light/dark if supported;
- keyboard and 200% text;
- physical Android review;
- owner visual review before merge.

---

## 6. Landing-page wireframe framework

## 6.1 Landing job

A new visitor must quickly understand:

1. MoneyFlow is a Vietnamese manual-first personal income and expense ledger.
2. The primary loop is recording transactions, knowing balances and understanding the period.
3. The product does not need fabricated automation, financial advice or bank-sync claims to explain its value.
4. The next actions are create an account or log in.

## 6.2 Content blocks to test

The following are content requirements, not a mandatory final order:

- compact header with brand, limited navigation, login and one primary CTA;
- hero with a direct product promise and supporting explanation;
- real product evidence from sanitized MoneyFlow UI;
- short explanation of the normal loop: record → balances update → inspect/correct/export;
- benefit or capability sections grounded in actual behavior;
- data ownership, privacy and correction/recovery evidence;
- final CTA and footer with legal/support routes.

Optional blocks must earn their place. Do not add pricing, testimonials, user counts, bank logos or savings outcomes without verified source-of-truth data.

## 6.3 Three wireframe directions to explore

These are structural hypotheses, not selected designs.

### Direction A — product proof first

`Header → split hero with product screenshot → three-step loop → trust/data ownership → final CTA`

Strength: concrete and fast to understand.  
Risk: screenshot density can overwhelm mobile or become outdated.

### Direction B — task narrative

`Header → problem/goal hero → record/balance/understand walkthrough → product evidence → trust → CTA`

Strength: explains why the product matters.  
Risk: can become long or abstract if copy is not disciplined.

### Direction C — interactive ledger preview

`Header → direct hero → small controlled demo/preview → capability proof → ownership → CTA`

Strength: lets the product demonstrate value.  
Risk: higher implementation cost and accessibility/maintenance burden; must not fabricate behavior.

## 6.4 Landing acceptance questions

- What does a user believe MoneyFlow does after reading only the header and hero?
- Is one primary action visually dominant?
- Does the page use real evidence rather than unsupported claims?
- Can the main story be understood without animation?
- Does mobile preserve copy hierarchy and proof clarity?
- Is login always findable without competing with the primary CTA?
- Does the page still work when optional media fails?

---

## 7. Authentication wireframe framework

## 7.1 Authentication job

Authentication is a task surface. Its first job is to let users access or create their MoneyFlow account safely and recover when something fails.

Marketing support is secondary and must never compete with the form.

## 7.2 Auth journey map

Wireframe the full family, not only login:

1. Login.
2. Registration.
3. Forgot password request.
4. Reset/update password.
5. Email confirmation pending.
6. Email confirmation completed or failed.
7. OAuth provider start and callback.
8. CAPTCHA checking, failure and retry.
9. Generic credential failure.
10. Rate limit or temporary service failure.
11. Session expired.
12. Successful return to the intended destination.
13. Demo-mode or unavailable-provider notice where the current product supports it.

## 7.3 Base auth composition

The default wireframe should include:

- MoneyFlow brand/home link;
- page-specific heading and one concise explanation;
- OAuth action where enabled;
- clear divider when multiple methods exist;
- persistent labels above fields;
- password reveal control;
- primary submit action;
- relevant recovery or account-switch link;
- privacy/terms requirement only where needed;
- inline field errors and a form-level safe message;
- support or home escape route.

A proof rail or supporting panel is optional. Keep it only when it:

- uses factual MoneyFlow evidence;
- does not push the form below the fold;
- disappears or moves after the form on small screens;
- does not introduce a second CTA hierarchy;
- does not imply unavailable security or automation capabilities.

## 7.4 Auth wireframe directions to explore

### Direction A — focused single card

`Brand/home → centered task card → help/recovery links`

Strength: lowest distraction and strong mobile behavior.  
Risk: may feel generic unless brand craft is strong.

### Direction B — form plus factual proof rail

`Brand/home → form column + narrow trust/product-evidence rail`

Strength: supports new-user confidence.  
Risk: rail can compete with form or create excessive height.

### Direction C — two-stage account choice

`Choose login method → reveal relevant email/password or provider path`

Strength: reduces initial density.  
Risk: adds a step and may slow frequent users; only valid if testing shows benefit.

## 7.5 Authentication rules

1. Preserve the user's intended path after successful login or reset when the application supports it.
2. Do not reveal whether an email/account exists through unsafe response differences.
3. Recovery must remain visible and understandable.
4. Do not clear valid non-secret input after recoverable errors without reason.
5. Disable duplicate submission while clearly showing progress.
6. CAPTCHA behavior must be explained only as needed and must not create a false checkbox expectation.
7. OAuth and password routes must use clear task labels.
8. Every state requires keyboard and screen-reader review.
9. Mobile keyboard, safe areas and 320px width are first-class constraints.
10. Security messaging must be factual; do not claim encryption, bank access boundaries or protection not supported by verified product documentation.

---

## 8. Cross-source synthesis

### 8.1 Points of agreement worth learning

- Structure and content should be reviewed before color and visual polish.
- Multiple low-cost wireframes enable real divergence.
- Landing and auth both need explicit page goals and a single main action.
- Authentication is a multi-state flow including recovery and post-auth routing.
- Trust in finance comes from evidence, control, recovery and honesty, reinforced by consistent visual treatment.
- Brand color and financial semantic colors must be separate.
- White-first UI still requires neutral depth, strong text contrast and clear focus.
- Color and motion cannot be the sole means of conveying state.

### 8.2 MoneyFlow-specific fit

- Use actual MoneyFlow behavior and sanitized product evidence.
- Keep the landing message manual-first and Vietnamese-first.
- Keep login/register focused on completing the task.
- Preserve OAuth, CAPTCHA and recovery behavior while redesigning presentation.
- Build one project token system after owner approval; do not keep green local public tokens beside another global palette.
- Test every candidate with real Vietnamese copy and VND-heavy product screenshots.

### 8.3 What must not be copied

- Generic SaaS sections merely because a wireframe template contains them.
- Pricing and testimonials without source-of-truth evidence.
- Competitor color palettes, logos, assets or exact compositions.
- Ecommerce guest-checkout patterns that do not map to MoneyFlow.
- Marketing-heavy auth side panels that delay or distract from sign-in.
- “Blue means trust” as the sole rationale for a palette.
- Local component hex values that bypass the project theme authority.

### 8.4 Conflicts and resolutions

| Conflict | Resolution |
|---|---|
| Owner wants white-first, while current landing/auth candidate is green-first | Treat white-first as a design requirement to explore; do not implement until a project-wide palette is selected |
| Current global theme is cobalt and named Signal Ledger, which is rejected | Retain semantic architecture lessons, but do not treat the existing exact values or concept wording as approved direction |
| Green is familiar in finance, but MoneyFlow uses green for income/success | Reserve green primarily for semantics; test a non-green brand hue |
| Login can benefit from trust proof, but form completion must dominate | Proof rail is optional and subordinate; focused form is the baseline comparison |
| Wireframe templates often include testimonials/pricing | Only include sections backed by MoneyFlow product truth and verified business decisions |

---

## 9. Decisions recorded by this research

### Binding process decisions

- Brand color is a project-level decision, not a landing/login-only decision.
- Landing and authentication must be wireframed before high-fidelity styling.
- At least three structurally different low-fidelity candidates are required.
- Auth must be designed and evaluated as a stateful journey.
- Color roles are semantic and centralized.
- Green/red/amber/transfer colors remain available for financial meaning.
- No candidate palette or wireframe becomes active without explicit owner approval.

### Candidate decisions awaiting owner selection

- White-first neutral surfaces.
- Trust-oriented blue as the primary brand/action family.
- Landing proof-first, task-narrative or controlled-preview structure.
- Auth focused-card, proof-rail or staged-method structure.

### Explicitly rejected approaches

- Recolor only landing and login.
- Reuse the green-first public palette as project brand law.
- Reactivate Signal Ledger's exact cobalt/warm-neutral palette without a new selection.
- Polish one layout and call color variants “multiple directions”.
- Treat color psychology charts as scientific certainty.

---

## 10. Required deliverables before implementation

A future implementation packet must contain:

1. three landing low-fidelity wireframes;
2. three auth low-fidelity directions covering the full state family;
3. mobile and desktop structure for each;
4. annotated mid-fidelity candidate selected for each flow;
5. at least three project-wide palette studies applied to the same representative screens;
6. contrast and color-vision checks;
7. owner selection with reasons;
8. a token migration map showing which local/global colors are removed;
9. implementation and rollback plan;
10. exact-head browser and physical-device evidence.

---

## 11. Traceability

| Research conclusion | Future implementation area |
|---|---|
| One project-wide semantic color owner | `src/app/document-theme.css` and compatibility aliases |
| Remove public green-first palette duplication | landing/auth CSS modules after owner selection |
| Wireframe before styling | design artifacts and active work packet |
| Auth journey includes all recovery states | auth component, callback and browser tests |
| Preserve intended route after auth | auth routing/callback behavior and tests |
| Color is not the sole cue | transactions, charts, validation, badges and focus |
| Owner chooses palette and structure | PR visual review before merge |

---

## 12. Update protocol

When adding a new public-experience source:

1. add URL and access date;
2. state the question it answers;
3. record what it establishes;
4. record its limits and what does not apply;
5. compare against this document and the cumulative ledger;
6. add contradictions;
7. update a decision only when evidence or owner direction warrants it;
8. preserve rejected candidates as history rather than silent constraints.

This document must remain concept-neutral. Detailed visual directions belong in candidate work packets and design reviews, not in the research foundation.