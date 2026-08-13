# Phase B — Fresh Product-Experience Research

**Status:** accepted/completed research record — no product, IA, brand, token or UI decision
**Research baseline:** `main@efaba75ddb55d9835c0a21bc6d578a7344db74f0` (`#365` merged)
**Research date:** 2026-08-13
**Method:** current first-party product/help material, read against the executable-current map in the completed Phase A audit. “Fact” means what the cited source says or demonstrates; “interpretation” is Phase B’s bounded inference. Product documentation is not evidence of MoneyFlow runtime behaviour or of user outcomes.

# Executive synthesis

The strongest reusable idea across current personal-finance products is not a visual
style: it is a **short, reversible ledger loop**. Capture or import enters a recognisable
record; the user can inspect/correct it in context; the product then offers explanation
or planning only when the user asks for it. Copilot’s review queue, YNAB’s explicit
transaction types and approval path, Monarch’s undoable hiding and rule preview, and
Wallet’s dependency-aware account deletion each put a different guardrail around that
loop. [Sources C1, Y1, M1, M3, W3]

For MoneyFlow, the durable learning is constrained by Phase A rather than by competitor
feature lists. The current product is a Vietnamese, manual-first, integer-VND ledger
with explicit demo/auth modes, transfer-neutral financial semantics, existing
planning/reporting/advanced-capture surfaces, recoverable destructive actions and a
shell/primitive ownership model. Therefore bank-sync onboarding, shared household
planning, investment/net-worth identity, AI financial advice and YNAB’s full-envelope
planning model are **counterexamples**, not a backlog. [Phase A §§2–7; Sources C1,
Y1, Y2, W1, MI1]

Phase B does not choose an information architecture, screen, dashboard layout, brand
direction, palette, typography or component treatment. It records product mechanisms
that Phase C may test against current constraints. A mechanism is reusable only when
its data meaning, recovery path, mode boundary and named code owner can be preserved.

# User-problem research matrix

| User problem | Observed mechanism (fact) | Phase B interpretation | MoneyFlow filter / do not copy | Confidence |
|---|---|---|---|---|
| 1. Fast manual capture | YNAB’s add flow makes transaction type explicit before optional payee/category/date/flag/memo fields; Wallet offers saved transaction templates; MISA and Money Lover publicly position manual recording. [Y1, W2, MI1, ML1] | Lead with the irreversible financial classification and defer enrichments that can be edited later. | Preserve MoneyFlow’s manual-first and integer-VND parsing; do not make linked-bank data or templates required. | High / medium / low |
| 2. Current balances / position | YNAB supports an unlinked account with a user-entered current balance; Copilot exposes account detail and aggregate financial position. [Y7, C3] | A balance is more trustworthy when its account scope and provenance are visible. | Do not introduce wealth/net-worth identity or sync claims; keep manual account semantics. | High / high |
| 3. Where money went | YNAB’s Spending Breakdown ranks categories, filters by account/date and permits moving into transaction detail; Copilot’s web summary filters spend, income and net. [Y3, C2] | Summary should answer a narrow question and retain a path to its ledger evidence. | Do not copy a dashboard layout or visualisation; reports are already a MoneyFlow capability. | High |
| 4. Review/correct history | Copilot’s review queue keeps new activity editable before saving; YNAB supports editing/deleting a mistaken manual transaction; Monarch hides while retaining the record and offers undo. [C1, Y1, M1] | Review should be a bounded state/action, not a second hidden ledger; corrections should keep recovery/audit context. | Do not use irreversible silent cleanup; preserve recoverable destructive semantics. | High / high / medium |
| 5. Transfers between owned accounts | YNAB writes a transfer into both account registers and omits a category for same-type owned-account transfers; Monarch excludes transfers from budget/cash-flow calculations. [Y2, MO1] | The interaction must make both sides and non-spending treatment understandable. | Preserve MoneyFlow’s transfer-neutral invariant; do not inherit YNAB’s account-type/debt complexity. | High / medium |
| 6. Planning without overwhelm | Monarch says budgeting is optional and offers category or Flex budgeting; Copilot permits budgets to be disabled. [MO1, C1] | Planning can be discoverable and opt-in rather than the prerequisite for recording money. | Do not import full-envelope budgeting or “free-to-spend” claims as product identity. | Medium / high |
| 7. Reports/trends/explanation | YNAB’s Reflect has Spending Breakdown, trends, net worth and income-v-expense with selected filters; exports retain the selected scope. [Y3, Y4] | Explain numbers through explicit scope and a drill-down/export path, not a decorative aggregate. | Keep VND/ledger semantics; do not turn reports into investment or household insights. | High |
| 8. Advanced import/rules without identity takeover | Monarch rules show a preview before applying actions; Linear isolates incoming work in Triage before accepting it into the normal workflow. [M3, L1] | Automation/import belongs behind an inspectable review boundary and should not displace everyday capture. | MoneyFlow already owns import/inbox/rules; do not add AI classification or make the advanced queue the home surface. | Medium / high |
| 9. Data ownership/export/backup/recovery | YNAB exports selected Reflection data in CSV/TSV; MISA advertises Excel/PDF export; MoneyFlow Phase A distinguishes scoped report export from the full versioned backup route. [Y4, MI1; Phase A §12] | Label export scope precisely and keep a complete backup/recovery path distinct from a report download. | Do not imply that a chart/export is a restorable archive. | High / medium / high |
| 10. Mobile/constrained workflows | YNAB documents the same add/transfer/approval steps on mobile and web, with a bottom transaction action on mobile; Wise locates transfer status inside the specific activity item. [Y1, Y2, Y5, WI1] | A constrained surface should expose one primary action and make status/detail reachable from the relevant record. | No copied bottom-nav or screen design; retain AppShell, safe-area and PP-12 one-scroll-owner constraints. | High |
| 11. Trust, destructive actions and recovery | Wallet blocks account deletion until dependent items are altered; Monarch’s hide keeps a record visible in the full list and can be reversed; Linear archive remains searchable/restorable. [W3, M1, L2] | Prevent destructive action when dependencies would make meaning ambiguous, and offer reversible state where possible. | Preserve MoneyFlow soft-delete/recovery/auth boundaries; do not treat hiding as financial deletion. | High / medium / high |
| 12. Progressive disclosure | Copilot’s core review/summary precedes categories/recurrings/goals; Linear’s Triage is outside normal workflow until accepted; YNAB places optional advanced fields after transaction type. [C1, L1, Y1] | Keep the core loop comprehensible while keeping advanced operations reachable through named, scoped entry points. | Do not suppress necessary financial choices or bury recovery; no final nav decision is made here. | High |

