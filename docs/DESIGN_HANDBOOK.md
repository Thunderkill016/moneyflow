# MoneyFlow Design Handbook

Tài liệu này là bản đồ thực hành cho mọi công việc thương hiệu, logo, UX, UI, nội dung và design system của MoneyFlow.

Nó không thay thế các nguồn chuyên biệt:

- Product truth và luật tài chính: [`product/PRINCIPLES.md`](./product/PRINCIPLES.md)
- Visual/interaction contract hiện hành: [`design/CALM_LEDGER_V2.md`](./design/CALM_LEDGER_V2.md)
- Token và component specification: [`design-system.md`](./design-system.md)
- UX law và pattern chi tiết: [`UX_PRINCIPLES.md`](./UX_PRINCIPLES.md)
- Quy trình UI với AI/Codex: [`AI_UIUX_WORKFLOW.md`](./AI_UIUX_WORKFLOW.md)
- Quy trình delivery chung: [`engineering/AI_DELIVERY_WORKFLOW.md`](./engineering/AI_DELIVERY_WORKFLOW.md)

Khi có xung đột, nguồn chuyên biệt và mới hơn được ưu tiên.

---

## 1. Thiết kế là gì?

Thiết kế không phải làm cho một thứ trông đẹp hơn. Thiết kế là đưa ra quyết định có chủ đích để giải quyết một vấn đề thật trong những ràng buộc thật.

Một thiết kế hoàn chỉnh phải trả lời được:

1. Ai đang gặp vấn đề?
2. Họ đang cố hoàn thành việc gì?
3. Điều gì đang cản trở họ?
4. Kết quả nào quan trọng nhất?
5. Điều gì không được phép xảy ra?
6. Bằng chứng nào chứng minh giải pháp hoạt động?

Chất lượng thiết kế được đánh giá đồng thời trên bốn lớp:

| Lớp | Câu hỏi |
|---|---|
| Utility | Có giải quyết đúng việc không? |
| Usability | Có dễ hiểu và dễ dùng không? |
| Desirability | Có tạo cảm giác phù hợp và đáng tin không? |
| Feasibility | Có thể triển khai, kiểm tra và duy trì không? |

Một giao diện đẹp nhưng sai dữ liệu, khó dùng hoặc không thể bảo trì vẫn là thiết kế thất bại.

---

## 2. Product truth trước visual direction

MoneyFlow là sổ thu chi cá nhân manual-first cho người Việt.

Core jobs:

1. Ghi thu, chi hoặc chuyển tiền nhanh.
2. Biết số dư trên các tài khoản đang dùng.
3. Hiểu dòng tiền và tiền đã đi đâu trong kỳ.
4. Sửa sai và xuất dữ liệu đáng tin.

MoneyFlow không phải:

- ngân hàng hoặc bank aggregator;
- ứng dụng đầu tư hay crypto;
- cố vấn tài chính tự động;
- phần mềm kế toán doanh nghiệp;
- trò chơi tài chính;
- công cụ hứa hẹn làm giàu.

Mọi thiết kế phải bảo vệ các nguyên tắc sau:

- Không đoán dữ liệu tài chính còn thiếu.
- Không biến tổng tài sản thành số tiền nên tiêu.
- Chuyển tiền nội bộ không phải thu hoặc chi.
- VND được lưu và trình bày chính xác theo hợp đồng sản phẩm.
- Người dùng có quyền sửa, phục hồi và xuất dữ liệu.
- Giao diện không phán xét hoặc tạo lo lắng để thúc đẩy tương tác.

---

## 3. Câu chuyện thương hiệu

Tiền không tự biến mất. Người dùng chỉ thường không nhớ nó đã đi đâu.

Mỗi ngày, tiền đi qua nhiều nơi: tiền mặt, tài khoản ngân hàng, ví điện tử, hóa đơn, thu nhập, khoản chuyển nội bộ và những kế hoạch do chính người dùng tạo. Khi các dòng tiền không được ghi nhận rõ ràng, người dùng mất cảm giác kiểm soát và phải đoán dựa trên ký ức.

MoneyFlow tồn tại để biến những dòng tiền rời rạc thành một cuốn sổ rõ ràng và đáng tin.

MoneyFlow không đóng vai người thầy hay người phán xét. Sản phẩm ghi lại điều đã xảy ra, giữ đúng bản chất của từng khoản tiền và giúp người dùng tự hiểu tình hình của mình.

