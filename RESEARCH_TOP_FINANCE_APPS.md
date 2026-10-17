# Top personal-finance apps — feature dissection & gap list

**Purpose.** Competitive evidence for MoneyFlow's next product slices: what the best
consumer finance apps actually ship, which of those mechanisms transfer to a
Vietnamese manual-first ledger with no bank aggregation, and a ranked gap list with
concrete implementation tasks. This document is evidence, not task authority; nothing
here authorizes roadmap work by itself (see `AGENTS.md` authority route).

**Method.** Per-app feature dissection from first-party help centers and product
pages, plus third-party reviews where docs are thin. Existing repo research is reused,
not redone: `docs/research/MONARCH_DEEP_DIVE.md` (Monarch, per-screen),
`docs/research/PRODUCT_COMPETITIVE_MEMORY.md` (capability matrix + per-product
lessons), `docs/research/PHASE_B_FRESH_PRODUCT_EXPERIENCE_RESEARCH.md` (mechanism
patterns P1–P10, A1–A3). MoneyFlow capability claims are verified against current
code (`mobile/lib/**`, `src/**`) at branch `feat/mobile-theme`.

**Labels.** Every claim is tagged:

- `fact` — stated or demonstrated by the cited first-party doc/review;
- `third-party` — review, recorded flow or store listing, may drift;
- `inference` — our reasoning from the above;
- `shipped` — already exists in current MoneyFlow code (file cited); classification
  recorded for completeness but not re-counted as a gap.

**Access dates.** All URLs fetched or re-verified **2026-10-16** unless a different
date is recorded inline (Monarch sources: 2026-10-15/16 per the deep-dive).

**Locked MoneyFlow boundaries** (owner decisions, `PRODUCT_COMPETITIVE_MEMORY.md`
§7.4, `docs/product/CANON.md`): **no aggregation pivot, no household/collaboration,
no net-worth/investment tracking, no AI mutation of user data, no multi-currency
engine, no financial-services marketplace.** Vietnam has no open banking; MoneyFlow's
acquisition equivalents are SMS paste/parse, notification capture, statement
CSV/XLSX import, manual entry and balance reconciliation — all shipped
(`mobile/lib/data/notification_capture/`, `mobile/lib/domain/{quick_parse,csv_import,
xlsx_import,voice_money_parser}.dart`, `mobile/lib/domain/reconciliation.dart`).

**Verdict vocabulary.** `COPY` = adopt the mechanism as-is (concrete change named);
`ADAPT` = adopt after Vietnam-ization or boundary adjustment (adaptation described);
`NOT APPLICABLE` = outside MoneyFlow's scope (one-line reason). Boundary notes state
what must NOT be adopted for each pattern.

## 0. MoneyFlow baseline (verified 2026-10-16)

Already shipped on mobile (`mobile/lib/**`) and mostly mirrored on web
(`src/components/**`): dashboard; activity feed with per-row review flags
(`TransactionReviewStatus` in `mobile/lib/domain/models.dart:89`); inbox candidates
with provenance + deterministic rules with **preview and opt-in apply-to-existing**
(`mobile/lib/features/inbox/rules_page.dart`); capture via manual / voice / SMS-paste
/ notification-capture / CSV / XLSX; category budgets with **trailing-actual
suggestions and bounded rollover** (`mobile/lib/domain/budget.dart:205`); recurring
detection → commitments with overdue/due-today/upcoming status, pay/undo/archive
(`mobile/lib/domain/recurring_detection.dart`,
`mobile/lib/features/planning/planning_page.dart:1759`); savings goals; reports with
drill-in; accounts with archive; **account reconciliation** with
pending/cleared/reconciled entry states, statement-balance compare and explicit
adjustment transaction (`mobile/lib/domain/reconciliation.dart`,
`mobile/lib/features/accounts/account_reconciliation_page.dart`,
`src/components/account-reconciliation-page.tsx`); **split transactions**
(`mobile/lib/domain/split.dart`, `src/components/split-expense-dialog.tsx`); trash
with restore + permanent purge; biometric lock; CSV export; offline queue; demo
mode; **commitment due-day local notifications** at 09:00 and a **weekly digest**
notification Sunday 19:00 (`mobile/lib/data/notifications.dart`,
`mobile/lib/domain/weekly_digest.dart`); Android home-screen quick-add widget
(`mobile/android/app/src/main/AndroidManifest.xml:71`); Vietnamese category pack +
custom icons/colors (`mobile/lib/features/categories/vietnam_pack_sheet.dart`,
`category_visuals.dart`); payee field on transactions (`models.dart:104`); bulk
actions domain (`mobile/lib/domain/bulk.dart`); budget pace bar
(`planning_page.dart:1743`).

Confirmed absent (grep-verified): debt/loan tracking, event/occasion budgets,
payee/merchant statistics, watchlist, month-in-review digest, recurring calendar
view, per-transaction exclude-from-report, photo attachments, quick-fill templates,
future-dated one-off planned expenses, rule suggestion from repeated corrections.

This baseline means most "review/rules/reconciliation" patterns competitors offer are
**already covered**; the real gaps are in §10.

---

## 1. Monarch Money — aggregation-first US premium ledger

Consolidated from `docs/research/MONARCH_DEEP_DIVE.md` (per-screen evidence, sources
and access dates 2026-10-15/16 recorded there); fresh-verified items noted inline.

