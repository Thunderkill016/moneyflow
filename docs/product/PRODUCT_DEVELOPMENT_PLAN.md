# MoneyFlow product development plan

**Status:** current brownfield product sequence
**Product authority:** `docs/product/PRINCIPLES.md`
**Execution authority:** `docs/engineering/DEVELOPMENT_SEQUENCE.md`
**Live status authority:** GitHub issues and pull requests
**Last reconciled:** 2026-07-31

## 1. Purpose

This document defines the order in which MoneyFlow should become a trustworthy,
useful and sustainable product. It answers:

- which user outcome must be proven before the next one;
- what is already present in the repository;
- what product, UX, data, security and operational work belongs in each stage;
- which evidence allows the owner to continue, repeat, pause or reject a stage;
- how Claude Code should turn a stage into one bounded implementation packet.

This is a product sequence, not a second backlog. GitHub owns changing task
status. The engineering sequence decides which implementation is safe to do
next. This document decides what product outcome that implementation should
serve.

## 2. Product law and current thesis

MoneyFlow serves a Vietnamese individual who wants to manage their own money
without accounting jargon, bank aggregation or a judgmental financial coach.

The current product loop is:

1. **Record:** enter income, expense or transfer quickly.
2. **Verify:** correct mistakes and confirm that account balances remain
   credible.
3. **Understand:** see observed balances, income, expense and where money went.
4. **Plan:** review budgets, commitments, recurring income and goals explicitly
   entered by the user.
5. **Retain:** keep using the ledger and retain/export trustworthy data.

The product is manual-first. Import and Inbox are optional accelerators, not the
brand or the default onboarding path.

MoneyFlow must not present a global daily spending recommendation until a
separate planning contract has reliable income-cycle, obligation, reserve and
account-intent inputs. `docs/research/08_SAFE_TO_SPEND_WITHDRAWAL.md` records why
the previous model was withdrawn.

## 3. How to read repository evidence

Use this precedence:

1. explicit human decision for the current initiative;
2. `docs/product/PRINCIPLES.md`;
3. reviewed specification in the controlling active packet;
4. this product sequence;
5. `ARCHITECTURE.md` and `docs/engineering/DEVELOPMENT_SEQUENCE.md`;
6. current code, tests, migrations and merged history;
7. historical research as evidence, not authorization.

Older research proposed both safe-to-spend and inbox-first directions. Those
ideas are historical hypotheses where they conflict with current product law.
They may be revisited only through new research, a new specification and human
approval.

## 4. Brownfield baseline

MoneyFlow is not a greenfield MVP. The repository already contains:

| Product area | Existing baseline | Main uncertainty or gap |
|---|---|---|
| Access | email/password, OAuth, recovery, demo mode | repeatable authenticated CI; managed leaked-password setting |
| Ledger | accounts, income, expense, balanced transfers, splits, edit, soft delete and restore | cumulative safe-integer boundary; contract ownership cleanup |
| Daily capture | quick entry, transaction chooser, remembered preferences | desktop dialog P1; measured entry friction is unknown |
| Understanding | dashboard, transaction feed, category totals, weekly/monthly/yearly reports | route-state audit; drill-down and comprehension evidence |
| Planning | category budgets, commitments, recurring income and goals | usefulness is not validated; no global plan may be inferred |
| Ownership | CSV export, privacy and account deletion | recurring production proof and user comprehension |
| Advanced capture | paste, CSV/XLSX/PDF, Inbox, local rules and duplicate heuristics | durable provenance, server dry-run, reconciliation and rule ownership |
| Quality | unit tests, pgTAP, Playwright, responsive audit and deployment gates | browser CI is mostly demo-mode; CSS ownership debt remains |
| Operations | Vercel/Supabase deployment and production smoke evidence | ongoing observability, incident and support operating model |
| Learning | repository research and seven-day owner self-use | no coded primary-user interview set; analytics sink is currently a no-op |

The first product task is therefore not to add feature breadth. It is to close
trust and learning gaps around the product that already exists.

### 4.1 Feature-first development law

MoneyFlow is developed through user-facing feature slices. Reliability,
security, accessibility and maintainability are part of each feature's
Definition of Done; they are not an unlimited technical program that postpones
product value.

After current in-flight work, P0/P1 defects and release-blocking financial or
tenant-safety failures are closed, Claude must select the next feature from the
roadmap below.

A standalone technical initiative is allowed only when at least one is true:

1. it fixes an open P0/P1 defect in a core flow;
2. it protects a release-blocking invariant in section 6;
3. it is the smallest direct dependency of the next selected feature;
4. measured evidence identifies it as a user-visible reliability or performance
   bottleneck;
5. a current security, legal or provider requirement blocks release.

Otherwise, technical cleanup stays behind feature delivery. Architecture work
must name the feature it enables and stop when that feature is unblocked.

### 4.2 Feature release sequence

| Release | User promise | Features, in build order |
|---|---|---|
| A - Ghi và hiểu | ghi tiền nhanh, tìm lại được, hiểu tháng này | F01 Quick Entry 2.0; F02 Transaction Workspace; F03 Overview and Reports |
| B - Làm sạch và tin | số dư có thể kiểm tra, dữ liệu nhập có nguồn gốc | F04 Account Reconciliation; F05 Trusted Import; F06 Review and Rules |
| C - Lập kế hoạch | theo dõi kế hoạch do chính người dùng đặt | F07 Budget 2.0; F08 Recurring Money; F09 Goals |
| D - Duy trì thói quen | biết sổ đã cũ và có một nhịp review bình tĩnh | F10 Weekly Review and Reminders |
| E - Sản phẩm bền vững | beta học được, quyền dữ liệu rõ, trả phí hợp lý | F11 Product Learning and Support; F12 Commercial Packaging |

Build one feature at a time. A release is a value grouping, not permission to
open every feature in parallel.

### 4.3 Detailed feature roadmap

#### F01 - Quick Entry 2.0 and first value

**User outcome:** a new or returning user records one correct transaction on a
phone with minimal setup and immediately sees its effect.

**Existing:** onboarding, quick-entry routes/dialogs, recent preferences,
expense/income/transfer mutations and dashboard refresh.

