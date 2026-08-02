# Performance, load and resilience budgets

Vietnamese-first **thu chi** web app. Core Web Vitals targets for the two highest-traffic surfaces:

| Route | Role |
|-------|------|
| `/` | Public landing (logged-out, Supabase configured) |
| `/dashboard` | Canonical logged-in home — Tổng quan thu chi |

`/insights` appears below only in historical measurements from TASK-132. It is
no longer the canonical signed-in route and must not be used for new baselines.

## Budgets (lab + field)

| Metric | Budget (good) | Needs work | Poor |
|--------|---------------|------------|------|
| **LCP** | ≤ **2.5 s** | ≤ 4.0 s | > 4.0 s |
| **CLS** | ≤ **0.10** | ≤ 0.25 | > 0.25 |
| **INP** | ≤ **200 ms** | ≤ 500 ms | > 500 ms |

Secondary (not hard gates for TASK-132):

| Metric | Target |
|--------|--------|
| FCP | ≤ 1.8 s |
| TTFB | ≤ 0.8 s (static landing edge) |
| Total blocking time (lab) | ≤ 200 ms mobile mid-tier |

## Scores recorded (lab methodology)

Environment used for this task (agent machine, 2026-07-15):

- Build: `npm run build` + `npm run start` (production)
- Tooling: static analysis + production bundle path (full Chrome Lighthouse may be re-run in CI later)
- Device profile assumption: mobile mid-tier, 4× CPU slowdown, Slow 4G — *when* Lighthouse is available

| Page | LCP | CLS | Notes |
|------|-----|-----|-------|
| **Landing `/`** | **Target ≤ 2.5s** — path optimized for static HTML LCP (hero `h1`) | **Target ≤ 0.1** — reserved hero/preview heights + size-adjusted font fallback | Server Component landing; no auth `getClaims` when no session cookies |
| **Insights `/insights`** | **Target ≤ 2.5s** — `loading.tsx` shell + deferred dialog chunk | **Target ≤ 0.1** — KPI `min-height` + tabular nums + layout contain | Dialog code-split; mono font not preloaded |

### Lab scores (agent machine, 2026-07-15)

Environment: `next build` + `next start` **demo mode** (placeholder Supabase), Lighthouse **13.4** mobile simulated Slow 4G, Chromium headless.

**Pass 1 (before font trim):**

| Page | Perf | LCP | CLS | TBT | SI | Transfer |
|------|------|-----|-----|-----|-----|----------|
| `/landing` | 84 | 3.9 s | 0.003 | 150 ms | 2.6 s | 452 KiB (fonts ~197) |
| `/insights` (demo) | 73 | 4.4 s | 0.085 | 350 ms | 2.9 s | 735 KiB (JS ~420) |

**Pass 2 (JetBrains mono latin weight 500 only):**

| Page | Perf | LCP | CLS | TBT | SI | Transfer |
|------|------|-----|-----|-----|-----|----------|
| `/landing` | **88** | **3.7 s** | **0.003** | **70 ms** | 2.5 s | **426 KiB** (fonts ~171) |
| `/insights` (demo) | 70 | **4.2 s** | **0.085** | 500 ms* | 2.8 s | **709 KiB** (JS ~421) |

\*TBT lab variance; LCP/transfer improved.

**Pass 3 (Q8 — system mono + solid body first paint, 2026-07-15):**

Environment: `NEXT_PUBLIC_SUPABASE_*=placeholder` demo build + `next start`, Lighthouse **13.4** mobile Slow 4G, Chromium headless. JSON: `logs/lighthouse-landing-q8.json`, `logs/lighthouse-insights-q8.json`.

| Page | Perf | LCP | CLS | TBT | SI | Transfer |
|------|------|-----|-----|-----|-----|----------|
| `/landing` | **91** | **3.4 s** | **0** | **70 ms** | 2.4 s | **463 KiB** (fonts **141**) |
| `/insights` (demo) | **85** | **3.6 s** | **0.097** | **180 ms** | 1.5 s | **645 KiB** (fonts **141**) |

Delta vs Pass 2: landing LCP **−0.3 s**, perf **+3**; insights LCP **−0.6 s**, perf **+15**, TBT into budget; fonts **~171 → 141 KiB** (no JetBrains webfont).

| Budget | Landing | Insights | Status |
|--------|---------|----------|--------|
| LCP ≤ 2.5 s | 3.4 s | 3.6 s | **Miss** (Inter VN + app CSS/JS still dominate) |
| CLS ≤ 0.10 | 0 | 0.097 | **Pass** |
| TBT ~INP proxy ≤ 200 ms | 70 ms | 180 ms | **Pass** both |

**Bottlenecks next:** Inter vietnamese subset (~primary remaining font cost), unused CSS, insights client JS.

### Mitigations shipped (TASK-132 + speed pass + Q8)

