# #432 — MoneyFlow master development program

**Status:** active  
**Execution state:** implementing  
**Active role:** planner / implementer  
**Permission scope:** branch documentation only for P0; later phases require their own bounded permission  
**Owner:** human owner  
**Issue/PR:** #432 / PR pending  
**Branch:** `research/432-vietnam-long-term-product-strategy`  
**Last updated:** 2026-08-21

## 1. Outcome

Develop MoneyFlow into a durable Vietnamese personal-finance product whose long-term default is **automatic or near-automatic acquisition of digital money activity**, while preserving a trustworthy user-owned ledger and manual capture as a fallback for cash, corrections and missing/off-system events.

The program is dependency ordered:

```text
Sources / evidence
  -> acquisition candidates + provenance
  -> normalization / duplicate / transfer matching
  -> trustworthy ledger facts
  -> clearing / reconciliation / correction
  -> understanding / review
  -> connected planning
  -> automation
  -> selective read-only providers
  -> wealth / together / optional intelligence when validated
```

This is not an authorization to build every capability immediately. Each phase is promoted only when its dependency and evidence gates are met.

## 2. Owner decisions now in force for this program

1. MoneyFlow remains a personal-finance-management product for Vietnam.
2. Manual entry must **not** remain the primary long-term workflow for digital transactions.
3. The product must be provider-independent: bank APIs, wallet/provider integrations, statements, file/share inputs, Android assistance and manual capture converge on one ledger/acquisition contract.
4. Existing ledger correctness is an asset to evolve, not rewrite.
5. Develop the whole product over time, but in dependency order and against measured user value.
6. External repositories are references for subsystem patterns, not a product to clone.
7. Merge, provider writes, production writes and public-beta acceptance remain owner decisions.

## 3. Repository truth reconciled before planning

Current `main@6d81d334fd7e6d491196bd993b283514cad2c160` says the released MVP is not public-beta ready. RRB-08 physical-phone proof remains open and P1 provider/contact/legal/deployment gates remain independent. Current main also still describes MoneyFlow as `manual-first` in `AGENTS.md`, `README.md` and `docs/product/PRINCIPLES.md`; this conflicts with the owner’s accepted long-term acquisition direction and is the first documentation defect P0 must resolve.

The target architecture already contains the right seams: Ledger Core; Planning; Understanding; Acquisition and Automation; Wealth; Identity and Ownership. It already requires provenance, candidates, duplicate/matching decisions and provider adapters behind a neutral acquisition contract. The architecture should therefore be reordered and clarified, not replaced by a rewrite.

Open work that must be reconciled rather than silently overridden:

- #403 performance work: open; not automatically closed by this program.
- #426 simplification program: directionally useful where it removes proven friction, but its original desktop-navigation premise was corrected by later repo evidence; it is not master authority.
- PR #431: conflicting candidate product-direction rewrite; not current authority and must be reconciled against #432 before merge.
- RRB-08 and other release gates: separate lanes and never closed by strategy docs.

## 4. Research summary that constrains implementation

### Vietnam / provider reality

- Digital banking/QR use is already widespread enough that retyping digital transactions cannot be the long-term product model.
- Vietnamese Open API regulation creates a real path to account/transaction information, but third-party access is contractual and requires consent/revocation plus security/operational controls; it is not a universal free API.
- No researched evidence establishes a universal consumer transaction-history API across all e-wallets.
- Provider connectivity must therefore be optional, read-only first and degradable.

### Android reality

- `NotificationListenerService` can observe posted notifications, but modern Android restricts sensitive notification content; ordinary third-party listeners cannot rely on receiving every bank-sensitive field.
- Google Play heavily restricts SMS/Call Log permissions. MoneyFlow must not make `READ_SMS` its primary distribution assumption.
- Android assistance is therefore an optional source adapter to evaluate after the neutral acquisition engine exists.

### Reference implementation evidence

Actual Budget establishes a useful import/reconciliation contract: source `imported_id` avoids duplicates; fallback matching can use date/amount/payee; import runs rules; dry-run is supported; import can update previously imported records such as clearing state; transfers use the same transaction system. MoneyFlow should adopt the **principles**, not Actual's storage/sync architecture.