## Evidence-reading limit

The matrix records interaction mechanisms, not comparative rankings. Marketing pages
support only the narrowly stated capability; help documentation supports described
flows. No screenshots were used as proof of spacing, visual hierarchy, accessibility or
customer preference. Where a source is older than 2026, the ledger marks freshness and
the finding is intentionally lower confidence.

# PFM findings

## Capture, classification and corrections

### PFM pattern P1 — make the financial type explicit, then defer optional detail

- **Problem:** a manual entry must be quick without allowing an ambiguous financial
  event into the ledger.
- **Fact from source:** YNAB’s current add-transaction guide asks for an explicit type
  (spending, inflow, credit-card payment or transfer). Spending/inflow then allow
  payee, category, account, flag, clearing and schedule detail; transfer/payment have
  different required semantics. It also states that a mistaken entry may be edited or
  deleted. [Y1]
- **Fact from source:** Wallet’s current support describes reusable transaction
  templates for manual accounts. [W2]
- **Phase B interpretation:** classifying the money movement before optional metadata
  keeps a fast path while protecting the ledger’s meaning; reusing a template can
  remove repetition only after the user has already established a trustworthy pattern.
- **Tradeoff/failure mode:** an upfront type choice can be confusing where the domain
  has too many account/debt types; a template can reproduce a stale amount/category.
- **Applicability:** candidate constraint for a later MoneyFlow capture evaluation:
  preserve existing explicit income/expense/transfer semantics, then evaluate which
  metadata can remain optional or defaulted without hiding VND meaning.
- **Do not copy:** YNAB’s linked-account-first prompts, credit/debt model or its
  envelope-planning language; Wallet’s bank-sync positioning.
- **Confidence:** high for YNAB’s documented mechanics; medium for Wallet template
  details because only the support description, not a live runtime, was observed.

### PFM pattern P2 — a review state is useful only when it ends in a deliberate action

- **Problem:** new or imported history needs correction without making the main ledger
  look permanently untrusted.
