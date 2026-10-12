import '../../domain/models.dart';
import 'data_api.dart';

/// Neon Data API store — same domain shape as [DemoStore], real rows.
/// Row columns mirror public.accounts / account_balances / transaction_feed.
class RealStore {
  const RealStore(this._api);

  final NeonDataApi _api;

  Future<List<AccountSummary>> loadAccounts() async {
    final rows = await _api.select('accounts', query: {
      'select': 'id,name,kind,currency_code,initial_balance_minor,is_archived',
      'is_archived': 'eq.false',
      'order': 'created_at.asc',
    });
    final balances = await _api.select('account_balances',
        query: {'select': 'account_id,balance_minor'});
    final byId = {
      for (final b in balances) b['account_id']: (b['balance_minor'] as num)
    };
    return rows
        .map((r) => AccountSummary(
              id: r['id'] as String,
              name: r['name'] as String,
              kind: accountKindFromString(r['kind'] as String),
              currencyCode: r['currency_code'] as String,
              initialBalance: (r['initial_balance_minor'] as num).toInt(),
              balance: (byId[r['id']] ?? 0).toInt(),
              isArchived: r['is_archived'] as bool? ?? false,
            ))
        .toList();
  }

  Future<List<Transaction>> loadTransactions({int limit = 50}) async {
    final rows = await _api.select('transaction_feed', query: {
      'select':
          'id,kind,note,occurred_on,amount_minor,account_id,account_name,'
              'category_id,category_name,destination_account_id,'
              'destination_account_name,payee',
      'order': 'occurred_on.desc,created_at.desc',
      'limit': '$limit',
    });
    return rows
        .map((r) => Transaction(
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
            ))
        .toList();
  }
}
