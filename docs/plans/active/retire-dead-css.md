# Retire dead CSS, in evidence-backed clusters

## Outcome

Global CSS no longer carries rules for markup that does not exist, and the
detection is repeatable rather than a one-off list.

Status: `specified`. Not implemented.

## Repository reconnaissance

Measured against `main` at `5423d5d`. Class selectors extracted from each legacy
layer, comments stripped, then matched against every `.tsx/.ts/.js/.mjs/.html/.md`
file under `src/`, `e2e/`, `tests/` and `scripts/` by bare-token search:

| Layer | Classes | Unreferenced |
|---|---|---|
| `src/app/globals.css` | 803 | **179** |
| `src/app/ui-refresh.css` | 64 | **19** |
| `src/app/ai-uiux-refresh.css` | 35 | 3 |
| `src/app/benchmark-ux.css` | 15 | 2 |
| `src/app/cross-device-stabilization.css` | 11 | 0 |
| `src/app/ai-uiux-guardrails.css` | 11 | 0 |
| `src/app/safe-to-spend-withdrawal.css` | 4 | 0 |
| **Total** | **943** | **203** |

Strongest single cluster: **16 `auth-*` classes** in `globals.css`
(`auth-page`, `auth-story`, `auth-card`, `auth-brand`, `auth-panel`,
`auth-privacy`, `auth-submit`, `auth-switch`, `auth-trust`, `auth-divider`,
`auth-message`, `auth-description`, `auth-mobile-brand`, `auth-privacy-label`,
`auth-privacy-link`, `auth-orbit`). The auth screens moved to
`src/components/auth-form.module.css`; `auth-form.tsx` renders `styles.*`
throughout, so no `auth-` global class reaches the DOM.

## Research

**The first measurement was wrong, and the way it was wrong is the whole point.**

A plain token search reported 225 unreferenced classes. Inspecting the list showed
names that look assembled rather than authored — and they were:

```tsx
// src/components/categories-page.tsx:74
<div className={`account-kind-icon category-kind-${item.kind}`}>
// src/components/dashboard/dashboard-overview-sections.tsx:78
className={`attention-chip attention-chip-${item.tone}`}
```

`category-kind-expense`, `category-kind-income`, `attention-chip-info`,
`attention-chip-neutral` and `attention-chip-warning` are **live** and were
reported dead. Re-running with runtime-completed prefixes excluded gives 203, with
17 reclassified as live.

This repo completes class names at runtime in **32 distinct prefixes**:

```
moneyflow- theme- category-kind- attention-chip- budget-status- kind- fmt-
imports-status- days- goal- allocation- planning-card-- ret- budget- bill-
cand- imp- rule- moneyflow-commitment-due- demo-category- tx- keyboard-
minimum-target-size- insights- safe-02-login- safe-04-budget- safe-05-goal-
safe-06b-weekly- safe-04-05-06- safe-09-day-total- quick-capture-rich-input-
```

So any deletion driven by a static list is dangerous by default.

**No gate catches a wrong deletion.** This is the reason this task is specified
carefully rather than handed over as a list of 203 names. Removing a live CSS rule
does not fail `lint`, `typecheck`, `test`, `build`, `test:db`, `test:e2e` or the
cross-device audit — the audit measures overflow, target size and clipped money,
none of which a missing colour, border or spacing rule affects. The page renders,
the tests pass, and the styling is quietly gone.

## Specification

1. A repeatable detector exists, with runtime-prefix exclusion built in, so the
   next person does not re-derive the method or repeat the 225-vs-203 mistake.
2. Only clusters with positive evidence of replacement are removed — a named
   owner that took over, such as a CSS Module for the same screen.
3. Every removed cluster is verified by before/after screenshots of the routes
   that used it, at 320, 390 and 1366, in both themes.
4. `!important` count and `unauthorizedDocumentSelectors` do not increase.
5. No route's rendering changes. This is removal of unreachable rules, not a
   restyle.

## Implementation plan

Recommended order. **Do not attempt all 203 in one change.**

- Add `scripts/check-dead-css.mjs` following the existing `scripts/check-*.mjs`
  convention: extract class selectors, strip comments, exclude names matching a
  runtime prefix, and report. Wire it as `npm run check:dead-css` reporting only
  — **not** as a failing gate, because 203 unreferenced classes exist today and a
  blocking check would be red from the first commit.
- Remove the `auth-*` cluster first (16 classes). It has the strongest evidence: a
  named replacement module for the same screen.
- Then the `.app-shell` / `.sidebar` / `.topbar` families, already recorded as
  task 7 of `docs/plans/active/minimum-target-size.md` and left out of #159
  deliberately. Same evidence shape: the shell moved to
  `app-shell.module.css` and renders `styles.shell`. Confirm that module owns the
  background and `min-height` before deleting the globals that claim them.
- Stop there and reassess. The remaining ~150 have no cluster story yet and each
  needs its own evidence.

Risks:

- A class may be referenced only from a place the detector does not read — a
  Markdown doc rendered at runtime, a server-generated string, an email template.
  The detector already includes `.md`; widen it rather than assume.
- **The detector does not read `*.module.css`, and five modules target legacy
  global names through `:global(...)`**: `accounts-page`, `transactions-page`,
  `reports-page`, `mobile-shell-contract` and `minimum-target-size-contract`.
  Examples in use: `:global(.account-card)`, `:global(.accounts-summary)`,
  `:global(.avatar)`, `:global(.budget-category-actions button)`,
  `:global(.capture-paste-back)`, `:global(.commitment-actions button)`.

  This does not create false "dead" verdicts — a `:global` rule styles a class but
  does not put it in the DOM. The hazard is the reverse: a module may override only
  part of a legacy rule (a border colour, say) while depending on the base rule for
  layout. Deleting the base then breaks the module's intent even though the class
  is live. So before removing any rule, grep `*.module.css` for the same selector
  and check whether a module is layering on top of it.
- Screenshots must be compared, not merely captured. A screenshot attached and
  unviewed is not evidence.

## Tasks

1. Add `scripts/check-dead-css.mjs` and the `check:dead-css` script, reporting
   only.
2. Remove the 16 `auth-*` classes from `globals.css`; verify `/login`,
   `/register`, `/forgot-password`, `/update-password` unchanged by screenshot.
3. Remove the dead `.app-shell` / `.sidebar` / `.topbar` families; verify the
   authenticated shell unchanged by screenshot. Closes task 7 of the
   minimum-target-size packet.
4. Report the remaining count and stop. Do not delete what has no evidence.

## Evaluation

Required evidence:

- [ ] `check:dead-css` runs and reports; state the before and after counts.
- [ ] Before/after screenshots for every route touched, at 320, 390 and 1366, in
      both themes, **reviewed** and the comparison stated in the PR.
- [ ] `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint`,
      `typecheck`, unit tests, `build`.
- [ ] `test:e2e` and `test:ui-audit:pr`.
- [ ] An explicit statement that no `:global(...)` rule in any `*.module.css`
      referenced a deleted name.

State which gates ran and which could not. Note plainly that the browser gates
cannot prove this change is safe — only the screenshot comparison can.
