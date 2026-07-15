# Best-of-breed matrix — MoneyFlow

**Ngày:** 2026-07-15  
**Ý nghĩa:** “Tổng hợp tốt nhất” = **mỗi đối thủ lấy 1 pattern xuất sắc**, ghép thành daily loop — **không** copy hết feature.

## 1. Daily loop (đột phá)

| Bước | Pattern từ | MoneyFlow |
|---|---|---|
| Mở app → biết cần gì | Copilot “to review” | Attention strip trên Insights |
| Ghi chi 3–5s | Ivy + Money Lover FAB | Dialog + FAB “Ghi chi tiêu” |
| Còn chi được bao nhiêu | MoneyFlow USP | Safe-to-spend + giải thích |
| Số đúng, CK ≠ chi | Firefly / Actual | Ledger header+entries |
| Export | Sheets / Actual | CSV 1 click |
| Review tuần | Ritual (mới) | Weekly summary card |

## 2. Inventory & tier

| Feature | Source | Tier | Quality (1–5) | Notes |
|---|---|---|---|---|
| Multi accounts | ML | **Core** | 4 | Keep |
| Quick add expense/income | Ivy/ML | **Core** | 4 | Polish recent cats |
| Transfer | Firefly | **Core** | 4 | Copy “không tính chi” |
| Insights dashboard | Monarch lite | **Core** | 3→5 | Attention strip |
| Category budgets | Goodbudget lite | **Core** | 4 | Calm thresholds |
| Commitments (bills) | Firefly | **Core** | 4 | |
| Goals | Firefly piggy | **Core** | 3 | Featured card |
| Reports + CSV export | Actual/Sheets | **Core** | 4 | Discoverability |
| Soft delete + undo | SaaS | **Core** | 4 | |
| Search/filter txns | Lunch Money | **Core** | 4 | |
| Weekly summary | Ritual | **Core** | 3→4 | |
| Categories CRUD | All | **Core** | 4 | |
| Onboarding short | G5 | **Core** | 3 | |
| Auth | Supabase | **Core** | 4 | |
| Capture paste/upload/inbox | YNAB import spirit | **Power / Lab** | 3 | Advanced, not home |
| Rules | Actual | **Power** | 2–3 | Harden later |
| CSV direct import | Actual | **Power** | 3 | Advanced |
| Split expense | Power | **Lab** | 3 | Advanced only |
| Multi-currency RO | Wallet | **Lab** | 2 | Advanced |
| Web push bills | — | **Lab** | 2 | Settings only |
| Income templates | Firefly | **Power** | 3 | Planning secondary |
| PWA share | — | **Lab** | 2 | |
| AI / bank sync / family | Various | **Cut** | — | Forbidden MVP |

## 3. Tier rules (nav)

- **Core:** primary path (Tổng quan, Giao dịch, Ghi chi, Tài khoản, Kế hoạch cards)  
- **Power:** More → công cụ  
- **Lab:** More → **Nâng cao** (ẩn bớt noise)

## 4. Stability gates before new features

1. E2E: landing → ghi chi → insights cập nhật → export  
2. Demo + auth parity on create/delete/restore  
3. `npm test` + `build` green  

## 5. Next implementation (this PR)

- [x] Matrix doc  
- [x] Nav: Lab “Nâng cao” + primary “Nhập nhanh”  
- [x] Insights attention strip (budget / bill / inbox)  
- [x] Quick-add recent categories  
- [x] STAB/BEST backlog TASK-200–204  
- [x] STAB E2E happy path (TASK-200)  
- [x] Transfer list copy (TASK-203)  
- [x] Empty states one CTA (TASK-204)  
- [x] ⌘K search shortcut (TASK-205)  
- [x] Grok skills + industry synthesis (TASK-206)  
- [ ] LCP second pass (TASK-207 ready)

## 6. Product law (remember)

**Tổng hợp best-of ≠ feature dump.**  
Mỗi đối thủ lấy **một** pattern xuất sắc → ghép daily loop.  
Lab (inbox/import/rules) luôn dưới **Nâng cao**, không cạnh tranh brand “thu chi cá nhân”.
