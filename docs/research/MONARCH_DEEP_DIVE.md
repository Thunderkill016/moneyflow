# Monarch Money — deep-dive research ledger

**Purpose.** Screen-by-screen competitive evidence for Monarch Money, recorded under the update protocol in `UI_UX_RESEARCH_LEDGER.md` §14. This document is evidence, not task authority; it does not authorize roadmap work by itself.

**Method.** Primary evidence is Monarch's official help center (`help.monarch.com`, formerly `help.monarchmoney.com` — same Zendesk instance; old URLs redirect), product pages and release blog posts on `monarch.com`. Secondary evidence: third-party reviews (PCMag, NerdWallet, CNBC, Penny Hoarder), recorded onboarding flows (pageflows, screensdesign, johnstone.blog), and unofficial API-internals sources (`hammem/monarchmoney`, `echomodel/monarch-access`, `jamiew/monarch-mcp` on GitHub) which are always labeled as unofficial. The help center blocks direct fetch (HTTP 403), so help-article text comes from search-engine excerpts of the live pages — wording may be snippet-truncated and should be re-verified before quoting verbatim in product specs.

**Access dates.** Subagent-collected evidence: **2026-10-15**. Supplemental fetches for rules/review/recurring/reports/goals/collaboration/detail gaps: **2026-10-16**.

**Labels.** Every claim is tagged `fact` (official docs/marketing), `third-party` (reviews, recorded flows), `unofficial` (API internals, community repos), or `inference` (our reasoning from the above). Every pattern records its boundary — what MoneyFlow must not adopt — because Monarch is an aggregation-first US product and MoneyFlow is a manual-first Vietnamese ledger.

**Locked MoneyFlow boundaries** (from `PRODUCT_COMPETITIVE_MEMORY.md` §7.4 and owner decisions): no pivot to bank aggregation, household/collaboration scope, or net-worth/investment tracking. Monarch evidence informs *interaction patterns* only.

---

## 1. Dashboard

**Pattern worth studying.** Widget-based dashboard assembled from cards. Documented widget inventory: Getting started guide, Weekly Recap, Investments, Budget, Net worth, Savings goals, Credit score, Spending trend, Transactions, Recurring Transactions, Business tracking — the official article hedges with "may include", so the list varies by account setup. A dedicated **"needs review" card** surfaces unreviewed transactions on open. Customization is drag-and-drop reorder plus per-card deactivation, entered via a "Customize" button (top-right on web, bottom of dashboard on mobile). **Web and mobile layouts are fully independent** — different order and visibility per surface, deliberately. Monarch itself recommends split usage: "mobile app for daily check-ins… website weekly or monthly for reports."

- Source: `https://help.monarch.com/hc/en-us/articles/360058127551-Customizing-Your-Dashboard`; `https://www.monarch.com/blog/transaction-review`; `https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-with-Monarch`; `https://www.monarch.com/blog/customizable-dashboard-manual-transactions`. Accessed 2026-10-15. Confidence: high (multiple official sources agree).

**MoneyFlow-specific use.** (a) A **review-needed card** on `/dashboard` is directly applicable — it matches our inbox/pending-review model and gives the manual-first user a reason to open the app. (b) Card-level reorder/hide with a visible "Customize" affordance is a pattern for dashboard personalization when it becomes a real ask; web and mobile layouts evolving independently is already our reality. (c) "Daily check-in on mobile, deeper review on web" validates our mobile-first split.

**Pattern not to copy.** Widget density built around net worth, credit score, investments and business tracking assumes aggregated account graphs we do not have and are not building. Default dashboard order is undocumented (absence of evidence) — do not claim Monarch has a canonical ordering. **Boundary: no net-worth/investment/credit-score cards; customization is a candidate, not committed.**

## 2. Transactions list

**Pattern worth studying.** One unified transaction list across all accounts ("Navigate to the Transactions section… all transactions in one place"), with per-account lists nested under Accounts. Web list shows **category and account as columns** so scanning needs no drill-in; a collapsible summary panel sits beside it. A **consolidated filter menu** holds: keyword, date range, debit/credit, amount range, category, merchant, account, tag, hidden include/exclude, synced-vs-manual, has-attachments, has-splits, has-notes, reviewed status, recurring status, pending status, "Needs review by" (anyone/me/member). Column-header sort on web; mobile gained date/amount sort later. **Global Command-K search deliberately does NOT find transactions** — it searches categories/merchants/accounts/goals/saved reports; transaction search lives inside the Transactions page. Notes text is searchable. Bulk "Edit Multiple" mode applies category/merchant/review-status changes across checked rows with an "Apply to all (#)" confirmation summary. Editing a transaction offers to **save the change as a rule** inline. Pending transactions are read-only by default; a preference toggle allows edits, and Monarch carries edits forward to the posted version (category, merchant, notes, tags, review state, splits, attachments) with amount/date/description matching as fallback.

