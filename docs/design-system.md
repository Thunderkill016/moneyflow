# MoneyFlow — Design System

> **Current redesign authority (2026):** [Calm Ledger v2](./design/CALM_LEDGER_V2.md). The v2 contract overrides conflicting v1 values below while routes migrate. Product and financial truth remains in [product principles](./product/PRINCIPLES.md).

> Tài liệu này là **luật** cho toàn bộ giao diện MoneyFlow.
> Mọi component, màu sắc, khoảng cách, animation đều phải tuân theo specs trong file này.
> Không có ngoại lệ. Nếu cần thay đổi, cập nhật file này trước, rồi mới sửa code.

**Companion doc**: [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) — triết lý và nguyên tắc UX.

---

## 1. Design Principles

Mỗi quyết định thiết kế phải trả lời ít nhất một trong các nguyên tắc sau:

| # | Nguyên tắc | Giải thích | Kiểm tra |
|---|-----------|-----------|----------|
| 1 | **Rõ ràng hơn trang trí** | Mỗi pixel phải truyền tải thông tin | "Element này nói gì cho user?" |
| 2 | **Bình tĩnh hơn cảnh báo** | Gợi ý nhẹ nhàng, không tạo lo lắng | "User có bị stress khi thấy này không?" |
| 3 | **Hành động hơn báo cáo** | Mỗi dữ liệu gợi ý bước tiếp theo | "User biết làm gì tiếp sau khi đọc?" |
| 4 | **Trung thực hơn thoải mái** | Không ẩn phí, nợ, số âm | "Có thông tin nào bị giấu không?" |
| 5 | **Tiếng Việt đầu tiên** | Mọi text đều bằng tiếng Việt | "User không biết tiếng Anh có hiểu được không?" |
| 6 | **Mobile trước** | Thiết kế cho 375px, rồi mở rộng | "Trang này nhìn ổn trên iPhone SE chưa?" |
| 7 | **Accessible mặc định** | Không phải feature — là constraint | "Screen reader đọc trang này được không?" |
| 8 | **Tiết lộ dần dần** | Hiện cốt lõi, chi tiết khi cần | "Có thông tin nào làm rối mà chưa cần thiết?" |

---

## 2. Color Tokens

### 2.1 Cách đặt tên

Token đặt theo **ngữ nghĩa** (semantic), không theo giá trị (raw). Format:

```
--color-{category}-{variant}
```

Ví dụ: `--color-bg-primary`, `--color-text-secondary`, `--color-danger-default`.

### 2.2 Neutral Palette

Nền tảng của toàn bộ giao diện. 80%+ UI là neutral.

| Token | Light | Dark | Dùng cho |
|-------|-------|------|----------|
| `--color-bg-primary` | `#FFFFFF` | `#0A0A0B` | Nền trang |
| `--color-bg-secondary` | `#F8F9FA` | `#141416` | Nền card, sidebar |
| `--color-bg-tertiary` | `#F1F3F5` | `#1E1F23` | Hover, pressed, input bg |
| `--color-bg-elevated` | `#FFFFFF` | `#1A1A1E` | Dropdown, popover, modal |
| `--color-border-default` | `#E2E4E8` | `#2A2B30` | Card border, divider |
| `--color-border-strong` | `#CED1D6` | `#3A3B42` | Input border, table border |
| `--color-border-focus` | `#3B82F6` | `#60A5FA` | Focus ring (2px) |
| `--color-text-primary` | `#111218` | `#EDEDED` | Heading, body text |
| `--color-text-secondary` | `#555B66` | `#A0A0A8` | Label, description |
| `--color-text-tertiary` | `#8B919E` | `#6B6B76` | Caption, timestamp, placeholder |
| `--color-text-disabled` | `#B0B5BD` | `#4A4A54` | Disabled text |
| `--color-text-inverse` | `#FFFFFF` | `#111218` | Text on accent backgrounds |

### 2.3 Brand / Accent

Một màu accent duy nhất. Blue = tin cậy, ổn định.

| Token | Light | Dark | Dùng cho |
|-------|-------|------|----------|
| `--color-accent-default` | `#3B82F6` | `#60A5FA` | Primary button, link, active nav |
| `--color-accent-hover` | `#2563EB` | `#3B82F6` | Button hover |
| `--color-accent-pressed` | `#1D4ED8` | `#2563EB` | Button pressed |
| `--color-accent-subtle` | `#EFF6FF` | `#172554` | Badge bg, highlight row |
| `--color-accent-text` | `#1E40AF` | `#93C5FD` | Link text on subtle bg |

### 2.4 Semantic Colors

| Category | Token suffix | Light | Dark | Dùng cho |
|----------|-------------|-------|------|----------|
| **Success** | `-default` | `#16A34A` | `#22C55E` | Thu nhập, tăng, hoàn thành |
| | `-subtle` | `#F0FDF4` | `#052E16` | Badge bg |
| | `-text` | `#15803D` | `#86EFAC` | Text trên subtle bg |
| **Danger** | `-default` | `#DC2626` | `#EF4444` | Chi tiêu, giảm, lỗi, xoá |
| | `-subtle` | `#FEF2F2` | `#450A0A` | Badge bg |
| | `-text` | `#B91C1C` | `#FCA5A5` | Text trên subtle bg |
| **Warning** | `-default` | `#D97706` | `#F59E0B` | Ngân sách 80%+, sắp đến hạn |
| | `-subtle` | `#FFFBEB` | `#451A03` | Badge bg |
| | `-text` | `#B45309` | `#FCD34D` | Text trên subtle bg |
| **Info** | `-default` | `#2563EB` | `#60A5FA` | Thông tin, chuyển khoản |
| | `-subtle` | `#EFF6FF` | `#1E3A5F` | Badge bg |
| | `-text` | `#1E40AF` | `#93C5FD` | Text trên subtle bg |

### 2.5 Overlay & Shadow

| Token | Light | Dark |
|-------|-------|------|
| `--color-overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | `0 4px 12px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | `0 8px 24px rgba(0,0,0,0.5)` |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.16)` | `0 16px 48px rgba(0,0,0,0.6)` |

### 2.6 Color Rules

```
RULE 1:  Neutral chiếm 80%+ diện tích mỗi màn hình.
RULE 2:  Chỉ MỘT màu accent (blue). Không thêm màu brand phụ.
RULE 3:  Semantic color chỉ dùng cho ngữ nghĩa, không trang trí.
RULE 4:  Không kết hợp red + green làm cách phân biệt duy nhất.
         Phải đi kèm icon (↑↓) + dấu (+−).
