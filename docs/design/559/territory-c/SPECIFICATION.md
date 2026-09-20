# Territory C: Bản Ghi Bản Lĩnh (Editorial Craft Ledger)

**Cảm hứng thiết kế:** Báo chí kinh tế uy tín thế giới (Financial Times, The Economist, Wall Street Journal), Sổ cái kế toán bọc da kinh điển, Nghệ thuật in ấn chữ kim loại (Editorial Typography & Craft Ledger).  
**Đối tượng hướng tới:** Các nhà đầu tư cá nhân, chủ doanh nghiệp, người trưởng thành coi trọng tính di sản, lịch sử tài chính gia đình, muốn một không gian tĩnh lặng, đĩnh đạc, sâu sắc và tôn vinh tính trường tồn của đồng tiền.

---

## 1. Triết lý Thiết kế (Design Philosophy)

Tiền bạc là thành quả lao động, là bản lĩnh và là câu chuyện cuộc đời của mỗi con người. Nó xứng đáng được ghi chép trên một "trang sách" trang trọng thay vì một màn hình app di động bóng bẩy lướt qua.
- **Tính Trang Trọng của Sổ Sách (The Archival Dignity):** Territory C tạo cảm giác như bạn đang mở cuốn sổ cái tài chính bằng giấy ngà cao cấp (Warm Ivory Paper `#FAF7F2`) với mực in Espresso đen thẫm (`#1C1917`).
- **Đường kẻ Đôi Kế toán Kinh điển (The Accounting Double Rule):** Trong nghiệp vụ kế toán truyền thống, đường gạch đôi bên dưới số dư (`border-bottom: 3px double #A8A29E`) biểu thị sự đối soát đã hoàn tất và cân đối tuyệt đối. Territory C đưa biểu tượng thiêng liêng này vào giao diện để mang lại sự tin cậy vững chãi.
- **Nghệ thuật Kiểu chữ Chuyên khảo (Editorial Typography):** Kết hợp font có chân thanh nhã (`Newsreader` / `Merriweather` / `Lora`) cho tiêu đề và các con số tài sản lớn với font không chân (`Inter`) cho nội dung chi tiết. Sự tương phản này tạo nên vẻ đẹp học thức và chiều sâu phân tích vượt trội.
- **Tĩnh lặng và Điềm đạm:** Loại bỏ các màu neon rực rỡ. Dùng màu xanh rừng thông trầm (Deep Forest Green `#15803D`) cho thu nhập, màu đỏ rượu vang sẫm (Deep Burgundy Wine `#B91C1C`) cho chi tiêu, và màu đồng thau ấm (Warm Bronze `#B45309`) cho chuyển khoản.

---

## 2. Quy chuẩn Hệ thống (System Standards)

### A. Kiểu chữ & Chữ số (Typography & Numerals)
- **Tiêu đề lớn & Tổng số dư:** `Newsreader` / `Merriweather` (Font-weight 600/700, Serif cổ điển sang trọng, italics duyên dáng cho nhãn kỳ kế toán).
- **Thân văn bản & Mô tả giao dịch:** `Inter` (13.5px - 14.5px, line-height `1.50`, sắc nét, dễ đọc trên cả màn hình nhỏ).
- **Con số tài chính:** Serif Oldstyle Lining kết hợp Tabular numbers. Dấu phẩy hoặc chấm phân cách hàng nghìn được căn chỉnh tỉ mỉ như một trang tạp chí in nổi tiếng.

