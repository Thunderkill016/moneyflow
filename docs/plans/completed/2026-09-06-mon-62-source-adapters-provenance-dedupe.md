# MON-62 — source adapters, mappings and provenance-safe dedupe

**Status:** implementation accepted; archived by PR #552 lifecycle closeout
**Execution state:** completed implementation; owner merge and post-merge production verification remain handoff boundaries
**Active role:** evaluator / owner handoff
**Permission scope:** branch_write
**Owner:** ThunderK
**Issue/PR:** Linear MON-62 / GitHub PR #552
**Selector:** GitHub PR #550
**Implementation base:** `main@388549f99a288d99249e26f4116539e6705cb3ff`
**Last updated:** 2026-09-06

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is the archived implementation record for the Class 3 MON-62 acquisition/data-integrity slice. It does not authorize a follow-on slice and does not relax owner-only merge policy.

## Outcome

MoneyFlow now has a bounded, deterministic source-adapter foundation that can preserve evidenced source identity and lineage through the existing Inbox/provenance path without creating a second financial truth.

The slice establishes reusable infrastructure for future evidence-backed Vietnamese bank/file adapters while deliberately refusing to claim current bank-specific headers, stable transaction IDs or live bank connectivity that the evidence does not support.

## Completed contract

### 1. Pure, versioned adapter boundary

- `src/lib/inbox/source-adapter.ts` defines a pure `SourceAdapter` / normalized-row contract.
- The contract has explicit adapter/parser/mapping version fields.
- No adapter API can write ledger state directly.
- Existing Inbox planning/approval remains the sole financial mutation authority.

### 2. Source identity scope and persistence safety

- Stable identity requires non-empty, confirmed, source-stable evidence.
- Institution-scoped and account-scoped identities are distinct namespaces.
- Account-scoped identity additionally requires a persistence-safe source account key.
- Mutable MoneyFlow account mapping is not automatically source evidence.
- Canonical identity encodes namespace + source reference and is bounded to the persistence limit.
- Invalid or overlong identity fails closed; identity is never truncated.
- Row numbers, UI/display references, export-local counters, generated hashes and MoneyFlow fingerprints do not become authoritative source IDs.

### 3. Strict adapter financial semantics

Adapter date normalization:

- accepts only explicitly supported text formats or typed Excel serial evidence;
- requires an explicit 1900/1904 workbook date system for Excel serials;
- rejects missing/unknown date format, Excel serial 60 and fractional datetime ambiguity;
- never substitutes the current clock.

Adapter amount/direction normalization:

- requires safe positive integer VND;
- requires absolute-value semantics;
- requires explicit debit or credit direction;
- rejects unsupported currency, unsafe numbers and ambiguous direction.

### 4. XLS/XLSX evidence seam

`readXlsxSourceEvidence()` is an evidence-only path separate from the generic parser:

- preserves raw numeric values with `cellDates:false`;
- preserves source number formats with `cellNF:true`;
- exposes workbook 1900/1904 date-system metadata;
- preserves worksheet positions, display text and formulas for review evidence;
- rejects arbitrary/plaintext SheetJS fallback;
- requires XLSX OOXML workbook structure inside ZIP containers;
- requires Workbook/Book structure for CFB XLS containers;
- rejects ODS even though ODS is also ZIP-based;
- accepts a generated real BIFF8 `.xls` workbook in tests.

Generic `parseXlsxStatement()` remains backward-compatible and no bank-specific layout inference is added.

### 5. Evidence-aware import transport

Accepted source evidence survives:

`adapter row → import draft → preview candidate projection → client facade → server validation → DB insert → server reload`

Preserved evidence includes:

- source row index for inspectability;
- current source external ID;
- source lifecycle state;
- source predecessor external ID;
- parser version;
- mapping version.

Draft/server boundaries reject orphan lineage when a current source ID is absent, and persistence omits invalid lineage rather than shortening or inventing IDs.

## Existing database authority reused

No schema or RPC is added. Existing merged contracts remain authoritative for:

- exact-source duplicate matching and replay idempotency;
- changed-source observation without silently overwriting user corrections;
- pending → posted predecessor/replacement observations;
- deleted/reimport precedence;
- unmatched `removed` source evidence never becoming a new ledger fact;
- source and tenant scoping.

Database CI was correctly classified as not required for PR #552 because no migration/RPC changed; the existing pgTAP suite remains the unchanged contract evidence.

## Acceptance matrix

- [x] Pure deterministic/versioned adapter boundary exists.
- [x] Identity scope is explicit and collision-safe across institution/account namespaces.
- [x] Unsafe/unconfirmed/display/export-local/hash/row-index identities fail closed.
- [x] Stable IDs are never truncated at persistence.
- [x] Missing/ambiguous adapter dates fail closed; current date is never guessed.
- [x] Excel 1900/1904, fake serial 60 and fractional datetime counterexamples are covered.
- [x] VND amount/direction requires safe integer and explicit debit/credit evidence.
- [x] XLS/XLSX evidence keeps raw serial/format/epoch and rejects plaintext/ODS fallback.
- [x] Real BIFF8 XLS remains supported by the strict evidence path.
- [x] Draft → preview → candidate → client/server → insert/reload preserves provenance/lineage.
- [x] Replay/changed-source/predecessor/removed-source semantics stay with existing DB authority.
- [x] Generic no-ID rows remain heuristic and do not invent stable identity.
- [x] Generic CSV/XLSX and Direct CSV remain backward-compatible.
- [x] VCB/ACB/VietinBank bank-specific auto-map remains disabled.
- [x] Fixtures/counterexamples are synthetic/privacy-safe; no customer statement rows were added.
- [x] No provider credentials, live sync, production DB/Auth/provider/bank/customer-data write.
- [x] Independent final-diff evaluation found no second mutation/dedupe authority.

## Verification evidence

Implementation acceptance head: `fdaa12136a5c7fbe947a2b268d56aca030b0b47c`.

Clean first-pass evidence:

- CI #3380: policy, migration identity, architecture/static quality, lint, typecheck, full unit/static-RLS, production build, aggregate verify and selected browser smoke;
- CodeQL #2405: success;
- Secret history #2405: success;
- independent MON-62 packet evaluation recorded in PR #552 conversation.

Non-acceptance history is preserved rather than hidden:

- early implementation head failed Project Knowledge because current memory was absent from the diff;
- `bb403b40f2a1c945c8e1ba216d6039e4432a0db6` failed typecheck and a corrupt-XLSX evidence test;
- later stale browser execution was cancelled by a newer branch push;
- no failed/cancelled/retry-only head is counted as acceptance.

The lifecycle-closeout commit created after this implementation acceptance must run its own exact-head CI/CodeQL/Secret/browser checks before owner handoff. Those final checks are PR-level acceptance evidence, not a reason to mutate this archived packet again and stale the accepted head.

## Research boundary

Current official SheetJS documentation confirms the parser's aggressive format detection, `cellNF`, `cellDates`, `bookFiles`, ZIP/CFB internals and distinct XLSX/BIFF8/ODS formats. Plaid/OFX/Open Banking references support explicit identity scope and pending/posted lineage design.

None of those references proves current VCB/ACB/VietinBank consumer export headers, stable IDs or status semantics. Bank-specific auto-map therefore stays disabled.

## Production and privacy boundary

PR #552 performs no production database/Auth/provider/bank/customer-data write and does not access bank credentials. No real customer statement is introduced.

Because #552 changes runtime application code, production availability must be verified against the actual post-merge deployment before tracker truth is called production-complete. Pre-merge CI is not deployment evidence.

## Lifecycle closeout

PR #552 performs same-PR convergence:

- archives this packet under `docs/plans/completed/`;
- removes `docs/plans/active/mon-62-source-adapters-provenance-dedupe.md`;
- sets `PLAN_AUTHORITY.current` to `null`;
- updates `docs/research/CURRENT_PROJECT_MEMORY.md`;
- leaves MON-63 unselected.

No follow-on work packet is selected here. Fresh-main owner selection is required for the next executable slice.
