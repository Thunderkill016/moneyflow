import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Check,
  Download,
  Lock,
  PlusCircle,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand/brand-lockup";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";

const signals = [
  {
    label: "Tiền đang có",
    value: "10.000.000 ₫",
    note: "trên 3 tài khoản",
  },
  {
    label: "Còn có thể phân bổ",
    value: "4.280.000 ₫",
    note: "sau các khoản đã lên kế hoạch",
  },
  {
    label: "Khoản cần chú ý",
    value: "2",
    note: "trước ngày 05/08",
  },
];

const clarityCards = [
  {
    icon: Wallet,
    number: "01",
    title: "Biết tiền đang nằm ở đâu",
    body: "Tiền mặt, ngân hàng và ví điện tử nằm trong cùng một bức tranh nhưng vẫn giữ số dư riêng để bạn đối chiếu.",
  },
  {
    icon: BarChart3,
    number: "02",
    title: "Biết tháng này đang lệch ở đâu",
    body: "Thu, chi, chuyển nội bộ và các khoản định kỳ được tách đúng bản chất thay vì gom thành một con số khó hiểu.",
  },
  {
    icon: Target,
    number: "03",
    title: "Biết quyết định tiếp theo là gì",
    body: "Ngân sách và mục tiêu được đặt cạnh dòng tiền thật để bạn thấy phần nào còn linh hoạt, phần nào đã có nhiệm vụ.",
  },
];

const workflow = [
  {
    icon: PlusCircle,
    title: "Ghi khi khoản tiền vừa phát sinh",
    body: "Một giao dịch ngắn, đúng tài khoản, đúng loại. Không cần dựng lại cả ngày vào cuối tháng.",
  },
  {
    icon: ArrowLeftRight,
    title: "Sắp xếp mà không làm sai số",
    body: "Sửa, phục hồi và chuyển tiền giữa tài khoản mà vẫn giữ được lịch sử để kiểm tra lại.",
  },
  {
    icon: BarChart3,
    title: "Đọc bức tranh trước khi hành động",
    body: "Mở tổng quan để thấy số dư, nhịp thu chi và các nghĩa vụ gần nhất trong cùng một màn hình.",
  },
];

const principles = [
  {
    icon: Lock,
    title: "Không cần đưa mật khẩu ngân hàng",
    body: "MoneyFlow là manual-first. Bạn chủ động quyết định dữ liệu nào được ghi vào sổ.",
  },
  {
    icon: ShieldCheck,
    title: "Mỗi thay đổi đều có đường quay lại",
    body: "Xoá mềm, phục hồi và các luồng xác nhận giúp một thao tác vội không biến thành sai lệch lâu dài.",
  },
  {
    icon: Download,
    title: "Dữ liệu không bị giữ lại",
    body: "Xuất lịch sử ra CSV bất cứ lúc nào để kiểm tra, lưu trữ hoặc tiếp tục làm việc ở nơi khác.",
  },
];