- **Fact from source:** Copilot’s current dashboard guide places a “To Review” list on
  the dashboard and says entries can be opened, edited and saved. Its transaction
  documentation covers search/filter, editing, splitting, recurring treatment and
  manual additions. [C1, C4]
- **Fact from source:** YNAB’s approval guide exposes a count of new transactions and
  makes categorise-then-approve the explicit path; approval of one transfer is applied
  to its other account register. [Y5]
- **Phase B interpretation:** a review queue earns its space when it communicates what
  needs attention, allows correction at the record, and has a visible completion action.
- **Tradeoff/failure mode:** a queue becomes a shame pile if incoming records are
  unreliable or if “reviewed” does not have a defined consequence.
- **Applicability:** MoneyFlow already has advanced Inbox capability; Phase C may ask
  whether its current review states make the next corrective action and completion
  condition legible, without making Inbox the primary ledger identity.
- **Do not copy:** bank-import dependence, bulk actions without MoneyFlow’s current
  ownership/invariant checks, or a second ledger state that bypasses transaction
  history.
- **Confidence:** high for documented mechanics; no claim is made about completion
  rate or user satisfaction.

### PFM pattern P3 — recoverability can be a first-class state, not merely an undo toast

- **Problem:** users need to reduce noise or reverse a mistake without losing trust in
  the historical record.
- **Fact from source:** Monarch’s help says hiding excludes a transaction from
  calculations while retaining it in the full list with an eye indicator; the action
  can be undone. [M1]
- **Fact from source:** Wallet says account deletion is blocked where dependent records
  remain and directs the user to alter those dependents first. [W3]
- **Phase B interpretation:** hiding/recovery and dependency prevention are different
  safeguards: the former changes presentation/calculation scope reversibly, the latter
  prevents an ambiguous destructive mutation.
- **Tradeoff/failure mode:** hiding can make totals surprising unless scope is exposed;
  dependency blocks can feel obstructive without a clear next step.
- **Applicability:** MoneyFlow already treats destructive actions as recoverable and
  has account/data ownership semantics. Later work may evaluate clarity of the existing
  recovery path, never replace it with silent removal.
- **Do not copy:** Monarch’s calculation-specific hide semantics without checking
  MoneyFlow report/backup invariants; Wallet’s exact copy or bank-account assumptions.
- **Confidence:** medium: Monarch pages were updated in 2024/2025; Wallet documentation
  was updated in 2026. These are mechanism examples, not a current product audit.

## Accounts, transfers and financial position

### PFM pattern P4 — show position with the account scope that produces it

- **Problem:** a user needs to know their current position without mistaking a partial
  view for a complete financial picture.
- **Fact from source:** YNAB’s 2026 account guide allows an unlinked account and asks
  the user to enter today’s current balance; linking is an alternative rather than the
  only path. [Y7]
- **Fact from source:** Copilot’s Accounts documentation describes an account list and
  account detail alongside an aggregate financial-position view. [C3]
- **Phase B interpretation:** a reliable position experience makes the contributing
  account scope and source legible; this can support a manual ledger without claiming
  bank freshness.
- **Tradeoff/failure mode:** an aggregate encourages false certainty if manually
  entered balances are stale or if excluded accounts are not obvious.
- **Applicability:** preserve MoneyFlow’s manual account model; Phase C may examine
  how current account detail, balance date/provenance and aggregate/report scope are
  explained.
- **Do not copy:** synced net-worth/wealth as the product’s central promise.
- **Confidence:** high for the unlinked-account and Copilot account mechanics.

### PFM pattern P5 — transfers should visibly retain both sides and not masquerade as spend

- **Problem:** moving money between owned accounts is easy to misread as income or
  spending.
- **Fact from source:** YNAB’s July 2026 transfer guide records a transfer in both
  account registers and says a category is not needed for same-type account transfers;
  its approval behaviour applies to both sides. [Y2, Y5]
- **Fact from source:** Monarch’s budget documentation says transfers are excluded from
  budget and cash-flow calculations. [MO1]
- **Phase B interpretation:** paired representation plus explicit non-spending
  treatment prevents a user from inferring a false gain/loss.
- **Tradeoff/failure mode:** YNAB introduces account-type and debt exceptions that add
  cognitive load; automatic matching can still need user correction.
- **Applicability:** this corroborates — but does not redefine — MoneyFlow’s existing
  transfer-neutral invariant. Any future presentation must expose the current invariant
  without adding account/credit/debt products.
