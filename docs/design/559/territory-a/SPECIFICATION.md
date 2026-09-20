# Territory A: Kỷ Hà Đương Đại (Architectural Precision Ledger)

**Cảm hứng thiết kế:** Swiss Modernist Grid (Max Bill, Josef Müller-Brockmann), Chủ nghĩa Công năng Dieter Rams ("Weniger, aber besser" — Ít hơn nhưng tốt hơn), Bảng cân đối tài chính kiến trúc.  
**Đối tượng hướng tới:** Kỹ sư, chuyên gia tài chính, người yêu thích sự ngăn nắp, kỷ luật, mật độ dữ liệu cao và sự kiểm soát tài chính tuyệt đối.

---

## 1. Triết lý Thiết kế (Design Philosophy)

Tài chính không phải là một trò chơi (gamification), cũng không phải là nơi để trang trí màu mè. Đối với một người coi trọng sự an toàn tài chính, **trật tự là sự bình yên**. 

Territory A coi giao diện MoneyFlow như một công trình kiến trúc hiện đại bằng kính và thép:
- **Tôn trọng trục lưới (Grid Sanctity):** Mọi thành phần đều neo chặt vào hệ thống lưới 8px. Không có khoảng cách ngẫu nhiên.
- **Số liệu là nhân vật chính (Numeric Primacy):** Sử dụng font đơn cách tabular (`JetBrains Mono` / Tabular lining figures) cho toàn bộ con số. Dấu chấm hàng nghìn và các chữ số thẳng hàng tuyệt đối theo trục dọc.
- **Loại bỏ bóng đổ và hiệu ứng giả tạo (Zero Ornamentation):** Không dùng shadow mờ ảo, không dùng gradient màu mè. Các khối bề mặt phân định ranh giới bằng các đường hairline kỹ thuật `1px solid #E2E8F0` sắc nét.
- **Rõ ràng không phụ thuộc màu sắc:** Thu chi luôn có tiền tố toán học (`+`, `−`, `↔`), nhãn chữ danh mục rõ ràng và icon phân loại ngữ nghĩa.

---

## 2. Quy chuẩn Hệ thống (System Standards)

### A. Kiểu chữ & Số học (Typography & Numerals)
- **Tiêu đề & Nhãn cấu trúc:** `Inter` (Font weight 600/700, letter-spacing `-0.03em`). Nhãn phân mục phụ dùng Uppercase có tracking mở rộng `0.05em` với kích thước `11px` để tạo cấu trúc báo cáo ngân hàng chuẩn mực.
- **Nội dung & Danh mục:** `Inter` (13px - 14px, Regular/Medium, line-height `1.45`).
- **Con số tài chính:** `JetBrains Mono` hoặc Inter với `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "zero" 1;`. Con số 0 có gạch chéo phân biệt rõ ràng.

### B. Bảng màu & Ranh giới Ngữ nghĩa (Palette & Color Roles)
- **Nền tổng thể (Canvas):** Thạch cao kiến trúc `#F8FAFC` (Dark: `#0A0E17`).
- **Bề mặt thẻ (Surface):** Trắng phẳng `#FFFFFF` (Dark: `#111827`).
- **Màu văn bản chính:** Hắc ín than chì `#0F172A` (Dark: `#F8FAFC`).
- **Đường viền (Hairline Dividers):** `1px solid #E2E8F0` (Dark: `1px solid #1E293B`).
- **Dòng tiền vào (+):** Xanh lục bảo đậm `#059669` (Dark: `#34D399`) + huy hiệu `+ Thu`.
- **Dòng tiền ra (−):** Đỏ thẫm kỹ thuật `#DC2626` (Dark: `#F87171`) + huy hiệu `− Chi`.
- **Chuyển khoản (↔):** Xanh chàm Cobalt `#4F46E5` (Dark: `#818CF8`) + huy hiệu `↔ Chuyển`.
- **Cảnh báo / Lệch đối soát:** Hổ phách `#D97706` (Dark: `#FBBF24`).

### C. Hình học Điều khiển & Tiêu chuẩn Chạm (Geometry & Targets)
- **Bo góc (Radii):** `0px` cho viền bảng, `2px` cho badges và tags, tối đa `4px` cho nút bấm và thẻ card. Giữ cảm giác sắc sảo, kỹ thuật.
- **Target Size:** Nút bấm trên Desktop tối thiểu `36px`, trên Mobile mọi nút tương tác chính đạt đúng **`44×44px`** (chuẩn MoneyFlow preference), các nút phụ không bao giờ nhỏ hơn `24×24px` (chuẩn sàn WCAG 2.2 AA).

---

## 3. Trải nghiệm 6 Màn hình Chuẩn (Canonical Workflows Expression)

1. **Today / Dashboard:**
   - Cột trái: Thẻ Tổng tài sản ròng (`114.040.000 ₫`) kết cấu dạng sổ cái kỹ thuật với chỉ số Thặng dư tháng 9 (`+ 31.220.000 ₫`).
   - Khối Attention nổi bật: Cảnh báo lệch đối soát Techcombank (`+ 400.000 ₫`) viền hổ phách sắc nét kèm nút hành động "Đối soát ngay".
   - 4 tài khoản hiển thị dạng danh sách lưới ngân hàng kèm số tài khoản ẩn danh (`1903••••882`).
   - Nút hành động chính duy nhất: "+ Ghi chi tiêu" màu than chì `#0F172A` nổi bật.
