# Money Flow — Research series

Khung nghiên cứu **ứng dụng web quản lý thu chi cá nhân** (không code trong giai đoạn research).

| Giai đoạn | File | Status |
|---|---|---|
| 1. Research plan | [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md) | **Done** 2026-07-15 |
| 2. User + competitors | [02_USER_AND_COMPETITORS.md](./02_USER_AND_COMPETITORS.md) | **Done** 2026-07-15 |
| 3. Domain rules | [03_DOMAIN_RULES.md](./03_DOMAIN_RULES.md) | **Done** 2026-07-15 |
| 4. Open source | [04_OPEN_SOURCE_ANALYSIS.md](./04_OPEN_SOURCE_ANALYSIS.md) | **Done** 2026-07-15 |
| 5. Product + architecture synthesis | [05_PRODUCT_AND_ARCHITECTURE.md](./05_PRODUCT_AND_ARCHITECTURE.md) | **Done** 2026-07-15 |

## Active reference maps

| Reference | File | Purpose | Status |
|---|---|---|---|
| Finance product repositories | [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) | Repo tham khảo theo từng phần của sản phẩm MoneyFlow: ledger, capture, import/export, budget, recurring, reports, UI, security và verification | **Active** 2026-08-01 |
| Engineering foundations | [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) | AI coding, research, product direction, project organization, clean code, architecture, testing, security, CI/CD, documentation và nền tảng học tập | **Active** 2026-08-01 |

Hai reference map là chỉ mục nghiên cứu, không phải roadmap hay dependency manifest. Mỗi feature work packet chỉ nên chọn 2–4 nguồn liên quan trực tiếp và phải ghi rõ giới hạn áp dụng.

**Lưu ý:** Bộ docs này là luật định vị **thu chi cá nhân**. Autopilot code (`AGENT_BACKLOG`) từng nghiêng Inbox — ưu tiên task khớp Phần F/H của file 05.

Stack mục tiêu: Next.js · TypeScript · Tailwind · shadcn · Supabase · Vitest · Playwright · Vercel.
