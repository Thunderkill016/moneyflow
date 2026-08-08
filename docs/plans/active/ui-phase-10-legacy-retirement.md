# MoneyFlow UI-system Phase 10 — legacy retirement

**Status:** active
**Execution state:** implementing
**Active role:** implementation
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base lineage:** Phase 9 branch from `main@8b97566a9bb70228ea5593d545660900aa626efb`
**Branch:** `agent/ui-phase-10-legacy-retirement`
**Pull request:** pending
**Last updated:** 2026-08-07

The owner instructed completion of the remaining UI migration program. Phase 10 is therefore authorized for branch/PR implementation and verification. Merge, deployment, production/provider writes, production-data access and branch/ruleset changes remain owner-only.

## Repository reconnaissance

Phase 9 evidence established a materially cleaner starting point:

- root global owners remain `legacy.css` + `document-theme.css`;
- the frozen `legacy.css` boundary still imports six files: `globals.css`, `ui-refresh.css`, `benchmark-ux.css`, `cross-device-stabilization.css`, `ai-uiux-refresh.css`, `ai-uiux-guardrails.css`;
- Phase 9 removed three unimported public generations and reduced repository `!important` count from 1,096 after P8 to 694;
- current `check-dead-css.mjs` on main was deliberately report-only and conservative;
- stale PR #171 contains a stronger TypeScript-AST reachability scanner and fixture tests, but its CSS deletion diff is based on an old baseline and is not safe to merge wholesale;
- `MinimumTargetSizeContract` is still root-mounted and globally repairs legacy controls with `!important`, so it cannot be removed until a current product-wide target sweep proves direct ownership;
- `document-theme.css` remains the executable semantic token authority and no current product requirement justifies a second token build pipeline.

## Research

### Research scope and source selection

P10 mostly executes decisions already researched in the parent packet. External research is therefore intentionally narrow and reuses the parent’s primary sources rather than adding another literature sweep.

| Source | Authority/type | Applied decision | Limit |
|---|---|---|---|
| MDN `!important` / cascade guidance from parent research | web-platform documentation | retire owner-specific important declarations rather than hiding them inside another cascade layer | does not identify which MoneyFlow selector is live |
| Martin Fowler Branch by Abstraction from parent research | migration pattern | replace compatibility consumers incrementally and delete only after last consumer moves | not a deletion oracle |
| W3C WCAG 2.2 target-size guidance from parent research | accessibility guidance | preserve MoneyFlow’s stricter 44px important-action product standard while retiring the global repair contract | does not require every inline link to be 44px |

### Adoption review

- The stronger dead-CSS scanner is reused as **technique**, not by merging old PR #171.
- Its implementation is copied onto current P9 lineage and must pass fixture tests before its repository finding is trusted.
- No new dependency is added: the repository already depends on TypeScript.
- DTCG/token generation remains **not adopted** unless P10 discovers a concrete interoperability problem that CSS custom properties cannot serve.

## Specification

### Outcome

MoneyFlow reaches a presentation architecture where remaining global compatibility CSS is either proven live and reassigned to a current owner or removed. The final state must make dead-selector and new-important regressions deterministically visible, while preserving current visual/financial/accessibility behavior.

### Acceptance criteria

- P10-AC1: a current-lineage reachability scanner distinguishes class-bearing product code from imports, prose, tests, URLs, dynamic class builders and CSS Module `:global(...)` dependencies.
- P10-AC2: current legacy stylesheet selectors that no product code can render are removed rather than retained as historical source.
- P10-AC3: `legacy.css` is deleted only if all live imports have been retired or moved to an explicitly current non-legacy owner.
- P10-AC4: `MinimumTargetSizeContract` is deleted only after a product-wide measured target sweep proves important controls own compliant geometry directly.
- P10-AC5: misleading/dead compatibility aliases and mobile/FAB repair names are removed when reference count reaches zero.
- P10-AC6: final policy blocks unreachable legacy selectors and blocks new `!important`; existing remaining important declarations must have an explicit current owner/exception or be removed.
- P10-AC7: `document-theme.css` remains semantic token authority; DTCG generation is rejected/deferred unless a concrete current need justifies dual-tool interoperability.
- P10-AC8: full exact-head static/unit/build/browser/cross-device/security evidence is green before owner review.

