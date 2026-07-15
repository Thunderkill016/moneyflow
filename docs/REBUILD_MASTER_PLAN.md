# MoneyFlow — Rebuild Master Plan

**Ngày:** 2026-07-15  
**Mục tiêu:** Rebuild toàn bộ trải nghiệm web **theo journey thật** (landing → login/register → onboarding → dashboard → mọi tính năng core), học best-of industry, **không** feature dump.  
**Authority:** G5 (`docs/research/05_PRODUCT_AND_ARCHITECTURE.md`) · `BEST_OF_MATRIX.md` · `MVP_DEFINITION.md` · `IDEA.md`  
**Skill khi code:** `frontend-design` · `moneyflow-web` · `ship-feature` · `frontend-qa` · `verification-before-completion`

---

## 0. Executive summary

| | |
|---|---|
| **Sản phẩm đã có** | Core MVP gần đủ: multi-ví, ghi chi, transfer, insights, budgets, bills, goals, reports, CSV, onboarding, demo. Competitor functional gap ~18/18. |
| **Vấn đề thật** | Không thiếu feature — thiếu **một journey thống nhất, copy đúng G5, visual hierarchy “Calm Finance”, và polish cảm giác premium**. |
| **Lỗi brand nghiêm trọng** | `auth-form.tsx` vẫn bán **Inbox** (“hộp thư giao dịch”, “Đưa dữ liệu vào Inbox”) — trái landing G5 và PRODUCT.md. |
| **Doc conflict** | `UX_PRINCIPLES.md` vẫn “Inbox-first” — phải rewrite thành **Thu-chi-first / Insights-first**. |
| **Chiến lược rebuild** | **Progressive redesign theo phase journey**, giữ domain (integer VND, transfer ≠ chi, soft delete). Không rewrite stack. Không bank sync / AI / family. |

### Định vị khóa (không đổi)

> Web **thu chi cá nhân** VN: nhiều ví · ghi &lt; 10s · tháng này tiền đi đâu · CSV · bình tĩnh.  
> Không: ngân hàng · AI tư vấn · family · inbox brand · OCR · YNAB envelope.

### Câu hỏi lõi mỗi màn

| Màn | Câu hỏi user phải trả lời trong 3–5s |
|-----|--------------------------------------|
| Landing | “Cái này giúp tao kiểm soát tiền thế nào?” |
| Login/Register | “Có tin được không? Tao đăng ký mất bao lâu?” |
| Onboarding | “Bước đầu làm gì? Xong là dùng được chưa?” |
| Insights | “Hôm nay chi được bao nhiêu? Cần chú ý gì?” |
| Ghi chi | “Nhập xong trong &lt; 10s chưa?” |
| Transactions | “Tìm / sửa / xóa khoản sai được không?” |
| Kế hoạch | “Ngân sách / hóa đơn / mục tiêu còn bao nhiêu?” |
| Export/Settings | “Data của tao, mang đi / xóa được không?” |

---

## 1. Research synthesis (internet + industry)

### 1.1 Fintech landing (WSA, Unbounce, SaaS CRO 2025–26)

**Cấu trúc 8 bước chuyển đổi (rút gọn cho consumer PFM):**

1. **Hero** — outcome headline + 1 primary CTA + 1 trust line (không multi-CTA cạnh tranh)  
2. **Trust bar** — privacy / no bank password / export / free core (context cạnh CTA, không chỉ footer)  
3. **Product explanation** — 1 đoạn + 3 bullet JTBD  
4. **Benefits** — outcome (“biết còn bao nhiêu”), không feature laundry  
5. **How it works** — 3–4 bước onboarding (đã khớp code landing)  
6. **Social proof** — MVP: demo preview card + use-case fit; sau: quote thật  
7. **Final CTA** — lặp 1 action (“Dùng miễn phí”)  
8. **Compliance-lite** — privacy link, không overclaim  

