# Global expense-management web UX benchmark

**Ngày nghiên cứu:** 2026-07-26  
**Phạm vi:** web quản lý thu chi cá nhân, tập trung vào transaction capture, transaction register, dashboard, budget, recurring, reports và desktop/mobile UX.  
**Mục tiêu:** học pattern đã được sản phẩm lớn chứng minh, sau đó điều chỉnh cho MoneyFlow — **không clone giao diện, không feature dump, không đổi định vị khỏi web thu chi cá nhân cho người Việt**.

## 1. Cách nghiên cứu

Nghiên cứu dựa trên:

- tài liệu sản phẩm và help center chính thức;
- release notes hiện tại;
- ảnh giao diện công khai;
- đối chiếu với product law, UX principles và ledger hiện có của MoneyFlow.

Không có tài khoản trả phí để test mọi flow kín. Vì vậy tài liệu này phân biệt rõ:

- **Verified:** hành vi được tài liệu chính thức mô tả;
- **Inference:** kết luận UX rút ra từ nhiều sản phẩm;
- **Candidate:** ý tưởng cần kiểm chứng bằng usage thật trước khi đưa vào backlog.

## 2. Các sản phẩm được benchmark

| Sản phẩm | Vì sao đáng học | Pattern nổi bật |
|---|---|---|
| **YNAB** | Budget-first, transaction register lâu năm | Assigned / Activity / Available; nhập và reconcile rõ |
| **Monarch Money** | Dashboard và budgeting hiện đại trên web | Tóm tắt budget cạnh dữ liệu chi tiết; rules mạnh |
| **Copilot Money Web** | UX transaction hiện đại, desktop-first mới | Filter + metrics theo filter; keyboard review |
| **Actual Budget** | Open-source, local-first, reports sâu | Register gọn; dashboard report tùy biến; privacy |
| **Lunch Money** | Web-first, power-user nhưng vẫn dễ dùng | Categories + tags; rules engine; analytics linh hoạt |
| **Rocket Money** | Recurring/subscription và attention design | Upcoming bills; category review; watchlist |
| **Wallet by BudgetBakers** | Đa nền tảng và dashboard widget | Widget tùy biến; import file; account model |

## 3. Bài học lớn nhất: lõi không phải dashboard, mà là dữ liệu giao dịch sạch

Mọi sản phẩm tốt đều xoay quanh một vòng lặp:

1. giao dịch được nhập hoặc đồng bộ;
2. người dùng xác nhận/categorize;
3. hệ thống tính budget, recurring và report;
4. insight dẫn người dùng quay lại sửa dữ liệu khi cần.

Dashboard đẹp không cứu được dữ liệu sai. Vì vậy thứ tự ưu tiên đúng cho MoneyFlow là:

1. **ghi thu/chi nhanh**;
2. **sửa và tìm giao dịch dễ**;
3. **transfer không bị tính là chi**;
4. **budget/report chỉ đọc từ ledger sạch**;
5. sau đó mới thêm automation và customization.

## 4. Mỗi sản phẩm nên học gì

### 4.1 YNAB — làm cho budget trả lời được “tiền này còn dùng được không?”

YNAB tổ chức budget theo ba cột dễ hiểu:

- **Assigned:** đã phân bổ bao nhiêu;
- **Activity:** đã dùng bao nhiêu;
- **Available:** còn bao nhiêu.

Điểm hay không nằm ở màu sắc, mà ở việc mỗi con số có một vai trò rõ. Người dùng không phải tự suy ra từ nhiều chart.

**Áp dụng cho MoneyFlow**

- Budget row nên ưu tiên: **Hạn mức · Đã chi · Còn lại**.
- Cảnh báo phải có chữ và số, không chỉ màu.
- Overspend phải giải thích nguồn số liệu và cho phép mở danh sách giao dịch gây vượt.
- Không copy full zero-based/envelope budgeting; MoneyFlow giữ category budget + safe-to-spend.

**Không học**

- onboarding theo “phương pháp” dài;
- quá nhiều thuật ngữ budget;
- bắt người mới phân bổ toàn bộ thu nhập trước khi dùng app.

### 4.2 Monarch Money — chia màn hình thành summary và workspace

Monarch dùng mô hình rất phù hợp desktop:

- vùng chính là bảng/list để làm việc;
- vùng phụ là summary hoặc detail context;
- rules có preview trước khi áp dụng;
- transaction có category, tags, review state và hide/exclude.

**Áp dụng cho MoneyFlow**

- Desktop transactions: bảng chính + detail drawer bên phải, không cần mở trang mới cho thao tác nhỏ.
- Budget desktop: summary sticky bên phải hoặc trên đầu, list category ở giữa.
- Rule tương lai phải có **preview số giao dịch bị ảnh hưởng** trước khi save.
- “Ẩn khỏi budget/report” phải khác với xóa giao dịch.

**Không học sớm**

- household/couples;
- account aggregation;
- goals/net-worth phức tạp.

### 4.3 Copilot Money Web — review giao dịch như một workflow

Copilot web nhấn mạnh:

- filter transaction mạnh;
- tổng **Spent / Income / Net** cập nhật theo filter;
- keyboard shortcuts để chọn, review và đổi category;
- web được tối ưu riêng cho desktop thay vì kéo giãn mobile UI.

**Áp dụng cho MoneyFlow**

- Filters phải cập nhật summary ngay trên transactions page.
- Desktop có thể dùng `↑` / `↓` để di chuyển, `X` chọn, `C` đổi category, `R` đánh dấu đã xem — chỉ khi không focus input.
- Bulk edit phải là action bar xuất hiện sau khi chọn, không luôn chiếm chỗ.
- Review state là **Candidate**, chỉ làm nếu usage thật cho thấy người dùng cần xử lý nhiều giao dịch nhập/import.

### 4.4 Actual Budget — reports là workspace có thể cấu hình, không phải bộ chart cố định

Actual cung cấp:

- report dashboard nhiều widget;
- filter theo khoảng thời gian;
- cash flow, net worth, spending analysis và summary cards;
- custom report với table/bar/line/area/donut;
- register, schedules, payees và rules nằm trong navigation rõ ràng.

**Áp dụng cho MoneyFlow**

- Reports MVP chỉ cần trả lời ba câu hỏi mặc định:
  1. tháng này chi bao nhiêu so với tháng trước;
  2. tiền đi vào danh mục nào;
  3. thu − chi ròng là bao nhiêu.
- Mỗi chart phải click được để mở transaction list đã filter.
- Cho phép đổi date range và account/category filter.
- Dashboard tùy biến là **Later**, không phải MVP.
- Privacy pattern “scramble numbers” đáng học cho screenshot/support, nhưng chỉ làm khi có nhu cầu thật.

### 4.5 Lunch Money — categories, tags và rules phục vụ các câu hỏi khác nhau

Lunch Money phân biệt rõ:

- **Category:** một giao dịch có một category; quyết định budget/report chính;
- **Tag:** một giao dịch có nhiều tag; dùng cho chuyến đi, sự kiện, dự án;
- **Rule:** conditions → actions; có priority, suggested rules, one-time rule.

**Áp dụng cho MoneyFlow**

- Giữ category là bắt buộc cho expense/income chính.
- Tags là **Later**, chỉ dùng cho context cắt ngang như `#du-lich-da-nang`.
- Rule đầu tiên nên cực nhỏ: `note/payee chứa X → category Y`.
- Rule editor tương lai phải dùng câu tự nhiên:
  - **Nếu** mô tả chứa “Grab”
  - **thì** đặt danh mục “Di chuyển”
- Không làm rules engine đa tầng trước khi search/filter và import ổn định.

### 4.6 Rocket Money — recurring và attention tốt hơn dashboard dày đặc

Rocket Money làm tốt:

- phát hiện recurring/subscriptions;
- Upcoming, All và Calendar views;
- category review theo từng card;
- Watchlist cho vài khoản quan trọng mà không cần lập full budget;
- safe-to-spend trước kỳ lương trong Payday View.

**Áp dụng cho MoneyFlow**

- Commitments page nên có hai lớp:
  - **Sắp tới:** ưu tiên theo ngày đến hạn;
  - **Tất cả:** quản lý danh sách.
- Dashboard chỉ hiện attention có hành động: “Internet đến hạn sau 2 ngày”, “Ăn uống còn 300.000 ₫”.
- Có thể học Watchlist thành “Theo dõi” cho 1–3 category quan trọng, nhưng đây là **Candidate**, không tạo feature trước usage.
- Safe-to-spend của MoneyFlow phải minh bạch công thức hơn Rocket Money vì không có bank sync.

