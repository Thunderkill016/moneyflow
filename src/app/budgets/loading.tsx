import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải ngân sách"
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
            style={{ width: "160px", height: "28px", marginTop: "10px" }}
          />
          <div
            className={styles.line}
            style={{ width: "260px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section
        aria-hidden="true"
        style={{ display: "grid", gap: "12px", marginTop: "20px" }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className={styles.card}
            key={index}
            style={{ height: "96px", borderRadius: "16px", marginTop: 0 }}
          />
        ))}
      </section>
    </main>
  );
}
