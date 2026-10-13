import 'package:flutter/material.dart';

import '../../domain/budget.dart';
import '../../domain/commitments.dart';
import '../../domain/goal_projection.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/report.dart' show ymd;
import 'recurring_form_dialog.dart';

// planningErrorMessage moved to recurring_form_dialog.dart — the shared
// recurring-form file owns the RPC-error wording so the dashboard's
// prefill path speaks the same language. Re-exported for the tests and
// callers that referenced it here.
export 'recurring_form_dialog.dart' show planningErrorMessage;

/// Everything the planning surface needs in one load — keeps the page
/// identical for demo seeds and the Neon store.
class PlanningData {
  const PlanningData({
    required this.budgets,
    required this.commitments,
    required this.goals,
    required this.accounts,
    required this.categories,
    required this.monthStart,
    this.incomeTemplates = const [],
    this.priorBudgets = const [],
    this.budgetSuggestionRows = const [],
  });

  final List<BudgetProgress> budgets;
  final List<RecurringIncome> incomeTemplates;
  final List<RecurringCommitment> commitments;
  final List<SavingsGoal> goals;
  final List<AccountSummary> accounts;
  final List<Category> categories;
  final String monthStart; // YYYY-MM-01

  /// Budget rows from months inside the rollover window before
  /// [monthStart] — the `budget_progress` range read the web workspace
  /// makes. Feeds both the per-card carry ("Chuyển từ tháng trước") and
  /// the quick-fill "Dùng hạn mức tháng trước" action.
  final List<BudgetProgress> priorBudgets;

  /// Trailing expense ledger rows covering the suggestion window (the
  /// three completed months before [monthStart]) — the web's
  /// `budgetSuggestions` input. Empty means the quick-fill average action
  /// honestly has nothing to propose.
  final List<Transaction> budgetSuggestionRows;
}

/// Write surface — each maps 1:1 to a Data API RPC (or a demo no-op).
/// Every `on*Save` follows the capture edit-mode convention: a null
/// `editing` creates, a row updates in place — the implementation hands
/// `editing.updatedAt` back as `expected_updated_at` where the RPC
/// accepts it, so a stale read fails honestly instead of winning.
class PlanningActions {
  const PlanningActions({
    required this.onBudgetSave,
    required this.onBudgetDelete,
    this.onBudgetFill,
    required this.onCommitmentSave,
    required this.onCommitmentPay,
    required this.onCommitmentUndo,
    required this.onCommitmentArchived,
    required this.onGoalSave,
    required this.onGoalAdjust,
    required this.onGoalArchived,
    this.onIncomeSave,
    this.onIncomeReceive,
    this.onIncomeUndo,
    this.onIncomeArchived,
  });

  /// Recurring-income writes — null (demo) hides the section's actions.
  final Future<void> Function(
    RecurringIncome? editing,
    String name,
    int amountMinor,
    int dueDay,
    String accountId,
    String categoryId,
  )?
  onIncomeSave;
  final Future<void> Function(RecurringIncome income)? onIncomeReceive;
  final Future<void> Function(RecurringIncome income)? onIncomeUndo;
  final Future<void> Function(String templateId, bool archived)?
  onIncomeArchived;

  /// Category is create-only (the web locks it on edit) — an edit re-sends
  /// the same category with the new limit.
  final Future<void> Function(
    BudgetProgress? editing,
    String categoryId,
    int limitMinor,
  )
  onBudgetSave;
  final Future<void> Function(String budgetId) onBudgetDelete;

  /// Bulk-fill writes ("Điền nhanh") — each draft lands through the same
  /// `upsert_monthly_budget` RPC a manual save uses. Null (demo) hides the
  /// affordance entirely. Returns how many drafts actually wrote so the
  /// page can report a partial apply honestly.
  final Future<int> Function(List<BudgetDraft> drafts)? onBudgetFill;
  final Future<void> Function(
    RecurringCommitment? editing,
    String name,
    int amountMinor,
    int dueDay,
    String accountId,
    String categoryId,
  )
  onCommitmentSave;
  final Future<void> Function(RecurringCommitment c) onCommitmentPay;
  final Future<void> Function(RecurringCommitment c) onCommitmentUndo;

  /// archived=true hides the row; false restores it — one RPC both ways.
  final Future<void> Function(String commitmentId, bool archived)
  onCommitmentArchived;
  final Future<void> Function(
    SavingsGoal? editing,
    String name,
    int targetMinor,
    String? deadline,
  )
  onGoalSave;

  /// Signed minor units: positive deposits, negative withdraws.
  final Future<void> Function(String goalId, int amountMinor) onGoalAdjust;
  final Future<void> Function(String goalId, bool archived) onGoalArchived;
}

/// Budgets + commitments + savings goals — the planning surfaces of
/// src/components/dashboard/dashboard-planning-sections.tsx.
class PlanningPage extends StatefulWidget {
  const PlanningPage({
    super.key,
    required this.loadData,
    required this.actions,
  });

