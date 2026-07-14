# Giai đoạn 5 — Product & Architecture Synthesis

**Ngày:** 2026-07-15  
**Input:** Phase 1–4 (`01`…`04`) + codebase MoneyFlow hiện tại  
**Không implement code trong doc này** — đây là **quyết định sản phẩm & kiến trúc**  

**Phân loại bằng chứng:** Fact · User opinion · Secondary · Assumption · Fact-codebase  

---

# Phần A — Executive summary

### Thị trường
Ứng dụng thu chi cá nhân đông, churn cao; ma sát **nhập tay** và **complexity** là lý do bỏ app phổ biến (**Secondary**). VN có Money Lover / MISA MoneyKeeper (mobile freemium + ads/IAP). Quốc tế: YNAB method đắt, Monarch/Copilot US bank-centric, Actual/Firefly mạnh self-host. Spreadsheet vẫn thắng về ownership.

### Người dùng mục tiêu (beachhead)
1. **Mới đi làm (U1)**  
2. **Sinh viên (U2)**  
3. **Excel/Sheets power user nhẹ (U3)**  
4. **Từng bỏ app (U4)** — thiết kế anti-churn  

### Pain lớn nhất
**Không ghi nổi bền** (quên + nhập lâu) → không có dữ liệu → không kiểm soát được “tiền đi đâu” và “còn bao nhiêu”.

### Khoảng trống
Web **tiếng Việt**, multi-ví, **nhập &lt; 10s**, báo cáo **hành động được**, **export CSV**, free core không ads, **không** ép YNAB method, **không** phụ thuộc open banking.

### Định vị đề xuất
> **MoneyFlow** — web quản lý thu chi cho người Việt: nhiều ví, ghi nhanh, thấy rõ tháng này tiền đi đâu, xuất được dữ liệu. Bình tĩnh, không phán xét. Không phải kế toán, không phải ngân hàng, không phải AI tư vấn.

### 5 quyết định quan trọng nhất
1. **Job:** ghi thu/chi tin cậy → số dư + thu/chi tháng + top category.  
2. **Wedge UX:** Quick add + remember prefs (đã có hướng trong code).  
3. **Domain:** integer minor + header/entries + transfer 2-leg (giữ schema).  
4. **Budget MVP:** category monthly — reject envelope method onboarding.  
5. **Non-goals MVP:** bank sync, AI advisor, family share, invest, OCR.

---

# Phần B — Competitor matrix (rút gọn quyết định)

| Product | Target | Ease entry | Multi-account | Transfer | Budget | Recurring | Reports | I/E | Privacy | Price | Learn | Avoid |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Money Lover | SEA | High | ● | ● | ● | ● | ● | ◐ | ◐ | Free+IAP | Multi-wallet | Ads/paywall core |
| MISA MK | VN | High | ● | ? | ● | ? | ● | ? | ◐ | Cheap IAP | Local VN | Overclaim AI/sync |
| YNAB | Method | Med | ● | ● | ●● | ● | ◐ | ● | Cloud | ~$109/yr | Approve import | Method force, price |
| Actual | Privacy | Med | ● | ● | Envelope | ● | ● | ● | ●● | Free MIT | Import/rules/export | Self-host only |
| Firefly | Power | Low | ●● | ● | ● | ● | ● | ● | Self-host | Free AGPL | Domain docs | Dense UI, AGPL code |
| Lunch Money | Power | Med | ● | ● | ● | ● | ● | ● | ◐ | ~$10/mo | API/list UX | US price/sync |
| Copilot | iOS | High | ● | ● | ● | ● | ● | ◐ | ◐ | ~$95/yr | To-review | Platform lock |
| Monarch | Couples | Med | ●● | ● | ● | ● | ● | ◐ | ◐ | ~$100/yr | Dashboard | Net-worth-first MVP |
| Goodbudget | Envelope easy | High | ◐ | ◐ | Envelope | ◐ | ◐ | ○ | ◐ | Free/$80 | Simple remaining | Manual heavy |
| Sheets | Everyone | Flex | DIY | DIY | DIY | DIY | DIY | ● | Local | Free | Export culture | No mobile joy |
| Ivy (OSS) | Android | High | ● | ● | ◐ | ● | ◐ | ◐ | Local | Free GPL | Quick-add UX | Archived, GPL |

