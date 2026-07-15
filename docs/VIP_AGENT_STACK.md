# MoneyFlow × Grok — VIP agent stack

**Goal:** Áp dụng best practices agent 2026 (AGENTS.md layering, SKILL.md, hooks, verify loops, memory, surgical coding) **vào Grok**, không nhảy Claude/Hermes.

**Runtime lock:** `docs/AGENT_RUNTIME.md` (user chose Grok).

---

## Layer cake (industry 2026)

| Layer | MoneyFlow path | Role |
|-------|----------------|------|
| **AGENTS.md** | `/AGENTS.md` | Universal rules (G5, money, verify, skills map) |
| **Modular rules** | `.grok/rules/*.md` | Always-on product / money / ship |
| **Skills** | `.grok/skills/*/SKILL.md` | On-demand procedures |
| **Hooks** | `.grok/hooks/*.json` + `scripts/hooks/*` | Safety PreToolUse + SessionStart |
| **IDEA queue** | `IDEA.md` | R* rebuild → Q* quality |
| **Headless** | `scripts/agent-run-headless.sh` | Autopilot + `--check` + memory + denies |
| **Daemon** | `moneyflow-autopilot.service` | Continuous Grok cycles |

Sources of patterns: AGENTS.md ecosystem, Anthropic Agent Skills, Karpathy surgical guidelines, Grok user-guide (skills/hooks/memory/headless).

---

## Skills inventory (project)

| Skill | Job |
|-------|-----|
| `moneyflow-web` | PFM patterns, daily loop, G5 |
| `moneyflow-rebuild` | Ship next IDEA R*/Q* |
| `moneyflow-check` | Pre-push product + domain gates |
| `moneyflow-autopilot` | AFK loop policy |
| `surgical-coding` | Minimal diffs, think first |
| `ship-feature` | Vertical slice |
| `test-driven-development` | Red-green |
| `verification-before-completion` | Never claim without proof |
| `frontend-design` / `frontend-qa` | Visual + a11y |
| `security-pass` / `supabase-rls` | Auth/RLS |
| `webapp-testing` | Playwright |
| `systematic-debugging` | Bugs |

---

## Headless VIP flags

```bash
grok --prompt-file … \
  --cwd "$ROOT" \
  --yolo \
  --check \                 # self-verify loop
  --experimental-memory \   # cross-session memory
  --max-turns 80 \
  --deny 'Bash(*force*push*)' \
  --deny 'Bash(rm -rf /*)' \
  --output-format plain
```

Optional hard tasks (manual, costly):

```bash
grok -p "…" --best-of-n 3 --check
```

---

## Safety

- Hook `pre-tool-safety.sh`: blocks force-push, catastrophic rm, `.env.local` edits  
- Orchestrator: dirty tree → skip (no stash thrash)  
- Product forbids bank/AI/family/inbox brand  

**Trust project hooks once:** in interactive Grok run `/hooks-trust` in the moneyflow folder (or `grok --trust`).

---

## Human commands

```bash
# Interactive with full stack
cd /home/thunder/Code/moneyflow && grok --experimental-memory

# One IDEA item
bash scripts/agent-run-headless.sh

# Full gates
bash scripts/mvp-verify.sh

# Autopilot
bash scripts/agent-daemon-start.sh
systemctl --user status moneyflow-autopilot.service
```

---

## Not included (by design)

| Tech | Why not for this project |
|------|---------------------------|
| Hermes primary | User locked Grok; coding ceiling lower for SE |
| OpenClaw | Life agent + security surface |
| Claude Code primary | User chose option 2 keep Grok |
| Unbounded best-of-n always | Cost; use only for hard slices |

---

## Success metric

IDEA R*+Q* all checked · `mvp-verify` green · e2e expense path green · no inbox brand · money domain tests green.
