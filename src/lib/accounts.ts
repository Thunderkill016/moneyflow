export type AccountKind = "cash" | "bank" | "e_wallet" | "credit_card" | "savings";

export type AccountSummary = {
  id: string;
  name: string;
  kind: AccountKind;
  currencyCode: string;
  initialBalance: number;
  balance: number;
  isArchived: boolean;
};

export type SaveAccountInput = {
  id?: string;
  name: string;
  kind: AccountKind;
  initialBalance: number;
};

export const accountKindLabels: Record<AccountKind, string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  e_wallet: "Ví điện tử",
  credit_card: "Thẻ tín dụng",
  savings: "Tiết kiệm",
};
