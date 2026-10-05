import { expect, type Locator } from "@playwright/test";

/**
 * Enter an amount through the on-screen numeric keypad.
 *
 * Keypad-first capture makes the amount field read-only (so the OS keyboard
 * never covers the keypad on mobile), which means `fill()` cannot be used.
 * Tapping the digit keys is equivalent to typing and goes through the same
 * money formatter.
 */
export async function tapKeypadAmount(dialog: Locator, digits: string) {
  const keypad = dialog.locator('[data-slot="capture-numeric-keypad"]');
  await expect(keypad).toBeVisible();
  for (const digit of digits) {
    await keypad
      .getByRole("button", { name: `Số ${digit}`, exact: true })
      .click();
  }
}

/** vi-VN grouped display for a digit string, matching formatMoneyInput. */
export function formatKeypadDisplay(digits: string): string {
  const numeric = Number(digits);
  return numeric ? numeric.toLocaleString("vi-VN") : "";
}

/**
 * Clear the keypad-entered amount via the "Xóa số tiền" affordance when it
 * is present, so a retry starts from an empty field instead of appending.
 */
export async function clearKeypadAmount(dialog: Locator) {
  const clearButton = dialog.getByRole("button", {
    name: "Xóa số tiền đã nhập",
  });
  if (await clearButton.isVisible().catch(() => false)) {
    await clearButton.click();
  }
}
