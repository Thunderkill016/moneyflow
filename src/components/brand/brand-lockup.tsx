import Link from "next/link";
import styles from "./brand-lockup.module.css";

export type BrandSize = "micro" | "compact" | "standard" | "large";
export type BrandTone = "default" | "inverse";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sizeClass(size: BrandSize) {
  if (size === "micro") return styles.micro;
  if (size === "compact") return styles.compact;
  if (size === "large") return styles.large;
  return styles.standard;
}

export function BrandMark({
  size = "standard",
  tone = "default",
  className,
}: {
  size?: BrandSize;
  tone?: BrandTone;
  className?: string;
}) {
  return (
    <svg
      className={cx(
        styles.mark,
        sizeClass(size),
        tone === "inverse" && styles.inverseMark,
        className,
      )}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect className={styles.container} x="4" y="4" width="56" height="56" rx="16" />
      <path
        className={styles.glyph}
        d="M17 43V23.5C17 21.57 18.57 20 20.5 20H22.6L32 34.2L41.4 20H43.5C45.43 20 47 21.57 47 23.5V43"
        fill="none"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLockup({
  href,
  ariaLabel,
  size = "standard",
  tone = "default",
  className,
}: {
  href: string;
  ariaLabel: string;
  size?: BrandSize;
  tone?: BrandTone;
  className?: string;
}) {
  return (
    <Link
      className={cx(
        styles.lockup,
        tone === "inverse" && styles.inverseLockup,
        className,
      )}
      href={href}
      aria-label={ariaLabel}
    >
      <BrandMark size={size} tone={tone} />
      <span className={styles.wordmark}>MoneyFlow</span>
    </Link>
  );
}
