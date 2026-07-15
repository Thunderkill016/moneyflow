---
name: surgical-coding
description: >
  Karpathy-style surgical coding for MoneyFlow agents. Use on every feature and fix:
  think before coding, simplicity first, minimal diffs, goal-driven verification.
  Triggers: implement feature, fix bug, refactor, ship IDEA item, /surgical.
metadata:
  short-description: "Minimal diffs, think first, verify"
---

# Surgical coding

## Four hard rules

1. **Think before coding**  
   Read the files you will touch. State a short plan. If ambiguous, prefer the smaller interpretation that matches G5.

2. **Simplicity first**  
   Prefer the boring, readable solution. No premature abstraction, no “while I’m here” cleanups.

3. **Surgical changes**  
   Edit only what the current IDEA item / bug requires. Do not reformat unrelated files. Do not rename systems for style.

4. **Goal-driven execution**  
   Define Done up front (test, checkbox, UX check). Run gates. Only then commit.

## Anti-patterns (forbidden)

- Rewrite whole modules when a 20-line fix works  
- New dependencies without clear value  
- Feature dump from competitors  
- Skipping tests on money math  

## Done checklist

- [ ] Diff matches plan  
- [ ] Money/domain rules intact  
- [ ] lint + typecheck + test green  
- [ ] IDEA item checked if applicable  