**Build slices:**

1. Fix the shared desktop dialog P1 while preserving mobile sheets.
2. Make registration -> one account -> one expense -> dashboard the canonical
   first-value path.
3. Keep amount first; show recent account/category as suggestions; keep date
   editable and note optional.
4. Preserve entered fields on validation/network errors.
5. Prove double-submit idempotency.
6. Measure open-to-success time and failure reason with privacy-safe events.

**Complete when:** the flow works on a physical phone and desktop, median entry
time is measured from at least five entries, no silent/duplicate save occurs,
and users can explain what changed after Save.

**Do not add:** voice, OCR, bank sync, mandatory budget setup or AI category
advice.

#### F02 - Transaction Workspace

**User outcome:** find, inspect, correct and recover any recorded transaction
without losing context.

**Existing:** transaction list, basic filters/search, edit, soft delete, undo,
transfer and split support.

**Build slices:**

1. Search plus period/account/kind/category filters.
2. Live income, expense and net totals for the active filter.
3. Stable filter state across detail/edit/back navigation.
4. Desktop detail drawer or deliberate modal; phone full-height detail surface.
5. Edit, delete and restore with exact post-reload state.
6. Empty, no-result, loading, stale and error recovery states.
7. Only after import volume proves need: explicit selection and bounded bulk
   category/account actions.

**Complete when:** moderated users can find and fix a named transaction, filtered
totals reconcile to source rows, and transfer/split/deleted rows remain correct.

**Do not add:** tags, merchant CRM, arbitrary custom fields or a full accounting
register before observed demand.

#### F03 - Overview and Reports

**User outcome:** answer how much money exists, what entered/left in a selected
period and where expense went.

**Existing:** dashboard, recent transactions, top categories, weekly/monthly/
yearly reports and CSV export.

**Build slices:**

1. Keep observed balance, income, expense and net as the dashboard hierarchy.
2. Make KPI, category and recent-transaction rows open the exact filtered
   transaction set.
3. Align dashboard and report period/account/category semantics.
4. Add current-versus-previous comparison only where ranges are equal and
   explicit.
5. Provide exact values and table/text alternatives for every chart.
6. Export the selected scope or clearly state the exported scope.

**Complete when:** users answer the five observed-money questions in section 11,
every aggregate drills into its source, and exported totals reconcile.

**Do not add:** net-worth hero, investment/crypto reporting, chart builders or a
global spending recommendation.

#### F04 - Account Reconciliation

**User outcome:** compare one MoneyFlow account with a real external balance,
find the difference and restore trust.

**Dependency:** F02 transaction workspace.

**Build slices:**

1. Specify pending/uncleared, cleared and reconciled semantics.
2. Add statement date, statement balance, cleared ledger balance and difference.
3. Let the user clear/match rows while the difference updates.
4. Complete a reconciliation session with a visible timestamp.
5. Represent an accepted adjustment as an explicit ledger transaction.
6. Warn and provide a controlled reopen path after editing reconciled data.
7. Treat cash accounts separately where no external statement exists.

**Complete when:** a user reconciles a redacted real account, understands any
adjustment, and edit/reopen/delete counterexamples remain recoverable.

**Do not add:** irreversible locking copied from another product or direct
balance edits outside the ledger.

#### F05 - Trusted Import

**User outcome:** preview a statement/file, understand what will happen, avoid
duplicates and commit only reviewed data.

**Dependencies:** F02 transaction workspace and F04 reconciliation semantics.

**Existing:** paste, CSV/XLSX/PDF parsing, Inbox candidates, mapping, local
fingerprints, direct CSV import and transfer suggestions.

**Build slices:**

1. Persist source batch/row, original description, external ID, parser/mapping
   version and candidate-to-transaction linkage.
2. Use a versioned fallback fingerprint only when no external ID exists.
3. Add a server-side dry run: create, match/update, duplicate, suspected
   transfer or invalid.
4. Ensure preview and commit use the same validation/version.
5. Preserve explicit cancellation and deleted/reimport behavior.
6. Trace every committed row back to its source without exposing raw data in
   analytics or logs.

**Complete when:** a redacted real statement previews, commits and reimports
without silent duplication, and every committed row has explainable lineage.

**Do not add:** bank credentials, screen scraping, OCR expansion or opaque
LLM-first parsing.

#### F06 - Review Queue and Deterministic Rules

**User outcome:** resolve only uncertain imported rows and teach MoneyFlow
repeatable corrections.

**Dependency:** F05 provenance and dry run.

**Build slices:**

1. Explain why a candidate needs review.
2. Support approve, edit, reject and explicit bounded bulk actions.
3. Persist user-owned rules with RLS, priority, version and enabled state.
4. Start with one transparent form:
   original description contains X -> category Y.
5. Preview affected rows before saving/applying a rule.
6. Record the applied rule version and allow disable/undo.
7. Never auto-post low-confidence rows.

**Complete when:** the same input and rule version produce the same result,
cross-user rules are isolated, and review time/correction rate are measurable.

**Do not add:** multi-stage scripting, AI agents or autonomous financial
decisions.

#### F07 - Budget 2.0

**User outcome:** set a monthly category limit and see limit, spent and remaining
with direct access to the responsible transactions.

**Existing:** monthly category budgets and progress states.

**Build slices:**

1. Make scope and period explicit.
2. Show limit, spent, remaining/overspent as exact values; bar is secondary.
3. Drill down into the source expense rows.
4. Support edit/delete and calm over-limit explanations.
5. Define rollover only through a new specification; default remains no
   rollover.
6. Measure setup, subsequent review and plan changes.

**Complete when:** users understand budget remaining versus account balance,
transfers are excluded and overspend traces to source transactions.

**Do not add:** full zero-based envelopes or an inferred global allowance.

#### F08 - Recurring Money

**User outcome:** track expected obligations and expected income, then post or
match the actual ledger transaction exactly once.

**Existing:** commitments, occurrences, recurring income templates and
pay/undo/receive paths.

**Build slices:**

1. Separate expected, due, paid/received, skipped and cancelled states.
2. Prioritize upcoming obligations by date.
3. Post a real transaction idempotently and link it to the occurrence.
4. Match an existing/imported transaction without creating another.
5. Support undo/reopen with an audit-safe relationship.
6. Show expected values as plans, never observed cash.

