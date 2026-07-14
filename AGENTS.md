<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Money Flow — project rules (agents)

## Product

- Money Flow is a **Vietnamese-first** finance product.
- Strategic UX: **Universal Financial Inbox** — capture → normalize → review-by-exception → commit → insights.
- Secondary insight: **Hôm nay có thể chi bao nhiêu?** (after data is trusted).
- Docs: `docs/UX_RESEARCH_AND_REDESIGN.md`, `docs/wireframes-inbox.md`, `docs/design-system.md`, `docs/UX_PRINCIPLES.md`, `docs/PRODUCT.md`.

## Autopilot

1. Read `AGENT_BACKLOG.md` — only do the first task with **Status: `ready`**.
2. One task per session. Set `in_progress` → implement → lint/typecheck/test → commit → push if pass → `done`.
3. If `ready` &lt; 2: `bash scripts/agent-refill-backlog.sh`.
4. Never ask the user questions during headless autopilot — decide and ship minimal scope.
5. Fail twice → `blocked` + reason. Do not force-push. Do not edit `.env.local` / secrets. Do not delete migrations.

## Engineering

- Money = **integer minor units** (VND đồng). No float for persisted money.
- Financial rules outside visual components.
- Treat browser input as untrusted; resolve auth on server.
- User-owned tables need **RLS** when using Supabase.
- Every data page: **loading, empty, error, success** (and uncertain when capture/parse).
- No dependency without justifying value.
- Before code: inspect current impl + Next.js local docs under `node_modules/next/dist/docs/`.
- After code: `npm run lint && npm run typecheck && npm run test` (and `npm run build` if routes/layout change).

## Design

- Inbox-first navigation. Do **not** put chart dashboard as default home.
- Never auto-post low-confidence transactions.
- Do not clone competitor layouts/colors/copy/icons.
- Dark + light, a11y basics (focus, contrast, money not color-only).
