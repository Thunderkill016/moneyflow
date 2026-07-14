# Giai đoạn 2 — User & Competitor Research

**Sản phẩm:** Web app quản lý thu chi cá nhân  
**Ngày:** 2026-07-15  
**Phạm vi:** Người dùng + đối thủ + pain points + khoảng trống  
**Không code**  

**Phân loại bằng chứng**  
- **[Fact]** — quan sát được từ nguồn chính thức / repo / docs  
- **[User opinion]** — review, Reddit, forum  
- **[Secondary]** — blog/report tổng hợp  
- **[Assumption]** — suy luận team, chưa interview  
- **[Unverified]** — chưa kiểm chứng đủ  

**Nguồn & ngày truy cập:** ghi trong §9. Truy cập chính: **2026-07-15**.

**Liên quan:** [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md)

---

## 1. Tóm tắt điều hành (Phase 2)

### 1.1 Người dùng mục tiêu ban đầu (đề xuất)

**Primary:** Người Việt **mới đi làm / sinh viên cao cấp / người đang dùng Excel** muốn:

1. Biết **còn bao nhiêu tiền** (nhiều ví).  
2. Biết **tháng này thu/chi** và **chi vào đâu**.  
3. **Ghi 1 khoản chi trong vài giây**.  
4. **Xuất dữ liệu** khi muốn.

**Secondary (post-MVP):** cặp đôi/gia đình, power user envelope (YNAB-like).

### 1.2 Pain point lớn nhất (ưu tiên)

| Hạng | Pain | Severity | MVP? |
|---|---|---|---|
| 1 | **Nhập giao dịch ma sát cao → bỏ app** | Critical | **Có** |
| 2 | **Không biết tiền đi đâu / mất kiểm soát** (lý do bắt đầu) | Critical | Có (dashboard + categories) |
| 3 | **Paywall / ads / giới hạn free** gây mất tin | High | Có (free core honest) |
| 4 | **Budget method quá khó** (YNAB-class) | High cho U1 | Tránh full envelope |
| 5 | **Bank sync không cover VN** hoặc hỏng → kẹt | High | Không phụ thuộc sync MVP |
| 6 | **Export / ownership kém** | High U3 | Có CSV |
| 7 | Cảm giác tội lỗi / phán xét | Medium | Tone design |
| 8 | Family sharing phức tạp | Low MVP | Không |

### 1.3 Khoảng trống thị trường (hypothesis)

> Ứng dụng **web-first tiếng Việt**, multi-ví, **nhập cực nhanh**, báo cáo **hành động được**, **export thật**, privacy rõ, **không** ép zero-based method, **không** phụ thuộc open banking — trong khi Money Lover/MISA mạnh mobile + ads/IAP, YNAB/Monarch đắt + US banks, Actual/Firefly mạnh nhưng self-host/learning curve.

**[Assumption]** — cần interview U1–U4 tại VN để xác nhận.

### 1.4 5 quyết định quan trọng (từ Phase 2)

1. **Job cốt lõi:** “Ghi thu chi đủ tin cậy để tôi biết còn bao nhiêu và tháng này đã chi thế nào” — không “AI tư vấn”.  
2. **Wedge UX:** **Quick add < 5–10 giây** + remember last account/category.  
3. **Budget MVP:** ngân sách **theo danh mục / tháng** + remaining + optional safe-to-spend — **Reject** full YNAB method onboarding.  
4. **Data model:** income / expense / transfer tách; money integer; multi-account — học Actual/Firefly, UI đơn giản Money Lover.  
5. **Import CSV:** **Adapt** (P1 sau quick-add ổn) — quan trọng U3; **không** bank link MVP.

---

## 2. Nghiên cứu người dùng

### 2.1 U1 — Người mới đi làm

