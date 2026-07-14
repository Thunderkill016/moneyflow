# Giai đoạn 3 — Financial Domain Rules

**Sản phẩm:** Web quản lý thu chi cá nhân  
**Ngày:** 2026-07-15  
**Không code** — quy tắc nghiệp vụ, mô hình dữ liệu, edge cases, test outline  

**Phân loại**  
- **[Fact-codebase]** — đã có trong MoneyFlow migrations/lib  
- **[Decision]** — chốt cho MVP theo Phase 2  
- **[Later]** — post-MVP  
- **[Open]** — chưa chốt  

**Tham chiếu codebase (Fact-codebase):**  
`supabase/migrations/20260714000100_initial_financial_schema.sql`,  
`20260714000700_account_transfers.sql`,  
`src/lib/money.ts`, `src/lib/transfers.ts`, `src/lib/finance.ts`

**Liên quan:** [01](./01_RESEARCH_PLAN.md) · [02](./02_USER_AND_COMPETITORS.md)

---

## 1. Mục tiêu domain

Hệ thống phải:

1. Ghi **thu / chi / chuyển** đúng số dư.  
2. **Không** đếm chuyển khoản là chi tiêu.  
3. Tiền **không dùng float**.  
4. Sửa/xóa an toàn (soft delete).  
5. Đủ cho cá nhân VN — **không** ERP.

---

## 2. Thực thể chính (MVP)

| Entity | Mô tả | MVP | Ghi chú codebase |
|---|---|---|---|
| **User** | Supabase Auth user | Yes | `auth.users` |
| **Profile** | locale, timezone, default currency | Yes | `profiles` |
| **Account** | Ví/TK: cash, bank, e_wallet, credit_card, savings | Yes | `accounts` + `account_kind` |
| **Category** | income \| expense | Yes | `categories`; **không** subcategory bảng riêng **[Decision]** |
| **FinancialTransaction** | Header: kind, note, occurred_on, soft delete | Yes | `financial_transactions` |
| **TransactionEntry** | Leg: account, ±amount_minor, optional category | Yes | `transaction_entries` (double-entry lite) |
| **Budget** | Limit theo category + month | Yes | migrations budgets |
| **RecurringCommitment / Bill** | Khoản định kỳ giữ trước / trả | Yes light | commitments |
| **SavingsGoal** | Mục tiêu + earmark | Yes light | goals |
| **Tag** | Nhãn tự do | Later | — |
| **Merchant** | Chuẩn hóa merchant | Later | note text MVP |
| **Attachment** | Ảnh hóa đơn | Later | Storage |
| **ExchangeRate** | FX | Later | same-currency transfer only now |
| **AuditLog** | Lịch sử field | Later light | updated_at + soft delete đủ MVP |
| **ImportBatch** | CSV import | P1 | capture experiments exist; domain P1 |

### 2.1 Account kinds

| Kind | Ý nghĩa UI | Balance semantics MVP |
|---|---|---|
| `cash` | Tiền mặt | Asset (+) |
| `bank` | Ngân hàng | Asset (+) |
| `e_wallet` | MoMo/ZaloPay… | Asset (+) |
| `savings` | TK tiết kiệm | Asset (+) |
| `credit_card` | Thẻ tín dụng | Liability: balance **âm** = đang nợ **[Decision]** |

**Credit card MVP (đơn giản):**  
- Chi bằng thẻ = `expense` trên account credit_card (entry âm trên thẻ, hoặc model: expense increases debt).  
- **Thống nhất với codebase hiện tại:** entry `amount_minor` signed; balance account = `initial_balance_minor + sum(entries)`.  
- **Thanh toán thẻ** = `transfer` từ bank → credit_card (giảm nợ), **không** phải expense.  
- Kỳ sao kê / due date / minimum payment = **Later**.

### 2.2 Category

- `kind` phải khớp transaction: income category chỉ cho income, expense cho expense.  
- Transfer: **không** category **[Fact-codebase]**.  
- Subcategory: **Reject MVP** — dùng tên phẳng; tags Later.  
- Default seed VN: Ăn uống, Di chuyển, … Lương… **[Fact-codebase seed]**.

---

## 3. Biểu diễn tiền (ADR draft)

### R1 — Amount representation

