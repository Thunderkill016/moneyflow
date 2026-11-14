# MoneyFlow — Tài chính cá nhân & Tài sản ròng

Ứng dụng quản lý tài chính cá nhân **Local-First (0ms offline)** và theo dõi **Tài sản ròng (Net Worth)**, xây dựng theo kiến trúc **Modular Clean Architecture** tách bạch hoàn toàn lõi tài chính khỏi giao diện và cơ sở dữ liệu.

---

## Kiến trúc hệ thống (Modular Clean Architecture)

```text
src/
├── core/                         # Tầng lõi: Pure TypeScript + Zod (không phụ thuộc React/Next/UI)
│   ├── schema/
│   │   ├── account.schema.ts     # 3 nhóm ví: LIQUID | INVESTMENT | DEBT & 4 tiền tệ (VND/USD/BTC/XAU)
│   │   ├── transaction.schema.ts # 4 trạng thái: EXPENSE | INCOME | TRANSFER | RECONCILE
│   │   └── budget.schema.ts      # Cấu hình Safe-to-Spend & định mức tiết kiệm
│   ├── engine/
│   │   ├── ledger.engine.ts      # Tính số dư ví, chuyển khoản nội bộ/đầu tư & khớp lệch số dư
│   │   ├── cashflow.engine.ts    # Tính Safe-to-Spend, Runway, Savings Rate % & Heatmap chi tiêu
│   │   └── parser.engine.ts      # Bóc tách chuỗi nhập nhanh tiếng Việt ("cf 35k, đổ xăng 70k")
│   └── storage/
│       ├── db.local.ts           # IndexedDB + localStorage cache 0ms & Xuất/Nhập Backup JSON
│       └── sync.service.ts       # Theo dõi trạng thái đồng bộ & đánh dấu hàng đợi PENDING/DELETED
│
├── features/                     # Tầng nghiệp vụ Headless (1 Controller Hook cho nhiều giao diện)
│   ├── quick-capture/            # Numpad token helpers & command parser helpers
│   ├── transactions/             # useTransactionController(): trạng thái dùng chung, lọc & sửa hàng loạt
│   ├── accounts-wealth/          # Nhóm tài sản LIQUID / INVESTMENT / DEBT
│   └── analytics/                # Highlights dòng tiền & tỷ lệ tích lũy
│
├── views/                        # Tầng giao diện bất đối xứng (Headless UI -> 2 màn hình chuyên biệt)
│   ├── desktop/                  # <DesktopTerminalView /> (>= 768px): Bento Grid 3 cột, Bảng dữ liệu, Cmd/Ctrl+K
│   └── mobile/                   # <MobileCaptureView /> (< 768px): Numpad 000 cố định đáy & 8 nút 1 chạm
│
├── shared/                       # Design system UI, format tiền tệ VND/Crypto & security headers
└── app/                          # Next.js App Router (/, /dashboard, /api/health, PWA manifest)

mobile/                           # Ứng dụng Flutter Mobile (Material 3) & Android tests
supabase/ & db/                   # Lược đồ PostgreSQL, Supabase migrations & pgTAP RLS checks
```

---

## Điểm cốt lõi trong mô hình dữ liệu 4 trạng thái

1. **Chuyển khoản & Đầu tư (`TRANSFER`):** Chuyển tiền từ ví thanh khoản (`LIQUID`) sang ví đầu tư (`INVESTMENT` — Vàng, BTC/USDT, Chứng khoán, Tiết kiệm) sẽ tự động chuyển dịch số dư và ghi nhận vào **Tỷ lệ Tích lũy (Savings Rate)** mà **không làm phình thống kê Chi tiêu**.
2. **Khớp số dư thực tế 1 chạm (`RECONCILE`):** Tính phần chênh lệch `delta = Số dư thực tế - Số dư tính toán` và tạo giao dịch điều chỉnh cân bằng tức thì mà không làm méo báo cáo thu/chi tháng.
3. **Bóc tách nhập nhanh tiếng Việt:** Hiểu các định dạng `35k`, `1tr5`, `2.5m`, `120.000`, phân tách nhiều giao dịch trong một dòng lệnh qua dấu `,` hoặc `;`.

---

## Kiểm thử & Phát triển cục bộ

### Web (Next.js + Pure Core Engine)

```bash
npm ci
npm run verify:fast   # Hygiene, Architecture Boundaries, Workflow Pins, Lint, TypeScript, Core Tests
npm run build         # Production Next.js build
npm run dev           # Khởi chạy ở http://localhost:3000
```

### Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter analyze --no-pub
flutter test --no-pub
```
