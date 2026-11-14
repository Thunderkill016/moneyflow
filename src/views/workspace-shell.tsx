"use client";

import { useEffect, useState } from "react";
import { useTransactionController } from "../features/transactions/use-transaction-controller.ts";
import { DesktopTerminalView } from "./desktop/desktop-terminal-view.tsx";
import { MobileCaptureView } from "./mobile/mobile-capture-view.tsx";

export function WorkspaceShell() {
  const controller = useTransactionController();
  const [layoutMode, setLayoutMode] = useState<"auto" | "desktop" | "mobile">(
    "auto",
  );
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const showMobile =
    layoutMode === "mobile" || (layoutMode === "auto" && isMobileViewport);

  if (showMobile) {
    return (
      <MobileCaptureView
        controller={controller}
        onSwitchToDesktop={() => setLayoutMode("desktop")}
      />
    );
  }

  return (
    <DesktopTerminalView
      controller={controller}
      layoutMode={layoutMode}
      onChangeLayoutMode={setLayoutMode}
    />
  );
}
