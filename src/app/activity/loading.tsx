import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main
      className={styles.workspace}
      aria-label="Đang tải hoạt động"
      aria-busy="true"
    >
      <section className={styles.header}>
        <div className={styles.titleCopy}>
          <div className={styles.line} style={{ width: "110px" }} />
          <div
            className={styles.line}
            style={{ width: "180px", height: "30px" }}
          />
          <div
            className={styles.line}
            style={{ width: "320px", maxWidth: "100%", height: "14px" }}
          />
        </div>
      </section>

      <section className={styles.summary} aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className={styles.summaryItem} key={index}>
            <div
              className={styles.line}
              style={{ width: "58px", height: "24px" }}
            />
            <div className={styles.line} style={{ width: "82px" }} />
          </div>
        ))}
      </section>

      <section className={styles.manager} aria-hidden="true">
        <div className={styles.managerBody}>
          <div
            className={styles.line}
            style={{ width: "100%", maxWidth: "420px", height: "42px" }}
          />
          <div className={styles.rows}>
            {Array.from({ length: 5 }, (_, index) => (
              <div className={styles.row} key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
