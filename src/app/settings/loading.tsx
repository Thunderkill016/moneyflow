import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải Cài đặt"
      aria-busy="true"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.rows}>
        {Array.from({ length: 4 }, (_, index) => (
          <div className={styles.skelRow} key={index}>
            <span className={styles.line} />
            <span className={styles.line} />
          </div>
        ))}
      </div>
    </main>
  );
}
