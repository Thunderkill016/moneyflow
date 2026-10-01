# Capture V2 — low-maintenance transaction acquisition

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** human owner; research and specification by OpenAI agent
**Branch:** `plan/capture-v2-spec`
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet defines Capture V2 product hypotheses, safety boundaries, benchmark requirements and a possible delivery sequence. It does **not** authorize runtime implementation, schema changes, provider integration, production writes or merging.

## Outcome

Reduce the maintenance required to turn real-world financial activity into trustworthy MoneyFlow ledger facts without making users learn a growing menu of capture technologies.

The revised working thesis is:

- **Single transaction = Ghi.** Amount-first entry, Frequent Patterns, optional Counterparty/Payee context, typed description, paste, keyboard dictation and future image evidence are candidate modes/adapters inside one single-transaction job.
- **Bulk acquisition = Nhập sao kê.** CSV/Excel remain first-class; text-layer PDF remains compatibility fallback.
- **Source mechanisms remain adapters.** Share Target, OCR, notifications/native sources and provider sync may feed the same acquisition contract but do not automatically deserve separate navigation concepts.

The corresponding information-architecture proposal is a **hypothesis to benchmark**, not a fixed decision.

```text
Ghi — one transaction
  ├─ amount-first trusted entry
  ├─ Frequent Patterns / favorites
  ├─ optional Counterparty/Payee
  ├─ description / type / paste / keyboard dictation
  └─ future explicit image-evidence experiment

Nhập sao kê — many transactions
  ├─ CSV
  ├─ Excel
  └─ text-layer PDF fallback
```

The goal is not to maximize the number of ways to enter a transaction. The goal is to minimize the work required to turn real-world financial evidence into trustworthy ledger facts.

## Repository reconnaissance

Current repository behavior already contains the required primitives:

- `/capture/quick` — one-transaction manual capture through the shared Ghi form.
- `/capture/paste` — deterministic text parsing, optional rules, preview, then candidate creation into Inbox.
- `/capture/upload` — CSV, Excel and text-layer PDF import with preview before Inbox.
- `/capture/share` — installed-PWA Share Target ingress for text/files.
- `/capture` — current hub showing `Ghi nhanh`, `Dán text / SMS`, and `Tải sao kê / file`.

The current text parser understands Vietnamese-oriented amount syntax such as `45k`, `1.5tr`, grouped VND amounts, dates, kind hints and merchant text. It emits candidates with confidence, uncertain fields, explanations, raw evidence and optional rule matches. It does not write directly to ledger.

### PR #596 is released truth

PR #596 (`feat: add stable Ghi defaults and immediate correction`) merged into `main` on 2026-09-14 as commit `f7a5ae0731f48974e3eae4d01c879a1b2a822a4c`; the corresponding Vercel production deployment reached `READY`.

Capture V2 therefore treats the following as current baseline behavior, not a pending dependency:

- stable ledger-backed account/category defaults require a deterministic 2-of-3 majority over recent eligible reviewed same-kind transactions;
- local quick-add preference remains fallback;
- immediate post-save correction reuses the existing edit/update mutation;
- recency follows existing ledger ordering;
- no merchant fuzzy inference, ML/AI, provider work, schema change or second mutation path was introduced.

Capture V2 must reuse these contracts rather than duplicate or weaken them.

### Historical repeat experiment

The repository previously had an unmerged `Add repeat last transaction` PR. It copied the last successful amount, account, category and note into a new draft. It was closed because the required inspect → research → decision → contract → bounded implementation process had not been completed, not because the user job had been disproven.

That old implementation is not authority. In particular, automatically copying amount and note is broader than the current trust model should assume from a single prior transaction.

## Research

### Market evidence

