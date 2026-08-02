# MoneyFlow — AI-assisted UI/UX workflow

## Trạng thái định hướng bắt buộc

Trước mọi công việc UI/UX, đọc `docs/design/DESIGN_DIRECTION_STATUS.md`.

- Nghiên cứu UI/UX của MoneyFlow là tích lũy.
- Các concept thiết kế chỉ là giả thuyết tạm thời.
- `Signal Ledger v3` đã bị owner loại bỏ và không được dùng làm baseline, visual system hoặc giới hạn sáng tạo.
- Không concept có tên nào trở thành mặc định chỉ vì đã từng được viết tài liệu hoặc triển khai.
- Chỉ owner mới có quyền kích hoạt lại hoặc chọn một định hướng thiết kế làm hướng hiện hành.

Đối với brand color, landing hoặc authentication, phải đọc thêm `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` trước khi tạo wireframe, palette hoặc code. Tài liệu này quy định quy trình và bằng chứng; nó không tự chọn một palette hay layout cuối cùng.

## Mục tiêu

Dùng AI để tăng tốc khám phá và lặp thiết kế, không dùng AI như máy tạo giao diện ngẫu nhiên hoặc máy lặp lại concept cũ.

MoneyFlow chỉ nhận một thay đổi UI khi thay đổi đó:

1. giải quyết một câu hỏi thật của người dùng;
2. dựa trên hành vi sản phẩm và dữ liệu thật;
3. hoạt động trên điện thoại trước;
4. không đưa ra lời khuyên tài chính thiếu cơ sở;
5. có ảnh và kiểm tra responsive làm bằng chứng;
6. không bị khóa bởi một thẩm mỹ đã bị bác bỏ.

## Những workflow đã tham khảo

### Figma Make / Figma AI

Figma khuyến khích đưa thiết kế hiện có, thư viện style, ảnh hoặc code vào làm context; sau đó dùng hội thoại, point-and-edit và chỉnh code để lặp trên một prototype đang chạy.

Nguồn:

- https://help.figma.com/hc/en-us/articles/31304485164695-Create-and-edit-a-functional-prototype-or-web-app
- https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI
- https://help.figma.com/hc/en-us/articles/40219873508247-Release-notes-roundup-May-2026

Bài học áp dụng: đưa code, dữ liệu, constraint và hành vi hiện tại cho AI; không coi style hoặc concept hiện tại là bất biến.

### Google Stitch

Stitch đề xuất bắt đầu bằng mục tiêu kinh doanh, cảm giác mong muốn và ví dụ truyền cảm hứng; tạo nhiều phương án trên canvas, nối thành prototype, rồi hội tụ vào phương án tốt nhất.

Nguồn:

- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/

Bài học áp dụng: divergence trước, convergence sau. AI phải tạo nhiều hướng thực sự khác nhau, không chỉ đổi màu cùng một layout.

### Relume

Relume dùng chuỗi brief → sitemap → wireframe → style guide → tinh chỉnh. Công cụ tự mô tả AI là đồng minh thiết kế, không phải người thay thế designer.

Nguồn:

- https://resources.relume.io/resources/docs/building-a-sitemap-with-ai
- https://resources.relume.io/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder
- https://www.relume.io/resources/docs/concept-creation-using-the-relume-style-guide-builder

Bài học áp dụng: chốt cấu trúc và nội dung trước màu sắc; style guide chỉ xuất hiện sau khi flow đã hợp lý.

### v0

v0 nhận prompt, screenshot, mockup và Figma; sau đó lặp trong Design Mode. v0 cũng nhấn mạnh đưa design tokens và component registry vào model để output nhất quán.

Nguồn:

- https://v0.dev/docs/introduction
- https://v0.dev/docs/design-systems
- https://v0.dev/docs/faqs

Bài học áp dụng: dùng component và token thật để kiểm chứng khả năng triển khai, nhưng không để token hiện tại ngăn việc đề xuất một hệ thống mới khi brief yêu cầu.

## Workflow chuẩn của MoneyFlow

### 1. Xác định câu hỏi thiết kế

Mỗi batch phải viết rõ:

- người dùng đang cố làm gì;
- quyết định quan trọng nhất trên màn hình;
- hành động chính;
- dữ liệu nào đáng tin;
- dữ liệu hoặc lời khuyên nào chưa được phép hiển thị;
- trạng thái mobile, loading, empty, error và dữ liệu dài.

### 2. Đọc nghiên cứu tích lũy

Đọc research ledger trung lập và phân loại:

- điểm chung đáng học;
- điểm phù hợp riêng với MoneyFlow;
- điểm không nên sao chép;
- mâu thuẫn giữa các nguồn;
- quyết định cũ đã bị thay thế;
- khoảng trống cần nghiên cứu thêm.

Không được chỉ đọc tài liệu của concept gần nhất rồi xem nó là toàn bộ nghiên cứu.

Đối với brand color, landing và authentication, phải đối chiếu thêm `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` và ghi rõ phần nào được dùng, phần nào không áp dụng.

### 3. Audit sản phẩm hiện tại

Thu thập:

- screenshot điện thoại, tablet và desktop;
- hierarchy hiện tại;
- CTA bị lặp;
- nội dung không giúp quyết định;
- component và token đang dùng;
- lỗi responsive/a11y từ Playwright;
- hành vi thật đang hoạt động và các constraint kỹ thuật.

### 4. Wireframe trước visual polish đối với public experience

Landing, login, registration và recovery không được bắt đầu bằng màu, shadow, gradient hoặc high-fidelity code.

Bắt buộc thực hiện theo thứ tự:

1. product truth và claim boundary;
2. mục tiêu trang và success event;
3. content inventory với copy tiếng Việt thật;
4. user flow gồm cả đường lỗi và recovery;
5. tối thiểu ba low-fidelity wireframe khác nhau về hierarchy hoặc flow;
6. mobile 320/390px và desktop cho mỗi hướng;
7. annotated mid-fidelity wireframe;
8. state matrix;
9. accessibility và auth-security review;
10. owner chọn cấu trúc;
11. sau đó mới áp dụng palette, typography, imagery và motion.

Auth phải được wireframe như một family gồm login, registration, forgot/reset password, email confirmation, OAuth callback, CAPTCHA, generic failure, rate limit/session expiry và intended-route recovery. Không được chỉ thiết kế một màn hình login mặc định.

### 5. Tạo nhiều hướng độc lập

AI phải tạo tối thiểu ba hướng có rationale và trade-off thực sự khác nhau.

Mỗi hướng phải mô tả:

- mô hình thông tin;
- interaction chính;
- cảm giác và ngôn ngữ hình ảnh;
- điểm mạnh;
- rủi ro;
- điều kiện khiến hướng đó không phù hợp.

Không dùng `Signal Ledger`, `Calm Ledger` hoặc một concept cũ làm hướng mặc định. Có thể nghiên cứu lại một ý tưởng cũ chỉ khi nó được trình bày như một phương án ngang hàng và không mang quyền ưu tiên.

Đối với palette, các hướng phải được áp dụng vào cùng một tập màn hình đại diện. Không được gọi ba sắc độ hoặc ba biến thể của cùng một màu là ba hướng độc lập.

### 6. Chọn bằng tiêu chí, không chọn bằng thói quen

| Tiêu chí | Trọng số gợi ý |
|---|---:|
| Trả lời quyết định chính trong 3 giây | 30% |
| Mobile và dữ liệu dài | 25% |
| Trung thực tài chính | 20% |
| Khả năng triển khai và bảo trì | 15% |
| Accessibility | 10% |

Owner chọn hướng hoặc yêu cầu lặp thêm. Các hướng không được chọn phải được ghi là rejected/historical, không trở thành constraint ngầm cho vòng sau.

### 7. Chốt hệ thống sau khi chọn hướng

Chỉ sau khi owner chọn hướng mới chốt:

- semantic tokens;
- typography;
- spacing;
- radius, border và elevation;
- component composition;
- light/dark behavior;
- motion rules.

Một primary action trên mỗi viewport; tiền dùng tabular numerals; trạng thái không phân biệt chỉ bằng màu.

Brand color là quyết định cấp dự án, không phải quyết định riêng của landing hoặc auth. Một màn hình không được tạo palette brand cục bộ. Green, red, amber và transfer/info phải giữ khoảng trống cho ý nghĩa tài chính; raw color chỉ được đưa vào theme authority sau khi owner chọn palette.

### 8. Triển khai theo vertical slice

Mỗi slice phải chạy trong production code; không tạo prototype rời rồi bỏ đó. Scope và thứ tự được xác định trong active work packet, không bị khóa bởi một concept cũ.

Đối với thay đổi palette toàn dự án, packet phải có token migration map, danh sách local hex cần loại bỏ, light/dark pairs, semantic/chart roles và rollback plan.

### 9. Verification loop

Mỗi PR UI/UX cần:

- lint, typecheck, unit và build;
- Playwright trên 320, 360, 390, 768, 1024, 1366 và 1440px;
- WebKit critical paths;
- light và dark mode khi sản phẩm hỗ trợ;
- 200% text;
- keyboard focus;
- screenshot và JSON evidence;
- kiểm tra thiết bị thật trước khi tuyên bố mobile-ready;
- owner visual review trước merge.

Palette hoặc semantic-color changes cần thêm:

- đo contrast trên effective composited background;
- mô phỏng deuteranopia, protanopia và tritanopia;
- kiểm tra rằng income, expense, transfer và warning vẫn hiểu được khi bỏ màu;
- kiểm tra chart legends/direct labels và adjacent-series distinction.

## Quy tắc lưu trữ

- Research evidence đi vào research ledger trung lập hoặc task-specific research document được ledger/workflow tham chiếu.
- Quyết định đang hiệu lực đi vào design decision/status document.
- Concept bị loại phải được đánh dấu rõ là rejected hoặc superseded.
- Không để quyết định quan trọng chỉ tồn tại trong chat.
- Wireframe, palette study và owner decision phải được lưu trong work packet hoặc PR; screenshot không có rationale không phải durable design memory.