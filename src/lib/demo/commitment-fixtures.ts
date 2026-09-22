/**
 * Demo recurring-commitment seeds — shared by the /commitments demo workspace
 * and the Inbox commitment-suggestion experiment. Client-safe: no server-only
 * imports so demo pages can hydrate occurrences from localStorage.
 */

import { dueDateForMonth, type RecurringCommitment } from "../planning/commitments.ts";
import { demoAccounts, demoCategories } from "./transaction-fixtures.ts";

export function demoCommitmentSeeds(monthStart: string): RecurringCommitment[] {
  const account = demoAccounts[0];
  const category = (name: string) =>
    demoCategories.find((item) => item.name === name)!;
  return [
    {
      id: "demo-rent",
      name: "Tiền thuê nhà",
      amount: 4_500_000,
      dueDay: 5,
      dueDate: dueDateForMonth(monthStart, 5),
      accountId: account.id,
      accountName: account.name,
      categoryId: category("Nhà ở").id,
      categoryName: "Nhà ở",
      categoryIcon: "home",
      categoryColor: "amber",
      isArchived: false,
      isPaid: true,
      transactionId: "demo-rent-paid",
      paidOn: dueDateForMonth(monthStart, 5),
    },
    {
      id: "demo-internet",
      name: "Internet gia đình",
      amount: 250_000,
      dueDay: 18,
      dueDate: dueDateForMonth(monthStart, 18),
      accountId: account.id,
      accountName: account.name,
      categoryId: category("Hóa đơn").id,
      categoryName: "Hóa đơn",
      categoryIcon: "receipt",
      categoryColor: "cyan",
      isArchived: false,
      isPaid: false,
      transactionId: null,
    },
    {
      id: "demo-electricity",
      name: "Tiền điện",
      amount: 650_000,
      dueDay: 25,
      dueDate: dueDateForMonth(monthStart, 25),
      accountId: account.id,
      accountName: account.name,
      categoryId: category("Hóa đơn").id,
      categoryName: "Hóa đơn",
      categoryIcon: "receipt",
      categoryColor: "cyan",
      isArchived: false,
      isPaid: false,
      transactionId: null,
    },
  ];
}
