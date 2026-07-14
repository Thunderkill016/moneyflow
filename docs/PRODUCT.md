# MoneyFlow — Product focus

## Mục tiêu thật (ưu tiên #1)

> Xây web để **bạn** quản lý **thu nhập** và **chi tiêu** của chính mình.

Câu hỏi lõi:

**Hôm nay mình có thể chi bao nhiêu?**

---

## Đang làm gì (now)

Giữ và hoàn thiện những thứ phục vụ dùng hàng ngày:

| Việc | Trạng thái gần đúng |
|---|---|
| Đăng nhập / lưu data (Supabase) | Có |
| Tài khoản (tiền mặt, NH, ví…) | Có |
| Thêm chi / thu | Có |
| Sửa / xóa giao dịch | Có |
| Chuyển khoản nội bộ | Có |
| Dashboard “có thể chi hôm nay” | Có |
| Ngân sách theo danh mục | Có |
| Hóa đơn định kỳ (commitments) | Có |
| Mục tiêu tiết kiệm | Có |
| Báo cáo + export CSV | Có |

**Ưu tiên tiếp theo = dùng thật cho bản thân**, không phải thêm vision lớn:

1. App ổn định khi bạn ghi chi tiêu mỗi ngày.
2. Số liệu đúng (tiền integer, transfer cân, không double-count).
3. Nhập thu/chi **nhanh**, mobile ổn (học Actual/Firefly/YNAB: chọn ngày, nhớ form, phím `N`, lưu & thêm tiếp).
4. Privacy cơ bản nếu data là tiền thật (đổi mật khẩu, không lộ key).

- Nghiên cứu đối thủ & OSS: [`COMPETITOR_AND_OSS_RESEARCH.md`](./COMPETITOR_AND_OSS_RESEARCH.md)  
- Thiết kế lại Inbox-first: [`UX_RESEARCH_AND_REDESIGN.md`](./UX_RESEARCH_AND_REDESIGN.md)  
- Wireframe 24 màn: [`wireframes-inbox.md`](./wireframes-inbox.md)

---

## Không làm bây giờ (later / archive)

Những ý trong `RESEARCH_PRODUCT_STRATEGY.md` (Universal Inbox, parser sao kê, Android notification, B2B API, GTM…) là **ghi chú tham khảo**, **không phải roadmap hiện tại**.

Chỉ xem xét lại khi:

- Bạn đã dùng app ≥ 2–4 tuần cho tiền thật, **và**
- Nhập tay trở thành bottleneck rõ ràng.

---

## Nguyên tắc đơn giản

1. **Dùng được cho mình trước** > tính năng “hay trên giấy”.
2. **Thu + chi + số dư đúng** > biểu đồ đẹp.
3. **Ít màn hình, rõ việc** > clone full YNAB/Money Lover.
4. Mỗi PR trả lời: *“Cái này giúp tao quản lý tiền tao thế nào?”*

---

## Khi nào coi là “ổn để dùng mỗi ngày”

- [ ] Login được, data không mất
- [ ] Thêm chi tiêu < 10 giây trên điện thoại
- [ ] Thấy tổng tiền + có thể chi hôm nay
- [ ] Sửa sai một giao dịch không làm hỏng sổ
- [ ] Export CSV khi cần
- [ ] Bạn thực sự mở app thay vì Excel/ghi chú trong ≥ 1 tuần