- **Do not copy:** envelope/debt-account special cases, bank-import matching identity
  or a category rule that conflicts with current MoneyFlow semantics.
- **Confidence:** high for YNAB; medium for Monarch because the official page was last
  updated in 2025.

## Planning, explanation and ownership

### PFM pattern P6 — planning is optional context, not an entry fee to a correct ledger

- **Problem:** people need planning help at different levels of readiness.
- **Fact from source:** Monarch documents both category budgeting and Flex budgeting,
  and says a user can use Monarch without a budget. Copilot’s quick-start guide lets a
  user adjust or disable a budget. [MO1, C1]
- **Phase B interpretation:** permitting a ledger to remain useful before a plan is
  configured makes planning a deliberate next layer rather than a forced onboarding
  funnel.
- **Tradeoff/failure mode:** optional planning can leave users without guidance; Flex
  or full-envelope abstractions can obscure simple categories for a manual-ledger user.
- **Applicability:** MoneyFlow already has budgets, commitments, income templates and
  goals. Later work should test discoverability/relevance of those capabilities, not
  introduce a new budgeting doctrine.
- **Do not copy:** YNAB’s full-envelope model, Copilot “free-to-spend” framing or a
  competitor’s calculation claim.
- **Confidence:** high for Copilot’s documented toggle; medium for Monarch’s 2025
  documentation.

### PFM pattern P7 — explain aggregates through scoped filters and ledger access

- **Problem:** a trend or category total must answer “why?” rather than be a terminal
  number.
- **Fact from source:** YNAB’s July 2026 Spending Breakdown ranks categories by
  spending percentage, filters by category/date/account, and links to viewing/editing
  transactions; its Reflect exports preserve selected scope. [Y3, Y4]
- **Fact from source:** Copilot Money for Web describes filtering total spend, income
  and net plus downloading all or filtered transaction subsets. [C2]
- **Phase B interpretation:** a useful report carries scope forward into inspection and
  export; detail is the explanation channel, not a separate analytical universe.
- **Tradeoff/failure mode:** dense filter vocabulary or percentage-only displays can
  hide absolute VND meaning; a download may be mistaken for a complete backup.
- **Applicability:** money/report semantics and the full backup boundary are already
  named MoneyFlow constraints. Phase C may evaluate evidence paths from current report
  totals to transaction records and clearly labelled exports.
- **Do not copy:** visual charts, account/net-worth framing, or exports labelled as
  restorable archives when they are not.
- **Confidence:** high for the two documented web flows.

## Advanced operations and explicit data ownership

### PFM pattern P8 — preview automation before it changes many records

- **Problem:** imports/rules can save time but can also silently spread a bad rule.
- **Fact from source:** Monarch’s rule documentation describes criteria and actions,
  previewing the changes, optionally applying a rule to existing transactions, and
  ordered rules. [M3]
- **Fact from source:** Monarch’s manual import guide warns that imports cannot be
  undone and recommends a small CSV test. [M2]
- **Phase B interpretation:** a preview makes bulk change inspectable; a one-way import
  warning makes the risk legible, but is weaker than a true recovery path.
- **Tradeoff/failure mode:** previews may be expensive/slow and can give a false sense
  of safety if they omit downstream effects; irreversible import remains hazardous.
- **Applicability:** MoneyFlow’s existing imports/rules/inbox need named review and
  recovery semantics; Phase C should not promote them into the default first-use loop.
- **Do not copy:** an irreversible CSV path, silent automation, or a bank-sync-first
  intake model.
- **Confidence:** medium: official Monarch sources updated in 2025.

### PFM pattern P9 — distinguish a scoped export from a complete recovery artifact

- **Problem:** users need portability without a misleading promise of restore.
- **Fact from source:** YNAB’s Reflect export offers CSV/TSV for selected reports and
  selected scope. MISA Sổ Thu Chi’s official site advertises Excel/PDF report export.
  [Y4, MI1]
- **Current MoneyFlow fact:** Phase A records that transaction/Inbox CSV/JSON export
  is user-readable scoped export, while `/settings/backup` is a separate complete
  versioned archive capability. [Phase A §12]
- **Phase B interpretation:** copy only the clear scope boundary: a report download is
  valuable on its own, but must not imply complete/restorable state.
- **Tradeoff/failure mode:** a very prominent export can make users think they have a
  safe backup; a complete archive can be too technical if its purpose is not explained.