**Complete when:** one obligation and one income template survive post, reload,
undo and import-match paths without double counting.

**Do not add:** automatic bill payment or claims that expected income already
exists.

#### F09 - Goals

**User outcome:** create a target, explicitly allocate or release money and track
progress without changing total assets.

**Existing:** savings goals, allocations, deadlines and dashboard card.

**Build slices:**

1. Clarify target, allocated amount, remaining target and deadline.
2. Preserve total assets when allocating/releasing.
3. Prevent allocation beyond the target and release beyond allocated value.
4. Explain whether allocation is organizational metadata or tied to a specific
   account before adding account binding.
5. Remove copy that implies a universal amount “available to spend”.
6. Test whether real users revisit goals; demote the feature if they do not.

**Complete when:** users distinguish goal allocation from expense and balance,
and every progress number is traceable.

**Do not add:** investment returns, automated transfers or advice about how much
the user should save.

#### F10 - Weekly Review and Reminders

**User outcome:** notice that the ledger is stale or something needs review,
then complete a short factual weekly check.

**Dependencies:** F02; F04 when reconciliation is available.

**Build slices:**

1. Show last transaction and last reconciliation freshness.
2. Summarize observed weekly income/expense and unresolved review items.
3. Link each item to the exact action.
4. Offer opt-in local/push reminders with quiet hours and easy disable.
5. Keep reminder payloads free of amounts, notes and account identifiers.
6. Measure review completion and return without streaks.

**Complete when:** reminders are optional, private and actionable, and a weekly
review ends with a visibly fresher or reconciled ledger.

**Do not add:** shame copy, streaks, social comparison or daily spending advice.

#### F11 - Product Learning and Support

**User outcome:** report a problem and understand limitations without exposing
financial data.

**Build slices:**

1. Wire the reviewed privacy-safe analytics event dictionary to an approved
   sink, or explicitly keep it disabled.
2. Add in-product feedback/support entry with clear redaction guidance.
3. Attach route, app version and safe error code, never raw financial content.
4. Maintain release notes and known limitations.
5. Produce cohort dashboards for activation, WTLU, W1/W4 retention and support
   incidents.

**Complete when:** feature decisions can use behavior plus interviews, and
support can reproduce normal errors without requesting credentials or raw data.

#### F12 - Commercial Packaging

**User outcome:** understand what remains free, what paid value is offered and
retain access to their data.

**Dependency:** Stage 6 private-beta evidence and Stage 7 legal/commercial gate.

**Build slices:**

1. Test packaging and pricing language before billing code.
2. Preserve ledger correctness, privacy, export and deletion for every tier.
3. Run a manually administered paid pilot if authorized.
4. Specify provider, tax, invoice, refund, webhook, entitlement and recovery
   behavior.
5. Add checkout/billing only in a separate approved vertical slice.

**Complete when:** real behavior supports willingness to pay, legal/provider
requirements are accepted and failed payment never traps user-owned data.

### 4.4 Immediate feature queue for Claude

Unless live evidence changes priority, use this queue:

1. **Preflight:** reconcile merged PRs #163-#165 with their still-active
   packets and any remaining deployment/owner evidence.
2. **Blocker:** fix issue #145 because it breaks F01 primary dialogs.
3. **F01:** finish and measure Quick Entry 2.0 plus first-value onboarding.
4. **F02:** deliver Transaction Workspace search/filter/live totals/detail.
5. **F03:** connect dashboard/reports to filtered source transactions.
6. **F04:** deliver one-account reconciliation.
7. **F05:** add provenance and server-side import dry run.
8. **F06:** persist transparent user-owned rules.
9. **F07-F09:** validate and improve planning features in order.
10. **F10-F11:** establish weekly retention and product-learning loops.
11. **F12:** test commercial packaging only after private-beta evidence.

Issue #156 and other internal ownership work may enter between items only when
it is a direct dependency or safety blocker for the selected feature. General
CSS cleanup and broad refactors do not displace this queue.

### 4.5 Web evidence map

Before specifying an F01-F12 feature, read its row in
`docs/research/06_GLOBAL_EXPENSE_WEB_UX_BENCHMARK.md`, section 13, and recheck
the linked primary sources if the behavior is material to the design.

| Feature group | Current web evidence | Product decision |
|---|---|---|
| F01-F03 | YNAB manual capture and Reflect; Copilot transaction workspace; Lunch Money transaction/analytics tools | optimize the daily ledger loop, exact drill-down and recovery before adding breadth |
| F04-F06 | Actual reconciliation/import identity/dry-run; YNAB matching; Monarch/Lunch rules and review | reconciliation, provenance, preview and deterministic rules precede automation |
| F07-F09 | YNAB targets; Monarch/Lunch budgets; Actual/Lunch recurring linking; Rocket goals | represent explicit user plans; never infer observed cash or perform transfers |
| F10-F12 | YNAB reconciliation cadence; Copilot/Rocket attention; Actual ownership/export; current packaging patterns | prove a private, repeatable review loop before commercial automation |

Counterexamples are part of the feature contract. In particular, F05 must cover
an import that cannot be safely undone, F08 must cover duplicate occurrence
creation and failed matching, and planning features must keep expected values
separate from observed ledger values.

Competitor documentation proves that a pattern exists, not that MoneyFlow users
need it. A feature still requires repository fit, Vietnamese-user evidence and
the completion gate in section 4.3.

## 5. Product outcomes and metric tree

### 5.1 Candidate north-star metric

Use **Weekly Trusted Ledger Users (WTLU)** as the candidate north star during
private beta:

> A distinct user who completes at least one real ledger mutation in a
> seven-day window and returns to review or correct their ledger in that window.

After reconciliation ships, evolve the definition to include a recent
successful balance confirmation. Do not freeze the metric until event
instrumentation and beta behavior show that it correlates with retained value.

Never send amount, note, raw statement, account number, source text or user
identity to third-party product analytics.

### 5.2 Metric layers

