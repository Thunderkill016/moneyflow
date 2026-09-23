import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải tài khoản"
      aria-busy="true"
    >
      <section>
        <div>
          <div
            className={styles.line}
            style={{ width: "100px", height: "12px" }}
          />
          <div
            className={styles.lineWide}
            style={{ width: "160px", height: "28px", marginTop: "10px" }}
          />
          <div
            className={styles.line}
            style={{ width: "300px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section className={styles.rows} aria-hidden="true">
        <div>
          <div
            className={styles.line}
            style={{ width: "80px", height: "12px" }}
          />
          <div
            className={styles.line}
            style={{ width: "140px", height: "28px", marginTop: "10px" }}
          />
        </div>
      </section>

      <section className={styles.grid} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className={styles.card}
            key={index}
            style={{ height: "140px", borderRadius: "18px" }}
          />
        ))}
      </section>
    </main>
  );
}
