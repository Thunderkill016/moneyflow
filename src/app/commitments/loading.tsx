import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải khoản định kỳ"
      aria-busy="true"
    >
      <section>
        <div>
          <div
            className={styles.line}
            style={{ width: "140px", height: "12px" }}
          />
          <div
            className={styles.lineWide}
            style={{ width: "180px", height: "28px", marginTop: "10px" }}
          />
          <div
            className={styles.line}
            style={{ width: "280px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section aria-hidden="true" style={{ marginTop: "20px" }}>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={styles.card}
            style={{ height: "72px", borderRadius: "16px" }}
          />
        ))}
      </section>

      <section
        aria-hidden="true"
        style={{ display: "grid", gap: "12px", marginTop: "20px" }}
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className={styles.card}
            key={index}
            style={{ height: "112px", borderRadius: "16px", marginTop: 0 }}
          />
        ))}
      </section>
    </main>
  );
}
