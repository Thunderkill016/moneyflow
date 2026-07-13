"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

export function LandingPage() {
  return (
    <div className="landing-page">
      {/* Landing Nav */}
      <nav className="landing-nav" aria-label="Điều hướng chính">
        <Link className="brand" href="/">
          <span className="brand-mark"><span /></span>
          <span>MoneyFlow</span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/login" className="secondary-button" style={{ minHeight: "38px", paddingInline: "16px", fontSize: "12px" }}>
            Đăng nhập
          </Link>
          <Link href="/register" className="primary-button" style={{ minHeight: "38px", paddingInline: "16px", fontSize: "12px" }}>
            Đăng ký miễn phí
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero-content">
          <h1>
            Tài chính bình yên,<br />
            bắt đầu từ <span>số 0</span>.
          </h1>
          <p>
            MoneyFlow biến những con số phức tạp thành một quyết định đơn giản mỗi ngày: 
            <strong> Hôm nay bạn có thể chi bao nhiêu?</strong> Giúp bạn tích lũy thông minh mà không bị stress.
          </p>
          <div className="landing-hero-ctas">
            <Link href="/register" className="cta-primary">
              Bắt đầu miễn phí <Icon name="arrowRight" style={{ marginLeft: "8px", width: "16px" }} />
            </Link>
            <Link href="/login" className="cta-secondary">
              Xem Bản Demo <Icon name="spark" style={{ marginLeft: "8px", width: "16px" }} />
            </Link>
          </div>
        </div>

        {/* CSS Mockup Card */}
        <div className="landing-hero-preview">
          <div className="preview-dashboard-card">
            <div className="preview-header">
              <span className="preview-allowance">Có thể chi hôm nay</span>
              <span className="preview-status"><span /> An toàn</span>
            </div>
            <div className="preview-amount font-mono">180.000 ₫</div>
            <div className="preview-bar"><span /></div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "24px" }}>
              <div>Số dư ví: <strong className="font-mono" style={{ color: "var(--color-text-primary)" }}>5.450.000 ₫</strong></div>
              <div>Hạn mức ngày: <strong className="font-mono" style={{ color: "var(--color-text-primary)" }}>200.000 ₫</strong></div>
            </div>

            <div className="preview-transactions-list">
              <div className="preview-item">
                <div className="preview-item-info">
                  <span className="preview-item-icon">☕</span>
                  <div className="preview-item-text">
                    <strong>Cafe sáng</strong>
                    <span>Ăn uống · Ví tiền mặt</span>
                  </div>
                </div>
                <span className="preview-item-value expense font-mono">− ↓ 45.000 ₫</span>
              </div>

              <div className="preview-item">
                <div className="preview-item-info">
                  <span className="preview-item-icon">💰</span>
                  <div className="preview-item-text">
                    <strong>Lương dự án</strong>
                    <span>Thu nhập · Vietcombank</span>
                  </div>
                </div>
                <span className="preview-item-value income font-mono">+ ↑ 1.500.000 ₫</span>
              </div>

              <div className="preview-item">
                <div className="preview-item-info">
                  <span className="preview-item-icon">🔄</span>
                  <div className="preview-item-text">
                    <strong>Chuyển ví tiết kiệm</strong>
                    <span>Chuyển khoản · Ví → MoMo</span>
                  </div>
                </div>
                <span className="preview-item-value font-mono" style={{ color: "var(--color-text-secondary)" }}>↔ 2.000.000 ₫</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Curriculum / Steps Section */}
      <section className="landing-section" style={{ borderTop: "1px solid var(--color-border-default)" }}>
        <div className="landing-section-heading">
          <p>Từng bước nhỏ</p>
          <h2>Lộ trình làm chủ tiền bạc</h2>
          <span>Không nhồi nhét lý thuyết. Bạn học cách tích lũy và kiểm soát chi tiêu qua việc thực hành hàng ngày.</span>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <span className="step-num">1</span>
            <h3>Ví tài chính</h3>
            <p>Đăng ký các tài khoản thực tế của bạn như Tiền mặt, Thẻ ngân hàng, hoặc Thẻ tín dụng để có cái nhìn tổng quan ròng.</p>
          </div>

          <div className="step-card">
            <span className="step-num">2</span>
            <h3>Ngân sách tháng</h3>
            <p>Thiết lập hạn mức tối giản cho từng danh mục ăn uống, mua sắm. MoneyFlow sẽ tự động phân bổ hạn mức chi tiêu hàng ngày.</p>
          </div>

          <div className="step-card">
            <span className="step-num">3</span>
            <h3>Mục tiêu tương lai</h3>
            <p>Đặt mục tiêu mua laptop, quỹ khẩn cấp. Một phần tiền của bạn sẽ được khóa riêng để đảm bảo bạn không lỡ tiêu mất.</p>
          </div>

          <div className="step-card">
            <span className="step-num">4</span>
            <h3>Chi tiêu định kỳ</h3>
            <p>Khai báo tiền nhà, hóa đơn điện nước. Hệ thống tự giữ trước số tiền này để bạn luôn trả đúng hạn mà không lo thiếu hụt.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-section" style={{ borderTop: "1px solid var(--color-border-default)" }}>
        <div className="landing-section-heading">
          <p>Đặc trưng cốt lõi</p>
          <h2>Thiết kế dành cho sự bình yên</h2>
          <span>Mỗi chi tiết giao diện đều được tính toán kỹ lưỡng để mang lại cảm giác an tâm và kiểm soát tốt nhất.</span>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box">
              <Icon name="spark" />
            </div>
            <h3>Tiết lộ dần dần</h3>
            <p>Chỉ hiển thị những gì bạn cần biết ngay lúc này. Ẩn đi các thống kê phức tạp để giữ tinh thần của bạn thoải mái.</p>
          </div>

          <div className="feature-card success-theme">
            <div className="feature-icon-box">
              <Icon name="check" />
            </div>
            <h3>Triple Redundancy</h3>
            <p>Kết hợp màu sắc sắc nét, ký tự âm dương (+/−) và mũi tên chỉ hướng để bạn dễ dàng quét nhanh dòng tiền mà không nhầm lẫn.</p>
          </div>

          <div className="feature-card warning-theme">
            <div className="feature-icon-box">
              <Icon name="lock" />
            </div>
            <h3>Bảo mật tối đa</h3>
            <p>Cơ chế Row Level Security (RLS) của Supabase bảo vệ an toàn tuyệt đối thông tin. Dữ liệu của bạn chỉ có bạn đọc được.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <Link className="brand" href="/" style={{ opacity: 0.8 }}>
            <span className="brand-mark"><span /></span>
            <span>MoneyFlow</span>
          </Link>
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} MoneyFlow. Tài chính cá nhân tối giản cho người Việt.</p>
        </div>
      </footer>
    </div>
  );
}