## 5. Program invariants

### Financial

- VND remains integer đồng.
- Transfers remain equal/opposite movements and never income/expense.
- Source/provider records are evidence, not permission to mutate arbitrary balances.
- Corrections remain recoverable/audited.
- Fact / expectation / assumption / projection / suggestion remain distinct.

### Ownership and privacy

- Authenticated user-owned data remains tenant-isolated with database enforcement.
- Raw provider payloads, bank tokens and transaction notes never enter generic logs or project memory.
- Provider credentials/tokens use a dedicated secret boundary and lifecycle.
- Export/backup remain user-ownership capabilities and are not paywall hostage.

### Architecture

- Keep the modular monolith until a measured boundary justifies extraction.
- Parsers/adapters produce neutral candidates/source records.
- Import/provider jobs are idempotent and restartable.
- Read models remain rebuildable from facts/plans.
- No new queue/runtime/provider is selected before requirements make the decision necessary.

### Product

- Reduce human maintenance without reducing trust.
- Exception-first review beats forcing users to inspect every successfully matched record.
- Every aggregate can be traced to contributing records.
- Advanced capability remains progressively disclosed.

## 6. Master roadmap and phase gates

### P0 — Authority alignment and executable program — **NOW**

**Goal:** make the repository tell one non-contradictory story before runtime changes.

Tasks:

- P0.1 update #432 into the master program authority;
- P0.2 update this packet from research/evaluating to active execution;
- P0.3 persist the 2026 reference-repository atlas with license/reuse boundaries;
- P0.4 change future-facing product wording from `manual-first` to `automatic/near-automatic acquisition with manual fallback`, without falsely claiming current runtime has bank sync;
- P0.5 reorder long-term architecture so Acquisition/Reconciliation precede broad planning/wealth expansion;
- P0.6 register #432 in the Current Work Board and place #403/#426/PR #431 in explicit reconcile/hold status rather than leaving competing directions;
- P0.7 run documentation/knowledge/CI-policy/diff-hygiene gates on exact branch head;
- P0.8 independent review of contradictions, scope and source claims.

**Exit:** strategy/product/architecture docs agree on current capability versus future direction; one reviewable docs-only PR can be handed to owner. No runtime/provider/product capability is claimed.

### P1 — Acquisition foundation

**Goal:** make every future source feed one deterministic ledger-ingestion path.

Required specification before code:

- source and batch identity;
- source event/candidate model;
- parser/adapter/version provenance;
- stable external transaction ID when provided;
- deterministic fallback fingerprint when not provided;
- raw description/reference retention policy;
- candidate validation states;
- duplicate, transfer-match and reject decisions;
- dry-run/preview;
- atomic commit and idempotency;
- imported-deleted/reimport behavior;
- source correction/update behavior (for example pending -> cleared);
- audit fields safe enough to store;
- delete/disconnect semantics.

Implementation order:

1. inventory current `/imports`, paste/share/upload/direct CSV paths and existing parsing/domain helpers;
2. write pure contracts/fixtures/counterexamples first;
3. make one current source path use the neutral pipeline end-to-end;
4. prove replay/idempotency/atomic failure;
5. migrate other existing source paths one at a time;
6. only then consider schema expansion not required by existing structures.

Exit metrics:

- replaying the same source event does not create a second fact;
- manual and later-imported copies can match rather than duplicate;
- failed batches cannot partially commit;
- a source update cannot silently rewrite user-owned corrections;
- exact source/decision provenance is inspectable without exposing sensitive raw payloads.

### P2 — Low-maintenance ingestion

**Goal:** materially reduce the work to maintain a trustworthy month without depending on bank contracts.

Scope candidates, promoted from evidence only:

- Vietnamese bank/e-wallet statement formats users actually possess;
- controlled CSV/OFX/QFX/CAMT or applicable local exports;
- share/paste ingestion;
- merchant/payee normalization;
- user-confirmed deterministic categorization rules;
- recurring-pattern recognition;
- pending/cleared lifecycle;
- account reconciliation sessions;
- exception-first batch review.

Primary metrics:

- manual interventions / 100 observed transactions;
- maintenance minutes / month;
- unmatched rate;
- duplicate rate;
- correction rate after auto-match;
- transfer-match precision.

**Exit:** real users maintain a materially more complete ledger with less work and without worse financial error/correction rates.

### P3 — Understanding and trustworthy review

**Goal:** turn trusted data into a concise recurring reason to keep MoneyFlow.

- unresolved/exception state first;
- current balances and period inflow/outflow;
- explain meaningful changes through drill-down;
- weekly/monthly review/close state;
- `up to date through X` only where its coverage semantics are explicit;
- upcoming known obligations;
- one shared report query contract for page/drill-down/export;
- privacy-minimized product telemetry.

**Exit:** user can explain their current money state and unresolved data from source-linked records without chart hunting.

### P4 — Selective read-only connected sources

**Goal:** replace manual import for retained cohorts where provider economics work.

Before provider selection:

- current official API availability/contract review;
- consent/revoke lifecycle;
- security/privacy threat model;
- commercial/support economics;
- sandbox/real-user access path;
- rollback/disconnect/delete contract;
- provider health, cursor, retry/backoff/rate limit behavior.

First provider capability is limited to account information/balances/transaction history where legally and contractually available. Payment initiation is out unless a future separately authorized regulated product requires it.

**Exit:** connected users show lower maintenance cost, correct reconciliation and supportable provider economics.

### P5 — Connected planning

**Goal:** make planning consume facts instead of becoming a second manual database.

- recurring definitions create expectations;
- expected occurrences match posted facts;
- goals use explicit contribution/withdrawal links;
- financial calendar;
- reserves/commitments;
- deterministic forecast with visible coverage/assumptions;
- retire or demote planning surfaces that do not create measured recurring value.

### P6 — Automation platform

- versioned rules and decisions;
- suggestion learning from user corrections;
- confidence thresholds measured from labelled decisions;
- bounded auto-approval with undo/review;
- sync/background health and alerts;
- scoped API/webhooks;
- durable workflow technology selected only after failure/throughput/latency requirements are measured.

### P7 — Wealth

- assets/liabilities and net-worth semantics;
- loans and schedules;
- instruments/holdings/transactions;
- valuation observations;
- cost-basis/performance contract;
- explicit multi-currency migration before non-VND accounting.

### P8 — Together

- workspace/membership migration;
- private/shared financial scopes;
- RLS permission matrix;
- shared expenses/settlement semantics;
- separation, removal, export and delete.

### P9 — Optional intelligence

- grounded explanations;
- ambiguous categorization suggestions;
- anomaly/recurring explanation;
- natural-language queries over authorized data;
- source citations, confidence, privacy minimization and opt-out;
- never autonomous financial advice or unsupported posting.

## 7. Reference repository policy

Deep reference set for future subsystem specs:

| Domain | Primary references | Use |
|---|---|---|
| PFM/import/reconciliation | `actualbudget/actual`, `firefly-iii/firefly-iii` | transaction lifecycle, rules, imports, reconciliation, transfers |
| Open Banking abstraction | `OpenBankProject/OBP-API` | provider-neutral contracts and consent/account/transaction boundaries |
| mobile assisted capture | `sarim2000/pennywiseai-tracker`, `p4r1ch4y/upi-analyser` | parser/fusion/permission/privacy patterns; never assume India policies map to Vietnam |
| ledger correctness | `ledger/ledger`, `blnkfinance/blnk`, `flash-oss/medici` | accounting invariants, audit/reversal/reconciliation patterns |
| async workflow | `graphile/worker`, `dbos-inc/dbos-transact-ts` | Postgres-first jobs/durable workflows when requirements justify them |
| wealth | `wealthfolio/wealthfolio`, `ghostfolio/ghostfolio`, `rotki/rotki` | asset/portfolio/performance boundaries |
| together | `spliit-app/spliit`, `oss-apps/split-pro` | shared-expense semantics and source-of-truth derived balances |
| analytics/security | `umami-software/umami`, `OWASP/ASVS`, `OWASP/CheatSheetSeries` | privacy-minimized product evidence and security verification |

Default rule: select 2–4 sources per bounded decision; do not study every repo for every task.

