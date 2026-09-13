# Capture V2 — low-maintenance transaction acquisition

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** human owner; research and specification by OpenAI agent
**Branch:** `plan/capture-v2-spec`
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet defines the product contract, hypotheses, benchmark plan and safety boundaries for Capture V2. It does **not** authorize runtime implementation, schema changes, provider integration, production writes, or merging.

## Outcome

Reduce the maintenance required to turn real-world financial activity into trustworthy MoneyFlow ledger facts without making the user learn a growing menu of capture technologies.

The revised product thesis is:

- **Single transaction = Ghi.** Amount-first entry, frequent patterns, typed description, paste, keyboard dictation and future image evidence are candidate modes or adapters inside one single-transaction job. They are not assumed to deserve separate top-level product concepts.
- **Bulk acquisition = Nhập sao kê.** CSV/Excel remain first-class bulk paths, with text-layer PDF as compatibility fallback.
- **Source mechanisms remain adapters.** Share Target, OCR, provider sync, notification ingestion and future native integrations may feed the same acquisition contract, but should not automatically become separate navigation concepts.

The working information-architecture hypothesis is therefore simpler than the first draft of this packet:

```text
Ghi — one transaction
  ├─ amount-first trusted entry
  ├─ frequent patterns / favorites
  ├─ optional counterparty context
  ├─ describe / type / paste / keyboard dictation
  └─ future explicit image evidence experiment

Nhập sao kê — many transactions
  ├─ CSV
  ├─ Excel
  └─ text-layer PDF fallback
```

This IA is a **hypothesis to benchmark**, not a fixed decision. Capture V2 succeeds only if it reduces maintenance while preserving correctness, provenance, reversibility and user authority.

The long-term acquisition architecture remains:

```text
manual / pattern / text / paste / dictation / image / statement / provider
                                      ↓
                                 source evidence
                                      ↓
                             normalized candidate
                                      ↓
                         deterministic rules/matching
                                      ↓
                            review only when needed
                                      ↓
                                    ledger
```

## Repository reconnaissance

### Current product direction

`docs/product/PRODUCT_STRATEGY.md` defines the North Star as maintaining a trustworthy understanding of financial life with decreasing effort. Stage 1 requires a neutral acquisition contract with source evidence/provenance, normalized candidates, import/source mapping, duplicate detection, transfer matching, exception-first review and deterministic rules.

`docs/product/PRODUCT_METRICS.md` explicitly rejects imported-row volume as a success metric. Relevant measures include manual interventions per 100 observed transactions, maintenance minutes, acquired-versus-retyped share, exception burden, correction rate and automatic-match precision.

### Current capture surfaces

Current repository behavior already contains most of the required primitives:

- `/capture/quick` — one-transaction manual capture through the shared Ghi form.
- `/capture/paste` — deterministic text parsing, optional rules, preview, then candidate creation into Inbox.
- `/capture/upload` — CSV, Excel and text-layer PDF import with preview before Inbox.
- `/capture/share` — installed-PWA Share Target bridge for text/files into the capture/inbox path.
- `/capture` — current hub showing `Ghi nhanh`, `Dán text / SMS`, and `Tải sao kê / file`.

The current paste parser already understands Vietnamese-oriented amount syntax such as `45k`, `1.5tr`, grouped VND amounts, dates, kind hints and known merchant text. It emits candidates with confidence, uncertain fields, explanations, raw snippet evidence and optional rule matches. It does not write directly to ledger.

### PR #596 is released truth

PR #596 (`feat: add stable Ghi defaults and immediate correction`) was merged into `main` on 2026-09-14 as commit `f7a5ae0731f48974e3eae4d01c879a1b2a822a4c` and the corresponding production deployment reached `READY`.

Its current product contract is no longer an external dependency:

- stable ledger-backed account/category defaults require a deterministic 2-of-3 majority over recent eligible reviewed same-kind transactions;
- local quick-add preference remains fallback;
- immediate post-save correction reuses the existing edit/update mutation;
- canonical recency follows existing ledger ordering;
- no merchant fuzzy inference, ML/AI, provider work, schema change or second mutation path was introduced.

Capture V2 must reuse this behavior as current released truth. It must not duplicate, fork or weaken the #596 default-selection and correction contracts.

### Historical repeat experiment

The repository previously contained an unmerged `Add repeat last transaction` PR. It copied the last successful amount, account, category and note into the next draft, but it was closed because the required inspect → research → decision → contract → bounded implementation process had not been completed. The closure is not evidence that the user job is invalid.

The old implementation is **not** a design authority for Capture V2. In particular, automatically copying amount and note is too broad for a frequent-pattern default. The historical attempt is useful only as evidence that this job has appeared before and should now be evaluated under the current product/trust contracts.

### Current PWA boundary

The manifest already provides PWA shortcuts for expense, income and transfer, and a `share_target` that accepts text/CSV/TXT/TSV. Share Target is an ingress mechanism, not a product identity, and is not broadly supported enough to become a required cross-platform path.

## Market research

### Decision question

Which patterns measurably reduce transaction-entry maintenance without weakening trust, and which should MoneyFlow benchmark before assigning them permanent information-architecture weight?

### Sources and evidence

