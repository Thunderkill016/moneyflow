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
  { x: 17, y: 18, side: "left" },
  { x: 35, y: 18, side: "right" },
  { x: 15, y: 28, side: "left" },
  { x: 37, y: 28, side: "right" },
  { x: 17, y: 38, side: "left" },
  { x: 35, y: 38, side: "right" },
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
        <path className={styles.branch} d="M32 24C29 24 27 23 23 22" />
        <path className={styles.branch} d="M32 24C35 24 37 23 41 22" />
        <path className={styles.branch} d="M32 34C28 34 25 33 21 32" />
        <path className={styles.branch} d="M32 34C36 34 39 33 43 32" />
        <path className={styles.branch} d="M32 44C29 44 27 43 23 42" />
        <path className={styles.branch} d="M32 44C35 44 37 43 41 42" />
        <Leaf
          className={styles.topGrain}
          x={27.5}
          y={7.5}
          width={9}
          height={13}
          strokeWidth={2.2}
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
            strokeWidth={5.2}
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
