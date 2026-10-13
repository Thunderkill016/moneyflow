import 'dart:math';

import '../../domain/categories.dart';
import '../../domain/csv_import.dart';
import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../../domain/reconciliation.dart';
import '../../domain/transaction_query.dart';
import 'auth_client.dart';
import 'data_api.dart';

/// Neon Data API store — same domain shape as [DemoStore], real rows.
/// Row columns mirror public.accounts / account_balances / transaction_feed.
class RealStore {
  const RealStore(this._api);

  final NeonDataApi _api;

  Future<List<AccountSummary>> loadAccounts() async {
    final rows = await _api.select(
      'accounts',
      query: {
        'select':
            'id,name,kind,currency_code,initial_balance_minor,is_archived,'
            'icon,color,updated_at',
        'is_archived': 'eq.false',
        'order': 'created_at.asc',
      },
    );
    final balances = await _api.select(
      'account_balances',
      query: {'select': 'account_id,balance_minor'},
    );
    final byId = {
      for (final b in balances) b['account_id']: (b['balance_minor'] as num),
    };
    return rows
        .map(
          (r) => AccountSummary(
            id: r['id'] as String,
            name: r['name'] as String,
            kind: accountKindFromString(r['kind'] as String),
            currencyCode: r['currency_code'] as String,
            initialBalance: (r['initial_balance_minor'] as num).toInt(),
            balance: (byId[r['id']] ?? 0).toInt(),
            isArchived: r['is_archived'] as bool? ?? false,
            icon: r['icon'] as String?,
            color: r['color'] as String?,
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  static const _txColumns =
      'id,kind,note,occurred_on,amount_minor,account_id,account_name,'
      'category_id,category_name,destination_account_id,'
      'destination_account_name,payee,updated_at,split_lines';

  /// The resolved category lines of a split expense — mirrors the web
  /// mapper's gate: expense kind only, 2+ lines, every line well-formed.
  /// A malformed line drops the whole set so the row falls back to its
  /// single-line export instead of writing partial amounts.
  static List<TransactionSplitLine> _splitLinesFromRow(
    TransactionKind kind,
    Map<String, dynamic> r,
  ) {
    if (kind != TransactionKind.expense) return const [];
    final raw = r['split_lines'];
    if (raw is! List || raw.length < 2) return const [];
    final lines = <TransactionSplitLine>[];
    for (final item in raw) {
      if (item is! Map) return const [];
      final name = item['category_name'];
      final amount = item['amount_minor'];
      if (name is! String || name.isEmpty || amount is! num || amount <= 0) {
        return const [];
      }
      lines.add(
        TransactionSplitLine(
          categoryId: item['category_id'] as String? ?? '',
          category: name,
          amount: amount.toInt(),
        ),
      );
    }
    return lines;
  }

  static Transaction _txFromRow(Map<String, dynamic> r) {
    final kind = switch (r['kind']) {
      'income' => TransactionKind.income,
      'transfer' => TransactionKind.transfer,
      _ => TransactionKind.expense,
    };
    return Transaction(
      id: r['id'] as String,
      kind: kind,
      categoryId: r['category_id'] as String? ?? '',
      category: r['category_name'] as String? ?? 'Khác',
      note: r['note'] as String? ?? '',
      accountId: r['account_id'] as String? ?? '',
      account: r['account_name'] as String? ?? '',
      amount: (r['amount_minor'] as num).toInt(),
      occurredOn: r['occurred_on'] as String,
      payee: r['payee'] as String?,
      destinationAccountId: r['destination_account_id'] as String?,
      destinationAccount: r['destination_account_name'] as String?,
      updatedAt: r['updated_at'] as String?,
      splitCount: r['split_lines'] is List
          ? (r['split_lines'] as List).length
          : 0,
      splitLines: _splitLinesFromRow(kind, r),
    );
  }

  Future<List<Transaction>> loadTransactions({int limit = 50}) async {
    final rows = await _api.select(
      'transaction_feed',
      query: {
        'select': _txColumns,
        'order': 'occurred_on.desc,created_at.desc',
        'limit': '$limit',
      },
    );
    final txs = rows.map(_txFromRow).toList();
    return _withReviewStatus(txs);
  }

  /// One page of the filtered feed. Fetches one extra row to learn whether
  /// another page exists without a count query. `id.desc` makes the order
  /// total, so offset paging cannot skip or repeat rows that share a date
  /// and created_at.
  Future<TransactionPage> loadTransactionPage(
    TransactionQuery query, {
    int offset = 0,
    int limit = transactionPageSize,
  }) async {
    final rows = await _api.select(
      'transaction_feed',
      query: {
        'select': _txColumns,
        ...query.toPostgrestParams(),
        'order': 'occurred_on.desc,created_at.desc,id.desc',
        'limit': '${limit + 1}',
        'offset': '$offset',
      },
    );
    final txs = rows.take(limit).map(_txFromRow).toList();
    return TransactionPage(
      await _withReviewStatus(txs),
      hasMore: rows.length > limit,
    );
  }

  /// Every feed row with occurred_on in [from, to) — used by reports so a
  /// busy month is never truncated to the recent-feed page. PostgREST's
  /// server cap is far above a month of personal spending; the explicit
  /// limit documents the assumption.
  Future<List<Transaction>> loadTransactionsInRange(
    String from,
    String to, {
    int limit = 5000,
  }) async {
    final rows = await _api.select(
      'transaction_feed',
      query: {
        'select': _txColumns,
        'and': '(occurred_on.gte.$from,occurred_on.lt.$to)',
        'order': 'occurred_on.desc,created_at.desc',
        'limit': '$limit',
      },
    );
    return rows.map(_txFromRow).toList();
  }

  /// transaction_feed has no review_status — it lives on
  /// financial_transactions (same read the web does). A failure here is
  /// non-fatal: rows keep the default "reviewed" rather than blocking the
  /// whole feed.
  Future<List<Transaction>> _withReviewStatus(List<Transaction> txs) async {
    if (txs.isEmpty) return txs;
    try {
      final rows = await _api.select(
        'financial_transactions',
        query: {
          'select': 'id,review_status',
          'id': 'in.(${txs.map((t) => t.id).join(',')})',
        },
      );
      final byId = {
        for (final r in rows) r['id'] as String: r['review_status'],
      };
      return [
        for (final t in txs)
          byId[t.id] == 'needs_review' ? t.copyWith(needsReview: true) : t,
      ];
    } catch (_) {
      return txs;
    }
  }

  /// POST /rpc/set_transaction_review_status_bulk — up to 100 rows.
  Future<void> setReviewStatusBulk(
    List<String> ids, {
    required bool reviewed,
  }) => _api.rpc('set_transaction_review_status_bulk', {
    'p_transaction_ids': ids,
    'p_review_status': reviewed ? 'reviewed' : 'needs_review',
  });

  /// POST /rpc/bulk_update_transaction_category — same-kind plain rows.
  Future<void> setCategoryBulk(List<String> ids, String categoryId) => _api.rpc(
    'bulk_update_transaction_category',
    {'p_transaction_ids': ids, 'p_category_id': categoryId},
  );

  /// Soft-deleted ledger rows — public.deleted_transaction_feed mirrors
  /// transaction_feed plus the tombstone timestamp.
  Future<List<DeletedTransaction>> loadDeletedTransactions({
    int limit = 50,
  }) async {
    final rows = await _api.select(
      'deleted_transaction_feed',
      query: {
        'select': '$_txColumns,deleted_at',
        'order': 'deleted_at.desc',
        'limit': '$limit',
      },
    );
    return rows
        .map(
          (r) => DeletedTransaction(
            transaction: _txFromRow(r),
            deletedAt: r['deleted_at'] as String? ?? '',
          ),
        )
        .toList();
  }

  /// Full row shape the web's category workspace reads
  /// (`mapCategoryRow` field-for-field).
  static const _categoryColumns =
      'id,name,kind,icon,color,is_default,is_archived';

  static Category _categoryFromRow(Map<String, dynamic> r) => Category(
    id: r['id'] as String,
    name: r['name'] as String,
    kind: r['kind'] == 'income'
        ? TransactionKind.income
        : TransactionKind.expense,
    icon: r['icon'] as String?,
    color: r['color'] as String?,
    isDefault: r['is_default'] as bool? ?? false,
    isArchived: r['is_archived'] as bool? ?? false,
  );

  /// Capture-form categories (expense/income kinds; transfers use none).
  /// Archived rows are hidden from pickers — same boundary the server
  /// guards enforce on new writes.
  Future<List<Category>> loadCategories() async {
    final rows = await _api.select(
      'categories',
      query: {
        'select': _categoryColumns,
        'is_archived': 'eq.false',
        'order': 'kind.asc,name.asc',
      },
    );
    return rows.map(_categoryFromRow).toList();
  }

  /// Every category including archived — the management surface lists
  /// "Đã ẩn" rows so they can be restored, like the web's /categories.
  Future<List<Category>> loadAllCategories() async {
    final rows = await _api.select(
      'categories',
      query: {'select': _categoryColumns, 'order': 'kind.asc,name.asc'},
    );
    return rows.map(_categoryFromRow).toList();
  }

  /// Direct table write under RLS — the web's saveCategoryAction:
  /// create inserts user_id + is_default:false + is_archived:false;
  /// update writes ONLY name/icon/color (kind is immutable after create).
  /// Callers pass already-normalized names (normalizeCategoryName).
  Future<Category> saveCategory({
    String? id,
    required String name,
    required TransactionKind kind,
    String? icon,
    String? color,
  }) async {
    if (id == null) {
      final userId = _api.userId;
      if (userId == null || userId.isEmpty) {
        throw NeonAuthException(401, 'not signed in');
      }
      final meta = defaultCategoryMeta(kind);
      final rows = await _api.insert('categories', {
        'user_id': userId,
        'name': name,
        'kind': kind == TransactionKind.income ? 'income' : 'expense',
        'icon': icon ?? meta.icon,
        'color': color ?? meta.color,
        'is_default': false,
        'is_archived': false,
      });
      if (rows.isEmpty) throw Exception('saved_unread');
      return _categoryFromRow(rows.first);
    }
    final rows = await _api.update(
      'categories',
      {'id': 'eq.$id'},
      {
        'name': name,
        'icon': icon ?? defaultCategoryMeta(kind).icon,
        'color': color ?? defaultCategoryMeta(kind).color,
      },
    );
    if (rows.isEmpty) throw Exception('category_not_found');
    return _categoryFromRow(rows.first);
  }

  /// PATCH is_archived — setCategoryArchivedAction; defaults archive the
  /// same way (the web offers Ẩn/Hiện lại on every row).
  Future<Category> setCategoryArchived(String id, bool archived) async {
    final rows = await _api.update(
      'categories',
      {'id': 'eq.$id'},
      {'is_archived': archived},
    );
    if (rows.isEmpty) throw Exception('category_not_found');
    return _categoryFromRow(rows.first);
  }

  /// Hard delete — RLS `categories_delete_custom_own` only allows rows with
  /// is_default=false; FK-restrict references (transactions, budgets,
  /// commitments) still block the delete server-side. Returns false when
  /// nothing was removed (row missing or not deletable).
  Future<bool> deleteCategory(String id) async {
    final rows = await _api.delete('categories', {'id': 'eq.$id'});
    return rows.isNotEmpty;
  }

  /// POST /rpc/create_money_transaction — same function the web's
  /// createTransactionAction calls; idempotency key dedupes replays.
  Future<String> createTransaction({
    required String accountId,
    required String categoryId,
    required TransactionKind kind,
    required int amount,
    required String occurredOn,
    String note = '',
    String payee = '',
    String? goalId,
    required String idempotencyKey,
  }) async {
    final id = await _api.rpc('create_money_transaction', {
      'p_account_id': accountId,
      'p_category_id': categoryId,
      'p_kind': kind == TransactionKind.income ? 'income' : 'expense',
      'p_amount_minor': amount,
      'p_occurred_on': occurredOn,
      'p_note': note,
      'p_payee': payee,
      'p_goal_id': goalId,
      'p_idempotency_key': idempotencyKey,
    });
    return id as String;
  }

  /// POST /rpc/create_split_expense — one expense spread over 2–12
  /// distinct expense categories on a single account. [lines] are
  /// (categoryId, amountMinor) pairs; the RPC enforces the invariants.
  Future<String> createSplitExpense({
    required String accountId,
    required List<({String categoryId, int amount})> lines,
    required String occurredOn,
    String note = '',
    String payee = '',
    required String idempotencyKey,
  }) async {
    final id = await _api.rpc('create_split_expense', {
      'p_account_id': accountId,
      'p_lines': [
        for (final l in lines)
          {'category_id': l.categoryId, 'amount_minor': l.amount},
      ],
      'p_occurred_on': occurredOn,
      'p_note': note,
      'p_payee': payee,
      'p_idempotency_key': idempotencyKey,
    });
    return id as String;
  }

  /// POST /rpc/create_account_transfer — balanced movement, never
  /// income/expense (product invariant).
  Future<String> createTransfer({
    required String sourceAccountId,
    required String destinationAccountId,
    required int amount,
    required String occurredOn,
    String note = '',
    required String idempotencyKey,
  }) async {
    final id = await _api.rpc('create_account_transfer', {
      'p_source_account_id': sourceAccountId,
      'p_destination_account_id': destinationAccountId,
      'p_amount_minor': amount,
      'p_occurred_on': occurredOn,
      'p_note': note,
      'p_idempotency_key': idempotencyKey,
    });
    return id as String;
  }

  /// Monthly budgets with spent progress — public.budget_progress.
  Future<List<BudgetProgress>> loadBudgets(String monthStart) async {
    final rows = await _api.select(
      'budget_progress',
      query: {
        'select':
            'id,category_id,category_name,month_start,limit_minor,spent_minor,'
            'updated_at',
        'month_start': 'eq.$monthStart',
        'order': 'category_name.asc',
      },
    );
    return rows
        .map(
          (r) => BudgetProgress(
            id: r['id'] as String,
            categoryId: r['category_id'] as String,
            categoryName: r['category_name'] as String? ?? 'Khác',
            monthStart: r['month_start'] as String,
            limitMinor: (r['limit_minor'] as num).toInt(),
            spentMinor: (r['spent_minor'] as num).toInt(),
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  /// Recurring commitments + this month's paid state —
  /// public.recurring_commitment_feed + commitment_occurrences. Archived
  /// rows come back too: the planning page lists them under "Đã lưu trữ",
  /// and the other consumers (safe-spend, reminder scheduler) already
  /// skip isArchived rows themselves.
  Future<List<RecurringCommitment>> loadCommitments(String monthStart) async {
    final rows = await _api.select(
      'recurring_commitment_feed',
      query: {
        'select':
            'id,name,amount_minor,due_day,account_id,account_name,'
            'category_id,category_name,is_archived,updated_at',
        'order': 'due_day.asc',
      },
    );
    final occurrences = await _api.select(
      'commitment_occurrences',
      query: {'select': 'commitment_id', 'month_start': 'eq.$monthStart'},
    );
    final paid = {for (final o in occurrences) o['commitment_id'] as String};
    return rows
        .map(
          (r) => RecurringCommitment(
            id: r['id'] as String,
            name: r['name'] as String,
            amountMinor: (r['amount_minor'] as num).toInt(),
            dueDay: (r['due_day'] as num).toInt(),
            accountId: r['account_id'] as String,
            accountName: r['account_name'] as String? ?? '',
            categoryId: r['category_id'] as String,
            categoryName: r['category_name'] as String? ?? 'Khác',
            isArchived: r['is_archived'] as bool? ?? false,
            paidThisMonth: paid.contains(r['id']),
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  /// Recurring income templates + this month's receipt state —
  /// public.recurring_income_template_feed + income_template_occurrences.
  /// Archived rows come back for the planning page's "Đã lưu trữ" section.
  Future<List<RecurringIncome>> loadIncomeTemplates(String monthStart) async {
    final rows = await _api.select(
      'recurring_income_template_feed',
      query: {
        'select':
            'id,name,amount_minor,due_day,account_id,account_name,'
            'category_id,category_name,is_archived,updated_at',
        'order': 'due_day.asc',
      },
    );
    final occurrences = await _api.select(
      'income_template_occurrences',
      query: {'select': 'template_id', 'month_start': 'eq.$monthStart'},
    );
    final received = {for (final o in occurrences) o['template_id'] as String};
    return rows
        .map(
          (r) => RecurringIncome(
            id: r['id'] as String,
            name: r['name'] as String,
            amountMinor: (r['amount_minor'] as num).toInt(),
            dueDay: (r['due_day'] as num).toInt(),
            accountId: r['account_id'] as String,
            accountName: r['account_name'] as String? ?? '',
            categoryId: r['category_id'] as String,
            categoryName: r['category_name'] as String? ?? 'Khác',
            isArchived: r['is_archived'] as bool? ?? false,
            receivedThisMonth: received.contains(r['id']),
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  /// POST /rpc/upsert_recurring_income_template — [templateId] null creates;
  /// a real id updates in place, [expectedUpdatedAt] failing closed on a
  /// stale read (server raises stale_write).
  Future<String> upsertIncomeTemplate({
    String? templateId,
    required String name,
    required int amountMinor,
    required int dueDay,
    required String accountId,
    required String categoryId,
    String? expectedUpdatedAt,
  }) async {
    final id = await _api.rpc('upsert_recurring_income_template', {
      'p_template_id': templateId,
      'p_name': name,
      'p_amount_minor': amountMinor,
      'p_due_day': dueDay,
      'p_account_id': accountId,
      'p_category_id': categoryId,
      'p_expected_updated_at': expectedUpdatedAt,
    });
    return id as String;
  }

  /// POST /rpc/record_recurring_income_template — posts the real income
  /// transaction and records this month's receipt (idempotent on the key).
  Future<String> receiveIncome({
    required String templateId,
    required String monthStart,
    required String receivedOn,
    required String idempotencyKey,
  }) async {
    final id = await _api.rpc('record_recurring_income_template', {
      'p_template_id': templateId,
      'p_month_start': monthStart,
      'p_received_on': receivedOn,
      'p_idempotency_key': idempotencyKey,
    });
    return id as String;
  }

  /// POST /rpc/undo_recurring_income_template_receipt — removes this
  /// month's receipt and soft-deletes its transaction (recoverable).
  /// Returns false upstream when no receipt exists for the month — that
  /// means the read state was stale, so it surfaces as a failure.
  Future<void> undoIncomeReceipt(String templateId, String monthStart) async {
    final ok = await _api.rpc('undo_recurring_income_template_receipt', {
      'p_template_id': templateId,
      'p_month_start': monthStart,
    });
    if (ok != true) throw Exception('nothing_to_undo');
  }

  /// POST /rpc/set_recurring_income_template_archived — false upstream
  /// means the row was missing or already in the target state.
  Future<void> setIncomeTemplateArchived(
    String templateId,
    bool archived,
  ) async {
    final ok = await _api.rpc('set_recurring_income_template_archived', {
      'p_template_id': templateId,
      'p_archived': archived,
    });
    if (ok != true) throw Exception('archive_rejected');
  }

  /// Savings goals — public.savings_goals. Archived rows come back for
  /// the planning page's "Đã lưu trữ" section.
  Future<List<SavingsGoal>> loadGoals() async {
    final rows = await _api.select(
      'savings_goals',
      query: {
        'select':
            'id,name,target_minor,allocated_minor,deadline,is_archived,'
            'updated_at',
        'order': 'deadline.asc.nullslast,name.asc',
      },
    );
    return rows
        .map(
          (r) => SavingsGoal(
            id: r['id'] as String,
            name: r['name'] as String,
            targetMinor: (r['target_minor'] as num).toInt(),
            allocatedMinor: (r['allocated_minor'] as num).toInt(),
            deadline: r['deadline'] as String?,
            isArchived: r['is_archived'] as bool? ?? false,
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  /// POST /rpc/create_financial_account.
  Future<String> createAccount({
    required String name,
    required AccountKind kind,
    int initialBalance = 0,
  }) async {
    final id = await _api.rpc('create_financial_account', {
      'p_name': name,
      'p_kind': _accountKindWire(kind),
      'p_initial_balance_minor': initialBalance,
      'p_currency_code': 'VND',
    });
    return id as String;
  }

  /// POST /rpc/update_financial_account. The RPC overwrites icon/color
  /// with its params, so callers pass the current values back to keep
  /// them; [expectedUpdatedAt] guards against stale writes.
  Future<void> updateAccount({
    required String accountId,
    required String name,
    required AccountKind kind,
    required int initialBalance,
    String? icon,
    String? color,
    String? expectedUpdatedAt,
  }) => _api.rpc('update_financial_account', {
    'p_account_id': accountId,
    'p_name': name,
    'p_kind': _accountKindWire(kind),
    'p_initial_balance_minor': initialBalance,
    'p_icon': icon,
    'p_color': color,
    'p_expected_updated_at': expectedUpdatedAt,
  });

  static String _accountKindWire(AccountKind kind) => switch (kind) {
    AccountKind.bank => 'bank',
    AccountKind.eWallet => 'e_wallet',
    AccountKind.creditCard => 'credit_card',
    AccountKind.savings => 'savings',
    AccountKind.cash => 'cash',
  };

  Future<void> setAccountArchived(String accountId, bool archived) => _api.rpc(
    'set_financial_account_archived',
    {'p_account_id': accountId, 'p_archived': archived},
  );

  /// Soft delete — ledger recovery path stays intact (product invariant).
  Future<void> deleteTransaction(String transactionId) => _api.rpc(
    'soft_delete_money_transaction',
    {'p_transaction_id': transactionId},
  );

  /// POST /rpc/restore_money_transaction — clears deleted_at.
  Future<void> restoreTransaction(String transactionId) => _api.rpc(
    'restore_money_transaction',
    {'p_transaction_id': transactionId},
  );

  /// POST /rpc/update_money_transaction — expense/income edits.
  /// [expectedUpdatedAt] is the optimistic-concurrency token read from
  /// the feed; the server raises stale_write when the row moved on.
  Future<void> updateTransaction({
    required String transactionId,
    required String accountId,
    required String categoryId,
    required TransactionKind kind,
    required int amount,
    required String occurredOn,
    String note = '',
    String payee = '',
    String? expectedUpdatedAt,
  }) => _api.rpc('update_money_transaction', {
    'p_transaction_id': transactionId,
    'p_account_id': accountId,
    'p_category_id': categoryId,
    'p_kind': kind == TransactionKind.income ? 'income' : 'expense',
    'p_amount_minor': amount,
    'p_occurred_on': occurredOn,
    'p_note': note,
    'p_payee': payee,
    'p_expected_updated_at': expectedUpdatedAt,
  });

  /// POST /rpc/update_account_transfer — transfer legs stay balanced;
  /// the kind itself can never change on an update.
  Future<void> updateTransfer({
    required String transactionId,
    required String sourceAccountId,
    required String destinationAccountId,
    required int amount,
    required String occurredOn,
    String note = '',
    String? expectedUpdatedAt,
  }) => _api.rpc('update_account_transfer', {
    'p_transaction_id': transactionId,
    'p_source_account_id': sourceAccountId,
    'p_destination_account_id': destinationAccountId,
    'p_amount_minor': amount,
    'p_occurred_on': occurredOn,
    'p_note': note,
    'p_expected_updated_at': expectedUpdatedAt,
  });

  /// POST /rpc/upsert_monthly_budget — create or update a category budget.
  /// The conflict target is (user, category, month): an edit re-sends the
  /// same pair with [expectedUpdatedAt] guarding against a stale read.
  Future<String> upsertBudget({
    required String categoryId,
    required String monthStart,
    required int limitMinor,
    String? expectedUpdatedAt,
  }) async {
    final id = await _api.rpc('upsert_monthly_budget', {
      'p_category_id': categoryId,
      'p_month_start': monthStart,
      'p_limit_minor': limitMinor,
      'p_expected_updated_at': expectedUpdatedAt,
    });
    return id as String;
  }

  /// POST /rpc/delete_monthly_budget — false upstream means the row was
  /// already gone (another device deleted it first).
  Future<void> deleteBudget(String budgetId) async {
    final ok = await _api.rpc('delete_monthly_budget', {
      'p_budget_id': budgetId,
    });
    if (ok != true) throw Exception('budget_not_found');
  }

  /// POST /rpc/upsert_recurring_commitment — [commitmentId] null creates;
  /// a real id updates name/amount/due-day/account/category in place,
  /// [expectedUpdatedAt] failing closed on a stale read.
  Future<String> upsertCommitment({
    String? commitmentId,
    required String name,
    required int amountMinor,
    required int dueDay,
    required String accountId,
    required String categoryId,
    String? expectedUpdatedAt,
  }) async {
    final id = await _api.rpc('upsert_recurring_commitment', {
      'p_commitment_id': commitmentId,
      'p_name': name,
      'p_amount_minor': amountMinor,
      'p_due_day': dueDay,
      'p_account_id': accountId,
      'p_category_id': categoryId,
      'p_expected_updated_at': expectedUpdatedAt,
    });
    return id as String;
  }

  /// POST /rpc/pay_recurring_commitment — posts the real ledger transaction
  /// and records this month's occurrence (idempotent on the key).
  Future<String> payCommitment({
    required String commitmentId,
    required String monthStart,
    required String paidOn,
    required String idempotencyKey,
  }) async {
    final id = await _api.rpc('pay_recurring_commitment', {
      'p_commitment_id': commitmentId,
      'p_month_start': monthStart,
      'p_paid_on': paidOn,
      'p_idempotency_key': idempotencyKey,
    });
    return id as String;
  }

  /// POST /rpc/undo_recurring_commitment_payment — removes this month's
  /// occurrence and soft-deletes its expense (recoverable via Thùng rác).
  /// False upstream means no payment was recorded for the month — the
  /// local "Đã trả" state was stale, so that surfaces as a failure.
  Future<void> undoCommitmentPayment(
    String commitmentId,
    String monthStart,
  ) async {
    final ok = await _api.rpc('undo_recurring_commitment_payment', {
      'p_commitment_id': commitmentId,
      'p_month_start': monthStart,
    });
    if (ok != true) throw Exception('nothing_to_undo');
  }

  /// POST /rpc/set_recurring_commitment_archived — false upstream means
  /// the row was missing or already in the target state.
  Future<void> setCommitmentArchived(String commitmentId, bool archived) async {
    final ok = await _api.rpc('set_recurring_commitment_archived', {
      'p_commitment_id': commitmentId,
      'p_archived': archived,
    });
    if (ok != true) throw Exception('archive_rejected');
  }

  /// POST /rpc/upsert_savings_goal — [goalId] null creates; a real id
  /// updates name/target/deadline, [expectedUpdatedAt] failing closed on
  /// a stale read. The server rejects a target below allocated_minor.
  Future<String> upsertGoal({
    String? goalId,
    required String name,
    required int targetMinor,
    String? deadline,
    String? expectedUpdatedAt,
  }) async {
    final id = await _api.rpc('upsert_savings_goal', {
      'p_goal_id': goalId,
      'p_name': name,
      'p_target_minor': targetMinor,
      'p_deadline': deadline,
      'p_expected_updated_at': expectedUpdatedAt,
    });
    return id as String;
  }

  /// POST /rpc/adjust_savings_goal — add (positive) or withdraw (negative).
  Future<void> adjustGoal(String goalId, int amountMinor) => _api.rpc(
    'adjust_savings_goal',
    {'p_goal_id': goalId, 'p_amount_minor': amountMinor},
  );

  /// POST /rpc/set_savings_goal_archived — the server refuses to archive
  /// a goal that still holds allocated money (returns false).
  Future<void> setGoalArchived(String goalId, bool archived) async {
    final ok = await _api.rpc('set_savings_goal_archived', {
      'p_goal_id': goalId,
      'p_archived': archived,
    });
    if (ok != true) throw Exception('goal_archive_blocked');
  }

  /// POST /rpc/export_user_archive — the full MoneyFlow archive v1
  /// document (the same producer the web's backup action calls). SECURITY
  /// INVOKER under RLS: it only ever returns the caller's own tenant data.
  /// The decoded jsonb body goes straight into the backup file — the RPC
  /// output IS the contract, so no mobile-side reshaping happens here.
  Future<Object?> exportArchive() => _api.rpc('export_user_archive', const {});

  /// The columns the mobile review surface reads — a subset of the web's
  /// CANDIDATE_BASE_COLUMNS (src/lib/inbox/inbox-map.ts). Source lineage,
  /// rule evidence and match metadata are web-only for now: no mobile flow
  /// produces or acts on them yet.
  static const _candidateColumns =
      'id,kind,amount_minor,merchant,note,occurred_on,source,confidence,'
      'status,possible_duplicate,possible_transfer,category_id,category_name,'
      'account_id,account_name,raw_snippet,created_at';

  /// PostgREST can encode bigint as a JSON string — mirror the web's
  /// safePositiveMoney (number | string, positive safe integer).
  static int _moneyMinor(Object? v) {
    final n = v is num ? v : num.tryParse('$v');
    if (n == null || n <= 0 || n > 9007199254740991) {
      throw const FormatException('invalid_amount_minor');
    }
    return n.toInt();
  }

  static InboxCandidate _candidateFromRow(Map<String, dynamic> r) =>
      InboxCandidate(
        id: r['id'] as String,
        kind: switch (r['kind']) {
          'income' => TransactionKind.income,
          'transfer' => TransactionKind.transfer,
          _ => TransactionKind.expense,
        },
        amountMinor: _moneyMinor(r['amount_minor']),
        merchant: r['merchant'] as String? ?? 'Không rõ',
        note: r['note'] as String? ?? '',
        // occurred_on arrives as 'YYYY-MM-DD' — take the date head like the
        // web mapper does for safety against timestamp shapes.
        occurredOn: (r['occurred_on'] as String).substring(0, 10),
        source: r['source'] as String? ?? 'paste',
        confidence: r['confidence'] as String? ?? 'low',
        possibleDuplicate: r['possible_duplicate'] as bool? ?? false,
        possibleTransfer: r['possible_transfer'] as bool? ?? false,
        categoryId: r['category_id'] as String?,
        categoryName: r['category_name'] as String?,
        accountId: r['account_id'] as String?,
        accountName: r['account_name'] as String?,
        rawSnippet: r['raw_snippet'] as String?,
        createdAt: r['created_at'] as String?,
      );

  /// Pending review queue — same filter/order as the web's
  /// listInboxFromServer display ordering, scoped to `status = pending`
  /// (the only state this surface acts on). Bounded at 500 rows: a deeper
  /// backlog is an import flow, which is a web surface today.
  Future<List<InboxCandidate>> loadPendingInboxCandidates() async {
    final rows = await _api.select(
      'inbox_candidates',
      query: {
        'select': _candidateColumns,
        'status': 'eq.pending',
        'order': 'occurred_on.desc,created_at.desc,id.desc',
        'limit': '500',
      },
    );
    return rows.map(_candidateFromRow).toList();
  }

  /// Cheap badge count for the dashboard menu — reads only ids. The web
  /// badge also counts due commitment suggestions; mobile surfaces those
  /// through its own commitment reminders, so this count intentionally
  /// covers real candidates only.
  Future<int> loadPendingInboxCount() async {
    final rows = await _api.select(
      'inbox_candidates',
      query: {'select': 'id', 'status': 'eq.pending'},
    );
    return rows.length;
  }

  /// POST /rpc/plan_inbox_candidate — the server's dry-run verdict
  /// (would_create / duplicate / suspected_transfer / invalid). Advisory on
  /// mobile: a failed read must not block review because the approve RPC
  /// re-runs the same plan atomically and raises the same guards.
  Future<InboxPlan?> planInboxCandidate(String candidateId) async {
    final res = await _api.rpc('plan_inbox_candidate', {
      'p_candidate_id': candidateId,
    });
    return parseInboxPlan(res);
  }

  /// POST /rpc/approve_inbox_candidate — exact parameter parity with the
  /// web's approveInboxCandidateAction: the candidate id doubles as the
  /// idempotency key (approvalIdempotencyKey), payee is the reviewed
  /// merchant, and transfer rows carry no category/payee.
  Future<String> approveInboxCandidate(InboxApproval approval) async {
    final isTransfer = approval.kind == TransactionKind.transfer;
    final payee = approval.payee.trim();
    final id = await _api.rpc('approve_inbox_candidate', {
      'p_candidate_id': approval.candidateId,
      'p_kind': switch (approval.kind) {
        TransactionKind.income => 'income',
        TransactionKind.transfer => 'transfer',
        TransactionKind.expense => 'expense',
      },
      'p_account_id': approval.accountId,
      'p_category_id': isTransfer ? null : approval.categoryId,
      'p_destination_account_id': isTransfer
          ? approval.destinationAccountId
          : null,
      'p_amount_minor': approval.amountMinor,
      'p_occurred_on': approval.occurredOn,
      'p_note': approval.note,
      'p_payee': isTransfer || payee.isEmpty ? null : payee,
      'p_idempotency_key': approval.candidateId,
      'p_allow_heuristic_duplicate': approval.allowHeuristicDuplicate,
    });
    if (id is! String) {
      throw const FormatException('invalid_transaction_id');
    }
    return id;
  }

  /// Reject = the web's status update via updateInboxCandidateAction —
  /// a PATCH on inbox_candidates under RLS, never a hard delete (the
  /// rejected status keeps the audit trail).
  Future<void> rejectInboxCandidate(String candidateId) async {
    final rows = await _api.update(
      'inbox_candidates',
      {'id': 'eq.$candidateId'},
      {'status': 'rejected'},
    );
    if (rows.isEmpty) throw Exception('candidate_not_found');
  }

  /// Paste-to-candidate — mirrors createInboxCandidatesAction /
  /// candidateToInsertRow: pending rows with paste provenance
  /// (parser_version paste_text@1.1, mapping_version 1), no batch, no
  /// account/category suggestion. Insert is one statement, so a malformed
  /// row fails the whole paste atomically like the web action.
  Future<List<InboxCandidate>> createInboxCandidates(
    List<InboxPasteDraft> drafts,
  ) async {
    if (drafts.isEmpty) return const [];
    final userId = _api.userId;
    if (userId == null || userId.isEmpty) {
      throw NeonAuthException(401, 'not signed in');
    }
    final now = DateTime.now().toUtc().toIso8601String();
    final rows = [
      for (final d in drafts)
        {
          'id': newIdempotencyKey(),
          'user_id': userId,
          'kind': switch (d.kind) {
            TransactionKind.income => 'income',
            TransactionKind.transfer => 'transfer',
            TransactionKind.expense => 'expense',
          },
          'amount_minor': d.amountMinor,
          'merchant': d.merchant.length > 200
              ? d.merchant.substring(0, 200)
              : (d.merchant.isEmpty ? 'Không rõ' : d.merchant),
          'note': '',
          'occurred_on': d.occurredOn,
          'source': 'paste',
          'confidence': d.confidence,
          'status': 'pending',
          'possible_duplicate': false,
          'category_id': null,
          'category_name': null,
          'account_id': null,
          'account_name': null,
          'raw_snippet': d.rawSnippet.length > 2000
              ? d.rawSnippet.substring(0, 2000)
              : d.rawSnippet,
          'import_batch_id': null,
          'local_id': null,
          'source_row_index': null,
          'source_external_id': null,
          'source_lifecycle_state': null,
          'source_predecessor_external_id': null,
          'parser_version': 'paste_text@1.1',
          'mapping_version': 1,
          'created_at': now,
        },
    ];
    final inserted = await _api.insertAll('inbox_candidates', rows);
    return inserted.map(_candidateFromRow).toList();
  }

  /// POST /rpc/prepare_direct_csv_candidates_with_rules — the SECURITY
  /// DEFINER ingestion the web's commitDirectCsvImportAction calls. Same
  /// params, same all-or-nothing transaction: one bad row fails the whole
  /// batch, nothing partial survives. Mobile stops here on purpose —
  /// unlike the web action it never calls approve_inbox_candidates_batch,
  /// so every accepted row lands in "Cần xem" as a pending candidate and
  /// only the review queue can post it to the ledger.
  ///
  /// Direct table INSERTs stay avoided: they fail upstream with 42501.
  Future<CsvImportResult> prepareCsvImport(CsvImportBatch batch) async {
    final batchId = newIdempotencyKey();
    final fileName = batch.fileName.trim();
    final res = await _api.rpc('prepare_direct_csv_candidates_with_rules', {
      'p_batch': {
        'id': batchId,
        'file_name': fileName.isEmpty
            ? 'statement.csv'
            : fileName.length > 260
            ? fileName.substring(0, 260)
            : fileName,
        'warning_count': batch.warningCount,
        'skipped_rows': batch.skippedRows,
        'map_confidence': batch.mapConfidence,
        'headers': batch.headers,
        'column_map': batch.columnMap.toWire(),
      },
      'p_candidates': [
        for (final row in batch.rows)
          {
            'id': newIdempotencyKey(),
            'row_index': row.rowIndex,
            'kind': row.kind == TransactionKind.income ? 'income' : 'expense',
            'amount_minor': row.amountMinor,
            'merchant': row.merchant,
            'note': row.note,
            'occurred_on': row.occurredOn,
            'confidence': row.confidence,
            'category_id': row.categoryId,
            'account_id': row.accountId,
            'raw_snippet': row.rawSnippet,
          },
      ],
    });

    // The web action validates {batch_id, candidate_ids, candidate_count}
    // and refuses to report success when the response is incomplete —
    // the batch may still exist server-side, so this is an honest
    // "check Cần xem before retrying" outcome, not a retryable failure.
    if (res is! Map ||
        res['batch_id'] != batchId ||
        res['candidate_count'] != batch.rows.length ||
        res['candidate_ids'] is! List ||
        (res['candidate_ids'] as List).length != batch.rows.length) {
      throw const FormatException('incomplete_result');
    }
    return CsvImportResult(batchId: batchId, candidateCount: batch.rows.length);
  }

  // ---- Account reconciliation (db/neon/migrations/20260803142000 + the
  // workspace read model + the 20260923013000 adjustment contract) ----

  /// Columns the mobile workspace reads — same list the web's
  /// src/server/reconciliation.ts selects on both views.
  static const _reconEntryColumns =
      'entry_id,transaction_id,account_id,reconciliation_state,cleared_at,'
      'reconciliation_id,entry_count';
  static const _reconSummaryColumns =
      'id,account_id,statement_date,statement_balance_minor,status,'
      'calculated_balance_minor,cleared_balance_minor,difference_minor,'
      'pending_account_leg_count,cleared_account_leg_count,'
      'reconciled_account_leg_count,started_at,completed_at,'
      'last_reopened_at,created_at,updated_at';
  static const _reconTableColumns =
      'id,account_id,statement_date,statement_balance_minor,status,'
      'calculated_balance_minor,pending_account_leg_count,'
      'cleared_account_leg_count,reconciled_account_leg_count,started_at,'
      'completed_at,last_reopened_at,created_at,updated_at';

  /// PostgREST can encode bigint as a JSON string, and reconciliation
  /// values legitimately go negative — unlike [_moneyMinor] this accepts
  /// any integer inside the server check bounds (±2^53−1). Null stays
  /// null so callers can tell "absent" from zero.
  static int? _intOrNull(Object? v) {
    if (v == null) return null;
    final n = v is num ? v : num.tryParse('$v');
    if (n == null || n.abs() > 9007199254740991) return null;
    return n.toInt();
  }

  static int _intField(Object? v, String field) {
    final n = _intOrNull(v);
    if (n == null) throw FormatException('invalid_$field');
    return n;
  }

  static ReconciliationEntryRow _reconEntryFromRow(Map<String, dynamic> r) =>
      ReconciliationEntryRow(
        entryId: r['entry_id'] as String,
        transactionId: r['transaction_id'] as String,
        accountId: r['account_id'] as String,
        state: entryStateFromString(r['reconciliation_state'] as String),
        clearedAt: r['cleared_at'] as String?,
        reconciliationId: r['reconciliation_id'] as String?,
        entryCount: _intField(r['entry_count'], 'reconciliation_entry_count'),
      );

  /// [live] distinguishes the two session sources: the summaries view
  /// always carries computed cleared/difference/count values, while the
  /// base-table fallback stores them only on completed rows — an open
  /// row read from the table keeps them null until
  /// [resolveSessionSnapshots] computes the same snapshot locally.
  static ReconciliationSession _reconSessionFromRow(
    Map<String, dynamic> r, {
    required bool live,
  }) {
    final status = r['status'] == 'open'
        ? ReconciliationStatus.open
        : ReconciliationStatus.completed;
    final completed = status == ReconciliationStatus.completed;
    final statement = _intField(
      r['statement_balance_minor'],
      'reconciliation_statement_balance',
    );
    // A completed row's cleared balance IS its stored calculated balance;
    // the view defines cleared_balance_minor the same way. Its difference
    // is statement − calculated, matching the view's difference_minor.
    final calculated = _intOrNull(r['calculated_balance_minor']);
    final cleared = live
        ? _intOrNull(r['cleared_balance_minor'])
        : (completed ? calculated : null);
    final difference = live
        ? _intOrNull(r['difference_minor'])
        : (completed && calculated != null ? statement - calculated : null);
    return ReconciliationSession(
      id: r['id'] as String,
      accountId: r['account_id'] as String,
      statementDate: (r['statement_date'] as String).substring(0, 10),
      statementBalance: statement,
      status: status,
      calculatedBalance: calculated,
      clearedBalance: cleared,
      difference: difference,
      pendingLegCount: _intOrNull(r['pending_account_leg_count']),
      clearedLegCount: _intOrNull(r['cleared_account_leg_count']),
      reconciledLegCount: _intOrNull(r['reconciled_account_leg_count']),
      startedAt: r['started_at'] as String?,
      completedAt: r['completed_at'] as String?,
      lastReopenedAt: r['last_reopened_at'] as String?,
      createdAt: r['created_at'] as String?,
      updatedAt: r['updated_at'] as String?,
    );
  }

  /// Entry legs + statement sessions for one account — the mobile
  /// counterpart of the web's loadAuthenticatedState.
  ///
  /// READ-PATH NOTE: `account_reconciliation_summaries` is the canonical
  /// read, but its lateral join calls the SECURITY INVOKER snapshot,
  /// which the Neon Data API refuses with 42501 (no USAGE on schema
  /// `auth`) once a session row exists — the view only answers while the
  /// join never fires. On any view failure we fall back to the
  /// `account_reconciliations` base table (RLS-readable): completed rows
  /// carry their stored values, and open rows get the same snapshot
  /// computed locally by [resolveSessionSnapshots].
  Future<ReconciliationStateData> loadReconciliationState(
    String accountId,
  ) async {
    List<Map<String, dynamic>> entryRows;
    try {
      entryRows = await _api.select(
        'account_reconciliation_entry_feed',
        query: {'select': _reconEntryColumns, 'account_id': 'eq.$accountId'},
      );
    } catch (e) {
      if (isMissingReconciliationContract(e)) {
        return const ReconciliationStateData(
          featureAvailable: false,
          rows: [],
          sessions: [],
        );
      }
      rethrow;
    }

    List<Map<String, dynamic>> sessionRows;
    var live = true;
    try {
      sessionRows = await _api.select(
        'account_reconciliation_summaries',
        query: {
          'select': _reconSummaryColumns,
          'account_id': 'eq.$accountId',
          'order': 'statement_date.desc,created_at.desc',
        },
      );
    } catch (e) {
      if (isMissingReconciliationContract(e)) {
        return const ReconciliationStateData(
          featureAvailable: false,
          rows: [],
          sessions: [],
        );
      }
      sessionRows = await _api.select(
        'account_reconciliations',
        query: {
          'select': _reconTableColumns,
          'account_id': 'eq.$accountId',
          'order': 'statement_date.desc,created_at.desc',
        },
      );
      live = false;
    }

    return ReconciliationStateData(
      featureAvailable: true,
      rows: entryRows.map(_reconEntryFromRow).toList(),
      sessions: [
        for (final r in sessionRows) _reconSessionFromRow(r, live: live),
      ],
    );
  }

  /// POST /rpc/start_account_reconciliation — opens a statement period;
  /// the server validates the date is not in the future and not before
  /// the latest completed period.
  Future<String> startAccountReconciliation({
    required String accountId,
    required String statementDate,
    required int statementBalance,
  }) async {
    final id = await _api.rpc('start_account_reconciliation', {
      'p_account_id': accountId,
      'p_statement_date': statementDate,
      'p_statement_balance_minor': statementBalance,
    });
    if (id is! String) {
      throw const FormatException('invalid_reconciliation_id');
    }
    return id;
  }

  /// POST /rpc/set_account_entry_reconciliation_state — flips one logical
  /// (transaction, account) leg between pending and cleared; the server
  /// moves every entry of the leg together and refuses 'reconciled'
  /// (that state is only ever set by completion).
  Future<void> setAccountEntryReconciliationState({
    required String entryId,
    required EntryReconciliationState state,
  }) => _api.rpc('set_account_entry_reconciliation_state', {
    'p_entry_id': entryId,
    'p_state': entryStateWire(state),
  });

  /// POST /rpc/complete_account_reconciliation — locks every cleared leg
  /// into 'reconciled'. A zero difference closes directly; a nonzero
  /// difference closes ONLY through the explicit adjustment the params
  /// name (kind forced server-side by the difference sign) — the RPC
  /// never auto-fixes a gap silently. Mirrors the web action: the
  /// optional adjustment note param stays unset.
  Future<void> completeAccountReconciliation({
    required String reconciliationId,
    String? adjustmentCategoryId,
    String? adjustmentPayee,
  }) async {
    final ok = await _api.rpc('complete_account_reconciliation', {
      'p_reconciliation_id': reconciliationId,
      'p_adjustment_category_id': adjustmentCategoryId,
      'p_adjustment_payee': adjustmentPayee,
    });
    if (ok != true) {
      throw const FormatException('invalid_reconciliation_result');
    }
  }

  /// POST /rpc/reopen_account_reconciliation — only the latest completed
  /// period, and only while nothing else is open; the server enforces
  /// both rules again (only_latest_reconciliation_can_reopen).
  Future<void> reopenAccountReconciliation(String reconciliationId) async {
    final ok = await _api.rpc('reopen_account_reconciliation', {
      'p_reconciliation_id': reconciliationId,
    });
    if (ok != true) {
      throw const FormatException('invalid_reconciliation_result');
    }
  }

  /// Every ledger row touching [accountId], newest first — the
  /// reconciliation workspace joins these to entry-feed legs by
  /// transaction id, and statement periods run as far back as the
  /// ledger does. Bounded by [_ledgerMaxPages] pages: beyond that the
  /// workspace tells the user the tail is missing rather than paging
  /// forever; summary figures stay honest because they count legs, not
  /// loaded rows.
  Future<({List<Transaction> rows, bool truncated})> loadAccountLedger(
    String accountId,
  ) async {
    const query = TransactionQuery();
    final scoped = query.copyWith(accountId: accountId);
    final rows = <Transaction>[];
    var offset = 0;
    for (var page = 0; page < _ledgerMaxPages; page++) {
      final next = await loadTransactionPage(scoped, offset: offset);
      rows.addAll(next.rows);
      offset += next.rows.length;
      if (!next.hasMore) return (rows: rows, truncated: false);
    }
    return (rows: rows, truncated: true);
  }

  static const _ledgerMaxPages = 20;
}

/// One UUIDv4 per form instance = one idempotency key per user intent.
String newIdempotencyKey() {
  final r = Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String hex(int i) => b[i].toRadixString(16).padLeft(2, '0');
  return '${hex(0)}${hex(1)}${hex(2)}${hex(3)}-'
      '${hex(4)}${hex(5)}-${hex(6)}${hex(7)}-'
      '${hex(8)}${hex(9)}-${hex(10)}${hex(11)}'
      '${hex(12)}${hex(13)}${hex(14)}${hex(15)}';
}
