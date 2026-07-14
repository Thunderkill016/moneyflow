# Nghiên cứu đối thủ & dự án open-source (học để áp dụng)

**Mục tiêu:** học pattern hay cho **web quản lý thu/chi cá nhân** — không pivot sang startup capture.  
**Ngày:** 2026-07-14  
**User chính:** chủ app (bạn).

---

## 1. Bản đồ thị trường (web / app quản lý tài chính)

### 1.1 Thương mại (học UX, không clone)

| Sản phẩm | Mô hình | Điểm mạnh | Điểm yếu | Học được gì cho MoneyFlow |
|---|---|---|---|---|
| **YNAB** | Subscription ~$14.99/mo hoặc ~$109/yr | Zero-based / envelope; register rõ; file import khi không bank sync | Đắt; bank sync chủ yếu US/CA/UK/EU | **Mọi đồng tiền phải “gán việc”**; reconcile; nhập nhanh + sửa sau |
| **Monarch Money** | ~$14.99/mo · ~$99.99/yr | Multi-account, couples, net worth | Không free; phụ thuộc Plaid/MX | Dashboard: **số dư + thu/chi tháng** cạnh nhau |
| **Copilot Money** | ~$95/yr class, iOS-first | UI sạch, recategorize mượt | Ít web; US-centric | **Nhập/sửa giao dịch cảm giác “native”** |
| **Rocket Money** | Freemium | Tìm subscription lãng phí | Khác job (bill cancel) | Highlight **khoản lặp** (đã có commitments) |
| **Money Lover** | Freemium + lifetime ~$10–20; linked wallet sub | Phổ biến VN/SEA; nhiều ví; nhập tay quen thuộc | Dễ bỏ vì nhập tay; UX đôi khi cũ | **Danh mục VN**, multi-wallet, mobile-first |
| **Wallet (BudgetBakers)** | Freemium | Đa nền tảng | Generic | Cấu trúc account types |
| **Spendee** | Freemium | Visual budget | Ít sâu ledger | Chart đơn giản, không overwhelm |

**Kết luận thương mại:**  
App thành công gần như luôn có: (1) **thêm giao dịch cực nhanh**, (2) **thu / chi / chuyển khoản tách rõ**, (3) **tháng này bao nhiêu**, (4) **tài khoản nhiều nguồn**. Bank sync là bonus — **không phải điều kiện** cho app cá nhân VN.

---

## 2. Top GitHub / self-host (học kiến trúc & workflow)

