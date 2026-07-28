# MoneyFlow — AI-assisted UI/UX workflow

## Mục tiêu

Dùng AI để tăng tốc khám phá, thiết kế, triển khai và kiểm tra giao diện; không dùng AI như máy tạo giao diện ngẫu nhiên.

MoneyFlow chỉ nhận một thay đổi UI khi thay đổi đó:

1. giải quyết một câu hỏi hoặc hành động thật của người dùng;
2. tuân thủ product truth và [Calm Ledger v2](./design/CALM_LEDGER_V2.md);
3. tái sử dụng component và semantic token hiện có;
4. hoạt động trên điện thoại trước, sau đó thích nghi với màn hình lớn;
5. không đưa ra lời khuyên tài chính hoặc dữ liệu thiếu cơ sở;
6. có code, browser behavior và screenshot evidence để kiểm chứng.

Nghiên cứu nền: [Codex + Apple design workflow research](./research/06_CODEX_APPLE_UI_WORKFLOW.md).

## Vai trò

### Human owner

- Chốt vấn đề, outcome và trade-off sản phẩm.
- Chọn hướng thiết kế trước khi code.
- Xem evidence thật, không chỉ đọc tóm tắt của AI.
- Quyết định merge và production readiness.

### Codex implementing agent

- Đọc repo, lịch sử và source of truth.
- Audit giao diện và component hiện tại.
- Tạo nhiều hướng cấu trúc có trade-off.
- Triển khai hướng đã được chọn theo vertical slice.
- Chạy check và tạo evidence.

### Codex evaluator hoặc reviewer độc lập

- Đánh giá diff theo work packet và acceptance criteria.
- Tìm state bị thiếu, token hard-code, scope creep và financial UX sai.
- Review screenshot, keyboard, responsive và recovery.
- Không tự mở rộng requirement trong lúc review.

AI không được tự đổi product scope, tự thêm lời khuyên tài chính, gamification, bank sync, OCR, AI glow hoặc visual language mới.

## Những workflow đã tham khảo

### OpenAI Codex

OpenAI khuyến nghị:

- bắt đầu thay đổi lớn bằng Ask mode và implementation plan;
- viết prompt như một GitHub issue có file path, component, constraint và acceptance criteria;
- dùng `AGENTS.md` làm context bền vững;
- cải thiện setup script, environment và test harness qua từng task;
- dùng Best-of-N để tạo và so sánh nhiều phương án;
- đưa screenshot hoặc wireframe vào context, để Codex chạy browser, tự quan sát và lặp;
- luôn để con người review code, log, test và visual evidence trước khi merge.

Nguồn:

- https://openai.com/business/guides-and-resources/how-openai-uses-codex/
- https://openai.com/index/introducing-upgrades-to-codex/
- https://openai.com/index/introducing-codex/

Bài học áp dụng: Codex phải đi theo chuỗi **Ask → brief → Best-of-N → human selection → production slice → visual loop → independent review**. Không prompt từ trang trắng rồi nhận luôn output đầu tiên.

### Apple Human Interface Guidelines

Apple 2026 mô tả tám nguyên tắc thiết kế: **Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight**.

MoneyFlow áp dụng như sau:

| Apple principle | Luật MoneyFlow |
|---|---|
| Purpose | Mỗi màn hình phục vụ một quyết định hoặc hành động rõ ràng. |
| Agency | Có back, cancel, edit, undo và recovery phù hợp; không ép user đi theo flow không cần thiết. |
| Responsibility | Minh bạch nguồn dữ liệu, không bịa khả năng hoặc lời khuyên tài chính. |
| Familiarity | Element giống nhau phải hành xử giống nhau; dùng web pattern và component quen thuộc. |
| Flexibility | Hỗ trợ nhiều viewport, touch, keyboard, dark mode, text scale, long Vietnamese và large VND. |
| Simplicity | Loại bỏ friction, không đồng nghĩa giấu chức năng hoặc chỉ làm giao diện tối giản. |
| Craft | Alignment, copy, loading, error, focus, performance và number formatting đều phải hoàn thiện. |
| Delight | Cảm xúc mục tiêu là calm confidence; không dùng confetti, streak hoặc motion gây chú ý. |

Các constraint cụ thể:

- touch target chính tối thiểu 44×44 CSS px;
- feedback phải tương xứng với mức độ quan trọng của hành động;
- motion phải có mục đích và tôn trọng `prefers-reduced-motion`;
- typography phải giữ khả năng đọc và hierarchy;
- layout phải thích nghi với context, không chỉ co giãn một desktop mockup.

Nguồn:

- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/videos/play/wwdc2026/250/
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/motion

Bài học áp dụng: học **nguyên tắc ra quyết định**, không sao chép Liquid Glass, platform chrome hoặc visual style của Apple cho web MoneyFlow.

### Figma Make / Figma AI

Figma khuyến khích đưa thiết kế hiện có, thư viện style, ảnh hoặc code vào context; sau đó dùng hội thoại, point-and-edit và chỉnh code để lặp trên prototype đang chạy.

