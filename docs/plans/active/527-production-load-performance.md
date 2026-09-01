# #527 — recover production page-load performance

**Issue:** #527
**Parent authority:** operational/product quality under the current MoneyFlow product; #432 remains master product strategy
**Baseline:** `main@d6ff88bff08d9efc3bfca828ce861b15b4cc0620`
**Status:** specified — selection candidate until the planning PR is owner-merged
**Change class:** planning Class 0 here; implementation is at least Class 2 and becomes Class 3 if it alters cross-cutting authenticated rendering/data-flow boundaries
**Owner merge required:** yes

## Why this slice exists now

On 2026-09-02 the owner reported a current Vercel load/performance score of **39**. That is fresh production-quality evidence and outranks candidate #523 in execution priority until the regression is attributed and materially improved.

This packet reopens the performance problem, not the completed #403 experiment. Historical #403 evidence remains valid provenance:

- canonical `/` and `/dashboard` server response was already small in the lab harness;
- the remaining measured cost was render delay/main-thread/client JavaScript;
- the dashboard loading-boundary experiment later recorded in PR #483 was negative for material LCP improvement and must not be repeated as an assumed fix.

The owner-reported 39 is not independently reproduced yet. It must remain labelled as owner/Vercel field observation until the current measurement phase reproduces or decomposes it.

## Fresh production reconnaissance

Against the current production origin `https://mfvn.vercel.app`:

- `/` returns HTTP 200;
- `x-vercel-cache: HIT`;
- `x-nextjs-prerender: 1`;
- production HTML is prerendered/CDN-served;
- `src/lib/supabase/proxy.ts` skips Supabase auth for anonymous public routes when there is no auth cookie.

Therefore anonymous-home server/database latency is not the leading hypothesis.

Current code also shows:

- `src/components/moneyflow-dashboard.tsx` is a `"use client"` root for the authenticated dashboard;
- large factual/render-only dashboard sections are children of that client boundary;
- `src/components/layout/app-shell.tsx` is a shared authenticated `"use client"` root with routing, keyboard, connectivity, sheet, toast and navigation behavior;
- the public landing marks the first story screenshot `/landing/moneyflow-quick-capture.svg` as `priority`, so production preloads it even though source places it after the text hero. This is only a candidate cause until current waterfall/fold evidence proves it matters.

## Historical comparison evidence — not a new baseline

The last canonical #403 lab run recorded approximately:

| Route | Script transfer | Main-thread work | JS bootup |
|---|---:|---:|---:|
| `/` | 195.8 KB | ~1.2 s | ~367–381 ms |
| `/dashboard` | 311.6 KB | ~1.72–1.75 s | ~766–814 ms |

Those values explain why client ownership is the first code hypothesis, but acceptance requires a fresh current-main baseline on identical before/after methodology.

## User-visible problem

A finance ledger that takes several seconds to become useful creates friction on the exact repeated loop MoneyFlow needs to make cheap: open → understand → record/review. A low field score also means prior CI/lab confidence is not enough to represent real devices/networks.

The goal is not to win a synthetic score. The goal is to remove actual critical-path work while preserving truthful content and interaction.

## Phase A — attribution before runtime change

No implementation change is allowed until the task branch records a fresh production-build baseline for `/` and `/dashboard` using the same methodology before/after.

Required evidence per route:

1. Lighthouse/performance score and exact profile/tool version.
2. LCP, FCP, CLS, TBT and INP when available.
3. transferred bytes and script/first-load JS bytes.
4. main-thread and JS bootup evidence.
5. LCP element and phase breakdown when the tool exposes it.
6. request/cache/server timing.
7. eager critical assets/chunks.
8. `npm run analyze` module/chunk attribution.
9. field/Speed Insights route evidence when accessible, clearly separated from synthetic lab data.

Do not remote-load-test production. Existing k6 production safeguards remain unchanged.

## Decision rule after Phase A

Select the smallest mechanism that explains a material part of the measured cost.

### Hypothesis A — authenticated dashboard hydration ownership

If analyzer/Lighthouse confirms dashboard client JS/main-thread remains dominant, reduce the amount of factual dashboard UI owned by the top-level client island.