| Source                                                                                                                                                                                                                                           | Evidence                                                                                                                                                          | MoneyFlow applicability                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| YNAB `Adding Transactions Without Direct Import`, accessed 2026-09-14: https://support.ynab.com/en_us/adding-transactions-without-direct-import-B1kBALVaxx                                                                                       | Transaction entry can start from app-icon long press, category long press, widgets, lock-screen/Home Screen shortcuts and Siri/Spotlight.                         | Reducing access cost and reusing known context can matter as much as changing the form.                                                           |
| YNAB `Shortcuts on iOS`, accessed 2026-09-14: https://support.ynab.com/en_us/shortcuts-on-ios-a-guide-Bk_lHa5Aq                                                                                                                                  | Add Transaction shortcuts may prefill amount, payee, category and account for regular transactions.                                                               | Supports testing favorites/Frequent Patterns and future OS shortcuts. It does not require MoneyFlow to auto-copy amount by default.               |
| YNAB `Scheduled Transactions`, accessed 2026-09-14: https://support.ynab.com/scheduled-transactions-a-guide-BygrAIFA9                                                                                                                            | Known repeating transactions are modeled explicitly and can later match imports.                                                                                  | Supports separating recurring commitments from ad-hoc frequent patterns.                                                                          |
| Actual Budget `Payees`, accessed 2026-09-14: https://actualbudget.org/docs/transactions/payees/                                                                                                                                                  | Payees may be favorited, normalize imported names and carry a default category.                                                                                   | Strong evidence for testing Counterparty/Payee as a durable context primitive.                                                                    |
| Actual Budget `Rules`, accessed 2026-09-14: https://actualbudget.org/docs/budgeting/rules/                                                                                                                                                       | Actual can create/update inspectable rules from repeated payee renaming/categorization behavior.                                                                  | Supports deterministic, correctable learning anchored on counterparty context before probabilistic guessing.                                      |
| Lunch Money `Rules`, accessed 2026-09-14: https://support.lunchmoney.app/setup/rules                                                                                                                                                             | Payee, account, amount, category, notes and date can drive explicit rules across manual/imported transactions.                                                    | Supports one deterministic rule model across acquisition paths.                                                                                   |
| Wallet by BudgetBakers `Using Templates`, updated 2026-03-31: https://support.budgetbakers.com/hc/en-us/articles/7077050225042-Using-Templates                                                                                                   | Templates preserve account, category, amount, type, payee and note for repetitive records.                                                                        | Supports testing explicit reusable patterns while deciding separately which fields are safe to prefill.                                           |
| Copilot `Quick Start Guide` and `Copilot Intelligence for Spending`, accessed 2026-09-14: https://help.copilot.money/en/articles/11157550-quick-start-guide and https://help.copilot.money/en/articles/8182433-copilot-intelligence-for-spending | Copilot waits until at least 30 reviewed transactions before surfacing ML type/category suggestions and learns from corrections.                                  | Supports requiring meaningful reviewed history/confidence before probabilistic suggestions; it is not justification for zero-history AI defaults. |
| MoMo `Quản lý chi tiêu`, accessed 2026-09-14: https://www.momo.vn/quan-ly-chi-tieu                                                                                                                                                               | MoMo transactions can be recorded/classified automatically because MoMo owns the payment evidence; outside transactions still have a manual Add Transaction path. | Vietnam-specific evidence that direct evidence acquisition can reduce more maintenance than adding intelligence to a manual form.                 |
| MDN `share_target`, accessed 2026-09-14: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target                                                                                                       | Installed PWAs may receive shared text/files, but support is Limited Availability and inputs must be validated.                                                   | Keep Share Target optional transport, not a primary product concept.                                                                              |

### Market interpretation

The strongest repeated market patterns are:

1. reduce the cost of reaching transaction entry;
2. reuse stable context for repeated transactions;
3. use payee/counterparty as a durable anchor for normalization and categorization;
4. keep explicit recurring transactions separate from ad-hoc frequent behavior;
5. prefer deterministic learning or require sufficient reviewed evidence before probabilistic prediction;
6. acquire source evidence directly when the product legitimately owns or receives it;
7. keep correction and user authority visible.

This research informs hypotheses only. It does not prove that the same UX or data model will improve MoneyFlow.

## Specification

### Product hypotheses to benchmark

None of the following are fixed product decisions until MoneyFlow evidence supports them.

#### H1 — Single transaction should have one user-facing concept: Ghi

**Hypothesis:** users complete single-transaction work faster and with less conceptual load when amount-first, patterns and assisted text/paste modes live under one `Ghi` concept rather than separate `Ghi nhanh` and `Ghi thông minh` destinations.

**Disconfirming evidence:** users consistently complete assisted capture faster or understand it better as a separate destination, or consolidation makes amount-first entry slower/harder to discover.

#### H2 — Frequent Patterns are the next highest-value Ghi enhancement

**Hypothesis:** a small number of deterministic familiar patterns reduces Time to Trusted Ledger Transaction (TTLT) and taps for repeated everyday transactions without increasing wrong-default correction.

A Frequent Pattern is contextual reuse, not automatic truth. Candidate structural identity:

```text
kind + accountId + categoryId + optional counterpartyId
```

Amount and note remain empty by default. Copying them requires a separate explicit `Dùng lại`/template action because they are more transaction-specific.

**Disconfirming evidence:** pattern scanning adds more choice cost than #596 saves, or users frequently correct pattern context.

#### H3 — Counterparty/Payee is a valuable foundation

**Hypothesis:** an optional canonical Counterparty/Payee improves repeated manual entry, imported-name cleanup, deterministic category rules, search and future source matching enough to justify data-model cost.

Required conceptual separation:

```text
raw source description / merchant text
                ↓ deterministic/user-confirmed normalization
canonical counterparty/payee
                ↓ optional inspectable rule/default
account/category context
```

Raw source evidence remains provenance. Canonical Counterparty/Payee is user-owned interpretation, not replacement truth.

**Disconfirming evidence:** users rarely need this identity, existing note/source evidence is sufficient, or another entity creates more cleanup than maintenance reduction.

#### H4 — Natural description is a Ghi mode, not yet a navigation concept

**Hypothesis:** for one-off transactions with several explicit details, `Mô tả giao dịch` using the existing deterministic parser can beat amount-first entry on TTLT without increasing correction burden.

