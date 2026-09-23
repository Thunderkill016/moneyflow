import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <main
      className={styles.route}
      aria-label="Đang tải dòng thời gian"
      aria-busy="true"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.card} />
      <div className={styles.cardTall} />
    </main>
  );
}
