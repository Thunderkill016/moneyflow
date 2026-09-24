# Dashboard upgrade research — September 2026

Owner direction (2026-09-21, PR #635): **upgrade existing surfaces to
top-product depth; do not add new feature areas.** This document applies that
direction to `/dashboard` — the canonical signed-in home.

Evidence basis: current code on `main@c0857150`, merged PR history (esp. #589),
`docs/design/CURRENT_DESIGN_SYSTEM.md`, dated competitive notes in
`docs/research/SOLO_COMPETITIVE_STRATEGY_2026.md` and
`docs/research/PRODUCT_COMPETITIVE_MEMORY.md`.

---

## 1. What the dashboard ships today

Verified from `src/app/dashboard/page.tsx`,
`src/components/moneyflow-dashboard.tsx`,
`src/components/dashboard/dashboard-overview-sections.tsx`,
`src/components/dashboard/statement.tsx`:

| Surface | Content |
|---|---|
| Welcome row | `Chào {name}` + Xuất CSV shortcut |
| Statement | `Bạn đang có` total balance; month flow bar (vào / ra / còn lại); drill-down link to month transactions |
| Ledger-trust strip | Auth mode only — headline + action from `presentLedgerTrust` |
| Attention strip | Up to 4 chips: budget near/over, commitments due, inbox pending (`src/lib/attention.ts`) |
| Planning nav | 4 compact links to Ngân sách / Khoản định kỳ / Lương định kỳ / Mục tiêu |
| Top categories | Top-5 expense categories this month, share bars, per-category drill-down |
| Recent transactions | Latest 5 rows with kind-colored amounts |
| Dialogs | Add / transfer / edit — live totals recompute client-side |

Deliberate decisions that bound any upgrade:

- **#589 removed the full planning column** (`DashboardPlanningColumn` is
  orphaned code; `insights-goals-card.test.ts` pins it *not* imported).
  Rationale: progressive disclosure, ledger-first, −4.7 % dashboard script
  bytes. Any proposal to put planning panels back must openly argue to reverse
  a merged owner decision — not assumed.
- **Safe-to-spend stays withdrawn** (`page.tsx` comment): no numeric
  spending-advice figure until a provable income-based plan exists. Pace-style
  *facts* (đã dùng X % tháng) are a different claim from advice; the line must
  stay descriptive, never prescriptive.
- Design authority: Fresh Blue action color, white-first neutrals, semantic
  income/expense/transfer/warning colors, Inter + tabular money, calm ledger
  posture — money is the strongest scan target, no gamification.

## 2. What top-product homes do (dated evidence)

| Product | Home pattern |
|---|---|
| Monarch / Copilot | Net-worth or cash hero, per-account balances, spending trend chart, budget summary, recent tx; widget layout |
| YNAB | Budget-assign-first; every dollar gets a job — different philosophy, skip |
| Actual | Net-worth graph + budget table |
| Money Lover / MISA (VN) | Per-wallet balances prominent, month report banner, quick-add |
| Lunch Money | Calendar of spending + categories + budgets |

Common thread MoneyFlow partially misses: **where the money sits** (per-account)
and **the shape of the month so far** (trend/pace) — both answerable from data
already on the client.

## 3. Gaps on existing surfaces, ranked

> **Status update (2026-09-24, verified on `main`):** G1, G2 and G3 shipped
> after this document was written — the per-account strip renders
> `Số dư từng ví` in `statement.tsx`, the month-shape daily strip shipped in
> #643 (`feat(dashboard): month-shape strip + prior-window compare`), and the
> `needs_review` attention chip is already wired end-to-end
> (`buildAttentionItems` → `/transactions?review=needs_review`). G4 is
> implemented in PR #712, pending merge. Only G5 remains open (measurement-
> gated). Sections below are kept for provenance.

### G1 — Per-account balances behind the total *(highest value)* — **shipped**

