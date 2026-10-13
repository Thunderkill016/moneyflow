import 'dart:math';

import '../../domain/categories.dart';
import '../../domain/models.dart';
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

  static Transaction _txFromRow(Map<String, dynamic> r) => Transaction(
    id: r['id'] as String,
    kind: switch (r['kind']) {
      'income' => TransactionKind.income,
      'transfer' => TransactionKind.transfer,
      _ => TransactionKind.expense,
    },
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
  );

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
