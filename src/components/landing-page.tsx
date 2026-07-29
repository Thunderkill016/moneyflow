import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  Ban,
  Download,
  Lock,
  PlusCircle,
  ShieldCheck,
  Wallet,
  Target,
  BarChart3,
} from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { RevealSection } from "@/components/reveal";
import styles from "./landing-page.module.css";

const trustBadges = ["An toàn", "Minh bạch", "Xuất được dữ liệu"];

const proofPoints = [
  { stat: "0", label: "Mật khẩu ngân hàng cần cung cấp" },
  { stat: "100%", label: "Giao dịch do chính bạn xác nhận" },
  { stat: "24/7", label: "Xuất dữ liệu bất cứ lúc nào" },
];

const steps = [
  {
    icon: Wallet,
    title: "Khai báo nơi giữ tiền",
    body: "Tiền mặt, tài khoản ngân hàng, ví điện tử — mỗi nơi một số dư bạn tự nhập, không cần đăng nhập ngân hàng.",
  },
  {
    icon: ArrowLeftRight,
    title: "Ghi đúng bản chất khoản tiền",
    body: "Thu, chi hay chuyển nội bộ — MoneyFlow phân biệt rõ để chuyển khoản không bao giờ lẫn vào chi tiêu.",
  },
  {
    icon: BarChart3,
    title: "Đối chiếu lại bất cứ lúc nào",
    body: "Số dư và báo cáo tháng luôn suy ra được từ đúng những dòng bạn đã ghi — không có số nào tự sinh ra.",
  },
];

const features = [
  {
    icon: PlusCircle,
    title: "Ghi trong vài giây",
    body: "Bàn phím số tối ưu cho điện thoại, gợi ý danh mục quen thuộc để không phải gõ lại từ đầu.",
  },
  {
    icon: Wallet,
    title: "Nhiều ví, một sổ duy nhất",
    body: "Theo dõi song song tiền mặt, ngân hàng, ví điện tử mà không cần trộn dữ liệu thủ công.",
  },
  {
    icon: Target,
    title: "Kế hoạch tách bạch với số dư",
    body: "Ngân sách, khoản định kỳ và mục tiêu tiết kiệm là thứ bạn chủ động đặt ra — không bị biến thành lời khuyên tự động.",
  },
  {
    icon: BarChart3,
    title: "Báo cáo đối chiếu được",
    body: "Xem dòng tiền theo tháng với số liệu chính xác đến từng đồng, sẵn sàng xuất ra khi cần kiểm tra lại.",
  },
];

const ownershipPoints = [
  { icon: Ban, text: "Không yêu cầu liên kết hay đăng nhập ngân hàng" },
  { icon: Download, text: "Xuất toàn bộ dữ liệu ra CSV bất cứ lúc nào" },
  { icon: ShieldCheck, text: "Dữ liệu mỗi người tách riêng ở tầng cơ sở dữ liệu" },
];