| Source | What it supports | MoneyFlow applicability |
|---|---|---|
| YNAB official `Adding Transactions Without Direct Import`, accessed 2026-09-14: https://support.ynab.com/en_us/adding-transactions-without-direct-import-B1kBALVaxx | Mobile transaction entry is accelerated through app-icon long press, category long press, widgets, lock-screen/Home Screen shortcuts, Siri/Spotlight and prefilled transaction fields. | Strong evidence that reducing access cost and reusing known context can matter as much as changing the form itself. |
| YNAB official `Shortcuts on iOS`, accessed 2026-09-14: https://support.ynab.com/en_us/shortcuts-on-ios-a-guide-Bk_lHa5Aq | Add Transaction shortcuts can prefill amount, payee, category and account; examples target regular transactions such as a morning coffee. | Supports a Frequent Patterns/favorites hypothesis and future OS-level shortcuts, while not requiring MoneyFlow to auto-copy amount by default. |
| YNAB official `Scheduled Transactions`, accessed 2026-09-14: https://support.ynab.com/scheduled-transactions-a-guide-BygrAIFA9 | Repeating known transactions can be represented explicitly and matched later when imported. | Supports separating truly recurring commitments from ad-hoc frequent patterns rather than making one feature do both jobs. |
| Actual Budget official `Payees`, accessed 2026-09-14: https://actualbudget.org/docs/transactions/payees/ | Payees are canonical transaction context, may be favorited, can normalize imported names and may carry a default category. | Strong support for evaluating Counterparty/Payee as a durable context primitive rather than leaving merchant text only inside parser output or notes. |
| Actual Budget official `Rules`, accessed 2026-09-14: https://actualbudget.org/docs/budgeting/rules/ | Actual automatically creates or updates inspectable rules from repeated payee renaming/categorization behavior. | Supports deterministic, user-correctable learning anchored on counterparty context before probabilistic category guessing. |
| Lunch Money official `Rules`, accessed 2026-09-14: https://support.lunchmoney.app/setup/rules | Payee, category, notes, amount, date and account can drive explicit rules; rules apply to manually added and imported transactions. | Supports one deterministic rules model across manual and imported acquisition rather than separate automation stacks. |
| Wallet by BudgetBakers official `Using Templates`, updated 2026-03-31: https://support.budgetbakers.com/hc/en-us/articles/7077050225042-Using-Templates | Templates preserve fields such as account, category, amount, type, payee and note for repetitive records. | Supports testing explicit reusable transaction patterns. MoneyFlow should benchmark which fields are safe to prefill instead of copying the whole template contract automatically. |
| Copilot official `Quick Start Guide` and `Copilot Intelligence for Spending`, accessed 2026-09-14: https://help.copilot.money/en/articles/11157550-quick-start-guide and https://help.copilot.money/en/articles/8182433-copilot-intelligence-for-spending | Copilot waits until at least 30 reviewed transactions before surfacing ML type/category suggestions, and continues learning from user correction. | Supports the principle that probabilistic prediction should require meaningful reviewed history and confidence; it is not justification for zero-history AI defaults in MoneyFlow. |
| MoMo official `Quản lý chi tiêu`, accessed 2026-09-14: https://www.momo.vn/quan-ly-chi-tieu | Transactions performed through MoMo can be recorded and categorized automatically because MoMo already owns the payment evidence; outside transactions still have a manual Add Transaction flow. | Strong Vietnam-specific evidence that the biggest maintenance reduction comes from acquiring trustworthy source evidence, not from adding a chatbot to a manual form. |
| MDN `share_target`, accessed 2026-09-14: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target | Installed PWAs can receive shared text/files, but support is Limited Availability and incoming data must be validated. | Keep Share Target as optional transport; never make it a required primary path. |
| MoneyFlow repository behavior | Deterministic Vietnamese text parsing, candidate confidence, Inbox review, rules, upload preview, quick entry, #596 stable defaults and immediate correction already exist. | The highest-value next step is to exploit existing trust primitives and benchmark fewer interactions, not create parallel feature stacks. |

### Market interpretation

The cross-product pattern is not “AI chat wins transaction entry.” The stronger repeated patterns are:

1. get the user to the entry point quickly;
2. reuse stable context for repeated transactions;
3. make payee/counterparty a durable anchor for matching and categorization;
4. represent explicit repeating transactions separately from ad-hoc frequent behavior;
5. learn deterministically or only after sufficient reviewed evidence;
6. acquire source evidence directly when the product legitimately owns or receives it;
7. preserve correction and user control.

These are external market patterns. They do not prove that the same UI or data model will improve MoneyFlow. MoneyFlow must benchmark the local hypotheses below.

## Product problem

MoneyFlow currently exposes capture mechanisms according to implementation shape (`Ghi nhanh`, `Dán text / SMS`, `Tải sao kê / file`). The first draft of Capture V2 risked replacing that technology menu with another fixed menu (`Ghi nhanh`, `Ghi thông minh`, `Nhập sao kê`) before proving that users need two different mental models for a single transaction.

The more stable user jobs appear to be:

- **I need to record or supply evidence for one transaction.**
- **I need to import many transactions.**

Within the one-transaction job, the best interaction may vary by situation:

- repeated everyday transaction → amount-first + frequent pattern;
- new transaction with several explicit details → typed description may be faster;
- bank/wallet text already exists → paste/share may be faster;
- future image evidence → screenshot/OCR may be useful;
- future provider/native source → no manual retyping may be required.

Creating a separate top-level feature for every mechanism increases conceptual load and creates multiple paths that can disagree about financial truth.

## Hypotheses to benchmark

None of the following are fixed product decisions until the benchmark evidence supports them.

