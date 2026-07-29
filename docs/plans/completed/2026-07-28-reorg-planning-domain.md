# Reorganize Planning domain (budgets/commitments/goals/income-templates), no behavior change

**Status:** completed
**Owner:** agent
**Issue/PR:** none yet — Phase 3 slice from `docs/plans/active/repository-consolidation.md`
**Last updated:** 2026-07-28

## Outcome

The Planning domain — budgets, recurring commitments, goals and recurring income
templates, exactly as `ARCHITECTURE.md`'s "Domain boundaries" section defines Planning —
has its presentation components under `src/components/planning/` and its domain modules
under `src/lib/planning/`, mirroring the `src/components/inbox/` + `src/lib/inbox/`
pattern from the prior slice. No product behavior, route, or export signature changed.

## Repository reconnaissance

### Current behavior

Before this slice, 9 Planning components and 13 Planning lib files (including tests)
were flat in `src/components/` and `src/lib/` respectively, mixed with every other
domain's files.

### Scope decisions — what moved and, more importantly, what did not

The prior Inbox slice already found that filename similarity is unsafe in this
codebase; this slice hit two more cases of the same problem, checked before moving
anything:

| File | Looked like it belonged | Verified role | Included? |
|---|---|---|---|
| `src/lib/performance-budgets.test.ts` | Budgets (financial) | Lighthouse LCP/CLS performance budgets (`TASK-132`) — an unrelated meaning of "budget" | **No** |
| `src/lib/planning-pages.ts` / `.test.ts` | Planning domain | Shared card-shell/tone/threshold contract used by `budgets-page.tsx`, `commitments-page.tsx`, `goals-page.tsx`, **and** `categories-page.tsx` — `ARCHITECTURE.md` does not list Categories under Planning, so this file can't be owned by Planning alone | **No** — left in place; only its hardcoded string paths to the 4 moved files were updated |
| `src/lib/dashboard-planning-empty.ts` | Planning domain | Imported only by `src/components/dashboard/dashboard-planning-sections.tsx` and `dashboard-overview-sections.tsx` — Dashboard-route-owned per `ARCHITECTURE.md`, not the Planning pages themselves | **No** |
| `src/components/planning-card-empty.tsx` | Planning domain (name matches `planning-card.tsx`) | Imported only by `dashboard/dashboard-planning-sections.tsx` — Dashboard-owned | **No** |
| `src/lib/insights-planning-empty.ts` (+ `.test.ts`) | Planning domain | **Zero importers anywhere in `src`** — appears to be dead code left over from the pre-`/dashboard`-migration era | **No** — flagged below as a separate finding, not deleted (deletion is a different action requiring its own decision) |
| `src/lib/insights-goals-card.test.ts` | Planning/Goals | Reads `src/lib/goals.ts` and `src/app/dashboard/page.tsx` directly — a Dashboard/Goals integration contract, not a pure Goals-domain unit test | **No** — left in place; its hardcoded path to `goals.ts` was updated since that file did move |

What actually moved (22 files, all verified by import-site/content, not name):

- Components (9): `budget-dialog.tsx`, `budgets-page.tsx`, `commitment-dialog.tsx`, `commitments-page.tsx`, `goal-dialogs.tsx`, `goals-page.tsx`, `income-template-dialog.tsx`, `income-templates-page.tsx`, `planning-card.tsx` (verified: `planning-card.tsx` is imported only by the three `*-page.tsx` files above, never by `categories-page.tsx`).
- Lib (13): `budgets.ts`/`.test.ts`, `commitments.ts`/`.test.ts`, `goals.ts`/`.test.ts`, `income-templates.ts`/`.test.ts`, `commitment-due-notify.ts`/`.test.ts`, `commitment-occurrence-store.ts`/`.test.ts`, `income-template-store.ts`.

`src/server/{budgets,commitments,goals,income-templates}.ts` were left where they are —
same decision as the Inbox slice's treatment of `src/server/inbox.ts` and
`src/app/actions/inbox.ts`: single well-named files per domain, no subfolder needed yet.

### A hard lesson: `@/` aliases are unsafe inside `src/lib`

The first pass of this slice converted every relative import that crossed the new
`src/lib/planning/` boundary to the `@/lib/...` alias form, matching what the prior
`client-inbox.ts` move (Inbox slice, `src/hooks/`) had done successfully. That broke
`npm run test`: the test script is `node --experimental-strip-types --test
src/lib/*.test.ts src/lib/*/*.test.ts` — **plain Node's ESM loader, which has no
knowledge of the `tsconfig.json` `@/` path alias**. `tsc`/ESLint/Next's bundler all
resolve `@/` fine, so `check:knowledge`, `check:architecture`, `lint` and `typecheck`
all passed clean on the broken version — only `npm run test` caught it, with
`ERR_MODULE_NOT_FOUND: Cannot find package '@/lib'`.