| # | Feature (1-line, fact) | Verdict | Boundary note |
|---|---|---|---|
| 1.1 | Widget dashboard: needs-review card, budget, spending trend, goals, weekly recap; drag-reorder + per-card hide; web/mobile layouts independent. | `COPY` (needs-review card only) | Card shows a queue count + one-tap to inbox; no net-worth/credit/investment widgets; layout customization deferred until asked for. |
| 1.2 | Unified transaction list; consolidated filter menu (keyword/date/amount/category/merchant/account/tag/reviewed/pending/has-notes); column sort; bulk "Edit Multiple" with Apply-to-N summary. | `ADAPT` | Adopt only reviewed-status + pending + payee filters; bulk edit already shipped (`domain/bulk.dart`). No filter sprawl — manual ledgers don't carry thousands of synced rows. |
| 1.3 | Edit transaction → inline "save as rule" offer. | `shipped` | `feat(mobile): rule preview + apply-to-existing + edit-to-rule offer` (git log ec8591b9). Web gap remains open per PROGRESS.md. |
| 1.4 | Rules: If/Then pipeline, all matching rules apply in order (drag-reorder, web-only), "Preview changes" tab, **opt-in** "apply to existing". | `shipped` | Boundary from deep-dive: rules never mutate rows silently; retroactive apply is always a confirmed batch. |
| 1.5 | "Needs review" persistent per-transaction flag: set manually/by rule/by preference; resolved via checkmark, mobile swipe, bulk; dashboard card surfaces queue. | `COPY` (gesture only) | Flag + activity-feed flags shipped; add **swipe-to-review** on mobile lists + bulk "mark reviewed". Manual entries must NOT be auto-flagged — entry is the review act. |
| 1.6 | Hide transaction: removes from reports/budgets, keeps balance; undoable. | `ADAPT` (defer) | If ever shipped: hidden rows stay visible-but-flagged in the ledger and reports disclose the excluded total — invisible rows break our rows↔balance promise. |
| 1.7 | Budgets: category + Flex modes; first budget auto-fills from 6-month trailing average; opt-in per-category rollover; group targets. | `shipped` (suggest+rollover) / `ADAPT` (Flex) | Trailing-actuals + rollover shipped. Flex = one loose discretionary number for users who refuse per-category — adopt only if it sums honestly; no dual budget modes. |
| 1.8 | Recurring: auto-detect from history → **user review before confirming**; merchant-stream model; calendar view; persist until dismissed; no per-occurrence skip (documented gap). | `shipped` (detection+commitments) / `COPY` (calendar) | Our occurrence-level model already beats stream-only (skip/pay/undo per occurrence). Add a month-grid calendar for due days. |
| 1.9 | Goals 3.0: save-up vs pay-down; status (on-track/ahead/at-risk) requires target+date+contribution; linked-transaction funding; backdatable contributions. | `COPY` (status prerequisites) / `ADAPT` (linked funding) | Show goal status only when inputs exist, else say what's missing. Contributions = normal ledger entries linked to goal; no balance-tracking, no growth-rate projections, no debt calculators. |
| 1.10 | Reports: Cash Flow/Spending/Income tabs; Sankey (web), trend bars, treemap; every chart element click-through to transactions; saving-rate % works without a budget; saved reports. | `COPY` (saving-rate line) / `ADAPT` (treemap) | Drill-through already shipped. Add income−spend=saving-rate summary (zero config). Treemap = mobile-friendly "bigger block = bigger category" alternative to dense VN tables. No Sankey-by-default. |
| 1.11 | Accounts: manual accounts fully supported w/ CSV import; action ladder rename→hide→close(keeps history)→delete→undelete(transactions only). | `ADAPT` (vocabulary) | Archive semantics shipped; adopt "**closed**" wording for dead accounts whose history must survive. No provider connections, no separate balance-history series. |
| 1.12 | Data: all-transactions CSV export **even after subscription ends**; scoped "delete history before [date]" with source checkboxes. | `COPY` (portability promise) / `ADAPT` (retention) | State "export is always free, forever" verbatim-equivalent in Vietnamese. Scoped deletion maps to our sources (manual/notification/import) — retention control, P2. |
| 1.13 | Onboarding: 5 steps, hard 7-day-trial paywall before value; trial-billing timeline ("remind day X, bill day Y") praised as trust pattern. | `NOT APPLICABLE` (paywall) / `ADAPT` (billing timeline) | Free-first is our stance; if a paid tier ever ships, copy the reminder/billing-start timeline — it kills the #1 trial anxiety. |
| 1.14 | Mobile: swipe-to-review; OS widgets incl. Android scrollable transactions widget (needs-review/most-recent/uncategorized filters). | `COPY` (review-count widget) | Quick-add widget already shipped (AndroidManifest). Extend to an inbox-count/needs-review widget — Android-dominant market, zero-open triage. |
| 1.15 | Household: Shared Views mine/theirs/ours; members cannot hide from each other; admin/member/advisor roles. | `NOT APPLICABLE` | Household scope is a researched non-goal; model recorded for future reference only. |
| 1.16 | Aggregation: Plaid/Finicity/MX, 13k+ institutions, connection-status page, pending→posted carry-over. | `NOT APPLICABLE` | No open banking in Vietnam; our equivalent is SMS/notification capture + statement import + reconciliation. Pending→posted carry-over semantics is worth remembering for notification-capture confirmation, not the plumbing. |

## 2. YNAB — method-led zero-based budgeting + reconciliation authority