| | |
|---|---|
| **Trigger bắt đầu** | Lương về rồi “hết tiền không hiểu”; muốn tiết kiệm nhà/xe **[Assumption + common narrative]** |
| **Job** | Thấy số dư + chi tiêu tháng; không học phương pháp |
| **Friction** | Quên ghi; app nhiều màn; free limited |
| **Aha** | “Ô, tháng này ăn uống đã 4tr” |
| **Pay** | Thấp–TB; free đủ dùng quan trọng |
| **MVP fit** | **Cao** |

### 2.2 U2 — Sinh viên

| | |
|---|---|
| **Trigger** | Tiền trợ cấp/part-time hạn chế; cuối tháng cháy túi |
| **Job** | Daily control, simple limits |
| **Friction** | Ads; premium; phức tạp |
| **Pay** | Rất thấp |
| **MVP fit** | **Cao** nếu free tier thật |

### 2.3 U3 — Excel / Sheets

| | |
|---|---|
| **Trigger** | Mệt công thức/chart; muốn mobile ghi nhanh |
| **Job** | Linh hoạt + report + **export** |
| **Friction** | Dual entry; lock-in; không CSV |
| **Aha** | Ghi mobile → export về Sheet cuối tháng |
| **MVP fit** | **Cao** (export + multi-account) |

### 2.4 U4 — Từng bỏ app

**Lý do bỏ (tổng hợp secondary + reviews genre):**

| Lý do | Bằng chứng | Loại |
|---|---|---|
| Nhập tay mệt / quên | Churn literature: manual entry failure mode; PF apps Day-30 retention kém **[Secondary]** | Secondary |
| Learning curve (YNAB) | Reviews & comparisons: steep curve, method commitment **[User opinion / secondary]** | Mixed |
| Ads / paywall free | Money Lover / consumer freemium common complaint theme **[User opinion]** | Opinion aggregate |
| Sync hỏng / reconnect | Bank sync re-auth → many stop rather than reconnect **[Secondary]** | Secondary |
| Không thấy hành vi đổi | Tracking ≠ behavior change **[Assumption]** | Assumption |
| Chuyển Excel/sổ | Common path **[Assumption]** | Assumption |

**Re-entry trigger:** tháng burnout tiền; thuế/thuê nhà; “năm mới quyết tâm” — **[Assumption]**.

### 2.5 U5 — Hộ gia đình / cặp đôi (post-MVP only)

- Shared budget, privacy, “ai chi gì” — Monarch/Copilot couples strength **[Fact product positioning]**.  
- **Không** MVP: social complexity + authz.

### 2.6 Journey tóm tắt

```
Trigger (hết tiền / tò mò)
  → Thử app / Excel
  → Onboarding (setup ví + categories)
  → 3–14 ngày ghi (hoặc bỏ)
  → Habit or churn
  → Nếu stay: budget + reports
  → Nếu power: export / method / sync
```

**Bottleneck lớn nhất:** đoạn “3–14 ngày ghi” — friction entry + thiếu aha nhanh.

### 2.7 Câu hỏi phỏng vấn (15 — không leading)

1. Tuần trước bạn theo dõi tiền thế nào (nếu có)?  
2. Lần gần nhất bạn muốn biết mình còn bao nhiêu tiền — bạn làm gì?  
3. Bạn đang dùng bao nhiêu tài khoản/ví?  
4. Bạn từng dùng app quản lý chi tiêu nào? Dùng bao lâu?  
5. Điều gì khiến bạn dừng?  
6. Công đoạn nào mất thời gian nhất khi ghi chi tiêu?  
7. Sau khi ghi một khoản chi, bạn muốn thấy ngay điều gì?  
8. Bạn có dùng Excel/Sheets không? Sheet phục vụ việc gì?  
9. Bạn nghĩ sao về việc tải sao kê / nhập file?  
10. “Ngân sách” với bạn nghĩa là gì?  
11. Bạn có khoản chi lặp (nhà, net, netflix) không? Quản lý ra sao?  
12. Điều gì khiến bạn tin một app tài chính?  
13. Bạn sẵn sàng trả bao nhiêu / tháng nếu tiết kiệm được X phút? (hỏi sau khi họ tự ước thời gian)  
14. Ai được xem dữ liệu tài chính của bạn?  
15. Nếu app biến mất ngày mai, bạn mất gì?

