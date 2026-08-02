# MoneyFlow — public experience foundation

**Status:** active research and required process

**Scope:** project-wide brand color research, landing-page wireframes, authentication wireframes and public-experience design workflow

**Last researched:** 2026-08-02

**Decision boundary:** this document defines evidence, roles and process. It does **not** select a final palette, landing composition or auth composition without explicit owner approval.

## 1. Purpose

MoneyFlow must not solve color, landing and login as unrelated styling tasks.

A coherent public experience requires:

1. one project-wide brand and semantic color architecture;
2. page goals and content hierarchy before visual styling;
3. complete landing and authentication flows, not isolated attractive screens;
4. real product evidence and financial honesty;
5. owner review of multiple wireframe and palette candidates before implementation becomes design authority.

This file is the durable handoff. Future agents must not reconstruct these decisions from chat history.

## 2. Decision questions

1. What can color psychology reliably contribute to a finance brand?
2. How should MoneyFlow separate brand color from financial semantic colors?
3. What design sequence should be used for a landing page?
4. How should the same sequence cover login, registration and recovery?

## 3. Source inventory

Access date for every source: **2026-08-02**.

### Color psychology and accessibility

| Source | What it supports | What it does not support |
|---|---|---|
| Elliot & Maier, *Color Psychology*, Annual Review of Psychology — `https://www.annualreviews.org/content/journals/10.1146/annurev-psych-010213-115035/` | Color can carry meaning and affect affect, cognition and behavior | Universal prescriptions such as “blue always creates trust”; the review notes boundary conditions and limited real-world generalizability |
| W3C WCAG 2.2, Use of Color — `https://www.w3.org/WAI/WCAG22/Understanding/use-of-color` | Color cannot be the sole carrier of information, action, response or distinction | Passing this criterion does not make a palette usable or branded |
| WCAG contrast, focus and target guidance preserved in the cumulative ledger | Text, controls and focus need measurable contrast and visibility | Compliance minimums are not a complete visual direction |
| Carbon color tokens — `https://carbondesignsystem.com/elements/color/tokens/` | Mature systems separate neutral surfaces, interaction color and semantic roles | Do not copy IBM identity or exact values |
| Atlassian color foundations — `https://atlassian.design/foundations/color-new/` | Brand, neutral, information, success, warning and danger need distinct roles | Atlassian's product context is not MoneyFlow's context |

### Wireframing and process

| Source | What it supports | Limits |
|---|---|---|
| Figma, “How to wireframe” — `https://www.figma.com/blog/how-to-wireframe/` | Wireframes communicate structure and enable feedback before aesthetics | Figma is optional; process is the retained lesson |
| Figma wireframe tool — `https://www.figma.com/wireframe-tool/` | Flows and layouts can be explored at different fidelity levels | Tool output is not user validation |
| Webflow, “UX wireframing 101” — `https://webflow.com/blog/what-is-a-wireframe` | Define the page goal, choose fidelity, sketch essentials, iterate and gather feedback | Practitioner guidance, not MoneyFlow product truth |
| Webflow, sitemap and wireframes — `https://webflow.com/blog/the-modern-web-design-process-creating-sitemaps-and-wireframes` | Content hierarchy and annotations belong in wireframes | Generic site maps must not become MoneyFlow IA |
| Webflow, visual design process — `https://webflow.com/blog/the-web-design-process-creating-the-visual-design` | Goals, audience, competitor study, mood boards and style tiles precede final visual design | Inspiration does not replace product evidence |
| Relume workflow, preserved in the cumulative ledger | Brief → sitemap → wireframe → style exploration → refinement | AI structure still needs owner and user review |

### Landing and authentication

