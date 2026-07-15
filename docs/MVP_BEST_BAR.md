# MoneyFlow — “MVP tốt nhất” bar (autopilot never stops early)

**Authority:** G5 + `docs/MVP_DEFINITION.md` + `docs/research/07_GITHUB_OSS_BEST.md`  
**Rule:** Daemon **keeps generating work** until this bar is met.  
**When met:** write `docs/MVP_SHIPPED.md` and daemon may idle long.  
**Never auto:** bank sync · AI advisor · family · OCR · envelope full · AGPL paste · inbox brand.

## Bar (all must be true)

### A. Money correctness (P0)
- [ ] Transfer never in expense/budget/report totals (tests)
- [ ] Integer VND only in domain (tests)
- [ ] Soft-delete drops spent; restore works (tests)
- [ ] Create mutation never silent empty error (VN messages)

### B. Daily loop (P0)
- [ ] Ghi chi path &lt; 10s (e2e or contract)
- [ ] Insights: balance + thu + chi + top cat + recent + Ghi chi CTA
- [ ] Safe-to-spend one-line explain visible
- [ ] Empty states core pages: **one** primary CTA each
- [ ] Export ≤ 2 clicks from Insights

### C. Product alignment (P0)
- [ ] Landing G5 (thu chi, no inbox slogans) tests
- [ ] Nav Core vs Nâng cao (inbox Advanced only)
- [ ] Onboarding → insights / capture/quick only
- [ ] PWA start_url insights

### D. Trust & a11y (P1)
- [ ] Privacy + delete account paths
- [ ] Demo banner doesn’t block FAB
- [ ] Money not color-only (+/−/↔)
- [ ] Dialog focus trap on Ghi chi

### E. Quality gates (P0)
- [ ] `npm run lint` green
- [ ] `npm run typecheck` green
- [ ] `npm run test` green
- [ ] `npm run test:e2e` green
- [ ] `npm run build` green (demo env)
- [ ] `scripts/mvp-verify.sh` exists and green

### F. Performance floor (P1)
- [ ] Lighthouse scores documented for /landing + /insights
- [ ] CLS ≤ 0.1 on both (lab)
- [ ] LCP documented with mitigation plan if &gt; 2.5s

### G. Best-of polish (P2 — after A–E)
- [ ] Patterns from Actual/Firefly/Ivy applied without AGPL copy
- [ ] Deferred polish queue drained or consciously cancelled

## Autopilot loop

1. If `docs/MVP_SHIPPED.md` exists and ready=0 → sleep 1h then re-check  
2. Else `agent-ensure-work.sh` then do lowest ready TASK  
3. Never invent forbidden features  