**Số liệu tham chiếu (secondary):** financial services median conversion ~8.4% (Unbounce); form ít field tăng completion mạnh; trust cạnh form giảm abandon; mobile delay 1s ~−20% conversion.

**Áp dụng MoneyFlow:**

| Đã tốt | Cần nâng |
|--------|----------|
| Headline outcome “có thể chi bao nhiêu” | Demo CTA rõ hơn (“Thử demo không cần tài khoản”) |
| Trust line no bank password | Trust badges lặp cạnh final CTA |
| How-it-works 4 bước | Visual polish: hierarchy type, spacing, preview fidelity |
| Feature grid | Cắt / gộp nếu scroll dài mobile; 1 final CTA band |
| RSC static (LCP) | Giữ — không client-hydrate cả landing |

### 1.2 Auth / signup UX (Authgear, Eule, industry 2025–26)

- **Ease + security + trust** cùng lúc.  
- Email-as-username; password show toggle; **generic login error** (không lộ email tồn tại).  
- Fintech: magic-link đơn thuần rủi ro phishing — giữ password + optional Google; passkeys later.  
- Microcopy trust cạnh submit: “Không mật khẩu ngân hàng · Xuất CSV bất cứ lúc nào”.  
- Signup → onboarding ngay, không dump vào empty dashboard.  
- **Copy phải khớp brand** — hiện **FAIL** (inbox).

**Target copy (G5):**

| Mode | description |
|------|-------------|
| login | “Tiếp tục quản lý thu chi của bạn.” |
| register | “Tạo tài khoản để ghi thu chi, theo dõi nhiều ví, xuất CSV khi cần.” |
| story quote | Bỏ “bạn duyệt trước khi vào sổ” inbox tone → “Số đúng. Chuyển khoản không tính chi. Data của bạn.” |

### 1.3 Onboarding (PFM + fintech activation)

Pattern thắng: **≤ 3 bước**, mỗi bước 1 job, skip luôn có, first value nhanh.

| Step | Job | Done khi |
|------|-----|----------|
| 1 Trust | 3 promise G5 (no bank, export, calm) | User continue |
| 2 Ví | 1 ví tiền mặt + số dư | Account exists |
| 3 First expense | Optional ghi chi hoặc “vào Tổng quan” | Path to insights |

**Tránh:** multi-screen category tree, envelope method, inbox as step 1.

Code onboarding gần đúng — polish copy + visual + analytics events (đã có `onboarding_completed`).

### 1.4 Dashboard hierarchy (Eleken, fintech viz, Monarch/Copilot/PocketGuard)

**Cấu trúc chuẩn PFM home:**

```
[Welcome + primary action: Ghi chi]
[Attention strip — only if items]     ← Copilot “to review”
[Hero KPI: Safe-to-spend]             ← PocketGuard
[KPI row: Số dư | Thu tháng | Chi tháng]
[Trends / weekly summary]             ← Ritual light
[Top categories + recent txns]
[Featured budget | bill | goal]       ← planning cards
[Export discoverable ≤ 2 clicks]
```

**Luật hierarchy:**

1. KPI quan trọng nhất **above fold** (safe-to-spend + chi tháng).  
2. Attention **không** thay hero — strip mỏng.  
3. Charts secondary; **actionable** widgets only.  
4. Empty ledger = **one** CTA “Ghi khoản chi đầu”.  
5. Money: mono digits, +/−/↔ signs (không chỉ màu).  
6. Calm thresholds budget (near/over), không guilt red flash.

### 1.5 Competitor → one pattern (best-of, not dump)

| Source | Pattern | MoneyFlow surface |
|--------|---------|-------------------|
| Money Lover / Ivy | Multi-ví + ghi siêu nhanh | FAB + dialog amount focus + recent cats |
| Firefly / Actual | Transfer ≠ expense; ledger truth | Domain + list copy |
| PocketGuard | Safe-to-spend clarity | Insights hero card + 1 dòng explain |
| Copilot | Attention / to-review | Attention strip |
| Monarch | One overview | `/insights` |
| Lunch Money | Find fast | Search + ⌘K on transactions |
| Actual / Sheets | Ownership export | Insights → CSV ≤ 2 clicks |
| Goodbudget | Simple category limit | Budgets calm bar |
| Ritual | Weekly glance | Weekly summary card |
| YNAB | (method only — **reject** full clone) | — |