  final Future<PlanningData> Function() loadData;
  final PlanningActions actions;

  @override
  State<PlanningPage> createState() => PlanningPageState();
}

class PlanningPageState extends State<PlanningPage> {
  late Future<PlanningData> _data;

  @override
  void initState() {
    super.initState();
    _data = widget.loadData();
  }

  Future<void> _refresh() async {
    setState(() {
      _data = widget.loadData();
    });
    try {
      await _data;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  /// Public reload for the nav shell after a capture save.
  void reload() => _refresh();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kế hoạch')),
      body: FutureBuilder(
        future: _data,
        builder: (context, snap) {
          // hasError first — a failed future also has no data, so the
          // spinner branch would swallow it. Raw exception text is never
          // rendered; the shared "Không tải được …" copy stands in.
          if (snap.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Không tải được kế hoạch'),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Kiểm tra kết nối mạng rồi thử lại.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _refresh,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final d = snap.data!;
          final today = ymd(DateTime.now());
          // Active vs archived split — the web lists archived rows behind
          // a "Đã lưu trữ (N)" toggle; mobile collapses them in place.
          final activeIncome = d.incomeTemplates
              .where((i) => !i.isArchived)
              .toList();
          final archivedIncome = d.incomeTemplates
              .where((i) => i.isArchived)
              .toList();
          // Feed order: overdue → due-today → upcoming → paid (the
          // "Đã trả khác" flag sorts first among paid rows).
          final activeCommitments = sortCommitmentsForFeed(
            d.commitments.where((c) => !c.isArchived).toList(),
            monthStart: d.monthStart,
            today: today,
          );
          final archivedCommitments = d.commitments
              .where((c) => c.isArchived)
              .toList();
          final activeGoals = d.goals.where((g) => !g.isArchived).toList();
          final archivedGoals = d.goals.where((g) => g.isArchived).toList();
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _SectionHeader(
                  title: 'Ngân sách tháng',
                  onAdd:
                      d.categories.any((c) => c.kind == TransactionKind.expense)
                      ? () => _showBudgetForm(d)
                      : null,
                  onQuickFill: widget.actions.onBudgetFill == null
                      ? null
                      : () => _showQuickFill(d),
                ),
                if (d.budgets.isEmpty) _empty('Chưa có ngân sách nào'),
                for (final b in d.budgets)
                  _BudgetTile(
                    budget: b,
                    priorBudgets: d.priorBudgets,
                    onEdit: () => _showBudgetForm(d, editing: b),
                    onDelete: () => _deleteBudget(b),
                  ),
                if (widget.actions.onIncomeSave != null ||
                    d.incomeTemplates.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionHeader(
                    title: 'Thu nhập định kỳ',
                    onAdd: widget.actions.onIncomeSave == null
                        ? null
                        : () => _showIncomeForm(d),
                  ),
                  if (activeIncome.isEmpty)
                    _empty('Chưa có khoản thu định kỳ nào'),
                  for (final i in activeIncome)
                    _IncomeTile(
                      income: i,
                      onEdit: widget.actions.onIncomeSave == null
                          ? null
                          : () => _showIncomeForm(d, editing: i),
                      onReceive: widget.actions.onIncomeReceive == null
                          ? null
                          : () => _receiveIncome(i),
                      onUndo: widget.actions.onIncomeUndo == null
                          ? null
                          : () => _undoIncome(i),
                      onArchive: widget.actions.onIncomeArchived == null
                          ? null
                          : () => _archiveIncome(i),
                    ),
                  if (archivedIncome.isNotEmpty &&
                      widget.actions.onIncomeArchived != null)
                    _ArchivedSection(
                      count: archivedIncome.length,
                      tiles: [
                        for (final i in archivedIncome)
                          _archivedTile(
                            i.name,
                            '${i.categoryName} · ${i.accountName} · '
                            'ngày ${i.dueDay} · ${formatMoney(i.amountMinor)}',
                            () => _restoreIncome(i),
                          ),
                      ],
                    ),
                ],
                const SizedBox(height: 20),
                _SectionHeader(
                  title: 'Cam kết hàng tháng',
                  onAdd: () => _showCommitmentForm(d),
                ),
                if (activeCommitments.isEmpty) _empty('Chưa có cam kết nào'),
                for (final c in activeCommitments)
                  _CommitmentTile(
                    commitment: c,
                    monthStart: d.monthStart,
                    today: today,
                    onEdit: () => _showCommitmentForm(d, editing: c),
                    onPay: c.paidThisMonth ? null : () => _payCommitment(c),
                    onUndo: c.paidThisMonth ? () => _undoCommitment(c) : null,
                    onArchive: () => _archiveCommitment(c),
                  ),
                if (archivedCommitments.isNotEmpty)
                  _ArchivedSection(
                    count: archivedCommitments.length,
                    tiles: [
                      for (final c in archivedCommitments)
                        _archivedTile(
                          c.name,
                          '${c.categoryName} · ${c.accountName} · '
                          'ngày ${c.dueDay} · ${formatMoney(c.amountMinor)}',
                          () => _restoreCommitment(c),
                        ),
                    ],
                  ),
                const SizedBox(height: 20),
                _SectionHeader(
                  title: 'Mục tiêu tiết kiệm',
                  onAdd: () => _showGoalForm(),
                ),
                if (activeGoals.isEmpty) _empty('Chưa có mục tiêu nào'),
                for (final g in activeGoals)
                  _GoalTile(
                    goal: g,
                    onEdit: () => _showGoalForm(editing: g),
                    onDeposit: () => _adjustGoal(g, withdraw: false),
                    onWithdraw: g.allocatedMinor > 0
                        ? () => _adjustGoal(g, withdraw: true)
                        : null,
                    onArchive: () => _archiveGoal(g),
                  ),
                if (archivedGoals.isNotEmpty)
                  _ArchivedSection(
                    count: archivedGoals.length,
                    tiles: [
                      for (final g in archivedGoals)
                        _archivedTile(
                          g.name,
                          '${formatMoney(g.targetMinor)} mục tiêu',
                          () => _restoreGoal(g),
                        ),
                    ],
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _empty(String text) => Card(child: ListTile(title: Text(text)));

  /// A read-only archived row inside the collapsed "Đã lưu trữ" groups —
  /// restore is the only action the web offers on archived rows.
  Widget _archivedTile(String title, String subtitle, VoidCallback onRestore) =>
      Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          title: Text(title),
          subtitle: Text(subtitle),
          trailing: TextButton(
            onPressed: onRestore,
            child: const Text('Khôi phục'),
          ),
        ),
      );

  /// Runs a row action with an honest snackbar on failure, then refreshes
  /// either way — a failure usually means the local row state was stale.
  Future<void> _guarded(
    Future<void> Function() action, {
    required String fallback,
  }) async {
    try {
      await action();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(planningErrorMessage(e, fallback: fallback))),
        );
      }
    }
    _refresh();
  }

  // -- Budgets -------------------------------------------------------------

  /// Create ([editing] null) or edit a budget limit. The category picker
  /// locks on edit — the web dialog does the same because the upsert's
  /// conflict target is (category, month), not the row id.
  Future<void> _showBudgetForm(
    PlanningData d, {
    BudgetProgress? editing,
  }) async {
    final expenseCats = d.categories
        .where((c) => c.kind == TransactionKind.expense)
        .toList();
    Category? cat = expenseCats.firstOrNull;
    final limit = TextEditingController(
      text: editing == null ? '' : '${editing.limitMinor}',
    );
    String? error;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(editing == null ? 'Ngân sách mới' : 'Sửa ngân sách'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (editing == null)
                  DropdownButtonFormField<Category>(
                    initialValue: cat,
                    decoration: const InputDecoration(
                      labelText: 'Danh mục',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      for (final c in expenseCats)
                        DropdownMenuItem(value: c, child: Text(c.name)),
                    ],
                    onChanged: (v) => setDlg(() => cat = v ?? cat),
                  )
                else
                  InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Danh mục',
                      border: OutlineInputBorder(),
                    ),
                    child: Text(editing.categoryName),
                  ),
                const SizedBox(height: 12),
                TextField(
                  controller: limit,
                  decoration: const InputDecoration(
                    labelText: 'Hạn mức',
                    hintText: 'vd: 2tr',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    error!,
                    style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () async {
                final amount = parseMoneyInput(limit.text);
                final categoryId = editing?.categoryId ?? cat?.id;
                if (categoryId == null || amount == null || amount <= 0) {
                  return;
                }
                try {
                  await widget.actions.onBudgetSave(
                    editing,
                    categoryId,
                    amount,
                  );
                } catch (e) {
                  setDlg(
                    () => error = planningErrorMessage(
                      e,
                      fallback: 'Không lưu được — thử lại',
                    ),
                  );
                  return;
                }
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: Text(editing == null ? 'Tạo' : 'Lưu'),
            ),
          ],
        ),
      ),
    );
    if (ok == true) _refresh();
  }

  Future<void> _deleteBudget(BudgetProgress b) async {
    final ok = await _confirm('Xóa ngân sách "${b.categoryName}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onBudgetDelete(b.id),
        fallback: 'Không xóa được — thử lại',
      );
    }
  }

  // -- Quick-fill budgets -----------------------------------------------------

  /// The two bulk-fill sources, recomputed from the live load — like the
  /// web's `carryable`/`suggestionRows` useMemos, so a row written
  /// mid-session immediately drops out of both lists.
  List<BudgetDraft> _carryableDrafts(PlanningData d) {
    final prevMonth = shiftBudgetMonth(d.monthStart, -1);
    return budgetsToCarryForward(
      previousBudgets: d.priorBudgets
          .where((b) => b.monthStart == prevMonth)
          .toList(),
      currentBudgets: d.budgets,
      monthStart: d.monthStart,
    );
  }

  /// Suggested limits for expense categories that have no budget this
  /// month — the web's `budgetSuggestions` over the trailing 3 completed
  /// months, restricted to categories that still exist.
  List<({Category category, BudgetSuggestion suggestion})> _suggestionDrafts(
    PlanningData d,
  ) {
    final suggestions = budgetSuggestions(d.budgetSuggestionRows, d.monthStart);
    final budgeted = {for (final b in d.budgets) b.categoryId};
    return [
      for (final c in d.categories)
        if (c.kind == TransactionKind.expense &&
            !c.isArchived &&
            !budgeted.contains(c.id) &&
            suggestions.containsKey(c.id))
          (category: c, suggestion: suggestions[c.id]!),
    ];
  }

  /// "Điền nhanh" sheet — the YNAB auto-assign analog. Both actions are
  /// honest about their inputs: a count when something is fillable, a
  /// muted explanation when there is nothing to propose.
  Future<void> _showQuickFill(PlanningData d) async {
    final carryable = _carryableDrafts(d);
    final suggestions = _suggestionDrafts(d);
    final prevMonthLabel = _monthLabel(shiftBudgetMonth(d.monthStart, -1));
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.history),
              title: const Text('Dùng hạn mức tháng trước'),
              subtitle: Text(
                carryable.isEmpty
                    ? 'Không có hạn mức $prevMonthLabel chưa áp dụng'
                    : 'Áp dụng ${carryable.length} hạn mức của '
                          '$prevMonthLabel',
              ),
              enabled: carryable.isNotEmpty,
              onTap: () {
                Navigator.pop(ctx);
                _applyDrafts(carryable, source: prevMonthLabel);
              },
            ),
            ListTile(
              leading: const Icon(Icons.auto_graph),
              title: const Text('Điền theo trung bình 3 tháng chi'),
              subtitle: Text(
                suggestions.isEmpty
                    ? 'Chưa có danh mục nào đủ chi tiêu 3 tháng để gợi ý'
                    : '${suggestions.length} gợi ý — xem lại trước khi điền',
              ),
              enabled: suggestions.isNotEmpty,
              onTap: () {
                Navigator.pop(ctx);
                _reviewSuggestions(d, suggestions);
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Review sheet for the average-fill proposals — per-item checkboxes
  /// BEFORE anything writes (never silent). Unchecking a row simply keeps
  /// the category unbudgeted.
  Future<void> _reviewSuggestions(
    PlanningData d,
    List<({Category category, BudgetSuggestion suggestion})> rows,
  ) async {
    final checked = {for (final r in rows) r.category.id};
    final applied = await showModalBottomSheet<List<BudgetDraft>>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 4),
                child: Text(
                  'Gợi ý hạn mức',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Trung bình 3 tháng chi gần nhất, tính riêng từng danh mục '
                  '— tháng không chi vẫn tính vào trung bình.',
                ),
              ),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final r in rows)
                      CheckboxListTile(
                        value: checked.contains(r.category.id),
                        onChanged: (v) => setSheet(
                          () => v == true
                              ? checked.add(r.category.id)
                              : checked.remove(r.category.id),
                        ),
                        title: Text(r.category.name),
                        subtitle: Text(
                          'Có chi ${r.suggestion.monthsWithData}/'
                          '$budgetSuggestionMonths tháng gần nhất',
                        ),
                        secondary: Text(formatMoney(r.suggestion.amount)),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Hủy'),
                    ),
                    const Spacer(),
                    FilledButton(
                      onPressed: checked.isEmpty
                          ? null
                          : () => Navigator.pop(ctx, [
                              for (final r in rows)
                                if (checked.contains(r.category.id))
                                  (
                                    categoryId: r.category.id,
                                    monthStart: d.monthStart,
                                    limitMinor: r.suggestion.amount,
                                  ),
                            ]),
                      child: Text('Áp dụng (${checked.length})'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (applied == null || applied.isEmpty) return;
    await _applyDrafts(applied, source: 'gợi ý');
  }

  /// Writes the drafts through [PlanningActions.onBudgetFill] — each row
  /// lands on the same `upsert_monthly_budget` RPC a manual save uses, so
  /// there is one write path, no silent second channel. A failed row is
  /// counted and reported rather than rolled back (plans, not ledger
  /// facts — matching the web's carryForwardBudgetsAction).
  Future<void> _applyDrafts(
    List<BudgetDraft> drafts, {
    required String source,
  }) async {
    final fill = widget.actions.onBudgetFill;
    if (fill == null || drafts.isEmpty) return;
    var applied = 0;
    try {
      applied = await fill(drafts);
    } catch (_) {
      // A transport-level failure lands as 0/N below — honest, and the
      // refresh re-reads whatever did get written.
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            applied == drafts.length
                ? 'Đã điền $applied hạn mức từ $source'
                : 'Đã điền $applied/${drafts.length} hạn mức từ $source — '
                      'phần còn lại chưa lưu được',
          ),
        ),
      );
    }
    _refresh();
  }

  /// "tháng M/YYYY" — the label style the web's `formatMonthLabel` uses.
  static String _monthLabel(String monthStart) =>
      'tháng ${int.parse(monthStart.substring(5, 7))}/'
      '${monthStart.substring(0, 4)}';

  // -- Commitments + recurring income ---------------------------------------

  Future<void> _showCommitmentForm(
    PlanningData d, {
    RecurringCommitment? editing,
  }) => _showRecurringForm(d, income: false, commitment: editing);

  Future<void> _showIncomeForm(PlanningData d, {RecurringIncome? editing}) =>
      _showRecurringForm(d, income: true, template: editing);

  /// One dialog for both recurring shapes — a monthly commitment
  /// (expense categories, "Tài khoản trả") or recurring income such as
  /// salary (income categories, "Tài khoản nhận"). The form itself lives
  /// in recurring_form_dialog.dart, shared with the dashboard's detected
  /// suggestion card; this wrapper only binds the right save action.
  Future<void> _showRecurringForm(
    PlanningData d, {
    required bool income,
    RecurringCommitment? commitment,
    RecurringIncome? template,
  }) async {
    final ok = await showRecurringFormDialog(
      context,
      accounts: d.accounts,
      categories: d.categories,
      income: income,
      commitment: commitment,
      template: template,
      onSave: (name, amount, day, accountId, categoryId) => income
          ? widget.actions.onIncomeSave!(
              template,
              name,
              amount,
              day,
              accountId,
              categoryId,
            )
          : widget.actions.onCommitmentSave(
              commitment,
              name,
              amount,
              day,
              accountId,
              categoryId,
            ),
    );
    if (ok) _refresh();
  }

  Future<void> _payCommitment(RecurringCommitment c) async {
    final ok = await _confirm(
      'Trả "${c.name}" — ${formatMoney(c.amountMinor)}?',
    );
    if (ok) {
      await _guarded(
        () => widget.actions.onCommitmentPay(c),
        fallback: 'Không ghi được thanh toán — thử lại',
      );
    }
  }

  Future<void> _undoCommitment(RecurringCommitment c) async {
    final ok = await _confirm(
      'Hoàn tác khoản trả "${c.name}" tháng này? Giao dịch sẽ vào Thùng rác.',
    );
    if (ok) {
      await _guarded(
        () => widget.actions.onCommitmentUndo(c),
        fallback: 'Không hoàn tác được — thử lại',
      );
    }
  }

  Future<void> _archiveCommitment(RecurringCommitment c) async {
    final ok = await _confirm('Lưu trữ "${c.name}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onCommitmentArchived(c.id, true),
        fallback: 'Không lưu trữ được — thử lại',
      );
    }
  }

  Future<void> _restoreCommitment(RecurringCommitment c) async {
    final ok = await _confirm('Khôi phục "${c.name}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onCommitmentArchived(c.id, false),
        fallback: 'Không khôi phục được — thử lại',
      );
    }
  }

  // -- Recurring income ----------------------------------------------------

  Future<void> _receiveIncome(RecurringIncome i) async {
    final ok = await _confirm(
      'Ghi nhận "${i.name}" — ${formatMoney(i.amountMinor)} vào ${i.accountName}?',
    );
    if (ok) {
      await _guarded(
        () => widget.actions.onIncomeReceive!(i),
        fallback: 'Không ghi được khoản thu — thử lại',
      );
    }
  }

  Future<void> _undoIncome(RecurringIncome i) async {
    final ok = await _confirm(
      'Hoàn tác khoản nhận "${i.name}" tháng này? Giao dịch sẽ vào Thùng rác.',
    );
    if (ok) {
      await _guarded(
        () => widget.actions.onIncomeUndo!(i),
        fallback: 'Không hoàn tác được — thử lại',
      );
    }
  }

  Future<void> _archiveIncome(RecurringIncome i) async {
    final ok = await _confirm('Lưu trữ "${i.name}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onIncomeArchived!(i.id, true),
        fallback: 'Không lưu trữ được — thử lại',
      );
    }
  }

  Future<void> _restoreIncome(RecurringIncome i) async {
    final ok = await _confirm('Khôi phục "${i.name}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onIncomeArchived!(i.id, false),
        fallback: 'Không khôi phục được — thử lại',
      );
    }
  }

  // -- Goals ---------------------------------------------------------------

  /// Create ([editing] null) or edit a goal. The deadline field is
  /// edit-only: the create flow deliberately stays minimal — deadlines
  /// can be added afterwards like the web's date input.
  Future<void> _showGoalForm({SavingsGoal? editing}) async {
    final name = TextEditingController(text: editing?.name ?? '');
    final target = TextEditingController(
      text: editing == null ? '' : '${editing.targetMinor}',
    );
    String? deadline = editing?.deadline;
    String? error;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(editing == null ? 'Mục tiêu mới' : 'Sửa mục tiêu'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(
                    labelText: 'Tên mục tiêu',
                    hintText: 'vd: Quỹ khẩn cấp',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: target,
                  decoration: const InputDecoration(
                    labelText: 'Số tiền mục tiêu',
                    hintText: 'vd: 10tr',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (editing != null) ...[
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () async {
                      final picked = await _pickDeadline(ctx, deadline);
                      if (picked != null) setDlg(() => deadline = picked);
                    },
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Ngày muốn hoàn thành',
                        border: const OutlineInputBorder(),
                        suffixIcon: deadline == null
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.clear),
                                tooltip: 'Xóa thời hạn',
                                onPressed: () => setDlg(() => deadline = null),
                              ),
                      ),
                      child: Text(deadline ?? 'Không đặt thời hạn'),
                    ),
                  ),
                ],
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    error!,
                    style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () async {
                final n = name.text.trim();
                final t = parseMoneyInput(target.text);
                if (n.isEmpty || t == null || t <= 0) return;
                // Same guard the web dialog applies: the target can never
                // drop below money already allocated to the goal.
                if (editing != null && t < editing.allocatedMinor) {
                  setDlg(
                    () => error = 'Mức đích không được thấp hơn tiền đã dành',
                  );
                  return;
                }
                try {
                  await widget.actions.onGoalSave(editing, n, t, deadline);
                } catch (e) {
                  setDlg(
                    () => error = planningErrorMessage(
                      e,
                      fallback: 'Không lưu được — thử lại',
                    ),
                  );
                  return;
                }
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: Text(editing == null ? 'Tạo' : 'Lưu'),
            ),
          ],
        ),
      ),
    );
    if (ok == true) _refresh();
  }

  /// Date picker for the goal deadline — the web allows any date at or
  /// after today, keeping a past stored deadline selectable.
  Future<String?> _pickDeadline(BuildContext ctx, String? current) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final stored = current == null ? null : DateTime.tryParse(current);
    final picked = await showDatePicker(
      context: ctx,
      initialDate: stored ?? today,
      firstDate: stored != null && stored.isBefore(today) ? stored : today,
      // The web input is unbounded; a generous cap keeps the picker sane.
      lastDate: DateTime(today.year + 80),
    );
    if (picked == null) return null;
    return '${picked.year}-${picked.month.toString().padLeft(2, '0')}-'
        '${picked.day.toString().padLeft(2, '0')}';
  }

  /// Deposit ([withdraw] false) or withdraw against a goal — the web's
  /// two-mode allocation dialog. The server guards are mirrored
  /// client-side so the honest message shows before the roundtrip.
  Future<void> _adjustGoal(SavingsGoal g, {required bool withdraw}) async {
    final amount = TextEditingController();
    String? error;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(
            withdraw ? 'Rút khỏi "${g.name}"' : 'Nạp vào "${g.name}"',
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: amount,
                  decoration: InputDecoration(
                    labelText: 'Số tiền',
                    hintText: 'vd: 500k',
                    helperText: withdraw
                        ? 'Đã dành ${formatMoney(g.allocatedMinor)}'
                        : 'Còn thiếu '
                              '${formatMoney(g.targetMinor - g.allocatedMinor)}',
                    border: const OutlineInputBorder(),
                  ),
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    error!,
                    style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () async {
                final a = parseMoneyInput(amount.text);
                if (a == null || a <= 0) return;
                if (withdraw && a > g.allocatedMinor) {
                  setDlg(() => error = 'Không thể rút quá số tiền đã dành');
                  return;
                }
                if (!withdraw && a > g.targetMinor - g.allocatedMinor) {
                  setDlg(
                    () => error = 'Số tiền vượt phần còn thiếu của mục tiêu',
                  );
                  return;
                }
                try {
                  await widget.actions.onGoalAdjust(g.id, withdraw ? -a : a);
                } catch (e) {
                  setDlg(
                    () => error = planningErrorMessage(
                      e,
                      fallback: 'Không điều chỉnh được — thử lại',
                    ),
                  );
                  return;
                }
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: Text(withdraw ? 'Rút' : 'Nạp'),
            ),
          ],
        ),
      ),
    );
    if (ok == true) _refresh();
  }

  /// The server refuses to archive a goal that still holds allocated
  /// money — the web blocks the confirm the same way client-side.
  Future<void> _archiveGoal(SavingsGoal g) async {
    if (g.allocatedMinor > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Hãy rút hết tiền đã dành trước khi lưu trữ'),
        ),
      );
      return;
    }
    final ok = await _confirm('Lưu trữ "${g.name}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onGoalArchived(g.id, true),
        fallback: 'Không lưu trữ được — thử lại',
      );
    }
  }

  Future<void> _restoreGoal(SavingsGoal g) async {
    final ok = await _confirm('Khôi phục "${g.name}"?');
    if (ok) {
      await _guarded(
        () => widget.actions.onGoalArchived(g.id, false),
        fallback: 'Không khôi phục được — thử lại',
      );
    }
  }

  Future<bool> _confirm(String message) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đồng ý'),
          ),
        ],
      ),
    );
    return ok == true;
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onAdd, this.onQuickFill});

  final String title;
  final VoidCallback? onAdd;

  /// Bulk-fill affordance — the budgets section's "Điền nhanh" entry.
  final VoidCallback? onQuickFill;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        if (onQuickFill != null)
          IconButton(
            icon: const Icon(Icons.bolt_outlined),
            tooltip: 'Điền nhanh',
            onPressed: onQuickFill,
          ),
        if (onAdd != null)
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: onAdd,
          ),
      ],
    );
  }
}

