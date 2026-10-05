"use client";

import { Button } from "@/components/ui/button";
import styles from "./numeric-keypad.module.css";

type KeypadKey = {
  key: string;
  label: string;
  ariaLabel: string;
  action: "digit" | "backspace";
};

const KEYS: KeypadKey[] = [
  { key: "1", label: "1", ariaLabel: "Số 1", action: "digit" },
  { key: "2", label: "2", ariaLabel: "Số 2", action: "digit" },
  { key: "3", label: "3", ariaLabel: "Số 3", action: "digit" },
  { key: "4", label: "4", ariaLabel: "Số 4", action: "digit" },
  { key: "5", label: "5", ariaLabel: "Số 5", action: "digit" },
  { key: "6", label: "6", ariaLabel: "Số 6", action: "digit" },
  { key: "7", label: "7", ariaLabel: "Số 7", action: "digit" },
  { key: "8", label: "8", ariaLabel: "Số 8", action: "digit" },
  { key: "9", label: "9", ariaLabel: "Số 9", action: "digit" },
  { key: "00", label: "00", ariaLabel: "Hai số 0", action: "digit" },
  { key: "0", label: "0", ariaLabel: "Số 0", action: "digit" },
  { key: "backspace", label: "⌫", ariaLabel: "Xóa số cuối", action: "backspace" },
];

/**
 * On-screen numeric keypad for keypad-first capture.
 * Tapping a key is equivalent to typing it into the amount field; the parent
 * owns the amount string and runs it through the shared money formatter.
 */
export function NumericKeypad({
  onDigit,
  onBackspace,
  disabled = false,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={styles.keypad}
      role="group"
      aria-label="Bàn phím số nhập tiền"
      data-slot="capture-numeric-keypad"
    >
      {KEYS.map((item) => (
        <Button
          key={item.key}
          type="button"
          unstyled
          targetSize="important"
          className={styles.key}
          aria-label={item.ariaLabel}
          disabled={disabled}
          onClick={() =>
            item.action === "digit" ? onDigit(item.key) : onBackspace()
          }
        >
          <span aria-hidden="true">{item.label}</span>
        </Button>
      ))}
    </div>
  );
}
