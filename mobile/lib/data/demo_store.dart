import 'dart:math';

import '../domain/categories.dart';
import '../domain/inbox.dart';
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
      // ~4 months before the seed world (txs are Oct-2026) — the on-track
      // projection derives its pace from this span, so the demo line is
      // deterministic instead of a fabricated "monthly contribution".
      createdAt: '2026-06-15T00:00:00Z',
    ),
  ];

  /// Pending review items — demo "Cần xem" exercises the same review sheet
  /// and the rule-from-approve offer without an account. Dates track
  /// "now" so the queue never looks months stale.
  static List<InboxCandidate> seedCandidates() {
    String ymd(DateTime d) =>
        '${d.year}-${d.month.toString().padLeft(2, '0')}-'
        '${d.day.toString().padLeft(2, '0')}';
    final today = DateTime.now();
    return [
      InboxCandidate(
        id: 'demo-cand-1',
        kind: TransactionKind.expense,
        amountMinor: 68000,
        merchant: 'HIGHLANDS COFFEE',
        note: '',
        occurredOn: ymd(today.subtract(const Duration(days: 1))),
        source: 'paste',
        confidence: 'medium',
        // The seeded HIGHLANDS rule would prefill exactly this.
        categoryName: 'Ăn uống',
        accountName: 'Ngân hàng VCB',
        rawSnippet: 'VCB: GD -68,000 VND HIGHLANDS COFFEE',
      ),
      InboxCandidate(
        id: 'demo-cand-2',
        kind: TransactionKind.expense,
        amountMinor: 125000,
        merchant: 'GRAB',
        note: '',
        occurredOn: ymd(today),
        source: 'notification',
        confidence: 'low',
        rawSnippet: 'MoMo: -125,000 GRAB*BIKE',
      ),
    ];
  }
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

/// Demo-mode "Cần xem" — a session-scoped pending queue so the review
/// sheet and the rule-from-approve offer run without an account. Approves
/// and rejects simply drop the row: demo never posts to a ledger, and the
/// queue refill on the next entry keeps the seed honest.
class DemoInboxStore {
  DemoInboxStore() : _candidates = List.of(DemoStore.seedCandidates());

  List<InboxCandidate> _candidates;

  Future<List<InboxCandidate>> loadPending() async =>
      List.unmodifiable(_candidates);

  /// Menu badge — same "count the ids" shape as the real badge read.
  Future<int> pendingCount() async => _candidates.length;

  /// Advisory dry-run — the demo answer is always "would create", the
  /// same verdict a fresh queue gets from the real RPC.
  Future<InboxPlan?> plan(String candidateId) async => const InboxPlan(
    status: 'would_create',
    reason: 'no_match',
    confidence: 0.85,
  );

  Future<void> approve(InboxApproval approval) async {
    _candidates = [
      for (final c in _candidates)
        if (c.id != approval.candidateId) c,
    ];
  }

  Future<void> reject(String candidateId) async {
    _candidates = [
      for (final c in _candidates)
        if (c.id != candidateId) c,
    ];
  }
}

/// Demo-mode "Quy tắc tự điền" — session-scoped in-memory rules mirroring
/// the server contract exactly: create appends at max(priority)+1, updates
/// carry an expectedVersion stale-write guard, and `version_inbox_rule`
/// semantics bump the version only when a content field actually changed.
/// One seed row demonstrates the feature like the category seeds do;
/// leaving demo (or wiping demo data) resets to that seed, matching the
/// web demo's disposable browser-local rules.
class DemoRuleStore {
  DemoRuleStore({required List<Category> Function() categories})
    : _categories = categories,
      _rules = [
        InboxRule(
          id: 'rule-seed-1',
          priority: 1,
          enabled: true,
          matchField: RuleMatchField.merchant,
          containsText: 'HIGHLANDS',
          categoryId: 'cat-food',
          merchantName: 'Highlands Coffee',
          version: 1,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        ),
      ];

  /// Read the current demo categories at call time — the app may swap the
  /// category store when a fresh demo starts, so a live lookup can never
  /// hold a stale instance.
  final List<Category> Function() _categories;

  final List<InboxRule> _rules;
  var _seq = 0;

  /// Priority order with the web's created_at/id tie-break.
  Future<List<InboxRule>> loadAll() async {
    final sorted = List.of(_rules);
    sorted.sort((a, b) {
      if (a.priority != b.priority) return a.priority - b.priority;
      final byCreated = (a.createdAt ?? '').compareTo(b.createdAt ?? '');
      return byCreated != 0 ? byCreated : a.id.compareTo(b.id);
    });
    return List.unmodifiable(sorted);
  }

