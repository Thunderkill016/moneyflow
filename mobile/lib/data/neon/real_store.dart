import 'dart:math';

import '../../domain/csv_import.dart';
import '../../domain/debts.dart';
import '../../domain/events.dart';
import '../../domain/inbox.dart';
import '../notification_capture/bank_notification_parser.dart';
import '../../domain/models.dart';
import '../../domain/reconciliation.dart';
import '../../domain/transaction_query.dart';
import '../recurring_dismissals.dart';
import 'data_api.dart';

/// Neon Data API store — same domain shape as [DemoStore], real rows.
/// Row columns mirror public.accounts / account_balances / transaction_feed.
class RealStore implements PatternDismissalSync {
  const RealStore(this._api);

  final NeonDataApi _api;

  Future<List<AccountSummary>> loadAccounts() => _loadAccounts(false);

  /// Every account including archived — the management page lists them
  /// under "Đã lưu trữ" so archiving stays reversible.
  Future<List<AccountSummary>> loadAllAccounts() => _loadAccounts(true);

  Future<List<AccountSummary>> _loadAccounts(bool includeArchived) async {
    final rows = await _api.select(
      'accounts',
      query: {
        'select':
            'id,name,kind,currency_code,initial_balance_minor,is_archived,'
            'icon,color,updated_at',
        if (!includeArchived) 'is_archived': 'eq.false',
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

  /// `excluded_from_reports` lands with migration 20261016200000 — feed
  /// reads ask for it first and retry without it on the column-missing
  /// error, where every row is unflagged by definition (the column's
  /// own default).
  static const _txColumnsWithExclusion = '$_txColumns,excluded_from_reports';

  /// transaction_feed / deleted_transaction_feed select with the
  /// exclusion column's pre-migration fallback — see
  /// [_txColumnsWithExclusion]. [query] receives the select list so each
  /// caller keeps its own filters.
  Future<List<Map<String, dynamic>>> _selectTx(
    String table,
    Map<String, String> Function(String select) query,
  ) async {
    try {
      return await _api.select(table, query: query(_txColumnsWithExclusion));
    } catch (_) {
      return await _api.select(table, query: query(_txColumns));
    }
  }

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
      excludedFromReports: r['excluded_from_reports'] == true,
    );
  }

  Future<List<Transaction>> loadTransactions({int limit = 50}) async {
    final rows = await _selectTx(
      'transaction_feed',
      (select) => {
        'select': select,
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
    final rows = await _selectTx(
      'transaction_feed',
      (select) => {
        'select': select,
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
  /// busy month is never truncated to the recent-feed page. Pages through
  /// the whole range up to [_rangeMaxPages] × [_rangePageSize] rows;
  /// beyond that `truncated` labels the result honestly instead of a
  /// silent tail cut. `id.desc` makes the page order total so offset
  /// paging can't skip or repeat rows (same rule as loadTransactionPage).
  Future<({List<Transaction> rows, bool truncated})> loadTransactionsInRange(
    String from,
    String to,
  ) async {
    final rows = <Transaction>[];
    var offset = 0;
    for (var page = 0; page < _rangeMaxPages; page++) {
      final batch = await _selectTx(
        'transaction_feed',
        (select) => {
          'select': select,
          'and': '(occurred_on.gte.$from,occurred_on.lt.$to)',
          'order': 'occurred_on.desc,created_at.desc,id.desc',
          'limit': '${_rangePageSize + 1}',
          'offset': '$offset',
        },
      );
      rows.addAll(batch.take(_rangePageSize).map(_txFromRow));
      if (batch.length <= _rangePageSize) {
        return (rows: rows, truncated: false);
      }
      offset += _rangePageSize;
    }
    return (rows: rows, truncated: true);
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

  /// Posted ledger rows still flagged needs_review — the dashboard
  /// attention card's count + preview lines. Two-hop like
  /// [_withReviewStatus], but in the other direction: the flag lives on
  /// transaction_review_feed (the security-invoker view over
  /// financial_transactions that already excludes soft-deleted rows);
  /// the display fields come from transaction_feed for the newest
  /// [previewLimit] ids. [count] is the full flagged backlog — the id
  /// read is unbounded on purpose so the card never understates the
  /// queue the way a capped preview would.
  Future<NeedsReviewTransactions> loadNeedsReviewTransactions({
    int previewLimit = 3,
  }) async {
    final flagged = await _api.select(
      'transaction_review_feed',
      query: {
        'select': 'id',
        'review_status': 'eq.needs_review',
        'order': 'occurred_on.desc,id.desc',
      },
    );
    if (flagged.isEmpty) return (count: 0, rows: const <Transaction>[]);
    final ids = [for (final r in flagged.take(previewLimit)) r['id'] as String];
    final rows = await _selectTx(
      'transaction_feed',
      (select) => {
        'select': select,
        'id': 'in.(${ids.join(',')})',
        'order': 'occurred_on.desc,created_at.desc,id.desc',
      },
    );
    return (
      count: flagged.length,
      rows: [
        // Flagged by construction — the review read itself is the proof.
        for (final t in rows.map(_txFromRow)) t.copyWith(needsReview: true),
      ],
    );
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
    final rows = await _selectTx(
      'deleted_transaction_feed',
      (select) => {
        'select': '$select,deleted_at',
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

  /// POST /rpc/upsert_financial_category — the Neon RPC-only write path
  /// (db/neon/migrations/20261010120000). Direct table writes die 42501
  /// under guard_oauth_mutation — the managed `authenticated` role lacks
  /// USAGE on schema `auth` — so create AND update both go through the
  /// SECURITY DEFINER function, which resolves auth.uid() as the
  /// caller's tenant and normalizes/validates like the web action:
  /// p_category_id null creates; otherwise it rewrites name/icon/color
  /// with kind locked server-side (category_kind_locked). Null icon/color
  /// params fall back to the same kind defaults defaultCategoryMeta
  /// uses, so callers may pass them straight through. Callers pass
  /// already-normalized names (normalizeCategoryName).
  Future<Category> saveCategory({
    String? id,
    required String name,
    required TransactionKind kind,
    String? icon,
    String? color,
  }) async {
    final result = await _api.rpc('upsert_financial_category', {
      'p_name': name,
      'p_kind': kind == TransactionKind.income ? 'income' : 'expense',
      'p_icon': icon,
      'p_color': color,
      'p_category_id': ?id,
    });
    if (result is! List || result.isEmpty) {
      // The function always returns the written row; an empty result
      // means the write landed but the read-back didn't — same honesty
      // split the table path used.
      throw Exception(id == null ? 'saved_unread' : 'category_not_found');
    }
    return _categoryFromRow(result.first as Map<String, dynamic>);
  }

  /// POST /rpc/set_category_archived — the definer twin of the web's
  /// setCategoryArchivedAction; defaults archive the same way (the web
  /// offers Ẩn/Hiện lại on every row). Direct PATCH dies 42501 under the
  /// RPC-only write guard, so both flag flips ride this function.
  Future<Category> setCategoryArchived(String id, bool archived) async {
    final result = await _api.rpc('set_category_archived', {
      'p_category_id': id,
      'p_archived': archived,
    });
    if (result is! List || result.isEmpty) {
      // The function always returns the written row; empty means the write
      // landed but the read-back missed — honest failure, not silent state.
      throw Exception('category_not_found');
    }
    return _categoryFromRow(result.first as Map<String, dynamic>);
  }

  /// POST /rpc/delete_financial_category — hard delete through the definer.
  /// The server itself refuses seeded defaults (category_default_locked)
  /// and referenced rows (category_in_use) — under SECURITY DEFINER the
  /// categories delete RLS policy no longer guards them. Returns false only
  /// on a malformed result; real refusals arrive as raised errors.
  Future<bool> deleteCategory(String id) async {
    final ok = await _api.rpc('delete_financial_category', {
      'p_category_id': id,
    });
    return ok == true;
  }

  /// POST /rpc/merge_categories — fold [sourceId] into [targetId]. Every
  /// referencing row (ledger entries, budgets, commitments, income
  /// templates, inbox rules/candidates, event-budget pairs) reassigns
  /// server-side in one transaction; the source stays as an archived
  /// tombstone, never hard-deleted. Not idempotent — the caller must
  /// in-flight-guard the confirm tap so a double-tap can't re-fire.
  Future<void> mergeCategory({
    required String sourceId,
    required String targetId,
  }) async {
    await _api.rpc('merge_categories', {
      'p_source_id': sourceId,
      'p_target_id': targetId,
    });
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

  /// Base select for public.budget_progress. `period_kind` only exists
  /// once migration 20261016190000 is applied — the period reads ask for
  /// it first and retry without it on the column-missing error, where
  /// every row is monthly by definition (the column's own default).
  static const _budgetBaseSelect =
      'id,category_id,category_name,month_start,limit_minor,spent_minor,'
      'updated_at';

  /// Budget rows with spent progress — public.budget_progress. The read
  /// returns every period kind anchored at [monthStart]; callers scope
  /// to a kind through the row's `period` (the domain functions filter
  /// again anyway, so a mixed list can never leak weekly carry into a
  /// monthly figure).
  Future<List<BudgetProgress>> loadBudgets(String monthStart) async {
    Map<String, String> query(String select) => {
      'select': select,
      'month_start': 'eq.$monthStart',
      'order': 'category_name.asc',
    };
    List<Map<String, dynamic>> rows;
    try {
      rows = await _api.select(
        'budget_progress',
        query: query('$_budgetBaseSelect,period_kind'),
      );
    } catch (_) {
      rows = await _api.select(
        'budget_progress',
        query: query(_budgetBaseSelect),
      );
    }
    return rows.map(_budgetFromRow).toList();
  }

  /// Every budgeted period anchored in [fromPeriod]..[toPeriod]
  /// inclusive — the same `budget_progress` range read the web
  /// workspace takes for the rollover window
  /// (`month_start.gte(windowStart).lte(anchor)`), so a prior period's
  /// spent figure is always the view's own per-category math. All
  /// period kinds come back; the caller partitions by `period`.
  Future<List<BudgetProgress>> loadBudgetsInRange(
    String fromMonth,
    String toMonth,
  ) async {
    Map<String, String> query(String select) => {
      'select': select,
      'and': '(month_start.gte.$fromMonth,month_start.lte.$toMonth)',
      'order': 'month_start.desc,category_name.asc',
    };
    List<Map<String, dynamic>> rows;
    try {
      rows = await _api.select(
        'budget_progress',
        query: query('$_budgetBaseSelect,period_kind'),
      );
    } catch (_) {
      rows = await _api.select(
        'budget_progress',
        query: query(_budgetBaseSelect),
      );
    }
    return rows.map(_budgetFromRow).toList();
  }

  static BudgetProgress _budgetFromRow(Map<String, dynamic> r) =>
      BudgetProgress(
        id: r['id'] as String,
        categoryId: r['category_id'] as String,
        categoryName: r['category_name'] as String? ?? 'Khác',
        monthStart: r['month_start'] as String,
        limitMinor: (r['limit_minor'] as num).toInt(),
        spentMinor: (r['spent_minor'] as num).toInt(),
        updatedAt: r['updated_at'] as String?,
        period: BudgetPeriod.fromKey(r['period_kind'] as String?),
      );

  /// Recurring commitments + this month's paid state —
  /// public.recurring_commitment_feed + commitment_occurrences. Archived
  /// rows come back too: the planning page lists them under "Đã lưu trữ",
  /// and the other consumers (safe-spend, reminder scheduler) already
  /// skip isArchived rows themselves.
  ///
  /// The occurrence read is newest-first, unfiltered by month: the same
  /// rows resolve `paidThisMonth` (this month's occurrence) AND
  /// `lastPaidMonth` (the first row per commitment — the anchor a
  /// non-monthly interval counts its next due month from). The cap only
  /// bounds extreme histories; desc order means the latest months always
  /// arrive inside it.
  Future<List<RecurringCommitment>> loadCommitments(String monthStart) async {
    // The feed column `interval_months` only exists once migration
    // 20261015090000 is applied. Ask for it first; on the pre-migration
    // column-missing error retry without it — every row is then monthly
    // by definition, which is the migration's own default, never an
    // invented cadence. A genuinely broken read still fails the list.
    const baseSelect =
        'id,name,amount_minor,due_day,account_id,account_name,'
        'category_id,category_name,is_archived,updated_at';
    List<Map<String, dynamic>> rows;
    try {
      rows = await _api.select(
        'recurring_commitment_feed',
        query: {
          'select': '$baseSelect,interval_months',
          'order': 'due_day.asc',
        },
      );
    } catch (_) {
      rows = await _api.select(
        'recurring_commitment_feed',
        query: {'select': baseSelect, 'order': 'due_day.asc'},
      );
    }
    final occurrences = await _api.select(
      'commitment_occurrences',
      query: {
        'select': 'commitment_id,month_start,transaction_id',
        'order': 'month_start.desc',
        'limit': '500',
      },
    );
    final paidTxIds = <String, String?>{};
    final lastPaidMonths = <String, String>{};
    for (final o in occurrences) {
      final commitmentId = o['commitment_id'];
      if (commitmentId is! String) continue;
      final occMonth = o['month_start'];
      // transaction_id can be null on a partial write — that occurrence
      // still proves "paid", it just cannot show the recorded amount.
      if (occMonth == monthStart) {
        paidTxIds[commitmentId] = o['transaction_id'] as String?;
      }
      // Newest-first order: the first row per commitment is its latest.
      if (occMonth is String) {
        lastPaidMonths.putIfAbsent(commitmentId, () => occMonth);
      }
    }
    final paidAmounts = await _loadPaidAmounts(
      paidTxIds.values.whereType<String>().toSet(),
    );
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
            paidThisMonth: paidTxIds.containsKey(r['id']),
            paidAmountMinor: paidAmounts[paidTxIds[r['id']]],
            intervalMonths:
                (r['interval_months'] as num?)?.toInt() ??
                // Pre-migration rows (the column arrives with
                // 20261015090000) read as monthly — the feed's own
                // default, never an invented cadence.
                1,
            lastPaidMonth: lastPaidMonths[r['id']],
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  /// Amounts the month's payment transactions recorded — a light
  /// `transaction_feed` read keyed by the occurrence's transaction id.
  /// Advisory: a failed read or a soft-deleted payment degrades to "paid,
  /// amount unknown" (null) rather than failing the commitments list.
  Future<Map<String, int>> _loadPaidAmounts(Set<String> transactionIds) async {
    if (transactionIds.isEmpty) return const {};
    try {
      final rows = await _api.select(
        'transaction_feed',
        query: {
          'select': 'id,amount_minor',
          'id': 'in.(${transactionIds.join(',')})',
        },
      );
      return {
        for (final r in rows)
          r['id'] as String: (r['amount_minor'] as num).toInt(),
      };
    } catch (_) {
      return const {};
    }
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
            'created_at,updated_at',
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
            createdAt: r['created_at'] as String?,
            updatedAt: r['updated_at'] as String?,
          ),
        )
        .toList();
  }

  /// A goal's funding detail (D11): the signed allocation history
  /// (savings_goal_allocations — the authority for progress) plus the
  /// newest transactions tagged with goal_id (annotation only — the
  /// linkage migration is explicit that the tag changes no totals).
  /// Both lists cap at [_goalFundingLimit]; `allocationsHasMore` /
  /// `linkedHasMore` flag a longer history so the UI can say "mới nhất"
  /// instead of implying completeness.
  static const _goalFundingLimit = 20;

  Future<GoalFunding> loadGoalFunding(String goalId) async {
    final allocRows = await _api.select(
      'savings_goal_allocations',
      query: {
        'select': 'id,amount_minor,created_at',
        'goal_id': 'eq.$goalId',
        'order': 'created_at.desc',
        'limit': '${_goalFundingLimit + 1}',
      },
    );
    final linkedRows = await _selectTx(
      'transaction_feed',
      (select) => {
        'select': select,
        'goal_id': 'eq.$goalId',
        'order': 'occurred_on.desc,created_at.desc,id.desc',
        'limit': '${_goalFundingLimit + 1}',
      },
    );
    return (
      allocations: [
        for (final r in allocRows.take(_goalFundingLimit))
          GoalAllocation(
            id: r['id'] as String,
            amountMinor: (r['amount_minor'] as num).toInt(),
            createdAt: r['created_at'] as String,
          ),
      ],
      allocationsHasMore: allocRows.length > _goalFundingLimit,
      linked: [
        for (final r in linkedRows.take(_goalFundingLimit)) _txFromRow(r),
      ],
      linkedHasMore: linkedRows.length > _goalFundingLimit,
    );
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
  /// The RPC returns false instead of throwing when nothing was
  /// restored — surface it so the UI never claims a false success.
  Future<void> restoreTransaction(String transactionId) async {
    final result = await _api.rpc('restore_money_transaction', {
      'p_transaction_id': transactionId,
    });
    if (result != true) {
      throw StateError('restore_refused');
    }
  }

  /// POST /rpc/permanently_delete_money_transaction — hard-deletes a row
  /// already in the trash (server refuses unless deleted_at is set).
  /// The RPC returns false instead of throwing when the row is not
  /// purgeable — surface that as an error so the UI never claims a
  /// false success.
  Future<void> permanentlyDeleteTransaction(String transactionId) async {
    final result = await _api.rpc('permanently_delete_money_transaction', {
      'p_transaction_id': transactionId,
    });
    if (result != true) {
      throw StateError('permanent_delete_refused');
    }
  }

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

    /// D13 — null preserves the stored flag (the param's own default);
    /// a bool is only sent when the user actually flipped the switch.
    bool? excludedFromReports,
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
    // Migration 20261016200000 — omitted entirely when null so a
    // pre-migration server keeps answering the legacy body.
    'p_excluded_from_reports': ?excludedFromReports,
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
  /// The conflict target is (user, category, period kind, anchor): an
  /// edit re-sends the same triple with [expectedUpdatedAt] guarding
  /// against a stale read.
  /// [period] rides `p_period_kind` (migration 20261016190000); it is
  /// only sent for non-monthly budgets — the server default is monthly
  /// anyway, so a monthly save keeps working against the pre-migration
  /// signature while a weekly one honestly errors until the RPC exists
  /// (the p_interval_months convention).
  Future<String> upsertBudget({
    required String categoryId,
    required String monthStart,
    required int limitMinor,
    String? expectedUpdatedAt,
    BudgetPeriod period = BudgetPeriod.monthly,
  }) async {
    final id = await _api.rpc('upsert_monthly_budget', {
      'p_category_id': categoryId,
      'p_month_start': monthStart,
      'p_limit_minor': limitMinor,
      'p_expected_updated_at': expectedUpdatedAt,
      if (period != BudgetPeriod.monthly) 'p_period_kind': period.key,
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
  /// [intervalMonths] rides `p_interval_months` (migration 20261015090000);
  /// it is only sent when > 1 — the server default is monthly anyway, so a
  /// monthly save keeps working against the pre-migration signature while
  /// a non-monthly save honestly errors until the RPC exists.
  Future<String> upsertCommitment({
    String? commitmentId,
    required String name,
    required int amountMinor,
    required int dueDay,
    required String accountId,
    required String categoryId,
    int intervalMonths = 1,
    String? expectedUpdatedAt,
  }) async {
    final id = await _api.rpc('upsert_recurring_commitment', {
      'p_commitment_id': commitmentId,
      'p_name': name,
      'p_amount_minor': amountMinor,
      'p_due_day': dueDay,
      'p_account_id': accountId,
      'p_category_id': categoryId,
      if (intervalMonths > 1) 'p_interval_months': intervalMonths,
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

  /// POST /rpc/delete_my_account — user-initiated full account deletion
  /// (db/neon/migrations/20261010123000): purges every tenant row, then
  /// deletes the neon_auth session/account/user rows — all in one
  /// transaction, all server-side. The function itself raises
  /// `tenant_data_purge_incomplete` before returning a partial result,
  /// so a returned row means the purge verified empty; the remaining
  /// count is still checked here so a malformed/shape-changed reply is
  /// never reported as success.
  ///
  /// After success the auth identity is gone: the current JWT dies with
  /// it and every later call 401s. Callers must not reuse the session.
  /// Returns the deleted-row count the server reports.
  Future<int> deleteMyAccount() async {
    final result = await _api.rpc('delete_my_account', const {});
    if (result is! Map) {
      throw const FormatException('delete_my_account: malformed result');
    }
    final remaining = result['tenant_rows_remaining'];
    if (remaining is! num || remaining != 0) {
      throw StateError('delete_my_account: tenant_rows_remaining=$remaining');
    }
    final deleted = result['deleted_rows'];
    return deleted is num ? deleted.toInt() : 0;
  }

  /// GET /pattern_dismissals — the RLS-scoped select the web's
  /// getPatternDismissedKeys performs (src/server/dismissals.ts), fixed
  /// to the recurring-suggestion scope. Direct insert is revoked on the
  /// table, so reads are the only table traffic allowed.
  @override
  Future<Set<String>> loadRecurringDismissedKeys() async {
    final rows = await _api.select(
      'pattern_dismissals',
      query: {'select': 'pattern_key', 'scope': 'eq.recurring'},
    );
    return {
      for (final r in rows)
        if (r['pattern_key'] is String) r['pattern_key'] as String,
    };
  }

  /// POST /rpc/dismiss_pattern_keys — the security-definer write the
  /// web's dismissPatternKeysAction calls. user_id comes from auth.uid()
  /// server-side; a malformed key or scope raises, so callers see the
  /// failure rather than a silent partial write.
  @override
  Future<void> dismissRecurringKeys(List<String> keys) => _api.rpc(
    'dismiss_pattern_keys',
    {'p_scope': 'recurring', 'p_keys': keys},
  );

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

  /// Preview lines for the dashboard attention card — the newest pending
  /// candidates, capped small. The count stays with
  /// [loadPendingInboxCount]; this read only names what is waiting.
  Future<List<InboxCandidate>> loadPendingInboxPreviews({int limit = 2}) async {
    final rows = await _api.select(
      'inbox_candidates',
      query: {
        'select': _candidateColumns,
        'status': 'eq.pending',
        'order': 'occurred_on.desc,created_at.desc,id.desc',
        'limit': '$limit',
      },
    );
    return rows.map(_candidateFromRow).toList();
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

  /// POST /rpc/reject_inbox_candidate — the definer equivalent of the web's
  /// status flip: `rejected`, never a hard delete, so the audit trail
  /// survives. Direct PATCH dies 42501 under the RPC-only write guard.
  /// False upstream means the row left the pending scope between our read
  /// and the write — the caller's queue is stale, so that surfaces as a
  /// failure.
  Future<void> rejectInboxCandidate(String candidateId) async {
    final ok = await _api.rpc('reject_inbox_candidate', {
      'p_candidate_id': candidateId,
    });
    if (ok != true) throw Exception('candidate_not_found');
  }

  // ---- Inbox auto-fill rules (public.inbox_rules; writes go through the
  // definer RPCs of db/neon/migrations/20261010120000 — direct table writes
  // die 42501 under guard_oauth_mutation). The row shape matches the select
  // the web's getRulesWorkspace performs. ----

  static const _ruleColumns =
      'id,stage,priority,enabled,match_field,contains_text,category_id,'
      'merchant_name,version,created_at,updated_at';

  static InboxRule _ruleFromRow(Map<String, dynamic> r) => InboxRule(
    id: r['id'] as String,
    // bigint may arrive as a JSON string — same normalization the web's
    // safePositiveInteger applies; a malformed row fails the load honestly
    // instead of writing back a corrupted version later.
    priority: _intField(r['priority'], 'rule_priority'),
    enabled: r['enabled'] as bool? ?? false,
    matchField: ruleMatchFieldFromString(r['match_field'] as String? ?? 'any'),
    containsText: r['contains_text'] as String? ?? '',
    categoryId: r['category_id'] as String? ?? '',
    merchantName: r['merchant_name'] as String?,
    version: _intField(r['version'], 'rule_version'),
    createdAt: r['created_at'] as String?,
    updatedAt: r['updated_at'] as String?,
  );

  /// The caller's full rule list in apply order — priority, then created_at,
  /// then id; the same ordering the web workspace selects. Category names
  /// stay unresolved here (the row only stores category_id) — the page
  /// joins the categories read so archived targets still render.
  Future<List<InboxRule>> loadInboxRules() async {
    final rows = await _api.select(
      'inbox_rules',
      query: {
        'select': _ruleColumns,
        'order': 'priority.asc,created_at.asc,id.asc',
      },
    );
    return rows.map(_ruleFromRow).toList();
  }

  /// POST /rpc/upsert_inbox_rule — [ruleId] null creates at
  /// max(priority)+1 (the web save path's append rule); a real id updates
  /// in place and [expectedVersion] must match the stored version or the
  /// server raises stale_write. Category availability (active, owned) is
  /// enforced server-side by the validate_inbox_rule_category trigger.
  Future<InboxRule> saveInboxRule({
    String? ruleId,
    required RuleMatchField matchField,
    required String containsText,
    required String categoryId,
    String? merchantName,
    bool enabled = true,
    int? expectedVersion,
  }) async {
    final trimmedMerchant = merchantName?.trim();
    final result = await _api.rpc('upsert_inbox_rule', {
      'p_match_field': ruleMatchFieldWire(matchField),
      'p_contains_text': containsText,
      'p_category_id': categoryId,
      'p_merchant_name': trimmedMerchant == null || trimmedMerchant.isEmpty
          ? null
          : trimmedMerchant,
      'p_enabled': enabled,
      'p_rule_id': ?ruleId,
      'p_expected_version': ?expectedVersion,
    });
    if (result is! List || result.isEmpty) {
      // The function always returns the written row — an empty payload
      // means the write landed but the read-back missed.
      throw Exception(ruleId == null ? 'saved_unread' : 'rule_not_found');
    }
    return _ruleFromRow(result.first as Map<String, dynamic>);
  }

  /// POST /rpc/delete_inbox_rule — hard delete guarded by the stored
  /// [expectedVersion] (stale_write on drift). The server keeps applied
  /// evidence on old candidates by design; only the rule goes away.
  Future<void> deleteInboxRule(String ruleId, int expectedVersion) async {
    final ok = await _api.rpc('delete_inbox_rule', {
      'p_rule_id': ruleId,
      'p_expected_version': expectedVersion,
    });
    if (ok != true) throw Exception('rule_not_found');
  }

  /// POST /rpc/replace_inbox_rule_priorities — the whole ordered id list in
  /// one write (the same RPC the web's reorderRulesAction calls). The
  /// server refuses a partial or stale set (incomplete_rule_order /
  /// rule_not_found) so a raced reorder can never silently scramble
  /// priority.
  Future<void> reorderInboxRules(List<String> orderedIds) =>
      _api.rpc('replace_inbox_rule_priorities', {'p_rule_ids': orderedIds});

  /// POST /rpc/apply_inbox_rule_to_candidate — apply one rule to one pending
  /// candidate. The server re-validates the version, the match and the
  /// pending status itself, so a stale sweep refuses honestly instead of
  /// writing a wrong category. Used by the rules sheet's "apply to existing
  /// pending" option (Monarch's apply-to-existing checkbox).
  Future<void> applyInboxRuleToCandidate({
    required String candidateId,
    required String ruleId,
    required int ruleVersion,
  }) => _api.rpc('apply_inbox_rule_to_candidate', {
    'p_candidate_id': candidateId,
    'p_rule_id': ruleId,
    'p_expected_version': ruleVersion,
  });

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

  /// POST /rpc/create_inbox_candidates — the SECURITY DEFINER create path
  /// drafted in db/neon/migrations/20261010122000 for batch-less sources like
  /// `notification`. It is NOT yet applied on the hosted Data API (verified
  /// 2026-10-13: PGRST202), and the applied ingest paths all hardcode
  /// paste/csv — so `source: 'notification'` has no working route yet and
  /// callers must treat a missing function as blocked-on-migration, never
  /// fall back to a table INSERT (42501).
  ///
  /// Re-broadcast dedup rides `source_external_id` ('notif:hash'): the RPC
  /// refuses `local_id` by design (restore-owned), and the source-identity
  /// machinery (plan_inbox_candidate → resolve_inbox_source_identity) gives
  /// notification drafts a duplicate verdict at approval time. Status is
  /// server-hardcoded 'pending' — the review queue owns approval.
  Future<int> createNotificationCandidates(
    List<BankNotificationDraft> drafts,
  ) async {
    if (drafts.isEmpty) return 0;
    final res = await _api.rpc('create_inbox_candidates', {
      'p_candidates': [
        for (final d in drafts)
          {
            'id': newIdempotencyKey(),
            'kind': switch (d.kind) {
              TransactionKind.income => 'income',
              TransactionKind.transfer => 'transfer',
              TransactionKind.expense => 'expense',
            },
            'amount_minor': d.amountMinor,
            'merchant': d.merchant,
            'note': d.note,
            'occurred_on': d.occurredOn,
            'source': 'notification',
            'confidence': d.confidence,
            'account_name': d.accountName,
            'raw_snippet': d.rawSnippet,
            'source_external_id': d.dedupeKey,
            'parser_version': 'notif_capture@1.0',
          },
      ],
    });
    // The RPC returns the inserted rows — a short response means some
    // drafts may exist server-side without our knowing which, so this is
    // an honest "check Cần xem" outcome, not a retryable failure.
    if (res is! List || res.length != drafts.length) {
      throw const FormatException('incomplete_result');
    }
    return drafts.length;
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

  /// Range-read paging: [_rangeMaxPages] pages of [_rangePageSize] rows
  /// — a 10k-row ceiling per range query, far past a personal ledger's
  /// busiest window while still bounded.
  static const _rangePageSize = 500;
  static const _rangeMaxPages = 20;

  // ---- Debts (public.debts + public.debt_repayments; writes go through
  // the definer RPCs of db/neon/migrations/20261016120000 — direct table
  // writes die 42501 under guard_oauth_mutation). A debt is a tracking
  // record: creating it posts nothing, repayments post real ledger rows.

  static const _debtColumns =
      'id,counterparty,direction,principal_minor,remaining_minor,note,'
      'due_date,state,version,updated_at';

  static Debt _debtFromRow(Map<String, dynamic> r) => Debt(
    id: r['id'] as String,
    counterparty: r['counterparty'] as String,
    direction: debtDirectionFromString(r['direction'] as String),
    // bigint may arrive as a JSON string — same normalization the
    // reconciled balances get.
    principalMinor: _intField(r['principal_minor'], 'debt_principal'),
    remainingMinor: _intField(r['remaining_minor'], 'debt_remaining'),
    note: r['note'] as String? ?? '',
    dueDate: (r['due_date'] as String?)?.substring(0, 10),
    state: debtStateFromString(r['state'] as String? ?? 'open'),
    version: _intField(r['version'], 'debt_version'),
    updatedAt: r['updated_at'] as String?,
  );

  /// Every non-deleted debt — the page itself groups open rows per
  /// counterparty and sections settled/archived. Tombstoned rows stay
  /// server-side; there is no mobile trash for debts yet.
  Future<List<Debt>> loadDebts() async {
    final rows = await _api.select(
      'debts',
      query: {
        'select': _debtColumns,
        'deleted_at': 'is.null',
        'order': 'created_at.asc,id.asc',
      },
    );
    return rows.map(_debtFromRow).toList();
  }

  /// POST /rpc/create_debt — tracking record only, no ledger write.
  /// The RPC takes no idempotency key: the in-flight submit guard IS the
  /// double-create defense, same contract as create_financial_account.
  Future<String> createDebt(DebtDraft draft) async {
    final id = await _api.rpc('create_debt', {
      'p_direction': debtDirectionWire(draft.direction),
      'p_counterparty': draft.counterparty,
      'p_principal_minor': draft.principalMinor,
      'p_due_date': draft.dueDate,
      'p_note': draft.note,
    });
    return id as String;
  }

  /// POST /rpc/apply_debt_repayment — validates ownership/open state/
  /// amount<=remaining, posts the real ledger transaction (expense for
  /// payable, income for receivable — the server derives the kind from
  /// the debt's direction), links it through debt_repayments and
  /// decrements remaining in one transaction. Replays by
  /// [repayment.idempotencyKey]: the same key returns the original
  /// transaction; a changed payload under it raises
  /// idempotency_intent_mismatch.
  Future<String> applyDebtRepayment(DebtRepayment repayment) async {
    final id = await _api.rpc('apply_debt_repayment', {
      'p_debt_id': repayment.debtId,
      'p_account_id': repayment.accountId,
      'p_category_id': repayment.categoryId,
      'p_amount_minor': repayment.amountMinor,
      'p_occurred_on': repayment.occurredOn,
      'p_note': repayment.note,
      'p_idempotency_key': repayment.idempotencyKey,
    });
    return id as String;
  }

  /// POST /rpc/set_debt_state — settle early (forgiven residual stays
  /// recorded on remaining_minor), archive/unarchive, or reopen.
  /// False upstream means the row was missing or already in the
  /// target state — a stale read, surfaced as a failure.
  Future<void> setDebtState(String debtId, DebtState state) async {
    final ok = await _api.rpc('set_debt_state', {
      'p_debt_id': debtId,
      'p_state': debtStateWire(state),
    });
    if (ok != true) throw Exception('state_change_rejected');
  }

  /// POST /rpc/soft_delete_debt — tombstone only; the linked ledger
  /// transactions stay (a debt delete must never erase money facts).
  Future<void> deleteDebt(String debtId) async {
    final ok = await _api.rpc('soft_delete_debt', {'p_debt_id': debtId});
    if (ok != true) throw Exception('debt_not_found');
  }

  // ---- Event budgets (D2, 20261016180000) --------------------------
  // Reads ride event_budget_progress — the same live per-entry
  // aggregate eventSpentOfTransaction mirrors client-side — and writes
  // go through the definer RPCs; direct table writes die 42501 under
  // guard_oauth_mutation, same convention as the other owned tables.

  static const _eventColumns =
      'id,name,start_date,end_date,limit_minor,spent_minor,category_ids,'
      'updated_at';

  static EventBudget _eventFromRow(Map<String, dynamic> r) => EventBudget(
    id: r['id'] as String,
    name: r['name'] as String,
    startDate: (r['start_date'] as String).substring(0, 10),
    endDate: (r['end_date'] as String).substring(0, 10),
    limitMinor: _intField(r['limit_minor'], 'event_limit'),
    spentMinor: _intField(r['spent_minor'], 'event_spent'),
    categoryIds: [
      for (final c in (r['category_ids'] as List? ?? const [])) c as String,
    ],
    updatedAt: r['updated_at'] as String?,
  );

  /// Every live event — the page sections active/upcoming/closed itself.
  /// Tombstoned rows are already out of the view, so there is no
  /// deleted_at filter client-side.
  Future<List<EventBudget>> loadEventBudgets() async {
    final rows = await _api.select(
      'event_budget_progress',
      query: {'select': _eventColumns, 'order': 'end_date.desc,id.asc'},
    );
    return rows.map(_eventFromRow).toList();
  }

  /// POST /rpc/create_event_budget — a tracking record only; nothing
  /// posts to the ledger. Replays by [draft.idempotencyKey]: the same
  /// key returns the original event; a changed payload under it raises
  /// idempotency_intent_mismatch.
  Future<String> createEventBudget(EventDraft draft) async {
    final id = await _api.rpc('create_event_budget', {
      'p_name': draft.name,
      'p_start_date': draft.startDate,
      'p_end_date': draft.endDate,
      'p_limit_minor': draft.limitMinor,
      'p_category_ids': draft.categoryIds,
      'p_idempotency_key': draft.idempotencyKey,
    });
    return id as String;
  }

  /// POST /rpc/update_event_budget — whole-row edit with the scope set
  /// replaced atomically. [expectedUpdatedAt] pins the read the edit
  /// was built on; a changed row upstream raises stale_write instead of
  /// silently winning.
  Future<void> updateEventBudget({
    required String eventId,
    required EventDraft draft,
    String? expectedUpdatedAt,
  }) async {
    final ok = await _api.rpc('update_event_budget', {
      'p_event_id': eventId,
      'p_name': draft.name,
      'p_start_date': draft.startDate,
      'p_end_date': draft.endDate,
      'p_limit_minor': draft.limitMinor,
      'p_category_ids': draft.categoryIds,
      'p_expected_updated_at': expectedUpdatedAt,
    });
    if (ok != true) throw Exception('event_not_found');
  }

  /// POST /rpc/soft_delete_event_budget — tombstone only; the ledger
  /// rows that fed spent stay untouched (an event delete must never
  /// erase money facts).
  Future<void> deleteEventBudget(String eventId) async {
    final ok = await _api.rpc('soft_delete_event_budget', {
      'p_event_id': eventId,
    });
    if (ok != true) throw Exception('event_not_found');
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

/// One idempotency key per logical write, held across retries — the
/// recurring-ops counterpart of CapturePage's per-form key. A retry
/// after a lost response replays the SAME key, so the server dedupe
/// fires instead of double-writing.
///
/// Lifecycle: mint on first attempt with [keyFor], keep until the
/// operation resolves, then [release]. A later, deliberately-new user
/// action (e.g. undo → pay again) is a new intent and must mint a fresh
/// key — reusing the old one would collide with the soft-deleted row
/// that still carries it.
class OperationIdempotencyKeys {
  final _keys = <String, String>{};

  /// The stable key for [scope] — a caller-supplied logical-operation
  /// identity like `'pay_commitment:<id>:2026-10-01'`.
  String keyFor(String scope) => _keys[scope] ??= newIdempotencyKey();

  /// Drop the key once the operation completed — success or a final
  /// refusal; the next user action on this scope is a new intent.
  void release(String scope) => _keys.remove(scope);
}
