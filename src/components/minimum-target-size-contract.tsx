import styles from "./minimum-target-size-contract.module.css";

/**
 * Mounts the product-wide 44×44px pointer-target contract once. The CSS module
 * reaches legacy global controls without introducing another root stylesheet;
 * individual routes continue to own their layout and visual treatment.
 */
export function MinimumTargetSizeContract() {
  return <span className={styles.contract} aria-hidden="true" />;
}
