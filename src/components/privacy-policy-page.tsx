import Link from "next/link";

/**
 * Public privacy policy (TASK-110).
 * Plain Vietnamese product copy — not competitor legalese.
 */
export function PrivacyPolicyPage() {
  return (
    <div className="landing-page privacy-policy-page">
      <nav className="landing-nav" aria-label="Điều hướng quyền riêng tư">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang chủ">
          <span className="brand-mark">
            <span />
          </span>
          <span>MoneyFlow</span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-link">
            Đăng nhập
          </Link>
          <Link href="/register" className="primary-button landing-nav-cta">
            Tạo tài khoản
          </Link>
        </div>
      </nav>

      <main className="privacy-policy-main">
        <header className="privacy-policy-header">
          <p className="landing-eyebrow">Quyền riêng tư</p>
          <h1>Chính sách quyền riêng tư</h1>
          <p className="privacy-policy-lead">
            MoneyFlow là ứng dụng quản lý thu chi cá nhân. Trang này giải thích ngắn gọn chúng tôi
            thu thập gì, lưu thế nào, và bạn kiểm soát dữ liệu ra sao — bằng tiếng Việt, không
            vòng vo.
          </p>
          <p className="privacy-policy-updated">Cập nhật: tháng 7/2026</p>
        </header>

        <div className="privacy-policy-body">
          <section className="privacy-policy-section" aria-labelledby="privacy-data">
            <h2 id="privacy-data">Dữ liệu chúng tôi thu thập</h2>
            <ul>
              <li>
                <strong>Tài khoản:</strong> email và thông tin đăng nhập do bạn cung cấp (qua
                nhà cung cấp xác thực).
              </li>
              <li>
                <strong>Dữ liệu thu chi:</strong> giao dịch, tài khoản/ví, danh mục, ngân sách,
                mục tiêu, cam kết chi — số tiền lưu dạng số nguyên (đồng), không dùng số thập
                phân “lỏng” cho tiền.
              </li>
              <li>
                <strong>Nội dung bạn dán/tải lên (tùy chọn):</strong> văn bản hoặc file sao kê
                để tách ứng viên giao dịch. Không bắt buộc để dùng ghi tay.
              </li>
              <li>
                <strong>Tùy chọn thiết bị:</strong> giao diện, thời gian giữ draft import đã
                parse và trạng thái onboarding — thường lưu trên trình duyệt.
              </li>
              <li>
                <strong>Sự kiện sản phẩm tối thiểu:</strong> đếm hành động (ví dụ đã paste/upload)
                không kèm nội dung sao kê thô hay số dư chi tiết trong log/analytics.
              </li>
            </ul>
          </section>

          <section className="privacy-policy-section" aria-labelledby="privacy-no-bank">
            <h2 id="privacy-no-bank">Không mật khẩu ngân hàng</h2>
            <p>
              MoneyFlow <strong>không</strong> hỏi, lưu hay yêu cầu mật khẩu internet banking,
              OTP, hay liên kết Open Banking. Bạn chủ động ghi tay, dán text, hoặc tải file bạn
              chọn — không thu thập SMS ngân hàng, không “đọc tài khoản” ngầm.
            </p>
          </section>

          <section className="privacy-policy-section" aria-labelledby="privacy-rls">
            <h2 id="privacy-rls">Phân tách dữ liệu (RLS)</h2>
            <p>
              Khi dùng tài khoản đã đăng nhập, dữ liệu tài chính của bạn được lưu phía máy chủ
              với chính sách <strong>Row Level Security (RLS)</strong>: mỗi hàng gắn với người
              dùng; người khác không đọc được sổ của bạn qua API thông thường. Chế độ demo chỉ
              lưu trên trình duyệt của bạn, không đồng bộ sổ demo lên máy chủ như tài khoản
              thật.
            </p>
          </section>

          <section className="privacy-policy-section" aria-labelledby="privacy-retention">
            <h2 id="privacy-retention">Lưu trữ &amp; thời gian giữ</h2>
            <ul>
              <li>
                Giao dịch và cấu hình sổ (đã đăng nhập) được giữ khi tài khoản còn hoạt động,
                trừ khi bạn xóa hoặc yêu cầu xóa.
              </li>
              <li>
                MoneyFlow không lưu file import gốc. Các dòng đã parse và đoạn mô tả ngắn chỉ
                được giữ trong phiên xem trước, hoặc tối đa 7/30 ngày theo lựa chọn trong Cài
                đặt → Quyền riêng tư; draft hết hạn được tự xóa khi ứng dụng được mở lại.
              </li>
              <li>
                Chia sẻ mẫu ẩn danh để cải thiện bộ phân tích (nếu có) là <strong>tắt mặc
                định</strong> — chỉ bật khi bạn chủ động đồng ý.
              </li>
            </ul>
          </section>

          <section className="privacy-policy-section" aria-labelledby="privacy-export">
            <h2 id="privacy-export">Xuất dữ liệu &amp; xóa</h2>
            <ul>
              <li>
                <strong>Xuất:</strong> bạn có thể xuất CSV/JSON từ Cài đặt → Xuất dữ liệu (và
                đường dẫn từ Tổng quan / Báo cáo khi có).
              </li>
              <li>
                <strong>Xóa trên thiết bị:</strong> xóa tài khoản / xóa dữ liệu local xóa các
                store trên trình duyệt (inbox, draft import, tùy chọn, v.v.).
              </li>
              <li>
                <strong>Xóa phía máy chủ:</strong> luồng xóa trong app yêu cầu xác nhận, xóa tài
                khoản Supabase và kiểm tra lại dữ liệu tenant. Nếu việc kiểm tra không hoàn tất,
                ứng dụng hiển thị trạng thái chưa xác minh thay vì tuyên bố đã xóa sạch.
              </li>
            </ul>
          </section>

          <section className="privacy-policy-section" aria-labelledby="privacy-contact">
            <h2 id="privacy-contact">Liên hệ</h2>
            <p>
              Câu hỏi về quyền riêng tư hoặc yêu cầu liên quan dữ liệu cá nhân:{" "}
              <a href="mailto:support@moneyflow.app">support@moneyflow.app</a>
              . Vui lòng <strong>không</strong> gửi mật khẩu ngân hàng hay dán raw sao kê đầy
              đủ trong email hỗ trợ.
            </p>
            <p>
              Trong app:{" "}
              <Link href="/settings/privacy">Cài đặt → Quyền riêng tư</Link>,{" "}
              <Link href="/settings/export">Xuất dữ liệu</Link>,{" "}
              <Link href="/settings/delete-account">Xóa tài khoản</Link>.
            </p>
          </section>
        </div>

        <p className="privacy-policy-back">
          <Link href="/">← Về trang chủ</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/register">Tạo tài khoản</Link>
        </p>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <span />
            </span>
            <span>MoneyFlow</span>
          </Link>
          <nav className="landing-footer-links" aria-label="Liên kết">
            <Link href="/login">Đăng nhập</Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy">Riêng tư</Link>
            <span aria-hidden="true">·</span>
            <Link href="/register">Đăng ký</Link>
          </nav>
          <p>
            © {new Date().getFullYear()} MoneyFlow. Dữ liệu của bạn — rõ ràng, bình tĩnh, của
            bạn.
          </p>
        </div>
      </footer>
    </div>
  );
}
