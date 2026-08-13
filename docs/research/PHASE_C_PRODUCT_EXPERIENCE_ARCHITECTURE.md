# Phase C — Product Experience Architecture

**Status:** accepted/completed architecture record — no brand, visual or implementation decision
**Architecture baseline:** `main@60f91b7da46622abdf78908b4cf186b27ca9571c` (`#366` merged)
**Method:** Phase A executable-current facts are the starting constraint; Phase B supplies bounded mechanisms; A0 supplies migration/evidence guardrails. “Target” below is a product-architecture decision for later phases, not a claim that current routes or UI have changed.

## 1. Executive architecture

MoneyFlow’s target is a **manual-ledger product organized around a trustworthy record
loop**, not a generic dashboard, a budgeting system or an import console:

```text
record a financial fact
  → inspect its account/history context
  → understand a scoped position or period
  → correct or recover when needed
  → optionally connect a plan to explicit facts
  → review advanced imported/automated exceptions
  → retain/export owned data
```

The loop starts with a chosen financial type and a known account, not a forecast,
sync status, aggregate or recommendation. A user can stop after recording, inspecting
or correcting a record; planning, import/rules and ownership administration are useful
layers around the loop, never prerequisites for it. This preserves the current
manual-first Vietnamese ledger identity, integer VND, transfer neutrality, recoverable
destruction and explicit demo/auth boundaries. [Product principles; Phase A §§1–7;
Phase B P1, P5–P9]

### Architecture decisions

| Decision | Why it is fixed for later phases | Evidence/limitation |
|---|---|---|
| **Ledger fact before aggregate.** Capture, edit and transfer remain deliberate record flows; an aggregate must lead to its scoped ledger evidence. | Prevents a dashboard from asserting unexplained balances or spending. | Current transaction/domain and report contracts; Phase B P1/P7. Does not prescribe a screen layout. |
| **Position and history are distinct but adjacent concepts.** Position answers what active accounts represent now; history answers which records caused a period/result. | A total cannot substitute for a record register, and a register alone is slow for an account question. | Current accounts/transactions routes and financial principles. |
| **Understand is a scoped explanation capability.** Reports answer where money went for a selected period/scope and drill into records; they do not become a generic home dashboard. | Keeps period, account/category scope and transfer exclusion explicit. | `src/lib/reports.ts`, report/export contracts; Phase B P7. |
| **Planning is an optional layer of facts, expectations and assumptions.** | A correct ledger works before a user creates a budget, commitment, income template or goal. | Product principles financial honesty; Phase B P6. No full-envelope model is adopted. |
| **Review/import/rules are advanced exception loops.** | They may stage, explain, approve or correct candidate data, but do not displace manual capture or history. | Current Inbox/import/rules ownership; Phase B P2/P8 and Linear analogy. |
| **Recovery and ownership are separate, discoverable responsibilities.** | Undo/soft-delete corrects a ledger record; complete backup/restore protects an account-owned body of data; a scoped report export does neither by itself. | Current transaction/archive contracts; Phase A §12; Phase B P3/P9. |

### Experience boundaries

The target architecture does not require bank-synced freshness, AI advice, household
roles, investment/wealth identity, full-envelope budgeting or a promised “safe to
spend” amount. It must work from facts MoneyFlow reliably owns: user-entered accounts,
integer-VND ledger rows, explicit transfers, planned objects, persisted/imported
candidates and their provenance, and authenticated tenant state. [Product principles;
Phase A §§2–3; Phase B anti-patterns]

## 2. Canonical user-job hierarchy

### Primary jobs — daily ledger loop

1. **Record a fact:** create one expense, income or owned-account transfer quickly.
2. **Know current position:** inspect active-account balances and the account context
   behind an aggregate.
3. **Inspect and correct history:** find a record, edit it, understand its effect, or
   recover it after a soft delete.
4. **Understand a selected period:** explain income, expense and category/account
   contribution from filterable ledger evidence.

### Supporting jobs — connected value, never required before the primary loop

5. **Connect a plan:** manage a category budget, recurring commitment, income template
   or savings goal from explicit facts/expectations and visible assumptions.
6. **Maintain a usable ledger:** manage accounts and categories; reconcile when the
   user needs a deliberate account check.
7. **Export a selected view:** download the requested report/transaction scope with its
   scope described accurately.

### Exception jobs — deliberate recovery or operational boundaries