Type, paste and keyboard dictation feed the same parser/preview contract. Until benchmarked, the UI should not permanently promote this as a peer `Ghi thông minh` destination.

#### H5 — Direct evidence acquisition ultimately reduces more maintenance than richer manual entry

**Hypothesis:** statement/source/provider/native acquisition will drive a larger long-term maintenance reduction than increasingly sophisticated manual forms, provided provenance, duplicate handling, transfer matching, recovery and provider risk are solved.

MoMo is relevant because automatic capture is strongest where the product owns transaction evidence. It is not evidence that MoneyFlow should copy MoMo's AI classification or request invasive permissions without equivalent authority.

### Ghi — single transaction working contract

Amount-first remains the released control path:

- amount gets first focus;
- expense/income/transfer remains explicit under existing semantics;
- #596 stable ledger-backed account/category default outranks local fallback exactly as released;
- first-time/weak-evidence users receive no arbitrary taxonomy default;
- direct manual save uses the existing ledger mutation owner;
- the exact saved row remains immediately correctable;
- transfers remain neutral to expense/income reporting;
- no shorthand parser is added to the strict amount field;
- no amount-derived category inference, hidden save or model-generated default.

### Frequent Patterns foundation

Safety requirements for any prototype:

- derive only from reviewed, active, same-kind eligible history or explicit user favorites/templates;
- preserve coherent field relationships from the same pattern; never independently guess account/category/counterparty;
- exclude transfers as ordinary income/expense patterns;
- exclude split/ambiguous/review-needed rows from silently establishing a pattern;
- exclude recurring-owned rows from establishing capture patterns — a subscription the system posted is rule output, not a manual habit (the recurring/commitment domain owns it). The same row may still answer where its payee belongs: the recurring rule's category is user-chosen evidence for that payee, offered through the explicit suggestion chip;
- ignore invalid/deleted account/category/counterparty references;
- leave amount and note empty by default;
- never autopost; Save remains explicit;
- correction affects future learning only through a deterministic contract;
- browser/local state never becomes a second ledger.

An explicit `Dùng lại`/pinned template that copies amount/note may be benchmarked separately. Recurring rent/subscription remains owned by the recurring/commitment domain rather than by ad-hoc pattern learning alone.

### Counterparty/Payee foundation

Working terminology is `Counterparty/Payee` until Vietnamese product language is benchmarked.

Conceptual fields/roles:

- **raw source description** — immutable/retained evidence where available;
- **canonical counterparty/payee** — user-owned normalized identity such as `Highlands Coffee`;
- **alias/match rule** — deterministic mapping from source description to canonical identity;
- **category/default rule** — optional inspectable behavior associated with that identity or the broader rules system.

A schema migration is **not authorized** by this packet. A later bounded packet must answer:

- whether current candidate/provenance models can prove value before new schema;
- whether ledger facts need a durable counterparty reference;
- alias merge/rename/delete behavior without losing source evidence;
- transfer separation;
- export/archive/restore implications;
- tenant isolation/RLS for any new durable entity;
- rollback and migration strategy.

Counterparty remains optional/progressively disclosed in amount-first Ghi and may become more visible when a pattern, parser/import evidence or explicit favorite supplies context.

External merchant enrichment, web lookup and LLM normalization are out of scope for the first foundation.

### Description / paste / dictation experiment

Initial benchmark modes:

- type: `cafe 45k`, `đổ xăng 185k Techcombank hôm qua`;
- paste: bank SMS, wallet text, copied notification or source text;
- keyboard dictation: OS/device converts speech to text, then MoneyFlow treats it as ordinary text evidence.

Interaction contract:

```text
input
  ↓
deterministic parse / evidence extraction
  ↓
compact preview
  ↓
resolve uncertain fields only
  ↓
Inbox candidate or separately approved trusted-save path
```

Reuse requirements:

- start from `src/lib/inbox/parse-text.ts` unless a planned refactor establishes a neutral evidence parser;
- reuse candidate confidence, uncertainty, explanations and raw evidence where sufficient;
- reuse deterministic rules and rule evidence;
- reuse Inbox candidate creation; no second assisted-capture store;
- never send raw financial text to a new AI/provider merely because the mode is described as smart/assisted.

### Uncertainty without mandatory friction — research decision, 2026-10-01

The owner clarified that "do not guess financial data" must not become a blanket review step or a ban on useful assistance. For Canon Stage 0/1, the boundary is **what may be presented as a posted fact**, not whether MoneyFlow may parse, suggest, prefill or prototype. The present quick-save and Inbox paths already provide two distinct outcomes; this decision uses them rather than introducing another store, universal confirmation screen or permission system.

