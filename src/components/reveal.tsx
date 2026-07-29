"use client";

import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";

type RevealSectionProps = HTMLAttributes<HTMLElement>;

/**
 * Reveals a marketing section as it scrolls into view. Never wrap financial
 * figures or ledger rows with this — Calm Ledger v2 forbids entrance
 * choreography on financial data (docs/design/CALM_LEDGER_V2.md, "Motion and
 * focus"). The visual state lives in CSS via the data-revealed attribute so
 * `prefers-reduced-motion` (globals.css) collapses it to an instant show.
 */
export function RevealSection({ children, ...rest }: RevealSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} data-revealed={revealed} {...rest}>
      {children}
    </section>
  );
}