8. **Resolve an advanced intake exception:** inspect an Inbox candidate/import, review
   provenance/rules, approve or correct it before it becomes ledger history.
9. **Recover a mistake:** restore a soft-deleted transaction, reopen a relevant
   planning/reconciliation action where current domain rules permit, or find retained
   history.
10. **Protect owned data:** create/validate/download a complete account archive;
    understand its authenticated-only restore boundary.
11. **Administer identity/preferences:** account settings, privacy, appearance,
    notifications and destructive account management under their current auth rules.

### What must never compete with the core loop

- A forecast, budget, goal, report chart, Inbox count, import batch or rule suggestion
  must not block “record a fact” or substitute for “inspect/correct history.”
- A transfer must not appear as ordinary income/expense merely to simplify an overview
  or report.
- A report download must not be labelled or positioned as a complete backup.
- Demo sample data must not be displayed as authenticated financial truth.
- A later brand/visual phase must not turn the mobile overflow, planning or advanced
  area into the primary daily action path. [Phase A §§2–4, 7, 11; A0 §11]

## 3. Target information architecture

The hierarchy names **responsibility**, not a final URL, label, menu count or visual
layout. Current `src/lib/nav-ia.ts` remains the executable navigation owner until a
later approved migration changes it.

```text
MoneyFlow product
├── Daily ledger
│   ├── Overview / position
│   ├── Transactions / history
│   ├── Manual capture (expense, income, transfer)
│   └── Accounts (position by account, reconciliation context)
├── Understand
│   └── Reports / scoped explanation / report export
├── Plan (optional)
│   ├── Budgets
│   ├── Commitments
│   ├── Income templates
│   └── Goals
├── Advanced review (exception-only)
│   ├── Inbox / candidate review
│   ├── Imports and import previews
│   ├── Rules
│   ├── Approved timeline
│   └── Direct import, explicitly power-user scoped
└── Ownership and administration
    ├── Settings / categories / privacy / appearance / notifications
    ├── Scoped export
    ├── Complete backup / restore
    └── Account/security management
```

| Target area | User job | Information and actions owned | Does **not** belong here | Relationships / mode relevance |
|---|---|---|---|---|
| **Overview / current position** | “What is represented by my active accounts, and what deserves my next inspection?” | Bounded current position, selected-period orientation, named links to account/history/plan evidence; no unsourced recommendation. | Full transaction register, all reports, forced planning setup, advanced queue management. | Downstream to Accounts, Transactions, Reports or optional Plan. Demo may show representative local data; authenticated position is tenant-owned data. |
| **Accounts** | “Which account carries this balance, and what records/reconciliation context explain it?” | Active accounts, account detail, archive state where current domain permits, reconciliation entry/context. | Period spending explanation, transfer as ordinary spend, household/wealth identity. | Upstream/downstream with capture/transfer and account-scoped history. Available in demo/auth under their distinct stores; ownership claims only authenticated. |
| **Transactions / history** | “What happened, can I find it, and can I correct/recover it?” | Ledger records, search/filter, record detail, edit, soft delete/restore, paired transfer context and links to account/report scope. | Import candidate staging, report-only aggregate, complete backup administration. | The evidence path for all aggregates. Demo uses local persistence; authenticated uses tenant-owned server data. |
| **Manual capture** | “What financial fact happened now?” | Expense, income and transfer entry; minimum required financial decisions; explicitly deferred optional detail; a success link to the resulting record/account context. | Required plan enrollment, bank-sync setup, rule-management, recommendation or a generic importer. | Entry point into Transactions and Accounts. Explicit demo/auth persistence messaging is mandatory. |
| **Understand / reports** | “Where did money go or come from in this selected scope, and why?” | Date/account/category scope, transfer-excluding income/expense, totals/trends where current domain supports them, drill-down to records and scoped report export. | Complete archive/restore, unscoped “financial health” judgement, a replacement transaction editor. | Reads ledger evidence; correction returns to Transactions. Demo results are representative only. |
| **Plan** | “What future obligation, intention or target do I explicitly choose to track?” | Budgets, commitments, recurring income templates and goals; distinctions among posted facts, expectations and assumptions. | Required onboarding, guaranteed available-to-spend, bank-derived prediction, automatic financial decision. | Reuses accounts/categories/ledger facts; correction returns to owning plan object or transaction history. Available in demo/auth but authenticated persistence is tenant-scoped. |
| **Advanced review** | “How do I inspect imported/pasted/candidate data or rules before it affects the ledger?” | Candidate provenance, review/approve/correct paths, import batch state, rule explanation/order, approved timeline, direct import warning/scoping. | Default home, default manual capture, unexplained bulk posting, a consumer-facing “AI” identity. | Can create ledger facts only through its bounded approval/direct-import contracts. Demo is not authenticated import evidence. |
| **Ownership and administration** | “How do I manage preferences, categories, privacy and owned data safely?” | Settings and categories; scoped export; backup/restore; identity/privacy actions. | Everyday transaction list, a generic report dashboard or primary planning flow. | Backup/restore is authenticated-only; report export follows its own scoped contract; public has privacy/support orientation only. |

