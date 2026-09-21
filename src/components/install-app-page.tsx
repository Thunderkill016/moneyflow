"use client";

import { useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Button } from "@/components/ui/button";
import type { ViewerSummary } from "@/components/user-chip";
import { installPromptStore, type InstallState } from "@/lib/pwa";
import styles from "./settings/settings-surfaces.module.css";

/**
 * Install entry point (X1). Three honest states, no fake button:
 * - `promptable`: a `beforeinstallprompt` was captured — the button fires the
 *   native prompt once.
 * - `manual`: iOS Safari never fires that event — show the real steps.
 * - `installed`: standalone display mode already running.
 * - `unavailable`: anything else — point at the browser menu instead of
 *   pretending.
 */
export function InstallAppPage({ viewer }: { viewer: ViewerSummary }) {
  const store = installPromptStore();
  const state = useSyncExternalStore(
    store.subscribe,
    store.state,
    (): InstallState => "unavailable",
  );
  const [asking, setAsking] = useState(false);

  async function handleInstall() {
    if (asking) return;
    setAsking(true);
    try {
      await store.promptInstall();
    } finally {
      setAsking(false);
    }
  }

  return (
    <AppShell viewer={viewer}>
      <SecondaryWorkspace slot="settings-install-workspace">
        <SecondaryHeader
          section="Cài đặt"
          title="Cài đặt ứng dụng"
          description={
            <>
              Mở MoneyFlow nhanh từ màn hình chính và đọc lại tổng quan gần nhất
              khi mất kết nối.
            </>
          }
        />

        <section className={styles.panel} aria-labelledby="install-heading">
          <h2 id="install-heading">Cài lên thiết bị này</h2>

          {state === "installed" ? (
            <p role="status">
              MoneyFlow đã được cài đặt — mở từ biểu tượng trên màn hình chính.
            </p>
          ) : null}

          {state === "promptable" ? (
            <>
              <p>
                Trình duyệt này hỗ trợ cài đặt trực tiếp. Việc cài đặt không gửi
                thêm dữ liệu nào — sổ của bạn vẫn nằm đúng nơi nó đang nằm.
              </p>
              <Button
                type="button"
                intent="primary"
                targetSize="important"
                onClick={handleInstall}
                disabled={asking}
                data-testid="install-app"
              >
                {asking ? "Đang mở hộp thoại cài đặt…" : "Cài đặt MoneyFlow"}
              </Button>
            </>
          ) : null}

          {state === "manual" ? (
            <p>
              Trên Safari: chạm nút <strong>Chia sẻ</strong> rồi chọn{" "}
              <strong>Thêm vào màn hình chính</strong>. MoneyFlow sẽ mở như một
              ứng dụng riêng.
            </p>
          ) : null}

          {state === "unavailable" ? (
            <p>
              Trình duyệt này chưa sẵn sàng cài đặt trực tiếp — hãy dùng menu của
              trình duyệt (biểu tượng ⋮ hoặc Chia sẻ) và chọn{" "}
              <strong>Cài đặt ứng dụng</strong> hoặc{" "}
              <strong>Thêm vào màn hình chính</strong>.
            </p>
          ) : null}
        </section>
      </SecondaryWorkspace>
    </AppShell>
  );
}