### H1 — Single transaction should have one user-facing concept: Ghi

**Hypothesis:** users complete single-transaction acquisition faster and with less confusion when amount-first, frequent patterns and assisted text/paste modes live under one `Ghi` concept rather than separate `Ghi nhanh` and `Ghi thông minh` destinations.

**Disconfirming evidence:** users consistently understand and complete tasks faster when assisted capture has a separate destination, or consolidation makes amount-first entry slower/harder to discover.

### H2 — Frequent Patterns are the next highest-value Ghi enhancement

**Hypothesis:** showing a small number of deterministic familiar patterns reduces TTLT and taps for repeated everyday transactions without increasing wrong-default correction.

A pattern is contextual reuse, not automatic truth. The initial pattern should prefer stable structural fields such as:

- transaction kind;
- account;
- category;
- optional canonical counterparty when that foundation exists.

Amount should remain empty by default. Copying a prior amount or note should require an explicit repeat/template action because those fields are more transaction-specific.

**Disconfirming evidence:** pattern selection adds more scanning/choice cost than the #596 stable default, or users frequently correct the chosen pattern.

### H3 — Counterparty/Payee is a valuable foundation for learning and normalization

**Hypothesis:** an optional canonical Counterparty/Payee primitive improves repeated manual entry, imported-name cleanup, deterministic category rules, search and future source matching enough to justify the data-model cost.

Counterparty must be distinguished from raw imported/source description:

```text
raw source description / merchant text
                ↓ deterministic/user-confirmed normalization
canonical counterparty/payee
                ↓ optional user-owned rule/default
account/category context
```

Raw source evidence must remain preserved in provenance. A canonical counterparty is user-owned interpretation, not a replacement for source evidence.

**Disconfirming evidence:** users rarely need merchant/payee identity, merchant text already available in notes/source evidence is sufficient, or introducing another entity creates more cleanup than it saves.

### H4 — Natural description is a Ghi mode, not yet a navigation concept

**Hypothesis:** for one-off transactions with several explicit details, `Mô tả giao dịch` using the existing deterministic parser can beat amount-first entry on TTLT without increasing correction burden.

Typed text, paste and keyboard dictation should feed the same parser/preview contract. Until benchmarked, the UI should not claim that this mode is “smart” or promote it to a permanent peer destination.

**Disconfirming evidence:** description mode is slower, ambiguous, less discoverable or creates materially more corrections than amount-first Ghi.

### H5 — Direct evidence acquisition ultimately reduces more maintenance than richer manual entry

**Hypothesis:** statement/source/provider/native acquisition will drive a larger long-term reduction in maintenance than increasingly sophisticated manual forms, provided provenance, duplicate handling, transfer matching, recovery and provider risk are solved.

MoMo is relevant evidence because automatic capture is strongest where the product already owns transaction evidence. It is not evidence that MoneyFlow should imitate MoMo's AI classification or request invasive permissions without equivalent evidence authority.

## Product principles for Capture V2

### 1. Single transaction is one job

Use `Ghi` as the working single-transaction concept. Amount-first, patterns and assisted evidence are modes inside that job unless benchmark evidence proves separate concepts are materially better.

### 2. Amount-first remains the control path

The released #596 flow is the benchmark baseline. When a user already knows the amount, MoneyFlow must not require natural-language parsing, OCR, Inbox review or conversation.

### 3. Frequent patterns reuse context, not accidental values

Patterns may preselect stable structural context only when evidence is safe and current. Amount and note are not silently copied from the last transaction.

### 4. Counterparty is context, not truth

A canonical Counterparty/Payee may anchor deterministic learning and normalization, but it cannot override source evidence, transfer semantics or user corrections.

### 5. Natural input is one-shot evidence, not a chatbot

A description mode should be one input followed by compact interpretation/preview. Do not ask sequential questions for fields that can be presented together.

Example:

```text
ăn trưa 85k VCB hôm qua
```

Possible interpreted preview:

```text
85.000 ₫ · Chi · hôm qua · VCB? · Ăn uống?
```

Only unresolved fields should require intervention.

### 6. Dictation is an input method before it is an audio subsystem

The first voice benchmark should use operating-system/keyboard dictation into the same description field. MoneyFlow should not initially own raw audio capture, speech model hosting, transcription storage or a separate STT pipeline.

### 7. Images produce evidence, not truth

A screenshot or receipt may provide amount, date, merchant/counterparty, reference and source clues. OCR output must enter the normalized-candidate path with uncertainty/provenance and must not directly establish ledger truth.

### 8. File import remains the bulk throughput path

CSV/Excel are first-class. Text-layer PDF is compatibility support. Mapping, duplicate handling, recovery and review cost matter more than the number of accepted file types.

### 9. No parallel ledger

Every assisted acquisition method must converge on existing candidate/review/mutation contracts. No adapter may create a hidden second transaction store or bypass the shared ledger mutation path.

### 10. Exception-first review

Review should be proportional to uncertainty. High-confidence deterministic evidence may reduce work only under an explicit approved automation contract; weak or ambiguous evidence remains visible.

### 11. Privacy cost is product cost

Do not request SMS inbox access, background notification access, raw audio storage or broad photo-library access merely to make capture look automatic. An invasive source needs measured maintenance reduction large enough to justify the trust cost.

## Working information-architecture experiment

The first IA benchmark should compare the current Capture hub against this working candidate:

