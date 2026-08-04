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
      viewBox="0 0 160 160"
      aria-hidden="true"
      focusable="false"
    >
      <g
        className={styles.flow}
        fill="none"
        strokeWidth="16.18"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22.80 64.20C22.80 40.40 42.10 28.00 66.40 28.00H128.20" />
        <path d="M137.20 95.80C137.20 119.60 117.90 132.00 93.60 132.00H31.80" />
      </g>
      <path
        className={styles.gate}
        d="M80 54.11A16 16 0 0 1 96 70.11V89.89A16 16 0 0 1 80 105.89A16 16 0 0 1 64 89.89V70.11A16 16 0 0 1 80 54.11ZM80 67.06A4.94 4.94 0 0 0 75.06 72V88.01A4.94 4.94 0 0 0 80 92.95A4.94 4.94 0 0 0 84.94 88.01V72A4.94 4.94 0 0 0 80 67.06Z"
        fillRule="evenodd"
        clipRule="evenodd"
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
