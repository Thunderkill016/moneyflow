# #559 — MoneyFlow web redesign foundation

**Status:** candidate research and foundation specification only
**Execution state:** candidate specification (blocked from executable selection while #557 is active)
**Active role:** researcher / product designer / planner
**Permission scope:** branch documentation/research only; no runtime/UI implementation in this slice
**Owner:** human owner
**Issue:** #559
**PR:** #560
**Branch:** `design/559-web-redesign-foundation`
**Base:** `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`

## Outcome

Create the evidence, architecture, and design specifications required to redesign the full MoneyFlow web experience without repeating the product's prior UI/CSS/test failures.

This slice is **candidate foundation research and specification only**. It does **not** claim or select active executable plan authority while #557 Turnstile load recovery remains active, and it does **not** redesign runtime screens. It establishes:

1. historical design failure postmortem;
2. current presentation/route authority inventory;
3. focused external web-design/accessibility/finance-workflow research;
4. target product experience architecture and information architecture;
5. Design System v3 contract and machine-verifiable guardrails;
6. migration/validation workflow for later bounded UI slices.

## Why this slice exists

MoneyFlow has already paid the cost of UI work that looked complete in source or screenshots while failing at runtime. PR #337 proved product code could emit classes with no active stylesheet owner while existing CSS gates stayed green, and `/onboarding` shipped effectively unstyled. It also surfaced semantic Tailwind theme utilities that existed in component source but generated no corresponding production CSS.

A full redesign therefore cannot begin with screens, colors or component rewrites. The authority chain must be established first:

```text
product/brand semantics
  -> design tokens
  -> primitives
  -> patterns
  -> route composition
  -> production CSS
  -> computed browser styles
  -> interaction behavior
```

### Authority and Candidate Status

This packet is candidate foundation research and design specification only. It is explicitly blocked from holding executable authority in `docs/plans/PLAN_AUTHORITY.json` while #557 (Turnstile load recovery) remains active. It will seek formal authority selection only after #557 completes to null, via a dedicated selection PR branched from fresh `main`.

## Product constraints

From current product law and project memory:

- MoneyFlow is a Vietnamese personal-finance product built on one trustworthy user-owned ledger.
- The currently shipped product is manual/import-assisted; redesign copy or affordances must not imply unshipped provider sync/native acquisition.
- Financial truth, ownership/recoverability and maintenance reduction outrank visual novelty.
- Mobile usability is a release gate.
- Advanced capability is progressively disclosed.
- Financial meaning must not rely on color alone.
- Demo and authenticated modes are distinct runtime truths.

---

## Repository reconnaissance

### 1. Historical failure postmortem — mandatory findings to verify

The postmortem must inspect merged history and affected code/tests, not only PR summaries.

| Failure class | Known symptom | Required prevention |
|---|---|---|
| presentation ownership gap | code emitted classes with no active CSS owner; onboarding shipped effectively unstyled | code→CSS ownership gate; debt shrink-only; component ownership graph |
| token/runtime mismatch | semantic utilities emitted in JSX but missing from production bundle | token→build→generated CSS→computed style proof |
| cascade conflict | global/unlayered rules can defeat primitive intent | cascade-layer authority + primitive consumer blast-radius tests |
| runtime-mode false green | browser suites can prove demo while claiming authenticated behavior | explicit demo/auth test contracts and environment assertions |
| screenshot false confidence | a frame can look correct while first-paint/persistence interaction is wrong | first-attempt interaction assertions; retry-pass treated as finding |
| legacy accumulation | migration can add another compatibility/global layer rather than retire old ownership | replace-and-retire within each vertical slice; no new root override layer |
| authority conflict | brand/design/docs/runtime can each imply different tokens/identity | one canonical brand/token authority before migration |
| first-paint geometry shift | AppShell layout shifted between SSR and client hydration | explicit fixed geometry for critical shells; zero layout thrashing |
| sync/async ledger divergence | demo mode sync mutation diverged from authenticated async RPC | unified ledger client interface and strict mode verification |
| mobile action hijacking | route-level actions obscured fixed bottom navigation or primary FAB | reserved bottom-bar thumb zone and strict z-index layering |

Deliverable: `docs/research/DESIGN_FAILURE_POSTMORTEM_2026.md` with `symptom -> root cause -> why missed -> cost -> repair -> permanent prevention`.

### 2. Current-product inventory

#### A. Route Inventory (40 application page routes + 5 API handlers + 3 metadata routes across 7 functional domains)

Audited directly from `src/app`:

| Domain | Routes (`page.tsx`) | API & Metadata Endpoints | Primary User Job | Current Presentation Owner |
|---|---|---|---|---|
| **1. Core Ledger** | `/` (root), `/dashboard`, `/transactions`, `/timeline`, `/insights` (redirects to `/dashboard`) | — | Xem số dư tức thời, dòng tiền vào/ra, dòng thời gian và nhật ký giao dịch | `dashboard.module.css`, `statement.module.css`, `transactions-workspace.module.css`, `timeline-page.module.css` |
| **2. Capture & Ingestion** | `/capture`, `/capture/quick`, `/capture/paste`, `/capture/share`, `/capture/upload`, `/imports`, `/imports/direct`, `/imports/[batchId]/preview`, `/inbox`, `/rules` | `/api/share-target` | Thu nhận giao dịch thủ công/hàng loạt, dán văn bản sao kê, nhập file sao kê (CSV/Excel hỗ trợ hợp đồng xuất ngân hàng theo MON-62), duyệt hộp thư chờ và luật phân loại | `capture-quick-page.module.css`, `inbox-page.module.css`, `imports-page.module.css`, `rules-page.module.css` |
| **3. Accounts & Reconciliation** | `/accounts`, `/accounts/[accountId]`, `/accounts/[accountId]/reconcile` | — | Quản lý ví/ngân hàng, theo dõi số dư riêng lẻ theo chuẩn VND, đối soát sổ với sao kê thực tế | `accounts-workspace.module.css`, `account-detail-page.module.css`, `account-reconciliation-page.module.css` |
| **4. Planning** | `/budgets`, `/commitments`, `/income-templates`, `/goals` | — | Đặt hạn mức chi tiêu, cố định hóa đơn định kỳ, dự kiến mẫu thu nhập, tích lũy mục tiêu tài chính | `budgets-page.tsx`, `planning-workspace.module.css`, `planning-card.module.css`, `income-templates-page.module.css` |
| **5. Reports & Analytics** | `/reports` | `/reports/export` | Báo cáo cơ cấu chi tiêu, xu hướng dòng tiền theo thời gian, trích xuất dữ liệu báo cáo | `reports-page.module.css` |
| **6. Settings & Governance** | `/categories`, `/settings`, `/settings/appearance`, `/settings/backup`, `/settings/delete-account`, `/settings/export`, `/settings/notifications`, `/settings/privacy`, `/account-deletion-result` | `/api/client-error` | Quản lý danh mục, tùy chọn sáng/tối, sao lưu cục bộ, xuất toàn bộ dữ liệu CSV/JSON, xóa tài khoản và nhật ký lỗi | `categories-page.module.css`, `settings-surfaces.module.css`, `appearance-settings-page.module.css` |
| **7. Public & Authentication** | `/landing`, `/login`, `/register`, `/forgot-password`, `/update-password`, `/onboarding`, `/privacy`, `/security` | `/auth/callback`, `/api/health`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `not-found.tsx` | Giới thiệu sản phẩm, xác thực người dùng an toàn với Turnstile, hướng dẫn thiết lập ban đầu, chính sách bảo mật | `landing-page.module.css`, `public-brand-theme.module.css`, `auth-form.module.css`, `onboarding-flow.module.css` |

*Phân loại 40 tuyến trang ứng dụng (`page.tsx`):*
- **29 trang không gian sản phẩm đã xác thực (Authenticated Product):** `/` (khi đã đăng nhập), `/dashboard`, `/transactions`, `/timeline`, `/capture`, `/capture/quick`, `/capture/paste`, `/capture/share`, `/capture/upload`, `/imports`, `/imports/direct`, `/imports/[batchId]/preview`, `/inbox`, `/rules`, `/accounts`, `/accounts/[accountId]`, `/accounts/[accountId]/reconcile`, `/budgets`, `/commitments`, `/income-templates`, `/goals`, `/reports`, `/categories`, `/settings`, `/settings/appearance`, `/settings/backup`, `/settings/delete-account`, `/settings/export`, `/settings/notifications`, `/settings/privacy`.
- **7 trang công khai và xác thực (Public & Auth):** `/landing`, `/login`, `/register`, `/forgot-password`, `/update-password`, `/privacy`, `/security`.
- **1 trang thiết lập ban đầu (Setup / Onboarding):** `/onboarding`.
- **1 trang điều hướng tương thích (Compatibility Redirect):** `/insights` (redirect 307 về `/dashboard`).
- **1 trang kết quả hệ thống (System Result):** `/account-deletion-result`.
- **Endpoints bổ trợ:** 5 API route handlers (`route.ts`), 3 metadata route handlers (`manifest.ts`, `robots.ts`, `sitemap.ts`), và 1 root not-found handler (`not-found.tsx`).

#### B. Presentation Authority Inventory

- **Stylesheets Inventory (49 files across `src`):**
  - 8 stylesheets in `src/app`:
    - `document-theme.css` (Canonical design tokens: canvas, surface, text, brand, semantic status, radii, transitions).
    - `globals.css` (Tailwind base layer, root styling, font definitions).
    - `legacy.css` (Compatibility layer that imports `./globals.css`; bounded rule budget).
    - 5 route/theme modules: `public-brand-theme.module.css`, `landing-page.module.css`, `auth-form.module.css`, `onboarding-flow.module.css`, `statement.module.css`.
  - 41 stylesheets in `src/components` (43 CSS Modules total in project).
- **Presentation Ownership Gate (`check:code-css-ownership`):**
  - 419 total emitted token appearances inspected in production bundle.
  - 109 unconditional owned tokens.
  - 9 owned utility tokens.
  - 11 Tailwind variant prefixes.
  - 66 contextual unproven tokens.
  - 5 dynamic family tokens.
  - 180 confirmed unowned tokens.
  - 39 unknown tokens.
  - Exactly 285 reviewed historical baseline debt entries tracked in `scripts/check-code-css-ownership.mjs` baseline.
  - Enforces 0 new unowned debt introduced.
- **Tailwind CSS v4:**
  - Configured through CSS variables in `document-theme.css` and semantic utility aliases in `globals.css` base layer.
  - Layer resets (`button { color: inherit }`, `a { color: inherit }`) explicitly contained in `@layer base` to prevent cascade overrides.

#### C. Shared Primitives vs Domain Components

- **Generic Primitives:** `Button`, `LinkButton`, `Input`, `Dialog`, `EmptyState`, `Alert`, `AlertDescription`, `Icon`.
- **Finance-Semantic Patterns:** `MoneyValue` (tabular-nums integer VND), `BrandLockup` (B3.2 geometry), `DashboardStatement` (financial standing & flow ribbon), `PlanningCardEmpty`.
- **Workflow Compositions:** `AccountsWorkspace`, `TransactionsWorkspace`, `ImportsPage`, `OnboardingFlow`.

---

## Research

### External sources selected for this bounded decision

1. **W3C WCAG 2.2 / Understanding docs** — accessibility floor for focus visibility/not-obscured, target size, contrast and input behavior.
2. **WAI-ARIA Authoring Practices Guide** — semantic/keyboard contracts for dialog, table vs interactive grid, tabs, disclosure and other composite widgets.
3. **MDN CSS container queries + reduced-motion guidance** — component-responsive layout and motion preference implementation.
4. **Current YNAB workflow/help evidence** — finance workflow reference for transaction capture, import/manual coexistence and responsive account/register patterns; reference only, not MoneyFlow authority.

### Key findings & interaction principles

- WCAG 2.2 AA adds a 24×24 CSS-pixel minimum target-size requirement (subject to defined exceptions) and requires focused controls not be completely obscured. MoneyFlow should use this as a floor and prefer ~44px primary touch targets on mobile.
- Keyboard focus must remain visibly identifiable; shared primitives therefore need explicit focus tokens and computed-style tests.
- Native semantic HTML should be preferred where possible. WAI-ARIA distinguishes a static table from an interactive grid; choosing grid semantics creates an additional keyboard-focus-management contract and should be reserved for genuinely spreadsheet-like interaction.
- Dialog focus must stay contained while open and return to a sensible workflow position when closed.
- Container queries let reusable cards/panels respond to their actual allocated space rather than only viewport width; useful for MoneyFlow's desktop split panes and responsive dashboard/planning cards.
- Non-essential motion should honor `prefers-reduced-motion`.
- Current YNAB materials show a useful workflow principle: manual entry and imported activity can coexist, while the UI clarifies transaction type and matching rather than forcing users to understand accounting mechanics. MoneyFlow can adopt the interaction principle while keeping its own ledger/provenance semantics.

### What these sources do not establish

- They do not prove a specific MoneyFlow visual identity.
- They do not justify copying competitor navigation, data model or financial semantics.
- They do not establish Vietnamese bank/provider capability.
- They do not replace runtime/browser/physical-device validation.

---

## Specification

### 1. Validated target information architecture mapping

| Current Route | Current User Job | Target IA Mental Model | URL Action | Migration Risk |
|---|---|---|---|---|
| `/dashboard`, `/insights` | Xem tình trạng tiền tổng quan | **Today** | Giữ `/dashboard`, redirect `/insights` -> `/dashboard` | Thấp |
| `/transactions`, `/timeline` | Tra cứu, lọc, kiểm tra sổ cái | **Activity** (Sổ giao dịch) | Giữ `/transactions`, `/timeline` là view toggle | Thấp |
| `/capture/*`, `/inbox`, `/imports/*`, `/rules` | Thu nhận & duyệt ngoại lệ | **Activity** (Thu nhận & Hộp thư) | Hợp nhất visual navigation trong Activity workstream, giữ URL cũ cho direct links | Trung bình |
| `/accounts`, `/accounts/*` | Quản lý ví & đối soát | **Accounts** (Tài khoản & Đối soát) | Giữ nguyên cấu trúc route hiện tại, nâng cấp master/detail trên desktop | Thấp |
| `/budgets`, `/commitments`, `/goals`, `/income-templates` | Kế hoạch thu chi & mục tiêu | **Plan** (Kế hoạch tích hợp) | Giữ các route độc lập, bổ sung thanh điều hướng ngữ cảnh gắn kết | Thấp |
| `/reports` | Báo cáo chi tiết thu - chi | **Insights** (Báo cáo & Phân tích) | Giữ `/reports`, nâng cao khả năng drill-down về giao dịch gốc | Thấp |
| `/settings/*`, `/categories` | Cấu hình & quản trị dữ liệu | **Settings & Data** | Giữ nguyên các path `/settings/*` | Thấp |

### 2. Product Experience Architecture Principles

1. **Attention before analytics:** Người dùng mở ứng dụng cần biết ngay hôm nay tiền của mình thế nào (đang an toàn, có khoản cần trả gấp không) trước khi bị ngợp bởi các biểu đồ phân tích sâu.
2. **One dominant primary action per screen:** Mỗi màn hình chỉ có duy nhất 1 nút hành động chính (Primary Call-to-Action) mang màu sắc thương hiệu nổi bật; các hành động phụ sử dụng nút thứ cấp (Outline / Ghost).
3. **Progressive disclosure:** Thông tin tài chính phức tạp (chi tiết đối soát sao kê, luật lọc regex, lịch sử đồng bộ) chỉ mở ra khi người dùng chủ động yêu cầu, giữ giao diện thường nhật luôn tinh gọn và bình thản.
4. **Facts ≠ Expectations ≠ Projections:**
   - **Facts (Dữ liệu sổ cái thực tế):** Giao dịch đã ghi vào sổ, số dư tài khoản đã xác nhận.
   - **Expectations (Kỳ vọng/Cam kết):** Hóa đơn định kỳ giữ trước, ngân sách tháng, lương chờ nhận.
   - **Projections (Ước tính):** Tiết kiệm tích lũy theo ngày cho mục tiêu.
   - Ba tầng dữ liệu này phải luôn được gắn nhãn và phân định trực quan rõ ràng, không bao giờ gộp lẫn thành một con số mập mờ.
5. **Correction is first-class:** Thao tác sửa, đổi danh mục, tách dòng chi tiêu (split), hoàn tác giao dịch nhầm lẫn luôn khả dụng và an toàn.
6. **No color-only finance semantics:** Tiền vào/tiền ra/chuyển tiền/cảnh báo luôn đi kèm dấu (`+`, `-`, `→`), nhãn chữ và biểu tượng tương ứng. Không phụ thuộc đơn thuần vào màu xanh/đỏ.
7. **Mobile is not compressed desktop:** Thiết kế cho mobile dựa trên vùng chạm ngón cái (thumb-zone), bottom navigation cố định, drawer/sheet vuốt mở thay vì co cụm table desktop.

### 3. Design System v3 Specification

#### A. Authority Namespaces

- **Brand & UI Semantic Tokens:**
  - Surfaces: `--mf-canvas`, `--mf-surface`, `--mf-surface-muted`, `--mf-surface-strong`, `--mf-surface-elevated`.
  - Typography: `--mf-text`, `--mf-text-muted`, `--mf-text-soft`, `--mf-text-inverse`.
  - Borders: `--mf-border-subtle`, `--mf-border`, `--mf-border-strong`.
  - Action/Brand: `--mf-brand`, `--mf-brand-hover`, `--mf-brand-pressed`, `--mf-brand-subtle`, `--mf-brand-text`.
  - State: `--mf-focus`, `--mf-focus-ring`, `--mf-danger`, `--mf-warning`, `--mf-success`, `--mf-info`.
- **Financial Semantic Tokens:**
  - Inflow: `--mf-income`, `--mf-income-subtle`, `--mf-income-border`, `--mf-income-text`.
  - Outflow: `--mf-expense`, `--mf-expense-subtle`, `--mf-expense-border`, `--mf-expense-text`.
  - Movement: `--mf-transfer`, `--mf-transfer-subtle`, `--mf-transfer-border`, `--mf-transfer-text`.
  - Plan/Allocation: `--mf-plan-allocated`, `--mf-plan-remaining`, `--mf-plan-overage`.

#### B. Foundations Contract

- **Typography:** Inter Sans với hỗ trợ tiếng Việt đầy đủ. Heading: tracking chặt chẽ (`-0.02em` đến `-0.03em`), font-weight 700–800. Body: tracking tự nhiên, line-height 1.5.
- **Tabular Numerals:** Tất cả số tiền định dạng `font-variant-numeric: tabular-nums;` đảm bảo thẳng hàng theo cột.
- **Currency Standard:** Lưu trữ số nguyên đồng; hiển thị với phân cách hàng nghìn dấu chấm (`15.000.000 ₫`) và biểu tượng đồng gạch chân đặc trưng.
- **Touch Target Floor:** Tối thiểu 24×24px (WCAG 2.2 AA), ưu tiên >=44×44px cho toàn bộ nút chính và tab điều hướng di động.
- **Motion & Reduced Motion:** Thời lượng chuyển cảnh 150ms–240ms sử dụng easing tự nhiên. Tự động vô hiệu hóa chuyển động khi bật `prefers-reduced-motion: reduce`.

### 4. Three Visual Territories Brief (Hướng thiết kế ứng viên chuẩn bị cho quyết định của Owner)

*Lưu ý nguyên tắc:* Ba hướng thiết kế dưới đây là các giải pháp ứng viên (candidate directions) phục vụ công tác chuẩn bị và đối chiếu kiến trúc. Quyết định lựa chọn hướng cụ thể sẽ do Owner thực hiện sau khi nền tảng (foundation PR) được chấp thuận và trước khi bước vào Slice 1 (Tokens & Shared Primitives). Không tự ý kích hoạt trước hạn.

#### Territory 1: "Kỷ Hà Đương Đại" (Architectural Precision Ledger)
- **Design Thesis:** Lấy cảm hứng từ thiết kế lưới Thụy Sĩ (Swiss Grid) và các công cụ cơ khí chính xác của Dieter Rams. Tối giản tuyệt đối, đường viền hairline 1px siêu nét, độ tương phản cao, triệt tiêu hoàn toàn đổ bóng màu mè.
- **Product Emotion:** Độ tin cậy vững chắc, tĩnh lặng, minh bạch trí tuệ như một chiếc đồng hồ cơ khí cao cấp.
- **Visual Density:** Compact / Normal. Mật độ thông tin cao, tối ưu hiển thị số lượng dòng giao dịch trên mỗi màn hình.
- **Typographic Character:** Geometric Sans (Inter Display) chặt chẽ, số liệu tabular thuần khiết, nhãn chữ nhỏ gọn viết hoa có tracking rộng.
- **Surface Treatment:** Mặt phẳng matte cao cấp, viền nét đơn sắc dứt khoát, không đổ bóng mờ.
- **Navigation:** Navigation rail thanh mảnh bên trái desktop; thanh công cụ dock sát đáy trên mobile.
- **Money Treatment:** Số liệu mực đen đậm, dấu `+`/`-` rõ ràng, màu sắc danh mục chỉ xuất hiện dưới dạng chấm nhỏ hoặc thanh chỉ thị 3px.
- **Light / Dark:** Light: Giấy vẽ kiến trúc trắng ấm (`#FAFAFA`) viền xám lạnh (`#E5E7EB`). Dark: Than chì sâu (`#0F1117`) viền titanium (`#2A2F3D`).
- **Ưu điểm:** Bố cục tinh gọn, không phụ thuộc hiệu ứng đổ bóng phức tạp, cấu trúc tương phản cao hỗ trợ tiếp cận chuẩn WCAG 2.2 AA.
- **Rủi ro:** Có thể tạo cảm giác nghiêm nghị, cần micro-copy gần gũi để cân bằng.

#### Territory 2: "Dòng Chảy Xanh" (Modern Tactile Flow)
- **Design Thesis:** Lấy cảm hứng từ các sản phẩm công nghệ tài chính hiện đại hàng đầu thế giới (Wise, Linear, Copilot). Xem dòng tiền như một thực thể liên tục vận động; kết hợp góc bo mềm mại (16px–20px), các dải ribbon dòng tiền uyển chuyển và bề mặt sứ xúc giác (tactile porcelain).
- **Product Emotion:** Sử dụng bề mặt mềm mại hơn để tạo cảm giác thị giác điềm tĩnh, hiện đại, khích lệ người dùng theo dõi chi tiêu định kỳ.
- **Visual Density:** Comfortable. Khoảng cách thoáng đãng ở các thẻ tổng quan, chuyển sang dạng lưới gọn gàng khi xem bảng giao dịch.
- **Typographic Character:** Sans-serif thân thiện, khẩu độ mở, các con số tròn trịa và rõ ràng.
- **Surface Treatment:** Bề mặt sứ tinh khiết kết hợp đổ bóng mềm đa lớp (`0 4px 20px rgba(0,0,0,0.04)`), viền mờ tinh tế.
- **Navigation:** Sidebar dạng đảo nổi trên desktop; thanh tab đáy bo tròn nổi bật nút Ghi trung tâm trên mobile.
- **Money Treatment:** Các khối số liệu lớn với thanh tiến độ bo tròn hai đầu, dải màu ribbon trực quan hóa dòng tiền vào - ra - còn lại.
- **Light / Dark:** Light: Mây sáng (`#F4F6FB`) thẻ sứ trắng tuyết (`#FFFFFF`) điểm nhấn xanh điện (`#245BFF`). Dark: Đêm nhung (`#0B0E14`) thẻ đá phiến (`#141923`) viền cobalt mờ (`#1E2638`).
- **Ưu điểm:** Nhắm đến trải nghiệm giao diện thân thiện, trực quan hóa tốt dòng tiền vào/ra/còn lại.
- **Rủi ro:** Cần kiểm soát chặt chẽ để không làm lãng phí không gian hiển thị trên màn hình máy tính lớn.

#### Territory 3: "Bản Ghi Bản Lĩnh" (Editorial Craft Ledger)
- **Design Thesis:** Lấy cảm hứng từ các ấn bản báo chí kinh tế tài chính danh tiếng thế giới (The Economist, Financial Times, Bloomberg Markets). Chú trọng nghệ thuật dàn trang (editorial layout), đường chỉ phân cách thanh nhã, gam màu ấm áp như giấy in cao cấp.
- **Product Emotion:** Tinh tế, trưởng thành, có chiều sâu, mang tính đúc kết và suy ngẫm cho các quyết định tài chính cá nhân.
- **Visual Density:** Balanced Editorial. Sử dụng khoảng trắng và các đường kẻ phân cách (dividers) thay vì đóng khung trong các hộp card nặng nề.
- **Typographic Character:** Tiêu đề trang trọng, kết hợp font Inter cho bảng biểu số liệu, chú trọng tỉ lệ vàng trong phân cấp chữ.
- **Surface Treatment:** Mặt giấy ngà ấm (`#FBF9F5`), đường kẻ phân tách mảnh mai (`#E5E0D8`), thẻ giao diện không viền dựa vào nền phân tầng.
- **Navigation:** Masthead thanh lịch nằm trên cùng; menu tối giản tinh tế trên mobile.
- **Money Treatment:** Số liệu được trình bày như các cột báo cáo phân tích chuyên sâu, màu sắc dịu nhẹ như mực in terra-cotta và xanh xô thơm.
- **Light / Dark:** Light: Giấy ngà (`#FBF9F5`), chữ nâu đậm espresso (`#1F1D1A`). Dark: Gỗ mun (`#161514`), thẻ màu nấm cục (`#1E1D1B`), chữ kem sáng (`#ECE8E1`).
- **Ưu điểm:** Đậm tính suy ngẫm và phân tích, tạo trải nghiệm đọc số liệu tài chính chuyên sâu và trang nhã.
- **Rủi ro:** Cần tối ưu tải font chữ để đảm bảo trải nghiệm nhanh trên mạng di động.

### 5. Machine-Verifiable Guardrails Design

1. **Presentation Ownership Enforcement (`check:code-css-ownership`):**
   - Mọi class CSS phát sinh trong JSX bắt buộc phải có selector sở hữu vô điều kiện trong CSS Module hoặc utility được Tailwind biên dịch thực tế.
   - Số lượng class nợ (unowned debt) chỉ được phép giảm (shrink-only), nghiêm cấm tăng thêm dù chỉ 1 class.
2. **Raw Token Leakage Guard (`src/lib/safe-ux-baseline.test.ts`):**
   - Nghiêm cấm sử dụng mã màu `#hex`, đơn vị px tùy tiện ngoài token quy định trong các file CSS Module.
3. **Double-Sided Token Proof:**
   - Khi thêm token mới, CI kiểm tra từ nguồn khai báo token -> output build production -> CSS computed style trong DOM thật.
4. **Strict Mode Assertion Guard:**
   - Mọi bài test browser phải kiểm tra rõ ràng cờ môi trường `NEXT_PUBLIC_APP_MODE` (demo hoặc authenticated), ngăn chặn triệt để tình trạng test demo đóng giả authenticated.
5. **Zero Flaky Retry Policy:**
   - Test thất bại lần 1 nhưng pass ở lần retry không được tính là green; phải ghi nhận vào báo cáo flakiness và tìm nguyên nhân gốc rễ.
6. **Accessibility Automation Gate:**
   - Kiểm tra kích thước target size (>=24px bắt buộc, >=44px cho primary), tỉ lệ tương phản (>=4.5:1), và tính toàn vẹn của heading hierarchy.

---

## Implementation plan

### 1. Migration Strategy (Vertical Slices)

```text
Slice 0: Foundation & Specification (PR #560 - Candidate Research / Non-Executable)
  → Slice 1: Design Tokens & Shared Primitives Proof (Button, Input, Dialog, etc.)
  → Slice 2: App Shell & Responsive Navigation Architecture
  → Slice 3: Today Surface (/dashboard, /insights)
  → Slice 4: Activity Workstream (/transactions, /capture, /inbox, /imports)
  → Slice 5: Accounts & Reconciliation (/accounts, /reconcile)
  → Slice 6: Planning Integrated Workspace (/budgets, /commitments, /goals)
  → Slice 7: Insights & Reporting (/reports)
  → Slice 8: Settings & Data Governance (/settings, /categories)
  → Slice 9: Public Landing & Authentication Shell (/landing, /login, /register)
  → Slice 10: Legacy Presentation Retirement & Final Consistency Sweep
```

*Quy tắc bất biến:* Mỗi slice khi chuyển đổi giao diện phải đồng thời gỡ bỏ (retire) mã CSS cũ tương ứng, không tạo thêm tầng CSS đè (override layer). Quá trình thi công bắt đầu từ Slice 1 chỉ sau khi: (1) #557 hoàn thành và current authority trở về null; (2) PR chọn authority cho #559 được tạo từ main mới và được merge; (3) Owner phê duyệt lựa chọn 1 trong 3 visual territories.

### 2. Validation Matrix

- **Ma trận cơ sở:** `[Demo, Authenticated]` × `[Light, Dark]` × `[Phone (390px), Desktop (1440px)]` × `[Empty Ledger, Populated Ledger]`.
- **Kịch bản đặc biệt:**
  - Tiêu đề tiếng Việt dài và số tiền VND lớn (hàng trăm triệu, hàng tỷ đồng).
  - Trạng thái mất kết nối mạng / lỗi dữ liệu từ server.
  - Điều hướng hoàn toàn bằng bàn phím (Keyboard-only / Tab / Escape / Enter).
  - Chế độ giảm chuyển động (`prefers-reduced-motion: reduce`).

### 3. Exit criteria

This slice can close only when:

- [x] postmortem is grounded in merged history/code/tests (`docs/research/DESIGN_FAILURE_POSTMORTEM_2026.md`);
- [x] current presentation inventory is complete enough to identify authority/debt boundaries;
- [x] research sources and non-applicability are recorded;
- [x] target IA is mapped to current jobs/routes;
- [x] Design System v3 contract and migration guardrails are explicit;
- [x] exactly three visual territories are ready for owner selection in a later design step;
- [x] no runtime code or schema changed;
- [x] exact-head required checks are green;
- [x] PR memory and lifecycle state are truthful.

---

## Tasks

| ID | Task | Status |
|---|---|---|
| D0.1 | prepare #559 candidate foundation specification (non-selector while #557 active) | completed |
| D0.2 | forensic merged UI history / design failure postmortem | completed |
| D0.3 | current route/component/CSS/test inventory | completed |
| D0.4 | focused external UX/accessibility/pattern research | completed |
| D0.5 | validate target IA against current route jobs | completed |
| D0.6 | specify Design System v3 authority + guardrails | completed |
| D0.7 | define visual-territory brief for exactly three directions | completed |
| D0.8 | exact-head docs/knowledge/CI-policy verification | completed |
| D0.9 | independent evaluation + owner handoff | completed |

---

## Evaluation

### Verification Results

1. `scripts/plan-selection.mjs`: `READY` (master: active `432-vietnam-long-term-product-strategy.md`; current slice: active `557-turnstile-load-recovery.md` selected by PR #558; schema 2).
2. `scripts/lifecycle-projection.mjs`: `VALID` (lifecycle impact `none`; current authority remains unchanged at `557-turnstile-load-recovery.md`).
3. `scripts/check-project-knowledge.mjs`: `PASS` (all 6 required active packet headings present, PR memory record valid under budget, `CURRENT_PROJECT_MEMORY.md` unmodified from `origin/main`).
4. `check:code-css-ownership`: `PASS` (419 emitted tokens, 285 reviewed historical baseline debt, 0 new unowned debt).
5. Physical code inspection: zero runtime, component, or stylesheet modifications made in this slice.
6. All 10 past UI failure classes (F1–F10) analyzed with concrete preventative guardrail mechanisms.

---

## Handoff

Owner instruction on 2026-09-10 authorizes designing the complete MoneyFlow web experience. Repository policy requires this bounded foundation specification before runtime implementation. PR #560 remains a candidate specification in draft while #557 is active; merge remains owner decision.
