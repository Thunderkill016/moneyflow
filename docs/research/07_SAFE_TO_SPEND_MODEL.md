# MoneyFlow — mô hình “Có thể chi hôm nay”

**Ngày rà soát:** 2026-07-26  
**Phạm vi:** con số gợi ý trên Tổng quan; không phải tư vấn tài chính, số dư ngân hàng hay hạn mức bắt buộc.

## 1. Kết luận

MoneyFlow dùng một **daily spending guide** cho người ghi thu chi thủ công:

1. bắt đầu từ tổng số dư hiện tại của các tài khoản VND đang được tính;
2. giữ trước các cam kết chưa trả và tiền đã phân bổ cho mục tiêu;
3. khôi phục phần chi linh hoạt đã ghi trong ngày để tạo một mốc đầu ngày ổn định;
4. chia phần có thể dùng cho số ngày còn lại trong tháng, tính cả hôm nay;
5. trừ mức tiết kiệm cần dành mỗi ngày;
6. trừ phần chi linh hoạt đã ghi hôm nay đúng một lần.

```text
spendable_now
  = current_vnd_balance
  - reserved_commitments
  - allocated_savings

start_of_day_spendable
  = max(0, spendable_now + flexible_spent_today)

base_daily_allowance
  = floor(start_of_day_spendable / remaining_days_including_today)

daily_allowance
  = max(0, base_daily_allowance - planned_daily_savings)

safe_today
  = max(0, daily_allowance - flexible_spent_today)
```

`flexible_spent_today` không gồm khoản thanh toán định kỳ đã được giữ trước. Khi một cam kết được thanh toán, số dư giảm và phần giữ trước cũng được giải phóng; tính khoản đó thêm lần nữa sẽ làm giảm giả tạo số có thể chi.

## 2. Invariant bắt buộc

- `current_vnd_balance` là số dư **hiện tại**, nên giao dịch hôm nay đã nằm trong đó.
- Chi linh hoạt hôm nay được cộng lại để dựng mốc đầu ngày rồi trừ sau phép chia: tác động đúng một lần.
- Transfer giữa tài khoản của chính người dùng không làm thay đổi tổng tài sản và không phải chi.
- Mọi số tiền là integer minor units; kết quả dùng phép chia lấy phần nguyên và không âm.
- Category budget không tự động trở thành ngân sách toàn bộ. Tổng của một vài ngân sách danh mục không được dùng để chặn con số toàn cục.
- Chỉ một kế hoạch bao phủ toàn bộ chi tiêu, được đánh dấu rõ là hoàn chỉnh, mới được dùng như giới hạn thứ hai:

```text
base_daily_allowance
  = min(
      balance_based_allowance,
      complete_plan_based_allowance
    )
```

## 3. Vì sao không dùng tổng category budget làm giới hạn toàn cục

Người dùng có thể chỉ tạo ngân sách cho Ăn uống hoặc Di chuyển. Nếu cộng phần còn lại của các danh mục đó rồi coi là toàn bộ tiền được phép chi, MoneyFlow sẽ kết luận sai rằng những khoản hợp lệ ngoài hai danh mục cũng không được chi.

Các sản phẩm lớn tách rõ:

- Copilot: `Free to Spend` là phần còn lại của ngân sách tháng và đi cùng nhịp chi lý tưởng.
- Monarch: Flex Budget là một bucket chi linh hoạt cấp cao; category budget là kế hoạch theo từng danh mục.
- Spendee: mức chi/ngày được tính cho **một budget period đã chọn**.
- PocketGuard: Leftover trừ bills, budgets, goals và debts khỏi income; category budget là phần tiền được reserve riêng.
- Rocket Money: Payday View tính safe-to-spend trong phạm vi trước kỳ lương tiếp theo và các bill thuộc tài khoản nhận lương.

MoneyFlow hiện chưa có một Flex/All Expenses budget được người dùng xác nhận là đầy đủ. Vì vậy category budgets tiếp tục hiển thị và cảnh báo riêng, nhưng không âm thầm thay thế kế hoạch toàn cục.

## 4. Giới hạn hiện tại phải hiển thị minh bạch

- Chu kỳ hiện tại kết thúc vào cuối tháng, chưa theo ngày nhận lương.
- Chỉ tổng số dư VND được dùng; tài khoản ngoại tệ không được quy đổi.
- Mọi tài khoản VND đang hoạt động hiện được xem là có thể dùng; chưa có cờ “không tính vào chi tiêu” cho tài khoản tiết kiệm/đầu tư.
- Độ chính xác phụ thuộc vào ledger và số dư tài khoản. Sản phẩm ghi tay cần reconciliation để phát hiện giao dịch thiếu, trùng hoặc sai ví.
- Đây là gợi ý bảo thủ theo dữ liệu đã ghi, không phải cam kết rằng người dùng nên tiêu hết con số đó.

## 5. Nguồn chính thức đã đối chiếu

- PocketGuard Leftover: https://help.pocketguard.com/hc/en-us/articles/360002167320-Leftover
- PocketGuard Category budgets: https://help.pocketguard.com/hc/en-us/articles/360002167280-Category-budgets
- Copilot Dashboard / Free to Spend: https://help.copilot.money/en/articles/6045480-dashboard-tab-overview
- Monarch Budgets: https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets
- Rocket Money Payday View: https://help.rocketmoney.com/en/articles/6235627-enabling-payday-view
- Spendee Budgets: https://help.spendee.com/article/131-budget-my-money

Các nguồn trên chứng minh pattern và phạm vi sản phẩm; chúng không công bố cùng một công thức. Công thức MoneyFlow phải được đánh giá bằng invariant dữ liệu của chính MoneyFlow, test hồi quy và giải thích rõ đầu vào.
