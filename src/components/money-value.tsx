import {
  moneyDisplayAriaLabel,
  moneyDisplayText,
  moneyDisplayTone,
  type MoneyDisplayOptions,
  type MoneyDisplayTone,
} from "@/lib/money-display";
import styles from "./money-value.module.css";

export type MoneyValueProps = MoneyDisplayOptions & {
  className?: string;
  emphasis?: "regular" | "strong";
  align?: "start" | "end";
};

const toneClasses: Record<MoneyDisplayTone, string> = {
  neutral: styles.neutral,
  income: styles.income,
  expense: styles.expense,
  transfer: styles.transfer,
};

export function MoneyValue(props: MoneyValueProps) {
  const {
    className,
    emphasis = "regular",
    align = "end",
  } = props;
  const tone = moneyDisplayTone(props);
  const Element = emphasis === "strong" ? "strong" : "span";
  const classes = [
    styles.value,
    toneClasses[tone],
    emphasis === "strong" && styles.strong,
    align === "start" ? styles.alignStart : styles.alignEnd,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Element
      className={classes}
      aria-label={moneyDisplayAriaLabel(props)}
      data-money-value="true"
      data-money-tone={tone}
    >
      {moneyDisplayText(props)}
    </Element>
  );
}
