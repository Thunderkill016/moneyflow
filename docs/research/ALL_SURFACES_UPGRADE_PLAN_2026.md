# All-surfaces upgrade plan — September 2026

Owner direction (PR #635 + this task): **upgrade every existing surface to
top-product depth — no new feature areas.**

Method: walked all 30 product routes on the live demo build (phone viewport,
screenshots), cross-checked current code, and applied 2026 fintech-UX evidence:
dashboard must answer the first question before the user blinks; legible
density over decoration; friction only on high-stakes actions; one contextual
insight max; passive scan patterns (recent tx = fraud check, balances = "where
is my money").

This document **authorizes nothing** — each item needs its own bounded packet.

---

## Surface inventory (verified 2026-09-21, demo mode)

| Route | What exists today |
|---|---|
| `/dashboard` | Balance hero + month flow bar, trust strip (auth), attention chips, 4 planning links, top-5 categories, recent-5 tx |
| `/transactions` | KPI strip, search, kind chips, day-grouped rows, bulk select/review, edit/delete/split |
| `/accounts` | Per-account balances (incl. USD tracked separately), add/edit/archive, transfer, initial-balance display |
| `/capture` | Hub + `/quick` amount-first + `/paste` parser + `/upload` (CSV/XLSX/text-PDF) + `/share` target |
| `/inbox` | Candidate queue, status tabs, filter chips (trùng/chuyển khoản), per-candidate + **bulk approve** (Sẵn sàng only), bulk category |
| `/reports` | Period picker, prior-period compare, **daily pace bars**, category bars, account bars |
| `/activity` | Activity feed with deep-links (#628) |
| `/timeline` | Day-grouped approved timeline |
| `/budgets` `/commitments` `/goals` `/income-templates` | Planning surfaces — full CRUD, thresholds, due/paid, progress |
| `/categories` `/imports` `/rules` | Category mgmt, import history + direct CSV, **inbox rules UI already exists** |
| `/settings/*` | Appearance, connected apps (OAuth), backup/restore, export, notifications, privacy |
| `/security` `/privacy` `/onboarding` `/landing` | Trust page, privacy, onboarding, marketing landing |

## Per-surface upgrade backlog

### 1. Dashboard — first-glance completeness *(already started: G3 merged via #638)*

| # | Upgrade | Evidence |
|---|---|---|
| D1 | **Per-account strip** under `Bạn đang có` — balances exist server-side; every VN wallet answers "tiền nằm ví nào" first | Research G1; accounts page proves data |
| D2 | Month-shape mini bars on statement — exists on `/reports` ("Nhịp chi tiêu"); lift the same computation, not new data | Research G2 |
| D3 | Day-group headers in recent-5 (parity with `/transactions`) | Research G4 |
| D4 | Prior-month compare line — factual only ("tháng trước cùng ngày"), weekly already does this | Reports pattern |

### 2. Transactions — ledger depth

| # | Upgrade | Evidence |
|---|---|---|
| T1 | needs_review count surfaced in KPI strip or filter chip — the filter exists (`?review=`), visibility from this page's own header would close the loop the dashboard chip opens | Complements #638 |
| T2 | Amount range + date chips already exist — add **one-tap "tuần này / tháng này / tháng trước"** presets (manual range entry is slow on mobile) | Filter UX gap |
| T3 | Row density option or compact mode — 3-5 rows visible per screen on phone; power users want more rows | VN wallet apps show 8-12 |

### 3. Capture — speed (post-benchmark, per spec discipline)

| # | Upgrade | Evidence |
|---|---|
| C1 | **Run the TTLT benchmark first** (`/capture-bench.html`, #636) — no capture change before numbers | Spec Slice 0 |
| C2 | Frequent Patterns / repeat hints — H2, gated on benchmark | Spec |
| C3 | Paste→approve latency — D-series tasks measure the two-leg path | Spec H4 |

### 4. Inbox — review throughput

Bulk approve already shipped — `InboxBulkBar` has "Duyệt vào sổ" with honest
scoping (only *Sẵn sàng* candidates create transactions; *Cần xem lại* stay
pending). Bulk category assignment exists too. **No confirmed gap without
usage evidence** — revisit only after the #576 pilot or benchmark runs surface
a real bottleneck.

### 5. Reports — already strong; deepen

| # | Upgrade | Evidence |
|---|---|---|
| R1 | Category trend over months (is ăn uống rising?) — single line per top category | Competitor staple |
| R2 | Export the visible report period directly (currently export lives in settings) | Convenience gap |

### 6. Planning surfaces — consistency

| # | Upgrade | Evidence |
|---|---|---|
| P1 | Budget "pace" line — spent X% vs month elapsed Y% (descriptive, not advice) | Toshl pattern; safe-to-spend still banned |

(Pay-commitment → transaction already exists: `markCommitmentPaid` records a
`transactionId` per occurrence — `src/lib/planning/commitments.ts`.)

### 7. Trust & settings — polish

| # | Upgrade | Evidence |
|---|---|---|
| S1 | Backup reminder — if no backup in N days, attention chip suggests one | Data-loss prevention is the trust moat |
| S2 | `/security` trust page is **orphaned** — not linked from the settings hub (`settings-hub-page.tsx` has 7 links, none to it). One-line fix, real trust value | Verified: 0 references |

### 8. Cross-cutting

| # | Upgrade | Evidence |
|---|---|---|
| X1 | Offline/PWA polish — install prompt, offline read of last-loaded dashboard | Roadmap item 7 |
| X2 | Per-page skeleton loading states consistency | Partially exists |

## Sequencing (impact × effort)

1. **G3 done (#638)** → **S2 security link** (one-line) → **D1 per-account strip** — biggest first-glance win
2. **T1 needs_review in tx KPI + T2 date presets** — ledger daily-use depth
3. **D2 month shape** + **D4 compare** — statement completeness
4. **C1 benchmark run** → evidence → C2/C3 (capture changes stay gated)
5. P1, R1/R2, S1, X1/X2 as follow-ups

## Explicit non-goals

New categories (debt tracking, household, multi-currency mgmt, bank sync, AI
advice, OCR, notifications beyond commitments) — all deferred per #635.

## Open questions for owner

- D1: all accounts or top-4 + "Xem tất cả"? (recommend ≤4 + link)
- T3 compact density: worth a settings toggle or default denser rows?