| Layer | Measure | Decision it supports |
|---|---|---|
| Acquisition | qualified visits, registration starts/completions | whether positioning reaches the intended user |
| Activation | account created, first transaction recorded, dashboard reviewed | whether the product reaches first value |
| Daily loop | median record time, save failure, correction/undo, ledger freshness | whether manual-first use is sustainable |
| Trust | reconciliation completion, unexplained difference, duplicate escape, export success, deletion success | whether the user can believe and own the data |
| Understanding | report/filter use, category drill-down, task comprehension | whether observed data answers real questions |
| Planning | budget/commitment/goal setup and subsequent review | whether planning tools influence a user-approved plan |
| Retention | W1 and W4 retained ledger users by cohort | whether value repeats |
| Quality | P0/P1 count, mutation error, crash/error route, support incidents | whether growth should pause |
| Business | pricing exposure, trial-to-paid, support cost, infrastructure cost | whether the product can be sustained |

### 5.3 Measurement rules

1. Instrument a baseline before setting a percentage improvement target.
2. Separate authenticated and demo behavior.
3. Separate invited testers, owner use and organic users.
4. Use medians and distributions for task time, not only averages.
5. Couple behavioral metrics with interviews; an event does not explain intent.
6. Record event version and product version when a funnel definition changes.
7. Treat a missing event sink as missing evidence, not zero usage.
8. A numeric target in a work packet must name its source or be labeled as an
   experiment threshold.

## 6. Release-blocking product invariants

These hold in every stage:

| Invariant | Required evidence |
|---|---|
| VND is integer đồng | boundary tests at parser, domain and persistence paths |
| Transfer total is zero | unit plus database/RPC tests |
| Transfer is excluded from income/expense | report, budget and browser tests |
| A mutation is idempotent where repeat submission is possible | database and integration counterexample |
| Deleted data leaves active views and can follow its documented recovery path | domain/browser evidence |
| User A cannot read or mutate User B data | pgTAP tenant-isolation tests |
| Missing planning inputs remain unknown | copy/source contract and counterexamples |
| Export cannot execute spreadsheet formulas | CSV tests and spreadsheet smoke |
| Core controls remain usable on phone, keyboard and enlarged text | responsive and accessibility evidence |
| Financial content is absent from logs and analytics | source contract plus payload tests |

Any failed money, tenant-isolation or destructive-data invariant freezes feature
expansion until repaired and reverified.

## 7. Stage map

| Stage | Product outcome | Effort band for a solo/small team | Gate to continue |
|---|---|---:|---|
| 0 | one honest product and delivery state | 1-2 weeks | in-flight work reconciled; P0/P1 queue accurate |
| 1 | ledger trusted for real daily use | 2-4 weeks | no core P0/P1; financial/auth/export gates pass |
| 2 | daily capture loop is fast and understandable | 2-4 weeks | observed first-use and repeat-use tasks succeed |
| 3 | users can find, correct and understand money | 2-3 weeks | comprehension and recovery tasks succeed |
| 4 | imported/manual data can be traced and reconciled | 4-8 weeks | provenance and reconciliation pass real statements |
| 5 | explicit planning tools help without false advice | 4-8 weeks | one planning mode is validated or consciously kept secondary |
| 6 | private beta proves repeated value | 6-8 calendar weeks | cohort evidence supports continue/pivot/stop |
| 7 | trust, compliance and willingness to pay are credible | 4-6 weeks | owner approves commercial-readiness evidence |
| 8 | public beta operates safely and learns continuously | continuous | reliability and retention gates permit expansion |

Effort bands are planning assumptions, not deadlines. Re-estimate at every exit
gate. Stages may overlap in research, but implementation must not bypass a
higher safety gate that affects the same user flow.

## 8. Stage 0 - Reconcile the product in flight

### Outcome

There is one accurate description of what MoneyFlow is, what work is in flight
and which product risk is next.

### Entry state

- The current checkout contains product and agent-control changes.
- Live GitHub state can move faster than documentation.
- At the 2026-07-31 reconciliation, PRs #163-#165 are merged into
  `origin/main`; their active packets still need honest
  deployed/accepted/completed reconciliation. Draft PR #119 still needs an
  owner decision.
- Issues #145, #156, #40, #72 and #53 remain relevant live work. Recheck before
  using these numbers.

### Work in order

1. Reconcile every open PR with its packet, CI, review and deployment state.
2. Resolve agent-fixable blockers in implemented work before starting another
   broad initiative.
3. Record human-only gates such as logo acceptance, merge, provider plan change
   or production visual approval.
4. Reproduce and rank open P0/P1 defects by affected core job and blast radius.
5. Confirm current product copy does not revive daily spending advice or
   inbox-first positioning.
6. Create a one-page current-state scorecard from live evidence:
   core flows, open blockers, last authenticated smoke, last database gate,
   current instrumentation and active beta cohort.

### Required evidence

- open PR and issue query;
- exact branch/commit and dirty-worktree report;
- packet-to-PR reconciliation;
- no stale issue snapshot presented as current;
- named owner and next action for every human-only gate.

### Exit gate

- No implemented PR waits on an agent-fixable blocker.
- Active packets describe their real state.
- The next initiative maps to one product outcome in this document.
- The owner can distinguish code that is implemented, verified, deployed and
  accepted.

### Do not do

- start a redesign because screenshots look dated;
- revive a completed packet;
- merge, deploy, close or delete shared work without human approval;
- create another backlog document.

## 9. Stage 1 - Trusted ledger foundation

### User problem

“Nếu tôi ghi tiền thật, số dư có đúng, dữ liệu có thuộc về tôi và tôi có sửa
được khi sai không?”

### Existing baseline

The repository has an integer-VND ledger, two-leg transfers, RLS, edit,
soft-delete/restore, authenticated production smoke and safe CSV export
evidence. The seven-day owner-use gate was accepted, with some timing and
final-sample checks waived.

### Work in order

#### 1. Core-flow P1 repair

- Fix desktop dialog positioning at the actual shared owner.
- Verify transaction chooser, expense, income, transfer and account dialogs.
- Preserve mobile sheet behavior, focus trap, Escape, scrolling and submitted
  field values after validation errors.

#### 2. Money boundary correctness