| Candidate action | Description | User job |
|---|---|---|
| **Ghi** | `Ghi một khoản — nhập số tiền hoặc dùng cách nhập khác khi cần` | Single transaction |
| **Nhập sao kê** | `CSV, Excel hoặc PDF sao kê để đưa nhiều giao dịch vào` | Bulk acquisition |

Inside `Ghi`, the working hierarchy is:

1. amount-first field and released #596 stable defaults;
2. up to a small number of Frequent Patterns when safe evidence exists;
3. optional details including Counterparty/Payee when the foundation is approved;
4. secondary `Mô tả giao dịch` mode for type/paste/keyboard dictation;
5. future explicit image evidence experiment only after separate approval.

This hierarchy is not authorized implementation. It is the prototype target to compare against current behavior.

### Backward compatibility

Existing routes and ingress links must remain usable during any future migration:

- `/capture/quick` remains the amount-first Ghi path or redirects compatibly to Ghi amount-first mode;
- `/capture/paste` may render/redirect into Ghi description/paste mode;
- `/capture/upload` remains Nhập sao kê;
- `/capture/share` stays an ingress bridge and routes by supplied evidence type;
- current PWA shortcuts must not break merely because labels/IA change.

Do not remove existing routes during an IA experiment unless the replacement has explicit compatibility tests and rollback.

## Ghi — single transaction contract

### Job

Turn one known transaction or one piece of transaction evidence into a trustworthy ledger fact with the least necessary interaction.

### Amount-first default mode

Required released behavior:

- amount gets first focus;
- expense/income/transfer remains explicit and uses existing transaction semantics;
- #596 stable ledger-backed account/category defaults win over local fallback exactly as currently released;
- a first-time or weak-evidence user receives no arbitrary taxonomy default;
- direct single-save behavior remains the trusted path for explicit manual entry;
- the exact saved row is immediately correctable through the existing edit/update mutation;
- transfer behavior remains neutral to expense/income reporting.

Non-goals:

- no shorthand text parser inside the strict amount field;
- no amount-derived category inference;
- no model-generated financial default;
- no hidden save/autopost.

## Frequent Patterns foundation

### Job

Reduce repeated choices for common everyday transactions without turning a one-off historical transaction into an automatic template.

### Pattern eligibility hypothesis

A future implementation may evaluate patterns from reviewed, active, same-kind ledger history. It must preserve coherent field relationships from the same transaction/pattern and must not independently guess account/category/counterparty values.

Potential pattern identity:

```text
kind + accountId + categoryId + optional counterpartyId
```

The initial experiment should limit the first viewport to a small number of patterns and benchmark whether they reduce work relative to #596's single stable default.

### Safety requirements

- transfer rows are not learned as ordinary expense/income patterns;
- split/ambiguous/review-needed rows do not silently establish a pattern;
- invalid/deleted account/category/counterparty references are ignored;
- amount is empty by default after selecting a pattern;
- note is empty by default after selecting a pattern;
- no “repeat last” action may post automatically;
- selecting a pattern never bypasses final Save;
- user correction must affect future learning only through an explicit deterministic contract;
- local/browser state must not become a second ledger.

### Explicit repeat/template hypothesis

There may be value in a separate explicit `Dùng lại` or pinned-template action that can copy amount and note by user choice. That is different from implicit Frequent Patterns and should be benchmarked separately.

A recurring rent/subscription belongs to the existing recurring/commitment domain rather than being modeled only as a frequent ad-hoc pattern.

### Benchmark questions

- Does a pattern row reduce median/p75 TTLT for repeated everyday transactions?
- How often is the selected account/category/counterparty corrected?
- Does scanning patterns slow down users for novel transactions?
- How many visible patterns are useful before choice cost outweighs saved taps?
- Do users want explicit favorites/pinning rather than purely learned ranking?

## Counterparty/Payee foundation

### Product purpose

Create one optional, user-meaningful identity for the person/business/entity involved in a transaction so MoneyFlow can normalize source descriptions and anchor deterministic learning without destroying provenance.

Working terminology in this packet is **Counterparty/Payee** until product language is benchmarked in Vietnamese. The implementation must not choose a permanent user-facing label by developer convenience alone.

### Required conceptual separation

- **Raw source description** — immutable/retained evidence from bank statement, pasted SMS, provider payload or other source where available.
- **Canonical counterparty/payee** — user-owned normalized identity such as `Highlands Coffee`.
- **Alias/match rule** — deterministic mapping from source text/pattern to canonical counterparty.
- **Category/default rule** — optional inspectable user-owned behavior associated with the canonical counterparty or broader rule system.

Example:

```text
HIGHLANDS COFFEE 0281234 POS
HIGHLANDS*LANDMARK81
            ↓ deterministic/user-confirmed aliases
      Highlands Coffee
            ↓ optional rule
         Ăn uống
```

### Foundation questions before schema work

A schema migration is **not authorized** by this packet. Before implementation, the selected work packet must answer:

- Can the current candidate/provenance model preserve raw description while adding canonical identity cleanly?
- Does the ledger need a first-class counterparty reference, or can a smaller reversible experiment prove value first?
- How are aliases merged, renamed and deleted without losing source evidence?
- How do transfers remain semantically separate from ordinary counterparties?
- How are imported/payee strings normalized deterministically and explained?
- How does export/archive/restore preserve the new identity if it becomes durable data?
- How does tenant isolation/RLS apply if a new table/entity is introduced?

### UX hypothesis

