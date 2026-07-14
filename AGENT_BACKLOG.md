# Agent Backlog — Money Flow Autopilot

> Agent đọc file này **trước mỗi phiên**. Chỉ làm **một** task `ready`.
> Sau khi xong: `done` + `Completed` + commit SHA; lint/typecheck/test; push `origin main` nếu pass.

## Tự động

1. `ready` &lt; 2 → `bash scripts/agent-refill-backlog.sh` (từ `AGENT_ROADMAP.md`)
2. Không chờ user tạo task
3. Thứ tự ưu tiên: **số TASK nhỏ hơn trước** trong các task `ready`
4. **Luật sản phẩm:** `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` + `docs/AUTOPILOT_PLAN.md`
5. **Cấm:** đổi landing sang hộp thư; bank sync; AI advisor; family; OCR; envelope onboarding

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
- **Status:** `done`
- **Mô tả:** `/timeline` wraps or redirects to approved transactions list (reuse transactions-page with copy “đã duyệt”). Empty → CTA Inbox. Wireframes §16.
- **Done khi:** route usable; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `435fe49` `/timeline` + TransactionsPage variant timeline; empty CTA Inbox.

### TASK-013 — Insights demote dashboard
- **Status:** `done`
- **Mô tả:** Move current dashboard to `/insights`; `/` logged-in users redirect to `/inbox`. Landing stays public on `/` when logged out. Wireframes §17.
- **Done khi:** home routing correct; insights still show safe-to-spend; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `42ada1f` `/insights` dashboard + `/` logged-in → `/inbox`; landing public when logged out.

### TASK-014 — Rules page stub
- **Status:** `done`
- **Mô tả:** `/rules` list local rules JSON in localStorage; add simple contains→category rule; apply on parse optionally. Wireframes §14. Minimal.
- **Done khi:** CRUD rules local; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `572b443` `/rules` localStorage CRUD contains→category; optional apply on paste parse.

### TASK-015 — Import history
- **Status:** `done`
- **Mô tả:** `/imports` list batches from store; delete raw meta; link preview. Wireframes §15.
- **Done khi:** page works; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `4b1f2bd` `/imports` list batches + Xóa raw (meta+draft) + link preview/Inbox.

### TASK-016 — Privacy settings
- **Status:** `done`
- **Mô tả:** `/settings/privacy` retention options local prefs; opt-in improve parser default off. Wireframes §18.
- **Done khi:** prefs persist; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `d3f5ec2` `/settings/privacy` local retention + improve-parser opt-in default off.

### TASK-017 — Export data page
- **Status:** `done`
- **Mô tả:** `/settings/export` export approved txns and/or candidates CSV client-side. Wireframes §19. Reuse reports CSV escape if possible.
- **Done khi:** download works; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `7c3192e` `/settings/export` CSV/JSON client-side + date range + lastExport stamp.

### TASK-018 — Delete account UI
- **Status:** `done`
- **Mô tả:** `/settings/delete-account` type XÓA confirm; clear local stores; if Supabase call delete or signOut + document server delete limitation. Wireframes §20. Careful destructive.
- **Done khi:** local wipe works; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `63cc8e8` /settings/delete-account type XÓA + clear local + signOut; server hard-delete documented.

### TASK-019 — Settings hub + error page polish
- **Status:** `done`
- **Mô tả:** `/settings` index links privacy/export/delete/appearance; polish `error.tsx` per wireframes §21. Loading skeletons on inbox if missing.
- **Done khi:** settings hub; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `bbf6328` /settings hub + appearance theme + error §21 polish; inbox skeletons already present.

### TASK-020 — Autopilot smoke + README autopilot section
- **Status:** `done`
- **Mô tả:** Ensure scripts executable; README section how to start/stop daemon; `bash scripts/agent-pick-task.sh` works; no code feature required beyond docs verify.
- **Done khi:** docs accurate; scripts ok.
- **Completed:** 2026-07-15 — `99de308` scripts +x; README daemon start/stop/pick; pick-task verified.