2. **Activity / Transactions:**
   - Bảng đăng ký giao dịch mật độ cao (Dense Register). Các dòng được phân nhóm theo ngày rõ ràng (`Hôm nay`, `Hôm qua`, `Tuần trước`).
   - Cột số tiền căn phải tuyệt đối với font mono tabular.
   - Click chọn dòng mở Drawer chi tiết bên phải (Desktop) hoặc Bottom Sheet (Mobile) hiển thị nguồn gốc xuất xứ (Provenance: Dán văn bản (Paste) / Nhập CSV / Ghi thủ công).
3. **Accounts & Reconciliation:**
   - Danh sách tài khoản kèm trạng thái đối soát: Techcombank hiện trạng thái `[Cần đối soát]`, 3 tài khoản còn lại `[Khớp 100%]`.
   - Bảng so sánh 3 chỉ số theo hợp đồng MoneyFlow: Số dư sao kê ngân hàng (32.850.000 ₫), Số dư đã khớp trên sổ (32.450.000 ₫), và Chênh lệch còn lại (+400.000 ₫).
   - **Bảo vệ bất biến sản phẩm (Product Truth Invariant):** Đối soát không bao giờ thay đổi số dư tài khoản hoặc tự ý sinh bút toán bù trừ sai lệch. Nút "Hoàn tất đối soát" bị vô hiệu hóa hoàn toàn khi chênh lệch khác 0 ₫. Người dùng phải rà soát và đánh dấu khớp giao dịch Napas +400.000 ₫ để đưa chênh lệch về 0 ₫ trước khi chốt phiên.
4. **Plan:**
   - 3 khối độc lập rõ ràng: Ngân sách (Budgets), Cam kết định kỳ (Commitments), Mục tiêu tiết kiệm (Goals).
   - Ngân sách Mua sắm hiển thị thanh tiến độ vạch kẻ kỹ thuật chạm ngưỡng 97.5% với cảnh báo viền vàng cam.
   - Quỹ khẩn cấp 120M hiển thị nhịp tích lũy khuyến nghị `205.000 ₫/ngày`.
5. **Capture:**
   - Hộp thoại ghi nhanh tối giản, bàn phím số lớn, phản hồi tức thì dưới 100ms.
   - Phân định rõ 3 luồng: Ghi tay nhanh, Dán nội dung văn bản (Paste), Nhập file CSV/XLSX.
6. **Settings / Data Governance:**
   - Giao diện dạng form kỹ thuật ngăn nắp: Chuyển theme, mật độ Compact, Quản lý danh mục, Sao lưu mã hóa cục bộ, Xuất dữ liệu chính quy CSV/JSON, và Thẩm định kiểu chữ số tài chính (Numeric Typography).

### Bảng Thẩm Định Kiểu Chữ Số Tài Chính (Tabular Sans vs Monospace)

| Chỉ số kiểm thử | Proportional Sans Tabular (`Inter tnum`) | Monospace (`JetBrains Mono`) | Kết luận & Đánh đổi |
|---|---|---|---|
| **Độ rộng ký tự (Width)** | Gọn gàng (114.040.000 ₫ chiếm ~108px ở 14px) | Rộng hơn ~20% (114.040.000 ₫ chiếm ~130px) | Sans Tabular an toàn hơn trên Mobile 390px, Mono có nguy cơ tràn lề trên thẻ nhỏ |
| **Căn thẳng hàng dọc (Scanability)** | Căn thẳng hàng tốt nếu bật `tabular-nums` | Căn thẳng hàng tuyệt đối 100% | Mono cho cảm giác kiểm toán kỹ thuật cao hơn |
| **Hiển thị dấu âm/dương (`+`/`−`)** | Dấu toán học thanh thoát | Dấu chiếm nguyên 1 slot bề ngang cố định | Cả hai đều rõ ràng, Mono tách bạch hơn |
| **Giá trị thử nghiệm thực tế** | `850.000 ₫`, `12.450.000 ₫`, `114.040.000 ₫`, `−32.850.000 ₫`, `+120.000.000 ₫` | Cùng tập dữ liệu | Đánh giá trực tiếp trong Settings prototype |

---

## 4. Giải pháp Thiết kế Responsive (Desktop 1440px vs Mobile 390px)

- **Desktop (1440px):**
  - Sidebar bên trái cố định rộng 240px với logo MoneyFlow sắc nét, menu phân nhóm `Chính` và `Kế hoạch / Nâng cao`.
  - Topbar thanh mảnh 56px với thanh tìm kiếm nhanh toàn cục và nút CTA duy nhất "+ Ghi chi tiêu".
  - Nội dung dàn trang tối đa 1280px căn giữa, bố cục 12 cột.
- **Mobile (390px):**
  - Thanh tiêu đề trên cùng 48px tinh giản.
  - Thanh điều hướng đáy (Bottom Navigation Bar) cố định cao 64px với vùng chạm 44px chuẩn: `Tổng quan`, `Giao dịch`, nút `Ghi (+)` ở giữa nổi bật, `Tài khoản`, `Thêm`.
  - Khoảng trống đệm an toàn dưới đáy (Safe area inset) để không bị trùng lặp với cử chỉ vuốt của hệ điều hành.