/// Collapsed "Đã lưu trữ (N)" group — the web's archived-view toggle as
/// an in-place expandable section.
class _ArchivedSection extends StatelessWidget {
  const _ArchivedSection({required this.count, required this.tiles});

  final int count;
  final List<Widget> tiles;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(title: Text('Đã lưu trữ ($count)'), children: tiles),
    );
  }
}

class _BudgetTile extends StatelessWidget {
  const _BudgetTile({
    required this.budget,
    required this.onEdit,
    required this.onDelete,
    this.priorBudgets = const [],
  });

  final BudgetProgress budget;

  /// Prior-month rows inside the rollover window — empty keeps the card
  /// on the this-month-only figures it always showed.
  final List<BudgetProgress> priorBudgets;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    // The carry folds prior under/overspend into this month's effective
    // limit — the web's budgetEffective* chain, integer đồng throughout.
    final rollover = budgetRollover(
      priorBudgets: priorBudgets,
      categoryId: budget.categoryId,
      monthStart: budget.monthStart,
    );
    final effectiveLimit = budgetEffectiveLimit(
      budget.limitMinor,
      rollover.carry,
    );
    final available = budgetEffectiveAvailable(
      spentMinor: budget.spentMinor,
      limitMinor: budget.limitMinor,
      carry: rollover.carry,
    );
    final state = budgetEffectiveState(
      spentMinor: budget.spentMinor,
      limitMinor: budget.limitMinor,
      carry: rollover.carry,
    );
    final ratio = effectiveLimit <= 0
        ? (available < 0 ? 1.0 : 0.0)
        : (budget.spentMinor / effectiveLimit).clamp(0.0, 1.0);
    final pace = monthPace(budget.monthStart, DateTime.now());
    final (status, color) = switch (state) {
      BudgetState.over => (
        'Vượt ${formatMoney(available.abs())}',
        Colors.red.shade700,
      ),
      BudgetState.nearLimit => (
        'Sắp tới hạn mức · còn ${formatMoney(available)}',
        Colors.orange.shade800,
      ),
      BudgetState.ok => (
        'Còn lại ${formatMoney(available)}',
        Colors.green.shade700,
      ),
    };
    final rolloverLine = budgetRolloverLabel(rollover, formatMoney);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(budget.categoryName),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _PaceBar(ratio: ratio, pace: pace, color: color),
            const SizedBox(height: 4),
            Text(
              '${formatMoney(budget.spentMinor)} / '
              '${formatMoney(budget.limitMinor)} · $status',
              style: TextStyle(color: color),
            ),
            if (rolloverLine != null)
              Text(rolloverLine, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        onTap: onEdit,
        onLongPress: onDelete,
      ),
    );
  }
}

