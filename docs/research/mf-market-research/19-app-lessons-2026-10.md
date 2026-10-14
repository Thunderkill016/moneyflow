# MF nên học gì từ 19 ứng dụng quản lý tiền?

- **Provenance:** owner-provided market research (2026-10-14). Evidence,
  not task authority — implementation order still comes from canon,
  issues and explicit owner decisions.
- **Baseline caveat:** the report audited clone `4ab78b76` — before the
  mobile merge (PR #787, head `6e770c14`). Its "Flutter unknown" note is
  stale; `mobile/` now exists with voice capture and timeline (PR #791).
- **Linked appendix:** `./ho-so-19-app.md` (per-app profiles) was
  referenced but not included in the pasted material — request it from
  the owner if per-app detail is needed.

**MF nên tập trung giúp người Việt biết tiền thực sự đang ở đâu, đã đi đâu, và sửa được sai lệch mà không phải chăm sổ quá nhiều.** Không nên cạnh tranh bằng số lượng tính năng. Đích dài hạn là giảm công sức nhờ thu thập dữ liệu an toàn; nhập tay vẫn là đường lui, không phải định vị vĩnh viễn.

Hướng này phù hợp với chiến lược trong repo: bắt đầu từ dữ liệu tài chính đáng tin, rồi mới mở rộng sang nghĩa vụ, dự phòng, mục tiêu và hỗ trợ quyết định. Nhóm người dùng đầu tiên được đề xuất trong repo là người Việt dùng nhiều tài khoản hoặc kênh thanh toán, muốn nhìn tổng thể mà không phải học kế toán. Đây vẫn là giả thuyết khách hàng, chưa phải nhu cầu thị trường đã được chứng minh. [1] [2]

Nghiên cứu đối chiếu **19 app đại diện**, không thể gọi là “tất cả app trên thị trường”. Ngày tham chiếu là **14/10/2026**. Các nhận xét tính năng dựa trên website, tài liệu hỗ trợ và listing chính thức đã đọc; chưa đăng nhập, mua gói hay thử nối ngân hàng. Chi tiết và nguồn cho từng app nằm trong [hồ sơ 19 app](./ho-so-19-app.md).

## 1. Những app đáng học nhất cho MF

### Money Lover và Sổ Thu Chi MISA: đối thủ gần người Việt nhất

**Money Lover** của Finsify có app mobile và web, tiếng Việt, nhiều ví, ngân sách và các cách ghi giao dịch. Tài liệu hỗ trợ đáng học hơn danh sách marketing: chuyển nội bộ tạo hai giao dịch; phí được ghi thêm riêng; ảnh hóa đơn được nhận diện nhưng người dùng phải xem và sửa trước khi lưu. Linked Wallet là dịch vụ riêng, read-only, không đồng nghĩa cập nhật liên tục. [5] [6] [7] [8] [9]

MF nên học **đường nhập nhanh có thể sửa** và **cách giải thích tác động của chuyển tiền**. Ví dụ: chuyển 1 triệu từ tài khoản A sang B không làm người dùng chi tiêu thêm 1 triệu. Nếu mất 2.000đ phí, chỉ phí là chi phí. MF đã có transfer; công việc cần làm là kiểm thử và trình bày nghĩa này rõ, không xây lại một module chỉ vì đối thủ có.

**MISA MoneyKeeper/Sổ Thu Chi MISA** công bố ghi thu chi, báo cáo, hạn mức, tiết kiệm, xuất Excel/PDF và các lớp voice/AI/bank sync. Help xác nhận chuyển giữa ví, điều chỉnh số dư và chia sẻ chỉ đọc cho người nhận. Listing Việt Nam có tiếng Việt và giá VND; danh sách ngân hàng hỗ trợ và độ đầy đủ của luồng bank sync chưa được tài liệu đã đọc xác nhận. [10] [11] [12] [13]

Bài học cho MF là **quyền chia sẻ phải nói rõ** và **điều chỉnh số dư không thay thế việc tìm nguyên nhân lệch**. Nếu người dùng bấm “sửa số dư”, app phải cho biết đó là khoản điều chỉnh và vẫn giữ lý do, thay vì khiến giao dịch bị thiếu biến mất khỏi nhận thức.

### MoMo và ZaloPay: học trải nghiệm thanh toán, không biến MF thành ví

**MoMo** tự ghi và phân loại giao dịch phát sinh trong MoMo, cho thêm khoản ngoài MoMo, có báo cáo và ngân sách. Lợi thế là dữ liệu có ngay trong quá trình thanh toán. Tuy nhiên, việc ví liên kết ngân hàng để nạp/rút/trả tiền **không chứng minh ví đọc toàn bộ lịch sử ngân hàng**. [14] [15]

**ZaloPay** đáng học ở lịch sử trạng thái: thành công, đang chờ/đang xử lý và hoàn tiền. Tài liệu mô tả thời gian xử lý phụ thuộc nhà cung cấp; không phải mọi sự kiện đều chốt ngay. Đây là trạng thái thanh toán, không phải bằng chứng ZaloPay có đối soát sổ tài chính cá nhân đầy đủ. [16] [17]

Cơ hội của MF là gom nhiều nguồn, nhưng phải nói rõ nguồn nào đã được thấy. Một giao dịch QR trả quán ăn là chi tiêu; chuyển giữa hai tài khoản của chính mình là chuyển nội bộ. **Không dùng chữ “chuyển khoản” hoặc sự có mặt của QR để tự quyết định loại giao dịch.**

### YNAB, Goodbudget và Actual: học ngân sách và đối soát

**YNAB** đặt kế hoạch cho tiền hiện có và hỗ trợ nhập tay, import, transfer, đối soát. Direct Import được công bố cho một số ngân hàng US/Canada/UK/EU; không được suy ra hỗ trợ Việt Nam. **Goodbudget** có mô hình phong bì ngân sách và tài liệu đặc biệt hữu ích về pending, cleared, matched: giao dịch thủ công có thể ghép với giao dịch import thay vì đếm hai lần. [18] [19] [20] [21]

**Actual Budget** đáng học về nhập file và liên kết hai đầu của chuyển nội bộ. Hai phía có thể cần ngày ghi nhận hoặc trạng thái đối soát riêng để khớp sao kê từng tài khoản. Đối soát so số dư sao kê với phần giao dịch đã cleared, cho thấy chênh lệch và khóa trạng thái đã xác nhận. [22] [23] [24]

MF nên học cách giải thích quy trình này bằng tiếng Việt: **“đã nhận dữ liệu” khác “đã kiểm tra khớp sao kê”**. Ngân sách là kế hoạch, không phải số dư ngân hàng. Số dư nhiều cũng chưa chắc được chi tự do nếu còn tiền nhà, khoản trả nợ hoặc tiền dự phòng.

### Monarch và Copilot: học hàng chờ xem lại, không sao chép mọi chỉ số

**Monarch Money** có quy tắc với điều kiện, thứ tự và xem trước; cho sửa giao dịch, import/export và nhiều kết nối dữ liệu. Help nói rõ không có tính năng reconciliation native. Một số lựa chọn import không có undo. Đây là bài học phải bổ sung đường sửa và khôi phục, không phải điểm nên bắt chước. Mô hình tiền tệ USD/CAD và phạm vi US/Canada cũng không phải nền tảng sẵn dùng cho VND. [25] [26] [27] [28]

**Copilot Money** có vòng “To Review”, gợi ý dựa trên lịch sử và phân biệt giao dịch thường, thu nhập, chuyển nội bộ. Lịch sử nhận được tùy tổ chức. Tích hợp Venmo bằng email biên nhận không phải đọc toàn bộ tài khoản ngân hàng. Sản phẩm công bố phục vụ US; không có bằng chứng local-bank/VND từ các nguồn đã đọc. [29] [30] [31]

MF đã có quy tắc xác định và Inbox. Nên học **chỉ đưa ngoại lệ cần người dùng xử lý**, giải thích quy tắc nào đã áp dụng và cho xem trước thay đổi. Đừng lấy “AI tự phân loại được nhiều” làm thành công nếu sau đó người dùng phải mất lâu hơn để sửa.

## 2. Những app còn lại bổ sung góc nhìn gì?

**Wallet by BudgetBakers và Spendee** cho thấy “có đồng bộ” vẫn có nhiều giới hạn. Wallet có import web, quyền sửa khác nhau giữa giao dịch thủ công và ngân hàng, cùng transfer matching phụ thuộc dữ liệu khớp. Spendee có import vào cash wallet, không tự nhận duplicate/transfer theo help; tự đồng bộ ngân hàng phụ thuộc provider và 2FA. MF nên học cách công bố giới hạn và xử lý import lặp, không suy ra độ phủ Việt Nam từ số ngân hàng toàn cầu. [32] [33] [34] [35]

**Money Manager by Realbyte, Monefy và 1Money** đáng học về nhập nhanh: ít trường bắt buộc, tài khoản và danh mục rõ, biểu đồ phản hồi ngay. Realbyte có backup và nhập Excel/TSV; Monefy mô tả nhập tay và sync file qua cloud của người dùng; 1Money công bố quick entry, ngân sách và cloud sync nhưng nhiều chi tiết import/reconciliation chưa được nguồn đọc xác nhận. Đừng làm MF đơn giản bằng cách bỏ đường khôi phục. [36] [37] [38] [39]

**Bluecoins** là benchmark trực tiếp cho trạng thái giao dịch, đối soát, import và Android notification/SMS capture. Đây là đọc tín hiệu xuất hiện trên điện thoại, không phải kết nối API lấy toàn bộ lịch sử ngân hàng; phụ thuộc quyền, mẫu thông báo và hệ điều hành. [40] [41]

**Rocket Money và Toshl Finance** cho thấy mô hình trả tiền cho tiện lợi: đồng bộ, báo cáo hoặc quản lý dữ liệu sâu hơn. Rocket công bố giới hạn ngân hàng/người dùng Mỹ. Toshl có VND trong danh sách tiền tệ nhưng điều đó không chứng minh ngân hàng Việt Nam được kết nối. [42] [43] [44] [45]

**Splitwise** giải quyết “ai nợ ai” trong nhóm, không phải toàn bộ số dư cá nhân. Học cách chia khoản chi, người trả và lịch sử sửa, nhưng đừng trộn công nợ nhóm với tiền thật đang nằm trong tài khoản. [46] [47]

**Firefly III** có sổ double-entry, importer riêng, đối soát theo sao kê và export. Tài liệu nhấn mạnh export không phải backup đầy đủ; nhiều người dùng cũng không đồng nghĩa cùng sửa một sổ với quyền chi tiết. Cùng với Actual, đây là nguồn học về quyền dữ liệu và logic, **không phải lý do phải thay kiến trúc MF sang self-hosting**. [48] [49] [50] [51]

## 3. Sáu cơ hội cần kiểm chứng với người Việt

### Biết phần nào của bức tranh đã đầy đủ

Các tài liệu sync/import cho thấy nguồn có thể thiếu lịch sử, cập nhật trễ hoặc cần nối lại. [19] [21] [32] [35] **Giả thuyết:** người dùng chấp nhận nhập file hoặc xác nhận tay nếu app nói thật phạm vi dữ liệu.

Thử với người đang dùng nhiều nguồn: hiển thị tài khoản, ngày dữ liệu gần nhất, khoảng lịch sử có được và khoản chưa giải quyết. Đo xem họ có biết số dư nào đáng tin và có tự xử lý phần thiếu không. Không đặt nhãn “đã đồng bộ đầy đủ” chỉ vì request thành công.

### Chuyển nội bộ, hoàn tiền và phí không làm méo báo cáo

Các app có transfer và trạng thái thanh toán cho thấy cần giữ nhiều phía của một sự kiện. [6] [16] [23] **Giả thuyết:** MF tạo giá trị nếu người dùng không phải tự tìm và sửa những khoản đếm đôi.

Thử các trường hợp chuyển khác ngày, chỉ có một đầu, phí riêng, nạp ví, thanh toán bằng nguồn liên kết, hoàn một phần. So sánh thời gian và lỗi với cách người dùng hiện làm, không chỉ kiểm tra số dòng import thành công.

### Tiếng Việt và VND phải dễ hiểu cả lúc sai

Đây là yêu cầu sản phẩm trong repo, nhưng chất lượng thực tế vẫn cần test. [1] Không chỉ đổi ký hiệu sang ₫: phải thử số lớn, dấu phân cách, ngày/kỳ và cách đọc nhãn lỗi.

**Giả thuyết:** “Chưa khớp sao kê”, “Có thể trùng”, “Chưa thấy giao dịch đối ứng” giúp người dùng xử lý tốt hơn thuật ngữ kỹ thuật. Kiểm tra bằng việc cho họ giải thích màn hình, không hỏi “có dễ hiểu không?”.

### Tự động hóa giảm tổng công sức, không chỉ giảm gõ

Receipt recognition và notification capture mở đường giảm nhập liệu, nhưng phát sinh lỗi nhận diện và phụ thuộc nguồn. [7] [41] **Giả thuyết:** gợi ý có xác nhận và học quy tắc từ quyết định người dùng giúp giảm công sức sau vài kỳ.

Đo tổng phút nhập, xem lại, sửa và đối soát. Nếu giảm gõ 10 phút nhưng tăng sửa 20 phút thì tính năng không thành công. Nhập tay phải tiếp tục hoạt động khi người dùng không cấp quyền hoặc nguồn hỏng.

### Riêng tư trong gia đình là một lựa chọn rõ

MISA chia sẻ chỉ đọc; Splitwise chia theo nhóm; các app khác có mô hình chia sẻ rộng hơn. [13] [46] **Giả thuyết:** một số hộ gia đình cần cùng quản lý khoản chung nhưng không muốn lộ mọi tài khoản riêng.

Chỉ thử sâu nếu phỏng vấn cho thấy nhu cầu. Prototype phải cho người dùng chọn phạm vi, hiểu người khác được sửa/xuất gì, và thu hồi quyền được. Không yêu cầu share password.

### Trả tiền cho giá trị lặp lại, không cho danh sách tính năng

Thị trường có freemium, thuê bao, mua một lần và mã nguồn mở. [8] [18] [42] [44] [48] Các mô hình tồn tại **không chứng minh người Việt sẵn sàng trả mức đó**.

Thử khả năng trả cho hỗ trợ import, giảm việc xem lại, kết nối có độ phủ xác minh hoặc cộng tác an toàn. Đo cùng chi phí vận hành và hỗ trợ. Một gói lifetime không tự phù hợp với tính năng có chi phí provider hàng tháng. Export cốt lõi nên được giữ như quyền rời sản phẩm, không phải công cụ khóa dữ liệu.

## 4. Áp dụng vào MF hiện tại: hoàn thiện, không xây lại

Clone đã đọc là `Thunderkill016/moneyflow`, commit `4ab78b763608251e4f6ff7053b6a9d0f030a9d6c`. Trong repo này là web Next.js/Neon; **không dùng kết luận này để khẳng định phần Flutter bạn đang làm ở nơi khác không tồn tại**. Báo cáo không kiểm thử bản Flutter đó.

Code MF đã có loader đối soát với `pending/cleared/reconciled`, số dư sao kê và chênh lệch. Trang rules đã có workspace, mô tả xem trước và phiên bản áp dụng. Điều này chứng minh có các lớp triển khai trong source, không chứng minh mọi cấu hình production đã hoạt động đúng. [3] [4]

**Ưu tiên đề xuất:**

1. **Khép kín luồng cốt lõi.** Ghi → sửa → chuyển → xem báo cáo → đối soát → xuất/khôi phục. Kiểm tra cả lỗi và đường quay lại, không chỉ nút Lưu.

1. **Làm import/Inbox đáng tin hơn.** Giữ nguồn gốc, phiên bản parser, lỗi từng dòng, chống trùng và liên kết transfer. Quy tắc có xem trước, phạm vi rõ, lịch sử và đường sửa.

1. **Báo cáo truy được về giao dịch.** Mỗi tổng quan phải cho biết khoảng dữ liệu, tài khoản được tính và phần chưa xác nhận; bấm vào được các giao dịch tạo nên số đó.

1. **Nối thêm nguồn sau khi đo được giá trị.** Thử ít ngân hàng/định dạng trước, có quyền hợp lệ, cơ chế ngắt và fallback. Không tạo một “sổ thứ hai” ngoài contract chung.

1. **Mở rộng ngân sách, nghĩa vụ hoặc cộng tác theo nhu cầu đã quan sát.** Không đưa wealth, AI adviser hoặc mọi module của đối thủ vào lịch ra mắt.

Đây là thứ tự phụ thuộc để thảo luận, không phải lịch triển khai hay thay đổi repo đã được thực hiện. Đặc biệt, **không công bố “còn được chi bao nhiêu” chỉ từ tổng số dư** khi thiếu nghĩa vụ, dự phòng, tính thanh khoản và phạm vi dữ liệu. [2]

## 5. Ba thử nghiệm nhỏ trước khi mở rộng

**Thử nghiệm 1 — Khép kín một kỳ tài chính.** Người dùng có hai nguồn dữ liệu nhập một tập giao dịch đã ẩn danh, xử lý trùng và chuyển nội bộ, đối soát rồi xuất dữ liệu. Đo tổng công sức, khoản chưa giải quyết và khả năng tìm lại bằng chứng. Dùng đúng flow MF đang có làm baseline.

**Thử nghiệm 2 — Chuyển tiền không đếm đôi.** Cho các tình huống tiền đến khác ngày, QR trả merchant, phí và hoàn tiền. Không nói trước giao dịch thuộc loại nào. Đo lỗi phân loại, ảnh hưởng báo cáo và thời gian sửa. Nếu dữ liệu không đủ, đáp án đúng có thể là “cần xác nhận”, không phải buộc tự động quyết định.

**Thử nghiệm 3 — Mở nguồn dữ liệu mà không mở quá nhiều quyền.** So sánh ghi tay, paste/share và import file trên cùng tình huống. Nếu thử notification hoặc provider, dùng opt-in riêng và cho ngắt quyền. Chỉ giữ channel giảm tổng công sức mà không làm tăng lỗi hoặc quyền thu thập không cần thiết.

Các cỡ mẫu hoặc ngưỡng đạt cần chọn theo giai đoạn, độ biến thiên và baseline. Không dùng một con số tùy ý như 80% hay 10 giây làm chuẩn đã được MF chấp thuận.

## 6. Câu hỏi phỏng vấn và bài test có thể dùng ngay

### 10 câu hỏi phỏng vấn

1. Lần gần nhất cần biết tiền của mình đang ở đâu, bạn đã làm thế nào?

1. Bạn đang dùng những nguồn nào để theo dõi tiền? Nguồn nào khó lấy dữ liệu nhất?

1. Kể một lần số dư hoặc giao dịch không khớp. Bạn tìm nguyên nhân ra sao?

1. Bạn lưu khoản tiền mặt, chuyển khoản và hoàn tiền như thế nào?

1. Khi xem sao kê, bạn phân biệt chi tiêu với chuyển nội bộ bằng cách nào?

1. Lần gần nhất bỏ cập nhật sổ tiền, điều gì đã xảy ra?

1. Nếu app và sao kê khác nhau, bạn kiểm tra gì đầu tiên?

1. Bạn đã chia sẻ dữ liệu tài chính với ai? Họ cần xem hoặc sửa phần nào?

1. Bạn từng cho ứng dụng đọc dữ liệu tài chính chưa? Vì sao chấp nhận hoặc từ chối?

1. Bạn đã trả hoặc quyết định không trả tiền cho công cụ nào? Điều gì quyết định lựa chọn?

Hỏi về hành vi đã xảy ra, không hỏi chung “bạn có muốn AI/tự động đồng bộ không?”.

### 6 bài test thao tác

- Ghi khoản ăn trưa 45.000đ rồi tìm lại và sửa tài khoản trả tiền.

- Ghi chuyển 500.000đ giữa hai tài khoản của mình và giải thích báo cáo thay đổi thế nào.

- Xử lý file nhỏ có một khoản mới, một dòng trùng và một chuyển tiền thiếu đầu đối ứng.

- Đối soát tài khoản có một khoản chờ và số dư sao kê lệch; tìm cách sửa mà không che nguyên nhân.

- Từ một số tổng trên báo cáo, tìm những giao dịch đã tạo ra số đó.

- Xuất dữ liệu, tìm cách khôi phục và nơi yêu cầu xóa tài khoản; nếu có sharing, thử thu hồi quyền.

Đo **kỳ dữ liệu đáng tin được duy trì**, tổng phút chăm sổ, tỷ lệ sửa/trùng/chưa giải quyết, khả năng khôi phục và sự hiểu đúng về nguồn dữ liệu. Retention quan trọng, nhưng thời gian ở trong app càng nhiều không nhất thiết càng tốt: MF hướng tới giảm công sức duy trì. [2]

## 7. Ràng buộc Android cần đưa vào quyết định sản phẩm

Google Play có ngoại lệ xem xét **SMS-based money management**, nhưng phải đáp ứng điều kiện, khai báo và được duyệt; không có bảo đảm MF sẽ được cấp quyền. Không chọn đọc SMS làm nền tảng mặc định trước khi đánh giá điều kiện. Không thu OTP hoặc nội dung không cần thiết cho chức năng. [52]

Android 15 che nội dung thông báo có phát hiện OTP khỏi `NotificationListenerService` không tin cậy. Điều này không nói mọi thông báo ngân hàng đều bị che, nhưng đủ để **không hứa đọc được toàn bộ thông báo**. [53]

Nếu app tạo tài khoản, Google Play yêu cầu có đường yêu cầu xóa trong app và bên ngoài app qua tài nguyên web. Thu thập dữ liệu nhạy cảm ngoài kỳ vọng cần disclosure nổi bật và consent phù hợp; quyền đọc notification không tự thay thế bước giải thích dữ liệu nào được xử lý, lưu bao lâu và gửi đi đâu. [54]

Native Android/Flutter có thể cần cho capability web không đáp ứng ổn định. Nhưng lựa chọn này nên dựa trên nhu cầu thực tế như offline/capture, không chỉ vì đối thủ có APK. Backend và sổ giao dịch vẫn cần chung logic để không sinh hai phiên bản sự thật.

## Tài liệu tham chiếu

[1]: https://github.com/Thunderkill016/moneyflow/blob/4ab78b763608251e4f6ff7053b6a9d0f030a9d6c/docs/product/PRINCIPLES.md "MF product principles"
[2]: https://github.com/Thunderkill016/moneyflow/blob/4ab78b763608251e4f6ff7053b6a9d0f030a9d6c/docs/product/PRODUCT_STRATEGY.md "MF product strategy"
[3]: https://github.com/Thunderkill016/moneyflow/blob/4ab78b763608251e4f6ff7053b6a9d0f030a9d6c/src/server/reconciliation.ts "MF reconciliation implementation"
[4]: https://github.com/Thunderkill016/moneyflow/blob/4ab78b763608251e4f6ff7053b6a9d0f030a9d6c/src/app/rules/page.tsx "MF rules workspace"
[5]: https://apps.apple.com/us/app/money-lover-money-manager/id486312413 "Money Lover App Store"
[6]: https://moneylover.zendesk.com/hc/en-us/articles/900000358523-Transfer-money-between-wallets "Money Lover internal transfers"
[7]: https://moneylover.zendesk.com/hc/en-us/articles/58779737086489-Turn-Receipts-into-Transactions-in-Seconds-in-MoneyLover-New-feature "Money Lover receipt capture"
[8]: https://web.moneylover.me/store/ "Money Lover plans and entitlements"
[9]: https://moneylover.zendesk.com/hc/en-us/articles/34972671048985-Definition-of-wallets-in-MoneyLover "Money Lover linked-wallet semantics"
[10]: https://moneykeeper.misa.vn/ "MISA MoneyKeeper product"
[11]: https://apps.apple.com/vn/app/spending-tracker-money-manager/id865818973 "MISA App Store Vietnam"
[12]: https://helpmoneykeeper.misa.vn/quan-ly-tai-khoan-tren-so-thu-chi-misa/ "MISA account management"
[13]: https://helpmoneykeeper.misa.vn/chia-se-tai-khoan/ "MISA read-only sharing"
[14]: https://www.momo.vn/quan-ly-chi-tieu "MoMo expense management"
[15]: https://www.momo.vn/dieu-khoan-dieu-le "MoMo payment-account terms"
[16]: https://zalopay.vn/dich-vu/faq "ZaloPay payment history and pending states"
[17]: https://zalopay.vn/dich-vu/chinh-sach-hoan-huy-va-boi-hoan "ZaloPay refunds and provider processing"
[18]: https://www.ynab.com/ynab-method "YNAB planning method"
[19]: https://www.ynab.com/pricing "YNAB plans and Direct Import geography"
[20]: https://goodbudget.com/what-you-get/ "Goodbudget envelopes and household budgets"
[21]: https://goodbudget.com/help/automatic-bank-sync/the-timing-of-automatically-imported-transactions/ "Goodbudget pending cleared and matching"
[22]: https://actualbudget.org/docs/transactions/importing "Actual file imports and deduplication"
[23]: https://actualbudget.org/docs/transactions/transfers "Actual paired transfers"
[24]: https://actualbudget.org/docs/accounts/reconciliation/ "Actual reconciliation"
[25]: https://help.monarchmoney.com/hc/en-us/articles/360048393372-Transaction-Rules "Monarch rules and preview"
[26]: https://help.monarchmoney.com/hc/en-us/articles/360058441811-Creating-Manual-Transactions "Monarch manual records and reconciliation limit"
[27]: https://help.monarchmoney.com/hc/en-us/articles/4409682789908-Import-Transaction-Data-Manually-from-Banks-or-Other-Finance-Apps "Monarch CSV overlap and undo limitations"
[28]: https://help.monarchmoney.com/hc/en-us/articles/360048393552-International-Accounts-and-Currency "Monarch currency limitations"
[29]: https://help.copilot.money/en/articles/11157550-quick-start-guide "Copilot review workflow"
[30]: https://help.copilot.money/en/articles/3971255-venmo-integration-faq "Copilot Venmo receipt integration"
[31]: https://www.copilot.money/faq "Copilot scope and product identity"
[32]: https://support.budgetbakers.com/hc/en-us/articles/7076796545554-Connect-disconnect-or-reconnect-your-bank "Wallet bank connection and reauthorization"
[33]: https://support.budgetbakers.com/hc/en-us/articles/7148334559762-Bank-Transfers "Wallet transfer matching"
[34]: https://help.spendee.com/article/121-import-transactions "Spendee import limits and duplicates"
[35]: https://help.spendee.com/article/140-sync-my-bank-account-with-spendee "Spendee bank sync and 2FA limits"
[36]: https://help.realbyteapps.com/hc/en-us/articles/360042701994-How-to-add-an-income-expense "Realbyte manual-entry workflow"
[37]: https://help.realbyteapps.com/hc/en-us/articles/360043223253-How-to-import-bulk-data-by-Excel-file "Realbyte import and backup distinction"
[38]: https://monefy.com/help-center "Monefy entry and cloud-file synchronization"
[39]: https://1moneyapp.com/ "1Money published features"
[40]: https://www.bluecoinsapp.com/guide/reconcile/ "Bluecoins reconciliation"
[41]: https://www.bluecoinsapp.com/guide/bank-notifications/ "Bluecoins notification and SMS capture"
[42]: https://help.rocketmoney.com/en/articles/2677184-premium-membership-features "Rocket Money Premium features"
[43]: https://help.rocketmoney.com/en/articles/79778-does-rocket-money-support-international-banks "Rocket Money international limitations"
[44]: https://toshl.com/pricing/ "Toshl subscriptions"
[45]: https://toshl.com/it/valute/ "Toshl currency list including VND"
[46]: https://play.google.com/store/apps/details?id=com.Splitwise.SplitwiseMobile&hl=en_US "Splitwise group-expense features"
[47]: https://apps.apple.com/us/app/splitwise/id458023433 "Splitwise expense splits and edit history"
[48]: https://github.com/firefly-iii/firefly-iii "Firefly III product and license"
[49]: https://docs.firefly-iii.org/how-to/firefly-iii/finances/reconcile/ "Firefly III statement reconciliation"
[50]: https://docs.firefly-iii.org/tutorials/firefly-iii/exporting-data/ "Firefly III export is not backup"
[51]: https://docs.firefly-iii.org/how-to/firefly-iii/features/multi-user/ "Firefly III multi-user limitations"
[52]: https://support.google.com/googleplay/android-developer/answer/10208820?hl=en#zippy=%2Cexceptions "Google Play SMS exceptions"
[53]: https://developer.android.com/about/versions/15/behavior-changes-all "Android notification OTP redaction"
[54]: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en "Google Play user-data consent and account deletion"
