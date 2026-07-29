import { Circle } from "lucide-react";
import Link from "next/link";
import styles from "./brand-lockup.module.css";

export type BrandSize = "micro" | "compact" | "standard" | "large";
export type BrandTone = "default" | "inverse";

type Coin = {
  x: number;
  y: number;
  cx: number;
  cy: number;
};

const COINS: Coin[] = [
  { x: 27, y: 8, cx: 32, cy: 13 },
  { x: 16, y: 17, cx: 21, cy: 22 },
  { x: 38, y: 17, cx: 43, cy: 22 },
  { x: 13, y: 28, cx: 18, cy: 33 },
  { x: 41, y: 28, cx: 46, cy: 33 },
  { x: 16, y: 39, cx: 21, cy: 44 },
  { x: 38, y: 39, cx: 43, cy: 44 },
];

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
      data-brand-shape="coin-rice"
    >
      <rect className={styles.container} x="4" y="4" width="56" height="56" rx="16" />
      <g className={styles.glyph}>
        <path className={styles.stem} d="M32 50V17" />
        <path className={styles.branch} d="M32 24C28 24 25 23 21 22" />
        <path className={styles.branch} d="M32 24C36 24 39 23 43 22" />
        <path className={styles.branch} d="M32 34C27 34 23 33 18 33" />
        <path className={styles.branch} d="M32 34C37 34 41 33 46 33" />
        <path className={styles.branch} d="M32 44C28 44 25 44 21 44" />
        <path className={styles.branch} d="M32 44C36 44 39 44 43 44" />
        {COINS.map((coin) => (
          <Circle
            key={`${coin.cx}-${coin.cy}`}
            className={styles.coin}
            x={coin.x}
            y={coin.y}
            size={10}
            strokeWidth={2.6}
            absoluteStrokeWidth
          />
        ))}
        {COINS.map((coin) => (
          <circle
            key={`center-${coin.cx}-${coin.cy}`}
            className={styles.coinCenter}
            cx={coin.cx}
            cy={coin.cy}
            r="1.15"
          />
        ))}
      </g>
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