### Explicit concept placement

| Concept | Target home | Supporting/contextual access | Structural decision |
|---|---|---|---|
| Overview/current position | Overview | Accounts and report filters | Position answers a current question; it must name account/period scope. |
| Accounts | Accounts | Capture/transfer selectors; account-scoped history | Owns account context, not all financial explanation. |
| Transactions/history | Transactions | Overview/report drill-down; capture success | Canonical record/evidence and correction path. |
| Manual capture | Global primary action and dedicated capture flow | Contextual “record” from account/history only when semantics remain clear | An action, not a planning destination or advanced tool. |
| Transfers | Capture + transaction/account detail | Account/history/report explanation | One financial movement with paired account effects; never a top-level spending concept. |
| Reports/explanation | Understand | Overview links; Transactions drill-down | Owns selected-scope explanation and report export. |
| Planning | Plan | Overview contextual invitation only when relevant | Secondary optional capability, never a gate. |
| Inbox/import/rules | Advanced review | Capture alternative only with clear “review first” versus “power user” meaning | Exception workflow, not product identity. |
| Recovery | Contextual to the affected record/object, with a visible ownership route for full recovery | Transactions, account/archive states and backup settings | No separate generic “recovery dashboard.” |
| Settings | Ownership and administration | Account/profile entry | Not a catch-all overflow for everyday product jobs. |
| Backup/export | Ownership for complete backup; Understand for scoped report export | Settings links and report action | Two distinct promises, destinations and success/error meanings. |

## 4. Target navigation architecture

### Semantics common to all signed-in structures

- **Destinations** answer a durable question (Overview, Transactions, Accounts,
  Understand, Plan, Advanced review, Ownership); **capture** is an action, not a
  destination competing for attention.
- A user can always recover from a child/detail surface to its owning list/context;
  contextual navigation must retain the current scope where it is meaningful.
- “More” is an overflow **container for secondary/administrative destinations**, never
  a second product model. It must not be the only path to a core correction/recovery
  that a user just triggered.
- No mobile structure may require a user to scroll behind bottom navigation, browser
  chrome or the safe area to reach an offered action. Dialog/sheet consumers retain one
  coherent scroll owner and usable close/header/keyboard behaviour. [Phase A §§4, 7;
  A0 §11]

### Desktop

| Navigation layer | Target semantics | Current-owner constraint |
|---|---|---|
| Primary destinations | Overview, Transactions and Accounts; capture remains globally available. | Current AppShell/`nav-ia.ts` are owner; Phase C does not alter their rendered order. |
| Secondary destinations | Understand/Reports and Plan concepts are visible through a deliberate secondary group or contextual links, not promoted solely for density. | Existing More/Planning links demonstrate reachability; later change needs a job-based reason. |
| Advanced and ownership | Advanced review and ownership/admin remain clearly labelled secondary areas. | Preserve Settings/backup/export auth and current route owners. |
| Contextual navigation | Account → account history/reconcile; report aggregate → filtered transactions; plan item → its fact/occurrence when domain supports it. | Do not invent cross-route data dependencies; use actual query/owner contracts later. |

### Normal mobile

| Navigation layer | Target semantics | Reachability requirement |
|---|---|---|
| Persistent daily loop | Overview, Transactions, capture action and Accounts retain a direct, thumb-reachable structural path. | Capture must remain one deliberate action; the resulting record is inspectable. |
| Overflow/More | Contains Understand, Plan, Advanced review and Ownership groups with labels that explain their role. | It remains a scrollable sheet with one scroll owner; all offered account actions remain reachable. |
| Contextual/back recovery | Detail/capture flows return to the owning record/list/account scope, not merely to a generic home. | A successful edit/delete/restore communicates the next evidence/recovery path. |