RULE 5:  Dark mode: xám đậm (#0A0A0B), KHÔNG dùng pure black (#000000).
RULE 6:  Dark mode elevation: surface sáng hơn = "cao hơn".
RULE 7:  Mọi cặp text/bg phải pass WCAG AA (4.5:1 text, 3:1 large text).
RULE 8:  Test với deuteranopia (red-green colorblind) trước khi release.
```

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Geist Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
```

- **Inter**: UI text. Hỗ trợ đầy đủ dấu tiếng Việt. Dùng Variable font.
- **Mono**: Mọi giá trị tiền tệ và số liệu. Đảm bảo decimal alignment.

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Dùng cho |
|-------|------|--------|-------------|---------------|----------|
| `--text-display-lg` | 36px / 2.25rem | 700 (Bold) | 1.2 (43px) | -0.02em | Hero metric (Số dư tổng) |
| `--text-display-sm` | 28px / 1.75rem | 600 (Semibold) | 1.25 (35px) | -0.015em | Page title |
| `--text-heading-lg` | 22px / 1.375rem | 600 | 1.3 (29px) | -0.01em | Section heading |
| `--text-heading-sm` | 18px / 1.125rem | 600 | 1.35 (24px) | 0 | Card title, dialog title |
| `--text-body-lg` | 16px / 1rem | 400 (Regular) | 1.5 (24px) | 0 | Primary body text |
| `--text-body-md` | 14px / 0.875rem | 400 | 1.5 (21px) | 0 | Secondary text, form labels |
| `--text-caption` | 12px / 0.75rem | 500 (Medium) | 1.4 (17px) | 0.01em | Timestamps, badges, meta |
| `--text-mono-lg` | 20px / 1.25rem | 500 | 1.3 (26px) | -0.01em | KPI monetary values |
| `--text-mono-md` | 16px / 1rem | 500 | 1.4 (22px) | 0 | Table monetary values |
| `--text-mono-sm` | 14px / 0.875rem | 400 | 1.4 (20px) | 0 | Small monetary values |
| `--text-mono-xs` | 12px / 0.75rem | 400 | 1.3 (16px) | 0.01em | Compact monetary values |

### 3.3 Typography Rules

```
RULE 1:  Tối đa 2 font families: Inter + Mono. Không thêm.
RULE 2:  Mọi giá trị tiền tệ → font mono. Không ngoại lệ.
RULE 3:  Tối đa 3 cỡ chữ trên cùng một screen.
RULE 4:  Font nhỏ nhất: 12px (chỉ caption). Body không dưới 14px.
RULE 5:  Dấu tiếng Việt phải render đúng ở mọi cỡ.
         Test string: "Tiền gửi ngân hàng — ₫ Đường Nguyễn Huệ"
RULE 6:  Dùng font-variant-numeric: tabular-nums cho cột số.
RULE 7:  Line length: 50-75 ký tự. max-width cho text blocks.
RULE 8:  ALL CAPS labels: letter-spacing +0.05em, font-weight 600.
RULE 9:  Không dùng italic cho tiếng Việt (dấu bị méo ở một số font).
```

---

## 4. Spacing

### 4.1 Spacing Scale

Base unit: **4px**. Mọi giá trị spacing là bội số của 4.

| Token | Value | rem | Dùng cho |
|-------|-------|-----|----------|
| `--space-0` | 0px | 0 | Reset |
| `--space-0.5` | 2px | 0.125 | Hairline gap (icon badge offset) |
| `--space-1` | 4px | 0.25 | Icon-to-text gap, inline tight |
| `--space-1.5` | 6px | 0.375 | Compact chip padding |
| `--space-2` | 8px | 0.5 | Input padding-y, related element gap |
| `--space-3` | 12px | 0.75 | List item padding, form field gap |
| `--space-4` | 16px | 1 | Card padding (mobile), section gap (small) |
| `--space-5` | 20px | 1.25 | Card padding (desktop) |
| `--space-6` | 24px | 1.5 | Section spacing |
| `--space-8` | 32px | 2 | Page padding (mobile), large section gap |
| `--space-10` | 40px | 2.5 | Large section gap |
| `--space-12` | 48px | 3 | Page padding (desktop), major separator |
| `--space-16` | 64px | 4 | Layout gutter (desktop) |
| `--space-20` | 80px | 5 | Hero section padding |

### 4.2 Spacing Application

| Context | Mobile | Desktop |
|---------|--------|---------|
| Page padding (horizontal) | `--space-4` (16px) | `--space-8` (32px) |
| Page padding (top) | `--space-6` (24px) | `--space-8` (32px) |
| Card internal padding | `--space-4` (16px) | `--space-5` (20px) |
| Gap between cards | `--space-3` (12px) | `--space-4` (16px) |
| Form field vertical gap | `--space-3` (12px) | `--space-3` (12px) |
| Section title → content | `--space-3` (12px) | `--space-4` (16px) |
| Between sections | `--space-8` (32px) | `--space-10` (40px) |
| Button internal padding | `12px 16px` | `12px 20px` |
| Icon ↔ text gap | `--space-2` (8px) | `--space-2` (8px) |
| Sidebar width (expanded) | N/A | 240px |
| Sidebar width (collapsed) | N/A | 64px |
| Bottom tab bar height | 56px + safe area | N/A |
| Top bar height | 56px | 56px |

---

## 5. Border Radius

| Token | Value | Dùng cho |
|-------|-------|----------|
| `--radius-xs` | 2px | Inline code, micro-elements |
| `--radius-sm` | 4px | Chips, badges, small tags |
| `--radius-md` | 8px | Buttons, inputs, select, small cards |
| `--radius-lg` | 12px | Cards, dialogs, dropdowns |
| `--radius-xl` | 16px | Bottom sheets, large modals |
| `--radius-2xl` | 24px | Feature cards (special) |
| `--radius-full` | 9999px | Avatars, circular buttons, toggle track, pills |

### Radius Rules

```
RULE 1:  Container radius > child radius.
         Card (12px) > Button inside card (8px) > Badge inside button (4px).
RULE 2:  Nested radius = parent_radius - parent_padding.
         Nếu card radius=12, padding=16: nội dung bên trong dùng radius ≤ 8.
RULE 3:  Nhất quán theo cấp: cùng cấp component → cùng radius.
```

---

## 6. Elevation & Depth

### 6.1 Elevation Levels

| Level | Shadow Token | z-index | Dùng cho |
|-------|-------------|---------|----------|
| 0 (Flat) | none | auto | Page content, flat cards |
| 1 (Raised) | `--shadow-sm` | 1 | Cards, hoverable elements |
| 2 (Floating) | `--shadow-md` | 10 | Dropdowns, popovers, tooltips |
| 3 (Overlay) | `--shadow-lg` | 100 | Modals, dialogs, bottom sheets |
| 4 (Top) | `--shadow-xl` | 1000 | Toast notifications, command palette |

### 6.2 z-index Scale

```css
--z-base:        0;
--z-raised:      1;
--z-sticky:      5;      /* Sticky headers, fixed tab bar */
--z-dropdown:    10;     /* Dropdowns, popovers */
--z-overlay:     100;    /* Modal backdrop */
--z-modal:       101;    /* Modal content */
--z-toast:       1000;   /* Toast notifications */
--z-tooltip:     1100;   /* Tooltips (above everything) */
```

### 6.3 Dark Mode Elevation

Trong dark mode, elevation biểu hiện bằng **surface color sáng hơn**, không phải shadow:

| Level | Dark Surface Color |
|-------|-------------------|
| 0 | `#0A0A0B` (bg-primary) |
| 1 | `#141416` (bg-secondary) |
| 2 | `#1A1A1E` (bg-elevated) |
| 3 | `#1E1F23` (bg-tertiary) |

---

## 7. Buttons

### 7.1 Button Variants

| Variant | Background | Text | Border | Dùng cho |
|---------|-----------|------|--------|----------|
| **Primary** | `accent-default` | `text-inverse` | none | CTA chính: Lưu, Thêm, Xác nhận |
| **Secondary** | transparent | `text-primary` | `border-strong` | Action phụ: Huỷ, Quay lại |
| **Ghost** | transparent | `accent-default` | none | Inline actions, links dạng button |
| **Destructive** | `danger-default` | `#FFFFFF` | none | Xoá, Huỷ bỏ |
| **Destructive Ghost** | transparent | `danger-default` | none | Inline delete, less prominent |

### 7.2 Button Sizes

| Size | Height | Padding (h × v) | Font | Icon size | Radius |
|------|--------|-----------------|------|-----------|--------|
| `sm` | 32px | 12px × 6px | `body-md` (14px) | 16px | `radius-md` |
| `md` | 40px | 16px × 8px | `body-lg` (16px) | 18px | `radius-md` |
| `lg` | 48px | 20px × 12px | `body-lg` (16px, 600) | 20px | `radius-md` |

### 7.3 Button States

| State | Treatment |
|-------|-----------|
| Default | As defined above |
| Hover | Background darkens one step (e.g., accent → accent-hover) |
| Pressed | Background darkens two steps (accent → accent-pressed) |
| Focus | 2px focus ring (`border-focus`), 2px offset |
| Disabled | Opacity 0.5, cursor: not-allowed, no pointer events |
| Loading | Content replaced with spinner (same size as icon). Width preserved. |

### 7.4 Button Rules

```
RULE 1:  Tối đa 1 Primary button per page section.
RULE 2:  Tối đa 2 Primary buttons per page (toàn bộ).
RULE 3:  Primary action luôn nằm bên PHẢI trong button group.
RULE 4:  Destructive button luôn TÁCH BIỆT khỏi group chính (gap lớn hoặc vị trí khác).
RULE 5:  Button text dùng verb: "Thêm giao dịch", "Lưu", "Xoá". Không dùng "OK", "Submit".
RULE 6:  Icon-only buttons: chỉ cho icon universal (✕ đóng, ← back, + thêm).
         Mọi icon-only button phải có aria-label.
RULE 7:  Min width: 64px. Không cho button nhỏ hơn.
RULE 8:  Mobile: full-width primary buttons ở form footers.
```

---

## 8. Cards

### 8.1 Card Anatomy

```
┌─────────────────────────────────────┐  ← border-default, radius-lg
│  [Icon]  Title           [Action ▸] │  ← heading-sm, space-4 padding
│                                     │
│  Content area                       │  ← body-lg or body-md
│  (metrics, lists, charts)           │
│                                     │
│  Footer / Link                      │  ← caption, text-secondary
└─────────────────────────────────────┘
```

### 8.2 Card Variants

| Variant | Background | Border | Shadow | Dùng cho |
|---------|-----------|--------|--------|----------|
| **Default** | `bg-secondary` | `border-default` | none | Containers tiêu chuẩn |
| **Elevated** | `bg-primary` | none | `shadow-sm` | Prominent cards (KPI cards) |
| **Interactive** | `bg-secondary` | `border-default` | none → `shadow-sm` on hover | Clickable cards |
| **Highlight** | `accent-subtle` | `accent-default` (left-border 3px) | none | Featured/alert cards |

### 8.3 KPI Card Spec

```
┌────────────────────────────┐
│  Label (caption, text-secondary)                │
│  ₫ 2.450.000 (mono-lg, text-primary)           │
│  ↑ +12,5% so với tháng trước                   │
│     (caption, success-default)                  │
│  ~~~~~~~~ sparkline ~~~~~~~~                    │
└────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Padding | `space-4` (mobile) / `space-5` (desktop) |
| Border | `border-default` |
| Radius | `radius-lg` |
| Min width | 160px |
| Max width | 320px (in grid) |
| Sparkline height | 32px |
| Delta colors | ↑ green `success-default` / ↓ red `danger-default` / → neutral `text-tertiary` |

### 8.4 Card Rules

```
RULE 1:  Cards không lồng nhau (no card inside card).
RULE 2:  Card title luôn ở top-left. Action ở top-right.
RULE 3:  Clickable card: toàn bộ card là click target, không chỉ text.
RULE 4:  Interactive card hover: border color chuyển sang border-strong + shadow-sm.
RULE 5:  Card grid: 1 col (mobile), 2 col (tablet), 3-4 col (desktop).
```

---

## 9. Forms

### 9.1 Text Input Spec

```
┌─ Label (body-md, 600, text-primary) ─────────────────┐
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Placeholder text (text-tertiary)                 │ │  ← height: 40px
│  └──────────────────────────────────────────────────┘ │     border: border-strong
│                                                        │     radius: radius-md
│  Helper text (caption, text-secondary)                │     padding: space-2 × space-3
│  or                                                    │     bg: bg-primary
│  Error text (caption, danger-default) + ⚠ icon        │
└────────────────────────────────────────────────────────┘
```

### 9.2 Input States

| State | Border | Background | Shadow |
|-------|--------|-----------|--------|
| Default | `border-strong` | `bg-primary` | none |
| Hover | `border-strong` (darker) | `bg-primary` | none |
| Focus | `border-focus` (2px) | `bg-primary` | `0 0 0 3px accent-subtle` |
| Error | `danger-default` (2px) | `bg-primary` | `0 0 0 3px danger-subtle` |
| Disabled | `border-default` | `bg-tertiary` | none |
| Read-only | none | `bg-secondary` | none |

### 9.3 Currency Input (Special)

```
┌─ Số tiền ───────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┬─────┐ │
│  │  1.234.567                                │  ₫  │ │  ← font: mono-lg
│  └──────────────────────────────────────────┴─────┘ │     inputmode="decimal"
│                                                      │     auto-format on input
└──────────────────────────────────────────────────────┘     text-align: right
```

| Property | Value |
|----------|-------|
| Font | `--font-mono`, `--text-mono-lg` (20px) |
| Text align | Right |
| Input mode | `decimal` (mobile numeric keypad) |
| Auto-format | `1234567` → `1.234.567` as user types |
| Suffix | `₫` in muted text inside input |
| Min value | `0` (hoặc cho phép âm cho hoàn tiền) |
| Validation | On blur. "Vui lòng nhập số tiền hợp lệ" |

### 9.4 Select / Dropdown

| Property | Value |
|----------|-------|
| Height | 40px (same as input) |
| Padding | `space-2` × `space-3` |
| Border / radius | Same as text input |
| Dropdown max height | 280px (scrollable) |
| Option height | 40px |
| Selected indicator | Checkmark icon, right side |
| Search | Built-in search for > 7 options |

### 9.5 Category Picker

Grid layout of category icons:

| Property | Value |
|----------|-------|
| Grid | 4 columns (mobile), 6 columns (desktop) |
| Item size | 64×64px touch target |
| Icon size | 24px |
| Label | Below icon, `caption` size |
| Selected state | Accent bg + scale(1.05) |
| Scrollable | Yes, max 2 visible rows, scroll for more |

### 9.6 Form Layout Rules

```
RULE 1:   Single column trên mobile. Max 2 columns desktop (chỉ cho cặp liên quan).
RULE 2:   Label ở trên input (top-aligned). Không dùng floating labels cho financial input.
RULE 3:   Placeholder KHÔNG thay thế label. Placeholder là gợi ý format.
RULE 4:   Validate on blur, không on keystroke. Hiện lỗi ngay dưới field.
RULE 5:   Required là mặc định. Đánh dấu optional, không đánh dấu required.
RULE 6:   Tab order theo reading order (trên → dưới, trái → phải).
RULE 7:   Submit button sticky ở bottom trên mobile. Luôn visible.
RULE 8:   Currency field là input LỚN nhất (font lớn hơn, nổi bật nhất).
RULE 9:   Form gap: space-3 (12px) giữa các fields.
RULE 10:  Label → input gap: space-1.5 (6px).
```

---

## 10. Tables

### 10.1 Table Structure

```
┌──────────────────────────────────────────────────────────────┐
│  Table Header (sticky)                                        │
├────────┬──────────────┬──────────┬──────────────┬────────────┤
│  Icon  │  Mô tả       │  Tài khoản │  Hạng mục    │  Số tiền   │
├────────┼──────────────┼──────────┼──────────────┼────────────┤
│   🍔   │  Ăn trưa     │  Tiền mặt │  Ăn uống     │ −45.000 ₫  │ ← danger color
│   🏠   │  Tiền nhà    │  VCB      │  Nhà ở       │ −5.000.000₫│
│   💰   │  Lương T6    │  VCB      │  Thu nhập     │+12.000.000₫│ ← success color
├────────┴──────────────┴──────────┴──────────────┴────────────┤
│  Pagination: ← 1 2 3 ... 12 →                     20/trang   │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 Table Specs

| Property | Value |
|----------|-------|
| Header bg | `bg-secondary` |
| Header text | `caption` (12px), 600 weight, `text-secondary`, uppercase, letter-spacing +0.05em |
| Header height | 40px |
| Row height | 48px (compact) / 56px (comfortable) |
| Row border | 1px `border-default` bottom |
| Row hover | `bg-tertiary` |
| Cell padding | `space-3` (12px) horizontal |
| Number alignment | Right |
| Text alignment | Left |
| Status alignment | Center |
| Sticky header | Yes, z-index: `z-sticky` |
| Sort indicator | ▲ ▼ next to column header, `text-secondary` |

### 10.3 Transaction Row (Special)

```
┌─────┬──────────────────────────────────┬────────────┐
│ 🍔  │  Ăn trưa với đồng nghiệp         │  −45.000 ₫ │  ← mono-md, danger
│     │  Tiền mặt · Ăn uống · 14:30      │    ↓       │  ← caption, text-tertiary
└─────┴──────────────────────────────────┴────────────┘
```

| Property | Value |
|----------|-------|
| Icon | 32×32px, category icon with subtle bg circle (40px) |
| Description | `body-md` (14px), 500 weight, `text-primary` |
| Meta line | `caption` (12px), `text-tertiary`: "Account · Category · Time" |
| Amount | `mono-md` (16px), 500 weight, right-aligned |
| Amount color | Income: `success-default` / Expense: `danger-default` |
| Direction icon | ↑ or ↓, 12px, same color as amount |
| Row height | 64px |
| Swipe left (mobile) | Reveal: [Sửa] [Xoá] action buttons |
| Click/tap | Navigate to transaction detail |

### 10.4 Date Group Header

```
─── Hôm nay, 14/07/2026 ─── Tổng: −234.000 ₫ ───
```

| Property | Value |
|----------|-------|
| Font | `caption` (12px), 600 weight, uppercase |
| Color | `text-secondary` |
| Sticky | Yes (below table header) |
| Daily total | Right-aligned, `mono-sm`, color by sign |

### 10.5 Table Rules

```
RULE 1:   Monetary values RIGHT-aligned. Text LEFT-aligned. Status CENTER.
RULE 2:   Mono font cho mọi cột số. Dùng font-variant-numeric: tabular-nums.
RULE 3:   Header sticky khi scroll dọc.
RULE 4:   Sortable columns có indicator (▲▼). Click header để sort.
RULE 5:   Row click → detail. Không cần nút "Xem" riêng.
RULE 6:   Mobile: max 3 cột visible. Extra data trong expandable row hoặc detail sheet.
RULE 7:   Pagination: 20 items/trang. "Xem thêm" trên mobile, numbered trên desktop.
RULE 8:   Empty table → empty state component, không hiện grid trống.
RULE 9:   Loading → skeleton rows (5 rows) khớp layout.
RULE 10:  Alternating row bg HOẶC border — không cả hai.
```

---

## 11. Charts

### 11.1 Chart Types Allowed

| Chart | Dùng khi | Ví dụ |
|-------|---------|-------|
| **Line** | Trend liên tục theo thời gian | Thu nhập/chi tiêu theo tháng |
| **Bar (ngang)** | So sánh giữa categories | Chi tiêu theo hạng mục |
| **Bar (dọc)** | So sánh theo thời gian (ít điểm) | Chi tiêu 12 tháng gần nhất |
| **Area** | Nhấn mạnh khối lượng thay đổi | Tổng tài sản theo thời gian |
| **Stacked bar** | Thành phần cấu tạo | Thu nhập vs chi tiêu theo tháng |
| **Progress bar** | Tiến độ so với mục tiêu | Ngân sách đã dùng |
| **Sparkline** | Trend nhanh trong card/row | KPI card, account row |
| **❌ Pie / Donut** | KHÔNG DÙNG | — |
| **❌ 3D bất kỳ** | KHÔNG DÙNG | — |
| **❌ Gauge / Speedometer** | KHÔNG DÙNG | — |

### 11.2 Chart Styling

| Property | Value |
|----------|-------|
| Line thickness | 2px |
| Bar border-radius | `radius-sm` (4px) top corners |
| Grid lines | `border-default`, 1px, dashed |
| Axis labels | `caption` (12px), `text-tertiary` |
| Tooltip | Elevated card style, `shadow-md`, `radius-md` |
| Colors | Max 5-6 per chart. Primary series: `accent-default` |
| Area fill | 10-20% opacity of line color |
| Animation | Draw-in 600ms on mount, `ease-out` |
| Responsive | Reflow on resize. Hide legend on mobile, show on desktop |
| Empty chart | "Chưa đủ dữ liệu" message + illustration |

### 11.3 Chart Color Palette

Dùng cho multi-series charts. Thứ tự ưu tiên:

| Series | Light | Dark | Semantic |
|--------|-------|------|----------|
| 1 | `#3B82F6` | `#60A5FA` | Accent (primary series) |
| 2 | `#8B5CF6` | `#A78BFA` | Purple |
| 3 | `#06B6D4` | `#22D3EE` | Cyan |
| 4 | `#F59E0B` | `#FBBF24` | Amber |
| 5 | `#10B981` | `#34D399` | Emerald |
| 6 | `#EC4899` | `#F472B6` | Pink |

### 11.4 Chart Rules

```
RULE 1:  KHÔNG dùng pie chart. Dùng horizontal bar thay thế.
RULE 2:  KHÔNG dùng 3D effects.
RULE 3:  Max 5-6 màu per chart.
RULE 4:  Luôn label trục bằng tiếng Việt.
RULE 5:  Tooltip hiện giá trị chính xác khi hover/tap.
RULE 6:  Dùng solid vs dashed lines để phân biệt — không chỉ dựa vào màu.
RULE 7:  Chart data phải có table alternative cho screen readers.
RULE 8:  Sparklines: không trục, không label — chỉ hình dạng trend.
```

---

## 12. Sidebar (Desktop)

### 12.1 Sidebar Spec

```
┌────────────────────────────┐
│  [Logo]  MoneyFlow         │  ← 56px height, space-4 padding
├────────────────────────────┤
│                            │
│  📊  Trang chủ    ← active │  ← accent-subtle bg, accent text
│  💳  Giao dịch             │  ← 44px height, space-3 padding-left
│  📋  Ngân sách             │
│  🔄  Cam kết               │
│  🎯  Mục tiêu              │
│  🏦  Tài khoản             │
│  📈  Báo cáo               │
│                            │
├────────────────────────────┤  ← border-default top
│  ⚙️  Cài đặt               │
│  👤  Nguyễn Văn A           │  ← avatar + name
│       user@email.com       │  ← caption, text-tertiary
└────────────────────────────┘
```

### 12.2 Sidebar States

| State | Treatment |
|-------|-----------|
| Expanded | Width: 240px. Icon (20px) + space-3 + Text (`body-md`, 500) |
| Collapsed | Width: 64px. Icon only (20px), centered. Tooltip on hover for label. |
| Active item | `accent-subtle` bg, `accent-default` text, left border 3px `accent-default` |
| Hover item | `bg-tertiary` bg |
| Badge/Count | Right side, pill shape (`radius-full`), `caption`, `danger-default` bg (cho notifications) |

### 12.3 Sidebar Rules

```
RULE 1:  Max 8 top-level items (hiện có 7: Dashboard → Reports + Settings).
RULE 2:  Không nested menu / dropdown trong sidebar. Flat navigation.
RULE 3:  Collapse button: toggle ở bottom hoặc top bar.
RULE 4:  Collapsed → expanded: animate width 200ms ease-out.
RULE 5:  User section luôn ở bottom (sticky).
RULE 6:  Không hiển thị sidebar trên mobile. Dùng bottom tab bar thay thế.
```

---

## 13. Navigation

### 13.1 Bottom Tab Bar (Mobile)

```
┌──────────────────────────────────────────────────────┐
│  🏠        💳        ➕        📋        👤          │
│ Trang chủ  Giao dịch  Thêm    Ngân sách  Tài khoản  │  ← 56px + safe area
└──────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 56px + env(safe-area-inset-bottom) |
| Background | `bg-primary` with `border-default` top border |
| Items | 5 tabs max |
| Active icon | Filled variant, `accent-default` |
| Active label | `caption` (12px), 600 weight, `accent-default` |
| Inactive icon | Outline variant, `text-tertiary` |
| Inactive label | Hidden (icon only) hoặc `caption`, `text-tertiary` |
| Center tab ("Thêm") | Prominent: larger icon (28px), `accent-default` bg circle |
| Tap feedback | Scale(0.95) 100ms + haptic (nếu supported) |

### 13.2 Breadcrumbs

```
Trang chủ  /  Tài khoản  /  Vietcombank
(link)       (link)        (current, text-primary)
```

| Property | Value |
|----------|-------|
| Font | `body-md` (14px) |
| Separator | `/` in `text-tertiary` |
| Link color | `accent-text` |
| Current page | `text-primary`, no link |
| Max depth | 3 levels. Nếu > 3: collapse middle với `...` |

### 13.3 Tabs (Section)

```
[Tổng quan]  [Chi tiết]  [Lịch sử]
   ━━━━━
   active
```

| Property | Value |
|----------|-------|
| Font | `body-md` (14px), 500 weight |
| Active | `text-primary`, 2px bottom border `accent-default` |
| Inactive | `text-secondary`, no border |
| Height | 44px |
| Gap between tabs | `space-6` (24px) |
| Scrollable | Yes on mobile if > 4 tabs |
| Animation | Underline slides to active tab, 200ms ease-out |

### 13.4 Navigation Rules

```
RULE 1:  Mobile: bottom tab bar. Desktop: sidebar. Không hamburger menu.
RULE 2:  Max 5 bottom tabs. Max 8 sidebar items.
RULE 3:  Navigation depth max 3 levels.
RULE 4:  Back button luôn có trên detail/edit pages.
RULE 5:  Active state rõ ràng: khác biệt về color + weight + indicator.
RULE 6:  "Thêm giao dịch" action luôn accessible trong 1 tap từ bất kỳ trang nào.
```

---

## 14. Dialogs & Modals

### 14.1 Dialog Anatomy

```
┌──────────────────────────────────────────┐
│  Title (heading-sm)              [✕]     │  ← 56px header, border-bottom
├──────────────────────────────────────────┤
│                                          │
│  Content area                            │  ← scrollable if needed
│  (form fields, confirmation text, etc.)  │     max-height: 70vh
│                                          │
├──────────────────────────────────────────┤
│              [Huỷ]   [Primary Action]    │  ← 64px footer, border-top
└──────────────────────────────────────────┘     right-aligned buttons
```

### 14.2 Dialog Specs

| Property | Value |
|----------|-------|
| Width | 480px (sm), 640px (md), 800px (lg). Mobile: full-width - 32px margin |
| Max height | 85vh |
| Content max height | 70vh (scrollable) |
| Backdrop | `--color-overlay` |
| Radius | `radius-lg` (12px) |
| Shadow | `shadow-xl` |
| Enter animation | Fade in backdrop 200ms + scale dialog from 0.95→1 + fade 250ms |
| Exit animation | Scale 1→0.97 + fade out 200ms |
| Focus trap | Yes. Tab cycles within dialog. |
| Close | ✕ button, Escape key, backdrop click (non-destructive dialogs only) |

### 14.3 Bottom Sheet (Mobile)

```
         ┌─ handle (40×4px, radius-full, bg-tertiary) ─┐
         │                                              │
┌────────┴──────────────────────────────────────────────┴────────┐
│  Title (heading-sm)                                    [✕]     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Content                                                       │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  [Action buttons]                          safe-area-bottom    │
└────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Radius | `radius-xl` (16px) top corners only |
| Max height | 90vh |
| Drag handle | 40×4px, centered, `bg-tertiary`, `radius-full` |
| Drag to dismiss | Drag down > 30% → dismiss |
| Spring animation | spring(1, 300, 30) for open/close |
| Padding bottom | env(safe-area-inset-bottom) + `space-4` |

### 14.4 Confirmation Dialog (Destructive)

```
┌──────────────────────────────────────────┐
│  Xoá giao dịch?                  [✕]    │
├──────────────────────────────────────────┤
│                                          │
│  Giao dịch "Ăn trưa" trị giá            │
│  45.000 ₫ sẽ bị xoá.                    │
│  Bạn có thể khôi phục trong 30 ngày.    │
│                                          │
├──────────────────────────────────────────┤
│                      [Huỷ]   [Xoá]      │  ← Xoá = destructive button
└──────────────────────────────────────────┘
```

### 14.5 Dialog Rules

```
RULE 1:  Không modal dài hơn 1 screen (85vh max).
RULE 2:  Nếu form dài hơn → dùng full page thay vì modal.
RULE 3:  Confirmation dialog: nêu rõ HẬU QUẢ, không chỉ hỏi "Bạn có chắc?"
RULE 4:  Destructive confirmation: button text = hành động cụ thể ("Xoá giao dịch" không "OK").
RULE 5:  Backdrop click đóng dialog CHỈ cho non-destructive (info, success).
         Destructive: phải click Huỷ hoặc ✕.
RULE 6:  Mobile: ưu tiên bottom sheet hơn centered modal cho quick actions.
RULE 7:  Focus vào input đầu tiên khi dialog mở (nếu có form).
RULE 8:  Escape luôn đóng dialog.
```

---

## 15. Notifications & Toasts

### 15.1 Toast Spec

```
┌──────────────────────────────────────────────────┐
│  [✓]  Đã lưu giao dịch thành công     [✕] [Hoàn tác] │
└──────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Position | Bottom-center (mobile), bottom-right (desktop) |
| Width | Min 320px, max 480px. Mobile: full-width - 32px |
| Height | Auto (min 48px) |
| Padding | `space-3` × `space-4` |
| Radius | `radius-lg` (12px) |
| Shadow | `shadow-lg` |
| Background | `bg-elevated` |
| Border | 1px `border-default` + left border 3px (semantic color) |
| Enter | Slide up + fade in 300ms, spring easing |
| Exit | Fade out 200ms |
| Auto-dismiss | 5s (success/info), 8s (warning with undo), never (error) |
| Stack | Max 3 visible. New pushes old up. |
| Z-index | `z-toast` (1000) |

### 15.2 Toast Variants

| Variant | Left border | Icon | Auto-dismiss |
|---------|------------|------|-------------|
| Success | `success-default` | ✓ checkmark | 5 giây |
| Info | `info-default` | ℹ info circle | 5 giây |
| Warning | `warning-default` | ⚠ triangle | 8 giây |
| Error | `danger-default` | ✕ circle | Không (phải dismiss thủ công) |
| Undo | `info-default` | ↩ undo icon | 8 giây (undo link bên phải) |

### 15.3 Banner Alert (Page-level)

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠  Bạn đang ngoại tuyến. Dữ liệu có thể chưa cập nhật.  [✕] │
└──────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Position | Top of page content (below top bar) |
| Width | 100% |
| Padding | `space-2` × `space-4` |
| Background | Semantic `*-subtle` bg |
| Border | 1px semantic color bottom |
| Dismissible | ✕ button (trừ offline banner — persistent) |

---

## 16. Accessibility

### 16.1 Contrast Requirements

| Element | Min Ratio | Standard |
|---------|----------|---------|
| Body text (< 18px) | 4.5:1 | WCAG AA |
| Large text (≥ 18px bold, ≥ 24px regular) | 3:1 | WCAG AA |
| Icons, borders, focus indicators | 3:1 | WCAG AA |
| Decorative elements | No requirement | — |

### 16.2 Focus Management

```css
/* Focus ring - visible on keyboard navigation only */
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 16.3 Touch Targets

| Context | Min size |
|---------|---------|
| Standalone button / icon button | 44×44px |
| Table row (as click target) | Full row width × 48px min height |
| Tab bar item | Equal width × 56px |
| Adjacent interactive elements | 8px gap minimum |

### 16.4 Screen Reader

- Mọi icon button: `aria-label` bắt buộc.
- Monetary values: `aria-label="Âm tám mươi chín nghìn đồng"` (số đọc bằng tiếng Việt).
- Chart: `role="img"` + `aria-label` mô tả trend + data table alternative.
- Toast: `role="status"` + `aria-live="polite"`.
- Error: `role="alert"` + `aria-live="assertive"`.
- Loading skeleton: `aria-busy="true"` + `aria-label="Đang tải"`.

### 16.5 Motion Preference

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 17. Dark Mode

### 17.1 Implementation

- Dùng CSS custom properties (design tokens) cho mọi color.
- Toggle: `<html data-theme="dark">` hoặc `class="dark"`.
- Mặc định: follow system preference (`prefers-color-scheme: dark`).
- User override: lưu trong localStorage, ưu tiên hơn system.
- Transition: `background-color 200ms ease, color 200ms ease` khi switch theme.

### 17.2 Dark Mode Rules

```
RULE 1:  Dark ≠ inverted. Calibrate từng token cẩn thận.
RULE 2:  Background: deep gray (#0A0A0B), KHÔNG pure black (#000000).
RULE 3:  Elevation = surface sáng hơn. bg-primary (tối nhất) → bg-elevated (sáng hơn).
RULE 4:  Shadows giảm hiệu quả trong dark mode → thay bằng border hoặc surface color.
RULE 5:  Images, illustrations: giảm brightness 10% trong dark mode.
RULE 6:  Saturate colors nhẹ (+10%) trong dark mode để compensate perceived dimness.
RULE 7:  Test WCAG contrast cho cả 2 themes trước release.
RULE 8:  Accent color điều chỉnh: light dùng #3B82F6, dark dùng #60A5FA (sáng hơn).
```

### 17.3 Dark Mode Token Mapping

Tham khảo Section 2 (Color Tokens) cho full mapping. Key differences:

| Token | Light | Dark | Lý do |
|-------|-------|------|-------|
| Text primary | Very dark (#111218) | Very light (#EDEDED) | Contrast |
| Border | Light gray (#E2E4E8) | Dark gray (#2A2B30) | Subtle separation |
| Accent | #3B82F6 | #60A5FA | Brighter to maintain contrast on dark bg |
| Success | #16A34A | #22C55E | Brighter green |
| Danger | #DC2626 | #EF4444 | Brighter red |

---

## 18. Motion

### 18.1 Timing Tokens

| Token | Duration | Easing | Dùng cho |
|-------|----------|--------|----------|
| `--duration-instant` | 100ms | `ease-out` | Button press, toggle, checkbox |
| `--duration-fast` | 150ms | `ease-out` | Hover effects, small state changes |
| `--duration-normal` | 200ms | `ease-in-out` | Expand/collapse, tab switch |
| `--duration-slow` | 300ms | `ease-out` | Page transitions, modal enter |
| `--duration-slower` | 500ms | `ease-out` | Chart draw-in, complex animations |

### 18.2 Easing Functions

```css
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1);       /* Enter / appear */
--ease-in:      cubic-bezier(0.7, 0, 0.84, 0);       /* Exit / disappear */
--ease-in-out:  cubic-bezier(0.45, 0, 0.55, 1);      /* State change */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);   /* Playful bounce (sheets, FAB) */
```

### 18.3 Animation Catalog

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Button hover bg | `instant` | `ease-out` | Mouse enter |
| Button press scale(0.97) | `instant` | `ease-out` | Mouse down |
| Card hover shadow + border | `fast` | `ease-out` | Mouse enter |
| Sidebar expand/collapse | `normal` | `ease-in-out` | Toggle click |
| Tab underline slide | `normal` | `ease-out` | Tab change |
| Modal backdrop fade-in | `normal` | `ease-out` | Modal open |
| Modal scale(0.95→1) + fade | `slow` | `ease-out` | Modal open |
| Modal scale(1→0.97) + fade-out | `normal` | `ease-in` | Modal close |
| Bottom sheet slide-up | `slow` | `ease-spring` | Sheet open |
| Toast slide-up + fade | `slow` | `ease-spring` | Notification |
| Skeleton shimmer | 1500ms | linear, infinite | Loading |
| Chart draw-in | `slower` | `ease-out` | Mount/data change |
| List item enter | `normal` | `ease-out` | Item added |
| List item exit | `fast` | `ease-in` | Item removed |
| Page transition (Next.js) | `slow` | `ease-out` | Route change |
| Progress bar fill | `slow` | `ease-in-out` | Value change |

### 18.4 Motion Rules

```
RULE 1:  Mỗi animation phải có MỤC ĐÍCH (orient, feedback, attention, latency).
RULE 2:  Không animation trang trí (bouncing, particles, gratuitous effects).
RULE 3:  Enter > Exit duration (vào chậm, ra nhanh).
RULE 4:  Max 2 elements animating đồng thời trong cùng viewport.
RULE 5:  Skeleton shimmer: linear gradient sweep trái → phải, 1.5s, infinite.
RULE 6:  Optimistic UI: thay đổi ngay → server xác nhận sau → revert nếu lỗi.
RULE 7:  prefers-reduced-motion → tắt tất cả animation, transition thành instant.
RULE 8:  Không animation trên initial page load (chỉ skeleton → content).
```

---

## 19. Responsive Rules

### 19.1 Breakpoints

| Token | Width | Layout |
|-------|-------|--------|
| `--bp-mobile` | 0 – 639px | Single column, bottom tabs, full-width cards |
| `--bp-tablet` | 640 – 1023px | 2 columns, sidebar collapsed or bottom tabs |
| `--bp-desktop` | 1024 – 1439px | 2-3 columns, sidebar expanded |
| `--bp-wide` | 1440px+ | 3-4 columns, sidebar expanded, max-width container |

### 19.2 Responsive Behavior

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navigation | Bottom tab bar | Bottom tabs or collapsed sidebar | Expanded sidebar |
| Page padding | 16px | 24px | 32px |
| Card grid | 1 column | 2 columns | 3-4 columns |
| KPI cards | Horizontal scroll | 2×2 grid | 1 row (3-4 cards) |
| Table | Compact (3 cols) | Medium (5 cols) | Full (all cols) |
| Dialog | Full-width - 32px | 480px centered | 480-640px centered |
| Quick action | Bottom sheet | Bottom sheet | Modal dialog |
| Chart | Full-width, compact | Full-width | Contained in card |
| Font scale | 1× | 1× | 1× (no scaling) |

### 19.3 Container

```css
--container-max: 1280px;
--container-padding: var(--space-4);  /* 16px mobile */

@media (min-width: 1024px) {
  --container-padding: var(--space-8);  /* 32px desktop */
}
```

Content area max width: `1280px`, centered. Sidebar is outside this container.

### 19.4 Responsive Rules

```
RULE 1:  Mobile-first CSS: base styles → @media (min-width) overrides.
RULE 2:  Không ẩn content trên mobile — restructure hoặc progressive disclose.
RULE 3:  Touch targets ≥ 44×44px ở MỌI breakpoint.
RULE 4:  Test thực tế trên: iPhone SE (375), iPhone 15 (393), iPad (768), Desktop (1440).
RULE 5:  Sidebar ẩn hoàn toàn dưới 768px. Bottom tabs ẩn hoàn toàn từ 768px.
RULE 6:  No horizontal scroll trên page level. Cho phép trong table và KPI card row.
RULE 7:  Images/charts scale proportionally. Không fixed-width.
RULE 8:  Font sizes KHÔNG thay đổi theo breakpoint. Cùng scale cho mọi device.
```

---

## 20. Implementation Reference

### 20.1 Tech Stack

| Layer | Tool | Lý do |
|-------|------|-------|
| Framework | Next.js (App Router) | Đang dùng, SSR, RSC |
| Styling | Tailwind CSS 4 | Đang dùng, utility-first |
| Component base | shadcn/ui (Radix) | Đang dùng partially, accessible |
| Typography | Inter + JetBrains Mono / Geist Mono | Vietnamese support, monospace data |
| Charts | Recharts hoặc Tremor | React ecosystem, clean defaults |
| Tables | Native hoặc TanStack Table | Headless, flexible |
| Icons | Lucide React | Đang dùng, consistent line icons |
| Animation | CSS transitions + Framer Motion (nếu cần spring) | Performant |
| Theme | next-themes | System + manual dark/light |
| Forms | React Hook Form + Zod | Đang dùng Zod, add RHF |

### 20.2 CSS Token Implementation

Tokens sẽ được khai báo trong `globals.css` dưới dạng CSS custom properties:

```css
:root {
  /* Colors */
  --color-bg-primary: #FFFFFF;
  --color-text-primary: #111218;
  /* ... full token list ... */

  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  /* ... */

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  /* ... */

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  /* ... */

  /* Motion */
  --duration-instant: 100ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  /* ... */
}

[data-theme="dark"] {
  --color-bg-primary: #0A0A0B;
  --color-text-primary: #EDEDED;
  /* ... dark overrides ... */
}
```

### 20.3 Naming Convention (Components)

```
src/components/ui/         ← shadcn primitives (button, input, dialog...)
src/components/            ← composed MoneyFlow components
src/components/layout/     ← app shell, sidebar, tab bar
src/components/charts/     ← chart components
```

### 20.4 File Organization

```
docs/
  UX_PRINCIPLES.md        ← Triết lý UX (this companion doc)
  design-system.md         ← Design System (this file)
  wireframes/              ← Wireframe sketches (Phase 3)
```

---

## Quick Reference Card

```
FONTS:       Inter (UI) + JetBrains Mono (numbers)
ACCENT:      Light #0B6B3A / Dark #4AD58A — MỘT màu thương hiệu
  (Semantic income/success dùng token riêng và luôn có dấu/icon/label.)
SPACING:     4px base → 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
RADIUS:      2 xs, 4 sm, 8 md, 12 lg, 16 xl, 9999 full
SHADOWS:     sm (1+2), md (4+12), lg (8+24), xl (16+48)
ELEVATION:   0 flat, 1 raised, 2 floating, 3 overlay, 4 top
MOTION:      100ms instant, 150ms fast, 200ms normal, 300ms slow
EASING:      ease-out (enter), ease-in (exit), ease-in-out (change)
TOUCH:       Min 44×44px
FONT MIN:    14px body, 12px caption
CONTRAST:    4.5:1 text, 3:1 large text / icons
BREAKPOINTS: 0-639 mobile, 640-1023 tablet, 1024-1439 desktop, 1440+ wide
NAV:         Inbox-first · Bottom ≤5 tabs mobile · Sidebar desktop
HOME:        /dashboard (Tổng quan); /insights là redirect cũ; /inbox là hàng đợi duyệt dữ liệu
MONEY:       Always monospace. Right-aligned. Never truncated in detail views.
NEGATIVE:    Sign + direction icon + color (triple redundancy)
STATES:      Loading, Empty, Content, Error, Offline, Success, Uncertain
CHARTS:      No pie home. Insights only. Max sparkline on secondary views.
DIALOGS:     Max 85vh / 1 screen. Destructive = explicit label.
DARK MODE:   #0A0A0B base. Not inverted. Elevation = lighter surface.
INBOX:       See § Inbox-first components below + wireframes-inbox.md
```

---

## Inbox-first components (Design delta)

> Bổ sung cho định vị **Universal Financial Inbox**.  
> Chi tiết research: [UX_RESEARCH_AND_REDESIGN.md](./UX_RESEARCH_AND_REDESIGN.md) · wireframe: [wireframes-inbox.md](./wireframes-inbox.md)

### Navigation IA

| Priority | Desktop nav | Mobile tab |
|---|---|---|
| 1 | **Inbox** (badge count) | Inbox |
| 2 | Capture (menu) | Capture |
| 3 | Timeline | Timeline |
| 4 | Accounts | Accounts |
| 5 | Rules, Imports, Insights, Settings | More |

### ConfidenceBadge

| Level | Label (text bắt buộc) | Token gợi ý |
|---|---|---|
| high | Khá chắc | success-subtle |
| medium | Tạm ổn | warning-subtle |
| low | Cần xem | warning/danger-subtle |

Không dùng màu làm kênh duy nhất.

### SourceBadge

Values: `paste` · `csv` · `xlsx` · `pdf` · `manual` · `notification` · `email`  
Style: neutral chip, caption weight, no brand logos of banks.

### CandidateRow

- min-height 52–56px  
- columns: select · date · merchant · money · source · confidence · overflow  
- selected: accent-subtle bg  
- low conf: left border warning 3px  

### BulkActionBar

- appears when selection ≥ 1  
- sticky bottom (mobile) / top of list (desktop)  
- actions: Approve · Reject · Category · Account · More  
- dangerous bulk: confirm if includes low-conf without explicit opt-in  

### ExplainPanel

Always show for low confidence review:

1. Parser id + version  
2. Matched rules  
3. Raw snippet with highlight  
4. User control: edit fields before approve  

### ImportStepper

`Upload → Extract → Normalize → Preview → Inbox`  
Each step: loading / error / success.

### CaptureMenu

Three equal-weight actions (not buried): Paste · Upload · Quick add.

### Rules (anti-patterns)

```
RULE-I1: Home route = Insights/Tổng quan; Inbox is an import-review queue.
RULE-I2: Never auto-post candidates with low confidence.
RULE-I3: Preview required before batch creates >N candidates (N default 1).
RULE-I4: Bulk approve default skips low-conf unless user opts in.
RULE-I5: No pie charts on Inbox or Capture.
RULE-I6: No glassmorphism / heavy gradient on financial surfaces.
RULE-I7: Raw financial text never in toast/analytics payloads.
RULE-I8: Every money change shows direction (+/−/↔) independent of color.
```
