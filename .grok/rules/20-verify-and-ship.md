# Verify & ship (always-on rule)

Before claiming done or push:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. Expense-path or R9/Q1 → `npm run test:e2e`
5. Build-sensitive or R10/Q2/Q3 → `npm run build` or `bash scripts/mvp-verify.sh`

Commit messages: complete sentences, why + what.  
Never force-push `main`. Never commit secrets or `.env.local`.
