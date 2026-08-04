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
import themeStyles from "@/components/public-brand-theme.module.css";
import styles from "./public-entry-prototypes.module.css";

type Direction = "proof-first" | "guided-story" | "task-led";

const directions: Array<{ href: string; key: Direction; label: string }> = [
  { href: "/design-preview/proof-first", key: "proof-first", label: "A · Proof-first" },
  { href: "/design-preview/guided-story", key: "guided-story", label: "B · Guided story" },
  { href: "/design-preview/task-led", key: "task-led", label: "C · Task-led" },
];

const trustFacts = [
  "Không liên kết ngân hàng",
  "Có thể sửa và phục hồi",
  "Xuất CSV khi cần",
] as const;

const productProof = [
  {
    key: "accounts",
    title: "Biết tiền đang ở đâu",
    body: "Số dư được tạo từ giao dịch của từng tài khoản, không phải một con số nhập tay.",
    src: "/landing/moneyflow-accounts.svg",
    width: 800,
    height: 938,
    alt: "Màn hình tài khoản MoneyFlow từ môi trường kiểm thử",
  },
  {
    key: "capture",
    title: "Ghi đúng bản chất",
    body: "Thu, chi và chuyển nội bộ được phân biệt ngay từ lúc nhập.",
    src: "/landing/moneyflow-quick-capture.svg",
    width: 800,
    height: 850,
    alt: "Màn hình thêm nhanh MoneyFlow từ môi trường kiểm thử",
  },
  {
    key: "ledger",
    title: "Mở lại để kiểm tra",
    body: "Tìm đúng giao dịch đứng sau một số dư hoặc một khoản tổng hợp.",
    src: "/landing/moneyflow-transactions.svg",
    width: 800,
    height: 668,
    alt: "Màn hình sổ giao dịch MoneyFlow từ môi trường kiểm thử",
  },
] as const;

function PreviewToolbar({ active }: { active: Direction }) {
  return (
    <aside className={styles.previewToolbar} aria-label="Chọn prototype thiết kế">
      <strong>MoneyFlow design preview</strong>
      <nav>
        {directions.map((direction) => (
          <Link
            key={direction.key}
            href={direction.href}
            aria-current={active === direction.key ? "page" : undefined}
          >
            {direction.label}
          </Link>
        ))}
      </nav>
      <span>Chỉ dùng để review · không phải production</span>
    </aside>
  );
}

function SiteHeader() {
  return (
    <header className={styles.siteHeader}>
      <BrandLockup href="/" ariaLabel="MoneyFlow, trang chủ" size="standard" />
      <nav aria-label="Điều hướng prototype">
        <a href="#cach-hoat-dong">Cách hoạt động</a>
        <a href="#quyen-kiem-soat">Quyền kiểm soát</a>
      </nav>
      <div className={styles.headerActions}>
        <Link href="/login" className={styles.loginLink}>Đăng nhập</Link>
        <Link href="/register" className={styles.smallCta}>Tạo sổ</Link>
      </div>
    </header>
  );
}

function TrustFacts() {
  return (
    <ul className={styles.trustFacts} aria-label="Cam kết chính">
      {trustFacts.map((fact) => (
        <li key={fact}><Check size={15} aria-hidden="true" />{fact}</li>
      ))}
    </ul>
  );
}

function PrimaryActions() {
  return (
    <div className={styles.primaryActions}>
      <Link href="/register" className={styles.primaryCta}>
        Tạo sổ của bạn <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <a href="#cach-hoat-dong" className={styles.secondaryCta}>Xem cách hoạt động</a>
    </div>
  );
}

function ProofCard({ item, featured = false }: { item: (typeof productProof)[number]; featured?: boolean }) {
  return (
    <figure className={`${styles.proofCard} ${featured ? styles.featuredProof : ""}`}>
      <div className={styles.windowBar} aria-hidden="true"><span /><span /><span /><b>{item.title}</b></div>
      <div className={styles.proofImage}>
        <Image
          src={item.src}
          width={item.width}
          height={item.height}
          sizes={featured ? "(max-width: 900px) 92vw, 50vw" : "(max-width: 900px) 92vw, 28vw"}
          alt={item.alt}
          priority={item.key !== "ledger"}
        />
      </div>
      <figcaption><strong>{item.title}</strong><span>{item.body}</span></figcaption>
    </figure>
  );
}