### 4.7 Wallet — customization chỉ có ích sau khi default tốt

Wallet cho phép thêm, xóa và kéo thả dashboard cards; web hỗ trợ import file và đồng bộ đa thiết bị.

**Áp dụng cho MoneyFlow**

- Default dashboard phải tốt trước; không bắt user tự dựng dashboard.
- Khi thêm customization, chỉ cho reorder/hide card, không mở widget builder phức tạp.
- File import cần mapping rõ và preview trước khi ghi vào ledger.
- Web và mobile có thể khác về density, nhưng phải cùng semantics và dữ liệu.

## 5. Best-of matrix cho MoneyFlow

| Job người dùng | Pattern nên lấy | Nguồn | Cách MoneyFlow dùng |
|---|---|---|---|
| Ghi một khoản chi | amount-first, recent choices | YNAB / mobile PFM | mở nhanh, focus amount, nhớ account/category gần đây |
| Nhập nhiều khoản | save-and-add-another | register products | lưu xong reset amount, giữ context tùy chọn |
| Biết giao dịch đã sạch chưa | review workflow | Copilot / Rocket | Candidate cho import; không ép manual-only user review |
| Tìm một khoản cũ | filter + live totals | Copilot / Lunch Money | search, date, account, category; Spent/Income/Net cập nhật |
| Sửa giao dịch | detail drawer | Monarch | desktop drawer; mobile full-screen sheet |
| Xem budget | budget/actual/remaining | YNAB / Monarch | hạn mức, đã chi, còn lại; click mở transactions |
| Xem tiền đi đâu | horizontal ranked bars | YNAB Reflect / reports | top categories, số tiền + tỷ lệ, không pie chart |
| Theo dõi hóa đơn | upcoming + all | Rocket Money | commitments sắp tới trước, list quản lý sau |
| Tự động dọn dữ liệu | if/then rule + preview | Lunch Money / Monarch | later: rule nhỏ, preview, undo |
| Phân tích sâu | customizable reports | Actual | later sau khi default reports tốt |
| Chụp màn hình hỗ trợ | scramble/hide numbers | Actual | later privacy utility |

## 6. Kiến trúc thông tin đề xuất

### Mobile

Bottom navigation tối đa 5 mục:

1. **Tổng quan**
2. **Giao dịch**
3. **Thêm**
4. **Ngân sách**
5. **Khác**

Trong **Khác**:

- Tài khoản
- Cam kết
- Mục tiêu
- Báo cáo
- Nâng cao: import, rules, inbox
- Cài đặt

Lý do: hành vi hằng ngày là xem tổng quan, ghi chi và kiểm tra giao dịch. Không đưa mọi module ngang cấp.

### Desktop

Sidebar:

- Tổng quan
- Giao dịch
- Ngân sách
- Cam kết
- Mục tiêu
- Tài khoản
- Báo cáo
- Nâng cao

Primary action “Thêm giao dịch” phải luôn thấy, nhưng không chiếm cả sidebar.

## 7. UI/UX theo từng màn hình

### 7.1 Tổng quan

```text
┌─────────────────────────────────────────────┐
│ Có thể chi hôm nay              420.000 ₫   │
│ Dựa trên số dư, ngân sách và cam kết        │
├─────────────────────────────────────────────┤
│ Cần chú ý: Internet đến hạn sau 2 ngày      │
├──────────────┬──────────────┬───────────────┤
│ Số dư        │ Thu tháng    │ Chi tháng     │
├─────────────────────────────┬───────────────┤
│ Top danh mục tháng này      │ Ngân sách     │
├─────────────────────────────┴───────────────┤
│ 5 giao dịch gần nhất                         │
└─────────────────────────────────────────────┘
```

Rules:

- một hero metric, không ba hero cạnh tranh;
- attention chỉ xuất hiện khi có việc cần làm;
- tối đa 3 KPI chính;
- top categories dùng bar ngang;
- recent transactions có link “Xem tất cả”.

### 7.2 Giao dịch

Desktop:

```text
[Search] [Tháng này] [Tài khoản] [Danh mục] [Bộ lọc]
Chi: 4.200.000 ₫ · Thu: 12.000.000 ₫ · Ròng: +7.800.000 ₫

□ Ngày       Nội dung          Danh mục       Tài khoản       Số tiền
□ 26/07      Cà phê            Ăn uống        Tiền mặt       −35.000 ₫
□ 25/07      Lương             Thu nhập       VCB        +12.000.000 ₫
```

