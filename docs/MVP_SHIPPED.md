# MoneyFlow — MVP shipped (rebuild + quality bar)

**Date:** 2026-07-15  
**Queue:** All `IDEA.md` rebuild **R0–R10** and quality **Q1–Q8** checked.  
**Product law:** G5 thu chi cá nhân — no bank sync · AI advisor · family · OCR · inbox brand.

## Gates (evidence)

| Gate | Status |
|------|--------|
| `npm run lint` | green (Q8 ship cycle) |
| `npm run typecheck` | green |
| `npm run test` | green |
| `npm run test:e2e` | green (Q1 / R9) |
| `npm run build` (demo env) | green (Q2 / R10) |
| `scripts/mvp-verify.sh` | wired (Q3) |

## Performance lab (Q8)

Documented in `docs/performance-budgets.md` **Pass 3**:

| Page | Perf | LCP | CLS | TBT | Fonts |
|------|------|-----|-----|-----|-------|
| `/landing` | 91 | 3.4 s | 0 | 70 ms | 141 KiB |
| `/insights` (demo) | 85 | 3.6 s | 0.097 | 180 ms | 141 KiB |

- CLS **≤ 0.10** on both (pass).  
- LCP still **> 2.5 s** — accepted for MVP with mitigation plan (Inter VN + CSS/JS); see budgets doc.  
- Cheap win shipped: **system mono** (drop JetBrains webfont) + solid body first paint.

## Core path (JTBD)

Ghi nhanh → số dư + tháng này tiền đi đâu → xuất CSV.  
Lab (inbox / paste / import / rules) stays under **Nâng cao** only.

## Autopilot

Daemon may idle while this file exists and `IDEA.md` has no open R*/Q*.  
Do **not** invent backlog spam or forbidden features.
