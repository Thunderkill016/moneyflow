# Money Flow — Nghiên cứu UX tham khảo & Thiết kế lại (Inbox-first)

> **Status:** historical research and postmortem input. Retain its competitor,
> state-model and accessibility lessons, but do not treat Inbox-first identity,
> fixed IA or linked `PRODUCT.md` as current authority. Use
> `docs/research/UI_UX_RESEARCH_LEDGER.md` for classification and
> `docs/context/README.md` for current routing.

**Ngày:** 2026-07-14  
**Phiên bản:** 1.0  
**Định vị thiết kế:** *Universal Financial Inbox* — thu thập, chuẩn hóa, duyệt giao dịch; dashboard là phụ.  
**Quy tắc chống sao chép:** Học *pattern* và *job-to-be-done*, không clone layout, màu, copy, icon, brand của bất kỳ app nào.

**Tài liệu liên quan:**  
- [UX_PRINCIPLES.md](./UX_PRINCIPLES.md)  
- [design-system.md](./design-system.md)  
- [wireframes-inbox.md](./wireframes-inbox.md)  
- [Product principles](./product/PRINCIPLES.md)

---

## Mục lục

1. [Quy trình & phạm vi](#1-quy-trình--phạm-vi)  
2. [Audit sản phẩm tham khảo](#2-audit-sản-phẩm-tham-khảo)  
3. [Bảng so sánh pattern UX](#3-bảng-so-sánh-pattern-ux)  
4. [Pattern chọn / loại](#4-pattern-chọn--loại)  
5. [Nhu cầu riêng Money Flow](#5-nhu-cầu-riêng-money-flow)  
6. [Information architecture](#6-information-architecture)  
7. [Sitemap](#7-sitemap)  
8. [User flow chính](#8-user-flow-chính)  
9. [Wireframe & mô tả màn hình](#9-wireframe--mô-tả-màn-hình) → chi tiết: `wireframes-inbox.md`  
10. [Design system (tóm tắt + delta)](#10-design-system-tóm-tắt--delta)  
11. [Desktop vs mobile](#11-desktop-vs-mobile)  
12. [Accessibility & responsive](#12-accessibility--responsive)  
13. [Khác biệt so với đối thủ](#13-khác-biệt-so-với-đối-thủ)  
14. [Quyết định quan trọng + lý do](#14-quyết-định-quan-trọng--lý-do)  
15. [Đánh giá theo tác vụ thực tế](#15-đánh-giá-theo-tác-vụ-thực-tế)  
16. [Nguồn tham khảo](#16-nguồn-tham-khảo)

---

## 1. Quy trình & phạm vi

| Bước | Trạng thái |
|---|---|
| 1. Audit sản phẩm tham khảo | ✓ (mục 2) |
| 2. Bảng so sánh pattern | ✓ (mục 3) |
| 3. Nhu cầu riêng MF | ✓ (mục 5) |
| 4. Information architecture | ✓ (mục 6) |
| 5. User flow | ✓ (mục 8) |
| 6. Wireframe low-fi | ✓ (`wireframes-inbox.md`) |
| 7. Design system | ✓ (mục 10 + `design-system.md`) |
| 8. High-fi spec (mô tả component/state) | ✓ (mục 9–10; implement UI code = phase sau) |
| 9. Responsive rules | ✓ (mục 11–12) |
| 10. Accessibility | ✓ (mục 12) |
| 11. Đánh giá task thực tế | ✓ (mục 15) |

**Không làm trong doc này:** copy pixel, asset brand đối thủ, implement production UI toàn bộ.

---

## 2. Audit sản phẩm tham khảo

Với mỗi sản phẩm: (1) pattern tốt · (2) pattern kém · (3) hợp MF · (4) không áp dụng · (5) complaint phổ biến · (6) web vs mobile · (7) loading / error / empty / uncertain.

### 2.1 Money Lover

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Multi-wallet rõ; thêm giao dịch từ FAB; danh mục icon; phổ biến VN nên mental model “ví + danh mục” quen. |
| **Kém** | Nhập tay lặp lại; premium gate; đôi khi cảm giác “ghi sổ” không phải “xử lý lô dữ liệu”. |
| **Hợp MF** | Multi-account/wallet; danh mục chi/thu; mobile FAB. |
| **Không** | Clone layout list + icon pack; marketing “No.1 expense manager”. |
| **Complaint** | Giới hạn free; nhập tay mệt; ads (bản free). |
| **Web/Mobile** | Mobile là chính; web phụ. |
| **States** | Empty “chưa có giao dịch” quen app chi tiêu; ít “review batch từ import”. |

### 2.2 YNAB

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | **Approve / match** giao dịch import; register rõ; budget actionable; onboarding phương pháp; copy thân thiện. |
| **Kém** | Learning curve cao; UI đổi liên tục gây khó chịu (review App Store/Reddit); zero-based không phải job của mọi user. |
| **Hợp MF** | *Review imported transactions*; bulk-ish workflow; empty/error trên bank connection. |
| **Không** | Full envelope method làm home; “give every dollar a job” làm core copy. |
| **Complaint** | Đắt; bank sync hỏng/duplicate; UI churn. |
| **Web/Mobile** | Web mạnh cho budget; mobile nhanh approve + add. |
| **States** | Pending vs cleared; reconcilation friction khi uncertain. |

**Bài học cốt lõi cho Inbox:** Copilot/YNAB đều có **“to review”** — MF đưa khái niệm này lên *primary nav*, không giấu dưới dashboard.

### 2.3 Monarch Money

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Dashboard tùy biến; list giao dịch search mạnh; multi-account “all money one place”; couples. |
| **Kém** | Information-dense — dễ overwhelm người chỉ muốn dọn lô import; phụ thuộc aggregator. |
| **Hợp MF** | List giao dịch mạnh; account hub. |
| **Không** | Net-worth-first home; dashboard widget dense. |
| **Complaint** | Giá; connection issues. |
| **Web/Mobile** | Web tốt cho depth; mobile cho glance. |
| **States** | Connection status trên account. |

### 2.4 Copilot Money

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | **Dashboard “To Review”** (imported chưa duyệt); recategorize mượt; UI calm, ít chart ồn. |
| **Kém** | iOS-centric; ít web; AI cat. opaque đôi lúc. |
| **Hợp MF** | Review-first section; calm finance. |
| **Không** | iOS-only aesthetic clone; dark-luxury investment vibes. |
| **Complaint** | Platform lock; giá. |
| **Web/Mobile** | Mobile primary. |
| **States** | “To Review” = uncertain → user marks reviewed. |

### 2.5 Wallet by BudgetBakers

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Record types rõ (expense/income/transfer); multi-currency. |
| **Kém** | Generic “budget app” không có inbox workflow. |
| **Hợp MF** | Transfer vs expense tách. |
| **Không** | Visual style/template feel. |
| **Complaint** | Sync/premium. |
| **Web/Mobile** | Cả hai; mobile entry. |
| **States** | Standard empty lists. |

### 2.6 Spendee

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Visual budgets; shared wallets story. |
| **Kém** | Chart-heavy; ít power-user batch. |
| **Hợp MF** | Shared later (không MVP). |
| **Không** | Pie-chart-first home. |
| **Complaint** | Depth kém power users. |
| **Web/Mobile** | Mobile visual. |
| **States** | Empty illustrative. |

### 2.7 Rocket Money

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Job rõ (subscriptions/bills); actionable cards. |
| **Kém** | Không phải full PF inbox. |
| **Hợp MF** | “Attention list” pattern → MF dùng cho *low confidence / needs review*. |
| **Không** | Bill negotiation marketing. |
| **Complaint** | Upsell; accuracy subscription detect. |
| **Web/Mobile** | Cả hai. |
| **States** | Card-level CTA. |

### 2.8 Actual Budget (OSS)

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Register-first; privacy; file import; local-first trust; keyboard-friendly. |
| **Kém** | Envelope learning; bank sync fragmented by region. |
| **Hợp MF** | Import → list → categorize; sparse UI; trust/privacy messaging. |
| **Không** | Envelope UI làm core. |
| **Complaint** | Mobile incomplete historically; setup. |
| **Web/Mobile** | Web/PWA mạnh. |
| **States** | Import errors surface in flow. |

### 2.9 Firefly III (OSS)

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Withdrawal/deposit/transfer model; rules; bills; piggy; audit-ish power. |
| **Kém** | UI dense “admin”; onboarding nặng; double-entry mental model. |
| **Hợp MF** | Rules; source metadata; import history; never hide fees/source. |
| **Không** | Laravel-admin aesthetic; full accounting IA. |
| **Complaint** | Steep; importer separate app. |
| **Web/Mobile** | Web-first self-host. |
| **States** | Rule match explainable if configured. |

### 2.10 Expensify

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | Capture (SmartScan); **approve workflow**; bulk; receipt attach. |
| **Kém** | B2B expense report language; policy-heavy. |
| **Hợp MF** | Capture → review → approve pipeline; bulk approve. |
| **Không** | Corporate report submit UI. |
| **Complaint** | Pricing; OCR miss. |
| **Web/Mobile** | Mobile capture; web approve. |
| **States** | OCR confidence implicit; user corrects. |

### 2.11 Ứng dụng / hành vi VN (Money Lover + NH apps + Excel)

| Hạng mục | Phân tích |
|---|---|
| **Tốt** | User quen **xuất sao kê PDF/CSV**; multi-bank + MoMo/ZaloPay; tiền mặt. |
| **Kém** | NH app không gộp cross-bank; Excel thủ công. |
| **Hợp MF** | Paste SMS/noti text; upload statement; VND formatting `1.234.567 ₫`. |
| **Không** | Clone UI NH (xanh đỏ từng bank). |
| **Complaint** | Mất thời gian gõ lại; sợ app lạ xin quyền. |
| **Web/Mobile** | Capture mobile; review desktop mạnh. |
| **States** | Privacy fear = empty adoption nếu onboarding kém. |

---

## 3. Bảng so sánh pattern UX

| Pattern | YNAB | Copilot | Monarch | Actual | Firefly | Money Lover | Expensify | **Money Flow** |
|---|---|---|---|---|---|---|---|---|
| Home = Dashboard charts | △ | △ | ✓ | ✗ | ✓ | ✓ | ✗ | **✗ Dashboard phụ** |
| Home = To Review / Inbox | △ | **✓** | △ | △ | ✗ | ✗ | **✓** | **✓ Primary** |
| Capture entry (paste/upload) | File | Bank | Bank | File | File | Manual/OCR | Scan | **Paste + Upload + Quick** |
| Bulk select + action | △ | △ | △ | △ | △ | ✗ | **✓** | **✓** |
| Explain categorization | Rules limited | AI soft | Rules | Rules | **Rules strong** | ✗ | Policy | **Source + rule + confidence** |
| Auto-post low confidence | Risk | Review mark | Auto+edit | User | Rules | Manual | Review | **Never auto-post low conf.** |
| Multi-wallet | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** | Cards | ✓ |
| Safe-to-spend hero | ✗ | ✗ | ✗ | Envelope | ✗ | ✗ | ✗ | **Secondary insight** |
| Privacy-first messaging | △ | △ | △ | **✓** | Self-host | △ | B2B | **✓** |
| FAB add | ✓ | ✓ | ✓ | △ | ✗ | **✓** | ✓ | **Split: Capture menu** |

✓ = mạnh · △ = một phần · ✗ = yếu/không

---

## 4. Pattern chọn / loại

### 4.1 Được chọn (và lý do)

| Pattern | Nguồn cảm hứng (ý) | Lý do MF |
|---|---|---|
| **Inbox / To Review as home** | Copilot, YNAB approve, Expensify | Job chính = duyệt ngoại lệ, không ngắm chart |
| **Capture hub (Paste / Upload / Quick)** | Expensify capture + Actual import | Data rải rác; giảm friction vào |
| **Bulk bar khi chọn ≥1** | Expensify, email clients | Tốc độ lô 50–200 dòng |
| **Confidence + source chip** | Firefly metadata, OCR products | Trust + explainability |
| **Review-by-exception** | YNAB match | Chỉ chạm dòng nghi ngờ |
| **Split primary: “Capture” vs “Duyệt”** | — (original) | Tách *đưa vào* và *quyết định* |
| **Sparse density, mono money** | Actual, Stripe-like calm | Tài chính cần scan số |
| **Privacy onboarding (no bank password)** | Actual trust | Adoption VN |
| **Timeline after approve** | Register (YNAB/Actual) | Lịch sử đã “sạch” |
| **Dashboard 1 câu hỏi** | MoneyFlow hiện tại | Safe-to-spend *sau* khi data đủ |

### 4.2 Bị loại

| Pattern | Vì sao loại |
|---|---|
| Pie/donut chart home | Không giúp duyệt inbox; vanity |
| Net worth hero first | Không phải wedge capture |
| Glassmorphism / heavy gradient | Giảm tin cậy, a11y kém |
| Auto-categorize silent post | Rủi ro số liệu sai |
| 7+ bottom tabs | Mobile thrash |
| Envelope-only method gate | Learning curve YNAB complaints |
| Gamification streaks | Không hợp trust finance |
| Clone green-of-bank-X | Brand confusion + legal |
| Infinite onboarding slides | Drop-off |
| Modal form dài > 1 viewport | Rule MF: no modal > 1 screen |

---

## 5. Nhu cầu riêng Money Flow

### Jobs (ưu tiên)

1. **Đưa** dữ liệu thô vào hệ thống (paste/upload/quick).  
2. **Xem** hệ thống hiểu gì (preview + confidence).  
3. **Duyệt** nhanh ngoại lệ; bulk phần chắc.  
4. **Tin** (source, raw snippet, rule explain).  
5. **Xuất / ghi sổ** có kiểm soát.  
6. (Phụ) Hiểu có thể chi bao nhiêu *sau khi* sổ sạch.

### Metrics thiết kế tối ưu

| Metric | Mục tiêu UX |
|---|---|
| Time open → first capture | < 30s onboarding xong; < 5s returning |
| Time review 1 high-conf row | < 3s (bulk) |
| Time review 1 low-conf row | < 15s (edit + explain visible) |
| Clicks bulk approve 50 rows | ≤ 3 |
| Wrong silent posts | **0** by design |

### Rủi ro hành động

| Hành động | Rủi ro | UI |
|---|---|---|
| Approve high conf | Thấp | 1 click / bulk |
| Approve low conf | Cao | Force expand / confirm |
| Delete account | Rất cao | Typed confirm |
| Auto-post | Cấm khi conf < threshold | Không có nút “auto all without review” default |

---

## 6. Information architecture

### 6.1 Nguyên tắc IA

```
CAPTURE  →  NORMALIZE  →  REVIEW  →  COMMIT  →  INSIGHT
  (vào)      (máy)        (người)    (sổ)      (phụ)
```

- **Primary IA** xoay quanh *ứng viên giao dịch* (`candidates`), không xoay quanh chart.  
- **Accounts** = nơi tiền nằm (sau commit).  
- **Rules** = bộ nhớ cá nhân (power).  
- **Insight/Dashboard** = optional tab, không badge-spam.

### 6.2 Cây IA

```
Money Flow
├── Public
│   ├── Landing
│   ├── Login / Register / Forgot / Update password
│   └── Legal (Privacy, Terms)
├── Onboarding (first-run)
│   ├── Trust promises
│   ├── First capture method
│   └── Optional sample import
├── App
│   ├── Inbox (home) ⭐
│   │   ├── Filters (confidence, duplicates, transfers, source)
│   │   ├── Bulk actions
│   │   ├── Row → Review / Detail
│   │   └── Capture entry points
│   ├── Capture
│   │   ├── Paste Anything
│   │   ├── Quick Add
│   │   ├── Upload Statement
│   │   └── Import Preview (per batch)
│   ├── Timeline (approved history)
│   ├── Accounts & Wallets
│   ├── Rules
│   ├── Imports (history)
│   ├── Insights (dashboard tối giản)
│   └── Settings
│       ├── Privacy & retention
│       ├── Export data
│       ├── Delete account
│       └── Appearance (theme)
└── System
    ├── Loading
    ├── Empty
    ├── Error (page + inline)
    └── Offline banner (PWA later)
```

---

## 7. Sitemap

```
/                         → redirect: auth? /inbox : /landing
/landing
/login  /register  /forgot-password  /update-password
/onboarding
/inbox                    ★ default app home
/inbox/[candidateId]
/capture                  → chooser
/capture/paste
/capture/quick
/capture/upload
/imports
/imports/[batchId]        → preview / status
/imports/[batchId]/review
/timeline
/accounts
/rules
/insights                 (dashboard tối giản)
/settings
/settings/privacy
/settings/export
/settings/delete-account
/error                    (segment error boundary)
```

**Mobile capture deep links (future):**  
`/capture/share` (PWA share target) · app scheme `moneyflow://capture`

---

## 8. User flow chính

### 8.1 First value (activation)

```
Landing → Register → Onboarding trust
  → Choose: Paste | Upload | Quick
  → Import Preview (map columns if needed)
  → Inbox (candidates)
  → Bulk approve high + fix low
  → Optional: Timeline / Export / Insights
```

### 8.2 Returning weekly ritual

```
Open app → Inbox badge
  → Capture (paste 2 SMS + 1 CSV)
  → Preview auto
  → Inbox filter "Low confidence"
  → Bulk rest
  → Done (< 5 min)
```

### 8.3 Uncertain parse

```
Upload unknown PDF
  → Low template match
  → Preview: "Không chắc — map cột / sửa dòng"
  → Không có nút "Ghi hết vào sổ"
  → User confirms row-by-row or mapping
```

### 8.4 Privacy / exit

```
Settings → Export CSV/JSON
Settings → Delete account → type XÓA → schedule purge
```

### 8.5 Mobile capture (phase 2)

```
Share sheet / notification companion
  → Queue offline
  → Sync → Inbox on web/PWA
```

---

## 9. Wireframe & mô tả màn hình

**Full ASCII wireframes + states:** [`wireframes-inbox.md`](./wireframes-inbox.md)

### Tóm tắt 24 màn hình

| # | Màn hình | Mục tiêu | Primary action | Risk |
|---|---|---|---|---|
| 1 | Landing | Giải thích inbox value + trust | Bắt đầu / Đăng nhập | Low |
| 2 | Login/Register | Auth nhanh | Tiếp tục | Med (account) |
| 3 | Onboarding | Trust + first capture | Chọn cách đưa data | Low |
| 4 | App shell | Nav inbox-first | Capture | — |
| 5 | Financial Inbox | Duyệt candidates | Duyệt / Bulk | High if mis-approve |
| 6 | Paste Anything | Capture text | Phân tích | Med |
| 7 | Quick Add | 1 txn manual | Lưu | Low |
| 8 | Upload Statement | File in | Tải lên | Med (PII file) |
| 9 | Import Preview | Validate before inbox | Xác nhận import | High |
| 10 | Transaction Review | Fix 1 row + explain | Duyệt | High |
| 11 | Bulk Review | Multi-select actions | Áp dụng | High |
| 12 | Transaction Detail | Full provenance | Sửa / Từ chối | Med |
| 13 | Accounts & Wallets | Where money lives | Thêm TK | Med |
| 14 | Rules | Personal memory | Thêm rule | Med |
| 15 | Import History | Batches audit | Xem / Xóa raw | Med |
| 16 | Timeline | Approved ledger view | Filter / Export | Low |
| 17 | Dashboard tối giản | Safe-to-spend + alerts | Đi Inbox nếu backlog | Low |
| 18 | Privacy Settings | Retention, opt-in | Lưu | High |
| 19 | Export Data | Portability | Tải | Med |
| 20 | Delete Account | Right to erase | Xác nhận | Critical |
| 21 | Error page | Recover | Thử lại / Home | — |
| 22 | Empty states | Guide next step | CTA contextual | — |
| 23 | Loading states | Skeleton not spinner-only | — | — |
| 24 | Mobile capture | Fast in | Gửi vào Inbox | Med |

---

## 10. Design system (tóm tắt + delta)

Chi tiết token đầy đủ vẫn sống trong [`design-system.md`](./design-system.md).  
**Delta Inbox-first** (nguyên bản Money Flow — không copy brand đối thủ):

### 10.1 Positioning visual

| Trục | Money Flow |
|---|---|
| Metaphor | **Hộp thư tài chính** (triage), không “bảng điều khiển ngân hàng” |
| Density | Medium list (email-like rows), không dashboard card spam |
| Motion | ≤ 150ms opacity/transform; **không** parallax/glass |
| Charts | Chỉ Insights; sparkline tối đa; không pie home |

### 10.2 Color (semantic — giữ hệ token hiện có, tinh chỉnh nghĩa)

| Vai trò | Dùng |
|---|---|
| Accent | Primary CTA, nav active, focus — **1 brand accent** (hiện green trust trong app; design-system có thể sync green finance VN-friendly, không clone bank) |
| Income | Success tokens |
| Expense | Neutral-strong amount + optional danger only for negative emphasis; **không chỉ dựa màu** (prefix − / +) |
| Warning / low confidence | Warning tokens + label text “Cần xem” |
| High confidence | Subtle success chip “Khá chắc” |
| Source chips | Info/neutral badges (CSV, Paste, PDF…) |

**Money scan rule:** `font-mono` cho mọi số tiền; never truncate VND; always show currency.

### 10.3 Typography

| Role | Spec |
|---|---|
| Display | 28–32 / semibold — landing only |
| Page title | 22–24 / semibold |
| Section | 16–18 / semibold |
| Body | 14–15 / regular · line 1.5 |
| Meta | 12–13 / medium · secondary |
| Money | mono 14–28 tabular-nums |
| Code/raw | mono 12 · for raw bank text |

Font stack: system UI + mono system (`ui-sans-serif`, `ui-monospace`) — **không** copy font marketing YNAB/Copilot.

### 10.4 Spacing

Scale 4-based: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.  
Inbox row min-height **52–56px** (touch).  
Page padding mobile 16; desktop content max **1120–1280** for inbox list.

### 10.5 Radius & elevation

| Token | Use |
|---|---|
| radius-sm 8 | chips, inputs |
| radius-md 12 | cards, rows |
| radius-lg 16 | dialogs |
| shadow-sm only on elevated dialogs | **no** heavy drop shadows on every card |

### 10.6 Component inventory (Inbox suite)

| Component | Variants / states |
|---|---|
| `AppShell` | desktop sidebar / mobile bottom + capture sheet |
| `NavItem` | default / active / badge count |
| `CaptureMenu` | Paste, Upload, Quick |
| `InboxFilters` | chips multi |
| `CandidateRow` | high / low conf / duplicate / transfer / selected |
| `ConfidenceBadge` | high / medium / low + text |
| `SourceBadge` | paste / csv / xlsx / pdf / manual / notification |
| `BulkActionBar` | hidden / visible (selection > 0) |
| `ExplainPanel` | rule ids, parser version, raw highlight |
| `ImportStepper` | upload → extract → preview → inbox |
| `MappingTable` | column map CSV |
| `MoneyText` | income / expense / transfer / unknown |
| `EmptyState` | illustration-free icon + 1 CTA |
| `SkeletonList` | 6–8 rows |
| `TrustBanner` | privacy one-liner |
| `DangerZone` | delete account |
| Button | primary / secondary / ghost / danger |
| Dialog | sheet mobile / modal desktop ≤ 1 screen |
| Toast | success / error · 4s |

### 10.7 Component states (mọi data UI)

Bắt buộc 5: **Loading · Empty · Error · Success · Partial/Uncertain**  
(Offline = banner khi PWA.)

---

## 11. Desktop vs mobile

| Task | Desktop | Mobile |
|---|---|---|
| Bulk review 100 rows | **Primary** — table + keyboard | Secondary — filter low conf only |
| Paste long statement text | Good | OK |
| Upload file | Drag-drop | File picker |
| Quick add coffee | OK | **Primary** + FAB |
| Capture from share | — | Phase 2 share target |
| Insights | Side panel optional | Separate tab |

**Nav desktop:**  
Inbox · Capture · Timeline · Accounts · Rules · Imports · Insights · Settings  

**Nav mobile (max 5 tabs):**  
Inbox · Capture · Timeline · Accounts · More(Settings/Rules/Imports/Insights)

**Capture mobile:** bottom sheet 3 actions — không chôn trong hamburger.

---

## 12. Accessibility & responsive

### Accessibility (baseline)

- Contrast text ≥ 4.5:1; money vs bg checked in dark/light.  
- Focus ring 2px accent; never `outline: none` without replace.  
- Inbox rows: checkbox + `aria-selected`; bulk bar `role="toolbar"`.  
- Confidence **không chỉ màu** — luôn có text.  
- Dialogs: focus trap, Esc closes, return focus.  
- Date/amount: native inputs + labels.  
- Hit target ≥ 44px mobile.  
- `prefers-reduced-motion`: disable non-essential animation.  
- Lang `vi` on html.

### Responsive breakpoints

| Name | Width | Layout |
|---|---|---|
| sm | < 640 | Single column, bottom nav |
| md | 640–1023 | Optional collapsed nav |
| lg | ≥ 1024 | Sidebar + list (+ detail split optional) |

**Inbox lg enhancement:** list | detail split (mail client pattern — *ý tưởng phổ biến*, layout & tokens riêng MF).

---

## 13. Khác biệt so với đối thủ

| Money Flow | Đối thủ điển hình |
|---|---|
| Home = **Financial Inbox** | Home = dashboard/budget/net worth |
| Capture methods first-class | Bank link or manual only |
| **Confidence + explain** UI | Silent AI/rules |
| Never auto-post low conf | Often auto-import to register |
| Export-first OK (Excel people) | Lock-in to budget method |
| VN multi-source mental model | US open-banking assumptions |
| Safe-to-spend = **Insights**, not gate | N/A or envelope |

**Nhận diện trải nghiệm (không phải logo clone):**  
“Triage tài chính” — cảm giác **email client cho tiền**, không phải **BI dashboard**.

---

## 14. Quyết định quan trọng + lý do

| # | Quyết định | User need | Frequency | Risk | Metric |
|---|---|---|---|---|---|
| 1 | Inbox = default route | Duyệt backlog | Daily/weekly | Med | Time to clear inbox |
| 2 | Capture = dedicated IA node | Data entry | Each session | Med | Capture success rate |
| 3 | Preview before commit batch | Avoid bad import | Per file | High | Correction rate |
| 4 | Bulk bar | Speed | High volume | High if misclick → undo toast 10s | Rows/min |
| 5 | Explain panel required on low conf | Trust | Per uncertain | High | Wrong approve ↓ |
| 6 | Dashboard demoted | Avoid vanity | Occasional | Low | Activation = first approve not chart view |
| 7 | Privacy settings early | Fear upload | First week | Critical | Upload consent rate |
| 8 | 5-tab mobile | Cognitive load | Always | Low | Task completion |
| 9 | Mono money + sign | Scanability | Always | Misread money | Error rate |
| 10 | No pie home | Focus | — | Distraction | — |

---

## 15. Đánh giá theo tác vụ thực tế

| Tác vụ | Flow thiết kế | Pass criteria |
|---|---|---|
| Ghi 1 cà phê | Capture → Quick Add → save | ≤ 3s focus, ≤ 3 fields critical |
| Dán 1 SMS NH | Paste → preview → inbox | ≤ 2 confirms |
| Upload CSV 200 dòng | Upload → map → preview → inbox → bulk 90% | < 5 min first time |
| Sửa merchant sai | Row → explain → edit → optional save rule | ≤ 15s |
| Xuất Excel | Timeline/Settings export | 2 clicks |
| Xóa hết data | Settings danger | Typed confirm + delay clarity |
| Xem còn chi được không | Insights | 1 glance after inbox 0 |

**Heuristic review (Nielsen-inspired, applied):**  
Visibility of system status (batch progress) · User control (reject/undo) · Error prevention (no silent post) · Consistency (same MoneyText) · Recognition (source badges) · Flexibility (bulk + keyboard later) · Aesthetic minimal · Help (explain panel).

---

## 16. Nguồn tham khảo

*Chỉ tham khảo công khai; không scrape private app internals.*

| Sản phẩm | Nguồn |
|---|---|
| YNAB | https://www.ynab.com/ · App Store reviews · support docs (pending, file import) |
| Monarch | https://www.monarch.com/ |
| Copilot | https://www.copilot.money/ · help.copilot.money (Dashboard / To Review) |
| Rocket Money | https://www.rocketmoney.com/ |
| Money Lover | https://moneylover.me/ · Play/App Store |
| Wallet BudgetBakers | product site / stores |
| Spendee | product site / stores |
| Actual Budget | https://actualbudget.org/ · https://github.com/actualbudget/actual |
| Firefly III | https://www.firefly-iii.org/ · https://docs.firefly-iii.org/ · https://github.com/firefly-iii/firefly-iii |
| Expensify | https://www.expensify.com/ |
| Design systems (principles only) | Apple HIG, Material 3, NN/g, IBM Carbon, Atlassian, Polaris — *principles, not layouts* |

---

## Phụ lục A — Mapping từ app hiện tại → IA mới

| Hiện có trong repo | Vai trò mới |
|---|---|
| `/` Dashboard | → `/insights` (secondary) |
| `/transactions` | → merge **Timeline** (+ một phần inbox sau approve) |
| Add dialog | → Quick Add trong Capture |
| Accounts / Budgets / Goals / Commitments / Reports | Giữ nhưng **không** primary activation; budgets/goals có thể dưới Insights hoặc More |
| Auth pages | Giữ, thêm trust microcopy |

---

## Phụ lục B — Definition of Done cho phase UI

- [ ] Routes theo sitemap  
- [ ] Inbox empty/loading/error/partial  
- [ ] Capture paste + upload + quick  
- [ ] Preview + confidence  
- [ ] Bulk bar  
- [ ] Explain panel  
- [ ] Privacy + export + delete  
- [ ] a11y pass basic (keyboard inbox, contrast)  
- [ ] Dark/light  

---

*Hết UX Research & Redesign v1.0 — triển khai visual theo `wireframes-inbox.md` + `design-system.md`.*