`Bạn đang có` is one sum; `AccountOption` on the dashboard workspace carries
only `{id, name, currencyCode}` (`src/lib/transactions/contracts.ts:42`).
Per-account balances exist server-side (`mapAccountRow` →
`AccountSummary.balance`, `src/server/accounts.ts`) and render on `/accounts`,
but the first screen cannot answer "tiền đang nằm ở ví nào?" — the single most
common glance question, and every VN wallet app leads with it.

*Upgrade:* extend `getDashboardPageWorkspace` to carry account balances; render
a compact per-account strip under the total (name + balance, neutral, transfer
accounts included). Bounded to dashboard workspace + statement section.

### G2 — Month shape / spending pace *(high value, design-careful)* — **shipped (#643)**

The flow bar shows *how much* this month but not *when*. A thin daily-expense
bar strip under the legend (data already in `transactions`) shows the month’s
shape without a chart library. Optionally a factual compare line ("tháng trước
đến ngày này: X") — the weekly summary already computes a prior-week compare
(`weeklyExpenseCompareLine`), so a month analogue is consistent.

*Boundary:* descriptive facts only — never "bạn nên chi ≤Y/ngày" (that is the
withdrawn safe-to-spend).

### G3 — needs-review visibility *(trust gap)* — **shipped**

Transactions carry `reviewStatus` (`needs_review` exists in
`transaction-store.ts`, `ledger-trust.ts`, transactions workspace bulk-review).
The attention strip counts budgets/commitments/inbox but **not** ledger rows
awaiting review — a trust-surface hole: unreviewed rows sit invisible on the
home screen.

*Upgrade:* add a `needs_review` count chip to `buildAttentionItems` →
`/transactions` filtered view.

### G4 — Recent list polish *(low risk)* — **implemented in PR #712, pending merge**

Latest-5 rows with `relativeDate`; top products group by day headers. Small
readability upgrade, zero data change.

*Implemented (PR #712):* `groupRecentTransactionsByDay(rows, today)`
(`src/lib/dashboard-recent-groups.ts`) groups the latest-5 by `occurredOn`,
sorted newest day first with ledger order preserved inside each group. The
header derives the date label from `occurredOn` + the workspace `today` via
`formatRelativeDate` (`src/lib/relative-date.ts`) inside `<time dateTime>` —
never from `relativeDate`, which optimistic rows overload with statuses
("Đang lưu…", "Vừa sửa", "Vừa xong", see `src/lib/transaction-status.ts`).
A row shows that status inline only when `isTransactionStatusLabel` says the
label is a state, so a stale persisted date can never masquerade as one.

### G5 — Hydration/perf depth *(engineering)*

`MoneyFlowDashboard` is one client boundary for live recompute. #589 cut 4.7 %;
more could move server-side (statement is pure presentation of loader data).
Measure before acting — use the existing `performance.mobile.auth.spec.ts`
harness, do not optimize blind.

## 4. Explicit non-goals for this round

- **Do not re-add `DashboardPlanningColumn`** — reverses #589; needs owner
  reversal decision with evidence, separate packet.
- No safe-to-spend number, advice, or nudges.
- No net-worth *history* graph requiring balance snapshots we don't store
  (balances derive from transactions; a true daily net-worth series is a
  separate modeling question).
- No new data sources, widgets marketplace, or customization system.

## 5. Suggested sequencing

1. **G3 needs-review chip** — smallest, pure attention-layer, closes a real
   trust hole.
2. **G1 per-account strip** — biggest first-glance value; bounded workspace
   extension.
3. **G2 month-shape strip** — after G1, same statement section.
4. G4 polish; G5 only if measurements justify.

Each item needs its own bounded packet before implementation. This document
authorizes nothing.

## 6. Open questions for owner

- Per-account strip: all accounts or top-N with "Xem tất cả"? (recommend ≤4 +
  overflow link to `/accounts`)
- Month-compare line: keep factual ("tháng trước cùng ngày: X") or omit until
  benchmark/user pull exists?
- Is a `needs_review` backlog expected in normal use, or should the chip only
  appear when count > 0? (recommend: only when > 0, matching attention-strip
  convention)