### Constrained/short-height mobile

- The same conceptual destinations/actions exist as normal mobile; **priority changes
  through progressive disclosure, not by silently removing a financial/recovery path**.
- Capture opens a focused option/entry flow; More opens grouped secondary destinations.
  Only the More content body owns scrolling; its header/close and final account action
  remain usable. No nested page/sheet scroll compensation, guessed padding or
  logout-only fix is permitted. [Phase A §7; A0 §11]
- If a flow invokes the keyboard, focus/scroll state must preserve access to the
  required save/cancel/correction action. Existing shared Dialog/Sheet contract remains
  the mechanism owner until a later primitive decision.

## 5. Surface responsibility matrix

| Target surface | Primary question | Primary action | Supporting information | Drill-down / evidence | Correction / recovery | Empty/loading/error | Mode boundary | Financial invariants |
|---|---|---|---|---|---|---|---|---|
| Overview | “What is my current position and what can I inspect next?” | Inspect the relevant account, history or selected scope—not a universal action. | Bounded active-account/period orientation and optional plan context. | Each aggregate names scope and links to accounts/transactions/reports. | Return to Transactions/Accounts; no direct silent balance rewrite. | Empty ledger points to capture; loading/error never invents amounts. | Demo local sample vs authenticated tenant data explicitly distinguishable. | Integer amounts; no invented balance; transfer-neutral period claims. |
| Transactions | “What happened?” | Find/open/correct a record. | Search/filter, record type, account/category/date context. | Record detail and account/report context. | Edit; soft delete; restore under current contract; paired transfer handling. | Empty points to capture; error preserves query/scope where possible. | Demo local persistence; authenticated tenant ownership. | Integer VND; transfer pair never spend/income; soft delete. |
| Capture | “What happened now?” | Save one explicitly typed fact. | Minimum amount/account/type/category where applicable; optional note/date/etc. deferred. | Success identifies resulting record/account. | Validation stays at input; after save edit through history. | Empty account/category setup is a named prerequisite; errors do not guess defaults. | Demo writes locally; authenticated writes tenant-owned data. | Positive safe integers; transfer pair/neutrality; no implicit plan. |
| Account detail/reconcile | “What does this account represent and which records explain it?” | Inspect history or deliberately reconcile. | Current account state and named reconciliation status/context. | Account-scoped transaction history and related transfer legs. | Account edit/archive only under current domain policy; reconciliation reopen/repair as supported. | Missing/unavailable account error must not substitute a balance. | Demo/auth stores differ; no claim that demo data is server truth. | Ownership; integer balance inputs; no untraceable overwrite. |
| Understand / reports | “Where did money go in this selected scope?” | Change scope or inspect a contributing record. | Period/account/category filters and clear total definitions. | Filtered transaction list and scoped report export. | Correct via Transactions; then recompute scope. | No-data state names selected scope and capture/history action; error does not present partial fact as total. | Demo supports exploration; authenticated result is tenant data but remains a selected scope. | Transfers excluded from income/expense; full integers; report/export scope parity. |
| Plan | “What explicitly chosen future obligation, target or plan do I want to track?” | Create/edit a budget, commitment, income template or goal. | Facts/expectations/assumptions distinction and period semantics. | Links to owned plan object and, when implemented, related ledger occurrence/fact. | Edit/archive/undo owning object through its domain rule. | Empty is informative/optional, never blocks capture. | Demo/auth persistence differs; no forecast claim from demo or incomplete data. | No invented income/commitments/reserves; no safe-to-spend promise. |
| Advanced review | “What candidate/import/rule needs review before ledger impact?” | Inspect/approve/correct/reject as current contract permits. | Provenance, rule explanation, batch/candidate state, direct-import warning. | Candidate, source/batch and eventual transaction/timeline path. | Undo/correct through domain-supported review/recovery; no opaque bulk action. | Empty makes manual capture primary elsewhere; errors retain candidate provenance. | Never use demo result as authenticated import evidence. | Integer parsing; tenant ownership; idempotency/provenance; transfer review. |
| Ownership/settings | “How do I manage my data, preferences or account safely?” | Open the named administrative operation. | Categories/preferences/privacy/account state. | Settings subarea, scoped export or backup contract. | Restore only through complete archive flow; destructive account action follows current auth policy. | Auth/eligibility errors are truthful and non-destructive. | Complete backup/restore is authenticated-only; public is orientation/support only. | Tenant ownership; no secret exposure; export vs backup distinction. |