---


### TASK-021 — PWA share target capture
- **Status:** `done`
- **Mô tả:** Web app manifest share_target → `/capture/share` queue text/files into inbox store.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `d0dc0f6` manifest share_target + `/capture/share` POST bridge → inbox candidates (text/CSV).

### TASK-022 — XLSX parse
- **Status:** `done`
- **Mô tả:** Parse first sheet xlsx with lightweight lib or document CSV-only until justified dependency.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `74fcf81` first-sheet xlsx via sheetjs → statement matrix + upload preview (source xlsx).

### TASK-023 — PDF text extract one bank template
- **Status:** `done`
- **Mô tả:** Text-layer PDF sample fixture + parser; no OCR.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `2332130` text-layer PDF MF DEMO BANK fixture + parser (no OCR); upload → preview source pdf.


### TASK-024 — Supabase migration import_batches + candidates
- **Status:** `done`
- **Mô tả:** Persist inbox server-side with RLS; migrate from local store when authed.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `5e1f8bc` import_batches + inbox_candidates RLS; migrate local when authed; capture/inbox dual store.

### TASK-025 — Duplicate + transfer detection
- **Status:** `done`
- **Mô tả:** Fingerprint duplicates; suggest transfer pairs opposite amount same day.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `0b27a7e` fingerprint + transfer-pair detect; Inbox badges/filters/explain.

### TASK-026 — Keyboard shortcuts inbox
- **Status:** `done`
- **Mô tả:** j/k, x select, a approve, c capture, n quick add per wireframes.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `73aa479` j/k focus, x select, a approve, c capture, n quick add.


### TASK-027 — Budgets/goals under Insights only
- **Status:** `done`
- **Mô tả:** Ensure primary nav stays inbox-first; budgets/commitments/goals linked from Insights or More.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `9136daf` planning under Insights hub + More Kế hoạch; primary nav stays inbox-first.

### TASK-028 — Landing A/B microcopy polish VN
- **Status:** `done`
- **Mô tả:** Tighten landing after user feedback; no layout clone.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `10ab1fc` landing VN microcopy polish (no layout clone); drop EN jargon.

### TASK-029 — E2E smoke playwright inbox happy path
- **Status:** `done`
- **Mô tả:** Optional playwright: landing → register skip → paste → inbox visible.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — 1a9b197 e2e smoke landing→register skip→paste→inbox (demo mode)


### TASK-030 — Security pass raw logs
- **Status:** `done`
- **Mô tả:** Ensure no raw statement in console/toasts/analytics.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `b235880` safe-log + safe-analytics; error/toasts redact raw; unit tests


### TASK-031 — Wire privacy-safe analytics events on capture
- **Status:** `done`
- **Mô tả:** Call trackProductEvent on paste/upload/import commit with counts/source only (use safe-analytics); never raw. Optional dev no-op sink OK.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `3853e0e` paste_analyzed/committed + import_batch_created/committed/cancelled via safe-analytics (counts/source only)

### TASK-032 — Mask account numbers in UI snippets
- **Status:** `done`
- **Mô tả:** Redact/mask STK-like digit runs in raw_snippet display (review/explain/preview) while keeping merchant readable; pure helper + tests.
- **Source:** roadmap pool refill
- **Completed:** 2026-07-15 — `42724ee` mask-account helper + tests; review/explain/paste display mask STK (merchant + money kept)

### TASK-033 — Retention job clear expired import raw
- **Status:** `cancelled`
- **Note:** Deferred post Wave A; privacy prefs already exist.
- **Mô tả:** Honor privacy rawRetention: on load/inbox, drop import drafts older than 7/30 days or immediately when delete_now; keep batch meta.
- **Source:** roadmap pool refill

### TASK-034 — Merchant normalize dictionary v1
- **Status:** `cancelled`
- **Note:** Deferred P2 capture polish.
- **Mô tả:** Local map common VN merchant aliases (Grab, Highlands, Shopee…) → display name + optional default category hint on parse.
- **Source:** roadmap pool refill


