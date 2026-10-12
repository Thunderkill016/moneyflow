import 'dart:math';

import '../../domain/models.dart';
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
            'id,name,kind,currency_code,initial_balance_minor,is_archived',
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
          ),
        )
        .toList();
  }

  static const _txColumns =
      'id,kind,note,occurred_on,amount_minor,account_id,account_name,'
      'category_id,category_name,destination_account_id,'
      'destination_account_name,payee,updated_at';

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
    return rows.map(_txFromRow).toList();
  }

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

  /// Capture-form categories (expense/income kinds; transfers use none).
  Future<List<Category>> loadCategories() async {
    final rows = await _api.select(
      'categories',
      query: {'select': 'id,name,kind', 'order': 'kind.asc,name.asc'},
    );
    return rows
        .map(
          (r) => Category(
            id: r['id'] as String,
            name: r['name'] as String,
            kind: r['kind'] == 'income'
                ? TransactionKind.income
                : TransactionKind.expense,
          ),
        )
        .toList();
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
            'id,category_id,category_name,month_start,limit_minor,spent_minor',
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
          ),
        )
        .toList();
  }

  /// Recurring commitments + this month's paid state —
  /// public.recurring_commitment_feed + commitment_occurrences.
  Future<List<RecurringCommitment>> loadCommitments(String monthStart) async {
    final rows = await _api.select(
      'recurring_commitment_feed',
      query: {
        'select':
            'id,name,amount_minor,due_day,account_id,account_name,'
            'category_id,category_name,is_archived',
        'is_archived': 'eq.false',
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
          ),
        )
        .toList();
  }

  /// Savings goals — public.savings_goals.
  Future<List<SavingsGoal>> loadGoals() async {
    final rows = await _api.select(
      'savings_goals',
      query: {
        'select': 'id,name,target_minor,allocated_minor,deadline,is_archived',
        'is_archived': 'eq.false',
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
      'p_kind': switch (kind) {
        AccountKind.bank => 'bank',
        AccountKind.eWallet => 'e_wallet',
        AccountKind.creditCard => 'credit_card',
        AccountKind.savings => 'savings',
        AccountKind.cash => 'cash',
      },
      'p_initial_balance_minor': initialBalance,
      'p_currency_code': 'VND',
    });
    return id as String;
  }

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
  Future<String> upsertBudget({
    required String categoryId,
    required String monthStart,
    required int limitMinor,
  }) async {
    final id = await _api.rpc('upsert_monthly_budget', {
      'p_category_id': categoryId,
      'p_month_start': monthStart,
      'p_limit_minor': limitMinor,
    });
    return id as String;
  }

  Future<void> deleteBudget(String budgetId) =>
      _api.rpc('delete_monthly_budget', {'p_budget_id': budgetId});

  /// POST /rpc/upsert_recurring_commitment — create a monthly commitment.
  Future<String> upsertCommitment({
    required String name,
    required int amountMinor,
    required int dueDay,
    required String accountId,
    required String categoryId,
  }) async {
    final id = await _api.rpc('upsert_recurring_commitment', {
      'p_commitment_id': null,
      'p_name': name,
      'p_amount_minor': amountMinor,
      'p_due_day': dueDay,
      'p_account_id': accountId,
      'p_category_id': categoryId,
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

  Future<void> setCommitmentArchived(String commitmentId, bool archived) =>
      _api.rpc('set_recurring_commitment_archived', {
        'p_commitment_id': commitmentId,
        'p_archived': archived,
      });

  /// POST /rpc/upsert_savings_goal — create a goal (p_goal_id null).
  Future<String> upsertGoal({
    required String name,
    required int targetMinor,
    String? deadline,
  }) async {
    final id = await _api.rpc('upsert_savings_goal', {
      'p_goal_id': null,
      'p_name': name,
      'p_target_minor': targetMinor,
      'p_deadline': deadline,
    });
    return id as String;
  }

  /// POST /rpc/adjust_savings_goal — add (positive) or withdraw (negative).
  Future<void> adjustGoal(String goalId, int amountMinor) => _api.rpc(
    'adjust_savings_goal',
    {'p_goal_id': goalId, 'p_amount_minor': amountMinor},
  );

  Future<void> setGoalArchived(String goalId, bool archived) => _api.rpc(
    'set_savings_goal_archived',
    {'p_goal_id': goalId, 'p_archived': archived},
  );
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
