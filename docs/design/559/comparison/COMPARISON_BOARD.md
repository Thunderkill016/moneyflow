# Bảng So Sánh & Đánh Giá Đa Chiều Ba Định Hướng Thị Giác (Visual Territories)

**Căn cứ pháp lý:** PR #562 / Issue #559 Foundation  
**Tập dữ liệu kiểm thử:** `docs/design/559/system/CANONICAL_DATASET.json`  
**Công cụ tương tác song song:** `docs/design/559/comparison/side-by-side.html`

---

## 1. Ma Trận Đánh Giá 12 Tiêu Chí (Thang điểm nguyên 1–5, Trọng số 100%)

*Ghi chú: Toàn bộ điểm thành phần là số nguyên (Integer 1–5) theo đúng quy chuẩn thẩm định.*

| Tiêu chí Đánh giá (Evaluation Dimension) | Trọng số | Territory A: Kỷ Hà Đương Đại | Territory B: Dòng Chảy Xanh | Territory C: Bản Ghi Bản Lĩnh |
|---|:---:|:---:|:---:|:---:|
| 1. **Trust (Độ tin cậy tài chính)** | 10% | **5** (Tuyệt đối — sổ cái kỹ thuật, kỷ luật cao) | **4** (Khá — thân thiện, mang tính tiêu dùng) | **5** (Tuyệt đối — uy tín học thuật, bản lĩnh sổ cái) |
| 2. **Financial clarity (Độ rõ ràng tiền tệ)** | 10% | **5** (Tuyệt đối — số căn cột thẳng hàng, dấu tách bạch) | **4** (Rất tốt — Cashflow ribbon trực quan tỷ lệ) | **4** (Rất tốt — đường kẻ đôi phân tách số dư rõ rệt) |
| 3. **Information density (Mật độ thông tin)** | 10% | **5** (Tối đa — hiển thị 12–15 dòng GD không rối mắt) | **3** (Trung bình — bo cong 16px và lề rộng giảm số dòng) | **4** (Tốt — đường kẻ sepia mảnh tối ưu không gian) |
| 4. **Mobile usability (Công thái học di động)**| 10% | **4** (Tốt — nút chạm chuẩn xác, không vướng hiệu ứng) | **5** (Xuất sắc — phím sứ tactile, ngón cái chạm cực êm) | **3** (Trung bình — font serif đòi hỏi canh lề kỹ trên di động) |
| 5. **Accessibility (Chuẩn WCAG 2.2 AA)** | 10% | **5** (Vượt trội — tương phản cao, 0 blur, focus ring rõ) | **4** (Tốt — bóng môi trường đòi hỏi quản lý tương phản) | **4** (Rất tốt — mực espresso trên giấy ngà đạt AAA) |
| 6. **Distinctiveness (Tính độc đáo thương hiệu)**| 8% | **4** (Độc đáo — tinh giản chức năng theo Dieter Rams) | **3** (Phổ thông — phong cách fintech tiêu dùng hiện đại) | **5** (Rất độc đáo — thẩm mỹ báo chí kinh tế kinh điển) |
| 7. **Vietnamese-market fit (Độ phù hợp thị trường)**| 8% | **4** (Rất hợp kỹ sư/dân tài chính, hơi khắt khe đại chúng) | **5** (Hoàn hảo cho người trẻ đô thị dùng MoMo/Techcombank) | **3** (Hợp nhóm nhà đầu tư, chủ doanh nghiệp, tri thức) |
| 8. **Long-session productivity (Năng suất phiên dài)**| 8% | **5** (Tuyệt vời — không mỏi mắt khi đối soát số lượng lớn) | **4** (Khá — các mảng màu pastel có thể gây phân tâm nhẹ) | **5** (Tuyệt vời — nền giấy ngà ấm giảm chói sáng ban đêm) |
| 9. **Maintainability (Khả năng bảo trì CSS)** | 8% | **5** (Cực cao — viền 1px, 0 shadow, token không mồ côi) | **3** (Trung bình — đa tầng shadow và gradient ribbon) | **4** (Tốt — hệ thống đường kẻ và divider có quy tắc) |
| 10. **Compatibility with MoneyFlow workflows** | 6% | **5** (Tương thích 100% với Capture, Reconcile, CSV) | **4** (Tương thích tốt, hỗ trợ hiển thị sinh động) | **4** (Tương thích tốt, hợp logic chứng từ ghi chép) |
| 11. **Ability to scale across 40 routes** | 6% | **5** (Quy chuẩn phẳng mở rộng trơn tru sang mọi trang) | **4** (Một số trang cài đặt kỹ thuật khó áp dụng tactile) | **4** (Dễ mở rộng sang trang báo cáo và kiểm toán) |
| 12. **Resistance to visual entropy (Độ bền đẹp)**| 6% | **5** (Trường tồn — Swiss Grid không bị lỗi thời theo năm) | **3** (Có nguy cơ thoái trào khi trào lưu bo cong thay đổi) | **5** (Trường tồn — thẩm mỹ ấn phẩm cổ điển luôn vững bền) |
| **ĐIỂM TRỌNG SỐ TỔNG HỢP** | **100%** | **4.74 / 5.0** | **3.86 / 5.0** | **4.14 / 5.0** |

