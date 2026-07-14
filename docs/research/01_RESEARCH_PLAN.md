# Giai đoạn 1 — Research Plan

**Sản phẩm:** Web app quản lý **thu chi cá nhân** (personal income & expense tracker)  
**Ngày lập kế hoạch:** 2026-07-15  
**Trạng thái:** Research only — **không code**  
**Stack mục tiêu (đã định):** Next.js App Router · TypeScript strict · Tailwind · shadcn/ui · Supabase (Auth/Postgres/RLS/Storage) · Vitest · Playwright · Vercel  

**Định vị nghiên cứu (giả định ban đầu — sẽ kiểm chứng):**  
Ứng dụng ghi thu/chi, nhiều ví, số dư, ngân sách đơn giản, định kỳ, báo cáo dễ hiểu, xuất dữ liệu — **không** ERP, không open banking MVP, không AI tư vấn, không accounting doanh nghiệp.

**Tài liệu liên quan trong repo (tham chiếu, không thay Phase 1):**  
`docs/PRODUCT.md`, `docs/COMPETITOR_AND_OSS_RESEARCH.md`, `docs/UX_RESEARCH_AND_REDESIGN.md`, `docs/RESEARCH_PRODUCT_STRATEGY.md` — một số tài liệu trước nghiêng “Financial Inbox”; Phase 2+ sẽ **tái cân bằng** theo brief thu chi cá nhân hiện tại.

---

## 1. Mục tiêu Phase 1

Thiết kế **khung nghiên cứu có thể thực thi** để các giai đoạn sau trả lời 12 câu hỏi cốt lõi (brief §2), rồi chuyển thành quyết định Adopt / Adapt / Reject, MVP, kiến trúc và ADR.

Phase 1 **không** kết luận competitor matrix đầy đủ hay schema cuối cùng — chỉ:

| Đầu ra Phase 1 | Mô tả |
|---|---|
| Nhóm đối thủ | Ai so sánh, vì sao |
| Nhóm người dùng | Ai phỏng vấn / quan sát |
| Câu hỏi nghiên cứu | Map → nguồn |
| Từ khóa & nguồn | Search plan |
| Danh sách repository | Ưu tiên deep dive |
| Tiêu chí đánh giá | Scorecard 1–10 |
| Giả định ban đầu | Rõ fact / opinion / assumption |
| Lịch giai đoạn 2–5 | Thứ tự & exit criteria |

---

## 2. Câu hỏi nghiên cứu (map nguồn)

| # | Câu hỏi (brief §2) | Phương pháp | Nguồn ưu tiên | Giai đoạn trả lời |
|---|---|---|---|---|
| Q1 | Vì sao bắt đầu theo dõi thu chi? | Interview + secondary | User groups 3.1–3.4; surveys ngân sách | G2 |
| Q2 | Vì sao bỏ cuộc? | Reviews + forums + churn literature | Play/App Store, Reddit r/personalfinance, r/ynab, bài churn fintech | G2 |
| Q3 | Ghi chép vì sao phiền? | JTBD + competitive entry flow | Count taps đối thủ; manual entry friction reports | G2 + G3 |
| Q4 | Sau nhập, cần biết gì? | Dashboard job analysis | Wireframe competitors; Copilot/Monarch home; Actual register | G2 + G7 UX |
| Q5 | Feature nào giúp kiểm soát tiền thật? | Outcome vs vanity | YNAB method docs; behavioral finance lite | G2 + G8 |
| Q6 | Feature nào chỉ phức tạp hóa? | Feature audit + reject list | Firefly density; family sharing; investments | G2 + G5 |
| Q7 | Người VN quản lý thu chi thế nào? | Local competitors + cultural context | Money Lover, MISA MoneyKeeper, Excel/Sheets, ví MoMo, multi-bank | G2 |
| Q8 | Khi nào chọn app thay Excel/sổ? | Switching cost interview | Excel power users; import/export needs | G2 |
| Q9 | App hiện tại tốt/xấu ở đâu? | Competitor matrix | Full §4 list | G2 |
| Q10 | Sản phẩm mới khác biệt ở đâu? | Gap synthesis | Sau G2–G4 | G5 |
| Q11 | Data model phù hợp? | Domain + OSS schema | Actual, Firefly, double-entry lite, hledger concepts | G3 + G4 |
| Q12 | Repo nào đáng học? | OSS scorecard | §9 list + search | G4 |

