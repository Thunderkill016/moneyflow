"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, HandCoins, Link2, Search } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-lockup";
import styles from "./mobile-welcome.module.css";

/**
 * Mobile welcome — the app-style first screen shown on `/` at ≤760px
 * instead of the desktop hero. One job: explain what MoneyFlow does in
 * three honest slides (only capabilities that actually exist), then hand
 * off to register or login.
 *
 * Desktop never sees this tree styled — the module hides it above the
 * mobile breakpoint, and landing-page.module.css hides the desktop
 * header/hero at ≤760px so neither layout doubles up.
 */

const SLIDES = [
  {
    icon: HandCoins,
    title: "Ghi nhanh mọi lúc",
    body: "Ghi tay một khoản chỉ mất vài giây — chọn loại, nhập số tiền, xong. Không cần mở sổ dài dòng.",
  },
  {
    icon: Search,
    title: "Mọi con số kiểm tra được",
    body: "Từ một tổng bất kỳ, mở lại đúng giao dịch tạo ra nó. Sai thì sửa được, xóa nhầm thì khôi phục được.",
  },
  {
    icon: Link2,
    title: "Không cần liên kết ngân hàng",
    body: "MoneyFlow không hỏi mật khẩu ngân hàng. Dữ liệu vào sổ khi bạn quyết định ghi nó.",
  },
] as const;

const SWIPE_THRESHOLD_PX = 40;

export function MobileWelcome() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start == null) return;
      const delta = (event.changedTouches[0]?.clientX ?? start) - start;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      // Swipe left advances, swipe right goes back.
      goTo(index + (delta < 0 ? 1 : -1));
    },
    [goTo, index],
  );

  const last = index === SLIDES.length - 1;

  return (
    <section className={styles.welcome} aria-label="Giới thiệu MoneyFlow">
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <BrandMark size="compact" />
          <span className={styles.brandName}>MoneyFlow</span>
        </span>
        {/* Bỏ qua exits the intro straight into sign-in — the same
            contract the mobile app's intro uses. */}
        {!last ? (
          <Link className={styles.skip} href="/login">
            Bỏ qua
          </Link>
        ) : null}
      </header>

      <h1 className={styles.headline}>Biết tiền ở đâu, vì sao thay đổi.</h1>
      <p className={styles.lead}>
        Sổ thu chi cho người Việt — ghi tay được, kiểm tra được từng con số.
      </p>

      <div
        className={styles.carousel}
        role="region"
        aria-roledescription="carousel"
        aria-label="Ba điều MoneyFlow làm được"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, i) => (
            <article
              key={slide.title}
              className={styles.slide}
              aria-hidden={i !== index}
            >
              <span className={styles.slideIcon} aria-hidden="true">
                <slide.icon size={30} strokeWidth={1.8} />
              </span>
              <h2 className={styles.slideTitle}>{slide.title}</h2>
              <p className={styles.slideBody}>{slide.body}</p>
            </article>
          ))}
        </div>
        <div
          className={styles.dots}
          role="tablist"
          aria-label="Trang giới thiệu"
        >
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Trang ${i + 1}: ${slide.title}`}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <p className={styles.swipeHint} aria-hidden="true">
          Vuốt để xem tiếp
        </p>
      </div>

      <div className={styles.ctaRow}>
        <Link href="/register" className={styles.primaryCta}>
          Tạo sổ
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/login" className={styles.secondaryCta}>
          Đăng nhập
        </Link>
      </div>

      <ul className={styles.trustRow} aria-label="Cam kết chính">
        <li>
          <Check size={14} aria-hidden="true" /> Không hứa tính năng chưa có
        </li>
        <li>
          <Check size={14} aria-hidden="true" /> Dữ liệu của bạn, xuất được
        </li>
      </ul>
    </section>
  );
}