| | |
|---|---|
| **Mô tả** | Mọi số tiền persisted = **integer minor units**. VND: 1 unit = 1 đồng. |
| **Ví dụ** | 45.000₫ → `45000`. Không lưu `45000.0`. |
| **Edge** | Input user có dấu chấm/phẩy → parse digits only **[Fact-codebase `parseMoneyInput`]**. Max ≤ `Number.MAX_SAFE_INTEGER` (2^53−1) trên JS path. |
| **DB** | `bigint` / `amount_minor` |
| **UI** | `formatMoney` vi-VN + `₫`; luôn mono; dấu +/−/↔ |
| **Test** | Parse "45.000" → 45000; reject float storage; overflow reject |

### R2 — No floating point money

| | |
|---|---|
| **Mô tả** | Cấm `number` IEEE cho cộng dồn dài hạn trên server; dùng integer. Tạm JS `number` chỉ khi đã validate safe integer. |
| **Quyết định** | **Adopt** industry + codebase. |

### R3 — Currency precision

| | |
|---|---|
| **MVP** | **VND only per user default**; mỗi account có `currency_code` nhưng **transfer cùng currency** only **[Fact-codebase]**. |
| **Later** | Multi-currency + rate table; split FX gain/loss. |
| **Open** | Account USD cho freelancer — post-MVP. |

### R4 — Rounding

| | |
|---|---|
| **VND** | Không phần thập phân.  
| **Later FX** | Banker's or half-up documented per pair — N/A MVP. |

---

## 4. Thời gian

### R5 — Transaction date vs created/updated

| Field | Nghĩa |
|---|---|
| `occurred_on` | **Ngày nghiệp vụ** (user chọn) — date only, calendar VN |
| `created_at` | Khi hệ thống ghi (timestamptz) |
| `updated_at` | Sửa gần nhất |
| `deleted_at` | Soft delete |

**Timezone MVP:** profile `Asia/Ho_Chi_Minh`; “hôm nay” format `en-CA` trong TZ đó **[Fact-codebase dialogs]**.  
**Edge:** User ở nước ngoài — vẫn dùng profile TZ cho “today” **[Decision]** until multi-TZ later.

---

## 5. Các loại giao dịch

### 5.1 Bảng loại

| Loại | Kind | Entries | Category | Ảnh hưởng income/expense reports | MVP |
|---|---|---|---|---|---|
| Thu nhập | `income` | 1 leg: +amount account | income cat | +Income | Yes |
| Chi tiêu | `expense` | 1 leg: −amount account | expense cat | +Expense | Yes |
| Chuyển | `transfer` | 2 legs: −src +dst | null | **Không** | Yes |
| Phí CK | `expense` (riêng) | −fee account | “Phí ngân hàng” | Expense | Yes (manual) |
| Hoàn tiền full | `income` hoặc expense âm? | **Decision:** `income` category “Hoàn tiền” **hoặc** link refund Later | | Prefer simple income **[Decision MVP]** | Yes simple |
| Hoàn một phần | same | | | Later link | Later |
| Vay/cho vay | accounts + transfers/expenses | | | **Later** dedicated loan | Later |
| Trả nợ / thu nợ | transfer or expense | | | Later | Later |
| Trả dư nợ thẻ | `transfer` bank→card | | | Not expense | Yes |
| Số dư ban đầu | `accounts.initial_balance_minor` | no txn required | | In balance | Yes |
| Điều chỉnh số dư | `income`/`expense` “Điều chỉnh” or special | | | Prefer explicit adjust txn **[Decision]** | Yes light |
| Định kỳ | template → generates real txn | | | When posted | Yes |
| Chia nhỏ (split) | multi category entries | | | Later | Later |
| Ngoại tệ | | | | Later | Later |

### 5.2 Invariants (bắt buộc)

| ID | Invariant |
|---|---|
| I1 | `amount_minor ≠ 0` trên mọi entry |
| I2 | Expense/Income: đúng **1** entry; amount sign: expense negative on asset account, income positive **[Fact-codebase pattern]** |
| I3 | Transfer: đúng **2** entries; `sum(amount_minor)=0`; 2 accounts khác nhau; cùng currency |
| I4 | Soft-deleted txn **không** vào balance/report |
| I5 | Category.kind khớp transaction.kind khi non-transfer |
| I6 | Idempotency: `(user_id, idempotency_key)` unique |

---

## 6. Quy tắc chi tiết (template bắt buộc)

### R6 — Account balance

