---
name: moneyflow-rebuild
description: >
  Ship the next MoneyFlow rebuild/quality item from IDEA.md (R* then Q*).
  Use for autopilot, rebuild phases, landing/auth/dashboard polish, /rebuild, /ship R.
  Follows REBUILD_MASTER_PLAN + G5 + BEST_OF_MATRIX.
metadata:
  short-description: "Ship next IDEA R*/Q* item"
---

# MoneyFlow rebuild shipper

## Pick work

1. Open `IDEA.md`  
2. First unchecked `**R\d+**` else first `**Q\d+**`  
3. Read matching slice in `docs/REBUILD_MASTER_PLAN.md`  
4. Load: `surgical-coding` → `moneyflow-web` → `test-driven-development` if behavior → UI skills if visual  

## Implement

- Smallest vertical slice only  
- Core vs Lab: never promote inbox to brand  
- Prefer existing components (`EmptyState`, `AppShell`, dialogs)  

## Verify

```bash
npm run lint && npm run typecheck && npm run test
```

- R9 / Q1 → `npm run test:e2e`  
- R10 / Q2 / Q3 → `bash scripts/mvp-verify.sh` or `npm run build`  
- Then `moneyflow-check` / verification-before-completion  

## Close

1. Check off item in `IDEA.md`  
2. Commit + push `origin main`  
3. Do not invent backlog spam  
