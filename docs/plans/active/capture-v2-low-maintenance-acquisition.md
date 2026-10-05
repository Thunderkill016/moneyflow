# Capture V2 — low-maintenance transaction acquisition

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** human owner; research and specification by OpenAI agent
**Branch:** `plan/capture-v2-spec`
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet defines Capture V2 product hypotheses, safety boundaries, benchmark requirements and a possible delivery sequence. It does **not** authorize runtime implementation, schema changes, provider integration, production writes or merging.

## Bounded execution — paste inside Ghi (2026-10-05)

- **Current execution state:** evaluating on `feat/ghi-inline-paste-20261005`, based on main `aa67d59c`.
- **Active responsibility:** implementer; scope authorized by the owner's explicit request to research and integrate paste into Ghi. Other Capture V2 experiments remain unapproved.
- **Observed failure:** owner could not find paste in the production Ghi surface. Main opens an amount-first dialog; paste requires a separate route behind advanced navigation.
- **Canon gate:** Stage 0/1 Financial Reality / Low-maintenance Reality, existing deterministic evidence acquisition with explicit review.
- **Risk class:** Class 2, bounded shared Ghi UI integration. No new parser, ledger semantics, schema, bank connectivity, AI, OCR, or provider changes.

### Focused research and decision

1. [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports keeping the common entry path focused and exposing secondary capabilities deliberately. Application: amount-first stays default; a visible input-method switch offers paste; source/rules stay collapsed. This does not prove MF task speed or justify hiding acquisition behind another product section.
2. [W3C error prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) explains review/correction/reversibility for consequential submissions. Application: reuse paste preview and pending Inbox review; do not auto-post. The guidance does not demand an extra confirmation for every ordinary manual record, and this change is not a WCAG compliance claim.
3. Repository-primary evidence: `AddTransactionDialog` is shared by dashboard, transactions and quick capture; `CapturePastePage` owns deterministic parsing and pending-candidate creation. Extract one reusable paste form and reuse its exact mutation owner in both surfaces.

No new package or external runtime is required. Existing AGPL application ownership applies; sources inform design only, no third-party code is copied. Raw text remains in component state and existing explicit pending-candidate provenance; no new telemetry or draft storage collects it. Rollback restores the pre-change UI while leaving existing candidate data and standalone routes intact.

### Acceptance and bounded plan

- All three existing Ghi hosts expose `Nhập số tiền` / `Dán giao dịch` in the same dialog. Initial amount focus and manual save remain unchanged.
- Switching methods preserves unsaved manual amount/details and pasted text/preview within the open session; returning to manual focuses amount.
- Paste focuses its labelled textarea, supports malformed-input recovery, preview/correction, optional source/rules and explicit account choice. Parsed uncertainty remains visible.
- Only the active method exposes its action. While parsing/saving, mode switches and modal dismissal are locked.
- Parsed evidence creates pending candidates through the existing client Inbox adapter, never through the manual ledger mutation; successful save opens Inbox.
- Existing `/capture/paste` remains compatible and reuses the same form.
- Add browser regressions for all three hosts, draft preservation, invalid text, preview and pending-versus-ledger boundary; check constrained phone, keyboard, text scaling and WebKit with synthetic demo data.
- Run typecheck, lint, domain/static gates, build and selected browser/audit gates; record exact evidence before PR handoff. Human physical-device speed and authenticated production remain unverified until exercised.

### Tasks and evidence

- [x] Verify current main, existing manual hosts and standalone paste owner.
- [x] Focused research and bounded spec before code changes.
- [x] Implement shared paste form and Ghi input-method switch.
- [x] Add/run all three host regressions on desktop/phone (six cases); inspect constrained-phone paste layout.
- [ ] Record PR provenance, exact-head checks and owner handoff.

### Bounded release authorization (2026-10-05)

Owner approved the proposed commit/push/PR, exact-head CI, squash merge and main
production deployment ("có sửa luôn rồi đưa lên"). This applies only to the
implemented paste-inside-Ghi slice and the import/trust invariant release in
`2026-10-05-import-trust-invariants.md`; the broader Capture V2 specification
remains unapproved. No DB, secrets, Auth or protection changes. Read-only
production verification follows deployment. Retain the ready base-main deployment
for a separately approved rollback if a regression is found.

Pre-release evidence: combined demo smoke 44/44; full unit 2000/2000, CI-policy
191/191, clean typecheck/lint and static contracts. The parser's calendar-as-money
defect found by the new Ghi cases was fixed with four domain regressions and
`paste_text@1.2`; details and failed-run disposition belong to the import/trust
packet. Embedded paste preview/focus/idle Escape is covered in the existing
critical-browser matrix. Selected local build/responsive audit is running (86
cases); PR #759 final-head CI and production verification remain pending. This
does not establish authenticated production writes or physical-device usability.

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

### Explicit amount roles in pasted evidence — issue #753, 2026-10-03

**Execution state:** integration verification for PR #754. **Active role:** verifier. **Permission scope:** owner-authorized merge and bounded branch integration. On 2026-10-04 the owner requested merging #754 and #756; #756 merged first at `f72037a0`. Original #754 exact-head CI passed at `82947ba1`; updating the parser branch to released main requires fresh CI. Previous instruction: merge #752, then continue research/development. #752 is merged as `d1abf20b`; its post-merge main CI `37101966653`, CodeQL and secret scan passed. This work starts on `feat/paste-labelled-amount-20261003`. Class 3 financial parsing. Current backlog and delivery evidence: GitHub issue #753 and PR #754, not this packet's historical task lists.

Outcome: users pasting a clearly labelled transaction should not need to replace an incorrectly suggested closing balance or fee. Serves CANON Stage 0/1 Low-maintenance Reality, CFPB day-to-day control and GOV.UK whole-service simplicity. This is a measured defect in an existing source, not a new acquisition channel or navigation redesign.

Reconnaissance: `parse-text.ts` ranks money-marked tokens before bare identifiers and then selects the first within that tier. On three labelled synthetic probes, expected transaction amount 250000 VND: balance-first proposes 3450000; fee-first proposes 2000; transaction-first proposes 250000 but still marks amount uncertain. All results remain candidates, not ledger writes. These probes establish structural parser behavior only, not real bank format support or physical-phone effort.

Reuse: the existing parser, its tests, paste preview, rules, Inbox, source matching and ledger/reconciliation. No new parser abstraction/file, dependency, service, schema, migration, provider setting, telemetry or auto-posting policy. Account/category/date/kind rules remain owned by their current modules.

Research checked 2026-10-03, three focused primary sources:

- [Actual import](https://actualbudget.org/docs/transactions/importing/) supports explicit mapping and manual/import coexistence. Its imported-date overwrite and deleted-row reimport policies are not adopted.
- [W3C error prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) supports checked/correctable or reversible important data submissions; it does not require a confirmation for every simple save. This does not authorize MF auto-posting.
- [GOV.UK Check answers](https://design-system.service.gov.uk/patterns/check-answers/) supports clear review and correction where needed; it does not establish SMS grammar or MF usability. Exact label grammar is a bounded local specification, not inferred bank documentation.

Specification before code:

- Recognize money-marked tokens immediately preceded by a complete explicit `GD:`, `Giao dịch:` or `Số tiền giao dịch:` field (colon/equal sign, folded Vietnamese, case-insensitive). Unknown qualifiers such as `Mã giao dịch:` are not these fields. Do not turn a bare account/reference number into authoritative money from a suffix label alone.
- Recognize `SD:`, `Số dư:` and `Phí:` / `Phí giao dịch:` as non-transaction amount roles. A label inside an explicitly marked note/description field is not transaction evidence. Conservatively, all text after a note marker remains note evidence even if it contains separators; later real fields do not override this boundary and retain the existing uncertain fallback.
- If exactly one transaction-labelled token exists, select it regardless of order. Clear amount uncertainty only if all other money-marked competitors are explicitly balance/fee roles. Multiple transaction-labelled tokens or any unclassified money-marked competitor keep amount review, even if values happen to agree.
- With no transaction-labelled amount, preserve the existing marked-token/order fallback and review behavior. Do not reinterpret amounts without evidence or promise generic supported-bank coverage.
- Preserve original token sign and original raw evidence; kind/date/merchant uncertainty stays intact. Candidate persistence and ledger posting policy are unchanged.

Evaluation: frozen synthetic transaction/balance/fee permutations including debit and credit, accented/unaccented labels, bare account/date fragments, unknown extra amount, repeated transaction labels, equal-valued separate amounts, quoted note labels, missing/conflicting dates and unchanged unlabelled text. Browser paste → preview → Inbox must preserve correct amount, raw evidence and unresolved ambiguity without automatically creating a ledger row. Compare the original and candidate on the same corpus; no human speed percentage is claimed.

Evaluation snapshot: three frozen proposals improve from 1/3 correct amounts to 3/3; this is synthetic grammar behavior, not source-coverage or user-effort evidence. Final Node 22 focused parser 28/28 and full domain 1982/1982 passed; CI policy 191/191 and typecheck/lint/knowledge/architecture/capability/CSS/migration identity checks passed. Initial browser execution was interrupted for concurrent load; the subsequent cold paste test exposed input entered before React attached `onChange`, leaving the analyze button disabled. The test now observes the controlled form accepting its value; the final-tree suite passed 18/18 with zero retries. Final source review identified quoted labels across note separators; the seventh new regression now preserves uncertainty in that case. Initial draft CI correctly rejected the absent PR-number-specific memory record; it is added after PR allocation, without weakening the policy. Exact-head verification remains pending.

Integration specification/evidence — 2026-10-04: preserve the default-closed source/rule disclosure from merged #756 and all #754 amount/ambiguity/raw/pending cases. Git automatically retained the disclosure assertion; the only manual conflict is the renamed hydration-timeout constants in the shared rule helper. Reuse #754's existing `FORM_*` constants for both forms, with unchanged values. No parser or application change is needed for conflict resolution. Verify clean typecheck/lint, parser/domain tests, existing desktop/mobile rule journeys and paste safety matrix on the combined tree; format before the integration commit, push only the parser branch, require fresh exact-head CI before merge and final main CI after merge. No production/provider write is authorized.

Separate product finding: issue #755 records the existing paste route's missing stylesheet declarations and bare control layout observed in the browser. Functional parser evidence does not establish visual quality; confirm stable rendered geometry and reuse existing UI owners in a separately scoped repair before widening acquisition.

Selected gates: focused and full domain tests, typecheck/lint/build, knowledge/architecture/capability/CSS/migration identity/CI policy, zero-retry existing desktop/mobile paste browser tests, exact-head CI/CodeQL/secrets. Database truth and layout do not change, so database reset/responsive audit are not applicable to this diff; post-merge #752 main CI remains a separate full-stack prerequisite. No production write or participant outcome is produced here.

Risks: mistaking a note for a field → note guard and adversarial regressions; silently treating two transactions as one → keep amount review for multiple labels; dropping known uncertainty → kind/date and unknown-competitor regressions; no-label compatibility → existing suite unchanged. Rollback: revert parser/tests; stored candidates and ledger schema stay compatible. Source input text is synthetic in repository tests; private evidence is not committed or logged.

Tasks: pin failures → implement contextual selection → run frozen/domain/browser evidence → independent diff review → exact-head verification → owner handoff. Next allowed action: bounded branch implementation and PR delivery. Further source adapters and merge/deployment of the next PR require their applicable scope decisions.

### Post-merge statement selector repair — 2026-10-04

Execution state: evaluating; active role: verifier; scope: bounded test repair supporting the owner-authorized #754/#756 merge. Both are merged; final main `7a1d4bff` CI `37149210543` failed the desktop statement assertion before CSV upload. Log evidence: `getByText(accountName, exact)` resolves to the account h3, two transfer options and a summary strong. Phone completed the actual statement journey; reset/pgTAP and archive producer/restore passed. This is an unchanged pre-existing selector ambiguity, not a demonstrated parser/ledger regression.

Class 1, test-only. Reuse the existing account-card h3 and statement test. Replace only the broad name assertion with role heading, level 3, exact account name. Preserve strictness (no first()/catch/retry), account persistence/other-tenant isolation, CSV posting, re-import, provenance, balance, reconciliation and corruption checks. No application/schema/CI/provider change. Exit: clean typecheck/lint, own PR provenance, exact-head PR CI plus a fail-safe manual CI run on this branch selecting the real disposable database/statement suite; then owner-authorized integration and fresh main read-back. Local Docker/Supabase are unavailable; never replace real database acceptance with a synthetic double. Rollback: revert only the assertion and bounded documentation. Main's earlier 1440px onboarding retry remains a separate observed issue; this repair does not claim to fix it.

### Owner direction — broad acquisition without paid AI or bank partnerships, 2026-10-03

The owner explicitly prioritizes practical ways to collect spending from many sources with a simple, understandable interface. No paid AI or bank partnership is available as a foundation. This updates the research priority, not the authority to implement a native service, change financial posting policy or deploy. CANON authority: CFPB day-to-day control, Stage 0/1 Low-maintenance Reality; GOV.UK whole-service simplicity and measured iteration. Maintain one acquisition/review/ledger path and upgrade existing surfaces.

**Product promise:** bring the evidence the user can access into one trustworthy record with less retyping. “All transactions” is the coverage goal, never a claim that MF can see activity the user has not provided. Cash, inaccessible app activity and missing statements remain explicitly incomplete. Account reconciliation can detect a discrepancy; it cannot reconstruct absent spending details.

#### Practical source sequence

| Priority                              | User evidence and action                                                                            | Existing owner / research boundary                                                   | What must be established before expansion                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First: reliable common path           | Cash or missing purchase: enter amount, retain confirmed context, save/correct                      | Existing Ghi and continuous-entry preference                                         | Correct amount/account/category; offline/retry/correction; optional reusable patterns must reduce total effort                                                                                   |
| First: bulk evidence                  | Bank, card, wallet or another finance app: choose an exported CSV/Excel; text-layer PDF fallback    | Existing upload, mapping presets, source adapters, import preview and reconciliation | Each supported format has evidence-backed mapping, explicit skipped/invalid rows and safe repeat import; do not label every bank supported                                                       |
| First: lightweight evidence           | Copy a transaction message, SMS text, email receipt text or digital payment description, then paste | Existing deterministic text parser, rules and candidate review                       | Disambiguate transaction amount versus balance/fee, date, account and income/expense/transfer; no automatic SMS/email reading implied                                                            |
| Next: reduce switching                | Share supported text/files from another app                                                         | Existing PWA Share Target with in-app paste/upload fallback                          | Actual OS/browser installation and sharing proof; MF may only receive content the source app exposes                                                                                             |
| Research after common-path acceptance | Screenshot, receipt photo or scanned PDF                                                            | Existing image/OCR experiment boundary; no shipped OCR claim                         | Compare user-supplied extracted text with local OCR on real supported devices; establish runtime size, latency, Vietnamese accuracy, privacy, licence and maintenance before selecting a library |
| Optional device research              | iPhone shortcut receiving shared text/files; Android notification adapter                           | OS-specific adapters into the same candidates                                        | Real-device feasibility, permission/retention controls and owner-approved native scope; no generic cross-platform notification or SMS access claim                                               |

Email starts with user-selected text or downloaded attachments. Mailbox OAuth, scheduled inbox scanning and forwarding infrastructure are separate cost/privacy/security work, not prerequisites. Voice starts with the user's keyboard dictation followed by the same text parsing; MF does not promise device recognition accuracy or build its own speech service now. Payment QR codes are not evidence that a payment completed. A scheduled bill is an expected obligation until payment is confirmed.

#### One understandable journey

Keep the current two-job IA hypothesis: **Ghi** for one transaction and **Nhập sao kê** for many. Paste, share and later images are entry methods, not another set of product sections users must learn. The existing hub remains the released control until a task comparison supports changing it.

All sources converge on evidence → parsed proposal → known fields and missing fields → matching → targeted review → existing ledger → correction/reconciliation. An exact replay may reuse proven source identity. A similar date/amount/payee is only a possible match: it must not erase two genuine equal-value purchases, overwrite a reviewed date or turn a transfer into spending. A manual entry followed by its SMS and statement must be compared as one possible event with several pieces of evidence, using existing matching owners rather than a second ledger. No new auto-posting policy is adopted here.

The financial no-guessing rule supports speed: prefill explicitly extracted facts and user-confirmed rules, keep unresolved material fields editable, and ask only for the missing consequential information. A clear manual save does not need another universal confirmation page. Preserve source evidence and explain suggestions in ordinary language. For example, “Thiếu tài khoản” is actionable; a parser confidence score is not a useful user instruction by itself.

Category completeness is a separate current owner pain. The flat 8 expense/3 income defaults and custom categories remain implemented truth. Audit the owner's actual purchase types and search/alias/custom-category discoverability before choosing broader defaults or a hierarchy; increasing taxonomy size must not increase time spent categorizing every payment.

#### Delivery and decision gates

1. Close the current correctness/capture defects in #752 with exact-head verification; these repairs are prerequisites, not proof of broad acquisition success.
2. Evaluate one connected common-path package: manual cash entry, repeated context, pasted payment evidence, statement import, repeated import and reconciliation. Include the same purchase arriving by several sources, two separate equal purchases, wallet top-up/card settlement, invalid dates, amount-versus-balance confusion and interrupted/retried import. Existing candidate, source-identity, mapping, rules and reconciliation modules own the implementation.
3. Choose the largest observed effort/coverage gap from that comparison for the next bounded GitHub issue. An additional parser/template is justified only by actual format evidence; private owner material stays local, and synthetic fixtures remain labeled. Add share/shortcut/OCR only when it improves this connected journey enough to justify its setup and maintenance.

Acceptance measures: correct unique ledger events divided by the known events in the supplied reference evidence; missed/duplicate/wrongly merged events; amount/kind/date/account correctness; user corrections and fields touched; time from obtaining evidence through a correct saved record including cleanup; weekly maintenance time; setup effort and failure recovery. Coverage denominators are explicitly bounded to provided evidence, not an invented view of all personal finances. Compare against current MF on the same tasks; automated timings are a machine baseline, not user evidence. No target improvement percentage or human outcome is claimed before measurement.

Resource gate: no mandatory paid inference or bank contract, but free services and local processing still consume storage, compute, bandwidth, battery and maintenance. Measure per-import size/time, offline behavior, hosting quotas and data retention; show supported-source limits and a recoverable fallback. Do not put financial text or credentials into shortcut URLs/logs, collect full financial payloads in analytics, request bank passwords or scrape private banking sessions. No dependency or provider is selected by this research.

Focused sources, checked 2026-10-03:

- [Actual Budget importing](https://actualbudget.org/docs/transactions/importing/): reusable patterns for file mapping, identifier-first matching and manual/file coexistence. Its imported-date overwrite and deleted-row reimport policies are not adopted by MF.
- [MDN share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target): installed-PWA text/file ingress, limited browser availability and input validation. It does not establish MF physical-device coverage.
- [Apple Shortcuts input types](https://support.apple.com/en-mide/guide/shortcuts/apd7644168e1/ios): shortcuts can receive content exposed by a sharing app. It does not grant arbitrary access to another app's transactions or notifications.
- [Android NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService): a native notification service exists with manifest/service requirements and device/profile restrictions. This is feasibility evidence for a separate native study, not a web capability or permission to build it now.

Next allowed action: finish the existing audit PR and prepare the connected acquisition evaluation against released MF. Expanded adapters require a scoped researched contract and acceptance evidence; merge/deployment remain separately authorized operations.

Implementation requires separate explicit authorization. The order below is a hypothesis-testing sequence, not automatic permission.

### Paste workspace usability repair — issue #755, 2026-10-04

**Execution state:** merged in PR #756 at `f72037a0` after CI `37147280867`, CodeQL and secrets passed at `81854ca3`. **Active role:** integrator. **Permission scope:** owner-authorized merge on 2026-10-04. The owner reviewed the phone edit screenshot and chose to keep the disclosure. Post-merge main verification remains distinct from PR-head acceptance. Original continuation advances the observed #755 UX defect in the existing acquisition path. Class 2, one route; branch `fix/paste-workspace-usability-20261004` from current main. #754's financial parser stays a separate open, exact-head-verified candidate (`82947ba1`, CI `37103107323`); this UI repair does not merge or change that parser.

Outcome: paste a message, understand its preview and put it in pending Inbox using legible controls on a phone. CANON Stage 0/1 low-maintenance reality and the owner's simple/understandable product direction. Existing `capture-paste-*` markup references removed global styling; the shell remains styled but label, textarea, source choices and actions are bare. Nearby capture chooser already owns its CSS module; restore the missing route owner rather than add legacy/global overrides or redesign navigation.

Focused research checked 2026-10-04:

- [GOV.UK textarea](https://design-system.service.gov.uk/components/textarea/) supports a visible label above a multiline field, hint/error association and usable width. Reuse these principles and native textarea; its generic example's ban on financial information does not fit MF's authorized financial input. No code/package is copied.
- [W3C enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) supports 44px targets; MF already selects this product target, rather than claiming all inline links require this AAA criterion.
- [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) supports usable content without two-direction scrolling. Verify narrow viewports and text enlargement; this does not establish physical-device acceptance.

Specification: keep current phase/state/mutation/parser owners. Use local route CSS, existing semantic tokens, shared Button/LinkButton and SelectField. Place label above a full-column resizable textarea, give source/rule choices clear grouping and touch targets, retain one local primary action per phase. Source/rule preferences sit in a native details disclosure, closed initially, so the default mobile screen concentrates on input and Analyze; opening/editing them preserves existing state/defaults. This follows MF's progressive-disclosure law without removing controls. Keep complete signed amount, warnings in text and accessible names, hint/error/focus associations, masked raw evidence and explicit pending-only review. Long merchant/snippet values wrap; edit/error/preview work in light/dark, keyboard and enlarged text. No palette, parser, taxonomy, financial semantics, provider, telemetry or navigation redesign.

Evaluation: pin hydrated label/field/control geometry before implementation, capture screenshots, then run the same error → corrected input → preview → pending Inbox journey and long-content reflow. Reuse existing safety-review, text-scale, WCAG and keyboard audit owners. Selected gates: typecheck/lint/unit/build/contracts, focused desktop/mobile functional flow, responsive 320/360/390/768/1024/1366/1440, dark and WebKit, 200% text, keyboard, axe and screenshot review; final exact-head CI/CodeQL/secrets. Database reset is not selected because financial/database truth does not change. No claim of WCAG conformance or phone timing follows from automated checks.

Evaluation snapshot: baseline failed the same geometry assertion on 320/390/1366 after hydration (label bottom 500/500/462px, textarea top 304/304/266px). The first route-owned repair passed six error/preview/long-text cases across those widths. Visual review then found optional source/rule controls displaced Analyze on mobile; the specification now progressively discloses them. The final disclosure matrix passed 26/26 with zero retries: seven widths, dark, WebKit, enlarged text, keyboard and light/dark axe. The deterministic-rule desktop/mobile suite passed 14/14 with zero retries, including default rule application while preferences are closed. Final phone edit, dark preview and 320px enlarged long-amount screenshots were inspected; complete amounts wrap rather than truncate. These are synthetic browser results, not physical-phone or human timing evidence. CI policy 191/191 passed. Node 22.23.3 is restored after the old temporary runtime disappeared; final full domain 1975/1975 (zero skipped), production build, typecheck/lint and knowledge/architecture/capability/CSS checks passed. UI ownership diff check passed after rerunning with subprocess permission (sandbox-only `spawnSync git EPERM`); it reports zero violations. PR #756 final exact-head CI remains pending. Its initial policy run lacked the own-number PR record, now supplied. Production-bundle ownership also correctly rejected 27 stale debt allowances after the route repair; exactly those retired entries were removed and the unchanged gate now passes (184 allowances remain, zero new/stale entries). Four literal test-hook classes remain for compatibility, while their elements use local module owners. A read-only three-way merge check with #754 found an overlapping test assertion; resolve that integration when separately authorized, preserving the default-closed preference regression and #754 financial cases. Docker/Supabase are absent locally; the actual UI diff does not select a database reset. No provider or production evidence is claimed.

Risks/rollback: local styles must not affect shell or other routes; shared button composition must preserve disabled/pending semantics; preview never posts. Keep all content synthetic and out of analytics/repository screenshots. Roll back component/local module and its route tests, without a persisted-data migration. Handoff: verify the bounded diff and owner-review screenshots before merge; merge/deployment remains a separate owner decision. Further source adapters stay out of this packet.

### Owner-requested delivery program — 2026-10-01

**Execution state:** planned; candidate for owner review. **Active role:** planner. **Permission scope:** branch_write for planning. **Owner instruction:** develop a sustained plan rather than a sequence of isolated fixes. This section translates the existing product strategy into coordinated delivery; it does not replace CANON, PRODUCT_STRATEGY or PRODUCT_METRICS. GitHub milestones/issues own execution status. Calendars below are capacity assumptions, not promised delivery dates or automatic release gates.

#### Program outcome and horizon

Within a proposed 12-week cycle, make one complete daily/weekly money workflow dependable and cheaper to maintain: set up represented accounts → record cash or acquire statement activity → resolve exceptions → reconcile → understand the period → correct/export. A user should understand what is known and what still needs attention without learning accounting or the implementation pipeline.

The primary cohort remains digitally banked Vietnamese individuals using multiple payment channels. First-time users, cash-heavy users, mixed-account users and users returning after a gap must all be represented in evaluation. This cohort is a working product hypothesis; recruit and verify fit rather than implying interviews have occurred.

Product character: one clear primary action per screen, Vietnamese language, amount-first manual capture, progressively disclosed detail, explicit unresolved financial facts, correction and recovery in the same task. “Apple-like” means coherent, understandable, dependable interaction; it does not authorize visual imitation or a second design system.

#### Delivery phases

| Phase / proposed window                          | User outcome                                                                                   | Connected work package                                                                                                                                                                                                 | Acceptance / decision                                                                                                                                                                                                  | Dependencies                                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A — weeks 1–2: baseline and release contract     | A new user can establish represented accounts, save an expense/transfer and recover a mistake  | Freeze representative end-to-end journeys and release candidate; inspect current onboarding, capture, Inbox, reconciliation and export; run existing benchmark harness and observe consented physical-phone sessions   | Document actual task completion, errors, abandonment, TTLT and coverage comprehension; identify the largest failing journey; any financial/ownership/recovery failure is release-blocking in its affected path         | Current main and provider read access; real-user/device evidence must be collected, not simulated                |
| B — weeks 3–4: complete daily Ghi                | Recording a routine expense and correcting it requires little work and no coaching             | Improve the largest measured friction across access, existing frequent patterns/payee assists, amount/account/category/date entry, save/correction, offline/failure states; one coherent journey per package           | Same frozen tasks/devices versus phase A: less end-to-end effort, no new material wrong-field/duplicate errors; first-time users remain usable; explain uncertain results                                              | Phase A baseline; reuse released patterns rather than build another inference system                             |
| C — weeks 5–7: statement-to-reconciled-period    | Digital activity can be imported and trusted without retyping every row                        | Connect existing CSV/Excel mapping memory, provenance, deterministic rules, duplicate/transfer matching, exception review, retry and account reconciliation; test repeat import and interrupted review as one workflow | Repeated import produces no extra ledger facts; cross-account transfer stays neutral; mapping/correction work falls on repeated tasks; unresolved coverage is visible; account reconciliation is reachable and correct | Trustworthy mutation/RLS contracts; approved or visibly synthetic source fixtures                                |
| D — weeks 8–9: understand and maintain the month | The user can explain where money went, inspect the underlying records and resolve what remains | Connect current dashboard, reports/drill-down, review state, account coverage, existing budgets/commitments/goals and export; improve comprehension of existing facts before adding new planning models                | Totals match the filtered ledger; transfers excluded; unknown sources/obligations remain unknown; user can trace a number to records and correct it; report-to-export meets existing MVP contract                      | Phase C representative period; existing planning capabilities remain facts/expectations with explicit boundaries |
| E — weeks 10–12: controlled beta and maintenance | A returning user can maintain another trustworthy period with less work                        | Run a consented repeated-use pilot, verify current authenticated isolation/export/restore and release operations, observe low-end phone/accessibility/performance; fix release blockers in batches                     | Stage 0/1 scorecard with real evidence, limitations, support and rollback readiness; publish keep/change/kill decisions and owner beta decision                                                                        | Provider/production changes require their separate authority; a build is not deployed acceptance                 |

Week boundaries may move when evidence or capacity changes. Do not skip phase A because code already exists. Do not call a stage complete from automated browser tests alone. Each phase produces a reviewable journey, acceptance evidence and an owner handoff, not a list of disconnected merged files.

#### Packages and existing owners

| Package                             | Existing implementation to reuse                                                                                      | Evidence to extend                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| New-user-to-first-record            | src/components/onboarding-flow.tsx, src/lib/onboarding.ts, shared add-transaction dialog, capture quick page          | Existing onboarding/audit and expense-path browser journeys, first-time observation                |
| Fast manual capture and correction  | src/lib/quick-add-defaults.ts, shared Ghi form, capture-consequence.ts, existing edit mutation                        | Capture benchmark harness/driver, capture consequence and correction browser cases                 |
| Acquire and review digital activity | existing direct CSV/import pages; inbox direct-csv-mapping-preset, import-batch-store, apply-rules and review modules | Remembered mapping, Inbox review, retry/idempotency and source fixture evidence                    |
| Reconcile and explain               | existing account-reconciliation-page, report/transaction workspaces and planning/month-review.ts                      | Account reconciliation browser journey, report-to-ledger parity and export acceptance              |
| Operational readiness               | existing CI, RLS/pgTAP, archive/export/restore and deployment runbooks                                                | Exact release candidate, authenticated flow, recovery drill and provider read-back when authorized |

These are work-package owners, not permission to rewrite entire modules. Refresh current paths/contracts before each issue. Existing payee, frequent patterns, rules, reconciliation and planning functionality are baseline to validate and connect, not “missing features” to reimplement.

#### Measurement and experiment contract

Use PRODUCT_METRICS as the definition owner. Phase A records denominators, cohort, device, version and evidence tier for:

- **Task completion:** completed trusted workflow / started eligible workflows; report abandonment and failures separately.
- **TTLT:** intentional capture start to trustworthy saved transaction including needed correction; report distribution and task/cohort, not only fastest machine time.
- **Maintenance burden:** mapping, categorization, duplicate resolution, transfer confirmation, correction and reconciliation interventions per 100 observed transactions; also total maintenance time per represented period.
- **Trust:** amount/account/kind/date errors, duplicates, unexplained balance discrepancies, unresolved items by type and reconciliation/coverage comprehension.
- **Repeated value:** whether the same participant can maintain the next period and explain its records with less work; active app use alone is not success.

Set an effect-size target and acceptance protocol after baseline but before each experiment starts; do not move the threshold to fit results. Compare the same tasks and devices with the released control, including correction and failure recovery. A small pilot exposes usability failures; it does not prove population-wide improvement. Missing participants/devices are pending evidence, never zero errors or synthetic user success.

The existing automated capture driver measures a scripted machine floor only. Consent-based research should avoid uploading balances, payee text, notes or statement content into analytics; use bounded timings, field-change classes and aggregate outcomes. Reuse existing event/measurement contracts; changing collection or retention requires a scoped privacy review. No financial-data telemetry is authorized by this plan.

#### Working cadence, capacity and prioritization

- One active product journey at a time. Plan with a single implementation lane unless actual staffing is supplied; no parallel-agent assumption. Each cycle ends with a usable end-to-end result, evidence and a decision.
- Weekly review: current phase outcome, actual user failure, baseline comparison, release blockers, scope/capacity adjustment and next bounded package. Engineering status remains in GitHub; this packet is the contract, not another status dashboard.
- Prioritize correctness/ownership/data-loss blockers immediately, then the measured bottleneck in the active journey. Small copy/fixture/edge-case issues are batched into maintenance; they do not become the next roadmap by default.
- Reserve one maintenance batch per cycle. If blockers consume the cycle, show the program impact and reschedule explicitly; do not portray many small PRs as delivery of a phase.
- A product package includes design/copy, domain/UI implementation, tests, offline/error/empty states, correction and acceptance together. Smaller PRs are allowed for review safety, but every PR belongs to one package and its exit criterion.
- Before coding each package: issue with user failure, milestone, expected behavior, evaluation, reuse, boundaries and rollback. Before release: exact-head CI, relevant authenticated/data/browser evidence, approved deployment, read-back and rollback under the existing operating policy.
- Keep/change/kill: keep only when the user outcome improves under the trust contract; change when friction moves elsewhere; stop a prototype when it increases total effort or complexity. Revert safely rather than leave every experiment permanently visible.

#### Next six-to-twelve-month direction

These are conditional capability horizons, not concurrent work or fixed release promises:

| Horizon after Stage 0/1                            | Outcome                                                              | Candidate scope                                                                                                                                                                  | Gate before implementation                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next 3–6 months: Resilience                        | Understand upcoming obligations, irregular income, reserves and debt | Audit and connect existing commitments/income first; define debt balances, principal/interest/fees, schedules, partial payments and overdue semantics; model user-owned reserves | Stage 0/1 evidence; explicit assumptions and missing-input behavior; reviewed domain specification, financial/RLS/migration/restore contracts and owner scope decision     |
| Next 6–9 months: Progress                          | Track savings/debt goals and plan versus actual                      | Extend existing goals and contribution links; plans depend on verified actuals and explicit user assumptions                                                                     | Resilience evidence and user demand; no invented universal targets or projected certainty                                                                                  |
| Next 9–12 months: Choice and selective acquisition | Compare choices or reduce acquisition work further                   | Scenarios; selected provider/native acquisition only if current manual/import maintenance remains the measured bottleneck and feasibility is demonstrated                        | Source access/coverage, legal/privacy/security/operating costs, authority and rollback; AI can explain grounded facts but cannot invent or silently mutate financial truth |

Provider connectivity, OCR, native apps, household sharing, investment/wealth and AI advice remain separate decisions. Research questions should be raised ahead of their stage; speculative features must not displace the current maintenance bottleneck. Financial domain study is done just in time for each defined contract, with primary sources and applicability limits; this planning revision makes no new legal or financial-guidance claims.

#### Immediate next package

Begin phase A with one frozen six-task journey: create represented accounts → record cash expense → record neutral transfer → import/re-import a statement → resolve an exception and reconcile → inspect the period, correct and export. Include interruption/offline recovery and first-time/stable-history variants. Inventory existing tests/harness first, write the smallest missing journey evidence, then identify the dominant friction. This is the next product package after open maintenance work, not another speculative feature or isolated confirmation fix.

Deliverables: reproducible scripted baseline; explicit physical-user protocol; unverified-evidence list; Stage 0/1 gap ranking; and a selected phase B package. Recruitment/device/provider approval dependencies may stay open while synthetic and repository-level work proceeds, but those tiers must remain visibly distinct.

### Phase A execution contract — 2026-10-01

**Execution state:** evaluating in PR #743. **Active role:** evaluator. **Permission scope:** branch_write. **Owner instruction:** merge the delivery program and execute it. Planning PR #742 merged at 739e9e43. This package owns baseline evidence, not a new feature system.

Run `npm run test:journey:baseline` under Node 22 for the frozen automated demo baseline on desktop/mobile Chromium. It composes existing suites rather than duplicating domain implementations. Each test owns isolated synthetic demo state; passing them is not a single authenticated end-to-end journey or real-user timing. Run `npm run test:e2e:auth` separately for the existing loopback ownership/recovery contract; that double is not deployed Supabase evidence. Existing script `scripts/capture-bench-driver.mjs` remains an optional machine-floor timing tool, not user TTLT.

| Frozen job                                      | Existing evidence                                                                                                               | Current limitation to preserve                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Find Ghi, record cash, locate record and export | expense-path, global-pfm-ux; export now checks downloaded row content and exact integer/sign/category rather than filename only | Register navigation is not successful account provisioning; seeded accounts are not first-time setup acceptance   |
| Transfer correctly                              | accounts-transfer and Inbox transfer/retry cases                                                                                | Account dialog review alone is not posting; Inbox demo posting is separate from authenticated provider acceptance |
| Acquire digital activity                        | direct-csv-remembered-mapping                                                                                                   | Mapping preview is not full persisted statement import/re-import; source file is synthetic                        |
| Resolve exceptions/correct                      | Inbox exception-first and expense correction cases                                                                              | Synthetic unresolved/mixed candidates; no claim of real bank parser precision                                     |
| Reconcile represented account                   | account-reconciliation-workspace                                                                                                | Explicit demo statement fixtures; no evidence that a real statement agrees with actual bank balance               |
| Understand period, trace and export             | global-pfm-ux, reports-custom-range and expense-path export content                                                             | Scripted assertions do not prove user comprehension                                                               |
| Interrupted/offline maintenance                 | connectivity-awareness and Inbox persisted retry                                                                                | Readability/reconnect and retry contracts, not offline authenticated posting or physical network reliability      |

#### Connected statement journey extension — 2026-10-02

Owner requested execution of the next Phase A integration gap. Extend the existing Inbox browser suite, preserving one synthetic book throughout: upload a CSV → select its source account in preview → explicitly confirm candidates → resolve the missing category → post once → re-upload the same source → observe duplicate attention without a new ledger row → reload → explicitly clear represented statement rows → finish reconciliation. The initial book is frozen to the represented salary period; its opening snapshot and signed rows determine the independent synthetic closing balance.

Focused evaluation passed on desktop/mobile Chromium with no retry. Initial failures were harness defects: filling the SSR reconciliation input before its controlled handler hydrated, then mixing older demo history with a newer opening snapshot. The harness now uses the established retained-input wait and a scoped statement fixture. No production logic or stored balances were changed to accommodate those failures. Duplicate attention remains unresolved; this does not claim all Inbox work is complete or that every duplicate can be automatically rejected.

This closes one connected demo evidence gap from the program, not authenticated persisted import/replay, real bank compatibility or human comprehension. Current authority remains existing source/candidate/ledger/reconciliation contracts; no second ingestion model, bank connection, schema or telemetry change. Next evidence priorities are authenticated statement replay/ownership and first-time user/device observation, rather than another isolated capture label fix.

#### Human baseline protocol

Research owner recruits consented participants across first-time, stable-history and multi-account cohorts, with actual phone/browser recorded. No participants are claimed yet. Use the same frozen jobs; avoid coaching, let users stop, and include correction in completion/time. Use synthetic statements first; real financial records remain participant-controlled and are not copied into analytics or PR artifacts. Observe whether the user can distinguish a posted record, unresolved candidate, expected commitment and reconciled/partial coverage.

For each task record: anonymous participant/session code, build, device/browser, cohort, completion/abandonment, start-to-trusted-finish duration, interventions by type, material wrong fields/duplicates, correction effort, and the user's explanation of the result. Keep raw private observations outside repo under a consented retention policy. Report timing by task/cohort; automated execution duration is never substituted for human TTLT. Agree effect-size targets after baseline and before a subsequent prototype, using the program's measurement contract.

#### Prepared physical-phone pilot — 2026-10-02

**Execution:** materials prepared in PR #746 in the owner-authorized Phase A lane; Class 0 research operations/documentation. #745 merged at e63c2ca2 after its final CI passed, including two real-stack browser cases and 982 PostgreSQL assertions. Its post-merge CI must be checked separately. **Participants observed: none. Current rehearsal status: blocked at J1 by [#748](https://github.com/Thunderkill016/moneyflow/issues/748), demo accounts disappearing after reload.** Do not run this kit as a complete first-time demo journey until that blocker is repaired and verified. The following is a study kit, not study results. The owner may self-pilot first; mark that as owner self-report, not first-time-user validation.

Method references, accessed 2026-10-02: [GOV.UK moderated usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing) supports neutral task instructions and observing the participant's choices; [GOV.UK informed consent](https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research) supports explaining purpose, collection, access, retention and voluntary withdrawal before observation. Apply these as research-method guidance; they do not establish Vietnamese legal compliance or product acceptance.

##### Moderator preparation

- Choose a specific build and a demo-only test origin. If no reachable test build exists, record environment preparation as pending rather than ask participants to use a production financial account. No deployment is authorized by this kit.
- For a local rehearsal, run the existing app with `NEXT_PUBLIC_APP_MODE=demo npm run dev -- --hostname 0.0.0.0 --port 3500`; first check the port is free. A physical phone needs that host to be reachable on the same trusted network. This command is an option, not evidence that a phone can reach the current workspace. Record the actual origin/build and confirm the visible demo label before starting.
- Use a new isolated browser profile or a separate private session; do not clear an existing profile, account or local financial history. Record whether storage is temporary. Do not run the automated benchmark driver during human observation.
- Prepare one synthetic CSV before the session, replacing `YYYY-MM-DD` with the session's Vietnam calendar date T. The participant's transactions and statement end date must also use T. Deliver the file before timing the import task; preparation time is logged separately.

```csv
Ngày,Mô tả,Số tiền
YYYY-MM-DD,SYNTHETIC_STATEMENT_CAFE,-45000
```

- Book an initial pilot slot, allowing setup and voluntary stopping. A proposed 20-minute task budget is a scheduling assumption, not a product-speed target or mandatory completion time. A task not reached because the session ends is `not_attempted`, not user abandonment.
- Before notes, agree who owns the study, how to contact that person, who can see observations and how long they will be retained. Start with anonymous task outcomes only; audio, video, screen recording or financial screenshots require a separate stated agreement and are off by default. Keep identifiable consent/contact records separate from task notes, outside Git. If these arrangements are missing, prepare materials but do not begin collecting participant data.

Participant introduction: “Mình đang thử xem MF có dễ hiểu và dễ dùng không. Bạn có thể dừng bất cứ lúc nào. Các khoản tiền trong bài đều là dữ liệu giả. Hãy làm theo cách bạn nghĩ là đúng; nếu gặp khó khăn, cứ nói hoặc bỏ qua. Mình sẽ ghi lại cách làm, thời gian và chỗ cần trợ giúp, theo thỏa thuận vừa trao đổi.”

##### Participant task cards — show one at a time

Do not show the answer key or tell participants which button, tab or route to use. First-time participants perform J1 themselves; any moderator-created accounts make setup acceptance `not_observed`.

| Job                        | Read to the participant                                                                                                                                       | Observe                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| J1 — Represent money       | “Tạo hai tài khoản dùng riêng cho bài thử: Study Cash có 500.000đ tiền mặt và Study Bank có 100.000đ tại ngân hàng.”                                          | Finding account setup; understanding opening balance and account type; actual successful creation                      |
| J2 — Record a cash expense | “Hôm nay bạn mua cà phê bằng 45.000đ tiền mặt từ Study Cash. Ghi lại để sau này biết tiền đã đi đâu.”                                                         | Finding Ghi; account/category/date choice; posted fact versus candidate; actual saved record                           |
| J3 — Move money            | “Hôm nay chuyển 50.000đ từ Study Cash sang Study Bank. Ghi lại việc chuyển tiền giữa hai tài khoản của bạn.”                                                  | Distinguishing transfer from income/expense; source/destination; balances                                              |
| J4 — Import and repeat     | “File sao kê giả đã gửi có một khoản chi của Study Bank trong hôm nay. Đưa khoản đó vào MF. Sau đó nhập lại cùng file và cho biết chuyện gì xảy ra.”          | File selection and mapping; source account; unresolved category; review/post; duplicate attention without another fact |
| J5 — Match statement       | “Sao kê giả của Study Bank chốt hôm nay ở 105.000đ. Kiểm tra tài khoản này có khớp sao kê không và hoàn tất nếu đúng.”                                        | Difference before clearing; explicit row confirmation; completed session; scope of what is and is not reconciled       |
| J6 — Correct and retrieve  | “Bạn phát hiện cà phê tiền mặt thực tế là 40.000đ. Sửa khoản đó, tìm lại các khoản chi của hai tài khoản bài thử và xuất một bản ghi để bạn có thể kiểm tra.” | Editing the correct fact; correction effort; period/account scope; exported saved data; explanation of totals          |

If a prerequisite job fails, record the failure first. The moderator may create a new controlled state to examine later jobs, but log the intervention and mark the subsequent evidence as assisted; it cannot prove an unassisted complete journey. Do not force a balancing adjustment to rescue J5.

##### Moderator-only answer key

Independent synthetic truth for the two study accounts only:

| Checkpoint         | Study Cash | Study Bank | Expense facts                          | Transfer treatment                                   |
| ------------------ | ---------- | ---------- | -------------------------------------- | ---------------------------------------------------- |
| Opening            | 500000     | 100000     | none                                   | none                                                 |
| After J2           | 455000     | 100000     | one cash expense of 45000              | none                                                 |
| After J3           | 405000     | 150000     | unchanged                              | one 50000 movement, zero income/expense contribution |
| After J4           | 405000     | 105000     | one cash 45000 and one bank 45000      | unchanged                                            |
| After re-import/J5 | 405000     | 105000     | still exactly those two expenses       | no duplicate or balancing fact                       |
| After J6           | 410000     | 105000     | cash 40000 and bank 45000; total 85000 | unchanged; combined study balance 515000             |

The demo may contain other seeded accounts and history. Their totals are outside this answer key. Inspect/filter the study accounts and session date rather than equate an all-account dashboard total to 85000. Export acceptance means locating the two correct expense facts and the transfer in the actual downloaded file; a successful download filename alone is insufficient. A duplicate candidate may remain pending after J4/J5; reconciling Study Bank does not mean the entire Inbox is resolved.

Ask after the relevant jobs: “Khoản nào đã được ghi vào sổ, khoản nào còn cần xử lý?” “Chuyển tiền có làm tăng thu hoặc chi của bạn không?” “Đã đối chiếu tài khoản này có nghĩa là tất cả dữ liệu đã đầy đủ chưa?” “Bạn sẽ kiểm tra hoặc sửa kết quả ở đâu?” Record meaning with `correct`, `partial`, `incorrect` or `not_observed`; do not teach the answer before recording it.

##### Observation form — leave blank until an actual session

Session metadata: anonymous session code; actual build/origin; evidence tier (`moderated_physical_phone`, `owner_self_report`, `emulated_automation`); participant's prior MF exposure; cohort; physical device/OS/browser; network context; app mode; agreed retention/access; consent recorded; moderator role; timing method and any same-device stopwatch/tab-switch overhead. Automated data must never enter the human cohort.

| Session | Job | Outcome       | Start → trusted finish seconds | Correction seconds | Taps (counted/estimated/unknown) | Assistance | Material wrong fields/duplicates | Meaning check | Observed friction |
| ------- | --- | ------------- | ------------------------------ | ------------------ | -------------------------------- | ---------- | -------------------------------- | ------------- | ----------------- |
| —       | —   | not_collected | —                              | —                  | —                                | —          | —                                | —             | —                 |

Outcome enum: `unassisted_success`, `assisted_success`, `failed`, `participant_stopped`, `not_attempted`. Start when the participant has understood the task and begins acting; stop at the last required correct, persisted result, including relevant correction. For J6, stop after checking the downloaded content. Revisit correctness at session end; if a later correction is needed, record its extra time separately and downgrade any previous “correct without correction” claim. Do not convert failed/abandoned durations into successful TTLT or fill missing times with zero. Human timing must not be inferred from CI durations or automatically adjusted by an assumed tab-switch delay. Existing `/capture-bench.html` is optional for narrower capture comparisons; its automated detection and tab-switch timing are not this whole-journey protocol.

Keep raw session rows outside Git. Summarize counts and denominators by task/cohort/evidence tier, intervention types and the concrete failure sequence; report unknowns explicitly. With only an owner self-pilot, treat friction as a hypothesis and do not generalize to first-time users. No invented sample, threshold or measured improvement.

##### Decision and handoff

Release-block financial correctness, ownership or data-loss failures immediately in their affected path. Otherwise choose the next Phase B Ghi package from repeated observed inability to finish, misunderstanding or correction burden, supported by session/task references. Freeze the same tasks and define the expected improvement before a subsequent prototype; do not select the next feature from this kit's existence alone. Current handoff: materials prepared; complete first-time demo execution is blocked at J1 by #748. Recruitment, phone reachability and actual observations are unverified. Resolve and verify the measured demo persistence blocker before a consented session; automated rehearsal cannot establish human usability.

#### Automated baseline evidence — 2026-10-01

At this package's local Node 22 tree: demo baseline 60/60 pass on desktop/mobile Chromium; separate authenticated loopback suite 30 pass and one configured performance-attribution diagnostic skip. Lint, typecheck, production build through the authenticated harness, 191 CI-policy cases, formatting and project-knowledge checks pass. The demo run took 5.9 minutes and the authenticated run 3.9 minutes; these are machine suite durations, not participant timing or product speed targets. Exact-head provider CI remains required after final documentation.

No observed failure in these frozen scripted cases warrants another isolated capture patch. The next connected package should close the statement import/re-import → exception review → reconciliation evidence gap, with first-time setup and human comprehension as separately unverified baselines. This selects an engineering evidence gap; it does not establish the biggest real-user friction without the human protocol above.

#### Baseline exit and next decision

Exit this repository package when the command is reproducible, all selected cases have results, export checks actual saved facts, and gaps/prerequisites are named. Stage 0/1 maturity remains unproven until the separate participant/device/provider evidence exists. Rank next experiments by observed failure and whole-journey maintenance burden; do not automatically add patterns or another confirmation change.

Initial inspection gap: existing mapping evidence stops before a full import/re-import → exception review → reconciliation workflow. After the baseline run, select that integration gap if no higher-severity runtime failure emerges. First-time account provisioning and comprehension also remain explicit external acceptance gaps. No measured claim about which friction is largest for real users is available yet.

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

Use the owner-requested delivery program above: begin Phase A with the frozen complete money journey, collect baseline and choose the largest measured friction. Existing technical slices remain reusable experiments within a selected work package; they are not an automatic next-feature queue. Counterparty schema work, permanent IA changes, OCR/STT/provider work require separate bounded authority.

#### Authenticated harness boundary — 2026-10-02

Class 1 test-tooling correction within Phase A: table fixtures previously returned HTTP 200 even for unimplemented POST/PATCH/DELETE requests. Reject table mutations with 501 and record misses; preserve supported reads. A process-level regression checks all unsupported write methods, an unknown financial RPC, unchanged seeded data and the request report. Run it before the authenticated browser suite. This prevents false persistence acceptance; it does not implement import writes, SQL idempotency, RLS or reconciliation. Those remain a connected real-database evaluation prerequisite, not a mocked financial engine.

Reuse the existing PostgreSQL acceptance contracts instead of reproducing financial logic inside the double: `import_batch_atomic_commit.test.sql` covers exact-intent replay and changed-replay rejection; `import_provenance_invariants.test.sql` covers another tenant being unable to plan/approve and source-ID/fingerprint duplicate precedence; `manual_import_reconciliation.test.sql` covers linking imported evidence to manual facts; account reconciliation workspace/locking tests cover completion boundaries. These files are inspected contracts, not new run results. The current machine has neither Docker nor psql on PATH, so no local real-database run is claimed. The next connected write journey requires a disposable real Supabase/PostgreSQL environment; production data must not be used as its fixture.

#### Persisted statement acceptance package — 2026-10-02

Execution state: evaluating in PR #744; role: evaluator; permission: branch_write and disposable CI evaluation. Owner authorized merge of #743 and execution of the next plan. #743 merged at d82d83c8; its final PR checks passed. Class 1 database-test-only extension; no migration, runtime, production write or deployment. Serves CANON Stage 0/1 Reality and the Phase A evidence gap.

Extend the existing import batch atomic commit pgTAP suite, retaining its single owner book and second-tenant fixtures. After the batch commit/replay/rollback assertions, explicitly resolve account/category, post both represented statement facts, replay the same intent after approval, and reconcile against an independent synthetic 855000 VND closing balance (zero opening + 900000 salary - 45000 cafe). Require original approvals/provenance to remain intact, no extra transactions, completion blocked before clearing, zero difference after explicit clearing, two reconciled legs and no visibility to the other tenant. Reuse deployed RPC contracts; do not implement financial behavior in the HTTP double.

Exit: all 35 pgTAP assertions plus the existing database suite pass in disposable PostgreSQL on final PR head; static policy and required CI pass. This proves composed database behavior, not browser-to-database write acceptance or real-user timing. The next separate prerequisite is connecting the real browser authenticated suite to a disposable full Supabase stack. Human observation remains uncollected. External research not required for this test-only composition of existing stable repository contracts. Rollback is reverting the evaluation diff; no stored production state changes.

Evaluation evidence: executable head 203706c1 passed disposable PostgreSQL reset and all 51 suites / 982 assertions in CI run 36958064782 (database job 110685487265); the extended 35-case suite passed. Required checks passed, with SQL-only build/browser jobs explicitly not applicable. Reconfirm final documentation head before handoff. This closes database composition evidence only; it does not complete the browser write or human baseline gates.

#### Real browser statement package — 2026-10-02

Status/execution: evaluating in PR #745. Role: evaluator. Permission: branch_write and disposable CI fixture writes. Owner authorized the next plan and merge; #744 merged at bcd02507, #743 post-merge CI passed. Class 3 because this changes CI credential handling and authenticated write evaluation. Product authority: CANON Stage 0/1 Reality; roadmap objective: Phase A connected persisted statement journey, not feature growth.

Reconnaissance: authenticated browser coverage uses a read-only HTTP double; pgTAP independently proves database composition. Neither proves real browser server actions write via Auth/PostgREST into PostgreSQL. Existing CI database job starts and resets a disposable database, performs pgTAP and archive round trips, then stops it. Reuse this job, installed Supabase CLI 2.111.0 and Chromium, existing capture/review/reconciliation UI and RPCs. No production/schema/runtime changes are planned.

Research: official [local CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started) establishes full local services and container prerequisites; [CLI reference](https://supabase.com/docs/reference/cli/start) establishes start/status output and exclusions; [createUser reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser) establishes server-only fixture user creation and confirmed-email option. Accessed 2026-10-02. These establish setup contracts, not MoneyFlow financial correctness. Existing MIT-licensed dependencies are reused; no dependency adoption. The legacy anon/service-role local CLI keys are restricted to disposable fixtures; this is not a recommendation for production credential architecture.

Specification: fresh synthetic owner and other tenant, represented account opening 100000 VND, CSV expense 45000 VND. Through actual login/upload/preview/Inbox UI, resolve category, post once, read back one signed -45000 leg and provenance using the owner's anon-key authenticated client. Re-upload and observe duplicate attention without additional facts. Reload, open statement at independent closing 55000 VND, clear represented row and complete. Read back completed zero-difference session and reconciled leg. The other tenant must not read those rows or approve the owner candidate. Expected improvement: the same source-to-ledger-to-statement path is checked across browser, server actions, Auth, PostgREST and PostgreSQL, instead of disconnected evidence. Exit: desktop and phone cases pass without retries in the CI disposable full stack, guard regression and final required CI pass. No human usability claim.

Implementation: add a distinct real-stack Playwright config/spec, with a small shared environment guard and regression; wire the real-stack command into the existing database CI job after pgTAP/archive success and before teardown. Tests must not enter the read-only double suite or demo suite. Local URL is exactly http://127.0.0.1:54321. Reject missing/remote/credential-bearing URLs before any request or fixture write. Keep service-role key out of the app process; fixture administration only. Application receives anon key. Mask local keys before exporting to GitHub environment; do not upload raw CLI status/credentials. No traces, videos or screenshots containing sessions; report only synthetic acceptance results.

Risks/counterexamples: wrong environment rejected by guard regression; false demo acceptance excluded by authenticated config plus server read-back; administrative reads cannot prove RLS, so use owner/other-tenant sessions for assertions; reruns use fresh UUID users with unique names to avoid old state; no guessed closing balances or adjustment transactions; CI failures block database check. Browser evidence cannot establish human comprehension or actual bank parser coverage. Full service startup can fail independently of product behavior and must be reported distinctly.

Verification: Node 22 typecheck/lint, guard regression, 191+ policy tests and workflow pins; migration/knowledge/diff checks; existing database suite and archive round trips; actual two viewport browser cases in disposable CI. Current machine lacks Docker and psql, so a local full-stack run is unavailable and will not be claimed. Rollback: revert evaluation/CI diff; stack teardown discards fixture state. No backfill or production migration.

Tasks: establish local guard → implement composed UI/read-back cases → integrate disposable services with masked credentials → run focused/static checks → execute actual CI, fix measured root causes → record exact-head results and handoff. Scope excludes production deploy/provider/account changes, bank acquisition, native capture, new schema, auth architecture changes and real-user recruitment. Stop if endpoint isolation fails; do not use hosted production credentials as a fallback.

CI startup correction: the database-only stack produced no expected API credential contract when reused by full start. After successful pgTAP/archive checks, discard that disposable stack and start the full local services from a clean stack; the browser still owns one fresh synthetic book throughout its journey. Key-name/presence-only status diagnostics distinguish service startup from credential schema failure. This never stops a hosted provider or developer stack; it executes only in the ephemeral GitHub database runner.

#### First-account UI acceptance extension — 2026-10-02

The owner continuation advances the existing Phase A first-time setup evidence gap. Class 1 test-only change replaces the real-stack statement harness's account-creation RPC fixture with the existing `/accounts` dialog. Expected result: user-entered bank name, VND and opening balance persist under the authenticated owner, survive reload and remain invisible to another tenant before the same CSV/re-import/reconciliation journey. Exit requires both existing viewport cases passing on the disposable real stack. Reuse the current account dialog, owner-authenticated read-back and statement suite; no new runtime abstraction. Signup/onboarding comprehension, physical-device usability, production writes and deployment are out of scope. Rollback is reverting this test-only extension. PR/CI results will own execution status; this specification alone is not passing evidence.

#### Measured rehearsal blocker — 2026-10-02, issue #748

Owner continuation: evaluate the existing six-job Phase A rehearsal before participant execution. Responsibility: evaluator; scope: isolated synthetic browser-demo actions and branch documentation, no production writes. On merged `96ef2f381a690866798503c52eb6b661a03c76a8`, a fixed local demo build displayed Study Cash / 500000 and Study Bank / 100000 after creation, then lost both after reload. No participant was observed. J1 failed persistence; J2–J6 were not attempted, not passed or abandoned. Existing authenticated acceptance from #747 remains valid: both viewport cases passed and post-merge CI run `36985971566` succeeded. It does not prove browser-demo account persistence.

Root cause: `src/components/accounts/accounts-workspace.tsx` owns new demo accounts only in component state, then hydrates from server-provided `initialAccounts`. `src/server/accounts.ts` and `src/server/finance.ts` return fixed demo accounts. Register/reconciliation routes use that fixed list to resolve an ID. Demo server actions explicitly deny account persistence. A list-only localStorage patch would leave capture/import pickers and account routes inconsistent.

Implementation handoff is [#748](https://github.com/Thunderkill016/moneyflow/issues/748): repair the complete demo account lifecycle as one bounded package. Before runtime edits, finish the Class 3 data-boundary specification: shared browser-owned source, validation/legacy-seed compatibility, readiness for server-rendered routes and client pickers, failure handling, ownership, rollback and exact frozen evaluation. Reuse account validation, transaction store and register/balance calculation; preserve the authenticated SQL path. A browser store must not save computed balance as a second ledger, delete existing browser data or report successful writes after storage failure. Scope includes create/edit/archive, cross-route selectors, register and reconciliation; no new domain feature, provider, Auth/schema or production change.

Exit: complete the same frozen J1–J6 synthetic journey on both viewport sizes with independent answer-key balances, repeat import producing no second fact, correction, reload and actual downloaded content; test invalid/unavailable storage and preserve authenticated isolation acceptance. Human observations remain a separate gate. Until then, the study materials are prepared but the demo first-time pilot is blocked; do not silently substitute seeded accounts or count moderator setup as participant success. Local LAN HTTP and physical-phone reachability are also not accepted evidence.

#### Demo account lifecycle repair — issue #748, 2026-10-02

**Status / execution:** evaluating. **Role:** implementer. **Permission:** branch_write plus isolated synthetic browser/CI evaluation. **Owner instruction:** “sua di”. **Class:** 3, browser-owned account data boundary. **Product objective:** CANON Stage 0/1 Reality, Phase A complete money journey. No feature expansion.

**Outcome / problem:** an account created in demo remains available after reload, route transitions and editing/archive, with the same identity/opening balance across capture, import, ledger, register and reconciliation. Observed prior behavior and source-level root cause are recorded under #748 above. Reuse domain account types, existing demo fixtures, transaction store, balance/register helpers and existing route gates; authenticated SQL/RLS remains the system of record for authenticated mode.

**Reconnaissance / constraints:** account-list state is ephemeral; detail/reconciliation server routes only know seeds; capture/import use fixed finance options. Existing account/expense/import/reconciliation browser suites test these separately. Unit contracts cover baseline reconciliation and currency constraints. No DB migration or backfill is required. All new account money values are safe integers; transfer legs remain neutral income/expense. Preserve existing browser transactions and account IDs.

**Research / decision:** local installed Next.js server/client guide requires browser APIs in client components. [React external-store reference](https://react.dev/reference/react/useSyncExternalStore) establishes stable snapshots and matching SSR hydration; [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) establishes persistence and possible access failures; [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) establishes cross-document notification, not same-document writes. Accessed 2026-10-02. Use one versioned localStorage account configuration and shared subscription adapter, with explicit same-tab notification. Reject a list-only patch (downstream inconsistency), cookies (unnecessary account data sent to server), and a new backend (wrong demo ownership). No dependency/service adoption; existing React/Zod/browser APIs, no copied external code or license change. Demo data stays on the current browser origin, not telemetry/server cookies. Network/device access is a separate prerequisite.

**Specification / acceptance:** seed-only browsers remain compatible; persisted metadata includes identity/name/kind/currency/explicit opening balance/archive/icon/color, never computed live balance. Hydrated account summaries anchor existing seeds to their known fixture snapshot plus explicit opening-balance changes; new accounts anchor to their entered opening balance. Existing stored transaction facts compute subsequent changes. Create/edit/archive write before success; invalid/unavailable storage fails visibly without clearing or overwriting data. Currency is immutable on edit. Active pickers omit archived accounts; register keeps archived identity/history. Demo unknown IDs resolve only after hydration and render the same not-found boundary for malformed and valid-but-missing IDs; authenticated missing/other-tenant IDs retain server not-found enforcement. Loading hides unverified custom-account totals/actions; empty/error states remain explicit. Existing fields/palette/labels/responsive layout and accessibility remain owned by current components. Large amounts must remain safe integers. Archive is reversible, not deletion.

**Frozen evaluation:** the existing J1–J6 synthetic answer key is mandatory: cash 500000/bank 100000 → cash expense 45000 → transfer 50000 → bank expense 45000 through CSV → repeated import and zero-difference reconciliation → cash correction 40000; final cash 410000/bank 105000, combined 515000, expense 85000, transfer neutral. Check actual downloaded rows, reload persistence, invalid ID, edit/archive/restore and write failures. No participant outcome is inferred.

**Plan / architecture / tasks:** T1 validated browser store + immutable snapshot subscription + unit failure tests; T2 wire account workspace, shared capture/import/ledger options and demo-only route hydration; T3 composed desktop/mobile journey + lifecycle/write-failure regressions; T4 final formatter, typecheck/lint/unit/architecture/policy/build, affected browser suites and exact-head full CI, including existing authenticated statement acceptance. Reuse current helpers; new modules exist only for the missing shared demo account boundary. Data compatibility: no old account storage existed; absent key loads seeds, corrupted key stays untouched and blocks writes. Rollback reverts consumers/adapter without deleting persisted keys or hosted data.

**Risks:** hydration mismatch → stable server snapshot; lost updates/stale route arrays → shared read/write subscription, cross-tab events and read-before-write; double-counted balance → persist metadata only and compare independent known amounts; incorrect seed/missing IDs → validated identity and legacy-seed tests; quota/denied storage → explicit failed result, no success toast; authenticated bleed → mode guard and existing real-stack/RLS tests. Unit failure injection is synthetic, not browser policy evidence.

**Scope / permissions:** account demo lifecycle and its existing consumers only. No production/provider/Auth/schema writes, deployments, native acquisition, dependency/service or unrelated redesign. Branch/PR delivery is authorized; merge and production actions follow existing owner scope and checks. Stop if demo data would enter authenticated persistence. Human first-time comprehension and physical phone evidence remain separate.

**Handoff / evaluation / delivery:** evaluator → implementer on 2026-10-02 after observed failure and explicit fix instruction; next allowed action is this bounded repair. Branch `agent/mf-demo-account-lifecycle-20261002`; PR and exact-head CI evidence pending. Local frozen browser evaluation passed all six new cases across desktop and mobile emulation with zero retries: complete J1–J6 journey, edit/archive/restore and cross-tab persistence, and explicit quota failure. Focused unit/source contracts passed 32/32 and typecheck passed. Full local unit evaluation passed 1968/1968 and CI-policy tests passed 191/191; lint, typecheck, architecture, capabilities and knowledge checks passed. Broader browser regression exposed the existing unknown-account not-found invariant; the candidate now preserves it after hydration and adds malformed/UUID checks for both register and reconciliation routes. Final browser regression, build and authenticated CI acceptance remain required. This removes the observed failure in the local candidate only; participant comprehension, speed and physical-phone readiness remain unmeasured.

#### Reconciled study handoff — 2026-10-03

Technical persistence blocker #748 was repaired by merged #750; #751 also repaired demo Reports hydration. Main `ca8a6516` CI run 37029015644 passed its selected runtime gates, including two real authenticated statement cases. The earlier blocked/pending text is historical evidence, not the current execution status.

Participant observations, physical-phone usability and LAN reachability remain unmeasured. The owner-authorized 2026-10-03 audit follow-up fixes report CSV parity, overflow recovery and malformed history; its evidence is owned by `audit-remediation-20261002.md` and the resulting PR. During review, demo report CSV is a browser-owned action (disabled until hydration), with the primary export action accessible on narrow viewports. The authenticated server export remains separate. No participant performance is inferred from these repairs.

Next study action after technical acceptance: run the existing frozen J1–J6 with the consenting participant's own device in a supported environment; record unaided completion, actual timing, help/corrections and read-back totals in the existing study artifact. Use synthetic study money, not private bank statements. Distinguish a moderator rehearsal from a participant observation. Do not invent a baseline, claim physical-device readiness or create another study framework while the existing kit lacks results.

Owner qualitative evidence received 2026-10-03: personally uses MF for expenses, perceives entry as short, but lacks desired category choices and repeats the process for every transaction. No numeric timing, device model, task-level outcome or retention measure was supplied. Audit follow-up addresses full-category discoverability and the visibility of existing persistent continuous entry; the owner then clarified that categories feel too broad and requested an explanation of the current flat taxonomy. No category hierarchy redesign is authorized by that question, and no manufactured baseline is recorded.
