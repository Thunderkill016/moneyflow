# Vietnam bank-export public web evidence — 2026-09-11

## Purpose

This note records privacy-safe evidence gathered from first-party bank documentation and publicly indexed statement artifacts for GitHub #576 / Plate THU-46. It intentionally does not copy account holders, account numbers, tax IDs, phone numbers, addresses, raw transaction descriptions, raw statement rows, or downloadable statement bytes into the repository.

Evidence levels used here:

- `confirmed`: first-party bank documentation explicitly establishes the capability or API behavior.
- `observed-but-unverified`: a public statement artifact shows a concrete layout/row behavior, but the bank does not promise it as a stable export contract.
- `unknown`: evidence is still insufficient for a durable product assumption.

## Vietcombank

### Confirmed

- VCB Digibank supports transaction-history search by a chosen date range and lets the user export the result to Excel after searching.
- First-party VCB material therefore confirms `Excel` as a supported acquisition artifact, but it does not define a stable downloaded-file schema contract.

First-party source:

- https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsd-ib/pages/vi/tinh-nang-giao-dich-ngan-hang/tai-khoan/3-lich-su-giao-dich.html

### Observed-but-unverified

Public statement artifacts show the shape:

`Ngày giao dịch | Số tham chiếu | Thay đổi | Số tiền | Mô tả`

They also show fee rows as ordinary statement rows with a negative direction and a fee description.

More importantly, one public same-account statement spanning multiple months shows the same displayed `Số tham chiếu` value reused on distinct monthly fee rows and on separate interest rows. That is direct negative evidence against treating the displayed VCB reference as a unique transaction identity.

Implication:

- keep VCB reference classified `display-only / observed-but-unverified`;
- never derive `sourceExternalId` from the displayed VCB reference alone;
- retain fingerprint duplicate fallback;
- bank-specific auto-map stays disabled because the current downloaded Excel contract is still not provider-confirmed.

Public artifact source used only for structural/aggregate observation:

- https://www.scribd.com/document/498083218/Vietcombank-Account-Statement

## ACB

### Confirmed

- ACB documents Excel statement/history download in ACB ONE flows.
- ACB's Developer Portal exposes account-history APIs where `transaction_number`, `from_transaction_number`, and `to_transaction_number` are first-class query fields.
- Exact transaction-number lookup in the documented API still requires account plus date/range context. This is useful provider evidence that a transaction number exists, but it does **not** document that the number alone is a globally unique/stable source identity, and it does not prove equivalence to the downloaded-file `Số GD` field.

First-party sources:

- https://acb.com.vn/giai-phap-quan-ly-cua-hang
- https://developer.acb.com.vn/acb/open/vi/node/96
- https://developer.acb.com.vn/acb/open/vi/node/3573

### Observed-but-unverified

Public ACB statement artifacts show material layout variation across time.

Observed 2019 ACB Online layout:

`Ngày | Số GD | Diễn giải | Ghi nợ | Ghi có | Số dư`

Observed 2024 statement layout:

`Ngày | Số GD | Nội dung giao dịch | Số tiền rút ra | Số tiền gửi vào | Số dư`

Both public shapes show fees as separate debit rows rather than a provider-guaranteed fee field. The 2024 artifact also shows `Số GD` continuing as a sequence across monthly statements, but no same-transaction overlapping-window pair was found; therefore stability across repeated exports remains unproven.

Implication:

- ACB support must be keyed by layout fingerprint/version, not just `bank=ACB`;
- the generic importer should eventually recognize both `Ghi nợ/Ghi có` and `Số tiền rút ra/Số tiền gửi vào` as debit/credit aliases, but that should remain generic role detection rather than an ACB-owned financial core;
- keep `Số GD` out of `sourceExternalId` until overlapping downloaded files establish stability and scope;
- bank-specific auto-map stays disabled.

Public artifact sources used only for structural/aggregate observation:

- https://www.scribd.com/document/506860867/ACB-20190501-20190701
- https://www.studocu.vn/vn/document/truong-dai-hoc-ngoai-thuong/nguyen-ly-hoat-dong-ngan-hang/sao-ke-tai-khoan-cty-tnhh-dt-tm-thep-sai-gon-vnd-243548269/124073688

## VietinBank

Previously recorded public eFAST evidence remains valid:

- two public same-account statements overlap on 31/03/2026;
- transaction numbers 1942/1943/1944 are preserved with matching row semantics across the overlap;
- public eFAST rows show service fees and VAT as ordinary debit rows;
- this remains `source-stable / observed-but-unverified`, not a provider guarantee.

Public artifact sources:

- https://www.studocu.vn/vn/document/truong-dai-hoc-ngoai-thuong/ke-toan-tai-chinh/lich-su-giao-dich-tai-khoan-vietinbank-efast-29062026/167509901
- https://www.studocu.vn/vn/document/truong-dai-hoc-ngoai-thuong/ke-toan-tai-chinh/lich-su-giao-dich-tai-khoan-vietinbank-efast-118002939123/167509907

## Product / architecture conclusions

1. The acquisition architecture remains correct: universal importer first, thin bank/layout profile second.
2. A bank name is not a sufficient schema key. ACB alone now has multiple observed public statement layouts.
3. Displayed provider references must not automatically become identity. VCB provides concrete negative evidence because a displayed reference is reused across distinct rows.
4. Public statement evidence is sufficient for synthetic compatibility regressions and alias hardening, but not for claims of provider-guaranteed schema or identity stability.
5. Only `confirmed + source-stable` identity may become `sourceExternalId`.
6. Bank-specific auto-map stays disabled for VCB/ACB/VietinBank under the current evidence threshold.

## Remaining evidence gaps

The highest-value next evidence is still two unedited, same-account, same-export-mode downloaded files with overlapping date windows for VCB and ACB. That is required to answer:

- whether the current downloaded Excel layout matches public artifacts;
- whether date/amount/description normalization changes between repeated exports;
- whether ACB `Số GD` survives overlapping repeated downloads with the same scope;
- whether any VCB field other than the visibly non-unique displayed reference provides stable identity;
- whether fee representation remains row-based in the current downloaded export modes.

Until those gaps close, the generic parser + review + heuristic duplicate path remains the safe production behavior.
