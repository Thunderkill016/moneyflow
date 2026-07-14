# Agent Backlog — Money Flow Autopilot

> Agent đọc file này **trước mỗi phiên**. Chỉ làm **một** task `ready`.
> Sau khi xong: `done` + `Completed` + commit SHA; lint/typecheck/test; push `origin main` nếu pass.

## Tự động

1. `ready` &lt; 2 → `bash scripts/agent-refill-backlog.sh` (từ `AGENT_ROADMAP.md`)
2. Không chờ user tạo task
3. Thứ tự ưu tiên: **số TASK nhỏ hơn trước** (wireframe screen order)

## An toàn

1. Một task / phiên
2. `npm run lint && npm run typecheck && npm run test` trước commit/push
3. Không sửa `.env.local`, secrets, không xóa migration
4. Không force-push `main`
5. Fail 2 lần → `blocked` + lý do

## Status

| Status | Ý nghĩa |
|--------|---------|
| `ready` | Agent được nhận |
| `in_progress` | Đang chạy |
| `done` | Xong |
| `blocked` | Cần người |

---

## Hàng đợi (Inbox-first UI theo wireframes)

### TASK-001 — Landing page Inbox-first
- **Status:** `done`
- **Mô tả:** Redesign public landing theo `docs/wireframes-inbox.md` §1: hero hộp thư, trust no bank password, 4 bước, fit, trust grid, mock Inbox preview. Không clone đối thủ.
- **Completed:** 2026-07-14 — `landing-page.tsx` + CSS landing + metadata.

### TASK-002 — Auth screens trust microcopy + privacy checkbox
- **Status:** `done`
- **Mô tả:** Polish `/login`, `/register`, forgot/update password per wireframes-inbox §2: microcopy “Dữ liệu của bạn thuộc về bạn”; register checkbox đồng ý privacy (link `#` hoặc section); errors inline; loading on submit; redirect sau login về `/inbox` nếu route đã có, else `/` (document). Không redesign form từ zero nếu `auth-form.tsx` đã ổn — chỉ copy + a11y + redirect target. Tham chiếu `docs/wireframes-inbox.md`.
- **Done khi:** auth pages match trust copy; lint/typecheck/test pass; commit.
- **Completed:** 2026-07-14 — `34402bc` trust microcopy + privacy checkbox + POST_AUTH_REDIRECT=`/` (inbox chưa có); a11y/errors/loading.

### TASK-003 — Onboarding 3-step first capture
- **Status:** `done`
- **Mô tả:** Add `/onboarding` (client or server): 3 steps — trust promises, choose first capture method (paste/upload/quick), CTA into capture or skip to inbox. Store `moneyflow-onboarding-done` in localStorage; after register redirect to onboarding if not done. Minimal UI using design tokens. Wireframes §3.
- **Done khi:** route works; skip path; lint/typecheck/test pass.
- **Completed:** 2026-07-14 — `0ce187e` `/onboarding` 3-step + `moneyflow-onboarding-done`; register → onboarding.

### TASK-004 — App shell Inbox-first navigation
- **Status:** `done`
- **Mô tả:** Update `app-shell.tsx` nav: desktop Inbox, Capture, Timeline, Accounts, Rules, Imports, Insights, Settings; mobile 5 tabs Inbox/Capture/Timeline/Accounts/More. Capture opens sheet or `/capture`. Badge placeholder for inbox count (0 ok). Active states; brand link → `/inbox`. Update `lib/supabase/proxy.ts` protectedPaths + post-auth redirect to `/inbox`. Wireframes §0/§4.
- **Done khi:** nav matches IA; old routes still reachable from More/Insights; lint/typecheck/test pass.
- **Completed:** 2026-07-14 — `9193653` app-shell IA + capture/more sheets; POST_AUTH=/inbox; protectedPaths

### TASK-005 — Financial Inbox page shell
- **Status:** `done`
- **Mô tả:** Create `/inbox` page with AppShell: filters chips, empty/loading/error states, candidate list from local store (`src/lib/inbox/candidate-store.ts` localStorage). Demo sample candidates if empty optional. Row: date, merchant, money mono, source badge, confidence badge. Primary Capture CTA. Wireframes §5. No full approve pipeline yet if TASK-011 pending — at least UI + store CRUD.
- **Done khi:** `/inbox` renders states; store unit-tested lightly; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `e29a2d3` `/inbox` + candidate-store localStorage + filters/states; demo seed.

### TASK-006 — Capture chooser
- **Status:** `done`
- **Mô tả:** `/capture` page or sheet: three actions Paste / Upload / Quick linking to subroutes. Mobile-friendly. Wireframes CaptureMenu.
- **Done khi:** routes + UI; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `13816e0` `/capture` CaptureMenu + shared CAPTURE_OPTIONS.

### TASK-007 — Paste Anything flow
- **Status:** `done`
- **Mô tả:** `/capture/paste`: textarea, source hint, Phân tích → parse text (regex VND, simple NL like `cafe 45k`) into candidates via store → redirect inbox or show preview count. Explain uncertain fields. `src/lib/inbox/parse-text.ts` + tests. Wireframes §6.
- **Done khi:** paste creates candidates; tests for parser; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `7508add` `/capture/paste` + parse-text VND/NL + preview uncertain → inbox candidates.

### TASK-008 — Quick Add in Capture
- **Status:** `done`
- **Mô tả:** `/capture/quick` reuses `AddTransactionDialog` or page form; optional also write a high-confidence candidate. Keep remember prefs + date + keep-open from existing dialog. Wireframes §7.
- **Done khi:** quick add works from capture route; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `52288cf` `/capture/quick` embedded AddTransactionDialog + date/keep-open/remember prefs + high-conf candidate mirror.

