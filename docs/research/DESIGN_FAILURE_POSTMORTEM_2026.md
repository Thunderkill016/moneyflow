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

## Cross-cutting diagnosis

The recurring problem was not primarily visual quality. It was a mismatch between **design intent and executable presentation truth**:

- class name ≠ owned style;
- token ≠ generated utility;
- generated utility ≠ winning cascade;
- screenshot ≠ interaction correctness;
- test name ≠ runtime mode;
- migrated screen ≠ retired legacy authority.

Therefore the redesign's core architecture must make the full presentation chain observable and testable.

## Design-redesign guardrails derived from the postmortem

1. **One presentation authority chain:** product/brand semantics → tokens → primitives → finance patterns → routes → production CSS → computed styles.
2. **No source-only acceptance:** semantic styling must be proven in production output and browser computation.
3. **Mode truth is explicit:** demo/authenticated suites assert their own runtime contract.
4. **Primitive blast radius:** Button/Input/Dialog/Sheet/Table/List/navigation changes test representative route consumers.
5. **Replace and retire:** migrated slices remove the authority they replace rather than stacking another compatibility layer.
6. **First failure matters:** retry-pass is recorded as flakiness/finding, not clean evidence.
7. **Physical interaction is measured:** focus visibility, target size, overflow and first-paint behavior are acceptance criteria.
8. **Financial meaning is multi-channel:** never color-only.
9. **No new root override sheet:** fix the owner instead.
10. **Debt direction is one-way:** presentation-ownership and `!important` debt may shrink, not grow.

## Remaining forensic work before this postmortem is complete

The full redesign foundation still needs direct review of PRs #321 and #322 plus the complete P0–P11 migration sequence and current source/test ownership. Known brand-authority conflicts must be reconstructed from merged authority/code rather than inherited from chat summaries. Those findings should extend this document before #559 foundation exits.