  Category? _findCategory(String id) {
    for (final c in _categories()) {
      if (c.id == id) return c;
    }
    return null;
  }

  /// Create (draft.id == null) or update — the same contract
  /// RealStore.saveInboxRule fulfils, including the trigger's rule: an
  /// update only requires an active category when the rule stays enabled
  /// or the target category changes (a disabled rule may keep pointing at
  /// an archived category so it stays restorable).
  Future<InboxRule> save(InboxRuleDraft draft) async {
    final contains = draft.containsText.trim();
    if (contains.isEmpty || contains.length > ruleContainsMax) {
      throw Exception('invalid_rule_contains');
    }
    final merchant = draft.merchantName?.trim();
    if (merchant != null && merchant.length > ruleMerchantMax) {
      throw Exception('invalid_rule_merchant');
    }
    final category = _findCategory(draft.categoryId);

    if (draft.id == null) {
      if (category == null || category.isArchived) {
        throw Exception('rule_category_not_available');
      }
      final nextPriority = _rules.isEmpty
          ? 1
          : _rules.map((r) => r.priority).reduce(max) + 1;
      final created = InboxRule(
        id: 'demo-rule-${++_seq}',
        priority: nextPriority,
        enabled: draft.enabled,
        matchField: draft.matchField,
        containsText: contains,
        categoryId: draft.categoryId,
        merchantName: merchant == null || merchant.isEmpty ? null : merchant,
        version: 1,
        createdAt: DateTime.now().toUtc().toIso8601String(),
      );
      _rules.add(created);
      return created;
    }

    final i = _rules.indexWhere((r) => r.id == draft.id);
    if (i < 0) throw Exception('rule_not_found');
    final old = _rules[i];
    if (old.version != draft.expectedVersion) {
      throw Exception('stale_write');
    }
    if ((draft.enabled || category?.id != old.categoryId) &&
        (category == null || category.isArchived)) {
      throw Exception('rule_category_not_available');
    }
    // version_inbox_rule: the counter moves only when a content field did.
    final changed =
        old.enabled != draft.enabled ||
        old.matchField != draft.matchField ||
        old.containsText != contains ||
        old.categoryId != draft.categoryId ||
        old.merchantName !=
            (merchant == null || merchant.isEmpty ? null : merchant);
    final updated = InboxRule(
      id: old.id,
      priority: old.priority,
      enabled: draft.enabled,
      matchField: draft.matchField,
      containsText: contains,
      categoryId: draft.categoryId,
      merchantName: merchant == null || merchant.isEmpty ? null : merchant,
      version: changed ? old.version + 1 : old.version,
      createdAt: old.createdAt,
      updatedAt: changed
          ? DateTime.now().toUtc().toIso8601String()
          : old.updatedAt,
    );
    _rules[i] = updated;
    return updated;
  }

  /// Hard delete with the same expectedVersion guard — a stale read means
  /// the list changed under the user, so refuse instead of removing the
  /// wrong revision.
  Future<void> delete(String id, int expectedVersion) async {
    final i = _rules.indexWhere((r) => r.id == id);
    if (i < 0) throw Exception('rule_not_found');
    if (_rules[i].version != expectedVersion) {
      throw Exception('stale_write');
    }
    _rules.removeAt(i);
  }

  /// replace_inbox_rule_priorities — the submitted order must name every
  /// stored rule exactly once; a partial/stale set fails rather than
  /// silently renumbering.
  Future<void> reorder(List<String> orderedIds) async {
    if (orderedIds.length != _rules.length ||
        orderedIds.toSet().length != orderedIds.length) {
      throw Exception('incomplete_rule_order');
    }
    final byId = {for (final r in _rules) r.id: r};
    if (orderedIds.any((id) => !byId.containsKey(id))) {
      throw Exception('rule_not_found');
    }
    _rules
      ..clear()
      ..addAll([
        for (var i = 0; i < orderedIds.length; i++)
          _renumbered(byId[orderedIds[i]]!, i + 1),
      ]);
  }

  /// Reassigns priority and bumps the version when it changed — priority
  /// is a content field in the server's version trigger.
  InboxRule _renumbered(InboxRule rule, int priority) {
    if (rule.priority == priority) return rule;
    return InboxRule(
      id: rule.id,
      priority: priority,
      enabled: rule.enabled,
      matchField: rule.matchField,
      containsText: rule.containsText,
      categoryId: rule.categoryId,
      merchantName: rule.merchantName,
      version: rule.version + 1,
      createdAt: rule.createdAt,
      updatedAt: DateTime.now().toUtc().toIso8601String(),
    );
  }
}