### 1.6 Visual direction (frontend-design + Calm Finance)

**Tránh AI-default clichés:** cream+serif+terracotta; void black+acid green; broadsheet hairline denseness.

**Đề xuất identity “Calm Ledger VN”:**

| Trục | Choice |
|------|--------|
| Mood | Sáng, thoáng, tin cậy — như sổ tay tài chính hiện đại, không casino fintech |
| Accent | 1 accent tin cậy (blue-teal hoặc deep teal) — **không** rainbow |
| Type | Display có cá tính (restrained) + body sạch + **mono tabular** cho tiền |
| Signature | Hero số “Có thể chi” lớn, mono, 1 accent underline — recognisable |
| Money colors | Income green / expense red / transfer neutral — **kèm** sign text |
| Density | Mobile airy; desktop max ~1120 content; cards 12–16 radius nhất quán |
| Motion | 150–200ms soft; respect `prefers-reduced-motion` |

Cập nhật `docs/design-system.md` tokens **trước** khi repaint bulk CSS.

---

## 2. Audit hiện trạng (code 2026-07-15)

| Surface | File chính | Trạng thái | Gap rebuild |
|---------|------------|------------|-------------|
| Landing | `landing-page.tsx` | G5 copy tốt, RSC | Visual polish, demo CTA, final CTA band |
| Auth | `auth-form.tsx` | **Copy inbox sai** | Fix copy + trust microcopy + story panel G5 |
| Onboarding | `onboarding-flow.tsx` | 3 bước OK | Visual + skip clarity |
| Insights | `moneyflow-dashboard.tsx` | Feature-rich | Hierarchy/weight: safe hero, bớt clutter, empty 1 CTA |
| Transactions | `transactions-page.tsx` | Core | Search bar shell, transfer subtitle, a11y |
| Accounts | `accounts-page.tsx` | Core | Empty 1 CTA, archive calm |
| Budgets / Bills / Goals | `*-page.tsx` | Core | Consistent cards + empty |
| Reports + Export | reports / settings | Core | Discoverability from insights |
| Capture / Inbox / Rules | Lab | Keep under Nâng cao | **Không** marketing |
| UX_PRINCIPLES | docs | **Inbox-first outdated** | Rewrite G5 |
| Nav | `nav-ia`, `app-shell` | Core vs Lab | Guard regressions |

---

## 3. Phased rebuild (thứ tự bắt buộc)

Nguyên tắc: **ship theo journey**; mỗi phase có gate testable; không mở phase sau khi phase trước đỏ.

### Phase 0 — Law & copy lock (0.5–1 ngày) 🔴 FIRST

**Mục tiêu:** Mọi surface nói cùng một product.

| # | Work | Done khi |
|---|------|----------|
| 0.1 | Fix `auth-form` login/register descriptions + story/blockquote G5 | Grep “hộp thư\|Inbox” trong auth = 0 (trừ lab routes) |
| 0.2 | Rewrite `UX_PRINCIPLES.md` §1: Insights + ghi chi primary; inbox lab | Doc matches PRODUCT/G5 |
| 0.3 | Align `TRUST_MICROCOPY` / onboarding promises | 3 promises identical everywhere |
| 0.4 | Snapshot test / unit copy tests if any | `npm test` green |

**Non-goal:** visual redesign.

---

### Phase 1 — Design tokens & shell (1–2 ngày)

| # | Work | Done khi |
|---|------|----------|
| 1.1 | Chốt palette + type + spacing trong `design-system.md` | Tokens named |
| 1.2 | Map CSS variables (`globals` / theme) | Light + dark ok |
| 1.3 | AppShell: nav Core/Lab, FAB, header density | Mobile 375 + desktop |
| 1.4 | EmptyState / Button / Card primitives consistent | frontend-qa checklist |

