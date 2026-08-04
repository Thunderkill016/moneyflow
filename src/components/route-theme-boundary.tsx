"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const PUBLIC_LIGHT_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
]);

export function isPublicLightPath(pathname: string) {
  return PUBLIC_LIGHT_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

function resolveWorkspaceTheme() {
  const preference = localStorage.getItem("moneyflow-theme") || "system";
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference === "dark" ? "dark" : "light";
}

export function RouteThemeBoundary() {
  const pathname = usePathname();

  useEffect(() => {
    const theme = isPublicLightPath(pathname) ? "light" : resolveWorkspaceTheme();
    document.documentElement.setAttribute("data-theme", theme);
  }, [pathname]);

  return null;
}
