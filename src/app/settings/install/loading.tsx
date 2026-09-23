import styles from "../../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải cài đặt ứng dụng"
      aria-busy="true"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.block}>
        {Array.from({ length: 2 }, (_, index) => (
          <div className={styles.card} key={index}>
            <span className={styles.line} />
            <span className={styles.line} />
            <span className={styles.line} />
          </div>
        ))}
      </div>
    </main>
  );
}