---

# Phần C — User pain points (ưu tiên)

| Sev | Pain | Evidence | MVP response |
|---|---|---|---|
| **Critical** | Nhập giao dịch ma sát / quên | Secondary churn; genre reviews | Quick add &lt;10s, defaults, optional soft remind |
| **Critical** | Không biết tiền đi đâu / còn bao nhiêu | JTBD universal | Dashboard totals + category breakdown |
| **High** | Ads / paywall basic | Freemium VN apps | Free: accounts + txn + basic reports + export |
| **High** | Method/budget quá khó | YNAB curve **[User opinion]** | Category monthly only |
| **High** | Khó export / lock-in | U3 need | CSV export always |
| **High** | Bank sync fail / không có VN | Ecosystem | No sync dependency |
| **Medium** | Categories quá nhiều | UX assumption | Short VN defaults |
| **Medium** | Chart đẹp vô dụng | Design research | Actionable widgets only |
| **Medium** | Guilt UX | Principle | Calm copy |
| **Low MVP** | Family sharing complexity | Product risk | Post-MVP |

---

# Phần D — Repository matrix (chốt)

| Repo | License | Active | Học | Cấm |
|---|---|---|---|---|
| **Actual** MIT ~27k | Active | Import, rules, ownership, register | Clone whole client |
| **Firefly** AGPL ~24k | Active | Domain bills/piggy/transfer docs | Copy code |
| **Maybe** AGPL archived | Dead | Historical UX | Base product |
| **Ivy** GPL archived | Dead | Mobile entry UX | Copy code |
| **Ghostfolio** AGPL | Active | Monorepo (later invest) | Features MVP |
| **Beancount/hledger** GPL | Mature | Integer + balance concepts | App shell |

---

# Phần E — Deep dive lessons (áp dụng)

1. **Actual:** hosted SaaS ≠ local-first, nhưng **CSV import + rules + export** mang sang Supabase.  
2. **Firefly:** “withdrawal/deposit/transfer”; importer tách trust; **AGPL = docs only**.  
3. **Ivy:** keypad amount, recent categories — web dialog.  
4. **PTA:** transfer always balances — **already in MoneyFlow RPC**.

---

# Phần F — Recommended product direction

| | |
|---|---|
| **Primary users** | U1 + U2 + U3 (VN) |
| **Positioning** | Simple personal ledger web, fast entry, clear month view, data ownership |
| **Core JTBD** | “Khi tôi chi tiền, tôi ghi nhanh để sau này biết còn bao nhiêu và đã tiêu vào đâu.” |
| **Value prop** | Nhanh hơn Excel trên điện thoại; đúng hơn app quảng cáo; nhẹ hơn YNAB; rõ quyền dữ liệu |
| **MVP** | Auth · Accounts · Categories · Income/Expense/Transfer · Dashboard · Category budgets · Recurring light · Reports + CSV · Soft delete |
| **Non-goals** | Bank link · AI advisor · Family · Invest/crypto · OCR/voice · Full envelope · ERP |
| **Differentiation** | VN web-first + correct money model + free core no ads + export |
| **Risks** | Commodity app; manual churn; scope creep (inbox/AI) |

### Quan hệ với code “Inbox/capture” đã build
- **Adapt:** Paste/CSV là **công cụ giảm nhập tay** (P1), không đổi brand thành “Universal Inbox”.  
- **Home product:** Dashboard “còn bao nhiêu / tháng này” + quick add; capture optional nav.  
- Landing marketing: có thể **re-align** thu chi (không chỉ inbox) — backlog product.

---

# Phần G — Recommended architecture

## G.1 Stack (chốt)

