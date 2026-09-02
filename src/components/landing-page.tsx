import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  FileDown,
  ReceiptText,
  Search,
  ShieldCheck,
  Undo2,
  WalletCards,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";
import themeStyles from "./public-brand-theme.module.css";

const storySteps = [
  {
    icon: ReceiptText,
    number: "01",
    eyebrow: "Bạn vừa ghi gì?",
    title: "Ghi đúng loại giao dịch ngay từ đầu.",
    body: "Thu, chi và chuyển nội bộ có ý nghĩa khác nhau. MoneyFlow giữ chúng tách biệt để báo cáo không sai bản chất.",
    note: "Chuyển nội bộ không bị tính thành chi tiêu.",
    image: "/landing/moneyflow-quick-capture.svg",
    width: 800,
    height: 850,
    alt: "Màn hình Thêm nhanh của MoneyFlow trong môi trường kiểm thử",
    windowTitle: "Ghi giao dịch",
  },
  {
    icon: WalletCards,
    number: "02",
    eyebrow: "Số dư nào thay đổi?",
    title: "Mỗi giao dịch đi vào đúng tài khoản.",
    body: "Tiền mặt, ngân hàng và ví điện tử không bị trộn thành một con số khó giải thích. Số dư bắt đầu từ sổ giao dịch thay vì một con số nhập tay.",
    note: "Mỗi tài khoản giữ một lịch sử riêng để kiểm tra.",
    image: "/landing/moneyflow-accounts.svg",
    width: 800,
    height: 938,
    alt: "Màn hình Tài khoản của MoneyFlow trong môi trường kiểm thử",
    windowTitle: "Tài khoản",
  },
  {
    icon: Search,
    number: "03",
    eyebrow: "Con số đến từ đâu?",
    title: "Mở lại đúng khoản đứng sau số tổng.",
    body: "Từ số dư hoặc tổng quan, bạn có thể quay về sổ, lọc đúng giao dịch và sửa khi phát hiện sai sót thay vì đoán từ một biểu đồ.",
    note: "Con số có nguồn gốc, không phải hộp đen.",
    image: "/landing/moneyflow-transactions.svg",
    width: 800,
    height: 668,
    alt: "Màn hình Sổ giao dịch của MoneyFlow trong môi trường kiểm thử",
    windowTitle: "Sổ giao dịch",
  },
] as const;

const controlPoints = [
  {
    icon: ShieldCheck,
    title: "Không cần mật khẩu ngân hàng",
    body: "MoneyFlow là manual-first. Bạn quyết định dữ liệu nào được ghi vào sổ.",
  },
  {
    icon: ArrowRightLeft,
    title: "Chuyển tiền được tính đúng",
    body: "Di chuyển tiền giữa hai tài khoản không làm chi tiêu bị phóng đại.",
  },
  {
    icon: Undo2,
    title: "Có đường sửa và phục hồi",
    body: "Một lần nhập vội không cần trở thành sai lệch kéo dài trong lịch sử.",
  },
  {
    icon: FileDown,
    title: "Lấy dữ liệu ra khi cần",
    body: "Xuất lịch sử giao dịch ra CSV để tự kiểm tra hoặc tiếp tục xử lý.",
  },
] as const;

