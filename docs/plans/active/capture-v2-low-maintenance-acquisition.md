# Capture V2 — low-maintenance transaction acquisition

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** human owner; research and specification by OpenAI agent
**Branch:** `plan/capture-v2-spec`
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet defines the product contract and boundaries for Capture V2. It does **not** authorize implementation, provider integration, production writes, or merging.

## Outcome

Reduce the number of transaction-entry concepts a user has to understand while expanding the number of safe evidence sources MoneyFlow can accept.

Capture V2 should expose only three user-facing entry concepts:

1. **Ghi nhanh** — the fastest path when the user already knows the amount and wants to record one transaction.
2. **Ghi thông minh** — one natural-input surface for typed text, pasted text/SMS, keyboard dictation, and later image/screenshot evidence.
3. **Nhập sao kê** — a bulk path for CSV/Excel first, with text-layer PDF as a compatibility fallback.

The product should not present Voice, OCR, Chat, SMS import, Share Target, or bank/provider sync as separate peer features. Those are evidence adapters or transport mechanisms behind the same acquisition contract.

The long-term direction remains:

```text
manual / text / paste / dictation / image / statement / provider
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

Capture V2 is a Stage 1 **Low-maintenance Reality** capability. It must reduce maintenance without weakening correctness, provenance, reversibility, or user authority.

## Repository reconnaissance

### Current product direction

`docs/product/PRODUCT_STRATEGY.md` defines the North Star as maintaining a trustworthy understanding of financial life with decreasing effort. Stage 1 requires a neutral acquisition contract with source evidence/provenance, normalized candidates, import/source mapping, duplicate detection, transfer matching, exception-first review, and deterministic rules.

`docs/product/PRODUCT_METRICS.md` explicitly rejects imported-row volume as a success metric. Relevant measures include manual interventions per 100 observed transactions, maintenance minutes, acquired-versus-retyped share, exception burden, correction rate, and automatic-match precision.

### Current capture surfaces

Current repository behavior already contains most of the required primitives:

- `/capture/quick` — one-transaction manual capture through the shared Ghi form.
- `/capture/paste` — deterministic text parsing, optional rules, preview, then candidate creation into Inbox.
- `/capture/upload` — CSV, Excel and text-layer PDF import with preview before Inbox.
- `/capture/share` — installed-PWA Share Target bridge for text/files into the capture/inbox path.
- `/capture` — current hub showing `Ghi nhanh`, `Dán text / SMS`, and `Tải sao kê / file`.

The current paste parser already understands Vietnamese-oriented amount syntax such as `45k`, `1.5tr`, grouped VND amounts, dates, kind hints and known merchants. It emits candidates with confidence, uncertain fields, explanations, raw snippet evidence and optional rule matches. It does not write directly to ledger.

### PR #596 dependency boundary

PR #596 (`feat: add stable Ghi defaults and immediate correction`) is open and mergeable at the time of this specification. Its contract is important but remains a separate scope:

- stable ledger-backed account/category defaults require a deterministic 2-of-3 majority over recent eligible reviewed same-kind transactions;
- local quick-add preference remains fallback;
- immediate post-save correction reuses the existing edit/update mutation;
- no merchant fuzzy inference, ML/AI, provider work, schema change, or second mutation path.

Capture V2 must reuse that behavior after it lands. It must not duplicate, fork, or weaken the PR #596 default-selection logic.

### Current PWA boundary

The manifest already provides PWA shortcuts for expense, income and transfer, and a `share_target` that accepts text/CSV/TXT/TSV. The Share Target is an ingress mechanism, not a product concept, and is not broadly supported enough to become a required path.

## Market research

### Decision question

Which acquisition methods are mature enough, valuable enough for MoneyFlow's digitally banked Vietnamese target user, and sufficiently aligned with the product's trust/maintenance strategy to retain?

### Sources and evidence

| Source | What it supports | MoneyFlow applicability |
|---|---|---|
| YNAB official File-Based Import guide, accessed 2026-09-14: https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo | CSV is YNAB's preferred file import format; imports support field mapping and per-account remembered settings; categories are not trusted from bank files because category data is not reliably supplied; manual entry and imported activity can coexist/match. | Strong support for keeping statement import as a core bulk path, remembering mappings, and treating bank file data as evidence rather than category truth. |
| YNAB official manual-entry guidance, accessed 2026-09-14: https://support.ynab.com/en_us/adding-transactions-without-direct-import-B1kBALVaxx | Mature finance software still keeps manual entry for on-the-go transactions while offering scheduled/file/direct import for lower maintenance. | Supports retaining a very fast one-transaction path instead of trying to automate every transaction source immediately. |
| MDN `share_target`, accessed 2026-09-14: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target | Installed PWAs can receive shared text/files, but the feature is Limited Availability / not Baseline and incoming data must be validated. | Keep Share Target as optional transport; never make it a required or primary cross-platform input method. |
| MoneyFlow repository behavior | Deterministic Vietnamese text parsing, candidate confidence, Inbox review, upload preview, rules, quick entry and correction already exist. | The highest-value move is consolidation and reuse, not adding several parallel feature stacks. |

### Market decision

Retain and prioritize:

- fast one-transaction manual capture;
- natural-language text input;
- paste of existing text/SMS evidence;
- CSV/Excel statement import;
- text-layer PDF only as compatibility fallback;
- optional Share Target transport where platform support exists;
- image/screenshot OCR only as a bounded experiment behind the same candidate/review contract;
- provider/bank sync only as a later adapter after deduplication, transfer matching, provenance, economics and provider risk are ready.

Do not create near-term standalone product surfaces for:

- a dedicated voice recorder/STT feature;
- a multi-turn chatbot for transaction entry;
- background SMS inbox reading;
- a separate OCR product/page;
- Apple Pay/Google Pay/native payment interception;
- OCR-heavy receipt line-item accounting;
- Share Target as a top-level capture method.

## Product problem

MoneyFlow currently exposes capture mechanisms according to implementation shape (`Ghi nhanh`, `Dán text / SMS`, `Tải sao kê / file`). As more acquisition mechanisms are added, that model risks turning Capture into a menu of technologies rather than a small set of user jobs.

The user job is simpler:

- **I know what happened and want to record one transaction quickly.**
- **I want to describe/show what happened and let MoneyFlow extract a candidate.**
- **I want to import many transactions from a source file.**

If Voice, OCR, Paste, SMS, Share and AI become separate peer features, MoneyFlow increases conceptual load, duplicates parsing/review semantics, and creates multiple paths that can disagree about financial truth.

## Product principles for Capture V2

### 1. Three concepts, many adapters

The user should learn three capture concepts. Technology-specific adapters remain implementation details.

### 2. Amount-first stays the fastest trusted path

When a user already knows the amount, Ghi nhanh should not force natural-language parsing, OCR, Inbox review or conversation.

### 3. Natural input is one surface, not a chatbot

`Ghi thông minh` is a command/evidence box, not a multi-turn assistant. The default interaction should be one input followed by a compact parse/preview.

Example:

```text
ăn trưa 85k VCB hôm qua
```

Possible interpreted preview:

```text
85.000 ₫ · Chi · hôm qua · VCB? · Ăn uống?
```

Only unresolved fields should require user intervention.

### 4. Dictation is initially an input method, not an audio subsystem

The first voice experiment should use operating-system / keyboard dictation into the same text field. MoneyFlow should not initially own raw audio capture, speech model hosting, transcription storage or a separate STT pipeline.

Dedicated STT is allowed only if real benchmark evidence shows that keyboard dictation is insufficient and a MoneyFlow-owned implementation materially improves Time to Trusted Ledger Transaction.

### 5. Images produce evidence, not truth

A screenshot or receipt may provide amount, date, merchant/counterparty, reference and source clues. OCR output must enter the normalized-candidate path and preserve uncertainty/provenance. It must not silently determine account, category, transfer semantics, or ledger truth without sufficient evidence.

### 6. File import is the bulk throughput path

CSV/Excel are first-class. Text-layer PDF is compatibility support, not the preferred format. Import mapping, duplicate handling and review cost matter more than the number of file types accepted.

### 7. No parallel ledger

Every assisted acquisition method must converge on existing candidate/review/mutation contracts. No adapter may create a hidden second transaction store or bypass the shared ledger mutation path.

### 8. Exception-first review

Review should be proportional to uncertainty. High-confidence deterministic evidence may reduce user work only under an explicit approval contract; weak or ambiguous evidence must remain visible.

### 9. Privacy cost is product cost

Do not request SMS inbox access, background notification access, raw audio storage or broad photo-library access merely to make demos feel automatic. A more invasive source needs measured maintenance reduction large enough to justify its trust cost.

## User-facing information architecture

### Capture hub

The Capture hub should contain exactly three primary actions:

| Label | Description | Destination concept |
|---|---|---|
| **Ghi nhanh** | `Nhập số tiền trước, MoneyFlow dùng lựa chọn an toàn gần đây` | Single trusted manual transaction |
| **Ghi thông minh** | `Gõ, dán hoặc dùng nhập giọng nói để tạo giao dịch nháp` | Natural-input candidate acquisition |
| **Nhập sao kê** | `CSV, Excel hoặc PDF sao kê để đưa nhiều giao dịch vào` | Bulk statement acquisition |

Do not add separate top-level actions named Voice, OCR, Chat, SMS, Share, Camera or AI.

### Backward compatibility

Existing deep links should remain usable during migration:

- `/capture/quick` remains Ghi nhanh.
- `/capture/paste` may redirect or render the Ghi thông minh surface in text/paste mode.
- `/capture/upload` remains Nhập sao kê.
- `/capture/share` continues as an ingress bridge and forwards into Ghi thông minh or Nhập sao kê based on evidence type.

Do not break PWA shortcuts or existing shared links as part of an information-architecture cleanup.

## Entry point A — Ghi nhanh

### Job

Record one known transaction with the smallest possible number of actions.

### Required behavior

- Amount gets first focus.
- Expense/income/transfer remains explicit and uses existing transaction semantics.
- After PR #596 lands, stable ledger-backed account/category defaults win over local fallback exactly as that PR defines.
- A first-time or weak-evidence user must not receive an arbitrary taxonomy default.
- Existing direct single-save behavior remains the trusted path for explicit manual entry.
- The exact saved row must be immediately correctable through the existing edit/update mutation.
- Transfer behavior remains neutral to expense/income reporting.

### Non-goals

- No text parser in the amount field.
- No OCR requirement.
- No chat.
- No model-generated category.
- No amount-derived inference.

## Entry point B — Ghi thông minh

### Job

Turn a short natural description or supplied evidence into one or more reviewable transaction candidates without requiring the user to fill a full form.

### Input modes

Initial supported modes:

1. **Type** — user enters a phrase such as `cafe 45k`, `đổ xăng 185k Techcombank hôm qua`.
2. **Paste** — user pastes bank SMS, wallet text, transaction note or copied notification content.
3. **Keyboard dictation** — the device converts speech into the same text field. MoneyFlow treats the result as text, not as a privileged source.

Later bounded experiment:

4. **Image/screenshot** — a user explicitly chooses or shares one image; OCR extracts evidence and produces the same candidate contract.

### Interaction model

The surface is not conversational by default.

Primary flow:

```text
input
  ↓