Nguồn:

- https://help.figma.com/hc/en-us/articles/31304485164695-Create-and-edit-a-functional-prototype-or-web-app
- https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI

Bài học áp dụng: luôn đưa code, token và constraint hiện tại cho AI.

### Google Stitch

Stitch đề xuất bắt đầu bằng mục tiêu, cảm giác mong muốn và ví dụ; tạo nhiều phương án rồi hội tụ vào phương án tốt nhất.

Nguồn:

- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/

Bài học áp dụng: divergence trước, convergence sau.

### Relume

Relume dùng chuỗi brief → sitemap → wireframe → style guide → tinh chỉnh.

Nguồn:

- https://resources.relume.io/resources/docs/building-a-sitemap-with-ai
- https://resources.relume.io/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder
- https://www.relume.io/resources/docs/concept-creation-using-the-relume-style-guide-builder

Bài học áp dụng: chốt cấu trúc và nội dung trước màu sắc.

### v0

v0 nhận prompt, screenshot, mockup và Figma; đồng thời nhấn mạnh đưa design token và component registry vào model.

Nguồn:

- https://v0.dev/docs/introduction
- https://v0.dev/docs/design-systems
- https://v0.dev/docs/faqs

Bài học áp dụng: AI chỉ được sinh trong giới hạn component và token thật của MoneyFlow.

## Workflow chuẩn của MoneyFlow

### 0. Chuẩn bị môi trường Codex

Trước khi giao UI task, repo phải có:

- `AGENTS.md` và source-of-truth links đúng;
- setup chạy được và runtime mode rõ ràng;
- fixture/demo data ổn định;
- lint, typecheck, unit, build và Playwright commands;
- định nghĩa viewport và nơi lưu screenshot evidence.

Lỗi môi trường lặp lại phải được sửa ở repo/setup, không giải quyết bằng prompt workaround vô hạn.

### 1. Tạo work packet

Mọi UI flow hoặc redesign không tầm thường phải copy `docs/templates/FEATURE_WORK_PACKET.md` vào `docs/plans/active/<slug>.md`.

Work packet phải có:

- outcome;
- repository reconnaissance;
- research cần thiết;
- specification và acceptance criteria;
- selected direction;
- implementation plan;
- verification evidence.

### 2. Ask mode reconnaissance

Yêu cầu Codex audit trước khi code:

- route và user flow hiện tại;
- hierarchy và primary action;
- component/token có thể tái sử dụng;
- reachable states;
- test và screenshot hiện có;
- constraint product, tài chính và accessibility;
- câu hỏi chưa được giải quyết.

Output phải được ghi lại trong work packet. Không cho Codex vừa khám phá vừa âm thầm quyết định requirement.

### 3. Viết design brief như GitHub issue

Mỗi batch phải viết rõ:

- người dùng đang cố làm gì;
- quyết định quan trọng nhất trên màn hình;
- hành động chính;
- route/component chính xác trong scope;
- dữ liệu nào đáng tin;
- dữ liệu hoặc lời khuyên nào chưa được phép hiển thị;
- loading, empty, populated, error, recovery và success;
- mobile, keyboard, text scaling, dark mode và dữ liệu dài;
- acceptance criteria, commands và screenshot evidence.

Không dùng brief mơ hồ như “make it premium”, “make it Apple-like” hoặc “redesign cho đẹp hơn”.

### 4. Audit màn hình hiện tại

Thu thập:

- screenshot điện thoại, tablet và desktop;
- first viewport và hierarchy hiện tại;
- CTA bị lặp hoặc bị che;
- nội dung không giúp quyết định;
- component và semantic token đang dùng;
- loading/empty/error/recovery state;
- lỗi responsive, keyboard và a11y;
- long Vietnamese và large VND failures.

### 5. Tạo ba hướng cấu trúc

Codex phải tạo tối thiểu ba hướng có tên và trade-off. Mỗi hướng phải mô tả:

- hierarchy;
- primary action placement;
- component reuse;
- phone/desktop behavior;
- state model;
- accessibility risk;
- maintainability;
- điểm phù hợp hoặc xung đột với Calm Ledger v2.

Ba hướng mặc định để kiểm tra tư duy, không phải style bắt buộc:

#### Hướng A — Calm Ledger

- số liệu chính rõ ràng;
- neutral surface chiếm đa số;
- green chỉ dành cho brand và primary action;
- mật độ vừa phải;
- không gamification.

#### Hướng B — Analytics Desk

- nhiều chart và KPI hơn;
- phù hợp power user;
- mật độ cao và khó dùng hơn trên điện thoại.

#### Hướng C — Guided Review

- nhiều explanation và next-step copy hơn;
- hữu ích cho onboarding hoặc uncertain state;
- có nguy cơ dài dòng, phán xét hoặc biến ledger thành adviser.

AI chỉ cần low-fidelity structure hoặc production-component sketch ở giai đoạn này; không polish ba design system hoàn chỉnh.

### 6. Chọn bằng tiêu chí

