# plan.md — MoneyFlow Android mega-task build plan

## Milestones

1. **Harness** ✅ — 5 SKILL.md files (money-rules, neon-access, design-system, vietnam-constraints, test-before-pr), state files, mobile/AGENTS.md.
2. **Step Zero** ✅ — `mobile/android-app` branch pushed, PR #795 open.
3. **Phase 1 research** ✅ — RESEARCH_TOP_FINANCE_APPS.md (commit 196b8187): 8 apps, 13 COPY + 39 ADAPT → prioritized gap list D1–D25.
4. **Phase 2 audit** ✅ — AUDIT.md (e637143a): P0=0, P1=6, P2=7.
5. **Loop A fixes** ✅ — P1 batch 9181b367, P2 batch 6aeca6f3. AUDIT open count: 0.
6. **Loop B builds** (in progress, top-impact first):
   - D1 debt/loan tracking ✅ 432ecf7a (migrations written, prod apply pending owner)
   - D2 event budgets ✅ 2e303f21 (same pending-prod note)
   - D3 remainder card + threshold alerts — IN PROGRESS (subagent a04ad152)
   - D4 payee statistics + MoM deltas — pending
   - D5 review-loop polish — verify existing coverage first, then pending
   - D6–D25 remainder — pending, per research file order
7. **Re-audit + close** — after Loop B, re-run audit on touched surfaces; final DoD checklist; merge PRs on green CI.

## Deviation log

- Web parity patch for rules preview/apply (ec8591b9) shipped inside the mobile work — in-scope per v3, borderline per v4 scope rules; already committed, kept (reversible).
- Migrations are written but NOT applied to production Neon — product owner approval required by repo rules.
