import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * Landing — G5 thu chi. Fintech CRO + Calm Finance green.
 * Server Component for LCP — no "use client".
 */
export function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Điều hướng trang chủ">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang chủ">
          <span className="brand-mark">
            <span />
          </span>
          <span>MoneyFlow</span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-link landing-nav-login">
            Đăng nhập
          </Link>
          <Link href="/register" className="primary-button landing-nav-cta">
            Bắt đầu miễn phí
          </Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">Quản lý thu chi cá nhân</p>
          <h1 className="landing-hero-title">
            Biết hôm nay
            <br />
            có thể chi bao nhiêu
          </h1>
          <p className="landing-lead">
            Ghi thu chi trong vài giây, theo dõi nhiều ví, thấy rõ tháng này tiền đi đâu.{" "}
            <strong>Bình tĩnh, rõ ràng</strong> — không ép zero-based, không quảng cáo trong
            luồng chính.
          </p>
          <ul className="landing-trust-bar" aria-label="Cam kết tin cậy">
            <li>
              <Icon name="lock" size={14} />
              <span>Data của bạn</span>
            </li>
            <li>
              <Icon name="arrowDown" size={14} />
              <span>Xuất CSV</span>
            </li>
            <li>
              <Icon name="check" size={14} />
              <span>Không mật khẩu NH</span>
            </li>
          </ul>
          <div className="landing-hero-ctas">
            <Link href="/register" className="cta-primary">
              Dùng miễn phí
              <Icon name="arrowRight" size={16} />
            </Link>
            <Link href="/insights" className="cta-secondary">
              Thử demo không cần tài khoản
            </Link>
          </div>
        </div>

        <div className="landing-hero-preview" aria-hidden="true">
          <div className="preview-dash-card">
            <div className="preview-dash-safe">
              <p className="preview-dash-safe-label">Có thể chi hôm nay</p>
              <p className="preview-dash-safe-amount font-mono">392.000 ₫</p>
              <p className="preview-dash-safe-hint">
                Đã trừ hóa đơn giữ trước và quỹ tiết kiệm.
              </p>
            </div>
            <div className="preview-dash-stats">
              <div className="preview-dash-stat income">
                <span>Thu tháng này</span>
                <strong className="font-mono">+25.000.000 ₫</strong>
              </div>
              <div className="preview-dash-stat expense">
                <span>Chi tháng này</span>
                <strong className="font-mono">−8.420.000 ₫</strong>
              </div>
            </div>
            <ul className="preview-dash-list">
              <li className="preview-dash-row">
                <span className="preview-dash-icon food">ĂU</span>
                <div className="preview-dash-row-main">
                  <strong>Cà phê sáng</strong>
                  <small>Ăn uống · Tiền mặt</small>
                </div>
                <span className="preview-money expense font-mono">−45.000 ₫</span>
              </li>
              <li className="preview-dash-row">
                <span className="preview-dash-icon pay">L</span>
                <div className="preview-dash-row-main">
                  <strong>Lương tháng 7</strong>
                  <small>Thu nhập · Techcombank</small>
                </div>
                <span className="preview-money income font-mono">+25.000.000 ₫</span>
              </li>
              <li className="preview-dash-row">
                <span className="preview-dash-icon move">CK</span>
                <div className="preview-dash-row-main">
                  <strong>Chuyển quỹ tiết kiệm</strong>
                  <small>Chuyển khoản · không tính chi</small>
                </div>
                <span className="preview-money transfer font-mono">↔ 2.000.000 ₫</span>
              </li>
            </ul>
            <div className="preview-dash-foot">
              <span>3 ví · Ngân sách Ăn uống còn 62%</span>
              <span className="preview-dash-cta">+ Ghi khoản chi</span>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-proof-strip" aria-label="Vì sao MoneyFlow">
        <ul className="landing-proof-list">
          <li>
            <strong className="font-mono">{"< 10s"}</strong>
            <span>Ghi khoản chi quen</span>
          </li>
          <li>
            <strong>CK ≠ chi</strong>
            <span>Chuyển ví không làm lệch báo cáo</span>
          </li>
          <li>
            <strong>CSV</strong>
            <span>Xuất bất cứ lúc nào — không lock-in</span>
          </li>
          <li>
            <strong>0 bank</strong>
            <span>Không hỏi mật khẩu ngân hàng</span>
          </li>
        </ul>
      </section>

      <section className="landing-section landing-below-fold" aria-labelledby="how-heading">
        <div className="landing-section-heading">
          <p>Cách dùng</p>
          <h2 id="how-heading">Bốn bước, không cần học zero-based</h2>
          <span>Đủ để kiểm soát tiền hằng ngày — không biến thành phần mềm kế toán.</span>
        </div>
        <ol className="steps-grid steps-flow">
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              1
            </span>
            <h3>Thêm ví</h3>
            <p>Tiền mặt, ngân hàng, MoMo, thẻ… số dư ban đầu một lần là xong.</p>
          </li>
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              2
            </span>
            <h3>Ghi nhanh</h3>
            <p>Số tiền + danh mục. Nhớ ví và loại lần trước. Dưới mười giây cho khoản quen.</p>
          </li>
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              3
            </span>
            <h3>Nhìn tổng quan</h3>
            <p>Còn bao nhiêu, thu/chi tháng này, chi nhiều nhất ở đâu, sắp đến hạn gì.</p>
          </li>
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              4
            </span>
            <h3>Ngân sách & xuất</h3>
            <p>Hạn mức theo danh mục. Báo cáo tháng. Xuất CSV khi cần mang về Excel.</p>
          </li>
        </ol>
      </section>

      <section
        className="landing-section landing-section-alt landing-below-fold"
        aria-labelledby="who-heading"
      >
        <div className="landing-section-heading">
          <p>Dành cho ai</p>
          <h2 id="who-heading">Đơn giản với người mới, đủ cho người dùng Sheet</h2>
          <span>Không phán xét. Không gamification sến. Không khóa core sau paywall.</span>
        </div>
        <ul className="fit-grid">
          <li className="fit-card">
            <Icon name="wallet" size={22} />
            <h3>Nhiều ví thật</h3>
            <p>Tiền mặt + ngân hàng + ví điện tử. Chuyển khoản nội bộ không bị tính là chi tiêu.</p>
          </li>
          <li className="fit-card">
            <Icon name="table" size={22} />
            <h3>Đang dùng Excel</h3>
            <p>Ghi trên điện thoại cho nhanh, cuối tháng export CSV — không dual-entry mãi.</p>
          </li>
          <li className="fit-card">
            <Icon name="edit" size={22} />
            <h3>Từng bỏ app chi tiêu</h3>
            <p>Vì nhập mệt hoặc ads. MoneyFlow tối ưu đường ghi nhanh và free core thật.</p>
          </li>
        </ul>
      </section>

      <section
        className="landing-section landing-below-fold"
        aria-labelledby="features-heading"
      >
        <div className="landing-section-heading">
          <p>Tính năng cốt lõi</p>
          <h2 id="features-heading">Một chỗ cho thu chi hằng ngày</h2>
          <span>Chỉ những gì bạn thật sự dùng mỗi ngày — không phình feature.</span>
        </div>
        <ul className="feature-grid feature-grid-core">
          <li className="feature-card-landing">
            <Icon name="plus" size={22} />
            <h3>Thu · Chi · Chuyển</h3>
            <p>Ba loại rõ. Sửa/xóa an toàn. Số nguyên đồng. Chuyển ví không tính chi.</p>
          </li>
          <li className="feature-card-landing">
            <Icon name="target" size={22} />
            <h3>Có thể chi hôm nay</h3>
            <p>Số dư khả dụng sau khi giữ trước hóa đơn và mục tiêu — một con số quyết định.</p>
          </li>
          <li className="feature-card-landing">
            <Icon name="chart" size={22} />
            <h3>Tháng này tiền đi đâu</h3>
            <p>Thu vs chi, top danh mục, báo cáo tháng. Biểu đồ phục vụ quyết định.</p>
          </li>
          <li className="feature-card-landing">
            <Icon name="arrowDown" size={22} />
            <h3>Xuất & riêng tư</h3>
            <p>CSV của bạn. Không lock-in. Không mật khẩu ngân hàng. Xóa tài khoản được.</p>
          </li>
        </ul>
      </section>

      {/* Single trust section only — do not duplicate */}
      <section
        className="landing-section landing-section-alt landing-below-fold landing-trust-section"
        aria-labelledby="trust-heading"
        data-landing-section="trust"
      >
        <div className="landing-section-heading">
          <p>Tin cậy</p>
          <h2 id="trust-heading">Thiết kế bình tĩnh với tiền của bạn</h2>
          <span>Không “AI thần thánh”. Không guilt trip khi chi một ly cà phê.</span>
        </div>
        <ul className="trust-grid">
          <li>
            <Icon name="check" size={20} />
            <div>
              <strong>Sổ đúng trước khi “thông minh”</strong>
              <p>Chuyển khoản cân hai phía. Soft delete. Không float cho số tiền.</p>
            </div>
          </li>
          <li>
            <Icon name="lock" size={20} />
            <div>
              <strong>Không liên kết ngân hàng (MVP)</strong>
              <p>Bạn chủ động ghi. Không phụ thuộc open banking hay OTP.</p>
            </div>
          </li>
          <li>
            <Icon name="arrowDown" size={20} />
            <div>
              <strong>Export & xóa tài khoản</strong>
              <p>Mang data đi. Xóa khi không còn dùng. Quyền sở hữu rõ.</p>
            </div>
          </li>
          <li>
            <Icon name="spark" size={20} />
            <div>
              <strong>Tiếng Việt, mobile web</strong>
              <p>Dùng tốt trên điện thoại và máy tính. Dark mode có sẵn.</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="landing-cta-band" aria-labelledby="cta-band-heading">
        <h2 id="cta-band-heading">Bắt đầu bằng một khoản chi hôm nay</h2>
        <p>Miễn phí core. Không học phương pháp. Không liên kết ngân hàng.</p>
        <div className="landing-cta-band-actions">
          <Link href="/register" className="cta-primary">
            Tạo tài khoản miễn phí
            <Icon name="arrowRight" />
          </Link>
          <Link href="/insights" className="cta-secondary">
            Thử demo không cần tài khoản
          </Link>
        </div>
        <ul className="landing-trust-bar landing-trust-bar--cta" aria-label="Cam kết tin cậy">
          <li>
            <Icon name="lock" size={14} />
            <span>Data của bạn</span>
          </li>
          <li>
            <Icon name="arrowDown" size={14} />
            <span>Xuất CSV</span>
          </li>
          <li>
            <Icon name="check" size={14} />
            <span>Không mật khẩu NH</span>
          </li>
        </ul>
      </section>

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
            <a href="#how-heading">Cách dùng</a>
            <span aria-hidden="true">·</span>
            <a href="#features-heading">Tính năng</a>
          </nav>
          <p>
            © 2026 MoneyFlow. Quản lý thu chi cá nhân — rõ ràng, bình tĩnh, của bạn.
          </p>
        </div>
      </footer>
    </div>
  );
}