- Source: `https://help.monarch.com/hc/en-us/articles/4402645984916-Editing-Multiple-Transactions`; `https://help.monarch.com/hc/en-us/articles/360048393532-Editing-Transactions`; `https://help.monarch.com/hc/en-us/articles/38610714553108-CommandK-Search-Bar-and-Shortcuts`; `https://help.monarch.com/hc/en-us/articles/360056422791-Adding-Notes-and-Attachments-to-a-Transaction`; `https://www.monarch.com/blog/quicker-and-easier-transaction-review-and-more`; `https://www.monarch.com/blog/net-worth-improvements-and-more`; unofficial API surface: `https://glama.ai/mcp/servers/jamiew/monarch-mcp/tools/search_transactions`. Accessed 2026-10-15/16. Confidence: high for list/filters/edit; medium for pending-edit carry-over (single official article).

**MoneyFlow-specific use.** (a) **Edit→save-as-rule inline offer** is the highest-value pattern: it turns every manual correction into progressive automation, exactly matching our `/rules` + `/inbox` direction. (b) Filter dimensions worth adopting incrementally on `/transactions`: reviewed status, has-notes, pending. (c) Bulk edit with an explicit "Apply to N" summary matches our explicit-review contract. (d) The pending→posted carry-over semantics is a real answer to a problem our notification-capture path will hit: edits to a provisional record should survive confirmation.

**Pattern not to copy.** Filter/menu density at Monarch scale presumes thousands of synced rows; shipping the full filter matrix to a manual ledger is premature complexity. Attachments (receipts, PDF on web) add storage/privacy cost for marginal value in VND cash-first usage. **Boundary: adopt list-scan affordances and edit→rule bridging only; no attachment pipeline, no filter sprawl without usage data.**

## 3. Transaction rules

**Pattern worth studying.** Rules are automations that "run every time new, non-pending transactions are received from an account connection" — i.e., they fire on the sync path, not retroactively unless asked. Structure is If/Then:

- **If (criteria, combinable):** original statement (exactly/contains, multiple conditions OR'd), merchant display name (exactly/contains, OR'd), amount (debit or credit; equal/greater/less/range-between), categories, owners (household members; requires collab), accounts.
- **Then (actions):** rename merchant, update category, add tags, set owner, **hide transaction** (removes from budget and cash-flow calculations), set **review status** (needs review / reviewed, optionally assigned to a household member), **link to goal**, split by percentage or dollar amount.
- **Preview:** a "Preview changes" tab shows which existing transactions match before saving.
- **Apply-to-existing:** an explicit checkbox "Apply # changes to existing transactions" — retroactive application is opt-in, not default.
- **Ordering:** rules run in list order; first match applies first, then subsequent rules also apply (sequential pipeline, not first-match-wins). Drag-and-drop reorder — **web only**.
- **Entry points:** Settings > Rules, a "+" on mobile, and the inline rule widget after any manual transaction edit.

- Source: `https://help.monarch.com/hc/en-us/articles/360048393372-Transaction-Rules` (also indexed as `Creating-Transaction-Rules`); `https://help.monarch.com/hc/en-us/articles/15000751305108-Using-Goals` (link-to-goal rule). Accessed 2026-10-16. Confidence: high.

**MoneyFlow-specific use.** This is the densest transferable section for `/rules`. The **pipeline ordering** (all matching rules apply in sequence, user-draggable) is more honest than first-match-wins and fits "explicit, reviewable" automation. **Preview-before-save** and **opt-in apply-to-existing** are exactly the reviewable-automation contract MoneyFlow wants — a rule that silently rewrites history would violate our ledger trust model. Criteria worth adopting first: merchant-statement text contains, amount range, category. Actions worth adopting first: rename merchant, set category, set review-needed flag.

**Pattern not to copy.** Owner/household criteria (collab scope — non-goal), link-to-goal action until goals ship, split-by-rule (splits are not yet a MoneyFlow concept), hide-as-rule-action until we define hide semantics (see §5). Rules firing only on synced imports is Monarch's aggregation assumption — our equivalent trigger should be **inbox candidate confirmation and import review**, which is already our collection point. **Boundary: rules must never mutate ledger rows silently; retroactive application is always a user-confirmed batch.**

## 4. Review mechanics ("Needs Review")

**Pattern worth studying.** Every transaction carries a review flag. Setting paths: manual per-transaction; via rule; via two global preferences — "mark ALL new transactions as needs review" and "mark uncategorized as needs review". Resolving paths: web checkmark beside the row; **mobile swipe-to-review**; bulk via Edit Multiple → Review Status (No change / Needs review / Reviewed). Filtering: Filter → Other → "Needs review by" → anyone / me / specific household member. A dashboard card surfaces the queue on app open.

