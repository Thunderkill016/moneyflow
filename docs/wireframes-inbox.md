# Money Flow — Wireframes (Inbox-first)

> **Status:** historical Inbox-first wireframe input. Retain capture/review and state
> lessons, but do not treat its route hierarchy or product identity as current.

> Low-fidelity · **không màu · không style brand đối thủ** · chỉ cấu trúc & ưu tiên.  
> Reference: [UX_RESEARCH_AND_REDESIGN.md](./UX_RESEARCH_AND_REDESIGN.md)

**Ký hiệu:** `[ ]` checkbox · `( )` radio · `{Primary}` CTA · `…` overflow · `⚠` uncertain

---

## 0. App shell

### Desktop ≥1024

```
┌──────────────┬────────────────────────────────────────────────────────────┐
│ Money Flow   │  Inbox                    [Tìm ⌘K]     [Capture ▾] [User] │
│              ├────────────────────────────────────────────────────────────┤
│ ● Inbox  (23)│                                                            │
│   Capture    │                    MAIN                                    │
│   Timeline   │                                                            │
│   Accounts   │                                                            │
│   Rules      │                                                            │
│   Imports    │                                                            │
│   Insights   │                                                            │
│ ──────────── │                                                            │
│   Settings   │                                                            │
│   [avatar]   │                                                            │
└──────────────┴────────────────────────────────────────────────────────────┘
```

**Lý do:** Badge trên Inbox (không trên Home chart) = tần suất task duyệt. Capture là entry, không chôn.

### Mobile <640

```
┌─────────────────────────────┐
│ Money Flow     [Capture]    │
├─────────────────────────────┤
│         MAIN                │
│                             │
├─────────────────────────────┤
│ Inbox │ Cap. │ Time │ Acc │ …│
└─────────────────────────────┘
```

Capture sheet:

```
┌─────────────────────────────┐
│ Đưa giao dịch vào           │
│ [ Dán text / SMS ]          │
│ [ Tải sao kê / file ]       │
│ [ Thêm nhanh 1 khoản ]      │
│ [Hủy]                       │
└─────────────────────────────┘
```

---

## 1. Landing page

**Mục tiêu:** 10 giây hiểu “hộp thư giao dịch”, tin privacy, CTA.

```
[Logo Money Flow]

Hộp thư cho mọi giao dịch tài chính của bạn
Dán text, tải sao kê, duyệt ngoại lệ — không gõ lại từng dòng.
Không bao giờ hỏi mật khẩu ngân hàng.

{Bắt đầu miễn phí}   [Đăng nhập]

--- Cách hoạt động ---
1. Đưa dữ liệu vào   2. Hệ thống chuẩn hóa   3. Bạn duyệt   4. Xuất hoặc ghi sổ

--- Phù hợp nếu bạn ---
· Có nhiều TK / ví
· Đang dùng Excel
· Lười nhập tay từng món

--- Tin cậy ---
Raw file lưu ngắn · Bạn duyệt trước khi vào sổ · Export / xóa 1 chỗ

[Footer: Privacy · Terms]
```

**States:** default only (static).  
**Không:** screenshot fake dense dashboard competitor-style.

---

## 2. Đăng nhập / Đăng ký

```
[Logo]

Đăng nhập
Email [____________]
Mật khẩu [________]
{Đăng nhập}
[Google]
[Quên mật khẩu?]  [Tạo tài khoản]

Microcopy: Dữ liệu của bạn thuộc về bạn.
```

Đăng ký tương tự + checkbox: `[] Tôi đồng ý Privacy` (link).

**Error:** inline dưới field.  
**Loading:** button disabled + “Đang…”  
**Success:** redirect onboarding | inbox.

---

## 3. Onboarding

**3 bước tối đa** (tránh drop-off kiểu onboarding dài).

