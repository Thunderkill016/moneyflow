# Giai đoạn 4 — Open-source Analysis

**Sản phẩm:** Web thu chi cá nhân (Next.js + Supabase)  
**Ngày nghiên cứu / API check:** 2026-07-15  
**Không code ứng dụng** — học pattern, không copy trái license  

**Nguồn metadata chính:** GitHub API `2026-07-15` (stars, license SPDX, pushed_at, archived).  
**Phân loại license (hành động):**

| Class | Ý nghĩa cho MoneyFlow (proprietary/hosted SaaS) |
|---|---|
| **Reuse OK** | MIT/Apache/BSD — có thể tham khảo & rewrite; copy file cần attribution |
| **Architecture / UX only** | AGPL/GPL — **không** nhúng code vào product closed; học domain/UI ý tưởng |
| **Historical only** | Archived / unmaintained — học có chọn lọc |
| **Do not use** | No license / unclear / security nightmare |

---

## 1. Executive summary OSS

| Repo | License | Stars* | Active? | Học gì | Copy code? |
|---|---|---|---|---|---|
| **actualbudget/actual** | **MIT** | ~27.5k | Yes (pushed 2026-07-14) | Local-first, import, rules, reports, privacy | Rewrite OK + attribute if copy |
| **firefly-iii/firefly-iii** | **AGPL-3.0** | ~24k | Yes | Domain: bills, piggy, rules, importer split | **No** into closed SaaS |
| **maybe-finance/maybe** | **AGPL-3.0** | ~54k | **Archived** 2025-07 | Modern PF UX/IA (historical) | **No** + dead upstream |
| **Ivy-Apps/ivy-wallet** | **GPL-3.0** | ~3.2k | **Archived** 2026-04 | Mobile quick-add UX | **No** |
| **ghostfolio/ghostfolio** | **AGPL-3.0** | ~9k | Yes | Portfolio dashboard (scope khác) | **No** + reject investments MVP |
| **ananthakumaran/paisa** | **AGPL-3.0** | ~3.2k | Moderate | Ledger-backed reports | **No** |
| **beancount / hledger** | GPL | — | Yes | Integer commodities, double-entry purity | Concepts only |

\*Stars = popularity signal only — **không** quyết định chất lượng một mình.

### Kết luận chọn lọc cho MoneyFlow

1. **Primary study:** Actual (MIT + TypeScript + closest to modern web) + Firefly **docs/domain** (not code).  
2. **UX mobile study:** Ivy (archived, GPL — patterns only).  
3. **Avoid:** embedding Maybe/Firefly/Ghostfolio/Paisa code (AGPL/GPL + scope).  
4. **Confirm:** MoneyFlow double-entry lite + integer money **aligned** with PTA (plain-text accounting) lessons without running Ledger.

---

## 2. Repository matrix

