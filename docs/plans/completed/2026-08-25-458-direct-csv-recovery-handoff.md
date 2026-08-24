# #458 — Direct CSV recovery handoff

**Status:** ready_for_review — post-merge projection pending owner merge
**Execution state:** ready_for_review
**Risk class:** Class 3 — financial-domain boundary
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** #458 / PR #459 (draft)
**Base at implementation start:** `main@a84dcfd11f67ed1e6c400b55cb1048d25f2c0131`
**Last updated:** 2026-08-25

## Outcome

When authenticated Direct CSV atomic approval fails after the server has retained a batch and pending Inbox candidates, the user sees that a blind retry is unsafe and can open Inbox or import history to inspect the preserved evidence. The change never retries, approves, posts or edits a financial fact.

## Repository reconnaissance

### Current behavior

- `commitDirectCsvImportAction` preserves the parsed batch and pending candidates when `approve_inbox_candidates_batch` fails, and returns the retained `batchId` with a no-partial-ledger message.
- `DirectCsvImportPage` currently displays only `result.message`; it drops the returned `batchId`, so a user cannot navigate to the retained evidence from the failure state.
- `/imports` lists batch metadata, while `/inbox` is the authoritative review surface for retained pending candidates.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/app/actions/direct-csv-import.ts` | server result already carries retained batch evidence | reuse; do not change action/RPC semantics |
| `src/components/inbox/direct-csv-import-page.tsx` | owns Direct CSV error state and user actions | add explicit recovery handoff only |
| `src/lib/inbox/direct-csv-import.ts` | pure Direct CSV planning helpers and focused tests | add a pure recovery descriptor if needed for testability |
| `src/lib/inbox/direct-csv-import.test.ts` | existing domain test owner | add retained-batch/no-batch regression |

### Existing tests and constraints

- Related unit tests: `src/lib/inbox/direct-csv-import.test.ts`.
- Database/RLS tests: no migration/RLS change; existing atomic approval provider gate remains relevant.
- Browser tests: Direct CSV authenticated error path needs focused coverage if an existing authenticated fixture supports it; no production claim from local demo.
- Product rules: candidates stay pending, transfers remain excluded, money stays integer VND, and source evidence is never rewritten.

### Open questions

- [x] Can the client distinguish a retained recovery state without inferring a server outcome? Yes: the existing action returns `batchId` only for the explicit retained-batch failure paths.

## Research

Not required: this is a bounded internal recovery path using current repository contracts; no provider, dependency, external format or policy behavior changes.

## Specification

### Problem

An authenticated user can receive a correct atomic-failure message but no route to the retained candidates/batch, increasing the chance of a duplicate retry instead of exception-first review.

### User stories

- As a cautious importer, I can open Inbox after a retained Direct CSV failure, so I inspect pending evidence before deciding what to do.
- As a user, I can open import history to verify that the server retained the batch without mistaking it for a completed ledger import.

### Acceptance criteria

- [ ] A Direct CSV failure with a retained `batchId` states that review is required before retry and exposes Inbox plus import-history actions.
- [ ] A failure without a retained `batchId` exposes no false preserved-batch claim or recovery actions.
- [ ] Successful authenticated import and all demo behavior remain unchanged.
- [ ] No action auto-retries, approves candidates, writes a ledger transaction, rewrites source evidence or changes database/server contracts.

### Required states

- Loading: existing import progress remains unchanged.
- Empty: unchanged.
- Error with retained batch: textual warning plus reachable Inbox and history actions.
- Error without retained batch: existing error presentation only.
- Recovery: user chooses review; no retry is triggered by navigation.
- Mobile/tablet/desktop: actions remain visible and reachable in the existing error alert layout.
- Accessibility: recovery instructions and actions are textual; the error remains assertive.

### Financial and security constraints

- Integer VND, transfer exclusion and candidate-pending status remain unchanged.
- The client consumes only the server-returned opaque batch id; it does not read another tenant's data or synthesize source identity.

### Out of scope

- Retry endpoint, auto-retry, candidate approval, batch-status redesign, source backfill, direct-import parser/mapping changes, migrations/RLS, provider/native/AI/deployment work.

## Implementation plan

### Architecture fit

The server action remains the authoritative atomic writer and describes whether it retained recoverable evidence. The client translates that explicit result into navigation only; Inbox and import history remain their existing ownership boundaries.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/direct-csv-import.ts` + test | pure retained-batch recovery descriptor | test the no-blind-retry decision independent of UI |
| `src/components/inbox/direct-csv-import-page.tsx` | retain recovery state and render Inbox/history actions in the authenticated error alert | make preserved evidence reachable |
| focused UI contract/browser test if supported | assert textual recovery path and no action on ordinary errors | protect user-facing exception behavior |
| board/current memory/PR record | converge lifecycle status in completing PR | maintain authority truth |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: ordinary failures retain existing message-only behavior.
- Rollback: revert focused UI/pure-helper changes; server atomic guarantees remain unchanged.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| User assumes retained candidates are ledger transactions | copy states that they remain pending review; no success styling |
| Retry is triggered by recovery action | actions are links only; no server mutation callback |
| Generic failure falsely claims a batch exists | descriptor requires explicit returned `batchId` |

