# CSS token single source of truth (Phase 1 follow-up)

**Status:** evaluating — implemented, verified in dev; CI and production verification pending
**Owner:** MoneyFlow / Claude Code
**Issue/PR:** #114 (see PR body for full detail)
**Last updated:** 2026-07-28

## Outcome

`document-theme.css`'s header comment already claimed to be "the only non-legacy owner" of theme tokens. It wasn't true: `globals.css` had two separate `:root` blocks (plus a `[data-theme="dark"]` block, plus a band-aid restoration block added earlier this session) that redefined the same `--color-*`/`--shadow-*` custom property names with different hex values, silently overriding each other by source order rather than intent. This made the ownership claim in the doc comment false, and was the root cause of a real dark-mode invisible-text bug fixed earlier as a band-aid rather than at the source.

This change makes the claim true: every `--color-*`/`--shadow-*` name in `globals.css` is now an alias to a `--mf-*` token in `document-theme.css`, which is the single place light/dark values are defined.

## Repository reconnaissance

### Current behavior

Three generations of the same token names coexisted:

1. `globals.css` `:root` (line 8, labeled "source of truth... see docs/design-system.md") — already didn't match `docs/design-system.md` itself (doc says `--color-accent-default: #3B82F6` blue; this block says `#12633C` green).
2. `globals.css` second `:root` ("UI REFRESH — visual quality pass, 2026-07-15", ~line 6481) — redefined the same property names with different values, undocumented anywhere, and because it came later in the same file with equal `:root` specificity, it silently won for the whole document in light mode.
3. `document-theme.css` `--mf-*` — a separate, complete, coherently-designed light/dark pair, used by ~153 newer Calm Ledger call sites in parallel with ~871 call sites still using `--color-*`.

Dark mode was patched earlier this session (see git history, "DARK THEME TOKEN RESTORATION" comment) by re-declaring the original block's dark values *last* so they'd win over block 2's — a band-aid, not a fix. This meant light mode and dark mode were, until this change, drawing from two different, unrelated lineages of the token system (light from generation 2, dark from generation 1-as-restored).

