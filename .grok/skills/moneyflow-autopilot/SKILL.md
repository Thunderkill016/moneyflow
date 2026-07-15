---
name: moneyflow-autopilot
description: >
  MoneyFlow AFK autopilot using Claude/Shipkit-style skills: ship-feature from IDEA.md,
  TDD, verification-before-completion, security-pass, frontend-qa. Not busywork backlog.
  Triggers: autopilot, 24/7, /moneyflow-autopilot.
---

# MoneyFlow Autopilot (skill-driven)

## Stop thrashing

Do **not** invent 40 confirm-only tasks. Work from **`IDEA.md` Quality bar** only.

## Each session (ONE IDEA checkbox)

1. Read `IDEA.md` → next unchecked Quality item (Q1, Q2, …)  
2. Load skills in order:
   - **ship-feature** (how to slice)
   - **test-driven-development** if behavior changes
   - **frontend-qa** if UI
   - **security-pass** if auth/RLS/actions
   - **verification-before-completion** before claiming done  
3. Implement minimal slice  
4. `npm run lint && npm run typecheck && npm run test` (+ e2e/build if required by item)  
5. Check the box in `IDEA.md`  
6. Commit + push  
7. If all Quality boxes checked → write/update `docs/MVP_SHIPPED.md`

## Optional backlog

Only create `AGENT_BACKLOG` tasks that map 1:1 to an **unchecked IDEA.md** item.  
Cancel ready tasks that say “confirm already works” / “document only”.

## Forbidden

Bank sync · AI advisor · family · OCR · AGPL paste · inbox brand landing
