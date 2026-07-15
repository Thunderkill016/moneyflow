# MoneyFlow — Agent runtime (locked)

**Chốt 2026-07-15 (user):** giữ **Grok** làm coding agent chính.  
Không chuyển sang Claude Code / Hermes / OpenClaw / Codex trừ khi user đổi quyết định.

## Stack

| Layer | Tool |
|-------|------|
| Interactive + headless coding | **Grok CLI** (`grok`, session + `--yolo`) |
| AFK loop | `moneyflow-autopilot.service` → `scripts/agent-daemon.sh` |
| Work queue | `IDEA.md` — **R*** rebuild first, then **Q*** |
| Product law | `AGENTS.md` + G5 + `docs/REBUILD_MASTER_PLAN.md` |
| Skills | `.grok/skills/moneyflow-web`, ship-feature, TDD, verification, frontend-qa |

## Commands

```bash
# status
systemctl --user status moneyflow-autopilot.service
tail -f logs/agent/daemon.log

# start / stop
bash scripts/agent-daemon-start.sh
bash scripts/agent-daemon-stop.sh
# or: systemctl --user stop moneyflow-autopilot.service
```

## Rules (no thrash)

1. One IDEA item per headless cycle.  
2. No inventing backlog spam when R*/Q* open.  
3. Dirty tree (except `logs/`) → **skip** cycle, do not stash-destroy WIP.  
4. Gates: lint + typecheck + test; e2e/build only for R9/R10/Q1–Q3.  
5. Forbidden: bank sync, AI advisor, family, OCR, AGPL paste, inbox brand.

## Not using (for this project)

| Tool | Why not primary |
|------|-----------------|
| Claude Code | User chose keep Grok |
| Hermes | Memory/agent layer, not best code ship for this repo |
| OpenClaw | Life agent, security surface, not PFM engineering |
| Codex | Optional later if user wants async OpenAI |

## When bar met

All R* + Q* checked → `docs/MVP_SHIPPED.md`; daemon idles.
