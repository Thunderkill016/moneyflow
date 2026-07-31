# Retire the dead shell CSS

Task 3 of `docs/plans/active/retire-dead-css.md`, and task 7 of
`docs/plans/active/minimum-target-size.md`.

## Outcome

The `.sidebar` and `.topbar` families are gone from the legacy global layers. The
shell's layout has one owner, `src/components/layout/app-shell.module.css`, with no
parallel set of rules that look authoritative and apply to nothing.

Status: `implemented`. Not `verified` in production — that is the owner's step.

## Repository reconnaissance

**The task as written was wrong, in a way worth correcting rather than working
around.** `AGENTS.md` records this as a load-bearing trap:

> `.app-shell`, `.sidebar` and `.topbar` global selectors are dead. The shell moved
> to a CSS Module; `app-shell.tsx` renders `styles.shell`, so those classes are not
> in the DOM.

Two of the three are dead. **`.app-shell` is not.** `src/app/goals/loading.tsx`
renders it directly:

```tsx
<div className="app-shell"><div className="page-column">…</div></div>
```

That is the only file in the repository that does, and it is one of fifteen
`loading.tsx` route skeletons — the other fourteen render content classes without a
shell wrapper. So `.app-shell` and `.page-column` reach the DOM, briefly, during the
`/goals` loading fallback. They are excluded from this change.

DOM measurement rather than source reading, across `/dashboard`, `/transactions`,
`/accounts`, `/settings` and `/goals`, at 390 and 1366:

| Class | Nodes found | Verdict |
|---|---|---|
| `.sidebar` | 0 | dead |
| `.topbar` | 0 | dead |
| `.mobile-nav` | 0 | dead |
| `.mobile-fab` | 0 | dead |
| `.capture-sheet` | 0 | dead |
| `.more-sheet` | 0 | dead |
| `.desktop-search` | 0 | dead |
| `.desktop-add` | 0 | dead |
| `.theme-toggle` | 0 | dead |
| `.app-shell` | 0 in steady state | **live in `/goals` loading** |
| `.page-column` | 0 in steady state | **live in `/goals` loading** |
| `.profile-chip` | 5 | **live** |

Steady-state zero is not the same as never-rendered; `.app-shell` is the case that
proves it, which is why the table separates the two.

## Research

**Why `check:dead-css` did not flag these.** The detector reports `.sidebar` and
`.topbar` as *referenced*, and the reason is instructive: it matches bare tokens
across `src/`, `e2e/`, `tests/` and `scripts/`, and the word "sidebar" appears in
prose — code comments, JSDoc, test descriptions. Some of those comments are ones I
wrote in the two preceding pull requests.

So the detector's own conservatism hid this cluster, and the packet's stated
principle — "the printed number is a floor" — was more expensive than it looked. A
class is not live because English prose mentions its name.

Stripping comments before matching would fix this specific case and is sound, since
a comment cannot put a class in the DOM. It is deliberately **not** done here: a
naive comment stripper mangles `href="https://…"`, and getting it wrong reports a
*live* class as dead, which is the failure that costs something. Recorded as a
follow-up with a warning attached, not attempted as a side quest.

**Specificity of the removed layers.** Many of the removed rules carried
`!important` — 49 declarations in total. Their removal takes
`check:css-ownership` from **1152 to 1103** against a 1200 budget, which is real
headroom rather than a cosmetic number.

## Specification

1. No rule for `.sidebar`, `.sidebar-bottom`, `.topbar`, `.topbar-actions` or
   `.topbar-theme-toggle` remains in the legacy global layers.
2. Rules that share a selector list with a live class keep that class and its
   declarations.
3. No route's rendering changes, at any viewport, in either theme.
4. `!important` count and `unauthorizedDocumentSelectors` do not increase.
5. `.app-shell` and `.page-column` are untouched.

## Implementation plan

1. Enumerate every rule whose selector list mentions a target class, across all
   legacy layers.
2. Classify each co-selector in a shared list as live or dead by `className`
   search plus `:global(...)` search.
3. Remove whole rules; edit shared ones.
4. Clean up blocks left empty.
5. Verify by full-page screenshot comparison, not by reasoning.

Risks:

- **A shared selector list where the last selector carries the body.** This already
  caused a near-miss in #165. Handled by rewriting the selector list in place rather
  than deleting lines.
- **Over-matching on a hyphenated neighbour.** This one bit: the first pass used
  `\.desktop-search\b`, and `\b` matches between `h` and `-`, so it also matched
  `.desktop-search-link` — a different class — and deleted its two rules. The class
  happened to be dead too, so nothing broke, but that was luck. Redone with
  `(?![\w-])` and the scope narrowed to the sidebar/topbar families only.
- **Nothing catches a wrong deletion**, which is why the evidence below is
  screenshots rather than a passing suite.

## Tasks