| | |
|---|---|
| **Mô tả** | `balance(account) = initial_balance_minor + Σ entry.amount_minor` (txn not deleted) |
| **Ví dụ** | Cash initial 100_000; expense 45_000 → balance 55_000 |
| **Edge** | Archived account: giữ history, không chọn khi add mới |
| **DB** | Computed view or on-read sum (hiện RPC/views) |
| **UI** | List accounts; total assets = sum asset balances; credit shown as debt |
| **Test** | After income/expense/transfer/delete restore |

### R7 — Total net / “còn bao nhiêu”

| | |
|---|---|
| **MVP** | `total_balance = Σ balance(active accounts)` với credit_card đã signed |
| **Mislead risk** | Cộng credit limit? **Không** — limit riêng **[Decision]** |
| **Available to spend (optional)** | `max(0, total_balance - reserved_commitments - reserved_goals)` rồi / remaining days **[Fact-codebase finance.ts]** |

### R8 — Transfer create

| | |
|---|---|
| **Mô tả** | Atomic 1 txn header kind=transfer + 2 entries |
| **Ví dụ** | Bank→Cash 2_000_000: bank −2tr, cash +2tr |
| **Edge** | Same account reject; amount ≤0 reject; currency mismatch reject; archived reject |
| **DB** | `create_account_transfer` RPC **[Fact-codebase]** |
| **UI** | “Chuyển khoản”; amount neutral color ↔ |
| **Test** | Total assets unchanged; reports income/expense unchanged |

### R9 — Transfer delete

| | |
|---|---|
| **Mô tả** | Soft-delete header → cả 2 legs out of balance |
| **Edge** | Không xóa 1 leg lẻ |
| **UI** | Confirm “xóa chuyển khoản 2 phía” |
| **Test** | Balances restore as if never |

### R10 — Transfer edit

| | |
|---|---|
| **Mô tả** | Sửa amount/date/accounts **atomic** cả 2 legs; không cho edit 1 phía độc lập |
| **Edge** | Change source only via full rewrite RPC |
| **Test** | Mid-edit failure leaves consistent state (transactional) |

### R11 — Expense / income create

| | |
|---|---|
| **Fields required** | kind, account, category, amount>0, occurred_on |
| **Optional** | note ≤500 |
| **UI quick add** | amount + category + account defaults from prefs |
| **Test** | Category wrong kind rejected |

### R12 — Edit past transaction

| | |
|---|---|
| **Mô tả** | Cho phép sửa amount/date/category/account; budgets/reports recalculate |
| **Edge** | Edit txn generated from recurring: does **not** auto-change template **[Decision]** |
| **Test** | Budget remaining updates after edit |

### R13 — Soft delete & restore

| | |
|---|---|
| **Mô tả** | `deleted_at` set; optional restore clears it |
| **Edge** | Unique idempotency still holds; hard delete Later (GDPR job) |
| **UI** | “Đã xóa” undo toast 5–10s if possible |
| **Test** | Deleted excluded from feed |

### R14 — Initial balance

| | |
|---|---|
| **Mô tả** | Set on account create/update; not a visible “fake expense” |
| **Edge** | Changing initial_balance rewrites history interpretation — allow with warning **[Decision]** |
| **Test** | Balance formula |

### R15 — Balance adjustment

| | |
|---|---|
| **Mô tả** | User nhận “sổ lệch thực tế”: tạo expense/income “Điều chỉnh số dư” |
| **Reject MVP** | Silent overwrite balance without audit |

### R16 — Refund

| | |
|---|---|
| **MVP** | Income “Hoàn tiền” cùng account |
| **Later** | `refund_of_transaction_id` partial/full |

### R17 — Fee on transfer

| | |
|---|---|
| **MVP** | User creates separate expense for fee |
| **Later** | Transfer + fee as multi-entry (3 legs) |

### R18 — Recurring generation

| | |
|---|---|
| **Mô tả** | Template: amount, category, account, cadence, next_run; **post** creates real expense/income |
| **MoneyFlow** | Commitments reserve unpaid; pay posts expense **[Fact-codebase concept]** |
| **Edge** | Skip month; pause; end date; timezone boundary |
| **Edit instance** | ≠ edit series **[Decision]** |
| **Test** | Pay once → one expense; reserve reduces safe-to-spend |

### R19 — Budget period