---

## 3. Ma trận đối thủ (tóm tắt)

Thang: ● mạnh · ◐ vừa · ○ yếu/không · ? chưa đủ evidence  

| Product | Target | Ease entry | Accounts | Transfer | Budget | Recurring | Reports | I/E | Desktop | Mobile | Privacy | Price signal | Strength | Weakness |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Money Lover** | SEA consumer | ● | ● | ● | ● | ● | ● | ◐ | ◐ | ● | ◐ | Free+IAP lifetime-ish / subs | Multi-wallet VN mental model | Ads/limits; manual fatigue **[User opinion]** |
| **MISA MoneyKeeper** | VN consumer | ● | ● | ? | ● | ? | ● | ? | ○ | ● | ◐ | Free+Premium ~25k–199k/tháng hoặc lifetime IAP **[Fact store VN]** | Local banks marketing, voice/OCR claims **[Marketing]** | Ads; learning curve notes **[User opinion]** |
| **Wallet BB** | Global | ● | ● | ● | ● | ● | ● | ◐ | ◐ | ● | ◐ | Freemium | Multi-currency | Generic; premium gates |
| **Spendee** | Visual budgets | ● | ● | ◐ | ● | ◐ | ● | ◐ | ◐ | ● | ◐ | Freemium | Charts/shared | Depth power user |
| **YNAB** | Method users | ○–◐ | ● | ● | ●● method | ● | ◐ | ● file | ● | ● | ◐ cloud | ~$109/yr **[Fact pricing]** | Behavior change; approve import | Price; learning curve; NA banks focus |
| **Actual** | Privacy/envelope | ◐ | ● | ● | ● envelope | ● | ● | ● | ● | ◐ improving | ●● self-host | Free OSS | Own data; rules; reports | Setup; less beginner polish **[User opinion]** |
| **Firefly III** | Power self-host | ○ | ●● | ● | ● | ● bills | ● | ● | ● | ○ | ● | Free AGPL | Domain rich | Admin density; importer separate |
| **Lunch Money** | Power + API | ◐ | ● | ● | ● | ● | ● | ● | ● | ◐ | ◐ | ~$10/mo or annual scale **[Fact]** | API, categorization | US-centric sync; price VN |
| **Monarch** | Couples/net worth | ◐ | ●● | ● | ● | ● | ● | ◐ | ● | ● | ◐ | ~$100/yr class | Dashboard custom | Expensive; US aggregators |
| **Copilot** | iOS design | ● | ● | ● | ● | ● | ● | ◐ | ○ | ●● | ◐ | ~$95/yr class | To Review, calm UI | iOS lock-in |
| **Goodbudget** | Envelope simple | ● | ◐ | ◐ | ● envelope | ◐ | ◐ | ○ | ◐ | ● | ◐ | Free / ~$80/yr | Easy envelopes | Manual entry heavy **[User opinion]**; Android ratings lower in comparisons |
| **Toshl** | Tags/travel | ● | ● | ● | ● | ● | ● | ◐ | ◐ | ● | ◐ | Freemium | Flexible tags | Niche |
| **Ivy Wallet** | Android OSS | ● | ● | ● | ◐ | ● | ◐ | ◐ | ○ | ●● | ● local | Free | Clean mobile entry | Android-only |
| **Sheets/Excel** | Everyone | ● flexibility | DIY | DIY | DIY | DIY | DIY | ● | ● | ◐ | ● local | Free–Office | Full control | Maintenance; no mobile joy |
| **Notion templates** | Light digital | ● | DIY | DIY | DIY | DIY | DIY | ◐ | ● | ● | ◐ | Free–Notion | Flexible notes | Not a ledger |