- Source: `https://help.monarch.com/hc/en-us/articles/5528707082516-Reviewing-Transactions`; `https://help.monarch.com/hc/en-us/articles/360048393372-Transaction-Rules`; `https://help.monarch.com/hc/en-us/articles/28953573066260-Tips-Tricks-for-Using-Monarch`; `https://www.monarch.com/blog/review-on-the-go-and-smart-split` (mobile swipe). Accessed 2026-10-15/16. Confidence: high.

**MoneyFlow-specific use.** Our `/inbox` is already the conceptual match: candidates needing human confirmation. Monarch's contribution is the **graded flag model** — "needs review" is a first-class persistent state on the ledger row (not just an inbox ephemeron), so review status survives filtering, rules and bulk edits. The two auto-mark preferences map directly onto our world: "all new inbox items need review" vs "only unmatched/low-confidence ones". Swipe-to-review is a proven mobile gesture for the `/inbox` and `/transactions` lists.

**Pattern not to copy.** "Needs review by *specific member*" is household scope — non-goal. Do not auto-mark everything by default for a manual-first user: manual entries are already reviewed by act of entry; auto-flagging them would be noise. **Boundary: review state lives on the row and drives inbox/inbox-badge surfaces; it is not a household assignment system.**

## 5. Hide mechanics

**Pattern worth studying.** Hide exists at two granularities. Per-transaction "hide" removes a row from the transactions list, cash flow, reports and budget calculations — but **never changes account balances or net worth** (synced balances come from the bank; manual balances are user-maintained). Per-account there are three separate flags: "hide transactions from reports", "hide from net worth", "hide account" (removes from Accounts page, keeps syncing, unhideable). Distinct destructive ladder per account: hide → exclude balance → hide transactions → **close account** (balance to 0, stops syncing, history kept, reopenable) → **delete account** (permanent, all history gone). Deleted *accounts* (not connections) can be undeleted — restoring recovers transactions only, not balance history.

- Source: `https://help.monarch.com/hc/en-us/articles/4405041904916-Hiding-or-Unhiding-Transactions`; `https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports` (account-level flags); `https://help.monarch.com/hc/en-us/articles/360058636951-Edit-Accounts`; `https://help.monarch.com/hc/en-us/articles/360054863431-Delete-a-Connection-Financial-Institution-vs-Delete-an-Account`; corroboration of balance-independence: `https://finerd.ai/monarch-vs-finerd` (third-party). Accessed 2026-10-16. Confidence: high for existence; medium for exact scope wording.

