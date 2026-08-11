# Presentation ownership hardening (MF-04, slice 1: onboarding)

**Status:** ready_for_review
**Execution state:** ready_for_review
**Active role:** human_owner
**Permission scope:** branch_write
**Owner:** agent (implementer/evaluator) → human_owner (merge decision)
**Issue/PR:** PR [#337](https://github.com/Thunderkill016/moneyflow/pull/337)
**Last updated:** 2026-08-11

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

This packet is opened **before** implementation, correcting the process deviation
recorded in `authenticated-ownership-hardening.md`.

## Outcome

A presentation class name can no longer silently lose its owner. Product code
that emits a semantic class with no active stylesheet behind it fails a gate
instead of shipping as invisible unstyled markup. Existing debt becomes an
explicit, reviewed list that can only shrink. As the first proof that the
mechanism works end to end, `/onboarding` — the first screen a new account sees —
gets a real local presentation owner and measured rendering across phone,
desktop, light and dark.

## Repository reconnaissance

### Current behavior (baseline `ebc98e4`)

The audit established MF-04: whole surfaces render with no CSS owner. Measured on
a production build at 1280px, `/onboarding` showed `.onboarding-card` with
transparent background, `padding: 0px`, `border-radius: 0px`, `box-shadow: none`
and a full-bleed `1280x400` box; `.onboarding-progress-dot` computed to
`display: inline` at `0x20`, i.e. invisible.

All three existing CSS gates pass on that same commit, because none of them asks
the relevant question:

| Gate | Claim | Direction |
|---|---|---|
| `check:dead-css` | every CSS rule is reachable from product code | CSS → code |
| `check:css-ownership` | cascade/global owner rules, retired-sheet boundary, `!important` budget | cascade |
| **missing** | **every emitted class has a presentation owner** | **code → CSS** |

### Relevant repository areas

- `scripts/check-dead-css.mjs` — already builds a TypeScript program and resolves
  class-bearing expressions, class builders (`clsx`/`cn`/`cva`/`twMerge`),
  template literals, conditionals, literal-type unions and dynamic prefixes. It
  also parses CSS selectors and `:global(...)`. This is the reuse target: the
  inverse gate needs the same extraction, not a second implementation.
- `scripts/check-dead-css-reachable.mjs` — adds the Next.js module-graph boundary.
- Active global stylesheets: `src/app/legacy.css` (which `@import`s
  `globals.css`), `src/app/document-theme.css`,
  `src/app/landing/safe-ux-login.css`, `src/app/safe-ux-planning.css`,
  `src/app/budgets/money-layout.css`.
- 35 CSS Modules.
- `src/components/onboarding-flow.tsx` — slice 1 target.

### Existing tests and constraints

- `src/lib/onboarding.test.ts` pins copy and flow constants, including
  `ONBOARDING_PRIMARY_CTA`.
- `src/lib/dead-css-scanner.test.ts` covers the scanner.
- Phase 10 retired the global presentation generations. Restoring any of them, or
  adding a new global patch layer, is the failure this work must not commit.

### Open questions

- Can Tailwind-generated utilities be distinguished deterministically without a
  hand-written allowlist? Planned answer: run the installed Tailwind toolchain
  and treat the class selectors it actually generates as Tailwind-owned. If a
  token cannot be proven either way it is `UNKNOWN`, never "owned".

## Research

No new external research. Everything needed is repository-internal: the existing
scanner, the installed Tailwind toolchain, executable source and runtime
measurement. No third-party pattern or dependency is adopted, so the template's
research/adoption sections do not apply.

## Specification

### Problem

Product code can emit a presentation class that no active stylesheet owns, and
every current gate stays green. The result is markup that renders visible but
unstyled — which no existing check can see, because an unstyled element still has
a box, still fits the viewport and still has an accessible name.

### Acceptance criteria

1. A new gate classifies every literal class token product code emits, and fails
   on any confirmed-unowned token that is not in a reviewed baseline.
2. Tailwind utilities are distinguished by the installed toolchain, not a
   hand-maintained list. Unprovable tokens are reported `UNKNOWN`, never owned.
3. The baseline is per-token with context, contains no wildcards, and can only
   shrink: a stale entry (now owned, or gone) fails the gate.
4. A negative fixture proves the gate fails for a component emitting an unowned
   semantic class. "Exits 0 today" is not acceptance.
5. `/onboarding` has a local CSS Module owner; its former unowned entries leave
   the baseline; measured rendering is correct at phone and desktop, light and
   dark.
6. Onboarding behaviour is unchanged.

### Required states

- Token owned by CSS Module, active global, or `:global(...)` → owned.
- Token generated by Tailwind → utility, not app debt.
- Token from a resolvable finite runtime family → dynamic, reported.
- Token unprovable → `UNKNOWN`, reported, gate does not claim ownership.
- New confirmed-unowned token → **FAIL**.
- Baseline entry no longer violating → **FAIL** (must be deleted).

### Financial and security constraints

None touched. No migration, no RPC, no RLS, no grant, no financial semantics, no
provider or production write. Presentation and tooling only.

### Out of scope

- Remaining MF-04 families beyond onboarding (privacy, capture, route errors,
  loading skeletons, profile/user surfaces). Ranked in the report, not migrated.
- **MF-06** Quick Add rule ownership.
- **MF-08** database privilege work.
- Any redesign, new visual identity, navigation change, copy rewrite, or feature.
- Replacing `check:dead-css` or `check:css-ownership`. The new gate is
  complementary; all three make different claims.

## Implementation plan

### Architecture fit

The gate reuses the existing scanner's extraction rather than re-deriving it. The
onboarding migration follows the established direction: component → local CSS
Module → current semantic tokens, with shared primitives reused.

### Planned changes

| Area | Change |
|---|---|
| `scripts/` | extract the shared class-emission core; add `check-code-css-ownership.mjs` |
| baseline | reviewed per-token debt file, shrink-only |
| `package.json` | `check:code-css-ownership` |
| CI | add to the existing static quality gate, no new workflow |
| onboarding | `onboarding-flow.module.css` + component rewiring |
| tests | negative fixture; onboarding runtime contracts |

### Data and migration impact

None.

### Risks and counterexamples

| Risk | Handling |
|---|---|
| Naive regex marks Tailwind utilities as unowned | Utilities come from the installed toolchain's generated output |
| Gate becomes a permanent excuse list | Shrink-only invariant; stale entries fail; no wildcards |
| Refactoring the shared core breaks `check:dead-css` | Only pure functions move; both gates run after |
| Migration turns into a redesign | Repair only; current tokens and primitives; no new identity |
| Onboarding behaviour drifts | Logic untouched; existing unit tests plus new runtime interaction contract |
| Debt hidden as `UNKNOWN` | `UNKNOWN` is reported separately and counted, never folded into owned |

### Verification plan

`check:knowledge`, `check:architecture`, `check:css-ownership`, `check:dead-css`,
`check:code-css-ownership`, `lint`, `typecheck`, `test`, `build`, plus measured
onboarding runtime evidence at 320/360/390 and desktop in both themes, the
interaction path across all three steps, and the authenticated ownership suite
from #336 staying green.

Boundary, restated so it is not conflated later: this gate proves **presentation
ownership of emitted class names**. It does not prove visual correctness, and
runtime geometry measurement does not prove ownership. Both are required.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | This packet, before implementation | — | current file | done |
| T2 | Recompute MF-04 against `ebc98e4` with A–G classification | T1 | inventory output | done |
| T3 | Shared extraction core + `check-code-css-ownership.mjs` | T2 | gate output | done |
| T4 | Reviewed shrink-only baseline | T3 | baseline file | done |
| T5 | Negative fixture proving the gate fails | T3 | test | done |
| T6 | Measure `/onboarding` before | T1 | computed styles | done |
| T7 | Migrate onboarding to a CSS Module | T6 | diff | done |
| T8 | Measure `/onboarding` after, 4 states + interaction | T7 | computed styles | done |
| T9 | Shrink baseline; wire gate into scripts + CI | T4, T7 | diff | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-11 | human_owner | implementer | planned | this packet; audit finding MF-04; baseline `ebc98e4` | historical `~380` count not yet recomputed | Recompute the inventory, then build the gate |

### Current permission boundary

- **Granted scope:** `branch_write` on `fix/presentation-ownership-onboarding`.
- **Exact repositories/providers/resources:** `Thunderkill016/moneyflow` branch and its PR. GitHub Actions read.
- **Forbidden writes:** `main`, any Supabase project, production data, provider settings, branch protection, required checks, `CODEOWNERS`, migrations.
- **Human approval required before:** merge; any provider/production action; starting MF-06 or MF-08; any further MF-04 family.
- **Rollback or stop condition:** branch is unmerged, so rollback is a branch delete. Every change is presentation or tooling; no data or provider state to unwind.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Gate classifies every emitted token | see the recomputed inventory below | pass |
| Tailwind distinguished by the toolchain | ownership read from the production bundle; no hand-written list | pass |
| Unknown never claimed as owned | reported in its own bucket and allowlisted separately | pass |
| Baseline shrink-only, no wildcards | stale allowances fail; unit test rejects wildcards and missing owners | pass |
| Negative fixture | 5 contract tests; live demo failed the gate naming `.mf04-demo-unowned-class` | pass |
| Onboarding has a local owner | `onboarding-flow.module.css`; zero literal classNames left in the component | pass |
| Onboarding renders correctly | measured in 4 states; runtime contract green at 320px and desktop dark | pass |
| Behaviour unchanged | class attributes only; 824 unit tests green | pass |

### Measured onboarding evidence

| State | Before | After |
|---|---|---|
| phone light | card transparent, pad 0, radius 0, no shadow, 390px | surface painted, pad 20px, radius 18px, shadow set, 358px |
| phone dark | same as light — unstyled | card `#101828` on `#0c111d`, inherited from `html[data-theme]` |
| desktop light | **1280px full-bleed**, transparent, pad 0 | **544px bounded**, pad 32px, radius 18px, shadow set |
| desktop dark | same as light — unstyled | bounded and dark-themed |
| overflow | 0 | 0 |

### Recomputed inventory — clean production build, selector context preserved

Pre-migration (the bootstrap measurement):

```
EMITTED=530
OWNED_UNCONDITIONAL=112
OWNED_UTILITY=24
TAILWIND_VARIANT_PREFIX=16
CONTEXTUAL_UNPROVEN=66
DYNAMIC=5
CONFIRMED_UNOWNED=254
UNKNOWN=53
BASELINE_BOOTSTRAP=373
```

Post-migration (current HEAD):

```
EMITTED=503
OWNED_UNCONDITIONAL=121
OWNED_UTILITY=24
CONTEXTUAL_UNPROVEN=66
CONFIRMED_UNOWNED=227
UNKNOWN=53
BASELINE_CURRENT=346
```

### Number reconciliation

Four figures were reported during this work. Only the last pair is correct, and
the earlier ones are corrected rather than quietly restated.

| Figure | What it actually was |
|---|---|
| 288 | first observation, from an **interrupted** build — never valid |
| 291 | first complete-build observation, but ownership was **flattened**, so a class styled only under someone else's hashed ancestor counted as owned |
| 379 / 346 | selector context fixed, but nine tokenizer fragments still resolved unstably |
| 382 / 355 | same, measured in a different build mode while chasing that instability |
| **373 → 346** | **final**: selector context preserved *and* utility fragments resolved deterministically |

Correcting the selector semantics revealed **82 violations the flattened gate was
hiding** (291 → 373 at the same pre-migration point).

The 27 removed entries are exactly the onboarding classes that gained an owner.
Nothing incidental, and nothing is claimed as "fixed by onboarding" that merely
changed classification.

### Remaining limitations

- The owner set is derived from a production build, so the gate is only correct
  against a complete one. An interrupted build silently under-reports ownership,
  which is why CI runs the gate immediately after the build step rather than in
  the static shard.
- Build-to-build instability was observed and traced, not tolerated: nine tokens
  flapped because the shared source tokenizer splits `gap-0.5` and `bg-black/50`
  on `.` and `/`, and the fragments were being resolved against whichever bare
  rule happened to exist. They are now resolved against the utility they were
  truncated from. Verified identical in both `demo` and `authenticated` builds.
- `CONTEXTUAL_UNPROVEN` (66) is deliberately counted as debt. Some of those
  classes may genuinely always render under the required ancestor; proving it
  needs a component/route graph this PR does not build. False positives were
  chosen over a false green.
- `unknown` (45 tokens) is reported, not resolved. Each needs a human to read the
  call site.
- The gate proves *ownership*, not visual correctness. Runtime measurement proves
  rendering, not ownership. Both were required here and neither substitutes.
- Not asserted: styled validation errors in onboarding. The wallet step has no
  reachable client-side error, so a test for one would prove nothing.

### Ranked remaining MF-04 families (not implemented)

Recounted after the selector fix, against the 346-entry baseline:

| Entries | Family | Note |
|---|---|---|
| 97 | capture + inbox surfaces | largest; `capture-paste-page` alone emits 35 |
| 91 | shadcn/Base UI primitives (`src/components/ui/*`) | **see below**; grew from ~72 once contextual selectors stopped certifying |
| 72 | other | dashboard sections, user chip, account/report surfaces |
| 59 | route loading skeletons | every `loading.tsx`; cosmetic, brief |
| 17 | privacy policy page | same shape as onboarding was |
| 10 | route error + empty states | includes the reported `.secondary-button` case |

Of the 346, **66 are `CONTEXTUAL_UNPROVEN`** — styled only beneath an ancestor
that is not proven at the emission site. `.secondary-button` is the canonical
example: `dashboard.module.css` styles it under its hashed ancestor while
empty-state, reconciliation, capture and route-error surfaces emit it elsewhere.

### Finding surfaced while building the gate

`globals.css` maps shadcn tokens as plain custom properties (`--background`,
`--foreground`, `--border`, …) but there is **no `@theme` block**. Tailwind v4
resolves `bg-background` from `--color-background` inside `@theme`, so utilities
like `bg-background`, `text-foreground`, `border-border` and `bg-muted` generate
no CSS at all. They are emitted by Button, Card, Dialog, Sheet, Toast and
TextField.

Those primitives are only *partly* affected — their non-theme utilities
(`flex`, `rounded-lg`, `px-5`) do generate — so this is a static ownership fact,
confirmed from the production bundle. What it looks like on screen has **not**
been measured, and should be before anyone acts on it. A single `@theme` block
may resolve most of the 72 entries at once, which is why this family is ranked
above its raw count.

## Delivery record

- Baseline: `main@ebc98e42be40121d3c612c6a2b53d12ea41446d0` (PR #336 merge commit).
- PR memory record: `docs/research/pr-memory/2026/Q3/PR-337.md`, created
  immediately after PR creation and kept a separate artifact from this packet.
