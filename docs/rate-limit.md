# Rate limit — upload / import (TASK-121)

## Current (soft, in-process)

| Path | Guard | Limit |
|------|--------|--------|
| `createImportBatchAction` | `importActionLimiter` keyed by `import:{userId}` | 15 / 60s sliding window |
| `createInboxCandidatesAction` | same limiter + key | shared with batch create |
| Ledger `create_*` RPC | **DB idempotency** `(user_id, idempotency_key)` | not rate-limited here |
| Client upload UI | phase `reading` disables picker; double-submit avoided | not a security boundary |

Implementation: `src/lib/rate-limit.ts` (unit-tested). When the guard trips, actions return a calm Vietnamese message via `rateLimitUserMessage`.

**Limits of this approach**

- Memory is **per Node/serverless instance** — multi-region or cold starts do not share counters.
- Soft protection only (accidental spam, double-clicks after network retry). Not a DoS shield at the edge.
- File size / type already capped in `parse-csv` / upload UI (`MAX_UPLOAD_BYTES`).

## Middleware plan (later — not required for MVP)

When traffic or abuse warrants it, add **edge rate limiting** before server actions:

1. **Where:** Next.js proxy/middleware (`src/proxy.ts` or platform firewall) matching:
   - `POST` to server-action endpoints that create import batches / candidates
   - Optional: auth routes (`/login`, `/register`) separately
2. **Key:** prefer authenticated `user_id` (session cookie / JWT sub); fall back to hashed IP + User-Agent for anonymous.
3. **Store:** shared store (Upstash Redis, Vercel KV, or Supabase) — not process memory.
4. **Policy sketch:**
   - Import/upload: e.g. 30 req / user / 5 min; 429 with `Retry-After`
   - Auth: stricter (credential stuffing)
5. **Headers:** `Retry-After`, optional `X-RateLimit-Remaining` for clients.
6. **Platform:** Vercel Firewall / WAF rate rules can sit in front without app code.
7. **Never:** rate-limit based on raw statement body; log only counts + status codes (see `safe-log`).

## Related product rules

- Money stays integer minor units; rate limit does not touch amounts.
- Idempotency remains the correct fix for **duplicate ledger writes**; rate limit is for **flood / cost**.
- Research note: `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` G.7 “Rate limit | Upload/auth later middleware”.
