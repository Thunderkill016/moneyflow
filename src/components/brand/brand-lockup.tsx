import { Circle, Leaf } from "lucide-react";
import Link from "next/link";
import styles from "./brand-lockup.module.css";

export type BrandSize = "micro" | "compact" | "standard" | "large";
export type BrandTone = "default" | "inverse";

type Coin = {
  x: number;
  y: number;
  side: "left" | "right";
};

const COINS: Coin[] = [
  { x: 15.5, y: 18, side: "left" },
  { x: 36.5, y: 18, side: "right" },
  { x: 14, y: 28, side: "left" },
  { x: 38, y: 28, side: "right" },
  { x: 15.5, y: 38, side: "left" },
  { x: 36.5, y: 38, side: "right" },
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
        <path className={styles.branch} d="M32 24C29.8 24 28.2 23.2 26.4 22.6" />
        <path className={styles.branch} d="M32 24C34.2 24 35.8 23.2 37.6 22.6" />
        <path className={styles.branch} d="M32 34C29.2 34 27.2 33.2 25.2 32.6" />
        <path className={styles.branch} d="M32 34C34.8 34 36.8 33.2 38.8 32.6" />
        <path className={styles.branch} d="M32 44C29.8 44 28.2 43.2 26.4 42.6" />
        <path className={styles.branch} d="M32 44C34.2 44 35.8 43.2 37.6 42.6" />
        <Leaf
          className={styles.topGrain}
          x={27.5}
          y={7.5}
          width={9}
          height={13}
          strokeWidth={2.1}
          fill="currentColor"
        />
        {COINS.map((coin) => (
          <Circle
            key={`${coin.side}-${coin.x}-${coin.y}`}
            className={cx(
              styles.coin,
              coin.side === "left" ? styles.coinLeft : styles.coinRight,
            )}
            x={coin.x}
            y={coin.y}
            width={12}
            height={8}
            strokeWidth={4.6}
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
