# Money Flow — Research series

Khung nghiên cứu **ứng dụng web quản lý thu chi cá nhân** (không code trong giai đoạn research).

| Giai đoạn | File | Status |
|---|---|---|
| 1. Research plan | [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md) | **Done** 2026-07-15 |
| 2. User + competitors | [02_USER_AND_COMPETITORS.md](./02_USER_AND_COMPETITORS.md) | **Done** 2026-07-15 |
| 3. Domain rules | [03_DOMAIN_RULES.md](./03_DOMAIN_RULES.md) | **Done** 2026-07-15 |
| 4. Open source | [04_OPEN_SOURCE_ANALYSIS.md](./04_OPEN_SOURCE_ANALYSIS.md) | **Done** 2026-07-15 |
| 5. Product + architecture synthesis | [05_PRODUCT_AND_ARCHITECTURE.md](./05_PRODUCT_AND_ARCHITECTURE.md) | **Done** 2026-07-15 |

## Active product memory, reference maps and cumulative ledgers

| Reference | File | Purpose | Status |
|---|---|---|---|
| Product competitive memory | [PRODUCT_COMPETITIVE_MEMORY.md](./PRODUCT_COMPETITIVE_MEMORY.md) | Tổng hợp hiện trạng MoneyFlow, so sánh sản phẩm Việt Nam/quốc tế/open-source, giải quyết tài liệu lỗi thời, quyết định roadmap, phạm vi hoãn và tiêu chí cập nhật | **Active** 2026-08-02 |
| Cumulative UI/UX research | [UI_UX_RESEARCH_LEDGER.md](./UI_UX_RESEARCH_LEDGER.md) | Nguồn UI/UX tích lũy, bằng chứng MoneyFlow, đối thủ, accessibility, AI design tools, mâu thuẫn, quyết định bị thay thế và khoảng trống chưa phục hồi | **Active** 2026-08-02 |
| Finance product repositories | [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) | Repo tham khảo theo từng phần của sản phẩm MoneyFlow: ledger, capture, import/export, budget, recurring, reports, UI, security và verification | **Active** 2026-08-01 |
| Engineering foundations | [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) | AI coding, research, product direction, project organization, clean code, architecture, testing, security, CI/CD, documentation và nền tảng học tập | **Active** 2026-08-01 |

`PRODUCT_COMPETITIVE_MEMORY.md` là điểm bắt đầu bắt buộc cho quyết định sản phẩm, đối thủ và roadmap. Nó giữ nguyên bằng chứng lịch sử nhưng đánh dấu rõ status/feature/roadmap nào đã bị code hoặc product truth mới supersede.

`UI_UX_RESEARCH_LEDGER.md` là điểm bắt đầu bắt buộc cho mọi vòng UI/UX. Nghiên cứu tích lũy nhưng concept thiết kế chỉ là giả thuyết; tài liệu concept bị bác bỏ hoặc superseded không được dùng làm baseline.

Hai repository reference map là chỉ mục nghiên cứu, không phải roadmap hay dependency manifest. Mỗi feature work packet chỉ nên chọn 2–4 nguồn liên quan trực tiếp và phải ghi rõ giới hạn áp dụng.

Tài liệu cũ như `docs/COMPETITOR_AND_OSS_RESEARCH.md`, `02_USER_AND_COMPETITORS.md`, `docs/UX_RESEARCH_AND_REDESIGN.md` và `docs/BEST_OF_MATRIX.md` vẫn được giữ làm lịch sử. Khi status hoặc roadmap mâu thuẫn, dùng `PRODUCT_COMPETITIVE_MEMORY.md` cùng `docs/product/PRINCIPLES.md` và `docs/MVP_DEFINITION.md`.

**Lưu ý:** Bộ docs này là luật định vị **thu chi cá nhân**. Autopilot code (`AGENT_BACKLOG`) từng nghiêng Inbox — ưu tiên task khớp current product truth và không dùng kế hoạch lịch sử để mở rộng scope.

Stack mục tiêu: Next.js · TypeScript · Tailwind · shadcn · Supabase · Vitest · Playwright · Vercel.