Rules:

- date grouping trên mobile, table density trên desktop;
- số tiền thẳng cột, tabular numerals;
- expense/income/transfer có dấu `−`, `+`, `↔`, không chỉ màu;
- click row mở detail drawer;
- filter state giữ khi back;
- bulk action chỉ xuất hiện khi có selection.

### 7.3 Thêm giao dịch

Thứ tự trường:

1. Expense / Income / Transfer
2. Amount
3. Account
4. Category hoặc destination account
5. Note/payee
6. Date
7. Save / Save & add another

Rules:

- amount autofocus;
- number keypad trên mobile;
- recent account/category là suggestion, không auto-save mù;
- date mặc định hôm nay nhưng đổi được;
- transfer không hỏi category;
- lỗi inline, không xóa dữ liệu người dùng đã nhập.

### 7.4 Ngân sách

Mỗi row:

```text
Ăn uống
Hạn mức 3.000.000 ₫ · Đã chi 2.250.000 ₫ · Còn 750.000 ₫
[███████████████░░░░░] 75%
```

Rules:

- bar chỉ là phụ; số tiền là chính;
- gần chạm hạn mức dùng amber + text;
- vượt dùng red + “Vượt 120.000 ₫”;
- click row mở transactions của category trong kỳ;
- không dùng chart tròn cho budget composition.

### 7.5 Cam kết

Default là **Sắp tới**:

```text
Hôm nay        Điện             650.000 ₫
Sau 2 ngày     Internet         250.000 ₫
12/08          Netflix          260.000 ₫
```

Secondary tabs:

- Tất cả
- Lịch

Action chính là “Đánh dấu đã thanh toán” hoặc “Ghi giao dịch”, không phải chỉ xem.

### 7.6 Báo cáo

Default reports:

1. Thu và chi theo tháng
2. Top danh mục
3. Ròng theo thời gian

Mỗi report có:

- date range;
- account/category filter;
- exact values;
- click-through tới filtered transactions;
- empty state giải thích cần dữ liệu nào.

## 8. Visual design học từ các sản phẩm tốt

### 8.1 Density

- Mobile: card/list thoáng, touch target ≥ 44px.
- Desktop: table dày hơn; không biến mọi row thành card.
- Khoảng trắng dùng để nhóm thông tin, không dùng làm decoration.

### 8.2 Typography

- Hero amount: lớn nhưng không phô trương.
- KPI labels nhỏ hơn value rõ rệt.
- Amount dùng tabular numbers để thẳng cột.
- Exact VND ở table/detail; có thể rút gọn “1,2 triệu ₫” ở hero nếu vẫn xem exact được.

### 8.3 Color

- Neutral là mặc định.
- Green: income/positive.
- Red: expense/overspend.
- Amber: approaching limit.
- Blue: transfer/information.
- Luôn kèm dấu hoặc label; không truyền nghĩa bằng màu đơn độc.

### 8.4 Interaction

- Optimistic UI cho create/edit, kèm undo khi hợp lý.
- Drawer/sheet cho edit nhanh.
- Dialog chỉ cho task ngắn; flow dài dùng page/sheet.
- Keyboard shortcuts là enhancement desktop, không thay thế button.

### 8.5 Calm finance copy

Nên dùng:

- “Bạn còn 750.000 ₫ cho Ăn uống tháng này.”
- “Khoản Internet đến hạn sau 2 ngày.”
- “Không tính chuyển khoản vào chi tiêu.”

Không dùng:

- “Bạn tiêu quá nhiều!”
- “Tài chính của bạn đang tệ.”
- gamification gây xấu hổ hoặc panic red toàn màn hình.

## 9. Những thứ không nên copy

- Bank sync làm onboarding bắt buộc.
- Full YNAB envelope trước khi user hiểu thu chi.
- Dashboard widget builder trước khi default dashboard tốt.
- Net worth/investment/crypto làm hero.
- Subscription cancellation service.
- AI advisor.
- Social comparison, streak hoặc điểm số tài chính.
- Pie/donut chart cho so sánh category chính.
- Dùng icon không label trong primary navigation.

