# MoneyFlow — reference repository atlas 2026

**Status:** active research reference for #432
**Created:** 2026-08-21
**Purpose:** subsystem reference map for long-term MoneyFlow development; not a roadmap, dependency manifest or permission to copy external product scope.

## Selection rules

A repository enters this atlas only if it contributes a distinct implementation pattern, domain invariant, verification technique or architectural boundary relevant to MoneyFlow. GitHub stars are a weak adoption signal, not proof of correctness. Current maintenance, code/tests, license, product fit, operational cost and MoneyFlow's own implementation are more important.

For each bounded task, use **2–4** relevant sources from this atlas. Do not make agents study the entire list before every change.

License policy:

- **MIT / Apache-2.0:** code/library reuse may be evaluated after security, maintenance, bundle/runtime and architecture review.
- **AGPL / GPL:** use primarily for concepts, data models, interaction patterns and tests unless legal review explicitly approves code reuse.
- **Custom / restricted / Commons-Clause-like:** research only unless the license is reviewed for the exact proposed use.

External code never overrides MoneyFlow's integer-VND, transfer neutrality, RLS ownership, correction/recovery, privacy or delivery contracts.

## Tier A — primary subsystem references

| Repository | Approx. adoption signal at review | License | MoneyFlow use | Reuse posture |
|---|---:|---|---|---|
| `actualbudget/actual` | ~28k stars | MIT | import/reconciliation, imported IDs, duplicate matching, rules, transfers, pending/cleared, reports, local-first product discipline | deepest PFM implementation reference; selective code/library ideas possible |
| `firefly-iii/firefly-iii` | ~24k | AGPL-3.0 | broad ledger semantics, double entry, transfers, recurring, rules, importer, REST API, reporting | architecture/domain reference; do not copy code casually |
| `OpenBankProject/OBP-API` | ~1.7k | open source | provider-neutral account/transaction/consent API abstractions, views/permissions and Open Banking integration boundaries | architecture/API reference |
| `sarim2000/pennywiseai-tracker` | 500+ | AGPL-3.0 | Android bank-SMS parsing, on-device processing, merchant learning, recurring detection, permission UX | mobile pattern reference; India policies/formats do not transfer directly |
| `p4r1ch4y/upi-analyser` | small/new | OSS | notification/SMS/CSV -> parser -> resolution -> fusion -> encrypted ledger separation | strong architecture reference for source fusion; validate maturity before reuse |
| `securo-finance/securo` | ~1.9k | AGPL-3.0 | modern self-hosted PFM seams: accounts, import formats, rules, assets, provider adapters, auth, multi-currency | architecture/product reference |
| `wealthfolio/wealthfolio` | ~8.5k | AGPL-3.0 | investments, net worth, activity model, performance, goals, addon/provider extension | future Wealth reference |
| `ghostfolio/ghostfolio` | ~9k | AGPL-3.0 | portfolio performance, asset modeling, PWA/mobile-first wealth presentation | future Wealth reference |
| `spliit-app/spliit` | ~2.8k | MIT | household/shared-expense splitting, reimbursements, receipts, simple group UX | future Together reference; selective reuse possible |
| `graphile/worker` | ~2.3k | MIT | PostgreSQL-native background jobs, retries, scheduling, LISTEN/NOTIFY | evaluate first if MoneyFlow needs a simple job runner |
| `dbos-inc/dbos-transact-ts` | ~1.3k | MIT | Postgres-backed durable workflows, queues, exactly-once/idempotent workflow patterns, long waits/schedules | evaluate when acquisition/provider sync needs durable multi-step recovery |
| `OWASP/CheatSheetSeries` | ~32k | CC BY-SA | auth/session/secrets/access-control/logging/privacy implementation guidance | security reference |
| `OWASP/ASVS` | mature standard | CC | executable security acceptance framework | security verification authority/reference |
| `umami-software/umami` | ~38k | MIT | privacy-first product/web analytics | telemetry tool/reference candidate |
| `PostHog/posthog` | ~37k | mixed/open core | funnels, cohorts, retention, flags, experiments, replay | product analytics reference; privacy/event-governance review required before use |

## Tier B — focused algorithm/architecture references

| Repository | License | Use |
|---|---|---|
| `ananthakumaran/paisa` | AGPL-3.0 | reporting/financial visualization and plaintext-ledger derived views |
| `ledger/ledger` | open source | mature double-entry/reporting invariants and query semantics |
| `blnkfinance/blnk` | Apache-2.0 | production-oriented ledger, balances, inflight transactions and reconciliation concepts |
| `flash-oss/medici` | MIT | journal balancing, void/reversal and audit patterns |
| `dinerojs/dinero.js` | MIT | future explicit money/currency value-object discipline; only if existing integer helpers become insufficient |
| `fire-la/billclaw` | MIT | multi-source connector/plugin separation and raw -> normalized financial-data pipelines |
| `martinohansen/ynabber` | GPL | reader -> normalized transaction -> writer connector pattern |
| `DAdjadj/bridge-bank` | restricted/custom | real Open Banking sync loop: pending -> cleared, source IDs, transfer linking, consent expiry; research only |
| `ritesh-kanwar/Cashiro` | AGPL-3.0 | Android SMS/PDF ingestion, subscriptions and on-device architecture |
| `oss-apps/split-pro` | MIT | shared balances derived from source expenses, refunds/corrections/activity feed |
| `triggerdotdev/trigger.dev` | Apache-2.0 | long-running jobs, retries, schedules, observability and human-in-loop; avoid until simpler Postgres-first options are insufficient |
| `Openpanel-dev/openpanel` | AGPL-3.0 | self-hosted funnels/cohorts/retention/experiments |
| `rustledger/rustledger` | GPL | import/dedup/reconciliation and future holdings/cost-basis algorithms |
| `tackler-ng/tackler` | Apache-2.0 | audit, commodities/valuation and high-performance reporting |
| `frappe/books` | AGPL-3.0 | offline accounting/journal/report concepts |
| `bigcapitalhq/bigcapital` | AGPL-3.0 | TypeScript accounting/report boundaries |
| `rotki/rotki` | AGPL-3.0 | advanced portfolio event history, privacy and valuation workflows |

