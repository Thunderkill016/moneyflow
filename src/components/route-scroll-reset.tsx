"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The signed-in shell is shared across route transitions, so browsers can
 * occasionally retain the previous document scroll offset. On phones that
 * leaves the next route heading underneath the sticky MoneyFlow topbar.
 *
 * Reset only after a real pathname change. The first render keeps native
 * reload/back-forward restoration intact.
 */
export function RouteScrollReset() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
