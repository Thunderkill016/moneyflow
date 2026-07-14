# MoneyFlow

**MoneyFlow** — web quản lý **thu chi** cho người Việt: nhiều ví, ghi nhanh, thấy rõ tháng này tiền đi đâu, xuất được dữ liệu. Bình tĩnh, không phán xét.

Core jobs:

1. **Ghi thu/chi nhanh** (mục tiêu < 10 giây)
2. Biết **số dư** và **tháng này tiền đi đâu**
3. Insight phụ: **Hôm nay mình có thể chi bao nhiêu?**

**Không phải:** bank aggregator / Open Banking · AI tư vấn · kế toán doanh nghiệp · sản phẩm “Universal Financial Inbox”.

Paste / upload / hộp thư ứng viên = **công cụ nhập tùy chọn (P1)**, không phải định vị sản phẩm.

Auth + ledger PostgreSQL (Supabase). Không có credentials → **demo mode** (lưu trình duyệt).

**Luật sản phẩm:** [docs/research/05_PRODUCT_AND_ARCHITECTURE.md](docs/research/05_PRODUCT_AND_ARCHITECTURE.md) · [docs/AUTOPILOT_PLAN.md](docs/AUTOPILOT_PLAN.md) · [AGENTS.md](AGENTS.md) · [docs/PRODUCT.md](docs/PRODUCT.md)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth + database thật: [docs/supabase-setup.md](docs/supabase-setup.md).

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build

# RLS surface (static migrations; no Docker) — see docs/security-rls-check.md
npm run check:rls
# Optional local Supabase pgTAP (needs Docker): npm run test:db

# Optional E2E (Playwright): expense path + export smoke
# First time: npm run test:e2e:install
npm run test:e2e
```

## Autopilot (khi bạn ngủ)

Agent lấy **một** task `ready` (**TASK-100…125** — Wave thu chi MVP), code, lint/typecheck/test, commit, push `origin main`.

```bash
cd /home/thunder/Code/moneyflow
bash scripts/agent-pick-task.sh      # phải ra TASK-100+
bash scripts/agent-daemon-start.sh   # bật daemon
tail -f logs/agent/daemon.log
bash scripts/agent-daemon-stop.sh    # dừng
```

Chi tiết: [AGENT_AUTOPILOT.md](AGENT_AUTOPILOT.md) · [AGENT_BACKLOG.md](AGENT_BACKLOG.md) · [AGENT_ROADMAP.md](AGENT_ROADMAP.md) · [docs/AUTOPILOT_PLAN.md](docs/AUTOPILOT_PLAN.md)

## Docs

### Product (đọc trước)

- [Product & architecture (G5)](docs/research/05_PRODUCT_AND_ARCHITECTURE.md) — định vị thu chi, JTBD, non-goals
- [Autopilot plan (Wave A–C)](docs/AUTOPILOT_PLAN.md) — TASK-100…125
- [Product focus (simple)](docs/PRODUCT.md) — now vs later
- [Agent rules](AGENTS.md)

### Engineering & UX

- [UX principles](docs/UX_PRINCIPLES.md)
- [Design system](docs/design-system.md)
- [Supabase setup](docs/supabase-setup.md)
- [RLS verification](docs/security-rls-check.md)
- [Competitor & OSS research](docs/COMPETITOR_AND_OSS_RESEARCH.md)

### Historical / optional capture research

Capture/Inbox research is **optional tooling**, not the product identity:

- [UX research (legacy inbox-first)](docs/UX_RESEARCH_AND_REDESIGN.md)
- [Wireframes capture/inbox](docs/wireframes-inbox.md)
- [Wireframes (legacy dashboard-era)](docs/wireframes.md)
- [Research archive](docs/RESEARCH_PRODUCT_STRATEGY.md)

## Current scope

- Dashboard / insights: số dư, thu–chi tháng, top category, “có thể chi hôm nay”
- Ghi chi / thu nhanh; sửa / soft-delete; chuyển khoản 2-leg (không đếm expense)
- Nhiều ví: tiền mặt, NH, ví điện tử, thẻ tín dụng, tiết kiệm
- Ngân sách theo danh mục; commitments; mục tiêu tiết kiệm
- Báo cáo tuần/tháng/năm + export CSV
- Auth: email/password, Google OAuth, reset password; demo mode local
- PostgreSQL ledger + RLS; money = integer minor units (VND đồng)
- Optional capture: paste / CSV-XLSX-PDF / inbox candidates (không phải brand chính)

## Not production-ready yet

Schema RLS is declared in migrations and checked statically (`npm run check:rls`) plus optional local pgTAP (`npm run test:db`). Two-user cross-tenant integration tests, receipt attachments, and fuller legal flows are still recommended before handling real financial data. See [docs/security-rls-check.md](docs/security-rls-check.md).
