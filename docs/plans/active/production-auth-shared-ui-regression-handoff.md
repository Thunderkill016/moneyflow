# MoneyFlow production auth + shared UI regression handoff

**Status:** active plan candidate
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Source branch:** `fix/auth-confirmation-ux`
**Baseline:** `main@ca23b1f74cf4b886072e81276f325d87672dcd08`
**Parent roadmap:** `docs/plans/active/moneyflow-trust-execution-roadmap.md`
**Product phase:** Secure acceptance, paused before S2 completion because live UI regressions were discovered
**Last updated:** 2026-08-10

## Outcome

Give the next implementer (Claude Opus is the intended handoff target) enough repository-backed context to fix the newly discovered production UI/auth regressions without rediscovering the conversation.

The immediate product goal is **not** to redesign MoneyFlow and **not** to continue governance work. It is:

1. repair the concrete auth/onboarding/shared-popup regressions observed on production;
2. audit the same shared owners so equivalent regressions are not left on adjacent desktop/mobile surfaces;
3. prove the fixes with source tests + browser evidence;
4. then resume MoneyFlow Trust Secure acceptance at S2 password recent-auth.

Do not merge this handoff branch merely because the document exists. Product-code implementation, verification and merge remain separate steps.

## Repository reconnaissance

### Current project / release truth

