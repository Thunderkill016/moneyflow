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

### TASK-031 — Wire privacy-safe analytics events on capture
- **Status:** `pool`
- **Mô tả:** Call trackProductEvent on paste/upload/import commit with counts/source only (use safe-analytics); never raw. Optional dev no-op sink OK.
- **Priority:** P2

### TASK-032 — Mask account numbers in UI snippets
- **Status:** `pool`
- **Mô tả:** Redact/mask STK-like digit runs in raw_snippet display (review/explain/preview) while keeping merchant readable; pure helper + tests.
- **Priority:** P1

### TASK-033 — Retention job clear expired import raw
- **Status:** `pool`
- **Mô tả:** Honor privacy rawRetention: on load/inbox, drop import drafts older than 7/30 days or immediately when delete_now; keep batch meta.
- **Priority:** P1

### TASK-034 — Merchant normalize dictionary v1
- **Status:** `pool`
- **Mô tả:** Local map common VN merchant aliases (Grab, Highlands, Shopee…) → display name + optional default category hint on parse.
- **Priority:** P2

### TASK-035 — Inbox empty-state onboarding tips
- **Status:** `pool`
- **Mô tả:** Empty Inbox: 3 tip cards (paste/upload/quick) + trust line; no dashboard charts. Wireframes §5.
- **Priority:** P3