**Lưu ý:** “Ease entry” = thời gian/taps thêm 1 expense + onboarding mental load — **ước lượng qualitative**, không lab study.

---

## 4. Teardown chọn lọc (sâu hơn)

### 4.1 Money Lover

| Hạng mục | Phân tích | Evidence type |
|---|---|---|
| Core value | Multi-wallet expense manager | Fact (product) |
| Entry | Manual + some automation claims; FAB culture | Fact/Marketing |
| Pricing | Free limited; Premium lifetime IAP historically ~$10–20 class; linked wallet subs | Fact store (varies by store/region) |
| Fit VN | Cao — brand known | Fact market presence |
| Good patterns | Multi-wallet; categories; mobile-first add | Adopt candidates |
| Bad patterns | Ads; freemium friction; still manual-heavy | Adapt: honest free |
| Churn | Manual fatigue, limits **[User opinion aggregate]** | Opinion |

**Adopt:** multi-wallet, expense/income/transfer types, category icons (original design).  
**Reject:** ad-supported core UX; dark-pattern paywall on basic list.

### 4.2 MISA MoneyKeeper

| Hạng mục | Phân tích | Evidence type |
|---|---|---|
| Core value | “30s/day tracking”; VN banks features marketed | Marketing |
| Pricing (VN App Store signals) | Premium monthly ~25.000đ; yearly ~199.000đ; lifetime ~799.000đ; bank fluctuation add-on **[Fact store listing 2026-07-15]** | Fact |
| Play | 1M+ downloads, ~4.4★, ads+IAP **[Fact Play listing]** | Fact |
| Features claimed | Voice, AI invoice scan, bank sync | Marketing — accuracy **unverified** |
| Pattern | Local banks as differentiator | Adapt carefully (not fake sync) |
| Risk | MISA brand = accounting association? | Assumption |

**Adopt:** VN pricing psychology (rẻ hơn YNAB); local language first.  
**Reject:** overclaim AI/OCR before core works; ads in core path.

### 4.3 YNAB

| Hạng mục | Phân tích | Evidence type |
|---|---|---|
| Core value | Zero-based / give every dollar a job | Fact |
| Price | ~$14.99/mo or ~$109/yr **[Fact ynab.com pricing]** | Fact |
| Entry | Bank import + file import; pending/matching complexity | Fact docs + **[User opinion]** Reddit duplicates |
| Strength | Behavior change for committed users; long tenure claims in market content | Mixed |
| Weakness | Learning curve; price; UI churn complaints **[User opinion]** | Opinion |
| VN | Bank sync not local | Fact ecosystem |

**Adopt:** “approve imported” mindset if later import; reconcile honesty.  
**Adapt:** budget as category limits not full method.  
**Reject:** force method onboarding; $100/yr positioning for VN students.

### 4.4 Actual Budget

| Hạng mục | Phân tích | Evidence type |
|---|---|---|
| Core value | Envelope + own your data | Fact (actualbudget.org blog 2024-07-01) |
| Cost | Free OSS; optional host/sync | Fact |
| Strength | Privacy, rules, custom reports, offline | Fact docs |
| Weakness | Self-host friction; beginner polish lower than YNAB **[User opinion]** | Opinion |
| License | MIT (verify in G4) | Unverified until LICENSE read in G4 |

**Adopt:** data ownership narrative; import files; rules engine later; integer/register thinking.  
**Reject:** require self-host for mainstream VN users as only path.

### 4.5 Firefly III

| Hạng mục | Phân tích | Evidence type |
|---|---|---|
| Core value | Full personal finance manager self-host | Fact |
| Strength | Accounts taxonomy, bills, piggy banks, rules, API | Fact docs |
| Weakness | Dense UI; separate data importer; learning | User opinion / secondary |
| License | AGPL | Fact — **no proprietary copy** |

