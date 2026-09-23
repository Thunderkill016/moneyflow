"use client";

import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { LinkButton } from "@/components/ui/button";
import type { ViewerSummary } from "@/components/user-chip";
import { CAPTURE_OPTIONS } from "@/lib/capture/options";
import styles from "./capture-page.module.css";

/**
 * Full-page Capture chooser (wireframes CaptureMenu).
 * Sheet version lives in AppShell; this is the dedicated `/capture` route.
 */
export function CapturePage({ viewer }: { viewer: ViewerSummary }) {
  return (
    <AppShell viewer={viewer}>
      <main className={styles.workspace}>
        <section className={styles.titleRow}>
          <div className={styles.titleCopy}>
            <p className={styles.eyebrow}>Đưa dữ liệu vào</p>
            <h1>Capture</h1>
            <p>Chọn cách đưa giao dịch vào hộp thư — bạn duyệt trước khi vào sổ.</p>
          </div>
          <div className={styles.titleActions}>
            <LinkButton href="/inbox" intent="secondary" targetSize="important">
              <Icon name="inbox" />
              Về Inbox
            </LinkButton>
          </div>
        </section>

        <section className={styles.menu} aria-labelledby="capture-menu-heading">
          <h2 id="capture-menu-heading" className={styles.menuHeading}>
            Đưa giao dịch vào
          </h2>
          <p className={styles.menuLead}>
            Không cần mật khẩu ngân hàng. Dữ liệu thô chỉ dùng để gợi ý — bạn xác nhận trước khi ghi sổ.
          </p>

          <nav className={styles.menuActions} aria-label="Cách capture">
            {CAPTURE_OPTIONS.map((option) => (
              <LinkButton
                key={option.id}
                href={option.href}
                unstyled
                className={styles.option}
              >
                <span className={styles.optionIcon} aria-hidden>
                  <Icon name={option.icon} />
                </span>
                <span className={styles.optionText}>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <Icon name="arrowRight" className={styles.optionArrow} />
              </LinkButton>
            ))}
          </nav>

          <p className={styles.trust}>
            <Icon name="lock" />
            <span>Bạn luôn kiểm soát — duyệt ngoại lệ, export hoặc xóa bất cứ lúc nào.</span>
          </p>
        </section>
      </main>
    </AppShell>
  );
}