**MoneyFlow-specific use.** The **laddered destructiveness** (hide → close/archive → delete, each reversible except the last) is precisely our soft-delete/archive/trash philosophy, and their undelete-with-caveat honesty ("transactions restored, balance history not") is good copy discipline. A per-transaction hide is a plausible future answer for transfer-like noise (e.g., own-account transfers users don't want in spending) — but only if our ledger math stays coherent.

**Pattern not to copy.** Hidden transactions that vanish from *reports but not balances* create a reconciliation puzzle — the sum of visible rows no longer equals the balance. For a manual ledger whose core promise is "your entries explain your balance", hidden rows undermine the central invariant. **Boundary: if we ever ship per-row hide, the ledger view must keep hidden rows visible-but-flagged (never invisible), and reports must disclose the excluded total. Not scheduled.**

## 6. Budgets

**Pattern worth studying.** Two budgeting systems behind one screen: **Category budgeting** (per-category monthly amounts) and **Flex budgeting** (the *default*: expenses bucketed into Fixed, Non-monthly, and one Flex number; the Flex bucket is a standalone number, *not* a sum of its categories — "many people have no budget amounts set in the categories within the Flex bucket"). Both sit on a monthly cash-flow model: expected income minus expenses/savings → "Left to Budget". First budget auto-fills from the **trailing 6-month average per category**; "Recalculate default budgets" re-runs it; a guided "Budget Walkthrough" exists; clicking a budget field shows historical spending as a popup. **Rollover is opt-in per category** (gear on web, 3-dot on mobile), expense categories only, marked by a cycle icon, with an optional starting balance. A "Remaining pill" UI lets users move budgeted money between categories. Group-level budgeting sets targets at category-group granularity. Budget-vs-actual on mobile cannot show Actual and Remaining simultaneously (documented UX constraint).

- Source: `https://help.monarch.com/hc/en-us/articles/360048883631-Creating-Your-Budget-in-Monarch`; `https://help.monarch.com/hc/en-us/articles/32125337244052-Using-Flex-Budgeting`; `https://help.monarch.com/hc/en-us/articles/4411119762196-Rollover-Budgets`; `https://monarch.com/blog/group-level-budgeting`. Accessed 2026-10-15. Confidence: high.

**MoneyFlow-specific use.** (a) **Auto-fill first budget from trailing actuals** is the single best pattern here — our manual ledger has real category history, so "suggest from your last N months" removes the blank-budget problem without inventing numbers (aligns with our "never invent" invariant: it derives, never fabricates). (b) **Opt-in rollover per category** avoids YNAB-style mandatory envelope accounting while serving irregular Vietnamese expense rhythms (Tết, tuition, travel). (c) The Flex model's insight — "one loose number for discretionary spend" — is a lightweight budget mode worth keeping on the `/budgets` roadmap for users who refuse per-category tracking.

**Pattern not to copy.** Flex's standalone bucket number decoupled from category detail is an abstraction that would confuse a reconciliation-first product: our budget categories must sum honestly to the total. Two parallel budgeting systems with a mode switch is twice the surface for marginal gain. **Boundary: one budget model (category), rollover and auto-suggest as opt-in enhancements; no bucket abstraction, no mode switching.**

## 7. Recurring

**Pattern worth studying.** Detection model: auto-detection scans transaction history for merchant/frequency patterns; **detected candidates go through a user-review flow before joining the confirmed list** — plus manual "mark merchant recurring". Internally it is a **merchant-stream model** (unofficial API docs: one merchant, possibly multiple streams for different payee-name variants). Display: list view plus **calendar view** for planning ahead. Status flow: upcoming → paid when a matching transaction is detected before the due date (Paid/Partially Paid for bill-synced items); manual "Mark as paid" exists but only for Spinwheel-synced bills. Streams are **persistent until explicitly marked "not recurring"** — dismissing affects all streams for that merchant. Documented gaps: no per-occurrence skip found in any source; detection thresholds undocumented; amount variance flags the item yellow; ±3-day lateness buffer.

- Source: `https://help.monarch.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills`; `https://help.monarch.com/hc/en-us/articles/29446697869076-Getting-Started-with-Bill-Sync`; unofficial internals: `https://github.com/echomodel/monarch-access/blob/main/CONTRIBUTING.md`; `https://www.monarch.com/blog/investments-on-mobile`. Accessed 2026-10-15/16. Confidence: medium-high (official docs + unofficial API corroboration; detection thresholds genuinely undocumented).

**MoneyFlow-specific use.** **Candidate-review before confirmation** is our inbox philosophy applied to recurring: detection proposes, the user disposes — MoneyFlow's `commitment_occurrences` model already separates stream from occurrence. Calendar view is a proven planning layout for `/planning`. "Persistent until explicitly dismissed" prevents detection churn from deleting user intent — our archive-not-delete convention matches.

**Pattern not to copy.** Bill Sync itself (Spinwheel third-party biller connection) is US-aggregator scope. Merchant-stream granularity (streams keyed to payee-name variants) matters only when ingesting messy bank feeds; our manual/notification sources produce cleaner merchant strings. Missing per-occurrence skip is a real Monarch gap — our occurrence-level model already does better; do not regress to stream-only. **Boundary: detection proposes candidates into `/inbox`; no external biller connections.**

## 8. Goals

**Pattern worth studying.** Goals 3.0 splits the feature into **Save-up** and **Pay-down**. Save-up: each goal takes target amount, target date, planned monthly contribution → Monarch derives a **status (on track / ahead / at risk) and by how much**; status requires all three inputs. Contributing accounts are managed **globally** (toggle per account, "use entire balance and future activity") rather than per-goal. Money moves via explicit **fund allocations** (Contribution/Withdrawal events, optional budget-actuals impact, backdatable) and **linked income/transfer transactions** that appear in the goal's activity list; automatic **Adjustment events** (max one per account per day) reconcile balance drift when the whole account backs a goal. Optional **growth rates** per account type (defaults: 0% checking / 3% savings / 7% investment) feed projections. A toggle decides whether **spending reduces goal progress** (refillable goals like emergency funds vs one-time like vacations). Pay-down: liability accounts are auto-recognized — "your account is the goal"; adding APR + minimum payment produces a **debt-free-date projection** with principal/interest split and an avalanche-vs-snowball calculator; "Save to budget" writes plan payments into the monthly budget. Caveat: pay-down progress bars move only on reported balances — linked transactions show as motivational "Contributions" but do not move the bar.

- Source: `https://help.monarch.com/hc/en-us/articles/15000751305108-Using-Goals`; `https://help.monarch.com/hc/en-us/articles/44373110771860-Introducing-Goals-3-0`; `https://help.monarch.com/hc/en-us/articles/44373182867476-Using-Save-Up-Goals`; `https://help.monarch.com/hc/en-us/articles/44373293932052-Using-Pay-Down-Goals`; `https://help.monarch.com/hc/en-us/articles/46420712538260-Moving-Funds-In-and-Out-of-Goals`; `https://help.monarch.com/hc/en-us/articles/47822256713236-Growth-Rates-in-Save-Up-Goals`. Accessed 2026-10-15/16. Confidence: high.

**MoneyFlow-specific use.** (a) **Status derivation with explicit prerequisites** ("need target+date+contribution to show on-track") is honest progress UI — no fake progress bar. For `/goals`: show status only when inputs exist, else say what's missing. (b) **Linked-transaction funding** (transactions appear in goal activity) fits our ledger model better than Monarch's balance-tracking: our contributions *are* ledger entries. (c) The pay-down insight worth keeping: progress should reflect **observable money movement**, and if linked transactions don't move the bar, users read the UI as broken — our goal progress must be driven by linked entries, not by account-balance magic we don't have. (d) Backdatable contribution with "counts toward budget actuals?" toggle is a clean answer to month-boundary bookkeeping.

**Pattern not to copy.** Balance-driven goal tracking (auto-adjustment events from synced balances) requires aggregation. Growth-rate projections (7% investment assumptions) introduce forecasting we can't verify for manual accounts — and stray toward invented numbers, against our invariant. Debt-payoff calculators assume APR/liability account plumbing we don't model. **Boundary: goals are ledger-linked envelopes with explicit contributions; no balance auto-tracking, no growth projections, no debt calculators.**

## 9. Cash flow & reports

**Pattern worth studying.** Reports has three tabs — **Cash Flow, Spending, Income** — each with a chart-type selector (thumbnail + description): **Sankey** (flow from income into categories/groups; web-only, Cash Flow), **Trend Bars** (stacked by default on Cash Flow, grouped on Spending/Income, switchable), **Treemap** (Spending/Income, click a block to drill into its transactions), and a **Profit & Loss table** for business-tier users. Grouping: category, group, category&group, merchant; owner/business-entity/Fixed-Flexible depending on features. Every chart element is **click-through to underlying transactions**. Whole chart+filter setups save as **saved reports**. The standalone Cash Flow page reports total income, total spend, difference, and a **saving-rate percent**; it works without a budget. A monthly progress report and credit-utilization report exist. In 2026 the standalone `/cash-flow` page merged into Reports as a "Breakdown" view — old URLs redirect.

- Source: `https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports`; `https://help.monarch.com/hc/en-us/articles/20504904768020-Cash-Flow`; `https://help.monarch.com/hc/en-us/sections/35226915113492-Reports-Cash-Flow`; rollout detail via `https://reddit.com/r/MonarchMoney` release post (snapshot `reddit.sentinel-team.org` mirror). Accessed 2026-10-16. Confidence: high for structure; medium for rollout dates.

**MoneyFlow-specific use.** (a) **Click-any-chart-element → transaction list** is the trust pattern `/reports` needs: every number must answer "which entries make this?" — we already have the entries; this is presentation wiring. (b) **Saving-rate percent + income-minus-spend summary** works with zero configuration for a manual ledger (no budget prerequisite — important for us since most users won't set budgets first). (c) Treemap's "bigger block = bigger category, one click to why" is a Vietnamese-mobile-friendly alternative to dense tables. (d) Saved-report setups are a cheap power feature once filters exist.

**Pattern not to copy.** Sankey diagrams visualize flows between accounts/categories — beautiful for aggregated multi-account graphs, noisy and empty-looking for a cash-and-bank manual ledger. Business P&L/Schedule-C and credit-score reports are out of scope. **Boundary: reports stay entry-driven (category bars/trends/treemap with drill-through); no Sankey-by-default, no credit/business reports.**

## 10. Accounts & institutions

**Pattern worth studying.** Bimodal account model: synced accounts via three aggregators (**Plaid, Mastercard/Finicity, MX**) claiming 13,000+ institutions, switchable per connection; and **manual accounts** as a fully supported path (cash, vehicles, loans, real estate, manual holdings) with CSV import of balances and transactions. Connection health is a first-class surface: dedicated **connection-status messaging** and a public status page; institutions and accounts are deletable separately with documented consequences. Account actions ladder: rename/retype → hide → exclude-from-net-worth → close (keeps history) → delete (permanent) → undelete (transactions only).

- Source: `https://help.monarch.com/hc/en-us/articles/360048393392-Connect-or-Manually-Add-Accounts`; `https://help.monarch.com/hc/en-us/articles/360058187072-Manual-Accounts`; `https://help.monarch.com/hc/en-us/articles/33707613533972-Understanding-Data-Providers-and-Connections`; `https://help.monarch.com/hc/en-us/articles/39129010722836-Connection-Status-Messaging`; `https://help.monarch.com/hc/en-us/articles/360058636951-Edit-Accounts`; `https://www.monarch.com/connection-status`. Accessed 2026-10-15. Confidence: high.

**MoneyFlow-specific use.** Manual accounts as a **supported, non-second-class path** validates our entire positioning — Monarch treats them as legitimate (CSV history import included), not a degraded fallback. The account action ladder (archive/close-with-history vs hard delete) is our trash/archive convention with better vocabulary: "closed" is the right word for a dead bank account whose history must survive.

**Pattern not to copy.** The aggregator machinery itself — providers, connection status dashboards, credential refresh — is the boundary we are *not* crossing. Balance history as a separately-tracked series (deletable independently of transactions) exists because synced balances float free of entries; our balances derive from entries, so we neither need nor want that duality. **Boundary: accounts are user-declared stores with archive semantics; no provider connections, no balance-history series divorced from entries.**

## 11. Onboarding & paywall

**Pattern worth studying.** Officially five steps: connect accounts → review categories → create budget → set a goal → household. Recorded real funnels run ~7–9 screens: value-prop carousel → signup (email/Apple/Google; no phone) → verify → "financial priorities" → personal details → **hard paywall** (7-day trial required before any product access; ~1.5 min first-launch-to-dashboard in one recording). Paywall UX: annual highlighted "Most Popular — Save 44%" vs monthly, plus a **visual timeline showing when the trial reminder fires and when billing starts** (trust pattern). Bank linking is step 1, called "the most important step" — but it is **exitable**: recorded flows show users exiting connection and continuing with a manual account (name → type → balance → dashboard).

- Source: `https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-with-Monarch` (official); `https://johnstone.blog/2025/01/20/product-teardown-monarch-money/`; `https://screensdesign.com/showcase/monarch-budget-track-money`; `https://pageflows.com/post/desktop-web/onboarding/monarch-money/` (third-party recorded flows). Accessed 2026-10-15. Confidence: medium-high (official steps verified; funnel details are third-party recordings that may drift).

**MoneyFlow-specific use.** (a) The **trial-billing timeline** ("we'll remind you on day X, billing starts day Y") is the most portable element — if MoneyFlow adds a paid tier, this kills the #1 trial anxiety. (b) "Prompt strongly but let users skip to manual" is exactly our onboarding stance: acquisition capture (notification permission, account setup) should be skippable, never a hard gate. (c) Value-prop-then-signup sequencing and ~1.5min-to-first-value are worth measuring against our own funnel.

**Pattern not to copy.** **Hard paywall before any product value** — no free tier, no sample data — is anti-educational for a manual-first app whose trust is earned by letting users feel the ledger before paying; user complaints about it are documented. The aggregator-first first step presumes sync exists. **Boundary: onboarding stays free-first; paywall, when it comes, gates premium capability — never core entry. No trial-then-lock funnel.**

## 12. Settings & data management

**Pattern worth studying.** Data portability is real: per-account transaction CSV and balance-history CSV from account Edit; **all-transactions CSV from Settings > Data**; bulk balance CSV from Accounts. Explicitly downloadable **even after subscription/trial ends** — no data hostage. Destructive ladder in Settings > Data: "delete transaction history before [date]" scoped by checkboxes (synced / manual / CSV-imported) with an irreversible warning. Account/connection deletion is split: deleting a connection removes the institution and all accounts; deleting an account removes just it; deleted accounts are undeletable-recoverable for transactions only. Full account deletion is permanent, recommends download first. Category management: default categories can be renamed/reorganized (system keeps recognizing them), disabled/deleted categories prompt **reassignment of attached transactions and rules** — nothing orphaned.

- Source: `https://help.monarch.com/hc/en-us/articles/15526600975764-Downloading-Transaction-or-Account-History`; `https://help.monarch.com/hc/en-us/articles/4404741938196-Deleting-History-Across-All-Accounts`; `https://help.monarch.com/hc/en-us/articles/4412388754708-Delete-a-Monarch-Account`; `https://help.monarch.com/hc/en-us/articles/360054863431-Delete-a-Connection-Financial-Institution-vs-Delete-an-Account`; `https://help.monarch.com/hc/en-us/articles/54176418504980-…Conscious-Spending-Plan` (category reassignment wording). Accessed 2026-10-15/16. Confidence: high.

**MoneyFlow-specific use.** (a) **"Export works even after you stop paying"** is the portability promise MoneyFlow should state verbatim-equivalent in Vietnamese — it costs us nothing and signals ledger ownership. (b) **Scoped history deletion** ("delete before date", checkbox scope by source) is a precedent for our future retention controls — more honest than infinite trash accumulation. (c) Category delete-with-reassignment is the correct UX we should adopt for our categories: never orphan entries.

**Pattern not to copy.** Balance-history-as-separable-data and connection-vs-account deletion layers exist because of sync duality. Multi-source checkboxes (synced/manual/CSV) map to our source types (manual/notification/import) only loosely. **Boundary: portability = full user export, always free; deletion semantics stay within our soft-delete → trash → purge ladder.**

## 13. Collaboration / household — NON-GOAL

**Pattern worth studying (awareness only).** Households share one subscription: roles are Admin (owner, billing) / Member (full visibility) / Professional (advisor with privacy-scoped client access). **Shared Views** assigns ownership — mine/theirs/ours — to every account and transaction; filters switch personal/partner/household perspectives; transactions inherit the account's owner, overridable per-row or by rule. Critically: **members cannot hide accounts or transactions from each other** — full transparency is the design. Review can be assigned to a specific member ("needs review by").

- Source: `https://help.monarch.com/hc/en-us/articles/20926382202004-Monarch-for-Couples-and-Households`; `https://help.monarch.com/hc/en-us/articles/42228648365076-Shared-Views-in-Monarch`; `https://www.monarch.com/blog/shared-views`; `https://www.monarch.com/for-couples`. Accessed 2026-10-16. Confidence: high. **Recorded as non-goal; no implementation intent.**

**MoneyFlow-specific use / boundary.** Non-goal per locked boundary — recorded so future "share with spouse" requests can be evaluated against this documented model instead of re-researched. If ever revisited, the mine/theirs/ours ownership model + full-transparency constraint are the design to copy; Monarch demonstrates the permission model is "all visible, labeled by owner" rather than granular hiding. Household monetization (free seats under one subscription) is a proven retention lever — parked, not approved.

## 14. Mobile surface

**Pattern worth studying.** Deliberate asymmetric platform design. **Mobile-only:** swipe-to-review transaction gestures, Monthly progress reports, Apple Card connect. **Web-only:** Command-K search/shortcuts, PDF attachments (images both), manual balance editing, balance/transaction history import. **OS-level widgets** on iOS + Android: budget-category widget (defaults to Flex bucket or first budgeted category), scrollable resizable transactions widget on Android (filterable: needs review / most recent / uncategorized / investments), stackable widgets on iOS. Dashboard card layout is independent per platform (§1). Mobile budget view cannot show Actual and Remaining at once — a documented constraint, not a bug.

- Source: `https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-with-Monarch`; `https://help.monarch.com/hc/en-us/articles/8611706513684-Using-Mobile-Widgets`; `https://www.monarch.com/blog/iphone-widgets-and-recurring-updates`. Accessed 2026-10-15. Confidence: high.

**MoneyFlow-specific use.** (a) **Swipe-to-review on mobile** is the fastest inbox-triage gesture — maps to our `/inbox` confirm/dismiss. (b) **Android home-screen widget showing "needs review" count or quick-add** is a plausible Vietnam-market differentiator (Android-dominant market; widget = zero-open capture affordance). (c) The explicit mobile-daily/web-deep-review split licenses us to keep web report density high without cramming it onto the phone.

**Pattern not to copy.** iOS-first widget/shortcut investments and platform-exclusive feature drift (feature X only on web, Y only on mobile) fragment the product — our parity contract keeps surfaces equivalent unless a platform genuinely can't support it. **Boundary: platform differences are allowed only where the OS forces them (widgets, attachments); no arbitrary feature gating per surface.**

## 15. Cross-cutting signals

- **Review state is a first-class ledger attribute** (not a transient queue): filterable, rule-settable, bulk-editable, dashboard-surfaced. Strongest single convergence across Monarch's transactions, rules, dashboard and mobile surfaces.
- **Automation is always opt-in-visible**: rules preview before save, retroactive apply is an unchecked-by-default checkbox, detected recurring items wait in review. Automation proposes; the user disposes.
- **Destructive laddering everywhere**: hide → close → delete → undelete-with-caveats, each documented with precise scope and irreversibility wording. Monarch's trash story: no trash — deletion is final but layered; ours (soft-delete → trash → permanent purge) is *better* for recoverability and we now ship it (this work session).
- **"Works even after you leave" portability**: full CSV export post-subscription — zero-cost trust.
- **Manual mode is legitimate**: Monarch supports a fully manual account+CSV path despite being aggregation-first — validates that manual-first isn't a degraded niche.
- **Asymmetric platform design is deliberate and documented**, not accidental drift.
- **Monarch's weaknesses visible in evidence**: no per-occurrence recurring skip; undocumented detection thresholds; mobile can't show budget actual+remaining together; hard paywall generates complaints; hidden transactions break list↔balance reconciliation (flagged by competitors' critique); pending-edit matching is best-effort ("may see both transactions").

---

## 16. Mapping table — Monarch pattern → MoneyFlow surface → priority

| # | Monarch pattern | MoneyFlow surface | Priority | Notes |
|---|---|---|---|---|
| 1 | Edit transaction → "save as rule" inline offer | `/transactions`, `/rules` | **P0** | Turns corrections into automation; matches reviewable-automation contract |
| 2 | Needs-review flag on ledger rows + resolve gestures | `/inbox`, `/transactions` | **P0** | Persistent review state; we have the queue, need the row-level flag + filter |
| 3 | Dashboard "needs review" card | `/dashboard` | **P1** | One card, high daily-open value |
| 4 | Rules: preview-before-save + opt-in apply-to-existing | `/rules` | **P0** | Safety contract for retroactive automation |
| 5 | Rules ordered pipeline (sequential, draggable) | `/rules` | **P1** | More honest than first-match-wins |
| 6 | First budget auto-fill from trailing actuals | `/budgets` | **P1** | Derives from real history; never invents numbers |
| 7 | Opt-in per-category rollover | `/budgets` | **P1** | Fits irregular VN expense rhythms |
| 8 | Recurring detection → review candidates → confirmed | `/inbox`, `/planning` | **P1** | Already our inbox philosophy; add detection later |
| 9 | Chart click-through → underlying transactions | `/reports` | **P1** | Trust pattern: every number explains itself |
| 10 | Income/spend/difference + saving-rate summary (no budget needed) | `/reports`, `/dashboard` | **P1** | Works for manual users day one |
| 11 | Swipe-to-review gesture on mobile | `/inbox`, `/transactions` (mobile) | **P2** | Gesture fast-path on top of flag model |
| 12 | Laddered account actions (archive/close vs delete) | `/accounts` | **P1** | "Closed" vocabulary for dead accounts; keep history |
| 13 | Category delete → reassign transactions+rules | `/categories` | **P2** | Never orphan entries |
| 14 | Full CSV export, free even post-subscription | `/settings` (data) | **P1** | Portability promise; we partly have export — make it unconditional |
| 15 | Scoped "delete history before date" w/ source checkboxes | `/settings` (data) | **P2** | Retention control precedent; map sources to ours |
| 16 | Goal status with stated prerequisites (target+date+contribution) | `/goals` | **P2** | Honest progress; no fake bars |
| 17 | Goal funded by linked ledger transactions | `/goals` | **P2** | Fits our model better than balance-tracking |
| 18 | Calendar view for recurring | `/planning` | **P2** | Proven planning layout |
| 19 | Treemap spending chart w/ drill-down | `/reports` | **P3** | After core drill-through works |
| 20 | Android widget (needs-review count / quick add) | mobile home screen | **P3** | Android-first market fit; needs capture-path maturity |
| 21 | Trial-billing timeline on paywall | future paywall | **P3** | Only when monetization ships |
| 22 | Flex budgeting (single loose number) | `/budgets` | **P3/backlog** | Candidate second mode, not committed |
| — | Sankey cash-flow diagram | — | **rejected** | Aggregation-graph visualization; empty for manual ledger |
| — | Net-worth/investment/credit widgets | — | **rejected** | Locked boundary |
| — | Household roles + Shared Views | — | **non-goal (recorded)** | §13 |
| — | Bill Sync (Spinwheel biller connections) | — | **non-goal** | US aggregator scope |
| — | Hard paywall before any value | — | **rejected** | Anti-trust for manual-first |
| — | Hidden transactions removed from reports | — | **rejected as-designed** | Breaks ledger↔balance reconciliation; flag-instead if ever |
| — | Business P&L / Schedule C / Monarch Plus | — | **non-goal** | Out of product scope |

---

## 17. Evidence quality notes

- Help-center text came via search-result excerpts (direct fetch blocked, HTTP 403). Claims were cross-checked across multiple official pages where possible; single-source claims are marked medium confidence.
- Unofficial API sources (`hammem/monarchmoney`, `echomodel/monarch-access`, `jamiew/monarch-mcp`) were used only to corroborate internal data models (merchant streams, filter fields, account flags) — never as sole basis for a product claim.
- Onboarding funnel details are from third-party screen recordings (Jan 2025-era); paywall copy may have changed since.
- Not verified (documented absences): default dashboard widget order; recurring detection thresholds; whether rules fire on CSV/manual imports (Monarch docs specify "received from an account connection" — manual/CSV path unverified); per-occurrence recurring skip (not found in any source — likely absent).