Counterparty should be optional and progressively disclosed in amount-first Ghi. It may become more prominent when:

- a Frequent Pattern includes it;
- description/paste parsing extracts merchant/counterparty evidence;
- an import row has a recognizable source description;
- the user explicitly searches/selects a favorite.

Do not require counterparty for every transaction merely because the data model supports it.

### Deterministic learning hypothesis

If the user repeatedly confirms `Highlands Coffee → Ăn uống`, MoneyFlow may eventually offer an inspectable deterministic rule or default. One correction should not silently create a broad fuzzy rule.

External merchant enrichment, web lookup and LLM normalization are out of scope for the first foundation.

## Description / type / paste / dictation experiment

### Job

Test whether a short natural description can reduce work for one-off transactions with several explicit details.

### Input modes

Initial benchmark modes:

1. **Type** — `cafe 45k`, `đổ xăng 185k Techcombank hôm qua`.
2. **Paste** — bank SMS, wallet text, transaction note or copied notification content.
3. **Keyboard dictation** — the device converts speech into the same text field; MoneyFlow treats the result as ordinary text evidence.

Later bounded experiment:

4. **Image/screenshot** — user explicitly chooses/shares one image; OCR extracts evidence into the same candidate contract.

### Interaction model

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

The surface is not conversational by default. The system must not ask sequential questions for fields it can show together in one preview.

### Reuse requirements

- reuse `src/lib/inbox/parse-text.ts` as the starting deterministic text parser owner unless a planned refactor establishes a more neutral evidence-parser boundary;
- reuse existing candidate confidence, uncertain fields, explanations and raw evidence where sufficient;
- reuse rule application and rule-evidence persistence;
- reuse Inbox candidate creation; do not add a second assisted-capture store;
- reuse privacy-safe analytics/logging without raw financial payloads.

### Parser boundary

The deterministic parser may extract or infer only under explicit rules, including:

- amount;
- date;
- transaction kind when evidence is clear;
- merchant/counterparty text;
- source hint;
- rule-backed category where an existing explicit rule applies.

Account/category/transfer semantics must follow trusted existing contracts rather than loose language-model completion.

## Image/OCR experiment boundary

Image support is not part of the first implementation slice unless separately approved.

When evaluated, it must:

- accept an explicitly supplied image/share file; no background photo-library scanning;
- preserve source type and parser/OCR version in provenance where supported;
- extract candidate evidence such as amount, date, merchant/counterparty, reference and visible provider name;
- surface uncertainty;
- avoid assuming the paying account from receipt appearance without evidence;
- avoid automatic categorization from visual content unless an existing deterministic/user-confirmed rule applies;
- never write directly to ledger solely because OCR confidence is high;
- include a delete/discard path according to retention policy.

The first Vietnam-relevant cohort should prioritize digital-payment screenshots / transfer confirmations before receipt line-item extraction.

## Nhập sao kê — bulk acquisition contract

### Job

Bring many existing financial activities into MoneyFlow with minimal amortized per-row work while preserving mapping, provenance, duplicate safety and recovery.

### Format priority

1. CSV — preferred.
2. Excel — supported where current parser behavior is trustworthy.
3. PDF with text layer — compatibility fallback.
4. Image-only/scanned PDF — requires a separate OCR contract; never silently treated as equivalent to text-layer PDF.

### Required behavior

- preview before candidates enter Inbox;
- account/source selection or mapping remains explicit enough to preserve provenance;
- remember safe import mapping per account/source only through an approved persistence contract;
- do not trust bank-supplied categories as MoneyFlow category truth by default;
- duplicate handling accounts for coexistence with manually entered transactions;
- transfer matching remains a separate financial-semantic concern;
- failed/partial imports are recoverable and repeatable without silently duplicating accepted ledger facts.

Counterparty foundation, if later approved, should help normalize imported descriptions while raw imported text remains source evidence.

## Share Target contract

PWA Share Target remains optional transport.

It may receive:

- text → Ghi description/paste mode;
- CSV/Excel/text statement file → Nhập sao kê where supported;
- image → future Ghi image-evidence experiment only when that adapter exists.

Requirements:

- validate MIME/type/size and content before parsing;
- no core behavior may depend exclusively on Share Target because browser/platform support is incomplete;
- the normal in-app route must provide an equivalent manual path;
- Share Target must not become a permanent top-level capture concept merely because the platform exposes it.

## Voice decision

### Keep for benchmark

- keyboard/OS dictation into the Ghi description field;
- treat resulting text as ordinary text evidence;
- benchmark discoverability, TTLT and correction.

### Defer

- MoneyFlow-owned microphone button;
- audio recording storage;
- server-side STT;
- local Whisper/other model deployment;
- wake words/background listening.

A dedicated STT implementation may move from Deferred to Experiment only when keyboard dictation has been benchmarked and an owned implementation has a clear measured advantage with acceptable privacy/retention/economics.

## Chat decision

Do not build a multi-turn transaction-entry chatbot as the default interaction.

A chat-like interface is allowed only if future research proves a job that cannot be served by amount-first entry or one-shot description + compact resolution. Conversation itself is not success.

## SMS / notification decision

Do not request broad background SMS inbox access in the current product stage.

Retain user-controlled evidence paths:

- paste text;
- Share Target text where available;
- statement import;
- future provider/native acquisition under separate privacy/security/economics authority.

Notification ingestion is a future native-platform experiment only if MoneyFlow can establish a narrow permission, local-processing/retention model and meaningful maintenance reduction. It is not a PWA requirement.

