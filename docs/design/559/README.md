# Báo Cáo Thăm Dò & Định Hình Thiết Kế Web MoneyFlow Thế Hệ Mới

**Căn cứ nhiệm vụ:** PR #562 / Issue #559 Foundation  
**Ranh giới thực thi:** Giai đoạn Thăm dò Thiết kế (Design Exploration Phase) — **Hoàn toàn không can thiệp mã nguồn `src/` (Zero Runtime Impact)**  
**Trạng thái:** Hoàn tất 100% 3 Định hướng Thị giác độc lập, Bảng so sánh song song tương tác và Ma trận đánh giá 12 tiêu chí.

---

## 1. Cấu Trúc Hồ Sơ Thiết Kế (`docs/design/559/`)

Hồ sơ thiết kế này được tạo ra như một bộ bằng chứng vật lý trực quan hoàn chỉnh trên đĩa, cho phép Chủ dự án (Owner) mở trực tiếp trong trình duyệt để kiểm tra, tương tác và ra quyết định:

```text
docs/design/559/
├── README.md                            # Báo cáo tổng thể & Hướng dẫn duyệt thiết kế (Tài liệu này)
├── system/
│   ├── TOKENS_SPECIFICATION.md          # Đặc tả chi tiết Design System v3 Tokens cho cả 3 Territories
│   └── CANONICAL_DATASET.json           # Bộ dữ liệu thực tế mẫu chuẩn của MoneyFlow (VND, 4 tài khoản, lệch đối soát)
├── territory-a/
│   ├── SPECIFICATION.md                 # Đặc tả chi tiết Territory A: Kỷ Hà Đương Đại (Swiss Grid / Dieter Rams)
│   └── prototype.html                   # High-Fidelity Prototype tương tác đầy đủ (Desktop 1440px & Mobile 390px, 6 màn hình)
├── territory-b/
│   ├── SPECIFICATION.md                 # Đặc tả chi tiết Territory B: Dòng Chảy Xanh (Modern Tactile Flow)
│   └── prototype.html                   # High-Fidelity Prototype tương tác đầy đủ (Desktop 1440px & Mobile 390px, 6 màn hình)
├── territory-c/
│   ├── SPECIFICATION.md                 # Đặc tả chi tiết Territory C: Bản Ghi Bản Lĩnh (Editorial Craft Ledger)
│   └── prototype.html                   # High-Fidelity Prototype tương tác đầy đủ (Desktop 1440px & Mobile 390px, 6 màn hình)
└── comparison/
    ├── COMPARISON_BOARD.md              # Bảng so sánh đa chiều & Ma trận chấm điểm 12 tiêu chí
    └── side-by-side.html                # Công cụ so sánh trực quan song song 3 Territories (Desktop 1440px & Mobile 390px)
```

---

## 2. Tóm Tắt Ba Định Hướng Thị Giác (Three Visual Territories)