## 10. Thứ tự áp dụng cho MoneyFlow

### Wave 1 — hoàn thiện daily loop

- quick add amount-first;
- recent account/category;
- save & add another;
- transaction search/filter có live totals;
- transaction detail drawer desktop;
- budget row: hạn mức / đã chi / còn lại;
- click KPI/category để drill down.

### Wave 2 — recurring và data hygiene

- commitments “Sắp tới / Tất cả / Lịch”;
- exclude from budget/report khác delete;
- import preview + mapping;
- review state chỉ khi import tạo nhu cầu thật;
- rule đơn giản có preview.

### Wave 3 — power-user

- tags;
- advanced custom reports;
- dashboard reorder/hide;
- privacy scramble numbers;
- richer keyboard workflow.

**Gate:** không thêm Wave 2/3 nếu daily loop chưa nhanh, dữ liệu chưa đáng tin hoặc mobile chưa ổn.

## 11. Cách học UI/UX từ đối thủ mà không clone

Cho mỗi màn hình tham khảo:

1. Viết câu hỏi mà màn hình trả lời.
2. Xác định element người dùng nhìn đầu tiên.
3. Ghi lại primary action và secondary actions.
4. Đếm số quyết định người dùng phải đưa ra.
5. Bỏ toàn bộ màu/logo/brand và vẽ lại wireframe xám.
6. Giữ pattern giải quyết vấn đề, thay copy và hierarchy cho MoneyFlow.
7. Test bằng một task thật, ví dụ: “ghi 35.000 ₫ tiền cà phê bằng tiền mặt”.
8. Chỉ ship nếu task nhanh hơn hoặc rõ hơn bản hiện tại.

## 12. Quyết định sản phẩm

MoneyFlow không cần trở thành YNAB, Monarch hay Rocket Money bản Việt.

Nó nên kết hợp:

- **YNAB:** số budget rõ;
- **Monarch:** summary + workspace;
- **Copilot:** transaction workflow nhanh;
- **Actual:** register/report đáng tin;
- **Lunch Money:** rules/tags có kỷ luật;
- **Rocket Money:** recurring và attention;
- **Wallet:** customization tối giản sau cùng;
- **MoneyFlow:** safe-to-spend minh bạch, VND-first, manual-first, calm finance.

## 13. Nguồn chính thức

### YNAB

- https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0
- https://www.ynab.com/whats-new/the-clearest-way-to-enter-transactions
- https://support.ynab.com/en_us/the-ynab-app-SyP94gTjkx

### Monarch Money

- https://help.monarchmoney.com/hc/en-us/articles/360048393272-Getting-Started-Guide
- https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets
- https://help.monarchmoney.com/hc/en-us/articles/360048393372-Transaction-rules
- https://help.monarchmoney.com/hc/en-us/articles/4405041904916-Hide-Transactions

### Copilot Money

- https://help.copilot.money/en/articles/11780342-copilot-money-for-web
- https://help.copilot.money/en/articles/13157382-web-faq

### Actual Budget

- https://actualbudget.org/docs/tour/user-interface/
- https://actualbudget.org/docs/tour/reports/
- https://actualbudget.org/docs/reports/
- https://actualbudget.org/docs/reports/custom-reports/
- https://actualbudget.org/docs/releases/

### Lunch Money

- https://lunchmoney.app/features
- https://lunchmoney.app/features/rules
- https://lunchmoney.app/features/categories-tags
- https://support.lunchmoney.app/setup/categories/faq

### Rocket Money

- https://help.rocketmoney.com/en/articles/10328100-creating-transaction-rules
- https://help.rocketmoney.com/en/articles/13778317-transaction-category-review
- https://help.rocketmoney.com/en/articles/13704685-track-the-spending-that-matters-most-with-a-watchlist
- https://help.rocketmoney.com/en/articles/3117398-where-can-i-view-my-subscriptions-and-bills
- https://help.rocketmoney.com/en/articles/6235627-enabling-payday-view

### Wallet by BudgetBakers

- https://support.budgetbakers.com/hc/en-us/articles/7181432342034-Wallet-Web-App
- https://support.budgetbakers.com/hc/en-us/articles/7150077480850-Add-or-Modify-Dashboard-Cards-Widgets
- https://support.budgetbakers.com/hc/en-us/articles/7077275632274-Import-your-transactions-or-files