| Repository | Link | Stack | License | Activity (2026-07-15) | Strength | Weakness | Học | Không dùng | Fit (1–10) |
|---|---|---|---|---|---|---|---|---|---|
| Actual | https://github.com/actualbudget/actual | TS/Node, local-first | MIT | Active | Privacy, envelope, import, rules, reports | Self-host sync; envelope bias | Import/rules/ownership | Full client architecture clone | **9** |
| Firefly III | https://github.com/firefly-iii/firefly-iii | PHP Laravel, SQL | AGPL-3.0 | Active | Rich domain, API, bills, piggy, rules | Dense UI; separate importer | Entity model, bills≠expense | Any PHP code copy | **8** domain / **3** stack |
| Data Importer | https://github.com/firefly-iii/data-importer | PHP | AGPL-3.0 | Active | Isolates import threat | Extra deploy | Import as separate trust boundary | Code | **7** concept |
| Maybe | https://github.com/maybe-finance/maybe | Ruby on Rails | AGPL-3.0 | **Archived** | Polished PF product once | Unmaintained; AGPL; net-worth heavy | UI IA historical | Fork as product base | **4** |
| Sure (fork) | https://github.com/we-promise/sure | (Maybe fork) | AGPL-3.0 | Community | Continuity attempt | AGPL; quality varies | Optional watch | Code | **3** |
| Ivy Wallet | https://github.com/Ivy-Apps/ivy-wallet | Kotlin Compose | GPL-3.0 | **Archived** | Excellent Android entry UX | Dead; GPL; not web | FAB, onboarding speed | Code | **6** UX only |
| Ghostfolio | https://github.com/ghostfolio/ghostfolio | Angular Nest Prisma | AGPL-3.0 | Active | Clean TS monorepo, privacy invest | Investments ≠ expense tracker | Module boundaries | Features + code | **4** |
| Paisa | https://github.com/ananthakumaran/paisa | Go/TS, ledger | AGPL-3.0 | Some 2025 activity | Ledger correctness | Niche UX | Report from ledger | Code/stack | **5** |
| Beancount | https://github.com/beancount/beancount | Python | GPL-2.0 | Mature | Strict double-entry, docs | CLI/Fava | Money commodities | App shell | **7** concepts |
| hledger | https://hledger.org / GitHub | Haskell | GPL-3.0 | Mature | Fast PTA, export | CLI | Balance assertions | App shell | **7** concepts |
| GnuCash | gnucash.org | C/C++ | GPL | Mature | Full accounting | Desktop complexity | Account types warning | App model | **3** |

---

## 3. Scorecard (1–10)

Thang: 1 = kém · 10 = xuất sắc. **Risk if applied** = rủi ro nếu copy approach/code vào MoneyFlow SaaS.

### 3.1 Actual Budget

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Architecture | 9 | Client local-first + optional sync server |
| Code quality | 8 | Large TS codebase; community review |
| Documentation | 9 | actualbudget.org docs strong |
| Testing | 8 | Present in project culture **[Secondary]** |
| Security | 8 | Local data; sync threat model different from multi-tenant SaaS |
| Maintainability | 8 | Active monorepo community |
| Activity | 10 | Pushed 2026-07-14 |
| Learning value | 10 | Highest for this product |
| Fit personal expense | 8 | Envelope-first; still great for txn/import |
| Risk if applied | 3 | Low if rewrite ideas under MIT discipline |
| **License class** | Reuse OK (MIT) | Attribute if copying files |

### 3.2 Firefly III

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Architecture | 8 | Classic Laravel modular; importer separated |
| Code quality | 7 | Mature PHP |
| Documentation | 9 | docs.firefly-iii.org excellent domain |
| Testing | 7 | **[Unverified depth]** |
| Security | 8 | Self-host; AGPL forces openness if network service modified |
| Maintainability | 8 | Long-lived project |
| Activity | 9 | Active 2026 |
| Learning value | 9 | Domain vocabulary |
| Fit | 7 | Too much surface for “simple tracker” |
| Risk if applied | 9 | **AGPL copy into closed SaaS = legal risk** |
| **License class** | Architecture / UX only | |

### 3.3 Maybe Finance

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Architecture | 8 | Modern Rails PF |
| Code quality | 7 | Was production-grade |
| Documentation | 6 | README license heavy |
| Testing | 6 | **[Unverified]** |
| Security | 6 | Archived → no patches |
| Maintainability | 2 | **Archived** |
| Activity | 1 | Last push ~2025-07; archived |
| Learning value | 7 | UX/IA screenshots/history |
| Fit | 5 | Wealth + advisor scope creep |
| Risk if applied | 10 | AGPL + dead + trademark “Maybe” |
| **License class** | Historical / do not base product | |