deterministic parse / evidence extraction
  ↓
compact preview
  ↓
resolve uncertain fields only
  ↓
Inbox candidate or trusted save path defined by the candidate contract
```

The system must not ask sequential questions for fields it can present in one compact preview.

### Reuse requirements

- Reuse `src/lib/inbox/parse-text.ts` as the starting parser owner for typed/pasted/dictated text.
- Reuse existing candidate confidence, uncertain fields, explanations and raw evidence model where still sufficient.
- Reuse rule application and rule-evidence persistence.
- Reuse Inbox candidate creation; do not add a second assisted-capture store.
- Reuse safe analytics and safe logging patterns without raw financial payloads.

### Parser contract

For text-based input, deterministic parsing remains the default before any model-based experiment.

The parser may extract or infer only under explicit deterministic rules:

- amount;
- date;
- transaction kind when evidence is clear;
- merchant/counterparty text;
- source hint;
- rule-backed category where an existing explicit rule applies.

Account selection, category defaults, transfer semantics and other financial fields must follow existing trusted contracts rather than loose language-model completion.

### Image/OCR experiment contract

Image support is not part of the initial implementation slice unless separately approved.

When experimented with, it must:

- accept an explicitly supplied image or Share Target file; no background photo-library scanning;
- preserve the original source type and parser/OCR version in provenance where the candidate model supports it;
- extract candidate evidence such as amount, date, merchant/counterparty, reference and visible provider name;
- surface uncertain fields;
- avoid assuming the paying account merely from receipt appearance unless the evidence proves it;
- avoid automatic categorization from visual content unless an existing deterministic/user-confirmed rule applies;
- never write directly to ledger solely because OCR confidence is high;
- include a delete/discard path for the supplied image/evidence according to the product's retention policy.

The first market-relevant image cohort should prioritize Vietnamese digital-payment screenshots / transfer confirmations before deep receipt line-item extraction.

## Entry point C — Nhập sao kê

### Job

Bring a large amount of existing financial activity into MoneyFlow with minimal per-row work while preserving mapping, provenance and duplicate safety.

### Format priority

1. CSV — preferred.
2. Excel — supported where current parser behavior is trustworthy.
3. PDF with text layer — compatibility fallback.
4. Image-only/scanned PDF — not silently treated as equivalent to text-layer PDF; requires a separate OCR contract if ever supported.

### Required behavior

- Preview before candidates enter Inbox.
- Account/source selection or mapping remains explicit enough to preserve provenance.
- Remember safe import mapping per account/source when the existing persistence model can support it without introducing a second truth.
- Do not trust bank-supplied categories as MoneyFlow category truth by default.
- Duplicate handling must account for coexistence with manually entered transactions.
- Transfer matching remains a separate financial-semantic concern and must not be inferred solely from similar descriptions.
- Failed/partial imports must be recoverable and repeatable without silently duplicating accepted ledger facts.

## Share Target contract

PWA Share Target remains an optional transport feature.

It may receive:

- text → Ghi thông minh;
- CSV/Excel/text statement file → Nhập sao kê where supported;
- image → future Ghi thông minh OCR experiment only when that adapter exists.

Requirements:

- validate MIME/type/size and content before parsing;
- no behavior may depend exclusively on Share Target because browser/platform support is incomplete;
- the normal in-app chooser must always provide an equivalent manual route;
- Share Target must not become a fourth Capture menu item.

## Voice decision

### Keep

- keyboard/OS dictation into the Ghi thông minh text box;
- benchmark it as a user-input mode.

### Defer

- microphone button owned by MoneyFlow;
- audio recording storage;
- server-side STT;
- local Whisper/other model deployment;
- wake words or background listening.

### Promotion condition

A dedicated STT implementation may move from Deferred to Experiment only when all are true:

- keyboard dictation has been benchmarked on representative Android/iOS devices;
- a meaningful user cohort cannot use it reliably or discoverably;
- an owned STT prototype has lower median Time to Trusted Ledger Transaction or materially higher completion with acceptable correction burden;
- privacy, consent, retention and model/provider economics are specified;
- transcript/audio failure cannot silently create ledger truth.

## Chat decision

Do not build a multi-turn transaction-entry chatbot.

A chat-like interface is allowed only if future research proves a job that cannot be served by one-shot input + compact resolution. Conversation itself is not success.

## SMS decision

Do not request broad background SMS inbox access in the current product stage.

Retain user-controlled evidence paths:

- paste SMS text;
- Share Target text where available;
- statement import;
- future provider sync under a separate legal/security/economics case.

Any native SMS-permission proposal requires its own privacy/platform review and evidence that less-invasive paths fail the target job.

## Provider/bank sync decision

Bank/provider sync remains strategically valid but outside Capture V2 implementation scope.

A provider adapter may be piloted only after the Stage 1 acquisition foundations are sufficiently trustworthy:

- provenance contract;
- duplicate detection;
- transfer matching;
- source health/recovery;
- correction burden measurement;
- disconnect/delete behavior;
- provider/legal/security/economics case.

Provider sync must become another evidence adapter, not a parallel source of financial truth.

## Acceptance criteria

### Information architecture

- [ ] Capture hub exposes exactly three primary concepts: Ghi nhanh, Ghi thông minh, Nhập sao kê.
- [ ] Voice, OCR, SMS, Share and Chat do not appear as peer top-level capture methods.
- [ ] Existing deep links and PWA shortcuts remain compatible or have explicit redirects.

### Ghi nhanh

- [ ] Amount-first behavior remains the fastest single-transaction path.
- [ ] If PR #596 is merged, Capture V2 reuses its stable-default and correction contracts rather than recreating them.
- [ ] No arbitrary category fallback is introduced.
- [ ] Transfers remain financially neutral under existing semantics.

### Ghi thông minh — text/paste

- [ ] Typed and pasted text use one shared parse/preview flow.
- [ ] Keyboard dictation requires no MoneyFlow audio pipeline; resulting text follows the same parser contract.
- [ ] Parser uncertainty is visible and unresolved fields can be corrected before truth is committed.
- [ ] Existing rules may enrich candidates only through the established deterministic rule contract.
- [ ] Raw text is not sent to a new AI/provider merely because the UI is called `Ghi thông minh`.
- [ ] Candidate creation continues through Inbox/shared acquisition contracts; no hidden ledger write path is added.

### Image/OCR boundary

- [ ] Initial Capture V2 can ship without OCR.
- [ ] Any OCR implementation is a separately approved experiment using the same candidate/provenance/review semantics.
- [ ] Image evidence cannot silently determine category/account/transfer truth beyond explicit evidence/rules.

### Nhập sao kê

- [ ] CSV remains preferred and mapping is reviewable.
- [ ] Excel remains supported only under existing tested parser behavior.
- [ ] Text-layer PDF is clearly a fallback and scanned/image-only PDF is not silently accepted as equivalent.
- [ ] Imported rows preserve source/provenance and go through preview/review.
- [ ] Duplicate/replay behavior is tested against manually entered transactions.

### Platform/privacy

- [ ] Share Target is optional and not required for the core product flow.
- [ ] No new SMS, background notification, microphone, photo-library-wide or provider permission is introduced in the first Capture V2 slice.
- [ ] Product analytics never include raw transaction text, raw OCR output, receipt image, account number, amount, or other sensitive payload solely for funnel measurement.

## Required UX states

Each entry point must specify and verify:

- initial/empty;
- loading/analyzing;
- parse success;
- partial/uncertain result;
- invalid/no usable evidence;
- large amount/long merchant/long pasted text;
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

The Capture V2 primary metric is not feature usage. It is maintenance reduction while preserving trust.

### Primary benchmark

**Time to Trusted Ledger Transaction (TTLT)**

Measure from the moment the user intentionally starts capture until the transaction is in a state they can reasonably rely on under the relevant contract.

Suggested timing markers:

```text
capture_open
input_start
candidate_ready
review_done
save_success
correction_done (if needed)
```

### Supporting metrics

- active seconds per accepted transaction;
- taps / keystrokes per accepted transaction;
- percentage accepted without correction;
- field correction rate by amount/date/kind/account/category/merchant;
- abandonment rate;
- unresolved rate;
- manual interventions per 100 observed transactions;
- maintenance minutes per active user per month;
- acquired-versus-retyped share;
- batch active seconds per accepted transaction;
- duplicate/replay correction burden;
- correction within 60 seconds after save.

Do not log raw financial payload to calculate these metrics.

### Benchmark cohorts

Before promoting new acquisition methods, test on a physical phone with at least these task classes:

1. repeated everyday transactions where safe defaults exist;
2. new one-off transactions with several fields;
3. pasted bank/wallet/SMS evidence;
4. image/screenshot evidence when OCR is being evaluated;
5. a real-world statement file containing enough rows to measure amortized import effort.

Compare at minimum:

- Ghi nhanh;
- Ghi thông minh typed;
- Ghi thông minh via keyboard dictation;
- paste/share when evidence already exists;
- statement import;
- OCR only when that experiment is active.

Do not assume the same method must win every cohort.

## Expected method roles

These are hypotheses to test, not product claims:

| Method | Expected best role |
|---|---|
| Ghi nhanh + stable defaults | repeated single transactions |
| Ghi thông minh typed | new single transaction with multiple explicit details |
| Keyboard dictation | hands-busy / faster natural input where device dictation works |
| Paste/share text | bank/wallet evidence already present as text |
| Statement import | bulk/history |
| Screenshot/receipt OCR | evidence already present as image; experiment only |
| Provider sync | lowest ongoing maintenance after Stage 1 foundations prove safe |

## Architecture fit

### Shared acquisition contract

Capture V2 should preserve one convergence path:

```text
Adapter
  ↓