| Input and evidence                                                                                                                                                                 | Allowed next step                                                                                                                                                     | Ledger effect                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| User deliberately enters/accepts a complete amount, kind, date and account in Ghi; current validation succeeds.                                                                    | Save through the existing manual mutation, show the exact result and immediate correction.                                                                            | Posted user assertion; do not label it bank-reconciled.                                |
| Parser extracts explicit values from pasted/imported text, but a required field is missing, contradictory or only inferred (for example year, account ownership or transfer kind). | Keep source text and proposed values in the existing candidate; show the specific field and a short way to resolve it.                                                | None until the existing review/approved-automation contract permits posting.           |
| Reviewed history or an inspectable rule suggests category, payee or account.                                                                                                       | Offer a visible, editable default or suggestion; let the user accept/change it as part of the ordinary Save. Leave amount/note empty by default for learned patterns. | Only the user's saved choice or a separately approved rule becomes a posted attribute. |
| Source identity proves an exact replay, or a near duplicate/transfer match is merely plausible.                                                                                    | Apply proven idempotency; put ambiguous matches in the existing exception review with source comparison.                                                              | No duplicate posting or transfer reclassification from similarity alone.               |

The decision is field- and consequence-specific. A parseable `45k` may populate an amount proposal, but an absent amount is not zero. An explicit `hôm qua` may resolve against a valid Vietnam calendar anchor; a missing/invalid/conflicting date must not silently become a final "today" fact. A merchant/category hint is lower consequence than the wrong amount, account, expense/income kind, transfer pair or duplicate. A confidence label is diagnostic, never standalone permission to post. Preserve raw source provenance and corrections so suggestions can be evaluated without treating them as facts.

For future development, prototype parsers and suggestions with fixtures and demo data; compare against the released flow before promotion. The smallest next runtime experiment is a **field-specific review** inside the existing candidate/preview path: show only unresolved material fields, keep known fields prefilled, and return to the same save/review task after correction. Do not introduce an extra confirmation step for every complete manual Ghi entry. Do not bypass current server validation, tenant ownership, idempotency, transfer neutrality or the separate approval required for any new automatic posting behavior.

Evaluate with the same task and device cohorts already listed below: correct posted amount/kind/date/account/transfer, wrong-default and duplicate rates, TTLT including later correction, number of fields touched, unresolved/abandoned candidates, and whether users can explain what is saved versus pending. A faster candidate creation time alone is insufficient. No performance threshold or successful human outcome is claimed by this research.

Focused external evidence (accessed 2026-10-01):