**Adopt:** domain vocabulary (withdrawal/deposit/transfer); bills≈commitments; piggy≈goals.  
**Reject:** admin UI density; full accounting surface.

### 4.6 Lunch Money

| Hạng mục | Phân tích | Evidence type |
|---|---|---|
| Price | $10/mo; annual pay-what-you-want scale **[Fact lunchmoney.app/pricing]** | Fact |
| Strength | API, categorization, web power user | Fact |
| Weakness | Price for VN; bank sync region | Assumption + ecosystem |

**Adopt:** API/export mindset for power users later; clean transaction list.  
**Reject:** US bank-first roadmap for MVP.

### 4.7 Copilot / Monarch (rút gọn)

- **Copilot:** “To Review” on dashboard **[Fact help docs previously]** — pattern **Adapt** as “giao dịch cần gán danh mục” not full inbox product.  
- **Monarch:** net worth + customizable dashboard — **Reject** as home for MVP (overwhelm U1).  

### 4.8 Goodbudget

- Easy envelope teaching; free tier; **manual** heavy **[User opinion]**.  
- **Adapt:** visual remaining; **Reject** envelopes as only model.

### 4.9 Spreadsheet

- Default winner on control + export.  
- App wins only if: **faster mobile entry** + **auto charts** + **still export**.  
- **Adopt:** CSV round-trip as trust feature, not afterthought.

---

## 5. Pain points có bằng chứng

| ID | Pain | Users | Severity | Frequency | Evidence | Competitors handling | Opportunity | MVP? |
|---|---|---|---|---|---|---|---|---|
| P1 | Manual entry slow | All | Critical | Daily | Secondary churn articles; genre reviews | Sync (US); FAB (ML) | Sub-10s quick add + remember | **Yes** |
| P2 | Forget to log | U1 U2 U4 | Critical | Daily | Assumption + common | Reminders (mixed) | Optional soft reminder; undo | Yes light |
| P3 | Too many categories | U1 U2 | High | Setup | Assumption + UX literature | Defaults | Small default set VN | **Yes** |
| P4 | Reports not actionable | U1 U3 | High | Weekly | Assumption | Pretty charts Spendee | “Top category + vs last month + CTA” | **Yes** |
| P5 | Rigid budgets / method | U1 U4 | High | Onboarding | YNAB curve **[User opinion]** | YNAB education | Simple category budget | **Yes** simple |
| P6 | Guilt / judgment UX | U1 U2 | Medium | Ongoing | Design principle | Calm apps (Copilot) | Neutral copy | **Yes** |
| P7 | Ads | U2 | High | Session | Freemium apps | Premium | No ads in core | **Yes** |
| P8 | Paywall basic features | U2 U4 | High | Early | Store freemium patterns | IAP | Free: add txn + accounts + export limited | **Yes** policy |
| P9 | Privacy distrust | U3 U4 | High | Install | Actual positioning; general fintech | Self-host/Actual | Clear policy; RLS; export/delete | **Yes** |
| P10 | Hard export | U3 | High | Exit | Power user need | Lunch Money/Actual strong | CSV always | **Yes** |
| P11 | Hard migrate in | U3 U4 | Medium | Switch | YNAB→Actual import stories | Import tools | CSV import P1 | P1 |
| P12 | Sync flaky | U4 | High where used | Weekly | Secondary re-auth drop | Aggregators | Don't depend MVP | No sync |
| P13 | Too many screens | U1 | Medium | Always | Firefly density | Minimal IA | ≤5 mobile tabs | **Yes** |
| P14 | Charts vanity | U1 | Medium | Dashboard | Design research prior | Many apps | Insights over decoration | **Yes** |
| P15 | Track but no behavior change | All | Medium | Monthly | Behavioral assumption | YNAB method | Light weekly review | P1 |
| P16 | Duplicate / pending confusion | Sync users | Medium | Import | YNAB Reddit **[User opinion]** | Matching rules | Later import | P1 |

