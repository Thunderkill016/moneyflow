# progress.md — chronological action log

- 2026-10-16 ~02:00 — Step Zero: `mobile/android-app` pushed, PR #795 opened.
- 2026-10-16 — Phase 1: RESEARCH_TOP_FINANCE_APPS.md committed (196b8187) — 8 apps dissected, gap list D1–D25.
- 2026-10-16 — Phase 2: AUDIT.md committed (e637143a) — 0 P0, 6 P1, 7 P2.
- 2026-10-16 — Loop A P1 fixes committed (9181b367): auth-material log leak, int.parse overflow, share-text wrap, stable idempotency keys, in-flight dialog guards, vnToday consolidation.
- 2026-10-16 — Loop A P2 fixes committed (6aeca6f3): capture draft persistence, lazy activity ListView, honest dev-default docs, stranger-session drop, R8 minify (release APK 64.2MB), voice amount bound, boot probe timeout+hint.
- 2026-10-16 — Loop B D1 debts shipped (432ecf7a): debts+debt_repayments schema, 4 RPCs, DebtsPage, pgTAP 21 asserts.
- 2026-10-16 — Loop B D2 event budgets shipped (2e303f21): event_budgets+scope, view+3 RPCs, EventsPage+detail+form, pgTAP 24 asserts.
- 2026-10-16 — v4 harness: 5 SKILL.md aligned to canonical set (+vietnam-constraints), plan/findings/decisions/progress files created.
- IN FLIGHT — D3 remainder card + budget threshold alerts (subagent a04ad152).
- 2026-10-17 — Loop B D3–D8 landed under earlier commits on feat/mobile-theme (remainder card + threshold alerts, payee stats + MoM deltas, review-loop polish, rule suggestions, quick-fill chips, commitment calendar); see FIXLOG.md FEATURE entries.
- 2026-10-17 — Loop B D9–D11 shipped on feat/mobile-theme: month-close digest + in-app month summary card, device-local watchlist pin with optional threshold, goal prerequisite honesty + linked-funding detail sheet. "Include in monthly plan" toggle waived — no contract exists. dart format / flutter analyze clean; flutter test 1462 green (44 new).
- 2026-10-17 — Close-out: D24 shipped as note-scoped `#` search qualifier (TransactionQuery both evaluators + capture hint, +4 tests); D25 resolved-parked (no billing surface in repo). Re-audit of e637143a..HEAD: zero new findings (AUDIT.md). Release AAB built — 49.5MB, debug-signed via MF_ALLOW_DEBUG_RELEASE (no upload keystore locally; Play upload needs the real keystore). Debug APK installed on UKMBCUTWIFYTOVDQ — dashboard renders neon-green dark theme at HEAD (pixel-verified; ScreenShield required a local unshielded build to capture, reverted after); cold start ≈10–17s to dashboard in a debug build on this device, demo session.
