import '../domain/categories.dart';
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

  // isDefault/icon/color mirror the signup-seeded rows the real store
  // returns — the demo surface stays honest about what the backend owns.
  static List<Category> seedCategories() => const [
    Category(
      id: 'cat-food',
      name: 'Ăn uống',
      kind: TransactionKind.expense,
      icon: 'bowl',
      color: 'coral',
      isDefault: true,
    ),
    Category(
      id: 'cat-transport',
      name: 'Di chuyển',
      kind: TransactionKind.expense,
      icon: 'car',
      color: 'blue',
      isDefault: true,
    ),
    Category(
      id: 'cat-bills',
      name: 'Hóa đơn',
      kind: TransactionKind.expense,
      icon: 'receipt',
      color: 'cyan',
      isDefault: true,
    ),
    Category(
      id: 'cat-salary',
      name: 'Lương',
      kind: TransactionKind.income,
      icon: 'wallet',
      color: 'green',
      isDefault: true,
    ),
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

/// Demo-mode category writes — session-scoped in-memory, no network.
/// Every other demo write stays read-only, but the category manager is
/// the showcase surface for the "Gói danh mục Việt Nam" pack, and a pack
/// that vanishes after the snackbar would be a lie: adds persist for the
/// demo session (leaving demo resets to seeds, matching the web demo's
/// disposable browser-local data).
class DemoCategoryStore {
  DemoCategoryStore() : _categories = List.of(DemoStore.seedCategories());

  final List<Category> _categories;
  var _seq = 0;

  List<Category> get current => List.unmodifiable(_categories);

  /// Pickers only offer active rows — the same boundary the real
  /// loadCategories applies server-side.
  List<Category> get active => [
    for (final c in _categories)
      if (!c.isArchived) c,
  ];

  /// The manager lists archived rows too (same as loadAllCategories).
  Future<List<Category>> loadAll() async => current;

  Future<List<Category>> loadActive() async => active;

  /// Create (id == null) or rename/restyle in place — the same contract
  /// RealStore.saveCategory fulfils: kind is immutable after create and
  /// icon/color fall back to the kind meta when omitted.
  Future<Category> save({
    String? id,
    required String name,
    required TransactionKind kind,
    String? icon,
    String? color,
  }) async {
    final meta = defaultCategoryMeta(kind);
    if (id == null) {
      final created = Category(
        id: 'demo-cat-${++_seq}',
        name: name,
        kind: kind,
        icon: icon ?? meta.icon,
        color: color ?? meta.color,
      );
      _categories.add(created);
      return created;
    }
    final i = _categories.indexWhere((c) => c.id == id);
    if (i < 0) throw Exception('category_not_found');
    final old = _categories[i];
    final updated = Category(
      id: old.id,
      name: name,
      kind: old.kind,
      icon: icon ?? meta.icon,
      color: color ?? meta.color,
      isDefault: old.isDefault,
      isArchived: old.isArchived,
    );
    _categories[i] = updated;
    return updated;
  }

  Future<Category> setArchived(String id, bool archived) async {
    final i = _categories.indexWhere((c) => c.id == id);
    if (i < 0) throw Exception('category_not_found');
    final old = _categories[i];
    final updated = Category(
      id: old.id,
      name: old.name,
      kind: old.kind,
      icon: old.icon,
      color: old.color,
      isDefault: old.isDefault,
      isArchived: archived,
    );
    _categories[i] = updated;
    return updated;
  }

  /// Hard delete — defaults stay undeletable, mirroring the server RLS
  /// that only ever removes custom rows.
  Future<bool> delete(String id) async {
    final i = _categories.indexWhere((c) => c.id == id);
    if (i < 0 || _categories[i].isDefault) return false;
    _categories.removeAt(i);
    return true;
  }
}