---

## 3. Nhóm người dùng nghiên cứu

| ID | Nhóm | Ưu tiên | Mục tiêu nghiên cứu | MVP? |
|---|---|---|---|---|
| U1 | Người mới đi làm | **P0** | Activation, first 7 days, simple budgets | Có |
| U2 | Sinh viên | **P0** | Price sensitivity, daily control, free tier | Có (segment) |
| U3 | Excel / Sheets users | **P0** | Import/export, report depth, dual entry pain | Có (wedge) |
| U4 | Ex-app users (churned) | **P0** | Churn reasons, re-entry triggers | Có (anti-pattern) |
| U5 | Hộ gia đình / cặp đôi | P2 | Shared budgets, privacy | **Không** MVP default |

**Cỡ mẫu đề xuất Phase 2 (qualitative, không statistical):**  
- 5–8 phỏng vấn U1/U2  
- 4–6 U3  
- 4–6 U4  
- 0–2 U5 (optional context only)  

**Không** dùng sample nhỏ để “chứng minh” market size.

---

## 4. Nhóm đối thủ

### 4.1 Việt Nam / SEA consumer

| Sản phẩm | Vì sao có trong set |
|---|---|
| **Money Lover** | Benchmark VN/SEA; multi-wallet; free+premium |
| **MISA MoneyKeeper** | Local brand; accounting-adjacent perception risk |

### 4.2 International consumer budget / tracking

| Sản phẩm | Vì sao |
|---|---|
| Wallet (BudgetBakers) | Multi-currency, wallets |
| Spendee | Visual budgets, shared (later ref) |
| YNAB | Method-heavy; approve/import; high ARPU |
| Goodbudget | Envelope simple |
| Toshl Finance | Tags, multi-currency |
| Lunch Money | Power user, API, reports |
| Monarch Money | Dashboard dense, couples |
| Copilot Money | “To review”, calm UI, iOS-first |
| Rocket Money *(optional)* | Sub detection — adjacent only |

### 4.3 OSS / self-host (học kiến trúc + domain)

| Sản phẩm | Vì sao |
|---|---|
| Actual Budget | Local-first, register, import, privacy |
| Firefly III | Double-entry-ish, rules, bills, piggy |
| Maybe Finance | Modern web finance (check license/status) |
| Ivy Wallet | Android expense UX patterns |
| Paisa / Ghostfolio | Adjacent — investments (reject features, learn reports) |

### 4.4 Spreadsheet & templates (thay thế thực tế)

| Công cụ | Vì sao |
|---|---|
| Google Sheets | Default “app” của U3 |
| Microsoft Excel | Same |
| Notion finance templates | Lightweight digital alternative |

### 4.5 Không đưa vào competitor core (chỉ edge note)

- Banking apps (chỉ nguồn data, không product peer)  
- Expensify (B2B expense)  
- Brokerage / crypto portfolio apps  

---

## 5. Từ khóa tìm kiếm

### 5.1 User & churn

```
budgeting app quit OR churn OR abandon
why stop using YNAB OR Money Lover
manual expense tracking friction
personal finance app Day 30 retention
expense tracker too many categories
```

### 5.2 Việt Nam

```
ứng dụng quản lý chi tiêu Việt Nam
Money Lover review
MISA MoneyKeeper đánh giá
quản lý chi tiêu Excel
theo dõi thu chi sinh viên
```

### 5.3 Domain

```
double entry personal finance transfer
soft delete financial transactions
integer money minor units
envelope vs category budget
recurring transactions generation
credit card payment transfer model
```

### 5.4 GitHub / OSS

```
topic:personal-finance stars:>500
actualbudget/actual
firefly-iii/firefly-iii
expense tracker next.js supabase
personal accounting postgresql schema
```

### 5.5 Privacy / security

```
personal finance app privacy policy concerns
Supabase RLS financial data
CSV formula injection export
```