| | |
|---|---|
| **Mô tả** | Monthly calendar month in profile TZ; limit per expense category |
| **Spent** | Sum expenses that category in month (not transfers) |
| **Remaining** | `max(0, limit - spent)` for “còn”; overspend show negative or “vượt X” |
| **Rollover** | **Reject MVP** (YNAB-like) |
| **Alert** | UI at 80% / 100% **[Decision]** |
| **Test** | Transfer ignored; income ignored |

### R20 — Safe-to-spend (optional insight)

| | |
|---|---|
| **Mô tả** | min(balance-based daily, budget-based daily) − today expenses − planned savings **[Fact-codebase]** |
| **Risk** | User hiểu nhầm là “được chi” tuyệt đối — label rõ công thức |
| **MVP** | Keep as **insight** not law |

### R21 — Duplicate detection

| | |
|---|---|
| **MVP** | Not automatic |
| **P1 import** | Fingerprint date+amount+account+note normalize |
| **Test** | Re-import same CSV |

### R22 — Idempotent create

| | |
|---|---|
| **Mô tả** | Client sends UUID key; retry same key returns same txn |
| **Fact-codebase** | Yes |

### R23 — Multi-currency transfer

| | |
|---|---|
| **MVP** | Reject currency_mismatch **[Fact-codebase]** |
| **Later** | Explicit FX txn |

### R24 — Credit card payment

| | |
|---|---|
| **Mô tả** | Transfer from asset → credit_card account |
| **UI** | Suggest “Thanh toán thẻ” shortcut Later |
| **Test** | Expense total unchanged; card debt down |

### R25 — Soft constraints (not DB)

- Không chặn chi khi balance âm (cash overspend allowed) **[Decision]** — show warning only.  
- Credit limit: warn if debt > limit, don't hard-block MVP.

---

## 7. Ảnh hưởng báo cáo

| Metric | Công thức MVP |
|---|---|
| Income (period) | Σ amount of income txns in range |
| Expense (period) | Σ amount of expense txns in range |
| Net cashflow | Income − Expense (**exclude** transfers) |
| Expense by category | Group expense by category_id |
| Account balance history | Later (running sum) |
| Savings rate | (Income−Expense)/Income if income>0 — P1 |
| Net worth | Σ accounts — P1 label; same as total_balance MVP |

**Mislead rules:**  
- Never put transfer in expense pie.  
- Never show only charts without totals.

---

## 8. Domain model diagram (logic)

```
User 1──* Account
User 1──* Category
User 1──* FinancialTransaction
FinancialTransaction 1──* TransactionEntry (1 or 2)
TransactionEntry *──1 Account
TransactionEntry *──0..1 Category
User 1──* Budget (category_id, month_start, limit_minor)
User 1──* Commitment / Goal
```

**Double-entry lite:** không full chart of accounts; expense/income categories are **classifications**, not contra-accounts (unlike pure Firefly expense accounts). Closer to “transaction with signed legs” used in MoneyFlow **[Fact-codebase]**.

---

## 9. Mapping UI

| UI action | Domain op |
|---|---|
| Thêm chi | Create expense |
| Thêm thu | Create income |
| Chuyển | Create transfer |
| Sửa dòng | Update header+entries atomic |
| Xóa | Soft delete |
| Thanh toán hóa đơn định kỳ | Post commitment → expense |
| Đóng góp goal | Goal allocation (existing model) |
| Export CSV | Read feed non-deleted |

### Quick-add field priority

| Priority | Field |
|---|---|
| 1 | Amount |
| 2 | Category (recent/default) |
| 3 | Account (last used) |
| 4 | Date (default today) |
| 5 | Note optional |

---

## 10. Security domain notes (preview G5)

- Mọi query filter `user_id = auth.uid()` via RLS.  
- RPC `security definer` must re-check ownership (đã pattern).  
- Không log `amount` + PII full note tới third-party analytics.  
- CSV export: escape formula injection (`=`, `+`, `-`, `@` prefix).

---

## 11. Test outline (domain)

### Unit

- [ ] parseMoney / formatMoney VND  
- [ ] balance after income/expense/transfer  
- [ ] transfer preserves total assets  
- [ ] soft delete excludes from sum  
- [ ] budget spent ignores transfers  
- [ ] safe-to-spend never negative; integer division  
- [ ] applyTransferBalances invalid inputs  

### Integration / RPC