### Territory A: Kỷ Hà Đương Đại (Architectural Precision Ledger)
- **Cảm hứng:** Swiss Modernist Grid (Max Bill, Josef Müller-Brockmann), Chủ nghĩa Công năng Dieter Rams ("Weniger, aber besser").
- **Đặc trưng:** Lưới 8px nghiêm ngặt, số liệu font đơn cách tabular (`JetBrains Mono`) thẳng hàng tuyệt đối, viền hairline 1px sắc sảo, 0px đổ bóng, đạt điểm số cao nhất về mật độ thông tin và độ tin cậy kế toán.
- **File chạy thử nghiệm:** [`territory-a/prototype.html`](file:///home/thunder/Code/MoneyFlow/app/docs/design/559/territory-a/prototype.html)

### Territory B: Dòng Chảy Xanh (Modern Tactile Flow)
- **Cảm hứng:** Sự mượt mà của dòng tiền hiện đại, bề mặt xúc giác êm ái (Tactile Surfaces), trực quan hóa chuyển động tài chính rõ nét.
- **Đặc trưng:** Bo góc 16px–20px, bóng mờ môi trường đa tầng, "Dải ruy-băng dòng tiền" (Cashflow Ribbon) trực quan hóa thu/chi/thặng dư, công thái học ngón cái trên di động mượt mà nhất.
- **File chạy thử nghiệm:** [`territory-b/prototype.html`](file:///home/thunder/Code/MoneyFlow/app/docs/design/559/territory-b/prototype.html)

### Territory C: Bản Ghi Bản Lĩnh (Editorial Craft Ledger)
- **Cảm hứng:** Báo chí tài chính thượng lưu (Financial Times, The Economist), Sổ cái kế toán bọc da cổ điển, nghệ thuật in ấn chữ kim loại.
- **Đặc trưng:** Nền giấy ngà ấm (`#FAF7F2`), mực in Espresso đen sâu, font tiêu đề có chân thanh nhã (`Newsreader`), và biểu tượng "Đường kẻ đôi kế toán" (`3px double`) cho dòng chốt số dư uy tín.
- **File chạy thử nghiệm:** [`territory-c/prototype.html`](file:///home/thunder/Code/MoneyFlow/app/docs/design/559/territory-c/prototype.html)

---

## 3. Sáu Màn Hình Tiêu Chuẩn Trong Cùng Một Tập Dữ Liệu (Canonical Workflows)

Mọi định hướng thị giác đều được hiện thực hóa dựa trên cùng một tập dữ liệu thực tế mẫu tại Việt Nam:
1. **Screen 1 — Today / Dashboard:** Tổng tài sản khả dụng (`114.040.000 ₫`), Dòng tiền tháng 9 (Thu: +46.5M, Chi: −15.28M, Thặng dư: +31.22M), Cảnh báo lệch đối soát Techcombank (+400k), 4 tài khoản, Giao dịch mới, nút "+ Ghi chi tiêu".
2. **Screen 2 — Activity / Transactions:** Sổ đăng ký giao dịch mật độ cao, phân nhóm ngày, nguồn xuất xứ (Dán văn bản/Paste, Sao kê CSV, Ghi nhanh), lọc tài khoản, drawer chi tiết.
3. **Screen 3 — Accounts & Reconciliation:** 4 tài khoản (Techcombank, VPBank, MoMo, Tiền mặt), bảng đối soát số dư sổ (32.45M) vs số dư sao kê (32.85M), phát hiện giao dịch Napas 22:15 chưa ghi sổ, chỉ cho phép hoàn tất đối soát khi độ lệch bằng đúng 0 ₫.
4. **Screen 4 — Plan:** Ngân sách (Ăn uống 63%, Mua sắm cảnh báo 97.5%), Cam kết định kỳ (Tiền thuê nhà, Điện EVN, Internet FPT), Mục tiêu Quỹ khẩn cấp 120M (65.4% tiến độ).
5. **Screen 5 — Capture:** Bàn phím ghi tiền numpad lớn, chọn loại Thu/Chi/Chuyển, danh mục, tài khoản, tốc độ phản hồi tức thì.
6. **Screen 6 — Settings / Data Governance:** Tùy chọn giao diện Sáng/Tối, Ẩn số dư nơi công cộng (`•••••• ₫`), Sao lưu mã hóa JSON và xuất file CSV.

---

## 4. Cách Chủ Dự Án (Owner) Thẩm Định Trực Tiếp

1. **So sánh song song 3 định hướng cùng lúc:** Mở [`comparison/side-by-side.html`](file:///home/thunder/Code/MoneyFlow/app/docs/design/559/comparison/side-by-side.html) trên trình duyệt, chuyển đổi qua lại giữa **Desktop (1440px)** và **Mobile (390px)** cho từng màn hình nghiệp vụ.
2. **Trải nghiệm tương tác sâu từng định hướng:** Mở file `prototype.html` bên trong thư mục `territory-a/`, `territory-b/`, hoặc `territory-c/` để click thử nghiệm các tương tác thực tế (Mở modal ghi chi tiêu, chuyển dark mode, ẩn số dư, đối soát tài khoản).
3. **Đọc phân tích đánh đổi & chấm điểm:** Xem chi tiết tại [`comparison/COMPARISON_BOARD.md`](file:///home/thunder/Code/MoneyFlow/app/docs/design/559/comparison/COMPARISON_BOARD.md).
