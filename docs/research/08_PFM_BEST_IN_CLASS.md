# Best-in-class personal finance **web** — criteria for task generation

**Purpose:** Autopilot may **only** create tasks that close a real gap against these criteria.  
**Not allowed:** busywork (re-run green tests, “document nhật ký only”, infinite quality cycles without a product gap).

**Authority:** G5 positioning + industry PFM (Money Lover, YNAB, Actual, Firefly, Copilot, Monarch, Lunch Money, PocketGuard, Sheets).

---

## 1. What “best MVP web” means here

| Rank | Outcome for user (VN) | Industry source |
|------|----------------------|-----------------|
| 1 | Ghi chi **&lt; 10 giây**, không ma sát | Money Lover, Ivy |
| 2 | Biết **còn bao nhiêu** + **tháng này tiền đi đâu** | Universal JTBD, Monarch lite |
| 3 | **Số đúng**: CK không phải chi | Firefly, Actual, PTA |
| 4 | **Sở hữu dữ liệu**: xuất CSV dễ | Actual, Sheets culture |
| 5 | **Tin cậy**: privacy, không bank password, undo | Copilot/privacy apps |
| 6 | **Bình tĩnh**: không guilt, empty 1 CTA | Fintech UX 2025 |

**Out of scope for auto-tasks (never generate):**

- Bank open banking / Plaid  
- AI advisor / chatbot  
- Family sharing  
- Full YNAB envelope onboarding  
- Net-worth / invest hero  
- Inbox as brand  
- AGPL code paste  

---

## 2. Competitor → must-have pattern (Core only)

| Competitor | Pattern (1 best thing) | MoneyFlow acceptance (testable) |
|------------|------------------------|----------------------------------|
| **Money Lover** | Multi-ví + ghi siêu nhanh | Accounts CRUD; FAB/dialog amount focus; e2e ghi chi |
| **Ivy** | Recent categories + keypad flow | `recentCategoryIds` / order by recent; focus amount |
| **Firefly** | Transfer balanced, not expense | All sumExpense paths ignore transfer; list copy “không tính chi” |
| **Actual** | Export ownership + budget remaining | Insights ≤2 clicks to CSV; budget remaining mono |
| **Copilot** | Attention / to-review | Attention strip: near budget + due bills |
| **Monarch** | One overview dashboard | Insights KPI: balance, thu, chi, top cat, recent |
| **PocketGuard** | Safe-to-spend clarity | “Có thể chi” + 1 dòng giải thích luôn hiện |
| **Lunch Money** | Find transactions fast | Search on /transactions + keyboard shortcut |
| **Goodbudget** | Simple category limits | Monthly category budget near/over calm |
| **Sheets** | Export anytime | Formula-safe CSV; no lock-in |
| **YNAB** | (method only — do **not** clone) | — reject full envelope tasks |

---

## 3. Quality gates (generate task **only if fail**)

| Gate ID | Fail condition | Valid task type |
|---------|----------------|-----------------|
| `G_TRANSFER` | Transfer counted as expense anywhere | Domain + tests |
| `G_ENTRY` | Ghi chi path broken / no e2e | Fix e2e or entry UX |
| `G_EXPORT` | Export not reachable from Insights | Discoverability UI |
| `G_EMPTY` | Core empty state multi-CTA or none | One primary CTA |
| `G_NAV` | Inbox on primary / landing inbox brand | IA / landing copy |
| `G_ONBOARD` | Onboarding → inbox | Redirect paths |
| `G_TRUST` | No privacy/delete/export trust | Trust pages |
| `G_A11Y` | Money color-only | +/−/↔ signs |
| `G_VERIFY` | lint/typecheck/test/build **actually red** | Fix the failure (cite log) |
| `G_LCP` | No perf doc or CLS bad | Real perf mitigation + doc |

**Invalid tasks (never inject):**

- “Run tests; if green, only write nhật ký”  
- “Quality cycle N without named product gap”  
- “Research only” without code/test outcome  
- Features in non-goals above  

---

## 4. Task template (required fields)

Every auto-generated task **must** include:

1. **Competitor / source pattern** (who we match)  
2. **User JTBD** (one sentence VN)  
3. **Gap** (what is missing in code)  
4. **Done khi** (testable: file + behavior + `npm test`)  
5. **Non-goal** (what not to build)

Example:

```markdown
### TASK-6xx — COMP: Firefly transfer ≠ chi
- Competitor: Firefly double-entry transfer
- JTBD: Chuyển ví không làm “chi tháng” tăng sai
- Gap: weekly-summary still counts transfer
- Done khi: unit test weekly-summary excludes transfer; npm test pass
- Non-goal: multi-currency FX engine
```

---

## 5. Autopilot order

1. Fix **red** verify (G_VERIFY)  
2. Close **competitor Core gaps** (section 2) via scanner  
3. MVP definition gaps still open  
4. Only then polish (LCP, code-split) if Core all green  
5. All Core green + verify green → `MVP_SHIPPED.md`  

---

## 6. Sources (human research)

- G5: `docs/research/05_PRODUCT_AND_ARCHITECTURE.md`  
- Industry: `docs/research/06_INDUSTRY_SYNTHESIS.md`  
- GitHub OSS: `docs/research/07_GITHUB_OSS_BEST.md`  
- Best-of matrix: `docs/BEST_OF_MATRIX.md`  
