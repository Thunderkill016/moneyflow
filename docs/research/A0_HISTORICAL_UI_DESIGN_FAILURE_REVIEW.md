# A0 — Historical UI / Design Failure Review

**Status:** active retrospective input — not a design direction or implementation plan
**Baseline reviewed:** `main@c248176b6ab60b8acf331b5f6e9a2c7908f724ac` (`#363` merged)
**Scope:** repository-primary historical evidence and current executable ownership
guards only
**Authority:** A0 is governed by
`docs/plans/active/a0-historical-ui-design-failure-review.md`; current product and
execution authority remain the active Trust packet, current memory, product
principles, executable code and tests. This review does not replace any of them.

## Executive conclusion

MoneyFlow's expensive UI rework did not arise from one aesthetic mistake. It arose
when a decision, its executable presentation owner, its compiled CSS, its real route
and its acceptance evidence could drift independently. The historical programme did
add useful protections, but repeated failures show that a source-level or normal-height
browser pass is not enough to establish the rendered, authenticated, first-use or
physical-phone result.

The v3 rule is therefore a traceable chain, not a preference for a particular visual
style:

```text
owner-approved product/brand decision
  -> semantic/runtime token or explicit non-token rationale
  -> primitive and component owner
  -> route and runtime mode
  -> compiled CSS/computed-style evidence
  -> interaction evidence at representative normal and constrained viewports
  -> independent evaluation and owner decision
```

This is a requirement for later A-to-J packets. A0 neither picks a palette nor changes
tokens, components, CSS, routes or Design Harness V2.

## Historical failure matrix