### Lời hứa thương hiệu

> Tiền của bạn được ghi đúng, nhìn rõ và luôn thuộc về bạn.

### Brand essence

> Rõ từng dòng tiền.

### Tính cách

- Bình tĩnh
- Rõ ràng
- Trung thực
- Gần gũi
- Có tổ chức
- Tôn trọng quyền kiểm soát của người dùng

### Điều thương hiệu không nên gợi

- đầu cơ;
- lợi nhuận được đảm bảo;
- tốc độ làm giàu;
- quyền lực ngân hàng;
- cảm giác tội lỗi;
- gamification quá mức.

---

## 4. Nguyên tắc thiết kế MoneyFlow

### 4.1 Rõ ràng hơn trang trí

Mỗi thành phần phải giúp người dùng hiểu, quyết định hoặc hành động. Decoration không có chức năng phải được loại bỏ.

### 4.2 Bình tĩnh hơn cảnh báo

Dữ liệu tiêu cực vẫn phải trung thực, nhưng màu sắc và ngôn từ không được gây hoảng sợ hoặc phán xét.

### 4.3 Trung thực hơn dễ chịu

Không che số âm, không làm đẹp dữ liệu bằng cách phân loại sai và không biến giả định thành sự thật.

### 4.4 Hành động hơn báo cáo

Dữ liệu nên dẫn tới một bước tiếp theo hợp lý: ghi khoản mới, xem chi tiết, sửa sai hoặc kiểm tra kế hoạch.

### 4.5 Agency — người dùng giữ quyền kiểm soát

Thiết kế phải hỗ trợ quay lại, hủy, sửa, undo, recovery, export và giải thích hậu quả trước thao tác nguy hiểm.

### 4.6 Familiarity — quen thuộc có chủ đích

Dùng pattern web và mobile quen thuộc cho navigation, form, button, table và dialog. Không phát minh tương tác mới chỉ để khác biệt.

### 4.7 Progressive disclosure

Hiển thị cốt lõi trước. Chi tiết nâng cao xuất hiện khi người dùng yêu cầu.

### 4.8 Mobile-first

Thiết kế cho điện thoại trước, sau đó mở rộng. Không thu nhỏ nguyên giao diện desktop xuống mobile.

### 4.9 Accessible by default

Accessibility là constraint từ đầu, không phải bước QA cuối.

### 4.10 Craft có bằng chứng

Pixel polish chỉ có giá trị khi flow, state, nội dung và dữ liệu đã đúng. Không chấp nhận visual đẹp nhưng thiếu browser evidence.

---

## 5. Quy trình thiết kế chuẩn

MoneyFlow dùng divergence trước convergence:

1. **Brief** — người dùng, việc cần làm, quyết định chính, constraint và bằng chứng.
2. **Repository reconnaissance** — route, component, token, test, lịch sử và screenshot hiện tại.
3. **Research** — chỉ khi còn câu hỏi bên ngoài hoặc hành vi chưa được xác lập.
4. **Problem definition** — mô tả vấn đề mà không nhảy sớm vào giải pháp.
5. **Information architecture và flow** — cấu trúc, thứ tự, happy path, error và recovery.
6. **Wireframe** — giải quyết hierarchy và nội dung trước polish.
7. **Multiple directions** — tối thiểu ba hướng có trade-off rõ.
8. **Selection** — chọn bằng tiêu chí, không chọn theo sở thích hoặc mockup đẹp.
9. **Visual system fit** — áp dụng token, typography, spacing, component và Calm Ledger v2.
10. **Vertical slice** — triển khai phần nhỏ nhất có thể chạy trong production code.
11. **Verification** — static, browser, responsive, accessibility, long data và dark mode.
12. **Independent evaluation** — đánh giá theo brief và acceptance criteria.
13. **Delivery** — PR, evidence, merge và production verification.

Không được đổi yêu cầu âm thầm trong khi triển khai. Khi phát hiện yêu cầu sai, cập nhật specification trước.

---

## 6. Brief thiết kế tối thiểu

Mỗi task UI/UX không nhỏ phải xác định:

- Người dùng đang cố làm gì?
- Quyết định quan trọng nhất trên màn hình là gì?
- Primary action là gì?
- Dữ liệu nào đáng tin?
- Dữ liệu hoặc lời khuyên nào bị cấm?
- Loading, empty, populated, error và recovery hoạt động thế nào?
- Dữ liệu dài và số VND lớn trông ra sao?
- Mobile, tablet và desktop khác nhau thế nào?
- Keyboard, focus, text scaling và reduced motion được xử lý ra sao?
- Điều gì nằm ngoài scope?
- Evidence nào bắt buộc trước khi merge?

---

## 7. Nền tảng thị giác

### 7.1 Hierarchy

Hierarchy cho người dùng biết nên nhìn gì trước.

Tạo hierarchy bằng:

- kích thước;
- weight;
- vị trí;
- khoảng trống;
- contrast;
- grouping;
- thứ tự;
- mức độ chi tiết.

Nếu mọi card, CTA và số liệu đều nổi bật như nhau thì không có hierarchy.

### 7.2 Contrast

Contrast cần đủ rõ để thể hiện khác biệt về vai trò. Tránh những thay đổi quá nhỏ về cỡ chữ, màu hoặc weight khiến giao diện trông vô tình.

### 7.3 Alignment

Mọi thành phần cần quan hệ rõ với grid, lề, baseline hoặc phần tử lân cận. Không căn giữa văn bản dài hoặc dùng alignment khác nhau tùy hứng.

### 7.4 Proximity

Khoảng cách trong một nhóm phải nhỏ hơn khoảng cách giữa các nhóm. Label phải gần input, action phải gần đối tượng bị tác động và heading phải gần nội dung thuộc về nó.

### 7.5 Repetition

Lặp lại có kiểm soát tạo hệ thống: radius, spacing, component shell, icon language và cách đặt tiêu đề.

### 7.6 Balance

Balance có thể đối xứng hoặc bất đối xứng, nhưng trọng lượng thị giác phải có chủ đích. Một màu mạnh hoặc số tiền lớn có thể nặng hơn một khối lớn màu nhạt.

### 7.7 White space

Khoảng trống giúp nhóm, phân cấp và giảm tải nhận thức. Không dùng khoảng trống chỉ để tạo cảm giác “premium” nếu nó kéo dài task hoặc che mất dữ liệu cần thiết.

### 7.8 Gestalt

Áp dụng:

- proximity để nhóm;
- similarity để thể hiện cùng vai trò;
- common region khi thật sự cần container;
- continuity để dẫn mắt;
- closure để đơn giản hóa symbol;
- figure-ground để đảm bảo đối tượng chính tách khỏi nền.

---

## 8. Layout và responsive

### 8.1 Grid

Dùng grid, gutter, margin và content width thống nhất. Không căn từng section bằng giá trị tùy ý.

### 8.2 Mobile-first

Mobile cần ưu tiên:

- quyết định chính;
- primary action;
- vùng chạm;
- keyboard;
- fixed navigation không che nội dung;
- dữ liệu dài;
- thao tác một tay khi phù hợp.

### 8.3 Responsive là tái cấu trúc

Khi thay breakpoint, có thể cần đổi:

- số cột;
- thứ tự nội dung;
- navigation;
- mật độ;
- table thành list;
- vị trí CTA;
- độ chi tiết mặc định.

Không coi responsive là scale nhỏ toàn bộ layout.

### 8.4 Density

MoneyFlow có mật độ vừa phải: đủ để đối chiếu nhưng không giống bảng kế toán doanh nghiệp. Không dùng card cho mọi vùng và không lồng card trong card.

---

## 9. Typography

Typography quyết định khả năng đọc, hierarchy, nhịp và độ tin cậy.

Quy tắc:

- Tuân theo font stack và type scale trong design system hiện hành.
- Body không nhỏ hơn mức cho phép của Calm Ledger v2.
- Dùng tối đa ba cỡ chữ rõ ràng trong một functional region.
- Line height phải hỗ trợ tiếng Việt.
- Không căn giữa đoạn dài.
- Không dùng uppercase cho nội dung dài.
- Không dùng quá nhiều weight gần nhau.
- Số tiền dùng tabular numerals.
- Giá trị chính xác không bị truncate trong table, form, dialog hoặc detail.
- Test chuỗi tiếng Việt dài và dấu đầy đủ.

Typography tốt phải còn đọc được khi zoom text 200% mà không mất chức năng.

---

## 10. Màu sắc