## Implementation plan

1. Port the stronger scanner algorithm + fixture tests only from historical PR #171 onto current P9 lineage.
2. Run it against current product code and treat failures as a fresh inventory, not as pre-approved deletions.
3. Remove unreachable selectors/file families in bounded batches; rerun unit/build/browser evidence after every meaningful ownership boundary.
4. Measure target-size coverage using the existing responsive audit before considering `MinimumTargetSizeContract` deletion.
5. Retire `legacy.css` only when its import list is actually empty/reassigned.
6. Convert the final reachability/important constraints into blocking contracts.
7. Record the DTCG decision explicitly; default is keep current CSS authority.
8. Run cumulative exact-head P9+P10 verification; owner decides merge order.

### Current implemented slice

- Ported only `scripts/check-dead-css.mjs` and `src/lib/dead-css-scanner.test.ts` blobs from stale PR #171 onto current lineage.
- The historical CSS deletions from #171 were **not** copied.
- The scanner’s repository-level test intentionally fails until every unreachable current selector is retired, producing a current candidate list through CI artifacts/logs.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P10-T1 | Re-run current-lineage ownership/dead-selector inventory | AST scanner + fixture tests + CI output | implementing |
| P10-T2 | Remove remaining legacy stylesheet families in bounded batches | current scanner + browser/visual evidence | blocked on P10-T1 inventory |
| P10-T3 | Delete `src/app/legacy.css` when no live import remains | import graph + build/browser evidence | blocked on P10-T2 |
| P10-T4 | Remove MinimumTargetSizeContract after product-wide target sweep | responsive audit + source zero-reference proof | blocked on P10-T2 |
| P10-T5 | Remove misleading aliases/dead mobile/FAB compatibility names | zero-reference/source tests | blocked on P10-T2 |
| P10-T6 | Decide DTCG/token pipeline | adoption decision | preliminary decision: defer |
| P10-T7 | Enforce final no-dead/no-new-important/no-route-global invariants | blocking gate tests | blocked on cleanup |
| P10-T8 | Owner reviews final architecture | final exact-head evidence | blocked |

## Evaluation

### Current evidence

- Phase 9 static gate measured `importantDeclarations: 694`, down from 1,096 after P8.
- The six current root legacy imports remain unchanged at P10 start.
- Historical PR #171’s scanner fixture suite covers literal/resolved class names, runtime prefixes, false references from tests/prose/URLs, comments, CSS Module `:global`, class-builder maps and static HTML.
- No historical selector deletion has been accepted merely because the old scanner once marked it dead.

### Verification selection

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:css-ownership`
- `npm run check:architecture`
- `npm run check:dead-css`
- lint, typecheck, complete unit/static-RLS suite, production build
- Browser smoke + full affected cross-device matrix after deletions
- target-size audit before deleting MinimumTargetSizeContract
- CodeQL and secret-history protected checks

### Stop conditions

- Scanner reports a candidate whose runtime construction cannot be proven statically: keep it and add explicit evidence rather than deleting.
- A deletion changes financial/auth behavior: stop that slice and create the appropriate higher-risk packet.
- Browser/visual evidence changes unexpectedly: restore the owning rule or migrate its behavior locally before continuing.
- MinimumTargetSizeContract remains if even one important current control depends on it.

### DTCG decision

Current decision: **defer/no adoption in P10**. MoneyFlow has one executable semantic CSS token authority and no proven current cross-tool pipeline requiring a generated DTCG source. Adding a generator now would create dual-source/build ownership without solving a current user or maintainer failure. This decision can be reopened later by a separate adoption packet if Atoryn design-tool interoperability has a concrete consumer.

## Delivery record

- Branch: `agent/ui-phase-10-legacy-retirement`
- PR: pending
- Current scanner port commit: `ede722b9dced12f1e4b009ea6e1a9290edfdad60`
- Historical CSS deletion reuse: none
- Exact-head CI: pending
- Merge/deploy: owner-only
