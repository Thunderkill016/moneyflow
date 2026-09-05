# M1 source-adapter preparation — 2026-09-05

> **Authority:** research/preparation only. This note does **not** select MON-62 or MON-63, does not create executable repository authority, and is not evidence about the actual VCB/ACB/VietinBank export layouts.

## Why this note exists

After #523 / MON-61 closed, a short official-documentation refresh was performed to avoid rediscovering generic spreadsheet/date and transaction-identity behavior before a future owner-selected source-adapter slice.

## 1. Spreadsheet date parsing must preserve raw semantics

Official SheetJS documentation says Excel-family files commonly store dates as numeric date codes plus number formats. `cellDates: true` converts date codes to JavaScript `Date` objects, while the default parser keeps numeric cells. SheetJS also notes that Excel's common date format code 14 is locale-specific and that formatted text may change with locale. Its date guide warns that JavaScript string-to-Date conversion is implementation-dependent and recommends ISO 8601 when designing APIs.

Implication for a future MoneyFlow adapter:

- preserve the original raw cell value and enough formatting metadata to explain parsing;
- do not treat rendered spreadsheet text as canonical date identity;
- normalize known source-specific dates deterministically only after the source contract proves the relevant layout/locale semantics;
- do not invent timezone information that is absent from the export.

Sources:

- https://docs.sheetjs.com/docs/api/parse-options/
- https://docs.sheetjs.com/docs/csf/features/dates/

## 2. Authoritative transaction identity must be explicit, stable and scoped

UK Open Banking's transaction model defines `TransactionId` as an optional identifier that is unique and immutable within the servicing institution. This is a useful example of what a source-stable identity contract looks like when a provider actually specifies one.

Plaid's current transaction documentation separately illustrates why matching is not identical to identity: pending and posted versions can have different transaction IDs and are linked through `pending_transaction_id`; modified/posted transactions may appear as separate transaction records that applications must reconcile. Plaid Core Exchange likewise requires long-term persistent IDs and explicitly warns against IDs based on counters that reset at statement/day boundaries.

Implication for MoneyFlow:

- keep `source_external_id` fail-closed unless the actual source contract proves an explicit stable identity;
- keep row number, export-local sequence, generated hash and MoneyFlow fingerprint out of authoritative source identity;
- if a future source exposes status/version linkage, model that linkage separately rather than collapsing records because amounts/descriptions look similar;
- heuristic fingerprints remain matching/review evidence, not provider identity.

Sources:

- https://openbankinguk.github.io/read-write-api-site3/v4.0/resources-and-data-models/aisp/Transactions.html
- https://plaid.com/docs/transactions/transactions-data/
- https://plaid.com/docs/transactions/troubleshooting/
- https://plaid.com/core-exchange/docs/reference/6.3/

## 3. Boundary against overclaiming

These sources describe generic spreadsheet behavior and external transaction APIs. They do **not** prove that Vietcombank, ACB or VietinBank exports expose immutable IDs, pending/posting linkage, timezone metadata, stable column headers or a specific Excel extension. The #523 compatibility matrix remains the authority for what is actually evidenced for those banks.

A future MON-62 selector should therefore require privacy-safe structural evidence for each bank before enabling bank-specific aliases, auto-mapping or authoritative source-ID extraction.