### Xác minh số học trọng số (Verified Arithmetic):
- **Territory A:** `(5×0.10) + (5×0.10) + (5×0.10) + (4×0.10) + (5×0.10) + (4×0.08) + (4×0.08) + (5×0.08) + (5×0.08) + (5×0.06) + (5×0.06) + (5×0.06)`  
  `= 0.50 + 0.50 + 0.50 + 0.40 + 0.50 + 0.32 + 0.32 + 0.40 + 0.40 + 0.30 + 0.30 + 0.30 = 4.74`
- **Territory B:** `(4×0.10) + (4×0.10) + (3×0.10) + (5×0.10) + (4×0.10) + (3×0.08) + (5×0.08) + (4×0.08) + (3×0.08) + (4×0.06) + (4×0.06) + (3×0.06)`  
  `= 0.40 + 0.40 + 0.30 + 0.50 + 0.40 + 0.24 + 0.40 + 0.32 + 0.24 + 0.24 + 0.24 + 0.18 = 3.86`
- **Territory C:** `(5×0.10) + (4×0.10) + (4×0.10) + (3×0.10) + (4×0.10) + (5×0.08) + (3×0.08) + (5×0.08) + (4×0.08) + (4×0.06) + (4×0.06) + (5×0.06)`  
  `= 0.50 + 0.40 + 0.40 + 0.30 + 0.40 + 0.40 + 0.24 + 0.40 + 0.32 + 0.24 + 0.24 + 0.30 = 4.14`

---

## 2. Phân Tích Chế Độ Thất Bại (Failure Modes Analysis) Từng Định Hướng

*Không lai ghép sớm (No premature hybridization). Đánh giá độc lập từng định hướng theo các rủi ro vận hành thực tế.*

### Territory A: Kỷ Hà Đương Đại (Architectural Precision Ledger)
- **Failure Mode chính:** Nguy cơ khô khan, tạo cảm giác "công cụ kỹ thuật nội bộ" (Over-austerity).
- **Phân tích chi tiết:**
  - Triết lý loại bỏ hoàn toàn bóng đổ và bo góc lớn (chỉ dùng 0–4px) có thể khiến người dùng đại chúng cảm thấy giao diện nghiêm khắc hoặc thiếu sự ấm áp trong các tác vụ thường ngày.
  - Trên màn hình di động hẹp (390px), mật độ dữ liệu dày đặc đòi hỏi kiểm soát khoảng đệm (padding) cực kỳ nghiêm ngặt để đảm bảo chiều cao chạm tối thiểu 44px không bị vi phạm.
  - **Biện pháp giảm thiểu nếu chọn A:** Tối ưu nhịp thở khoảng trống (white space rhythm), sử dụng typography phân cấp rõ ràng để tạo cảm giác trật tự tĩnh lặng thay vì khô cứng.

### Territory B: Dòng Chảy Xanh (Modern Tactile Flow)
- **Failure Mode chính:** Thoái hóa thị giác (Visual Entropy) và hao tổn mật độ thông tin.
- **Phân tích chi tiết:**
  - Bán kính bo cong lớn (16px–20px) kết hợp lớp đổ bóng môi trường đa tầng làm giảm 25–30% diện tích khả dụng trên màn hình so với Territory A.
  - Khi mở rộng ra quy mô 40 route (bao gồm các trang kiểm toán, đối soát, bảng quy tắc danh mục, lịch sử nhập CSV), việc duy trì tính nhất quán của các khối tactile và gradient ribbon sẽ gây phình to mã nguồn CSS, tăng nguy cơ xuất hiện class mồ côi và khó kiểm chứng tự động.
  - **Biện pháp giảm thiểu nếu chọn B:** Khóa cứng hệ thống token bo cong thành 3 nấc cố định (8px, 16px, pill), cấm tùy biến bóng đổ tự do ngoài token.

