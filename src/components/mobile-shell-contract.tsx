import styles from "./mobile-shell-contract.module.css";

/**
 * Temporary transaction-dialog compatibility remainder.
 *
 * Phase 3 removes all shell chrome, route padding, safe-area and body:has()
 * behavior from this contract. Only legacy transaction amount-field repairs
 * remain until Phase 5 moves those dialogs to their component owner.
 */
export function MobileShellContract() {
  return <span className={styles.contract} aria-hidden="true" />;
}