- Add a cumulative-total counterexample where individually safe amounts create
  an unsafe JavaScript sum.
- Choose and document the safe boundary between PostgreSQL `bigint`, transport
  representation and TypeScript.
- Fail explicitly rather than round or truncate.
- Recheck dashboard, reports, account balances, budgets and export.

#### 3. Contract ownership

- Finish current-date ownership without changing calendar semantics.
- Separate stable transaction contracts, category presentation and demo
  fixtures.
- Ensure authenticated production modules do not import demo data authorities.

#### 4. Authenticated confidence

- Create a repeatable disposable-user smoke:
  register/login, create, reload, edit, delete, restore, transfer, export and
  delete account.
- Prove deterministic cleanup.
- Keep secrets and financial descriptions out of artifacts.

#### 5. Security and ownership settings

- Keep RLS on every exposed user-owned table.
- Re-run tenant-isolation and privileged RPC audits after schema changes.
- Enable Supabase leaked-password protection when the required managed plan is
  available; record a provider blocker otherwise.
- Review Auth audit logs and retention without copying sensitive entries into
  GitHub.

### UX states

Every core mutation must cover:

- loading/submitting;
- validation error without field loss;
- network/server error with retry;
- success feedback;
- duplicate submission;
- edit conflict or stale data where applicable;
- delete, undo and post-undo reload;
- phone keyboard and desktop dialog;
- keyboard-only focus and screen-reader label.

### Metrics

- core mutation attempts and failures, by operation and app version;
- duplicate creations detected;
- median save latency;
- number and age of open P0/P1 core defects;
- latest successful authenticated and tenant-isolation evidence;
- export completion and deletion cleanup outcome.

Do not attach amount, note, account name or raw error body.

### Exit gate

- No open P0/P1 blocks authentication, record, correct, read or export.
- Cumulative money boundaries and transfers have counterexample tests.
- Authenticated smoke is repeatable with cleanup.
- RLS and deletion evidence is current.
- One physical-phone smoke covers the primary expense path.

### Do not do

- add new planning algorithms;
- add bank sync, OCR, AI advice or family permissions;
- infer authenticated safety from demo Playwright;
- improve a lab score while a core defect remains.

## 10. Stage 2 - Daily capture and onboarding

### User problem

“Tôi có thể bắt đầu nhanh và ghi một khoản chi khi đang đứng ngoài quầy mà
không phải học một hệ thống tài chính không?”

### Product hypothesis

Amount-first manual capture, useful Vietnamese defaults and remembered recent
choices can make a manual-first ledger sustainable for the initial audience.
Repository research supports the hypothesis, but primary Vietnamese user
evidence is still missing.

### Discovery before implementation

1. Recruit 8-12 participants across:
   new worker/student, spreadsheet user and former expense-app user.
2. Ask about the last real money-tracking event, not desired features.
3. Observe the existing first-use flow with synthetic amounts.
4. Record:
   time to first account;
   time to first expense;
   hesitation points;
   fields misunderstood;
   what they expect after Save;
   why they would or would not return tomorrow.
5. Separate problems caused by prototype quality from lack of user need.

This is a learning sample, not a statistically representative market survey.
Do not publish private financial data or recruit/contact people without the
owner's explicit authorization.

### Work in order

#### 1. First value

- Registration explains manual-first, no bank password and data export.
- Onboarding creates or confirms one real account.
- Category defaults are short, Vietnamese and editable.
- The next action is one expense or income, not configuration of every module.
- Dashboard immediately shows how the recorded transaction changed observed
  balance and period totals.

#### 2. Quick entry

- Expense, income and transfer semantics are explicit.
- Amount receives focus; phone receives the correct numeric keyboard.
- Account and category use recent suggestions without silently committing.
- Date defaults to the Vietnam calendar day and remains editable.
- Note is optional.
- Save-and-add-another is available only if observed use justifies it.
- Double tap or slow network cannot create a second transaction.

#### 3. Returning daily loop

- Primary action remains visible from core routes.
- Recent transaction is easy to confirm and edit.
- Filters or navigation preserve the user's context.
- Empty dashboard has one primary action.
- Demo mode is unmistakable and cannot be confused with persisted data.

### Required product states

- brand-new user;
- user with account but no transaction;
- one expense, one income and one transfer;
- archived recent account/category;
- large VND and long Vietnamese text;
- offline/stale or failed save;
- dark mode, 320/390px phone, desktop and 200% text.

### Instrumentation slice

Extend the privacy-safe event contract only after an event dictionary review:

- onboarding started/completed and completion path;
- quick-entry opened, submitted, succeeded or failed;
- transaction kind as enum;
- elapsed milliseconds in bounded form;
- whether a recent suggestion was used;
- dashboard reviewed after first save.

The current analytics sink is a no-op. Wiring a provider is a separate
security/privacy decision and must not send raw finance content.

### Initial decision thresholds

Baseline first. Then set improvement targets in the work packet. The stage
cannot exit without:

- no observed task failure in a moderated five-person usability check of the
  final slice;
- no P0/P1 accessibility or responsive finding in the primary flow;
- a measured median record time from at least five real or moderated entries;
- qualitative evidence that users understand what changed after Save.

Five usability sessions expose task-level problems; they do not prove market
demand or retention.

### Exit gate

- A new user can reach first recorded value without entering advanced capture
  or planning.
- A returning user can record, verify and correct on a physical phone.
- Baseline funnel and task timing exist.
- The next iteration is based on observed friction rather than aesthetic taste.

## 11. Stage 3 - Find, correct and understand

### User problem

“Tôi tìm lại được một khoản, sửa được lỗi và hiểu tháng này tiền vào/ra ở đâu
mà không bị biểu đồ đánh lạc hướng không?”

### Existing baseline

Dashboard, transaction feed, category totals, reports and export exist. Transfer
exclusion has unit and browser contracts. Route/state coverage and user
comprehension still need broader evidence.

### Work in order

#### 1. Transaction workspace

- Search by safe user-visible fields.
- Filter by period, account, kind and category.
- Show income, expense and net for the active filter.
- Keep filter state when opening and returning from detail.
- Desktop uses a scannable table/workspace; phone uses a readable grouped list.
- Edit and delete remain recoverable.