**Gate:** no money logic change; visual regression spot-check.

---

### Phase 2 — Landing rebuild (1–2 ngày)

Wireframe (ASCII):

```
[Logo]                    [Đăng nhập] [Bắt đầu]
────────────────────────────────────────────
EYEBROW: Quản lý thu chi cá nhân
H1: Biết hôm nay có thể chi bao nhiêu
Lead: 1–2 câu JTBD
Trust: lock · CSV · không mật khẩu NH
[Dùng miễn phí]  [Thử demo]  [Đăng nhập text]
          |── preview safe-to-spend card ──|

How: 1 Ví → 2 Ghi → 3 Tổng quan → 4 Ngân sách/CSV
Fit: 3 cards (multi-ví / Excel / từng bỏ app)
Features: 4–6 max (thu-chi-ck, budget, bills/goals, export)
Trust grid
Final CTA band: Dùng miễn phí | Demo
Footer: privacy · login
```

| Done khi | |
|----------|--|
| Lighthouse LCP path static preserved | |
| Primary CTA = register; secondary = demo or login | |
| Zero inbox brand | |
| Mobile single column readable | |

---

### Phase 3 — Auth trust (0.5–1 ngày)

| # | Work |
|---|------|
| 3.1 | Left story panel: safe-to-spend thesis + 3 bullets G5 (not inbox) |
| 3.2 | Form: field errors, show password, privacy checkbox register |
| 3.3 | Google + email paths; `POST_AUTH_REDIRECT` = insights/onboarding |
| 3.4 | Demo mode entry obvious |

**Security-pass** nếu đụng actions.

---

### Phase 4 — Onboarding polish (0.5–1 ngày)

| # | Work |
|---|------|
| 4.1 | Progress 1/3–3/3 clear |
| 4.2 | Wallet defaults VN (Tiền mặt) |
| 4.3 | Step 3: “Ghi chi đầu” primary + “Vào tổng quan” secondary |
| 4.4 | Never route new user to `/inbox` |

---

### Phase 5 — Insights dashboard hierarchy (2–3 ngày) ⭐ wow surface

| # | Work |
|---|------|
| 5.1 | Re-order sections per §1.4 hierarchy |
| 5.2 | Safe-to-spend **hero** (size, mono, explain 1 line always) |
| 5.3 | KPI triad: balance / thu / chi |
| 5.4 | Attention strip thin; max N chips |
| 5.5 | Weekly + top cats + recent (collapse on mobile if needed) |
| 5.6 | Planning featured cards (budget/bill/goal) progressive |
| 5.7 | Empty ledger one CTA |
| 5.8 | Export link ≤ 2 clicks from hero area |
| 5.9 | Code-split dialogs keep (perf) |

**Gate:** e2e expense path; transfer not in expense totals; empty 1 CTA.

---

### Phase 6 — Daily loop: ghi chi + transactions + accounts (2 ngày)

| Surface | Pattern |
|---------|---------|
| Add dialog / `/capture/quick` | Amount focus first; recent categories; remember wallet; save & add another |
| FAB | Always visible core routes; not covered by demo banner |
| Transactions | Search, filters, transfer subtitle “không tính chi”, soft delete undo |
| Accounts | Multi-wallet; archive; initial balance clear |

**Gate:** ghi chi &lt; 10s path e2e; unit transfer.

---

### Phase 7 — Planning suite (1–2 ngày)

| Page | Focus |
|------|-------|
| Budgets | Remaining mono; calm near/over; empty 1 CTA |
| Commitments | Due + pay/undo; reserved feeds safe-to-spend |
| Goals | Featured progress; allocate light |
| Reports | Month period; top cats; link export |
| Categories | Short VN defaults; CRUD calm |

Consistency: same card shell, empty pattern, money format.

---

### Phase 8 — Trust, settings, lab quarantine (1 ngày)