---

## 6. Nguồn sẽ kiểm tra (ưu tiên)

| Loại | Ví dụ | Dùng cho | Cẩn trọng |
|---|---|---|---|
| Official site / pricing | ynab.com, moneylover.me, monarch.com | Feature claims, pricing | Marketing bias |
| Help center / docs | YNAB support, Firefly docs, Actual docs | Real workflows | May lag product |
| App Store / Play reviews | Money Lover, YNAB, Wallet | Pain, churn language | Selection bias, old reviews |
| Reddit / forums | r/ynab, r/personalfinance, r/selfhosted | Long-form frustration | Vocal minority |
| YouTube walkthroughs | “YNAB setup”, “Firefly III tutorial” | Onboarding friction | Creator bias |
| Independent reviews | 2025–2026 comparison articles | Cross-check features | Affiliate links |
| GitHub | README, LICENSE, issues, releases, security.md | Architecture, activity | Stars ≠ quality |
| Academic / behavioral (secondary) | Habit formation, implementation intentions | G8 lightly | Not overclaim |
| Market reports | Dataintelo, market.us (2025–26) | Context only | Numbers vary wildly between vendors — **không tin một số** |
| Repo nội bộ | migrations, finance.ts, PRODUCT.md | Baseline “đã build gì” | Không = validated market |

**Ngày truy cập chuẩn cho Phase 2+:** ghi `YYYY-MM-DD` trên mỗi claim quan trọng (bắt đầu từ 2026-07-15).

---

## 7. Danh sách repository (candidate deep dive)

### 7.1 Tier A — deep dive bắt buộc (Giai đoạn 4)

