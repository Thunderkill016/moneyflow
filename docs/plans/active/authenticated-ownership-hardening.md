# Authenticated ownership hardening

**Status:** ready_for_review
**Execution state:** ready_for_review
**Active role:** human_owner
**Permission scope:** branch_write
**Owner:** agent (implementer/evaluator) → human_owner (merge decision)
**Issue/PR:** PR [#336](https://github.com/Thunderkill016/moneyflow/pull/336)
**Last updated:** 2026-08-11

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

This packet was opened during review of PR #336, not before implementation. That
is a real process deviation and is recorded as such rather than backdated. The
content below uses only evidence the audit and the PR already established; no
history is reconstructed.

## Outcome

A signed-in person sees the same pending-Inbox count everywhere in the app, and
the data export they are told to take before deleting their account actually
contains their Inbox. The mobile shell's middle action always means "record a
transaction" instead of silently becoming whatever the current route's action is.
Underneath, the repository gains the ability to run browser tests as an
authenticated user at all, which is what made the first two provable.

## Repository reconnaissance

### Current behavior (baseline `ca23b1f`, audit baseline)

- Six Settings surfaces computed the shell Inbox badge from
  `countPending(readStoredCandidates())`. For an authenticated viewer that store
  is empty: `loadInboxForClient()` calls `clearLocalInboxAfterMigrate()` after
  the first Inbox visit and server state is never mirrored back. Measured on
  `main` + harness: badge `0` while the account had `2` pending.
- `/settings/export` built its download from those same empty local candidates,
  while `delete-account-page.tsx:170` tells the user the export covers "giao dịch
  và Inbox" and offers it as the step before permanent deletion.
- `AppShell`'s mobile middle tab renders the hardcoded text "Ghi" but takes its
  behaviour and `aria-label` from `fabAction`. Seven routes passed their own
  action there. Measured in Chromium at 390×844 against a production build:
  `/budgets` showed "Ghi", announced "Thêm ngân sách", opened "Thêm ngân sách";
  `/accounts/[id]/reconcile` showed "Ghi", announced "Bắt đầu đối soát", and
  rendered `disabled: true`.
- Both Playwright configs pin `NEXT_PUBLIC_APP_MODE: demo` in `webServer.env`,
  overriding the `authenticated` value `ci.yml` sets at job level. No browser
  test had ever run authenticated.

### Relevant repository areas

- `src/server/inbox.ts` — canonical authenticated Inbox reads. Already correct.
- `src/hooks/client-inbox.ts` — `getPendingCountForClient(isDemo)`, the shared
  mode-aware reader the Settings surfaces bypassed.
- `src/components/layout/app-shell.tsx` — mobile tab, `fabAction`,
  `showPrimaryActionOnMobile`.
- `src/lib/nav-ia.ts` — global CTA contract.
- `playwright.config.ts`, `playwright.audit.config.ts` — demo evidence owners.

### Existing tests and constraints

- `safe-ux-baseline.test.ts` SAFE-03 asserts this exact ownership contract by
  regex, against `moneyflow-dashboard.tsx` only. The fix it guards was applied to
  one file; six siblings violated it invisibly.
- An audit test has pinned the correct mobile-shell shape for `/accounts` since
  it landed, but for that one route only.
- 76 of 144 unit test files read source text and assert regexes.

### Similar implementation and recent history

`/dashboard` is the reference: server count in via `get_dashboard_bundle`, local
read guarded by `viewer.isDemo`. `/accounts` and `/rules` are the reference for
the mobile shell: route action in the topbar via `showPrimaryActionOnMobile`,
capture tab left alone.

### Open questions

None blocking. The one resolved during review: whether Inbox should also use
`showPrimaryActionOnMobile`. It should not — see Specification.

## Research

### Research scope and source selection

No new external research. This work is entirely repository-internal: executable
code, migrations, tests and runtime measurement against a production build. No
third-party library, pattern or service was adopted, so the research and
adoption-review sections of the template do not apply.

## Specification

### Problem

Authenticated surfaces read device-local storage that is structurally empty for
them, and the mobile shell's global capture action can be silently replaced by a
route's own action. Neither was detectable, because no browser test ran
authenticated.

### Acceptance criteria

1. Every Settings surface shows the canonical server pending-Inbox count for an
   authenticated viewer. **MF-02.**
2. An authenticated export contains the server Inbox, and never falls back to
   demo rows left in the browser. **MF-01.**
3. The mobile middle tab always means capture; its visible text is contained in
   its accessible name; a route's own action stays independently reachable.
   **MF-03.**
4. A browser suite exists that boots authenticated and is proven not to be demo.
   **MF-07.**
5. Demo behaviour is unchanged on every touched surface.

### Required states

- Authenticated Inbox read fails → export contains no Inbox, and the warning says
  so instead of pointing at device candidates.
- Server count unavailable → render no badge rather than a stale local value
  (existing `getPendingInboxCountFromServer()` contract).
- Route action disabled → the capture tab must remain enabled.

### Financial and security constraints

- No migration, RPC, RLS policy or grant is touched.
- No reconciliation semantics change: start rules, difference formula, clearing
  semantics, zero-only completion, reopen logic and transaction matching are all
  outside this diff.
- Integer money and transfer neutrality untouched.
- No credential is read, stored, logged or committed; no real Supabase project is
  contacted; no provider or production write.

### Out of scope

- **MF-04** — CSS ownership drift (~380 unowned class usages; `/onboarding` and
  `/privacy` render unstyled). Largest open P1. Not started.
- **MF-06** — Quick Add reads local rules unguarded. Deliberately deferred: the
  fix needs mode plumbed through three call sites in the highest-traffic
  component, and the harness this PR adds is the precondition for doing it
  safely.
- **MF-08** — only `public.accounts` revokes DML from `authenticated`; balanced
  transfer and split exactness are RPC-enforced only. Stays `RETEST`, not
  `FIX NOW`. No privilege change here.
- Any redesign or feature work.

## Implementation plan

### Architecture fit

Every fix routes through an owner that already existed and was already used
elsewhere. No new abstraction, no new layer.

### Planned changes

| Area | Change |
|---|---|
| Settings ×6 | badge via `getPendingCountForClient(viewer.isDemo)` |
| `/settings/export` | route loader reads `listInboxFromServer()`; new pure `resolveExportCandidates` owns the mode choice |
| Export warning | full sentence built where the facts are; device-fallback copy only in demo |
| Shell ×7 routes | drop `fabAction`, adopt `showPrimaryActionOnMobile` |
| Inbox | no `showPrimaryActionOnMobile` — its action *is* capture, which the tab owns |
| Test estate | `playwright.auth.config.ts` + `e2e/auth/*`; `test:e2e:auth` in `browser_smoke` |

### Data and migration impact

None. No schema, migration, backfill or data write.

### Risks and counterexamples

| Risk | Handling |
|---|---|
| The double is permissive and every positive test passes for the wrong reason | Unknown path/table/RPC/filter → 501 and recorded; every test asserts the miss list is empty. `/auth/v1/user` rejects a token it never issued (`401`). A negative contract proves a session-less browser cannot reach the workspace. |
| The fixes are asserted but not effective | Whole suite run against `main` + harness: **9 failed, 2 passed**. Against the branch: **13 passed**. The tests detect the defects. |
| `showPrimaryActionOnMobile` overflows narrow viewports | Responsive audit at 320/360px green. |
| Restoring the capture tab removes a route's add action | Each route's action asserted independently visible in the topbar. |
| Extra topbar action duplicates the tab | Found in review on Inbox and fixed; contract now asserts exactly one shell capture action there. |

### Verification plan and its boundary

Three layers, and **none substitutes for another**:

- **Authenticated double** (`playwright.auth.config.ts`) proves *application
  ownership and runtime composition*: the real app in
  `NEXT_PUBLIC_APP_MODE=authenticated`, real `@supabase/ssr` client, real route
  loaders, real server components, real rendering — i.e. which source a surface
  reads from. It proves **nothing** about PostgreSQL.
- **pgTAP** (`npm run test:db`) proves the *database and RLS baseline*: tenant
  isolation, invariants, RPC bodies, grants. It says nothing about which source a
  component reads.
- **Demo suites** own demo behaviour and responsive geometry and are unchanged in
  meaning.

The double is not a Supabase emulator and must never be extended into one. A
green authenticated run must never be reported as database evidence, and a green
`test:db` must never be reported as ownership evidence.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | MF-01/MF-02 ownership fixes | — | `8d67340`, 4 unit tests on `resolveExportCandidates` | done |
| T2 | MF-03 on six routes | — | `5374a6f` | done |
| T3 | Export warning copy | T1 | `9497bd0` | done |
| T4 | Authenticated harness (MF-07) | — | `fbfb3b7`; 9-failed/2-passed before, 13-passed after | done |
| T5 | Tap-behaviour assertion | T2 | `7ad0f69` | done |
| T6 | Keep auth specs out of demo suite | T4 | `85eb6b8` | done |
| T7 | Negative auth contract + double hardening + CI wiring | T4 | `b2f19d8` | done |
| T8 | MF-03 on reconciliation, after #335 merged | #335 merged | `9783e07`; 7/7 contracts | done |
| T9 | Single mobile capture action on Inbox | review | contract asserts exactly one shell capture action | done |
| T10 | This packet | review | current file | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-11 | implementer | evaluator | implementing | audit findings MF-01…MF-08, branch commits | authenticated proof not yet runnable | Build the authenticated harness |
| 2026-08-11 | evaluator | evaluator | evaluating | 9-failed-before / 13-passed-after; exact-head CI green at `fed7474` incl. pgTAP PASS | packet and Inbox duplication outstanding | Close both review findings |
| 2026-08-11 | evaluator | human_owner | ready_for_review | this packet; PR #336; exact-head CI | merge decision; MF-04/06/08 open | Owner review and merge decision |

### Current permission boundary

- **Granted scope:** `branch_write` on `fix/authenticated-inbox-ownership-and-mobile-capture-tab`.
- **Exact repositories/providers/resources:** `Thunderkill016/moneyflow` git branch and PR #336. GitHub Actions read. No Supabase project, no Vercel, no provider console.
- **Forbidden writes:** `main` (except the one explicitly authorized squash-merge of PR #335 → `5212db1`), any Supabase project, production data, provider settings, branch protection, required checks, `CODEOWNERS`.
- **Human approval required before:** merging PR #336; any provider or production action; starting MF-04, MF-06 or MF-08.
- **Rollback or stop condition:** revert the squash commit; the branch is not merged, so reverting is a branch delete. Every change is application-level and reversible by revert — no migration, no data mutation, nothing to unwind on a provider.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| MF-02 server count on every Settings surface | authenticated suite 7/7; `0` on `main`, `2` on branch | pass |
| MF-01 export carries server Inbox, never stale local | authenticated suite 3/3 | pass |
| MF-03 tab means capture; route action reachable | 8/8 capture contracts incl. reconciliation and Inbox | pass |
| MF-07 suite is authenticated, not demo | no demo banner; `/auth/v1/user` served; negative contract 2/2 | pass |
| Demo unchanged | demo mobile E2E 101 passed; UI audit 439 passed | pass |
| DB baseline healthy | `supabase db start/reset/test` on runner: `All tests successful. Result: PASS` | pass |

### Review findings

| Finding | Resolution |
|---|---|
| P2 — duplicate mobile capture action on Inbox | `showPrimaryActionOnMobile` removed from `inbox-page.tsx`; runtime contract asserts exactly one shell capture action at ≤760px and that it navigates to `/capture`. Desktop keeps the topbar action. |
| P1 — missing Class 3 work packet | This file. |

### Remaining limitations

- The authenticated proof rests on a deterministic double, not a real Postgres.
  It cannot and does not evidence RLS or SQL invariants.
- MF-01, MF-02 and MF-06 were established by code trace plus double-backed
  runtime proof, never against a hosted Supabase project.
- `auth-captcha.spec.ts` needs `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and does not run
  locally. WebKit audit projects fail locally with an internal browser error that
  also reproduces on `main` — environment, not product.

## Delivery record

- Audit baseline: `ca23b1f`.
- PR [#335](https://github.com/Thunderkill016/moneyflow/pull/335) merged first at
  `5212db1` under explicit owner authorization, and owns the canonical
  `rls-migrations.test.ts` lexer. This branch's simpler MF-05 comment-stripper
  was **dropped on rebase**, so
  `git diff origin/main...HEAD -- src/lib/rls-migrations.test.ts` is empty.
- PR #336 base: `5212db1`. Not merged. Merging remains the owner's decision.
- PR memory record: `docs/research/pr-memory/2026/Q3/PR-336.md` — a separate
  artifact from this packet, not replaced by it.