1. **Landing is a Server Component** — no `"use client"`; LCP text in first HTML paint.
2. **Home routing** — authenticated `/` → `/dashboard` in proxy; public `/`, `/landing`, `/privacy` skip Supabase `getClaims` without auth cookies (faster TTFB/LCP).
3. **Fonts (Q8)** — Inter only (preloaded + `adjustFontFallback`); **money mono = system `ui-monospace` stack** — no second Google webfont.
4. **CLS reserves** — hero/preview `min-height`, KPI strong min-height + tabular-nums, `content-visibility` on below-fold landing sections.
5. **Insights JS** — `AddTransactionDialog` dynamic import (`ssr: false`) so first paint path is lighter.
6. **Viewport metadata** — explicit `viewport` + theme-color (no late layout from missing meta).
7. **Hydration** — `suppressHydrationWarning` + theme bootstrap on `<html>`; `data-scroll-behavior="smooth"`.
8. **Transactions JS** — add/transfer/split/edit dialogs code-split (`dynamic` + `ssr: false`).
9. **lucide-react** — `optimizePackageImports` in `next.config.ts`.
10. **Offscreen paint** — `content-visibility: auto` on below-fold insights panels.
11. **Inbox badge** — `requestIdleCallback`; wire `inboxCount` into AppShell on insights.
12. **Body paint (Q8)** — solid `background-color` first; decorative radial wash on `body::before`; `text-rendering: auto`.

### How to re-measure with Lighthouse

```bash
# Demo mode (matches Pass 3 lab table)
export NEXT_PUBLIC_SUPABASE_URL=placeholder
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder
npm run build && npm run start
# separate terminal:
npx lighthouse http://localhost:3000/landing \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=./logs/lighthouse-landing-q8.json

npx lighthouse http://localhost:3000/dashboard \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=./logs/lighthouse-dashboard-current.json
```

Record Performance score, LCP, CLS, INP (or TBT in older Lighthouse) into the table above when CI/agent has Chromium.

For **demo mode** (Supabase not configured), `/` redirects to `/dashboard` —
measure the dashboard there; marketing landing remains `/landing`.

## Load and database budgets

These budgets are release gates, not a claim about production capacity. A
capacity claim is valid only for the exact commit, provider configuration and
test profile recorded with the result.

| Signal | Budget | Why |
|---|---:|---|
| Public-route HTTP failure rate | < 1% | Keeps CDN/static delivery reliable during a ramp |
| Public-route p95 response time | < 800 ms | Matches the static-edge TTFB budget |
| Authenticated dashboard Data API calls after viewer resolution | 1 | Prevents per-user PostgREST fan-out |
| Dashboard transaction date window | <= 45 days | Prevents a forged RPC call from scanning full history |
| Dashboard recent-row limit | 1–20 (application uses 5) | Bounds payload and sort work |
| Database CPU and connection utilization during an approved load run | < 70% sustained | Leaves recovery headroom |
| Mutation duplicates or lost writes | 0 | Financial correctness is a hard gate |

The dashboard RPC is request-private and must never use a shared CDN cache.
Public landing HTML and immutable assets may use Vercel's edge cache.

## Safe load-test protocol

`tests/load/public-smoke.js` is deliberately conservative: 10 virtual users for
30 seconds by default, a maximum of 50, and localhost-only unless the operator
sets both `BASE_URL` and `ALLOW_REMOTE_LOAD_TEST=yes`.

```bash
# Safe local baseline (requires k6 and a running production build)
npm run build
npm run start
k6 run tests/load/public-smoke.js

# Preview/staging only, after owner authorization and provider monitoring setup
BASE_URL=https://approved-preview.example \
ALLOW_REMOTE_LOAD_TEST=yes \
VUS=25 DURATION=60s \
k6 run tests/load/public-smoke.js
```

Do not point this script at production during an incident. Increase concurrency
in separate 10 -> 25 -> 50 VU runs and stop when any threshold fails, 429/5xx
rises, or database CPU/connections cross 70%. Record the deployed SHA, Vercel
Function metrics and Supabase metrics with every result.

Authenticated load testing needs isolated synthetic users and a separate,
approved script; never reuse a real person's session or financial data.

## DDoS and overload runbook

Vercel provides automatic platform DDoS mitigation before traffic reaches the
application. Custom application-layer controls must be deployed in this order:

1. Create a narrowly matched custom rule in **Log** mode for the attacked route
   and method; do not begin with a global deny rule.
2. Observe legitimate/bot match volume and source distribution through a full
   traffic cycle.
3. Move the validated rule to preview/challenge or rate limit. Preserve normal
   navigation and accessibility flows.
4. Publish enforcement only with owner approval and a rollback rule documented.
5. During database saturation, suspend heavy import/export work first, preserve
   read-only navigation, honor `Retry-After`, and avoid immediate client retries.

Suggested first observation targets are auth submissions and capture/import
mutations, not static landing assets. Route names and thresholds must come from
current Firewall logs; repository code must not implement an in-memory rate
limiter because serverless instances and regions do not share its counters.

## Regression guards

Unit tests in `src/lib/performance-budgets.test.ts` assert:

- Landing source is not a Client Component
- Font layout uses `display: "swap"` + Inter preload / mono no-preload
- Proxy fast-path for public `/`
- Performance budget doc exists with LCP/CLS and bounded-load targets

## Non-goals

- Bank sync payload, image CDN, or third-party analytics weight (none in critical path)
- Full YNAB-style onboarding weight on landing
- Chasing 100 Lighthouse score with product feature cuts
