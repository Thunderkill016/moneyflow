# Reorganize Inbox/Capture presentation components, no behavior change

**Status:** completed
**Owner:** agent
**Issue/PR:** none yet — Phase 3 pilot slice from `docs/plans/active/repository-consolidation.md`
**Last updated:** 2026-07-28

## Outcome

The Inbox/Capture/Import/Rules "Lab" feature's presentation components live under
`src/components/inbox/`, mirroring the domain module folder that already exists at
`src/lib/inbox/`. No product behavior, route, or export signature changed.

## Repository reconnaissance

### Current behavior

- `src/lib/inbox/` already exists as a domain subfolder (parsers, stores, rules,
  review helpers) — this PR brings the matching presentation components alongside it,
  instead of leaving them flat in `src/components/` mixed with every other domain.
- Before this slice, 13 component files relevant to Inbox/Capture lived directly under
  `src/components/`, alongside ~35 other unrelated components (Accounts, Budgets,
  Reports, Settings, etc.), with no folder signal that they belong together.

### Why these 13 files and not others with similar names

A prior attempt at an "Accounts" domain slice (see `repository-consolidation.md`,
section A discussion in chat) found that grouping by filename prefix alone is unsafe in
this codebase — `mask-account.ts` and `delete-account.ts`/`delete-account-page.tsx`
contain "account" but belong to Inbox-text-masking and Auth/Privacy respectively, not
Wallets. Before moving anything here, each of the 13 files below was verified by
content and by its actual route/import site, not by name:

| File | Verified role | Verified via |
|---|---|---|
| `capture-page.tsx` | `/capture` chooser | `src/app/capture/page.tsx` |
| `capture-paste-page.tsx` | `/capture/paste` | `src/app/capture/paste/page.tsx` |
| `capture-quick-page.tsx` | `/capture/quick` | `src/app/capture/quick/page.tsx` |
| `capture-share-page.tsx` | `/capture/share` | `src/app/capture/share/page.tsx` |
| `capture-upload-page.tsx` | `/capture/upload` | `src/app/capture/upload/page.tsx` |
| `direct-csv-import-page.tsx` | `/imports/direct` | `src/app/imports/direct/page.tsx` |
| `import-preview-page.tsx` | `/imports/[batchId]/preview` | `src/app/imports/[batchId]/preview/page.tsx` |
| `imports-page.tsx` | `/imports` | `src/app/imports/page.tsx` |
| `inbox-page.tsx` | `/inbox` | `src/app/inbox/page.tsx` |
| `rules-page.tsx` | `/rules` | `src/app/rules/page.tsx` |
| `inbox-bulk-bar.tsx` | sub-component, no route | imported only by `inbox-page.tsx` |
| `inbox-review-panel.tsx` | sub-component, no route | imported only by `inbox-page.tsx` |
| `inbox-explain-panel.tsx` | sub-component, no route | imported only by `inbox-review-panel.tsx` |

