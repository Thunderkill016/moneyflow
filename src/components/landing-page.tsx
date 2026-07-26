import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * Public product page. Copy must only promise behavior already proven in the
 * product. A numeric safe-to-spend claim remains withdrawn until MoneyFlow has
 * a validated monthly-plan or next-payday planning contract.
 */
export function LandingPage() {
  return (
    <div className="landing-page lp-root">
      <nav className="landing-nav lp-nav" aria-label="Điều hướng trang chủ">
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

      <header className="lp-hero">
        <div className="lp-hero-inner">
          <p className="landing-eyebrow lp-badge">
            <span className="lp-badge-dot" aria-hidden="true" />
            Quản lý thu chi cá nhân
          </p>

          <h1 className="landing-hero-title lp-hero-title">
            Ghi thu chi rõ ràng,
            <span className="lp-hero-gradient"> biết tiền đi đâu</span>
          </h1>

          <p className="landing-lead lp-hero-lead">
            Ghi giao dịch trong vài giây, theo dõi nhiều ví và xem thu–chi theo tháng. {" "}
            <strong>Dữ liệu quan sát được, không đoán số tiền nên tiêu.</strong>
          </p>

          <ul className="landing-trust-bar lp-hero-trust" aria-label="Cam kết tin cậy">
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

          <div className="landing-hero-ctas lp-hero-ctas">
            <Link href="/register" className="cta-primary lp-btn-lg">
              Dùng miễn phí
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link href="/insights" className="cta-secondary lp-btn-lg">
              Thử demo không cần tài khoản
            </Link>
          </div>
        </div>

        <div className="lp-showcase" aria-hidden="true">
          <div className="lp-showcase-glow" />
          <div className="preview-dash-card lp-showcase-card">
            <div className="preview-dash-safe">
              <p className="preview-dash-safe-label">Số dư trên các ví</p>
              <p className="preview-dash-safe-amount font-mono">10.000.000 ₫</p>
              <p className="preview-dash-safe-hint">
                Dữ liệu sổ thu chi — không phải hạn mức được phép tiêu.
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
          <div className="lp-showcase-fade" />
        </div>
      </header>

      <section className="landing-proof-strip lp-proof" aria-label="Vì sao MoneyFlow">
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

      <section className="lp-section" aria-labelledby="benefits-heading">
        <div className="lp-section-split">
          <div className="lp-section-intro">
            <p className="lp-kicker">Lợi ích</p>
            <h2 id="benefits-heading">Thu chi rõ — quyết định từ dữ liệu thật</h2>
            <p>
              Không biến app thành phần mềm kế toán và không đưa lời khuyên khi dữ liệu chưa đủ.
            </p>
          </div>
          <ul className="lp-benefit-grid">
            <li className="lp-benefit-card">
              <div className="lp-benefit-top">
                <Icon name="plus" size={28} />
                <span className="lp-benefit-num">01</span>
              </div>
              <h3>Ghi dưới 10 giây</h3>
              <p>Số tiền + danh mục. Nhớ ví lần trước. FAB luôn sẵn trên mobile.</p>
            </li>
            <li className="lp-benefit-card">
              <div className="lp-benefit-top">
                <Icon name="target" size={28} />
                <span className="lp-benefit-num">02</span>
              </div>
              <h3>Kế hoạch tách bạch</h3>
              <p>Ngân sách, hóa đơn và mục tiêu hiển thị riêng; không giả làm một hạn mức toàn cục.</p>
            </li>
            <li className="lp-benefit-card">
              <div className="lp-benefit-top">
                <Icon name="arrows" size={28} />
                <span className="lp-benefit-num">03</span>
              </div>
              <h3>Chuyển ví ≠ chi tiêu</h3>
              <p>Sổ đúng hai phía. Báo cáo tháng không bị “ảo” vì chuyển nội bộ.</p>
            </li>
            <li className="lp-benefit-card">
              <div className="lp-benefit-top">
                <Icon name="lock" size={28} />
                <span className="lp-benefit-num">04</span>
              </div>
              <h3>Data của bạn</h3>
              <p>Xuất CSV, xóa tài khoản. Không mật khẩu ngân hàng. Core miễn phí.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="lp-section lp-section-muted" aria-labelledby="how-heading">
        <div className="lp-section-head">
          <p className="lp-kicker">Cách dùng</p>
          <h2 id="how-heading">Bốn bước, không cần học zero-based</h2>
          <span>Đủ kiểm soát tiền hằng ngày — không phần mềm kế toán.</span>
        </div>
        <ol className="lp-steps">
          <li>
            <span className="lp-step-n">1</span>
            <h3>Thêm ví</h3>
            <p>Tiền mặt, ngân hàng, MoMo… nhập số dư ban đầu một lần.</p>
          </li>
          <li>
            <span className="lp-step-n">2</span>
            <h3>Ghi nhanh</h3>
            <p>Số tiền + danh mục. Nhớ lần trước. Dưới 10 giây.</p>
          </li>
          <li>
            <span className="lp-step-n">3</span>
            <h3>Tổng quan</h3>
            <p>Số dư, thu/chi, giao dịch gần đây và danh mục chi nhiều.</p>
          </li>
          <li>
            <span className="lp-step-n">4</span>
            <h3>Lập kế hoạch</h3>
            <p>Ngân sách, khoản định kỳ, mục tiêu và xuất CSV khi cần.</p>
          </li>
        </ol>
      </section>

      <section className="lp-section" aria-labelledby="features-heading">
        <div className="lp-section-head">
          <p className="lp-kicker">Tính năng</p>
          <h2 id="features-heading">Một chỗ cho thu chi hằng ngày</h2>
          <span>Chỉ những gì đã hoạt động và có thể kiểm chứng.</span>
        </div>
        <ul className="lp-feature-grid">
          <li>
            <div className="lp-feature-icon">
              <Icon name="plus" size={22} />
            </div>
            <h3>Thu · Chi · Chuyển</h3>
            <p>Ba loại rõ. Soft delete. Số nguyên đồng.</p>
          </li>
          <li>
            <div className="lp-feature-icon">
              <Icon name="target" size={22} />
            </div>
            <h3>Ngân sách & cam kết</h3>
            <p>Theo dõi từng kế hoạch riêng, không suy diễn từ tổng tài sản.</p>
          </li>
          <li>
            <div className="lp-feature-icon">
              <Icon name="chart" size={22} />
            </div>
            <h3>Tháng này tiền đi đâu</h3>
            <p>Top danh mục, báo cáo tháng, so sánh kỳ.</p>
          </li>
          <li>
            <div className="lp-feature-icon">
              <Icon name="wallet" size={22} />
            </div>
            <h3>Nhiều ví thật</h3>
            <p>Tiền mặt + ngân hàng + ví điện tử. Chuyển ví không tính chi.</p>
          </li>
          <li>
            <div className="lp-feature-icon">
              <Icon name="table" size={22} />
            </div>
            <h3>Xuất CSV / Excel</h3>
            <p>Ownership. Không lock-in. Sheets-friendly.</p>
          </li>
          <li>
            <div className="lp-feature-icon">
              <Icon name="lock" size={22} />
            </div>
            <h3>Riêng tư</h3>
            <p>RLS từng user. Không hỏi mật khẩu ngân hàng.</p>
          </li>
        </ul>
      </section>

      <section className="lp-section lp-section-muted" aria-labelledby="who-heading">
        <div className="lp-section-head">
          <p className="lp-kicker">Dành cho ai</p>
          <h2 id="who-heading">Người mới, người dùng Sheet, người từng bỏ app</h2>
        </div>
        <ul className="lp-who-grid">
          <li>
            <Icon name="wallet" size={24} />
            <h3>Nhiều ví thật</h3>
            <p>Tiền mặt + ngân hàng + ví điện tử trong một sổ.</p>
          </li>
          <li>
            <Icon name="table" size={24} />
            <h3>Đang dùng Excel</h3>
            <p>Ghi mobile nhanh, cuối tháng mang CSV về Sheet.</p>
          </li>
          <li>
            <Icon name="edit" size={24} />
            <h3>Từng bỏ app chi tiêu</h3>
            <p>Vì nhập mệt hoặc quảng cáo. Core miễn phí, ghi nhanh.</p>
          </li>
        </ul>
      </section>

      <section className="lp-section lp-faq" aria-labelledby="faq-heading">
        <div className="lp-section-head">
          <p className="lp-kicker">FAQ</p>
          <h2 id="faq-heading">Câu hỏi thường gặp</h2>
        </div>
        <div className="lp-faq-list">
          <details className="lp-faq-item" open>
            <summary>MoneyFlow có liên kết ngân hàng không?</summary>
            <p>
              Không trong MVP. Bạn ghi chủ động — không mật khẩu ngân hàng, không open banking.
            </p>
          </details>
          <details className="lp-faq-item">
            <summary>Chuyển tiền giữa hai ví có tính là chi không?</summary>
            <p>
              Không. Chuyển khoản nội bộ cân hai phía và không vào tổng chi tháng.
            </p>
          </details>
          <details className="lp-faq-item">
            <summary>MoneyFlow có nói tôi nên tiêu bao nhiêu không?</summary>
            <p>
              Chưa. MoneyFlow chỉ hiển thị số dư, thu chi và các kế hoạch đã nhập. Một gợi ý chi tiêu
              chỉ trở lại khi có đủ dữ liệu và phạm vi tính rõ ràng.
            </p>
          </details>
          <details className="lp-faq-item">
            <summary>Có xuất dữ liệu được không?</summary>
            <p>Có. Xuất CSV bất cứ lúc nào từ cài đặt hoặc tổng quan.</p>
          </details>
          <details className="lp-faq-item">
            <summary>Có phải trả phí không?</summary>
            <p>
              Core thu chi, ví, ngân sách, báo cáo và export miễn phí. Không quảng cáo trong luồng
              chính.
            </p>
          </details>
        </div>
      </section>

      <section className="landing-cta-band lp-cta" aria-labelledby="cta-band-heading">
        <h2 id="cta-band-heading">Bắt đầu bằng một khoản chi hôm nay</h2>
        <p>Miễn phí core. Không cần liên kết ngân hàng.</p>
        <div className="landing-cta-band-actions">
          <Link href="/register" className="cta-primary lp-btn-lg">
            Tạo tài khoản miễn phí
            <Icon name="arrowRight" />
          </Link>
          <Link href="/insights" className="cta-secondary lp-btn-lg">
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

      <footer className="landing-footer lp-footer">
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
            <span aria-hidden="true">·</span>
            <a href="#faq-heading">FAQ</a>
          </nav>
          <p>© 2026 MoneyFlow. Quản lý thu chi cá nhân — rõ ràng, bình tĩnh, của bạn.</p>
        </div>
      </footer>
    </div>
  );
}