Verified via: `grep` for `:root`/`html`/`body` selectors across all root CSS files, reading each competing block in full, checking real consumer call sites (not just definitions) for ambiguous roles (e.g. `--surface: var(--color-bg-primary)` confirmed `bg-primary`'s true role before mapping it), cross-checking `docs/design-system.md` against both blocks, and confirming `--color-accent-gradient`/`--color-text-disabled` have zero consumers project-wide before dropping/aliasing them.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
| --- | --- | --- |
| `src/app/document-theme.css` | Declared single owner of theme tokens | Change: added 8 missing `--mf-*-text` tokens (light+dark) |
| `src/app/globals.css` | Actual second/third owner in practice | Change: `--color-*`/`--shadow-*` now `var(--mf-*)` aliases; both duplicate override blocks removed |
| `docs/design-system.md` | Claims to document the `--color-*` values | Avoid for now: already stale (documents blue accent); not corrected in this change, noted as a follow-up |

### Existing tests and constraints

- Related unit tests: none assert on the removed blocks' exact hex values (checked via grep before editing).
- Database/RLS tests: not applicable (CSS-only change).
- Browser tests: no automated visual-regression gate exists for token values; verification here was manual Playwright screenshots, not a new automated gate — a real gap this doesn't close.
- Product/architecture rules: `docs/audits/uiux-whole-project-2026-07-27.md` (public repo, draft PR #2, not merged here) — P0.2 "document canvas and theme have multiple owners" is the finding this directly addresses.

### Similar implementation and recent history

The "DARK THEME TOKEN RESTORATION" block this change removes was itself an earlier same-session fix for the visible symptom (invisible text in dark mode) without addressing the underlying duplicate-ownership cause. This change replaces that band-aid with the root-cause fix it always intended to be superseded by.

### Open questions

- Whether to migrate the ~871 existing `--color-*` call sites to `--mf-*` directly, or keep `--color-*` as a permanent compatibility alias layer — left open, see Follow-ups.

## Research

### Questions researched

1. Which of the three coexisting token generations is actually rendering in production today, and which does `docs/design-system.md` claim is canonical?
2. Does `document-theme.css`'s `--mf-*` system have full role coverage for every `--color-*` name in use, or are there gaps?
3. Are any of the seemingly-dead tokens (`--color-accent-gradient`, `--color-text-disabled`) actually consumed anywhere?

### Sources

- Direct `grep`/`Read` of `src/app/globals.css`, `src/app/document-theme.css`, `docs/design-system.md`.
- `docs/audits/uiux-whole-project-2026-07-27.md` (public repo draft PR #2) for the P0.2 problem framing (external prior art, not a merged source of truth in this repo).

### Alternatives considered

| Direction | Reason not chosen |
| --- | --- |
| Keep the original `design-system.md`-labeled block as canonical | Would change colors currently rendering in production (higher risk, no clear benefit); doc itself is already stale (documents blue accent, not green) |
| Migrate all ~871 call sites to `--mf-*` directly in this same change | Much larger diff, much higher regression risk, no additional correctness benefit over aliasing at the definition site; deferred as a follow-up |

### Research decision

Canonical system is `--mf-*` — explicit owner decision (asked directly rather than assumed), matching the whole-project audit's own long-term direction.

## Specification

### Problem

`--color-*`/`--shadow-*` custom properties are defined in three places with different values and no single owner, contradicting `document-theme.css`'s own header comment and causing real, previously-patched visual bugs.

### User stories

- As a developer editing a color token, I can change it in exactly one place and have it apply correctly in both themes, everywhere.
- As a user, dark mode and light mode read as one coherent visual system rather than two different token generations stitched together.

### Acceptance criteria

- [x] Every `--color-*`/`--shadow-*` name in `globals.css` resolves through `var(--mf-*)`, not a hardcoded hex value.
- [x] No `:root`/`[data-theme="dark"]` block outside `document-theme.css` redefines a `--mf-*`-backed color or shadow value.
- [x] `--color-accent-gradient` (zero consumers, contradicts brand no-gradient rule) removed.
- [x] All previously-covered semantic roles (`-text` variants, `text-inverse`, `text-disabled`) still resolve to a defined value.
- [x] `--radius-lg`/`--radius-xl` visual behavior unchanged (explicitly out of scope).
- [ ] Production-mode visual verification (deferred to owner).

### Required states

Light and dark theme, verified on: dashboard, transactions, accounts, budgets, settings (representative sample across primary nav).

### Financial and security constraints

None directly — presentation-only change, no data/API/RLS/calculation surface touched.

### Out of scope

- Migrating individual `--color-*` call sites to `--mf-*`.
- `--radius-lg`/`--radius-xl` reconciliation.
- `html`/`body{}` single-ownership (still split across files).
- `docs/design-system.md` correction.

## Implementation plan

### Architecture fit

Fits directly into the audit's Phase 1 ("CSS ownership and document primitives") — specifically closes the gap between what `document-theme.css` already claimed and what was actually true.

### Planned changes

- `src/app/document-theme.css`: add `--mf-income-text`, `--mf-expense-text`, `--mf-transfer-text`, `--mf-warning-text` (light + dark), reusing the legacy `-text` hex values verbatim (already shipped, already visually verified) rather than designing new ones.
- `src/app/globals.css`: rewrite the primary `:root` block's color/shadow properties as `var(--mf-*)` aliases; add a small `[data-theme="dark"] { --lime: ... }` override (the one token with no `--mf-*` counterpart, single consumer); delete the "UI REFRESH" `:root` block's color/shadow properties (keeping its `--radius-lg`/`--radius-xl` override, explicitly out of scope); delete the "DARK THEME TOKEN RESTORATION" band-aid block entirely.

### Data and migration impact

None — CSS custom properties only, no data migration.

### Risks and counterexamples

| Risk | Control |
| --- | --- |
| Some `--color-*` role has no clean `--mf-*` counterpart, causing a silent wrong-color regression | Checked real consumer call sites (not just docs) for every ambiguous role before mapping; added new `--mf-*-text` tokens for the 4 roles that had no counterpart |
| Deleting the "UI REFRESH" block also silently reverts `--radius-lg`/`--radius-xl` | Explicitly preserved those two properties standalone, documented why |
| Visual regression in dark mode specifically (the exact failure mode of the bug being fixed) | Manual screenshot verification in both themes across 5 representative pages before considering this done |

### Verification plan

`check:knowledge`, `lint`, `typecheck`, `test`, `build`, then manual Playwright screenshots in both themes across representative pages, reviewed directly (not assumed from passing gates).

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| T1 | Map every `--color-*`/`--shadow-*` role to a `--mf-*` counterpart via real usage, not guesswork | done |
| T2 | Add missing `--mf-*-text` tokens to `document-theme.css` | done |
| T3 | Alias `globals.css` primary `:root` to `--mf-*` | done |
| T4 | Remove duplicate "UI REFRESH" token block (keep unrelated radius override) | done |
| T5 | Remove now-unnecessary "DARK THEME TOKEN RESTORATION" band-aid | done |
| T6 | Run static gates (knowledge/lint/typecheck/test/build) | done |
| T7 | Manual visual verification, both themes, 5 pages | done |
| T8 | CI, PR review, production verification | pending |

## Evaluation

### Acceptance evidence

- `npm run check:knowledge` / `lint` / `typecheck` / `test` (578/578) / `build` (`NEXT_PUBLIC_APP_MODE=demo`) all pass.
- Manual Playwright screenshots, dev server, both `data-theme="light"` and `data-theme="dark"`, across `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/settings` — reviewed each image directly for correct contrast, no invisible text, no broken color. All clean.

### Review findings

- Caught and fixed a self-introduced CSS syntax error during implementation (a code comment containing a literal `*/` sequence prematurely closed itself, breaking the entire stylesheet) via the dev-server error output before it reached verification — not shipped.
- Confirmed via direct usage grep (not assumption) that `--color-accent-gradient` and `--color-text-disabled` were already fully dead before touching them.

### Remaining limitations

- Not done: production-mode (`next build && next start`) screenshot pass; CI run on the actual PR; owner production verification. Per `AGENTS.md`, this is `implemented` and dev-`verified`, not yet `deployed` or `accepted`.
- See Follow-ups below for explicitly deferred work.

## Delivery record

- Branch: `fix/css-token-single-source-of-truth`
- PR: #114
- CI: pending at time of writing
- Production deployment: pending merge and owner verification

## Follow-ups (explicitly out of scope here)

1. Migrate the ~871 individual `var(--color-*)` call sites to `var(--mf-*)` directly (this change only fixed the token *definitions*; the compatibility alias layer is intentionally permanent-shaped, per the audit's own "legacy compatibility layer with explicit allowlist" pattern — migrating call sites is optional future cleanup, not required for correctness).
2. Reconcile `--radius-lg`/`--radius-xl` (three different currently-defined pairs across the codebase).
3. Single-owner `html`/`body{}` rules (still split across `globals.css` and `document-theme.css`).
4. Reconcile the `-text` token hue families (`--mf-income-text` etc. are teal-adjacent-but-not-exactly-matching `--mf-income`'s own hue — noted in `document-theme.css`).