| Repo | Stars (tham chiếu) | Stack | Triết lý | Học / không học |
|---|---|---|---|---|
| **[actualbudget/actual](https://github.com/actualbudget/actual)** | ~26k+ · MIT | Node, local-first | Envelope budget, privacy, sync blob | **Local-first feeling**, import CSV/OFX, register gọn, budget envelope. Không copy full envelope nếu bạn chỉ cần “safe to spend”. |
| **[firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii)** | Rất lớn · AGPL | PHP Laravel | Double-entry, rules, bills, piggy banks | **Withdrawal / deposit / transfer**; rules auto-category; bills ≈ commitments; piggy ≈ goals; **tags**. AGPL — **không copy code**, chỉ học ý. |
| **maybe-finance / Maybe** | OSS (check license khi dùng code) | Rails-ish history | Net worth + modern UI | Dashboard “big number”; asset types — overkill early |
| **GnuCash** | Cổ điển | C/C++ desktop | Full accounting | Chart of accounts — quá nặng cho personal web |
| **hledger / beancount** | CLI | Haskell / Python | Plain-text ledger | **Money as integer/cents**; immutability mindset; report từ data sạch |
| **ezBookkeeping** | Nhỏ hơn | Go | Mobile-friendly self-host | So sánh feature matrix (categories 2 cấp…) |

### Actual Budget — pattern nên học

- Giao dịch = register (dòng thời gian), không chôn trong chart.  
- Import file (CSV/OFX…) khi không có bank API.  
- Budget theo “phong bì” — optional; MoneyFlow đã có **safe-to-spend + category budgets**.  
- Privacy: data của user, không bán.  

### Firefly III — pattern nên học

Từ best practices chính thức (docs.firefly-iii.org):

| Khái niệm Firefly | MoneyFlow tương đương | Hành động |
|---|---|---|
| Withdrawal | expense | Giữ |
| Deposit | income | Giữ |
| Transfer | transfer (2 legs) | Đã có — không đếm là chi |
| Asset account | accounts (cash/bank/e-wallet…) | Giữ |
| Expense/Revenue accounts | categories | Giữ đơn giản hơn Firefly |
| Budget | budgets | Giữ |
| Bill | commitments | Giữ |
| Piggy bank | goals | Giữ |
| Rules | (chưa) | Later: auto category theo note |
| Tags | (chưa) | Later nếu cần “#du-lịch” |

**Best practice quan trọng:**  
Transfer **không** là chi tiêu. MoneyFlow đã model transfer riêng — đúng hướng ledger/hledger.

---

## 3. Kiến thức nền web quản lý tài chính

### 3.1 Mô hình dữ liệu (chuẩn mực)

```
Account ──< Entry >── Transaction
                └── Category (optional for transfers)
```

- **Double-entry / balanced transfer:** đã có `financial_transactions` + `transaction_entries`.  
- **Money = integer minor units** (VND đồng): đã có — khớp hledger/beancount.  
- **Không dùng float** cho tiền lưu DB.

### 3.2 UX chuẩn mực (tổng hợp Actual / Firefly / YNAB / Money Lover)

| Pattern | Mô tả | MoneyFlow trước research | Ưu tiên áp dụng |
|---|---|---|---|
| **Fast add** | Mở form < 1s, focus số tiền | Có dialog + FAB | Phím `N`, nhớ lần trước |
| **Chọn ngày** | Ghi chi hôm qua | **Thiếu ở form thêm** (edit có) | **Làm ngay** |
| **Rapid entry** | Lưu xong vẫn mở form | Đóng dialog sau lưu | **Lưu & thêm tiếp** |
| **Remember last** | Account/category gần nhất | Không | localStorage |
| **Month summary** | Thu − Chi = Net | Có thu/chi, net mờ | Hiện **ròng tháng** |
| **Group by date** | Transactions page | Có | Giữ |
| **Reconcile** | Khớp số dư TK | Chưa | Later |
| **CSV import** | Nhập hàng loạt | Chưa | Later khi nhập tay mệt |
| **Rules** | note chứa X → category | Chưa | Later |
| **Search** | ⌘K | UI có gợi ý | Wire thật nếu chưa |

### 3.3 Mobile web

- FAB “+” (đã có).  
- Bottom tabs ≤ 5 (đã có).  
- Form amount lớn, inputMode decimal (đã có).  
- Tránh modal quá dài — ngày + account trên 1 hàng.

### 3.4 Privacy & trust (bài học Actual / self-host)

- Không hỏi mật khẩu ngân hàng.  
- Export CSV (đã có reports).  
- Demo mode vs real mode rõ (đã có).  

---

## 4. So sánh feature: MoneyFlow vs top OSS

| Feature | Actual | Firefly | MoneyFlow | Ghi chú |
|---|---|---|---|---|
| Web app | ✓ | ✓ | ✓ | |
| Multi account | ✓ | ✓ | ✓ | |
| Expense / income | ✓ | ✓ | ✓ | |
| Transfer | ✓ | ✓ | ✓ | |
| Budgets | Envelope | ✓ | Category month | Đủ cho cá nhân |
| Recurring bills | Limited | Bills | Commitments | OK |
| Goals / piggy | — | Piggy | Goals | OK |
| Safe-to-spend | — | — | **✓ khác biệt** | Giữ làm USP cá nhân |
| Reports + CSV | ✓ | ✓ | ✓ | |
| Double-entry core | Khác model | ✓ | ✓ entries | Tốt |
| Rules engine | Limited | **Mạnh** | ✗ | Later |
| Bank sync | GoCardless/SimpleFIN… | Data Importer | ✗ | Không cần VN sớm |
| Chọn ngày khi add | ✓ | ✓ | **Fix** | |
| Keyboard shortcut | ✓ | Partial | **Fix** | |

---

## 5. Quyết định áp dụng (now / next / never sớm)

### Now (trong PR này)

1. Form thêm: **chọn ngày giao dịch** (mặc định hôm nay, TZ VN).  
2. **Nhớ** loại / tài khoản / danh mục lần trước (localStorage).  
3. **Lưu & thêm tiếp** — nhập nhiều món liên tiếp (pattern Firefly/YNAB).  
4. Phím **`N`** mở form thêm (khi không focus input).  
5. Dashboard: hiện **ròng tháng (thu − chi)**.  
6. Tài liệu product trỏ về research này.

### Next (khi dùng thật 1–2 tuần)

1. CSV import đơn giản (học Actual file import — chỉ 1 format generic).  
2. Tìm kiếm giao dịch thật (wire search bar).  
3. Rule cực nhẹ: “nếu note chứa … → category” (học Firefly rules, bản tối giản).  
4. Reconcile số dư tài khoản (Actual/YNAB).  
5. Tags optional.

### Không làm sớm

- Clone full Firefly (quá nặng, PHP).  
- Envelope YNAB đầy đủ nếu safe-to-spend đã đủ.  
- Bank sync / Open Banking VN.  
- AI advisor.  
- Copy code AGPL vào repo MIT/proprietary — **chỉ học ý tưởng**.

---

## 6. Checklist “web tài chính tốt” (tự chấm)

| # | Tiêu chí | Status |
|---|---|---|
| 1 | Thêm chi < 10 giây | Cải thiện bằng N + remember + rapid |
| 2 | Thu / chi / CK không lẫn | ✓ |
| 3 | Số tiền integer | ✓ |
| 4 | Xem tháng này thu/chi/ròng | Cải thiện net |
| 5 | Sửa / xóa an toàn | ✓ |
| 6 | Mobile dùng được | ✓ cơ bản |
| 7 | Export dữ liệu | ✓ CSV reports |
| 8 | Multi account | ✓ |
| 9 | Không float money | ✓ |
| 10 | Dùng được offline/demo | Demo localStorage ✓ |

---

## 7. Nguồn

- [actualbudget/actual](https://github.com/actualbudget/actual)  
- [actualbudget.org](https://actualbudget.org)  
- [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii)  
- [Firefly best practices](https://docs.firefly-iii.org/explanation/data-classification/best-practices/)  
- YNAB pricing / file import docs  
- Money Lover Play / App Store  
- So sánh community Actual vs Firefly (HN, Reddit selfhosted, video 2025–2026)

---

## 8. Kết luận ngắn

MoneyFlow **đã đúng hướng** cho quản lý thu/chi cá nhân (ledger + safe-to-spend + budgets).  
Gap so với top OSS chủ yếu là **friction khi nhập**, không phải thiếu 50 tính năng.

> **Học Actual/Firefly = làm form nhập xuất sắc + số liệu tháng rõ.  
> Không học = biến app thành ERP kế toán.**
