# Agent Roadmap — Money Flow (pool for refill)

**Law:** `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` + `docs/AUTOPILOT_PLAN.md`

Active queue lives in `AGENT_BACKLOG.md` as **TASK-100…125** (Wave A–C).  
When backlog `ready` &lt; 2, refill **only** `pool` items below (never invent bank sync / AI / inbox-brand).

---

## Post Wave C (pool)

### TASK-126 — Weekly review email stub (optional)
- **Status:** `pool`
- **Mô tả:** Optional in-app weekly summary card (not email provider); calm copy. Skip if no demand.
- **Priority:** P3

### TASK-127 — Recurring income templates
- **Status:** `pool`
- **Mô tả:** Lương định kỳ as income template separate from bill commitments.
- **Priority:** P2

### TASK-128 — Split transaction
- **Status:** `pool`
- **Mô tả:** Split one expense across 2+ categories; ledger multi-entry. Post-MVP.
- **Priority:** P3

### TASK-129 — Multi-currency accounts read-only
- **Status:** `pool`
- **Mô tả:** Display FX accounts without transfer across currency. Post-MVP.
- **Priority:** P3

### TASK-130 — Push notification opt-in bills
- **Status:** `pool`
- **Mô tả:** Web push for due commitments; privacy-first. Post-MVP.
- **Priority:** P3

### TASK-131 — CSV import to ledger direct (skip inbox)
- **Status:** `pool`
- **Mô tả:** Power-user import mapped CSV → approved transactions with dedupe.
- **Priority:** P2

### TASK-132 — Performance budgets Lighthouse
- **Status:** `pool`
- **Mô tả:** Fix LCP/CLS on insights and landing; document scores.
- **Priority:** P2

### TASK-209 — PERF reduce insights client JS (dynamic panels)
- **Status:** `pool`
- **Mô tả:** Code-split heavy insights side panels if still in main chunk; keep KPI LCP path light.
- **Priority:** P2

### TASK-210 — BEST report export discoverability from Insights
- **Status:** `pool`
- **Mô tả:** Ensure Xuất CSV / báo cáo one obvious path from Tổng quan without burying in Settings only.
- **Priority:** P2

---

## Explicit never-pool

- Bank open banking production  
- AI advisor  
- Family workspace  
- OCR receipt cloud  
- Landing “Hộp thư giao dịch” as primary brand  
- AGPL code vendoring  

---

## Historical note

TASK-001…030 (Inbox/capture platform) are **completed** and remain in backlog as `done` history only. Do not re-open for “more inbox” unless human adds a scoped bugfix.