- [ ] create transfer currency mismatch fails  
- [ ] idempotent double submit  
- [ ] edit transfer changes both legs  
- [ ] cannot attach expense category to income  

### CSV / import P1

- [ ] re-import fingerprint  
- [ ] formula injection escaped on export  

---

## 12. Adopt domain patterns from OSS (no code copy)

| Pattern | Source inspiration | Decision |
|---|---|---|
| Integer minor units | hledger/beancount culture | **Adopt** |
| Transfer balanced | Actual/Firefly/YNAB | **Adopt** (already) |
| Soft delete | Common SaaS | **Adopt** |
| Bills + piggy | Firefly | **Adapt** as commitments/goals |
| Envelope assign every dollar | YNAB/Actual | **Reject** MVP |
| Full double-entry GL | GnuCash | **Reject** |
| Expense/revenue accounts | Firefly pure | **Adapt** → categories instead |

---

## 13. ADR mini-index (draft titles for Phase 5)

1. ADR-001 Amount as integer minor units  
2. ADR-002 Transaction header + entries (double-entry lite)  
3. ADR-003 Transfer atomic two-leg  
4. ADR-004 Account balance = initial + Σ entries  
5. ADR-005 Flat categories (no subcategory table MVP)  
6. ADR-006 Monthly category budgets without rollover  
7. ADR-007 Recurring: template vs instance  
8. ADR-008 Soft delete + optional restore  
9. ADR-009 VND-first single-currency transfers  
10. ADR-010 Credit card as signed liability account  
11. ADR-011 Idempotency keys on create  
12. ADR-012 Safe-to-spend as insight not ledger truth  

---

## 14. Align với codebase hiện tại

| Rule | Status in MoneyFlow |
|---|---|
| Integer minor | **Yes** |
| income/expense/transfer | **Yes** |
| Two-leg transfer RPC | **Yes** |
| Soft delete | **Yes** |
| Idempotency | **Yes** |
| Same-currency transfer only | **Yes** |
| Budgets monthly category | **Yes** |
| Commitments + goals in safe-to-spend | **Yes** |
| Subcategory | **No** (good for MVP) |
| Refund links | **No** |
| Split txn | **No** |
| Multi-currency FX | **No** |
| Full audit log table | **No** |
| Import fingerprint | Partial experiments / P1 |

**Kết luận kỹ thuật:** Domain MVP **không cần redesign schema lớn** — chủ yếu **siết rules, tests, UI copy**, và tránh scope creep.

---

## 15. Kết thúc Giai đoạn 3

### 15.1 Đã xác minh

- Codebase đã implement double-entry lite, integer money, transfer atomic, soft delete, budgets, commitments, goals.  
- Phase 2 quyết định category monthly budget + no bank sync khớp model hiện có.  
- Transfer excluded from income/expense is industry standard.

### 15.2 Chưa xác minh

- User có hiểu credit_card balance âm không (UX test).  
- Có cần soft warning âm tiền mặt không.  
- Recurring cadence set tối thiểu (monthly only?).  

### 15.3 Độ tin cậy thấp

- “Safe-to-spend” cải thiện hành vi — product hypothesis, không fact.  
- Refund-as-income đủ cho mọi user — có thể cần link Later.

### 15.4 Quyết định đề xuất

1. **Giữ** schema header+entries.  
2. **VND-first**; transfer cùng currency.  
3. **Transfer ≠ expense**.  
4. **Soft delete** bắt buộc.  
5. **Budget** monthly category, no rollover MVP.  
6. **Refund** = income đơn giản MVP.  
7. **Split / FX / loans / full audit** = Later.  
8. **Next:** Giai đoạn 4 — Open-source deep dive + license.

### 15.5 Câu hỏi còn mở

1. Credit card: show “nợ 1.2tr” vs raw negative?  
2. Allow multi-currency accounts read-only without transfer?  
3. Restore deleted UI in MVP?  
4. Hard delete on account deletion timeline (30 days)?  
5. Commitment vs pure recurring income (lương) — one model or two?

---

## 16. Việc ngay Phase 4

1. Deep dive Actual + Firefly schemas (public docs/github).  
2. LICENSE + activity scorecard.  
3. Extract test ideas only — no copy AGPL.  
4. Optional: Maybe Finance / Ivy Wallet mobile entry patterns.

---

**Phase 3 complete.**  
**Next:** Giai đoạn 4 — `04_OPEN_SOURCE_ANALYSIS.md`.
