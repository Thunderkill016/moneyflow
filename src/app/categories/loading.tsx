import { AppShell } from "@/components/layout/app-shell";
import styles from "../route-loading.module.css";

export default function Loading() {
  return (
    <AppShell
      viewer={{ email: null, displayName: null, isDemo: true }}
      primaryAction={{ label: "Thêm danh mục", disabled: true }}
    >
      <main>
        <section aria-busy="true" aria-label="Đang tải danh mục">
          <div>
            <div className={styles.line} style={{ width: 88 }} />
            <div
              className={styles.lineWide}
              style={{ width: 160, marginTop: 10 }}
            />
            <div
              className={styles.line}
              style={{ width: 280, marginTop: 10 }}
            />
          </div>
        </section>
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <div className={styles.panel} key={index}>
              <div
                className={styles.line}
                style={{ width: 40, height: 40, borderRadius: 12 }}
              />
              <div>
                <div className={styles.lineWide} />
                <div className={styles.line} style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
