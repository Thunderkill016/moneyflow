# Territory B: Dòng Chảy Xanh (Modern Tactile Flow)

**Cảm hứng thiết kế:** Bề mặt sứ xúc giác (Tactile Porcelain Surfaces), trực quan hóa dòng tiền liên tục, sự ấm áp và hiện đại của lối sống đô thị Việt Nam.  
**Đối tượng hướng tới:** Chuyên viên trẻ, gia đình hiện đại, những người coi quản lý tài chính là thói quen tích cực, ưu tiên giao diện êm dịu cho mắt và giảm tải nhận thức khi theo dõi dòng tiền hàng ngày.

---

## 1. Triết lý Thiết kế (Design Philosophy)

Quản lý tiền bạc nên mang lại cảm giác rõ ràng, nhẹ nhõm và kiểm soát tốt:
- **Tiền là một Dòng chảy (Cash as Flow):** Tiền lương vào, chi tiêu ra, và khoản tích lũy còn lại giống như dòng nước luân chuyển trong hồ chứa. Territory B trực quan hóa tỷ lệ dòng tiền thông qua **"Dải ruy-băng dòng tiền" (Cashflow Ribbon)** giúp người dùng nắm bắt cấu trúc tài chính trong một ánh nhìn.
- **Bề mặt Xúc giác Dịu êm (Tactile Porcelain Surfaces):** Sử dụng các tấm thẻ bo cong mềm mại (16px - 20px) với lớp bóng mờ môi trường đa tầng (`box-shadow: 0 4px 20px -2px rgba(14, 165, 233, 0.08)`). Cảm giác bấm chạm trên màn hình điện thoại êm ái, thân thiện.
- **Sắc màu Tràn đầy Năng lượng Lạc quan:** Giữ sắc xanh da trời (Sky Blue `#0284C7`) biểu trưng của thương hiệu MoneyFlow v2 làm tông chủ đạo, kết hợp màu xanh bạc hà (Mint `#10B981`) cho thu nhập và hồng san hô (Coral `#F43F5E`) cho chi tiêu.
- **Giữ trọn Ranh giới Sự thật Tài chính:** Dù giao diện mềm mại và giàu cảm xúc, Territory B **tuyệt đối không dùng glassmorphism lòe loẹt**, không dùng gradient che khuất số liệu, và không bao giờ thỏa hiệp độ tương phản chuẩn WCAG 2.2 AA.

---

## 2. Quy chuẩn Hệ thống (System Standards)

### A. Kiểu chữ & Số học (Typography & Numerals)
- **Tiêu đề & Nhãn thương hiệu:** `Plus Jakarta Sans` / `Inter Display` (Font-weight 700/800, bo tròn nhẹ góc ký tự, tạo cảm giác thân thiện, dễ gần nhưng vững chãi).
- **Thân văn bản & Ghi chú:** `Inter` (14px - 15px, Regular/Medium, line-height `1.55`).
- **Con số tài chính:** `Plus Jakarta Sans` với tính năng `tabular-nums` được kích hoạt, cỡ chữ lớn trên các thẻ số dư để người dùng nắm bắt tình trạng tiền ngay trong 1 giây đầu tiên.

### B. Bảng màu & Ranh giới Ngữ nghĩa (Palette & Color Roles)
- **Nền tổng thể (Canvas):** Sương sớm êm dịu `#F0F4F8` (Dark: `#0B132B`).
- **Bề mặt thẻ (Surface):** Sứ trắng tinh khiết `#FFFFFF` (Dark: `#1C2541`).
- **Thương hiệu chủ đạo:** Sky Blue `#0284C7` (Dark: `#38BDF8`).
- **Dòng tiền vào (+):** Mint Green `#10B981` (kèm dải gradient nhẹ `linear-gradient(90deg, #10B981, #34D399)`).
- **Dòng tiền ra (−):** Coral Rose `#F43F5E` (kèm dải gradient nhẹ `linear-gradient(90deg, #F43F5E, #FB7185)`).
- **Chuyển khoản (↔):** Ocean Blue `#0EA5E9`.
- **Cảnh báo:** Sunny Amber `#F59E0B`.