### B. Bảng màu & Ranh giới Ngữ nghĩa (Palette & Color Roles)
- **Nền tổng thể (Canvas):** Giấy ngà ấm `#FAF7F2` (Dark: `#191816`).
- **Bề mặt thẻ (Surface):** Giấy bông trắng ép thủ công `#FFFFFF` (Dark: `#23211E`).
- **Màu văn bản chính (Text):** Mực in Espresso đen sâu `#1C1917` (Dark: `#F5F5F4`).
- **Màu văn bản phụ:** Mực xám ấm `#78716C` (Dark: `#A8A29E`).
- **Đường phân cách (Dividers):** Đường chỉ sepia `1px solid #E7E5E4` và **Đường kẻ đôi kế toán** `3px double #D6D3D1`.
- **Dòng tiền vào (+):** Xanh rừng thông trầm `#15803D` (Dark: `#4ADE80`).
- **Dòng tiền ra (−):** Đỏ vang sẫm `#B91C1C` (Dark: `#F87171`).
- **Chuyển khoản (↔):** Vàng đồng nung ấm `#B45309` (Dark: `#FBBF24`).

### C. Hình học & Tiêu chuẩn Chạm (Geometry & Touch Ergonomics)
- **Bo góc (Radii):** Tinh gọn `4px` - `6px`, giữ cảm giác các trang giấy cắt gọt phẳng phiu.
- **Độ nổi (Elevation):** Hoàn toàn phẳng hoặc đổ bóng mực cực nhẹ: `0 1px 3px rgba(28, 25, 23, 0.04)`. Ranh giới chủ yếu phân định bằng các đường kẻ chỉ thanh nhã.
- **Target Size trên Mobile:** Các nút điều khiển có chiều cao tối thiểu 44px, nút chạm chính có viền chỉ đậm trang trọng.

---

## 3. Trải nghiệm 6 Màn hình Chuẩn (Canonical Workflows Expression)

1. **Today / Dashboard:**
   - Thẻ Tổng tài sản bố cục như trang nhất tờ Financial Times: Dòng chữ lớn `114.040.000 ₫` gạch dưới bằng đường kẻ đôi kế toán (`3px double`).
   - Cảnh báo lệch đối soát Techcombank đóng khung viền chỉ đồng thau ấm trang trọng.
   - Danh sách 4 tài khoản dàn trang như bảng cân đối kế toán chuyên nghiệp.
2. **Activity / Transactions:**
   - Các giao dịch phân cách bằng các đường chỉ sepia mảnh `1px solid #E7E5E4`, số tiền in mực đỏ rượu hoặc xanh thông.
   - Nhãn danh mục in chữ hoa nhỏ có chân sắc nét.
3. **Accounts & Reconciliation:**
   - Bản đối chiếu tài chính hiển thị rõ 3 chỉ số chuẩn của MoneyFlow: Số dư sao kê ngân hàng (32.850.000 ₫), Số dư đã khớp trên sổ (32.450.000 ₫), và Chênh lệch còn lại (+400.000 ₫).
   - **Bảo vệ bất biến sản phẩm:** Loại bỏ hoàn toàn các khái niệm "ký duyệt", "con dấu điện tử", hoặc tự sinh bút toán bù trừ ngoài đời thực. Đối soát không thay đổi số dư hoặc tự tạo khoản chênh lệch. Nút "Hoàn tất đối soát" bị vô hiệu hóa hoàn toàn khi chênh lệch khác 0 ₫. Người dùng đối chiếu và click khớp giao dịch Napas +400k để đưa chênh lệch về 0 ₫ và kích hoạt quyền hoàn tất.
4. **Plan:**
   - Ngân sách và cam kết hóa đơn trình bày dạng báo cáo thẩm định kỳ hạn.
   - Mục tiêu Quỹ khẩn cấp có thanh tiến độ vạch kẻ vạch thanh nhã.
5. **Capture:**
   - Biểu mẫu ghi nhận giao dịch trang nhã phong cách bản in, phân định rõ 3 luồng: Ghi tay nhanh, Dán nội dung văn bản (Paste), và Nhập file CSV/XLSX.
6. **Settings / Data Governance:**
   - Bố cục trang giấy trang trọng với tính năng ẩn số dư bảo vệ riêng tư, sao lưu an toàn định dạng JSON và xuất dữ liệu mở định dạng CSV chính quy của MoneyFlow. Không áp đặt các định dạng ngoài phạm vi như PDF hay chứng từ doanh nghiệp.