## Provider/bank sync decision

Bank/provider sync remains strategically valid but outside this packet's implementation authority.

A provider adapter may be piloted only after the Stage 1 acquisition foundations are sufficiently trustworthy:

- provenance contract;
- duplicate detection;
- transfer matching;
- source health/recovery;
- correction burden measurement;
- disconnect/delete behavior;
- provider/legal/security/economics case.

Provider sync must become another evidence adapter, not a parallel source of financial truth.

## Acceptance criteria for the specification

### Current truth

- [x] PR #596 is represented as merged/released truth, not a pending dependency.
- [x] Current Ghi stable-default/correction contracts are preserved as the amount-first baseline.
- [x] Historical repeat-last work is classified as non-authoritative prior exploration.

### Product hypotheses

- [x] `Single transaction = Ghi` is a benchmark hypothesis rather than a fixed IA decision.
- [x] Frequent Patterns are specified as the next Ghi experiment with amount/note not silently copied.
- [x] Counterparty/Payee is specified as a foundation hypothesis with raw-source provenance kept separate.
- [x] Natural description is a Ghi mode hypothesis, not a permanent top-level `Ghi thông minh` concept.
- [x] OCR, voice, notification/SMS and provider paths remain adapters/experiments under separate authority.

### Safety

- [x] No arbitrary category fallback is introduced.
- [x] Transfers remain financially neutral under existing semantics.
- [x] No adapter owns a second ledger or hidden mutation path.
- [x] Raw source evidence is not overwritten by canonical counterparty normalization.
- [x] Raw financial payloads are excluded from analytics.

### Bulk acquisition

- [x] CSV/Excel remain the primary bulk path.
- [x] Text-layer PDF remains compatibility fallback.
- [x] Import preview/provenance/replay/duplicate safety remain explicit requirements.

## Required UX states for any implementation

Each affected flow must specify and verify:

- initial/empty;
- loading/analyzing where applicable;
- parse/pattern success;
- partial/uncertain result;
- invalid/no usable evidence;
- long labels/merchant/counterparty names;
- large VND amounts;
- duplicate/suspected duplicate where applicable;
- offline/network failure where applicable;
- mutation failure;
- correction/recovery;
- demo/auth behavior;
- mobile/tablet/desktop;
- light/dark where the current design system supports both;
- accessible labels, focus order, keyboard navigation and screen-reader status for parse/save feedback.

A retry-pass after first-paint or hydration failure counts as a defect finding, not a pass.

## Metrics and benchmark contract

The primary metric is maintenance reduction while preserving trust, not feature usage.

### Primary benchmark

**Time to Trusted Ledger Transaction (TTLT)**

Measure from intentional capture start until the transaction reaches a state the user can reasonably rely on under the relevant contract.

Suggested privacy-safe timing markers:

```text
capture_open
mode_selected (enum only)
input_start
pattern_selected (rank/slot only; no financial payload)
candidate_ready
review_done
save_success
correction_done (if needed)
```

### Supporting metrics

- active seconds per accepted transaction;
- taps/keystrokes per accepted transaction;
- percentage accepted without correction;
- wrong-default/pattern correction rate;
- counterparty correction/normalization rate;
- field correction rate by field type only;
- abandonment rate;
- unresolved rate;
- manual interventions per 100 observed transactions;
- maintenance minutes per active user per month;
- acquired-versus-retyped share;
- batch active seconds per accepted transaction;
- duplicate/replay correction burden;
- correction within 60 seconds after save.

Do not log amount, note, raw merchant/counterparty text, raw SMS, raw OCR output, account number, receipt image or other financial payload to calculate these metrics.

### Benchmark cohorts

Before promoting new single-transaction modes or changing Capture IA, test on a physical phone with at least:

1. repeated everyday transactions where #596 stable defaults exist;
2. repeated transactions where multiple patterns compete;
3. new one-off transactions with several fields;
4. pasted bank/wallet/SMS evidence;
5. first-time/weak-history user;
6. statement import with enough rows to measure amortized effort;
7. image evidence only when OCR is active.

Compare at minimum:

- current released amount-first Ghi (#596 baseline);
- amount-first + Frequent Patterns prototype;
- description typed mode;
- keyboard dictation into description mode;
- paste/share when text evidence already exists;
- statement import;
- OCR only when separately active.

Do not assume the same method must win every cohort.

### Promotion thresholds are not yet fixed

Do not invent numeric TTLT or correction thresholds before collecting a baseline. After baseline evidence exists, the implementation packet may define promotion/stop thresholds using observed variance and trust risk.

A new mode should not become a permanent top-level concept merely because it performs well in one cohort.

## Expected method roles — hypotheses only

| Method | Expected best role to test |
|---|---|
| Released Ghi + #596 stable default | repeated simple transaction with one stable context |
| Ghi + Frequent Pattern | repeated transaction where several familiar contexts exist |
| Explicit favorite/template | intentionally reusable transaction shape; amount/note only by explicit choice |
| Ghi description typed | novel single transaction with several explicit details |
| Keyboard dictation | hands-busy / faster natural input where device dictation works |
| Paste/share text | bank/wallet evidence already present as text |
| Statement import | bulk/history |
| Screenshot/payment OCR | image evidence already exists; experiment only |
| Provider/native source | lowest ongoing manual acquisition if evidence authority, privacy and economics are acceptable |

## Architecture fit

### Shared acquisition contract

```text
Adapter / explicit manual mode
             ↓
Evidence + provenance when evidence exists
             ↓
Normalized candidate or explicit trusted draft
             ↓
Deterministic parse/rules/matching
             ↓
Confidence + unresolved fields
             ↓
Inbox / bounded trusted mutation
             ↓
Ledger
```

Do not force explicit manual amount-first entry through Inbox merely for architectural symmetry. The existing trusted manual mutation remains valid. Assisted evidence methods converge through candidate/review contracts unless separately approved otherwise.

### Ownership boundaries

- shared Ghi components own explicit single-transaction entry behavior;
- #596 helper/transaction mutation owners remain authoritative for stable defaults and correction;
- `parse-text.ts` remains the deterministic text parser owner unless a planned refactor establishes a neutral evidence-parser boundary;
- Inbox/candidate store remains assisted-acquisition staging owner;
- Rules remain deterministic and inspectable;
- upload parser/mapping remains bulk-statement acquisition owner;
- future Counterparty/Payee persistence requires its own bounded data-owner decision;
- future OCR/STT/provider/native adapters produce evidence; they do not own ledger semantics.

## Planned research / implementation slices

Implementation remains separately authorized. The order below is a working sequence, not automatic permission.

### Slice 0 — Baseline current Ghi

- measure #596 amount-first TTLT/taps/correction on representative physical phones;
- include first-time and stable-history cohorts;
- record privacy-safe baseline evidence.

No product behavior change is required for this slice beyond separately approved measurement instrumentation if needed.

### Slice 1 — Frequent Patterns prototype

- prototype a small number of coherent same-kind patterns;
- do not copy amount/note by default;
- preserve Save and current mutation/idempotency behavior;
- benchmark against released #596 flow before promoting.

Prefer the smallest reversible implementation capable of proving/disproving H2.

### Slice 2 — Counterparty/Payee foundation decision

- inventory current candidate/source merchant fields and export/archive implications;
- define canonical identity versus raw source text;
- prototype/search terminology if useful without schema first;
- decide whether durable schema is justified by observed value;
- if schema is proposed, create a separate Class 3 packet with RLS, migration, backup/export/restore and rollback evidence.

### Slice 3 — Frequent Patterns + Counterparty integration

Only if H2 and H3 survive earlier evaluation:

- allow patterns/favorites to include optional canonical counterparty;
- add deterministic alias/category rule behavior through the existing rules authority or an explicitly planned extension;
- benchmark correction and maintenance reduction.

### Slice 4 — Description mode experiment

- reuse current deterministic parser and preview;
- support type/paste/keyboard dictation inside Ghi;
- benchmark against amount-first and patterns by cohort;
- do not promote it to a top-level `Ghi thông minh` destination until evidence supports that IA.

### Slice 5 — IA decision

Use the benchmark evidence to choose among at least:

- current three-item hub;
- `Ghi` + `Nhập sao kê` primary model;
- a separate assisted-capture destination if it materially outperforms/conveys a distinct job.

Do not treat the packet's working IA hypothesis as automatic authority.

### Slice 6 — Image/screenshot OCR experiment

Only after owner approval and evidence that image-source demand is meaningful:

- choose OCR engine/provider/local processing;
- define image retention/deletion;
- extend Share Target MIME acceptance only when adapter exists;
- test Vietnamese transfer/payment screenshots first;
- compare TTLT/correction burden against text/paste/manual.

### Parallel statement hardening

Statement work may continue independently where ownership does not conflict:

- mapping memory;
- provenance;
- replay/idempotency;
- duplicate handling against manual entries;
- provider-specific Vietnam bank-export compatibility;
- exception-first review metrics;
- later Counterparty normalization only after foundation approval.

## Explicitly rejected near-term alternatives

| Alternative | Reason for rejection/deferment |
|---|---|
| Fixed separate `Ghi thông minh` top-level destination before benchmark | Commits IA before TTLT/discoverability evidence proves a separate mental model. |
| Separate Voice page | Duplicates description/parser path and creates audio/privacy/model cost before value is proven. |
| Multi-turn AI chatbot | More turns for a job usually served by amount-first or one-shot input + preview. |
| Background SMS reader | High permission/privacy/platform cost; user-controlled paste/share/import already covers much of the evidence job. |
| Standalone OCR page | Technology-centric IA; images are evidence for Ghi, not a user job by themselves. |
| OCR line-item bookkeeping | Scope/correction burden exceed the current personal-ledger acquisition job. |
| Share as a primary capture item | Transport mechanism with incomplete platform support. |
| Blind `repeat last` that copies amount/note | A one-off prior transaction is not sufficient evidence that volatile fields should repeat. |
| Probabilistic AI category/merchant guessing in first slice | Deterministic reviewed-history baseline and counterparty/rules foundation should be exhausted first. |
| Immediate broad bank sync | Provider/legal/security/economics complexity before acquisition foundations are proven. |
| Direct assisted import into ledger without review contract | Violates provenance/correction boundaries and increases silent corruption risk. |

## Risks and counterexamples

| Risk | Prevention / required evidence |
|---|---|
| Frequent Patterns make Ghi visually busier | Limit prototype count; benchmark novel-transaction scanning cost, not only repeat speed. |
| One-off history becomes a bad template | Structural pattern thresholds/favorites; amount/note empty unless explicit repeat/template action. |
| Counterparty creates cleanup debt | Benchmark value, keep optional, deterministic aliases, merge/rename/delete contract before durable rollout. |
| Canonical payee overwrites bank evidence | Keep raw source description immutable/retained in provenance. |
| Description mode creates false confidence | Preserve uncertainty and candidate preview; no ambiguous autopost. |
| Dictation errors are treated as trusted speech | Dictation is only text input; same parser/review contract applies. |
| Screenshot OCR picks total/balance/reference incorrectly | Multiple plausible values remain unresolved; OCR confidence is not financial correctness. |
| Share Target breaks on unsupported platform | Equivalent in-app route always exists. |
| IA consolidation breaks old links | Route compatibility/redirect tests and rollback. |
| Import/payee normalization changes transfer semantics | Transfer owner stays separate; counterparty rules cannot silently redefine transfers. |
| More adapters increase maintenance | Stop/pause an adapter when review/correction cost erases acquisition savings. |

## Verification plan for future implementation

No implementation claim is complete without exact evidence appropriate to its slice.

### Unit/domain

- #596 stable-default counterexamples remain green;
- pattern majority/recency/coherent-pair counterexamples;
- no implicit amount/note copy;
- invalid/deleted reference handling;
- counterparty alias/normalization determinism if introduced;
- raw source evidence preservation;
- parser amount/date/kind ambiguity;
- candidate confidence/uncertain fields;
- backward-compatible deep links;
- import replay/duplicate behavior where changed.

### Browser/E2E

- demo and authenticated runtime;
- empty/populated/error/loading;
- mobile/desktop minimum plus tablet where layout changes materially;
- amount-first Ghi save + immediate correction;
- pattern selection → amount entry → save;
- novel transaction remains easy when patterns exist;
- description typed/paste → preview → Inbox when that slice is active;
- invalid/unsupported evidence;
- statement preview → candidate creation;
- Share Target only where real platform path can be exercised.

### Physical device

Required before claiming capture-speed improvement or IA superiority:

- representative Android phone;
- iPhone/iOS if cross-platform claim is made;
- real keyboard dictation for dictation comparison;
- first-paint interaction, not retry-only success;
- TTLT/correction evidence without recording sensitive financial payload.

## Rollout and rollback

### Rollout

- measure released Ghi before changing IA;
- ship Frequent Patterns separately from Counterparty schema work where possible;
- keep old routes compatible during IA experiments;
- keep description/OCR/provider adapters behind separate bounded authority;
- do not retire a working capture path until replacement evidence exists.

### Rollback

- pattern UI should revert without data migration in its first experiment if possible;
- Counterparty durable persistence, if approved later, requires explicit reversible migration/archive/export handling;
- IA changes must revert without losing ledger/source data;
- OCR/STT/provider experiments must be disableable without changing accepted ledger facts;
- no adapter rollback may require rewriting historical financial truth.

## Success criteria

Capture V2 succeeds when evidence shows that MoneyFlow users can maintain trustworthy periods with less acquisition work, specifically when:

- repeated single transactions require fewer active seconds/interventions without more corrections;
- novel single transactions remain fast even when pattern helpers exist;
- Counterparty/Payee, if adopted, reduces normalization/categorization work more than it creates cleanup work;
- description/paste/dictation modes earn their place through cohort-specific TTLT evidence;
- bulk statement import reduces amortized maintenance safely;
- new adapters converge on one provenance/candidate/review architecture;
- source acquisition increases the share of digital transactions that do not need retyping;
- uncertainty remains visible and correction remains easy.

The goal is not to maximize the number of ways to enter a transaction. The goal is to minimize the work required to turn real-world financial evidence into trustworthy ledger facts.

## Handoff

**From:** planner/researcher
**To:** human owner
**Current execution state:** `specified`

### Fixed safety boundaries

These are product/trust constraints, not market hypotheses:

- released #596 stable-default and immediate-correction behavior remains authoritative until separately changed;
- explicit manual Ghi keeps one trusted ledger mutation owner;
- assisted evidence does not bypass candidate/review/approved automation boundaries;
- no second ledger;
- raw source evidence is not replaced by normalized Counterparty/Payee identity;
- transfers retain existing financial semantics;
- no raw financial payload in analytics;
- no dedicated STT, background SMS, standalone OCR, probabilistic category autopost or broad provider sync is authorized by this packet.

### Hypotheses awaiting benchmark

- `Single transaction = Ghi` is a better mental model than separate `Ghi nhanh` and `Ghi thông minh` concepts.
- Frequent Patterns are the best next manual-capture improvement after #596.
- Counterparty/Payee is worth a durable foundation and data-model cost.
- Description/paste/dictation is faster for some cohorts but should remain inside Ghi unless a distinct top-level concept proves necessary.
- Direct evidence acquisition will eventually reduce more maintenance than increasingly rich manual forms.

### Unverified claims

- TTLT improvement from Frequent Patterns versus released #596 has not been measured.
- Counterparty/Payee terminology, data model and migration strategy have not been selected.
- TTLT improvement of description/dictation versus amount-first Ghi has not been measured.
- The proposed two-primary-job Capture IA has not been tested on physical devices/users.
- OCR engine/provider choice has not been made.

### Next allowed action

Owner may review/edit this specification. After explicit implementation authorization, start with baseline measurement and the smallest reversible Frequent Patterns experiment. Counterparty schema work, description-mode rollout, OCR/STT/provider work and permanent IA changes require their own bounded authority and evidence.