## 6. Core-flow specifications

Each flow records the **minimum product architecture**, not field styling or component
layout. “Evidence path” means the user-facing route to the fact/scope that supports an
outcome; it does not expose internal logs or provider secrets.

| Flow | Trigger → minimum decisions | Deferred detail | Success state | Error/correction path | Evidence/provenance path |
|---|---|---|---|---|---|
| Add expense | Capture → expense → positive integer VND amount + account + required classification → save. | Note, payee, label, date and other supported metadata when not required by current contract. | New record is visible/inspectable in Transactions and affects its account/selected report scope. | Input error explains missing/invalid data; later edit from record history. | Record → account context → filtered period/category report. |
| Add income | Capture → income → positive integer VND amount + account + required classification → save. | Same optional record metadata. | New income record is inspectable and appears only in relevant income/position context. | Validation or edit from history; never turn an error into an inferred income. | Record → account/history → report income scope. |
| Transfer | Capture → transfer → from account + to account + integer amount → save paired movement. | Supported date/note only after paired account meaning is clear. | Both account contexts can explain their legs; report treats it as non-income/non-expense. | Correct through transfer-aware record edit/correction, not two unrelated spending rows. | Paired legs → account history; report explanation labels/excludes transfer. |
| Edit/correct transaction | Record/detail or filtered history → change allowed fields → save. | Nonessential enrichment. | Revised record is reflected in its affected account/report/plan linkage under current domain semantics. | Validation preserves old fact; return to record without silent data loss. | Updated record and its scoped consequences remain inspectable. |
| Delete → recover | Record/detail → deliberate delete → soft-delete success with visible recovery action. | Permanent removal is not assumed. | Record is hidden from ordinary current list/calculation as current contract specifies; recovery remains available. | Restore returns the same owned record idempotently when allowed; failure tells truth and retains recovery state. | Record/history recovery state; aggregate recalculates from active rows. |
| Inspect account balance | Overview/account link → select account/context. | Reconciliation is optional. | Account scope and ledger context make the displayed position interpretable. | Do not overwrite a balance to make the view look right; use current reconciliation/correction path. | Account → account-scoped history → transfer pair or reconciliation context. |
| Understand “where money went” | Overview/report invitation → select/confirm period and scope → inspect total/category. | Additional filters, export, trend comparison. | Scoped explanation links to contributing transactions. | Correct a record in Transactions; return/recompute selected scope. | Scope declaration → filtered ledger rows; transfers excluded from spend. |
| Enter/leave planning | Contextual invitation or secondary Plan destination → choose plan object → set explicit input. | Any planning technique not needed for that object. | Plan exists as a user-owned expectation/assumption, visibly distinct from posted fact. | Edit/archive/undo under owning plan contract; leaving Plan never blocks daily ledger. | Plan object → relevant current fact/occurrence only where data contract supports it. |
| Review Inbox/import/rule exception | Advanced Review/capture alternative → inspect candidate/batch/provenance → approve/correct/reject or leave pending. | Bulk/direct import only when its explicit power-user contract is chosen. | Approval states the resulting ledger effect or retains a review state. | Correction/recovery preserves candidate/source context; no invisible auto-post. | Source/batch/rule → candidate → resulting record/timeline as current contracts allow. |
| Export report | Understand/Report with selected scope → request export. | Complete backup. | Download is labelled as the selected report/transaction scope. | Export failure retains scope and does not claim a backup exists. | Selected report scope → exported rows. |
| Create/download complete backup | Ownership/Settings → authenticated archive request → validate/download archive. | Report CSV/JSON. | Versioned complete archive is identified as account-owned backup. | Validation/creation failure is explicit; restore eligibility is not assumed. | Archive contract/inventory; separate restore flow and target-state constraint. |

## 7. Progressive-disclosure model

| Level | Capabilities | When exposed | Must not become |
|---|---|---|---|
| **CORE** | Capture expense/income/transfer; Overview/position; Transactions/history; Accounts; record correction/recovery. | Persistent daily structure and immediate contextual path. | A dashboard of predictions or a form that requires planning/import setup. |
| **SUPPORTING** | Understand/Reports; categories; optional planning objects; account reconciliation. | Secondary destination or contextual invitation when the user asks the supporting question. | Required onboarding or a replacement for records/account evidence. |
| **ADVANCED** | Inbox, import previews/history, rules, approved timeline, direct CSV import, paste/upload/share intake. | Named Advanced Review group or capture alternative with review/power-user explanation. | The home surface, a hidden auto-posting system or MoneyFlow’s identity. |
| **ADMIN / OWNERSHIP** | Settings, appearance, notifications, privacy, scoped export, complete backup/restore, account deletion/security. | Clearly labelled ownership/settings routes and contextually after an export/backup need. | An inaccessible “last item” in a trapped mobile overflow, or a substitute for record-level undo. |

