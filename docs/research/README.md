# Money Flow — Research series

Khung nghiên cứu **ứng dụng web quản lý thu chi cá nhân**.

| Giai đoạn | File | Status |
|---|---|---|
| 1. Research plan | [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md) | **Done** 2026-07-15 |
| 2. User + competitors | [02_USER_AND_COMPETITORS.md](./02_USER_AND_COMPETITORS.md) | **Done** 2026-07-15 |
| 3. Domain rules | [03_DOMAIN_RULES.md](./03_DOMAIN_RULES.md) | **Done** 2026-07-15 |
| 4. Open source | [04_OPEN_SOURCE_ANALYSIS.md](./04_OPEN_SOURCE_ANALYSIS.md) | **Done** 2026-07-15 |
| 5. Product + architecture synthesis | [05_PRODUCT_AND_ARCHITECTURE.md](./05_PRODUCT_AND_ARCHITECTURE.md) | **Done** 2026-07-15 |

## Active memory and research

| Reference | File | Purpose |
|---|---|---|
| Warm-context router | [`docs/context/README.md`](../context/README.md) | Chọn đúng tài liệu theo boundary; không preload toàn bộ history |
| Current project memory | [CURRENT_PROJECT_MEMORY.md](./CURRENT_PROJECT_MEMORY.md) | Snapshot gọn về current truth và true gaps |
| Plan authority | [`docs/plans/PLAN_AUTHORITY.json`](../plans/PLAN_AUTHORITY.json) | Machine source cho master + zero/one current executable packet |
| Machine knowledge contract | [PROJECT_KNOWLEDGE_CONTRACT.json](./PROJECT_KNOWLEDGE_CONTRACT.json) | Heading, reference và size budget ổn định cho policy |
| Pull-request memory index | [PR_MEMORY_LOG.md](./PR_MEMORY_LOG.md) | Policy, trust boundary và size budget |
| Per-PR records | `pr-memory/YYYY/QN/PR-<number>.md` | Cold provenance riêng cho từng PR |
| Historical failure register | [HISTORICAL_FAILURE_REGISTER_2026-08-06.md](./HISTORICAL_FAILURE_REGISTER_2026-08-06.md) | Mẫu lỗi lặp lại và prevention status |
| Capability gap matrix | [PRODUCT_CAPABILITY_GAP_MATRIX.md](./PRODUCT_CAPABILITY_GAP_MATRIX.md) | Historical capability audit; not development order |
| Competitive memory | [PRODUCT_COMPETITIVE_MEMORY.md](./PRODUCT_COMPETITIVE_MEMORY.md) | Historical competitor patterns, sources and anti-copy limits |
| UI/UX ledger | [UI_UX_RESEARCH_LEDGER.md](./UI_UX_RESEARCH_LEDGER.md) | Bằng chứng UI/UX tích lũy |
| Finance repositories | [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) | Nguồn tham khảo theo capability |
| Engineering foundations | [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) | Nguồn kỹ thuật, testing, security và CI/CD |

## Interpretation order

1. Đọc code/tests/migrations của boundary đang sửa.
2. Đọc `CURRENT_PROJECT_MEMORY.md` để biết current truth.
3. Dùng `docs/context/README.md` để chọn 2–4 tài liệu warm context.
4. Chạy `npm run plan:resolve`; dùng `docs/plans/PLAN_AUTHORITY.json` + merged Git history cho execution state. GitHub Issues/PRs giữ backlog/status người dùng.
5. Mở manifest-selected active packet; không suy ra authority từ tên file hoặc `docs/plans/active/README.md`.
6. Dùng `PRODUCT_CAPABILITY_GAP_MATRIX.md` hoặc `PRODUCT_COMPETITIVE_MEMORY.md` chỉ khi cần audit/provenance hoặc pattern đối thủ.
7. Chỉ mở `pr-memory/YYYY/QN/PR-<number>.md` khi cần provenance.

Mọi PR targeting `main` phải có record riêng. PR đổi capability, architecture, security, operations hoặc verification phải cập nhật snapshot; PR không đổi current truth ghi `Status impact: none`.

Snapshot budget is executable in `PROJECT_KNOWLEDGE_CONTRACT.json`: target 80–150 lines, soft warning above 180 lines or 16 KiB, hard failure above 240 lines or 24 KiB. Lịch sử chi tiết không được copy vào snapshot.

Quyết định owner ngày 2026-08-02 thay thế feature freeze toàn cục. Validation vẫn bắt buộc trong từng workstream.

Tài liệu cũ vẫn là lịch sử, không được dùng để biến một feature đã merge thành “chưa làm”. Không dùng competitor parity để tự mở rộng sang bank sync, AI advice, OCR, household finance, investments, full FX accounting hoặc native app.

Stack hiện tại: Next.js · TypeScript · Tailwind · shadcn/Base UI · Supabase · Node tests · Playwright · k6 · Vercel.
