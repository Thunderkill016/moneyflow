import styles from "./mobile-shell-contract.module.css";

/**
 * Mounts the component-owned mobile shell contracts once without adding a new
 * root global stylesheet. The CSS module only reaches the legacy route classes
 * that still own mobile chrome and transaction-dialog markup.
 */
export function MobileShellContract() {
  return <span className={styles.contract} aria-hidden="true" />;
}