export function LandingPage() {
  return (
    <div className={`${styles.page} ${themeStyles.landingTheme}`}>
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
            <a href="#quyen-kiem-soat">Quyền kiểm soát</a>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.navCta}>
              Tạo sổ
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              Một dòng tiền · một câu chuyện kiểm tra được
            </p>
            <h1 id="landing-title">
              Từ lúc ghi đến lúc hiểu tiền của mình.
            </h1>
            <p className={styles.heroLead}>
              MoneyFlow dẫn bạn qua ba câu hỏi rõ ràng: vừa ghi gì, tài khoản
              nào thay đổi và con số đó đến từ đâu — không cần liên kết ngân
              hàng.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Tạo sổ của bạn
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#cach-hoat-dong" className={styles.secondaryCta}>
                Xem ba bước
              </a>
            </div>

            <ul className={styles.trustRow} aria-label="Cam kết chính">
              <li>
                <Check size={15} aria-hidden="true" /> Không liên kết ngân hàng
              </li>
              <li>
                <Check size={15} aria-hidden="true" /> Có thể sửa và phục hồi
              </li>
              <li>
                <Check size={15} aria-hidden="true" /> Xuất CSV khi cần
              </li>
            </ul>
          </div>
        </section>

        <RevealSection
          className={styles.storySection}
          id="cach-hoat-dong"
          aria-labelledby="story-title"
        >
          <div className={styles.sectionHeading}>
            <p>Cách MoneyFlow biến một giao dịch thành con số có thể giải thích</p>
            <h2 id="story-title">Một dòng tiền, ba câu hỏi kiểm tra được.</h2>
            <span>
              Không bắt đầu bằng biểu đồ. MoneyFlow bắt đầu bằng giao dịch đúng,
              rồi cho bạn theo dấu thay đổi đó đến tài khoản và sổ giao dịch.
            </span>
          </div>

          <div className={styles.storyList}>
            {storySteps.map((step, index) => (
              <article
                className={`${styles.storyBand} ${
                  index % 2 === 1 ? styles.storyReverse : ""
                }`}
                key={step.number}
              >
                <div className={styles.storyCopy}>
                  <div className={styles.stepTopline}>
                    <step.icon size={22} aria-hidden="true" />
                    <span>{step.number}</span>
                  </div>
                  <p>{step.eyebrow}</p>
                  <h3>{step.title}</h3>
                  <span>{step.body}</span>
                  <small>{step.note}</small>
                </div>

                <figure className={styles.storyFigure}>
                  <div className={styles.windowBar} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <b>{step.windowTitle}</b>
                  </div>
                  <Image
                    src={step.image}
                    width={step.width}
                    height={step.height}
                    sizes="(max-width: 860px) 92vw, 55vw"
                    alt={step.alt}
                  />
                  <figcaption>
                    <strong>{step.eyebrow}</strong>
                    <span>{step.note}</span>
                  </figcaption>
                </figure>
              </article>
            ))}
          </div>

          <p className={styles.testDataNote}>
            Giao diện thật từ môi trường kiểm thử; dữ liệu trong ảnh chỉ dùng để
            minh hoạ cách hiển thị.
          </p>
        </RevealSection>

        <RevealSection
          className={styles.controlSection}
          id="quyen-kiem-soat"
          aria-labelledby="control-title"
        >
          <div className={styles.controlIntro}>
            <p>Quyền kiểm soát không nằm trong chữ nhỏ cuối trang</p>
            <h2 id="control-title">Sổ của bạn. Quyết định của bạn.</h2>
            <span>
              MoneyFlow sắp xếp dữ liệu bạn chủ động nhập. Ứng dụng không cần
              trở thành một ngân hàng khác để giúp bạn hiểu dòng tiền.
            </span>
          </div>

          <div className={styles.controlGrid}>
            {controlPoints.map((point) => (
              <article key={point.title}>
                <point.icon size={21} aria-hidden="true" />
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </div>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection
          className={styles.finalCta}
          aria-labelledby="final-cta-title"
        >
          <div>
            <p>Bắt đầu bằng giao dịch gần nhất</p>
            <h2 id="final-cta-title">
              Tạo một sổ mà mỗi con số đều có chỗ để kiểm tra.
            </h2>
          </div>
          <Link href="/register" className={styles.finalCtaButton}>
            Tạo tài khoản
            <ArrowRight size={18} aria-hidden="true" />
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
        <p>Ghi đúng dòng tiền. Mở lại để kiểm tra.</p>
        <div>
          <Link href="/privacy">Quyền riêng tư</Link>
          <Link href="/security">Bảo mật</Link>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
