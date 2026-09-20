import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileDown,
  Lock,
  Plus,
  ReceiptText,
  Scale,
  ShieldCheck,
  WalletCards,
  AlertTriangle,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";
import themeStyles from "./public-brand-theme.module.css";

const storySteps = [
  {
    id: "today",
    label: "Today",
    image: "/landing/product-today.png",
    width: 1440,
    height: 900,
    alt: "Giao diện Tổng quan Today của MoneyFlow",
  },
  {
    id: "activity",
    label: "Activity",
    image: "/landing/product-activity.png",
    width: 1440,
    height: 900,
    alt: "Giao diện Sổ giao dịch Activity của MoneyFlow",
  },
  {
    id: "accounts",
    label: "Accounts",
    image: "/landing/product-accounts.png",
    width: 1440,
    height: 900,
    alt: "Giao diện Tài khoản Accounts của MoneyFlow",
  },
  {
    id: "plan",
    label: "Plan",
    image: "/landing/product-plan.png",
    width: 1440,
    height: 900,
    alt: "Giao diện Kế hoạch Plan của MoneyFlow",
  },
] as const;

export function LandingPage() {
  return (
    <div className={`${styles.page} ${themeStyles.landingTheme}`}>
      <a className={styles.skipLink} href="#noi-dung">
        Bỏ qua điều hướng
      </a>

      {/* 1. Navigation */}
      <header className={styles.siteHeader}>
        <nav className={styles.nav} aria-label="Điều hướng trang chủ">
          <BrandLockup
            className={styles.brand}
            href="/"
            ariaLabel="MoneyFlow, trang chủ"
            size="standard"
          />

          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.navCta}>
              Bắt đầu
            </Link>
          </div>
        </nav>
      </header>

      <main id="noi-dung">
        {/* 2. Hero — asymmetric layout with product tab switcher */}
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Sổ tài chính cá nhân của bạn</p>
              <h1 id="landing-title" className={styles.headline}>
                Biết tiền của bạn đang ở đâu.
              </h1>
              <p className={styles.heroLead}>
                MoneyFlow mang đến một nơi tin cậy để ghi nhận, nhìn rõ, đối soát
                và lên kế hoạch cho tiền của bạn — bắt đầu từ giao dịch thực tế,
                không cần liên kết ngân hàng.
              </p>

              <div className={styles.heroActions}>
                <Link href="/register" className={styles.primaryCta}>
                  Dùng thử MoneyFlow
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/login" className={styles.secondaryCta}>
                  Đăng nhập
                </Link>
              </div>

              <p className={styles.trustLine}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Dữ liệu của bạn. Sổ của bạn. Không quảng cáo tài chính.</span>
              </p>
            </div>

            {/* Product Window with CSS-only tab switching */}
            <div className={styles.productHeroSection}>
              <div className={styles.productWindow}>
                <div className={styles.windowChrome} aria-hidden="true">
                  <div className={styles.trafficLights}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className={styles.windowTitle}>
                    MoneyFlow · Sổ tài chính tháng 09/2026
                  </div>
                  <div className={styles.windowStatus}>
                    <span className={styles.statusDot} /> Đã đồng bộ sổ
                  </div>
                </div>

                {/* CSS-only tabs using hidden radios */}
                <div className={styles.tabBar}>
                  {storySteps.map((step, index) => (
                    <label key={step.id} className={styles.tabLabel}>
                      <input
                        type="radio"
                        name="product-tab"
                        className={styles.tabRadio}
                        defaultChecked={index === 0}
                        aria-label={`Xem giao diện ${step.label}`}
                      />
                      <span className={styles.tabText}>{step.label}</span>
                    </label>
                  ))}
                </div>

                <div className={styles.productCanvas}>
                  {storySteps.map((step) => (
                    <div key={step.id} className={styles.tabPanel}>
                      <Image
                        src={step.image}
                        width={step.width}
                        height={step.height}
                        sizes="(max-width: 860px) 92vw, 560px"
                        alt={step.alt}
                        loading="eager"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className={styles.evidenceCaption}>
            Giao diện thật từ môi trường kiểm thử với dữ liệu tài chính Việt Nam thực tế.{" "}
            <a href="#kham-pha" className={styles.cardLink}>
              Khám phá tính năng &darr;
            </a>
          </p>
        </section>

        {/* 3. BENTO GRID — 6 product proof tiles */}
        <RevealSection
          className={styles.bentoSection}
          id="kham-pha"
          aria-labelledby="bento-title"
        >
          <div className={styles.bentoHeader}>
            <p className={styles.sectionEyebrow}>TRIẾT LÝ SẢN PHẨM</p>
            <h2 id="bento-title" className={styles.bentoHeadline}>
              Một nơi để biết điều gì đã xảy ra với tiền của bạn — và điều gì cần làm tiếp theo.
            </h2>
          </div>

          <div className={styles.bentoGrid}>
            {/* Bento A — Đối Soát Kỷ Luật (large 2×2) */}
            <article className={`${styles.bentoTile} ${styles.bentoA}`}>
              <div className={styles.tileTopline}>
                <Scale size={20} className={styles.tileIcon} aria-hidden="true" />
                <span className={styles.tileLabel}>ĐỐI SOÁT</span>
              </div>
              <h3 className={styles.tileTitle}>
                Đối chiếu sổ MoneyFlow với số dư thực tế.
              </h3>
              <p className={styles.tileBody}>
                So khớp từng khoản với sao kê ngân hàng. Nút hoàn tất đối soát chỉ mở
                khi chênh lệch bằng đúng 0 ₫. Không bao giờ tự bù trừ số liệu khống.
              </p>

              {/* Mini reconciliation demo */}
              <div className={styles.reconDemo}>
                <div className={styles.reconRow}>
                  <div>
                    <div className={styles.reconName}>Techcombank Inspire Pay</div>
                    <div className={styles.reconMeta}>1903••••882</div>
                  </div>
                  <div className={styles.reconRight}>
                    <div className={styles.reconBalance}>32.450.000 ₫</div>
                    <span className={styles.tagWarning}>LỆCH +400.000 ₫</span>
                  </div>
                </div>
                <div className={styles.reconRow}>
                  <div>
                    <div className={styles.reconName}>Napas QR 22:15</div>
                    <div className={styles.reconMeta}>Chưa vào sổ · +400.000 ₫</div>
                  </div>
                  <div className={styles.reconAction}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>Ghi nhận</span>
                  </div>
                </div>
                <div className={styles.reconResult}>
                  <AlertTriangle size={14} className={styles.alertIcon} aria-hidden="true" />
                  <span>Chênh lệch: +400.000 ₫</span>
                </div>
                <div className={styles.reconResultOk}>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <span>Chênh lệch: 0 ₫ · Sẵn sàng khóa sổ</span>
                </div>
              </div>

              <div className={styles.tileProof}>
                <span className={styles.proofReconcile}>
                  <Lock size={12} aria-hidden="true" /> Khóa khi lệch != 0 ₫
                </span>
              </div>
            </article>

            {/* Bento B — Ghi Nhanh Công Thái Học (tall 1×2) */}
            <article className={`${styles.bentoTile} ${styles.bentoB}`}>
              <div className={styles.tileTopline}>
                <ReceiptText size={20} className={styles.tileIcon} aria-hidden="true" />
                <span className={styles.tileLabel}>GHI LẠI</span>
              </div>
              <h3 className={styles.tileTitle}>
                Ghi một khoản chi trước khi bạn quên nó.
              </h3>

              <div className={styles.phoneFrame}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneContent}>
                  <div className={styles.phoneHeader}>
                    <span>+ Ghi chi tiêu mới</span>
                    <span className={styles.phoneAccountBadge}>Ví MoMo</span>
                  </div>

                  <div className={styles.phoneAmountBox}>
                    <div className={styles.phoneAmountLabel}>SỐ TIỀN CHI TIÊU</div>
                    <div className={styles.phoneAmountValue}>− 65.000 ₫</div>
                  </div>

                  <div className={styles.phoneCategorySelector}>
                    <div className={`${styles.phoneCatItem} ${styles.activeCat}`}>Cà phê</div>
                    <div className={styles.phoneCatItem}>Ăn trưa</div>
                    <div className={styles.phoneCatItem}>Đi lại</div>
                    <div className={styles.phoneCatItem}>Mua sắm</div>
                  </div>

                  <div className={styles.phoneNumpadGrid}>
                    <div className={styles.numKey}>1</div>
                    <div className={styles.numKey}>2</div>
                    <div className={styles.numKey}>3</div>
                    <div className={styles.numKey}>4</div>
                    <div className={styles.numKey}>5</div>
                    <div className={styles.numKey}>6</div>
                    <div className={styles.numKey}>7</div>
                    <div className={styles.numKey}>8</div>
                    <div className={styles.numKey}>9</div>
                    <div className={styles.numKey}>000</div>
                    <div className={styles.numKey}>0</div>
                    <div className={styles.numKey}>⌫</div>
                  </div>

                  <div className={styles.phoneSaveButton}>
                    Lưu Giao Dịch (65.000 ₫)
                  </div>
                </div>
              </div>

              <div className={styles.tileProof}>
                <span className={styles.proofPill}>Ghi tay</span>
                <span className={styles.proofPill}>Dán văn bản</span>
                <span className={styles.proofPill}>Sao kê CSV</span>
              </div>
            </article>

            {/* Bento C — Tách Bạch Chuyển Nội Bộ (wide 2×1) */}
            <article className={`${styles.bentoTile} ${styles.bentoC}`}>
              <div className={styles.tileTopline}>
                <WalletCards size={20} className={styles.tileIcon} aria-hidden="true" />
                <span className={styles.tileLabel}>THẤU HIỂU</span>
              </div>
              <h3 className={styles.tileTitle}>
                Chuyển nội bộ không bị tính thành chi tiêu phóng đại.
              </h3>

              <div className={styles.transferDemo}>
                <div className={styles.transferAccount}>
                  <div className={styles.transferFrom}>Techcombank</div>
                  <div className={styles.expenseText}>− 2.000.000 ₫</div>
                </div>
                <div className={styles.transferArrow}>↔</div>
                <div className={styles.transferAccount}>
                  <div className={styles.transferTo}>Ví MoMo</div>
                  <div className={styles.incomeText}>+ 2.000.000 ₫</div>
                </div>
              </div>
              <div className={styles.transferConclusion}>
                <span className={styles.transferText}>↔ Chuyển khoản nội bộ · Tổng chi tiêu thật: 0 ₫</span>
              </div>

              <div className={styles.tileProof}>
                <span className={styles.proofTag}>Phân loại chuẩn</span>
                <span className={styles.proofTag}>Chuyển ví ↔ tách biệt</span>
              </div>
            </article>

            {/* Bento D — Toàn Quyền Dữ Liệu (wide 2×1) */}
            <article className={`${styles.bentoTile} ${styles.bentoD}`}>
              <div className={styles.tileTopline}>
                <FileDown size={20} className={styles.tileIcon} aria-hidden="true" />
                <span className={styles.tileLabel}>SỞ HỮU DỮ LIỆU</span>
              </div>
              <h3 className={styles.tileTitle}>
                Toàn quyền trích xuất dữ liệu bất kỳ lúc nào.
              </h3>
              <p className={styles.tileBody}>
                Xuất toàn bộ lịch sử giao dịch ra chuẩn định dạng mở CSV hoặc sao lưu
                mã hóa JSON bất kỳ lúc nào để bạn tự lưu trữ.
              </p>

              <div className={styles.exportDemo}>
                <div className={styles.exportButton}>
                  <FileDown size={14} aria-hidden="true" />
                  <span>Xuất CSV</span>
                </div>
                <div className={styles.exportButton}>
                  <FileDown size={14} aria-hidden="true" />
                  <span>Xuất JSON</span>
                </div>
                <div className={styles.exportMeta}>1.247 giao dịch · 14 tháng</div>
              </div>
            </article>

            {/* Bento E — Toán Số Nguyên VNĐ (small 1×1) */}
            <article className={`${styles.bentoTile} ${styles.bentoE}`}>
              <div className={styles.tileTopline}>
                <CheckCircle2 size={20} className={styles.tileIcon} aria-hidden="true" />
                <span className={styles.tileLabel}>ĐỘ CHÍNH XÁC</span>
              </div>
              <h3 className={styles.tileTitle}>Toán số nguyên VNĐ chính xác.</h3>

              <div className={styles.mathDemo}>
                <div className={styles.mathRow}>
                  <span className={styles.incomeText}>+ 32.000.000 ₫</span>
                  <span className={styles.mathLabel}>lương</span>
                </div>
                <div className={styles.mathRow}>
                  <span className={styles.expenseText}>− 18.450.000 ₫</span>
                  <span className={styles.mathLabel}>chi tiêu</span>
                </div>
                <div className={styles.mathDivider} />
                <div className={styles.mathRow}>
                  <span className={styles.surplusText}>+ 13.550.000 ₫</span>
                  <span className={styles.mathLabel}>thặng dư</span>
                </div>
              </div>
            </article>

            {/* Bento F — Sở Hữu & Bảo Mật (small 1×1) */}
            <article className={`${styles.bentoTile} ${styles.bentoF}`}>
              <div className={styles.tileTopline}>
                <ShieldCheck size={20} className={styles.tileIcon} aria-hidden="true" />
                <span className={styles.tileLabel}>ĐỘ TIN CẬY</span>
              </div>
              <h3 className={styles.tileTitle}>Sổ tài chính do bạn sở hữu.</h3>

              <ul className={styles.trustList}>
                <li>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Không quảng cáo tài chính</span>
                </li>
                <li>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Không bán dữ liệu cho bên thứ ba</span>
                </li>
                <li>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Không yêu cầu mật khẩu ngân hàng</span>
                </li>
              </ul>

              <p className={styles.tileCaption}>
                Dữ liệu của bạn. Sổ của bạn. Không quảng cáo tài chính.
              </p>
            </article>
          </div>
        </RevealSection>

        {/* 4. Final CTA */}
        <RevealSection
          className={styles.finalCta}
          aria-labelledby="final-cta-title"
        >
          <div className={styles.finalCtaContent}>
            <h2 id="final-cta-title" className={styles.finalCtaTitle}>
              Tiền của bạn nên dễ hiểu hơn.
            </h2>
            <p className={styles.finalCtaLead}>
              Bắt đầu ghi nhận dòng tiền với sự chính xác, kỷ luật và trung thực ngay hôm nay.
            </p>
            <div className={styles.finalCtaActions}>
              <Link href="/register" className={styles.primaryCta}>
                Bắt đầu với MoneyFlow
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Đăng nhập
              </Link>
            </div>
          </div>
        </RevealSection>
      </main>

      {/* 5. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>
            <BrandLockup
              className={styles.footerBrand}
              href="/"
              ariaLabel="MoneyFlow, trang chủ"
              size="compact"
            />
            <p className={styles.footerTagline}>
              Sổ tài chính cá nhân chuẩn mực.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/privacy">Quyền riêng tư</Link>
            <Link href="/security">Bảo mật</Link>
            <Link href="/login">Đăng nhập</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