### Territory C: Bản Ghi Bản Lĩnh (Editorial Craft Ledger)
- **Failure Mode chính:** Rào cản định kiến phong cách cổ điển và suy giảm độ sắc nét font có chân trên di động.
- **Phân tích chi tiết:**
  - Kiểu chữ có chân (`Newsreader` / Serif) hiển thị rất đẹp trên màn hình độ phân giải cao hoặc khổ lớn, nhưng ở kích thước nhỏ (10px–12px) trên thiết bị di động tầm trung, các nét thanh nét đậm có thể bị mờ nhạt hoặc khó đọc nhanh.
  - Tone màu giấy ngà và phong cách báo chí chuyên khảo có thể tạo khoảng cách tâm lý với nhóm người dùng phổ thông thích sự hiện đại, nhanh gọn.
  - **Biện pháp giảm thiểu nếu chọn C:** Giới hạn font Serif cho tiêu đề cấp 1 và tổng số dư lớn; toàn bộ nhãn bảng, dòng giao dịch và form nhập liệu dùng font Sans với tính năng tabular-nums sắc nét.

---

## 3. Khuyến Nghị Chuyên Môn Cho Chủ Dự Án (Owner Selection Recommendation)

> **QUYỀN QUYẾT ĐỊNH CUỐI CÙNG THUỘC VỀ CHỦ DỰ ÁN (OWNER).**

### Khuyến nghị kỹ thuật & sản phẩm: Lựa chọn **TERRITORY A (KỶ HÀ ĐƯƠNG ĐẠI)**

**Lý do cốt lõi:**
1. **Phù hợp nhất với bản chất sản phẩm MoneyFlow:** MoneyFlow là một cuốn sổ cái tài chính trung thực, bảo vệ sự thật số liệu (Product Truth) và ngăn chặn việc tự bù đắp sai lệch. Phong cách Kỷ Hà Đương Đại tôn vinh giá trị này tốt nhất: số liệu là trung tâm, đường kẻ kỹ thuật rõ ràng, không có bóng mờ che khuất thông tin.
2. **Năng lực mở rộng an toàn nhất qua 40 routes:** Cấu trúc lưới phẳng (Flat Architectural Grid) với viền 1px hairline là giải pháp duy nhất đảm bảo không phát sinh xung đột CSS, không vỡ layout khi mở rộng sang các tính năng đối soát sâu, nhập liệu hàng loạt hoặc trang quản trị dữ liệu phức tạp.
3. **Bảo vệ chuẩn kiểm chứng tự động:** Territory A cho phép các bộ kiểm tra tự động (`npm run quality`) hoạt động với độ tin cậy cao nhất, không bị sai lệch bởi các lớp render bóng đổ phức tạp của trình duyệt.

*Nếu Chủ dự án ưu tiên cảm xúc chạm êm ái cho người dùng trẻ đô thị, Territory B là lựa chọn số hai. Nếu Chủ dự án hướng tới chiều sâu học thuật và cảm giác sổ cái gia đình trường tồn, Territory C là lựa chọn độc đáo.*ể tránh vỡ nét.
  - Có thể tạo khoảng cách tâm lý với đối tượng người dùng học sinh/sinh viên rất trẻ.

---

## 3. Khuyến Nghị Chuyên Môn (Design Recommendation)

> **LƯU Ý:** Đây là khuyến nghị kỹ thuật và trải nghiệm người dùng từ vai trò Kiến trúc sư Thiết kế. **Quyền lựa chọn định hướng cuối cùng thuộc về Chủ dự án (Owner).**

### Đề xuất: Chọn **TERRITORY A (KỶ HÀ ĐƯƠNG ĐẠI)** làm Nền tảng Cốt lõi, kết hợp 2 yếu tố tinh hoa từ Territory B và C:

1. **Lấy Trục xương sống là Territory A (80%):**
   - Giữ trọn vẹn triết lý Swiss Grid, font số `JetBrains Mono` thẳng hàng tuyệt đối, viền hairline 1px sắc sảo, và mật độ thông tin cao. Đây là yếu tố sống còn giúp MoneyFlow giải quyết triệt để bài toán hiển thị 40 route ứng dụng mà không bao giờ bị rối loạn CSS.
2. **Mượn "Dải ruy-băng Dòng tiền" (Cashflow Ribbon) từ Territory B (10%):**
   - Đưa thanh hiển thị tỷ lệ dòng tiền trực quan vào thẻ Tổng quan của Today Screen để người dùng nắm bắt cấu trúc thu/chi trong 1 giây mà không làm tăng độ phức tạp giao diện.
3. **Mượn "Đường kẻ đôi kế toán" (Accounting Double Rule) & Tone giấy ngà êm dịu từ Territory C (10%):**
   - Sử dụng đường kẻ đôi tinh tế cho các dòng chốt số dư và đối soát tài khoản; cho phép tùy chọn theme "Ấm áp / Giấy ngà" trong Cài đặt giao diện để người dùng có thể đọc sổ sách phiên dài mà không mỏi mắt.