- [W3C WCAG 2.2 SC 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) allows reversibility, input checking/correction **or** pre-submit review for important data actions; its guidance explicitly does not require confirming every simple save. This supports a quick checked-and-correctable manual path, not skipping MoneyFlow's financial invariants.
- [GOV.UK Check answers](https://design-system.service.gov.uk/patterns/check-answers/) gives users a way to review and change submitted information where a separate check step helps. It supports targeted review for consequential ambiguity; it does not prove every MoneyFlow transaction needs another page.
- [Actual Budget Importing Transactions](https://actualbudget.org/docs/transactions/importing/) distinguishes manual entry, file mapping and identifier-first duplicate matching with fallback similarity. Actual's choice to favor imported dates is a product-specific policy, **not** permission for MoneyFlow to overwrite a user-confirmed date silently.
- [Actual Budget Rules](https://actualbudget.org/docs/budgeting/rules/) shows editable, user-owned categorization/payee rules based on prior behavior. Reuse the pattern of inspectable learning; its broad rule power and automatic mutation are not adopted without MoneyFlow-specific error evidence and authorization.

No new dependency, provider, financial payload collection, schema or license-bearing code is proposed. The existing capture, candidate, review and correction owners remain responsible; a prototype can be reverted without rewriting posted ledger history. Open uncertainty: physical-phone and first-time-user evidence has not established whether field-specific review reduces total work or confusion.

### Bounded implementation slice — unresolved account and category, 2026-10-01

**Execution state:** merged in PR #734 at `0afb5cd0` after all required CI checks passed. **Permission scope:** owner-authorized merge. **Owner instruction:** merge PR #733 and begin product development, then merge the implementation and continue. This slice serves Canon Stage 0/1 trustworthy, low-maintenance reality; it addresses an observed conflict between Inbox readiness and its review form.

- **Observed failure:** readiness marks an absent or invalid account/category as needing attention, while `draftFromCandidate` and the review form fall back to the first available option. A reviewer can then post a value that no source or user selected. Transfer review also preselects a destination account absent from the candidate.
- **Expected behavior:** retain exact, valid candidate account/category values. Leave unresolved account, category and transfer destination unselected; show a plain-language choice prompt in the existing form. Existing `buildLedgerPost` validation blocks Save until the user chooses valid values. Do not add another confirmation step to a complete, valid candidate.
- **Evaluation:** unit regressions cover absent, stale, partially matching and ambiguous account/category labels, valid exact IDs/names and transfer destination. Demo browser flows on desktop/mobile prove unresolved account and category cannot post before choice and can post after selection; they retain the existing Ready and commitment paths. Transfer browser evidence proves the destination stays blank and selection alone does not mutate the ledger; its separate approval remains unavailable when source reconciliation cannot be loaded, so this slice does not claim an end-to-end transfer post.
- **Files/ownership:** `src/lib/inbox/review.ts` owns draft resolution, `src/components/inbox/inbox-review-panel.tsx` owns visible choices, their existing tests and Inbox browser test own evidence. No schema, parser version, provider, RLS, automatic posting or new store.
- **Rollback:** revert this branch/PR; candidate and ledger persistence formats are unchanged. Real user/device TTLT and correction impact remain unmeasured, so this slice cannot claim a general UX win.

### Save confirmation total — 2026-10-01

**Execution state:** evaluating in PR #736. **Permission scope:** branch_write; owner requested continued product development. **Canon:** Stage 0/1 truthful, understandable capture feedback.

- **Observed failure:** Dashboard and Quick Capture prepend the returned saved transaction even if an idempotent retry returned a row already in current state. The confirmation's monthly category total can then count the same transaction twice.
- **Expected behavior:** construct the confirmation ledger with the confirmed transaction once by ID. Preserve distinct transactions even when their amount/date/category match. Do not mutate the actual ledger or weaken save idempotency.
- **Evaluation/exit:** reproduce the replay overcount with a unit regression, verify confirmed-row precedence and distinct equal-value entries, run affected browser save flows, typecheck, full verification and required CI. No real-user speed improvement is claimed.
- **Ownership/rollback:** existing capture-consequence domain module and its two callers; revert this PR. No schema, provider, analytics payload or ledger-persistence change.

### Demo transfer follow-up — 2026-10-01

**Execution state:** evaluating in PR #735. **Permission scope:** branch_write; owner requested merge and continued product development. **Canon:** Stage 0/1 trustworthy capture, explicit demo provenance.

- **Observed failure:** a readable demo Inbox candidate ID is reused as its stable approval key, but transfer validation rejects every non-UUID key. UUID demo candidates instead trigger an authenticated source-plan action and are blocked by its unavailable response.
- **Expected behavior:** explicit demo review uses browser-local data only. A readable transfer key is valid only when it equals the nonempty Inbox candidate ID and the caller is in demo mode. Authenticated transfer validation retains its UUID requirement. Explicit destination selection posts one neutral transfer and preserves retry identity.
- **Evaluation and exit:** transfer-domain tests reject non-UUID authenticated/mismatched keys; desktop/mobile browser tests prove one exact transfer after destination selection. Full verification and CI must pass before merge; no claim of live authenticated or physical-device acceptance.
- **Ownership and rollback:** existing transfer validator/hook and Inbox review own the change; revert this PR. No schema, provider configuration, new store or automatic posting. The preceding field-choice PR remains separately reviewed.

### Recorded-month confirmation — 2026-10-01

**Execution state:** evaluating in PR #740. **Active role:** evaluator. **Permission scope:** branch_write. **Owner instruction:** continue development according to this plan. **Canon:** Stage 0/1 trustworthy, understandable capture feedback.

- **Observed failure:** the confirmation sums rows within the saved transaction's month but calls that period “tháng này”, including backdated and future transactions.
- **Specification:** identify the actual recorded month and year in the total, independently of wall-clock timezone. Invalid dates receive the plain confirmation without a misleading period total. Keep first-entry and transfer confirmations short.
- **Reuse/research:** internal defect; reuse existing date-only validator, category calculation and shared confirmation helper. No new external technology or financial guidance, so external research is not required.
- **Implementation plan/tasks:** update the existing helper, add December/January and malformed-date regressions, strengthen browser confirmation assertions, then run Node 22 typecheck, full verification and focused desktop/mobile browser tests plus required CI.
- **Exit/rollback:** saved-month labels agree with the summed ledger window; revert this bounded PR. No schema, provider, pattern learning, new analytics or ledger persistence change. Real-user capture speed remains unmeasured.

### Valid-date confirmation totals — 2026-10-01

**Execution state:** implementing. **Active role:** implementer. **Permission scope:** branch_write. **Owner instruction:** continue product development. **Canon:** Stage 0/1 trustworthy capture feedback.

- **Observed failure:** categoryMonthTotal accepts every date with the matching YYYY-MM prefix, including malformed or calendar-rollover dates from invalid history. Saved-date validation alone does not protect the total.
- **Specification:** only valid ISO calendar dates contribute to the recorded-month total. Preserve valid leap days, kind/category/split rules and idempotent-save handling. Skip malformed rows without altering or repairing their stored data.
- **Reuse/research:** internal deterministic defect; reuse isValidDateOnly and the existing total loop. No new dependency or external financial rule; external research is not required.
- **Implementation plan/tasks:** add malformed history and leap-day regression cases; run focused tests, Node 22 typecheck, full verification and the existing capture browser flow; require exact-head CI.
- **Exit/rollback:** invalid date fixtures cannot inflate totals while valid history is preserved; revert this bounded PR. No schema/provider/persistence or UX-performance claim.

### Image/OCR experiment boundary

Image support is a later separately approved experiment. It must:

- use explicitly supplied image/share evidence only;
- preserve source/provenance and OCR/parser version where supported;
- expose uncertainty;
- never infer account/category/transfer truth solely from OCR confidence;
- never write directly to ledger solely because OCR confidence is high;
- define retention/delete behavior.

The first Vietnam-relevant cohort should prioritize digital-payment screenshots / transfer confirmations before receipt line-item accounting.

### Nhập sao kê — bulk contract

Format priority:

1. CSV;
2. Excel where current tested parser behavior is trustworthy;
3. text-layer PDF compatibility fallback;
4. scanned/image-only PDF only under a separate OCR contract.

Required behavior:

- preview before candidates enter Inbox;
- explicit enough account/source mapping to preserve provenance;
- safe mapping memory only through approved persistence;
- bank categories remain evidence, not MoneyFlow category truth by default;
- duplicate handling accounts for coexistence with manual entries;
- transfer matching remains separately owned financial semantics;
- failed/partial import is recoverable/repeatable without silent duplicate ledger facts.

A future Counterparty foundation may normalize imported descriptions while raw source description remains provenance.

### Adapter boundaries

- Share Target remains optional transport and must have an equivalent in-app route.
- Keyboard dictation is preferred before MoneyFlow-owned STT/audio.
- No broad background SMS permission in the current product stage.
- No multi-turn transaction chatbot by default.
- Provider/bank sync remains strategically valid but separate from this packet's implementation authority.
- All assisted adapters converge on evidence → candidate → deterministic rules/matching → review/approved automation → existing ledger truth.

### Working IA experiment

Compare the current Capture hub against this candidate rather than assuming either is correct:

| Candidate action | Description                                                     | Job                |
| ---------------- | --------------------------------------------------------------- | ------------------ |
| **Ghi**          | `Ghi một khoản — nhập số tiền hoặc dùng cách nhập khác khi cần` | Single transaction |
| **Nhập sao kê**  | `CSV, Excel hoặc PDF sao kê để đưa nhiều giao dịch vào`         | Bulk acquisition   |

Inside `Ghi`, the working hierarchy is:

1. amount-first + released #596 behavior;
2. a small number of safe Frequent Patterns;
3. optional Counterparty/Payee when foundation is approved;
4. secondary `Mô tả giao dịch` mode for type/paste/keyboard dictation;
5. future image-evidence experiment.

Existing routes remain backward-compatible during any future experiment:

- `/capture/quick` → Ghi amount-first;
- `/capture/paste` → Ghi description/paste mode if consolidated;
- `/capture/upload` → Nhập sao kê;
- `/capture/share` → ingress bridge by evidence type;
- PWA shortcuts remain valid.

## Implementation plan

Implementation requires separate explicit authorization. The order below is a hypothesis-testing sequence, not automatic permission.

### Slice 0 — Baseline released Ghi

- measure #596 amount-first TTLT, taps and correction on representative physical phones;
- include first-time, weak-history and stable-history cohorts;
- capture privacy-safe baseline only.

### Slice 1 — Frequent Patterns prototype

- add the smallest reversible prototype capable of proving/disproving H2;
- show only a small number of coherent patterns;
- do not copy amount/note by default;
- preserve Save, idempotency, transfer and correction semantics;
- benchmark against the released #596 control.

### Slice 2 — Counterparty/Payee foundation decision

- inventory current candidate/source merchant fields, rules, export/archive/restore implications;
- define canonical identity versus raw evidence;
- benchmark terminology/search/favorite value if possible before schema;
- if durable persistence is justified, create a separate Class 3 packet with migration, RLS, backup/export/restore, rollback and exact-head database evidence.

#### Slice 2 inventory — what already exists (verified at `8da3c59b`, post-#673/#710)

The ledger already owns a first-class `payee` end to end; Slice 2 must not
re-propose it. Chain of evidence:

- **Source/evidence layer:** `inbox_candidates.merchant` (≤200, editable in
  review) is raw evidence; it is _not_ destroyed at commit anymore.
- **Candidate → ledger:** `approve_inbox_candidate` persists the _reviewed_
  merchant into `financial_transactions.payee`
  (`src/lib/inbox/review.ts:433`); batch path falls back to the stored
  candidate merchant.
- **Ledger field:** `financial_transactions.payee text not null default ''`,
  `check (char_length ≤ 200)` — migration `20260922120000` (merged in #673,
  `64daef39`). `p_payee` on `create`/`update_money_transaction` and
  `create_split_expense`; `pay_recurring_commitment` and
  `record_recurring_income_template` stamp the commitment/template name;
  transfers keep `''`. Reconciled-guard excludes `payee` — it is editable
  metadata, not reconciliation truth.
- **Rules engine:** merchant-field rules evaluate the _typed_ payee to fill
  the draft category with attribution; rules never rewrite payee text
  (`src/lib/inbox/apply-rules.ts:220`).
- **Search:** folded-diacritic haystack includes `payee` in both the UI filter
  (`src/lib/transaction-filters.ts:86`) and the `transactions.search`
  capability + golden.
- **Reports:** page-facing `payees` breakdown exists — expense grouped by the
  **exact trimmed spelling** (`src/lib/reports.ts:425-441`). The code comment
  pins the design rule: _search folds; a ledger breakdown does not_. The
  field is deliberately projected out of the capability contract pending a
  schema/version decision (`src/server/capabilities/reports-financial.ts:127`).
- **Capture-time assists:** `derivePayeeSuggestions` (datalist),
  `deriveRecentPayees` (chips), `deriveCanonicalPayeeOffer` (a typed
  folded-twin is offered the stored spelling — an offer, never a rewrite),
  `derivePayeeCategorySuggestion` (payee→category memory; most recent
  reviewed row; recurring rows stay valid evidence here by design)
  — all in `src/lib/quick-add-defaults.ts`.
- **Archive/export/restore:** generation `20260922120000` layer
  (`src/lib/archive/payee-archive-*`) now wrapped by goal-linkage generation
  `20260924120000`; legacy generations still validate/restore.

What does **not** exist:

- no canonical counterparty entity — `payee` is per-row free text;
- no cross-row alias/normalization — `Grab`, `GRAB Vietnam`, `grab` remain
  distinct stored spellings; the canonical-spelling offer only exists at
  capture time as an opt-in;
- no retro-merge/rename path (cannot fix N historical spellings in one act);
- no payee favorites/pinning;
- no payee inside frequent-pattern keys (Slice 1 deliberately derives
  `kind + account + category` only);
- no payee in the capability contract surface (page-only today);
- no household/shared counterparty semantics.

#### Slice 2 decision memo — position for owner review

**What current capability already covers (no new schema needed):**

1. "Where did I spend at X?" — search + `payees` breakdown answer this today.
2. "How do I file X next time?" — payee→category suggestion + merchant-field
   rules already reduce the recurring filing decision.
3. "Keep spellings consistent going forward" — the canonical-spelling offer
   plus datalist cover the _incoming_ edge.

**Gaps with real evidence:**

- Spelling drift already stored in history cannot be reconciled — reports
  split `grab`/`Grab`/`GRAB Vietnam` into separate rows and there is no
  merge tool. Evidence: grouping is exact-spelling by design; no rename
  RPC exists.
- Pattern chips cannot express "coffee at _this_ shop" — Slice 1 keys
  exclude payee by design; whether users actually need payee-scoped
  patterns is a hypothesis for Slice 3, contingent on H2/H3 benchmark
  survival — not yet evidenced.
- API/MCP consumers cannot read the payee breakdown — capability contract
  excludes it pending a schema/version decision.

**Questions the owner must answer before any Class 3 packet:**

1. Is historical spelling drift a real user pain (worth a merge/rename
   feature) or cosmetic (exact-spelling reports are honest and fine)?
2. Should counterparty become a _canonical entity_ (id + alias table +
   retro-merge + favorites) or stay _raw evidence + capture-time offers_?
   The entity path is a Class 3 schema decision with RLS/backup/rollback
   obligations; the evidence path may only need a merge tool + surfacing
   `payees` in the capability contract.
3. Terminology: Vietnamese UX says "nơi giao dịch" — is "counterparty"
   ever user-facing or strictly internal?

**Recommended default (holds until evidence says otherwise):** keep
`payee` as raw evidence + capture-time offers; evaluate the merge/rename
tool as the cheapest durable fix for drift; defer canonical entity until
Slice 3 evaluation proves payee-scoped patterns/favorites are wanted.

### Slice 3 — Frequent Patterns + Counterparty integration

Only if H2/H3 survive evaluation:

- allow patterns/favorites to include optional canonical counterparty;
- add deterministic alias/category-rule behavior through the existing rules owner or an explicitly planned extension;
- measure correction and maintenance reduction.

### Slice 4 — Description mode experiment

- reuse current deterministic parser/preview for type, paste and keyboard dictation inside Ghi;
- benchmark by cohort against amount-first and patterns;
- do not promote to a top-level `Ghi thông minh` destination without evidence.

### Slice 5 — IA decision

Use benchmark evidence to choose among at least:

- current three-item hub;
- `Ghi` + `Nhập sao kê` primary model;
- a distinct assisted-capture destination if a genuinely separate user job/performance advantage is proven.

### Slice 6 — OCR experiment

Only after owner approval and meaningful evidence demand:

- choose OCR engine/provider/local processing;
- define image retention/deletion;
- test Vietnamese payment/transfer screenshots first;
- compare TTLT and correction burden against type/paste/manual.

Statement-import hardening may continue in parallel where ownership does not conflict: mapping memory, provenance, replay/idempotency, duplicate handling, Vietnam bank export compatibility and exception-first review metrics.

## Tasks

- [x] Inspect current capture routes/parser/Inbox/PWA behavior before changing the specification.
- [x] Reconcile PR #596 as merged/released truth and production-ready baseline.
- [x] Reclassify historical repeat-last work as non-authoritative exploration, not a rejected user need.
- [x] Expand market research beyond YNAB/MDN to Actual, Lunch Money, Wallet, Copilot and MoMo official sources.
- [x] Replace fixed `Ghi nhanh / Ghi thông minh / Nhập sao kê` decision with explicit hypotheses.
- [x] Specify `Single transaction = Ghi` as the primary IA hypothesis.
- [x] Add Frequent Patterns hypothesis with amount/note not silently copied.
- [x] Add Counterparty/Payee foundation with source-provenance separation and no schema authorization.
- [x] Keep description/paste/dictation as a benchmarked Ghi mode rather than fixed top-level concept.
- [x] Preserve OCR/STT/SMS/provider boundaries as later adapters/experiments.
- [x] Define TTLT benchmark cohorts and privacy-safe measurements.
- [x] Preserve backward-compatible routes/PWA entry points as a future implementation requirement.
- [ ] Human owner reviews/edits the specification.
- [ ] Any runtime implementation receives separate bounded authority.

## Evaluation

### Product evaluation

The revised specification deliberately separates **fixed safety constraints** from **market/product hypotheses**.

Fixed safety constraints:

- #596 stable-default and immediate-correction behavior remains current authority until separately changed;
- explicit manual Ghi keeps one trusted ledger mutation owner;
- assisted evidence does not bypass candidate/review/approved automation boundaries;
- no second ledger;
- raw source evidence is not replaced by canonical Counterparty/Payee identity;
- transfers keep existing financial semantics;
- no raw financial payload in analytics;
- no dedicated STT, background SMS, standalone OCR, probabilistic category autopost or broad provider sync is authorized here.

Hypotheses awaiting benchmark:

- `Single transaction = Ghi` is a better mental model than separate `Ghi nhanh`/`Ghi thông minh` concepts;
- Frequent Patterns are the best next manual-capture enhancement after #596;
- Counterparty/Payee is worth durable data-model cost;
- description/paste/dictation is faster for some cohorts while remaining inside Ghi unless a distinct concept proves necessary;
- direct evidence acquisition eventually reduces more maintenance than richer manual forms.

### Metrics

Primary metric: **Time to Trusted Ledger Transaction (TTLT)** from intentional capture start to a state the user can reasonably rely on.

Supporting metrics:

- active seconds per accepted transaction;
- taps/keystrokes;
- accepted-without-correction rate;
- wrong-default/pattern correction rate;
- counterparty correction/normalization rate;
- abandonment and unresolved rate;
- manual interventions per 100 observed transactions;
- maintenance minutes per active user/month;
- acquired-versus-retyped share;
- duplicate/replay correction burden;
- correction within 60 seconds after save.

Privacy-safe timing may record event/mode/rank enums, but never amount, note, raw merchant/counterparty, raw SMS, raw OCR, account number or receipt image.

Benchmark cohorts before permanent IA/mode promotion:

1. repeated transaction with #596 stable default;
2. repeated transaction with multiple plausible patterns;
3. novel one-off transaction with several fields;
4. pasted bank/wallet/SMS evidence;
5. first-time/weak-history user;
6. statement import large enough to measure amortized effort;
7. image evidence only when OCR is active.

Compare at minimum: released #596 Ghi, Ghi + Frequent Patterns, typed description, keyboard dictation, paste/share, statement import, and OCR only when separately active.

Do not invent numeric promotion thresholds before collecting the baseline.

### Current CI findings

Initial PR head failed `git diff --check` because the handoff used Markdown trailing-space hard breaks. That hygiene defect was removed.

On revised head `d5159976bb7bc282e241235e87d35c5eccefd98e`, CI #3750 confirmed:

- diff hygiene: pass;
- migration identity: pass;
- database gate: correctly classified not required;
- project knowledge: fail only because this packet lacked the repository-required standard headings and PR #597 lacked its own PR-memory record.

The later exact-head check on `3ebb5ece820f55a28b016763f1ec2d5a89d9f68f` confirmed the PR-memory record and five standard lifecycle headings were recognized; the only remaining knowledge-contract blocker was the missing top-level `## Repository reconnaissance` heading. This revision adds that heading without changing the product direction. Exact-head CI remains required before review-ready status.

### Unverified claims

- TTLT improvement from Frequent Patterns versus released #596 has not been measured.
- Counterparty/Payee terminology, data model and migration strategy are unselected.
- TTLT improvement of description/dictation versus amount-first Ghi is unmeasured.
- The two-primary-job Capture IA has not been tested on physical devices/users.
- OCR engine/provider choice is unselected.

### Rollout / rollback requirements for future implementation

- measure released Ghi before changing IA;
- ship Frequent Patterns separately from durable Counterparty schema where possible;
- keep old routes compatible while hypotheses are tested;
- first pattern prototype should be revertable without data migration;
- durable Counterparty persistence requires explicit reversible migration/archive/export handling;
- IA/adapters must be disableable without rewriting accepted ledger truth.

### Next allowed action

Owner reviews/edits this specification. After explicit implementation authorization, begin with baseline measurement and the smallest reversible Frequent Patterns experiment. Counterparty schema work, permanent IA changes, OCR/STT/provider work require separate bounded authority.
