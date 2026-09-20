# MoneyFlow Design System v3 — Tokens & System Specifications (Territory A, B, C)

**Tài liệu nền tảng:** PR #562 / Issue #559  
**Mục tiêu:** Định nghĩa quy chuẩn token có thể ánh xạ trực tiếp vào `document-theme.css`, độc lập với runtime, đảm bảo không có token mồ côi hoặc class không sở hữu.

---

## 1. So sánh Tổng quan Hệ thống Token (Comparative Token Architecture)

| Khía cạnh (Dimension) | Territory A: Kỷ Hà Đương Đại | Territory B: Dòng Chảy Xanh | Territory C: Bản Ghi Bản Lĩnh |
|---|---|---|---|
| **Cảm hứng cốt lõi** | Swiss Modernist Grid / Cấu trúc Kỷ hà tối giản | Modern Tactile Flow / Thiết kế Xúc giác Hiện đại | Editorial Craft / Báo chí Tài chính Chuyên sâu |
| **Bản chất trải nghiệm** | Chính xác tuyệt đối, kỷ luật, số liệu tối thượng | Thân thiện, trực quan, phân tầng thông tin rõ ràng | Trang nhã, sổ cái bọc da, độ tin cậy và lưu trữ cao |
| **Display Font** | `Inter` (Tight `-0.03em`, Bold) | `Plus Jakarta Sans` / `Inter Display` | `Newsreader` / `Lora` (Serif cổ điển sang trọng) |
| **Body Font** | `Inter` (13px–14px, Line-height 1.45) | `Inter` (14px–15px, Line-height 1.55) | `Inter` (14px, Line-height 1.50) |
| **Numeric Font** | `JetBrains Mono` / Tabular lining | `Plus Jakarta Sans` Tabular | `Newsreader` Oldstyle Lining Tabular |
| **Hệ thống Lưới (Grid)** | 8px Modular Grid cứng | 8px / 16px Fluid Rhythm | Báo chí 12 cột, lề rộng |
| **Bo góc (Radii)** | `0px` / `2px` / `4px` (Gần như phẳng) | `12px` / `16px` / `20px` (Bo tròn êm ái) | `4px` / `6px` (Góc trang giấy đóng gáy) |
| **Độ nổi & Bóng (Elevation)** | Không đổ bóng (`0px`), phân tầng bằng viền 1px | Đa tầng bóng mềm môi trường (`0 4px 20px rgba(...)`) | Tối giản bóng (`0 1px 3px rgba(...)`), phân tầng bằng chỉ |
| **Đường viền & Phân cách** | Hairline viền kỹ thuật `1px solid #E2E8F0` | Đường viền trong suốt mềm `1px solid #E2E8F0` | Đường chỉ đơn + **Đường kẻ đôi kế toán** (`3px double`) |
| **Gam màu nền (Canvas)** | Phấn kiến trúc `#F8FAFC` (Dark: `#0A0E17`) | Sương sớm dịu nhẹ `#F0F4F8` (Dark: `#0B132B`) | Giấy ngà cổ điển `#FAF7F2` (Dark: `#191816`) |
| **Gam màu thẻ (Surface)** | Trắng tinh khiết `#FFFFFF` (Dark: `#111827`) | Sứ ngọc trắng `#FFFFFF` (Dark: `#1C2541`) | Giấy bông ép thủ công `#FFFFFF` (Dark: `#23211E`) |
| **Màu chữ chính (Text)** | Hắc ín than đá `#0F172A` (Dark: `#F8FAFC`) | Xanh đen thẫm `#0F172A` (Dark: `#F1F5F9`) | Mực in Espresso `#1C1917` (Dark: `#F5F5F4`) |
| **Màu thương hiệu chính** | Đen phiến đá Slate `#0F172A` | Sky Blue biểu trưng MoneyFlow `#0284C7` | Đồng thau cổ & Đen mực `#1C1917` |
| **Quy chuẩn Tiền tệ (+)** | Xanh ngọc lục bảo `+ 45.000.000 ₫` | Xanh bạc hà dịu `+ 45.000.000 ₫` | Rừng thông trầm `+ 45.000.000 ₫` |
| **Quy chuẩn Tiền tệ (−)** | Đỏ thẫm kỹ thuật `− 15.280.000 ₫` | Hồng san hô ấm `− 15.280.000 ₫` | Đỏ rượu vang đậm `− 15.280.000 ₫` |
| **Quy chuẩn Chuyển ví (↔)**| Xanh Cobalt Indigo `↔ 2.000.000 ₫` | Xanh đại dương `↔ 2.000.000 ₫` | Vàng đồng nung `↔ 2.000.000 ₫` |