Màu có vai trò, không phải lớp trang trí.

### 10.1 Semantic tokens

Dùng token theo nghĩa như brand, surface, text, border, success, danger, warning và information. Không hard-code màu rải rác hoặc lấy tên màu làm ý nghĩa sản phẩm.

### 10.2 Một màu brand

MoneyFlow dùng một accent brand theo Calm Ledger v2. Semantic color chỉ dùng cho ngữ nghĩa.

### 10.3 Không phụ thuộc màu

Thu, chi và chuyển phải có thêm:

- dấu `+`, `−` hoặc `↔`;
- nhãn;
- icon hoặc direction khi hữu ích;
- cấu trúc text rõ.

### 10.4 Dark mode

Dark mode là hệ thống riêng, không đảo màu tự động. Kiểm tra surface, border, muted text, semantic color, chart, focus và shadow.

### 10.5 Contrast

Mọi text, focus và graphic chức năng phải đạt mức contrast mà design system/accessibility contract yêu cầu.

---

## 11. Spacing, shape và elevation

- Dùng nhịp 4px.
- Page gutter và content width theo Calm Ledger v2.
- Radius thể hiện loại component, không dùng tùy hứng.
- Border tạo cấu trúc chính.
- Shadow chỉ dành cho floating layer hoặc elevation thật.
- Không dùng glass, glow hoặc gradient trang trí trong product UI.
- Focus không được làm component dịch chuyển.

Card chỉ dùng khi cần nhóm một ý hoặc tạo vùng tương tác độc lập. Card không phải page padding.

---

## 12. Icon và illustration

### Icon chức năng

- Ưu tiên quen thuộc hơn độc đáo.
- Cùng stroke, góc bo, bounding box và mức độ chi tiết.
- Có label khi nghĩa không phổ biến.
- Không dùng icon như decoration không chức năng.

### Illustration

Chỉ dùng khi nó:

- giải thích;
- hướng dẫn;
- làm empty state dễ hiểu;
- hỗ trợ câu chuyện sản phẩm.

Không dùng illustration để làm nhẹ đi một vấn đề tài chính nghiêm túc hoặc che thiếu dữ liệu.

---

## 13. Logo và nhận diện

Logo là dấu hiệu nhận diện, không phải infographic về toàn bộ sản phẩm.

### 13.1 Logo tốt cần

- đơn giản;
- khác biệt;
- phù hợp;
- dễ nhớ;
- scalable;
- hoạt động đơn sắc;
- dùng được ở 16–32px;
- có thể tái tạo bằng vector;
- không phụ thuộc mockup hoặc hiệu ứng.

### 13.2 Concept phải đến từ brand truth

Quy trình:

`brand truth → từ khóa → lãnh thổ ý tưởng → phác thảo đen trắng → silhouette → hình học → wordmark → variants → small-size test`

Không dùng công thức:

`M + F + đồng tiền + biểu đồ + mũi tên = logo`

### 13.3 Tránh fintech cliché

Ví, đồng xu, ký hiệu tiền, biểu đồ và mũi tên tăng trưởng có thể mô tả ngành nhưng có độ khác biệt thấp. Chỉ dùng khi có lý do thương hiệu mạnh và cách xử lý thực sự riêng.

MoneyFlow không nên dùng tăng trưởng làm ý tưởng cốt lõi vì sản phẩm không hứa lợi nhuận.

### 13.4 Bộ nhận diện tối thiểu

- Symbol
- Wordmark
- Horizontal lockup
- Stacked lockup
- Monochrome dark/light
- App icon
- Favicon
- Safe area
- Minimum size
- Incorrect usage

### 13.5 Test logo

Kiểm tra ở 16, 24, 32, 64, 128 và 512px; nền sáng/tối; một màu; app icon; favicon; header; auth và không có wordmark.

Không chọn logo từ một brand-board đẹp trước khi các test cơ bản này đạt.

---

## 14. UX research và problem framing

Research có thể gồm:

- interview;
- observation;
- usability testing;
- analytics;
- support issue analysis;
- competitor analysis;
- diary study;
- production behavior review.

Không hỏi người dùng muốn feature gì rồi triển khai trực tiếp. Cần hiểu tình huống, động cơ, trở ngại, giải pháp hiện tại và trade-off.

### Jobs to be Done

Một job tốt có cấu trúc:

