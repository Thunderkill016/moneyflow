# Money Flow — Research series

Khung nghiên cứu **ứng dụng web quản lý thu chi cá nhân**.

| Giai đoạn | File | Status |
|---|---|---|
| 1. Research plan | [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md) | **Done** 2026-07-15 |
| 2. User + competitors | [02_USER_AND_COMPETITORS.md](./02_USER_AND_COMPETITORS.md) | **Done** 2026-07-15 |
| 3. Domain rules | [03_DOMAIN_RULES.md](./03_DOMAIN_RULES.md) | **Done** 2026-07-15 |
| 4. Open source | [04_OPEN_SOURCE_ANALYSIS.md](./04_OPEN_SOURCE_ANALYSIS.md) | **Done** 2026-07-15 |
| 5. Product + architecture synthesis | [05_PRODUCT_AND_ARCHITECTURE.md](./05_PRODUCT_AND_ARCHITECTURE.md) | **Done** 2026-07-15 |

## Active product memory, gap map and cumulative ledgers

| Reference | File | Purpose | Status |
|---|---|---|---|
| Current project memory | [CURRENT_PROJECT_MEMORY.md](./CURRENT_PROJECT_MEMORY.md) | Nguồn chuẩn về phần đã merge, đã production-evidence, đang partial, còn absent, external pending, candidate-only và các claim bị supersede | **Primary implementation status** 2026-08-02 |
| Product competitive memory | [PRODUCT_COMPETITIVE_MEMORY.md](./PRODUCT_COMPETITIVE_MEMORY.md) | Tổng hợp nguồn và so sánh sản phẩm Việt Nam/quốc tế/open-source; giữ các pattern nên học và không nên sao chép | **Active competitive evidence** 2026-08-02 |
| Competitive capability gap matrix | [PRODUCT_CAPABILITY_GAP_MATRIX.md](./PRODUCT_CAPABILITY_GAP_MATRIX.md) | Gap đã được audit lại theo code hiện tại và roadmap nâng chiều sâu các module đang có | **Active roadmap direction** 2026-08-02 |
| Cumulative UI/UX research | [UI_UX_RESEARCH_LEDGER.md](./UI_UX_RESEARCH_LEDGER.md) | Nguồn UI/UX tích lũy, bằng chứng MoneyFlow, đối thủ, accessibility, AI design tools, mâu thuẫn, quyết định bị thay thế và khoảng trống chưa phục hồi | **Active** 2026-08-02 |
| Finance product repositories | [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) | Repo tham khảo theo từng phần của sản phẩm MoneyFlow: ledger, capture, import/export, budget, recurring, reports, UI, security và verification | **Active** 2026-08-01 |
| Engineering foundations | [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) | AI coding, research, product direction, project organization, clean code, architecture, testing, security, CI/CD, documentation và nền tảng học tập | **Active** 2026-08-01 |

## Required interpretation order

1. Dùng `CURRENT_PROJECT_MEMORY.md` để biết hiện tại đã làm gì và còn gì thật.
2. Dùng merged code/migrations/tests để xác nhận khi một workstream bắt đầu.
3. Dùng `PRODUCT_CAPABILITY_GAP_MATRIX.md` cho thứ tự phát triển hiện hành.
4. Dùng `PRODUCT_COMPETITIVE_MEMORY.md` để hiểu pattern đối thủ và giới hạn không nên sao chép.
5. Dùng issue body/tài liệu cũ như lịch sử; đọc comment mới và current memory trước khi coi checklist là chưa làm.

Quyết định owner ngày 2026-08-02 thay thế cách triển khai “đóng băng phát triển cho đến khi hoàn thành bảy ngày validation”. Validation vẫn bắt buộc trong từng workstream nhưng không chặn toàn bộ feature-depth work.

`UI_UX_RESEARCH_LEDGER.md` là điểm bắt đầu bắt buộc cho mọi vòng UI/UX. Nghiên cứu tích lũy nhưng concept thiết kế chỉ là giả thuyết; tài liệu concept bị bác bỏ hoặc superseded không được dùng làm baseline.

Hai repository reference map là chỉ mục nghiên cứu, không phải roadmap hay dependency manifest. Mỗi feature work packet chỉ nên chọn 2–4 nguồn liên quan trực tiếp và phải ghi rõ giới hạn áp dụng.

Tài liệu cũ như `docs/COMPETITOR_AND_OSS_RESEARCH.md`, `02_USER_AND_COMPETITORS.md`, `docs/UX_RESEARCH_AND_REDESIGN.md` và `docs/BEST_OF_MATRIX.md` vẫn được giữ làm lịch sử. Không dùng status cũ để ghi lại một feature đã merge thành “chưa làm”.

**Lưu ý:** Bộ docs này là luật định vị **thu chi cá nhân**. Không dùng competitor parity để tự mở rộng sang bank sync, AI advice, OCR, household finance, investment, full FX accounting hoặc native app.

Stack hiện tại: Next.js · TypeScript · Tailwind · shadcn/Base UI · Supabase · Node tests · Playwright · k6 · Vercel.
