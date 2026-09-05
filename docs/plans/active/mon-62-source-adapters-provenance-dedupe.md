# MON-62 — source adapters, mappings and provenance-safe dedupe

**Status:** specified
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write
**Owner:** ThunderK
**Issue/PR:** Linear MON-62 / GitHub PR #550
**Fresh-main baseline:** `06c3a0cc804c3764e0b7e1a94b6c556009b2b46e`
**Last updated:** 2026-09-05

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 acquisition/data-integrity packet. The selector PR changes planning authority only. Runtime implementation starts only after explicit owner merge and fresh `npm run plan:resolve` plus `npm run agent:doctor -- --json`.

## Outcome

MoneyFlow gains one deterministic source-adapter contract that can preserve source evidence from parse through preview, Inbox candidate creation, matching and approval without creating a second financial truth. Stable source identity is emitted only when its namespace and stability are actually proven. Missing or ambiguous dates, amount direction and identity fail closed. Existing generic CSV/XLSX ownership, Inbox review and ledger mutation authority remain intact.

The first implementation target is the existing file acquisition path. It establishes reusable source-adapter plumbing and tests; it does not claim bank-specific auto-map support for Vietcombank, ACB or VietinBank while exact consumer export layouts remain unproven.

## Repository reconnaissance

### Current behavior

- `src/lib/inbox/provenance.ts` already models `sourceExternalId`, `sourceLifecycleState`, `sourcePredecessorExternalId`, parser/mapping versions and match evidence.
- `candidateProvenanceInsertPatch()` already knows how to persist lifecycle and predecessor fields.
- `src/lib/inbox/inbox-map.ts::prepareCandidateForServer()` currently preserves only source row index, external ID, parser version and mapping version; lifecycle and predecessor evidence are dropped.
- `src/hooks/client-inbox.ts::addCandidatesForClient()` projects the same reduced provenance set and drops lifecycle/predecessor before the server action.
- `src/app/actions/inbox.ts::createCandidateSchema` accepts source row index, external ID, parser version and mapping version, but not lifecycle/predecessor.
- `src/components/inbox/import-preview-page.tsx` reads generic `ParsedCsvRow[]` drafts and calls `toCsvCandidateInputs()`, so richer source-adapter evidence would currently be lost before Inbox insertion.
- `src/lib/inbox/parse-csv.ts` has generic date fallback behavior that can produce today's date for missing/unparseable cells while marking uncertainty. Adapter mode must not inherit that fallback.
- `src/lib/inbox/direct-csv-import.ts` and its database contract intentionally reject invented source IDs. Direct CSV remains the generic advanced path, not the provider-adapter path.
- Production provenance/source-lineage migrations already provide exact-source matching, changed-observation handling, deleted-source behavior and predecessor/replacement handling. No schema is required merely to obtain those semantics.

### Existing financial/data authority

All sources continue through the same path:

`source evidence → normalized candidate → Inbox/review → matching/approval → ledger/provenance → reconciliation`

A parser or adapter never writes financial tables directly, never auto-posts source lifecycle, and never replaces user correction/reconciliation authority.

### Known identity constraint

The database uniqueness boundary is effectively `(user_id, source, source_external_id)`, where `source` is the transport family (`csv`, `xlsx`, `pdf`, etc.), not the financial institution or account. A raw external transaction reference therefore cannot be persisted safely unless its complete source namespace is represented deterministically.

A MoneyFlow account UUID is not automatically a valid namespace component because user mapping can be corrected later. Provider name alone is insufficient for account-scoped IDs. If required namespace components are unavailable, unstable, private in an unsafe form, or inferred from mutable user mapping, the adapter must omit `sourceExternalId` and fall back to existing review/matching behavior.

## Research

### Decision questions

1. What identity scope must an adapter carry before MoneyFlow can treat an external ID as replay-safe?
2. How should pending/posted or correction lineage be represented without overwriting ledger truth?
3. How should spreadsheet dates be normalized without inventing timezone or calendar meaning?
4. Can MON-62 use existing database contracts rather than adding schema prematurely?