| Source | What it supports | Limits |
|---|---|---|
| GOV.UK patterns — `https://design-system.service.gov.uk/patterns/` | Design around user tasks, clear questions, validation, recovery and confirmation | Do not copy GOV.UK visual identity |
| GOV.UK confirm email — `https://design-system.service.gov.uk/patterns/confirm-an-email-address/` | State where the email went, what to do and how to resend/change it | Adapt to MoneyFlow provider behavior |
| OWASP Authentication Cheat Sheet — `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html` | Login, registration and recovery responses must avoid account enumeration | Generic responses still need understandable recovery guidance |
| Baymard sign-in flow research — `https://baymard.com/blog/account-sign-in-flows` | Preserve the intended path after sign-in or reset | Ecommerce-derived findings; guest checkout does not apply automatically |
| Baymard accounts research — `https://baymard.com/research/self-service` | Sign-in, reset, lockout and routing form one account-access experience | Public detail is limited by paid research |
| Current MoneyFlow behavior and PR #213 | Real OAuth, email/password, CAPTCHA, recovery, proof and responsive constraints | PR #213 composition and colors remain unapproved candidates |

### Visual references

Used only to compare structure, not as authority or copy sources:

- MockFlow SaaS landing wireframe: hero, product proof, benefits, walkthrough and CTA progression.
- Penpot sign-in wireframe: focused form, visible labels, primary action and recovery link.
- Uxcel login-state sketches: default, failure and success need separate wireframes.
- Lucid login/sign-up template: sign-in and registration are related but distinct tasks.

Do not copy placeholder content, pricing, testimonials, imagery or exact layouts.

## 4. Brand color research

### 4.1 What color psychology can decide

Color psychology is a hypothesis generator, not a deterministic rulebook.

Supported interpretation:

- color can influence attention, perceived tone and behavior;
- meaning depends on context, culture, saturation, lightness, neighboring colors, content and learned brand associations;
- consistent repeated use creates stronger meaning than a generic emotion chart.

Unsupported interpretation:

- blue automatically makes a product trustworthy;
- green always means wealth or safety;
- white always means simplicity;
- color can compensate for unclear claims or incorrect financial logic.

For MoneyFlow, trust comes primarily from correct balances, understandable transactions, recovery, export, privacy boundaries and honest claims. Color reinforces trust but cannot create it alone.

### 4.2 Finance-specific semantic conflict

MoneyFlow needs color for domain meaning:

- income and success;
- expense, danger and destructive errors;
- warning and attention;
- transfer between accounts;
- information, focus and selection.

A green-first brand conflicts with income/success. Large green backgrounds, buttons and headings reduce the distinction between brand action and financial state. Red and amber create even stronger collisions with danger and warning.

### 4.3 Required color architecture

#### Layer A — neutral foundation

Use for roughly 75–85% of the interface:

- canvas and surfaces;
- muted and elevated surfaces;
- text levels;
- borders, overlays and shadows.

White-first means white is the main surface, not that every layer is identical white. Subtle neutral steps must communicate grouping and elevation.

#### Layer B — brand and action

Use for roughly 8–15%:

- primary CTA;
- active navigation;
- selected state;
- focus ring;
- branded links and highlights;
- appropriate logo applications.

The brand family must remain distinguishable from income, expense, warning and transfer.

#### Layer C — financial semantics

Use only when the meaning exists:

- income/success;
- expense/danger;
- warning;
- transfer/information.

Where misunderstanding matters, combine color with a label, sign, icon, shape, pattern or position.

#### Layer D — chart palette

Charts need a separate ordered palette that:

- distinguishes adjacent series under common color-vision deficiencies;
- reserves income/expense colors for those actual meanings;
- works on light and dark surfaces;
- uses direct labels or legends;
- never relies on red versus green alone.

### 4.4 Candidate direction, not approval

The current strongest hypothesis is **white-first neutral surfaces with a trust-oriented blue brand family**. This avoids collision with income green, expense red and warning amber while remaining familiar for high-trust digital products.

This is a candidate to test, not a binding palette.

#### Candidate brand ramp

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

#### Candidate light roles

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

#### Candidate dark roles

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

#### Candidate semantic roles