Preferred shape:

- server-render facts already derived from the one bounded dashboard workspace load;
- hydrate only mutation/interaction islands that require browser state;
- after a successful mutation, preserve correctness through an explicit server refresh or other already-valid data-flow mechanism rather than duplicating financial truth in two competing client/server models;
- do not introduce shared caching of private financial data.

Before choosing this shape, trace `MoneyFlowDashboard`, `useTransactions`, mutation dialogs and every live-update expectation. If splitting would create stale totals or duplicate calculation authorities, stop and choose a smaller mechanism.

### Hypothesis B — authenticated shell initial bundle

If shared shell code is a meaningful initial chunk contributor, defer secondary client-only UI that is not required for first useful paint, such as closed-sheet internals, without changing navigation/a11y/keyboard behavior.

Do not defer primary navigation or content needed to understand the first screen.

### Hypothesis C — public landing eager resources

If the public route waterfall shows below-fold story image preload competing with LCP-critical work, remove its eager priority/preload and verify the same landing layout/content with lower critical transfer pressure.

Do not touch Vietnamese font coverage or root analytics merely because they are visible in the waterfall.

### Other mechanisms

Font strategy, root client components, global CSS or another eager dependency may be selected only when fresh attribution points there. #403's inconclusive font/loading-boundary experiments cannot be presented as new evidence.

## Explicit invariants

Implementation must preserve:

- integer-VND and all financial calculations;
- transfer neutrality;
- one bounded authenticated dashboard data load and request-private semantics;
- no shared/private financial caching;
- demo/auth separation;
- capture idempotency and mutation behavior;
- navigation and keyboard shortcuts;
- accessibility and the current 44px target contract;
- truthful loading: no fabricated balances/totals;
- Analytics, privacy-safe Speed Insights and current error reporting;
- Vietnamese glyph coverage and current visual authority.

## Acceptance metrics

Target current good budgets:

- LCP <= 2.5 s;
- CLS <= 0.10;
- TBT <= 200 ms.

If LCP remains above 2.5 s, the implementation can still pass only when it demonstrates a material same-methodology improvement and records the remaining bottleneck.

A score increase alone is insufficient. The chosen mechanism must show at least one corresponding cost reduction such as:

- lower first-load/client JS bytes;
- lower JS bootup/main-thread work;
- lower LCP render delay;
- removal of an unnecessary critical-path transfer.

No result may claim the owner-reported Vercel score 39 was fixed unless current field evidence actually changes accordingly.

## Required verification

Before owner handoff of the implementation PR:

- `npm run plan:resolve`;
- `npm run agent:doctor -- --json`;
- `npm run analyze`;
- `npm run test:load:contracts`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`;
- policy-selected browser smoke/UI/WCAG gates for touched surfaces;
- same-methodology Lighthouse before/after `/` and `/dashboard`;
- exact final head CI, CodeQL and secret scan as selected by policy;
- independent evaluation focused on whether work was removed rather than hidden/deferred and whether financial/private-data behavior stayed truthful.

## Stop conditions

Stop implementation and report rather than improvising if:

- current attribution does not reproduce a repository-controlled bottleneck;
- the proposed gain requires provider/deployment writes or production load testing;
- dashboard island splitting would create two financial calculation authorities or stale post-mutation facts;
- a change requires weakening privacy/security/analytics/a11y;
- font/CSS trimming risks Vietnamese coverage or current visual authority;
- improvement is within measurement noise.

## Non-scope

- #523 bank-export implementation;
- new acquisition/provider/native/OCR work;
- redesign or Phase E/F visual direction;
- schema/RLS/Auth/provider configuration;
- financial/domain semantic changes;
- new analytics vendor;
- performance tricks that hide content or delay required interactivity.

## Lifecycle

The planning PR that adds/selects this packet changes authority only. If owner-merged, #527 becomes the single current agent-executable slice and #523 remains candidate NEXT.

The later implementation PR must complete #527 in the same-PR lifecycle projection, archive this packet under `docs/plans/completed/`, update board/current memory, and leave zero follow-on current slices after merge. It may not select #523 in the completing PR.