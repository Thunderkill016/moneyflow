import Link from "next/link";
import { BrandLockup, BrandMark } from "@/components/brand/brand-lockup";
import { Icon } from "@/components/icons";
import styles from "./landing-page.module.css";

const trustItems = [
  { icon: "lock" as const, label: "Không cần mật khẩu ngân hàng" },
  { icon: "arrows" as const, label: "Thu · Chi · Chuyển tách bạch" },
  { icon: "arrowDown" as const, label: "Xuất CSV bất cứ lúc nào" },
];

const steps = [
  {
    number: "01",
    title: "Thêm các tài khoản đang dùng",
    body: "Tiền mặt, tài khoản ngân hàng hoặc ví điện tử — mỗi nơi một số dư rõ ràng.",
  },
  {
    number: "02",
    title: "Ghi thu, chi hoặc chuyển tiền",
    body: "Chọn đúng loại giao dịch, số tiền và danh mục. MoneyFlow giữ nguyên bản chất của từng khoản.",
  },
  {
    number: "03",
    title: "Kiểm tra lại tháng của bạn",
    body: "Đối chiếu số dư, dòng tiền và các kế hoạch từ chính dữ liệu bạn đã nhập.",
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
    title: "Nhiều tài khoản, một sổ",
    body: "Theo dõi tiền mặt, ngân hàng và ví điện tử mà không trộn chuyển khoản nội bộ vào chi tiêu.",
  },
  {
    icon: "target" as const,
    title: "Kế hoạch do bạn tạo",
    body: "Ngân sách, khoản định kỳ và mục tiêu luôn tách khỏi số dư thực tế và không bị biến thành lời khuyên tự động.",
  },
  {
    icon: "chart" as const,
    title: "Báo cáo dễ kiểm tra",
    body: "Xem dòng tiền và danh mục theo tháng với số tiền chính xác, nhãn rõ và dữ liệu có thể đối chiếu.",
  },
];

const faqItems = [
  {
    question: "MoneyFlow có tự kết nối ngân hàng không?",
    answer:
      "Không trong phiên bản hiện tại. Bạn chủ động ghi hoặc nhập dữ liệu và không cần cung cấp mật khẩu ngân hàng.",
  },
  {
    question: "Chuyển tiền giữa hai tài khoản có tính là chi không?",
    answer:
      "Không. MoneyFlow ghi nhận đây là chuyển nội bộ và loại khoản đó khỏi tổng thu, tổng chi.",
  },
  {
    question: "MoneyFlow có nói tôi nên tiêu bao nhiêu không?",
    answer:
      "Không. Ứng dụng hiển thị số dư, dòng tiền và kế hoạch bạn đã nhập; không biến tổng tài sản thành lời khuyên chi tiêu.",
  },
  {
    question: "Tôi có thể lấy dữ liệu ra không?",
    answer:
      "Có. Bạn có thể xuất CSV từ phần cài đặt để lưu trữ hoặc tiếp tục xử lý trong công cụ khác.",
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
          <BrandLockup
            className={styles.brand}
            href="/"
            ariaLabel="MoneyFlow, trang chủ"
            size="standard"
          />
          <div className={styles.navLinks}>
            <a href="#cach-hoat-dong">Cách hoạt động</a>
            <a href="#features-title">Tính năng</a>
            <a href="#faq-title">Câu hỏi</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" />
              Sổ thu chi bạn có thể tin
            </p>
            <h1 id="landing-title">
              Biết chính xác tiền đã đi đâu.
              <span> Ghi rõ từng khoản, không cần đoán.</span>
            </h1>
            <p className={styles.heroLead}>
              MoneyFlow giúp bạn ghi thu, chi và chuyển tiền trong một sổ rõ
              ràng. Số dư, giao dịch và kế hoạch đều đến từ dữ liệu bạn chủ động
              nhập — có thể sửa và xuất ra bất cứ lúc nào.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryButtonLarge}>
                Bắt đầu ghi miễn phí
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
            aria-label="Mô phỏng một tháng trong MoneyFlow với tổng số dư, thu chi và ba giao dịch gần đây"
          >
            <div className={styles.preview}>
              <div className={styles.previewTopbar}>
                <div>
                  <BrandMark size="micro" />
                  <strong>Một tháng trong MoneyFlow</strong>
                </div>
                <span>Tháng 7</span>
              </div>

              <div className={styles.balanceBlock}>
                <span>Tổng số dư đã ghi</span>
                <strong className={styles.money}>10.000.000 ₫</strong>
                <small>Từ 3 tài khoản bạn đang theo dõi</small>
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
                  <span className={`${styles.rowIcon} ${styles.rowIconExpense}`}>
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
                  <span className={`${styles.rowIcon} ${styles.rowIconTransfer}`}>
                    CK
                  </span>
                  <div>
                    <strong>Chuyển sang quỹ dự phòng</strong>
                    <small>Chuyển nội bộ · không tính thu chi</small>
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
            <strong>Thu · Chi · Chuyển</strong>
            <span>Giữ đúng bản chất giao dịch</span>
          </div>
          <div>
            <strong>Số nguyên đồng</strong>
            <span>Dễ đối chiếu, không làm tròn</span>
          </div>
          <div>
            <strong>Dữ liệu thuộc về bạn</strong>
            <span>Sửa, phục hồi và xuất CSV</span>
          </div>
        </section>

        <section
          className={styles.section}
          id="cach-hoat-dong"
          aria-labelledby="how-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Cách hoạt động</p>
            <h2 id="how-title">Từ khoản đầu tiên đến một tháng rõ ràng</h2>
            <p>
              Không cần học một phương pháp tài chính mới trước khi bắt đầu ghi.
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
            <h2 id="features-title">Ghi đúng trước, hiểu rõ sau</h2>
            <p>
              Mỗi màn hình ưu tiên một việc chính; số tiền, nhãn và trạng thái
              luôn dễ quét và kiểm tra lại.
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
            <p className={styles.kicker}>Giữ quyền kiểm soát</p>
            <h2 id="ownership-title">Tiền của bạn. Dữ liệu của bạn.</h2>
            <p>
              MoneyFlow không hỏi mật khẩu ngân hàng. Bạn có thể sửa, phục hồi,
              xuất CSV hoặc xóa tài khoản khi cần. Dữ liệu mỗi người được tách
              riêng bằng chính sách truy cập ở tầng cơ sở dữ liệu.
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
            {faqItems.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-cta-title">
          <div>
            <p className={styles.kicker}>Ghi rõ từ khoản đầu tiên</p>
            <h2 id="final-cta-title">Tạo sổ MoneyFlow của bạn</h2>
            <p>
              Bắt đầu với thu, chi và chuyển tiền cốt lõi. Không cần liên kết
              ngân hàng.
            </p>
          </div>
          <Link href="/register" className={styles.finalCtaButton}>
            Bắt đầu ghi miễn phí
            <Icon name="arrowRight" size={18} />
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <BrandLockup
            className={styles.brand}
            href="/"
            ariaLabel="MoneyFlow, trang chủ"
            size="compact"
          />
          <p>© 2026 MoneyFlow. Rõ từng dòng tiền.</p>
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