### Focused sources

| Source | Authority/type | What it establishes | Applicability limit |
|---|---|---|---|
| OFX 2.2 specification, Financial Data Exchange: `https://www.financialdataexchange.org/common/Uploaded%20files/OFX%20files/OFX%202.2.pdf` | financial-data interchange specification | `FITID` exists for duplicate detection, must be unique within an account, is not globally unique across financial institutions, and a client may need FI + account + FITID for a global key | architecture evidence only; does not prove Vietnamese bank-export fields |
| UK Open Banking v4 Transactions: `https://openbankinguk.github.io/read-write-api-site3/v4.0/resources-and-data-models/aisp/Transactions.html` | official open-banking data model | optional `TransactionId` is unique and immutable within a servicing institution | not evidence that target-bank Excel files expose the same field |
| Plaid Core Exchange 6.3: `https://plaid.com/core-exchange/docs/reference/6.3/` | official transaction exchange contract | transaction IDs are persistent and account-scoped; pending and posted versions use different IDs and can be linked separately | provider API semantics, not target-bank export semantics |
| SheetJS Dates and Times: `https://docs.sheetjs.com/docs/csf/features/dates/` | official parser documentation | Excel commonly stores date/time as numeric serials plus number formats; 1900/1904 systems and timezone interpretation matter; parser options can expose number/date cells | parsing mechanics only; does not define a bank's business timezone or field meaning |

### Research decision

Identity scope is part of the source contract, not an implementation detail. A source adapter may expose an identity candidate only when it also knows the evidence-backed namespace required to make that ID stable. Pending/posted lineage is separate evidence and must not be collapsed into one ID by guessing. Spreadsheet date normalization must preserve enough raw/format context to make a deterministic decision and must reject ambiguity rather than apply the runtime's current date.

No source reviewed justifies bank-specific auto-map or stable-ID extraction for VCB/ACB/VietinBank consumer Excel exports today. Those flags remain false.

## Specification

### Core source-adapter contract

Introduce one pure, versioned adapter boundary. Exact naming may follow repository conventions, but the semantic contract must include:

- adapter/provider key and deterministic adapter version;
- transport type (`csv`, `xlsx`, or future compatible source);
- normalized candidate financial fields only when proven;
- raw source row index for inspectability, never identity;
- optional source identity evidence with explicit `identityScope`;
- optional source lifecycle state and predecessor/replacement identity;
- parser version and mapping version;
- uncertainty/validation findings suitable for review;
- no mutation capability.

`identityScope` must distinguish at least the scopes needed by accepted evidence, for example institution-wide versus account-scoped. It must not imply broader uniqueness than the source contract proves.

### Canonical source identity rules

A canonical `sourceExternalId` may be emitted only when all of these are true:

1. the source provides a non-empty transaction identifier;
2. evidence marks it source-stable, not display-only/export-local/row-local;
3. the identity scope is explicitly known;
4. every namespace component required by that scope is present from stable source evidence;
5. canonicalization is deterministic across replay and overlapping exports;
6. the canonical form does not depend on parser version, row order, filename, import batch ID, MoneyFlow fingerprint or mutable MoneyFlow account mapping;
7. privacy review accepts how any namespace material is represented/persisted.

If any requirement fails, omit `sourceExternalId`. Do not synthesize an ID from date/amount/description hashes.

### Strict financial-field validation

Adapter mode must fail closed:

- missing or ambiguous required date: invalid/reviewable; never substitute today;
- ambiguous date locale or spreadsheet epoch/format: preserve evidence and reject automatic normalization;
- unsafe/non-integer VND amount: invalid;
- ambiguous debit/credit direction: invalid/reviewable;
- unsupported currency semantics: explicit uncertainty; never silently convert;
- unknown lifecycle/status: omit lifecycle evidence rather than infer;
- source `removed` without a known matching source identity: never create a new ledger candidate.

