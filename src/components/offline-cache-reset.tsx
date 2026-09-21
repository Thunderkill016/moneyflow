"use client";

import { useEffect } from "react";

import { clearOfflineCache } from "@/lib/pwa";

/**
 * Mounted by the (auth) layout: every arrival at a login/register/recovery
 * route means the previous authenticated session has ended (sign-out, expiry
 * or deletion redirect), so the offline dashboard copy must not survive it.
 * Renders nothing.
 */
export function OfflineCacheReset() {
  useEffect(() => {
    void clearOfflineCache();
  }, []);
  return null;
}