| Meaning | Light solid | Light subtle | Light text | Dark solid | Dark subtle | Dark text |
|---|---|---|---|---|---|---|
| Income / success | `#0C7A55` | `#E6F6EF` | `#086044` | `#4DD4A0` | `#12392D` | `#8AE7C2` |
| Expense / danger | `#C83E46` | `#FDEBEC` | `#9F2D35` | `#FF858B` | `#462126` | `#FFB5B9` |
| Warning | `#9A6100` | `#FFF2D8` | `#764900` | `#F4BE65` | `#433119` | `#F8D391` |
| Transfer | `#7054CC` | `#F0ECFF` | `#523CAD` | `#B29EFF` | `#302858` | `#CEBFFF` |

Before adoption, test this candidate in landing, auth, navigation, forms, tables, dialogs, toasts, financial rows, charts, light/dark mode, color-vision simulations, WCAG contrast and physical Android review.

### 4.5 Project color rules

1. No page or component creates its own brand palette.
2. Raw values belong in one project theme authority after approval.
3. Components consume semantic tokens.
4. Green is reserved primarily for income/success, not decorative brand fills.
5. Red is used only when the meaning is expense, danger or error.
6. Transfer remains distinct from income and expense.
7. Focus stays visible in light and dark modes.
8. Contrast is measured on the effective composited background.
9. Color never carries financial meaning alone.
10. Marketing illustrations may use broader colors but cannot redefine product semantics.

## 5. Shared workflow for landing and authentication

### Gate 1 — product truth

Record:

- what MoneyFlow actually does;
- who the page is for;
- which data is real;
- which claims are forbidden;
- current auth/provider behavior;
- the single success event.

### Gate 2 — content inventory

List required content before layout:

- headline and supporting statement;
- CTA labels;
- product proof;
- trust/privacy statements;
- navigation and legal/support links;
- validation, recovery, loading, error and confirmation copy.

Use real Vietnamese copy. Lorem ipsum is not sufficient for approval.

### Gate 3 — user flow

Map paths before screens.

Landing:

`arrive → understand product → inspect proof → understand workflow/trust → create account or login`

Authentication:

`entry route → login/register/OAuth → CAPTCHA/validation → success or recoverable failure → intended destination`

### Gate 4 — low-fidelity divergence

Create at least three genuinely different grayscale wireframes. They must differ in hierarchy or flow, not merely button position or color.

Each candidate includes:

- desktop and 320/390px mobile structure;
- primary action;
- content order;
- product proof position;
- major trade-off;
- reason it may fail.

### Gate 5 — annotated mid-fidelity wireframe

After narrowing candidates, add:

- real copy length;
- component names;
- responsive behavior;
- interaction and state notes;
- content source and claim status;
- accessibility notes;
- analytics event points where relevant.

Keep the wireframe neutral or grayscale so color does not hide weak hierarchy.

### Gate 6 — state matrix

| State group | Landing | Authentication |
|---|---|---|
| Default | complete page and primary CTA | login/register/recovery form |
| Loading | proof media or route transition | email/OAuth submit, CAPTCHA, reset |
| Empty/unavailable | optional proof degrades cleanly | provider unavailable or no session |
| Validation | navigation/content edge | field error, privacy requirement, password rule |
| Service error | asset/API failure | safe generic auth error, rate limit, callback failure |
| Success | CTA routes correctly | signed in, registered, link sent, password updated |
| Recovery | alternate route remains clear | forgot password, resend, change email where supported |
| Session | not applicable | expired session, signed-out state, intended-route preservation |

### Gate 7 — accessibility and security

Before high fidelity:

- labels remain visible;
- heading and focus order are logical;
- controls meet target-size policy;
- links state their purpose;
- errors are associated with fields;
- generic auth messages avoid account enumeration;
- color is not the only cue;
- reduced motion and 200% text are supported.

### Gate 8 — owner structure selection

The owner selects a wireframe or requests another round. Record rejected candidates and reasons.

### Gate 9 — brand and style

Only after structure selection apply approved tokens, typography, radius, border, elevation, imagery, iconography and motion.

### Gate 10 — prototype and implementation

Prototype critical paths, then implement in production code with risk-selected browser evidence and physical Android review.