- **Applicability:** preserve existing backup/restore boundaries and security/privacy
  rules; phase research does not change export format or retention.
- **Do not copy:** MISA/Money Lover marketing claims as proof of archival fidelity, or
  a “share net worth” feature that has different privacy assumptions.
- **Confidence:** high for YNAB report-export mechanics; medium for MISA marketing
  capability; high for MoneyFlow’s executable/Phase A boundary.

### PFM pattern P10 — Vietnamese manual-ledger positioning is context, not interaction proof

- **Problem:** research must remain relevant to an individual Vietnamese manual-first
  ledger rather than silently inheriting a US bank-sync product’s assumptions.
- **Fact from source:** MISA Sổ Thu Chi’s Vietnamese first-party product page presents
  recording income/expense, categorisation, reports and Excel/PDF export. Money Lover’s
  first-party product page presents manual recording, categories, reports, recurring
  entries and broader savings/debt/asset capabilities. [MI1, ML1]
- **Phase B interpretation:** the presence of Vietnamese/manual-ledger product
  positioning makes these useful scope comparators, but the marketing pages do not
  establish detailed interaction order, error recovery or product outcomes.
- **Tradeoff/failure mode:** treating a capability list as UX proof would invite copied
  features or generic claims; Money Lover’s savings/debt/assets and MISA’s broader
  surfaces can move the product away from MoneyFlow’s focused manual ledger.
- **Applicability:** retain only the scope check that Vietnamese manual recording,
  categorisation and report/export needs exist; use MoneyFlow code/tests rather than
  these pages to decide current capabilities or behaviour.
- **Do not copy:** voice entry, household/partner features, asset/debt/wealth identity,
  exact product vocabulary, visual treatment or marketing claims. MISA’s 2024 voice
  guide says the feature records only income/expense and requires user editing; that is
  a counterexample to automatic financial posting rather than a recommendation. [MI2]
- **Confidence:** medium for currently visible high-level MISA positioning; low for
  Money Lover’s detailed behaviour because the observed source is a marketing page;
  high for the explicit scope limitation.

# Adjacent-product findings

### Adjacent pattern A1 — triage keeps exceptions from taking over the normal workflow

- **Problem:** advanced/imported/exception work needs a place without defining the
  main product loop.
- **Fact from source:** Linear describes Triage as a special inbox for incoming issues;
  users can accept, merge as duplicate, decline or snooze. Triage is outside normal
  views by default until intentionally included. [L1]
- **Phase B interpretation:** a separately named exception queue protects the normal
  workflow from incoming complexity while preserving an explicit resolution action.
- **Tradeoff/failure mode:** a hidden/ignored queue can starve work; Linear’s team,
  assignment and integration assumptions do not transfer to an individual ledger.
- **Applicability:** a testable analogy for MoneyFlow’s existing Inbox/import/rules
  surfaces only: advanced operational work should have an explicit next action and
  completion/recovery state, without becoming default manual capture.
- **Do not copy:** Linear’s team workflow, automation/AI triage, keyboard vocabulary,
  sidebar/board presentation or enterprise permissions.
- **Confidence:** high for the current official docs; interpretation is limited to
  progressive disclosure and review boundaries.

### Adjacent pattern A2 — status belongs to the specific in-flight record

- **Problem:** users need to understand a delayed or unresolved money movement without
  guessing from a global balance.
- **Fact from source:** Wise directs a user from Home activity to the individual
  transfer’s tracker and explains status stages such as processing, received and sent,
  including a point where the recipient bank may still be processing. [WI1]
- **Phase B interpretation:** status is more intelligible when it is attached to the
  record, uses plain stage names, and distinguishes what the product knows from what a
  third party controls.
- **Tradeoff/failure mode:** a multi-stage tracker can imply precision it does not have;
  Wise’s bank/remittance lifecycle is not a local manual-ledger state model.
- **Applicability:** only as an explanation/recovery principle for existing MoneyFlow
  operational states (for example, an import/review action). It is not a proposal for
  transfer rails, live bank status or payment processing.
- **Do not copy:** Wise’s money-transfer flow, delivery estimates, account/legal model
  or any claim of real-time financial data.
- **Confidence:** high for Wise’s official documented tracker mechanism.

### Adjacent pattern A3 — reversible archival can preserve trust in a dense history

- **Problem:** a dense record needs retention without forcing every old item into the
  active view.
