<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow — project rules (agents)

## Product law (G5 — authoritative)

Read first (in order):

1. `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` — **G5** positioning, JTBD, MVP, non-goals
2. `docs/AUTOPILOT_PLAN.md` — Wave A → B → C order (**TASK-100…125**)
3. `AGENT_BACKLOG.md` — only tasks with `Status: ready`

**Positioning:** Vietnamese-first **personal income & expense (thu chi)** web app.

- Core JTBD: log fast → know **balances** and **where money went this month**.
- Secondary insight: **Hôm nay có thể chi bao nhiêu?** (safe-to-spend is insight, not brand-only).
- Capture / Inbox / paste / upload = **optional P1 tools**, not the product identity.

### Forbidden without human approval

Agents **must not** implement, invent, or refill backlog tasks for:

- Revert landing to “Hộp thư / Universal Financial Inbox” marketing slogans
- Bank sync / Open Banking / SMS harvesting
- AI financial advisor / chatbot
- Family sharing, investments, crypto, OCR, voice
- Full YNAB envelope onboarding
- Copying AGPL/GPL code (Firefly, Maybe, Ivy, Ghostfolio) into the repo
- Force-push, editing `.env.local`, deleting migrations

## Autopilot

1. One task per session — first `ready` by **lowest TASK number**.
2. Wave order from `docs/AUTOPILOT_PLAN.md`: **A (100–105)** → **B (106–115)** → **C (116–125)** thu chi MVP. Prefer **TASK-100+**. TASK-001…030 are done historical inbox work — do not re-open as product pivot.
3. Status `in_progress` → implement → `npm run lint && npm run typecheck && npm run test` → commit → `git push origin main` → `done` + SHA.
4. If `ready` &lt; 2: `bash scripts/agent-refill-backlog.sh` (only from `AGENT_ROADMAP.md` pool; never invent bank-sync/AI/family tasks).
5. Fail twice → `blocked` + reason.
6. Do not invent features outside the task description.

## Engineering

- Money = **integer minor units** (VND đồng). No float for persisted money.
- Transfer = two balanced legs; **never** count as expense in reports.
- Soft delete via `deleted_at` where applicable.
- Financial rules in `src/lib/*`, not only in visual components.
- Treat browser input as untrusted; resolve auth on server.
- User-owned tables: **RLS**.
- Every data page: loading, empty, error (and uncertain for capture).
- No dependency without justifying value.
- Before code: inspect current impl + Next.js docs under `node_modules/next/dist/docs/`.
- After code: lint, typecheck, test; `npm run build` when routes/layout change or TASK-120.

## Design

- Calm, non-judgmental Vietnamese copy.
- Dark + light; a11y: focus, contrast, money not color-only (`+/−/↔`).
- Charts secondary to insights on dashboard.
