"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeAuthSessionExpired } from "@/lib/auth-cross-tab";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import styles from "./auth-session-banner.module.css";

/**
 * Cross-tab logout notice (2-tab logout race).
 *
 * Mounted once in the app shell (keyed by pathname so a navigation — e.g.
 * after re-login — always starts it hidden). When another tab broadcasts a
 * logout, this banner appears and stays until dismissed. It deliberately never
 * navigates on its own and never touches form state: the draft the reader is
 * typing stays exactly where it is.
 */
export function AuthSessionBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return subscribeAuthSessionExpired(() => setVisible(true));
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.banner} role="alert">
      <Icon name="bell" aria-hidden="true" />
      <span className={styles.copy}>
        <strong>Phiên đã đăng xuất ở tab khác.</strong>
        <span>
          Mọi nội dung bạn đang nhập vẫn được giữ nguyên. Đăng nhập lại để tiếp
          tục lưu thay đổi.
        </span>
      </span>
      <span className={styles.actions}>
        <Button
          type="button"
          size="sm"
          targetSize="important"
          onClick={() => router.push("/login")}
        >
          Đăng nhập lại
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          targetSize="important"
          onClick={() => setVisible(false)}
        >
          Để sau
        </Button>
      </span>
    </div>
  );
}
