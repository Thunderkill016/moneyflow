# GitHub OSS “best of” → MoneyFlow (learn only)

**Ngày:** 2026-07-15  
**Stars/license:** gh API snapshot 2026-07-15  
**Luật:** **Học pattern + docs + UX**.  
- **MIT / Apache-2.0:** có thể đọc code, reimplement idea (không paste file lớn).  
- **AGPL / GPL:** **docs + domain model + UX only** — **cấm copy code** vào repo (AGENTS.md).

---

## 1. Tier S — bắt buộc agent đọc trước khi “best-of”

| Repo | ★ | License | Stack | Áp dụng MoneyFlow | Cấm |
|------|---|---------|-------|-------------------|-----|
| **[actualbudget/actual](https://github.com/actualbudget/actual)** | ~27.5k | **MIT** | TS, local-first | Envelope UI lite (đã reject full), **CSV import/export**, **rules**, offline feel, budget remaining UX, reconciliation | Không clone client; không bank-first |
| **[firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii)** | ~24k | **AGPL-3.0** | PHP Laravel | **Domain only:** withdrawal/deposit/transfer, bills/piggy, multi-currency, importer trust boundary | **Không copy code** |
| **[firefly-iii/data-importer](https://github.com/firefly-iii/data-importer)** | ~0.8k | **AGPL-3.0** | PHP | Pattern: map CSV → preview → commit; fingerprint/dedupe | **Không copy code** |
| **[maybe-finance/maybe](https://github.com/maybe-finance/maybe)** | ~54k | **AGPL-3.0** | Ruby | Historical UX: accounts dashboard, net worth (post-MVP), calm marketing | **Không copy**; net worth **không** hero MVP |
| **[Ivy-Apps/ivy-wallet](https://github.com/Ivy-Apps/ivy-wallet)** | ~3.2k | **GPL-3.0** | Kotlin Android | **Quick-add UX:** amount focus, recent categories, multi-wallet (đã có hướng) | **Không copy**; archived |

---

## 2. Tier A — rất đáng học (MIT / domain)

| Repo | ★ | License | Học gì |
|------|---|---------|--------|
| **[ananthakumaran/paisa](https://github.com/ananthakumaran/paisa)** | ~3.2k | AGPL | Beancount-backed web; reports; **docs only** |
| **[beancount/beancount](https://github.com/beancount/beancount)** | ~5.8k | GPL | Integer-ish accounting, balance assertions — **concepts only** |
| **[simonmichael/hledger](https://github.com/simonmichael/hledger)** | ~4.6k | GPL | CLI reports, multi-currency rigor — **concepts** |
| **[ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio)** | ~9k | AGPL | Portfolio (post-MVP invest) — **reject MVP** |
| **[flash-oss/medici](https://github.com/flash-oss/medici)** | ~0.35k | **MIT** | Double-entry JS patterns (Mongo) — reimplement idea on Postgres, **don’t vendor if unused** |
| **[ilkome/finapp](https://github.com/ilkome/finapp)** | ~0.17k | **MIT** | Small PFM structure reference |
| **[fmaclen/canutin](https://github.com/fmaclen/canutin)** | ~69 | **Apache-2.0** | Desktop PFM privacy framing |
| **[needim/gider.im-pwa](https://github.com/needim/gider.im-pwa)** | ~0.2k | AGPL | Privacy-first PWA UX — **docs/UX only** |
| **[bradtraversy/expense-tracker-nextjs](https://github.com/bradtraversy/expense-tracker-nextjs)** | ~85 | none | Teaching Next.js+Clerk+Neon — simple structure, **not** domain gold |

---

## 3. Pattern → MoneyFlow mapping (agent implementation)

| Pattern (source) | MoneyFlow location | Status / task |
|------------------|--------------------|---------------|
| Transfer ≠ expense (Firefly docs) | ledger + reports + `transfers.ts` | MVP-253/261 |
| Quick add + recent cats (Ivy) | `add-transaction-dialog`, prefs | Done-ish; harden 262 |
| CSV export ownership (Actual) | settings/export + insights CTA | MVP-260 |
| Import preview → commit (Firefly importer) | lab Advanced only | Already; no brand |
| Budget remaining calm (Actual/Goodbudget) | budgets + insights | MVP-267 |
| Bills / commitments (Firefly piggy/bills) | commitments | MVP-268 |
| Soft delete + undo (SaaS) | transactions | MVP-254/218 |
| Local-first demo (Actual spirit) | demo localStorage | Keep parity STAB |
| Envelope full (YNAB/Actual) | — | **Reject MVP** |
| Bank sync (Actual SimpleFIN etc.) | — | **Reject** |
| Net worth hero (Maybe/Monarch) | — | **Reject MVP** |
| Wealth/invest (Ghostfolio) | — | **Reject MVP** |

---

## 4. Agent rules when using OSS

1. Open **README / docs** first; code second and only if MIT/Apache.  
2. Write a **3-bullet “learned”** note in commit body if non-trivial.  
3. Prefer **reimplement** in `src/lib/*` with unit tests.  
4. Never `git submodule` AGPL apps.  
5. Never paste AGPL/GPL source files.  
6. Vietnamese product copy always; don’t import EN-only UX jargon on landing.

---

## 5. Recommended “study order” for autopilot (when not in MVP gate)

1. Actual README + budget model (MIT)  
2. Firefly docs: transactions types, bills (AGPL docs)  
3. Ivy wallet UX notes (archived, GPL docs)  
4. Beancount concepts: balanced transactions  

Primary execution remains **MVP_DEFINITION + TASK-250…282**.  
OSS tasks: **TASK-400…** (below) only after STAB gates or when explicitly `ready`.