| # | Repo (dự kiến) | Lý do | Ghi chú license (xác minh lại) |
|---|---|---|---|
| 1 | [actualbudget/actual](https://github.com/actualbudget/actual) | Local-first budget, import, privacy, modern JS | MIT *(verify)* |
| 2 | [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | Domain rich: accounts, bills, piggy, rules | AGPL — **học, không copy** |
| 3 | [maybe-finance/maybe](https://github.com/maybe-finance/maybe) *(verify current org/name)* | Modern personal finance web | Check LICENSE + activity |
| 4 | Ivy Wallet (Android OSS) | Fast mobile entry UX | Apache/MIT verify |
| 5 | GnuCash (desktop) | Classic double-entry | GPL — concepts only |

### 7.2 Tier B — selective read

| Repo / project | Học gì | Tránh gì |
|---|---|---|
| Ghostfolio | Portfolio reports | Investment scope creep |
| Paisa | CLI/dashboard finance | Different UX |
| OpenBudgeteer | Budget envelopes | .NET stack mismatch |
| HomeBank | Simple desktop UX | Desktop-only |
| Akaunting | Invoicing SME | Business accounting |
| Beancount / hledger | Plain-text ledger, money as integers | CLI-only, steep |

### 7.3 Tier C — search expand in G4

```
github topic:expense-tracker language:TypeScript
github topic:budgeting language:TypeScript
"supabase" "transactions" expense
next.js expense tracker stars:>100
```

**Rule:** Không deep dive repo không có LICENSE rõ hoặc abandoned >2 năm trừ khi pattern domain rất giá trị (ghi rõ “historical only”).

---

## 8. Tiêu chí đánh giá

### 8.1 Đối thủ (product)

Score 1–5 mỗi trục (Phase 2):

1. Ease of adding expense (taps / seconds)  
2. Multi-account clarity  
3. Transfer correctness mental model  
4. Budget understandability  
5. Report actionability  
6. Import/export ownership  
7. Privacy posture  
8. Pricing fairness (VN purchasing power)  
9. Onboarding time-to-value  
10. Non-judgmental tone  

### 8.2 Repository (scorecard 1–10 — brief §10)

1. Architecture quality  
2. Code quality  
3. Documentation  
4. Testing  
5. Security  
6. Maintainability  
7. Activity  
8. Learning value  
9. Fit personal expense app  
10. Risk if applied  

**Tổng hợp:** Learning Value × Fit − Risk (qualitative ranking, không “overall score” mù quáng).

### 8.3 License classification (Phase 4 gate)

| Class | Hành động |
|---|---|
| Reuse code OK | MIT/Apache/BSD + attribution |
| Reference implementation | Study algorithms, rewrite |
| Architecture only | Diagrams, domain names |
| UX pattern only | Flows, not assets |
| Do not use | No license, unclear origin, AGPL copy into proprietary without compliance plan |
| Unverified | Block until LICENSE read |

### 8.4 Feature decision (Phase 5)

Mỗi ý tưởng: **Adopt | Adapt | Reject** + bảng brief §13.

---

## 9. Giả định ban đầu (ghi rõ loại)

| ID | Nội dung | Loại | Sẽ kiểm chứng bằng |
|---|---|---|---|
| A1 | Pain #1 = **nhập giao dịch mất thời gian / quên nhập** | Assumption + secondary evidence (churn articles 2024–26 cite manual entry) | Interviews U4; review mining |
| A2 | VN multi-wallet (cash + bank + e-wallet) là default | Assumption (local context) | Interviews; Money Lover feature popularity |
| A3 | Open banking **không** khả thi/rẻ cho MVP VN | Assumption | Legal/ecosystem check G2 lightly |
| A4 | Integer minor units + transfer 2-leg là đúng kỹ thuật | Fact (industry + current MoneyFlow codebase) | Domain G3; OSS G4 |
| A5 | Envelope/YNAB full method **quá nặng** cho U1/U2 MVP | Opinion | Compare Goodbudget simplicity vs YNAB learning curve reviews |
| A6 | Spreadsheet users churn apps vì **export/lock-in/paywall** | Assumption | U3 interviews; store reviews |
| A7 | Dashboard nên trả lời “còn bao nhiêu + tháng này thu/chi + top category” trước chart | Opinion (product craft) | Task success tests later |
| A8 | Family sharing làm trễ MVP | Decision draft | U5 optional research only |
| A9 | AI advisor trước khi core flows ổn = waste | Decision draft | Align brief §18 |
| A10 | Codebase MoneyFlow hiện có (ledger, budgets, goals, commitments) là **foundation** đáng tái dùng, không rewrite | Fact (repo) | Architecture G5 map |

**Evidence sơ bộ đã thấy (secondary, 2026-07-15):**  
- Bài phân tích churn budgeting app (Strategia-X, Apr 2026) trích retention Day-30 thấp và **manual entry friction** là failure mode — *vendor/blog, không phải survey tự làm*.  
- Market reports (Dataintelo, market.us) đưa CAGR/size **mâu thuẫn nhau mạnh** → Phase 2 **không** dùng làm foundation positioning.

---

## 10. Phạm vi & non-goals của toàn bộ nghiên cứu

### In scope

- Personal income/expense tracking web  
- Multi-account, transfer, categories, simple budgets, recurring, reports, CSV export  
- Security model Supabase RLS  
- OSS learning with license discipline  

### Out of scope (research may mention, not design for)

- Open banking / bank link MVP  
- AI financial advice chatbot  
- Investments, crypto, stocks  
- Full double-entry ERP  
- Native iOS/Android (mobile **web** yes)  
- Family sharing as MVP feature  

### Conflict resolution (quan trọng)

Repo đã có nhánh tài liệu “Universal Financial Inbox / capture-first”.  
**Khung nghiên cứu brief mới** ưu tiên **thu chi cá nhân cổ điển + nhập nhanh**.  
Capture/import/parser = **Adapt candidate** (giảm friction), **không** tự động thành positioning duy nhất trừ khi G2 chứng minh.

---

## 11. Kế hoạch giai đoạn 2–5

| Giai đoạn | Nội dung | Deliverable file (đề xuất) | Exit criteria |
|---|---|---|---|
| **G1** | Research plan | `docs/research/01_RESEARCH_PLAN.md` *(này)* | Plan approved by team / founder |
| **G2** | User + competitor | `02_USER_AND_COMPETITORS.md` | Matrix ≥12 products; pain critical/high list with sources |
| **G3** | Financial domain | `03_DOMAIN_RULES.md` | Transaction/transfer/budget rules + test cases outline |
| **G4** | OSS + license | `04_OPEN_SOURCE_ANALYSIS.md` | 5–10 deep dives + scorecard |
| **G5** | Synthesis | `05_PRODUCT_AND_ARCHITECTURE.md` | MVP, ADR drafts, roadmap, Adopt table, next actions §17 K |

**Sau mỗi giai đoạn** luôn có block:

1. Đã xác minh  
2. Chưa xác minh  
3. Nhận định độ tin cậy thấp  
4. Quyết định đề xuất  
5. Câu hỏi còn mở  

---

## 12. Phương pháp thu thập (Phase 2+)

### 12.1 Competitor teardown checklist (mỗi app)

- [ ] Target & pricing (official, date)  
- [ ] Onboarding steps (count)  
- [ ] Add expense: fields + taps (stopwatch or step list)  
- [ ] Accounts / transfer / categories  
- [ ] Budget model type  
- [ ] Recurring / bills  
- [ ] Reports list  
- [ ] Import/export formats  
- [ ] Privacy claims  
- [ ] Top 10 positive review themes  
- [ ] Top 10 negative review themes  
- [ ] Adopt/Adapt/Reject candidates  

### 12.2 Interview protocol skeleton (G2)

- 30–40 phút, semi-structured  
- Không leading (“Bạn có ghét nhập tay không?” → thay bằng “Tuần trước bạn ghi chi tiêu thế nào?”)  
- 10 câu hỏi chi tiết → Phase 5 §K (sẽ viết sau G2)  
- Consent: không thu số dư thật nếu user không muốn  

### 12.3 OSS protocol (G4)

1. Clone or browse default branch  
2. Read LICENSE, SECURITY.md, CONTRIBUTING  
3. Last release / last commit  
4. Schema or models directory  
5. How balance is computed (search “balance”, “ledger”, “transfer”)  
6. Test presence  
7. Score 1–10 grid  
8. Extract **patterns to rewrite**, not copy  

---

## 13. Phân công vai trò (nhóm chuyên gia)

| Vai trò | Phụ trách Phase |
|---|---|
| Product Researcher | G1–G2 market gaps, positioning |
| UX Researcher | G2 interviews, G7 patterns, behavior G8 |
| Fintech Product Designer | Dashboard/budget/report decisions |
| Full-stack Architect | G3–G5 schema, modules, ADR |
| AppSec Engineer | G4–G5 RLS, export, logging |
| OSS Analyst | G4 license + scorecard |

---

## 14. Rủi ro nghiên cứu

| Rủi ro | Mitigation |
|---|---|
| Marketing pages overclaim | Prefer docs + reviews |
| Conflicting market size numbers | Ignore absolute $; use directional only |
| OSS abandoned mid-research | Prefer active maintainers |
| Overfitting to founder taste | Force interview sample U1–U4 |
| Scope creep (inbox/AI/family) | Non-goals list; Reject by default |
| Copying AGPL code | License class gate |

---

## 15. Kết thúc Giai đoạn 1

### 15.1 Những gì đã xác minh (fact)

- Brief sản phẩm: thu chi cá nhân web, stack Next/Supabase, non-goals rõ (không ERP, không bank link MVP, không AI advisor trước core).  
- Repo MoneyFlow **đã có** ledger-oriented schema, transactions, transfers, budgets, commitments, goals, reports, auth, landing Inbox-first experimental paths — baseline kỹ thuật tồn tại (**fact nội bộ**, 2026-07-15).  
- Secondary literature (2025–2026) lặp lại theme: **retention PF app khó**, manual entry / complexity / sync friction là churn drivers — *nguồn blog/report, không tự survey*.  
- Market size reports **không thống nhất** → không dùng làm foundation.

### 15.2 Những gì chưa xác minh

- % churn thực tế của Money Lover / YNAB tại VN.  
- Willingness to pay VN (free vs pro).  
- Mức chấp nhận nhập tay nếu UX < 5 giây.  
- License & activity chính xác của mọi repo Tier A (sẽ re-verify G4).  
- MISA MoneyKeeper feature/pricing chi tiết so với Money Lover.  
- Product-market fit của “Inbox/capture” vs “classic tracker” cho founder’s real users.

### 15.3 Nhận định độ tin cậy thấp

- “Open banking 2.8× engagement” (market reports) — **không** dùng để ép bank sync vào MVP.  
- Mọi CAGR / market $ — **low confidence**.  
- Day-30 retention % từ blog trích Sensor Tower/Apptopia — **secondary; chưa audit primary**.

### 15.4 Quyết định đề xuất (từ Phase 1 only)

| Quyết định | Lý do |
|---|---|
| **P0 research users:** U1, U2, U3, U4 | Khớp MVP; U5 sau |
| **Competitor core set:** Money Lover, MISA MK, Wallet, Spendee, YNAB, Actual, Firefly, Lunch Money, Monarch, Copilot, Goodbudget, Toshl, Ivy, Sheets/Excel/Notion | Cover local + method + OSS + spreadsheet |
| **OSS deep dive min 5:** Actual, Firefly, Maybe, Ivy Wallet, GnuCash concepts | Architecture diversity |
| **Positioning research hypothesis:** “Nhập nhanh + số dư đúng + báo cáo hành động + export” — **không** “AI” hay “open banking” | Align brief; test vs Inbox narrative |
| **Money model hypothesis:** integer minor units, transfer as balanced pair, soft delete | Industry + codebase |
| **Budget MVP hypothesis:** category monthly budget + remaining + light “safe to spend” optional — **không** full YNAB envelopes | Learning curve risk |
| **Tiếp theo ngay:** Giai đoạn 2 | Không code |

### 15.5 Câu hỏi còn mở

1. Primary persona: mới đi làm hay Excel power user?  
2. Free-only forever vs freemium sau beta?  
3. Capture/import (CSV/paste) là P0 hay P1 sau manual quick-add?  
4. Subcategory bắt buộc MVP hay tags đủ?  
5. Multi-currency MVP hay VND-only first?  
6. Credit card modeling depth cho MVP?  
7. Giữ hay demote các route Inbox/capture đã build bởi autopilot?  
8. Hosting region / PDPA VN cross-border với Supabase?  

---

## 16. Hành động ngay (sau khi founder duyệt Phase 1)

1. Chốt: research frame = **thu chi cá nhân** (doc này) vs pivot inbox.  
2. Bắt đầu **Giai đoạn 2**: competitor teardown Money Lover + YNAB + Actual (3 app trước).  
3. Soạn 15 câu hỏi phỏng vấn (draft trong G2).  
4. Tạo sheet scorecard competitors (columns §8.1).  
5. Verify LICENSE 5 repo Tier A.  
6. Không implement feature mới cho đến hết G5 (trừ bugfix dùng cá nhân).  

---

## 17. Nguồn tham chiếu Phase 1 (accessed 2026-07-15)

| Nguồn | URL | Dùng làm |
|---|---|---|
| Strategia-X: budgeting apps quit | https://www.strategia-x.com/blog/2026-04-12-why-budgeting-apps-fail-30-days-fintech-ux-data/ | Secondary churn themes |
| Dataintelo PF apps market | https://dataintelo.com/report/personal-finance-apps-market | Context only; numbers conflict |
| market.us smart budgeting | https://market.us/report/smart-budgeting-apps-market/ | Retention challenge quote |
| Academy Bank budgeting survey 2025 | https://www.academybank.com/article/banking-trends-in-2025-and-beyond-budgeting-apps-for-financial-success | Challenges: overspending etc. |
| Actual Budget GitHub | https://github.com/actualbudget/actual | OSS candidate |
| Firefly III | https://www.firefly-iii.org/ · GitHub | OSS candidate |
| Money Lover | https://moneylover.me/ | VN competitor |
| YNAB | https://www.ynab.com/ | Method competitor |
| Product brief | User query 2026-07-15 | Scope authority |
| MoneyFlow repo | `/home/thunder/Code/moneyflow` | Internal baseline |

---

**Phase 1 complete.**  
**Next:** Giai đoạn 2 — User and competitor research (khi bạn bảo tiếp).