| # | Work |
|---|------|
| 8.1 | Privacy / delete account / export settings copy |
| 8.2 | Appearance theme |
| 8.3 | Lab (inbox, paste, upload, rules, CSV import, split) **only** under Nâng cao |
| 8.4 | No landing/auth/onboarding links to lab as brand |

---

### Phase 9 — Quality gates (continuous)

| Gate | Command / check |
|------|-----------------|
| Unit + domain | `npm test` |
| E2E expense | `npm run test:e2e` (landing → ghi → insights) |
| Build | `npm run build` (demo env) |
| Lint/types | `npm run lint && npm run typecheck` |
| MVP verify | `scripts/mvp-verify.sh` |
| Frontend QA | mobile nav, empty, dialogs, money signs |
| Security | auth/RLS if touched |
| Perf | LCP doc; CLS; no layout thrash |
| Copy grep | no inbox brand on landing/auth/insights hero |

Khi green: update `IDEA.md` quality bar + optional `docs/MVP_SHIPPED.md`.

---

## 4. Implementation principles (khi code)

1. **Không rewrite stack** — Next App Router, Supabase, integer VND, double-entry lite.  
2. **Domain không đụng lung tung** — transfer ≠ expense, soft delete, RLS.  
3. **Một PR = một phase slice** có thể verify.  
4. **Test first** cho money behavior; visual sau.  
5. **frontend-design** cho landing + insights signature; không template AI.  
6. **Vietnamese first** — labels, empty, errors.  
7. **Progressive disclosure** — Core nav gọn; Lab ẩn.  
8. **Autopilot** chỉ khi user bật lại; task phải có JTBD + Done testable (08_PFM).

---

## 5. Explicit non-goals (rebuild)

- Bank sync / open banking / Plaid  
- AI advisor / chatbot  
- Family sharing  
- Full YNAB envelope onboarding  
- Net-worth / invest hero  
- Inbox as brand or home  
- AGPL code paste  
- Feature dump “giống Monarch full”  
- Telegram / busywork audit loops  

---

## 6. Suggested first ship (48h)

Nếu chỉ làm 1 đợt ngay:

1. **Phase 0** auth + principles copy (critical brand)  
2. **Phase 5 partial** — safe-to-spend hero hierarchy on insights  
3. **Phase 2 light** — landing demo CTA + final band  

→ User cảm nhận “sản phẩm đúng + dashboard rõ” trước khi repaint toàn bộ.

---

## 7. Sources (research trail)

| Topic | Refs |
|-------|------|
| Fintech landing structure / trust | WSA fintech landing guide; Unbounce financial services CR; SaaS trust/social proof guides 2025–26 |
| Auth UX | Authgear login/signup 2025; Eule UX guidelines; generic errors + minimal fields |
| Dashboard hierarchy | Eleken financial dashboards; fintech viz (cash flow vs clutter); Monarch/Copilot/PocketGuard patterns |
| PFM competitors | `docs/research/05`, `06`, `08`; `BEST_OF_MATRIX.md`; Money Lover multi-wallet |
| Product law | G5, PRODUCT.md, MVP_DEFINITION, IDEA.md |
| Design craft | `.grok/skills/frontend-design`, `docs/design-system.md` (update G5) |

---

## 8. Decision log

| Quyết định | Rationale |
|------------|-----------|
| Rebuild journey-first, not greenfield rewrite | Core domain already solid; risk of money bugs high if rewrite |
| Fix auth copy before big visual | Brand contradiction kills trust |
| Insights = product home | G5 + auth-redirect already `/insights` |
| Lab stays lab | Differentiator = daily thu-chi loop, not inbox |
| Confirm before mass CSS rewrite | User control; avoid autopilot thrash |

---

**Next step for human:** duyệt plan → chọn “làm Phase 0+5 ngay” hoặc “full Phase 0→9 theo thứ tự”. Agent **không** tự bật autopilot trừ khi được yêu cầu.
