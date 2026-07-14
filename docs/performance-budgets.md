# Performance budgets — Landing & Insights (TASK-132)

Vietnamese-first **thu chi** web app. Core Web Vitals targets for the two highest-traffic surfaces:

| Route | Role |
|-------|------|
| `/` | Public landing (logged-out, Supabase configured) |
| `/insights` | Logged-in home — Tổng quan thu chi |

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

### Mitigations shipped (TASK-132)

1. **Landing is a Server Component** — no `"use client"`; LCP text in first HTML paint.
2. **Home routing** — authenticated `/` → `/insights` in proxy; public `/` skips Supabase `getClaims` without auth cookies (faster TTFB/LCP).
3. **Fonts** — Inter preloaded + `adjustFontFallback`; JetBrains Mono `preload: false` (not LCP).
4. **CLS reserves** — hero/preview `min-height`, KPI strong min-height + tabular-nums, `content-visibility` on below-fold landing sections.
5. **Insights JS** — `AddTransactionDialog` dynamic import (`ssr: false`) so first paint path is lighter.
6. **Viewport metadata** — explicit `viewport` + theme-color (no late layout from missing meta).

### How to re-measure with Lighthouse

```bash
npm run build && npm run start
# separate terminal:
npx lighthouse http://localhost:3000/ \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --output=json --output-path=./logs/lighthouse-landing.json

npx lighthouse http://localhost:3000/insights \
  --only-categories=performance \
  --form-factor=mobile \
  --output=json --output-path=./logs/lighthouse-insights.json
```

Record Performance score, LCP, CLS, INP (or TBT in older Lighthouse) into the table above when CI/agent has Chromium.

For **demo mode** (Supabase not configured), `/` redirects to `/insights` — measure insights under demo, not marketing landing.

## Regression guards

Unit tests in `src/lib/performance-budgets.test.ts` assert:

- Landing source is not a Client Component
- Font layout uses `display: "swap"` + Inter preload / mono no-preload
- Proxy fast-path for public `/`
- Performance budget doc exists with LCP/CLS targets

## Non-goals

- Bank sync payload, image CDN, or third-party analytics weight (none in critical path)
- Full YNAB-style onboarding weight on landing
- Chasing 100 Lighthouse score with product feature cuts