#### 2. Dashboard answers

The default dashboard answers only observed questions:

1. What is the total active-account balance?
2. What income and expense occurred in the selected period?
3. What is net cash flow?
4. Which categories account for the most expense?
5. What happened most recently?

Do not reinterpret balance as a spending plan. Use text and exact values; charts
are secondary and drill into the filtered ledger.

#### 3. Reports

- Weekly, monthly and yearly periods state their exact range.
- Transfer is excluded consistently.
- Category totals can open their source transactions.
- Empty and partial periods explain what data is missing.
- Export uses the same filter semantics or clearly states when it does not.
- A table/text equivalent accompanies every chart.

#### 4. Recovery and explanations

- Explain why a total changed.
- Distinguish account initial balance from ledger activity.
- Distinguish archived items from deleted transactions.
- Provide a recovery action for stale/error states where safe.
- Do not use guilt, streaks or alarm copy.

### Research tasks

Run task-based sessions:

- “Tháng trước bạn chi nhiều nhất vào đâu?”
- “Tìm và sửa khoản cà phê ghi sai hôm qua.”
- “Chuyển 500.000 đồng giữa hai ví ảnh hưởng báo cáo thế nào?”
- “Xuất dữ liệu tháng này để mở trong bảng tính.”

Record answer correctness, route taken, time, hesitation and confidence.

### Metrics

- search/filter success and no-result rate;
- transaction edit/undo completion;
- report drill-down use;
- export success;
- comprehension answer accuracy in moderated tasks;
- route errors by stable route identifier.

### Exit gate

- Users answer the five observed-money questions correctly.
- Every displayed aggregate can be traced to a filtered transaction set.
- Search, correction and export work across required viewports.
- No transfer, split, deleted row or period-boundary regression is known.

## 12. Stage 4 - Provenance, import and reconciliation

### User problem

“Nếu tôi nhập từ sao kê hoặc đã quên ghi một khoản, MoneyFlow cho tôi biết dữ
liệu đến từ đâu, tránh trùng và giúp số dư khớp lại như thế nào?”

### Why this follows the daily loop

Official Actual and YNAB workflows treat import, duplicate matching and
reconciliation as connected but distinct operations. Imported IDs are stronger
than fuzzy matching; original descriptions remain useful; a statement balance
must be compared with cleared ledger entries. MoneyFlow already has import
features, but current local fingerprints and candidate records do not yet prove
complete lineage.

### Work in order

Each subsection is a separate specification and delivery packet.

#### 1. Import provenance

Persist:

- source type, batch ID and source row;
- original description retained under a privacy contract;
- external transaction ID when present;
- versioned fallback fingerprint;
- parser and mapping versions;
- duplicate/match reason and confidence;
- candidate-to-ledger transaction link;
- actor and timestamps without copying sensitive note content.

Use a partial uniqueness rule for real source IDs. A fuzzy fingerprint is
evidence for review, not universal identity.

#### 2. Server-side dry run

Before committing, report:

- would create;
- would update or match;
- duplicate;
- suspected transfer;
- invalid/requires review.

The preview and commit must share validation and versioned rules. A changed
source or rule version invalidates an old preview.

#### 3. Review-by-exception

- Show the source and why a row needs attention.
- Preserve the user's correction.
- Bulk actions apply only to an explicit selection.
- Low-confidence rows never auto-post.
- Cancellation and re-import behavior are documented.
- Deleted imported transactions do not silently reappear.

#### 4. Account reconciliation

Specify before schema work:

- pending/uncleared, cleared and reconciled semantics;
- statement date and statement balance;
- cleared ledger balance and difference;
- how cash accounts differ from bank/e-wallet accounts;
- how an adjustment is represented as a visible ledger transaction;
- warning and reopen behavior after editing a reconciled transaction.

Do not copy YNAB's irreversible lock or Actual's exact model without testing it
with MoneyFlow users. Preserve recoverability and explain every adjustment.

#### 5. Deterministic rules

Only after provenance:

- authenticated, user-owned and RLS protected;
- explicit priority, enabled state and version;
- conditions may inspect immutable original fields;
- actions write normalized presentation fields;
- preview before apply;
- no low-confidence autonomous posting.

### Required counterexamples

- same amount/date but different real transactions;
- same external ID imported twice;
- manual transaction later matched to imported row;
- deleted import reappears;
- pending amount changes on clearing;
- two sides of a transfer imported separately;
- edited reconciled transaction creates a difference;
- partial batch failure;
- cross-user source ID collision;
- parser version changes between preview and commit.

### Metrics

- rows by dry-run outcome;
- critical-field correction rate;
- duplicate caught before commit and duplicate escaped after commit;
- median review time per row and per batch;
- reconciliation completion and unresolved difference;
- ledger freshness since last transaction and reconciliation;
- support incidents involving imports.

### Exit gate

- A real redacted statement can be previewed, reviewed, committed and traced.
- Re-import does not silently duplicate or resurrect rejected/deleted data.
- A user can reconcile one account to an external balance and understand any
  adjustment.
- Tenant isolation, deletion and sensitive-log tests cover new data.

### Do not do

- bank credential collection or screen scraping;
- opaque AI parsing as the default;
- OCR expansion before file import is trustworthy;
- rules before provenance;
- direct balance edits that bypass the ledger.

## 13. Stage 5 - User-approved planning

### User problem

“Tôi muốn theo dõi giới hạn và nghĩa vụ do chính tôi đặt ra, nhưng ứng dụng
không được giả vờ biết tôi nên tiêu bao nhiêu.”

### Existing baseline

Category budgets, commitments, recurring income and goals exist. They are
planning records, not proof of a complete spending plan. Some old copy and tests
may still imply that goal allocation changes “money available”; audit this
language against current product law before expanding planning.

### Work in order

#### 1. Validate each existing tool independently

- Budget: limit, spent and remaining for one category and period.
- Commitment: expected obligation, due state and posting a real transaction.
- Recurring income: expected versus received, without inventing future cash.
- Goal: user-entered target and allocation semantics that do not change total
  assets.

For each tool, test whether target users understand it and revisit it.

#### 2. Planning data quality

