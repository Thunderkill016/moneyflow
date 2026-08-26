import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/not-found-page.module.css";

/*
 * Root not-found boundary.
 *
 * Without this file Next serves its built-in fallback, which is what production
 * was showing: a bare English sentence in a system font, with no way back into
 * the product. A visitor who mistyped a URL or followed a stale link had
 * nothing to do next.
 *
 * Deliberately a Server Component with no client JavaScript. A 404 is reached
 * by definition on a path the app does not serve, so it must render from the
 * HTML alone and must not depend on the app shell, which is why it does not use
 * `AppShell`: the shell needs a viewer, and this page renders for signed-out
 * visitors too.
 *
 * `/` is the only safe destination to lead with. The proxy sends an
 * authenticated visitor to `/dashboard` and everyone else to the public page,
 * so one link is correct for both without this file having to know which.
 */

export const metadata: Metadata = {
  title: "Không tìm thấy trang — MoneyFlow",
  description: "Đường dẫn này không tồn tại trong MoneyFlow.",
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.code}>Lỗi 404</p>
      <h1 className={styles.title}>Không tìm thấy trang này</h1>
      <p className={styles.lead}>
        Đường dẫn bạn mở không tồn tại, hoặc đã được đổi. Sổ và dữ liệu của bạn
        không bị ảnh hưởng.
      </p>
      <div className={styles.actions}>
        <Link className={styles.action} href="/">
          Về trang chính
        </Link>
        <Link className={styles.actionQuiet} href="/transactions">
          Mở sổ giao dịch
        </Link>
      </div>
    </main>
  );
}
