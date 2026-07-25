# MoneyFlow — Spending Management Domain & Market Benchmark 2026

**Ngày nghiên cứu:** 2026-07-25  
**Mục tiêu:** học nguyên lý nghiệp vụ và pattern sản phẩm từ các ứng dụng dẫn đầu, sau đó chọn lợi thế phù hợp người dùng Việt Nam. Đây không phải danh sách tính năng để sao chép.

## 1. Kết luận điều hành

MoneyFlow đã có phần lớn primitive cần thiết: ledger thu/chi/chuyển ví, nhiều ví, ngân sách, khoản định kỳ, mục tiêu, báo cáo và số “Có thể chi hôm nay”. Khoảng trống lớn nhất không phải thêm nhiều màn hình mà là làm cho quyết định hằng ngày **đáng tin, giải thích được và dễ sửa khi kế hoạch thay đổi**.

Định vị nên khóa:

> Ứng dụng quản lý thu chi cho người Việt: ghi nhanh, quản lý tiền mặt/ngân hàng/ví điện tử, giữ trước nghĩa vụ, và trả lời rõ hôm nay còn có thể chi bao nhiêu.

Không nên cạnh tranh trực diện bằng bank aggregation toàn cầu, tư vấn đầu tư, credit score hay subscription negotiation trong giai đoạn hiện tại.

## 2. Kiến thức nghiệp vụ cốt lõi

### 2.1 Ledger là nguồn sự thật

Ba loại dòng tiền phải tách rõ:

- **Thu nhập:** tăng tổng tài sản.
- **Chi tiêu:** giảm tổng tài sản và có thể tính vào ngân sách.
- **Chuyển ví:** thay đổi vị trí tiền nhưng không làm thay đổi tổng tài sản và không được tính là chi.

Mọi báo cáo, ngân sách và dự báo phải dùng cùng luật này. Edit, soft-delete và split transaction phải bảo toàn các invariant tương ứng.

### 2.2 Năm trạng thái của tiền

Một con số số dư không đủ để ra quyết định. MoneyFlow cần phân biệt:

1. **Recorded money:** số dư theo ledger.
2. **Committed money:** hóa đơn/nghĩa vụ sắp đến hạn.
3. **Allocated money:** tiền đã dành cho mục tiêu.
4. **Budgeted money:** giới hạn chi cho một scope cụ thể.
5. **Available money:** phần còn lại có thể dùng mà không phá nghĩa vụ/kế hoạch.

“Có thể chi hôm nay” phải được suy ra từ available money, không phải chỉ lấy số dư chia số ngày.

### 2.3 Ba mô hình lập kế hoạch phổ biến

| Mô hình | Điểm mạnh | Điểm yếu | Bài học cho MoneyFlow |
|---|---|---|---|
| Zero-based / envelope | Mỗi đồng có nhiệm vụ; kiểm soát chặt | Học khó, cần chăm sóc thường xuyên | Không clone toàn bộ; chỉ học luật bảo vệ tiền và xử lý overspending |
| Category budget | Dễ hiểu, quen thuộc | Nhiều danh mục gây mệt; thiếu overview | Giữ làm công cụ chi tiết, không bắt buộc mọi người lập đủ danh mục |
| Flex budget | Tách fixed/non-monthly/flexible; một số chính để theo dõi | Ít chi tiết hơn | Phù hợp để tiến hóa safe-to-spend thành một quyết định đơn giản |

### 2.4 Recurring và non-monthly không phải một thứ

- **Recurring:** có lịch lặp tương đối ổn định như tiền nhà, điện thoại, học phí.
- **Non-monthly:** không xuất hiện mỗi tháng nhưng có thể dự đoán như bảo hiểm, sửa xe, Tết, học kỳ.

Cả hai cần được giữ trước trước khi tính available money. Chỉ có reminder mà không reserve thì con số “có thể chi” vẫn sai.

### 2.5 Reconciliation là cơ chế tạo niềm tin

Ứng dụng ghi tay/import luôn có nguy cơ lệch số dư. Reconciliation cần trả lời:

- Số dư thực tế của ví là bao nhiêu?
- Ledger lệch bao nhiêu?
- Lần xác nhận gần nhất khi nào?
- Có giao dịch trùng, thiếu hoặc sai ví không?

Nếu thiếu reconciliation, dashboard có thể đẹp nhưng dần mất độ tin cậy.

### 2.6 Insight tốt phải dẫn đến hành động

Một insight nên có đủ ba phần:

1. **Trạng thái:** đang đúng nhịp hay nhanh hơn kế hoạch.
2. **Giải thích:** đã dùng bao nhiêu phần trăm khi tháng đã trôi qua bao nhiêu phần trăm.
3. **Hành động:** giảm mức chi/ngày, sửa ngân sách, kiểm tra giao dịch hoặc điều chỉnh khoản định kỳ.

Không dùng ngôn ngữ gây tội lỗi. Sai lệch là tín hiệu để cập nhật kế hoạch, không phải phán xét người dùng.

## 3. Benchmark sản phẩm dẫn đầu

### YNAB

**Học:** zero-based budgeting, targets, rollover, xử lý overspending, loan planner, báo cáo và chia sẻ household. Targets có deadline, lặp lại và progress rõ; “Cost to Be Me” gom nhu cầu kế hoạch để so với thu nhập kỳ vọng.

**Không sao chép:** bắt người dùng mới học đầy đủ envelope method trước khi thấy giá trị.

**Áp dụng:** reserve nghĩa vụ, mục tiêu có cadence, review kế hoạch khi thu nhập không đủ.

### Monarch Money

**Học:** Flex Budgeting tách Fixed, Non-monthly và Flex, giúp người dùng tập trung vào một số chi linh hoạt. Có cả category budgeting, rollover, forecast và household views.

**Không sao chép ngay:** household collaboration phức tạp và broad wealth dashboard.

**Áp dụng:** phát triển MoneyFlow từ category budgets sang lớp overview “tiền linh hoạt còn lại”.

### Copilot Money

**Học:** onboarding từ lịch sử giao dịch, auto-categorization, dashboard trực quan, Free to Spend và đường so sánh tốc độ chi thực tế với tốc độ lý tưởng.

**Không sao chép:** phụ thuộc bank aggregation và machine learning trước khi có dữ liệu đủ tốt.

**Áp dụng:** “nhịp chi tiêu” minh bạch, có công thức đơn giản và giải thích được.

### Rocket Money

**Học:** một wedge rất rõ — subscription tracking, bill reminders và cancellation — sau đó mở rộng sang budget, goals và net worth.

**Không sao chép:** subscription negotiation là bài toán thị trường Mỹ, khó phù hợp hạ tầng Việt Nam hiện tại.

**Áp dụng:** MoneyFlow cũng cần giữ một wedge rõ: safe-to-spend đáng tin cho nhiều ví.

### Money Lover

**Học:** hiểu hành vi Việt Nam/Đông Nam Á: nhiều ví, ghi tay nhanh, tiền mặt, đa tiền tệ, recurring transaction, savings plan, debt/loan và các kỳ ngân sách linh hoạt.

**Khoảng trống để khác biệt:** MoneyFlow cần làm quyết định hằng ngày và giải thích số liệu rõ hơn, thay vì chỉ có nhiều module.

### Wallet by BudgetBakers

**Học:** Planned Payments, dự báo số dư sau thanh toán, reminder, cash-flow forecast, bank sync + manual cash, sharing và budget alerts.

**Áp dụng:** khoản định kỳ phải tác động trực tiếp vào số available, không đứng riêng như lịch nhắc.

### Spendee

**Học:** shared wallets, bank sync, auto-categorization, multiple budgets và thông điệp daily allowance dễ hiểu.

**Áp dụng:** daily allowance là pattern đã được thị trường chứng minh, nhưng phải kèm phạm vi và dữ liệu cấu thành.

### Actual Budget

**Học:** zero-sum method, schedules, rules, local-first/open-source discipline và khả năng tự động hóa payee/category bằng rule rõ ràng.

**Áp dụng:** light rule engine, import review và ownership dữ liệu trước khi nghĩ tới AI opaque.

## 4. Pattern chung của sản phẩm tốt

Các sản phẩm khác phương pháp nhưng hội tụ vào một vòng lặp:

1. **Capture:** nhập/sync/import giao dịch nhanh.
2. **Review:** sửa category, phát hiện recurring, xử lý trùng/sai.
3. **Plan:** budget, target, fixed cost và non-monthly reserve.
4. **Decide:** một con số hành động như free-to-spend hoặc remaining flexible.
5. **Correct:** reconcile, cover overspending, thay đổi plan.
6. **Reflect:** tuần/tháng, trend, net worth hoặc progress mục tiêu.

MoneyFlow hiện mạnh ở Capture, Plan cơ bản và Reflect. Cần đầu tư sâu hơn vào Decide, Review và Correct.

## 5. Khoảng trống sản phẩm phù hợp Việt Nam

### Lợi thế nên xây

