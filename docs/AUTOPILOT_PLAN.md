# Kế hoạch Autopilot — phần còn lại MoneyFlow (thu chi MVP)

**Ngày:** 2026-07-15  
**Luật:** `docs/research/05_PRODUCT_AND_ARCHITECTURE.md`  
**Backlog thực thi:** `AGENT_BACKLOG.md` → **TASK-100 … TASK-125**  
**Cấm auto:** landing “hộp thư”, bank sync, AI advisor, family, OCR, envelope YNAB, copy AGPL

## Hiện trạng

- **Đã có:** ledger, auth, accounts, budgets, goals, commitments, reports, settings (privacy/export/delete), capture/inbox module (TASK-001…031 done), landing thu chi (G5).
- **Lệch:** home login → `/inbox`; nav inbox-first; onboarding capture-first; E2E nghiêng inbox.

## 3 wave

### Wave A — Product alignment (P0) TASK-100…105
| ID | Việc |
|----|------|
| 100 | Login home → `/insights` |
| 101 | Nav: Tổng quan · Giao dịch · Capture · Tài khoản · More |
| 102 | Onboarding ví + ghi chi → insights |
| 103 | Insights widgets G5 (số dư, thu/chi, top category, recent, CTA) |
| 104 | Lock landing thu chi (regression test) |
| 105 | CTA global “Ghi chi tiêu” |

### Wave B — MVP polish (P0–P1) TASK-106…115
106 soft-delete undo · 107 category manager · 108 budget calm thresholds · 109 export discoverability · 110 /privacy page · 111 page states audit · 112 mobile pass · 113 demo banner · 114 commitments polish · 115 goals on insights

### Wave C — Quality / beta (P1–P2) TASK-116…125
116 E2E expense path · 117 domain tests · 118 RLS doc · 119 a11y · 120 build green · 121 rate limit · 122 list pagination · 123 mask STK · 124 README G5 · 125 AGENTS guardrails

## Exit
- Logged-in home = insights
- Add expense < 10s path
- Landing không bị revert inbox
- `npm test` + `npm run build` xanh
- Export tìm thấy từ insights

## Bật auto
```bash
cd /home/thunder/Code/moneyflow
bash scripts/agent-pick-task.sh   # → TASK-100
bash scripts/agent-daemon-start.sh
```

## Non-goals (reject)
Bank sync · AI · family · invest · OCR · inbox brand expansion

Chi tiết task: AGENT_BACKLOG.md section “Wave A–C”.