| Layer | Choice | Why |
|---|---|---|
| Web | Next.js App Router + TS strict | Already |
| UI | Tailwind + shadcn/ui + Lucide | a11y, speed |
| Auth | Supabase Auth (Google + email) | Already |
| DB | Supabase Postgres + **RLS** | Multi-tenant |
| Money RPC | Postgres functions security definer | Atomic transfer/edit |
| Storage | Supabase Storage (later attachments) | |
| Host | Vercel | |
| Test | Node test / Vitest + Playwright | Expand |
| Charts | Recharts (existing) | Simple only |

## G.2 Module boundaries

```
src/
  app/                 # routes only
  components/          # UI
  lib/                 # pure domain (money, finance, budgets…)
  server/              # data access authenticated
  app/actions/         # mutations zod-validated
supabase/migrations/   # schema + RLS + RPC
```

**Rule:** No money math only in React components long-term; prefer `lib/`.

## G.3 Domain model (logical)

```
User → Profile
User → Account* (kind, currency, initial_balance_minor, archived)
User → Category* (income|expense)
User → FinancialTransaction* (kind, occurred_on, note, deleted_at, idempotency_key)
       └── TransactionEntry* (account_id, ±amount_minor, category_id?)
User → Budget* (category_id, month_start, limit_minor)
User → Commitment* / Goal* (existing)
```

**Invariants:** Phase 3 I1–I6 (transfer sum 0, soft delete, category kind match…).

## G.4 Balance

```
balance(account) = initial_balance_minor + Σ entries of non-deleted txns
total = Σ active account balances
income/expense reports EXCLUDE transfers
```

## G.5 Budget

```
spent(category, month) = Σ expense amounts that category in month
remaining = limit - spent  (show overspend explicitly)
NO rollover MVP
```

## G.6 Recurring

- Template (commitment) vs posted instance (real expense).  
- Edit instance ≠ edit series.

## G.7 Security model

| Control | Implementation |
|---|---|
| Isolation | RLS all user tables; `auth.uid()` |
| Never trust client user_id | Server session only |
| Validation | Zod on actions; DB checks |
| RPC | security definer + ownership checks |
| Secrets | service role server-only; never client |
| Export | CSV escape `=+-@` |
| Logs | No full raw statements / PAN |
| Delete account | Soft → hard job; export first |
| Headers | Next defaults + CSP later |
| Rate limit | Upload/auth later middleware |

## G.8 Testing strategy

| Layer | What |
|---|---|
| Unit | money parse, balance, transfer totals, budget progress, safe-to-spend |
| SQL | RLS policies; RPC transfer/edit |
| E2E | login → add expense → see dashboard → export |
| Security | cannot read other user rows |

## G.9 Audit strategy MVP

- `created_at` / `updated_at` / `deleted_at`  
- Later: `audit_events` for amount/account changes  

---

# Phần H — Feature decisions

