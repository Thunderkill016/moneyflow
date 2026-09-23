import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải giao dịch"
      aria-busy="true"
    >
      <section>
        <div>
          <div
            className={styles.line}
            style={{ width: "120px", height: "12px" }}
          />
          <div
            className={styles.lineWide}
            style={{ width: "200px", height: "28px", marginTop: "10px" }}
          />
          <div
            className={styles.line}
            style={{ width: "280px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section className={styles.rows} aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}>
            <div
              className={styles.line}
              style={{ width: "64px", height: "22px" }}
            />
            <div
              className={styles.line}
              style={{ width: "72px", height: "12px", marginTop: "8px" }}
            />
          </div>
        ))}
      </section>

      <section className={styles.panel} aria-hidden="true">
        <div
          className={styles.lineWide}
          style={{ width: "100%", maxWidth: "360px", height: "40px" }}
        />
        <div style={{ marginTop: "18px" }}>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className={styles.line}
              style={{
                width: "100%",
                height: "52px",
                marginTop: index === 0 ? 0 : "10px",
                borderRadius: "12px",
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
