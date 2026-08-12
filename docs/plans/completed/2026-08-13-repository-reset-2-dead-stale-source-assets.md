# Repository Reset 2 — dead/stale source, assets and import evidence

**Status:** ready_for_review
**Execution state:** final exact-head verification pending
**Active role:** evaluator — owner merge is the final repository transition
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #362
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is prepared for the
post-merge accepted state of bounded Repository Reset 2. Its final lifecycle amendment
still requires exact-head verification; owner merge of #362 is then the final
repository transition. This record does not begin Brand/Product Experience A0 or
authorize provider, production, database, schema, Auth, financial or UI redesign work.

## Outcome

The repository enters the later Brand/Product Experience work with demonstrably dead
source and locally owned assets removed, while live legacy presentation, conventions,
financial/security/recovery boundaries and historical A0 evidence remain intact.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a Next.js App Router application; source can be owned by imports,
  route/convention discovery, CSS composition, metadata, generated URL strings, tests
  or tooling.
- Reset 1 is accepted on `main@8fcf8e2`; this packet was the registered active child
  under `public-beta-trust.md` during Reset 2 execution.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/app`, `src/components`, `src/lib`, `src/hooks` | routes and runtime owners | audit imports, conventions and dynamic loading |
| `public`, styles and route metadata | asset/CSS ownership | retain all unclear or live variants |
| tests, scripts and package/config entry points | non-runtime ownership evidence | inspect before each deletion |
| active registry/current memory/Trust parent | execution lifecycle | update only this packet's state |

### Existing tests and constraints

- Required final verification is selected by `npm run agent:doctor` after the real diff.
- `check:architecture`, `check:css-ownership`, typecheck/build and browser evidence
  apply when their affected layers are changed.
- Never treat a missing ordinary import as deletion proof for a Next.js convention,
  dynamic import, public URL, CSS selector or test/tool input.

### Similar implementation and recent history

- Reset 1 established the active-packet registry and completed-packet lifecycle.
- No prior candidate list is deletion evidence; every candidate must be re-proven on
  `main@8fcf8e2`.

### Open questions

- [x] Which source/assets are demonstrably unowned on the current main baseline?
- [x] Which old layers remain live or are future Brand/UI replacement debt?

## Research

Not required. This is a repository-local ownership audit; current source, build,
tests and configuration are the primary evidence. No dependency or architecture change
is proposed.

### Adoption review

Not applicable. No dependency, provider, service or architecture pattern is added.

## Specification

### Problem

Unowned source/assets can create accidental complexity before the later Brand/Product
Experience rebuild. Deleting merely old-looking or low-import code would instead risk
breaking routes, conventions, security or legacy presentation.

### User stories

- As a maintainer, I can see why every removed file had no current owner.
- As a future A0 implementer, I retain live legacy and historical evidence until a
  replace-and-retire slice has a real owner.

### Acceptance criteria

- [x] Every audited candidate is classified LIVE, DEAD, LEGACY BUT STILL LIVE,
  FUTURE-REPLACEMENT DEBT or UNCERTAIN with concise ownership evidence.
- [x] Every deletion is proven against imports, re-exports, dynamic/convention,
  string/asset, CSS and test/tool/config ownership channels.
- [~] Removed source/assets have no remaining owner and affected app flows build and
  run through the risk-selected gates — source head passed; final lifecycle head pending.
- [x] Financial/security/recovery code, migrations, harness/CI tooling and historical
  A0 evidence remain untouched unless incontrovertibly dead and allowed.
- [x] Fresh evaluation finds no missed ownership channel or premature live-legacy
  retirement.
- [~] On acceptance this packet moves to `docs/plans/completed/`; the registry returns
  to the Trust parent only, current memory names Reset 2 complete and A0 next/not
  started — final lifecycle head pending, then owner merge.

### Financial and security constraints

- No migration/schema/Auth/provider/production or financial-domain change.
- Preserve integer VND, transfer neutrality, RLS, recovery/archive and tenant safety.

### Out of scope

- Brand/Product Experience A0→J implementation, UI redesign, visual token changes,
  source reorganization, live-module consolidation, compatibility refactoring and
  movement-only cleanup.

## Implementation plan

### Architecture fit

The existing App Router/build/test graph owns source reachability. This packet records
evidence and removes only no-owner leaves; it adds no new cleanup framework.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| candidate source/assets | delete only proven-dead leaves | reduce accidental complexity |
| focused existing tests/guards | extend only for a concrete regression | prevent retired artifact reintroduction |
| this packet/current lifecycle docs | record classifications and acceptance | durable handoff without parallel governance |

### Data and migration impact

None. No data, schema, provider or deployment mutation.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| barrel, dynamic import or Next.js convention hides an owner | inspect each ownership channel before deletion |
| public URL/CSS runtime selector hides an asset or rule owner | search URL strings, metadata and CSS/class consumers; retain uncertainty |
| old presentation is still live | classify legacy-live or future-replacement debt, do not delete |
| static checks miss a broken route | run build and selected browser/e2e evidence |

### Verification plan

- Static: reference scans, `check:architecture`, typecheck and build as selected.
- CSS/presentation: ownership checks whenever CSS or presentation files are affected.
- Browser: selected routes/e2e when runtime or UI source is removed.
- Final: all doctor-selected local gates plus exact-head provider checks.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| RR2-T1 | inventory source/assets and ownership channels | packet | candidate classification table | complete |
| RR2-T2 | retire independently proven-dead slices | RR2-T1 | reference proof + affected gates | complete |
| RR2-T3 | fresh-context evaluation | RR2-T2 | evaluator findings/fixes | complete — clean after negative-assertion wording fix |
| RR2-T4 | complete lifecycle and exact-head delivery | RR2-T3 | completed packet, PR memory, CI | in_progress — final lifecycle head pending; owner merge then required |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | human_owner | implementer | discovery | `main@8fcf8e2`; doctor; registered packet | candidates not yet audited; no deletion evidence | inventory ownership channels |
| 2026-08-13 | implementer | evaluator | evaluating | 13 DEAD candidates removed; reference scans; focused contracts; typecheck; architecture/CSS ownership; direct browser routes | selected full local suites and exact-head delivery remain pending | attack missed owners and scope drift |
| 2026-08-13 | fresh evaluator | implementer | rechecked | no missed runtime/barrel/dynamic/Next/public owner; sole `ui-refresh.test.ts` textual reference is a negative assertion | doctor-selected full build/browser suites and exact-head CI remain pending | obtain delivery evidence before completing lifecycle |
| 2026-08-13 | implementer | provider CI | delivery | #362 draft opened; `PR-362.md` records scope and limits | exact-head checks and lifecycle completion pending | wait for checks; do not merge |
| 2026-08-13 | provider CI | evaluator | verified | #362 source head `843c5fa`: build, browser smoke, cross-device audit, policy/static/unit, database, CodeQL and Gitleaks pass | final lifecycle amendment has a new exact head | run exact-head checks; do not merge autonomously |
| 2026-08-13 | evaluator | human_owner | ready_for_review | parent-only registry and current-memory post-merge route prepared | final lifecycle head and owner merge remain required before this becomes `main` truth | wait for checks, then merge #362 when approved; do not start A0 |

### Current permission boundary

- Granted scope: one branch; source/assets proven unowned and necessary lifecycle docs.
- Forbidden writes: `main`, merge, force push, providers, production, database,
  schema/Auth, migrations, financial behavior, Brand/UI implementation and tooling
  removal retained by Reset 1.
- Stop condition: any candidate requires a source move, refactor, compatibility change
  or unproven ownership inference.

## Evaluation

### Candidate inventory and ownership evidence

Counts are targeted candidates, not a claim that every repository file needs an
ordinary import. The static App Router graph found 299 product source modules before
the audit and 291 after; public assets fell from 11 to 6.

| Bucket | Candidates | Evidence and decision |
|---|---:|---|
| DEAD — SAFE TO RETIRE NOW | 13 | `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`: no source/URL string, metadata, manifest, service worker, test, script or config consumer. `src/app/product-styles.ts`; UI `accordion`, `badge`, `card`, `checkbox-field`, `money-value`, `radio-group`, `separator`: no direct/barrel/dynamic/package consumer. The non-owning negative assertion for the `product-styles` name in `ui-refresh.test.ts` and historical/obsolete-contract references are retained or retired deliberately. |
| LIVE | 13 sampled ownership-critical candidates | PWA `icon-192.png`, `icon-512.png`, `sw.js` are owned by manifest/push/service-worker paths; landing SVGs by `landing-page.tsx`; all App Router page/layout/error/loading/route/metadata conventions by filesystem discovery; `security-headers.ts` by `next.config.ts`; recovery target state and dashboard source helper by focused tests. Kept. |
| LEGACY BUT STILL LIVE | 5 layers | `legacy.css`, `globals.css`, `document-theme.css`, `safe-ux-planning.css` and landing `safe-ux-login.css` are mounted by root/route imports and protected by existing CSS ownership tests. Kept; no visual cleanup. |
| FUTURE-REPLACEMENT DEBT | 2 surfaces | The 285 remaining reviewed presentation-ownership entries and route compatibility layers remain for replace-and-retire during Brand/Product Experience A0→J. No token, CSS or component redesign is attempted here. |
| UNCERTAIN | 2 modules | `spending-pace.ts` has only test/research references but encodes planning semantics; `supabase/client.ts` has no current static importer but is an Auth boundary. Both are retained rather than inferred dead. |

`src/lib/archive/restore-target-state.ts` is also test-only in the current graph, but
is explicit recovery safety code and therefore retained under the mission's protected
recovery boundary. Historical A0/UI research and archived/completed evidence retain
historical path mentions; they are provenance, not runtime owners.

### Removal proof

For every removed item, the audit searched direct imports, re-exports, literal and
dynamic `import()`, `require()`, public URL strings, Next convention names,
manifest/metadata/service-worker paths, CSS imports, tests, scripts, package entries
and configuration. The only surviving current-code name reference is
`ui-refresh.test.ts`'s negative assertion that `user-chip` must not import
`product-styles`; it is explicit non-ownership, passes after removal and is not a
consumer. The removal also shrank the existing production CSS ownership baseline by
28 stale entries; `check:code-css-ownership` confirmed no new debt and no stale
allowance.

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| candidate classification | compact candidate inventory | pass |
| safe removal | reference audit; focused contracts; architecture/CSS ownership; source-head production build, browser smoke and cross-device audit | pass on `843c5fa`; final lifecycle head pending |
| lifecycle coherence | fresh evaluator recheck; completed packet; parent-only registry/current-memory route | pending final exact-head verification and owner merge |

### Remaining limitations

- The local execution watchdog interrupted full browser runners after they started;
  direct Playwright CLI checks still loaded dashboard, transactions, accounts and
  backup routes in demo mode on desktop/mobile. Exact-head provider CI subsequently
  passed the selected browser smoke and cross-device audit.

## Delivery record

- Branch: `reset/dead-stale-source-assets`
- PR: #362 ready for review
- Squash commit: pending owner merge
- CI run: source head `843c5fa` green — `verify`, `database`, `e2e`, browser smoke,
  cross-device audit, Gitleaks and CodeQL; final lifecycle head pending
- Production deployment: not applicable
- Work packet moved to `docs/plans/completed/`: prepared post-merge record; final
  lifecycle exact-head verification and owner merge remain the acceptance boundary
