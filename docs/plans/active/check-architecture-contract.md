# Enforce the lib/component/server ownership boundary in CI

**Status:** implementing
**Owner:** agent
**Issue/PR:** none yet — follow-up from `docs/plans/active/repository-consolidation.md` (Phase 1 inventory, section D/T5)
**Last updated:** 2026-07-28

## Outcome

A `npm run check:architecture` script, wired into CI before lint/typecheck, fails the
build if `src/lib/**` takes a real (non-type-only) import from `@/app`, `@/components`
or `@/server`, or if `src/components/**` imports `@/lib/supabase` or `@/server/**`
outside a `import type` statement. This turns `ARCHITECTURE.md`'s existing prose rule
("lib must not import app, components or server") into a contract nothing can silently
regress, the way `client-inbox.ts` did before this session moved it to `src/hooks/`.

## Repository reconnaissance

### Current behavior

- `ARCHITECTURE.md`'s "Domain boundaries"/"Financial invariants" sections already state
  the ownership rule in prose, but nothing enforces it mechanically today.
- The Phase 1 inventory (`docs/plans/active/repository-consolidation.md`, section D)
  found and fixed the one real violation (`client-inbox.ts`), leaving `src/lib` clean
  except one harmless `import type { IconName } from "@/components/icons"` in `nav-ia.ts`.
