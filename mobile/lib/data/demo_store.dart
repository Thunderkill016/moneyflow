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
}