1. [x] Measure DOM presence rather than trusting `AGENTS.md`.
2. [x] Classify every co-selector in the four shared rules.
3. [x] Remove 51 rules, edit 4, clean 3 emptied blocks.
4. [x] Byte-compare full-page screenshots.
5. [x] Correct the `AGENTS.md` trap text about `.app-shell`.

## Implementation

51 rules removed and 4 edited, across four layers:

| Layer | Removed | Edited |
|---|---|---|
| `src/app/globals.css` | 37 | 2 |
| `src/app/ui-refresh.css` | 9 | 2 |
| `src/app/ai-uiux-refresh.css` | 4 | 0 |
| `src/app/cross-device-stabilization.css` | 1 | 0 |

The four edited rules each kept a live co-selector:

- `.profile-chip > span:nth-child(2)`, `.profile-chip > svg`, `.theme-toggle span`
- `.desktop-search`, `.desktop-add`
- `[data-theme="dark"] .mobile-nav`, `.capture-sheet`, `.more-sheet`, `.profile-menu`
- `.app-shell .primary-button`, `.insights-kpi article`, `.transaction-row`,
  `.mobile-fab`

Only `.profile-chip`, `.profile-menu`, `.insights-kpi`, `.transaction-row` and
`.primary-button` among those are actually live; the rest are dead too but belong to
clusters this packet does not authorise, so they were left in place rather than
swept up.

Three blocks left empty were removed: two adjacent `@media` blocks in `globals.css`
that had held only `.topbar-theme-toggle`, and one `@supports
selector(body:has(.insights-dashboard))` block in `ai-uiux-refresh.css`, together
with the comment that described the rule inside it.

## Evaluation

- [x] **72 full-page screenshots, before and after, every one byte-identical.**
      Six viewports (320, 390, 768, 1024, 1366, 1440) × two themes × six routes
      (`/dashboard`, `/transactions`, `/accounts`, `/settings`, `/reports`,
      `/goals`), compared with `cmp`.
- [x] `check:css-ownership` — `!important` **1152 → 1103**;
      `unauthorizedDocumentSelectors` 0.
- [x] `check:dead-css` — classes **926 → 912**, unreferenced **187 → 181**.
- [x] `check:knowledge`, `check:architecture`, `lint`, `typecheck`, `build`.
- [x] Unit tests 595/595 — after the correction described below.
- [x] Cross-device audit across all 11 chromium projects.

### A green test was guarding CSS that never applied

Removing `.topbar` from `ui-refresh.css` turned one unit test red, and what it was
actually asserting is the finding of this packet:

```ts
test("shell consistency layer avoids unreadable 10px KPI labels and glass topbars", …)
  assert.match(shellCss,
    /\.topbar\s*\{[\s\S]*?background:\s*var\(--color-bg-elevated\)[\s\S]*?backdrop-filter:\s*none/);
```

It required a `.topbar` rule with an opaque background and `backdrop-filter: none`,
and it passed for as long as it existed. `.topbar` is not in the DOM. The rule it
guarded never applied to anything.

Meanwhile the **real** topbar, `app-shell.module.css:189`, is:

```css
background: color-mix(in srgb, var(--mf-canvas) 91%, transparent);
backdrop-filter: blur(16px);
```

Translucent and blurred — precisely the "glass topbar" the test claimed to prevent.
**The assertion did not merely fail to help; it reported the opposite of the truth
for as long as it was green.** This is the same shape as the `.secondary-button`
42px trap already recorded in `AGENTS.md`: a control shipped at the wrong value
while a rule that looked like it governed the value sat untouched.

The assertion was removed with the reasoning written into the test file. Repointing
it at the CSS Module would turn it red immediately, and **whether the shipped glass
topbar is correct is a design decision, not a cleanup decision** — the Calm Ledger
direction may have chosen it deliberately. Flagged for the owner; not decided here.

## Out of scope, observed

- **`src/lib/app-shell-account-access.test.ts` has a second vacuous test.** "mobile
  account trigger is hidden on desktop and visible at the mobile breakpoint" asserts
  `.mobile-account-button` rules in `ui-refresh.css`; the component renders
  `styles.mobileAccountButton` from its module, so that global class is dead too.
  Left alone — this packet authorises the sidebar/topbar families, and fixing it
  properly means deciding what the real guard should assert.
- **`.mobile-nav` and `.mobile-fab` are dead**, and `src/lib/mobile-layout.test.ts`
  asserts both exist in `globals.css`. Same shape as the topbar finding, a larger
  cluster, and the natural next slice.
- **`src/app/goals/loading.tsx` is the odd one out** among fifteen route skeletons —
  the only one wrapping itself in `.app-shell` / `.page-column`. Either it is right
  and the other fourteen are wrong, or the reverse. Worth one deliberate answer;
  until then `.app-shell` stays.
- **`check:dead-css` counts prose as a reference.** Stripping comments before
  matching would help, with the URL caveat above.
