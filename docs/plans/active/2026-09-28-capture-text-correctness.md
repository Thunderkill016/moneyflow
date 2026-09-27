# Capture text: calendar dates and payment versus internal transfer

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write; owner requested deployment on 2026-09-28; merge instruction pending  
**Owner:** Codex, user-requested current MF development  
**Issue/PR:** pending focused PR creation  
**Last updated:** 2026-09-28

## Outcome and canon objective

Serve Canon Stage 0/1 Financial Reality and Low-maintenance Reality: a pasted expense with a date becomes an accurate, reviewable candidate without retyping it. This bounded fix addresses observed parser failures, not a new financial product or bank integration.

## Repository reconnaissance

Base `025cf42dbda34b3b4584b9509d5ea2164e5cd2e2`, same as remote HEAD at start. `parse-text.ts` ignores Vietnamese relative days; accepts impossible calendar dates; classifies any transfer keyword as a confident internal transfer. Existing parser tests miss these cases. Shared source adapter already provides strict date normalization. Shared provenance owns parser versions. Existing capture UI and Inbox review remain the owners of preview/approval.

## Research

Prior research artifacts in the separate research worktree establish the failure cases; current code is authority. No external research needed for the deterministic bug fix. No dependency/service adoption, new secret, schema or private data collection.

## Specification

- Recognize today/yesterday/day-before-yesterday in accented and unaccented Vietnamese, anchored to the supplied Vietnam calendar date; handle year/month/leap boundaries.
- Support existing ISO and DMY forms, including DMY hyphens, without accepting nonexistent dates.
- Invalid or conflicting explicit dates remain review-required with an accurate explanation; fallback today is visibly provisional.
- Missing date keeps existing review behavior. Partial DMY uses current year but must remain review-required because the year was inferred. Unsupported two-digit year remains review-required; do not truncate it into DD/MM.
- Explicit internal-transfer language remains a transfer. A payment context such as money for food/shop/goods is an expense. Generic transfer keywords alone are ambiguous and require review.
- Preserve integer amount, source text, candidate status and review-before-ledger boundaries. Stamp a new paste parser version while preserving explicit historical versions.

Required states: empty/no-money unchanged; valid candidates usable; invalid/conflicting dates flagged; ambiguous kind flagged; no new loading/undo/visual states. User correction stays in existing preview/Inbox. Mobile and accessibility behavior unchanged structurally.

## Implementation plan

Class 3: financial candidate semantics, no DB truth change. Update existing parser/tests, reuse source adapter date validation, update default paste provenance and its tests; review explanations reuse the single version owner and respect recorded historical versions. No changes to amount extraction, loan/card engines, posting/RLS, schema, UI or benchmark infrastructure.

## Tasks

T1 specification/reproduction: done (regression cases fail on base). T2 date/kind corrections: implemented. T3 provenance/version regression: implemented. T4 local validation: passed. T5 provider/PR review handoff: not published; local artifact available. Tests must cover conflicting cues, absent year, leap days, ambiguous transfers, and preserved historical provenance.

Rollback: revert the focused code diff; existing ledger is not backfilled or reinterpreted. Historical candidates keep recorded parser version. No migration or production-data write is authorized. Deployment of this bounded fix was requested separately on 2026-09-28. No claim of fastest capture or measured user retention.

## Evaluation

### Verification and handoff

Run focused parser/provenance tests, full unit tests, typecheck, lint, knowledge/architecture/capability contracts, CI policy and production build. Browser smoke uses demo fixtures, if local browser can run; it is not authenticated/DB/physical-device evidence. DB tests not applicable without schema/posting changes. PR and provider CI must be reported separately.

| Date       | From               | To          | Evidence                                                | Next action                      |
| ---------- | ------------------ | ----------- | ------------------------------------------------------- | -------------------------------- |
| 2026-09-28 | researcher/planner | implementer | Current failure cases, existing code/tests, this packet | Implement bounded regression fix |

Permission is local branch development. Merge, production deploy, provider/account/data mutations require owner instruction. No user data is used. Local environment initially Node24 versus supported22; use supported runtime if available, otherwise disclose limits.

### Review findings and validation state

