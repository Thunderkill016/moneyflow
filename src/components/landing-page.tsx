import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";
import themeStyles from "./public-brand-theme.module.css";

const productSections = [
  {
    id: "ghi-giao-dich",
    title: "Ghi khoản vừa phát sinh",
    body: "Chọn thu, chi hoặc chuyển tiền, nhập số tiền và tài khoản. Bạn không phải đi qua một bảng thiết lập dài trước khi bắt đầu.",
    detail: "Chuyển tiền giữa hai tài khoản không bị tính thành chi tiêu.",
    image: "/landing/moneyflow-quick-capture.svg",
    width: 800,
    height: 850,
    alt: "Màn hình thêm giao dịch nhanh của MoneyFlow",
  },
  {
    id: "xem-tai-khoan",
    title: "Xem tiền còn ở từng tài khoản",
    body: "Tiền mặt, tài khoản ngân hàng và ví điện tử được theo dõi riêng. Tổng số dư được tính từ những giao dịch đã ghi.",
    detail: "Không cần liên kết hoặc nhập mật khẩu ngân hàng.",
    image: "/landing/moneyflow-accounts.svg",
    width: 800,
    height: 938,
    alt: "Màn hình tài khoản của MoneyFlow",
  },
  {
    id: "tim-lai-giao-dich",
    title: "Tìm lại khi cần",
    body: "Lọc theo thời gian, loại giao dịch, danh mục hoặc tài khoản để tìm đúng khoản. Ghi sai thì có thể sửa, xoá mềm và phục hồi.",
    detail: "Có thể xuất lịch sử giao dịch ra CSV.",
    image: "/landing/moneyflow-transactions.svg",
    width: 800,
    height: 668,
    alt: "Màn hình danh sách giao dịch của MoneyFlow",
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
            <a href="#san-pham">Sản phẩm</a>
            <a href="#du-lieu">Dữ liệu của bạn</a>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.navCta}>
              Tạo tài khoản
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.category}>Ứng dụng quản lý thu chi cá nhân</p>
            <h1 id="landing-title">Ghi thu chi, xem tiền còn ở đâu.</h1>
            <p className={styles.heroLead}>
              MoneyFlow giúp bạn ghi từng khoản thu, chi và chuyển tiền theo đúng
              tài khoản. Khi cần, bạn có thể tìm lại, sửa hoặc xuất dữ liệu.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Tạo tài khoản
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Tôi đã có tài khoản
              </Link>
            </div>

            <p className={styles.heroNote}>
              Không cần liên kết ngân hàng · Dữ liệu minh hoạ trong ảnh không
              phải dữ liệu người dùng thật.
            </p>
          </div>

          <figure className={styles.heroProduct}>
            <div className={styles.productBar} aria-hidden="true">
              <span />
              <span />
              <span />
              <b>Thêm giao dịch</b>
            </div>
            <Image
              src="/landing/moneyflow-quick-capture.svg"
              width={800}
              height={850}
              priority
              sizes="(max-width: 900px) 92vw, 44vw"
              alt="Màn hình thêm giao dịch nhanh của MoneyFlow trong môi trường kiểm thử"
            />
            <figcaption>
              Giao diện thật từ môi trường kiểm thử của MoneyFlow.
            </figcaption>
          </figure>
        </section>

        <section className={styles.facts} aria-label="Thông tin chính về MoneyFlow">
          <p>Ghi thủ công, không giả vờ tự động.</p>
          <p>Chuyển nội bộ không tính vào thu hoặc chi.</p>
          <p>Có thể sửa, phục hồi và xuất CSV.</p>
        </section>

        <section className={styles.productIntro} id="san-pham">
          <p>MoneyFlow dùng để làm gì?</p>
          <h2>Ba việc bạn sẽ dùng thường xuyên.</h2>
        </section>

        <div className={styles.productSections}>
          {productSections.map((section, index) => (
            <RevealSection
              key={section.id}
              className={`${styles.productSection} ${
                index % 2 === 1 ? styles.productSectionReverse : ""
              }`}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
            >
              <div className={styles.productCopy}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
                <p>{section.body}</p>
                <small>{section.detail}</small>
              </div>

              <figure className={styles.productShot}>
                <Image
                  src={section.image}
                  width={section.width}
                  height={section.height}
                  sizes="(max-width: 820px) 92vw, 48vw"
                  alt={section.alt}
                />
              </figure>
            </RevealSection>
          ))}
        </div>

        <RevealSection
          className={styles.dataSection}
          id="du-lieu"
          aria-labelledby="data-title"
        >
          <div>
            <p>Dữ liệu của bạn</p>
            <h2 id="data-title">MoneyFlow không cần mật khẩu ngân hàng.</h2>
          </div>
          <div className={styles.dataCopy}>
            <p>
              Bạn tự quyết định khoản nào được ghi. MoneyFlow sắp xếp dữ liệu đó
              thành tài khoản, giao dịch và báo cáo để bạn dễ kiểm tra lại.
            </p>
            <p>
              Dữ liệu có thể được chỉnh sửa, phục hồi sau khi xoá nhầm và xuất
              ra CSV khi bạn cần lưu riêng hoặc xử lý tiếp.
            </p>
          </div>
        </RevealSection>

        <RevealSection
          className={styles.finalCta}
          aria-labelledby="final-cta-title"
        >
          <div>
            <h2 id="final-cta-title">Bắt đầu với khoản gần nhất bạn vừa chi.</h2>
            <p>Bạn có thể thêm tài khoản và dữ liệu khác sau.</p>
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
        <p>Quản lý thu chi cá nhân cho người Việt.</p>
        <div>
          <Link href="/privacy">Quyền riêng tư</Link>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
