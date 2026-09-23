import styles from "../../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải thông báo"
      aria-busy="true"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.line} />
      <div className={styles.panel} style={{ marginTop: 16 }}>
        <div className={styles.lineWide} />
        <div className={styles.line} />
        <div className={styles.line} />
      </div>
    </main>
  );
}
