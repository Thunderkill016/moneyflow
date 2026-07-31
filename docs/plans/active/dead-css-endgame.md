# Dead CSS: finish it, then gate it

Closes tasks 3 and 4 of `docs/plans/active/retire-dead-css.md`, and task 7 of
`docs/plans/active/minimum-target-size.md`.

## Outcome

Every class selector in the legacy global stylesheets is reachable from product
code. `npm run check:dead-css` is now a **failing gate at zero** rather than a
report, so the debt cannot silently regrow.

Status: `implemented`. Not `verified` in production — that is the owner's step.

## Repository reconnaissance

The previous slices removed clusters one at a time because nothing caught a wrong
deletion. That constraint is gone: byte-comparing full-page screenshots does catch
one, and it costs the same for 10 classes or 500. So this finishes the job.

**Truth was established twice, independently.**

1. **DOM probe.** 21 routes × 3 viewports, opening every button on each page to
   reach dialog and sheet states — 444 distinct classes actually rendered.
2. **String-literal scan.** A class reaches the DOM through a string literal or a
   runtime-assembled prefix, and nothing else. Comments were stripped (carefully:
   `//` after `:` is a URL, not a comment), leaving 4,222 referenced tokens and 32
   runtime prefixes.

A class was treated as dead only when **both** said so. 170 qualified.

## Research

**Why the old detector reported 187 "unreferenced" and still missed 170 dead
classes.** It matched bare tokens anywhere in `src/`, `e2e/`, `tests/` and
`scripts/`. Three consequences, each of which produced a wrong answer:

- **Prose counted as a reference.** The word "sidebar" in a code comment kept
  `.sidebar` alive — including comments written while removing the rules that used
  it.
- **Tests counted as a reference.** `.demo-mode-banner` looked live because the
  string `".demo-mode-banner"` appears in `demo-mode-banner.test.ts`, asserting the
  dead rule exists. The test justified the rule and the rule justified the test.
- **Substrings counted as a reference.** `.table-scroll` was called live off
  `import-preview-table-scroll`. They are different classes; only the second is
  rendered.

**Two entire stylesheets were never loaded.** `landing-refresh.css` (1,048 lines)
and `landing-dark-mode-guardrails.css` (225 lines) are imported by no file —
`legacy.css` does not list them, and `landing-refresh.test.ts` asserts the root
layout must not import them. The landing page renders Tailwind utilities plus
`landing-page.module.css`. **1,273 lines of CSS that never reached a browser.**

**The 60-class landing cluster nearly went wrong.** The DOM probe visits `/`, which
in demo mode redirects into the app shell — so it never saw the landing page, and
`lp-*` and `landing-*` looked dead on a page the probe had not opened. Checking the
component directly confirmed they are dead for a different and better reason: the
landing renders none of them. Two evidences that agree for the wrong reason are
still one evidence.

## Specification

1. No class selector in a loaded legacy stylesheet is unreachable from product
   code.
2. Rules sharing a selector list with a live class keep that class and its
   declarations.
3. Stylesheets that no file imports are removed.
4. No route's rendering changes, at any viewport, in either theme.
5. `check:dead-css` fails on any future dead selector.
6. `!important` and `unauthorizedDocumentSelectors` do not increase.

## Implementation plan

1. Build both truth sets; intersect.
2. Remove through a **CSS parser**, not a regex.
3. Verify with a 200-image byte comparison across 20 routes.
4. Rewrite the detector on the literal method and make it exit non-zero.

Risks:

- **Regex cannot split a selector list.** It bit immediately — see below.
- **A route the probe cannot reach.** Handled by requiring the literal scan to
  agree, and by checking the landing component by hand.
- **Transient renders reading as regressions.** Handled by re-running the same
  build; see the evaluation.

## Tasks

1. [x] DOM-probe 21 routes × 3 viewports with dialogs opened.
2. [x] Extract references from string literals only.
3. [x] Remove 170 classes through postcss; delete 2 unloaded stylesheets.
4. [x] Byte-compare 200 full-page screenshots.
5. [x] Rewrite `check:dead-css` as a failing gate; verify it exits 0.

