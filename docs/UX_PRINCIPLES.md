# MoneyFlow — UX Principles

> This document defines the UX philosophy, design principles, and interaction patterns for MoneyFlow.
> Every design and implementation decision must be traceable to a principle in this document.
> This is the **law** — not a suggestion.

---

## Table of Contents

1. [Product Philosophy](#1-product-philosophy)
2. [UX Principles](#2-ux-principles)
3. [Navigation Patterns](#3-navigation-patterns)
4. [Dashboard Patterns](#4-dashboard-patterns)
5. [Financial Visualization](#5-financial-visualization)
6. [Forms & Input](#6-forms--input)
7. [Tables & Lists](#7-tables--lists)
8. [Empty States](#8-empty-states)
9. [Loading States](#9-loading-states)
10. [Error States](#10-error-states)
11. [Accessibility](#11-accessibility)
12. [Mobile UX](#12-mobile-ux)
13. [Motion & Animation](#13-motion--animation)
14. [Typography](#14-typography)
15. [Spacing System](#15-spacing-system)
16. [Color System](#16-color-system)
17. [Component Inventory](#17-component-inventory)
18. [Financial UX Rules](#18-financial-ux-rules)
19. [Trust & Transparency](#19-trust--transparency)
20. [Page State Checklist](#20-page-state-checklist)

---

## 1. Product Philosophy

### The Core Question

MoneyFlow exists to answer one question:

> **"Hôm nay mình có thể chi bao nhiêu?"**

Every screen, every interaction, every animation must serve this question — directly or indirectly.

### Design Philosophy

MoneyFlow follows "Calm Finance" — financial tools should reduce anxiety, not amplify it. Inspired by:

- **Stripe's "Inspire Confidence"** — complex data presented with clarity and precision.
- **Linear's "Form Follows Function"** — every element earns its place.
- **Vercel's "Obsess Over Usefulness"** — make complexity available, not required.
- **Monzo's "Make Money Feel Human"** — warm, approachable, never intimidating.

### Who We Design For

- Vietnamese adults managing personal finances for the first time digitally.
- People who find traditional banking apps overwhelming.
- Users who want honest, transparent financial insight — not gamification.

### What the User Needs (Priority Order)

When a user opens MoneyFlow, they need to know — in this order:

1. **Mình có bao nhiêu tiền?** — Total available across all accounts.
2. **Có gì thay đổi?** — What happened since last visit (transactions, budget alerts).
3. **Có gì cần chú ý?** — Overspending, upcoming bills, goal progress.
4. **Mình nên làm gì tiếp?** — Actionable next step (pay a bill, review budget, log expense).

Charts are secondary. **Insights are primary.**

### Three-Second Rule

Every critical action must complete within 3 seconds:
- Log an expense: < 3 seconds
- Check safe-to-spend: < 1 second (visible on launch)
- Check account balance: < 2 seconds
- Pay a recurring bill: < 3 seconds

### Design Principles Summary

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Clarity Over Decoration** | Every pixel must communicate. No decoration without function. |
| 2 | **Calm Over Alarm** | Surface insights gently. Never use fear to drive engagement. |
| 3 | **Action Over Report** | Every data point should suggest a next step. |
| 4 | **Honesty Over Comfort** | Never hide fees, debts, or negative balances. Be transparent. |
| 5 | **Vietnamese First** | All labels, feedback, and guidance in Vietnamese. |
| 6 | **Mobile First** | Design for 375px screens, then scale up. |
| 7 | **Accessible By Default** | Not a checkbox — a design constraint from day one. |
| 8 | **Progressive Disclosure** | Show essentials first, details on demand. |

---

## 2. UX Principles

### Sourced from NN/g, Baymard, and premium product analysis

#### 2.1 Information Hierarchy

- **Primary**: The single most important metric (safe-to-spend) dominates the viewport.
- **Secondary**: Supporting metrics (total balance, monthly budget remaining) are visible but smaller.
- **Tertiary**: Details (transaction list, category breakdown) require a scroll or tap.
- Never present all information at equal weight. Hierarchy reduces cognitive load.

> **NN/g**: "Users spend 80% of their time looking at information above the fold. Place the most important content there."

#### 2.2 Recognition Over Recall

- Use icons + text labels together. Never icons alone (except universally understood: ✕, ←, +).
- Show category names with transactions, don't make users remember codes.
- Persist filter/search state when navigating back.

> **NN/g Heuristic #6**: Minimize user memory load by making objects, actions, and options visible.

#### 2.3 Progressive Disclosure

- Show 5 most recent transactions, not 50.
- Collapse advanced filters behind a "Bộ lọc" button.
- Show summary first, details on tap/click.
- Budget details: show progress bar first, breakdown on expand.

> **Polaris**: "Merchants shouldn't have to understand everything to get started."

#### 2.4 Feedback & Confirmation

- Every action gets immediate visual feedback (optimistic UI).
- Destructive actions (delete transaction, archive account) require explicit confirmation.
- Non-destructive actions (add transaction, edit category) confirm via toast.
- Use undo where possible instead of confirmation dialogs.

> **Linear**: Actions reflected instantly before server confirmation. Reduces perceived latency to zero.

#### 2.5 Consistency

- Same interaction pattern across all pages (add, edit, delete flow identical for transactions, accounts, budgets).
- Same visual treatment for same semantic meaning (red = negative, green = positive — everywhere).
- Same component for same function (all modals use the same dialog component).

> **Apple HIG**: "People learn faster when an app's virtual controls look and behave like the objects they know."

#### 2.6 Error Prevention Over Error Recovery

- Prevent invalid states through input constraints (min/max, type restrictions).
- Disable destructive buttons until conditions are met.
- Validate inline as user types, not on submit.
- Make it hard to accidentally delete — soft-delete first, hard-delete after 30 days.

> **Baymard**: "46% of users abandon forms due to confusing error messages. Prevent errors before they happen."

---

## 3. Navigation Patterns

### Research Synthesis

| Source | Pattern | Notes |
|--------|---------|-------|
| Revolut, Monzo, Nubank | Bottom tab bar (mobile) | 4-5 tabs max |
| Stripe, Linear, Vercel | Collapsible sidebar (desktop) | Icon + text |
| YNAB, Monarch | Sidebar + top breadcrumbs | Deep navigation |
| All premium products | Command palette (Cmd+K) | Universal access |

### MoneyFlow Navigation Rules

#### Mobile (< 768px)
- **Bottom tab bar** with 4-5 primary destinations.
- Tabs: Trang chủ | Giao dịch | Ngân sách | Tài khoản | Thêm
- Active tab: filled icon + label. Inactive: outline icon, no label.
- Tab bar must persist across all primary pages (never hidden).
- "Thêm giao dịch" as prominent FAB or center tab with "+" icon.

#### Desktop (≥ 768px)
- **Collapsible left sidebar** with icon + text labels.
- Sidebar sections: Dashboard, Giao dịch, Ngân sách, Cam kết, Mục tiêu, Tài khoản, Báo cáo.
- Collapsed state: icons only with tooltips.
- Active item: background highlight + accent color indicator.
- User profile/settings at bottom of sidebar.

#### Universal
- **Breadcrumbs** for nested pages (e.g., Tài khoản > Vietcombank > Chi tiết).
- **Back button** always available on detail/edit pages.
- **No hamburger menu** as the primary navigation on any screen size.
- Maximum navigation depth: 3 levels.

---

## 4. Dashboard Patterns

### Research Synthesis

All premium fintech products follow a variation of this hierarchy:

```
┌─────────────────────────────────────────────────┐
│  Hero Metric (the ONE number that matters most) │  ← Immediate answer
├─────────────────────────────────────────────────┤
│  Supporting KPI Cards (2-4 secondary metrics)   │  ← Context
├─────────────────────────────────────────────────┤
│  Alerts / Action Items (what needs attention)   │  ← Urgency
├─────────────────────────────────────────────────┤
│  Trend Visualization (how things are changing)  │  ← Pattern
├─────────────────────────────────────────────────┤
│  Recent Activity (transaction feed)             │  ← Detail
└─────────────────────────────────────────────────┘
```

### MoneyFlow Dashboard Hierarchy

1. **Hero: "Có thể chi hôm nay"** — Largest text on the page. Formatted as currency. Visible without scrolling on any device.
2. **Supporting KPIs**: Tổng số dư | Chi tháng này | Ngân sách còn lại — Displayed as cards in a horizontal scroll (mobile) or row (desktop).
3. **Alerts**: Upcoming bills due, budget overspending, goal milestones — Only shown when relevant. Never show an empty alert section.
4. **Trend**: Simple sparkline or mini bar chart showing spending vs income for the current month.
5. **Recent Transactions**: Last 5 transactions with category icon, description, amount, time.

### Dashboard Rules

- Never show more than **5 KPI cards** on dashboard.
- Every metric must have a **direction indicator** (↑ ↓ →) and comparison period.
- Dashboard must be **fully usable without scrolling** on mobile (hero metric + KPIs visible).
- No widget is more than **2 taps from its detail page**.
- Dashboard auto-refreshes data. Pull-to-refresh on mobile.

---

## 5. Financial Visualization

### When to Use Charts vs. Numbers

| Scenario | Use | Why |
|----------|-----|-----|
| Single current value | Number (formatted) | Charts are noise for single values |
| Trend over time | Line or area chart | Shows direction and momentum |
| Category breakdown | Horizontal bar chart | Easier to read labels than pie charts |
| Budget vs actual | Progress bar | Intuitive visual metaphor |
| Comparing 2 periods | Side-by-side numbers + delta | Simpler than dual-line chart |
| Income vs expense | Stacked or grouped bar | Clear visual comparison |

### Chart Rules

- **Never use pie charts.** Use horizontal bar charts for composition. (NN/g research: pie charts are consistently the worst-performing chart type for comparison.)
- **Never use 3D effects.** They distort data perception.
- **Limit to 5-6 colors** per chart. Use opacity variants for additional series.
- **Always label axes** in Vietnamese.
- **Always show values on hover/tap** (tooltip).
- **Line thickness: 2px.** Thinner is hard to see; thicker obscures data.
- **Use solid vs dashed lines** to differentiate series — don't rely on color alone.

### Number Formatting (Vietnamese locale)

```
Currency:    1.234.567 ₫    (dot as thousand separator, ₫ suffix)
Percentage:  12,5%          (comma as decimal separator)
Delta:       +234.000 ₫ ↑   or   -89.000 ₫ ↓
Large:       1,2 triệu ₫   (abbreviated for dashboard KPIs)
Exact:       1.234.567 ₫    (full precision in tables and detail views)
```

### Color for Financial Data

| Meaning | Color Usage | Notes |
|---------|------------|-------|
| Positive / Income / Growth | Green | Must pass WCAG AA contrast |
| Negative / Expense / Decline | Red | Never rely on color alone — use ↑↓ symbols |
| Neutral / Unchanged | Default text color | No special treatment |
| Warning / Approaching limit | Amber/Orange | Budget at 80%+ |
| Information / Transfer | Blue | Neutral financial movement |

### Sparklines

- Use in KPI cards and table rows to show trend direction.
- No axes, no labels — pure shape.
- Same height as the text line they accompany.
- Color: green for upward trend, red for downward, neutral for flat.

---

## 6. Forms & Input

### Research Synthesis

> **Baymard**: 20% of users abandon forms because of confusing layouts. The most effective forms have:
> single-column layout, top-aligned labels, inline validation, and clear error messages.

> **Material Design 3**: Outlined text fields outperform filled text fields for form completion rates.

> **Polaris**: "Every form should feel like a conversation, not an interrogation."

### Form Rules

1. **Single column layout.** No side-by-side fields on mobile. Two columns max on desktop for related pairs (e.g., start date / end date).
2. **Top-aligned labels.** Never floating/animated labels for financial data entry — they obscure context.
3. **Input masking for currency.** Auto-format as user types: `1234567` → `1.234.567 ₫`.
4. **Inline validation.** Validate on blur (not on every keystroke). Show error immediately below the field.
5. **No placeholder as label.** Placeholders disappear when typing — users lose context.
6. **Required fields are the default.** Mark optional fields, not required ones.
7. **Logical tab order.** Tab moves forward through fields in reading order.
8. **Sticky submit button on mobile.** Primary action visible without scrolling.
9. **Amount field is always the largest input** (visually prominent, larger font).
10. **Category selection: icon grid or searchable dropdown.** Not a raw text input.

### Destructive Actions in Forms

- Delete button is always **red**, always **separated** from primary actions.
- Delete requires a **confirmation dialog** with the item name.
- Archive is preferred over delete where possible. Label: "Lưu trữ" not "Xoá".
- Undo toast appears for 8 seconds after any destructive action.

---

## 7. Tables & Lists

### Research Synthesis

> **Carbon Design System**: Tables must support sorting, filtering, pagination, and responsive reflow.
> **Stripe**: Skeleton rows during loading match final layout. Right-align numbers.
> **NN/g**: "Data tables should be scannable. Users should be able to find a specific row in under 5 seconds."

### Table Rules

1. **Right-align all monetary values.** Left-align text. Center status indicators.
2. **Use monospace font for numbers.** Ensures decimal alignment across rows.
3. **Alternating row backgrounds** or subtle horizontal dividers — not both.
4. **Column headers are sticky** on vertical scroll.
5. **Sortable columns** show sort direction indicator (▲ ▼).
6. **Row click** navigates to detail view. No separate "View" button needed.
7. **Swipe actions on mobile** (swipe left to delete/archive) with visual confirmation.
8. **Maximum 5-6 visible columns on mobile.** Additional data in expandable row or detail sheet.
9. **Pagination**: Show 20 items per page. "Xem thêm" (load more) on mobile, numbered pagination on desktop.
10. **Empty table**: Show [empty state](#8-empty-states), not an empty grid.

### Transaction List (Special Rules)

- Each row shows: Category icon | Description | Account | Amount | Time
- Amount is the **most visually prominent** element in each row.
- Negative amounts show `−` prefix (not parentheses) + red color + ↓ icon.
- Positive amounts show `+` prefix + green color + ↑ icon.
- Group transactions by date with sticky date headers.
- Search filters: date range, category, account, amount range, text search.

---

## 8. Empty States

### Research Synthesis

> **Atlassian Design System**: "Empty states should feel like an invitation, not a dead end."
> **Polaris**: Empty states are the first impression of a feature. They must educate and motivate.
> **Copilot Money, Monarch**: Use friendly illustrations + single clear CTA.

### Empty State Rules

Every empty state must contain exactly three things:

1. **Illustration** — Simple, on-brand, not generic clip art. Conveys the feature's purpose.
2. **Explanation** — One sentence in Vietnamese explaining what this area does.
3. **Primary CTA** — One button to get started.

### Empty State Templates

| Feature | Heading | Body | CTA |
|---------|---------|------|-----|
| Dashboard (new user) | Chào mừng bạn đến MoneyFlow | Thêm tài khoản đầu tiên để bắt đầu theo dõi tài chính. | Thêm tài khoản |
| Transactions | Chưa có giao dịch nào | Ghi lại thu chi hàng ngày để biết tiền đi đâu. | Thêm giao dịch |
| Budgets | Chưa có ngân sách | Đặt ngân sách cho từng hạng mục để kiểm soát chi tiêu. | Tạo ngân sách |
| Accounts | Chưa có tài khoản | Thêm tài khoản ngân hàng, ví điện tử, hoặc tiền mặt. | Thêm tài khoản |
| Goals | Chưa có mục tiêu | Đặt mục tiêu tiết kiệm để tích luỹ từng ngày. | Tạo mục tiêu |
| Reports | Chưa đủ dữ liệu | Cần ít nhất 7 ngày giao dịch để tạo báo cáo. | Xem giao dịch |
| Search (no results) | Không tìm thấy | Thử thay đổi bộ lọc hoặc từ khoá. | Xoá bộ lọc |

### Rules

- Never show a blank page or an empty table grid.
- Empty states in cards/widgets: use compact version (icon + one-line text + link).
- First-time user experience (FTUE) empty state is different from "deleted all data" empty state.

---

## 9. Loading States

### Research Synthesis

> **Stripe**: Skeleton screens for content loads. Spinners for short blocking actions. 200-300ms delay before showing indicators.
> **Linear**: Optimistic UI — actions reflected instantly, server confirms later.
> **NN/g**: "Users perceive skeleton screens as 30% faster than spinner-only loading."

### Loading State Rules

1. **Skeleton screens** for page/section content loading. Match the exact layout of the final content.
2. **Shimmer animation** on skeleton elements (left-to-right sweep, not pulse).
3. **200ms delay** before showing any loading indicator. If content arrives in < 200ms, show nothing.
4. **Optimistic UI** for mutations:
   - Add transaction → appears immediately in list.
   - Edit amount → updates immediately in all views.
   - Delete → removed immediately, undo toast appears.
   - Server failure → revert with error toast.
5. **Never use full-page spinners.** They make the app feel broken.
6. **Progress indicators** for long operations (CSV export, data sync): show percentage or step count.
7. **Skeleton rows in tables** must match column widths and row heights.
8. **Pull-to-refresh on mobile** — haptic feedback + activity indicator.

### Loading Hierarchy

| Duration | Treatment |
|----------|-----------|
| < 200ms | No indicator (instant) |
| 200ms – 2s | Skeleton screen or subtle spinner |
| 2s – 10s | Skeleton + "Đang tải..." text |
| > 10s | Progress bar + estimated time |
| Failed | Error state with retry button |

---

## 10. Error States

### Research Synthesis

> **NN/g**: "Error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution."
> **Baymard**: "Don't blame the user. Don't use technical jargon. Don't use ALL CAPS."
> **Material Design 3**: Errors use inline placement, red semantic color, and helper text.

### Error Message Rules

1. **In Vietnamese.** Never show English error messages or technical codes to users.
2. **Specific, not generic.** "Số tiền phải lớn hơn 0 ₫" not "Giá trị không hợp lệ".
3. **Constructive.** Tell users what to do, not just what went wrong.
4. **Positioned at the source.** Inline below the field, not in a banner at the top.
5. **Red color + error icon.** But never rely on color alone.
6. **Persist until fixed.** Don't auto-dismiss field errors.

### Error Types and Treatments

| Type | Treatment | Example |
|------|-----------|---------|
| **Field validation** | Inline below field, red text | "Vui lòng nhập số tiền" |
| **Form submission** | Summary at top + inline per field | "Có 2 lỗi cần sửa" |
| **Network error** | Banner + retry button | "Mất kết nối. Thử lại?" |
| **Server error** | Toast + auto-retry (3x) | "Đang thử kết nối lại..." |
| **Permission error** | Full page with explanation | "Bạn cần đăng nhập để xem" |
| **Not found** | Full page with navigation | "Trang không tồn tại" |
| **Offline** | Persistent banner + offline mode | "Ngoại tuyến — dữ liệu có thể chưa cập nhật" |

### Offline Behavior

- Show cached data with "offline" indicator.
- Allow creating transactions offline (queue for sync).
- Disable features that require server (reports, account sync).
- Show persistent subtle banner, not blocking modal.

---

## 11. Accessibility

### Research Synthesis

> **Apple HIG**: "Accessibility is not a feature — it's a right."
> **WCAG 2.1 AA**: The minimum standard for any financial application.
> **GitHub Primer**: Token-based color system designed for WCAG compliance across light, dark, and high-contrast themes.

### Accessibility Requirements

#### Visual
- **Color contrast**: Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA).
- **Never rely on color alone** to convey information (use icons, patterns, text labels).
- **Focus indicators**: Visible 2px outline on all interactive elements.
- **Font size**: Minimum 14px (body text), respects user's browser font size settings.
- **Reduce motion**: Honor `prefers-reduced-motion` — disable all animations.
- **Dark mode**: Full support, not just inverted colors.

#### Interactive
- **Touch targets**: Minimum 44×44px (Apple HIG) / 48×48px (Material Design).
- **Keyboard navigation**: Every action achievable via keyboard alone.
- **Tab order**: Logical, follows visual layout.
- **Focus trapping**: Modals trap focus. Escape closes modals.
- **Skip links**: "Chuyển đến nội dung chính" link at top of every page.

#### Semantic
- **ARIA labels** on all interactive elements without visible text.
- **Live regions** for dynamic content (toast notifications, balance updates).
- **Heading hierarchy**: One `<h1>` per page, no skipped levels.
- **Semantic HTML**: `<nav>`, `<main>`, `<aside>`, `<section>`, `<article>`.
- **Form labels**: Every input has an associated `<label>` element.

#### Financial Accessibility
- **Screen reader announces currency values** as "một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng" not "1.234.567 ₫".
- **Negative values announced clearly**: "âm 89.000 đồng" with direction indicator.
- **Chart data available as table** alternative for screen readers.

---

## 12. Mobile UX

### Research Synthesis

> **Revolut, Monzo, Nubank**: Mobile-first design. Bottom navigation. Pull-to-refresh. Gesture-based interactions.
> **Material Design 3**: Thumb zone design. Bottom sheets over modals. FAB for primary action.
> **Apple HIG**: Safe area insets. Dynamic Type support. Haptic feedback.

### Mobile Rules

#### Layout
- **Design for 375px width first** (iPhone SE), then scale up.
- **Safe areas**: Respect notch, home indicator, status bar.
- **One primary action per screen.** If two actions compete, one goes in overflow menu.
- **Content width**: Max 600px on tablet. Never stretch full-width on large screens.
- **Cards stack vertically.** No side-by-side cards on mobile.

#### Interaction
- **Thumb zone design**: Primary actions in bottom 1/3 of screen.
- **Bottom sheets** instead of full-screen modals for quick actions.
- **Swipe gestures**: Swipe left on transaction row for quick actions (edit, delete).
- **Pull-to-refresh**: With haptic feedback on trigger.
- **Long press**: For contextual menu on items.
- **No hover states on mobile.** All information must be accessible via tap.

#### Input
- **Numeric keypad** for amount inputs (`inputmode="decimal"`).
- **Date picker**: Native mobile date picker, not custom calendar.
- **Category picker**: Scrollable icon grid (2 rows visible, scroll for more).
- **Auto-focus first field** when form opens.

#### Performance
- **First Contentful Paint**: < 1.5s on 4G.
- **Interaction to Next Paint (INP)**: < 200ms.
- **No layout shift** during loading (CLS < 0.1).
- **Minimal bundle size**: Lazy-load non-critical features.

---

## 13. Motion & Animation

### Research Synthesis

> **Linear**: Physics-based spring animations. Sub-100ms interaction latency target. Motion clarifies spatial relationships.
> **Vercel**: "Purposeful, not decorative. Animations clarify structure, state, or brand intent."
> **Apple HIG**: Motion should be meaningful, responsive, and continuous.
> **Material Design 3**: Easing curves define personality. Enter: decelerate. Exit: accelerate.

### Motion Rules

1. **Every animation must have a purpose.** Valid purposes: spatial orientation, state change feedback, drawing attention to change, reducing perceived latency.
2. **No decorative animations.** No bouncing logos, no gratuitous particles, no novelty effects.
3. **Duration scale**:

| Type | Duration | Easing |
|------|----------|--------|
| Micro-interaction (button press, toggle) | 100-150ms | ease-out |
| State change (expand, collapse) | 200-300ms | ease-in-out |
| Page transition | 200-350ms | ease-out |
| Modal enter | 250ms | ease-out (decelerate) |
| Modal exit | 200ms | ease-in (accelerate) |
| Toast enter | 300ms | spring(1, 80, 10) |
| Toast exit | 200ms | ease-in |

4. **Respect `prefers-reduced-motion`**: Replace all motion with instant state changes.
5. **Spring physics** for draggable elements and gesture-based interactions (use spring damping, not linear easing).
6. **Optimistic UI transitions**: New items in lists animate in (fade + slide). Deleted items animate out (fade + collapse).
7. **Skeleton shimmer**: Left-to-right gradient sweep, 1.5s duration, infinite loop.
8. **No simultaneous animations.** Max 2 elements animating at once in the same viewport.

---

## 14. Typography

### Research Synthesis

> **Stripe**: Inter (sans-serif) for UI, SF Mono for data/code.
> **Vercel**: Geist Sans + Geist Mono — Swiss-inspired, developer-focused.
> **Linear**: Custom Linear Display — measured tracking, high readability.
> **All premium products**: Monospace for financial data ensures decimal alignment.

### MoneyFlow Typography System

#### Font Stack

- **Primary (UI)**: `Inter` — Clean, highly legible, extensive Vietnamese character support.
- **Mono (Numbers)**: `JetBrains Mono` or `Geist Mono` — For all monetary values, data tables, and numeric displays.
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

#### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-lg` | 36px / 2.25rem | 700 | 1.2 | Hero metric (safe-to-spend) |
| `display-sm` | 28px / 1.75rem | 600 | 1.25 | Page titles |
| `heading-lg` | 22px / 1.375rem | 600 | 1.3 | Section headings |
| `heading-sm` | 18px / 1.125rem | 600 | 1.35 | Card titles |
| `body-lg` | 16px / 1rem | 400 | 1.5 | Primary body text |
| `body-sm` | 14px / 0.875rem | 400 | 1.5 | Secondary text, descriptions |
| `caption` | 12px / 0.75rem | 400 | 1.4 | Timestamps, labels, meta |
| `mono-lg` | 20px / 1.25rem | 500 | 1.3 | Large monetary values |
| `mono-md` | 16px / 1rem | 500 | 1.4 | Table monetary values |
| `mono-sm` | 14px / 0.875rem | 400 | 1.4 | Small monetary values |

#### Typography Rules

1. **Maximum 2 font families** in the entire application (Inter + Mono).
2. **All monetary values use monospace font.** No exceptions.
3. **Maximum 3 font sizes per screen** to maintain hierarchy.
4. **Minimum font size: 12px** (caption only). Body text never below 14px.
5. **Vietnamese diacritics must render correctly** at all sizes. Test with: "Tiền gửi ngân hàng — ₫".
6. **Number formatting**: Use tabular (monospace) figures for aligned columns.
7. **Line length**: 50-75 characters for readable paragraphs. Max width for text blocks.
8. **Letter spacing**: 0 for body text. Slight positive tracking (+0.01em) for ALL CAPS labels.

---

## 15. Spacing System

### Research Synthesis

> **Material Design 3**: 4px base grid. Components sized in 8px increments.
> **Carbon Design System**: 8px grid. Spacing tokens: $spacing-01 (2px) through $spacing-13 (128px).
> **Atlassian Design System**: 8px grid with 4px half-step for fine adjustments.

### MoneyFlow Spacing Scale

Base unit: **4px**. All spacing values are multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon-to-text gap, tight inline spacing |
| `space-2` | 8px | Related element spacing, input padding (vertical) |
| `space-3` | 12px | List item padding, form field gap |
| `space-4` | 16px | Card padding, section gap (mobile) |
| `space-5` | 20px | Card padding (desktop) |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Section margin, page padding (mobile) |
| `space-10` | 40px | Large section gap |
| `space-12` | 48px | Page padding (desktop), major section separator |
| `space-16` | 64px | Page margin (desktop), layout gutter |

### Spacing Rules

1. **Consistent internal padding**: Cards use `space-4` (mobile) / `space-5` (desktop).
2. **Consistent gap between cards**: `space-3` (mobile) / `space-4` (desktop).
3. **Page padding**: `space-4` (mobile) / `space-8` (desktop).
4. **Form field vertical gap**: `space-3` (12px).
5. **Touch target spacing**: Minimum `space-2` (8px) between adjacent touch targets.
6. **Density modes** (future): Compact uses one step smaller, Comfortable uses one step larger.

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small elements (chips, badges) |
| `radius-md` | 8px | Buttons, inputs, small cards |
| `radius-lg` | 12px | Cards, modals, sheets |
| `radius-xl` | 16px | Large cards, bottom sheets |
| `radius-full` | 9999px | Avatars, circular buttons, pills |

---

## 16. Color System

### Research Synthesis

> **Stripe**: Neutral-heavy. Signature blue (#635BFF) used sparingly for primary actions only.
> **Linear**: Near-black surface (#010102). Lavender-blue (#5e6ad2) as single accent.
> **Vercel**: High-contrast, functional color. WCAG-compliant.
> **Monzo**: Warm coral as brand. Friendly, not corporate.
> **All premium products**: Maximum 1 brand accent color. Rest is neutrals + semantic colors.

### Color Philosophy

MoneyFlow uses a **neutral-first, accent-spare** color system. Color is never decorative — it always communicates meaning.

### Semantic Color Tokens

Colors are defined as **semantic tokens**, not raw values. This enables dark mode and theme consistency.

#### Neutral Scale (Light mode reference)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg-primary` | #FFFFFF | #0A0A0B | Page background |
| `bg-secondary` | #F8F9FA | #141416 | Card background, sidebar |
| `bg-tertiary` | #F1F3F5 | #1E1F23 | Hover, active states |
| `border-default` | #E2E4E8 | #2A2B30 | Card borders, dividers |
| `border-strong` | #CED1D6 | #3A3B42 | Input borders, table borders |
| `text-primary` | #111218 | #EDEDED | Primary text |
| `text-secondary` | #555B66 | #A0A0A8 | Secondary text, labels |
| `text-tertiary` | #8B919E | #6B6B76 | Captions, timestamps, placeholders |

#### Brand / Accent

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | #3B82F6 (Blue-500) | Primary buttons, active states, links |
| `accent-hover` | #2563EB (Blue-600) | Button hover |
| `accent-subtle` | #EFF6FF (Blue-50) | Badge backgrounds, highlights |

One accent color only. Blue communicates trust, stability, and reliability — critical for financial apps.

#### Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `success` | #16A34A | #22C55E | Income, positive change, completed |
| `success-subtle` | #F0FDF4 | #052E16 | Success badge background |
| `danger` | #DC2626 | #EF4444 | Expense, negative change, errors, delete |
| `danger-subtle` | #FEF2F2 | #450A0A | Error badge background |
| `warning` | #D97706 | #F59E0B | Budget warning (80%+), approaching limits |
| `warning-subtle` | #FFFBEB | #451A03 | Warning badge background |
| `info` | #2563EB | #60A5FA | Informational, transfers, neutral actions |
| `info-subtle` | #EFF6FF | #1E3A5F | Info badge background |

### Color Rules

1. **Neutral dominates.** 80%+ of any screen should be neutral colors.
2. **One accent color only.** Blue. Used for: primary buttons, active nav items, links.
3. **Semantic colors are functional.** Green = positive money. Red = negative money. Never decorative.
4. **Never combine red + green** as the only differentiator. Always pair with ↑↓ icons and +/- signs.
5. **Dark mode is not inverted light mode.** Carefully calibrated contrast levels. Deep grays (#0A0A0B), never pure black (#000).
6. **Elevation in dark mode**: Lighter surfaces are "higher." `bg-primary` (darkest) → `bg-secondary` → `bg-tertiary` (lightest).
7. **All color pairs must pass WCAG AA** (4.5:1 for text, 3:1 for large text/icons).

---

## 17. Component Inventory

### Core Layout
- [ ] App Shell (sidebar + main content area)
- [ ] Collapsible/resizable sidebar
- [ ] Bottom tab bar (mobile)
- [ ] Top bar (breadcrumbs, user menu, search)
- [ ] Page header (title, description, actions)
- [ ] Page skeleton (loading version of any page)

### Data Display
- [ ] KPI Card (metric, label, delta, sparkline)
- [ ] Data Table (sortable, filterable, paginated, skeleton rows)
- [ ] Transaction Row (icon, description, account, amount, time)
- [ ] Transaction List (grouped by date with sticky headers)
- [ ] Line Chart (time-series trends)
- [ ] Bar Chart (categorical comparisons, horizontal)
- [ ] Area Chart (spending/income over time)
- [ ] Progress Bar (budget usage)
- [ ] Sparkline (inline trend)
- [ ] Stat/Delta Indicator (↑↓ with color + number)

### Feedback & Status
- [ ] Toast Notification (success, info, warning, error; auto-dismiss)
- [ ] Inline Error Message
- [ ] Banner Alert (page-level, dismissable)
- [ ] Skeleton Screen (page, card, table row variants)
- [ ] Empty State (illustration + text + CTA)
- [ ] Error Page (404, 500, offline)
- [ ] Offline Banner (persistent, subtle)

### Input & Controls
- [ ] Button (primary, secondary, ghost, destructive; sizes: sm, md, lg)
- [ ] Input Field (text, with label, helper text, error state)
- [ ] Currency Input (auto-formatted, ₫ suffix, monospace)
- [ ] Select / Dropdown
- [ ] Date Picker (single, range)
- [ ] Filter Chip / Tag (active/inactive, removable)
- [ ] Toggle / Switch (with label)
- [ ] Checkbox & Radio
- [ ] Search Input (with clear button, debounced)
- [ ] Category Picker (icon grid)

### Navigation
- [ ] Sidebar Nav Item (icon + text, active state, badge/count)
- [ ] Bottom Tab Item (icon, label, active/inactive)
- [ ] Breadcrumbs
- [ ] Tabs (horizontal, for section switching)
- [ ] Pagination (numbered for desktop, "load more" for mobile)

### Overlay & Modal
- [ ] Dialog (confirmation, form; max one screen height)
- [ ] Bottom Sheet (mobile quick actions)
- [ ] Dropdown Menu
- [ ] Tooltip
- [ ] Popover
- [ ] Command Palette (Cmd+K, future feature)

### Theming
- [ ] Light/Dark mode toggle
- [ ] Design token system (CSS custom properties)
- [ ] Responsive breakpoints

---

## 18. Financial UX Rules

These rules are **non-negotiable** for any financial application.

### Money Display

```
✅ Money must always be easier to scan than labels.
✅ Use monospace font for all monetary values.
✅ Negative numbers must never rely on color alone.
   Use: color + ↓ icon + − sign (triple redundancy).
✅ Every financial change must indicate direction: ↑ ↓ →
✅ Never truncate monetary values in detail views.
   Dashboard KPIs may abbreviate: "1,2tr ₫"
   Tables and detail pages show exact: "1.234.567 ₫"
✅ Never hide fees.
✅ Currency symbol always visible alongside amount.
✅ Right-align monetary columns in tables.
```

### Transaction Rules

```
✅ Every transaction shows: amount, category, account, date, note.
✅ Expense and income are visually distinct (not just sign difference).
✅ Transfer between accounts shows both source and destination.
✅ Editing a transaction shows before/after comparison.
✅ Deleting is soft-delete with 30-day recovery.
```

### Budget Rules

```
✅ Budget progress uses visual bar, not just numbers.
✅ Green (< 50%) → Yellow (50-80%) → Orange (80-99%) → Red (100%+).
✅ Overspending shows exact overspent amount, not just "over budget".
✅ Budget period always visible (this month, this week).
```

### Dashboard Rules

```
✅ Never overwhelm users with numbers.
✅ Every dashboard answers:
   1. How much money do I have?
   2. What changed?
   3. What requires my attention?
   4. What should I do next?
✅ Maximum 5 KPI cards.
✅ Maximum 2 primary actions per page.
✅ Primary action always visible without scrolling.
```

---

## 19. Trust & Transparency

> A financial app that doesn't feel trustworthy won't be used — no matter how beautiful it is.

### Trust Signals

1. **Precision**: Never round monetary values in detail views. `1.234.567 ₫` not `~1,2tr ₫`.
2. **Timeliness**: Show "Cập nhật lúc 14:30" timestamps on data that might be stale.
3. **Consistency**: Same number displayed the same way everywhere. If total is `5.000.000 ₫` on dashboard, it's `5.000.000 ₫` in account detail.
4. **Auditability**: Every transaction can be traced. Edit history visible.
5. **Reversibility**: Undo/archive over delete. Recovery possible.
6. **Explainability**: "Có thể chi hôm nay" shows tooltip/breakdown explaining the calculation.
7. **No dark patterns**: Never auto-enable notifications. Never hide unsubscribe. Never gamify spending.
8. **Data ownership**: User can export all data (CSV). Data deletion is available and permanent.

### Security Perception

- Show padlock icon on sign-in pages.
- Auto-lock after 5 minutes of inactivity (configurable).
- Blur financial data when app enters background (mobile).
- "Ẩn số dư" toggle to replace amounts with `•••••` in public settings.
- Biometric unlock support (future, mobile native).

---

## 20. Page State Checklist

> **Every page in MoneyFlow must implement ALL of these states before release.**

```
┌─────────────────┐
│   Loading        │  Skeleton screen matching final layout
├─────────────────┤
│   Empty           │  Illustration + explanation + CTA
├─────────────────┤
│   Content         │  The normal, data-filled state
├─────────────────┤
│   Error            │  Specific message + recovery action
├─────────────────┤
│   Offline          │  Cached data + offline indicator
├─────────────────┤
│   Success          │  Confirmation toast / visual feedback
└─────────────────┘
```

### Pre-Release Checklist Per Page

- [ ] Loading state implemented (skeleton screens)
- [ ] Empty state implemented (not blank page)
- [ ] Error state implemented (user-friendly Vietnamese message)
- [ ] Offline state handled (cached data or graceful degradation)
- [ ] Success feedback for all actions (toast or inline)
- [ ] Responsive: tested at 375px, 768px, 1024px, 1440px
- [ ] Keyboard navigable (tab order, focus indicators)
- [ ] Screen reader tested (VoiceOver or NVDA)
- [ ] Vietnamese text reviewed for clarity
- [ ] Dark mode tested
- [ ] `prefers-reduced-motion` honored
- [ ] Touch targets ≥ 44×44px (mobile)
- [ ] No modal taller than one screen
- [ ] Maximum 2 primary actions per page
- [ ] Financial values use monospace font
- [ ] Monetary values never truncated in detail views

---

## Appendix A: Source References

### Design Systems Studied
- Apple Human Interface Guidelines — platform principles, accessibility, typography, motion
- Google Material Design 3 — color system, elevation, adaptive layouts, component specs
- IBM Carbon Design System — data visualization, forms, tables, loading/empty/error patterns
- Atlassian Design System — spacing, empty states, progressive disclosure
- Shopify Polaris — merchant-facing financial UX, forms, data display

### UX Research
- Nielsen Norman Group (NN/g) — dashboard design, form UX, information hierarchy, cognitive load
- Baymard Institute — form usability, input validation, error prevention

### Fintech Product Analysis
- Revolut — mobile navigation, account switching, real-time balance
- Monzo — warm fintech design, spending categories, social payments
- Wise — clarity in fee display, transparent exchange rates
- Nubank — mobile-first, empty states, onboarding
- Rocket Money — subscription tracking, bill negotiation UX
- Copilot Money — premium feel, dark mode, chart design
- Monarch Money — dashboard layout, goal tracking, net worth
- YNAB — zero-based budgeting UX, education-first approach

### Dashboard / SaaS Analysis
- Stripe Dashboard — data density, skeleton loading, controlled density
- Linear — keyboard-first, optimistic UI, spring animations, minimalism
- Vercel — Geist typography, command palette, purposeful motion
- GitHub (Primer) — token-based theming, accessibility-first, multi-theme support

---

## Appendix B: Quick Reference Card

For daily reference during implementation:

```
FONTS:       Inter (UI) + JetBrains Mono / Geist Mono (numbers)
ACCENT:      #3B82F6 (Blue-500) — one color only
SPACING:     4px base, 8px standard, 16px cards, 32px sections
RADIUS:      4px chips, 8px buttons, 12px cards, 16px sheets
MOTION:      100-150ms micro, 200-300ms state, ease-out enter, ease-in exit
MIN TOUCH:   44×44px
MIN FONT:    14px body, 12px caption
CONTRAST:    4.5:1 text, 3:1 large text
COLUMNS:     1 on mobile, 2-3 on desktop
NAV:         Bottom tabs (mobile), Sidebar (desktop)
MONEY FONT:  Always monospace
NEGATIVE:    Red + ↓ icon + − sign (triple redundancy)
STATES:      Loading, Empty, Content, Error, Offline, Success
```