---

## Hàng đợi Wave A–C — Thu chi MVP (theo AUTOPILOT_PLAN.md)

> Capture/Inbox TASK-001…030 = **done** (module phụ).  
> Auto **chỉ** lấy task `ready` dưới đây (MF-100+).

### TASK-100 — Default home logged-in → /insights
- **Status:** `done`
- **Mô tả:** Đổi post-auth redirect và `/` khi đã login từ `/inbox` sang `/insights` (Tổng quan thu chi). Cập nhật `auth-redirect.ts` + proxy + tests. Không xóa route inbox. Tham chiếu docs/AUTOPILOT_PLAN.md Wave A MF-100 và research G5.
- **Done khi:** login/register/onboarding skip → insights; tests auth-redirect pass; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `1675e6d` POST_AUTH_REDIRECT + `/` logged-in + onboarding skip → `/insights`; inbox route kept.

### TASK-101 — Nav IA thu chi (primary Tổng quan)
- **Status:** `done`
- **Mô tả:** Cập nhật app-shell + nav-ia: primary desktop/mobile = Tổng quan(/insights), Giao dịch(/transactions), Capture(/capture), Tài khoản(/accounts), More. Inbox chuyển More hoặc dưới Capture. Budgets/commitments/goals vẫn secondary (Insights cards / More Kế hoạch). Tests nav-ia. Không clone competitor.
- **Done khi:** nav matches G5; tests pass; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `2bb7d3c` primary Tổng quan·Giao dịch·Capture·Tài khoản·More; Inbox → More + Capture sheet.

### TASK-102 — Onboarding thu chi (ví + ghi chi + insights)
- **Status:** `done`
- **Mô tả:** Viết lại onboarding 3 bước: (1) trust no bank password + export (2) xác nhận/tạo ví tiền mặt (3) optional quick expense hoặc skip → /insights. Bỏ bắt buộc paste/upload làm bước chính. Cập nhật onboarding.ts tests.
- **Done khi:** flow thu chi; ends at insights; tests pass.
- **Completed:** 2026-07-15 — `46567fd` onboarding trust + ví tiền mặt + optional quick expense → /insights; no paste/upload primary.

### TASK-103 — Insights dashboard G5 widgets
- **Status:** `done`
- **Mô tả:** Polish /insights: số dư tổng, thu tháng, chi tháng, ròng, top categories (list/bar không pie home), recent txns, safe-to-spend secondary + 1 dòng giải thích, CTA Ghi chi, cards budget/commitment/goal. Loading/empty/error. Dùng finance.ts existing.
- **Done khi:** 4 câu JTBD trả lời được trên 1 màn; states OK; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `2837d68` G5 insights: KPI số dư/thu/chi/ròng, top categories bar, recent, safe-to-spend secondary + Ghi chi.

### TASK-104 — Lock landing thu chi (regression test)
- **Status:** `done`
- **Mô tả:** Thêm test (node test) assert landing source hoặc exported copy strings: phải có "có thể chi" hoặc "thu chi"; forbid "Hộp thư cho mọi giao dịch" và "Universal Financial Inbox". Không đổi layout landing đang G5 trừ khi broken.
- **Done khi:** test fail nếu revert inbox copy; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `b7d5cdd` landing-copy.test.ts locks G5 thu chi / có thể chi; forbids inbox slogans.

### TASK-105 — Global CTA Ghi chi tiêu (quick add)
- **Status:** `done`
- **Mô tả:** AppShell primaryAction/FAB mặc định mở quick add expense (dialog hoặc /capture/quick) label "Ghi chi tiêu". Insights/transactions dùng cùng pattern. Shortcut N giữ.
- **Done khi:** CTA rõ trên desktop+mobile; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `624cca2` AppShell default Ghi chi tiêu → /capture/quick; Insights/tx dialog same label; N giữ.