### Evidence-aware preview/draft

The upload → draft → preview → candidate path must preserve supported source evidence end-to-end. Preview remains non-authoritative and does not itself create ledger facts.

At minimum, accepted provenance must survive through:

`adapter result → import draft → preview → candidate input → client facade → server schema → candidate insert`

This includes `sourceExternalId`, `sourceLifecycleState`, `sourcePredecessorExternalId`, `parserVersion` and `mappingVersion` when present.

### Existing ownership preserved

- normal Inbox review/approval remains the only financial mutation route for adapter-produced candidates;
- existing duplicate/transfer/reconciliation rules remain authoritative;
- direct CSV remains generic and does not become a provider-specific bypass;
- source observations may preserve change/replacement evidence but cannot silently overwrite user-edited ledger facts;
- no new provider credentials, live sync, browser scraping or production data write.

## Acceptance criteria

- [ ] A pure deterministic source-adapter/normalized-row contract exists with explicit versioning and identity scope.
- [ ] Canonical source identity tests prove account/provider namespace collisions cannot alias each other.
- [ ] Row number, filename, file-local sequence, generated hash, display reference and MoneyFlow fingerprint cannot become `sourceExternalId`.
- [ ] Missing/ambiguous adapter dates fail closed and never become the current date.
- [ ] Ambiguous amount direction fails closed or remains explicitly reviewable.
- [ ] Upload/draft/preview preserves source external ID, lifecycle, predecessor, parser version and mapping version end-to-end where supplied.
- [ ] Replay of a stable exact-source observation cannot create a second ledger fact through the approved path.
- [ ] Changed source observation preserves user corrections and follows existing provenance semantics.
- [ ] Pending → posted predecessor/replacement evidence is preserved without auto-reconciliation or silent ledger overwrite.
- [ ] No-ID sources continue through existing heuristic/review behavior without invented stable identity.
- [ ] Existing generic CSV/XLSX parsing and Direct CSV contracts remain backward compatible unless a separately tested fail-closed correction is intentionally included.
- [ ] VCB/ACB/VietinBank bank-specific auto-map remains disabled until exact layout evidence is added in a later evidence-backed change.
- [ ] Fixtures are structural/synthetic only and contain no customer statement data, account numbers, credentials or real transaction references.

## Implementation plan

### Planned areas

| Area | Planned change | Constraint |
|---|---|---|
| `src/lib/inbox/` adapter module(s) | pure source-adapter and identity canonicalization contract | no mutation or provider networking |
| `src/lib/inbox/import-draft-store.ts` | evidence-aware normalized draft shape/versioning | preserve backward compatibility or explicit migration/fail-safe |
| `src/components/inbox/capture-upload-page.tsx` | route recognized adapter evidence into draft | no bank claim without evidence |
| `src/components/inbox/import-preview-page.tsx` | project evidence-aware rows to candidate inputs | preview remains non-authoritative |
| `src/hooks/client-inbox.ts` | preserve lifecycle/predecessor provenance | no authority expansion |
| `src/app/actions/inbox.ts` | validate accepted lifecycle/predecessor fields | authenticated viewer/RLS stays authoritative |
| `src/lib/inbox/inbox-map.ts` | stop dropping lifecycle/predecessor evidence | use existing provenance mapper |
| focused tests/fixtures | identity/date/lifecycle/replay/collision counterexamples | synthetic/privacy-safe only |

### Schema decision

Default: no new migration. Existing provenance/source-lineage structures should be reused.

A schema change is permitted only if implementation proves that an accepted source identity scope cannot be represented safely and stably within current contracts without PII leakage, mutable MoneyFlow mapping, or namespace collision. If that occurs, return the packet to specification/evaluation, document the exact missing primitive and add migration/RLS/pgTAP scope before implementation continues.

### Generic date fallback boundary

