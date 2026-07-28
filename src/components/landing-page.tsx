import Link from "next/link";
import { Icon } from "@/components/icons";
import styles from "./landing-page.module.css";

const trustItems = [
  { icon: "lock" as const, label: "Không cần mật khẩu ngân hàng" },
  { icon: "arrowDown" as const, label: "Xuất dữ liệu bất cứ lúc nào" },
  { icon: "arrows" as const, label: "Chuyển ví không tính là chi" },
];

const steps = [
  {
    number: "01",
    title: "Thêm các ví đang dùng",
    body: "Tiền mặt, tài khoản ngân hàng hoặc ví điện tử — mỗi nơi một số dư rõ ràng.",
  },
  {
    number: "02",
    title: "Ghi khoản thu, chi hoặc chuyển",
    body: "Chọn đúng loại giao dịch, số tiền và danh mục. MoneyFlow giữ nguyên ý nghĩa của từng khoản.",
  },
  {
    number: "03",
    title: "Xem lại tháng của bạn",
    body: "Đối chiếu số dư, thu–chi, ngân sách và khoản định kỳ từ dữ liệu bạn đã nhập.",
  },
];

const features = [
  {
    icon: "plus" as const,
    title: "Ghi nhanh hằng ngày",
    body: "Luồng nhập gọn cho các khoản quen thuộc, tối ưu cho bàn phím số trên điện thoại.",
  },
  {
    icon: "wallet" as const,
    title: "Nhiều ví, một sổ",
    body: "Theo dõi tiền mặt, ngân hàng và ví điện tử mà không trộn chuyển khoản nội bộ vào chi tiêu.",
  },
  {
    icon: "target" as const,
    title: "Kế hoạch tách bạch",
    body: "Ngân sách, khoản định kỳ và mục tiêu hiển thị theo từng kế hoạch bạn chủ động tạo.",
  },
  {
    icon: "chart" as const,
    title: "Báo cáo dễ kiểm tra",
    body: "Xem dòng tiền và danh mục theo tháng với số tiền chính xác, không đưa ra lời khuyên thiếu dữ liệu.",
  },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#noi-dung">
        Bỏ qua điều hướng
      </a>

      <header className={styles.siteHeader}>
        <nav className={styles.nav} aria-label="Điều hướng trang chủ">
          <Link
            className={styles.brand}
            href="/"
            aria-label="MoneyFlow, trang chủ"
          >
            <span className={styles.brandMark} aria-hidden="true">
              <span />
            </span>
            <span>MoneyFlow</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#cach-hoat-dong">Cách hoạt động</a>
            <a href="#features-title">Tính năng</a>
            <a href="#faq-title">Câu hỏi</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.primaryButton}>
              Bắt đầu miễn phí
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" />
              Sổ thu chi cá nhân
            </p>
            <h1 id="landing-title">
              Ghi thu chi trong vài giây.
              <span> Biết chính xác tiền đi đâu.</span>
            </h1>
            <p className={styles.heroLead}>
              MoneyFlow gom số dư, giao dịch và kế hoạch của bạn vào một nơi rõ
              ràng — từ dữ liệu bạn tự ghi, không đoán bạn nên tiêu bao nhiêu.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryButtonLarge}>
                Tạo tài khoản miễn phí
                <Icon name="arrowRight" size={18} />
              </Link>
              <a href="#cach-hoat-dong" className={styles.secondaryButtonLarge}>
                Xem cách hoạt động
              </a>
            </div>
            <ul className={styles.trustList} aria-label="Cam kết của MoneyFlow">
              {trustItems.map((item) => (
                <li key={item.label}>
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={styles.previewWrap}
            role="img"
            aria-label="Mô phỏng màn hình tổng quan với số dư, thu chi và ba giao dịch gần đây"
          >
            <div className={styles.preview}>
              <div className={styles.previewTopbar}>
                <div>
                  <span className={styles.previewLogo} aria-hidden="true" />
                  <strong>Tổng quan</strong>
                </div>
                <span>Tháng 7</span>
              </div>

              <div className={styles.balanceBlock}>
                <span>Số dư trên các ví</span>
                <strong className={styles.money}>10.000.000 ₫</strong>
                <small>Cập nhật từ 3 ví bạn đang theo dõi</small>
              </div>

              <div className={styles.summaryGrid}>
                <div>
                  <span>Thu tháng này</span>
                  <strong className={`${styles.money} ${styles.income}`}>
                    +25.000.000 ₫
                  </strong>
                </div>
                <div>
                  <span>Chi tháng này</span>
                  <strong className={`${styles.money} ${styles.expense}`}>
                    −8.420.000 ₫
                  </strong>
                </div>
              </div>

              <div className={styles.ledgerHeading}>
                <strong>Giao dịch gần đây</strong>
                <span>Xem sổ</span>
              </div>
              <ul className={styles.ledger}>
                <li>
                  <span
                    className={`${styles.rowIcon} ${styles.rowIconExpense}`}
                  >
                    ĂU
                  </span>
                  <div>
                    <strong>Cà phê sáng</strong>
                    <small>Ăn uống · Tiền mặt</small>
                  </div>
                  <span className={`${styles.money} ${styles.expense}`}>
                    −45.000 ₫
                  </span>
                </li>
                <li>
                  <span className={`${styles.rowIcon} ${styles.rowIconIncome}`}>
                    L
                  </span>
                  <div>
                    <strong>Lương tháng 7</strong>
                    <small>Thu nhập · Tài khoản chính</small>
                  </div>
                  <span className={`${styles.money} ${styles.income}`}>
                    +25.000.000 ₫
                  </span>
                </li>
                <li>
                  <span
                    className={`${styles.rowIcon} ${styles.rowIconTransfer}`}
                  >
                    CK
                  </span>
                  <div>
                    <strong>Chuyển sang quỹ dự phòng</strong>
                    <small>Chuyển ví · không tính thu chi</small>
                  </div>
                  <span className={`${styles.money} ${styles.transfer}`}>
                    ↔ 2.000.000 ₫
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.proof} aria-label="Điểm nổi bật">
          <div>
            <strong>3 loại giao dịch</strong>
            <span>Thu · Chi · Chuyển</span>
          </div>
          <div>
            <strong>Số nguyên đồng</strong>
            <span>Không làm tròn ở trang chi tiết</span>
          </div>
          <div>
            <strong>Dữ liệu của bạn</strong>
            <span>Xuất CSV, không khóa dữ liệu</span>
          </div>
        </section>

        <section
          className={styles.section}
          id="cach-hoat-dong"
          aria-labelledby="how-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Cách hoạt động</p>
            <h2 id="how-title">Bắt đầu từ những gì bạn đang có</h2>
            <p>
              Không cần học một phương pháp tài chính mới trước khi ghi khoản
              đầu tiên.
            </p>
          </div>
          <ol className={styles.steps}>
            {steps.map((step) => (
              <li key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={`${styles.section} ${styles.featuresSection}`}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Một sổ dùng hằng ngày</p>
            <h2 id="features-title">Ít thao tác hơn, dễ đối chiếu hơn</h2>
            <p>
              Mỗi màn hình ưu tiên một việc chính và giữ số tiền dễ quét hơn
              nhãn.
            </p>
          </div>
          <ul className={styles.features}>
            {features.map((feature) => (
              <li key={feature.title}>
                <span className={styles.featureIcon}>
                  <Icon name={feature.icon} size={22} />
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.ownership} aria-labelledby="ownership-title">
          <div className={styles.ownershipMark} aria-hidden="true">
            <Icon name="lock" size={30} />
          </div>
          <div>
            <p className={styles.kicker}>Riêng tư và có thể mang đi</p>
            <h2 id="ownership-title">Sổ của bạn. Dữ liệu của bạn.</h2>
            <p>
              MoneyFlow không hỏi mật khẩu ngân hàng. Bạn có thể xuất CSV hoặc
              xóa tài khoản khi cần. Dữ liệu mỗi người được tách riêng bằng
              chính sách truy cập ở tầng cơ sở dữ liệu.
            </p>
          </div>
          <ul>
            <li>
              <Icon name="check" size={18} />
              Không cần liên kết ngân hàng
            </li>
            <li>
              <Icon name="check" size={18} />
              Xuất dữ liệu bất cứ lúc nào
            </li>
            <li>
              <Icon name="check" size={18} />
              Không quảng cáo trong luồng ghi chính
            </li>
          </ul>
        </section>

        <section
          className={`${styles.section} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Câu hỏi thường gặp</p>
            <h2 id="faq-title">Rõ từ trước khi bắt đầu</h2>
          </div>
          <div className={styles.faqList}>
            <details open>
              <summary>MoneyFlow có tự kết nối ngân hàng không?</summary>
              <p>
                Không trong phiên bản hiện tại. Bạn chủ động ghi hoặc nhập dữ
                liệu và không cần cung cấp mật khẩu ngân hàng.
              </p>
            </details>
            <details>
              <summary>Chuyển tiền giữa hai ví có tính là chi không?</summary>
              <p>
                Không. MoneyFlow ghi hai phía của giao dịch chuyển và loại khoản
                đó khỏi tổng thu, tổng chi.
              </p>
            </details>
            <details>
              <summary>MoneyFlow có nói tôi nên tiêu bao nhiêu không?</summary>
              <p>
                Không. Ứng dụng hiển thị số dư, dòng tiền và kế hoạch bạn đã
                nhập; không biến số dư thành lời khuyên chi tiêu.
              </p>
            </details>
            <details>
              <summary>Tôi có thể lấy dữ liệu ra không?</summary>
              <p>
                Có. Bạn có thể xuất CSV từ phần cài đặt để lưu trữ hoặc tiếp tục
                xử lý trong công cụ khác.
              </p>
            </details>
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-cta-title">
          <div>
            <p className={styles.kicker}>Bắt đầu gọn</p>
            <h2 id="final-cta-title">Ghi khoản đầu tiên của bạn hôm nay</h2>
            <p>Miễn phí cho các tính năng thu chi cốt lõi.</p>
          </div>
          <Link href="/register" className={styles.finalCtaButton}>
            Tạo tài khoản miễn phí
            <Icon name="arrowRight" size={18} />
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true">
              <span />
            </span>
            <span>MoneyFlow</span>
          </Link>
          <p>© 2026 MoneyFlow. Sổ thu chi rõ ràng, bình tĩnh, của bạn.</p>
        </div>
        <nav aria-label="Liên kết cuối trang">
          <Link href="/login">Đăng nhập</Link>
          <Link href="/privacy">Quyền riêng tư</Link>
          <a href="#cach-hoat-dong">Cách hoạt động</a>
          <a href="#faq-title">Câu hỏi thường gặp</a>
        </nav>
      </footer>
    </div>
  );
}