- **Fact from source:** Linear’s workflow documentation says auto-archive is automatic,
  archived issues remain searchable and restorable, and the creator is notified. [L2]
- **Phase B interpretation:** state reduction is safer when the retained record remains
  findable and reversible, rather than silently disappearing.
- **Tradeoff/failure mode:** automatic archive assumptions can hide important financial
  history; any ledger archive has stronger legal/financial semantics than an issue.
- **Applicability:** a recovery/audit lens only. MoneyFlow’s current soft-delete and
  backup rules remain the authority; a later phase must not borrow Linear’s automatic
  archival behaviour without a financial-invariant decision.
- **Do not copy:** automatic archival timing, task workflow statuses or notification
  semantics.
- **Confidence:** high for Linear’s docs; applicability is deliberately narrow.

# Cross-product recurring patterns

1. **A meaningful record comes before the summary.** YNAB requires a transaction type;
   Wise attaches operational status to a transfer record; reports then filter or drill
   into records. [Y1, WI1, Y3]
2. **Exception work is named and resolved, not blended into the default loop.** Copilot
   calls out review; YNAB makes approve an outcome; Linear uses Triage; Monarch previews
   rules. [C1, Y5, L1, M3]
3. **Financial movement has a scope.** Account selection, transfer pairing and report
   filters reveal what a number includes. [Y2, Y3, Y7]
4. **Reversal and prevention address different risks.** Monarch hide/undo, Wallet’s
   dependency block and Linear’s restoreable archive are not interchangeable. [M1, W3,
   L2]
5. **Planning and automation gain trust by being optional or inspectable.** Monarch and
   Copilot allow budgeting to be disabled; Monarch previews automation. [MO1, C1, M3]
6. **Portable output must name its scope.** YNAB exports selected reporting views while
   MoneyFlow separately owns a complete archive. [Y4; Phase A §12]

# Anti-patterns / patterns MoneyFlow should avoid

| Avoid / counterexample | Evidence and reason | MoneyFlow-specific rejection |
|---|---|---|
| Bank-sync-first identity | Copilot and several Wallet/YNAB flows foreground linking, import or bank data. [C1, W1, Y7] | MoneyFlow remains manual-first; no freshness/coverage claim may be inferred from a manually entered account. |
| Full-envelope, debt or “free-to-spend” framing | YNAB’s planning/account types and Copilot budgeting serve richer financial models. [Y2, Y6, C1] | Not a current product identity; planning is already capability-based and must not obscure the ledger. |
| Irreversible bulk import | Monarch warns that manual imports cannot be undone. [M2] | Incompatible with the program’s recoverable destructive and bounded advanced-operation posture. |
| AI/automation as default financial judgement | Linear’s Triage Intelligence is an opt-in/enterprise AI system; it is not financial evidence. [L3] | No AI financial advice or automatic unreviewed posting. |
| Household, investment or wealth identity | MISA/Money Lover advertise broader budgeting/asset features; YNAB/Copilot show net-worth/debt views. [MI1, ML1, Y4, C3] | Outside the Vietnamese individual manual-ledger scope unless separately authorised. |
| A summary with no provenance path | Trend/report interfaces can look explanatory while hiding account/date/category scope. [Y3, C2] | Later work must retain access to the current ledger evidence and VND scope. |
| Destructive-looking cleanup with no recovery meaning | Hide, archive and delete have materially different effects in the evidence above. [M1, W3, L2] | Preserve current soft-delete/recovery, backup and recent-auth boundaries; never relabel a presentation filter as deletion. |

# MoneyFlow-specific product-experience principles

These are Phase B evaluation principles, not approved design or implementation tasks.

1. **Manual capture must preserve financial meaning at the point of entry.** A later
   proposal must state how it retains current integer-VND parsing and explicit
   income/expense/transfer semantics, then identify which later-editable detail is
   intentionally deferred. [Y1; Phase A §§2, 7]
2. **Every financial aggregate needs an inspectable scope and a route to evidence.** A
   later proposal must identify its accounts, date/category/filter scope and ledger
   drill-down or explicitly state the limitation. [Y3, C2; Phase A §2]
3. **Transfer presentation must never change transfer-neutral accounting.** Show both
   sides/relevant account context where useful, but preserve the existing invariant and
   never classify owned-account movement as ordinary spend or income. [Y2, MO1; Phase A
   §7]
