# MoneyFlow — MVP “chuẩn” definition (agent exit)

**Authority:** `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` (G5)  
**Backlog wave:** `AGENT_BACKLOG.md` → **TASK-300…**  
**Autopilot:** `moneyflow-autopilot` / `scripts/agent-daemon.sh`

## Positioning (lock)

> Web quản lý **thu chi** cho người Việt: nhiều ví, ghi nhanh, thấy tháng này tiền đi đâu, xuất CSV.  
> Không phải ngân hàng · không AI tư vấn · không hộp thư là brand.

## MVP feature set (must exist + work)

| # | Capability | Route / surface | Gate |
|---|------------|-----------------|------|
| 1 | Auth + demo | login/register/demo | session or demo works |
| 2 | Multi wallet | `/accounts` | add/edit/archive |
| 3 | Categories | `/categories` | expense + income CRUD |
| 4 | Ghi chi / thu | dialog + `/capture/quick` | &lt; 10s path |
| 5 | Transfer ≠ expense | transactions + reports | never in chi totals |
| 6 | Dashboard | `/insights` | balance, thu, chi, top cat, recent |
| 7 | Observed monthly overview | total balance + income + expense + net | state period and exclude internal transfers |
| 8 | Category budgets | `/budgets` | limit + spent calm |
| 9 | Recurring light | `/commitments` | due + pay/undo |
| 10 | Goals light | `/goals` | create + allocate |
| 11 | Reports + period | `/reports` | month view |
| 12 | CSV export | `/settings/export` + insights CTA | 1-click discoverable |
| 13 | Soft delete + undo | transactions | restore within toast |
| 14 | Onboarding short | `/onboarding` | ví → ghi chi or insights |
| 15 | Privacy / delete | `/privacy`, settings | trust copy |
| 16 | Nav Core vs Lab | app-shell | inbox under Nâng cao |

## Non-goals (never auto)

Bank sync · AI advisor · family · invest/crypto · OCR · full YNAB envelope · AGPL copy · landing “Hộp thư”

## Exit criteria (MVP ship)

1. `npm run lint && npm run typecheck && npm run test` green  
2. `npm run test:e2e` expense path green  
3. `npm run build` green (demo env)  
4. Transfer excluded from expense (unit + e2e contract)  
5. Landing G5 copy regression tests pass  
6. Empty states on core pages: **one** primary CTA  
7. Export reachable from Insights in ≤ 2 clicks  
8. No P0 money bugs (float, double-count transfer, silent fail create)  
9. Lighthouse lab scores **documented** (LCP may still miss 2.5s — note ok if CLS green + plan)  

## Lab (keep, do not expand brand)

Inbox / paste / upload / rules / CSV direct import — **Nâng cao** only. Bugs OK to fix; no new inbox marketing.

## Priority order for agents

1. **STAB** money correctness + e2e + build  
2. **CORE UX** daily loop + empty + export discoverability  
3. **PERF** LCP/JS only if not blocking STAB  
4. Never invent features outside this doc  