---

## 6. Feature evidence → Adopt / Adapt / Reject (sơ bộ)

| Feature | User problem | Competitor evidence | MVP | Decision |
|---|---|---|---|---|
| Quick add expense/income | P1 | ML FAB; Ivy speed | Yes | **Adopt** |
| Multi accounts/wallets | Multi-source VN | ML, MK | Yes | **Adopt** |
| Transfers not as expense | Balance correctness | YNAB/Actual/Firefly | Yes | **Adopt** |
| Default VN categories | P3 | All | Yes | **Adapt** (short list) |
| Category monthly budget | Control without method | ML, Goodbudget light | Yes | **Adapt** |
| Full envelope zero-based | Behavior change | YNAB/Actual | No | **Reject** MVP |
| Recurring / bills | Forget fixed costs | Firefly bills; YNAB scheduled | Yes light | **Adapt** (MoneyFlow commitments exist) |
| Savings goals | Motivation | Firefly piggy; ML | Yes light | **Adapt** |
| Reports income vs expense + by category | P4 | All | Yes | **Adopt** |
| Net worth dashboard | Wealth view | Monarch | No | **Reject** MVP |
| Bank sync | P1 without typing | YNAB/Monarch/MK claims | No | **Reject** MVP |
| CSV export | P10 | Actual/Lunch Money | Yes | **Adopt** |
| CSV import | P11 | Actual/YNAB file | P1 | **Adapt** |
| AI advisor | “Help me” | Marketing trend | No | **Reject** |
| Family share | U5 | Monarch | No | **Reject** MVP |
| Ads | Revenue | ML/MK free | No | **Reject** in product |
| To-review queue | Categorize later | Copilot | P1 | **Adapt** optional |
| OCR / voice | Speed | MK marketing | No | **Reject** MVP |
| Investments | Scope | Ghostfolio | No | **Reject** |

---

## 7. Khoảng trống & định vị đề xuất

### Gap

1. **Web-first VN** với UX hiện đại (nhiều app VN mobile-first).  
2. **Free core thật** (add + multi-wallet + basic reports + export) không ads.  
3. **Correct money model** (transfer, integer) với UI đơn giản (không Firefly).  
4. **Calm, non-judgmental** Vietnamese copy.  
5. **Export-first trust** cho Excel people.

### Positioning draft

> **Money Flow** — web quản lý thu chi cho người Việt: nhiều ví, ghi nhanh, thấy rõ tháng này tiền đi đâu, xuất được dữ liệu. Không ép phương pháp ngân sách. Không quảng cáo trong luồng chính.

### Differentiators (cần validate)

| Vs | Khác |
|---|---|
| Money Lover / MISA | Web chất lượng + no ads core + ownership |
| YNAB / Actual | Đơn giản hơn method; VN language; hosted easy |
| Excel | Nhanh trên mobile web; charts sẵn; vẫn export |
| Copilot/Monarch | Rẻ / free; không US bank dependency |

### Rủi ro sản phẩm

| Risk | Mitigation |
|---|---|
| “Another expense app” | Obsess over 10s entry + VN defaults |
| Manual-only loses to future open banking | Excel-grade export + optional import later |
| Autopilot Inbox scope creep | Keep capture as **speed tool**, not brand |
| Can't beat ML installs | Niche web + quality, not download war |

---

## 8. Kết thúc Giai đoạn 2

### 8.1 Đã xác minh (Fact)

- YNAB pricing ~$109/yr; method-heavy; file import exists.  
- Actual: free OSS envelope alternative; data ownership emphasis (official blog).  
- Lunch Money: ~$10/mo + annual scale; API focus.  
- MISA MoneyKeeper: major VN Play presence (1M+); IAP price points on VN store listings.  
- Money Lover: established SEA multi-wallet freemium.  
- Goodbudget: free envelope tier; manual entry criticism in user discussions.  
- Spreadsheets remain control/export kings.

