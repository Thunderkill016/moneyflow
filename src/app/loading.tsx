import styles from "./route-loading.module.css";
/** Root loading while resolving public landing vs redirect. */
export default function Loading() {
  return (
    <main className={styles.route} aria-label="Đang tải" aria-busy="true">
      <div
        className={styles.lineWide}
        style={{ width: "200px", height: "20px" }}
      />
      <div
        className={styles.line}
        style={{ width: "280px", height: "14px", marginTop: "12px" }}
      />
    </main>
  );
}
