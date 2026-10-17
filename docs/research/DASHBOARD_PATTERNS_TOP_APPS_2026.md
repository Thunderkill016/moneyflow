# Dashboard patterns of top finance apps — October 2026

Scope: **mobile** home/dashboard screens of leading PFM apps, compared
against MoneyFlow's `mobile/lib/features/dashboard/dashboard_page.dart`.
Sources: vendor help centers (Monarch, Copilot, PocketGuard, Spendee,
Money Lover), Mobbin/Swipefile screen captures, ScreensDesign teardowns,
FCA/UX-studio dashboard-usability research. Dated evidence — features
evolve; links in per-app sections.

---

## 1. Per-app teardown

### Money Lover (VN market leader)
- **Home = wallet-centric.** Cash/bank/credit/savings-goal wallets are
  first-class; per-wallet balance is the glance answer. Guided tooltip
  tour on first landing; budgets "unlock" after engagement (gamified
  progressive disclosure).
- **Trending Report on Home:** spending this month vs the *average of
  the last 3 months* — "am I splurging more than usual" in one glance.
- **Money Insider card:** top spending category + ₫/day average + %
  delta vs previous-month daily average. Mini column chart (6 cols:
  selected + 5 prior weeks/months); budget line overlay; red bars when
  over budget.
- **Reports:** opening → ending balance, net income, category breakdown,
  debt/loan, member shares (shared wallets).

### Monarch
- **Customizable widget dashboard** — the flagship pattern: user drags
  to reorder/hide cards; web and mobile keep independent orders.
  Widgets: net worth, spending trend, budget, recent transactions,
  recurring, savings goals, weekly recap, credit score, investments.
- **Cash Flow page:** income vs spend bar chart grouped by
  category/group/merchant + saving-rate %; Sankey diagram on web.

### Copilot
- **Hero = spending-progress graph:** "Free to Spend $1,380 left" with a
  *solid actual-spending line vs dotted ideal-pace line* — the signature
  glanceable viz of 2025-26 PFM.
- **Budgets section:** trending categories, left-to-spend per category,
  pace-colored bars (green → yellow/orange → red; outlined = expected
  recurring).
- **Upcoming:** horizontally-scrolling list of expected recurrings.
- **Net This Month:** income vs spend MTD vs previous MTD.
- Excluded transactions are toggleable into cash-flow math (mirrors our
  `excluded_from_reports` semantics).

### PocketGuard
- **Overview hero = "In My Pocket":** spendable today after bills,
  goals, necessities; swipe → week / month variants. Net worth + net
  income secondary.
- **Spending Pace:** explicit status — On pace / Under pace / Over pace
  — computed from bills + habits vs monthly plan. Overspending alert.

### Spendee
- **All Wallets Overview:** aggregate across chosen wallets with a
  period selector (week/month/year/custom/all-time).
- Wallet + month balance first, then **category-share pie chart**;
  per-category budget progress with "left to spend" figure; alerts at
  75/90/100% + over.
- "How much you can spend daily to stick to your budget" — same
  safe-to-spend math as our MonthRemainder card.

### Money Manager (Realbyte — VN-installed base)
- **Calendar grid as a first-class home view:** each day shows
  income/expense totals; tap a day → that day's transactions.
  Daily/weekly/monthly tabs + pie reports + per-account balances +
  double-entry bookkeeping.

## 2. Cross-app consensus — what every top dashboard answers, in order

1. **"Còn bao nhiêu tiền?"** — hero balance (total + per-wallet).
2. **"Tháng này tiền đi đâu / đang ở đâu so với kế hoạch?"** — month
   spend figure + a *visual* shape: pace line (Copilot), trend chart
   (Money Lover/Monarch), category bars/pie (Spendee/Monarch).
3. **"Có gì cần xử lý / sắp đến hạn?"** — review queue + upcoming
   bills (Copilot Upcoming, PocketGuard bills).
4. **"Ghi mới"** — always-reachable capture (FAB/center button).
5. **Recent activity** — latest transactions, day-grouped.

Inverted-pyramid rule (uxstudio/Merge/FCA): the top 3 questions get the
most space; facts stated *relative to plan* (pace, left-to-spend, % vs
prior) beat raw numbers; timely simplification measurably improves
comprehension (FCA: +13 pp).

## 3. MoneyFlow mobile dashboard — current order (verified in code)

1. `_StaleBanner` (offline snapshot) → 2. `_TotalCard` hero →
3. `_AttentionCard` (inbox/needs-review/overdue commitments/drift) →
4. `_MonthRemainderCard` (per-day safe spend + budget alerts) →
5. `_MonthSummaryCard` (thu/chi/còn lại + top category + MoM delta) →
6. `_WatchCard` (pinned categories/payees) →
7. `_RecurringSuggestionCard` → 8. `Tài khoản` strip →
9. `Hoạt động gần đây` recent rows.

## 4. Gaps vs the consensus (ranked by evidence × fit)

| # | Pattern | Who proves it | MoneyFlow today | Verdict |
|---|---|---|---|---|
| P1 | **Month pace visual** — cumulative spend line vs ideal-pace dotted | Copilot flagship; PocketGuard pace status; Money Lover trending | MonthRemainder shows ₫/day but *no shape* — user can't see "đang đi nhanh hay chậm" | **Biggest gap.** Budget + daily data already derivable client-side |
| P2 | **Top-categories visual** (3-5 bars w/ share %) | Spendee pie, Monarch progress bars, Copilot rings | Top category is one text line inside MonthSummary; no ranked breakdown on dashboard | High value, cheap — summaryRows already on device |
| P3 | **Upcoming bills forward view** | Copilot Upcoming scroll, PocketGuard | Attention card covers overdue/drift — nothing surfaces "sắp đến hạn trong 7 ngày" | Cheap — RecurringCommitment.dueDay exists |
| P4 | **Pace status label** (On/Under/Over) | PocketGuard Spending Pace | Budget alerts fire at 80/100% but no holistic "đang đúng nhịp" verdict | Folds into P1 card |
| P5 | Customizable widget order | Monarch | Fixed layout | **Defer** — contradicts progressive-disclosure law; revisit post-1.0 |
| P6 | Calendar spending grid | Money Manager | Timeline tab exists; not on dashboard | **Defer** — timeline tab covers the JTBD |
| P7 | Net-worth / investment hero | Monarch, PocketGuard | Out of scope (no investments in VN MVP) | Rejected per product law |
| P8 | Weekly recap widget | Monarch | Month summary only | Low — digest notification covers weekly close |

### Already at parity or ahead
Hero total + per-wallet strip (Money Lover/Spendee), attention queue
(Copilot to-review), safe-to-spend math (PocketGuard/Spendee),
month summary w/ MoM delta (Money Lover trending), watchlist pins,
recurring suggestions, excluded-from-reports honesty.

## 5. Recommended next slice (fits "no new feature areas" rule)

**P1 pace card upgrade** — extend `_MonthRemainderCard` into a
month-shape card: cumulative daily expense line + dotted ideal-pace
line + On/Under/Over status label + existing ₫/day figure. All data
present: daily expense buckets + budget limits + commitments.

Then **P2**: top-3 category share bars inside `_MonthSummaryCard` (or
merged into the pace card's right column), then **P3**: "Sắp đến hạn"
section in `_AttentionCard` from `commitmentStatus` upcoming window.

No new navigation, no new data sources — all vertical polish on the
existing dashboard surface.