Planning stays useful but optional: it may use explicit facts, expectations and
assumptions, but may never be an entry condition for capture, history correction,
account position or export. Recovery/backup stays discoverable through its owning
context while preserving the everyday ledger’s focus.

## 8. Runtime-mode matrix

| Surface/flow family | PUBLIC | DEMO | AUTHENTICATED | Prohibited claim |
|---|---|---|---|---|
| Orientation, legal and authentication | Available as public/support routes. | May lead into explicit demo. | Leads into signed-in product after auth. | Public/support copy is not a financial position. |
| Daily ledger, accounts, capture, history, reports and planning | Not an anonymous product surface. | Representative browser-local product data and local persistence. | Tenant-owned Supabase-backed data under auth/RLS. | Demo example, persistence or balance is not authenticated financial truth. |
| Advanced Review | Not public. | May demonstrate a bounded local flow where current code supports it. | Tenant-owned candidates/batches/rules/provenance under current contracts. | A demo import outcome is not evidence of server persistence, ownership or provider state. |
| Scoped report export | Not public. | A bounded local/export capability if current demo route supports it. | User-readable selected scope; tenant data. | It is not a complete backup or restore promise in either mode. |
| Complete backup/restore | Not public. | Complete server archive does not apply; current page explains the boundary. | Authenticated account-only archive/restore contract and eligibility restrictions. | Demo/report export is not a server backup; hosted restore is not claimed to have been exercised. |
| Settings/privacy/account deletion | Public privacy/orientation only. | Demo identity/persistence remains local. | Current authenticated ownership/security/recent-auth paths. | Demo session cannot prove an identity/security action. |

This matrix preserves the Phase A distinction: route shape does not determine runtime
truth, and a demo-rendered product surface is not evidence about a real user’s account,
provider configuration or persistence. [Phase A §§1–3]

## 9. Financial-trust architecture

### Invariants that shape every surface

1. **Money is integer VND.** A target flow accepts/validates integer amounts and must
   not round, truncate or invent money for convenience.
2. **Transfers are paired neutral movement.** They affect owned-account context but do
   not become expense/income or category spend in a report/overview.
3. **A balance/aggregate declares scope.** It identifies active account inclusion and,
   for period figures, date/category/filter basis. It leads to ledger evidence and a
   correction path rather than presenting a self-justifying total.
4. **Destructive ledger correction is recoverable.** Record-level delete and restore
   remain distinct from hiding, archive, report filtering and account deletion.
5. **Planning is honest about time and certainty.** A posted transaction, expectation,
   assumption and projection remain different concepts; missing data stays unknown.
6. **Ownership follows runtime.** Authenticated financial state is tenant-scoped; no
   architecture decision permits cross-tenant data, invented ownership or demo-to-server
   implication.
7. **A scoped report export is not a complete backup.** Complete archive/restore has
   its own authenticated route, validation and target-state boundaries. [Product
   principles; `src/lib/finance.ts`; `src/lib/reports.ts`; archive contracts]

### Aggregate contract

```text
aggregate / position / report answer
  → names its account + period/category/filter scope
  → links to contributing ledger/account evidence
  → offers the owning correction path
  → recalculates from corrected active facts
```

For example, “where money went” is a selected period/category/account explanation with
transfers excluded, followed by filtered transactions; it is not a free-floating
spending score. “Current position” is an account-scope question, not an income plan.

## 10. Current → target gap map

This map neither changes nor deletes a route. “Move responsibility” means a later phase
may migrate **conceptual ownership** only after code/data/test impact is specified.

