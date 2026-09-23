import styles from "../route-loading.module.css";
export default function Loading() {
  return (
    <div>
      <div>
        <main aria-busy="true">
          <div className={styles.lineWide} />
          <div className={styles.card} />
          <div className={styles.cardTall} />
        </main>
      </div>
    </div>
  );
}
