import '../domain/models.dart';

/// Demo-mode seed — mirrors the web demo store semantics:
/// browser-local exploration data, no network, honest "demo" labeling.
class DemoStore {
  DemoStore._();

  static List<AccountSummary> seedAccounts() => const [
    AccountSummary(
      id: 'acc-cash',
      name: 'Tiền mặt',
      kind: AccountKind.cash,
      currencyCode: 'VND',
      initialBalance: 2350000,
      balance: 2350000,
    ),
    AccountSummary(
      id: 'acc-bank',
      name: 'Ngân hàng VCB',
      kind: AccountKind.bank,
      currencyCode: 'VND',
      initialBalance: 18420000,
      balance: 18420000,
    ),
    AccountSummary(
      id: 'acc-momo',
      name: 'Ví MoMo',
      kind: AccountKind.eWallet,
      currencyCode: 'VND',
      initialBalance: 580000,
      balance: 580000,
    ),
  ];

  static List<Transaction> seedTransactions() => const [
    Transaction(
      id: 'tx-1',
      kind: TransactionKind.expense,
      categoryId: 'cat-food',
      category: 'Ăn uống',
      note: 'Bún bò sáng',
      accountId: 'acc-cash',
      account: 'Tiền mặt',
      amount: 45000,
      occurredOn: '2026-10-12',
      payee: 'Quán gần nhà',
    ),
    Transaction(
      id: 'tx-2',
      kind: TransactionKind.income,
      categoryId: 'cat-salary',
      category: 'Lương',
      note: 'Lương tháng 10',
      accountId: 'acc-bank',
      account: 'Ngân hàng VCB',
      amount: 15000000,
      occurredOn: '2026-10-10',
    ),
    Transaction(
      id: 'tx-3',
      kind: TransactionKind.transfer,
      categoryId: 'cat-transfer',
      category: 'Chuyển khoản',
      note: 'Nạp ví MoMo',
      accountId: 'acc-bank',
      account: 'Ngân hàng VCB',
      destinationAccountId: 'acc-momo',
      destinationAccount: 'Ví MoMo',
      amount: 500000,
      occurredOn: '2026-10-09',
    ),
    Transaction(
      id: 'tx-4',
      kind: TransactionKind.expense,
      categoryId: 'cat-transport',
      category: 'Di chuyển',
      note: 'Grab đi làm',
      accountId: 'acc-momo',
      account: 'Ví MoMo',
      amount: 32000,
      occurredOn: '2026-10-08',
    ),
  ];

  static List<Category> seedCategories() => const [
    Category(id: 'cat-food', name: 'Ăn uống', kind: TransactionKind.expense),
    Category(
      id: 'cat-transport',
      name: 'Di chuyển',
      kind: TransactionKind.expense,
    ),
    Category(id: 'cat-bills', name: 'Hóa đơn', kind: TransactionKind.expense),
    Category(id: 'cat-salary', name: 'Lương', kind: TransactionKind.income),
  ];

  static List<BudgetProgress> seedBudgets(String monthStart) => [
    BudgetProgress(
      id: 'b-1',
      categoryId: 'cat-food',
      categoryName: 'Ăn uống',
      monthStart: monthStart,
      limitMinor: 2000000,
      spentMinor: 45000,
    ),
    BudgetProgress(
      id: 'b-2',
      categoryId: 'cat-transport',
      categoryName: 'Di chuyển',
      monthStart: monthStart,
      limitMinor: 500000,
      spentMinor: 532000,
    ),
  ];

  static List<RecurringCommitment> seedCommitments() => const [
    RecurringCommitment(
      id: 'cm-1',
      name: 'Tiền nhà',
      amountMinor: 3500000,
      dueDay: 5,
      accountId: 'acc-bank',
      accountName: 'Ngân hàng VCB',
      categoryId: 'cat-bills',
      categoryName: 'Hóa đơn',
      paidThisMonth: true,
    ),
    RecurringCommitment(
      id: 'cm-2',
      name: 'Internet',
      amountMinor: 250000,
      dueDay: 15,
      accountId: 'acc-bank',
      accountName: 'Ngân hàng VCB',
      categoryId: 'cat-bills',
      categoryName: 'Hóa đơn',
    ),
  ];

  static List<SavingsGoal> seedGoals() => const [
    SavingsGoal(
      id: 'g-1',
      name: 'Quỹ khẩn cấp',
      targetMinor: 20000000,
      allocatedMinor: 8500000,
      deadline: '2027-03-01',
    ),
  ];
}
