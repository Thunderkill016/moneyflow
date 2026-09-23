import styles from "../../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải nhận chia sẻ"
      aria-busy="true"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.block}>
        <div className={styles.skelRow}>
          <span className={styles.line} />
          <span className={styles.line} />
        </div>
      </div>
    </main>
  );
}