```
Bước 1/3 — Cam kết
☑ Không hỏi mật khẩu / OTP ngân hàng
☑ Bạn duyệt trước khi giao dịch vào sổ
☑ Có thể xóa dữ liệu bất cứ lúc nào
{Tiếp}

Bước 2/3 — Đưa dữ liệu đầu tiên thế nào?
( ) Dán text / SMS
( ) Tải CSV / Excel / PDF
( ) Thêm nhanh 1 khoản (thử tay)
{Tiếp}

Bước 3/3 — [Màn capture tương ứng]
Skip: "Để sau — vào Inbox trống"
```

---

## 4. App shell

(Xem §0.)  
**Primary global:** Capture.  
**Secondary:** search (timeline + inbox fields).

---

## 5. Financial Inbox (HOME)

```
Inbox                              [Capture ▾]
Cần duyệt: 34   ·  Hôm nay đã duyệt: 12

Filters: [Tất cả] [⚠ Cần xem] [Trùng?] [CK?] [Nguồn ▾]
Sort: [Mới import]

Bulk (khi chọn >0):  [Duyệt] [Từ chối] [Gán danh mục] [Gán TK] [… ]

□  12/07  Highlands Coffee   −45.000 ₫   paste  ⚠  [Sửa]
□  12/07  LUONG CT           +25.000.000 csv   ✓  …
☑  11/07  GRAB *TRIP         −89.000     csv   ✓  …
…

Footer list: "Đã chọn 2" | {Duyệt đã chọn}
```

**Row anatomy:** checkbox · date · merchant · money · source badge · confidence · overflow  

**Empty:**

```
Inbox trống
Chưa có giao dịch chờ duyệt.
{Dán text}  [Tải file]  [Thêm nhanh]
```

**Loading:** skeleton 8 rows.  
**Error:** banner “Không tải được inbox” + Thử lại.  
**Partial:** “12/40 dòng import lỗi — xem Imports”.

---

## 6. Paste Anything

```
← Inbox
Dán bất cứ thứ gì

┌──────────────────────────────────────┐
│ (textarea autofocus)                 │
│ VD: cafe 45k tiền mặt                │
│ hoặc nguyên tin nhắn biến động số dư │
└──────────────────────────────────────┘

Nguồn gợi ý: (•) Tự nhận  ( ) SMS NH  ( ) Ví  ( ) Khác
{Phân tích}

— Kết quả preview (trước khi vào inbox) —
Tìm thấy 3 giao dịch · 1 cần xem
[Vào Inbox]  [Sửa từng dòng]
```

**Uncertain:** highlight field đỏ/warning + “Không chắc số tiền — kiểm tra”.  
**Không** nút “Ghi thẳng vào sổ” từ đây.

---

## 7. Quick Add Transaction

```
Thêm nhanh
( Khoản chi | Khoản thu )

Số tiền *  [          ] ₫
Danh mục   [grid / select]
Tài khoản  [select]
Ngày       [date = today]
Ghi chú    [optional]

[ ] Lưu xong thêm tiếp
{Lưu}  [Hủy]
```

**Lý do:** tần suất cao, risk thấp — form ngắn hơn import.

---

## 8. Upload Statement

```
Tải sao kê / file giao dịch

[  Kéo thả CSV, XLS, XLSX, PDF  ]
   tối đa 10MB · không chứa hành

Hoặc [Chọn file]

Trust: File chỉ bạn thấy · có thể xóa raw sau khi xử lý.
```

**Error:** sai type / quá lớn / virus policy.  
**Loading:** progress “Đang tải lên…”

---

## 9. Import Preview

```
Import · MB_T06.csv                    Trạng thái: Chờ xác nhận

Template gợi ý: Generic CSV (cột tự map 86%)
[Dùng gợi ý] [Map cột thủ công]

Map:
Ngày        → [col Date ▾]
Số tiền     → [col Amount ▾]
Mô tả       → [col Desc ▾]
[Tài khoản đích: Techcombank ▾]

Preview 10 dòng đầu
| Ngày | Mô tả | Số tiền | ⚠ |
...

Tóm tắt: 120 dòng · 4 ⚠ · 2 có thể trùng

{Đưa vào Inbox}  [Hủy import]
```

