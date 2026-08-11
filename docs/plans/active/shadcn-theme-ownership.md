# Shadcn semantic theme ownership

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** PR [#339](https://github.com/Thunderkill016/moneyflow/pull/339), draft, stacked on `fix/presentation-ownership-onboarding` (#337)  
**Last updated:** 2026-08-11

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Make the semantic Tailwind classes already emitted by MoneyFlow's shadcn/Base UI primitives resolve to the existing MoneyFlow theme, so shared controls are styled by the production bundle in both light and dark mode instead of relying on utilities that Tailwind v4 never generated.

## Repository reconnaissance

### Current behavior

- PR #337's exact-head presentation-ownership gate proves that many shadcn/Base UI semantic classes are emitted by product code but have no unconditional owner in the production CSS bundle.
- `src/app/globals.css` already defines MoneyFlow-owned shadcn semantic aliases such as `--background`, `--foreground`, `--primary`, `--border`, `--input` and `--ring`, all backed by the `--mf-*` theme authority in `document-theme.css`.
- The active CSS entry is `src/app/legacy.css`, which imports `globals.css` and is imported by the root layout.
- Current shadcn/Base UI components emit classes including `bg-primary`, `bg-background`, `bg-muted`, `text-foreground`, `border-border`, `border-input` and `ring-ring`.
- The missing boundary is Tailwind v4 theme registration: plain CSS custom properties do not themselves create semantic utility classes.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/app/document-theme.css` | canonical MoneyFlow light/dark `--mf-*` roles | reuse; do not duplicate palette |
| `src/app/globals.css` | existing shadcn semantic aliases backed by `--mf-*` | reuse |
| `src/app/legacy.css` | current root CSS entry that imports the Tailwind foundation | add the smallest Tailwind v4 theme bridge |
| `src/components/ui/*` | emits semantic shadcn/Base UI utility classes | verify; no component rewrite |
| `docs/research/presentation-ownership-baseline.json` | reviewed debt enforced shrink-only by #337 | shrink only after bundle evidence |
| `scripts/check-code-css-ownership.mjs` | post-build code → CSS ownership authority | reuse unchanged |

### Existing tests and constraints

- Related unit/static tests: PR #337 presentation-ownership contract suite and repository UI source contracts.
- Database/RLS tests: not changed by this slice; CI may still execute pgTAP because this branch is stacked on #337.
- Browser tests: existing browser smoke, authenticated smoke and cross-device UI audit; targeted shared-primitive evidence is required before acceptance.
- Product/architecture rules: keep `--mf-*` as theme authority; no second palette; no drive-by redesign; one coherent UI ownership slice.

### Similar implementation and recent history

- PR #337 introduced a production-bundle ownership gate and identified the shadcn/Tailwind theme registration gap while migrating onboarding.
- `components.json` uses shadcn `base-nova`, Tailwind v4, CSS variables and `src/app/globals.css` as the Tailwind CSS source.

### Open questions

- [x] Does Tailwind v4 require theme variables to generate semantic color utilities? Yes; official Tailwind documentation states `@theme` variables determine which utilities exist.
- [x] What bridge does current shadcn recommend? `@theme inline` mapping `--color-*` theme variables to semantic CSS variables.
- [x] Should MoneyFlow install or overwrite shadcn components? No; the current components and palette remain owned by MoneyFlow.

## Research

### Research scope and source selection

- Decision question: how should existing MoneyFlow semantic CSS variables be exposed to Tailwind v4 so current shadcn/Base UI utilities are generated without creating a second theme authority?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` conceptually; primary implementation authority is current repo plus official Tailwind/shadcn documentation.
- Source budget: two focused primary sources are sufficient for this narrow framework contract.
- Expected decision or uncertainty to resolve: whether `@theme inline` is the supported bridge and whether it can point at existing CSS variables.

### Questions researched

1. What makes custom color utilities exist in Tailwind v4?
2. How does shadcn expose semantic variables such as `--background` and `--primary` to Tailwind v4?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| https://tailwindcss.com/docs/theme | official Tailwind docs | 2026-08-11 | `@theme` variables determine which utility classes exist; `--color-*` creates color utilities | does not define MoneyFlow semantic values |
| https://ui.shadcn.com/docs/tailwind-v4 | official shadcn docs | 2026-08-11 | Tailwind v4 shadcn projects use `@theme inline` to map `--color-background`, `--color-foreground`, etc. to semantic CSS variables | example palette is not MoneyFlow's palette and is not copied |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| `@theme inline` bridge to existing semantic aliases | official pattern; no new dependency; preserves runtime CSS-variable theme switching | cross-cutting shared primitive visual impact must be measured | selected |
| replace semantic classes with arbitrary values in every component | locally explicit | duplicates palette knowledge across components; large diff; defeats shared semantics | rejected |
| overwrite/re-add all shadcn components | may regenerate current defaults | destroys MoneyFlow-owned changes and expands scope | rejected |
| add a second hard-coded theme palette | easy to generate utilities | violates MoneyFlow theme authority and risks light/dark drift | rejected |

### Research decision

Use the official Tailwind v4/shadcn `@theme inline` mechanism to register semantic `--color-*` theme variables while keeping the existing MoneyFlow semantic aliases and `--mf-*` roles as the only color truth. The bridge generates utility ownership; it does not define a new palette. The exact debt reduction remains evidence-driven from the production bundle rather than predicted in advance.

### Adoption review

Not applicable. No dependency, provider, service, framework or architecture pattern is being added; this corrects configuration of the already-adopted Tailwind v4/shadcn stack.

## Specification

### Problem

Shared MoneyFlow UI primitives emit semantic Tailwind classes whose names imply valid theme roles, but the production bundle does not own many of them because the current CSS aliases were never registered as Tailwind v4 theme variables. This creates a real false-green visual path: components can carry valid-looking class names without the intended color/border/ring rule existing.

### User stories

- As a MoneyFlow user, shared buttons, cards, dialogs, sheets and fields render using the intended MoneyFlow semantic colors in light and dark mode.
- As a maintainer, a semantic shadcn class cannot silently appear styled in source while being absent from the built CSS bundle.

### Acceptance criteria

- [ ] SHADCN-AC1: the production build generates unconditional owners for the currently emitted shadcn semantic color utilities selected by the bridge.
- [ ] SHADCN-AC2: `check:code-css-ownership` passes with zero baseline additions and a strictly smaller approved debt baseline.
- [ ] SHADCN-AC3: generated semantic utilities resolve through existing MoneyFlow theme aliases/`--mf-*` roles; no second hard-coded light/dark palette is introduced.
- [ ] SHADCN-AC4: representative shared primitives remain usable and visually coherent in light/dark browser evidence with no overflow, focus or contrast regression discovered by the selected audit.
- [ ] SHADCN-AC5: #337 onboarding behavior and ownership guarantees remain unchanged on the stacked branch.

### Required states

- Loading: existing route loading states are not redesigned in this slice.
- Empty: existing empty states are not redesigned.
- Populated: representative shared primitives must use generated theme utilities.
- Validation/error: destructive/error semantic controls retain visible styling and focus states.
- Recovery/undo: unchanged.
- Long data / large VND: unchanged.
- Mobile/tablet/desktop: existing responsive geometry must remain unchanged; color ownership is the intended change.
- Accessibility: visible focus remains; color cannot become the sole meaning of financial state.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none; no data/auth/database code changes.

### Out of scope

- The unrelated stale `src/app/product-styles.ts` import.
- MF-06 Quick Add rule ownership.
- MF-08 base-table DML privilege work.
- Rewriting shadcn/Base UI components.
- Building a route/component graph for contextual presentation ownership.
- Fixing non-theme presentation debt families such as loading skeletons, privacy, capture or Inbox route classes.

## Implementation plan

### Architecture fit

The active CSS entry owns Tailwind theme registration; `globals.css`/`document-theme.css` continue to own semantic values. Shared UI primitives consume utilities and do not become color authorities. The #337 production-bundle gate remains the executable proof that code-emitted classes have CSS owners.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/app/legacy.css` | add bounded `@theme inline` semantic color registration after the existing global foundation import | make Tailwind v4 generate current shadcn semantic utilities without duplicating palette values |
| `docs/research/presentation-ownership-baseline.json` | remove only debt entries proven stale by a clean production build | preserve shrink-only debt contract |
| targeted browser/audit coverage if existing evidence is insufficient | assert representative shared primitives/light-dark state | prove user-visible effect rather than only static bundle output |
| this work packet + PR memory | record scope/evidence | durable handoff |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing CSS custom properties remain; only Tailwind utility generation changes.
- Rollback: remove the `@theme inline` bridge and restore only the baseline entries removed by this PR; no data rollback.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| theme utility is generated but maps to undefined semantic variable | map only to verified existing aliases, with `muted` intentionally sharing the existing secondary surface role |
| bridge creates a second palette | no hard-coded colors in the bridge; aliases ultimately resolve to `--mf-*` |
| shared primitives change unexpectedly across many routes | responsive/browser audit and targeted computed-style evidence before acceptance |
| baseline is manually shrunk beyond real bundle proof | use gate output from the clean build; zero additions allowed |
| stacked PR accidentally changes #337 ownership algorithm | do not edit gate/parser code in this slice |

### Verification plan

- Static: knowledge, architecture, CSS ownership/dead CSS, #337 code→CSS ownership gate, lint, typecheck.
- Unit/domain: full selected unit/static suite; no financial domain change expected.
- Database: not applicable to this slice; report CI execution honestly if inherited from stacked base.
- Browser flow: demo + authenticated smoke as selected; representative primitive states.
- Responsive/visual: selected cross-device audit, including light/dark.
- Production/manual: none until parent #337 and this follow-up are independently accepted/merged; no deployment claim.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | register existing semantic theme aliases with Tailwind v4 | #337 head + official framework contract | production bundle + ownership gate | in progress |
| T2 | shrink baseline only by newly owned entries | T1 clean build | gate stale-debt output | todo |
| T3 | verify shared primitive light/dark runtime behavior | T1 | browser/UI audit evidence | todo |
| T4 | independent diff evaluation and PR record | T1-T3 | review + exact-head CI | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-11 | researcher/planner | implementer | implementing | #337 exact-head ownership evidence; official Tailwind + shadcn docs; this packet | exact debt reduction and runtime visual effect not yet measured | implement the bounded theme bridge, then run bundle evidence |

### Current permission boundary

- Granted scope: `branch_write` on `fix/shadcn-theme-ownership` only.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch/PR work; public documentation reads.
- Forbidden writes: `main`, merge, force-push shared history, Vercel/Supabase/provider settings, production data, branch protection/rulesets.
- Human approval required before: merge or any deployment/provider write.
- Rollback or stop condition: stop and return to planning if the bridge requires changing product palette semantics, component behavior, or any data/provider boundary.
## Evaluation

### What the delivered candidate actually did: nothing

The first implementation put `@theme inline` in `src/app/legacy.css`. Measured
against a clean production bundle it registered **nothing**:

- not one semantic utility was generated — `bg-background`, `bg-primary`,
  `bg-muted`, `text-foreground`, `border-border`, `ring-ring` all absent;
- `--color-background` never appeared in the output;
- the ownership inventory was byte-identical to #337 —
  `ownedUnconditional: 115`, `staleAllowances: 0`, `confirmedUnowned: 227`.

Cause: `legacy.css` has no `@import "tailwindcss"`, so Tailwind never processed
the block. This is the "`@theme` placement/import ordering" counterexample the
rework brief anticipated, and it would have shipped as a no-op with a convincing
commit message.

Moving the block into `globals.css` — the file that owns Tailwind's context and
already holds the aliases it references — makes it work.

### Ownership delta, verified entry by entry before touching the baseline

| | Before | After |
|---|---|---|
| `ownedUnconditional` | 115 | 134 |
| `ownedUtility` | 21 | 25 |
| `tailwindVariantPrefix` | 16 | 20 |
| `confirmedUnowned` | 227 | 203 |
| `unknown` | 50 | 50 |
| `contextualUnproven` | 66 | 66 |
| **baseline** | **346** | **319** |

All 27 removals were checked individually against the bundle first:

- **23** gained a genuine unconditional owner (`.bg-background`,
  `.text-foreground`, `.accent-primary`, `.ring-destructive`, …);
- **4** are variant prefixes whose guarded utility now exists: `dark`
  (`dark:border-input`), `aria-expanded` (`aria-expanded:bg-muted`),
  `placeholder` (`placeholder:text-muted-foreground`) and `after`
  (`after:border-ring`, which needs `--color-ring`).

No entry was added. `baselineAdded: 0`, and the gate still resolves its approved
set from git history in bootstrap mode against #337's `e42b4fe`.

### `muted` decision (option B, on evidence)

`--color-muted: var(--mf-surface-muted)`.

Not `var(--muted)`: that is a backward-compatible alias for a **text** colour
(`--color-text-secondary`, line 161 of `globals.css`) and would paint mid-grey
text as a background. It is consumed by no CSS today.

Not `var(--secondary)` as the first candidate had it: `--secondary` and muted are
distinct roles that happen to share `--mf-surface-muted` right now, so borrowing
it would silently move every `bg-muted` if secondary were ever retuned.

`--mf-surface-muted` is the canonical muted surface and is defined in both
themes (`#f8fafc` / `#1d2939`). Confirmed in the bundle as
`.bg-muted{background-color:var(--mf-surface-muted)}`.

### The bridge alone was a regression — second defect found and fixed

`globals.css` carried `button { color: inherit }` and `a { color: inherit }`
**unlayered**. Unlayered CSS outranks any `@layer`, so those resets beat every
Tailwind `text-*` utility on a button or link. Invisible while the semantic
utilities generated nothing; a real contrast defect once they did.

Identified from the browser's own cascade via `CSS.getMatchedStylesForNode`:
`.text-primary-foreground` sits in `@layer utilities` and lost to an unlayered
`button` rule.

Measured on the real "Lưu" primary button at 390px, ratios computed from the
measured rgb rather than assumed from the palette:

| | light | dark |
|---|---|---|
| before the bridge | transparent bg, ambient near-black text | same — **dark mode did not resolve** |
| bridge alone | `#0369a1` + `#101828` → **2.99:1** | `#38bdf8` + `#f8fafc` → **2.05:1** |
| bridge + layered resets | `#0369a1` + `#ffffff` → **5.93:1** | `#38bdf8` + `#082f49` → **6.48:1** |

Both final ratios clear 4.5:1; neither earlier state did. `text-destructive` also
starts resolving to real red (`#dc2626` / `#f87171`) instead of ambient
near-black.

### Measured computed-style delta on real components

390px, `html[data-theme]` toggled, first visible element carrying each class:

| class | property | before | after (light / dark) |
|---|---|---|---|
| `bg-background` | background | `rgba(0,0,0,0)` both | `#f8fafc` / `#0c111d` |
| `bg-primary` | background | `rgba(0,0,0,0)` both | `#0369a1` / `#38bdf8` |
| `border-border` | border | `rgb(0,0,0)` both | `#d0d5dd` / `#344054` |
| `border-input` | border | `rgb(0,0,0)` both | `#98a2b3` / `#475467` |
| `text-foreground` | color | `rgb(0,0,0)` both | `#101828` / `#f8fafc` |
| `text-muted-foreground` | color | `rgb(0,0,0)` both | `#475467` / `#d0d5dd` |
| `text-primary-foreground` | color | `rgb(0,0,0)` both | `#ffffff` / `#082f49` |
| `text-destructive` | color | ambient near-black | `#dc2626` / `#f87171` |

The honest reading: before this change those elements were on **unstyled
defaults** — transparent backgrounds, pure-black borders and text, identical in
light and dark. So this is not only ownership correctness; dark mode genuinely
did not resolve on them. The delta is real and user-visible.

`bg-card`, `bg-muted` and `bg-destructive` were **not** reachable on the probed
routes: they exist only as hover/aria states (`hover:bg-muted`) or with opacity
(`bg-destructive/10`). Their generated declarations were verified in the bundle
instead, and no claim is made about their rendered appearance.

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Semantic utilities generated | verified present in the production bundle | pass |
| References only, no second palette | diff contains no hex/oklch; every value is `var(--…)` | pass |
| `--mf-*` remains authority | bridge references aliases that resolve to `--mf-*` | pass |
| Theme-aware in dark | measured, table above | pass |
| No new baseline entries | `baselineAdded: 0` | pass |
| Every removal justified | 23 unconditional + 4 variant prefixes, itemised | pass |
| No contrast regression | 5.93:1 / 6.48:1 measured, up from 2.99 / 2.05 | pass |
| No layout/target-size regression | overflow 0; 0 of 84 targets under 44px | pass |
| Static gates | knowledge, architecture, css-ownership, dead-css, code-css-ownership, ci-policy, lint, typecheck | pass |
| Unit | 840/840 | pass |
| Cross-device audit | 101 passed, 1 skipped (phone light + dark) | pass |
| Demo e2e | 49 passed | pass |

### Remaining limitations

- `bg-card`, `bg-muted`, `bg-destructive` proven by generated declaration, not by
  rendered appearance — they need an interaction or an opacity modifier to reach.
- Toast, Sheet and Dialog were not opened in the probe; Card, Accordion,
  RadioGroup and CheckboxField have **zero importers** and so were not
  exercised at all.
- No WCAG claim beyond the two measured button states.
- The layered-reset change alters cascade precedence for every `button` and `a`
  in the app. It was verified by the audit and e2e suites and by the measured
  table above, but it is broader than the bridge itself and is the main thing a
  reviewer should scrutinise.
- Exact-head protected CI cannot be produced while #339 is stacked on an
  unmerged #337; see the delivery record.

## Delivery record

- Base: `fix/presentation-ownership-onboarding` @ `86c3eae` (PR #337, **open, not
  merged**). `main` is `ebc98e4`.
- PR #339 stays **draft**. Retargeting it at `main` would mean carrying #337's
  entire diff, and running "exact-head" CI on this stack would produce evidence
  for a tree that cannot merge as-is. Neither was done.
- Next allowed action: merge #337, then rebase this branch onto `main` so its
  diff is the theme slice alone, and only then run the full exact-head matrix.