## Implementation

488 rules removed, 16 edited, across four loaded stylesheets, plus two whole files
deleted. `globals.css` went from **7,800 to 5,292 lines**.

**Two attempts failed before one worked, and both failures are the point.**

*Regex, first attempt.* Splitting selectors on commas broke `:is(a, b)`: the part
`:is(.card-highlight` tested dead, so the line carrying the opening paren was
deleted, and the build failed with `Missing opening (` at `ui-refresh.css:226`. The
build caught it — but a build only catches *syntax*, and the same bug against a
different rule would have produced valid CSS with the wrong meaning.

*postcss `toString()`, second attempt.* Correct output, unreviewable diff: re-emitting
the tree reformatted rules nobody touched, turning a deletion into 2,500 changed
lines. A diff a human cannot read is not a reviewable change.

*What shipped.* postcss parses and **locates** rules; edits are applied to the
original text by byte offset, so untouched formatting survives and multi-line
selector lists stay multi-line. Selector splitting tracks paren, bracket and quote
depth, so `:is()`, `:where()` and `:not()` are safe.

## Evaluation

**200 full-page screenshots — 20 routes including `/landing`, `/login` and
`/register`, five viewports, both themes — compared with `cmp`.**

The first comparison showed 199 identical and one differing: `/imports` at 1366
dark. Re-shooting that route **on the unchanged build** produced a different image
again, so `/imports` renders non-deterministically. The final comparison showed two
differences, both on `/imports`; re-running those two on the final build produced
files **byte-identical to the baseline**. Transient renders, not regressions —
established by re-running rather than by assuming.

| Check | Session start | Now |
|---|---|---|
| `!important` declarations | 1152 | **500** (budget 1200) |
| Class selectors in legacy layers | 943 | **684** |
| Unreachable selectors | 203 | **0** |
| `globals.css` lines | ~7,800 | 5,292 |
| Unloaded stylesheet lines | 1,273 | 0 |

- [x] `check:dead-css` — **exits 0**, and exits 1 when a dead selector is added.
- [x] `check:knowledge`, `check:architecture`, `check:css-ownership`.
- [x] `lint`, `typecheck`, `build`, unit tests **591/591**.
- [x] Cross-device audit.

### Three more tests were guarding dead CSS

On top of the five found in the previous slice:

- `demo-mode-banner.test.ts` — **every CSS test in the file**. They asserted a
  sticky top banner that a floating action button had to out-layer on short
  viewports. `.demo-mode-banner` has zero DOM nodes; the shell renders
  `styles.demoBanner`, which is `margin: 18px auto 0` in normal flow with no
  `position` and no `z-index`; and the FAB was removed by the Calm Ledger redesign.
  The component-level test still holds and stays.
- `mobile-layout.test.ts` — `.table-scroll`, dead, as described above.
- `app-shell-account-access.test.ts` and `ui-refresh.test.ts` — handled in the
  previous slice.

Eight in total across the two slices. None of them could fail.

## Out of scope

**Wiring the gate into CI is one line and is deliberately not done here.**
`AGENTS.md` forbids an autonomous agent changing CI workflows as part of a task.
The script is written, wired to `npm run check:dead-css` and exits non-zero. Adding
it to `.github/workflows/ci.yml` beside the other contract checks is the owner's
call:

```yaml
      - name: Dead CSS contract
        run: npm run check:dead-css
```

Until that line exists the gate only protects people who run it locally.

**Still open, and user-visible** — carried from the previous packet, unchanged:
126px of empty space below the last content on every mobile page, because
`.dashboard` still reserves `calc(56px + 68px)` for a 74px nav and a floating
action button that no longer exists. That rule is live and carries `!important`;
changing it is a layout decision, not a cleanup.

**Also open:** what the demo banner's contract should now be, since it is no longer
sticky and has nothing to collide with.