| Current surface/owner | Target responsibility | Disposition | Reason | Later migration risk |
|---|---|---|---|---|
| `AppShell` + `nav-ia.ts` primary Overview/Transactions/Capture/Accounts/More | Daily ledger primary structure; capture global action; secondary grouping rules | **KEEP AS STRUCTURAL OWNER** | Current code already separates primary daily flow from More. | A target label/group must not create a parallel nav owner or regress mobile safe-area/sheet semantics. |
| `/dashboard` and dashboard components | Overview/current position with bounded next inspection | **ADAPT LATER** | Current overview is canonical route, but target forbids generic “everything” ownership. | Any aggregate needs source/scope/drill-down; do not infer missing plans/balances. |
| `/transactions`, transaction workspace/actions | Canonical history/evidence/correction surface | **KEEP AS STRUCTURAL OWNER** | Current routes/actions/tests own record search/edit/delete/restore. | Preserve filters, paired transfers, soft-delete and demo/auth persistence boundaries. |
| Capture sheet, `/capture`, `/capture/quick` and capture variants | Explicit fact entry; advanced intake only as labelled alternative | **ADAPT LATER** | Current capture is rightly primary but variants need target-level choice/review meaning. | Do not turn paste/upload/direct import into default or create competing modal scrolling. |
| `/accounts`, account detail/reconcile | Account position/context/reconciliation | **KEEP AS STRUCTURAL OWNER** | Account domain owns account facts/detail. | Do not overwrite a balance or introduce sync/wealth assumptions. |
| `/reports` and `/reports/export` | Understand selected-scope explanation and scoped report export | **MOVE RESPONSIBILITY** | Current navigation parks Reports in More; target defines its distinct Understand responsibility. | Route/menu move must preserve report/filter/export parity and transfer exclusion. |
| `/budgets`, `/commitments`, `/income-templates`, `/goals` | Optional Plan area | **MOVE RESPONSIBILITY** | Current links are already secondary; target unifies their user-job contract without requiring planning. | Objects have distinct domain/time semantics; do not collapse them into one forced budget model. |
| `/inbox`, `/imports`, `/rules`, `/timeline`, direct import | Advanced Review/exception loop | **KEEP AS STRUCTURAL OWNER** | Current advanced group and domain provenance distinguish it from daily ledger. | Do not hide a review requirement or promote direct import without its explicit power-user contract. |
| Transaction undo/restore, account archive/reconcile, plan object recovery | Contextual recovery at object owner | **ADAPT LATER** | Target requires recovery meaning to be discoverable where mistake occurred. | Hide/archive/delete/restore are not interchangeable; retain auth/domain constraints. |
| `/settings/export` | Scoped export under Ownership, reachable from Understand | **MOVE RESPONSIBILITY** | Target distinguishes report download from archive while retaining Settings ownership. | Avoid duplicate export functions or a misleading backup label. |
| `/settings/backup`, archive actions/contracts | Complete authenticated ownership backup/restore | **KEEP AS STRUCTURAL OWNER** | Current separate archive contract protects the distinction. | Demo inapplicability and restore-target eligibility must remain truthful. |
| `/settings`, categories, appearance, notifications, privacy, delete account | Ownership/admin group | **KEEP AS STRUCTURAL OWNER** | These are not daily ledger destinations. | Do not bury recovery/backup; do not weaken auth/recent-auth policy. |
| `/onboarding` optional-viewer flow | First-use bridge into manual ledger setup | **UNCERTAIN** | Phase A records a distinct `getViewer()` boundary; target needs later evidence for its first-use sequence. | Do not assume auth/provisioning or turn planning into onboarding gate. |
| `/insights` compatibility redirect | No target product responsibility | **RETIRE LATER** | Current authority says `/dashboard` is canonical; redirect exists only for compatibility. | Retire only with route/reference/evidence migration; do not revive it as a new dashboard. |
| `legacy.css` and presentation modules | No product-concept owner | **REPLACE LATER** | They are live presentation boundaries, not IA evidence. | A0 replace-and-retire evidence is required; no stacked root layer or filename-only deletion. |

## 11. Product-experience invariants

1. The simplest successful journey is record → inspect/correct → understand, with no
   required plan, import, bank link or recommendation.
2. Every major total has a declared scope, ledger evidence path and correction path.
3. Every transfer preserves paired, transfer-neutral meaning at capture, account,
   history and reporting surfaces.
4. A correction is not a disappearance: edit, soft delete/restore, hide/archive and
   backup/restore each state their meaning and recovery boundary.
5. Advanced intake remains reviewable, provenance-aware and secondary to manual entry.
6. Planning tracks explicit facts/expectations/assumptions and is optional; it never
   invents a safe-to-spend or income-cycle answer.
7. A report export and a complete backup are distinct promises, labels and flows.
8. Public, demo and authenticated states make only the claims their data/identity
   source supports.
