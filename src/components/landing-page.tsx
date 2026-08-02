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

const traceSteps = [
  {
    icon: ReceiptText,
    number: "01",
    title: "Ghi đúng bản chất",
    body: "Thu, chi và chuyển nội bộ là ba loại giao dịch khác nhau. MoneyFlow giữ chúng tách biệt ngay từ lúc nhập.",
    note: "Chuyển nội bộ không bị tính thành chi tiêu.",
  },
  {
    icon: WalletCards,
    number: "02",
    title: "Thấy số dư thay đổi",
    body: "Mỗi giao dịch cập nhật đúng tài khoản liên quan, để tổng quan luôn bắt đầu từ sổ giao dịch thay vì một con số nhập tay.",
    note: "Tiền mặt, ngân hàng và ví điện tử không bị trộn lẫn.",
  },
  {
    icon: Search,
    number: "03",
    title: "Mở lại để kiểm tra",
    body: "Từ số tổng, bạn có thể quay về danh sách giao dịch, lọc đúng khoản và sửa khi phát hiện sai sót.",
    note: "Con số có nguồn gốc, không phải hộp đen.",
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
            <p className={styles.kicker}>Sổ thu chi cá nhân · bạn chủ động ghi</p>
            <h1 id="landing-title">
              <span>Biết tiền đang ở đâu.</span>
              <span>Biết vì sao nó thay đổi.</span>
            </h1>
            <p className={styles.heroLead}>
              Ghi thu, chi và chuyển tiền đúng bản chất. Theo dõi từng tài khoản
              và mở lại mọi con số để kiểm tra — không cần liên kết ngân hàng.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Tạo sổ của bạn
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#cach-hoat-dong" className={styles.secondaryCta}>
                Xem cách hoạt động
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

          <div
            className={styles.proofStage}
            role="group"
            aria-label="Chuỗi giao diện thật của MoneyFlow"
          >
            <figure
              className={styles.accountShot}
              aria-label="Ảnh giao diện MoneyFlow: tài khoản"
            >
              <div className={styles.windowBar} aria-hidden="true">
                <span />
                <span />
                <span />
                <b>Tài khoản</b>
              </div>
              <Image
                src="/landing/moneyflow-accounts.svg"
                width={800}
                height={938}
                priority
                sizes="(max-width: 980px) 92vw, 52vw"
                alt="Màn hình Tài khoản của MoneyFlow trong môi trường kiểm thử"
              />
              <figcaption>
                Số dư theo từng tài khoản, tạo từ sổ giao dịch.
              </figcaption>
            </figure>

            <figure
              className={styles.captureShot}
              aria-label="Ảnh giao diện MoneyFlow: ghi giao dịch"
            >
              <Image
                src="/landing/moneyflow-quick-capture.svg"
                width={800}
                height={850}
                priority
                sizes="(max-width: 680px) 58vw, 250px"
                alt="Màn hình Thêm nhanh của MoneyFlow trong môi trường kiểm thử"
              />
              <figcaption>Ghi đúng loại giao dịch.</figcaption>
            </figure>

            <figure
              className={styles.ledgerShot}
              aria-label="Ảnh giao diện MoneyFlow: sổ giao dịch"
            >
              <Image
                src="/landing/moneyflow-transactions.svg"
                width={800}
                height={668}
                sizes="(max-width: 680px) 64vw, 310px"
                alt="Màn hình Sổ giao dịch của MoneyFlow trong môi trường kiểm thử"
              />
              <figcaption>Mở sổ để đối chiếu.</figcaption>
            </figure>

            <p className={styles.testDataNote}>
              Giao diện thật từ môi trường kiểm thử; dữ liệu trong ảnh chỉ dùng
              để minh hoạ cách hiển thị.
            </p>
          </div>
        </section>

        <section className={styles.boundaryStrip} aria-label="MoneyFlow làm gì">
          <p>Một giao dịch đi xuyên suốt từ lúc ghi đến lúc kiểm tra.</p>
          <div>
            <span>Ghi giao dịch</span>
            <ArrowRight size={16} aria-hidden="true" />
            <span>Cập nhật tài khoản</span>
            <ArrowRight size={16} aria-hidden="true" />
            <span>Mở sổ đối chiếu</span>
          </div>
        </section>

        <RevealSection
          className={styles.traceSection}
          id="cach-hoat-dong"
          aria-labelledby="trace-title"
        >
          <div className={styles.sectionHeading}>
            <p>Cách MoneyFlow giữ một con số có thể giải thích</p>
            <h2 id="trace-title">Một dòng tiền, ba bước kiểm tra được.</h2>
            <span>
              Không bắt đầu bằng biểu đồ. MoneyFlow bắt đầu bằng giao dịch đúng,
              rồi mới tạo số dư và tổng quan từ dữ liệu đó.
            </span>
          </div>

          <div className={styles.traceGrid}>
            {traceSteps.map((step) => (
              <article key={step.number}>
                <div className={styles.stepTopline}>
                  <step.icon size={22} aria-hidden="true" />
                  <span>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <small>{step.note}</small>
              </article>
            ))}
          </div>

          <div className={styles.flowProof}>
            <figure className={styles.flowCapture}>
              <div>
                <span>Đầu vào</span>
                <strong>Ghi một khoản trong vài bước rõ ràng</strong>
                <p>
                  Loại giao dịch, số tiền, danh mục và tài khoản nằm trong cùng
                  một luồng ngắn.
                </p>
              </div>
              <Image
                src="/landing/moneyflow-quick-capture.svg"
                width={800}
                height={850}
                sizes="(max-width: 860px) 92vw, 48vw"
                alt="Chi tiết màn hình Thêm nhanh của MoneyFlow"
              />
            </figure>

            <div className={styles.flowLink} aria-hidden="true">
              <ArrowRight size={18} />
              <span>Cùng một dữ liệu</span>
            </div>

            <figure className={styles.flowLedger}>
              <div>
                <span>Đối chiếu</span>
                <strong>Mở lại đúng khoản tạo ra con số</strong>
                <p>
                  Lọc sổ theo loại, danh mục và tài khoản để kiểm tra thay vì
                  đoán từ một biểu đồ tổng hợp.
                </p>
              </div>
              <Image
                src="/landing/moneyflow-transactions.svg"
                width={800}
                height={668}
                sizes="(max-width: 860px) 92vw, 48vw"
                alt="Chi tiết màn hình Sổ giao dịch của MoneyFlow"
              />
            </figure>
          </div>
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
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