The known generic parser fallback-to-today behavior is a product-law concern. MON-62 must guarantee strict adapter behavior. A broader generic-parser correction may be included only if its row/error contract and existing fixtures can be changed with explicit regression coverage in the same bounded PR; otherwise record it as a follow-up hardening issue and do not let adapter mode inherit it.

## Counterexamples and required tests

| Counterexample | Required result |
|---|---|
| same raw transaction ID at two institutions | identities do not collide |
| same raw transaction ID in two accounts when source says account-scoped | identities do not collide; if source account namespace unavailable, no stable ID is emitted |
| same file imported twice | exact stable source observation remains idempotent |
| overlapping exports with reordered rows | row order does not affect identity |
| blank date | adapter result invalid/reviewable, never today |
| locale-ambiguous `01/02/2026` without evidence | fail closed |
| Excel serial under unknown/contradictory date system | fail closed/preserve evidence |
| pending ID replaced by posted ID with predecessor | lineage preserved; no silent ledger overwrite |
| same source ID with changed source fields | existing changed-observation behavior, no silent user-correction loss |
| removed source ID never seen before | no new transaction created |
| no source-stable ID | existing heuristic/review path, no synthetic ID |
| display/reference value marked unverified | not persisted as source identity |

## Verification plan

Selector PR:

- exact-head project knowledge/policy checks;
- CodeQL and Secret-history as selected by repository policy;
- no runtime/provider/deployment claim.

Implementation PR after selector merge:

- `npm run check:knowledge` and CI policy contract;
- lint, typecheck, unit tests and production build;
- focused adapter/provenance/import-draft tests;
- existing generic CSV/XLSX/direct-import regression suite;
- browser smoke including authenticated ownership when the upload/preview path changes;
- database reset + pgTAP only if schema/RPC behavior changes;
- exact-head CI/CodeQL/Secret-history with no retry-pass accepted;
- independent counterexample evaluation before `ready_for_review`.

## Tasks

| ID | Task | Dependency | Status |
|---|---|---|---|
| T1 | Select this packet from fresh main and reconcile durable authority memory | owner selection | in_progress |
| T2 | Implement pure adapter + identity-scope/canonicalization contract and counterexample tests | T1 merged | todo |
| T3 | Add strict adapter field/date normalization | T2 | todo |
| T4 | Make import draft/preview evidence-aware | T2/T3 | todo |
| T5 | Preserve lifecycle/predecessor through client/action/map seams | T4 | todo |
| T6 | Prove replay, collision, changed-observation, predecessor and no-ID behavior | T2-T5 | todo |
| T7 | Independent evaluation and exact-head acceptance | T2-T6 | todo |
| T8 | Same-PR lifecycle convergence: archive packet, `current → null`, update memory, then owner handoff | T7 | todo |

## Handoff record

| Date | From | To | State | Evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-05 | researcher | planner | specified | fresh main `06c3a0cc...`; current code seam audit; MON-62 tracker; OFX/Open Banking/Plaid/SheetJS source refresh; selector PR #550 | exact Vietnamese consumer export layouts/stable IDs still unknown; source namespace privacy representation must fail closed | verify selector #550 exact head; implementation waits for explicit owner merge |

## Permission boundary

- Allowed in selector: branch/PR documentation, authority manifest candidate, current-memory reconciliation, PR memory and exact-head verification.
- Forbidden in selector: runtime code, migrations, database/Auth/provider settings, external bank access, production data, Vercel production changes, live sync claims.
- After selector merge: branch-scoped implementation only under this packet. Provider/production writes still require separate explicit owner authorization.
- Stop condition: if implementation needs an unplanned schema, provider credential, unsafe identity namespace, guessed financial field, or contradicts fresh runtime evidence, move back to specification rather than widening scope silently.

## Lifecycle closeout requirement

The implementation PR that completes MON-62 must archive this packet under `docs/plans/completed/`, set `PLAN_AUTHORITY.current` to `null`, update `CURRENT_PROJECT_MEMORY.md`, and leave MON-63 unselected. MON-63 may only be selected later from fresh main in a separate owner-controlled selector transition.