### TASK-009 — Upload statement UI + CSV parse
- **Status:** `done`
- **Mô tả:** `/capture/upload` dropzone max 10MB; accept csv/xlsx text csv first; parse CSV heuristic columns date/amount/desc; create import batch + candidates. Trust microcopy. `parse-csv.ts` + fixtures/tests. Wireframes §8.
- **Done khi:** CSV upload → candidates; tests; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `5827e33` `/capture/upload` dropzone + parse-csv + import-batch + candidates.

### TASK-010 — Import Preview
- **Status:** `done`
- **Mô tả:** `/imports/[batchId]/preview` or step after upload: show mapped columns, 10-row preview, summary counts, confirm “Đưa vào Inbox”. Wireframes §9.
- **Done khi:** preview gate before batch finalize; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `ea7e66c` `/imports/[batchId]/preview` gate + draft store; upload → preview → Inbox.

### TASK-011 — Review single + bulk bar + explain
- **Status:** `done`
- **Mô tả:** Candidate detail/review panel: edit fields, ExplainPanel (parser, rules, raw), approve → create real transaction via existing `useTransactions`/`createTransactionAction`, reject, bulk bar approve/reject/category. Never auto-post low conf without opt-in. Wireframes §10–12.
- **Done khi:** approve writes ledger (demo or server); bulk works; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `b22b5b8` review panel + explain + bulk approve/reject/category; low conf never auto-post.

### TASK-012 — Timeline route
- **Status:** `ready`
- **Mô tả:** `/timeline` wraps or redirects to approved transactions list (reuse transactions-page with copy “đã duyệt”). Empty → CTA Inbox. Wireframes §16.
- **Done khi:** route usable; lint/typecheck/test pass.

### TASK-013 — Insights demote dashboard
- **Status:** `ready`
- **Mô tả:** Move current dashboard to `/insights`; `/` logged-in users redirect to `/inbox`. Landing stays public on `/` when logged out. Wireframes §17.
- **Done khi:** home routing correct; insights still show safe-to-spend; lint/typecheck/test pass.

### TASK-014 — Rules page stub
- **Status:** `ready`
- **Mô tả:** `/rules` list local rules JSON in localStorage; add simple contains→category rule; apply on parse optionally. Wireframes §14. Minimal.
- **Done khi:** CRUD rules local; lint/typecheck/test pass.

### TASK-015 — Import history
- **Status:** `ready`
- **Mô tả:** `/imports` list batches from store; delete raw meta; link preview. Wireframes §15.
- **Done khi:** page works; lint/typecheck/test pass.

### TASK-016 — Privacy settings
- **Status:** `ready`
- **Mô tả:** `/settings/privacy` retention options local prefs; opt-in improve parser default off. Wireframes §18.
- **Done khi:** prefs persist; lint/typecheck/test pass.

### TASK-017 — Export data page
- **Status:** `ready`
- **Mô tả:** `/settings/export` export approved txns and/or candidates CSV client-side. Wireframes §19. Reuse reports CSV escape if possible.
- **Done khi:** download works; lint/typecheck/test pass.

### TASK-018 — Delete account UI
- **Status:** `ready`
- **Mô tả:** `/settings/delete-account` type XÓA confirm; clear local stores; if Supabase call delete or signOut + document server delete limitation. Wireframes §20. Careful destructive.
- **Done khi:** local wipe works; lint/typecheck/test pass.

### TASK-019 — Settings hub + error page polish
- **Status:** `ready`
- **Mô tả:** `/settings` index links privacy/export/delete/appearance; polish `error.tsx` per wireframes §21. Loading skeletons on inbox if missing.
- **Done khi:** settings hub; lint/typecheck/test pass.

### TASK-020 — Autopilot smoke + README autopilot section
- **Status:** `ready`
- **Mô tả:** Ensure scripts executable; README section how to start/stop daemon; `bash scripts/agent-pick-task.sh` works; no code feature required beyond docs verify.
- **Done khi:** docs accurate; scripts ok.

---

## Nhật ký

| Date | Task | Note |
|------|------|------|
| 2026-07-15 | TASK-011 | `b22b5b8` review panel + explain + bulk; low conf opt-in only |
| 2026-07-15 | TASK-010 | `ea7e66c` import preview map + 10-row table + Đưa vào Inbox gate |
| 2026-07-15 | TASK-009 | `5827e33` /capture/upload dropzone + parse-csv + import batch → inbox |
| 2026-07-15 | TASK-008 | `52288cf` /capture/quick + dialog date/keep-open/prefs + high-conf candidate |
| 2026-07-15 | TASK-007 | `7508add` /capture/paste + parse-text → inbox candidates |
| 2026-07-15 | TASK-006 | `13816e0` /capture chooser Paste/Upload/Quick |
| 2026-07-15 | TASK-005 | `e29a2d3` /inbox shell + candidate-store CRUD + demo rows |
| 2026-07-14 | TASK-004 | `9193653` Inbox-first nav + post-auth /inbox |
| 2026-07-14 | TASK-003 | `0ce187e` onboarding 3-step + register → /onboarding; skip → / until inbox |
| 2026-07-14 | TASK-002 | `34402bc` auth trust copy + privacy checkbox; redirect `/` until inbox |
| 2026-07-14 | TASK-001 | Landing Inbox-first shipped pre-autopilot |