### TASK-106 — Soft-delete undo toast transactions
- **Status:** `done`
- **Mô tả:** Khi xóa giao dịch (soft delete), toast 8s với Hoàn tác gọi restore nếu API/demo hỗ trợ; không thì document limitation. Calm copy.
- **Done khi:** undo path works demo và/hoặc server; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `3928fab` soft-delete toast 8s + Hoàn tác; demo restore + RPC restore_money_transaction; limitation doc.

### TASK-107 — Category manager tối thiểu
- **Status:** `done`
- **Mô tả:** UI thêm/đổi tên/ẩn (archive) category income+expense cho user; không subcategory. Settings hoặc trang /categories. Seed defaults giữ. Validate name unique per kind.
- **Done khi:** CRUD category; tests domain; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `571a50a` /categories add/rename/archive; unique name per kind; migration is_archived; seed defaults kept.

### TASK-108 — Budget threshold calm UI
- **Status:** `done`
- **Mô tả:** Budgets page + insights card: 80% "Gần hạn mức", 100%+ "Đã vượt X" — không guilt language. Colors + text not color alone.
- **Done khi:** copy/states; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `8426ee3` calm thresholds: Gần hạn mức (80%) / Đã vượt X (100%+); lib helpers + budgets page + Insights card; text+color.

### TASK-109 — Export CSV discoverability
- **Status:** `done`
- **Mô tả:** Link/button Xuất CSV từ /insights và /reports trỏ /settings/export hoặc trigger download. Reuse export-data.ts formula escape tests.
- **Done khi:** 1 click path từ insights; tests pass.
- **Completed:** 2026-07-15 — `c143426` Insights Xuất CSV → /settings/export; Reports download + shared export-data paths/tests.

### TASK-110 — Static /privacy policy VN
- **Status:** `done`
- **Mô tả:** Trang /privacy nội dung VN tối thiểu: data thu thập, không password NH, RLS, retention, export/xóa, liên hệ. Link footer landing + register. Không legalese copy đối thủ.
- **Done khi:** page public; links; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `b7b9bf8` public `/privacy` VN: data/no bank pwd/RLS/retention/export-xóa/liên hệ; footer + register links.

### TASK-111 — Page states audit P0 routes
- **Status:** `done`
- **Mô tả:** Audit /insights /transactions /accounts /budgets /reports /settings: mỗi trang loading.tsx hoặc skeleton, empty, error boundary/inline. Fix thiếu.
- **Done khi:** checklist trong PR message; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `09269b8` P0 loading skeletons + segment error.tsx (RouteError) + root home /insights; empty/dataError already OK; checklist tests.

### TASK-112 — Mobile responsive pass core
- **Status:** `done`
- **Mô tả:** Kiểm tra mobile CSS: bottom nav 5, FAB không che list cuối, dialogs full-width, tables scroll. Fix regressions insights/transactions/accounts.
- **Done khi:** no horizontal overflow major pages; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `68588b7` mobile chrome: 5-tab nav + safe-area, FAB clearance, full-width dialogs, table-scroll; insights/tx/accounts regressions.

### TASK-113 — Demo mode banner
- **Status:** `done`
- **Mô tả:** Khi viewer.isDemo, banner sticky "Chế độ demo — dữ liệu lưu trên trình duyệt" + CTA Đăng ký. AppShell.
- **Done khi:** banner; lint/typecheck/test pass.
- **Completed:** 2026-07-15 — `06568ef` sticky demo banner under topbar + Đăng ký CTA; source contract test.

### TASK-114 — Commitments pay flow polish
- **Status:** `in_progress`
- **Mô tả:** Pay commitment → expense ledger; empty/error; reserve hiển thị trên insights. Fix bugs only, no new product.
- **Done khi:** happy path + tests commitments; lint/typecheck/test pass.

### TASK-115 — Goals card on Insights
- **Status:** `ready`
- **Mô tả:** Featured goal progress trên insights; link /goals; empty CTA tạo mục tiêu.
- **Done khi:** card; lint/typecheck/test pass.

