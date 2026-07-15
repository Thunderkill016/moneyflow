# Competitor gap bar — task **hợp lý** từ kiến thức PFM best-in-class

**Authority:** `docs/research/08_PFM_BEST_IN_CLASS.md`  
**Scanner:** `scripts/agent-competitor-gap.py`  
**Mục tiêu:** So với web/app PFM tốt nhất → chỉ tạo task **đóng gap có JTBD + Done khi testable**.

## Cấm tạo task (vớ vẩn)

- “Chạy test nếu xanh chỉ ghi nhật ký”  
- “Quality cycle N” không chỉ ra gap sản phẩm  
- Feature non-goals G5 (bank sync, AI, family, envelope full, AGPL paste)  
- Task không có **competitor + JTBD + Done khi**

## Đối thủ → pattern Core

| Competitor | Pattern | Acceptance |
|------------|---------|------------|
| Money Lover / Ivy | Ghi nhanh + multi-ví | FAB/dialog, recent cats, accounts |
| Firefly / Actual | Transfer ≠ chi | tests + UI “không tính chi” |
| Monarch | Overview KPI | Insights đủ widget |
| PocketGuard | Safe-to-spend | + 1 dòng explain |
| Copilot | Attention | budget/bill strip |
| Actual / Sheets | Export | ≤2 click + CSV safe |
| Lunch Money | Search | filter + ⌘K |
| Goodbudget | Category budget | near/over, ignore transfer |
| G5 | Brand thu chi | landing + nav Lab |

## Ship

`docs/COMPETITOR_GAP_REPORT.md` **100% ✅** + no ready → `docs/MVP_SHIPPED.md`
