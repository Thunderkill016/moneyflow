# Vietnam bank-export compatibility — Phase A (2026)

**Status:** implementation evidence for #523 / MON-61

**Last refreshed:** 2026-09-04

**Scope:** Vietcombank, ACB and VietinBank export/statement evidence only. This is not a claim of live bank sync, universal bank/version support or provider-stable transaction identity.

## Decision rule

MoneyFlow separates three evidence levels:

- `confirmed` — directly established by current first-party material for the stated scope;
- `observed-but-unverified` — visible in first-party UI/product material but not proven to be an exported-file contract;
- `unknown` — not established strongly enough to encode.

A field stays unknown rather than being guessed. A displayed reference, export row number, generated hash or MoneyFlow fingerprint is **not** `source_external_id`. Source identity may be used only when the provider artifact exposes a stable transaction identifier and the stability is confirmed by evidence.

## Compatibility matrix

| Contract area | Vietcombank | ACB | VietinBank |
|---|---|---|---|
| Statement/history available | **confirmed** — VCB Digibank history workflow | **confirmed** — ACB ONE history + supported store-management flow | **confirmed** — current card statement/history + iPay material |
| Downloadable artifact | **confirmed: Excel/XLSX** in VCB Digibank history workflow | **confirmed: Excel/XLSX** in supported ACB first-party flow | **unknown** for target consumer-account export |
| Exact exported headers/layout | **unknown** | **unknown**; store-management evidence must not be generalized to all consumer exports | **unknown** |
| Date/timezone semantics in exported file | **unknown**; UI shows transaction/system dates | **unknown** | **unknown**; card material distinguishes posting-date concepts only |
| Currency field/semantics | **unknown**; examples show VND but export contract is not proven | **unknown** | **unknown** |
| Debit/credit direction | **observed-but-unverified** — UI separates `Tiền vào` / `Tiền ra` | **unknown** in export layout | **unknown** |
| Transaction status | **unknown** in export | **observed-but-unverified** — ACB ONE UI documents `đã thực hiện`, `chờ xử lý`, `đặt lịch`; export representation unproven | **unknown** |
| Transaction reference | **observed-but-unverified/display-only** — UI shows `Số tham chiếu`; cross-export stability unproven | **unknown** | **unknown** |
| Stable `source_external_id` | **not established** | **not established** | **not established** |
| Fee representation | **unknown** | **unknown** | **observed-but-unverified** — current card statement concept includes fees; target export layout unproven |
| Overlapping export behavior / dedupe | **unknown** | **unknown** | **unknown** |
| Bank-specific auto-map enabled | **no** | **no** | **no** |
| Safe current path | existing generic CSV/XLSX parser + mapping/review | existing generic CSV/XLSX parser + mapping/review | generic import only if user has a compatible file; no bank-specific claim |

## Provider notes

### Vietcombank

First-party VCB Digibank guidance explicitly says users can search account transaction history and **Xuất excel** after the search. The VCB user guide also shows UI concepts such as transaction date, system date, amount, `Tiền vào`/`Tiền ra` and `Số tham chiếu`. Those visible UI labels are useful evidence that the concepts exist, but they are **not treated as exported Excel headers** and do not prove that `Số tham chiếu` is stable across overlapping exports.

Current decision: artifact availability is confirmed; bank-specific layout normalization and source identity remain disabled.

### ACB

ACB first-party store-management material confirms downloading transaction history/statement as Excel in a supported flow and describes Excel output that separates store/recipient information. ACB also documents transaction-history states in ACB ONE (`đã thực hiện`, `chờ xử lý`, `đặt lịch`). These are scoped facts: store-management structure cannot be generalized to every personal-account export, and UI states are not automatically treated as exported status fields.

Current decision: Excel availability is confirmed for the supported scope; exact consumer headers, direction semantics, status fields and provider-stable source IDs remain unknown.

### VietinBank

Current first-party VietinBank card terms/guidance confirm statement/history access and iPay-related account/card history. Current material also uses posting-date and fee concepts for card statements. The reviewed first-party evidence does **not** establish a target consumer-account downloadable file format or exported header schema.

Current decision: statement/history availability is confirmed; downloadable artifact type and bank-specific mapping remain unknown/disabled.

## Synthetic fixture policy

Repository fixtures under `src/lib/inbox/fixtures/*-export-evidence.fixture.json` are **evidence fixtures**, not copied customer exports. They contain only provider capability metadata and explicit unknowns. They intentionally contain no synthetic transaction rows while exact exported layouts are unverified.

A bank-specific synthetic statement row may be added only when one of these is available:

1. stronger first-party documentation that establishes the relevant exported layout/version; or
2. a privacy-safe structural observation of a real export where all customer values are excluded and the layout evidence is recorded without committing private content.

The fixture policy prevents a guessed header set from quietly becoming a production parser contract.

## Source-identity contract

`src/lib/inbox/bank-export-compatibility.ts` exposes the only Phase A source-ID eligibility rule:

```text
non-empty reference
AND evidence == confirmed
AND stability == source-stable
→ eligible sourceExternalId
```

Everything else returns no source ID. In particular: UI/display references, row indexes, generated hashes, export-local identifiers and MoneyFlow preview fingerprints are not provider identity.

This does not change the current Direct CSV acquisition payload, which still intentionally has no `sourceExternalId`.

## First-party sources

### Vietcombank

- VCB Digibank web guide — transaction history and Excel export:
  `https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsd-ib/pages/vi/tinh-nang-giao-dich-ngan-hang/tai-khoan/3-lich-su-giao-dich.html`
- VCB Digibank user-guide PDF:
  `https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsdib/hdsd.pdf`

### ACB

- ACB store-management solution page:
  `https://acb.com.vn/giai-phap-quan-ly-cua-hang`
- ACB ONE store-management user guide:
  `https://acb.com.vn/acbwebsite/files/ACB_HDSD_Quanlycuahang.pdf`
- ACB online-account FAQ / ACB ONE transaction-history states:
  `https://acb.com.vn/thu-vien/nhung-cau-hoi-thuong-gap-khi-tao-tai-khoan-ngan-hang-online`

### VietinBank

- Current VietinBank card terms/statement-history material:
  `https://www.vietinbank.vn/assets/cfa87952-5eb4-496d-b780-5b21335ba19f`
- Current VietinBank card agreement/history/iPay material:
  `https://www.vietinbank.vn/assets/9a43a89d-a5c7-4655-8e28-2871c449359b`

## Remaining evidence needed before bank-specific parsing

- Exact current downloadable headers for target account/export versions.
- Decimal/thousand separator and sign/debit-credit conventions in actual exported values.
- Time/timezone and posting-vs-transaction-date semantics.
- Whether status/fee data appears as fields, rows or not at all.
- A transaction identifier proven stable across repeated and overlapping exports.
- Version/change behavior when banks update export layouts.

Until those are established, MoneyFlow should prefer explicit mapping/review over apparent automation.
