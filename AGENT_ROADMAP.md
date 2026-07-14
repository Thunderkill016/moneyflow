# Agent Roadmap — Money Flow (pool for refill)

Tasks not yet in backlog or future after TASK-020.  
`agent-refill-backlog.sh` pulls `### TASK-xxx` blocks with status `pool` into backlog as `ready`.

### TASK-021 — PWA share target capture
- **Status:** `pool`
- **Mô tả:** Web app manifest share_target → `/capture/share` queue text/files into inbox store.
- **Priority:** P2

### TASK-022 — XLSX parse
- **Status:** `pool`
- **Mô tả:** Parse first sheet xlsx with lightweight lib or document CSV-only until justified dependency.
- **Priority:** P2

### TASK-023 — PDF text extract one bank template
- **Status:** `pool`
- **Mô tả:** Text-layer PDF sample fixture + parser; no OCR.
- **Priority:** P2

### TASK-024 — Supabase migration import_batches + candidates
- **Status:** `pool`
- **Mô tả:** Persist inbox server-side with RLS; migrate from local store when authed.
- **Priority:** P1

### TASK-025 — Duplicate + transfer detection
- **Status:** `pool`
- **Mô tả:** Fingerprint duplicates; suggest transfer pairs opposite amount same day.
- **Priority:** P1

### TASK-026 — Keyboard shortcuts inbox
- **Status:** `pool`
- **Mô tả:** j/k, x select, a approve, c capture, n quick add per wireframes.
- **Priority:** P2

### TASK-027 — Budgets/goals under Insights only
- **Status:** `pool`
- **Mô tả:** Ensure primary nav stays inbox-first; budgets/commitments/goals linked from Insights or More.
- **Priority:** P2

### TASK-028 — Landing A/B microcopy polish VN
- **Status:** `pool`
- **Mô tả:** Tighten landing after user feedback; no layout clone.
- **Priority:** P3

### TASK-029 — E2E smoke playwright inbox happy path
- **Status:** `pool`
- **Mô tả:** Optional playwright: landing → register skip → paste → inbox visible.
- **Priority:** P2

### TASK-030 — Security pass raw logs
- **Status:** `pool`
- **Mô tả:** Ensure no raw statement in console/toasts/analytics.
- **Priority:** P1
