---
name: moneyflow-autopilot
description: >
  Autonomous development for MoneyFlow (thu chi VN). Use when user says autopilot,
  agent tự động, làm việc 24/7, chạy backlog, /autopilot, or /moneyflow-autopilot.
  Reads AGENTS.md + AGENT_BACKLOG.md, executes ONE ready task, tests, commit, push.
  Never uses AtoEnglish skill. Auto-refills from AGENT_ROADMAP.md when ready < 2.
metadata:
  short-description: "MoneyFlow 24/7 backlog autopilot"
---

# MoneyFlow Autopilot

## Before every session

1. Read `AGENTS.md` (product law G5 + engineering)
2. Read `docs/MVP_DEFINITION.md` + `docs/BEST_OF_MATRIX.md` if touching nav/features
3. Read `AGENT_BACKLOG.md`
4. Prefer **MVP HARDENING WAVE (TASK-250+)** over deferred polish
5. If `ready` count < 2: `bash scripts/agent-refill-backlog.sh` (only pool; never invent forbidden)
6. Pick **first** `Status: ready` by lowest TASK number
7. Never invent bank sync / AI advisor / family / inbox-brand landing

## Execution loop (ONE task only)

1. Set task → `in_progress` in `AGENT_BACKLOG.md`
2. Minimal diff for that task only
3. Run: `npm run lint && npm run typecheck && npm run test`
4. If task touches routes/layout/perf: also `npm run build` or `npm run test:e2e` when relevant
5. Success: commit with clear message → `git push origin main` (if user/session allows) → `done` + SHA + nhật ký
6. Fail twice: `blocked` + reason

## Skills to chain

| When | Skill |
|------|--------|
| After multi-file TSX UI | `shadcn` / react-best-practices patterns |
| After any wave | `moneyflow-check` or check-work |
| Domain/UX feature | `moneyflow-web` |
| Design ambiguity | `design` then implement |

## Never

- Multiple tasks per session
- Edit `.env.local` / secrets / force-push / delete migrations
- Copy AGPL code (Firefly, Ivy, etc.)
- Feature dump outside BEST_OF_MATRIX Core tier
- Wait for user to “create tasks” — refill from roadmap

## Scripts

```bash
bash scripts/agent-refill-backlog.sh
bash scripts/agent-pick-task.sh
```