### TASK-116 — E2E expense path Playwright
- **Status:** `ready`
- **Mô tả:** Playwright: open landing → demo or login → add expense via quick add → insights/dashboard shows amount → open export or download path. Không phụ thuộc inbox. Update/replace inbox-only smoke nếu conflict.
- **Done khi:** e2e script documented in package.json; pass locally; lint/typecheck/test pass.

### TASK-117 — Expand domain unit tests
- **Status:** `ready`
- **Mô tả:** Tests: balance after expense/edit/soft-delete; transfer excluded from expense totals; budget spent ignores transfer; safe-to-spend non-negative integer.
- **Done khi:** new tests green; lint/typecheck/test pass.

### TASK-118 — Document RLS verification
- **Status:** `ready`
- **Mô tả:** docs/security-rls-check.md: how to run existing SQL tests or manual checklist; fix gaps if easy. Không require live prod.
- **Done khi:** doc + any script; lint/typecheck/test pass.

### TASK-119 — A11y baseline pass
- **Status:** `ready`
- **Mô tả:** Labels on money forms; focus visible; expense/income not color-only (+/−); dialog focus trap check. Fix critical issues on insights + add dialog.
- **Done khi:** notes in PR; lint/typecheck/test pass.

### TASK-120 — Production build green
- **Status:** `ready`
- **Mô tả:** `npm run build` must pass. Fix eslint setState-in-effect in inbox-review-panel and any TS errors. Prefer minimal fix.
- **Done khi:** build exit 0; lint/typecheck/test pass.

### TASK-121 — Soft rate limit note + basic guard
- **Status:** `ready`
- **Mô tả:** Simple rate limit on upload/import server action or document middleware plan; client debounce double-submit already via idempotency.
- **Done khi:** guard or doc; lint/typecheck/test pass.

### TASK-122 — Transactions list pagination or cap
- **Status:** `ready`
- **Mô tả:** If list can be huge, paginate or "load more" 50; keep filters. Demo OK.
- **Done khi:** no render 1000 rows at once; lint/typecheck/test pass.

### TASK-123 — Mask account-like digits in snippets
- **Status:** `cancelled`
- **Note:** Covered by TASK-032 (`mask-account.ts` + UI display + tests).
- **Mô tả:** Helper mask STK patterns in raw snippets UI (inbox/review); unit tests. Never log unmasked via safe-log.
- **Done khi:** tests; lint/typecheck/test pass.

### TASK-124 — README G5 product section
- **Status:** `ready`
- **Mô tả:** README: positioning thu chi, run dev, quality commands, link docs/research/05 and AUTOPILOT_PLAN, autopilot start/stop. Remove inbox-only product claim as primary.
- **Done khi:** README accurate; lint/typecheck/test pass.

### TASK-125 — AGENTS.md guardrails G5
- **Status:** `ready`
- **Mô tả:** Update AGENTS.md: product law G5; forbid landing inbox slogan; forbid bank sync/AI/family tasks; point AUTOPILOT_PLAN wave order.
- **Done khi:** AGENTS.md updated; lint/typecheck/test pass.


## Nhật ký