- Nhanh với tiền mặt, tài khoản ngân hàng và ví điện tử, không phụ thuộc bank sync.
- Integer VND và copy tiếng Việt tự nhiên.
- Chuyển ví không bị tính thành chi.
- Khoản định kỳ và mục tiêu được giữ trước.
- “Có thể chi hôm nay” là quyết định chính.
- Import CSV/SMS sau này nhưng luôn có review queue.
- Dữ liệu mang đi được và có reconciliation.

### Không ưu tiên sớm

- Investment dashboard.
- Credit score.
- Subscription cancellation service.
- AI financial advisor.
- Household permissions phức tạp.
- Kết nối mọi ngân hàng trước khi daily loop tốt.

## 6. Domain contract: Spending Pace

Nhịp chi tiêu so sánh hai đại lượng cùng phạm vi:

- `spentPercent = spent / budget`
- `elapsedPercent = dayOfMonth / daysInMonth`
- `delta = spentPercent - elapsedPercent`

Trạng thái calm-finance mặc định:

| Delta | Trạng thái | Ý nghĩa |
|---:|---|---|
| ≤ -10 điểm % | Còn dư nhịp | Phần ngân sách dùng thấp hơn đáng kể phần thời gian đã trôi qua |
| -9 đến +5 | Đúng nhịp | Sai lệch nhỏ, không cần cảnh báo |
| +6 đến +15 | Hơi nhanh | Nên chú ý nhưng chưa cần báo động |
| > +15 | Nhanh hơn kế hoạch | Cần xem lại giao dịch hoặc điều chỉnh mức chi/kế hoạch |

Luật an toàn:

- Không có budget dương, nguyên và cùng scope → trả `null`.
- Không suy ra pace từ số dư tài khoản.
- Không trộn expense ngoài budget vào budgeted spending.
- Không cap `spentPercent` ở 100%; overspending phải hiển thị thật.
- Remaining/day luôn là integer, không âm.

Implementation: `src/lib/spending-pace.ts`.

## 7. Roadmap dựa trên giá trị

### P0 — Trustworthy daily decision

1. Spending pace engine + tests.
2. Gắn pace vào safe-to-spend hero với câu giải thích.
3. Hiển thị scope: ngân sách nào, khoản nào đã giữ trước.
4. Thêm reconciliation theo ví và freshness indicator.

### P1 — Reduce transaction maintenance

1. Search/filter tốt hơn.
2. CSV import review queue.
3. Light deterministic rules cho payee/category/account.
4. Recurring detection nhưng yêu cầu người dùng xác nhận.
5. Duplicate detection.

### P2 — Better planning

1. Flex overview: Fixed / Non-monthly / Flexible.
2. Sinking funds cho chi phí không hàng tháng.
3. Income plan và coverage gap.
4. What-if adjustment: thay budget/khoản định kỳ thì safe-to-spend đổi bao nhiêu.

### P3 — Expansion only after retention

1. Household/shared wallets.
2. Bank sync theo đối tác phù hợp Việt Nam.
3. Smarter recommendations có explanation và opt-in.

## 8. Product metrics

Không chỉ đo số tài khoản đăng ký.

- **Activation:** tạo ví + ghi giao dịch đầu + quay lại dashboard.
- **Time to record:** median thời gian ghi một khoản chi.
- **Ledger freshness:** số ngày từ giao dịch/reconciliation gần nhất.
- **Planning coverage:** tỷ lệ chi tiêu nằm trong budget hoặc plan.
- **Decision usage:** số phiên xem safe-to-spend/pace trước khi ghi chi.
- **Correction rate:** người dùng sửa plan hoặc reconcile sau cảnh báo.
- **Week-4 retention:** quay lại ít nhất mỗi tuần để review tiền.

## 9. Nguồn chính thức đã đối chiếu

- YNAB features, targets, Reflect và Cost to Be Me — `ynab.com` / `support.ynab.com`.
- Monarch Flex Budgeting, Category Budgeting và Shared Views — `help.monarchmoney.com`.
- Copilot budgeting và Free to Spend — `copilot.money` / `help.copilot.money`.
- Rocket Money budgeting/subscription features — `rocketmoney.com` / `help.rocketmoney.com`.
- Money Lover wallets, budgets, recurring và Premium — `moneylover.me` / Help Center.
- Wallet Planned Payments, budgets và features — `budgetbakers.com` / Help Center.
- Spendee wallets, budgets, bank sync và daily spending messaging — `spendee.com`.
- Actual Budget budgeting method, schedules và rules — `actualbudget.org/docs`.

Các chi tiết thương mại, giá và phạm vi bank connection thay đổi thường xuyên; phải kiểm tra lại nguồn chính thức trước khi đưa vào product copy hoặc quyết định mua tích hợp.
