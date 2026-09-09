# MoneyFlow design/UI failure postmortem — 2026 redesign baseline

**Scope:** evidence for Issue #559 / PR #560. This is a redesign input, not executable UI authority.

## Purpose

The next MoneyFlow redesign must learn from merged runtime, test and CSS failures rather than starting from visual taste. The unit of analysis is:

`Symptom -> root cause -> why existing process missed it -> cost -> repair -> permanent prevention`.

Code/tests and merged behavior outrank retrospective prose.

## Verified failure classes

### F1 — Presentation ownership was one-directional

**Evidence:** PR #337.

**Symptom**

`/onboarding` could ship as effectively unstyled HTML even while existing CSS gates were green. Product code emitted literal presentation classes for which no active stylesheet produced an applicable owner.

**Root cause**

Existing checks proved variants of CSS→code reachability/cascade rules, but did not prove the reverse direction: every class emitted by product code had an applicable runtime owner. An early ownership implementation also flattened selector context, allowing a class nested under an unrelated ancestor to falsely certify emissions elsewhere.

**Why missed**

- Static checks asserted different claims and were treated as if one implied another.
- Ownership was initially reduced to a set of class tokens, losing selector context.
- Development build artifacts could contaminate bundle scans.

**Cost**

A dedicated code→CSS gate, baseline/debt model and onboarding migration had to be built after the fact. Correct selector-context reasoning revealed 88 violations that flattened ownership had hidden.

**Repair**

- production-bundle ownership inspection;
- selector-context-aware owner classification;
- shrink-only approved-history baseline;
- CSS-module local classes no longer certify unrelated literal classes;
- onboarding received an explicit presentation owner.

**Permanent prevention**

- keep code→CSS ownership as a redesign gate;
- ownership debt cannot grow;
- route/component migration must state its presentation owner;
- never certify ownership from a dev bundle or token-only scan.

---

### F2 — Design tokens existed in source but not in runtime CSS

**Evidence:** PRs #337 and #339.

**Symptom**

Shared primitives emitted semantic utilities such as `bg-background`, `text-foreground` and `border-border`, but the production bundle generated no corresponding CSS. Dark mode therefore did not actually resolve on affected primitives.

**Root cause**

The semantic Tailwind theme registration was placed where Tailwind did not process it. Source-level custom properties and JSX class names were mistaken for runtime utility availability.

**Why missed**

- source inspection stopped before compiled output;
- semantic tokens and utility generation were mentally conflated;
- visual state was not measured via computed style.

**Cost**

A separate theme-bridge repair was required after the ownership work.

**Repair**

Register the semantic bridge in the stylesheet that owns Tailwind processing and verify generated declarations plus computed browser styles in light/dark modes.

**Permanent prevention**

Every shared semantic-token change must prove:

`source token -> production build -> generated CSS -> computed style -> representative rendered consumers`.

A token that exists only in source is not a usable design token.

---

### F3 — Fixing a token layer exposed a cascade/contrast regression

**Evidence:** PR #339.

**Symptom**

Once semantic utilities actually began generating, unlayered `button { color: inherit }` and `a { color: inherit }` rules outranked layered Tailwind utilities. The theme bridge alone would have produced primary-button contrast around 2–3:1 in measured states.

**Root cause**

Shared global resets had stronger cascade precedence than the newly effective utility layer.

**Why missed**

The conflict was latent while the intended utilities were no-ops. Fixing one layer changed the effective cascade graph.

**Cost**

The bounded theme repair had to expand to include cascade-layer repair and browser-level contrast measurement.

**Repair**

Layer/reset ownership was corrected and real primary controls were measured, yielding final contrast ratios above 4.5:1 in the probed light/dark states.

**Permanent prevention**

- token/primitive changes require blast-radius tests on representative consumers;
- cascade precedence is part of design-system authority;
- contrast claims come from measured effective colors, not token names;
- shared resets may not silently outrank component/utility intent.

---

### F4 — “Authenticated” browser tests were actually demo tests

**Evidence:** PR #336.

**Symptom**

Several surfaces read the wrong state source while a fully green suite included specs named as authenticated behavior.

**Root cause**

Both Playwright configs pinned `NEXT_PUBLIC_APP_MODE=demo` in `webServer.env`, overriding authenticated mode set by CI. A spec name did not imply runtime mode.

**Why missed**

- environment ownership was implicit;
- tests did not assert the application mode they claimed to prove;
- demo browser storage behavior was valid inside demo, masking authenticated ownership bugs.

**Cost**

A strict authenticated harness had to be introduced before the affected bugs could be reliably demonstrated and repaired.

**Repair**

A distinct authenticated browser configuration/harness was added with strict failures for unsupported calls and negative session behavior.

**Permanent prevention**