| Tiêu chí | Trọng số |
|---|---:|
| Giải quyết quyết định/hành động chính | 25% |
| Trung thực và có trách nhiệm tài chính | 20% |
| Mobile và flexibility | 20% |
| Familiarity và design-system consistency | 15% |
| Accessibility và recovery | 10% |
| Dễ bảo trì và chi phí triển khai | 10% |

Human owner ghi lại hướng được chọn, phần kết hợp và lý do loại các hướng còn lại trước khi code.

### 7. Khóa hệ thống trước khi polish

- semantic token thay vì màu hard-code;
- một primary action trên mỗi viewport;
- card chỉ nhóm một ý, không nested card;
- tiền dùng tabular numerals;
- trạng thái không phân biệt chỉ bằng màu;
- spacing theo nhịp 4px;
- dark mode là hệ thống riêng, không đảo màu tự động;
- touch target tối thiểu 44×44px;
- fixed navigation không che content, toast, submit hoặc focus;
- motion không mang dữ liệu tài chính vào bằng choreography.

### 8. Triển khai theo production vertical slice

Mỗi slice dùng route, component, data và state thật; không tạo prototype rời rồi bỏ.

Thứ tự trong một slice:

1. page shell và hierarchy;
2. primary action và critical flow;
3. loading, empty, error, recovery và success;
4. long VND và Vietnamese text;
5. responsive, touch và keyboard;
6. polish, motion và dark mode.

Thứ tự route ưu tiên:

1. Tổng quan;
2. Ghi giao dịch;
3. Giao dịch;
4. Tài khoản;
5. Ngân sách, khoản định kỳ và mục tiêu;
6. Báo cáo;
7. trang nâng cao.

### 9. Visual feedback loop

Mỗi vòng lặp:

1. chạy route với deterministic data;
2. chụp phone, tablet và desktop;
3. chụp light/dark khi hỗ trợ;
4. kiểm tra empty, error, long-data và populated;
5. yêu cầu Codex so sánh evidence với design contract;
6. sửa mismatch cụ thể;
7. chạy lại check và screenshot.

Không dùng câu “làm premium hơn” làm feedback. Ghi rõ mismatch như hierarchy yếu, CTA cạnh tranh, label bị cắt, target quá nhỏ hoặc fixed nav che submit.

### 10. Verification loop

Mỗi PR UI cần:

- `npm run check:knowledge`;
- `npm run check:deployment-env` khi có liên quan;
- lint, typecheck, unit và build;
- Playwright trên 320, 360, 390, 768, 1024, 1366 và 1440px;
- WebKit critical paths;
- dark mode;
- 200% text;
- keyboard focus và focus order;
- reduced motion;
- screenshot và JSON evidence;
- kiểm tra thiết bị thật trước khi tuyên bố mobile-ready.

Screenshot không chứng minh được screen-reader announcement, keyboard order hoặc undo/recovery. Những phần đó cần browser/manual evidence riêng.

### 11. Independent evaluation

Reviewer độc lập kiểm tra:

- acceptance criteria có evidence hay chưa;
- route có state nào bị thiếu;
- token/component có bị tạo trùng hoặc hard-code;
- tiền có bị phân biệt chỉ bằng màu;
- fixed UI có che content/action/focus;
- Vietnamese label hoặc VND có bị cắt;
- UI có bịa dữ liệu hoặc lời khuyên;
- motion/focus có vi phạm accessibility;
- diff có cleanup ngoài scope;
- docs có còn đúng sau thay đổi.

### 12. Delivery

PR phải nêu:

- vấn đề và outcome;
- work packet/research link;
- hướng được chọn và trade-off;
- file/route đã thay đổi;
- check và visual evidence;
- limitation còn lại;
- production verification steps.

Codex review là reviewer bổ sung, không phải merge authority.

## Prompt template cho Codex UI task

```text
Goal
- <observable user outcome>

Read first
- AGENTS.md
- docs/product/PRINCIPLES.md
- docs/design/CALM_LEDGER_V2.md
- docs/AI_UIUX_WORKFLOW.md
- <active work packet>

Scope
- Routes/components: <exact paths or names>
- Reuse: <existing components/tokens>
- Do not change: <domain behavior, API, unrelated styles>

Required states
- loading, empty, populated, error/recovery, success
- long Vietnamese labels and large VND
- phone/tablet/desktop, light/dark, keyboard, reduced motion

Acceptance criteria
- <observable criteria>

Evidence
- Commands: <exact checks>
- Screenshots: <viewports and states>
- Report failures honestly; do not claim completion without evidence.
```

## Anti-patterns

- Một prompt từ trang trắng đi thẳng tới polished code.
- Copy visual style Apple thay vì học nguyên tắc.
- Nhiều agent sửa cùng ownership area mà không có contract.
- Chấp nhận screenshot đẹp nhưng bỏ qua form, error, keyboard và long data.
- Tạo token/component mới trước khi audit cái cũ.
- Để Codex tự đổi requirement cho dễ code.
- Dùng test hoặc self-review do cùng agent tạo như independent evidence.

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