| Date | Task | Note |
|------|------|------|
| 2026-07-15 | TASK-113 | `06568ef` demo sticky banner + Đăng ký when viewer.isDemo |
| 2026-07-15 | TASK-112 | `68588b7` mobile pass: bottom nav 5 + FAB clear + dialogs full-width + table scroll |
| 2026-07-15 | TASK-111 | `09269b8` P0 page states: loading skeletons + error.tsx per route; empty/inline OK |
| 2026-07-15 | TASK-110 | `b7b9bf8` static /privacy policy VN + footer/register links |
| 2026-07-15 | TASK-109 | `c143426` export CSV discoverability: Insights → /settings/export; Reports period download paths |
| 2026-07-15 | TASK-108 | `8426ee3` budget calm thresholds: Gần hạn mức / Đã vượt X; text+color on budgets + Insights |
| 2026-07-15 | TASK-107 | `571a50a` /categories add/rename/archive; unique per kind; is_archived migration |
| 2026-07-15 | TASK-106 | `3928fab` soft-delete undo toast 8s Hoàn tác (demo + restore RPC); migration limitation documented |
| 2026-07-15 | TASK-105 | `624cca2` global CTA Ghi chi tiêu (topbar+FAB → quick add); Insights/tx same pattern |
| 2026-07-15 | TASK-104 | `b7d5cdd` landing-copy regression: require thu chi/có thể chi; forbid inbox slogans |
| 2026-07-15 | TASK-103 | `2837d68` insights G5: số dư/thu/chi/ròng + top categories bar + safe secondary + Ghi chi |
| 2026-07-15 | TASK-102 | `46567fd` onboarding thu chi: trust + ví tiền mặt + optional ghi chi → /insights |
| 2026-07-15 | TASK-101 | `2bb7d3c` nav IA thu chi: Tổng quan·Giao dịch·Capture·Tài khoản·More; Inbox demoted |
| 2026-07-15 | TASK-100 | `1675e6d` post-auth + home + onboarding skip → /insights (Tổng quan thu chi) |
| 2026-07-15 | TASK-032 | `42724ee` mask STK-like digits in raw_snippet UI (review/explain/paste); pure helper + tests |
| 2026-07-15 | TASK-031 | `3853e0e` wire trackProductEvent on paste/upload/import commit (counts/source only) |
| 2026-07-15 | TASK-030 | `b235880` no raw statement in console/toasts/analytics (safe-log + safe-analytics) |
| 2026-07-15 | TASK-029 | 1a9b197 Playwright E2E smoke landing→onboarding skip→paste→inbox |
| 2026-07-15 | TASK-028 | `10ab1fc` landing VN microcopy polish — wireframe hero, no EN jargon, layout unchanged |
| 2026-07-15 | TASK-027 | `9136daf` budgets/commitments/goals under Insights + More (not primary nav) |
| 2026-07-15 | TASK-026 | `73aa479` inbox keyboard j/k x a c n (desktop power) |
| 2026-07-15 | TASK-025 | `0b27a7e` fingerprint duplicates + transfer pairs (opposite amount same day) in Inbox |
| 2026-07-15 | TASK-024 | `5e1f8bc` import_batches + inbox_candidates RLS; local→server migrate when authed |
| 2026-07-15 | TASK-023 | `2332130` PDF text-layer MF DEMO BANK fixture + parser (no OCR); upload accept .pdf |
| 2026-07-15 | TASK-022 | `74fcf81` first-sheet XLSX/XLS parse (xlsx) → Import Preview; share still Upload-only |
| 2026-07-15 | TASK-021 | `d0dc0f6` PWA share_target → /capture/share queue text/CSV into inbox |
| 2026-07-15 | TASK-020 | `99de308` README autopilot start/stop + scripts executable + pick-task ok |
| 2026-07-15 | TASK-019 | `bbf6328` /settings hub + appearance + error §21; inbox skeletons ok |
| 2026-07-15 | TASK-018 | `63cc8e8` /settings/delete-account XÓA confirm + wipe local + signOut |
| 2026-07-15 | TASK-017 | `7c3192e` /settings/export CSV/JSON giao dịch + ứng viên client-side |
| 2026-07-15 | TASK-016 | `d3f5ec2` /settings/privacy retention + improve parser opt-in off |
| 2026-07-15 | TASK-015 | `4b1f2bd` /imports lịch sử import + Xóa raw + preview links |
| 2026-07-15 | TASK-014 | `572b443` /rules local rules + apply on parse optional |
| 2026-07-15 | TASK-013 | `42ada1f` /insights demote dashboard; / → /inbox when logged in |
| 2026-07-15 | TASK-012 | `435fe49` /timeline đã duyệt + empty CTA Inbox |
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
