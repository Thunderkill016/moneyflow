import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileDown,
  ListChecks,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";

const benefits = [
  {
    icon: WalletCards,
    title: "Biết tiền đang ở đâu",
    body: "Theo dõi tiền mặt, tài khoản ngân hàng, ví điện tử và ngoại tệ mà không trộn lẫn số dư.",
  },
  {
    icon: ReceiptText,
    title: "Ghi đúng từng dòng tiền",
    body: "Khoản thu, khoản chi và chuyển tiền được tách đúng bản chất để báo cáo không bị sai lệch.",
  },
  {
    icon: ListChecks,
    title: "Xem điều cần xử lý tiếp",
    body: "Lọc giao dịch, theo dõi ngân sách và kiểm tra những khoản cần chú ý từ cùng một hệ thống.",
  },
] as const;

const productMoments = [
  {
    title: "Ghi một khoản trong vài bước rõ ràng",
    body: "Chọn loại giao dịch, số tiền, danh mục và tài khoản. MoneyFlow giữ form ngắn để việc ghi chép không trở thành một công việc riêng.",
    bullets: [
      "Thu và chi dùng cùng một luồng quen thuộc",
      "Danh mục được đặt ngay cạnh số tiền",
      "Có thể tiếp tục ghi nhiều khoản liên tiếp",
    ],
    image: "/landing/moneyflow-quick-capture.svg",
    width: 800,
    height: 850,
    alt: "Màn hình Thêm nhanh của MoneyFlow trong môi trường kiểm thử",
  },
  {
    title: "Kiểm tra lại giao dịch thay vì đoán",
    body: "Danh sách giao dịch cho biết tiền vào, tiền ra và chuyển nội bộ theo từng ngày. Bộ lọc giúp đi từ tổng quan xuống đúng khoản cần kiểm tra.",
    bullets: [
      "Lọc theo loại, danh mục và tài khoản",
      "Chuyển nội bộ không bị tính thành chi tiêu",
      "Sửa và phục hồi khi phát hiện sai sót",
    ],
    image: "/landing/moneyflow-transactions.svg",
    width: 800,
    height: 668,
    alt: "Màn hình Sổ giao dịch của MoneyFlow trong môi trường kiểm thử",
  },
] as const;

const ownershipPoints = [
  {
    icon: LockKeyhole,
    title: "Không cần cung cấp mật khẩu ngân hàng",
    body: "MoneyFlow là manual-first. Bạn chủ động quyết định dữ liệu nào được ghi vào ứng dụng.",
  },
  {
    icon: ShieldCheck,
    title: "Có đường quay lại khi nhập sai",
    body: "Các luồng sửa, xoá mềm và phục hồi giúp một thao tác vội không biến thành sai lệch lâu dài.",
  },
  {
    icon: FileDown,
    title: "Có thể lấy dữ liệu ra",
    body: "Xuất lịch sử ra CSV để kiểm tra, lưu trữ hoặc tiếp tục xử lý ở công cụ khác.",
  },
] as const;

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
            <a href="#loi-ich">Lợi ích</a>
            <a href="#giao-dien">Giao diện</a>
            <a href="#quyen-du-lieu">Quyền dữ liệu</a>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.navCta}>
              Bắt đầu miễn phí
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Quản lý tài chính cá nhân</p>
            <h1 id="landing-title">Nắm rõ tiền của bạn, mỗi ngày.</h1>
            <p className={styles.heroLead}>
              Ghi thu chi, theo dõi tài khoản và xem dòng tiền trong một nơi rõ
              ràng, có thể kiểm tra lại.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Bắt đầu miễn phí
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#giao-dien" className={styles.secondaryCta}>
                Xem giao diện
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

          <figure
            className={styles.productPreview}
            role="figure"
            aria-label="Ảnh giao diện MoneyFlow: tài khoản"
          >
            <div className={styles.previewTopbar} aria-hidden="true">
              <span />
              <span />
              <span />
              <b>Tài khoản</b>
            </div>
            <div className={styles.previewCanvas}>
              <Image
                src="/landing/moneyflow-accounts.svg"
                width={800}
                height={938}
                priority
                sizes="(max-width: 980px) 92vw, 52vw"
                alt="Màn hình Tài khoản của MoneyFlow trong môi trường kiểm thử"
              />
            </div>
            <figcaption>
              Giao diện thật từ bản kiểm thử. Dữ liệu trong ảnh chỉ dùng để minh
              hoạ cách hiển thị.
            </figcaption>
          </figure>
        </section>

        <RevealSection
          className={styles.benefitsSection}
          id="loi-ich"
          aria-labelledby="benefits-title"
        >
          <div className={styles.sectionHeading}>
            <p>Không cần thêm một bảng tính khó duy trì</p>
            <h2 id="benefits-title">Ba câu hỏi, một nơi để trả lời.</h2>
          </div>

          <div className={styles.benefitsGrid}>
            {benefits.map((benefit) => (
              <article key={benefit.title}>
                <benefit.icon size={22} aria-hidden="true" />
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection
          className={styles.productSection}
          id="giao-dien"
          aria-labelledby="product-title"
        >
          <div className={styles.sectionHeading}>
            <p>Giao diện sản phẩm, không phải dashboard dựng để quảng cáo</p>
            <h2 id="product-title">Nhìn đúng màn hình bạn sẽ dùng hằng ngày.</h2>
          </div>

          <div className={styles.productStories}>
            {productMoments.map((moment, index) => (
              <article
                key={moment.title}
                className={`${styles.productStory} ${
                  index % 2 === 1 ? styles.productStoryReverse : ""
                }`}
              >
                <div className={styles.productCopy}>
                  <h3>{moment.title}</h3>
                  <p>{moment.body}</p>
                  <ul>
                    {moment.bullets.map((bullet) => (
                      <li key={bullet}>
                        <Check size={15} aria-hidden="true" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                <figure className={styles.productShot}>
                  <Image
                    src={moment.image}
                    width={moment.width}
                    height={moment.height}
                    sizes="(max-width: 980px) 92vw, 58vw"
                    alt={moment.alt}
                  />
                  <figcaption>Dữ liệu minh hoạ từ môi trường kiểm thử.</figcaption>
                </figure>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection
          className={styles.ownershipSection}
          id="quyen-du-lieu"
          aria-labelledby="ownership-title"
        >
          <div className={styles.ownershipIntro}>
            <p>Quyền kiểm soát không phải một tính năng phụ</p>
            <h2 id="ownership-title">Dữ liệu của bạn vẫn thuộc về bạn.</h2>
            <span>
              MoneyFlow giúp sắp xếp dữ liệu bạn nhập. Ứng dụng không cần quyền
              truy cập tài khoản ngân hàng để làm điều đó.
            </span>
          </div>

          <div className={styles.ownershipGrid}>
            {ownershipPoints.map((point) => (
              <article key={point.title}>
                <point.icon size={22} aria-hidden="true" />
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
            <p>Bắt đầu bằng giao dịch gần nhất.</p>
            <h2 id="final-cta-title">Sẵn sàng bắt đầu?</h2>
          </div>
          <Link href="/register" className={styles.finalCtaButton}>
            Tạo tài khoản miễn phí
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
        <p>Ghi đúng. Nhìn rõ. Kiểm tra lại được.</p>
        <div>
          <Link href="/privacy">Quyền riêng tư</Link>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
