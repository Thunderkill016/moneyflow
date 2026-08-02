import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";
import themeStyles from "./public-brand-theme.module.css";

const recentEntries = [
  {
    kind: "THU",
    title: "Lương tháng 8",
    account: "Tài khoản chính",
    amount: "+15.000.000 ₫",
    tone: "income",
  },
  {
    kind: "CHI",
    title: "Tiền nhà",
    account: "Tài khoản chính",
    amount: "-4.500.000 ₫",
    tone: "expense",
  },
  {
    kind: "CHUYỂN",
    title: "Chuyển sang ví chi tiêu",
    account: "Nội bộ",
    amount: "1.500.000 ₫",
    tone: "transfer",
  },
  {
    kind: "CHI",
    title: "Cà phê sáng",
    account: "Ví tiền mặt",
    amount: "-35.000 ₫",
    tone: "expense",
  },
] as const;

const questions = [
  {
    number: "01",
    title: "Hôm nay đã chi gì?",
    body: "Ghi khoản vừa phát sinh trước khi bạn quên mất.",
  },
  {
    number: "02",
    title: "Tiền còn ở tài khoản nào?",
    body: "Xem riêng tiền mặt, ngân hàng và ví điện tử.",
  },
  {
    number: "03",
    title: "Khoản nào làm số dư thay đổi?",
    body: "Mở lại đúng giao dịch thay vì đoán từ một con số tổng.",
  },
] as const;

const flowSteps = [
  {
    number: "01",
    title: "Ghi khoản vừa phát sinh",
    body: "Chọn thu, chi hoặc chuyển tiền; nhập số tiền và tài khoản.",
  },
  {
    number: "02",
    title: "Số dư tự cập nhật",
    body: "MoneyFlow tính từ sổ giao dịch, không bắt bạn sửa số dư bằng tay.",
  },
  {
    number: "03",
    title: "Cần thì mở lại",
    body: "Tìm, sửa hoặc phục hồi đúng giao dịch khiến con số thay đổi.",
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
            <a href="#du-lieu-cua-ban">Dữ liệu của bạn</a>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.navCta}>
              Dùng thử
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Sổ thu chi cá nhân</p>
            <h1 id="landing-title">
              Ghi một lần.
              <span>Cuối tháng khỏi đoán.</span>
            </h1>
            <p className={styles.heroLead}>
              Mỗi khoản thu, chi hay chuyển tiền đều nằm đúng tài khoản.
              Cần kiểm tra khoản nào thì mở lại khoản đó.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Bắt đầu ghi thu chi
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Tôi đã có tài khoản
              </Link>
            </div>

            <p className={styles.heroNote}>
              Bạn tự ghi dữ liệu cần thiết. MoneyFlow không cần mật khẩu ngân hàng.
            </p>
          </div>

          <div
            className={styles.ledgerDemo}
            role="group"
            aria-label="Sổ giao dịch minh hoạ của MoneyFlow"
          >
            <div className={styles.ledgerHeading}>
              <div>
                <span>Tháng 8</span>
                <strong>Sổ giao dịch</strong>
              </div>
              <small>Dữ liệu minh hoạ</small>
            </div>

            <div className={styles.balanceRow}>
              <span>Tổng số dư</span>
              <strong>18.715.000 ₫</strong>
              <small>3 tài khoản đang hoạt động</small>
            </div>

            <div className={styles.entryList}>
              {recentEntries.map((entry) => (
                <article className={styles.entry} key={`${entry.kind}-${entry.title}`}>
                  <span className={styles.entryKind}>{entry.kind}</span>
                  <div>
                    <h2>{entry.title}</h2>
                    <p>{entry.account}</p>
                  </div>
                  <strong className={styles[entry.tone]}>{entry.amount}</strong>
                </article>
              ))}
            </div>

            <div className={styles.ledgerFooter}>
              <span>4 giao dịch gần nhất</span>
              <span>Chuyển nội bộ không tính vào chi tiêu</span>
            </div>
          </div>
        </section>

        <section className={styles.questionSection} aria-labelledby="question-title">
          <div className={styles.questionIntro}>
            <p>Không cần thuộc lòng mọi khoản đã tiêu.</p>
            <h2 id="question-title">Chỉ cần mở sổ và nhìn lại.</h2>
          </div>

          <div className={styles.questionList}>
            {questions.map((question) => (
              <article key={question.number}>
                <span>{question.number}</span>
                <h3>{question.title}</h3>
                <p>{question.body}</p>
              </article>
            ))}
          </div>
        </section>

        <RevealSection
          className={styles.flowSection}
          id="cach-hoat-dong"
          aria-labelledby="flow-title"
        >
          <div className={styles.sectionIndex}>01 / Cách hoạt động</div>
          <div className={styles.sectionHeading}>
            <h2 id="flow-title">Một khoản tiền đi qua ba bước.</h2>
            <p>
              Không có dashboard giả, không có con số tự đoán. Mọi thứ bắt đầu
              từ giao dịch bạn chủ động ghi.
            </p>
          </div>

          <div className={styles.flowTrack}>
            {flowSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection
          className={styles.ownershipSection}
          id="du-lieu-cua-ban"
          aria-labelledby="ownership-title"
        >
          <div className={styles.sectionIndex}>02 / Dữ liệu của bạn</div>
          <div className={styles.ownershipGrid}>
            <div className={styles.ownershipCopy}>
              <h2 id="ownership-title">
                Dữ liệu của bạn vẫn là dữ liệu của bạn.
              </h2>
              <p>
                Không liên kết tài khoản ngân hàng. Có thể sửa, phục hồi và xuất
                lịch sử giao dịch ra CSV khi cần.
              </p>
            </div>

            <dl className={styles.ownershipList}>
              <div>
                <dt>Nhập dữ liệu</dt>
                <dd>Bạn quyết định khoản nào được ghi vào MoneyFlow.</dd>
              </div>
              <div>
                <dt>Kiểm tra lại</dt>
                <dd>Mỗi số tổng đều quay về được đúng giao dịch tạo ra nó.</dd>
              </div>
              <div>
                <dt>Đem dữ liệu đi</dt>
                <dd>Xuất CSV để tự lưu, kiểm tra hoặc tiếp tục xử lý.</dd>
              </div>
            </dl>
          </div>
        </RevealSection>

        <RevealSection
          className={styles.finalCta}
          aria-labelledby="final-cta-title"
        >
          <p>Khoản gần nhất bạn còn nhớ là đủ để bắt đầu.</p>
          <div>
            <h2 id="final-cta-title">Tạo sổ rồi ghi khoản đầu tiên.</h2>
            <Link href="/register" className={styles.finalCtaButton}>
              Dùng thử MoneyFlow
            </Link>
          </div>
        </RevealSection>
      </main>

      <footer className={styles.footer}>
        <BrandLockup
          className={styles.footerBrand}
          href="/"
          ariaLabel="MoneyFlow, trang chủ"
          size="compact"
        />
        <p>Ghi lại để khỏi phải đoán.</p>
        <div>
          <Link href="/privacy">Quyền riêng tư</Link>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