const faqItems = [
  {
    question: "Vì sao MoneyFlow không tự động đọc giao dịch ngân hàng?",
    answer:
      "Vì làm vậy cần bạn cung cấp mật khẩu hoặc quyền truy cập tài khoản ngân hàng cho bên thứ ba. MoneyFlow chọn cách an toàn hơn: bạn chủ động ghi, đổi lại là không phải chia sẻ thông tin đăng nhập ngân hàng với bất kỳ ai.",
  },
  {
    question: "Chuyển tiền giữa ví của tôi có bị tính là chi tiêu không?",
    answer:
      "Không. MoneyFlow ghi nhận đây là chuyển nội bộ, tách hẳn khỏi tổng thu và tổng chi, để báo cáo chi tiêu tháng của bạn không bị thổi phồng.",
  },
  {
    question: "MoneyFlow có tự đề xuất tôi nên chi bao nhiêu mỗi ngày không?",
    answer:
      "Không. Ứng dụng chỉ hiển thị số dư, dòng tiền và kế hoạch bạn tự đặt ra. MoneyFlow không suy diễn một con số chi tiêu an toàn khi chưa có đủ dữ liệu thu nhập và nghĩa vụ tài chính thật của bạn.",
  },
  {
    question: "Nếu tôi ngừng dùng, dữ liệu của tôi ra sao?",
    answer:
      "Bạn xuất toàn bộ lịch sử ra file CSV từ phần cài đặt bất cứ lúc nào, và có thể xoá tài khoản cùng dữ liệu khi không còn nhu cầu sử dụng.",
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
            <Badge
              variant="secondary"
              className="h-7 gap-1.5 rounded-full px-3 text-[13px] font-semibold text-foreground"
            >
              <Lock className="size-3.5" />
              Không cần liên kết ngân hàng
            </Badge>
            <h1 id="landing-title">
              Sổ thu chi do chính tay bạn kiểm soát.
              <span> Không đoán, không tự động, không giấu giếm.</span>
            </h1>
            <p className={styles.heroLead}>
              MoneyFlow chỉ ghi lại đúng những gì bạn chủ động nhập. Không đọc
              dữ liệu ngân hàng thay bạn, không suy diễn một lời khuyên chi
              tiêu khi chưa đủ căn cứ — chỉ có con số bạn có thể đối chiếu lại
              bất cứ lúc nào.
            </p>
            <div className={styles.heroActions}>
              <Button
                size="lg"
                render={
                  <Link href="/register">
                    Tạo sổ miễn phí
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                render={<a href="#cach-hoat-dong">Xem cách hoạt động</a>}
              />
            </div>
            <ul className={styles.trustList} aria-label="Cam kết của MoneyFlow">
              {trustBadges.map((label) => (
                <li key={label}>
                  <Badge variant="outline" className="rounded-full">
                    {label}
                  </Badge>
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

        <RevealSection className={styles.proof} aria-label="Điểm nổi bật">
          {proofPoints.map((point) => (
            <div key={point.label}>
              <strong>{point.stat}</strong>
              <span>{point.label}</span>
            </div>
          ))}
        </RevealSection>

        <RevealSection
          className={styles.section}
          id="cach-hoat-dong"
          aria-labelledby="how-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Cách hoạt động</p>
            <h2 id="how-title">Ba bước, không cần học phương pháp mới</h2>
            <p>Ghi trước, hiểu tiền đi đâu sau — theo đúng nhịp của bạn.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="border-border/70">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">
                    {index + 1}. {step.title}
                  </CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </RevealSection>

        <RevealSection
          className={`${styles.section} ${styles.featuresSection}`}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Một sổ dùng hằng ngày</p>
            <h2 id="features-title">Đủ dùng cho việc ghi sổ thật</h2>
            <p>
              Không có tính năng nào yêu cầu bạn phải học tài chính trước khi
              bắt đầu.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border/70">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </RevealSection>

        <RevealSection className={styles.ownership} aria-labelledby="ownership-title">
          <div className={styles.ownershipMark} aria-hidden="true">
            <ShieldCheck className="size-8" />
          </div>
          <div>
            <p className={styles.kicker}>Giữ quyền kiểm soát</p>
            <h2 id="ownership-title">Tiền của bạn. Dữ liệu của bạn.</h2>
            <p>
              MoneyFlow không hỏi mật khẩu ngân hàng, không bán dữ liệu, và
              không giữ bạn lại nếu bạn muốn rời đi cùng toàn bộ lịch sử ghi
              chép của mình.
            </p>
          </div>
          <ul>
            {ownershipPoints.map((point) => (
              <li key={point.text}>
                <point.icon className="size-[18px]" />
                {point.text}
              </li>
            ))}
          </ul>
        </RevealSection>

        <RevealSection
          className={`${styles.section} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Câu hỏi thường gặp</p>
            <h2 id="faq-title">Rõ từ trước khi bắt đầu</h2>
          </div>
          <Accordion defaultValue={[faqItems[0].question]}>
            {faqItems.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-base">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </RevealSection>

        <RevealSection className={styles.finalCta} aria-labelledby="final-cta-title">
          <div>
            <p className={styles.kicker}>Bắt đầu từ khoản đầu tiên</p>
            <h2 id="final-cta-title">Mở sổ MoneyFlow của riêng bạn</h2>
            <p>
              Ghi thu, chi và chuyển tiền cốt lõi ngay hôm nay — không cần
              liên kết ngân hàng, không mất phí.
            </p>
          </div>
          <Button
            size="lg"
            className={styles.finalCtaButton}
            render={
              <Link href="/register">
                Tạo sổ miễn phí
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        </RevealSection>
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