## 6. Landing wireframe framework

### Landing job

A visitor must understand:

1. MoneyFlow is a Vietnamese manual-first personal income and expense ledger.
2. The core loop is recording transactions, knowing balances and understanding the period.
3. The product does not need fabricated automation, advice or bank-sync claims to explain value.
4. The next actions are create an account or log in.

### Content blocks to test

These are requirements, not a mandatory order:

- compact header with brand, limited navigation, login and one primary CTA;
- hero with a direct product promise;
- real sanitized product evidence;
- explanation of record → balance → inspect/correct/export;
- capability sections grounded in actual behavior;
- data ownership, privacy and recovery evidence;
- final CTA and legal/support footer.

Do not add pricing, testimonials, user counts, bank logos or savings outcomes without verified sources.

### Structural directions to explore

#### Direction A — product proof first

`Header → split hero with product screenshot → three-step loop → trust/data ownership → final CTA`

Strength: concrete and fast to understand.

Risk: screenshot density can overwhelm mobile or become outdated.

#### Direction B — task narrative

`Header → goal hero → record/balance/understand walkthrough → product evidence → trust → CTA`

Strength: explains why the product matters.

Risk: can become long or abstract if copy is not disciplined.

#### Direction C — controlled preview

`Header → direct hero → small controlled demo/preview → capability proof → ownership → CTA`

Strength: lets the product demonstrate value.

Risk: higher implementation and accessibility cost; must not fabricate behavior.

### Landing acceptance questions

- What does the visitor believe MoneyFlow does after the header and hero?
- Is one action visually dominant?
- Is evidence real?
- Is the story understandable without animation?
- Does mobile preserve hierarchy?
- Is login findable without competing with the CTA?
- Does the page survive optional media failure?

## 7. Authentication wireframe framework

### Authentication job

Authentication is a task surface. Its first job is safe access, account creation and recovery. Marketing support is secondary and must not compete with the form.

### Auth journey map

Wireframe the full family:

1. Login.
2. Registration.
3. Forgot-password request.
4. Reset/update password.
5. Email confirmation pending.
6. Confirmation completed or failed.
7. OAuth start and callback.
8. CAPTCHA checking, failure and retry.
9. Generic credential failure.
10. Rate limit or service failure.
11. Session expired.
12. Return to intended destination.
13. Demo or unavailable-provider notice where supported.

### Base auth composition

Include:

- MoneyFlow brand/home link;
- page-specific heading and concise explanation;
- OAuth action where enabled;
- divider when multiple methods exist;
- persistent labels;
- password reveal;
- primary submit;
- recovery or account-switch link;
- privacy/terms only where required;
- field and form-level safe errors;
- support or home escape route.

A proof rail is optional. Keep it only when it uses factual evidence, does not push the form below the fold, becomes subordinate on mobile and does not create another CTA hierarchy.

### Auth directions to explore

#### Direction A — focused single card

`Brand/home → centered task card → help/recovery`

Strength: lowest distraction and strong mobile behavior.

Risk: may feel generic unless brand craft is strong.

#### Direction B — form plus factual proof rail

`Brand/home → form column + narrow trust/product-evidence rail`

Strength: supports new-user confidence.

Risk: the rail can compete with the form or create excessive height.

#### Direction C — staged method choice

`Choose login method → reveal relevant email/password or provider path`

Strength: reduces initial density.

Risk: adds a step and may slow frequent users; test before adoption.

### Authentication rules

1. Preserve intended path after login/reset when supported.
2. Do not reveal whether an account exists through unsafe response differences.
3. Keep recovery visible.
4. Do not clear valid non-secret input after recoverable errors without reason.
5. Prevent duplicate submission and show progress.
6. Explain CAPTCHA only as needed; do not create a false checkbox expectation.
7. Use clear task labels for OAuth and password routes.
8. Review every state with keyboard and screen reader.
9. Treat the mobile keyboard, safe areas and 320px width as first-class constraints.
10. Keep security messaging factual.