### 3.4 Ivy Wallet

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Architecture | 7 | Clean Android modules |
| Code quality | 8 | Compose showcase historically |
| Documentation | 5 | Wiki; archived |
| Testing | 6 | **[Unverified]** |
| Security | 5 | Unmaintained |
| Maintainability | 2 | Archived 2026-04 |
| Activity | 2 | Archived |
| Learning value | 8 | Entry UX |
| Fit | 6 | Android only |
| Risk if applied | 8 | GPL + dead |
| **License class** | UX only | |

### 3.5 Ghostfolio

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Architecture | 8 | Nx monorepo TS |
| Learning value | 6 | For **investments**, not expense MVP |
| Fit | 3 | Out of scope Phase 2 non-goals |
| Risk | 8 | AGPL + wrong domain |
| **License class** | Architecture only if ever invest module | |

### 3.6 Beancount / hledger (concepts)

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Architecture | 10 domain | Pure double-entry |
| Learning value | 9 | Amount commodities, balancing |
| Fit app UX | 2 | Not a consumer web app |
| Risk | 2 | Concepts only |
| **License class** | Concepts only (GPL tools) | |

---

## 4. Deep dives (Top)

### 4.1 Actual Budget — primary

**Goal:** Local-first envelope budgeting & personal finance.  
**Users:** Privacy-conscious budgeters; YNAB refugees.  
**Stack:** TypeScript/Node, client-heavy, optional sync server.  
**License:** MIT **[Fact API 2026-07-15]**.

#### Patterns đáng học

| Pattern | Why | MoneyFlow action |
|---|---|---|
| **You own your data** | Trust differentiator | Export/delete + clear privacy copy |
| **File import** (CSV/OFX/…) | Regions without bank sync | P1 CSV import |
| **Transaction rules** | Auto-categorize without LLM | P1 light rules |
| **Register-first** | Transactions over vanity charts | Timeline + quick add |
| **Offline/local resilience** | Demo mode / PWA later | Keep demo localStorage pattern |
| **Custom reports** | Actionable analytics | Category + trend MVP; custom later |
| **YNAB import path** | Migration | Optional later |

#### Patterns không áp dụng nguyên

| Pattern | Why reject/adapt |
|---|---|
| Envelope as only mental model | Phase 2: too hard for U1/U2 MVP |
| Self-host requirement for multi-device | VN users want hosted Supabase |
| Client-only security model | Multi-tenant RLS different threat model |

#### Mapping → Next.js + Supabase

| Actual idea | Supabase shape |
|---|---|
| Budget file local | `user_id` rows + RLS |
| Sync server | Supabase realtime optional; not CRDT first |
| Rules engine | `categorization_rules` table JSON match |
| Import | Edge function / server action parse → candidates or direct txns |

**Technical debt to avoid copying:** entire local CRDT stack — overkill for hosted ledger.

---

### 4.2 Firefly III — domain encyclopedia

