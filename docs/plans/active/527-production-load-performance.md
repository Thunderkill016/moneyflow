# #527 — recover production page-load performance

**Issue:** #527
**Parent authority:** operational/product quality under master #432
**Selected by:** merged PR #528
**Merged selection baseline:** `main@dea07378fe00030c3fee1a3f4be52831ece959f0`
**Status:** current executable slice after #529 governance recovery; runtime implementation remains measurement-first
**Change class:** implementation is at least Class 2 and becomes Class 3 if cross-cutting authenticated rendering/data-flow boundaries change
**Owner merge required:** yes

## Why this slice exists now

On 2026-09-02 the owner reported a current Vercel load/performance score of **39**. That is fresh production-quality evidence and outranks candidate #523 until the regression is attributed and materially improved.

The score remains an owner/Vercel field observation until current measurement reproduces or decomposes it. Synthetic improvement alone may not be described as fixing the field score.

PR #528 selected this slice. Its merge then exposed a separate governance defect: main CI #3162 failed because the retired Markdown Current Work Board still carried a pre-merge SHA baseline. Issue #529 fixes plan authority only; it must not contain runtime performance changes.

## Repository reconnaissance

Current production/repository evidence:

- anonymous `/` is prerendered and has been observed as a Vercel cache HIT;
- `src/lib/supabase/proxy.ts` skips Supabase auth for anonymous public routes without an auth cookie;
- `/dashboard` is dynamic and has been observed as cache MISS;
- `src/components/moneyflow-dashboard.tsx` is a broad `"use client"` root;
- `src/components/layout/app-shell.tsx` is a shared `"use client"` root containing navigation, routing, connectivity, keyboard, sheet and toast behavior;
- `useTransactions` and mutation flows maintain optimistic/local state, so converting the whole dashboard to Server Components without a refresh contract risks stale financial totals;
- the landing currently eagerly marks a below-hero story image as priority; this is only a hypothesis until current waterfall evidence proves it competes with LCP-critical work;
- the repository already has `npm run analyze`, `npm run test:load:contracts`, Playwright Lighthouse instrumentation, production build and browser/UI gates.

## Research

Completed #403 is the nearest internal performance evidence. It found server response small in the lab harness and client JavaScript/main-thread/render delay dominant. The dashboard loading-boundary experiment was negative for material LCP improvement and must not be repeated as an assumed fix.

Last canonical #403 provenance recorded approximately:

| Route | Script transfer | Main-thread work | JS bootup |
|---|---:|---:|---:|
| `/` | 195.8 KB | ~1.2 s | ~367–381 ms |
| `/dashboard` | 311.6 KB | ~1.72–1.75 s | ~766–814 ms |

Current official Next.js guidance supports keeping client boundaries small and lazy-loading secondary client UI, but repository measurement must select the mechanism. Vercel field/Speed Insights data must remain separate from synthetic Lighthouse data.

Engineering adoption rule for this slice: proven pattern first, custom invention last. Reuse a current official/production pattern only when maintenance, license, stack fit and same-methodology measurement justify it.

## User-visible problem

A finance ledger that takes several seconds to become useful adds friction to the repeated loop MoneyFlow needs to make cheap: open → understand → record/review.

The goal is not a vanity Lighthouse number. The goal is to remove actual critical-path work while preserving truthful financial content and interaction.

## Specification

### Phase A — attribution before runtime change

After #529 merges, fetch fresh `main`, run `npm run plan:resolve` and `npm run agent:doctor -- --json`, then establish a fresh production-build baseline for `/` and `/dashboard` using the same methodology before/after.

Required evidence per route:

1. Lighthouse/performance score and exact tool/profile version.
2. LCP, FCP, CLS, TBT and INP when available.
3. transferred bytes and script/first-load JS bytes.
4. main-thread and JS bootup evidence.
5. LCP element/phase breakdown when exposed.
6. request/cache/server timing.
7. eager critical assets/chunks.
8. `npm run analyze` module/chunk attribution.
9. Vercel field evidence when accessible, clearly separated from synthetic lab data.

Do not remote-load-test production.

### Explicit invariants

Implementation must preserve:

- integer-VND and all financial calculations;
- transfer neutrality;
- one bounded authenticated dashboard data load and request-private semantics;
- no shared/private financial caching;
- demo/auth separation;
- capture idempotency and mutation behavior;
- navigation and keyboard shortcuts;
- accessibility and current target-size contract;
- truthful loading with no fabricated balances/totals;
- privacy-safe Analytics/Speed Insights/error reporting;
- Vietnamese glyph coverage and current visual authority.

### Acceptance metrics

Target good budgets:

- LCP <= 2.5 s;
- CLS <= 0.10;
- TBT <= 200 ms.

If LCP remains above 2.5 s, the slice can pass only with a material same-methodology improvement and a recorded remaining bottleneck.

A score increase alone is insufficient. At least one underlying cost must materially fall: initial/client JS, JS bootup/main-thread, LCP render delay, or unnecessary critical transfer.

## Implementation plan

Select only the smallest mechanism explained by Phase A.

### Hypothesis A — dashboard hydration ownership

If analyzer/Lighthouse confirms dashboard client JS/main-thread remains dominant, move only factual/render-only UI that can safely leave the broad client root. Hydrate mutation/interaction islands that truly need browser state. Preserve post-mutation correctness through an explicit existing refresh/data-flow contract; do not create duplicate financial calculation authorities.

### Hypothesis B — shell secondary client UI

If shared shell code is a meaningful initial chunk contributor, defer secondary closed-by-default UI such as sheet internals without delaying primary navigation, keyboard behavior or first-screen content.

### Hypothesis C — public landing eager resources

If current waterfall proves the below-fold story image preload competes with LCP-critical work, remove its eager priority and remeasure.

### Stop conditions

Stop rather than improvise if attribution does not reproduce a repository-controlled bottleneck, the gain requires provider/deployment writes, dashboard splitting creates stale/duplicate truth, privacy/a11y/security would weaken, Vietnamese font coverage is at risk, or the change is within measurement noise.

## Tasks

| ID | Task | Status |
|---|---|---|
| P1 | Inspect production/repo and historical #403 evidence | done |
| P2 | Research current official Next.js/Vercel guidance | done |
| P3 | Specify baseline, invariants, acceptance and stop conditions | done |
| P4 | Select #527 through owner-merged PR #528 | done |
| G1 | Repair post-#528 duplicated board authority through #529 | in progress; governance only |
| I1 | Fresh-main `plan:resolve` + `agent:doctor` after #529 merge | blocked on #529 owner merge |
| I2 | Record current `/` + `/dashboard` analyzer/Lighthouse baseline | blocked on I1 |
| I3 | Implement only the measured smallest mechanism | blocked on I2 |
| I4 | Repeat same-methodology measurements and selected verification | blocked on I3 |
| I5 | Independent evaluation + same-PR current→null lifecycle completion | blocked on I4 |

## Evaluation

The implementation passes only if:

- the meaningful route/mechanism is identified rather than guessed;
- before/after numbers use the same profile and route state;
- improvement exceeds observed run noise;
- an underlying cost improves, not only aggregate score;
- authenticated financial values and mutation freshness remain truthful;
- no private-data cache, provider mutation, analytics weakening, visual deception or accessibility regression is introduced;
- if Vercel field evidence is unavailable, the result says so and does not claim the score 39 is resolved.

Required implementation verification includes `plan:resolve`, `agent:doctor`, `analyze`, load contracts, lint, typecheck, tests, build, policy-selected browser/UI gates, same-methodology Lighthouse before/after, exact-head CI, CodeQL and secret scan.

## Non-scope

- #523 bank-export implementation;
- new acquisition/provider/native/OCR work;
- redesign/Phase E/F visual direction;
- schema/RLS/Auth/provider configuration;
- financial/domain semantic changes;
- new analytics vendor;
- performance tricks that hide content or delay required interactivity;
- governance repair beyond #529.

## Lifecycle

#527 is the current executable slice selected by merged PR #528. #529 only repairs the resolver/authority representation needed to execute that merged decision safely.

The later #527 implementation PR must set `PLAN_AUTHORITY.json.current` to `null`, archive this packet under `docs/plans/completed/`, update current memory and leave zero current executable slices after merge. It may not select #523 in the completing PR.
