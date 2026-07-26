# MoneyFlow — AI-assisted UI/UX workflow

## Mục tiêu

Dùng AI để tăng tốc khám phá và lặp thiết kế, không dùng AI như một máy tạo giao diện ngẫu nhiên.

MoneyFlow chỉ nhận một thay đổi UI khi thay đổi đó:

1. giải quyết một câu hỏi thật của người dùng;
2. tái sử dụng design system;
3. hoạt động trên điện thoại trước;
4. không đưa ra lời khuyên tài chính thiếu cơ sở;
5. có ảnh và kiểm tra responsive làm bằng chứng.

## Những workflow đã tham khảo

### Figma Make / Figma AI

Figma khuyến khích đưa thiết kế hiện có, thư viện style, ảnh hoặc code vào làm context; sau đó dùng hội thoại, point-and-edit và chỉnh code để lặp trên một prototype đang chạy.

Nguồn:

- https://help.figma.com/hc/en-us/articles/31304485164695-Create-and-edit-a-functional-prototype-or-web-app
- https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI
- https://help.figma.com/hc/en-us/articles/40219873508247-Release-notes-roundup-May-2026

Bài học áp dụng: luôn đưa code, token và constraint hiện tại cho AI; không prompt từ trang trắng rồi chép kết quả vào sản phẩm.

### Google Stitch

Stitch đề xuất bắt đầu bằng mục tiêu kinh doanh, cảm giác mong muốn và ví dụ truyền cảm hứng; tạo nhiều phương án trên canvas, nối thành prototype, rồi hội tụ vào phương án tốt nhất.

Nguồn:

- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/

Bài học áp dụng: divergence trước, convergence sau. AI phải tạo nhiều hướng có chủ đích, không chỉ một mockup nhìn bắt mắt.

### Relume

Relume dùng chuỗi brief → sitemap → wireframe → style guide → tinh chỉnh. Công cụ tự mô tả AI là đồng minh thiết kế, không phải người thay thế designer.

Nguồn:

- https://resources.relume.io/resources/docs/building-a-sitemap-with-ai
- https://resources.relume.io/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder
- https://www.relume.io/resources/docs/concept-creation-using-the-relume-style-guide-builder

Bài học áp dụng: chốt cấu trúc và nội dung trước màu sắc; style guide được áp dụng sau khi flow đã hợp lý.

### v0

v0 nhận prompt, screenshot, mockup và Figma; sau đó lặp trong Design Mode. v0 cũng nhấn mạnh đưa design tokens và component registry vào model để output nhất quán.

Nguồn:

- https://v0.dev/docs/introduction
- https://v0.dev/docs/design-systems
- https://v0.dev/docs/faqs

Bài học áp dụng: AI chỉ được sinh trong giới hạn component và token thật của MoneyFlow.

## Workflow chuẩn của MoneyFlow

### 1. Brief sản phẩm

Mỗi batch phải viết rõ:

- người dùng đang cố làm gì;
- quyết định quan trọng nhất trên màn hình;
- hành động chính;
- dữ liệu nào đáng tin;
- dữ liệu hoặc lời khuyên nào chưa được phép hiển thị;
- trạng thái mobile, loading, empty, error và dữ liệu dài.

### 2. Audit màn hình hiện tại

Thu thập:

- screenshot điện thoại, tablet và desktop;
- hierarchy hiện tại;
- CTA bị lặp;
- nội dung không giúp quyết định;
- component và token đang dùng;
- lỗi responsive/a11y từ Playwright.

### 3. Tạo ba hướng

AI phải tạo tối thiểu ba hướng có tên và trade-off.

#### Hướng A — Calm Ledger

- số liệu chính rõ ràng;
- neutral surface chiếm đa số;
- green chỉ dành cho brand, hành động và trạng thái tích cực;
- mật độ vừa phải;
- không gamification.

#### Hướng B — Analytics Desk

- nhiều chart và KPI hơn;
- phù hợp power user;
- mật độ cao, khó dùng hơn trên điện thoại.

#### Hướng C — Daily Coach

- copy hướng dẫn và nhắc nhở mạnh;
- dễ tạo cảm giác bị phán xét hoặc lo lắng;
- có nguy cơ đưa lời khuyên vượt quá dữ liệu.

### 4. Chọn bằng tiêu chí

| Tiêu chí | Trọng số |
|---|---:|
| Trả lời quyết định chính trong 3 giây | 30% |
| Mobile và dữ liệu dài | 25% |
| Trung thực tài chính | 20% |
| Nhất quán design system | 15% |
| Dễ bảo trì | 10% |

Hướng A — Calm Ledger được chọn cho MoneyFlow.

### 5. Khóa hệ thống trước khi polish

- semantic tokens thay vì màu hard-code rải rác;
- một primary action trên mỗi viewport;
- card dùng chung radius, border và elevation;
- tiền dùng tabular numerals;
- trạng thái không phân biệt chỉ bằng màu;
- spacing theo nhịp 4px;
- dark mode là một hệ thống, không đảo màu tự động.

### 6. Triển khai theo vertical slice

Thứ tự:

1. Tổng quan;
2. Ghi giao dịch;
3. Giao dịch;
4. Ngân sách và khoản định kỳ;
5. Báo cáo;
6. trang nâng cao.

Mỗi slice phải chạy được trong production code; không tạo prototype rời rồi bỏ đó.

### 7. Verification loop

Mỗi PR cần:

- lint, typecheck, unit và build;
- Playwright trên 320, 360, 390, 768, 1024, 1366 và 1440px;
- WebKit critical paths;
- dark mode;
- 200% text;
- keyboard focus;
- screenshot và JSON evidence;
- kiểm tra thiết bị thật trước khi tuyên bố mobile-ready.

## Batch hiện tại — Tổng quan Calm Ledger

### Quyết định chính

Người dùng cần hiểu nhanh:

1. tổng số dư hiện tại;
2. tháng này thu, chi và ròng ra sao;
3. có việc gì cần chú ý;
4. ghi khoản mới ở đâu;
5. đi tới kế hoạch hoặc chi tiết nào tiếp theo.

### Constraint an toàn

Không phục hồi card “Có thể chi hôm nay”. MoneyFlow hiện chưa có mô hình kế hoạch thu nhập hoặc next-payday đủ tin cậy để biến số dư thành lời khuyên chi tiêu hằng ngày.

### Thay đổi hình ảnh

- biến bốn KPI thành một cụm hierarchy: số dư là primary, thu/chi/ròng là context;
- giảm shadow và decoration;
- làm attention strip dễ quét nhưng không gây hoảng;
- gom planning links thành một action rail nhất quán;
- chỉ giữ một CTA chính trên từng viewport;
- tối ưu first viewport cho điện thoại;
- giữ nguyên business logic và dữ liệu tài chính.