- State which account, period and category a plan covers.
- Distinguish expected from recorded.
- Avoid double-reserving the same obligation.
- Make edits and cancellations recoverable.
- Preserve transfer exclusion.
- Explain missing inputs rather than deriving defaults from balance.

#### 3. Select at most one future planning mode

Only after research, choose one:

- **Monthly plan:** expected income plus complete flexible-spending coverage,
  commitments, reserves and rollover; or
- **Until-next-income plan:** confirmed income date/account, obligations before
  that date, protected accounts and minimum reserve.

Do not mix these modes. Write examples and adversarial counterexamples before
implementation. The valid decision may be to keep category budgets and never
restore a global recommendation.

### Discovery

Interview users after at least two weeks of real ledger use:

- what decision were they trying to make;
- which plan data did they actually maintain;
- what “ngân sách”, “dành tiền” and “cam kết” mean to them;
- how variable income, savings and multiple accounts change the decision;
- whether a simple category remaining value is sufficient.

### Metrics

- planning setup and subsequent review;
- percentage of recorded expense covered by an explicit user plan;
- expected-versus-recorded correction;
- plan edits after overspend or changed obligation;
- comprehension of balance versus allocation;
- feature abandonment and support questions.

### Exit gate

- Existing planning language passes comprehension review.
- Every planning value is traceable to user-entered inputs.
- No global recommendation is shown from partial data.
- A future planning mode is either validated with a full contract or explicitly
  deferred.

## 14. Stage 6 - Private beta and retention learning

### Objective

Prove that a defined Vietnamese audience receives repeated value from the
trusted manual-first ledger.

### Cohort design

Run two cohorts:

| Cohort | Size | Support | Purpose |
|---|---:|---|---|
| A - guided | 5-8 users | moderated onboarding and weekly interview | find comprehension and trust failures |
| B - less guided | 15-25 users | normal onboarding and documented support | observe activation, retention and support cost |

These ranges are learning bands, not market proof. The owner authorizes
recruitment and external contact.

### Beta protocol

1. Obtain explicit consent and explain that this is beta software.
2. Use synthetic data during onboarding; real data is the participant's choice.
3. Record device, prior method and target job without collecting account
   credentials or raw statements in research notes.
4. Observe first value.
5. Check in after days 2-3, week 1, week 2 and week 4.
6. Track defects and misunderstandings separately from feature requests.
7. Offer export and deletion at any time.
8. End with a structured continue/pivot/stop review.

### Questions to answer

- Which audience activates without concierge help?
- Does manual entry remain tolerable after the novelty period?
- What event causes a user to return?
- Which balance/report do they trust or distrust?
- Does reconciliation restore trust after a mismatch?
- Which existing modules are ignored?
- Is import a necessary accelerator or a power-user tool?
- What would they replace if MoneyFlow disappeared?

### Beta scorecard

- participants invited, registered and activated;
- time to first value;
- W1 and W4 retained users by cohort;
- weekly ledger freshness;
- P0/P1 defects and recovery time;
- successful export/delete requests;
- support contacts per active user;
- top three observed jobs and failure modes;
- qualitative “would be disappointed” and replacement answer;
- infrastructure cost per active user.

Do not declare product-market fit from a small invited cohort.

### Continue gate

Continue toward commercialization only when:

- no unresolved P0/P1 threatens money, access, ownership or privacy;
- multiple users outside the owner complete the loop for four weeks;
- at least one audience segment shows a repeatable reason to return;
- support can resolve normal mistakes without database intervention;
- the next product investment is supported by both behavior and interviews.

Otherwise:

- **repeat** when UX or reliability prevented a fair test;
- **narrow** when one segment succeeds and others do not;
- **pivot** when a different job repeatedly dominates;
- **stop** when no segment repeats use and there is no credible new hypothesis.

## 15. Stage 7 - Commercial and compliance readiness

### Objective

Test whether MoneyFlow can charge for value without weakening trust, ownership
or privacy.

### Legal and privacy gate

Vietnam's Law on Personal Data Protection 91/2025/QH15 is effective from
2026-01-01. Before commercial public release:

- obtain qualified legal review for the actual data flows and hosting regions;
- inventory personal and financial data, purpose, location, processor and
  retention;
- document access, correction, export and deletion;
- review cross-border processing and incident obligations;
- minimize raw import retention;
- define breach response roles and notification procedure;
- verify vendor agreements and provider settings;
- avoid claims of absolute security.

This plan is an engineering/product checklist, not legal advice.

### Pricing discovery

1. Identify the repeatedly valued job from Stage 6.
2. Interview behavior before asking an abstract willingness-to-pay question.
3. Test two or three packaging hypotheses with exact included/excluded value.
4. Preserve a usable ownership path; do not place export or deletion behind a
   paywall.
5. Prefer a manually administered paid pilot before building billing.
6. Add payments only after the owner approves provider, tax/legal and refund
   requirements.

Possible value dimensions to test, not pre-approved pricing:

- number of active accounts;
- advanced import/reconciliation volume;
- longer history or enhanced reports;
- deterministic automation rules;
- support/service level.

Core ledger correctness, privacy, export and account deletion are not premium
quality tiers.

### Operational readiness

- documented support and incident channels;
- severity definitions and feature-freeze policy;
- uptime/error and database-capacity monitoring;
- backup and restore rehearsal;
- dependency and security update process;
- release notes and rollback plan;
- data-retention jobs with failure alerts;
- provider cost and quota dashboard;
- authenticated production smoke after deployment.

### Exit gate

- legal review covers the deployed data flow;
- privacy copy matches actual behavior;
- incident, backup, restore and deletion drills have evidence;
- a pricing experiment tests real behavior;
- payment implementation, if any, has a separate approved specification;
- the owner explicitly accepts commercial launch risk.

## 16. Stage 8 - Public beta and controlled scale

### Objective

Open access gradually while protecting the trusted ledger and preserving a
short learning loop.

### Rollout sequence

1. Invite-only expansion with rate and support limits.
2. Public waitlist or capped registration.
3. Broader public beta after reliability and support remain within the agreed
   budget.
4. Only then test acquisition channels.

### Release gates

