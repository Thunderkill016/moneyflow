---
name: security-pass
description: >
  Security checklist for MoneyFlow (auth, RLS, secrets, money actions).
  Use after auth/RLS/server-action changes or /security-pass. Adapted from Shipkit.
---

# Skill: security-pass (MoneyFlow)

## Checklist

- [ ] No secrets in client bundle or git (`.env.local` never committed)  
- [ ] Writes validated; money amounts integer-safe  
- [ ] Protected routes still gated (`requireViewer` / proxy)  
- [ ] Queries scoped to current user (RLS on user tables)  
- [ ] Server actions do not trust client-supplied user id  
- [ ] Rate limit considered for import/paste  
- [ ] No raw bank statements in logs/toasts (`safe-log`)  
- [ ] Export/delete account still available (user ownership)  

## Output

**Blockers** first, then nice-to-haves. Do not claim “secure” without evidence (command or policy cite).