---

## 2. Chi tiết Token Territory A: Kỷ Hà Đương Đại (Architectural Precision Ledger)

```css
/* Territory A Tokens */
:root {
  /* Typography */
  --tA-font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --tA-font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  --tA-font-display: var(--tA-font-sans);
  --tA-font-numeric: var(--tA-font-mono);
  
  --tA-tracking-tight: -0.035em;
  --tA-tracking-normal: -0.011em;
  --tA-tracking-mono: -0.02em;

  /* Spacing (8px grid) */
  --tA-space-1: 4px;
  --tA-space-2: 8px;
  --tA-space-3: 12px;
  --tA-space-4: 16px;
  --tA-space-6: 24px;
  --tA-space-8: 32px;
  --tA-space-12: 48px;

  /* Radii */
  --tA-radius-none: 0px;
  --tA-radius-xs: 2px;
  --tA-radius-sm: 4px;
  --tA-radius-md: 4px;
  --tA-radius-lg: 6px;

  /* Surfaces & Canvas */
  --tA-canvas: #f8fafc;
  --tA-surface: #ffffff;
  --tA-surface-subtle: #f1f5f9;
  --tA-surface-inset: #e2e8f0;

  /* Borders */
  --tA-border-hairline: 1px solid #e2e8f0;
  --tA-border-subtle: 1px solid #cbd5e1;
  --tA-border-strong: 1px solid #64748b;
  --tA-border-active: 1px solid #0f172a;

  /* Shadows (Restrained) */
  --tA-shadow-none: none;
  --tA-shadow-flat: 0 1px 0 rgba(15, 23, 42, 0.08);

  /* Colors */
  --tA-text-primary: #0f172a;
  --tA-text-secondary: #475467;
  --tA-text-tertiary: #64748b;
  --tA-text-on-dark: #f8fafc;

  /* Financial Semantics */
  --tA-income: #059669;
  --tA-income-subtle: #ecfdf5;
  --tA-income-border: #a7f3d0;
  --tA-expense: #dc2626;
  --tA-expense-subtle: #fef2f2;
  --tA-expense-border: #fecaca;
  --tA-transfer: #4f46e5;
  --tA-transfer-subtle: #eef2ff;
  --tA-transfer-border: #c7d2fe;
  --tA-warning: #d97706;
  --tA-warning-subtle: #fffbeb;
  --tA-warning-border: #fde68a;

  /* Interactive Controls */
  --tA-target-touch: 44px;
  --tA-target-floor: 24px;
  --tA-focus-ring: 2px solid #0f172a;
}
```

---

## 3. Chi tiết Token Territory B: Dòng Chảy Xanh (Modern Tactile Flow)

```css
/* Territory B Tokens */
:root {
  /* Typography */
  --tB-font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --tB-font-display: "Plus Jakarta Sans", "Inter Display", var(--tB-font-sans);
  --tB-font-numeric: var(--tB-font-display);

  --tB-tracking-tight: -0.02em;
  --tB-tracking-normal: 0em;

  /* Spacing */
  --tB-space-1: 4px;
  --tB-space-2: 8px;
  --tB-space-3: 12px;
  --tB-space-4: 16px;
  --tB-space-5: 20px;
  --tB-space-6: 24px;
  --tB-space-8: 32px;
  --tB-space-10: 40px;

  /* Radii (Tactile curves) */
  --tB-radius-sm: 8px;
  --tB-radius-md: 12px;
  --tB-radius-lg: 16px;
  --tB-radius-xl: 20px;
  --tB-radius-pill: 9999px;

  /* Surfaces & Canvas */
  --tB-canvas: #f0f4f8;
  --tB-surface: #ffffff;
  --tB-surface-muted: #f8fafc;
  --tB-surface-tinted: #e0f2fe;

  /* Ambient Soft Shadows */
  --tB-shadow-sm: 0 1px 3px rgba(14, 165, 233, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  --tB-shadow-md: 0 4px 20px -2px rgba(14, 165, 233, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  --tB-shadow-lg: 0 12px 32px -4px rgba(14, 165, 233, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05);

  /* Brand Colors */
  --tB-brand-primary: #0284c7;
  --tB-brand-hover: #0369a1;
  --tB-brand-light: #e0f2fe;
  --tB-brand-accent: #38bdf8;

  /* Text Roles */
  --tB-text-primary: #0f172a;
  --tB-text-secondary: #475467;
  --tB-text-muted: #64748b;

  /* Financial Semantics (Vivid & Soft) */
  --tB-income: #10b981;
  --tB-income-subtle: #ecfdf5;
  --tB-income-ribbon: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  --tB-expense: #f43f5e;
  --tB-expense-subtle: #fff1f2;
  --tB-expense-ribbon: linear-gradient(90deg, #f43f5e 0%, #fb7185 100%);
  --tB-transfer: #0ea5e9;
  --tB-transfer-subtle: #f0f9ff;
  --tB-warning: #f59e0b;
  --tB-warning-subtle: #fffbeb;

  /* Interactive Controls */
  --tB-target-touch: 44px;
  --tB-target-floor: 24px;
  --tB-focus-ring: 3px solid rgba(14, 165, 233, 0.35);
}
```

