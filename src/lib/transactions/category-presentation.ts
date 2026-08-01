import type { TransactionKind } from "./contracts.ts";

export const categories = {
  expense: ["Ăn uống", "Di chuyển", "Mua sắm", "Nhà ở", "Hóa đơn", "Giải trí", "Sức khỏe", "Giáo dục"],
  income: ["Lương", "Thưởng", "Thu nhập khác"],
} satisfies Record<TransactionKind, string[]>;

export const categoryMeta: Record<string, { icon: string; color: string }> = {
  "Ăn uống": { icon: "bowl", color: "coral" },
  "Di chuyển": { icon: "car", color: "blue" },
  "Mua sắm": { icon: "bag", color: "violet" },
  "Nhà ở": { icon: "home", color: "amber" },
  "Hóa đơn": { icon: "receipt", color: "cyan" },
  "Giải trí": { icon: "spark", color: "pink" },
  "Sức khỏe": { icon: "heart", color: "red" },
  "Giáo dục": { icon: "book", color: "blue" },
  "Lương": { icon: "wallet", color: "green" },
  "Thưởng": { icon: "spark", color: "green" },
  "Thu nhập khác": { icon: "bank", color: "green" },
  "Chuyển tiền": { icon: "arrows", color: "blue" }
};