The fix: everywhere inside `src/lib/**`, cross-references must stay relative with an
explicit `.ts` extension (`../sample-data.ts`, `./planning/budgets.ts`, etc.), exactly
matching the convention already used by every existing `src/lib` file before this
slice touched it. `@/` aliases remain correct and required in `src/components`,
`src/hooks`, `src/app` and `src/server` — those are only ever consumed through the
Next.js/TypeScript toolchain, never executed directly by the plain-Node test runner.
**This is now the load-bearing rule for any future move that crosses a folder boundary
inside `src/lib`.**

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/attention.ts` / `.test.ts` (stays in `src/lib/`) | Imported `./budgets.ts` and `./commitments.ts` by relative path | Updated to `./planning/budgets.ts`, `./planning/commitments.ts` |
| `src/lib/delete-account.ts` (stays) | Imported `./commitment-occurrence-store.ts` and `./income-template-store.ts` | Updated to `./planning/commitment-occurrence-store.ts`, `./planning/income-template-store.ts` |
| `src/lib/money-invariants.test.ts`, `src/lib/transfer-expense-contract.test.ts` (stay) | Imported `./budgets.ts` | Updated to `./planning/budgets.ts` |
| `src/lib/push-client.ts` (stays) | Imported `./commitment-due-notify.ts` | Updated to `./planning/commitment-due-notify.ts` |
| `src/lib/planning-pages.test.ts` (stays, out of scope for the move itself) | Hardcoded `readFileSync`/`assert.match` paths to 4 of the moved files, including one `assert.match(source, /from "@\/components\/planning-card"/)` regex asserting the *old* import string | All 5 path references updated; the import-string regex updated to `@\/components\/planning\/planning-card` |
| `src/lib/insights-goals-card.test.ts` (stays) | Hardcoded `join(process.cwd(), "src/lib/goals.ts")` | Updated to `src/lib/planning/goals.ts` |

### Existing tests and constraints

- `npm run test`: 566/566 pass (caught 8 broken relative/hardcoded references across two rounds: the alias mistake above, plus the `planning-pages.test.ts` import-string regex).
- `npm run typecheck`, `npm run lint`, `npm run check:knowledge`, `npm run check:architecture`: all pass.
- `npm run build` (demo env): succeeds; all 41 routes present in the manifest, including `/budgets`, `/commitments`, `/goals`, `/income-templates`.
- Database/RLS: not touched.

### Similar implementation and recent history

- Direct continuation of the Inbox slice's method (verify by content/import-site, move, fix imports, run the full static+unit+build gate) — this slice additionally surfaces the `src/lib` relative-import constraint that the Inbox slice's move into `src/hooks/` never exercised, because `src/hooks/**` isn't part of the plain-Node test glob.

### Open questions

- [ ] `src/lib/insights-planning-empty.ts` and its test appear to be dead code (zero importers found anywhere in `src`). Not deleted here — flagged for a separate, explicit decision.

## Research

Not required — internal reorganization, same method as the prior Inbox slice.

## Specification

### Problem

Planning-domain presentation and lib files were flat alongside ~40 unrelated files each, with no folder signal that they form one product-defined domain (`ARCHITECTURE.md` already names "Planning" as a boundary).

### User stories

- As an agent or contributor, I can find every Planning-domain file (budgets/commitments/goals/income-templates) in two matching folders instead of filtering flat directories by name.

### Acceptance criteria

- [x] 22 files moved into `src/components/planning/` and `src/lib/planning/`.
- [x] Every import (external + internal, alias + relative) updated; zero stale references confirmed by repo-wide grep.
- [x] Two hardcoded-path test files that stayed in place (`planning-pages.test.ts`, `insights-goals-card.test.ts`) had their string paths updated.
- [x] `check:knowledge`, `check:architecture`, `lint`, `typecheck`, `test` (566/566) all pass.
- [x] `npm run build` succeeds with all affected routes present.
- [x] Files that merely share a name but not a domain (`performance-budgets.test.ts`, `planning-pages.ts`, `dashboard-planning-empty.ts`, `planning-card-empty.tsx`) were explicitly excluded with a documented reason, not moved by default.

### Required states

Not applicable — no UI/behavior change.

### Financial and security constraints

- No financial calculation touched — only file location and import paths changed.
- No RLS/schema/auth impact.

### Out of scope

- `src/lib/planning-pages.ts`, `dashboard-planning-empty.ts`, `planning-card-empty.tsx`, `insights-goals-card.test.ts` — deliberately left in place (see scope table above).
- Deleting the apparently-dead `insights-planning-empty.ts` — flagged, not acted on.
- `src/server/{budgets,commitments,goals,income-templates}.ts` — left as single top-level files, consistent with the Inbox slice's treatment of `src/server/inbox.ts`.

## Implementation plan

### Architecture fit

Matches the Inbox slice's precedent and `ARCHITECTURE.md`'s named "Planning" domain boundary exactly.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| 22 files | `git mv` into `src/components/planning/` / `src/lib/planning/` | Co-locate the Planning domain |
| 4 external route files (`app/{budgets,commitments,goals,income-templates}/page.tsx`) | Import path updated | Point at new component location |
| `src/server/*.ts`, `src/app/actions/*.ts`, `src/components/moneyflow-dashboard.tsx`, `src/components/dashboard/dashboard-planning-sections.tsx` | Import path updated (`@/lib/x` → `@/lib/planning/x`, `@/components/x` → `@/components/planning/x`) | These consumers are outside `src/lib`, so `@/` aliases remain correct here |
| `src/lib/attention.ts`/`.test.ts`, `delete-account.ts`, `money-invariants.test.ts`, `transfer-expense-contract.test.ts`, `push-client.ts` | Relative import path recalculated (`./x.ts` → `./planning/x.ts`) | These stay inside `src/lib`, where relative paths are mandatory for the plain-Node test runner |
| `src/lib/planning-pages.test.ts`, `insights-goals-card.test.ts` | Hardcoded string paths updated | Point at the new file locations without moving the test files themselves |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Filename-based misclassification (the Accounts-slice lesson repeating) | Verified every candidate's actual importers/content before moving; explicitly excluded 6 name-alike files with documented reasons |
| `@/` alias breaking the plain-Node test runner inside `src/lib` | Caught by `npm run test` (not by typecheck/lint, which both passed on the broken version); fixed and now documented as a hard rule for future `src/lib` moves |
| A hardcoded test string surviving the move | Repo-wide grep for every old `@/components/...`/`@/lib/...` string across `*.test.ts` after the fix, plus a full green `npm run test` |
| Build-time route resolution breaking silently | Ran a full `npm run build`; confirmed all 41 routes, including the 4 Planning routes |

### Verification plan

- Static: `check:knowledge`, `check:architecture`, `lint`, `typecheck` — pass.
- Unit/domain: `npm run test` — pass, 566/566, after fixing the alias mistake and the hardcoded regex.
- Database: not applicable.
- Browser flow: not run in this session — recommend `npm run test:e2e` and a manual pass through `/budgets`, `/commitments`, `/goals`, `/income-templates` before merge.
- Production/manual: not applicable pre-merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Verify each candidate file by content/import-site; exclude 6 false-friends with documented reasons | none | scope table above | done |
| T2 | `git mv` 22 files into `src/components/planning/` and `src/lib/planning/` | T1 | git history | done |
| T3 | Fix all `@/` alias references outside `src/lib` | T2 | repo-wide grep, zero stale hits | done |
| T4 | Fix all relative references inside `src/lib` (discovered the alias-in-lib bug via `npm run test`, corrected) | T2 | `npm run test` 566/566 | done |
| T5 | Fix hardcoded string paths in `planning-pages.test.ts` and `insights-goals-card.test.ts` | T2 | `npm run test` 566/566 | done |
| T6 | Full static + unit + build verification | T3, T4, T5 | this session's command output | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| All imports updated, none stale | repo-wide grep, both alias and relative forms | pass |
| Static gates | `check:knowledge`, `check:architecture`, `lint`, `typecheck` | pass |
| Unit tests | `npm run test` | pass (566/566) |
| Production build | `npm run build` (demo env) | pass, 41/41 routes present |

### Review findings

- Correctness: pure relocation; the one substantive lesson (alias-vs-relative inside `src/lib`) is now documented for future slices.
- Security/ownership: no impact.
- UI/UX/accessibility: unchanged; recommend a browser smoke pass before merge.
- Maintainability: Planning domain now has matching `components/planning/` and `lib/planning/` homes; false-friend files were kept out rather than force-fit.
- Scope compliance: exactly the 22 verified files; 6 name-alike files explicitly excluded with reasons on record.

### Remaining limitations

- No browser/e2e run performed in this session.
- `insights-planning-empty.ts` (+ test) appears dead but wasn't deleted — separate decision needed.
- `src/lib/planning-pages.ts` remains a cross-cutting file shared by Categories and Planning; it was correctly left in place, but it means "Planning" and "Categories" are not fully independent domains at the presentation layer — worth knowing before any future Categories-domain slice.
- Reporting and Ledger/Transactions domains remain unstarted; Ledger should stay last given its financial-invariant risk.

## Delivery record

- Branch: `claude/doc-du-an-qnj7ya`
- PR: #108 — merged 2026-07-28
- Squash commit: `0c5d51b55c6d052b711df3a8dbf1f3647c6d3f56`
- CI run: PR #108 head — `database`, `verify`, `e2e` all green
- Production deployment: merged to `main`
- Production flow verified: owner confirmed a manual browser/production check of the affected routes (`/budgets`, `/commitments`, `/goals`, `/income-templates`) after merge
- Work packet moved to `docs/plans/completed/`: yes