## 8. Cross-source synthesis

### Points worth retaining

- Review structure and content before color and polish.
- Use multiple low-cost wireframes for genuine divergence.
- Landing and auth need explicit goals and one primary action.
- Auth is a multi-state flow with recovery and post-auth routing.
- Finance trust comes from evidence, control, recovery and honesty, reinforced by consistent visuals.
- Brand color and financial semantics must be separate.
- White-first UI still needs neutral depth, contrast and focus.
- Color and motion cannot carry state alone.

### MoneyFlow-specific fit

- Use real MoneyFlow behavior and sanitized proof.
- Keep landing manual-first and Vietnamese-first.
- Keep auth focused on completing the task.
- Preserve OAuth, CAPTCHA and recovery behavior while changing presentation.
- Build one project token system after owner approval.
- Test candidates with real Vietnamese copy and VND-heavy product screenshots.

### Do not copy

- Generic SaaS sections merely because a template includes them.
- Unverified pricing, testimonials or user counts.
- Competitor colors, assets or exact layouts.
- Ecommerce guest-checkout patterns.
- Marketing-heavy auth side panels.
- “Blue means trust” as the sole rationale.
- Local hex values that bypass the project theme authority.

### Conflicts and resolutions

| Conflict | Resolution |
|---|---|
| Owner wants white-first while PR #213 is green-first | Explore white-first at project level; do not recolor only public screens |
| Current global theme is cobalt and named Signal Ledger | Retain semantic architecture lessons, not exact values or concept authority |
| Green is familiar in finance but also means income/success | Reserve green primarily for semantics; test a non-green brand hue |
| Trust proof can help auth but the form must dominate | Proof rail is optional and subordinate |
| Templates include testimonials/pricing | Include only content supported by MoneyFlow truth |

## 9. Decisions recorded

### Binding process decisions

- Brand color is a project-level decision.
- Landing and auth must be wireframed before high-fidelity styling.
- At least three structurally different low-fidelity candidates are required.
- Auth must be evaluated as a stateful journey.
- Color roles are semantic and centralized.
- Green, red, amber and transfer colors retain financial meaning.
- No candidate becomes active without owner approval.

### Candidates awaiting selection

- White-first neutral surfaces.
- Trust-oriented blue brand/action family.
- Landing proof-first, task-narrative or controlled-preview structure.
- Auth focused-card, proof-rail or staged-method structure.

### Rejected approaches

- Recolor only landing and login.
- Use the green-first public palette as project brand law.
- Reactivate Signal Ledger values without a new selection.
- Call color variants “multiple directions”.
- Treat color psychology charts as certainty.

## 10. Required deliverables before implementation

A later implementation packet must contain:

1. three landing low-fidelity wireframes;
2. three auth directions covering the complete state family;
3. mobile and desktop structure for each;
4. annotated mid-fidelity candidates;
5. at least three project-wide palette studies applied to identical screens;
6. contrast and color-vision checks;
7. owner selection with reasons;
8. a token migration map and list of local colors to remove;
9. implementation and rollback plan;
10. exact-head browser and physical-device evidence.

## 11. Traceability

| Research conclusion | Future implementation area |
|---|---|
| One project-wide semantic color owner | `src/app/document-theme.css` and compatibility aliases |
| Remove public green palette duplication | landing/auth CSS modules after selection |
| Wireframe before styling | design artifacts and active work packet |
| Auth includes recovery states | auth component, callback and browser tests |
| Preserve intended route | auth routing/callback behavior |
| Color is not the sole cue | transactions, charts, validation, badges and focus |
| Owner chooses palette and structure | PR visual review before merge |

## 12. Update protocol

For every new public-experience source:

1. add URL and access date;
2. state the question answered;
3. record what it establishes;
4. record its limits;
5. compare it with this document and the cumulative ledger;
6. add contradictions;
7. update decisions only when evidence or owner direction warrants it;
8. preserve rejected candidates as history.

This document remains concept-neutral. Detailed candidate visuals belong in work packets and design reviews.