- The old UTF-16 word-boundary patterns missed Vietnamese accents. Fold diacritics before matching kind/relative-day cues, retaining the original source text.
- Date-only shifts use the supplied Vietnam calendar day with UTC calendar arithmetic, not a host-local midnight.
- Invalid/conflicting dates, inferred years and ambiguous kinds use low confidence so uncertainty survives conversion into Inbox. Missing dates retain the existing provisional-today behavior.
- Rule application preserves confidence; it cannot make these low-confidence rows ready by merely supplying a category.
- The review surface previously had a duplicate version map and ignored recorded parserVersion. It now uses the shared provenance owner and respects historical versions.
- Focused parser/provenance/review tests initially passed 59/59 on Node22. Final frozen-tree rerun and full suite are pending below.
- CI policy suite passed191/191 earlier in this task. Knowledge/architecture/capabilities passed. A prior full verify pipeline was deliberately stopped under local RAM/swap pressure; it is not a passing aggregate gate.
- Final affected-file lint passed. A final typecheck and production build are running on Node22.23.3; no skipped stage is counted as passing.
- Initial linked dependencies failed Turbopack's worktree root boundary. Webpack then exposed its CSS-module pure-selector incompatibility on unchanged baseline CSS. An isolated dependency copy restores the default Turbopack path; no product CSS or configuration was changed.
- Deployment-env validation fails without env inputs as expected; it passes with explicit local demo mode/site URL. This is not production configuration evidence.
- No migration/posting/RLS contract changed; database tests are not selected. No visual/layout diff; responsive audit is not selected. Browser flow smoke is selected and still pending.

| Date       | From        | To        | Evidence                                                | Next action                                                                        |
| ---------- | ----------- | --------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2026-09-28 | implementer | evaluator | Focused regression tests, parser/provenance/review diff | Finish frozen-tree gates and demo browser smoke; report provider review separately |

### Final local acceptance evidence

| Gate / criterion                                | Evidence                                                                                                                                       | Result                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Final typecheck                                 | `npm run typecheck`, Node22.23.3, exit0                                                                                                        | pass                                     |
| Focused parser/provenance/review tests          | 59 tests,0 failures/skips, final tree                                                                                                          | pass                                     |
| Full application unit suite                     | Same repository file globs with `--test-concurrency=2`,1946 tests,0 failures/skips                                                             | pass                                     |
| Full lint                                       | `npm run lint`, Node22.23.3, exit0                                                                                                             | pass                                     |
| Production build                                | Default Turbopack, explicit local demo env, Node22.23.3, exit0                                                                                 | pass                                     |
| Knowledge / architecture / capabilities         | Repository contract checks                                                                                                                     | pass                                     |
| CI policy                                       | 191 tests,0 failures/skips; earlier run used Node24                                                                                            | pass, runtime qualification noted        |
| Diff hygiene                                    | `git diff --check`                                                                                                                             | pass                                     |
| Chrome demo preview                             | Three synthetic lines:185k yesterday→2026-09-27;50k merchant payment→expense;31/02→provisional today with invalid-date explanation             | pass                                     |
| Demo candidate→Inbox→review                     | All three pending; invalid-date row stays low confidence, source retained, review displays `paste_text@1.1`; no approval into ledger performed | pass                                     |
| Browser console                                 | 0 errors;4 unused CSS/font preload warnings on existing routes                                                                                 | warning, no claim of warning-free app    |
| DB / RLS / authenticated flow / physical device | Not changed or not exercised in this slice                                                                                                     | not applicable or unverified, not a pass |
| Provider exact-head CI / PR / production        | No remote branch/PR publication, merge or deploy in this task                                                                                  | unverified                               |

Local logs are under `/tmp/mf-capture-*`; demo snapshots are ignored `.playwright-cli/page-2026-09-27T18-42-02-350Z.yml` (preview), `page-2026-09-27T18-42-24-811Z.yml` (Inbox) and `page-2026-09-27T18-42-44-755Z.yml` (review). They are local evidence, not durable provider certification. No new production dependency was added. The task-owned demo browser/server were stopped after inspection. Generated Next AGENTS changes were removed from the diff.

**Current handoff:** local implementation and acceptance completed on `agent/capture-text-correctness`. This packet remains `evaluating` because repository `ready_for_review` requires a PR and exact-head provider evidence; neither is claimed. Next allowed action is review of this bounded diff and normal PR delivery. Merge/deployment/data writes remain separate owner decisions.

## Deployment handoff

Owner requested deployment on 2026-09-28. Existing project is MoneyFlow on Vercel; repository deployment policy permits only `main` and forbids feature preview deployments. AGENTS.md requires an explicit merge instruction separately from provider deployment authorization. Prepare the focused PR and exact-head CI before requesting that final instruction. No provider settings, Auth, database, deployment branch policy or real financial data will change. Rollback is a focused revert via the same checked main-only delivery path.