/// Budget progress bar with a "Hôm nay" pace tick — the vertical marker
/// shows where today falls in the month, so spend vs time elapsed is
/// readable at a glance (Bluecoins pattern).
class _PaceBar extends StatelessWidget {
  const _PaceBar({required this.ratio, required this.pace, this.color});

  final double ratio;
  final double pace;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return LayoutBuilder(
      builder: (context, c) => Semantics(
        label: 'Đã chi ${(ratio * 100).round()}% ngân sách',
        child: SizedBox(
          height: 14,
          child: Stack(
            alignment: Alignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: ratio,
                  minHeight: 6,
                  color: color ?? scheme.primary,
                  backgroundColor: scheme.surfaceContainerHighest,
                ),
              ),
              Positioned(
                left: (pace * c.maxWidth).clamp(0.0, c.maxWidth - 2),
                child: Container(width: 2, height: 14, color: scheme.outline),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CommitmentTile extends StatelessWidget {
  const _CommitmentTile({
    required this.commitment,
    required this.monthStart,
    required this.today,
    required this.onEdit,
    required this.onPay,
    required this.onUndo,
    required this.onArchive,
  });

  final RecurringCommitment commitment;
  final String monthStart;
  final String today; // YYYY-MM-DD
  final VoidCallback onEdit;
  final VoidCallback? onPay;
  final VoidCallback? onUndo;
  final VoidCallback onArchive;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final status = commitmentStatus(
      commitment,
      monthStart: monthStart,
      today: today,
    );
    final statusColor = switch (status) {
      CommitmentStatus.overdue => Colors.red.shade700,
      CommitmentStatus.dueToday => Colors.orange.shade800,
      CommitmentStatus.upcoming => scheme.onSurfaceVariant,
      CommitmentStatus.paidDifferent => Colors.blue.shade700,
      CommitmentStatus.paid => Colors.green.shade700,
    };
    // A plain "Đã trả" needs no extra line — the trailing undo button
    // already says it. Every other state names itself in text so the
    // color is never the only signal.
    final statusLine = status == CommitmentStatus.paid
        ? null
        : commitmentStatusLabel(
            status,
            monthStart: monthStart,
            today: today,
            dueDay: commitment.dueDay,
            paidAmountMinor: commitment.paidAmountMinor,
            format: formatMoney,
          );
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(commitment.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${commitment.categoryName} · ${commitment.accountName} · '
              'ngày ${commitment.dueDay}'
              ' · ${formatMoney(commitment.amountMinor)}',
            ),
            if (statusLine != null)
              Text(statusLine, style: TextStyle(color: statusColor)),
          ],
        ),
        // "Đã trả" is tappable like the income tile's "Đã nhận" — it
        // undoes this month's payment (the web's Hoàn tác thanh toán).
        // A "khác số tiền" row undoes the same way.
        trailing: commitment.paidThisMonth
            ? TextButton(onPressed: onUndo, child: const Text('Đã trả'))
            : TextButton(onPressed: onPay, child: const Text('Trả')),
        onTap: onEdit,
        onLongPress: onArchive,
      ),
    );
  }
}