9. Desktop/mobile are different structural presentations of the same concepts and
   evidence paths, not separate products.
10. A constrained overlay has one scroll owner; close/header, final action, keyboard
    and safe-area reachability remain intact.
11. Code/test/config owners outrank this target architecture for current behaviour;
    migration changes require their own specification and evidence.
12. No Phase C decision selects brand personality, visual system, screen composition,
    palette, type, iconography or component styling.

## 12. Decisions locked for Phase D+

The following are architectural constraints for later work unless an owner-approved
product-architecture revision changes them:

- The canonical target hierarchy is Daily ledger, Understand, optional Plan, Advanced
  Review, and Ownership/administration; capture is a global primary action.
- Transactions/history is the canonical ledger evidence and correction surface;
  Accounts is the position/account-context surface; Overview is a bounded orientation
  surface, not a “dashboard of everything.”
- Reports own scoped explanation and report export; complete backup/restore remains a
  separate authenticated ownership capability.
- Planning is optional and conceptually separate from posted ledger facts; it may not
  dominate onboarding or capture.
- Inbox/import/rules/timeline/direct import remain advanced exception workflows with
  provenance/review requirements, never default product identity.
- Mobile must retain direct core-loop access plus structurally reachable grouped
  secondary/ownership actions; short-height sheet constraints remain mandatory.
- Existing runtime owners remain in place until an approved migration: `nav-ia.ts` and
  AppShell for signed-in navigation; routes/features for composition/domain actions;
  shared primitives for overlay semantics; document/CSS ownership rules for presentation.
- Later UI slices must demonstrate source-to-runtime ownership, representative
  viewport/first-paint evidence and preserved keyboard/focus/one-scroll-owner behavior
  as A0 requires. [A0 §§3–7, 12–13]

## 13. Questions deliberately left open

1. Which primary job has the strongest measured user friction and should become the
   first later vertical slice?
2. Which exact labels, grouping names and desktop/mobile route manifestations best
   express this architecture in Vietnamese? Phase C locks responsibility, not copy.
3. Which Overview aggregates are sufficiently useful and data-complete to expose first,
   and which should remain contextual links rather than home information?
4. Which current planning objects need user-comprehension evidence before they can be
   grouped under one Plan entry point?
5. How should first-use/onboarding bridge its optional-viewer boundary to account setup
   and first capture without assuming authenticated persistence or mandatory planning?
6. Which report filters/drill-down routes can be preserved exactly, and which require a
   later query/state migration?
7. Which recovery affordances are discoverable enough on real phones, beyond existing
   behavioural contracts, and what physical-device matrix will verify future changes?
8. What Brand Strategy should later select? This question is expressly Phase D and is
   not answered here.

## 14. Later migration implications

### Permitted candidate work after a new approved packet

- Reorganize or relabel routes/navigation **only** where the target responsibility map
  supplies a job-based reason and a migration preserves existing owner/domain contracts.
- Create a bounded Overview, Understand, Plan, Advanced Review or Ownership slice with
  explicit scope/evidence/recovery states and representative mode/viewport tests.
- Consolidate duplicated presentation only after source/import/compiled/runtime evidence
  identifies the owning replacement; legacy CSS must shrink rather than gain another
  override layer.
- Use Phase C’s target tables to write future acceptance tests for drill-down, scope,
  transfer, recovery, demo/auth and backup/export boundaries.

### Prohibited inference from this record

- It does not authorize a route deletion, data migration, change to navigation code,
  component/CSS rewrite, provider change or Design Harness implementation.
- It does not decide a visual hierarchy, dashboard composition, palette, typography,
  icon treatment, brand voice or marketing story.
- It does not turn archived/completed competitor research into a current product
  identity, or Phase B mechanisms into implemented behaviour.
- It does not start Phase D Brand Strategy or the Brand/Product Experience rebuild.

### Evidence required for later UI/product slices

```text
specified user job + target surface responsibility
  → named current owner and migration boundary
  → financial/runtime-mode/recovery contract
  → source/compiled/cascade/runtime presentation trace where UI changes
  → representative desktop + mobile + constrained-overlay evidence as applicable
  → exact-head selected gates and owner review
```

This preserves A0’s replace-and-retire discipline: later work replaces one proven owner
at a time, does not stack a new visual layer over live legacy, and distinguishes a
passing behavioural contract from a product/visual judgment.