**Goal:** Self-hosted personal finance manager.  
**Stack:** PHP Laravel + SQL.  
**License:** AGPL-3.0 **[Fact]**.  
**Related:** [data-importer](https://github.com/firefly-iii/data-importer) — **import isolated** for security **[Fact README]**.

#### Domain vocabulary → MoneyFlow

| Firefly | MoneyFlow |
|---|---|
| Withdrawal | expense |
| Deposit | income |
| Transfer | transfer (2 legs) |
| Asset account | accounts |
| Expense/revenue accounts | **categories** (simpler) |
| Bill | commitment / recurring |
| Piggy bank | savings goal |
| Rule | later rules engine |
| Budget | monthly category budget |

#### Patterns đáng học

1. **Transfer never spends a budget category** (classification).  
2. **Bills anticipatory** — reserve upcoming (MoneyFlow commitments already).  
3. **Importer as separate component** — untrusted file parsing boundary.  
4. **API-first** for power users (later).  
5. **Docs as product** — domain explained in plain language.

#### Không áp dụng

1. Full account hierarchy / liability complexity on day 1.  
2. AdminLTE-era dense UI.  
3. Requiring users to understand double-entry accounts for “Ăn uống”.  
4. **Any AGPL source paste**.

#### Security lesson

Parse uploads in constrained worker; never store bank passwords; minimize raw retention — aligns Phase 2 privacy.

---

### 4.3 Maybe Finance — historical modern UX

**Status:** Repository **archived**; AGPL-3.0; stars high (~54k) but **not maintained** **[Fact API]**.  
**Pivot story:** OSS shut down / company direction change **[Secondary Reddit/selfhosted]**.

#### Học

- Multi-account dashboard layout ideas (not net-worth-first for our MVP).  
- Rails modular packaging as “bounded contexts” inspiration.  
- Warning: **stars ≠ sustainable**.

#### Không

- Base MoneyFlow on Maybe fork (AGPL + trademark + dead).  
- Advisor / invest features.

---

### 4.4 Ivy Wallet — mobile entry

**Status:** Archived Apr 2026; GPL-3.0; Kotlin Compose **[Fact API]**.  
**Stars ~3.2k**.

#### Học (UX only)

- Onboarding minimal.  
- Big amount keypad.  
- Category grid with recent.  
- Fast path “expense in seconds”.  
- Delight without clutter.

#### Không

- Port Kotlin.  
- GPL code.  
- Depend on unmaintained crypto of dependencies.

---

### 4.5 Ghostfolio — negative space

**Active AGPL TS monorepo** — excellent engineering **wrong product** for expense MVP.  
**Reject features:** stocks, crypto portfolio, FIRE calculator as core.  
**Optional later:** module isolation patterns if ever “assets” tab.

---

### 4.6 Plain-text accounting (Beancount / hledger)

#### Học

- Every transfer balances.  
- Amounts as integer + commodity.  
- Explicit accounts.  
- Reproducible reports from data.  
- Export/portability culture (hledger “no lock-in”).

#### Không

- Force users to write ledger files.  
- GPL code into app.

**MoneyFlow already mirrors the important part:** signed legs + balanced transfers **[Phase 3]**.

---

## 5. Cross-cutting lessons → stack

| Concern | OSS lesson | MoneyFlow approach |
|---|---|---|
| Multi-tenant SaaS | Not Actual’s model | Supabase RLS + server RPC |
| Import trust | Firefly separate importer | Server-side parse; size limits; no exec |
| Categorization | Actual rules | User prefs + later rules table |
| Testing money | PTA balance assertions | Unit tests on balances/transfers (exist + expand) |
| Auth | Various | Supabase Auth only |
| Migrations | Laravel/Prisma styles | Supabase SQL migrations (exist) |
| License | MIT preferred for reuse | Prefer studying MIT Actual; never AGPL paste |

---

## 6. License compliance checklist (project policy)

- [x] Actual MIT — may study & reimplement; if copy file → keep copyright header.  
- [x] Firefly AGPL — **docs/domain only**.  
- [x] Maybe AGPL archived — **no base**.  
- [x] Ivy GPL archived — **UX notes only**.  
- [x] Ghostfolio/Paisa AGPL — **no expense core**.  
- [ ] Before any vendored snippet: legal review if > trivial.  
- [ ] CI secret scan; no license headers stripped.

**Never propose:** “Copy Firefly TransactionController into Next route.”

---

## 7. What NOT to learn from OSS stars

| Anti-pattern | Example |
|---|---|
| Assume high stars = good MVP UX for beginners | Firefly, Maybe |
| Assume archived = useless | Ivy UX still teachable |
| Assume MIT = copy entire app | Still need product fit |
| Chase wealth/invest OSS | Ghostfolio |
| Self-host-only distribution for VN mass market | Actual without hosted layer |

---

## 8. Mapping to Phase 2/3 decisions

| Decision | OSS support |
|---|---|
| Integer money + balanced transfer | Beancount/hledger/Actual/Firefly |
| Category budget not envelope MVP | Explicit **reject** Actual/YNAB method as default |
| CSV import P1 | Actual + Firefly importer concept |
| Export ownership | Actual/hledger culture |
| Rules later | Actual/Firefly |
| No AGPL in bundle | License matrix |

---

## 9. Recommended reading order (for implementers later)

1. Actual docs: budgeting transactions, import, rules  
2. Firefly docs: best practices / data classification  
3. Beancount double-entry explainer (concepts)  
4. MoneyFlow `03_DOMAIN_RULES.md` + migrations  
5. **Do not** clone Maybe  

---

## 10. Kết thúc Giai đoạn 4

### 10.1 Đã xác minh (Fact)

| Repo | License | Stars | Pushed | Archived |
|---|---|---|---|---|
| actualbudget/actual | MIT | 27534 | 2026-07-14 | No |
| firefly-iii/firefly-iii | AGPL-3.0 | 24041 | 2026-07-14 | No |
| maybe-finance/maybe | AGPL-3.0 | 54338 | 2025-07-24 | **Yes** |
| Ivy-Apps/ivy-wallet | GPL-3.0 | 3154 | 2026-04-02 | **Yes** |
| ghostfolio/ghostfolio | AGPL-3.0 | 8959 | 2026-07-14 | No |
| ananthakumaran/paisa | AGPL-3.0 | 3181 | 2025-12-02 | No |

Source: GitHub API 2026-07-15.

### 10.2 Chưa xác minh

- Exact test coverage % each repo.  
- Security audit reports third-party.  
- Community fork “Sure” production readiness.  
- GnuCash schema deep dive (skipped as low fit).

### 10.3 Độ tin cậy thấp

- Qualitative “code quality 8” without line-by-line audit.  
- Contributor counts not pulled this pass.

### 10.4 Quyết định đề xuất

1. **Primary OSS teacher:** Actual (MIT).  
2. **Domain teacher:** Firefly docs (AGPL — no code).  
3. **Mobile entry teacher:** Ivy UX (GPL — no code).  
4. **Ignore as base:** Maybe / Sure.  
5. **Reject invest OSS features** for MVP.  
6. **Keep** MoneyFlow schema; enhance tests/import inspired by Actual/Firefly.  
7. **Next:** Giai đoạn 5 — Product + architecture synthesis (MVP, ADR formal, roadmap, §17 outputs).

### 10.5 Câu hỏi còn mở

1. Will we ever AGPL a parser microservice intentionally? (Default **no**.)  
2. Publish MIT open-source core later? (Strategic, not now.)  
3. Self-host edition of MoneyFlow? (Post-PMF.)  

---

## 11. Nguồn

| Source | URL | Date |
|---|---|---|
| GitHub API repos | api.github.com/repos/{owner}/{repo} | 2026-07-15 |
| Actual | https://github.com/actualbudget/actual | 2026-07-15 |
| Actual docs / vs YNAB | https://actualbudget.org/ | 2026-07-15 |
| Firefly III | https://github.com/firefly-iii/firefly-iii | 2026-07-15 |
| Firefly docs | https://docs.firefly-iii.org/ | 2026-07-15 |
| Firefly data-importer | https://github.com/firefly-iii/data-importer | 2026-07-15 |
| Maybe | https://github.com/maybe-finance/maybe | 2026-07-15 |
| Ivy Wallet | https://github.com/Ivy-Apps/ivy-wallet | 2026-07-15 |
| Ghostfolio | https://github.com/ghostfolio/ghostfolio | 2026-07-15 |
| Paisa | https://github.com/ananthakumaran/paisa | 2026-07-15 |
| Beancount | https://github.com/beancount/beancount | 2026-07-15 |
| hledger | https://hledger.org/ | 2026-07-15 |

---

**Phase 4 complete.**  
**Next:** Giai đoạn 5 — `05_PRODUCT_AND_ARCHITECTURE.md` (định vị, MVP, ADR, roadmap, 10 việc nên/không nên làm).
