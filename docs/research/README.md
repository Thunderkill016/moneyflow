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
| Warm-context router | [`docs/context/README.md`](../context/README.md) | Chọn đúng tài liệu theo boundary; không preload toàn bộ repo history |
| Current project memory | [CURRENT_PROJECT_MEMORY.md](./CURRENT_PROJECT_MEMORY.md) | Snapshot gọn về current truth và true gaps |
| Pull-request memory index | [PR_MEMORY_LOG.md](./PR_MEMORY_LOG.md) | Policy, trust boundary và size budget |
| Per-PR records | `pr-memory/YYYY/QN/PR-<number>.md` | Cold provenance riêng cho từng PR |
| Capability gap matrix | [PRODUCT_CAPABILITY_GAP_MATRIX.md](./PRODUCT_CAPABILITY_GAP_MATRIX.md) | Roadmap nâng chiều sâu các module đang có |
| Competitive memory | [PRODUCT_COMPETITIVE_MEMORY.md](./PRODUCT_COMPETITIVE_MEMORY.md) | Pattern đối thủ, nguồn và giới hạn không sao chép |
| UI/UX ledger | [UI_UX_RESEARCH_LEDGER.md](./UI_UX_RESEARCH_LEDGER.md) | Bằng chứng UI/UX tích lũy và concept bị supersede |
| Finance repositories | [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) | Nguồn tham khảo theo capability |
| Engineering foundations | [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) | Nguồn kỹ thuật, testing, security và CI/CD |

## Interpretation order

1. Đọc code/tests/migrations của boundary đang sửa.
2. Đọc `CURRENT_PROJECT_MEMORY.md` để biết current truth.
3. Dùng `docs/context/README.md` để chọn 2–4 tài liệu warm context.
4. Dùng `PRODUCT_CAPABILITY_GAP_MATRIX.md` cho thứ tự phát triển.
5. Dùng `PRODUCT_COMPETITIVE_MEMORY.md` khi cần pattern đối thủ.
6. Chỉ mở `pr-memory/YYYY/QN/PR-<number>.md` khi cần provenance.

Mọi PR targeting `main` phải có record riêng. PR đổi capability, architecture, security, operations hoặc verification phải cập nhật snapshot; PR không đổi current truth ghi `Status impact: none`.

Snapshot target 150–250 dòng, warning sau 300 dòng/32 KiB và fail sau 500 dòng/64 KiB. Lịch sử chi tiết không được copy vào snapshot.

Quyết định owner ngày 2026-08-02 thay thế feature freeze toàn cục. Validation vẫn bắt buộc trong từng workstream.

Tài liệu cũ vẫn là lịch sử, không được dùng để biến một feature đã merge thành “chưa làm”. Không dùng competitor parity để tự mở rộng sang bank sync, AI advice, OCR, household finance, investments, full FX accounting hoặc native app.

Stack hiện tại: Next.js · TypeScript · Tailwind · shadcn/Base UI · Supabase · Node tests · Playwright · k6 · Vercel.