class _IncomeTile extends StatelessWidget {
  const _IncomeTile({
    required this.income,
    required this.onEdit,
    required this.onReceive,
    required this.onUndo,
    required this.onArchive,
  });

  final RecurringIncome income;
  final VoidCallback? onEdit;
  final VoidCallback? onReceive;
  final VoidCallback? onUndo;
  final VoidCallback? onArchive;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(income.name),
        subtitle: Text(
          '${income.categoryName} · ${income.accountName} · ngày ${income.dueDay}'
          ' · ${formatMoney(income.amountMinor)}',
        ),
        trailing: income.receivedThisMonth
            ? TextButton(onPressed: onUndo, child: const Text('Đã nhận'))
            : TextButton(onPressed: onReceive, child: const Text('Nhận')),
        onTap: onEdit,
        onLongPress: onArchive,
      ),
    );
  }
}

class _GoalTile extends StatelessWidget {
  const _GoalTile({
    required this.goal,
    required this.onEdit,
    required this.onDeposit,
    required this.onWithdraw,
    required this.onArchive,
  });

  final SavingsGoal goal;
  final VoidCallback onEdit;
  final VoidCallback onDeposit;

  /// Null when nothing is allocated — the web disables release at 0 too.
  final VoidCallback? onWithdraw;
  final VoidCallback onArchive;