const faqItems = [
  {
    question: "MoneyFlow có tự động đọc giao dịch ngân hàng không?",
    answer:
      "Không. MoneyFlow ưu tiên quyền kiểm soát của bạn: giao dịch chỉ xuất hiện khi bạn chủ động ghi hoặc xác nhận một nguồn nhập. Ứng dụng không yêu cầu mật khẩu ngân hàng.",
  },
  {
    question: "Chuyển tiền giữa hai tài khoản có bị tính thành chi tiêu?",
    answer:
      "Không. Chuyển nội bộ được ghi thành một luồng riêng, vì vậy tổng thu và tổng chi không bị phóng đại.",
  },
  {
    question: "Tôi có cần biết phương pháp quản lý tài chính trước không?",
    answer:
      "Không. Bắt đầu bằng việc ghi đúng khoản tiền và tài khoản. Ngân sách, khoản định kỳ và mục tiêu có thể thêm sau khi bạn đã nhìn thấy nhịp tiền thật của mình.",
  },
  {
    question: "Tôi có thể lấy dữ liệu ra khỏi MoneyFlow không?",
    answer:
      "Có. Bạn có thể xuất CSV từ phần cài đặt và xoá tài khoản khi không còn nhu cầu sử dụng.",
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
            <a href="#san-pham">Sản phẩm</a>
            <a href="#quy-trinh">Cách dùng</a>
            <a href="#nguyen-tac">Nguyên tắc</a>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.navCta}>
              Bắt đầu
              <ArrowRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.heroIndex}>01 / Bức tranh tài chính cá nhân</p>
            <h1 id="landing-title">
              Đừng quản lý tiền bằng trí nhớ.
              <span> Hãy nhìn nó thành một hệ thống.</span>
            </h1>
            <p className={styles.heroLead}>
              MoneyFlow gom tài khoản, giao dịch, ngân sách, khoản định kỳ và
              mục tiêu vào một nơi — để mỗi lần mở ứng dụng, bạn biết điều gì
              đang xảy ra và điều gì cần xử lý tiếp theo.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Tạo không gian tài chính
                <ArrowRight size={18} />
              </Link>
              <a href="#san-pham" className={styles.secondaryCta}>
                Xem MoneyFlow hoạt động
              </a>
            </div>

            <ul className={styles.trustRow} aria-label="Cam kết chính">
              <li>
                <Check size={15} /> Không liên kết ngân hàng
              </li>
              <li>
                <Check size={15} /> Có thể sửa và phục hồi
              </li>
              <li>
                <Check size={15} /> Xuất CSV bất cứ lúc nào
              </li>
            </ul>
          </div>

          <div className={styles.productStage} aria-label="Mô phỏng tổng quan MoneyFlow">
            <div className={styles.stageChrome}>
              <div className={styles.stageBrand}>
                <BrandMark size="micro" />
                <span>MoneyFlow / Tổng quan</span>
              </div>
              <span className={styles.stagePeriod}>Tháng 8</span>
            </div>

            <div className={styles.stageMain}>
              <div className={styles.stageHeadline}>
                <span>Số tiền đang có nhiệm vụ</span>
                <strong>5.720.000 ₫</strong>
                <small>57% tổng số dư đã được phân bổ</small>
              </div>

              <div className={styles.stageProgress} aria-hidden="true">
                <span />
              </div>

              <div className={styles.stageGrid}>
                <div>
                  <span>Thu tháng này</span>
                  <strong className={styles.income}>+25.000.000 ₫</strong>
                </div>
                <div>
                  <span>Chi tháng này</span>
                  <strong className={styles.expense}>−8.420.000 ₫</strong>
                </div>
              </div>

              <div className={styles.stageListHeading}>
                <span>Tiếp theo</span>
                <small>3 việc cần nhìn</small>
              </div>

              <ul className={styles.stageList}>
                <li>
                  <span className={styles.stageIcon}>01</span>
                  <div>
                    <strong>Tiền nhà</strong>
                    <small>Đến hạn trong 3 ngày</small>
                  </div>
                  <b>4.500.000 ₫</b>
                </li>
                <li>
                  <span className={styles.stageIcon}>02</span>
                  <div>
                    <strong>Ngân sách ăn uống</strong>
                    <small>Còn 38% trong tháng</small>
                  </div>
                  <b>1.140.000 ₫</b>
                </li>
                <li>
                  <span className={styles.stageIcon}>03</span>
                  <div>
                    <strong>Quỹ dự phòng</strong>
                    <small>Đang tiến tới mục tiêu</small>
                  </div>
                  <b>68%</b>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.signalStrip} aria-label="Các tín hiệu chính">
          {signals.map((signal) => (
            <div key={signal.label}>
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <small>{signal.note}</small>
            </div>
          ))}
        </section>

        <RevealSection
          className={styles.claritySection}
          id="san-pham"
          aria-labelledby="clarity-title"
        >
          <div className={styles.sectionIntro}>
            <p>02 / Ít số hơn, đúng thứ tự hơn</p>
            <h2 id="clarity-title">Một màn hình tốt phải giúp bạn quyết định.</h2>
            <span>
              Không dồn mọi biểu đồ lên cùng một chỗ. MoneyFlow ưu tiên câu hỏi
              cần trả lời trước, rồi mới cho bạn đi sâu vào chi tiết.
            </span>
          </div>

          <div className={styles.clarityGrid}>
            {clarityCards.map((card) => (
              <article key={card.number} className={styles.clarityCard}>
                <div className={styles.cardTopline}>
                  <card.icon size={21} />
                  <span>{card.number}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection
          className={styles.workflowSection}
          id="quy-trinh"
          aria-labelledby="workflow-title"
        >
          <div className={styles.workflowIntro}>
            <p>03 / Một vòng lặp dùng được mỗi ngày</p>
            <h2 id="workflow-title">Ghi nhanh. Sắp đúng. Xem lại có căn cứ.</h2>
            <span>
              MoneyFlow không cố thay bạn ra quyết định. Nó giữ dữ liệu đủ rõ
              để quyết định của bạn không phải bắt đầu từ phỏng đoán.
            </span>
          </div>

          <ol className={styles.workflowList}>
            {workflow.map((item, index) => (
              <li key={item.title}>
                <span className={styles.workflowNumber}>0{index + 1}</span>
                <div className={styles.workflowIcon}>
                  <item.icon size={22} />
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </RevealSection>

        <RevealSection
          className={styles.principlesSection}
          id="nguyen-tac"
          aria-labelledby="principles-title"
        >
          <div className={styles.sectionIntro}>
            <p>04 / Thiết kế cho quyền sở hữu</p>
            <h2 id="principles-title">Một công cụ tài chính phải giải thích được chính nó.</h2>
            <span>
              Không có số dư bí ẩn, thay đổi không thể quay lại hay dữ liệu bị
              khoá trong hệ thống.
            </span>
          </div>

          <div className={styles.principlesGrid}>
            {principles.map((principle) => (
              <article key={principle.title}>
                <principle.icon size={23} />
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection className={styles.faqSection} aria-labelledby="faq-title">
          <div className={styles.faqIntro}>
            <p>05 / Trước khi bắt đầu</p>
            <h2 id="faq-title">Những câu hỏi nên được trả lời rõ.</h2>
          </div>
          <div className={styles.faqList}>
            {faqItems.map((item, index) => (
              <details key={item.question}>
                <summary>
                  <span>0{index + 1}</span>
                  {item.question}
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </RevealSection>

        <RevealSection className={styles.finalCta} aria-labelledby="final-cta-title">
          <div>
            <p>Không cần hoàn hảo từ ngày đầu.</p>
            <h2 id="final-cta-title">Bắt đầu bằng khoản tiền gần nhất.</h2>
          </div>
          <Link href="/register" className={styles.finalCtaButton}>
            Tạo tài khoản miễn phí
            <ArrowRight size={18} />
          </Link>
        </RevealSection>
      </main>

      <footer className={styles.footer}>
        <BrandLockup
          className={styles.footerBrand}
          href="/"
          ariaLabel="MoneyFlow, trang chủ"
          size="compact"
        />
        <p>Một hệ thống rõ ràng cho tiền của bạn.</p>
        <div>
          <Link href="/privacy">Quyền riêng tư</Link>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
