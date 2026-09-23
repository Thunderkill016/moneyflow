import styles from "../../route-loading.module.css";
export default function Loading() {
  return (
    <div
      className={styles.route}
      aria-busy="true"
      aria-label="Đang tải import CSV thẳng vào sổ"
    >
      <div className={styles.lineWide} />
      <div className={styles.line} />
      <div className={styles.block}>
        {Array.from({ length: 4 }, (_, index) => (
          <div className={styles.skelRow} key={index}>
            <span className={styles.line} />
            <span className={styles.line} />
            <span className={styles.line} />
          </div>
        ))}
      </div>
    </div>
  );
}
