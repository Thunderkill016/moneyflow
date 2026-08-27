# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), đánh số theo
[Semantic Versioning](https://semver.org/lang/vi/). Cùng cách Firefly III làm — sản phẩm
mã nguồn mở gần giống MoneyFlow nhất về cấu trúc.

**`0.x` nghĩa là gì:** giao diện dữ liệu và API có thể đổi giữa hai bản minor. MoneyFlow
chưa sẵn sàng cho public beta, nên số hiệu phải nói đúng điều đó thay vì trấn an.

## [Chưa phát hành]

### Bảo mật

- `img-src` không còn cho phép `https:`. Trước đó **mọi host HTTPS trên internet** đều là
  nguồn ảnh hợp lệ; đo trên production thì toàn bộ ảnh và font đều đến từ chính origin của
  app (3 ảnh, 12 font, không có bên thứ ba nào). `data:` và `blob:` giữ lại vì hoá đơn tải
  lên được xem trước ngay trên máy.
- `'unsafe-inline'` trong `script-src` được **giữ lại có chủ đích và ghi rõ lý do ngay tại
  chỗ**: thay bằng nonce thì Next bắt buộc render động, tức 35 trong 51 tuyến đang tĩnh sẽ
  thành lời gọi hàm mỗi request.

## [0.1.0] — 2026-08-27

Bản gắn thẻ đầu tiên sau **530 commit**.

**Lịch sử trước mốc này không được dựng lại ở đây, và đó là chủ ý.** Viết một
changelog hồi tố cho 530 commit là bịa. Xuất xứ từng thay đổi nằm ở
`docs/research/pr-memory/YYYY/QN/PR-<số>.md` — **182 bản ghi**, mỗi bản ghi kèm bằng chứng
đã kiểm và giới hạn còn lại. Đó mới là hồ sơ thật; mục dưới đây chỉ mô tả *trạng thái tại
thời điểm gắn thẻ*.

### Sản phẩm

- Sổ thu chi cá nhân tiếng Việt, nhập tay là chính, có hỗ trợ import.
- VND lưu bằng số nguyên đồng; chuyển khoản không bao giờ tính là thu hay chi.
- Hai chế độ chạy tách bạch qua `NEXT_PUBLIC_APP_MODE`: `demo` lưu trên trình duyệt,
  `authenticated` dùng Supabase Auth + PostgreSQL có RLS.
- Sao lưu đầy đủ có phiên bản và khôi phục vào tài khoản mới, tại `/settings/backup`.

### Chất lượng đã đo được, không phải tuyên bố

- **WCAG 2.2 AA: 0 vi phạm** trên 22 trang × 2 theme × 2 khổ màn, đo bằng `axe-core` 4.13,
  có cổng chặn tái phát chạy ở mọi PR (#499).
- **Hiệu năng production:** LCP mobile 2,4 s, CLS 0, TBT 140 ms; Lighthouse 96/100/100/100.
- **1.224 unit test**, 43 spec e2e, audit 14 khổ màn, `restore_user_archive` có 42 assertion
  pgTAP chạy ở mọi lượt CI.
- **0 lỗ hổng phụ thuộc**; 7 header bảo mật gồm CSP, HSTS preload, `frame-ancestors: none`.

### Vận hành

- `GET /api/health` nông, không cache, mang mã build (#498).
- Mã build hiện trong app tại `/security`, lấy từ commit của bản dựng (#498).
- Giám sát production 15 phút một lượt; run đỏ thì GitHub thông báo (#500).
- Mọi GitHub Action ghim bằng SHA đầy đủ, có cổng chặn (#501).

### Giấy phép và môi trường

- AGPL-3.0-only, theo Firefly III (#498).
- Node 22 ghim ở `engines`, `.nvmrc` và CI. Log build production xác nhận `engines` ghi đè
  cài đặt dự án Vercel, nên bản dựng thật chạy đúng 22.x.

### Chưa xong, nói rõ

- **Chưa sẵn sàng public beta.** Còn mở: RRB-03 (cạnh xoá cần xác thực lại),
  RRB-04 (đọc ngược provider), RRB-06 (rà soát pháp lý dữ liệu cá nhân Việt Nam),
  RRB-09 (định danh triển khai production).
- Khôi phục **chưa từng chạy trên Supabase quản lý** — chỉ chạy trên Postgres nội bộ ở CI.
  Đây là giới hạn đã chấp nhận (RRB-02), không phải đã chứng minh.
- Địa chỉ hỗ trợ là hộp thư cá nhân của chủ dự án: đọc được, nhưng không có hộp thư chung,
  không alias, không bàn giao được (RRB-05).
- Chưa quét tiếp cận ở các màn chỉ có khi đăng nhập thật; `axe` cũng chỉ bắt được khoảng
  một nửa số tiêu chí WCAG và **không thay được người dùng trình đọc màn hình**.
- CSP còn `'unsafe-inline'` cho `script-src`.

[Chưa phát hành]: https://github.com/Thunderkill016/moneyflow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Thunderkill016/moneyflow/releases/tag/v0.1.0