### Verification plan

- Static: knowledge, CI policy, lint/typecheck as selected by final diff.
- Unit/domain: red→green retained-batch/no-batch descriptor tests.
- Database: no new database behavior; provider database gate confirms unaffected contract.
- Browser flow: error action targets and existing Direct CSV successful path where environment permits.
- Responsive/visual: focused error-alert action layout on phone and desktop.
- Production/manual: no deployment or production write.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add a failing retained-batch recovery contract test | packet | test failed because descriptor was absent, then passed after the minimal descriptor | done |
| T2 | Add minimal pure descriptor and Direct CSV error handoff | T1 | focused unit/UI contracts pass | done |
| T3 | Run selected UI/static verification and publish PR evidence | T2 | local evidence plus exact-head provider checks pass | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-25 | owner | implementer | implementing | #458; current code reconnaissance; action returns retained `batchId` while UI drops it | no authenticated browser fixture yet selected | write failing pure recovery test |
| 2026-08-25 | implementer | evaluator | evaluating | focused red→green recovery test; UI source contract; lint/typecheck/knowledge/CI-policy/migration checks pass | authenticated browser flow and provider exact-head checks remain pending | run selected browser and responsive gates |
| 2026-08-25 | evaluator | implementer | implementing | `verify:prepush` passed in explicit demo mode (1,110 tests + build); Chromium `/imports/direct` audits passed at phone, tablet and desktop sizes | authenticated retained-batch error lacks a local backend fixture; full E2E has 4 expected-missing-CAPTCHA failures; UI audit has 1 unrelated 320px password-reveal flake and 54 WebKit navigation internal errors | publish exact head and use provider checks for the remaining evidence |
| 2026-08-25 | ci_or_production | human owner | ready_for_review | PR #459 exact code head `de946d5d` passed CI run `32766848106`: policy, static quality/typecheck, production build, unit/static RLS, browser smoke and cross-device UI audit; CodeQL and Gitleaks passed | review and merge remain owner decisions; no provider/production write occurred | await owner merge decision |

### Current permission boundary

- Granted scope: focused repository code/tests/docs and one pull request for #458.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch only; no provider access needed.
- Forbidden writes: `main`, merge, history rewrite, provider settings, production data, secrets, workflow/permission changes and unrelated branches.
- Human approval required before: merge, deployment, provider or production-data writes.
- Rollback or stop condition: stop if the change would retry/import/approve automatically or alter a financial/source fact.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Retained failure directs to review without retry | red→green recovery descriptor, UI contract and exact-head browser smoke/cross-device audit | pass; authenticated retained-failure fixture remains unavailable locally |
| Generic failure makes no retained-batch claim | descriptor returns `null` for absent/whitespace batch ids; focused contract | pass |
| Success/demo behavior remains unchanged | full demo `verify:prepush` plus exact-head provider build/unit/browser checks | pass |
| No automatic mutation or server-contract change | focused diff, UI contract, unit/static RLS and provider checks | pass |

### Local verification evidence

- Red: `node --experimental-strip-types --test src/lib/inbox/direct-csv-import.test.ts` failed because `retainedDirectImportRecovery` did not exist.
- Green: focused Direct CSV plus UI safety contracts passed (15 tests); `npm run lint -- --fix`, `npm run typecheck`, `npm run check:knowledge`, `npm run test:ci-policy`, `npm run check:migrations`, and `git diff --check` passed. Lint retains five pre-existing warnings outside this diff.
- Full: `NEXT_PUBLIC_APP_MODE=demo npm run verify:prepush` passed with 1,110 tests and production build.
- E2E: 120 passed; four `auth-captcha` failures require a Turnstile key that the demo web server intentionally does not configure. They are outside this diff.
- Responsive audit: Chromium `/imports/direct` target-size and responsive checks passed at 320, 360, 390, tablet and desktop widths. The full matrix reported one unrelated 320px password-reveal flake and 54 WebKit `page.goto` internal errors, so it is not a green complete matrix.
- Exact-head provider: CI run `32766848106` passed policy, static quality/typecheck, production build, unit/static RLS, browser smoke and cross-device UI audit for `de946d5dc8050fcefeb4cd4e6561e822560216bf`; CodeQL and Gitleaks also passed.

### Remaining limitations

- This does not repair or retry the batch, and it does not prove production/device behavior.

## Delivery record

- Branch: `feat/p2-next-ingestion-v2`
- PR: #459 (ready for review)
- Squash commit: pending
- CI run: `32766848106` passed on code head `de946d5dc8050fcefeb4cd4e6561e822560216bf`
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: post-merge projection in PR #459; not merged truth until exact matching squash merge