4. **Review, import and rules are bounded exception loops.** They need an obvious next
   action, result/recovery state and source owner; they do not replace the core manual
   ledger loop. [C1, Y5, L1, M3; Phase A §§2, 4]
5. **Planning is an optional layer on a useful ledger.** It should not be required to
   record, correct, understand or export money; no full-envelope doctrine is presumed.
   [MO1, C1; Phase A §2]
6. **A corrective or destructive interaction must declare whether it hides, changes,
   soft-deletes, permanently removes or archives data.** Its recovery and dependency
   behaviour must continue to respect current ownership/auth/archive constraints. [M1,
   W3, L2; Phase A §§7, 12]
7. **Mobile/constrained presentation has one relevant primary action and no trapped
   content.** Any dialog/sheet change must preserve the shared one-scroll-owner,
   safe-area and keyboard/focus regimes; a popover is in scope only if it shares that
   mechanism. [Y1, WI1; Phase A §§4, 7, 11]
8. **Demo and authenticated surfaces remain semantically distinct.** A proposed
   experience must state which mode it serves and must not make demo data/behaviour
   evidence of an authenticated user’s live financial position. [Phase A §§1–3]
9. **Reports, exports and backup are three different promises.** A later change must
   retain the Phase A scoped-export versus complete-versioned-backup distinction. [Y4;
   Phase A §12]
10. **Research-derived mechanisms need a named runtime owner before adoption.** AppShell
    owns navigation/mobile More; primitives own shared overlay semantics; routes and
    feature components own composition/domain interaction. Phase C must not turn a
    research idea into a competing owner. [Phase A §§2, 4–5, 11]

# Questions Phase C must resolve

These questions intentionally stop before any architecture, navigation, layout or
visual answer.

1. Which current manual-ledger job has the strongest evidence of user friction, and
   what specific core loop should be evaluated first: capture, correction, position or
   explanation?
2. For each proposed aggregate, what exact account/date/category scope and transaction
   evidence must a user be able to inspect?
3. Which existing Inbox/import/rule completion and recovery states are already clear in
   code/tests, and which need product-experience evidence before any change?
4. How should existing planning capabilities remain optional while still being
   discoverable to a user who has recorded enough data to benefit?
5. Which information belongs to demo, authenticated and public modes under the existing
   server/configuration boundary?
6. What evidence would justify a later change to navigation hierarchy without violating
   `nav-ia.ts`/AppShell ownership and Phase A route facts?
7. Which current report/export/backup labels need user-comprehension validation while
   retaining the existing recovery contract?
8. What representative viewport, keyboard, assistive-technology and first-paint
   evidence is required for a proposed constrained-surface change under A0/PP-12
   guardrails?
9. Which research mechanisms survive Vietnamese language, integer-VND and manual-entry
   constraints in a testable user scenario, rather than merely looking familiar from a
   competitor?

# Evidence/source ledger

All URLs below were checked on 2026-08-13. “Current” describes the published/update or
crawl date visible on the source, not independent verification of a product deployment.