| Failure | Observed symptom and root cause | Evidence and why old verification missed it | Lesson and mandatory v3 guard | Reusable / retire or replace later |
|---|---|---|---|---|
| A. Presentation ownership lagged intent | Semantic classes and named UI surfaces existed without an unconditional presentation owner; a rendered box could be accessible yet visually raw. | The Phase 0 baseline recorded two invisible presentation contracts despite passing Chromium/WebKit evidence (`docs/plans/completed/2026-08-08-ui-phase-0-baseline.md`). PR #337 found that dead-CSS and cascade checks asked CSS-to-code/cascade questions, not emitted-code-to-CSS ownership (`docs/research/pr-memory/2026/Q3/PR-337.md`). | Every changed semantic class must have one provable owner in the production bundle; a component/route contract cannot substitute for it. Audit the ownership baseline as shrink-only, with contextual selectors treated as unproven. | Reuse `check:code-css-ownership`, `check:dead-css`, `check:css-ownership` and the ownership baseline. Retire unowned class debt only in the slice that gives it an owner. |
| B. Source tokens did not prove runtime CSS | A Tailwind v4 `@theme inline` bridge was placed in a file the Tailwind pipeline did not process, so source appeared correct while no semantic utilities were emitted. | PR #339 measured a clean production bundle with no generated semantic utility or `--color-background`; its first candidate was a no-op (`docs/research/pr-memory/2026/Q3/PR-339.md`). Source inspection and a hand-built CSS interpretation would have certified the wrong thing. | A token/primitives change requires production-bundle ownership evidence and selected computed-style evidence in light/dark; source text, a PostCSS approximation or a dev bundle does not satisfy it. | Reuse the real-bundle ownership index and current semantic token chain. Retire any later duplicated/pseudo-runtime token bridge in the owning migration. |
| C. Shared fixes changed cascade behaviour elsewhere | Registering utilities made them exist, but unlayered element resets outranked utility text colors and produced contrast regression risk outside the edited primitive. | PR #339 measured primary-button contrast at 2.99:1/2.05:1 with the bridge alone and traced the cause to `@layer utilities` losing to unlayered rules (`docs/research/pr-memory/2026/Q3/PR-339.md`). A generated declaration was insufficient evidence of rendered usability. | Shared token, reset or primitive changes must identify cascade layers and affected consumers, then verify computed style/contrast plus representative interactions in both themes. The guard is consumer-aware, not only primitive-local. | Reuse layered ownership checks, contrast/computed-style measurement and primitive contracts. Replace legacy reset exceptions only with a named owner and affected-consumer audit. |
| D. Acceptance evidence used the wrong runtime mode | A demo path could bypass the authenticated surface whose account menu, portal/focus and user data behaviour were the acceptance target. | The shared dropdown was unreachable in demo suites because `UserChip` rendered a plain chip for a demo viewer (`docs/plans/archived/auth-shared-ui-regressions.md`). PR #340 consequently used the authenticated harness/loopback double and states its limitation explicitly (`docs/research/pr-memory/2026/Q3/PR-340.md`). | Every acceptance scenario declares its runtime mode and identity/data boundary. Demo evidence may support demo behaviour but cannot close an authenticated route, shell, overlay or persistence criterion. | Reuse explicit-demo build, authenticated harness and the existing mode-bound E2E conventions. Retire ambiguous “browser pass” wording from later packets. |
| E. Retry and screenshots hid temporal defects | Initial rendering and persistence order failed before a later retry stabilized the shell/demo state, so a final screenshot or repeat pass hid the first-use defect. | Phase 11 explicitly investigated raw retry evidence and repaired AppShell first-paint reserve ownership plus demo transaction persistence ordering (`docs/plans/completed/2026-08-08-ui-phase-11-final-acceptance.md`). | Changed route/shell evidence must state readiness criteria and preserve first-visit/first-paint assertions where loading, reserve or persistence is involved. A settled screenshot and a retry pass are supplementary evidence, never a replacement. | Reuse P11's raw-retry investigation method and existing readiness/route audit helpers. Retire a screenshot-only acceptance claim for stateful flows. |
| F. Normal/full-page evidence missed constrained mobile overlays | The real mobile More sheet could not scroll to `Đăng xuất`: multiple competing height declarations, a viewport-sized inner scroll box, dynamic viewport resizing and misplaced safe-area padding broke a coherent scroll path. | Owner hardware reported PP-12 fail; #357 first changed the primitive but missed higher-specificity consumer overrides, leaving tests green (`docs/research/pr-memory/2026/Q3/PR-357.md`). #358 then gave the sheet one height owner and tested final-action reachability at 390×844 and 390×568 (`docs/research/pr-memory/2026/Q3/PR-358.md`). The accepted P3 packet records the complete causal chain and owner same-phone pass (`docs/plans/completed/2026-08-12-moneyflow-trust-prove.md`). | Dialog/sheet changes require normal and short-height phone interaction evidence, including the final action, keyboard/resized viewport, safe-area edge and every consumer override. There must be one scroll owner and one height owner. Full-page capture or DOM presence cannot prove reachability. A popover needs this regime only when it shares the same height/scroll/viewport mechanism. | Reuse shared Dialog/Sheet grid, PP-12 regression coverage, safe-area/viewport contracts and the physical-device boundary. Replace competing route utilities/consumer geometry only in their owning slice. |
| G. Legacy presentation stayed live beside new layers | Multiple global imports, `!important`, document-selector exceptions and compatibility layers allowed a new presentation to stack over old cascade behaviour instead of replacing it. | Phase 0 measured seven legacy imports and 1,112 `!important`; Phase 1 added no-new-debt gates; Phase 10 reached one intentional foundation import, zero `!important` and zero unauthorized document selectors (`docs/plans/completed/2026-08-08-ui-phase-0-baseline.md`, `...ui-phase-1-guardrails.md`, `...ui-phase-10-legacy-retirement.md`). | Each v3 slice must name its current owner, legacy owner, migration boundary and deletion proof before adding presentation. No new root refresh/override sheet or unreviewed `!important`; removal occurs only after route/bundle evidence. | Reuse diff-based no-new-debt guardrails and `legacy.css` compatibility boundary. Live legacy is replace-and-retire work, never a blank check to stack a new layer. |
| H. A named brand direction was mistaken for structural progress | Earlier directions could change colour/style before information architecture, task evidence and product constraints were settled, creating churn without proving a user-flow improvement. | The research ledger explicitly classifies Calm Ledger and Signal Ledger as historical/rejected, says no named visual concept is default, and keeps the next full-product direction open (`docs/research/UI_UX_RESEARCH_LEDGER.md`). Historical public-design work also records that a screenshot-heavy hero weakened evidence readability at 320–390px (`docs/plans/archived/moneyflow-web-design-program.md`). | A brand decision must follow current-reality and product-experience evidence, record the user/job failure it solves, and be owner-selected before a token rollout. Aesthetic direction alone cannot close functional, mobile or financial-semantics criteria. | Reuse concept-neutral research, product principles and only task-relevant historical patterns. Do not promote Calm Ledger, Signal Ledger, old screenshots or an unmerged concept as v3 authority. |
| I. Multiple document, token and runtime authorities drifted | Historical docs, generated candidates, old branches and token claims could conflict with current product truth and executable owners. | The research ledger records explicit conflicts and a source hierarchy; the current design index places current code/tests and owner decisions over historical concepts (`docs/research/UI_UX_RESEARCH_LEDGER.md`, `docs/design/CURRENT_DESIGN_SYSTEM.md`). #357 also found a seven-day withdrawal would be cosmetic if a higher-precedence product principle remained unchanged (`docs/research/pr-memory/2026/Q3/PR-357.md`). | Every A-to-J packet must publish one authority map: current decision, executable owner, historical inputs and superseded material. A change that alters a cross-document contract must reconcile every higher-precedence authority or remain unaccepted. | Reuse current-memory routing, active-packet registry and executable ownership boundaries. Retire stale “current” claims during the owning authority reconciliation, not by deleting historical provenance. |