- every mode-specific suite asserts mode/environment explicitly;
- redesign acceptance matrix includes `demo × authenticated` rather than using one as proxy for the other;
- mocks/doubles fail closed on unsupported requests;
- browser evidence and database/RLS evidence remain separate claims.

---

### F5 — UI audit can catch failures implementation review misses

**Evidence:** PR #340.

**Symptom**

A newly added password-reveal control was 40px high and failed the repository's 44×44 touch-target contract.

**Root cause**

The control was functionally and semantically correct but its physical interaction geometry was undersized.

**Why missed**

Implementation review focused on behavior, form safety and accessibility naming before measured target geometry.

**Cost**

Rework after the control was implemented.

**Repair**

Increase the target and re-run the UI audit.

**Permanent prevention**

- WCAG 2.2 AA 24px target size is the floor;
- MoneyFlow should prefer >=44px for primary/mobile controls where practical;
- target geometry belongs in primitive contracts, not repeated route CSS;
- shared controls require automated viewport checks.

---

### F6 — Legacy presentation retirement was expensive because ownership survived migration

**Evidence:** PR #319.

**Symptom**

Phase 10 required a 36-file legacy-retirement slice after earlier UI migration phases. Responsibilities had to be reassigned from migrated global/legacy presentation to current route/component owners.

**Root cause**

Migration and retirement were separated enough that compatibility/global presentation survived after new owners existed.

**Why missed**

Phase completion could be judged on migrated surfaces while legacy authority remained as a parallel presentation system.

**Cost**

A dedicated broad retirement PR and replay/rebase work was required.

**Repair**

Retire migrated legacy layers, reassign direct owners, remove `!important` debt and leave only the intentional remaining foundation boundary.

**Permanent prevention**

Each future redesign slice must use **replace-and-retire**: the new owner and deletion/retirement of the replaced owner land together where feasible. A compatibility layer needs an explicit retirement condition in the same packet.

---

---

### F7 — AppShell first-paint geometry and SSR hydration gap

**Evidence:** PR #321.

**Symptom**

On mobile viewports, the AppShell bottom navigation and content clearance geometry did not exist on server-rendered first paint. Content rendered underneath the bottom navigation bar or caused visible layout shifts (CLS) and click mis-targets upon client-side hydration.

**Root cause**

Mobile layout clearance and safe-area geometry were managed dynamically through client-side React component state rather than static SSR-safe layout styles in `app-shell.module.css`.

**Why missed**

Tests evaluated components in hydrated DOM states without inspecting initial SSR HTML and first-paint computed bounding boxes.

**Cost**

Required high-priority hotfix and dedicated contract test (`src/lib/app-shell-phase3-contract.test.ts`) locking first-paint App Shell geometry ownership before client hydration.

**Repair**

Static reservation of mobile shell geometry in `app-shell.module.css` ensuring zero layout jump between SSR first paint and client hydration.

**Permanent prevention**

- Layout and safe-area clearance must be owned by static CSS, never injected via runtime hydration scripts;
- Separate tests for first-paint geometry vs mounted behavior.

---

### F8 — Asynchronous demo ledger mutation race

**Evidence:** PR #321.

**Symptom**

Transactions added or modified in demo mode could disappear if the user immediately reloaded or navigated away, causing perceived data loss and broken test workflows.

**Root cause**

The mutation handler signaled UI completion and closed dialogs before the asynchronous persistence write to `localStorage` completed.

**Why missed**

Standard E2E tests waited for the dialog to disappear or read React state, which updated immediately, rather than forcing rapid navigation or checking storage synchronization before navigation.

**Cost**

Required `use-transactions.ts` refactoring and `demo-transaction-persistence-contract.test.ts` to enforce synchronous persistence before UI success acknowledgment.

**Repair**

Synchronous persistence to browser storage prior to resolving the mutation promise and updating UI state.

**Permanent prevention**

- Mutations must guarantee durable persistence before emitting UI success signals;
- Storage reconciliation contracts must test immediate reload resilience.

---

### F9 — Mobile primary action hijacking across routes

**Evidence:** PR #336.

**Symptom**

On six distinct routes (including `/accounts/[accountId]/reconcile`), the prominent center mobile navigation tab (labeled "Ghi") was hijacked by route-specific contextual actions (such as "Bắt đầu đối soát" / "Hoàn tất đối soát"). When the contextual action was disabled, the entire mobile capture entry point became disabled and mislabeled, locking users out of primary ledger entry.

**Root cause**

The AppShell permitted route components to override the global floating action / navigation slot without enforcing slot independence or fallback semantics.

**Why missed**

Route tests checked only the local route workflow without testing whether global navigation remained accessible during disabled route states.

**Cost**

Users could not record ad-hoc transactions while inside specific workflows. Required architectural separation of top-bar route actions from mobile bottom-bar capture actions.

**Repair**

