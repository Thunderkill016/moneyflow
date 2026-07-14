"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * Landing — Inbox-first positioning (wireframes-inbox.md §1).
 * Original layout/copy; does not clone competitor marketing.
 * TASK-028: VN microcopy tightened (no English eyebrow/jargon).
 */
export function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Điều hướng trang chủ">
        <Link className="brand" href="/" aria-label="Money Flow, trang chủ">
          <span className="brand-mark">
            <span />
          </span>
          <span>Money Flow</span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-link">
            Đăng nhập
          </Link>
          <Link href="/register" className="primary-button landing-nav-cta">
            Bắt đầu miễn phí
          </Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">Hộp thư giao dịch</p>
          <h1>
            Hộp thư cho mọi
            <br />
            giao dịch tài chính của bạn
          </h1>
          <p className="landing-lead">
            Dán text, tải sao kê, duyệt ngoại lệ — không gõ lại từng dòng.{" "}
            <strong>Bạn quyết định</strong> trước khi vào sổ.
          </p>
          <p className="landing-trust-line">
            <Icon name="lock" />
            Không bao giờ hỏi mật khẩu hay OTP ngân hàng.
          </p>
          <div className="landing-hero-ctas">
            <Link href="/register" className="cta-primary">
              Bắt đầu miễn phí
              <Icon name="arrowRight" />
            </Link>
            <Link href="/login" className="cta-secondary">
              Đăng nhập
            </Link>
          </div>
        </div>

        {/* Abstract inbox preview — not a competitor dashboard clone */}
        <div className="landing-hero-preview" aria-hidden="true">
          <div className="preview-inbox-card">
            <div className="preview-inbox-top">
              <div>
                <span className="preview-inbox-label">Inbox</span>
                <strong className="preview-inbox-count">Cần duyệt · 12</strong>
              </div>
              <span className="preview-chip warning">3 cần xem</span>
            </div>

            <ul className="preview-inbox-list">
              <li className="preview-inbox-row low">
                <span className="preview-check" />
                <div className="preview-row-main">
                  <strong>HIGHLANDS COFFEE Q1</strong>
                  <small>dán · SMS NH</small>
                </div>
                <span className="preview-money expense font-mono">−45.000 ₫</span>
                <span className="preview-chip warning sm">Cần xem</span>
              </li>
              <li className="preview-inbox-row">
                <span className="preview-check on" />
                <div className="preview-row-main">
                  <strong>LUONG CT ABC</strong>
                  <small>csv · Techcombank</small>
                </div>
                <span className="preview-money income font-mono">+25.000.000 ₫</span>
                <span className="preview-chip ok sm">Khá chắc</span>
              </li>
              <li className="preview-inbox-row">
                <span className="preview-check on" />
                <div className="preview-row-main">
                  <strong>Grab *TRIP</strong>
                  <small>csv · MoMo</small>
                </div>
                <span className="preview-money expense font-mono">−89.000 ₫</span>
                <span className="preview-chip ok sm">Khá chắc</span>
              </li>
              <li className="preview-inbox-row">
                <span className="preview-check" />
                <div className="preview-row-main">
                  <strong>CK den *1234</strong>
                  <small>dán · có thể chuyển khoản</small>
                </div>
                <span className="preview-money transfer font-mono">↔ 2.000.000 ₫</span>
                <span className="preview-chip sm">CK?</span>
              </li>
            </ul>

            <div className="preview-inbox-foot">
              <span>Đã chọn 2 dòng khá chắc</span>
              <span className="preview-bulk-btn">Duyệt đã chọn</span>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-section" aria-labelledby="how-heading">
        <div className="landing-section-heading">
          <p>Cách hoạt động</p>
          <h2 id="how-heading">Bốn bước — không cần học ngân sách phức tạp</h2>
          <span>Đưa dữ liệu vào · máy chuẩn hóa · bạn duyệt ngoại lệ · xuất hoặc ghi sổ.</span>
        </div>
        <ol className="steps-grid steps-flow">
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              1
            </span>
            <h3>Đưa dữ liệu vào</h3>
            <p>Dán SMS/noti, tải CSV/Excel/PDF sao kê, hoặc thêm nhanh một khoản.</p>
          </li>
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              2
            </span>
            <h3>Chuẩn hóa</h3>
            <p>Nhận diện nguồn, số tiền, ngày, merchant — gắn độ tin cậy từng dòng.</p>
          </li>
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              3
            </span>
            <h3>Bạn duyệt</h3>
            <p>Duyệt theo ngoại lệ: chọn hàng loạt dòng chắc, sửa dòng mơ hồ. Thấy nguồn và lý do đoán.</p>
          </li>
          <li className="step-card">
            <span className="step-num" aria-hidden="true">
              4
            </span>
            <h3>Xuất hoặc ghi sổ</h3>
            <p>CSV/Excel sạch, hoặc vào sổ Money Flow để xem hôm nay có thể chi bao nhiêu.</p>
          </li>
        </ol>
      </section>

      <section className="landing-section landing-section-alt" aria-labelledby="fit-heading">
        <div className="landing-section-heading">
          <p>Phù hợp nếu bạn</p>
          <h2 id="fit-heading">Không phải app “biểu đồ đẹp rồi bỏ cuộc”</h2>
          <span>Cho người có dữ liệu rải rác và ghét gõ lại từng giao dịch.</span>
        </div>
        <ul className="fit-grid">
          <li className="fit-card">
            <Icon name="wallet" />
            <h3>Nhiều tài khoản & ví</h3>
            <p>Ngân hàng, MoMo, tiền mặt… một hộp thư thay vì mười app.</p>
          </li>
          <li className="fit-card">
            <Icon name="receipt" />
            <h3>Đang dùng Excel / Sheets</h3>
            <p>Tải sao kê → file sạch. Không bắt bạn đổi cả cách làm việc.</p>
          </li>
          <li className="fit-card">
            <Icon name="edit" />
            <h3>Lười nhập tay từng món</h3>
            <p>Đã bỏ app chi tiêu vì ghi sổ mỗi tối. Capture + duyệt lô là việc chính.</p>
          </li>
        </ul>
      </section>

      <section className="landing-section" aria-labelledby="trust-heading">
        <div className="landing-section-heading">
          <p>Tin cậy</p>
          <h2 id="trust-heading">Bạn giữ quyền kiểm soát</h2>
          <span>Thiết kế cho dữ liệu nhạy cảm — không hứa suông “AI thần thánh”.</span>
        </div>
        <ul className="trust-grid">
          <li>
            <Icon name="lock" />
            <div>
              <strong>Không mật khẩu ngân hàng</strong>
              <p>Chỉ file/text bạn chủ động đưa vào. Không đọc OTP.</p>
            </div>
          </li>
          <li>
            <Icon name="check" />
            <div>
              <strong>Duyệt trước khi vào sổ</strong>
              <p>Độ tin cậy thấp không tự ghi. Luôn thấy nguồn và lý do.</p>
            </div>
          </li>
          <li>
            <Icon name="archive" />
            <div>
              <strong>Raw lưu ngắn</strong>
              <p>File gốc có thể xóa sau khi parse. Bạn chọn thời gian giữ.</p>
            </div>
          </li>
          <li>
            <Icon name="arrowDown" />
            <div>
              <strong>Export & xóa tài khoản</strong>
              <p>Mang dữ liệu đi bất cứ lúc nào. Xóa hết khi không còn dùng.</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="landing-cta-band" aria-labelledby="cta-band-heading">
        <h2 id="cta-band-heading">Bắt đầu với một lần dán hoặc một file sao kê</h2>
        <p>Không cần liên kết ngân hàng. Không cần học phương pháp ngân sách phức tạp.</p>
        <Link href="/register" className="cta-primary">
          Tạo tài khoản miễn phí
          <Icon name="arrowRight" />
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <span />
            </span>
            <span>Money Flow</span>
          </Link>
          <nav className="landing-footer-links" aria-label="Liên kết pháp lý">
            <Link href="/login">Đăng nhập</Link>
            <span aria-hidden="true">·</span>
            <a href="#trust-heading">Quyền riêng tư</a>
            <span aria-hidden="true">·</span>
            <a href="#how-heading">Cách hoạt động</a>
          </nav>
          <p>© {new Date().getFullYear()} Money Flow. Hộp thư giao dịch — bạn duyệt trước khi ghi sổ.</p>
        </div>
      </footer>
    </div>
  );
}
