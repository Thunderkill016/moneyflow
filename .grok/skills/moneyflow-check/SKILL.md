---
name: moneyflow-check
description: >
  Verify MoneyFlow changes: product law, domain money rules, tests, and build.
  Use after implementing features, before push, or when user says check work,
  verify, /moneyflow-check, /check moneyflow.
metadata:
  short-description: "MoneyFlow verify gates"
---

# MoneyFlow Check

## Checklist

1. **Product law:** no inbox-brand landing; no forbidden features
2. **Money:** integer only; transfer not expense in reports
3. **Diff scope:** no unrelated refactors
4. **Commands:**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
5. If routes/layout/perf: `npm run build` and/or `npm run test:e2e`
6. **Manual spot:** empty state 1 CTA; Ghi chi still primary

## Verdict

- List what was verified with evidence (command exit codes)
- If fail: fix or mark blocked with exact error
- If pass: safe to commit/push