License rule: MIT/Apache sources may be evaluated for code reuse after dependency/security review; AGPL/GPL/custom-restricted sources are architecture/test/product references unless legal review explicitly allows reuse.

## 8. Program metrics

North-star concept: **trusted periods maintained with decreasing maintenance effort**.

Operational metrics:

- manual interventions / 100 observed transactions;
- maintenance minutes / active user / month;
- source coverage;
- source parse success by source/version;
- exact-ID match rate vs fuzzy-match rate;
- automatic-match precision;
- unresolved/duplicate/correction rates;
- reconciliation completion/confidence;
- time to first trustworthy period;
- multi-period retention;
- export/restore success;
- provider cost and support cost per retained paying user.

Do not optimize DAU or feature count as primary success metrics.

## 9. User validation program

Before native/provider/wealth/AI commitments:

1. recruit a small target cohort with digital banking/QR use and varied account complexity;
2. observe how a real period is reconstructed from current sources;
3. test improved import/reconciliation as a concierge workflow;
4. measure maintenance effort and correction burden;
5. repeat across another period;
6. test willingness to pay with an actual commitment mechanism, not only survey intent;
7. record reasons for churn/non-use.

Falsify/revise the strategy if lower maintenance does not improve continuing value/retention, users do not value a provider-independent whole-money picture, or provider/legal/support economics exceed retained user value.

No participant financial details, raw statements or PII belong in repo documents.

## 10. Tasks and tracking

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0.1 | promote #432 from research issue to master program | owner decision | issue body | done |
| P0.2 | convert packet to active master program | P0.1 | this file | done |
| P0.3 | persist expanded repo atlas | P0.1 | research doc | in_progress |
| P0.4 | reconcile future-facing product wording | P0.2 | AGENTS/README/principles/vision diff | todo |
| P0.5 | reorder architecture delivery sequence | P0.4 | target architecture diff | todo |
| P0.6 | register #432 on Current Work Board; reconcile #403/#426/#431 status | P0.2 | board + issue/PR notes | todo |
| P0.7 | documentation/knowledge exact-head gates | P0.3–P0.6 | CI/local evidence | blocked |
| P0.8 | independent evaluation + fixes | P0.7 | review findings | blocked |
| P0.9 | owner merge decision | P0.8 | explicit owner action | blocked |
| P1.0 | acquisition-foundation reconnaissance/spec | P0.9 | bounded Class 3 packet/spec | blocked |

Only the promoted current slice becomes executable. Do not pre-create all P1–P9 child issues.

## 11. Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-18 | owner | researcher | discovery | #432 research mandate | market/product thesis unknown | research from first principles |
| 2026-08-18 | researcher | owner | evaluating | Vietnam strategy research + owner correction | retention/WTP/provider economics unproven | owner decide direction |
| 2026-08-21 | owner | planner/implementer | implementing | explicit instruction to create detailed plan, persist, track and execute; automatic/near-auto digital ingestion is strategic default | main docs still say manual-first; competing PR #431 exists | execute P0 docs-only alignment on existing branch |

## 12. Permission and stop boundary

P0 granted scope: documentation/research writes on `research/432-vietnam-long-term-product-strategy` and issue/board tracking necessary to represent the accepted program.

P0 forbidden:

- application/runtime code;
- schema/migration/RLS change;
- provider credentials/configuration;
- production/deployment writes;
- financial semantic mutation;
- merge;
- closing RRB-08 or owner/legal/provider gates.

Stop and report if P0 would need to invent provider availability, claim existing automatic capture that does not ship, or resolve a conflicting owner decision without current evidence.

## 13. P0 verification

Required before owner handoff:

- `npm run check:knowledge`;
- `npm run test:ci-policy`;
- `git diff --check` or equivalent exact diff hygiene;
- any docs-specific gate selected by `agent:doctor`;
- independent evaluator checks authority contradictions, research claims, license boundaries and accidental runtime/product-capability claims.

No browser/database/provider/production evidence is claimed for a documentation-only P0.

## 14. Delivery record

- Branch: `research/432-vietnam-long-term-product-strategy`
- PR: pending
- Main merge: owner decision only
- Production: not applicable for P0
- Current phase: P0 Authority Alignment