- `main` baseline for this handoff: `ca23b1f74cf4b886072e81276f325d87672dcd08` (merged PR #332, MoneyFlow Trust execution roadmap).
- Program sequence remains **Secure → Recover → Prove → Improve → Release**.
- Database migration/schema drift, audit ACL and production `delete-account` Edge v6 rollout were already aligned before this session.
- `delete-account` v6 remains the reviewed recent-auth authority; destructive deletion must **not** be used as acceptance proof.
- Open process/governance PR #331 is not on the product critical path and should not be mixed into this work.

### S1 production preflight already completed in the current acceptance session

Observed before the UI regressions were raised:

- current Git production baseline was the merged MoneyFlow Trust roadmap lineage;
- Vercel production deployment `dpl_6BdfXC6i98WaW1f9xWV39ByTAqdn` was `READY` and served the current `main` commit at that time;
- `mfvn.vercel.app/login` returned 200 and exposed both password and Google auth paths;
- unauthenticated `/settings/delete-account` returned to login with `next=/settings/delete-account`;
- Supabase project was healthy;
- `delete-account` remained v6 ACTIVE with `verify_jwt=true` and the previously reviewed bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`;
- pre-test Vercel/Supabase logs did not show a known P0/P1 cluster attributable to the pending acceptance flow.

These are **preflight observations**, not proof that S2/S3 recent-auth behavior passed.

### Password-account state discovered during acceptance

Initial provider read showed zero password credentials, so S2 could not be executed safely. The owner then attempted signup.

Observed sequence:

1. First signup attempt did not produce a new account/mail. Auth logs showed `user_repeated_signup`, indicating the chosen email already existed rather than a new password user being created.
2. Owner subsequently created a genuinely new email/password account.
3. Owner reported successful password login.
4. Confirmation email arrived.
5. Owner clicked the confirmation link and was redirected into the application without a separate second password entry.

This now provides a production password account suitable for later S2 acceptance, **after the UI regressions below are fixed**. Do not create financial records purely for acceptance.

### Email-confirmation behavior is not itself a password bypass

Current source:

- `src/app/(auth)/actions.ts::register` calls `supabase.auth.signUp(...)` with the entered password and `emailRedirectTo` pointing at `/auth/callback?...`.
- when confirmation is enabled and no immediate session exists, the form returns `Kiểm tra email để xác nhận tài khoản MoneyFlow.`;
- `src/app/auth/callback/route.ts` receives `code`, calls `supabase.auth.exchangeCodeForSession(code)`, then redirects to the requested safe `next` path.
- default registration `next` resolves to onboarding.

Provider logs in the live session showed the expected high-level sequence: confirmation mail → `/verify` click → callback code exchange → authenticated session. Exact timestamps should be re-read from provider logs before being used as final acceptance evidence; do not reuse chat timestamps as final proof.

Interpretation: with Supabase SSR/PKCE, the confirmation link can legitimately finish verification and the callback can exchange the auth code into a session. Do **not** “fix” this by forcing a second login unless the owner explicitly changes the product requirement. The real problem is that the post-confirmation destination currently renders badly and gives the user no clear explanation of what just happened.

### User-observed production regressions

The owner supplied screenshots during the live acceptance session. The images themselves are not stored in this repo; the observations below are the durable handoff.

#### BUG-A — password fields lack reveal/hide controls

Observed on auth screens:

- login/password entry has no show/hide password affordance;
- registration password entry has no show/hide affordance;
- the same component is reused for password update and deletion reauthentication, so those modes must be checked too.

Current source confirms `src/components/auth-form.tsx` renders a plain `<input type="password">` with no adjacent visibility button/state.

Risk: avoidable password-entry errors, particularly during destructive-action reauthentication and mobile entry.

#### BUG-B — registration has no confirm-password field

Observed on production registration.

Current source confirms:

- `src/components/auth-form.tsx` renders only one password field for `mode === "register"`;
- `src/app/(auth)/actions.ts` `registerSchema` accepts `fullName`, `email`, `password`, `privacyAccepted` only;
- no server-side confirmation match is enforced.

Required behavior: registration must collect a second password value and reject a mismatch before calling Supabase signup. Do not treat client-only equality checking as sufficient.

#### BUG-C — post-email-confirm onboarding is visibly unstyled / broken

Owner screenshot after clicking the signup confirmation link showed onboarding content rendered as a small/raw-looking block rather than the designed card/step UI.

**Root cause is strongly evidenced in source/history, not just hypothesized:**

- current `src/components/onboarding-flow.tsx` still renders global class names including `onboarding-page`, `onboarding-card`, `onboarding-brand`, `onboarding-progress-*`, `onboarding-step`, `onboarding-actions`, `onboarding-field`, etc.;
- current `src/app/globals.css` has no `.onboarding-page` owner and no corresponding onboarding block;
- historical `src/app/globals.css` before legacy retirement (for example commit `3da9c03782d4b35daad0292b4964748ed987edc7`) contained a full `/* Onboarding */` block for exactly these classes;
- UI Phase 10 retired legacy CSS aggressively; current markup still depends on this removed global owner.

This should be fixed by assigning onboarding to a current explicit owner (prefer a CSS Module/current primitive composition) rather than blindly restoring a large historical legacy stylesheet.

Also improve post-confirmation comprehension: the user should understand that the email was confirmed and a session was created, rather than believing the link bypassed authentication. A small, truthful success state/message is reasonable if it can be added without inventing a second auth flow.

#### BUG-D — desktop account/avatar dropdown is unstyled / broken

Owner screenshot showed the account popup/menu rendering as raw text/actions near the avatar rather than a proper surfaced dropdown. Visible items included account/settings/logout actions.

**Root cause is strongly evidenced:**

- `src/components/user-chip.tsx` uses the shared `DropdownMenu` wrapper and adds `className="profile-menu"`;
- `src/components/ui/dropdown-menu.tsx` emits global class names `ui-dropdown-content`, `ui-dropdown-label`, `ui-dropdown-item`, `ui-dropdown-separator`;
- current `src/app/globals.css` contains no `ui-dropdown-content` and no `profile-menu` CSS owner;
- historical globals before legacy retirement contained a complete `.ui-dropdown-content`, `.ui-dropdown-label`, `.ui-dropdown-item`, `.ui-dropdown-separator` styling family and dark-mode rules.

This is another concrete “live markup survived, global owner was retired” regression. Move the primitive/menu styling to a current explicit owner. Prefer fixing the shared dropdown primitive so every consumer benefits; do not patch only the one screenshot.

Relevant current files:

- `src/components/user-chip.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/app-shell.module.css`

Note: App Shell also has a mobile/right-side `MoreSheet` account section with `Cài đặt tài khoản` and `Đăng xuất`; verify both the desktop `UserChip` dropdown and mobile account/More sheet rather than assuming they are the same DOM path.

#### BUG-E — transaction amount input can become visually unreadable/invisible while typing

Owner screenshot of the `Thêm giao dịch` dialog showed the amount control with sign prefix and `₫` suffix but the entered number was not visibly readable. Owner also reports multiple popup issues on similar surfaces and mobile.

Current relevant path:

- `src/components/add-transaction-dialog.tsx`
- `src/components/transactions/transaction-form.module.css`
- `src/components/ui/text-field.tsx`
- `src/components/ui/dialog.tsx`

Current implementation details:

- amount is controlled React state and `onChange` applies `formatMoneyInput(...)`;
- `TextField` renders prefix + input + suffix inside `data-slot="text-field-control"`;
- the amount input receives local `styles.amountInput` which explicitly sets `color: var(--mf-text)`, money font, large font size, etc.;
- shared TextField also applies Tailwind utility classes including `text-foreground`;
- phone transaction dialog geometry is owned by `transaction-form.module.css` and was previously heavily audited in Phase 5.

**Do not assume the root cause yet.** The screenshot proves a visual failure, but source alone does not prove whether the cause is color, `-webkit-text-fill-color`, width/flex collapse, value formatting, selection state, clipping, theme variable resolution, cascade/specificity or another shared-field interaction.

The implementer must reproduce and measure:

- DOM input `value` after typing;
- computed `color`, `background-color`, `-webkit-text-fill-color`, `opacity`, `caret-color`;
- `clientWidth`, `scrollWidth`, bounding rect and flex/grid sizing;
- font size/line height/text indent/overflow;
- light + dark theme;
- desktop plus 320/360/390 CSS-pixel phone widths;
- expense and income mode;
- add, edit, transfer/split amount fields where they share the same owner.

Fix the actual owner, not the screenshot symptom.

#### BUG-F — possible wider shared popup/form regression class

Owner explicitly reports “nhiều vấn đề về popup này ở các phần tương tự và trên mobile nữa.” Treat this as a requirement to audit the shared layer, not permission to redesign every route.

High-signal audit targets:

- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/text-field.tsx`
- `src/components/ui/select-field.tsx`
- `src/components/ui/button.tsx`
- `src/components/layout/app-shell.tsx`
- transaction add/edit/transfer/split dialogs;
- account/profile dropdown and mobile More sheet;
- auth/register/login/reauth/update-password;
- onboarding after confirmation;
- any other **current** consumer that still emits global class names whose CSS owner was retired.

The main investigation question is whether UI Phase 10/legacy retirement left a systematic class-owner gap. Search live TSX/global-class emitters against current CSS ownership and compare only when necessary with historical pre-retirement CSS. Do not restore retired CSS wholesale.

## Research

### Official provider behavior applied to this handoff

Supabase official documentation confirms:

- SSR auth uses PKCE semantics for email/password confirmation;
- after successful verification, the app can receive an auth code and call `exchangeCodeForSession(code)` to establish a session;
- the PKCE code is short-lived and single-use;
- hosted email/password projects normally require email verification unless configured otherwise;
- `signUp` supports `emailRedirectTo`;
- default Supabase SMTP is best-effort/rate-limited and production should consider custom SMTP, but the current successful delivery proves this particular account did receive its confirmation mail.

Applied decision: confirmation-link → callback → session is allowed behavior. Focus this task on UI clarity and live regression repair, not on inventing a second password challenge after email verification.

### Historical repository evidence that matters

- Phase 3 App Shell (#300 / commit `75129a6a0f212c12b20763a5d44c2de268832423`) moved Capture/More to shared Sheet and local App Shell ownership.
- Phase 5 Transactions/Capture (#306 / commit `f6cea659030397e21d4287912faef173bc7a0966`) moved transaction dialogs to shared Dialog/field contracts and `transaction-form.module.css`, including phone bottom-sheet geometry.
- Phase 10 legacy retirement removed broad/global legacy presentation after browser evidence at that time.
- Current production evidence now proves at least onboarding and dropdown live-class owners were lost despite those migration checks. Treat this as a real regression in the migration result, not as a reason to reopen the entire archived redesign.

## Specification

### Goal

Restore a coherent current-owner UI for auth confirmation/onboarding and shared popup surfaces, with no financial-domain behavior changes and no provider/database changes.

### Acceptance criteria

- [ ] HANDOFF-AC1: login, register, update-password and deletion reauth password fields have accessible reveal/hide controls without changing submitted values or autocomplete semantics.
- [ ] HANDOFF-AC2: registration requires confirm password and server-side mismatch rejection occurs before Supabase signup.
- [ ] HANDOFF-AC3: successful email confirmation reaches a fully styled, usable onboarding experience and communicates the confirmation/session outcome clearly enough that it is not mistaken for an auth bypass.
- [ ] HANDOFF-AC4: desktop authenticated account dropdown has a current explicit style owner, correct placement/surface/focus/keyboard behavior, and logout remains functional.
- [ ] HANDOFF-AC5: mobile account/More sheet remains usable and is checked independently from the desktop dropdown path.
- [ ] HANDOFF-AC6: entered transaction amount is visibly readable and editable in add dialog at desktop and 320/360/390 widths in light/dark; computed evidence identifies the real fix.
- [ ] HANDOFF-AC7: edit/transfer/split and other directly shared popup/form consumers are sampled so the fix does not leave the same owner defect elsewhere.
- [ ] HANDOFF-AC8: no financial calculation, transaction payload, tenant ownership, RLS, database schema, Auth provider configuration or destructive-account behavior changes.
- [ ] HANDOFF-AC9: no historical legacy stylesheet is restored wholesale; each live surface has an explicit current owner.
- [ ] HANDOFF-AC10: browser regression coverage is added for the exact failures that escaped the prior UI migration checks.

### UX/accessibility expectations

- reveal-password button has an accessible name that changes with state; it must not submit the form;
- confirm-password mismatch attaches a clear field/form error and preserves password secrecy;
- menus/dialogs/sheets keep keyboard focus, Escape/dismiss semantics and touch targets;
- popup content must remain inside viewport and above mobile chrome/safe areas;
- financial values must remain complete, untruncated and readable;
- 200% text should not hide the primary action or amount value;
- do not claim physical-device acceptance from Playwright emulation.

### Scope boundaries

Allowed on branch/PR:

- React/CSS/current UI primitive fixes;
- focused tests and browser audit coverage;
- documentation/evidence for these findings.

Not authorized by this handoff:

- merge to `main`;
- production/provider/Auth config writes;
- database/schema/RLS/data writes;
- account deletion;
- broad UI redesign;
- bank sync/AI/product-feature expansion;
- changing recent-auth security semantics merely to simplify testing.

## Implementation plan

### T1 — reproduce before changing owners

1. Build/serve current branch from the exact baseline.
2. Reproduce onboarding after the closest safe local/test auth state possible; source-level missing owner is already proven, but visual before/after still matters.
3. Reproduce authenticated `UserChip` dropdown.
4. Reproduce transaction amount invisibility and record the computed measurements listed under BUG-E.
5. Audit at least one phone width and one desktop width before editing.

### T2 — fix current ownership, not historical layers

Likely first fixes:

- move onboarding presentation to a current CSS Module or equivalent explicit owner and replace raw global class dependencies;
- give `DropdownMenu` a self-contained current style owner (CSS Module or current utility composition) and remove dependence on retired `.ui-dropdown-*` globals;
- keep App Shell account actions composed from shared primitives;
- fix amount visibility only after reproduction identifies the failing property/cascade/geometry.

Do not paste the old onboarding/dropdown block back into `globals.css` as the final architecture unless evidence proves there is no safer current owner.

### T3 — auth UX hardening

- implement show/hide password for login/register/update/reauth;
- add registration confirm-password UI + server validation;
- preserve existing password length policy (12–72) and provider call shape;
- preserve enumeration-safe public signup errors;
- add a clear post-confirmation success affordance/copy only if it fits the existing callback/onboarding flow without provider changes.

### T4 — shared popup/mobile regression sweep

Inspect current consumers of Dialog/Sheet/DropdownMenu/TextField/SelectField and find any other live global class family with no CSS owner. Fix at shared owner when the behavior is truly shared; keep route-specific geometry local.

Minimum visual/browser sample:

- registration;
- email-confirm → onboarding;
- login + deletion reauth password field;
- desktop profile dropdown;
- mobile More/account sheet;
- add transaction amount;
- edit transaction;
- transfer/split representative amount surface;
- 320, 390 and desktop; light/dark where signed-in theme applies;
- keyboard focus/Escape for popup surfaces;
- 200% text on the highest-risk dialog/onboarding surface.

### T5 — regression gates

Add/extend deterministic coverage so this exact class of failure cannot silently return:

- source test: onboarding markup cannot depend on an unowned global `onboarding-*` family;
- source/browser test: shared DropdownMenu must carry a current style owner and render surfaced content/items;
- browser assertion: typed amount value has non-empty visible text and non-zero usable input width after typing, not merely that the dialog exists;
- retain existing dialog phone geometry/focus tests;
- if a reusable “global class emitted but no stylesheet owner” check can be made low-false-positive, consider it; do not create a large new framework just for this task.

Run the repository-selected static/unit/build/browser matrix plus CodeQL/secret checks required by the PR classifier. Treat physical-device evidence separately.

### T6 — return to MoneyFlow Trust Secure

Only after the UI regressions above are merged/deployed and production-read back:

1. resume S2 password recent-auth with the newly created production password test account;
2. do not enter financial data solely for the test;
3. do not submit final deletion;
4. then run S3 Google/OAuth continuity and S4 post-flow logs.

## Evaluation

### What is proven now

- onboarding has live `onboarding-*` markup and no current global CSS owner;
- shared dropdown emits `ui-dropdown-*` classes and authenticated UserChip adds `profile-menu`, while current globals do not own those families;
- historical CSS proves both families previously had presentation rules before legacy retirement;
- production screenshots match the expected symptoms of those missing owners;
- registration source has no confirm password and password fields have no reveal control;
- production password signup/login/confirmation succeeded for a new test account;
- callback auto-session is consistent with current source and Supabase PKCE behavior.

### What is not proven yet

- exact root cause of typed amount invisibility;
- full inventory of all popup surfaces affected by the same class-owner regression;
- physical mobile behavior;
- S2/S3 recent-auth acceptance;
- final post-fix production behavior.

Do not convert these unknowns into assumptions.

### Stop conditions

- a proposed CSS fix changes financial/domain behavior: stop and separate it;
- a fix requires provider/Auth/DB write: stop for explicit owner approval;
- a “quick fix” is restoring a large retired legacy layer without proving current ownership: stop and localize the owner instead;
- transaction value remains present in state but still not visibly measurable after the proposed fix: keep debugging, do not mark pass;
- browser emulation passes but owner still sees a physical/mobile defect: treat the owner observation as new evidence and reproduce at the closest supported viewport/device before claiming closure.

## Opus handoff prompt

Use this after checking out the branch/repo:

> Read `AGENTS.md`, `docs/research/CURRENT_PROJECT_MEMORY.md`, `docs/context/README.md`, `docs/plans/active/moneyflow-trust-execution-roadmap.md`, and this file in full. Then inspect the current source and git history cited here before editing. The owner discovered real production regressions during MoneyFlow Trust Secure acceptance: unstyled post-email-confirm onboarding, unstyled account/avatar dropdown/logout menu, missing password reveal controls, missing registration confirm-password, and a transaction amount value that becomes visually unreadable/invisible in a popup; the owner also reports similar popup/mobile problems. Do not redesign MoneyFlow and do not reopen the archived UI migration broadly. Find the current owner for each live surface, verify whether Phase 10 retired CSS still needed by live markup, fix shared owners instead of one-off screenshots, and reproduce the transaction amount issue with computed-style/geometry evidence before changing it. Add regression tests/browser coverage at 320/390/desktop plus relevant light/dark/keyboard/text-zoom states. Preserve financial invariants and current Supabase PKCE semantics. Do not merge, change provider/Auth/DB state, touch production data, or delete an account. Return an exact diff/evidence summary and remaining risks for owner review.

## Delivery record

- Handoff branch: `fix/auth-confirmation-ux`
- Base: `ca23b1f74cf4b886072e81276f325d87672dcd08`
- Runtime code changed by this handoff document: none
- Provider/production writes by this handoff document: none
- Intended next implementer: Claude Opus
- Next action: Opus reads this packet + current repo, reproduces the shared UI regressions, implements bounded fixes, and opens/updates a PR for review.