function ControlSection() {
  const items = [
    { icon: ShieldCheck, title: "Không cần mật khẩu ngân hàng", body: "Bạn quyết định dữ liệu nào được ghi vào sổ." },
    { icon: ArrowRightLeft, title: "Chuyển tiền được tính đúng", body: "Chuyển nội bộ không làm chi tiêu bị phóng đại." },
    { icon: Undo2, title: "Có đường sửa và phục hồi", body: "Một lần nhập sai không cần trở thành sai lệch kéo dài." },
    { icon: FileDown, title: "Lấy dữ liệu ra khi cần", body: "Xuất lịch sử giao dịch ra CSV để tự kiểm tra." },
  ] as const;

  return (
    <section className={styles.controlSection} id="quyen-kiem-soat" aria-labelledby="control-title">
      <div className={styles.sectionHeading}>
        <p>Quyền kiểm soát nằm trong sản phẩm</p>
        <h2 id="control-title">Sổ của bạn. Quyết định của bạn.</h2>
        <span>MoneyFlow sắp xếp dữ liệu bạn chủ động nhập, không giả vờ trở thành một ngân hàng khác.</span>
      </div>
      <div className={styles.controlGrid}>
        {items.map((item) => (
          <article key={item.title}>
            <item.icon size={21} aria-hidden="true" />
            <div><h3>{item.title}</h3><p>{item.body}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.finalCta}>
      <div><p>Bắt đầu bằng giao dịch gần nhất</p><h2>Tạo một sổ mà mỗi con số đều có chỗ để kiểm tra.</h2></div>
      <Link href="/register" className={styles.primaryCta}>Tạo tài khoản <ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  );
}

function PageFooter() {
  return (
    <footer className={styles.footer}>
      <BrandLockup href="/" ariaLabel="MoneyFlow, trang chủ" size="compact" />
      <p>Ghi đúng dòng tiền. Mở lại để kiểm tra.</p>
      <div><Link href="/privacy">Quyền riêng tư</Link><Link href="/login">Đăng nhập</Link></div>
    </footer>
  );
}

export function ProofFirstPrototype() {
  return (
    <div className={`${styles.page} ${themeStyles.landingTheme}`}>
      <PreviewToolbar active="proof-first" />
      <SiteHeader />
      <main>
        <section className={`${styles.hero} ${styles.proofFirstHero}`} aria-labelledby="proof-first-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Sổ thu chi cá nhân · bạn chủ động ghi</p>
            <h1 id="proof-first-title"><span>Biết tiền đang ở đâu.</span><span>Biết vì sao nó thay đổi.</span></h1>
            <p className={styles.heroLead}>Ghi thu, chi và chuyển tiền đúng bản chất. Theo dõi từng tài khoản và mở lại mọi con số để kiểm tra.</p>
            <PrimaryActions />
            <TrustFacts />
          </div>
          <div className={styles.proofFirstStage} aria-label="Bằng chứng sản phẩm MoneyFlow">
            <ProofCard item={productProof[0]} featured />
            <div className={styles.supportingProofs}>
              <ProofCard item={productProof[1]} />
              <ProofCard item={productProof[2]} />
            </div>
          </div>
        </section>

        <section className={styles.flowStrip} id="cach-hoat-dong" aria-label="Luồng dữ liệu MoneyFlow">
          <span>Ghi giao dịch</span><ArrowRight size={17} aria-hidden="true" /><span>Cập nhật tài khoản</span><ArrowRight size={17} aria-hidden="true" /><span>Mở sổ đối chiếu</span>
        </section>
        <ControlSection />
        <FinalCta />
      </main>
      <PageFooter />
    </div>
  );
}

const storySteps = [
  { number: "01", eyebrow: "Bạn vừa ghi gì?", title: "Ghi đúng loại giao dịch ngay từ đầu.", body: "Thu, chi và chuyển nội bộ có ý nghĩa khác nhau. MoneyFlow giữ chúng tách biệt để báo cáo không bị sai bản chất.", item: productProof[1], icon: ReceiptText },
  { number: "02", eyebrow: "Số dư nào thay đổi?", title: "Mỗi giao dịch đi vào đúng tài khoản.", body: "Tiền mặt, ngân hàng và ví điện tử không bị trộn thành một con số không thể giải thích.", item: productProof[0], icon: WalletCards },
  { number: "03", eyebrow: "Con số đến từ đâu?", title: "Mở lại đúng khoản đứng sau số tổng.", body: "Tìm, lọc và sửa giao dịch thay vì đoán từ một biểu đồ hoặc một số dư nhập tay.", item: productProof[2], icon: Search },
] as const;

export function GuidedStoryPrototype() {
  return (
    <div className={`${styles.page} ${themeStyles.landingTheme}`}>
      <PreviewToolbar active="guided-story" />
      <SiteHeader />
      <main>
        <section className={`${styles.hero} ${styles.storyHero}`} aria-labelledby="guided-story-title">
          <p className={styles.kicker}>Một dòng tiền · một câu chuyện kiểm tra được</p>
          <h1 id="guided-story-title">Từ lúc ghi đến lúc hiểu tiền của mình.</h1>
          <p className={styles.heroLead}>MoneyFlow dẫn bạn qua đúng ba câu hỏi: vừa ghi gì, tài khoản nào thay đổi và con số đó đến từ đâu.</p>
          <PrimaryActions />
          <TrustFacts />
        </section>

        <section className={styles.storySequence} id="cach-hoat-dong" aria-label="Ba bước sử dụng MoneyFlow">
          {storySteps.map((step, index) => (
            <article key={step.number} className={index % 2 === 1 ? styles.storyReverse : undefined}>
              <div className={styles.storyCopy}>
                <div className={styles.storyNumber}><step.icon size={20} aria-hidden="true" /><span>{step.number}</span></div>
                <p>{step.eyebrow}</p><h2>{step.title}</h2><span>{step.body}</span>
              </div>
              <ProofCard item={step.item} featured />
            </article>
          ))}
        </section>
        <ControlSection />
        <FinalCta />
      </main>
      <PageFooter />
    </div>
  );
}

const tasks = [
  { id: "ghi-khoan-chi", icon: ReceiptText, title: "Ghi một khoản chi", body: "Chọn loại, số tiền, danh mục và tài khoản trong một luồng ngắn.", item: productProof[1] },
  { id: "kiem-tra-so-du", icon: WalletCards, title: "Kiểm tra số dư", body: "Xem tiền đang nằm ở tài khoản nào và số dư được tạo ra từ đâu.", item: productProof[0] },
  { id: "tim-giao-dich", icon: Search, title: "Tìm lại một giao dịch", body: "Mở sổ, lọc đúng khoản và sửa khi phát hiện sai sót.", item: productProof[2] },
] as const;

export function TaskLedPrototype() {
  return (
    <div className={`${styles.page} ${themeStyles.landingTheme}`}>
      <PreviewToolbar active="task-led" />
      <SiteHeader />
      <main>
        <section className={`${styles.hero} ${styles.taskHero}`} aria-labelledby="task-led-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Bắt đầu từ việc bạn cần làm hôm nay</p>
            <h1 id="task-led-title">Ghi nhanh. Kiểm tra rõ. Sửa được.</h1>
            <p className={styles.heroLead}>Chọn một nhiệm vụ để xem MoneyFlow xử lý dòng tiền như thế nào.</p>
            <PrimaryActions />
            <TrustFacts />
          </div>
          <nav className={styles.taskSelector} aria-label="Chọn nhiệm vụ để xem">
            {tasks.map((task, index) => (
              <a key={task.id} href={`#${task.id}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <task.icon size={21} aria-hidden="true" />
                <strong>{task.title}</strong>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </section>

        <section className={styles.taskProofs} id="cach-hoat-dong" aria-label="Nhiệm vụ chính trong MoneyFlow">
          {tasks.map((task, index) => (
            <article id={task.id} key={task.id}>
              <div className={styles.taskCopy}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <task.icon size={24} aria-hidden="true" />
                <h2>{task.title}</h2><p>{task.body}</p>
                <Link href="/register">Bắt đầu với nhiệm vụ này <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
              <ProofCard item={task.item} featured />
            </article>
          ))}
        </section>
        <ControlSection />
        <FinalCta />
      </main>
      <PageFooter />
    </div>
  );
}

export function DesignPreviewIndex() {
  return (
    <div className={`${styles.previewIndex} ${themeStyles.landingTheme}`}>
      <BrandLockup href="/" ariaLabel="MoneyFlow, trang chủ" size="standard" />
      <div className={styles.indexIntro}>
        <p>MoneyFlow web design program</p>
        <h1>Ba hướng thiết kế chạy trực tiếp bằng code.</h1>
        <span>Mỗi prototype dùng cùng product truth, nội dung và design authority; điểm khác nhau là hierarchy và flow.</span>
      </div>
      <div className={styles.directionCards}>
        <Link href="/design-preview/proof-first"><span>A</span><h2>Proof-first split</h2><p>Đưa sản phẩm thật vào ngay first viewport. Nhanh hiểu, rủi ro thấp.</p><strong>Mở prototype <ArrowRight size={18} /></strong></Link>
        <Link href="/design-preview/guided-story"><span>B</span><h2>Guided story</h2><p>Kể tuyến tính từ lúc ghi đến lúc mở sổ đối chiếu. Dễ học nhất.</p><strong>Mở prototype <ArrowRight size={18} /></strong></Link>
        <Link href="/design-preview/task-led"><span>C</span><h2>Task-led tour</h2><p>Bắt đầu bằng nhiệm vụ thật của người dùng. Product-led nhất.</p><strong>Mở prototype <ArrowRight size={18} /></strong></Link>
      </div>
      <p className={styles.indexNote}>Preview route có noindex và sẽ bị xóa trước khi merge thiết kế cuối vào production.</p>
    </div>
  );
}