| ID | Product / source | Freshness / authority | Supports only |
|---|---|---|---|
| C1 | [Copilot Quick Start Guide](https://help.copilot.money/en/articles/11157550-quick-start-guide) | First-party help; current 2026 crawl | Review queue; optional budgeting; categories/recurrings/goals orientation. |
| C2 | [Copilot Money for Web](https://help.copilot.money/en/articles/11780342-copilot-money-for-web) | First-party help; updated 2026-05-20 | Filtered totals, bulk selection and filtered download. |
| C3 | [Copilot Accounts Tab Overview](https://help.copilot.money/en/articles/6213732-accounts-tab-overview) | First-party help; current crawl | Account list/detail and aggregate-position framing. |
| C4 | [Copilot Transactions Tab Overview](https://help.copilot.money/en/articles/9554412-transactions-tab-overview) | First-party help; current crawl | Search/filter/edit/split/manual transaction capabilities. |
| Y1 | [YNAB: How to Add Transactions](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi?mobile-help=true) | First-party help; published July 2026 | Explicit transaction types, optional fields, edit/delete, mobile/web entry. |
| Y2 | [YNAB: Transfer Transactions](https://support.ynab.com/transfer-transactions-a-guide-HJOsZz4Jj?mobile-help=true) | First-party help; updated 2026-07-10 | Paired transfer record, transfer classification and account-type caveats. |
| Y3 | [YNAB: Spending Breakdown](https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0) | First-party help; updated 2026-07-02 | Ranked/filterable spending explanation and transaction access. |
| Y4 | [YNAB: Export Reflection Data](https://support.ynab.com/en_us/how-to-export-reflection-data-Bykou09) | First-party help; updated 2026-07-02 | Report export formats and selected-scope export. |
| Y5 | [YNAB: Approving and Matching Transactions](https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i) | First-party help; updated 2026-07-16 | Review/approve queue and paired-transfer approval. |
| Y6 | [YNAB: Moving Money in Your Plan](https://support.ynab.com/en_us/moving-money-in-your-plan-ryyCKbBJi?mobile-help=true) | First-party help; updated 2026-07-02 | Envelope/category planning mechanics; counterexample only. |
| Y7 | [YNAB: How to Add an Account](https://support.ynab.com/en_us/how-to-add-an-account-ByoxswMJs) | First-party help; updated 2026-07-02 | Unlinked account and manual current balance. |
| MO1 | [Monarch: Budgets](https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets) | First-party help; updated 2025-08-16 | Optional/category/Flex budgeting and transfer exclusion; medium freshness. |
| M1 | [Monarch: Hide Transactions](https://help.monarchmoney.com/hc/en-us/articles/4405041904916-Hide-Transactions) | First-party help; updated 2024-12 | Hide/undo/calculation scope; historical-medium freshness. |
| M2 | [Monarch: Manual Import](https://help.monarchmoney.com/hc/en-us/articles/4409682789908-Import-data-manually-from-banks-or-other-finance-apps) | First-party help; updated 2025 | Import risk and small-file test; medium freshness. |
| M3 | [Monarch: Transaction Rules](https://help.monarchmoney.com/hc/en-us/articles/360048393372-Transaction-rules) | First-party help; updated 2025 | Rule preview/application/order; medium freshness. |
| W1 | [Wallet: What is Wallet?](https://support.budgetbakers.com/hc/en-us/articles/12212428113810-What-is-the-Wallet-app) | First-party help; updated 2026-04-01 | Manual entry alongside bank-sync capability; product scope. |
| W2 | [Wallet: Transaction Templates](https://support.budgetbakers.com/hc/en-us/articles/7077050225042-Transaction-Templates) | First-party help; updated 2026-03-31 | Reusable manual-account template mechanics. |
| W3 | [Wallet: Delete Account](https://support.budgetbakers.com/hc/en-us/articles/7151291934866-Delete-account) | First-party help; updated 2026-03-31 | Dependency-aware account deletion. |
| MI1 | [MISA Sổ Thu Chi](https://sothuchi.misa.vn/) | First-party Vietnamese product page; current 2026 crawl; marketing-level evidence | Manual records, categories, reports and Excel/PDF export capability only. |
| MI2 | [MISA: voice recording guide](https://sothuchi.misa.vn/huong-dan-su-dung-tinh-nang-ghi-chep-thu-chi-bang-giong-noi-tren-so-thu-chi-misa/) | First-party help; published 2024-10-15 | Voice record limit/edit requirement; counterexample to automatic financial posting. |
| ML1 | [Money Lover](https://moneylover.me/) | First-party product page; crawl recency not a feature verification | Broad manual-entry/report/recurring/asset positioning; counterexample/scope context only. |
| L1 | [Linear: Triage](https://linear.app/docs/triage?tabs=36dbc0f97e0d) | First-party docs; current crawl | Isolated exception inbox and accept/duplicate/decline/snooze resolution. |
| L2 | [Linear: Issue Status / Auto-archive](https://linear.app/docs/configuring-workflows) | First-party docs; current crawl | Searchable/restorable archived state. |
| L3 | [Linear: Triage Intelligence](https://linear.app/docs/triage-intelligence) | First-party docs; current crawl | Opt-in AI/automation counterexample; not financial evidence. |
| WI1 | [Wise: Check Transfer Status](https://wise.com/help/articles/2452305/how-can-i-check-the-status-of-my-transfer?origin=related-article-2932689) | First-party help; current 2026 crawl | Record-attached tracker and third-party stage explanation. |
| Phase A | [Phase A current-reality authority audit](PHASE_A_CURRENT_REALITY_AUTHORITY_AUDIT.md) | Code/test/config-first repository authority at `main@157ba767`; later baseline is `efaba75` | Current MoneyFlow runtime/owner/constraint filter, not comparative product evidence. |