| # | Feature (1-line, fact unless noted) | Verdict | Boundary note |
|---|---|---|---|
| 2.1 | Reconciliation: uncleared/cleared/reconciled states (C icon → green lock), cleared-balance vs bank compare, weekly cadence recommended, can't unreconcile — fix + re-reconcile, Reconciliation Balance Adjustment transaction. [S-Y1..Y5] | `shipped` | `domain/reconciliation.dart` implements pending/cleared/reconciled + explicit adjustment txn. Remaining delta: a **reconcile-reminder cadence** nudge (e.g. monthly statement day). |
| 2.2 | Add flow: explicit transaction type first (spending/inflow/cc-payment/transfer), optional fields after. [S-Y1 in PHASE_B] | `shipped` | Capture is type-first already (`capture_page.dart`). |
| 2.3 | Approval queue: categorize-then-approve imported rows; transfer approval applies to both registers. [PHASE_B Y5] | `shipped` | Our inbox + paired transfer legs cover this. |
| 2.4 | Zero-based envelope method: "give every dollar a job", Ready-to-Assign, covering overspending from other categories, Plan Reset. [Y-whats-new] | `NOT APPLICABLE` | Doctrine, not a feature. Our budget categories don't hold balances the same way; assigning every đồng is a philosophy we deliberately don't impose (PRODUCT_COMPETITIVE_MEMORY §8.3). |
| 2.5 | Targets: "Refill up to" vs "Set aside another" semantics; Auto-Assign options — Underfunded / Assigned-last-month / Average-assigned / Average-spent. [theappnote guide, etffin] | `ADAPT` | Add a "**copy last month's budgets**" + "apply suggestion to all" quick action on `/planning`; our trailing-average suggestion is the Average-spent equivalent. No Ready-to-Assign plumbing. |
| 2.6 | Auto-categorization "two-of-three" rule: payee default changes only after 2 of 3 recent categorizations agree; per-payee manual default + opt-out. [ynab.com/whats-new] | `ADAPT` | Deterministic version: after N identical manual corrections of (payee→category), **offer a rule draft** — same idea, auditable. Never auto-apply a learned guess without the user's rule. |
| 2.7 | Spending Breakdown report: ranked categories, account/date filters, drill to transactions; Reflect exports keep scope. [PHASE_B Y3/Y4] | `shipped` | Reports drill-in + CSV export shipped. |
| 2.8 | Loan accounts / paired loan categories. [ynab whats-new] | `ADAPT` (folds into gap #D1) | Only meaningful as our debt/loan counterpart — not YNAB's account-type machinery. |
| 2.9 | No free tier ($14.99/mo, $109/yr; 34-day trial). [usatoday third-party] | `NOT APPLICABLE` | Pricing context only; no-paywall is our stance. |
| 2.10 | YNAB Together household sharing; net-worth report. | `NOT APPLICABLE` | Household and net-worth are researched non-goals. |
| 2.11 | Works offline on every platform; running balance register toggle. [usatoday; support.ynab] | `shipped`/`ADAPT` | Offline queue shipped. Optional running-balance column on register = cheap ADAPT if asked for. |

## 3. Copilot Money — review-first premium (Apple ecosystem + web)

| # | Feature (1-line) | Verdict | Boundary note |
|---|---|---|---|
| 3.1 | Dashboard "To Review" section: imported transactions editable in place, "MARK AS REVIEWED" bulk clear. [help.copilot.money quick-start + dashboard] | `COPY` | Dashboard attention card = needs-review count + tap-through; bulk mark-reviewed on inbox/activity. |
| 3.2 | Copilot Intelligence: after ~30 reviews suggests type+category, improves per user; ~90% accuracy reported. [help + budgetpeer third-party] | `ADAPT` | Deterministic substitute only: correction-count → rule suggestion (see 2.6). No opaque ML classifier writing the ledger; a suggestion that isn't a user-approved rule must never post. |
| 3.3 | Name Rules auto-categorize future transactions. [help quick-start] | `shipped` | Rules shipped; **note:** third-party reviews complain rules have no manage UI — our `/rules` page is already AHEAD. |
| 3.4 | Transactions: search/filter/split/mark-recurring/export; running totals on filtered results + iOS multi-select bulk actions; "Similar Transactions" with monthly total per payee. [help transactions; releasebot Oct-2026] | `COPY` | Add running-total row under any filtered timeline + payee "similar transactions" block in detail (`payee` field exists, `models.dart:104`). |
| 3.5 | "Free to Spend" hero number + dotted ideal-spend-rate line; recurrings excluded from chart to avoid spikes. [help dashboard] | `ADAPT` | Only honest variant: "còn lại theo kế hoạch" derived from user-confirmed income + commitments + budgets, labeled with its assumptions, hidden when inputs are incomplete. Never an absolute cash claim — see gap #D4. Pace bar already shipped (`_PaceBar`). |
| 3.6 | Recurrings tab: paid / left-to-pay / future / archived; list+grid; editable matching filters. [help recurrings] | `shipped` | Commitment statuses cover this; calendar grid is the residual (1.8). |
| 3.7 | Budgets: initialized from historic spend; rollovers; groups; exclude-category; **disable budgeting entirely** via Settings. [help quick-start] | `shipped`/`ADAPT` | Suggest-from-actuals + rollover shipped. "Exclude category from budget" toggle + budgets-off master switch = small ADAPT if our budgets ever feel compulsory. |
| 3.8 | Category color/emoji/Genmoji customization. | `shipped` | `category_visuals.dart`. |
| 3.9 | Month in Review / Year in Review reports browsable from filters. [releasebot] | `ADAPT` | Extend weekly-digest pattern to a **month-close digest** (notification + in-app card). |
| 3.10 | Custom alerts: overdraft, unusual spending, payday. [copilot.money/faq] | `ADAPT` | Adopt only budget-threshold alerts (80%/100%) + commitment-due (shipped). "Unusual spending" needs a baseline-statistics contract — defer, don't fake. |
| 3.11 | Money Assistant (beta): AI creates/updates/deletes transactions, categories, budgets, rules; proactive suggestions. [releasebot] | `NOT APPLICABLE` | AI mutation is a researched non-goal. |
| 3.12 | Investments, crypto, real-estate, net worth; no Android app. | `NOT APPLICABLE` | Net-worth scope is a non-goal; platform note validates our Android-first reality in VN. |

## 4. Rocket Money — subscription/services-led finance app

| # | Feature (1-line) | Verdict | Boundary note |
|---|---|---|---|
| 4.1 | Subscription detection from linked accounts → one list; premium cancels for you. [help.rocketmoney premium; rocketmoney.com/faq] | `shipped` (detection) / `NOT APPLICABLE` (cancel service) | Detection = our recurring detection → commitments. Cancellation is a service, not software; VN subscriptions (Netflix, Spotify, gói data) are cancelled in-app anyway. |
| 4.2 | Bill negotiation concierge (success-fee; moving to Premium+). [help bill-negotiations] | `NOT APPLICABLE` | Financial-services marketplace — locked boundary. |
| 4.3 | Smart Savings / Autopilot: automatic transfers to FDIC custodial account. | `NOT APPLICABLE` | MoneyFlow never moves money; goal tracking is ledger-side only. |
| 4.4 | Budgets (2 categories free, unlimited premium), net worth, credit score/reports, account sharing. [faq] | `NOT APPLICABLE` | Net-worth/credit/household non-goals; our budgets are unlimited and free — AHEAD on access. |
| 4.5 | Action-card framing: surface due/unpaid/changed/cancelable obligations instead of every feature. [PRODUCT_COMPETITIVE_MEMORY §7.7] | `ADAPT` | Dashboard attention card driven by *verified* data only: overdue commitments, needs-review count, commitment amount drift — never invented tasks. |
| 4.6 | "Subscription price changed" detection. [faq wording] | `ADAPT` | On commitment confirmation, flag amount drift vs the series ("kỳ này khác thường lệ") — cheap, honest, high-trust. |

## 5. Quicken Simplifi — auto "Spending Plan" tracker

| # | Feature (1-line) | Verdict | Boundary note |
|---|---|---|---|
| 5.1 | Spending Plan: Income − Bills − Planned Spend − Other Spend − Goals = "**Left This Month**", real-time, ignores account balances, no double-count of recurring-linked rows. [support.simplifi 4212702, 14893966] | `ADAPT` | Same honest-remainder rule as 3.5: show only when income/commitment/budget inputs are user-confirmed; label assumptions. Sections = our income/commitments/budgets/goals — no new doctrine. |
| 5.2 | Bills auto-detected from history → user picks which to include; planned spend items can be one-time or recurring with rollover. [support 14893966, 3620741] | `shipped` (detection) / `ADAPT` (one-time planned) | One-off planned expense ("đám cưới tháng này", tiền mừng Tết) = dated planned entry inside the month — folds into event-budget gap #D2. |
| 5.3 | Savings Goals included in Spending Plan with custom monthly contribution. [support 3620741] | `ADAPT` | "Include goal in monthly plan" toggle on `/goals` — goal contribution counts into the remainder card. |
| 5.4 | Watchlists: monitor a category/payee/tag against a target **without a full budget**, with approach alerts. [info.quicken managing-your-spending] | `COPY` | "Theo dõi" pin on a category or payee → month-total tile on dashboard/planning; no budget ceremony needed. Big for VN users who track one vice (trà sữa, xăng). |
| 5.5 | Reports: pre-built + custom filters; every number one click from its transactions. [quicken.com/features] | `shipped` | Drill-in already shipped. |
| 5.6 | Per-transaction "exclude from Reports/Spending Plan"; excluded rows show grayed; exclude-by-payee rules; transfers excluded by default. [support 5167615] | `ADAPT` | Adopt the flag with our boundary: row stays visible-but-flagged in the ledger, reports disclose the excluded total. Transfers already structurally excluded. |
| 5.7 | Refund special-tracking; achievement badges; customizable push-notification rules. [quicken blog 4.1] | `ADAPT` (refund) / `NOT APPLICABLE` (badges) | Refund = negative expense netted in its category (PocketGuard does the same math). Badges = gamification outside ledger trust. Notification rules → settings toggles for existing channels only. |
| 5.8 | Projected balances / "what-if" cash-flow scenarios; 14k+ institution sync. | `NOT APPLICABLE` | Projections need aggregated balance series we don't have and won't build; never invent future balances (financial invariant). |

## 6. Money Lover (Finsify) — the Vietnamese local leader

| # | Feature (1-line) | Verdict | Boundary note |
|---|---|---|---|
| 6.1 | Wallets: create/edit/archive/delete, transfer between wallets, adjust balance, per-wallet views. [zendesk how-to] | `shipped` | Accounts + archive + transfers shipped. |
| 6.2 | Wallet sharing with another user. [zendesk] | `NOT APPLICABLE` | Household scope non-goal. |
| 6.3 | Categories: expense/income/**debt-loan** tab sets; per-wallet activation toggle; **merge categories** (transactions move, children follow, recurring bills drop); locked "special" defaults deactivatable per wallet. [zendesk 33742206448793, 34045598720025] | `ADAPT` | Merge-with-reassignment is the honest version of category deletion (never orphan entries — same rule Monarch documents). Per-account activation optional P3. Debt/loan tab folds into #D1. |
| 6.4 | Transaction extras: "with" person, location (iOS), select event, reminder, one photo, **exclude-from-report** toggle, edit wallet after the fact. [zendesk 35483252404889] | `ADAPT` | "With/counterparty" field = the seed of informal-debt tracking (#D1) — adopt as optional payee-adjacent field. Photo attach deferred (storage/privacy cost for cash-first VND). Exclude flag same boundary as 5.6. |
| 6.5 | Budgets on weekly/monthly/quarterly/yearly periods; predicts overspend from history. [zendesk premium 35836986998809] | `ADAPT` | Non-monthly budget period (weekly + custom date range) — VN spending cycles aren't all calendar-monthly (Tết). Prediction: only honest wording ("theo 3 tháng gần nhất"). |
| 6.6 | **Events & Travel Mode:** a separate budget scoped to an event/trip with its own transaction set. [zendesk how-to; apkmirror listing] | `ADAPT` | Top VN-specific gap — see #D2. Tết, đám cưới, du lịch, mùa tựu trường. Keep inside the one ledger: event = tag-scope + date range + limit, not a parallel wallet. |
| 6.7 | Bills: schedule + **due-date notification**; frequencies day/week/month/year; future entries listed under a "Future" tab; one-off future-dated transactions allowed. [zendesk 36058137621145] | `shipped` (reminders) / `ADAPT` (future entry) | Due-day reminders shipped (notifications.dart). A "planned/future" one-off entry is the remaining delta — same slice as 5.2. |
| 6.8 | Recurring transactions; savings **goal wallets** with deposits, progress bar, inflow/outflow chart. [zendesk 36976160006809] | `shipped`/`ADAPT` | Commitments + goals shipped. Goal inflow/outflow detail = link goal to ledger entries (same as 1.9). |
| 6.9 | **Debt & Loan:** Payable (đi vay) and Receivable (cho vay) transaction types, Repayment/Debt-collection transactions, per-lender/borrower grouping, outstanding totals, due reminders. [zendesk 36403994024345] | `ADAPT` | **Highest-impact gap for a VN user** — informal lending is culturally universal. See #D1: counterparty ledger, never income/expense, repayment linked to open debt. |
| 6.10 | PIN + fingerprint/biometric lock; built-in calculator. [app store listing; linked-wallet page] | `shipped` | Biometric lock shipped; calculator N/A-trivial. |
| 6.11 | Linked Wallet: credential-based bank sync (25+ VN banks, read-only, manual "Update transactions" pull); suspicious-transaction warnings. [zendesk 39118321383577; fptshop; linked-wallet page] | `NOT APPLICABLE` | Credential scraping is a security/compliance boundary we don't cross; our equivalents — SMS paste, notification capture, statement CSV/XLSX — are the consent-clean VN path. |
| 6.12 | "SMS Banking Detector" companion app parses bank SMS into transactions (VCB, TCB, MB, ACB…). [soft112 listing, third-party/historical] | `shipped` (equivalent) | Validates our direction: MoneyFlow's SMS-paste/notification capture does the same job **inside** the app with explicit review — arguably AHEAD (no second app, no silent posting). |
| 6.13 | Premium gates: unlimited wallets/budgets/events/debts, CSV/Sheets export, no ads, total-wallet report. [zendesk premium] | `NOT APPLICABLE` | Our export is unconditional — AHEAD on ownership. |
| 6.14 | Home-screen add-transaction widget; money-assistant beta. [zendesk; app store] | `shipped`/`NOT APPLICABLE` | Quick-add widget shipped; assistant = AI-mutation non-goal. |

## 7. PocketGuard — "In My Pocket" leftover-first budgeting

| # | Feature (1-line) | Verdict | Boundary note |
|---|---|---|---|
| 7.1 | "In My Pocket": income − bills − budgets − goals = spendable remainder, shown as adjusted daily limit. [cnbc; fool; wsj reviews] | `ADAPT` | Same rule as 3.5/5.1 — honest remainder card only from confirmed inputs; daily-limit variant is optional display math, never a promise. |
| 7.2 | Category budgets with **approaching/exceeding-limit notifications**; up to 5 custom monitor rules on category/account/merchant (free). [pocketguard.com] | `COPY` | Local notifications at 80%/100% of a budget (extend `NotificationService` channels) + watchlist covers monitor rules. |
| 7.3 | Insights: category pie (categories <5% fold into "Other"), category list with **month-over-month delta arrows**, **top-10 merchants** chart, #hashtags in notes → hashtag reports. [help 360002196579; help insights] | `COPY` (stats) / `ADAPT` (hashtags) | MoM delta per category + top-payees = cheap reports on data we already store (`payee` field). #hashtags = lightweight tag substitute — defer until real asks; never a second categorization system. |
| 7.4 | Bill tracking + reminders; subscription-cancel recommendations. | `shipped`/`NOT APPLICABLE` | Reminders shipped; cancel-recommendation copy can be honest text ("cân nhắc hủy?") on a stale commitment — no service layer. |
| 7.5 | Debt payoff plan: prioritize loans, "minimum losses" vs "maximum progress" schedules. [help plus-overview; fool] | `ADAPT` | Only after #D1 exists; payoff ordering without APR feeds can still rank by balance/due date — no invented amortization precision. |
| 7.6 | Transaction splits, receipt attach, cash accounts, CSV export (Premium), autosave (US-only). [help plus-overview; cnbc] | `shipped` (splits, cash, export) / `NOT APPLICABLE` (autosave) / `ADAPT`-defer (receipts) | Export free = AHEAD. Autosave moves money — non-goal. Receipt photos deferred with 6.4. |

## 8. Goodbudget — envelope method, manual-first proof case

| # | Feature (1-line) | Verdict | Boundary note |
|---|---|---|---|
| 8.1 | Envelopes filled from Available balance; spend by envelope, not account balance; free tier is **manual-only** (no sync). [goodbudget.com/what-you-get; help accounts] | `NOT APPLICABLE` (doctrine) | Proof point that manual-first is a legitimate product, not a degraded mode — same lesson as Monarch's manual accounts. We keep category budgets + rollover, not envelope plumbing. |
| 8.2 | Accounts: Checking/Savings/Cash + Credit Card + **off-budget Debt Accounts**; Net Total = deposits − card debt. [help getting-started] | `ADAPT` | Debt accounts inform #D1's boundary: debts live beside the ledger, not inside spending math. |
| 8.3 | Reconcile tool: statement date + ending balance → mark cleared → "Left to Clear" → $0 → Finish; cleared become Reconciled; troubleshooting guide. [help reconcile] | `shipped` | `account_reconciliation_page.dart` implements the same flow; their doc's exact-difference wording matches our zero-or-adjust contract. |
| 8.4 | Manual import QFX/OFX/CSV with **FITID dedup** + match-to-existing. [help using-accounts blog] | `ADAPT` | VN banks export CSV/XLSX without FITIDs — our inbox provenance + content dedup is the equivalent; verify dedup keys per source format before claiming parity. |
| 8.5 | Scheduled transactions + **Custom Quick Fills** (one-tap pre-filled frequent entries). [help center index] | `COPY` | Quick-fill = save (kind, payee, amount, category) as a one-tap chip on capture — the cheapest capture-speed win we don't have. |
| 8.6 | Debt Payoff: Debt Payment transaction lowers envelope + account + debt balance together; snowball ordering guides; debt-free progress. [help debt articles] | `ADAPT` | With #D1: repayment transaction decrements the open debt — same atomicity rule as transfers (both sides in one commit). |
| 8.7 | Household sync across members' phones is the core pitch; premium = unlimited accounts/envelopes + bank sync. | `NOT APPLICABLE` | Household non-goal; free-tier limits are pricing, not product law. |
| 8.8 | Multiple/variable incomes handling guides. [help] | `shipped` | Recurring income templates + manual income cover this. |

## 9. Comparison — MoneyFlow vs each app

MoneyFlow column = verified baseline (§0). Each cell marks MoneyFlow's position on
that axis vs the app: **BEHIND** / **EQUAL** / **AHEAD** / **N/A** (non-goal axis).

| Axis | vs Monarch | vs YNAB | vs Copilot | vs Rocket | vs Simplifi | vs Money Lover | vs PocketGuard | vs Goodbudget |
|---|---|---|---|---|---|---|---|---|
| Daily capture (manual-first) | AHEAD — aggregation-optional for them, core+fast for us | EQUAL | AHEAD — Copilot can't function w/o bank link | AHEAD | BEHIND-ish — their manual path is thin (`inference`) | EQUAL | EQUAL | EQUAL |
| Acquisition w/o retyping | BEHIND (they have sync; our SMS/notification/CSV path is the VN equivalent) | EQUAL | BEHIND | BEHIND | BEHIND | EQUAL — their SMS detector ≈ our capture | EQUAL | AHEAD |
| Ledger trust (review+rules+recon+recovery) | EQUAL — rules parity, review parity; our trash beats their hard delete | EQUAL — recon parity; envelope method aside | AHEAD — rule mgmt UI, review flags, recon, trash | AHEAD | EQUAL | AHEAD — they have no recon/review/rules | EQUAL | EQUAL — recon parity |
| Budgets | EQUAL (suggest+rollover parity; no Flex mode) | BEHIND on method depth — intentional | EQUAL | AHEAD | BEHIND — Spending Plan structure + watchlist | EQUAL — they add period flexibility we lack | EQUAL | EQUAL — envelopes ≈ our budgets+rollover |
| Recurring / bills | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL |
| Goals | BEHIND — status prerequisites + linked funding | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL |
| Debt / loan tracking | BEHIND (pay-down goals) | BEHIND (loan accts) | N/A | N/A | N/A | **BEHIND** — payable/receivable shipped there | BEHIND (payoff plan) | BEHIND (debt accts) |
| Event/occasion budget | N/A | N/A | N/A | N/A | N/A | **BEHIND** — Events & Travel Mode | N/A | N/A |
| Reports & insight | BEHIND — saving-rate, treemap, saved reports | EQUAL | BEHIND — running totals, similar-txns, review reports | AHEAD | EQUAL | EQUAL | BEHIND — MoM deltas, top merchants | EQUAL |
| Remainder answer ("left to spend") | BEHIND — Left to Budget | N/A | BEHIND — Free to Spend | N/A | BEHIND — Left This Month | BEHIND — predicted overspend | BEHIND — In My Pocket | EQUAL |
| Vietnam fit (language, VND, mental models) | AHEAD | AHEAD | AHEAD | AHEAD | AHEAD | BEHIND — they own local vocabulary + debt/events | AHEAD | AHEAD |
| Data ownership / export | EQUAL | EQUAL | EQUAL | AHEAD — export free | EQUAL | AHEAD — export not premium-gated | AHEAD | EQUAL |
| Mobile platform | EQUAL | EQUAL | AHEAD — we're Android-first, they have none | EQUAL | EQUAL | EQUAL | EQUAL | EQUAL |
| Household / net-worth / AI / services | N/A (non-goal) | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

**Reading.** MoneyFlow is at parity or ahead on ledger-trust mechanics everywhere
(review flags, rules with preview, reconciliation, splits, trash, export). It is
**behind** exactly where a Vietnamese user feels it: debt/loan tracking, event
budgets, payee insight, and a trustworthy "còn lại" answer — all inside scope. The
only structural BEHIND (bank sync) is a deliberate non-goal with our SMS/notification
equivalents already shipped.

## 10. Prioritized gap list — ranked by impact for a Vietnamese user

Every `COPY`/`ADAPT` item from §§1–8 lands here exactly once. Impact ranks by:
frequency-of-use in VN daily finance × trust value × build cost against current
code. Each maps to a concrete task and a risk class per
`docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.

| Rank | Gap (verdict) | Why it matters for a VN user | Concrete implementation task | Class |
|---|---|---|---|---|
| **D1** | Debt/loan ledger — payable/receivable + repayments + counterparty (ADAPT: Money Lover 6.9, Goodbudget 8.2/8.6, PocketGuard 7.5, YNAB 2.8) | "Vay nợ" informal lending is universal in Vietnam (family, friends, colleagues); the local leader ships it and we have nothing — a user must keep a second notebook | New `person_debts` table (RLS) + counterparty field on transactions; debt/loan transactions as a fourth kind or tagged-kind **excluded from income/expense like transfers**; repayment transaction atomically decrements open debt; debts screen grouped per counterparty with outstanding totals + due-day reminder via existing `NotificationService`; payoff ordering by balance/due-date (no APR feeds required) | 3 — financial data; needs work packet |
| **D2** | Event/occasion budgets (ADAPT: Money Lover 6.6, Simplifi 5.2 one-time planned) | Tết, đám cưới, du lịch, tựu trường are the budgeting moments VN users actually plan around — a calendar-month budget cannot answer "đi Đà Lạt hết bao nhiêu rồi" | `event_budgets` (name, date range, limit, optional category scope, wallet scope); event picker on capture; running spent-vs-limit tile; auto-close + summary at end date; one-off planned expense row inside planning for future-dated items | 1–2 |
| **D3** | Honest "còn lại tháng này" + budget threshold alerts (ADAPT: Simplifi 5.1, PocketGuard 7.1/7.2, Copilot 3.5, Monarch Left-to-Budget) | The single daily question "tháng này còn được tiêu bao nhiêu" — four apps answer it; we have all the inputs but never compose them | Remainder card = confirmed income − remaining commitments − remaining budgets − remaining goal contributions; render only when the user has set those inputs, label "theo số liệu bạn đã nhập", link each component to its source; threshold local notifications at 80%/100% per budgeted category (new `NotificationService` channel); commitment amount-drift flag on confirmation (4.6) | 1–2 |
| **D4** | Payee statistics + MoM category deltas (COPY: PocketGuard 7.3, Copilot 3.4 similar-txns; Monarch filters 1.2) | SMS/notification capture already harvests payees — turning that into "top nơi tiêu tiền" and month-over-month arrows is pure presentation on stored data | Reports: top-10 payees chart + per-category MoM delta column; transaction detail: "similar transactions" block (same-payee month total); timeline filter chips: payee, reviewed-status, pending | 1 |
| **D5** | Review-loop polish (COPY: Monarch 1.5 swipe, Copilot 3.1 bulk mark-reviewed + dashboard card, Rocket 4.5 attention card) | Manual-first users live in review; halving triage cost is the highest-frequency UX win | Swipe-to-review gesture on inbox + activity lists; bulk "mark reviewed"; dashboard attention card (needs-review count, overdue commitments, drift flags) — verified data only | 2 |
| **D6** | Rule suggestion from repeated corrections (ADAPT: YNAB 2.6 two-of-three, Copilot 3.2) | Compounds our rules moat deterministically — every repeated correction should end in an offered rule, not another manual fix | Count (payee→category) manual corrections per user; after threshold N, surface rule-draft offer (extends shipped edit→rule path); never auto-apply | 1 |
| **D7** | Quick-fill capture chips (COPY: Goodbudget 8.5 custom quick fills) | VN spend is repeat-heavy (cà phê, xăng, chợ) — one-tap pre-filled entry beats any form | Save-as-quick-fill from any transaction; chip row on capture page storing kind/payee/amount/category; local + synced like other prefs | 1 |
| **D8** | Commitment calendar view (COPY: Monarch 1.8) | "Tháng này ngày nào phải trả gì" is a natural VN planning question | Month-grid on planning page marking due days from commitments' `dueDay`; tap day → that day's commitments | 2 |
| **D9** | Month-close digest (ADAPT: Copilot 3.9 Month/Year in Review; Monarch weekly recap) | Weekly digest shipped; month-close is the culturally real bookkeeping boundary (lương → hết tháng) | Extend `weekly_digest.dart` pattern to a month-close one-shot (last day 19:00 or configurable); in-app month card mirroring the web weekly-summary contract | 1 |
| **D10** | Watchlist — monitor one category/payee w/o a budget (COPY: Simplifi 5.4, PocketGuard rules) | Users track one vice (trà sữa) without wanting budgeting ceremony | "Theo dõi" pin → month-total tile on dashboard/planning; optional approach-alert threshold; reuses payee/category aggregation from D4 | 1 |
| **D11** | Goal status prerequisites + linked funding (COPY: Monarch 1.9; ADAPT: Simplifi 5.3, Money Lover 6.8) | Our goals exist but progress honesty + "goal eats into monthly plan" is the proven contract | Show on-track/ahead/at-risk only when target+date+contribution exist, else state what's missing; goal detail lists linked contribution entries; "include in monthly plan" toggle feeding D3 | 1–2 |
| **D12** | Non-monthly budget periods (ADAPT: Money Lover 6.5) | Weekly allowance budgeting and Tết-length cycles are normal here | Budget period field (weekly/monthly/custom range) — overlaps D2; do together or defer D2's custom-range engine to this | 2 — touches budget domain |
| **D13** | Exclude-from-report flag (ADAPT: Simplifi 5.6, Money Lover 6.4, Monarch 1.6 boundary) | Real users have rows that aren't spending (reimbursements, hộ tiền) | `excluded_from_reports` flag; ledger keeps row visible-but-flagged; reports disclose excluded total; exclude-by-payee optional via existing rules | 2 — boundary must hold |
| **D14** | Category merge + reassignment (ADAPT: Money Lover 6.3, Monarch 1.12) | Category lists drift; deleting without reassignment orphans entries | Merge action: move transactions + children to target, drop dependents' recurring links with warning; per-account activation deferred (P3) | 1–2 |
| **D15** | Refund net-off (ADAPT: Simplifi 5.7, PocketGuard 7.3 math) | Hoàn tiền currently distorts category totals | Refund transaction kind or flag netting its category in reports; keep row visible | 1–2 |
| **D16** | Account "closed" vocabulary (ADAPT: Monarch 1.11) | Dead bank accounts are common (đổi ngân hàng); "archive" undersells history-kept | Rename/extend archive → closed with reopen; history untouched (semantics already shipped) | 0–1 |
| **D17** | Saving-rate line on reports (COPY: Monarch 1.10) | Zero-config insight: income − spend = rate, no budget required | One summary line on reports/dashboard using existing aggregates | 1 |
| **D18** | Needs-review home widget (ADAPT: Monarch 1.14; Money Lover 6.14 shipped-equivalent) | Zero-open triage on Android-dominant market | Extend existing widget provider with pending-review count + deep link to inbox | 2 |
| **D19** | Reconcile cadence nudge (COPY: YNAB 2.1 weekly) | Reconciliation only earns trust if it's habitual | Optional monthly reminder on statement day per account via `NotificationService` | 1 |
| **D20** | Optional running-balance register column (ADAPT: YNAB 2.11) | Familiar "sổ quỹ" reading for VN users | Toggleable computed column on register/account detail — derived, never stored | 1 |
| D21 | Scoped "delete history before date" (ADAPT: Monarch 1.12) | Retention control for long-lived data | Settings → data: delete-before-date scoped by source kind (manual/notification/import); irreversible warning; outside trash contract | 2 |
| D22 | Per-account category activation (ADAPT: Money Lover 6.3) | Work-vs-personal wallet hygiene | Toggle category visibility per account in category settings | 3 — P3, only on real asks |
| D23 | Photo attach on transactions (ADAPT-defer: Money Lover 6.4, PocketGuard 7.6, Monarch 1.2 boundary) | Receipt/QR proof for disputed entries | Deferred: storage + privacy + offline-sync cost; revisit after D1–D5 land and usage data justifies | 3 |
| D24 | #hashtags in notes (ADAPT-defer: PocketGuard 7.3) | Lightweight tagging | Deferred: do not grow a second categorization system; note search already covers part | 3 |
| D25 | Trial-billing timeline (ADAPT: Monarch 1.13) | Only if a paid tier ships | Billing-UX copy pattern — parked | — |

**Counted for reporting.** Rows tagged `COPY` (primary or secondary): 1.1, 1.5,
1.8-calendar, 1.9-status, 1.10-saving-rate, 1.12-portability, 1.14-widget, 3.1, 3.4,
5.4, 7.2, 7.3-stats, 8.5 — **13 tagged items consolidating to 10 distinct tasks**
(D4, D5, D7, D8, D10, D11-status, D17, D18, D19, D20). Rows tagged `ADAPT`: 1.2,
1.6, 1.7-Flex, 1.9-linked, 1.10-treemap, 1.11, 1.12-retention, 1.13-timeline, 2.5,
2.6, 2.8, 2.11, 3.2, 3.5, 3.7, 3.9, 3.10, 4.5, 4.6, 5.1, 5.2, 5.3, 5.6, 5.7, 6.3,
6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.1, 7.3-hashtags, 7.5, 7.6-receipts, 8.2, 8.4, 8.6 —
**39 tagged items consolidating to 15 distinct tasks** (D1, D2, D3, D6, D9,
D11-linked, D12, D13, D14, D15, D16, D21, D22, D23, D24, plus D25 parked).
Rows marked `shipped` (recorded for parity, no action): 1.3, 1.4, 1.7, 1.8, 1.10,
2.1, 2.2, 2.3, 2.7, 2.11, 3.3, 3.6, 3.8, 4.1, 5.2, 5.5, 6.1, 6.7, 6.8, 6.10, 6.12,
6.14, 7.4, 7.6, 8.3, 8.8. Rows marked `NOT APPLICABLE`: 1.13-paywall, 1.15, 1.16,
2.4, 2.9, 2.10, 3.11, 3.12, 4.1-cancel, 4.2, 4.3, 4.4, 5.7-badges, 5.8, 6.2,
6.10-calculator, 6.11, 6.13, 6.14-assistant, 7.4-cancel-copy, 7.6-autosave, 8.1, 8.7.

## 11. Cross-cutting conclusions

1. **Ledger-trust mechanics are converged and we match them.** Review flags,
   previewable rules, reconciliation and recoverable deletion appear in Monarch, YNAB,
   Copilot and Goodbudget — MoneyFlow already ships all four, sometimes better
   (occurrence-level commitments vs Monarch's stream-only; trash vs their hard
   deletes). [inference from §§1–8]
2. **The real VN gap is social/occasional money, not more automation.** Debt/loan and
   event budgets (Money Lover's signature local features) outrank every US-style
   insight feature for our market. [inference]
3. **"Left to spend" is the category-defining daily answer** (Simplifi, PocketGuard,
   Copilot, Monarch all center it) — adoptable only as an honest composition of
   user-entered inputs, never as an absolute cash claim. Boundary: label sources,
   hide when incomplete. [fact for their mechanics; inference for ours]
4. **Manual-first is validated, not niche.** Monarch supports full manual accounts,
   Goodbudget's free tier is manual-only, Money Lover's SMS detector proves the
   acquisition path we chose. No bank link exists in VN open banking — our
   SMS/notification/statement paths are the correct equivalent, not a fallback.
   [fact + inference]
5. **Nothing here changes the locked boundaries.** Every aggregation, household,
   net-worth, AI-mutation, and financial-service feature observed is classified
   NOT APPLICABLE with its reason; they stay researched non-goals.

## 12. Source ledger

All URLs accessed **2026-10-16** unless noted; `†` = consolidated via
`docs/research/MONARCH_DEEP_DIVE.md` (accessed 2026-10-15/16 there).

**Monarch:** help.monarch.com articles 360058127551 (dashboard)†, 4402645984916
(bulk edit)†, 360048393372 (rules)†, 5528707082516 (review)†, 4405041904916 (hide)†,
360048883631 + 32125337244052 + 4411119762196 (budgets/flex/rollover)†, 4890751141908
(recurring)†, 15000751305108 + 44373110771860 (goals)†, 21846787088916 (reports)†,
360058187072 + 360058636951 (manual accounts/edit)†, 15526600975764 (export)†,
360048393272 + 8611706513684 (getting started/widgets)†;
monarch.com/blog/transaction-review†.

**YNAB:** support.ynab.com/en_us/getting-started-with-reconciling-accounts-an-overview-Sy3JWx4Js;
support.ynab.com/en_us/can-i-unreconcile-a-transaction-SJ0NquLye;
ynab.com/blog/8-myths-about-reconciliation-in-ynab; ynab.com/whats-new;
usatoday.com/story/money/personalfinance/budget-and-spending/ynab-review/90596137007/
(third-party, pricing); theappnote.com/blog/ynab-carry-your-remaining-budget-into-next-month
(third-party, rollover/targets); etffin.com/Article/budget/35272.html (third-party,
auto-assign); plus PHASE_B sources Y1–Y7 (accessed 2026-08-13 there).

**Copilot:** help.copilot.money/en/articles/11157550-quick-start-guide;
…/6045480-dashboard-tab-overview; …/9554412-transactions-tab-overview;
…/9778259-recurrings-tab-overview; copilot.money/faq; copilot.money/compare;
releasebot.io/updates/copilot-money (third-party, Oct-2026 notes);
forbes.com/advisor/banking/copilot-budget-app-review/ (third-party, pricing);
budgetpeer.com/blog/is-copilot-money-worth-it-an-honest-look-at-the-premium-budget-app
(third-party, rule-UI complaint).

**Rocket Money:** help.rocketmoney.com/en/articles/2677184-premium-membership-features;
help.rocketmoney.com/en/collections/110577-bill-negotiations; rocketmoney.com/faq;
rocketmoney.com/feature/autopilot-savings.

**Simplifi:** support.simplifi.quicken.com/en/articles/4212702-understanding-your-spending-plan;
…/14893966-how-to-set-up-the-spending-plan; …/3620741-using-the-spending-plan-on-the-mobile-app;
…/5167615-how-to-exclude-and-include-transactions…; quicken.com/products/simplifi/;
quicken.com/features/manage-your-budget/; info.quicken.com/sim/managing-your-spending;
quicken.com/blog/simplifi-4-1-interview/.

**Money Lover:** moneylover.zendesk.com/hc/en-us/categories/32884535957529-How-to;
articles 39118321383577 (linked wallet), 36976160006809 (goals), 36058137621145
(bills), 35483252404889 (transactions), 35836986998809 (premium), 36403994024345
(debt/loan), 33742206448793 + 34045598720025 (categories), 32730352733081 (assistant);
linked-wallet.moneylover.me; apps.apple.com/vn/app/…id486312413 (store listing);
fptshop.com.vn/tin-tuc/danh-gia/money-lover-182808 (third-party VN review);
apkmirror 7.5.2 listing (third-party feature list); sms-banking-detector.soft112.com
(third-party, historical companion app).

**PocketGuard:** help.pocketguard.com/hc/en-us/articles/360002196579-Insights;
pocketguard.com/help/pocketguard-plus-overview/; pocketguard.com/help/insights/;
pocketguard.com/help/how-to-view-transactions-by-categories/;
pocketguard.com/how-to-keep-a-budget/; pocketguard.com/budget-calculator/;
cnbc.com/select/pocketguard-budgeting-app-review/; wsj.com/buyside/…pocketguard-budgeting-app-review;
forbes.com/advisor/banking/pocketguard-budgeting-app-review/;
fool.com/money/personal-finance/pocketguard-review/ (all third-party).

**Goodbudget:** goodbudget.com/what-you-get/; goodbudget.com/help/using-accounts/
(getting-started-with-accounts, create-debt-account, reconcile,
reconcile-a-troubleshooting-guide); goodbudget.com/help/budgeting-with-goodbudget/transaction-types/;
goodbudget.com/blog/help_category/using-accounts/ (FITID/import).

**Internal:** docs/research/MONARCH_DEEP_DIVE.md; docs/research/PRODUCT_COMPETITIVE_MEMORY.md;
docs/research/PHASE_B_FRESH_PRODUCT_EXPERIENCE_RESEARCH.md; PROGRESS.md;
mobile/lib/domain/{models,reconciliation,split,budget,recurring_detection,weekly_digest,quick_parse,csv_import,xlsx_import,voice_money_parser,bulk}.dart;
mobile/lib/data/{notifications.dart,notification_capture/};
mobile/lib/features/{planning/planning_page.dart,accounts/account_reconciliation_page.dart,inbox/rules_page.dart,categories/vietnam_pack_sheet.dart};
mobile/android/app/src/main/AndroidManifest.xml; src/components/{account-reconciliation-page.tsx,split-expense-dialog.tsx}.
