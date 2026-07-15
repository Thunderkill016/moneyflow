<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow — AGENTS.md (universal project rules)

**Runtime:** Grok CLI primary — `docs/AGENT_RUNTIME.md` · VIP stack — `docs/VIP_AGENT_STACK.md`  
**Work queue:** `IDEA.md` (**R*** rebuild → **Q*** quality). Not backlog spam.

## 1. Product law (G5)

| | |
|--|--|
| **Product** | Web **thu chi cá nhân** VN |
| **JTBD** | Ghi nhanh → số dư + tháng này tiền đi đâu |
| **Insight** | Có thể chi hôm nay (secondary, not inbox brand) |
| **Lab** | Inbox / paste / import / rules → **Nâng cao** only |

**Read:** `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` · `docs/REBUILD_MASTER_PLAN.md` · `docs/BEST_OF_MATRIX.md`

### Forbidden (no human approval)

Bank sync · AI advisor · family · OCR · full YNAB envelope · AGPL code paste · inbox-first landing/auth marketing · force-push · edit `.env.local` · delete migrations

## 2. Surgical coding (always)

1. **Think before code** — read existing files; state plan in 3–6 bullets for multi-file work  
2. **Simplicity first** — smallest vertical slice; no drive-by refactors  
3. **Surgical diffs** — only files needed for the IDEA item  
4. **Goal-driven** — Done = check IDEA box + gates green + commit/push  

## 3. Domain money

- Integer **VND đồng** only (no float money)  
- Transfer = balanced legs; **never** expense totals  
- Soft delete + undo for destructive  
- Rules in `src/lib/*` + tests  
- RLS on user-owned tables  

## 4. Verify before done

```bash
npm run lint && npm run typecheck && npm run test
# R9/Q1: npm run test:e2e
# R10/Q2/Q3: npm run build  OR  bash scripts/mvp-verify.sh
```

Empty states: **one** primary CTA. Money a11y: `+` / `−` / `↔` not color-only.

## 5. Skill routing (Grok)

| When | Skill |
|------|--------|
| Autopilot / IDEA item | `moneyflow-rebuild` + `ship-feature` |
| PFM UI / ledger / budgets | `moneyflow-web` |
| Before claim done | `verification-before-completion` + `moneyflow-check` |
| Behavior change | `test-driven-development` |
| UI visual | `frontend-design` + `frontend-qa` |
| Auth / RLS | `security-pass` + `supabase-rls` |
| Bug | `systematic-debugging` |
| Minimal diffs | `surgical-coding` |

**Do not** use AtoEnglish skills.

## 6. Autopilot

- Service: `moneyflow-autopilot` → `scripts/agent-daemon.sh`  
- One IDEA item / cycle · dirty tree (except `logs/`) → skip  
- No invent backlog while R*/Q* open  
- When all R*+Q* done → `docs/MVP_SHIPPED.md`

## 7. Next.js

Before novel App Router APIs: check `node_modules/next/dist/docs/`.
