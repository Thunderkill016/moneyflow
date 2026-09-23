import styles from "../../../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải Import Preview"
      aria-busy="true"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.rows}>
        <div className={styles.line} />
        <div className={styles.lineShort} />
        <div className={styles.line} />
      </div>
    </main>
  );
}