| Feature | User problem | Competitor / OSS | MVP | Risk | Decision |
|---|---|---|---|---|---|
| Google + email auth | Access | All | Yes | OAuth config | **Adopt** |
| Onboarding short | Activation | YNAB long = bad | Yes | Skip friction | **Adapt** 3 steps max |
| Multi accounts | Multi ví VN | ML, MK | Yes | — | **Adopt** |
| Initial balance | Start mid-life | All | Yes | Rewrite history warn | **Adopt** |
| Archive account | Old cards | Common | Yes | — | **Adopt** |
| Default VN categories | Setup | ML | Yes | Too many | **Adapt** short list |
| Custom categories | Flexibility | All | Yes | Sprawl | **Adopt** |
| Subcategories | Detail | Some | No | Complexity | **Reject** MVP |
| Add expense/income | Core | All | Yes | — | **Adopt** |
| Quick add &lt;10s | P1 churn | Ivy, ML FAB | Yes | — | **Adopt** |
| Remember last account/cat | Speed | Common | Yes | — | **Adopt** |
| Transfer | Correct balances | Actual/Firefly | Yes | UX confuse | **Adopt** |
| Soft delete + undo toast | Mistake | SaaS | Yes | — | **Adopt** |
| Note field | Context | All | Yes | — | **Adopt** |
| Search/filter txns | Find | All | Yes | — | **Adopt** |
| Dashboard totals | JTBD | All | Yes | Vanity charts | **Adopt** |
| Category breakdown | Where money went | All | Yes | Pie only | **Adapt** bar/list primary |
| Safe-to-spend | Daily control | MoneyFlow existing | Yes insight | Misread | **Adapt** secondary |
| Category monthly budget | Control | ML, simple apps | Yes | — | **Adopt** |
| Envelope zero-based | Behavior | YNAB/Actual | No | Learning | **Reject** MVP |
| Budget 80/100% UI | Alert | Common | Yes | Guilt | **Adapt** calm |
| Recurring commitments | Bills | Firefly bills | Yes | — | **Adopt** (exist) |
| Savings goals | Motivation | Firefly piggy | Yes light | — | **Adopt** (exist) |
| Reports month compare | Trend | All | Yes | — | **Adopt** |
| CSV export | Ownership U3 | Actual | Yes | Formula inject | **Adopt** |
| CSV import | Migration | Actual | **P1** | Dupes | **Adapt** |
| Paste parse | Speed | Experiments | **P1** | Accuracy | **Adapt** optional |
| Bank sync | Auto entry | YNAB/MK | No | Legal/region | **Reject** MVP |
| AI advisor | Advice | Hype | No | Liability | **Reject** |
| Family share | Couples | Monarch | No | Authz | **Reject** MVP |
| OCR/voice | Speed | MK marketing | No | Cost | **Reject** MVP |
| Investments | Wealth | Ghostfolio | No | Scope | **Reject** |
| Attachments | Receipts | Expensify | Later | Storage | **Reject** MVP |
| Tags | Flexible label | Toshl | Later | — | **Reject** MVP |
| Multi-currency FX | Travel/freelance | Wallet | Later | Complexity | **Reject** MVP (VND-first) |
| Net worth hero | Status | Monarch | No | Overwhelm | **Reject** MVP |
| Ads | Revenue | ML free | No | Trust | **Reject** |
| Dark mode | Comfort | Common | Yes | — | **Adopt** (exist) |

---

# Phần I — Roadmap

## I.0 Foundation (done / polish)
**Goal:** Correct ledger + auth.  
**Deliverables:** Schema, RLS, transfer RPC, budgets, goals, commitments, demo mode.  
**Exit:** Tests pass for money core; you can log real expenses.  
**Metrics:** typecheck/test green.  
**Don't:** new product lines.

## I.1 First vertical slice (1–2 weeks founder)
**Goal:** Daily habit path works.  
**Deliverables:**  
- Stable quick add (date, prefs, keep-open)  
- Dashboard: balance, month income/expense, top categories, recent txns  
- Accounts CRUD  
**Exit:** Add expense → appears on dashboard & account balance correct.  
**Metrics:** time-to-add-expense &lt; 10s.  
**Don't:** bank sync, AI.

## I.2 MVP (4–8 weeks)
**Goal:** Full personal tracker usable 30 days.  
**Deliverables:** budgets UI polish, recurring pay flow, reports + CSV export, soft delete UX, privacy/export/delete account pages, mobile responsive, onboarding short.  
**Exit:** 5 friends use 2 weeks without data loss.  
**Metrics:** D7 retention (qualitative), export used ≥1.  
**Don't:** family, invest, OCR.

## I.3 Private beta
**Goal:** Validate VN copy & free tier.  
**Deliverables:** bugfix, CSV import P1, light rules (optional), performance.  
**Exit:** 20–50 users; interviews.  
**Metrics:** weekly active loggers.  
**Risks:** support load.

## I.4 Public beta
**Goal:** Soft launch.  
**Deliverables:** landing re-aligned to thu chi (not only inbox), rate limits, monitoring.  
**Exit:** stable uptime; no P0 money bugs.  
**Don't:** paid growth ads before retention.