> Khi [tình huống], tôi muốn [động lực/hành động], để [kết quả].

Ví dụ:

> Khi vừa chi tiền, tôi muốn ghi lại nhanh để cuối tháng không phải đoán tiền đã đi đâu.

---

## 15. Information architecture và flow

IA tổ chức navigation, hierarchy, label, group, search và quan hệ giữa các trang.

Một flow phải xử lý:

- happy path;
- validation;
- error;
- back/cancel;
- recovery/undo;
- duplicate action;
- permission;
- offline/stale;
- loading;
- success feedback.

Mỗi navigation destination cần có lý do gắn với daily loop hoặc nhiệm vụ thực tế. Advanced tools không được cạnh tranh với core jobs.

---

## 16. Wireframe và prototype

### Wireframe

Dùng để giải quyết cấu trúc, thứ tự, content hierarchy, action và state. Không polish màu trước khi flow hợp lý.

### Prototype

Dùng để kiểm tra navigation, interaction, state transition, khả năng hiểu và thời gian hoàn thành.

Prototype không phải production proof. Một flow chỉ được coi là hoàn thành khi chạy trong code thật và được kiểm tra bằng browser evidence phù hợp.

---

## 17. UI component

Mỗi component cần có:

- vai trò rõ;
- content contract;
- default;
- hover;
- active;
- focus;
- disabled;
- loading;
- error khi phù hợp;
- responsive behavior;
- long content;
- localization;
- light/dark;
- keyboard và screen-reader behavior.

Tìm và tái sử dụng component hiện có trước khi tạo abstraction mới.

---

## 18. Form

Form MoneyFlow phải:

- có label thật, không dùng placeholder thay label;
- dùng input type và mobile keyboard phù hợp;
- validation gần trường liên quan;
- giữ dữ liệu sau lỗi;
- không gửi lặp;
- chỉ rõ loading;
- cho biết dữ liệu nào sẽ thay đổi;
- xử lý số tiền, ngày, tài khoản, danh mục và transfer invariant đúng hợp đồng;
- hỗ trợ keyboard và screen reader;
- có recovery khi thao tác thất bại.

Thông báo lỗi phải nói: chuyện gì xảy ra, tại sao khi biết được và người dùng có thể làm gì.

---

## 19. Table và list

- Text thường căn trái; số và tiền căn theo hệ thống tabular numerals.
- Không truncate số tiền cần đối chiếu.
- Row phải scan được ở dữ liệu dài.
- Sort, filter và search chỉ xuất hiện khi giải quyết nhu cầu thật.
- Mobile có thể chuyển table thành list hoặc progressive disclosure.
- Empty, loading và error không được để thành vùng trắng vĩnh viễn.
- Destructive bulk action cần scope rõ và recovery phù hợp.

---

## 20. Dashboard và data visualization

Dashboard không phải kho chứa mọi metric. Nó phải trả lời một số câu hỏi chính trong thứ tự rõ ràng.

Với MoneyFlow:

1. Tổng số dư hiện tại là bao nhiêu?
2. Tháng này thu, chi và ròng ra sao?
3. Có gì cần chú ý?
4. Ghi khoản mới ở đâu?
5. Xem chi tiết nào tiếp theo?

Chọn biểu đồ theo câu hỏi:

| Câu hỏi | Biểu diễn ưu tiên |
|---|---|
| Một giá trị hiện tại | Number |
| Xu hướng theo thời gian | Line/bar theo kỳ |
| So sánh nhóm | Bar |
| Cơ cấu danh mục | Horizontal/stacked bar |
| Kế hoạch so với thực tế | Progress |
| Hai kỳ | Numbers + delta |

Không dùng chart để lấp khoảng trống. Chart không được thay thế exact values trong context cần đối chiếu.

---

## 21. State model

Mỗi route chỉ cần hỗ trợ state có thể thực sự xảy ra, nhưng phải xác định đầy đủ:

- loading;
- empty;
- populated;
- validation error;
- system error;
- recovery/undo;
- offline/stale;
- permission denied;
- success feedback;
- partial data;
- uncertain/review-required cho imported candidates.

Skeleton phải khớp kích thước content thật và không trở thành blank card cố định.

---

## 22. Interaction và motion

### Feedback

Mỗi hành động phải có phản hồi tương xứng: pressed state, loading, success, error hoặc undo.

### Affordance