- Re-checked just now: `src/components` has zero value imports of `@/lib/supabase`, and
  exactly one `@/server` import (`reports-page.tsx`), which is also `import type`.
  Both proposed rules pass cleanly against the current tree — this packet adds a gate,
  it does not need to fix anything else first.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/check-project-knowledge.mjs` | Existing dependency-free Node contract script in the same style (no ESLint plugin, no new dependency) | Reuse the same pattern: plain `node:fs`/`node:path`, `failures[]` array, non-zero exit |
| `package.json` scripts | Where `check:*` scripts are registered | Add `check:architecture` next to `check:knowledge`/`check:css-ownership` |
| `.github/workflows/ci.yml` `verify` job | Runs static contracts before lint/typecheck | Add one step, same position as the other `check:*` steps |
| `ARCHITECTURE.md` "Verification layers" | Documents which command proves which layer | Add `check:architecture` to the "Static contract" row |

### Existing tests and constraints

- No existing test enforces this; this packet's own "test" is the script running clean
  against the current tree plus a couple of inline self-checks (see Verification plan).
- Database/RLS: not touched.
- Browser tests: not touched.

### Similar implementation and recent history

- `scripts/check-css-ownership.mjs` is the nearest precedent: a repo-specific static
  contract, dependency-free, run in CI, that turns a design rule into a gate.

### Open questions

None — scope is intentionally narrow (two mechanical import-direction rules over
`src/lib` and `src/components`), not a general-purpose ESLint boundary plugin.

## Research

Not required — internal tooling decision using the repository's own existing script
style as precedent.

## Specification

### Problem

The `lib`/`components`/`server` ownership rule exists only as prose in `ARCHITECTURE.md`.
Nothing stops a future change from re-introducing a `lib → app` or `components → server`
value import the way `client-inbox.ts` did, until another manual audit happens to catch it.

### User stories

- As an agent or contributor, a stray boundary-violating import fails CI immediately with a clear message, instead of surviving until the next manual repository audit.
- As the human owner, I don't have to re-run a one-off `grep` audit to know the boundary still holds.

### Acceptance criteria

- [x] `npm run check:architecture` exists and exits non-zero with a clear message per violation.
- [x] It flags real (non-type-only) `src/lib` imports of `@/app`, `@/components` or `@/server`.
- [x] It flags real (non-type-only) `src/components` imports of `@/lib/supabase` or `@/server`.
- [x] It does not flag `import type` statements (the one legitimate existing case, `nav-ia.ts`).
- [x] It passes against the current tree with zero violations.
- [x] Wired into `.github/workflows/ci.yml` before lint/typecheck.
- [x] `ARCHITECTURE.md`'s verification-layers table mentions it.

### Required states

Not applicable — CI tooling, no UI.

### Financial and security constraints

- No financial calculation, schema, or RLS logic touched.
- No new dependency added (dependency-free script, matching existing `check:*` scripts).

### Out of scope

- A general ESLint no-restricted-imports plugin/config (heavier, could be a later upgrade — this script is the narrow, immediately useful version).
- Detecting "financial calculation inside a route component" (no reliable static signal without heavy false positives — left as a manual review concern, not a mechanical gate).
- `check:repo-health` (file-size/active-packet-count signals) — separate, lower-priority follow-up noted in the Phase 1 inventory, not part of this packet.

## Implementation plan

### Architecture fit

Lives at `scripts/check-architecture.mjs`, same layer as `scripts/check-project-knowledge.mjs`
and `scripts/check-css-ownership.mjs` — a static contract script, not application runtime.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/check-architecture.mjs` | New dependency-free script | Enforce the two import-direction rules |
| `package.json` | Add `"check:architecture": "node scripts/check-architecture.mjs"` | Make it runnable/CI-callable |
| `.github/workflows/ci.yml` | Add a step in the `verify` job | Make it a real CI gate, not just a local option |
| `ARCHITECTURE.md` | Add one row to "Verification layers" | Keep the map accurate |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| False positive on a legitimate type-only import (e.g. `nav-ia.ts`) | Explicitly exempt full `import type { ... } from "..."` statements; verified `nav-ia.ts` still passes |
| False positive on a mixed `import { type X, Y }` line | Out of scope for now — no such line exists in the current tree; script treats any non-`import type`-prefixed line as a real import, which is the conservative/safe direction (won't silently allow a real violation) |
| Script becomes another unenforced script like the deleted `mvp-verify.sh` companions | Wire it into `ci.yml`, not just `package.json`, so it can't silently stop running |

### Verification plan

- Static: run `node scripts/check-architecture.mjs` directly against the current tree (must pass).
- Regression check: temporarily reintroduce a real `lib → app` import in a scratch file, confirm the script fails with a clear message, then remove the scratch file.
- CI: confirm the new step is positioned correctly in `.github/workflows/ci.yml` and doesn't change any other step's behavior.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Write `scripts/check-architecture.mjs` | none | script + clean run | done |
| T2 | Wire `npm run check:architecture` | T1 | `package.json` diff | done |
| T3 | Add CI step | T2 | `ci.yml` diff | done |
| T4 | Update `ARCHITECTURE.md` verification table | none | doc diff | done |
| T5 | Prove the script actually catches a violation (not just a no-op) | T1 | scratch-file regression test, reverted | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Passes clean on current tree | `node scripts/check-architecture.mjs` output | pass |
| Catches a real violation | scratch-file regression test (added then reverted) | pass |
| `import type` exemption works | `nav-ia.ts` case passes | pass |
| CI wired | `.github/workflows/ci.yml` diff | pass |

### Review findings

- Correctness: mechanical, regex-based on `import`/`import type` statements — deliberately narrow to avoid false positives, documented as such.
- Security/ownership: no impact — tooling only.
- UI/UX/accessibility: not applicable.
- Maintainability: single dependency-free file, consistent with two existing sibling scripts.
- Scope compliance: exactly the two rules already established as clean by the Phase 1 inventory; no new rules invented.

### Remaining limitations

- Only covers `src/lib` and `src/components` boundaries; does not check `src/app` or `src/server` internally, and does not check for financial logic leaking into route components (no reliable static signal).
- Regex-based, not a TypeScript-aware AST check — a sufficiently unusual import style (e.g. dynamic `import()`) would not be caught. Acceptable for the current codebase, which uses static ES imports throughout.

## Delivery record

- Branch: `claude/doc-du-an-qnj7ya`
- PR: none opened yet
- Squash commit: pending
- CI run: pending (will run on next push/PR)
- Production deployment: not applicable (tooling only)
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: no, pending PR/merge