  @override
  Widget build(BuildContext context) {
    final pct = (goal.progress * 100).round();
    // On-track projection at the observed pace: allocated ÷ elapsed since
    // the stored created_at is the only honest rate the schema offers —
    // a goal with no readable span gets "chưa đủ dữ liệu", not a guess.
    final today = DateTime.now();
    final projection = projectGoalCompletion(
      targetMinor: goal.targetMinor,
      contributedMinor: goal.allocatedMinor,
      deadline: goal.deadline,
      monthlyRateMinor: estimateGoalMonthlyRate(
        contributedMinor: goal.allocatedMinor,
        createdAt: goal.createdAt,
        today: today,
      ),
      today: today,
    );
    final scheme = Theme.of(context).colorScheme;
    final projectionColor = switch (projection.status) {
      GoalProjectionStatus.atRisk => scheme.error,
      GoalProjectionStatus.noRate => scheme.onSurfaceVariant,
      _ => null,
    };
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(goal.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LinearProgressIndicator(value: goal.progress.clamp(0.0, 1.0)),
            const SizedBox(height: 4),
            Text(
              '${formatMoney(goal.allocatedMinor)} / ${formatMoney(goal.targetMinor)} · $pct%',
            ),
            const SizedBox(height: 2),
            Text(
              goalProjectionLabel(projection),
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: projectionColor),
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: 'Nạp tiền',
              onPressed: onDeposit,
            ),
            IconButton(
              icon: const Icon(Icons.remove),
              tooltip: 'Rút tiền',
              onPressed: onWithdraw,
            ),
          ],
        ),
        onTap: onEdit,
        onLongPress: onArchive,
      ),
    );
  }
}
