# MoneyFlow — Wireframes

> **Status:** historical/reusable wireframe input. It does not define current
> information architecture or the next visual direction without an owner-approved
> packet; see `docs/research/UI_UX_RESEARCH_LEDGER.md` for classification.

> Giai đoạn 3: UX Flows & Wireframes.
> Không màu sắc. Không styling. Chỉ tập trung vào cấu trúc và usability.
> Mỗi wireframe thể hiện **information architecture**, **interaction flow**, và **state variations**.

**Reference docs**:
- [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) — Triết lý UX
- [design-system.md](./design-system.md) — Design tokens & component specs

---

## Table of Contents

1. [App Shell & Navigation](#1-app-shell--navigation)
2. [Dashboard (Trang chủ)](#2-dashboard-trang-chủ)
3. [Transactions (Giao dịch)](#3-transactions-giao-dịch)
4. [Budgets (Ngân sách)](#4-budgets-ngân-sách)
5. [Commitments (Cam kết định kỳ)](#5-commitments-cam-kết-định-kỳ)
6. [Goals (Mục tiêu tiết kiệm)](#6-goals-mục-tiêu-tiết-kiệm)
7. [Accounts (Tài khoản)](#7-accounts-tài-khoản)
8. [Reports (Báo cáo)](#8-reports-báo-cáo)
9. [Auth (Đăng nhập / Đăng ký)](#9-auth-đăng-nhập--đăng-ký)
10. [Shared Dialogs](#10-shared-dialogs)
11. [UX Flow Diagrams](#11-ux-flow-diagrams)
12. [Audit Notes](#12-audit-notes)

---

## 1. App Shell & Navigation

### 1.1 Desktop Layout (≥ 768px)

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (240px)     │  TOP BAR (full width)                     │
│                     │  ┌──────────────────────────────────────┐ │
│ [Logo] MoneyFlow    │  │ [Search ⌘K]            [🔔] [+ CTA] │ │
│                     │  └──────────────────────────────────────┘ │
│ ─────────────────── │                                           │
│ 📊 Trang chủ   ◄── │  ┌──────────────────────────────────────┐ │
│ 💳 Giao dịch       │  │                                      │ │
│ 📋 Ngân sách       │  │         MAIN CONTENT AREA             │ │
│ 🔄 Cam kết         │  │         (scrollable)                  │ │
│ 🎯 Mục tiêu        │  │         max-width: 1280px             │ │
│ 🏦 Tài khoản       │  │                                      │ │
│ 📈 Báo cáo         │  │                                      │ │
│                     │  │                                      │ │
│ ─────────────────── │  │                                      │ │
│ ⚙ Cài đặt          │  │                                      │ │
│ [Avatar] Tên user   │  │                                      │ │
│  email@...          │  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**UX Notes:**
- Sidebar luôn visible trên desktop.
- Active nav item: highlighted background + left accent border.
- Search bar: placeholder "Tìm giao dịch...", ⌘K shortcut hint.
- CTA button thay đổi theo context:
  - Dashboard: "+ Thêm giao dịch"
  - Transactions: "+ Thêm giao dịch"
  - Budgets: "+ Thêm ngân sách"
  - Accounts: "+ Thêm tài khoản"
- User section sticky ở bottom sidebar.

### 1.2 Mobile Layout (< 768px)

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│ ← Top bar 56px
├────────────────────────────┤
│                            │
│     MAIN CONTENT AREA      │
│     (scrollable)           │
│     padding: 16px          │
│                            │
│                            │
│                            │
│                            │
│                       [+]  │ ← FAB (bottom-right)
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │ ← Bottom tab bar 56px
│ Home Txn  Bud  Rpt  Acc   │   + safe area
└────────────────────────────┘
```

**UX Notes:**
- Sidebar ẩn hoàn toàn. Chỉ bottom tabs.
- 5 tabs: Trang chủ, Giao dịch, Ngân sách, Báo cáo, Tài khoản.
- Cam kết + Mục tiêu accessible từ Dashboard cards (secondary nav).
- FAB cho primary action (thêm giao dịch / thêm item theo context).
- Top bar: logo left, notification + avatar right.

### 1.3 Navigation Hierarchy

```
Trang chủ (Dashboard)
├── Giao dịch
│   ├── Thêm giao dịch [dialog]
│   ├── Chuyển tiền [dialog]
│   └── Sửa giao dịch [dialog]
├── Ngân sách
│   ├── Thêm ngân sách [dialog]
│   └── Sửa ngân sách [dialog]
├── Cam kết (accessible from dashboard card link)
│   ├── Thêm cam kết [dialog]
│   └── Sửa cam kết [dialog]
├── Mục tiêu (accessible from dashboard card link)
│   ├── Thêm mục tiêu [dialog]
│   └── Sửa mục tiêu [dialog]
├── Tài khoản
│   ├── Thêm tài khoản [dialog]
│   ├── Sửa tài khoản [dialog]
│   └── Chuyển tiền [dialog]
├── Báo cáo
│   └── Xuất CSV [link/download]
└── Cài đặt (future)
    ├── Hồ sơ
    ├── Bảo mật
    └── Xuất dữ liệu
```

**Depth:** max 2 levels. Tất cả edit/add đều dùng dialog, không phải page riêng.

---

## 2. Dashboard (Trang chủ)

### 2.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Tổng quan tài chính        │ ← eyebrow (caption)
│ Chào buổi sáng, Minh.     │ ← h1
│                            │
│ ┌────────────────────────┐ │
│ │ Có thể chi hôm nay     │ │ ← HERO CARD
│ │                        │ │
│ │ ₫ 1.234.567            │ │ ← display-lg, mono
│ │                        │ │
│ │ [━━━━━━━░░░░] An toàn  │ │ ← progress meter + badge
│ │                        │ │
│ │ ↑ Đã bảo vệ ₫500.000  │ │ ← insight text
│ │   cho hóa đơn & mục tiêu│ │
│ │                        │ │
│ │ [+ Ghi một khoản mới]  │ │ ← secondary CTA
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Số dư hiện tại    [💰] │ │ ← KPI CARD
│ │ ₫ 15.450.000           │ │
│ │                        │ │
│ │ ↓ Thu nhập  +12.000.000│ │
│ │ ↑ Chi tiêu  −3.200.000│ │
│ │                        │ │
│ │ ▌▌▊▌▌█▌▊▌▌▌█▌▌        │ │ ← mini bar chart (14 days)
│ │ 01 thg 7     Hôm nay   │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Giao dịch gần đây      │ │ ← SECTION
│ │            Xem tất cả →│ │
│ │ ─────────────────────  │ │
│ │ 🍔 Ăn trưa         Hôm│ │ ← transaction row
│ │   Ăn uống · Tiền mặt  │ │
│ │                −45.000₫│ │
│ │ ─────────────────────  │ │
│ │ 🏠 Tiền nhà        Qua│ │
│ │   Nhà ở · VCB         │ │
│ │             −5.000.000₫│ │
│ │ ─────────────────────  │ │
│ │ 💰 Lương T6        3d │ │
│ │   Thu nhập · VCB       │ │
│ │            +12.000.000₫│ │
│ │ ─────────────────────  │ │
│ │ (max 5 transactions)   │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Ngân sách tháng     → │ │ ← BUDGET WIDGET
│ │ Ăn uống               │ │
│ │ ₫800.000 / ₫1.500.000 │ │
│ │ [━━━━━━━░░░] 53%       │ │
│ │ Còn ₫700.000           │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 🔄 Khoản định kỳ      │ │ ← COMMITMENT WIDGET
│ │ ₫2.000.000 đang giữ   │ │
│ │ Xem lịch thanh toán → │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Mục tiêu tiết kiệm → │ │ ← GOAL WIDGET
│ │ Du lịch Đà Lạt        │ │
│ │ ₫3.000.000/₫10.000.000│ │
│ │ [━━━░░░░░░░] 30%       │ │
│ │ ₫50.000/ngày           │ │
│ └────────────────────────┘ │
│                            │
│                       [+]  │ ← FAB
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 2.2 Desktop Wireframe

```
┌─ SIDEBAR ─┬────────────────────────────────────────────────────────────────┐
│            │ TOP BAR                                                       │
│            │ [Search ⌘K]                        [🔔]  [+ Thêm giao dịch] │
│            ├───────────────────────────────────────────────────────────────┤
│            │                                                               │
│  (see 1.1) │ Tổng quan tài chính                                          │
│            │ Chào buổi sáng, Minh.                                        │
│            │ Hôm nay dòng tiền đang đi đúng hướng.         [Tháng này ▼] │
│            │                                                               │
│            │ ┌──────────────────────────────┐ ┌──────────────────────────┐ │
│            │ │ HERO: Có thể chi hôm nay     │ │ KPI: Số dư hiện tại     │ │
│            │ │                              │ │                          │ │
│            │ │ ₫ 1.234.567                  │ │ ₫ 15.450.000        [💰]│ │
│            │ │ [━━━━━━░░░] An toàn          │ │                          │ │
│            │ │                              │ │ ↓ Thu nhập  +12.000.000  │ │
│            │ │ ↑ Đã bảo vệ ₫500.000        │ │ ↑ Chi tiêu  −3.200.000  │ │
│            │ │   cho hóa đơn & mục tiêu     │ │                          │ │
│            │ │                              │ │ ▌▌▊▌▌█▌▊▌▌▌█▌▌          │ │
│            │ │ [+ Ghi một khoản mới]        │ │ 01 thg 7    Hôm nay     │ │
│            │ └──────────────────────────────┘ └──────────────────────────┘ │
│            │                                                               │
│            │ ┌────────────────────────────────┐ ┌────────────────────────┐ │
│            │ │ GIAO DỊCH GẦN ĐÂY             │ │ NGÂN SÁCH THÁNG    → │ │
│            │ │                   Xem tất cả →│ │ Ăn uống               │ │
│            │ │                                │ │ ₫800k / ₫1.500k      │ │
│            │ │ 🍔 Ăn trưa     Hôm −45.000  │ │ [━━━━━░░░] 53%        │ │
│            │ │ 🏠 Tiền nhà    Qua −5.000k   │ │ Còn ₫700.000          │ │
│            │ │ 💰 Lương T6    3d +12.000k   │ ├────────────────────────┤ │
│            │ │ 🚌 Đi làm     3d  −30.000   │ │ 🔄 KHOẢN ĐỊNH KỲ      │ │
│            │ │ 🛒 Siêu thị   4d −280.000   │ │ ₫2tr đang giữ trước   │ │
│            │ │                                │ │ Xem lịch thanh toán → │ │
│            │ │                                │ ├────────────────────────┤ │
│            │ │                                │ │ 🎯 MỤC TIÊU       → │ │
│            │ │                                │ │ Du lịch Đà Lạt        │ │
│            │ │                                │ │ ₫3tr / ₫10tr  30%     │ │
│            │ │                                │ │ [━━━░░░░░░] 50k/ngày  │ │
│            │ └────────────────────────────────┘ └────────────────────────┘ │
│            │                                                               │
└────────────┴───────────────────────────────────────────────────────────────┘
```

### 2.3 Dashboard States

| State | Treatment |
|-------|-----------|
| **Loading** | Skeleton: hero card (large rect), KPI card (medium rect), 5 skeleton rows for transactions, 3 small skeleton cards for budget/commitment/goal |
| **Empty (new user)** | Hero card shows ₫0 with CTA "Thêm tài khoản đầu tiên". Transaction panel: empty state. Budget/commitment/goal: show "Chưa thiết lập" with respective CTAs. |
| **Content** | As wireframed above |
| **Error (data)** | Banner alert at top: "Không thể tải dữ liệu. [Thử lại]". Content below shows last cached state or skeleton. |
| **Offline** | Persistent banner: "Ngoại tuyến — dữ liệu có thể chưa cập nhật". Show cached data. |

### 2.4 Dashboard UX Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hero metric | "Có thể chi hôm nay" | The ONE question users open the app to answer |
| Progress meter | Visual bar with safety badge | Instant glance understanding |
| Transaction list | Max 5 items | Avoid overwhelming. "Xem tất cả" for full list |
| Budget widget | Show top-spend category only | Most relevant. Full list on budget page |
| Commitment widget | Show reserved total only | Summary. Detail on commitment page |
| Goal widget | Show featured (highest %) goal | Motivation. Full list on goal page |
| Mini chart | 14-day expense bars | Quick spending pattern without complexity |
| Welcome message | Time-of-day greeting + name | Personal, warm (per Monzo/Nubank) |

---

## 3. Transactions (Giao dịch)

### 3.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Dòng tiền của bạn          │ ← eyebrow
│ Giao dịch                  │ ← h1
│                            │
│ [Chuyển tiền] [+ Thêm mới]│ ← page actions
│                            │
│ ┌──────┐ ┌──────┐ ┌──────┐│ ← summary cards (horiz scroll)
│ │  42  │ │+12tr │ │ −3tr │ │
│ │G.dịch│ │T.thu │ │T.chi │ │
│ └──────┘ └──────┘ └──────┘│
│                            │
│ ┌────────────────────────┐ │
│ │ 🔍 Tìm theo ghi chú.. │ │ ← search input
│ ├────────────────────────┤ │
│ │[Tất cả][Chi][Thu][C.khoản]│ ← filter chips
│ │            [Mọi TK ▼]  │ │ ← account filter
│ ├────────────────────────┤ │
│ │                        │ │
│ │ ── Hôm nay, 14/07 ──  │ │ ← date group header (sticky)
│ │                        │ │
│ │ 🍔 Ăn trưa    −45.000₫│ │ ← transaction row
│ │   Ăn uống · Tiền mặt  │ │
│ │                        │ │
│ │ ☕ Cà phê     −35.000₫│ │
│ │   Ăn uống · MoMo      │ │
│ │                        │ │
│ │ ── Hôm qua, 13/07 ──  │ │ ← date group header
│ │                        │ │
│ │ 🏠 Tiền nhà −5.000.000│ │
│ │   Nhà ở · VCB         │ │
│ │                        │ │
│ │ 🚌 Grab       −30.000₫│ │
│ │   Di chuyển · MoMo    │ │
│ │                        │ │
│ │ ── 12/07 ────────────  │ │
│ │                        │ │
│ │ 💰 Lương  +12.000.000₫│ │
│ │   Thu nhập · VCB      │ │
│ │                        │ │
│ │    [Xem thêm ▼]       │ │ ← load more (mobile)
│ └────────────────────────┘ │
│                            │
│                       [+]  │ ← FAB
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 3.2 Desktop Wireframe

```
┌─ SIDEBAR ─┬────────────────────────────────────────────────────────────────┐
│            │ [Search ⌘K]                        [🔔]  [+ Thêm giao dịch] │
│            ├───────────────────────────────────────────────────────────────┤
│            │                                                               │
│            │ Dòng tiền của bạn                                             │
│            │ Giao dịch                    [Chuyển tiền]  [+ Thêm mới]     │
│            │ Tìm, kiểm tra và quản lý mọi khoản thu chi ở một nơi.       │
│            │                                                               │
│            │ ┌───────────┐ ┌───────────┐ ┌───────────┐                    │
│            │ │    42      │ │ +12.000k  │ │ −3.200k   │  ← summary KPIs  │
│            │ │ Giao dịch  │ │ Tổng thu  │ │ Tổng chi  │                    │
│            │ └───────────┘ └───────────┘ └───────────┘                    │
│            │                                                               │
│            │ ┌─────────────────────────────────────────────────────────┐   │
│            │ │ TOOLBAR                                                 │   │
│            │ │ 🔍 [Search input          ]                             │   │
│            │ │ [Tất cả] [Khoản chi] [Khoản thu] [Chuyển tiền]         │   │
│            │ │                                         [Mọi TK ▼]     │   │
│            │ ├─────────────────────────────────────────────────────────┤   │
│            │ │ HEADER: Giao dịch          Thời gian     Số tiền   Act │   │
│            │ ├─────────────────────────────────────────────────────────┤   │
│            │ │ 🍔 Ăn trưa                Hôm nay       −45.000₫ [✏🗑]│   │
│            │ │   Ăn uống · Tiền mặt                                   │   │
│            │ │ ☕ Cà phê sáng             Hôm nay       −35.000₫ [✏🗑]│   │
│            │ │   Ăn uống · MoMo                                       │   │
│            │ │ 🏠 Tiền nhà tháng 7       Hôm qua    −5.000.000₫ [🔒] │   │
│            │ │   Nhà ở · VCB · Từ lịch định kỳ                        │   │
│            │ │ 🚌 Grab đi làm            Hôm qua       −30.000₫ [✏🗑]│   │
│            │ │   Di chuyển · MoMo                                     │   │
│            │ │ 💰 Lương tháng 6          3 ngày    +12.000.000₫ [✏🗑]│   │
│            │ │   Thu nhập · VCB                                       │   │
│            │ ├─────────────────────────────────────────────────────────┤   │
│            │ │ ← 1  2  3 ... 12 →                        20/trang    │   │
│            │ └─────────────────────────────────────────────────────────┘   │
│            │                                                               │
└────────────┴───────────────────────────────────────────────────────────────┘
```

### 3.3 Transaction Row Interactions

```
DESKTOP:
  Hover row → highlight bg + show edit/delete buttons
  Click row → open edit dialog
  Click 🔒 on recurring → navigate to /commitments

MOBILE:
  Tap row → open edit dialog (bottom sheet)
  Swipe left → reveal [Sửa] [Xoá] action buttons
  Swipe right → (no action, prevent accidental)
  🔒 recurring → tap opens commitments link toast
```

### 3.4 Transaction States

| State | Wireframe |
|-------|-----------|
| **Loading** | Search/filter toolbar visible. 5 skeleton rows below. |
| **Empty (no transactions)** | Icon + "Chưa có giao dịch" + "Thêm khoản thu hoặc chi đầu tiên" + [Thêm giao dịch] CTA |
| **Empty (filter no results)** | 🔍 Icon + "Không tìm thấy giao dịch" + "Thử đổi từ khóa hoặc bỏ bớt bộ lọc" + [Xoá bộ lọc] |
| **Content** | As wireframed above |
| **Error** | Banner at top. Data below if cached. |

---

## 4. Budgets (Ngân sách)

### 4.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Kế hoạch chi tiêu          │
│ Ngân sách                  │
│ Tháng 7, 2026              │
│                            │
│ [+ Thêm ngân sách]        │
│                            │
│ ┌──────┐ ┌──────┐ ┌──────┐│
│ │₫5.0tr│ │₫3.2tr│ │₫1.8tr││ ← overview KPIs
│ │Hạn   │ │Đã chi│ │Còn   ││
│ │mức   │ │      │ │lại   ││
│ └──────┘ └──────┘ └──────┘│
│                            │
│ Theo danh mục              │
│                            │
│ ┌────────────────────────┐ │
│ │ 🍔 Ăn uống        75% │ │ ← budget card
│ │ ₫1.125.000 / ₫1.500.000│ │
│ │ [━━━━━━━━░░] Còn 375k  │ │
│ │            [Sửa] [Xoá] │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 🏠 Nhà ở          40% │ │
│ │ ₫2.000k / ₫5.000k     │ │
│ │ [━━━━░░░░░░] Còn 3tr   │ │
│ │            [Sửa] [Xoá] │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 🚌 Di chuyển     120% │ │ ← OVER BUDGET (red)
│ │ ₫600k / ₫500k         │ │
│ │ [━━━━━━━━━━█] Vượt 100k│ │
│ │            [Sửa] [Xoá] │ │
│ └────────────────────────┘ │
│                            │
│                       [+]  │
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 4.2 Budget Card States

```
UNDER 50%:    [━━━░░░░░░░]  Green bar    "Còn ₫X"
50-80%:       [━━━━━░░░░░]  Yellow bar   "Còn ₫X"
80-99%:       [━━━━━━━━░░]  Orange bar   "Còn ₫X"
100%+:        [━━━━━━━━━█]  Red bar      "Vượt ₫X"  (card border changes to danger)
```

### 4.3 Budget States

| State | Treatment |
|-------|-----------|
| **Empty** | 🎯 Icon + "Chưa có ngân sách tháng này" + "Bắt đầu với một danh mục bạn muốn kiểm soát" + [Tạo ngân sách đầu tiên] |
| **All categories used** | [+ Thêm ngân sách] button disabled. Tooltip: "Tất cả danh mục đã có ngân sách" |
| **Content** | As wireframed |

---

## 5. Commitments (Cam kết định kỳ)

### 5.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Lịch thanh toán             │
│ Khoản định kỳ              │
│ Quản lý các hoá đơn và     │
│ khoản chi phải trả.        │
│                            │
│ [+ Thêm cam kết]          │
│                            │
│ ┌──────┐ ┌──────┐ ┌──────┐│
│ │₫2.0tr│ │ 3    │ │₫800k ││ ← overview
│ │Đang  │ │Chưa  │ │Đã    ││
│ │giữ   │ │trả   │ │trả   ││
│ └──────┘ └──────┘ └──────┘│
│                            │
│ Chưa thanh toán             │
│                            │
│ ┌────────────────────────┐ │
│ │ 🏠 Tiền nhà            │ │ ← commitment card
│ │ ₫5.000.000 / tháng     │ │
│ │ Đến hạn: 01/08/2026    │ │
│ │                        │ │
│ │ [Đánh dấu đã trả]     │ │ ← primary action
│ │         [Sửa] [Xoá]   │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 📱 Điện thoại          │ │
│ │ ₫200.000 / tháng       │ │
│ │ Đến hạn: 20/07/2026    │ │
│ │                        │ │
│ │ [Đánh dấu đã trả]     │ │
│ │         [Sửa] [Xoá]   │ │
│ └────────────────────────┘ │
│                            │
│ Đã thanh toán tháng này    │
│                            │
│ ┌────────────────────────┐ │
│ │ ✅ Wifi                │ │ ← paid (muted)
│ │ ₫300.000 · Đã trả 05/07│ │
│ └────────────────────────┘ │
│                            │
│                       [+]  │
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 5.2 Commitment UX Flow

```
[Đánh dấu đã trả]
    ↓
Confirmation dialog:
    "Xác nhận đã trả Tiền nhà ₫5.000.000?"
    "Khoản này sẽ được ghi vào sổ giao dịch."
    [Huỷ]  [Xác nhận đã trả]
    ↓
Toast: "Đã ghi khoản chi ₫5.000.000 cho Tiền nhà."
    ↓
Card moves from "Chưa thanh toán" → "Đã thanh toán"
Safe-to-spend on dashboard updates automatically
```

---

## 6. Goals (Mục tiêu tiết kiệm)

### 6.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Tích luỹ từng ngày         │
│ Mục tiêu tiết kiệm        │
│ Đặt mục tiêu và MoneyFlow │
│ sẽ tính số tiền cần tiết  │
│ kiệm mỗi ngày.            │
│                            │
│ [+ Tạo mục tiêu]          │
│                            │
│ ┌────────────────────────┐ │
│ │ 🎯 Du lịch Đà Lạt     │ │ ← goal card
│ │                        │ │
│ │ ₫3.000.000             │ │ ← allocated (large)
│ │ / ₫10.000.000          │ │ ← target
│ │                        │ │
│ │ [━━━░░░░░░░] 30%       │ │
│ │                        │ │
│ │ 📅 Hạn: 01/12/2026    │ │
│ │ 💰 ₫50.000/ngày       │ │ ← daily guidance
│ │                        │ │
│ │ [Nạp thêm]  [Sửa]     │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 🎯 iPhone mới         │ │
│ │                        │ │
│ │ ₫8.000.000             │ │
│ │ / ₫25.000.000          │ │
│ │                        │ │
│ │ [━━░░░░░░░░] 32%       │ │
│ │                        │ │
│ │ 📅 Tự do tiến độ      │ │
│ │                        │ │
│ │ [Nạp thêm]  [Sửa]     │ │
│ └────────────────────────┘ │
│                            │
│                       [+]  │
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 6.2 Goal States

| State | Treatment |
|-------|-----------|
| **Empty** | "Dành tiền cho một điều bạn muốn đạt được." + [Tạo mục tiêu] |
| **In progress** | As wireframed. Show daily saving rate if deadline set. |
| **Completed (100%)** | 🎉 Badge. "Chúc mừng! Bạn đã đạt mục tiêu." [Lưu trữ] |
| **Overdue** | ⚠ "Đã qua hạn" badge. Show gap amount. |
| **Archived** | Section "Đã lưu trữ" with muted cards, [Khôi phục] action. |

---

## 7. Accounts (Tài khoản)

### 7.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Nơi giữ tiền               │
│ Tài khoản                  │
│                            │
│ [Chuyển tiền] [+ Thêm TK] │
│                            │
│ ┌────────────────────────┐ │
│ │ Tổng số dư             │ │ ← overview card
│ │ ₫ 15.450.000           │ │
│ │ Trên 3 tài khoản       │ │
│ └────────────────────────┘ │
│                            │
│ Đang hoạt động              │
│                            │
│ ┌────────────────────────┐ │
│ │ 🏦 Vietcombank         │ │ ← account card
│ │ Ngân hàng · VND        │ │
│ │ ₫ 12.000.000           │ │ ← balance (large, mono)
│ │                        │ │
│ │ Ban đầu: ₫10.000.000  │ │
│ │         [Sửa] [Lưu trữ]│ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 💳 MoMo                │ │
│ │ Ví điện tử · VND       │ │
│ │ ₫ 2.450.000            │ │
│ │                        │ │
│ │ Ban đầu: ₫2.000.000   │ │
│ │         [Sửa] [Lưu trữ]│ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ 💵 Tiền mặt            │ │
│ │ Tiền mặt · VND         │ │
│ │ ₫ 1.000.000            │ │
│ │                        │ │
│ │ Ban đầu: ₫1.500.000   │ │
│ │         [Sửa] [Lưu trữ]│ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Đã lưu trữ (1)         │ │ ← collapsed section
│ │ ▸ Mở                   │ │
│ └────────────────────────┘ │
│                            │
│                       [+]  │
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 7.2 Account Types & Icons

```
💵 Tiền mặt    (cash)
🏦 Ngân hàng   (bank)
💳 Ví điện tử  (e_wallet)
💳 Thẻ tín dụng (credit_card) — balance may be negative
🏦 Tiết kiệm   (savings)
```

---

## 8. Reports (Báo cáo)

### 8.1 Mobile Wireframe

```
┌────────────────────────────┐
│ [Logo]        [🔔] [Avatar]│
├────────────────────────────┤
│                            │
│ Bức tranh tài chính        │
│ Báo cáo                    │
│ 01/07 – 14/07/2026        │
│                            │
│ [Xuất CSV]                 │
│                            │
│ [Tuần này] [Tháng] [Năm]  │ ← period tabs
│    ━━━━━                   │
│                            │
│ ┌──────┐ ┌──────┐ ┌──────┐│
│ │+12tr │ │ −3tr │ │+9tr  ││ ← metrics
│ │Thu   │ │Chi   │ │Ròng  ││
│ │nhập  │ │tiêu  │ │      ││
│ └──────┘ └──────┘ └──────┘│
│ ┌──────┐                   │
│ │₫2.5tr│                   │
│ │Kỳ    │                   │
│ │trước │                   │
│ └──────┘                   │
│                            │
│ ┌────────────────────────┐ │
│ │ Nhịp chi tiêu          │ │ ← TREND CHART
│ │ TB/ngày: ₫228.571      │ │
│ │                        │ │
│ │     █                  │ │
│ │   ▊ █ ▊               │ │ ← vertical bar chart
│ │ ▌ ▊ █ ▊ ▌             │ │
│ │ ▌ ▊ █ ▊ ▌ ▊ ▌         │ │
│ │ ▌ ▊ █ ▊ ▌ ▊ ▌ ▊       │ │
│ │ ─────────────────      │ │
│ │ 01    05    10   14    │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ Chi theo danh mục      │ │ ← CATEGORY BREAKDOWN
│ │                        │ │
│ │ 🏠 Nhà ở              │ │ ← horizontal bar
│ │ [━━━━━━━━━━] ₫5.000k  │ │
│ │                   62%  │ │
│ │                        │ │
│ │ 🍔 Ăn uống            │ │
│ │ [━━━━░░░░░░] ₫1.500k  │ │
│ │                   19%  │ │
│ │                        │ │
│ │ 🚌 Di chuyển           │ │
│ │ [━━░░░░░░░░] ₫600k    │ │
│ │                    7%  │ │
│ │                        │ │
│ │ ... (sorted by amount) │ │
│ └────────────────────────┘ │
│                            │
├────────────────────────────┤
│ 🏠  💳  📋  📈  🏦       │
└────────────────────────────┘
```

### 8.2 Report States

| State | Treatment |
|-------|-----------|
| **Empty (no data in period)** | 📊 Icon + "Chưa có dữ liệu trong kỳ" + "Thêm giao dịch hoặc chọn kỳ dài hơn" + [Thêm giao dịch] [Xem cả năm] |
| **Partial (income only)** | Show income metric. "Chưa có khoản chi" in expense areas. |
| **Content** | As wireframed |

---

## 9. Auth (Đăng nhập / Đăng ký)

### 9.1 Login Wireframe (Mobile)

```
┌────────────────────────────┐
│                            │
│                            │
│      [Logo]                │
│      MoneyFlow             │
│                            │
│  Quản lý tài chính         │
│  cá nhân của bạn.          │
│                            │
│  ┌──────────────────────┐  │
│  │ Email                │  │ ← input
│  │ you@email.com        │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ Mật khẩu             │  │ ← input (type=password)
│  │ ••••••••     [👁]    │  │    toggle visibility
│  └──────────────────────┘  │
│                            │
│  [     Đăng nhập      ]   │ ← primary button (full width)
│                            │
│  Quên mật khẩu?           │ ← link
│                            │
│  ─── hoặc ───             │ ← divider
│                            │
│  [G  Đăng nhập với Google] │ ← social login
│                            │
│  Chưa có tài khoản?       │
│  Đăng ký                   │ ← link → register
│                            │
│  [Dùng thử không cần TK]  │ ← ghost button → demo mode
│                            │
└────────────────────────────┘
```

### 9.2 Register Wireframe

```
┌────────────────────────────┐
│                            │
│      [Logo]                │
│      MoneyFlow             │
│                            │
│  Tạo tài khoản mới        │
│                            │
│  ┌──────────────────────┐  │
│  │ Tên hiển thị         │  │
│  │ Nguyễn Văn A         │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ Email                │  │
│  │ you@email.com        │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ Mật khẩu             │  │
│  │ ••••••••     [👁]    │  │
│  └──────────────────────┘  │
│  Ít nhất 8 ký tự          │ ← helper text
│                            │
│  [     Đăng ký         ]   │
│                            │
│  ─── hoặc ───             │
│                            │
│  [G  Đăng ký với Google]   │
│                            │
│  Đã có tài khoản?         │
│  Đăng nhập                 │ ← link → login
│                            │
└────────────────────────────┘
```

### 9.3 Auth Flow

```
New user → Login page → "Dùng thử" → Dashboard (demo mode)
                       → Register → Dashboard (real mode, no accounts)
                       → Login → Dashboard

Returning user → Login → Dashboard
               → Forgot password → Email sent → Reset password → Login

Session expired → Redirect to login with return URL
                → After login → Redirect back to original page
```

---

## 10. Shared Dialogs

### 10.1 Add Transaction Dialog

```
┌──────────────────────────────────────────┐
│  Thêm giao dịch                  [✕]    │
├──────────────────────────────────────────┤
│                                          │
│  Loại:  [Khoản chi ▼]                   │ ← select: chi/thu
│                                          │
│  Số tiền:                                │
│  ┌──────────────────────────────┬─────┐  │
│  │                    1.234.567 │  ₫  │  │ ← currency input (LARGEST)
│  └──────────────────────────────┴─────┘  │
│                                          │
│  Danh mục:                               │
│  ┌─────────────────────────────────────┐ │
│  │ 🍔    🏠    🚌    👕    📱    💊   │ │ ← category picker grid
│  │ Ăn    Nhà   Di    Mua  Viễn  Sức   │ │
│  │ uống  ở     chuyển sắm  thông khoẻ │ │
│  │                                     │ │
│  │ 🎭    📚    💰    🎁    ✂️    ...   │ │
│  │ Giải  Giáo  Tiết  Quà   Cá   Khác  │ │
│  │ trí   dục   kiệm  tặng  nhân       │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Tài khoản: [Tiền mặt ▼]                │ ← select
│                                          │
│  Ghi chú:                                │
│  ┌─────────────────────────────────────┐ │
│  │ Ăn trưa với đồng nghiệp            │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Ngày:  [14/07/2026 ▼]                  │ ← date picker
│                                          │
├──────────────────────────────────────────┤
│                      [Huỷ]   [Lưu]      │
└──────────────────────────────────────────┘
```

**Field order rationale:**
1. **Loại** (chi/thu) — determines category list
2. **Số tiền** — the most important data, largest input
3. **Danh mục** — what was it for
4. **Tài khoản** — where from
5. **Ghi chú** — optional detail
6. **Ngày** — defaults to today, rarely changed

### 10.2 Account Dialog

```
┌──────────────────────────────────────────┐
│  Thêm tài khoản                  [✕]    │
├──────────────────────────────────────────┤
│                                          │
│  Tên tài khoản:                          │
│  ┌─────────────────────────────────────┐ │
│  │ Vietcombank                         │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Loại tài khoản: [Ngân hàng ▼]          │
│                                          │
│  Số dư ban đầu:                          │
│  ┌──────────────────────────────┬─────┐  │
│  │                   10.000.000 │  ₫  │  │
│  └──────────────────────────────┴─────┘  │
│  Nhập số dư thực tế hiện tại.           │
│                                          │
├──────────────────────────────────────────┤
│                      [Huỷ]   [Lưu]      │
└──────────────────────────────────────────┘
```

### 10.3 Transfer Dialog

```
┌──────────────────────────────────────────┐
│  Chuyển tiền giữa tài khoản      [✕]    │
├──────────────────────────────────────────┤
│                                          │
│  Từ tài khoản:   [Vietcombank ▼]         │
│                                          │
│        ↓ (direction indicator)           │
│                                          │
│  Đến tài khoản:  [MoMo ▼]               │
│                                          │
│  Số tiền:                                │
│  ┌──────────────────────────────┬─────┐  │
│  │                      500.000 │  ₫  │  │
│  └──────────────────────────────┴─────┘  │
│                                          │
│  Ghi chú:                                │
│  ┌─────────────────────────────────────┐ │
│  │ Nạp tiền MoMo                       │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Ngày:  [14/07/2026]                    │
│                                          │
├──────────────────────────────────────────┤
│                    [Huỷ]   [Chuyển tiền] │
└──────────────────────────────────────────┘
```

### 10.4 Delete Confirmation

```
┌──────────────────────────────────────────┐
│  Xoá giao dịch?                  [✕]    │
├──────────────────────────────────────────┤
│                                          │
│  Giao dịch "Ăn trưa với đồng nghiệp"   │
│  trị giá 45.000 ₫ sẽ bị xoá.           │
│                                          │
│  Giao dịch sẽ được ẩn khỏi sổ.          │
│  Bạn có thể khôi phục trong 30 ngày.    │
│                                          │
├──────────────────────────────────────────┤
│                      [Huỷ]   [Xoá]      │
│                              ^^^         │
│                        destructive red   │
└──────────────────────────────────────────┘
```

---

## 11. UX Flow Diagrams

### 11.1 Core User Journey (New User)

```
[Mở app] → [Login page]
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
[Dùng thử] [Đăng ký]  [Đăng nhập]
     │          │          │
     ▼          ▼          ▼
[Dashboard - Empty State]
     │
     ▼
[Thêm tài khoản đầu tiên]  ← CTA on empty dashboard
     │
     ▼
[Account dialog → Lưu]
     │
     ▼
[Dashboard - có số dư, chưa có giao dịch]
     │
     ▼
[Thêm giao dịch đầu tiên]  ← hero card CTA
     │
     ▼
[Transaction dialog → Lưu]
     │
     ▼
[Dashboard - fully populated]
     │
     ├── Explore: Budgets, Goals, Commitments
     │
     ▼
[Returning user loop: Check safe-to-spend → Log expenses]
```

### 11.2 Daily Use Flow (Returning User)

```
[Mở app]
    │
    ▼
[Dashboard]
    │
    ├── Glance: "Có thể chi ₫X" → Đã trả lời câu hỏi chính
    │
    ├── Alert? → "Ngân sách Ăn uống vượt 100%" → Tap → Budgets page
    │
    ├── Quick add → FAB [+] → Transaction dialog → Lưu → Toast "Đã ghi"
    │
    ├── Review → "Xem tất cả" → Transactions page → Search/Filter
    │
    └── Bill due → Commitment card → "Đánh dấu đã trả" → Toast "Đã ghi"
```

### 11.3 Transaction CRUD Flow

```
CREATE:
  [+ button] → Dialog → Fill form → [Lưu]
                                       │
                                   ┌───┴───┐
                                   ▼       ▼
                              [Success]  [Error]
                              Toast      Inline error
                              Dialog     Stay in dialog
                              closes

EDIT:
  [Tap row / ✏] → Edit dialog (pre-filled) → Modify → [Lưu]
                                                         │
                                                   ┌─────┴─────┐
                                                   ▼           ▼
                                              [Success]    [Error]
                                              Toast        Inline
                                              Dialog       Stay
                                              closes

DELETE:
  [🗑 button] → Confirmation dialog
                    │
             ┌──────┴──────┐
             ▼             ▼
         [Huỷ]          [Xoá]
         Close          Soft-delete
         dialog         Toast "Đã xoá" + [Hoàn tác]
                            │
                      ┌─────┴──────┐
                      ▼            ▼
                  [8s pass]   [Hoàn tác]
                  Permanent   Restore item
                              Toast "Đã khôi phục"
```

---

## 12. Audit Notes

### 12.1 Current Implementation vs. Wireframes

| Area | Current | Wireframe | Gap |
|------|---------|-----------|-----|
| **Navigation** | 7 sidebar items + 7 bottom tabs | 5 bottom tabs (mobile) + 7 sidebar (desktop) | Mobile has too many tabs. Reduce to 5, move Cam kết + Mục tiêu to secondary nav. |
| **Dashboard hero** | "Có thể chi hôm nay" ✅ | Same | Aligned |
| **Dashboard layout** | Hero + KPI side-by-side, then 2-col grid | Same concept | Aligned. Minor reordering may help mobile. |
| **Transaction list** | Flat list with filter bar | Grouped by date with sticky headers | Need date grouping + sticky date headers |
| **Transaction row** | Icon + detail + time + amount + actions inline | Same but actions on hover (desktop) / swipe (mobile) | Need swipe-to-reveal on mobile. Actions always visible is cluttered. |
| **Budget cards** | Grid of category cards | Same | Aligned. Color-coded progress bar by threshold needed. |
| **Forms** | Dialog-based ✅ | Same | Aligned |
| **Empty states** | Basic icon + text + CTA ✅ | Same pattern, need illustrations | Upgrade from icon to illustration |
| **Loading states** | Basic loading spinner | Skeleton screens | Need skeleton implementation |
| **Error states** | Banner alert ✅ | Same | Aligned |
| **Toast** | Basic toast ✅ | Toast with undo action | Need undo capability |
| **Mobile FAB** | ✅ | Same | Aligned |
| **App shell** | Each page duplicates sidebar/topbar/nav code | Shared layout component | Need to extract to shared layout |

### 12.2 Priority Changes for Phase 4

| Priority | Change | Impact |
|----------|--------|--------|
| 🔴 High | Extract shared app shell layout (stop duplicating sidebar/nav in every page) | Architecture, DRY |
| 🔴 High | Implement skeleton loading states | Perceived performance |
| 🔴 High | Reduce mobile bottom tabs to 5 | Mobile usability |
| 🟡 Medium | Add date grouping + sticky headers to transaction list | Scanability |
| 🟡 Medium | Implement swipe-to-reveal actions on mobile transaction rows | Mobile interaction |
| 🟡 Medium | Add undo to toast for destructive actions | Error recovery |
| 🟡 Medium | Color-code budget progress bars by threshold | Visual clarity |
| 🟢 Low | Upgrade empty state icons to illustrations | Polish |
| 🟢 Low | Add transition animations per motion spec | Premium feel |
| 🟢 Low | Command palette (⌘K) | Power user feature |

### 12.3 Missing Screens (Future)

- Settings page (profile, security, data export)
- Onboarding flow (first-time user tutorial)
- Notifications panel
- Transaction detail view (full history, edit log)
- Category management
- Recurring transaction templates

---

## Appendix: Wireframe Conventions

```
[Button]           = Clickable button
[Select ▼]         = Dropdown select
[Input field    ]  = Text input
[━━━━░░░░]         = Progress bar
[✕]                = Close button
← / → / ↓ / ↑     = Direction indicator
✅ / ⚠ / 🔒       = Status icon
FAB [+]            = Floating action button
━━━━               = Active tab underline
```

All wireframes are **structural only**. Refer to [design-system.md](./design-system.md) for colors, fonts, spacing, and component styling.
