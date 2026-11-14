export {
  computeMonthlyCashflow,
  computeAccountBalances,
  computeNetWorthSummary,
  createReconcileTransaction,
  createTransferTransaction,
  parseQuickInput,
  parseVietnameseAmount,
  type ParsedQuickCommand,
} from "../../core/engine/index.ts";

export function appendNumpadToken(currentDigits: string, token: string): string {
  if (token === "C") return "";
  if (token === "BACK") return currentDigits.slice(0, -1);

  if (currentDigits.length >= 12) return currentDigits;

  if (token === "00" || token === "000") {
    if (!currentDigits || currentDigits === "0") return "";
    return `${currentDigits}${token}`.slice(0, 12);
  }

  if (/^\d$/u.test(token)) {
    if (currentDigits === "0") return token;
    return `${currentDigits}${token}`;
  }

  return currentDigits;
}

export function parseNumpadAmount(digits: string): number {
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