**Critical:** đây là cổng chất lượng — user thấy trước khi tạo candidates hàng loạt.

---

## 10. Transaction Review (single)

```
← Inbox
Duyệt giao dịch

−45.000 ₫          Confidence: Cần xem (0.62)
2026-07-12
Merchant: [Highlands Coffee    ]  raw: "HIGHLANDS COFFEE Q1"
Danh mục: [Ăn uống ▾]
Tài khoản:[Techcombank ▾]
Ghi chú:  [                    ]

— Vì sao hệ thống đoán vậy —
· Parser: paste_sms@1.2
· Amount regex khớp “45.000đ”
· Rule #12: HIGHLANDS → Highlands Coffee / Ăn uống
· Nguồn: paste · batch #88

Raw:
| ... HIGHLANDS COFFEE Q1 ... 45.000đ ... |

{Duyệt vào sổ}  [Từ chối]  [Đánh dấu trùng]
[ ] Nhớ sửa này thành rule
```

---

## 11. Bulk Review

```
Đã chọn 12 giao dịch

Hành động:
( ) Duyệt vào sổ (chỉ dòng conf ≥ ngưỡng: 9/12)
( ) Từ chối
( ) Gán danh mục → [select]
( ) Gán tài khoản → [select]
( ) Chuẩn hóa merchant chứa "GRAB" → "Grab"

[ ] Tạo rule từ thay đổi merchant/category

⚠ 3 dòng conf thấp sẽ bị bỏ qua trừ khi [ ] Bao gồm cả dòng cần xem

{Áp dụng}  [Hủy]
```

**Undo:** toast “Đã duyệt 9 · Hoàn tác 10s”.

---

## 12. Transaction Detail

Mở rộng Review: full audit (created, parser version, rule ids, links duplicate/transfer, artifact link).  
Actions: Edit · Reject · Open raw file (if retained) · Post history.

---

## 13. Accounts and Wallets

```
Tài khoản & ví                    [+ Thêm]

Tiền mặt          2.400.000 ₫
Techcombank      15.200.000 ₫
MoMo              350.000 ₫
Thẻ tín dụng     −1.200.000 ₫  (nợ)

Mỗi row: tên · loại · số dư · … (sửa/lưu trữ)
```

**Empty:** “Thêm tài khoản đầu tiên để gán giao dịch khi duyệt.”  
**Không** net-worth chart lớn — list scannable.

---

## 14. Rules

```
Quy tắc tự động                         [+ Thêm]

Ưu tiên cao → thấp
1. merchant chứa HIGHLANDS → Highlands + Ăn uống    [on]
2. desc ~ LUONG → Lương                            [on]
3. (learned) GRAB → Grab + Di chuyển               [on]

Click rule → editor:
Nếu [field] [op] [value]
Thì  [set field] [value]
Giải thích hiện: "…"
```

**Conflict:** “Rule #1 thắng #3 vì priority.”

---

## 15. Import History

```
Lịch sử import

14/07  MB.csv     120 dòng  4 lỗi   [Xem inbox] [Xóa raw]
07/07  paste×3      3 dòng  0 lỗi   [Xem]
01/07  sao_ke.pdf  failed   …       [Chi tiết lỗi]
```

---

## 16. Timeline

```
Dòng thời gian (đã duyệt)          [Export]

Filters: khoảng ngày · TK · danh mục · loại

14/07
  −45.000  Highlands  Ăn uống  Techcombank
  ↔ 2.000.000  CK nội bộ (không tính chi)
13/07
  +25.000.000  Lương
```

**Empty:** “Chưa có giao dịch đã duyệt — hãy xử lý Inbox.”

