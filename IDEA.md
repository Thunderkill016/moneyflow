# MoneyFlow — product IDEA (ship-feature source of truth)

**Stack lock:** Next.js App Router · TypeScript · Supabase Auth/Postgres/RLS · integer VND · Vietnamese UI  
**Law:** `AGENTS.md` + `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` (G5)

## Positioning

Web **thu chi cá nhân** cho người Việt: nhiều ví, ghi nhanh, thấy tháng này tiền đi đâu, xuất CSV.  
Không: bank sync · AI advisor · family · inbox brand · AGPL paste.

## MVP checklist (ship-feature picks next unchecked)

### Core daily loop
- [x] Auth + demo mode
- [x] Multi-wallet accounts
- [x] Categories expense/income
- [x] Quick add expense/income (dialog + `/capture/quick`)
- [x] Transfer ≠ expense (domain)
- [x] Insights: balance, thu, chi, top categories, recent
- [x] Safe-to-spend insight
- [x] Category monthly budgets
- [x] Commitments (bills) light
- [x] Goals light
- [x] Reports + CSV export path
- [x] Soft delete + undo
- [x] Onboarding → insights / ghi chi
- [x] Nav Core vs Nâng cao (inbox Advanced)
- [x] Landing G5 thu chi

### Quality bar (agent: prefer these next)
- [ ] **Q1** `npm run test:e2e` expense path always green (fix if red)
- [ ] **Q2** `npm run build` green with demo/placeholder Supabase env
- [ ] **Q3** `scripts/mvp-verify.sh` = lint + typecheck + test + build
- [ ] **Q4** Empty states: one primary CTA on budgets/goals/commitments/categories (audit + fix only if multi-CTA)
- [ ] **Q5** Mobile: FAB Ghi chi not covered by demo banner
- [ ] **Q6** Transfer subtitle “không tính chi” everywhere transfers list
- [ ] **Q7** Wire AppShell `searchBar` on `/transactions` for ⌘K focus (Lunch Money)
- [ ] **Q8** LCP: document current lab scores; one real CSS/font win if cheap

### Explicit not now
- [ ] ~~Bank sync~~ forbidden  
- [ ] ~~AI advisor~~ forbidden  
- [ ] ~~Family share~~ forbidden  
- [ ] ~~Full YNAB envelope~~ forbidden  

## How agent works

1. Skill **ship-feature**: next unchecked item under Quality bar  
2. Skill **test-driven-development**: test first when behavior changes  
3. Skill **verification-before-completion**: run lint/typecheck/test before done  
4. Skill **security-pass**: if touching auth/RLS/actions  
5. Skill **frontend-qa**: if UI layout/nav/dialog  

When all Quality bar checked → update `docs/MVP_SHIPPED.md`.