Evidence + provenance
  ↓
Normalized candidate
  ↓
Deterministic parse/rules/matching
  ↓
Confidence + unresolved fields
  ↓
Inbox / bounded trusted mutation
  ↓
Ledger
```

The implementation may reuse or extend current candidate types, but must not create technology-specific financial semantics.

### Ownership boundaries

- `AddTransactionDialog` / shared Ghi components own explicit manual capture behavior.
- `parse-text.ts` remains the deterministic text parser owner unless a planned refactor establishes a more neutral evidence-parser boundary.
- Inbox/candidate store remains the assisted acquisition staging owner.
- Rules remain deterministic and inspectable.
- Existing transaction hooks/mutations remain the ledger-write owner.
- Upload parser/mapping remains the bulk statement acquisition owner.
- Future OCR/STT/provider adapters produce evidence; they do not own ledger semantics.

## Planned implementation slices

Implementation must be separately authorized. When authorized, prefer the following order.

### Slice A — IA consolidation and compatibility

- Update Capture hub to exactly three primary actions.
- Introduce Ghi thông minh naming/surface without removing old routes abruptly.
- Preserve deep links and PWA shortcuts.
- Keep feature behavior otherwise unchanged.

This slice should be mostly presentation/routing and carries no new financial semantics.

### Slice B — Unified Ghi thông minh text/paste

- Reuse current deterministic parser and preview.
- Make typed short commands and pasted evidence feel like one flow.
- Remove duplicated conceptual distinction between “manual note” and “paste SMS”.
- Add privacy-safe benchmark events required for TTLT.

### Slice C — Benchmark against Ghi nhanh

- Run the defined physical-phone benchmark.
- Record median/p75 TTLT, correction and abandonment by cohort.
- Decide whether text/dictation materially reduces maintenance.

### Slice D — Image/screenshot OCR experiment

Only after owner approval and Slice C evidence:

- define OCR engine/provider/local-processing decision;
- define image retention/deletion;
- extend Share Target MIME acceptance only when the image adapter exists;
- test Vietnamese transfer screenshots/receipts;
- compare TTLT and correction burden against typed/paste/manual.

### Slice E — Statement import hardening

Continue existing statement work independently where possible:

- mapping memory;
- provenance;
- replay/idempotency;
- duplicate handling against manual entries;
- provider-specific bank export compatibility;
- exception-first review metrics.

## Explicitly rejected near-term alternatives

| Alternative | Reason for rejection |
|---|---|
| Separate Voice page | Duplicates the text parser path and creates audio/privacy/model cost before value is proven. |
| Multi-turn AI chatbot | More interaction turns for a job that should usually complete in one input + preview. |
| Background SMS reader | High permission/privacy/platform cost; user-controlled paste/share/import solves much of the job. |
| Standalone OCR page | Technology-centric IA; images should be one evidence mode inside Ghi thông minh. |
| OCR line-item bookkeeping | Scope and correction burden exceed the current personal-ledger acquisition job. |
| Share as fourth capture item | Transport mechanism with incomplete platform support, not a stable user job. |
| Direct import into ledger | Violates preview/provenance/correction boundaries and increases silent corruption risk. |
| AI category/merchant guessing in first slice | Adds probabilistic financial semantics before deterministic baseline and evaluation are exhausted. |
| Immediate broad bank sync | Provider/legal/security/economics complexity before Stage 1 acquisition foundations are proven. |

## Risks and counterexamples

| Risk | Prevention / required evidence |
|---|---|
| “Smart” becomes slower than Quick | Benchmark TTLT by cohort; Quick remains separate and amount-first. |
| Natural-language parser creates false confidence | Preserve uncertain fields/confidence; do not auto-commit ambiguous candidates. |
| Dictation errors are treated as trusted speech | Dictation is just text input; same parser/review applies. |
| Receipt OCR picks total/balance/reference incorrectly | Multiple candidate tokens trigger uncertainty/review; do not equate OCR confidence with financial correctness. |
| Screenshot leaks account/card data | Minimize retention, mask display where possible, never log payload in analytics. |
| Share Target breaks on unsupported platform | Equivalent in-app route is always available. |
| Consolidation breaks old links | Route compatibility/redirect tests. |
| PR #596 changes while Capture V2 is pending | Treat stable-default behavior as external dependency; rebase/review before implementation. |
| Imported bank category overwrites user taxonomy | Bank category is evidence only unless user-owned mapping/rule explicitly promotes it. |
| Duplicate manual + imported transaction | Matching/review contract before scaling import breadth. |
| More adapters increase maintenance instead of reducing it | Stop/pause any adapter whose review/correction cost erases acquisition savings. |

## Verification plan for implementation

No implementation claim is complete without exact evidence appropriate to the slice.

### Unit/domain

- text amount/date/kind parser counterexamples;
- ambiguous amounts and account-number-vs-amount cases;
- candidate confidence and uncertain-field behavior;
- route/option contract for exactly three Capture concepts;
- backward-compatible deep links;
- import mapping/replay/duplicate counterexamples where changed.

### Browser/E2E

- demo and authenticated runtime;
- empty/populated/error/loading;
- mobile/desktop at minimum, plus tablet where layout changes materially;
- Ghi nhanh save + correction;
- Ghi thông minh typed/paste → preview → Inbox;
- unsupported/invalid input;
- statement preview → candidate creation;
- Share Target where browser automation can exercise the real installed-PWA path, otherwise physical-device evidence is required.

### Physical device

Required before claiming capture speed improvement:

- representative Android phone;
- iPhone/iOS if the affected capability is claimed cross-platform;
- real keyboard dictation if comparing voice-like input;
- first-paint interaction, not retry-only success;
- record TTLT and correction evidence without capturing sensitive financial payload.

## Rollout and rollback

### Rollout

- Ship IA consolidation separately from new parser/OCR/provider semantics where possible.
- Keep old routes compatible while the new hub wording settles.
- Feature-gate experimental OCR/provider adapters if they add variable cost, permissions or unproven error behavior.
- Do not retire a working capture path until its replacement has physical-device and real-use evidence.

### Rollback

- IA changes should revert without data migration.
- Text parser changes must preserve candidate-store compatibility or include an explicit reversible migration plan.
- OCR/STT/provider experiments must be disableable without affecting existing ledger facts.
- No adapter rollout may require rewriting historical ledger records merely to remove the adapter.

## Success criteria

Capture V2 succeeds when:

- users only need to understand three capture concepts;
- repeated single transactions remain extremely fast;
- new/textual evidence can be converted into reviewable candidates with less manual form work;
- bulk statement acquisition reduces amortized maintenance effort;
- new adapters share one provenance/candidate/review architecture;
- correction and unresolved rates do not worsen materially;
- the product needs less user maintenance without hiding uncertainty.

The goal is **not** to maximize the number of ways to enter a transaction. The goal is to minimize the work required to turn real-world financial evidence into trustworthy ledger facts.

## Handoff

**From:** planner/researcher  
**To:** human owner  
**Current execution state:** `specified`

**Fixed decisions:**

- Three user-facing capture concepts: Ghi nhanh, Ghi thông minh, Nhập sao kê.
- Text/paste/dictation converge in one Ghi thông minh surface.
- Voice recorder/STT, background SMS, standalone chatbot and standalone OCR are not near-term features.
- Image OCR is an optional later experiment behind the same candidate/review contract.
- Statement import remains core bulk acquisition.
- Share Target remains transport only.
- Provider sync remains a later adapter, not part of this implementation scope.

**Unverified claims:**

- Exact TTLT improvement of Ghi thông minh versus Ghi nhanh has not yet been measured on MoneyFlow.
- OCR engine/provider choice has not been made.
- Physical-device cross-platform behavior of the proposed consolidated surface has not been verified.

**Next allowed action:** owner reviews/edits the specification. After explicit implementation authorization, transition to `planned` by assigning Slice A/B file owners, test matrix, rollout/rollback details and the exact branch/issue scope. Do not begin OCR/STT/provider implementation from this packet alone.