---

## 17. Dashboard tối giản (Insights)

```
Insights                         (phụ)

Có thể chi hôm nay
  392.000 ₫
  (dựa trên số dư − giữ trước − ngân sách · xem công thức)

Tháng này
  Thu  +xx   Chi  −yy   Ròng  ±zz

Cần chú ý
  · Inbox còn 23 dòng  → [Mở Inbox]
  · Ngân sách Ăn uống 80%  → [Xem]

[Không chart lớn / không pie]
```

**Lý do demote:** activation metric = approve, không phải view chart.

---

## 18. Privacy Settings

```
Quyền riêng tư

Lưu file gốc (raw)
( ) Xóa ngay sau khi parse
(•) Giữ 7 ngày
( ) Giữ 30 ngày

[ ] Cho phép dùng mẫu đã ẩn danh để cải thiện parser (tắt mặc định)

Nhật ký: lần export / xóa gần nhất

{Lưu}
```

---

## 19. Export Data

```
Xuất dữ liệu

Loại: (•) Giao dịch đã duyệt  ( ) Ứng viên inbox  ( ) Toàn bộ JSON
Từ [date] đến [date]
Định dạng: (•) CSV  ( ) JSON

{Tải xuống}
```

---

## 20. Delete Account

```
Xóa tài khoản

Sẽ xóa: profile, inbox, sổ, file raw, rules.
Không hoàn tác sau khi hoàn tất.

Gõ XÓA để xác nhận [____]

{Xóa vĩnh viễn}  [Hủy]
```

---

## 21. Error page

```
Có lỗi xảy ra
Mã: mf_500 · Đã ghi nhận (không kèm raw tài chính)

{Thử lại}  [Về Inbox]  [Liên hệ hỗ trợ]
```

---

## 22. Empty states (catalog)

| Context | Title | CTA |
|---|---|---|
| Inbox | Chưa có gì chờ duyệt | Capture |
| Timeline | Chưa có giao dịch sạch | Mở Inbox / Capture |
| Accounts | Chưa có tài khoản | Thêm TK |
| Rules | Chưa có rule | Thêm hoặc duyệt để học |
| Imports | Chưa import | Upload / Paste |
| Search | Không khớp | Xóa filter |

Icon abstract đơn giản — **không** illustration stock copy competitor.

---

## 23. Loading states

| Surface | Pattern |
|---|---|
| Inbox | Skeleton rows (no full-page spinner only) |
| Preview | Stepper: Upload → Extract → Normalize |
| Approve | Button loading; row optimistic + rollback on fail |
| Insights | Skeleton cards |

---

## 24. Mobile capture flow

```
[OS Share] → Money Flow
  → "Đã nhận 1 ảnh/text"
  → Queue local
  → "Mở Inbox để duyệt (3)"

Hoặc trong app:
Capture → Paste (clipboard) / Upload / Quick
  → same as desktop compact
```

**Permission copy (noti later):**  
“Chỉ đọc thông báo giao dịch bạn chọn nguồn · tắt bất cứ lúc nào · không đọc OTP cố ý.”

---

## Keyboard (desktop power)

| Phím | Hành động |
|---|---|
| `C` | Mở Capture menu |
| `N` | Quick Add |
| `J` / `K` | Hàng inbox kế / trước |
| `X` | Toggle select |
| `A` | Approve selected (nếu hợp lệ) |
| `E` | Mở review |
| `/` | Focus search |
| `?` | Shortcut help |

---

## Checklist anti-copy

- [x] Không dùng layout pixel-like YNAB/Copilot  
- [x] Không copy bảng màu brand  
- [x] Không copy slogan  
- [x] Metaphor “inbox triage” là tổ hợp job riêng  
- [x] Mọi màn có empty/loading/error khi data  
- [x] Low confidence never silent-post  

---

*Wireframes v1 — sẵn sàng cho high-fi implement theo design-system.md*