---

## 4. Chi tiết Token Territory C: Bản Ghi Bản Lĩnh (Editorial Craft Ledger)

```css
/* Territory C Tokens */
:root {
  /* Typography */
  --tC-font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --tC-font-serif: "Newsreader", "Merriweather", Georgia, "Times New Roman", serif;
  --tC-font-display: var(--tC-font-serif);
  --tC-font-numeric: var(--tC-font-serif);

  --tC-tracking-serif-title: -0.015em;
  --tC-tracking-caps-label: 0.05em;

  /* Spacing */
  --tC-space-1: 4px;
  --tC-space-2: 8px;
  --tC-space-3: 12px;
  --tC-space-4: 16px;
  --tC-space-6: 24px;
  --tC-space-8: 32px;
  --tC-space-12: 48px;

  /* Radii (Gentle Paper Corner) */
  --tC-radius-none: 0px;
  --tC-radius-sm: 4px;
  --tC-radius-md: 6px;
  --tC-radius-lg: 8px;

  /* Surfaces & Canvas */
  --tC-canvas: #faf7f2;
  --tC-surface: #ffffff;
  --tC-surface-subtle: #f5f2eb;
  --tC-surface-ink-card: #1c1917;

  /* Editorial Dividers & Accounting Rules */
  --tC-border-rule: 1px solid #e7e5e4;
  --tC-border-strong: 1px solid #d6d3d1;
  --tC-rule-double: 3px double #a8a29e; /* Classic Accounting Closing Rule */
  --tC-rule-dotted: 1px dotted #d6d3d1;

  /* Shadows (Warm Ink Subtle) */
  --tC-shadow-sm: 0 1px 3px rgba(28, 25, 23, 0.04);
  --tC-shadow-md: 0 4px 12px rgba(28, 25, 23, 0.06);

  /* Colors */
  --tC-text-ink: #1c1917;
  --tC-text-warm-grey: #57534e;
  --tC-text-faint: #78716c;
  --tC-text-on-dark: #fafaf9;

  /* Brand Accents */
  --tC-accent-bronze: #78350f;
  --tC-accent-gold: #b45309;

  /* Financial Semantics (Deep Archival Tones) */
  --tC-income: #15803d;
  --tC-income-subtle: #f0fdf4;
  --tC-expense: #b91c1c;
  --tC-expense-subtle: #fef2f2;
  --tC-transfer: #b45309;
  --tC-transfer-subtle: #fefce8;
  --tC-warning: #c2410c;
  --tC-warning-subtle: #fff7ed;

  /* Interactive Controls */
  --tC-target-touch: 44px;
  --tC-target-floor: 24px;
  --tC-focus-ring: 2px solid #78350f;
}
```

---

## 5. Nguyên tắc Khắc phục Lỗi Lịch sử trong Thiết kế (Preventing Failure Classes)

1. **F1 & F2 (Ownership & Token Resolution):** Toàn bộ token của cả 3 territory đều kế thừa trực tiếp từ cấu trúc namespace `--mf-*` của MoneyFlow. Không sử dụng class inline không có module chủ quản.
2. **F3 (Cascade Defeat):** Toàn bộ CSS trong các prototype đều tuân thủ kiến trúc CSS Module scoping, không bao giờ viết selector unlayered đè bẹp hệ thống component primitives.
3. **F4 (Mode Confusion):** Mọi màn hình minh họa đều lấy bối cảnh **đã xác thực (Authenticated)** với đầy đủ dữ liệu người dùng thật, không dùng màn hình chế độ demo giả lập.
4. **F5 (Touch Target Floor):** Mọi nút điều khiển tương tác trên Mobile đạt tối thiểu 44×44px cho hành động chính và không bao giờ nhỏ hơn 24×24px (ngưỡng sàn WCAG 2.2 AA).
5. **No Color-Only Finance:** Trong cả 3 territory, bất kỳ con số thu chi nào cũng bắt buộc đi kèm tiền tố ký tự (`+`, `−`, `↔`), nhãn chữ danh mục rõ ràng, và icon định danh loại dòng tiền.