## I.5 Post-MVP
**Candidates (evidence-gated):** CSV import mature, notification optional, multi-currency, family, PWA share, open banking if VN ready.  
**Still don't by default:** AI advisor, social, marketplace.

---

# Phần J — Architecture Decision Records (formal drafts)

### ADR-001 — Amount as integer minor units
**Status:** Accepted (codebase)  
**Decision:** Store `bigint amount_minor`; VND precision 0.  
**Consequences:** No float drift; JS must use safe integers.

### ADR-002 — Transaction header + entries
**Status:** Accepted  
**Decision:** `financial_transactions` + `transaction_entries` (1 or 2 legs).  
**Consequences:** Transfer natural; reports filter by kind.

### ADR-003 — Atomic transfer
**Status:** Accepted  
**Decision:** RPC creates 2 entries sum 0; same currency only.  
**Consequences:** FX later separate.

### ADR-004 — Balance calculation
**Status:** Accepted  
**Decision:** `initial + Σ entries` non-deleted.  
**Consequences:** No cached balance required MVP; index entries.

### ADR-005 — Flat categories
**Status:** Accepted MVP  
**Decision:** No subcategory table; optional tags later.  
**Consequences:** Simpler UX.

### ADR-006 — Monthly category budgets without rollover
**Status:** Accepted MVP  
**Decision:** One limit per category per calendar month.  
**Consequences:** Reject envelope assign-every-dollar.

### ADR-007 — Recurring template vs instance
**Status:** Accepted  
**Decision:** Commitments generate/post real expenses; edit instance isolated.  
**Consequences:** Clearer mental model.

### ADR-008 — Soft delete
**Status:** Accepted  
**Decision:** `deleted_at`; restore optional; hard delete on account purge.  
**Consequences:** Audit-friendly.

### ADR-009 — VND-first
**Status:** Accepted MVP  
**Decision:** Default VND; block cross-currency transfer.  
**Consequences:** Freelancer multi-FX later.

### ADR-010 — Credit card as signed account
**Status:** Accepted MVP  
**Decision:** `credit_card` kind; payment = transfer from asset.  
**Consequences:** No full statement cycle yet.

### ADR-011 — Idempotency keys
**Status:** Accepted  
**Decision:** UUID per create; unique per user.  
**Consequences:** Safe retries.

### ADR-012 — Safe-to-spend is insight
**Status:** Accepted  
**Decision:** Derived metric; not stored ledger truth; show formula.  
**Consequences:** Avoid false confidence.

### ADR-013 — RLS multi-tenant
**Status:** Accepted  
**Decision:** Every user table RLS; server resolves auth.  
**Consequences:** No client-supplied user id trust.

### ADR-014 — CSV export always available
**Status:** Accepted  
**Decision:** Export non-deleted txns; formula-escape.  
**Consequences:** Trust + U3 retention.

### ADR-015 — No AGPL code in product
**Status:** Accepted  
**Decision:** Study Firefly/Maybe/Ghostfolio; reimplement under project license.  
**Consequences:** Prefer Actual MIT ideas.

---

# Phần K — Hành động tiếp theo

## K.1 Mười việc nên làm ngay
1. Chốt định vị **thu chi cá nhân** (không brand Universal Inbox).  
2. Giữ schema ledger hiện tại; viết thêm unit tests balance/transfer/budget.  
3. Polish **quick add** as primary CTA everywhere.  
4. Dashboard: 4 câu trả lời — số dư, thu tháng, chi tháng, top category.  
5. CSV export path rõ trên UI.  
6. Privacy policy + delete account flow.  
7. Short onboarding (ví mặc định + 1 expense mẫu).  
8. Default categories VN rút gọn.  
9. 5–10 phỏng vấn U1–U4 (câu hỏi dưới).  
10. Commit/push bộ docs `docs/research/01–05` vào git (tránh mất stash).

## K.2 Mười việc chưa nên làm
1. Bank / open banking integration.  
2. AI chatbot tư vấn.  
3. Family sharing.  
4. OCR hóa đơn / voice.  
5. Envelope YNAB onboarding.  
6. Net worth / invest / crypto.  
7. Subcategory hierarchy.  
8. Multi-currency FX engine.  
9. Copy AGPL code (Firefly/Maybe).  
10. Bật ads hoặc khóa export sau paywall.