## Decision map

### Acquisition / import / reconciliation

Default trio:

1. `actualbudget/actual` — transaction-import behavior and reconciliation;
2. `firefly-iii/data-importer` / Firefly ecosystem — importer separation, mapping and rules;
3. one source-specific reference such as `p4r1ch4y/upi-analyser`, `billclaw` or an official provider SDK/spec.

Questions to extract:

- stable source identity;
- raw source preservation;
- idempotent replay;
- fallback duplicate matching;
- pending -> cleared update;
- manual-before-import reconciliation;
- transfer pairing;
- dry-run/preview;
- atomic failure;
- deleted/reimport policy;
- source correction vs user correction precedence.

### Provider/Open Banking

Default references:

- official Vietnamese regulation/provider documentation first;
- `OpenBankProject/OBP-API` for neutral API/consent modeling;
- Actual/Bridge Bank/Ynabber only for operational patterns such as cursor, retry, account mapping and source IDs.

Never assume EU PSD2 capabilities, economics or consent durations apply to Vietnam.

### Android assisted capture

Default references:

- official Android platform documentation;
- Google Play sensitive-permissions policies;
- `pennywiseai-tracker` and `upi-analyser` for parser/fusion/app architecture.

Hard boundary: SMS/notification access is a fallible source adapter, not financial truth. Android sensitive-content redaction and store-policy constraints must be tested against current target OS/distribution.

### Ledger/reconciliation correctness

Default references:

- MoneyFlow current code/tests first;
- Actual/Firefly for user-facing state/lifecycle;
- Ledger/Blnk/Medici for invariants, reversal and reconciliation patterns.

Do not adopt a generic ledger service merely because one exists.

### Background workflows

Decision order:

1. existing request/runtime and PostgreSQL primitives;
2. `graphile/worker` if queued retry/scheduling is enough;
3. `dbos-transact-ts` if multi-step durable/recoverable workflows are required;
4. Trigger.dev/other infrastructure only if measured requirements exceed the first two.

No Redis/Kafka/Temporal-style architecture by default.

### Wealth

Default references:

- Wealthfolio for local-first activity/holdings/addon boundaries;
- Ghostfolio for performance/asset modelling;
- Rotki for event decoding/valuation/privacy where complexity requires it.

MoneyFlow must specify accounting and cost-basis semantics independently before implementation.

### Together

Default references:

- Spliit for simple group expense UX;
- SplitPro for source-expense derived balances, refunds/corrections and activity history.

MoneyFlow must build workspace/membership/RLS ownership before shared-finance UI.

### Product evidence

Default approach:

- privacy-minimized first-party event plan;
- Umami if simple aggregate evidence is enough;
- deeper event/cohort tooling only when questions require it.

Never send transaction amount, balance, account identifiers, notes, raw provider payload, bank descriptions or equivalent personal financial content as analytics event properties.

## Current external evidence captured for #432

### Actual Budget

Actual's current API documents `imported_id` as a bank/source-provided unique identifier for duplicate avoidance. `importTransactions` goes through the same import/reconciliation behavior as file/bank imports, runs rules, supports dry-run, creates transfers when specified and can update previously imported records. File import documentation also explains fallback matching around date, amount and similar payee when a stable imported ID is unavailable.

Use this as evidence for the **shape** of MoneyFlow's acquisition contract, not as permission to copy Actual's local-first sync/storage architecture.

### Android / Google Play

Current Android documentation defines `NotificationListenerService` as the system service for notification posting/removal callbacks. Newer Android permission documentation also states that sensitive notification information may be unavailable to ordinary notification listeners without a privileged permission that normal third-party apps cannot rely on.

Google Play's current SMS/Call Log policy treats those permissions as highly sensitive/restricted. MoneyFlow therefore must not design its Play-distributed Android product around unrestricted SMS inbox access.

## Review cadence

Review this atlas when one of these occurs:

- a primary reference becomes unmaintained or changes license;
- MoneyFlow is about to adopt code/dependency from a reference;
- a new subsystem lacks a useful current reference;
- official platform/provider policy changes invalidate a pattern;
- at least six months have passed since the last full review.

Do not refresh star counts for vanity. Update only when the decision value changes.
