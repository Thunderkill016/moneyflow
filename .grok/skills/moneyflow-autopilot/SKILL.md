---
name: moneyflow-autopilot
description: >
  Autonomous development for MoneyFlow until best MVP ships. Use when autopilot,
  agent tự động, 24/7, /autopilot, /moneyflow-autopilot. Never stops early:
  agent-ensure-work keeps queue until docs/MVP_SHIPPED.md. G5 only.
metadata:
  short-description: "MoneyFlow autopilot until best MVP"
---

# MoneyFlow Autopilot — until best MVP

## Mission

Work until `docs/MVP_BEST_BAR.md` is met and `docs/MVP_SHIPPED.md` exists.
**Never stop just because a wave finished.**

```bash
bash scripts/agent-ensure-work.sh
```

## Loop

1. ensure-work (pool + deferred + TASK-500+ catalog)
2. Pick lowest `ready` TASK
3. Implement → lint/typecheck/test → commit → push → done
4. ensure-work again
5. Only idle 1h when MVP_SHIPPED + 0 ready

## Forbidden

Bank sync · AI advisor · family · OCR · AGPL paste · inbox brand landing

## Competitor loop (after pool empty)

```bash
python3 scripts/agent-competitor-gap.py
# reads docs/COMPETITOR_GAP_BAR.md patterns vs codebase
# injects TASK-6xx until all pass → MVP_SHIPPED
```