### C. Hình học & Tiêu chuẩn Chạm (Geometry & Touch Ergonomics)
- **Bo góc (Radii):** `12px` cho inputs, `16px` cho card thông thường, `20px` cho hero surface và modal dialogs, `9999px` (Pill shape) cho status badges.
- **Độ nổi (Elevation):** Bóng đổ nhẹ tán quang: `box-shadow: 0 4px 20px -2px rgba(14, 165, 233, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)`.
- **Target Size trên Mobile:** Nút FAB ghi tiền đạt `56×56px` dạng hình tròn/bo mềm ở giữa thanh bottom bar, mọi nút danh mục và dòng giao dịch có chiều cao chạm tối thiểu `48px`, vượt trên chuẩn sàn 44px của MoneyFlow.

---

## 3. Trải nghiệm 6 Màn hình Chuẩn (Canonical Workflows Expression)

1. **Today / Dashboard:**
   - **Hero Ribbon Card:** Thẻ lớn hiển thị Tổng tài sản khả dụng `114.040.000 ₫`. Bên dưới là thanh Cashflow Ribbon phân chia tỷ lệ: 46.5M tiền vào (xanh mint) vs 15.28M tiền ra (hồng san hô) vs 31.22M tiền thặng dư tích lũy.
   - Thẻ Attention dịu dàng nhưng rõ ràng: Khối bo mềm màu hổ phách ấm áp cảnh báo lệch Techcombank 400k.
   - 4 tài khoản thể hiện dạng các "viên sỏi thẻ" (Pebble Cards) với logo ngân hàng và trạng thái kết nối trực quan.
2. **Activity / Transactions:**
   - Các dòng giao dịch được bọc trong các ô bo góc mềm mại, icon danh mục đặt trong vòng tròn màu pastel nhẹ nhàng (Ăn uống: cam pastel; Di chuyển: xanh lam pastel; Lương: xanh ngọc pastel).
   - Cột số tiền to rõ, phân tách rõ `+` và `−`.
3. **Accounts & Reconciliation:**
   - Thẻ Techcombank mở rộng hiển thị đầy đủ 3 chỉ số theo hợp đồng MoneyFlow: Số dư sao kê ngân hàng (32.850.000 ₫), Số dư đã khớp trên sổ (32.450.000 ₫) và Chênh lệch còn lại (+400.000 ₫).
   - **Nguyên tắc bất biến:** Đối soát không thay đổi số dư hoặc tự ý tạo bút toán bù đắp. Nút "Hoàn tất đối soát" bị khóa (disabled) cho tới khi chênh lệch được đối chiếu về 0 ₫. Người dùng click để khớp giao dịch Napas +400k để chốt phiên đối soát.
4. **Plan:**
   - Ngân sách hiển thị dạng các thanh đo thanh mảnh có bo góc tròn mềm mại. Ngân sách Mua sắm (97.5%) chuyển sang sắc hồng cam cảnh báo trước khi vượt ngưỡng.
   - Thẻ Quỹ khẩn cấp có tiến độ 65.4% với hình học bảo vệ tài chính.
5. **Capture:**
   - Trải nghiệm nhập liệu numpad lớn dạng phím sứ, phản hồi chuyển động nảy nhẹ (spring transition 200ms). Hỗ trợ ghi tay, dán nội dung văn bản (Paste), và nhập file CSV/XLSX.
6. **Settings / Data Governance:**
   - Bố cục cài đặt dạng iOS/macOS Settings với các nhóm card bo góc tách biệt, switch toggle tròn mượt mà, hỗ trợ xuất dữ liệu chính quy CSV và sao lưu JSON.
