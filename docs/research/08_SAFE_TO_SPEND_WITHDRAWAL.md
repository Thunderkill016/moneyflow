# MoneyFlow — rút lại mô hình “Có thể chi hôm nay”

**Ngày quyết định:** 2026-07-26  
**Trạng thái:** số hiển thị đã bị rút khỏi giao diện cho tới khi có mô hình kế hoạch đáng tin.

## Vì sao phải rút lại

Mô hình đã merge trong PR #67 sửa đúng một lỗi kế toán cục bộ: chi tiêu trong ngày không còn bị tính hai lần. Tuy nhiên, nó vẫn dùng một giả định sản phẩm sai:

> lấy tổng số dư VND có thể nhìn thấy rồi chia cho số ngày còn lại trong tháng.

Điều đó biến tổng tài sản thành tiền được phép tiêu hết trước cuối tháng. Vào cuối tháng, 10.000.000 VND có thể bị hiển thị thành khoảng 1.700.000 VND/ngày dù người dùng còn phải sống sang tháng sau, có tiền tiết kiệm không muốn dùng hoặc chưa khai báo đủ nghĩa vụ.

Sửa invariant không đủ để chứng minh đầu vào và chu kỳ kế hoạch là đúng.

## Những gì sản phẩm khác thực sự làm

### PocketGuard

`Leftover` dựa trên **thu nhập**, không dựa trên số dư khả dụng. Sản phẩm lấy thu nhập dự kiến/thực nhận rồi trừ bills, category budgets, goals và debt plans. PocketGuard nói rõ Leftover có thể âm dù tài khoản vẫn còn tiền, vì mục tiêu là giúp người dùng chi ít hơn thu nhập.

- https://help.pocketguard.com/hc/en-us/articles/360002167320-Leftover
- https://help.pocketguard.com/hc/en-us/articles/360002167260-Bills
- https://help.pocketguard.com/hc/en-us/articles/360002167280-Category-budgets

### Copilot

`Free to Spend` là phần ngân sách tháng còn lại. Đường nhịp chi so sánh chi tiêu thực tế với tốc độ lý tưởng của **monthly budget**; không phải tổng tài sản chia đều theo ngày.

- https://help.copilot.money/en/articles/6045480-dashboard-tab-overview

### Monarch

Ngân sách tháng bắt đầu từ **thu nhập dự kiến**. Người dùng chọn category budgeting hoặc một Flex bucket cấp cao cho toàn bộ chi linh hoạt. Category budget một phần không được dùng như kế hoạch toàn cục.

- https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets
- https://help.monarchmoney.com/hc/en-us/articles/360048393272-Getting-Started-Guide

### Rocket Money

`Payday View` tính safe-to-spend trong phạm vi **trước kỳ lương tiếp theo**, chỉ sau khi xác định tài khoản nhận lương và các hóa đơn sẽ được trả từ tài khoản đó. Sản phẩm yêu cầu ít nhất ba kỳ lương có cadence ổn định và công khai giới hạn với thu nhập biến động hoặc nhiều nguồn thu.

- https://help.rocketmoney.com/en/articles/6235627-enabling-payday-view

## Kết luận cho MoneyFlow

MoneyFlow hiện chưa đủ dữ liệu để công bố một số “Có thể chi hôm nay”. Nó chưa có một trong hai contract tối thiểu sau:

### Chế độ kế hoạch tháng

- thu nhập dự kiến đáng tin cho kỳ;
- kế hoạch chi bao phủ toàn bộ chi linh hoạt;
- bills/commitments;
- goals/debt contributions;
- xử lý rollover;
- giao dịch bị loại khỏi kế hoạch.

### Chế độ đến kỳ lương

- tài khoản chi tiêu được chọn;
- kỳ thu nhập tiếp theo đã xác nhận;
- các hóa đơn đến hạn trước kỳ đó;
- quỹ đệm tối thiểu;
- tài khoản/tiền không được phép dùng;
- cách xử lý nhiều nguồn thu hoặc thu nhập biến động.

Cho tới khi một contract được triển khai và kiểm chứng bằng dữ liệu thật, dashboard chỉ được hiển thị dữ liệu quan sát được: số dư, thu, chi, ròng, ngân sách từng danh mục, cam kết, thu nhập định kỳ và mục tiêu. Không được suy ra một con số chi tiêu toàn cục từ tổng tài sản.

## Điều kiện để đưa feature trở lại

1. Chọn rõ một planning mode; không trộn monthly budget và payday cash-flow.
2. Viết product contract và ví dụ phản chứng trước khi code.
3. Test các tình huống cuối tháng, nhận lương giữa tháng, nhiều tài khoản, tiền tiết kiệm, thu nhập biến động, bill đã trả và transfer.
4. UI phải hiển thị nguồn dữ liệu, phạm vi thời gian và lý do khi không đủ dữ liệu.
5. Tự dùng ít nhất bảy ngày với dữ liệu synthetic hoặc dữ liệu cá nhân do chủ dự án tự nhập.
6. Chỉ merge khi con số hữu ích hơn việc không hiển thị và không tạo cảm giác được phép tiêu hết tài sản.