## K.3 Mười câu hỏi phỏng vấn
1. Tuần trước bạn theo dõi tiền thế nào?  
2. Lần gần nhất muốn biết còn bao nhiêu — bạn làm gì?  
3. Bao nhiêu TK/ví đang dùng?  
4. App chi tiêu từng dùng? Bao lâu? Vì sao dừng?  
5. Công đoạn nào mất thời gian nhất khi ghi chi?  
6. Sau khi ghi một khoản, bạn muốn thấy ngay gì?  
7. Excel/Sheets? Dùng để làm gì?  
8. “Ngân sách” nghĩa là gì với bạn?  
9. Bạn nghĩ sao nếu app cho xuất CSV mọi lúc?  
10. Điều gì khiến bạn tin app tài chính?

## K.4 Mười rủi ro lớn nhất
1. Churn manual entry.  
2. Commodity vs Money Lover.  
3. Money bugs destroy trust.  
4. Scope creep inbox/AI.  
5. RLS hole = data leak.  
6. Supabase region / PDPA.  
7. Free tier unsustainable (later).  
8. Misunderstood safe-to-spend.  
9. Credit card UX confusion.  
10. Founder overbuild before interviews.

## K.5 Năm giả thuyết cần kiểm chứng
| # | Hypothesis | Test |
|---|---|---|
| H1 | Quick add &lt;10s → D7 retention cao hơn form dài | A/B or self-use diary |
| H2 | Category monthly budget đủ cho U1 (không cần envelope) | Interview after 2 weeks use |
| H3 | CSV export tăng trust U3 | Ask Excel users |
| H4 | Dashboard 4 metrics &gt; chart gallery for action | Task success test |
| H5 | VN users accept manual if multi-wallet clear (no bank link) | 10 interviews |

### Kill / pivot signals
- After 20 users × 2 weeks: &lt;20% log ≥1 txn/week → revisit entry or positioning.  
- Critical balance bug in production → freeze features, fix domain.  
- Users only want bank sync → delay launch or partner; don't fake sync.

---

# Kết thúc toàn bộ research series (G1–G5)

### Đã xác minh
- Positioning + MVP boundary.  
- Domain rules match existing MoneyFlow ledger.  
- OSS: Actual MIT primary teacher; Firefly docs only.  
- Competitor gaps for VN web simple tracker.

### Chưa xác minh
- Primary interviews; WTP; exact free tier limits; production PDPA counsel.

### Độ tin cậy thấp
- Market $ sizes; secondary retention % blogs.

### Quyết định vận hành code
- **Autopilot coding** có thể bật lại **chỉ** khi backlog task khớp MVP thu chi (không mù quáng làm mọi Inbox task).  
- Ưu tiên: tests domain · dashboard polish · export/privacy · quick add — trước upload parser phức tạp nếu conflict capacity.

### Câu hỏi còn mở cho founder
1. Home mặc định: Dashboard hay Inbox? **Đề xuất: Dashboard + Quick add; Capture P1.**  
2. Free forever core hay freemium sau beta?  
3. Self-use 14 ngày trước public beta?

---

## Chỉ mục research

| File | Nội dung |
|---|---|
| [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md) | Kế hoạch |
| [02_USER_AND_COMPETITORS.md](./02_USER_AND_COMPETITORS.md) | User + competitors |
| [03_DOMAIN_RULES.md](./03_DOMAIN_RULES.md) | Nghiệp vụ tiền |
| [04_OPEN_SOURCE_ANALYSIS.md](./04_OPEN_SOURCE_ANALYSIS.md) | OSS + license |
| **05_PRODUCT_AND_ARCHITECTURE.md** | **Synthesis (này)** |

---

**Giai đoạn 5 complete.**  
Research track **đóng vòng**. Implementation nên bám **Phần F + H + I + K**.