## Failure mechanisms in detail

### Ownership is a chain, not a class name

The historic UI migration had to add the missing inverse question: code emitting a
class does not establish that the deployed CSS can style it. Conversely, CSS selector
reachability does not prove that an emitted class has an unconditional owner. The
current three gates intentionally answer separate questions in
`scripts/check-code-css-ownership.mjs`: code-to-CSS ownership,
`scripts/check-dead-css.mjs`: CSS-to-code reachability, and
`scripts/check-css-ownership.mjs`: cascade/global-owner boundaries. Future work must
not collapse their results into “CSS passed.”

The runtime bridge failure reinforces the boundary: source variables, aliases and a
valid-looking `@theme` block remain hypotheses until the actual production pipeline
emits the expected selectors and a browser computes the intended value. The cascade
finding adds a second condition: an emitted selector may exist yet still lose to a
more powerful rule.

### The P3 findings are related evidence, not one reopened defect

The accepted P3 record separates four findings and must remain read that way.
PP-03 was a transient optimistic/confirmed-row double count, not a presentation or
overlay defect; it is closed unless a later change regresses it. PP-07 is functionally
passed, while its phone-toast presentation finding remains parked for future product
experience work. PP-16 rejected fraction tails after a separator could silently change
a money amount; #357 further found a consumer-specific digit-strip that its
single-owner source-string test had missed. It corroborates the requirement to sweep
all behaviour consumers rather than checking the file an author had in mind. Only
PP-12 establishes the Dialog/Sheet mobile-geometry guard in this review. These
distinctions come from the P3 remediation table and bounded-retest status in
`docs/plans/completed/2026-08-12-moneyflow-trust-prove.md` and the PP-12/PP-16
provenance in `docs/research/pr-memory/2026/Q3/PR-357.md`; A0 does not reopen any of
them.

### Evidence must match the behaviour it claims

The historical evidence shows three different mode/time limitations:

1. Demo cannot prove an authenticated shell/identity interaction.
2. A settled screenshot cannot prove first-paint, readiness or persistence ordering.
3. An emulated normal-height viewport cannot prove short-height, keyboard, browser
   chrome, safe-area or physical-device behaviour.

The P3 record is deliberately precise: automation supported PP-12 remediation, but
the final same-phone result is owner-observed rather than a fabricated signed device
artifact. That distinction remains mandatory for later visual QA.

### Overlay geometry is a shared-system concern

PP-12 is not evidence for a route-specific logout treatment. The cause crossed App
Shell, More sheet, Dialog grid, consumer CSS specificity, scroll containment,
safe-area placement and keyboard viewport handling. The durable rule is to trace one
height owner, one scroll owner and the final action through every consuming overlay.
`src/lib/p3-remediation.test.ts` preserves the source contracts; browser/physical
evidence is still required for actual reachability.

## What remains reusable

| Classification | Reusable input or mechanism | Boundary for later work |
|---|---|---|
| Reusable input | product principles, current runtime, current UI research ledger and current design index | constrain later decisions; do not select a new visual direction by themselves |
| Reusable executable guard | code-to-CSS ownership, dead-CSS reachability, cascade ownership, UI primitive contracts and PP-12 remediation contracts | extend only under an approved implementation packet; preserve their distinct claims |
| Reusable evidence method | production-bundle inspection, computed-style/contrast checks, authenticated harness, first-use/retry investigation, short-height overlay interaction and owner physical evidence | bind each artifact to route, mode, viewport and Git SHA |
| Historical evidence only | completed UI phases, #337/#339/#340/#357/#358 provenance, rejected/archived design programmes | use to explain a named mechanism; never treat a dated PR status or concept as current truth |
| Historical disposition, not a merge queue | `docs/research/UI_OPEN_WORK_DISPOSITION_2026-08-05.md`: #170/#171 scanner and measured-failure techniques may be ported, but their stale branches must not be merged wholesale; #293/#292 remain outside runtime/design authority | port only a verified technique into its owning current-main slice; do not call a candidate superseded until its replacement exists |
| Live legacy requiring later replace-and-retire | current compatibility boundary and any verified remaining ownership-baseline debt | identify an owner and deletion proof before replacement; do not stack a new global generation |
| Candidate future authority | a later owner-selected Brand/Product Experience decision and its approved packet | none exists at A0; a candidate cannot be used as an implementation baseline |

