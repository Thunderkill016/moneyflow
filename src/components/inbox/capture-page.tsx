"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import { CAPTURE_OPTIONS } from "@/lib/capture/options";

/**
 * Full-page Capture chooser (wireframes CaptureMenu).
 * Sheet version lives in AppShell; this is the dedicated `/capture` route.
 */
export function CapturePage({ viewer }: { viewer: ViewerSummary }) {
  return (
    <AppShell viewer={viewer}>
      <main className="dashboard capture-workspace">
        <section className="transactions-title-row capture-title-row">
          <div>
            <p className="eyebrow">Đưa dữ liệu vào</p>
            <h1>Capture</h1>
            <p>Chọn cách đưa giao dịch vào hộp thư — bạn duyệt trước khi vào sổ.</p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Về Inbox
            </Link>
          </div>
        </section>

        <section className="capture-menu panel" aria-labelledby="capture-menu-heading">
          <h2 id="capture-menu-heading" className="capture-menu-heading">
            Đưa giao dịch vào
          </h2>
          <p className="capture-menu-lead">
            Không cần mật khẩu ngân hàng. Dữ liệu thô chỉ dùng để gợi ý — bạn xác nhận trước khi ghi sổ.
          </p>

          <nav className="capture-menu-actions" aria-label="Cách capture">
            {CAPTURE_OPTIONS.map((option) => (
              <Link
                key={option.id}
                href={option.href}
                className="capture-menu-option"
              >
                <span className="capture-menu-option-icon" aria-hidden>
                  <Icon name={option.icon} />
                </span>
                <span className="capture-menu-option-text">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <Icon name="arrowRight" />
              </Link>
            ))}
          </nav>

          <p className="capture-menu-trust">
            <Icon name="lock" />
            <span>Bạn luôn kiểm soát — duyệt ngoại lệ, export hoặc xóa bất cứ lúc nào.</span>
          </p>
        </section>
      </main>
    </AppShell>
  );
}