Every release must state:

- affected user job and cohort;
- schema/data migration and rollback implications;
- money, tenant, export and deletion tests;
- browser/accessibility evidence for changed surfaces;
- production smoke and monitoring window;
- known limitations and support response;
- owner approval for merge/deploy.

### Growth rules

- Do not buy growth while W4 retention is unexplained.
- Do not broaden to family, business accounting or native mobile to compensate
  for weak individual-ledger retention.
- Do not add bank sync without a new partner, security, legal, support and
  reconciliation specification.
- Do not add financial advice without a regulated-risk review and an
  evidence-backed planning contract.
- Expand one segment or job at a time.

### Continuous product cycle

For each cycle:

1. observe a problem;
2. triangulate behavior, interviews and support;
3. research primary sources;
4. specify the smallest outcome;
5. implement one vertical slice;
6. evaluate independently;
7. release gradually;
8. measure and decide continue/repeat/remove.

## 17. Cross-stage workstreams

| Workstream | Stage 0-1 | Stage 2-3 | Stage 4-5 | Stage 6-8 |
|---|---|---|---|---|
| Product discovery | reconcile assumptions | first-use and comprehension studies | import/planning studies | cohort and pricing studies |
| Ledger/domain | boundaries and contracts | preserve invariants | provenance/reconciliation/plan semantics | scale and migration safety |
| UX/accessibility | P1 dialogs and route audit | onboarding/daily loop | review and planning workflows | public support and broad devices |
| Security/privacy | RLS/auth/export/delete | analytics event contract | sensitive import/audit model | legal, incident and vendor operation |
| Data/analytics | define dictionary and baseline | activation/daily-loop events | trust/planning events | retention, cost and business metrics |
| Reliability | authenticated smoke | core browser gates | import/reconcile failure recovery | monitoring, backup and incident drills |
| Commercial | none | learn value language | identify premium candidates | pricing, payments and controlled growth |

## 18. Feature admission test

A new feature enters implementation only when all answers are reviewable:

1. Which stage outcome does it advance?
2. What observed user problem supports it?
3. Which current behavior and primary sources were inspected?
4. What remains an assumption?
5. Why is an existing feature or workflow insufficient?
6. What is the smallest end-to-end slice?
7. What data and financial invariants change?
8. Which loading, empty, error, recovery and uncertain states exist?
9. What privacy, tenant and deletion implications exist?
10. What metric changes if the slice works?
11. What result causes iteration, rollback or removal?
12. What is explicitly out of scope?

An idea that cannot answer these remains research or a GitHub issue. It does
not become agent-authorized implementation.

## 19. Claude Code execution contract

When converting this plan into work:

1. Reconcile live GitHub and the current checkout.
2. Name the current product stage and unmet exit requirement.
3. Apply `docs/engineering/DEVELOPMENT_SEQUENCE.md`; a product outcome never
   bypasses an engineering safety gate.
4. Select exactly one bounded problem and one ownership area.
5. Create or update one active packet.
6. Separate discovery, specification, implementation and evaluation.
7. Write counterexamples and acceptance criteria before runtime changes.
8. Implement the smallest coherent vertical slice on a focused branch or
   isolated worktree.
9. Use an independent evaluator after implementation.
10. Report requirement-by-requirement evidence and distinguish implemented,
    verified, deployed and accepted.

Claude must not:

- treat effort bands as deadlines;
- contact research participants or external parties without approval;
- create issues, change priority, merge or deploy without approval;
- invent conversion or retention evidence;
- use historical strategy as current product authorization;
- run parallel editors in the same ownership area;
- declare a stage complete from tests that cover only one layer.

## 20. Practical evidence matrix

| Claim | Minimum evidence |
|---|---|
| “Core logic is correct” | unit counterexamples plus relevant database tests |
| “Tenant data is safe” | fresh RLS/privilege and two-user isolation evidence |
| “The flow works” | browser run at affected viewport and runtime mode |
| “It works in production” | exact deployed commit and production flow smoke |
| “Users understand it” | moderated task and comprehension evidence |
| “Users need it” | observed past behavior plus repeated use, not feature voting |
| “Retention improved” | comparable cohorts and stable metric definition |
| “Ready to charge” | repeated value, pricing behavior and commercial/legal gate |
| “Stage complete” | every exit requirement audited with pass/fail/no evidence |

## 21. Research basis

Repository evidence:

- `docs/product/PRINCIPLES.md`
- `docs/MVP_DEFINITION.md`
- `docs/REAL_USE_READINESS_CONTRACT.md`
- `docs/design/CALM_LEDGER_V2.md`
- `docs/research/02_USER_AND_COMPETITORS.md`
- `docs/research/03_DOMAIN_RULES.md`
- `docs/research/05_PRODUCT_AND_ARCHITECTURE.md`
- `docs/research/06_GLOBAL_EXPENSE_WEB_UX_BENCHMARK.md`
- `docs/research/08_SAFE_TO_SPEND_WITHDRAWAL.md`
- GitHub issues #40, #53, #72, #145 and #156

Primary/official sources rechecked 2026-07-30:

- Actual Budget file import, duplicate matching and original imported data:
  https://actualbudget.org/docs/transactions/importing/
- Actual Budget import API, dry-run and imported IDs:
  https://actualbudget.org/docs/api/reference/
- Actual Budget reconciliation:
  https://actualbudget.org/docs/accounts/reconciliation/
- Actual Budget deterministic rules:
  https://actualbudget.org/docs/budgeting/rules/
- YNAB file import and matching:
  https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo
- YNAB reconciliation and cleared/uncleared/reconciled states:
  https://support.ynab.com/en_us/reconciling-accounts-a-guide-BJFE3fHys
- YNAB data export:
  https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9
- Supabase Row Level Security:
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase password security:
  https://supabase.com/docs/guides/auth/password-security
- Supabase Auth audit logs:
  https://supabase.com/docs/guides/auth/audit-logs
- WCAG 2.2 target size:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2 focus appearance:
  https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Vietnam Law on Personal Data Protection 91/2025/QH15:
  https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=

Commercial details, provider plans, laws and competitor behavior can change.
Recheck primary sources when a related initiative is selected.