Every one of the 9 route components has exactly one external importer (its own
`page.tsx`), and the 3 sub-components are imported only within this same group —
confirmed with a repo-wide grep of `@/components/<name>"` before moving anything, so
the blast radius was known and bounded before the first `git mv`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/inbox/*` (new) | New home for the 13 files above | Presentation only; no domain logic moved or changed |
| `src/lib/inbox/*` | Existing domain module folder this now sits alongside | Not touched |
| 9 route `page.tsx` files under `src/app/{capture,imports,inbox,rules}/` | Only their import line changed (`@/components/x` → `@/components/inbox/x`) | No JSX/behavior change |
| `src/lib/capture-upload-performance.test.ts` | Hardcoded `readFileSync("src/components/capture-upload-page.tsx")` broke after the move | Path updated to `src/components/inbox/capture-upload-page.tsx` |

### Existing tests and constraints

- `npm run test` (566/566), `npm run typecheck`, `npm run lint`, `npm run check:knowledge`, `npm run check:architecture` all pass after the move.
- `npm run build` (demo env) succeeds; every affected route (`/capture`, `/capture/paste`, `/capture/quick`, `/capture/share`, `/capture/upload`, `/imports`, `/imports/direct`, `/imports/[batchId]/preview`, `/inbox`, `/rules`) still appears in the route manifest.
- Database/RLS: not touched.
- e2e: no hardcoded component-file-path references found in `e2e/` for any of the 13 files.

### Similar implementation and recent history

- This session's earlier `client-inbox.ts` move (`src/lib/inbox/` → `src/hooks/`) used the same method: grep every importer first, move, fix imports, verify with the full static gate.

### Open questions

None — scope is a pure file relocation plus import-path fixes.

## Research

Not required — internal reorganization using the repository's own existing `src/lib/inbox/` folder as precedent.

## Specification

### Problem

Presentation components for one clearly-bounded feature area (Inbox/Capture/Import/Rules) were flat in `src/components/` next to ~35 unrelated files, while their domain-module counterpart already had a dedicated folder — an inconsistency the target `ARCHITECTURE.md` repository map is meant to resolve one domain at a time.

### User stories

- As an agent or contributor, I can find every Inbox/Capture presentation component in one folder instead of filtering ~48 flat files by name.

### Acceptance criteria

- [x] All 13 files moved to `src/components/inbox/`.
- [x] Every import updated (9 route files + 2 internal cross-references); zero stale `@/components/<old-name>` references remain (verified by repo-wide grep).
- [x] `capture-upload-performance.test.ts`'s hardcoded path updated.
- [x] `check:knowledge`, `check:architecture`, `lint`, `typecheck`, `test` (566/566) all pass.
- [x] `npm run build` succeeds and every affected route still appears in the manifest.
- [x] No JSX, prop, export signature, or route behavior changed.

### Required states

Not applicable — no UI/behavior change, file relocation only.

### Financial and security constraints

- No financial calculation touched.
- No RLS/schema/auth impact.

### Out of scope

- Any other domain (Accounts was considered and explicitly rejected as too small/ambiguous — see reconnaissance above).
- Adding a barrel/index file (not the existing convention in `src/lib/inbox/`, so not introduced here either).
- `src/lib/inbox/*` itself — already correctly organized, untouched.

## Implementation plan

### Architecture fit

Matches `ARCHITECTURE.md`'s existing repository map row: "Route-specific UI nearby its route; UI reused across routes goes in `components/`" — this groups by domain instead, which is the direction the Phase 1 inventory's proposed target structure pointed toward, applied to the one domain where the file count actually justifies a subfolder.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| 13 files | `git mv` from `src/components/*.tsx` to `src/components/inbox/*.tsx` | Co-locate the Inbox/Capture domain's presentation layer |
| 9 route `page.tsx` files | Import path updated | Point at new location |
| `src/lib/capture-upload-performance.test.ts` | Hardcoded path updated | Prevent the one test that broke from staying broken |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| A file with "inbox"/"capture" in its name actually belongs to a different domain (the Accounts-domain lesson) | Verified each of the 13 files by its actual route/import site before moving, not by name alone |
| A hardcoded file-path string in a test breaks silently | Full `npm run test` run caught exactly one (`capture-upload-performance.test.ts`); fixed |
| A stale import survives the sed pass | Repo-wide grep for every old `@/components/<name>"` pattern after the move confirmed zero hits |
| Build-time route resolution breaks even though typecheck/lint pass | Ran a full `npm run build` and confirmed every affected route is still in the manifest |

### Verification plan

- Static: `check:knowledge`, `check:architecture`, `lint`, `typecheck` — all pass.
- Unit/domain: `npm run test` (566/566) — pass, including the one path fix.
- Database: not applicable.
- Browser flow: not run in this session (no behavior change, no new UI state) — recommend a browser smoke pass before merge as normal PR hygiene, per `AGENTS.md`.
- Production/manual: not applicable pre-merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Verify each of the 13 candidate files by content/route, not name | none | reconnaissance table above | done |
| T2 | `git mv` all 13 files into `src/components/inbox/` | T1 | git history | done |
| T3 | Fix all import references (9 external + 2 internal) | T2 | repo-wide grep, zero stale hits | done |
| T4 | Fix the one broken hardcoded test path | T3 | `capture-upload-performance.test.ts` diff | done |
| T5 | Run full static + unit + build verification | T4 | this session's command output | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| All imports updated, none stale | repo-wide grep for old paths | pass (zero hits) |
| Static gates | `check:knowledge`, `check:architecture`, `lint`, `typecheck` | pass |
| Unit tests | `npm run test` | pass (566/566) |
| Production build | `npm run build` (demo env) | pass, all 10 affected routes present |

### Review findings

- Correctness: pure relocation; no JSX/logic edited beyond import paths and one test's file-path string.
- Security/ownership: no impact.
- UI/UX/accessibility: unchanged (verify with a browser smoke pass before merge, as normal PR hygiene — not run automatically in this session).
- Maintainability: Inbox/Capture domain now has one home for both its domain modules (`src/lib/inbox/`) and presentation (`src/components/inbox/`).
- Scope compliance: exactly the 13 verified files; explicitly did not attempt the ambiguous "Accounts" grouping.

### Remaining limitations

- No browser/e2e run was performed in this session to visually confirm the affected routes; `npm run test:e2e` and a manual pass through `/capture/*`, `/imports/*`, `/inbox`, `/rules` is recommended before merge.
- This is one domain out of several candidates in the original reorg proposal; Ledger/Transactions, Reporting, and Planning domains remain unstarted and were explicitly deprioritized (Ledger especially, given its financial-invariant risk).

## Delivery record

- Branch: `claude/doc-du-an-qnj7ya`
- PR: #108 — merged 2026-07-28
- Squash commit: `0c5d51b55c6d052b711df3a8dbf1f3647c6d3f56`
- CI run: PR #108 head — `database`, `verify`, `e2e` all green
- Production deployment: merged to `main`
- Production flow verified: owner confirmed a manual browser/production check of the affected routes (`/capture/*`, `/imports/*`, `/inbox`, `/rules`) after merge
- Work packet moved to `docs/plans/completed/`: yes