## What must not become v3 authority

- Calm Ledger, Signal Ledger, Inbox-first, old palette rules, old navigation claims,
  screenshots and unmerged/design-tool output.
- A passing demo, screenshot, static source assertion, full-page capture, normal-height
  viewport, or pre-fix retry as a universal UI acceptance claim.
- `legacy.css` or a global compatibility exception as a place to add the next visual
  system.
- A subjective evaluator score as proof of financial semantics, accessibility,
  authenticated behaviour or physical-device usability.

## Mandatory guardrails for A-to-J

These are requirements, not A0 implementation tasks.

1. **Authority map before change.** Each packet lists the owner-approved decision,
   current executable owners, historical inputs, candidates and material explicitly
   superseded. It may not introduce a second active token/brand authority.
2. **Traceable presentation chain.** A design decision maps to semantic/runtime token
   (or documented non-token rationale), primitive, component owner, route and
   generated production CSS. New emitted semantic classes have an unconditional
   production owner; debt baselines only shrink with proof.
3. **Cascade and consumer audit.** A shared token, reset or primitive edit identifies
   layer/specificity risks and all affected consumer families. It uses bundle plus
   computed-style/contrast evidence in relevant light/dark states; a primitive-only
   source assertion is insufficient.
4. **Mode-bound acceptance.** Each browser artifact records route, runtime mode,
   identity/data harness, viewport, interaction, Git SHA and readiness condition.
   Demo evidence cannot close authenticated acceptance.
5. **First-use evidence.** When a route has loading, reserve, persistence or async
   behaviour, test the first visit/first paint and record any retry separately. A
   stable final screenshot does not erase an initial failure.
6. **Constrained overlay evidence.** Every changed dialog/sheet family—and a popover
   only when it shares the same height/scroll/viewport mechanism—is tested at a
   representative normal phone and short-height phone. Assert the last required action
   is visible, hit-testable and actionable with keyboard/resized viewport, safe-area
   and consumer overrides considered. One height owner and one scroll owner must be
   demonstrable where that shared mechanism applies.
7. **Replace-and-retire.** New presentation may not be added as another root/global
   refresh layer. The owning slice declares what legacy owner remains, the route
   evidence needed, and when deletion becomes safe. A historical branch, tool adapter
   or design candidate is neither a merge queue nor superseded until a current
   replacement exists.
8. **Independent decision boundary.** Hard functional gates (financial semantics,
   auth/mode, accessibility, responsive interaction) are separate from subjective
   design-quality evaluation. An independent evaluator may recommend pass/refine/pivot;
   the owner still selects a direction and accepts merge.

## Requirements handed to Design Harness V2.1 later

Design Harness V2 already separates generator from evaluator and requires phone,
desktop and one interaction (`docs/engineering/DESIGN_HARNESS.md`). If a later packet
opens V2.1, it must assess—not assume—the following requirements:

| Evidence-backed need | Requirement for a later V2.1 proposal |
|---|---|
| Demo/authenticated divergence | Capture and evaluator record must bind runtime mode and harness/identity. The validator must not treat a demo artifact as authenticated acceptance. |
| Retry/first-paint defect history | The harness needs an explicit readiness/first-visit result and must preserve a failed first attempt rather than overwriting it with a retry capture. |
| PP-12 short-height failure | Overlay evidence needs normal and short-height phone viewport plus final-action interaction; full-page screenshots alone cannot close the requirement. |
| Provenance ambiguity | Each retained artifact/evaluation must bind route, viewport, runtime mode, interaction result and exact Git SHA. |
| Functional versus subjective evidence | The harness must keep hard behavioural/accessibility/financial gates separate from evaluator scores; scores cannot waive a failing hard gate. |

No V2.1 implementation, schema, script, test or artifact is added by A0.

## Open uncertainties

- Historical records prove the listed mechanisms, but do not quantify their cost or
  establish that every future visual defect has the same cause.
- The exact future visual direction, token set, route order and component migration
  strategy remain owner decisions after Phase A; no A0 record selects them.
- Physical Android/iOS visual QA for the future rebuilt experience cannot be inferred
  from the accepted P3 core-ledger run.
- Existing screenshot/evaluator artifacts are not all durable current-main truth;
  later work must capture fresh, sanitized evidence and avoid committing private
  financial content.

## Reading route for a future agent

Read this review with `docs/research/CURRENT_PROJECT_MEMORY.md`, the active Trust
packet, product principles, current executable ownership guards and the later slice's
packet. Open the cited historical packet or named PR memory only to verify a specific
mechanism. Do not treat this retrospective as permission to begin A-to-J work.