Button, input, link, drag handle và interactive row phải trông có thể tương tác. Flat design không được làm mất dấu hiệu chức năng.

### Motion

Motion chỉ dùng để:

- giải thích thay đổi;
- duy trì ngữ cảnh;
- chỉ ra quan hệ;
- xác nhận hành động;
- hướng chú ý có chủ đích.

Không entrance choreography trên dữ liệu tài chính. Tôn trọng `prefers-reduced-motion` và timing trong Calm Ledger v2.

---

## 23. Accessibility và inclusive design

Kiểm tra tối thiểu:

- semantic HTML;
- heading structure;
- keyboard navigation;
- visible focus;
- screen-reader name/description;
- contrast;
- không phụ thuộc màu;
- vùng chạm tối thiểu theo contract;
- text zoom 200%;
- reduced motion;
- error được thông báo;
- content không bị che bởi fixed navigation;
- responsive reflow;
- tiếng Việt rõ ràng.

Accessibility giúp cả người khuyết tật, người dùng ngoài trời, thiết bị nhỏ, mạng chậm, tay bận và người mới làm quen với tài chính số.

---

## 24. Content design

Nội dung là một phần của interaction.

### Voice

MoneyFlow bình tĩnh, rõ, tôn trọng và không phán xét.

### Quy tắc

- Dùng từ người dùng hiểu.
- Dùng tiếng Việt trước.
- Nút mô tả hành động cụ thể.
- Không dùng jargon nội bộ.
- Không hứa kết quả tài chính.
- Không gamify việc tiết kiệm hoặc chi tiêu khi không có cơ sở.
- Không đổ lỗi cho người dùng.
- Thuật ngữ phải nhất quán toàn sản phẩm.

Ví dụ:

- Tốt: `Đã ghi khoản chi.`
- Tránh: `Tuyệt vời! Bạn đang tiến gần tới tự do tài chính!`

Empty state phải giải thích khu vực là gì, vì sao chưa có dữ liệu và hành động tiếp theo hợp lý.

---

## 25. Design system

Design system gồm principles, token, component, pattern, guideline, tooling và governance.

### Token

Dùng semantic tokens cho color, type, spacing, radius, border, shadow, motion và breakpoint.

### Component hierarchy

Có thể tư duy theo:

`primitive → component → pattern → template → route`

### Governance

- Không tạo component mới khi pattern hiện có đáp ứng được.
- Nếu cần đổi luật, cập nhật source of truth trước code.
- Deprecation phải xóa consumer, import và guardrail liên quan trong cùng slice khi an toàn.
- Không thêm global refresh stylesheet cho route mới/migrated.
- Quan trọng nên được chuyển từ prose thành test, lint hoặc contract khi khả thi.

---

## 26. AI trong thiết kế

AI có thể:

- audit repo;
- tổng hợp research;
- tạo nhiều hướng;
- viết brief/wireframe;
- kiểm tra consistency;
- hỗ trợ code;
- tìm edge case;
- phân tích screenshot;
- tạo test và evidence.

AI không được tự:

- đổi product truth;
- phát minh dữ liệu tài chính;
- chọn trade-off cuối cùng thay con người;
- sao chép style của Apple hoặc thương hiệu khác;
- tuyên bố công việc của chính nó đã hoàn thành;
- dùng polish để che flow/state chưa giải quyết.

Prompt tốt phải chứa mục tiêu, context repo, constraints, design system, dữ liệu thật, states, viewport, accessibility, out-of-scope và acceptance criteria.

Quy trình Codex chi tiết nằm trong [`AI_UIUX_WORKFLOW.md`](./AI_UIUX_WORKFLOW.md).

---

## 27. Design critique

Critique không dùng `đẹp/xấu` hoặc `thích/không thích` làm bằng chứng.

Phản hồi nên theo cấu trúc:

`vấn đề → bằng chứng → tác động → đề xuất → trade-off → cách kiểm tra`

Ví dụ:

- Yếu: `CTA chưa đẹp.`
- Tốt: `Ba action cùng màu và weight làm mất primary action; giảm hai action phụ xuống secondary/tertiary rồi kiểm tra first viewport ở 360px.`

Đánh giá implementation theo brief và acceptance criteria, không theo phần tự mô tả của agent triển khai.

---

## 28. Rubric chọn phương án

Mặc định cho UI direction:

| Tiêu chí | Trọng số |
|---|---:|
| Trả lời quyết định chính nhanh | 25% |
| Mobile và dữ liệu dài | 20% |
| Financial honesty | 20% |
| Accessibility và recovery | 15% |
| Nhất quán design system | 10% |
| Dễ triển khai/bảo trì | 10% |

Mặc định cho logo/identity:

| Tiêu chí | Trọng số |
|---|---:|
| Nhận diện ở 16–32px | 20% |
| Khác biệt | 20% |
| Phù hợp brand story | 20% |
| Đơn giản/dễ nhớ | 15% |
| Hoạt động đơn sắc | 10% |
| Cân bằng hình học | 10% |
| Khả năng sở hữu/bảo vệ | 5% |

Mockup đẹp không được dùng thay cho rubric và small-size test.

---

## 29. Lỗi phổ biến cần tránh

- Bắt đầu từ visual trend thay vì vấn đề.
- Thiết kế từ trang trắng mà không audit repo.
- Dùng quá nhiều card.
- Có nhiều primary action trong một viewport.
- Dùng màu để sửa hierarchy yếu.
- Chỉ thiết kế happy path.
- Thu nhỏ desktop thành mobile.
- Dùng icon không label cho khái niệm lạ.
- Hard-code token.
- Dùng gradient, glass, glow hoặc 3D để tạo cảm giác hiện đại.
- Ép logo chứa tên viết tắt, ví, đồng tiền, biểu đồ và mũi tên cùng lúc.
- Ám chỉ tăng trưởng tài chính mà sản phẩm không hứa.
- Để AI tự đánh giá và phê duyệt output của chính nó.
- Tuyên bố mobile-ready mà chưa test thiết bị thật.

---

## 30. Checklist trước khi thiết kế

- [ ] Vấn đề và người dùng đã rõ.
- [ ] Product truth và financial constraints đã đọc.
- [ ] Route/component/token/test hiện tại đã audit.
- [ ] Quyết định chính và primary action đã xác định.
- [ ] Dữ liệu được phép và bị cấm đã xác định.
- [ ] Required states và edge cases đã liệt kê.
- [ ] Acceptance criteria có thể quan sát được.
- [ ] Out-of-scope rõ ràng.
- [ ] Work packet đã được tạo khi cần.

---

## 31. Checklist trong khi thiết kế

- [ ] Tạo nhiều hướng có trade-off trước khi chọn.
- [ ] Hierarchy rõ mà không phụ thuộc màu.
- [ ] Một primary action mỗi viewport.
- [ ] Dùng token/component hiện có.
- [ ] Mobile, tablet và desktop được thiết kế có chủ đích.
- [ ] Loading, empty, populated, error và recovery có thiết kế.
- [ ] Số VND dài và text tiếng Việt dài không vỡ layout.
- [ ] Keyboard, focus, text 200% và reduced motion được xử lý.
- [ ] Dark mode là hệ thống, không đảo màu.
- [ ] Không thêm lời khuyên tài chính hoặc metric không có contract.

---

## 32. Checklist trước khi merge

- [ ] Diff khớp specification.
- [ ] Không có drive-by refactor.
- [ ] Static checks phù hợp đã chạy.
- [ ] Unit/domain/database checks phù hợp đã chạy.
- [ ] Browser flow đã được kiểm tra.
- [ ] Screenshot phone/tablet/desktop đã review.
- [ ] Light/dark và long-data evidence có đủ.
- [ ] Keyboard/focus/text scaling/reduced motion đã kiểm tra.
- [ ] Physical-device check có khi tuyên bố mobile-ready.
- [ ] Reviewer độc lập đã đánh giá acceptance criteria.
- [ ] PR ghi rõ outcome, trade-off, test và limitation.
- [ ] Production verification được thực hiện sau merge khi có runtime change.

---

## 33. Công thức làm việc

> Hiểu vấn đề → bảo vệ product truth → tạo nhiều hướng → chọn bằng tiêu chí → triển khai trong hệ thống → kiểm tra bằng bằng chứng → đánh giá độc lập → lặp lại.

Đối với MoneyFlow, mọi quyết định thiết kế cuối cùng phải phục vụ một lời hứa:

> Giúp người dùng ghi đúng, nhìn rõ và tin tưởng vào dữ liệu tiền của chính mình.