### 8.2 Chưa xác minh

- Interview data VN (zero primary interviews in this phase).  
- Exact Money Lover current IAP matrix by country.  
- Accuracy of MISA bank sync / OCR.  
- Quantitative churn % for any VN app.  
- WTP (willingness to pay) VN students/new grads.

### 8.3 Độ tin cậy thấp

- Market size / CAGR figures (ignored for decisions).  
- “Day-30 retention 38%” style stats from secondary blogs.  
- Aggregate “users hate ads” without coded review sample size.

### 8.4 Quyết định đề xuất

| # | Decision |
|---|---|
| 1 | Primary users: **U1 + U2 + U3** |
| 2 | Core JTBD: **log fast → see balances & monthly spend** |
| 3 | MVP budget: **category monthly**, not envelope method |
| 4 | **No bank sync, no AI advisor, no family** in MVP |
| 5 | **CSV export** in MVP; CSV import **P1** |
| 6 | Learn domain from **Actual/Firefly**; UX simplicity from **Money Lover/Ivy** |
| 7 | Tone: **calm, non-judgmental** Vietnamese |
| 8 | Next research: **Giai đoạn 3 — Domain rules** |

### 8.5 Câu hỏi còn mở

1. Free tier boundary chính xác?  
2. Subcategories MVP?  
3. Credit card depth?  
4. VND-only first?  
5. Có giữ safe-to-spend như hero metric?  
6. Onboarding: mấy ví mặc định?  
7. Reminder có gây churn?  
8. Primary channel: web mobile hay desktop?

---

## 9. Nguồn (accessed 2026-07-15 trừ khi ghi khác)

| Source | URL | Used for |
|---|---|---|
| YNAB pricing | https://www.ynab.com/pricing | Price fact |
| Actual vs YNAB blog | https://actualbudget.org/blog/2024-07-01-actual-vs-ynab/ | Privacy, free, envelope |
| Lunch Money pricing | https://lunchmoney.app/pricing | Price fact |
| Lunch Money API | https://lunchmoney.dev/ | Power user API |
| MISA MoneyKeeper Play | https://play.google.com/store/apps/details?id=vn.com.misa.sothuchi | Downloads, ads, claims |
| MISA App Store VN IAP | https://apps.apple.com/vn/app/spending-tracker-money-manager/id865818973 | VN pricing signals |
| Money Lover site | https://moneylover.me/ | Product positioning |
| Goodbudget vs YNAB (Goodbudget blog) | https://goodbudget.com/blog/2022/12/goodbudget-vs-ynab-which-budget-app-is-for-you/ | Envelope vs YNAB |
| Goodbudget vs YNAB 2026 comparisons | getfinny / moneyflock articles | Free tier, ratings notes |
| Strategia-X churn 2026 | https://www.strategia-x.com/blog/2026-04-12-why-budgeting-apps-fail-30-days-fintech-ux-data/ | Secondary entry friction |
| Academy Bank survey 2025 | https://www.academybank.com/article/banking-trends-in-2025-and-beyond-budgeting-apps-for-financial-success | Challenges overspending etc. |
| Reddit r/actualbudgeting | comparisons Actual vs YNAB | User opinion polish |
| YNAB Reddit (prior research) | pending/duplicate threads | Import friction opinion |
| Firefly III docs | https://docs.firefly-iii.org/ | Domain features |
| Phase 1 plan | docs/research/01_RESEARCH_PLAN.md | Method |

---

## 10. Việc ngay cho Phase 3

1. Viết **transaction / transfer / balance rules** với edge cases.  
2. Map entities → bảng Postgres đề xuất (draft).  
3. Định nghĩa test cases domain (không implement).  
4. Không mở scope bank/AI/family.

---

**Phase 2 complete.**  
**Next:** Giai đoạn 3 — Financial domain research (`03_DOMAIN_RULES.md`) khi bạn bảo tiếp.
