# plan.md — MoneyFlow Android mega-task build plan

## Milestones

1. **Harness** ✅ — 5 SKILL.md files (money-rules, neon-access, design-system, vietnam-constraints, test-before-pr), state files, mobile/AGENTS.md.
2. **Step Zero** ✅ — `mobile/android-app` branch pushed, PR #795 open.
3. **Phase 1 research** ✅ — RESEARCH_TOP_FINANCE_APPS.md (commit 196b8187): 8 apps, 13 COPY + 39 ADAPT → prioritized gap list D1–D25.
4. **Phase 2 audit** ✅ — AUDIT.md (e637143a): P0=0, P1=6, P2=7.
5. **Loop A fixes** ✅ — P1 batch 9181b367, P2 batch 6aeca6f3. AUDIT open count: 0.
6. **Loop B builds** ✅ — D1–D21 shipped, D22/D23 waived (DECISIONS.md),
   D24 shipped as a search-operator micro-slice (note-scoped `#` term in
   TransactionQuery + capture note hint), D25 resolved-parked (no billing
   surface exists to attach to). Per-item evidence in FIXLOG.md.
7. **Re-audit + close** ✅ — second adversarial pass over
   `e637143a..HEAD` (all Loop B feature files) filed zero new P0/P1/P2;
   recorded in AUDIT.md §"Re-audit — Loop B feature surface". Release
   AAB built (debug-signing escape hatch — no upload keystore locally);
   debug APK verified on UKMBCUTWIFYTOVDQ (dashboard renders neon-green
   dark theme at HEAD; cold start observed). Merge remains an owner
   decision on green CI.

## Deviation log

- Web parity patch for rules preview/apply (ec8591b9) shipped inside the mobile work — in-scope per v3, borderline per v4 scope rules; already committed, kept (reversible).
- Migrations are written but NOT applied to production Neon — product owner approval required by repo rules.