Route-specific primary actions moved to the top bar via `showPrimaryActionOnMobile`, while the center mobile tab was permanently restored to the global ledger capture CTA.

**Permanent prevention**

- Global navigation anchors must never be repurposed or disabled by local route states;
- Shell IA contracts must enforce invariant navigation slots across all viewports.

---

### F10 — Brand & design authority fragmentation across iterations

**Evidence:** Historical PRs, `docs/design/DESIGN_DIRECTION_STATUS.md`, `docs/design/SIGNAL_LEDGER_V3.md`.

**Symptom**

The product suffered from competing aesthetic iterations (Signal Ledger v3, Fresh Blue, Neon Blue, experimental palettes) where documentation, tokens, and stylesheets disagreed. `Signal Ledger v3` introduced complex visual hierarchies that were later formally rejected, leaving orphan tokens and contradictory guidance in repository archives.

**Root cause**

Visual design iterations were explored directly in code and ad-hoc global CSS files before the product identity, financial semantics, and design system authority were frozen and approved by the owner.

**Why missed**

No formal design authority registry existed prior to `docs/design/DESIGN_DIRECTION_STATUS.md` and `docs/design/CURRENT_DESIGN_SYSTEM.md`.

**Cost**

Multiple redesign/refactor cycles, cognitive fatigue, and thousands of lines of wasted code that later had to be excised in PR #319.

**Repair**

Formal declaration of `DESIGN_DIRECTION_STATUS.md` recording owner decisions, explicit rejection of `Signal Ledger v3`, and restriction of active global stylesheets to exactly two files (`legacy.css` and `document-theme.css`).

**Permanent prevention**

- Three distinct visual territory briefs must be formally presented and approved by the owner before any runtime UI implementation begins;
- A single token authority (`document-theme.css`) with zero raw hex color declarations in component CSS.

---

## Retrospective on UI Migration Sequence (P0–P11)

The P0–P11 migration sequence represented an intensive engineering effort to modernize MoneyFlow's interface:
- **P0–P1**: CSS foundation & token setup (established baseline variables, but lacked code→CSS ownership).
- **P2**: Primitive component baseline (Button, Input, Dialog, etc.).
- **P3**: App Shell & navigation stabilization.
- **P4**: Dashboard / Overview unification.
- **P5**: Transactions ledger & capture modal.
- **P6**: Accounts workspace & transfer modal.
- **P7**: Planning workspace (Budgets, Commitments, Goals).
- **P8**: Secondary & safety routes (Reports, Categories, Inbox, Rules, Settings, Timeline).
- **P9**: Public routes & authentication shell (light-only isolation).
- **P10**: Legacy presentation retirement (PR #319 — deleted 9,660 lines of accumulated global CSS).
- **P11**: Final acceptance & physical-device boundary (PR #321, PR #322 — closed with explicit device limitations).

**Key Takeaway from P0–P11:**
Attempting to redesign piecemeal without a strict code→CSS ownership gate and without immediate retirement of old stylesheets resulted in compounding technical debt. Phase 10 was forced to perform massive deletions because earlier phases added new styles alongside old ones rather than replacing them in-place.

---

## Cross-cutting diagnosis

The recurring problem was not primarily visual quality. It was a mismatch between **design intent and executable presentation truth**:

- class name ≠ owned style;
- token ≠ generated utility;
- generated utility ≠ winning cascade;
- screenshot ≠ interaction correctness;
- test name ≠ runtime mode;
- migrated screen ≠ retired legacy authority;
- exploratory mock ≠ approved brand authority.

Therefore the redesign's core architecture must make the full presentation chain observable, enforceable, and testable.

## Design-redesign guardrails derived from the postmortem

1. **One presentation authority chain:** product/brand semantics → tokens → primitives → finance patterns → routes → production CSS → computed styles.
2. **No source-only acceptance:** semantic styling must be proven in production output and browser computation.
3. **Mode truth is explicit:** demo/authenticated suites assert their own runtime contract.
4. **Primitive blast radius:** Button/Input/Dialog/Sheet/Table/List/navigation changes test representative route consumers.
5. **Replace and retire:** migrated slices remove the authority they replace rather than stacking another compatibility layer.
6. **First failure matters:** retry-pass is recorded as flakiness/finding, not clean evidence.
7. **Physical interaction is measured:** focus visibility, target size, overflow, SSR first-paint geometry, and synchronous persistence are acceptance criteria.
8. **Financial meaning is multi-channel:** never color-only.
9. **No new root override sheet:** fix the owner instead.
10. **Debt direction is one-way:** presentation-ownership and `!important` debt may shrink, not grow.
11. **Navigation slots are immutable:** route actions must never disable or hijack the global capture anchor.
12. **Owner identity approval before code:** no runtime screen redesign without an approved visual territory brief.

