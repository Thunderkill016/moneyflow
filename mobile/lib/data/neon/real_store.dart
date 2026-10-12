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

  Future<List<Transaction>> loadTransactions({int limit = 50}) async {
    final rows = await _api.select(
      'transaction_feed',
      query: {
        'select':
            'id,kind,note,occurred_on,amount_minor,account_id,account_name,'
            'category_id,category_name,destination_account_id,'
            'destination_account_name,payee',
        'order': 'occurred_on.desc,created_at.desc',
        'limit': '$limit',
      },
    );
    return rows
        .map(
          (r) => Transaction(
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
