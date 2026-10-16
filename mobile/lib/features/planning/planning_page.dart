import 'package:flutter/material.dart';

import '../../theme/mf_theme.dart';

import '../../domain/budget.dart';
import '../../domain/commitments.dart';
import '../../domain/goal_projection.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/report.dart' show vnNow, vnToday;
import '../shared/empty_state.dart';
import 'commitment_calendar.dart';
import 'recurring_form_dialog.dart';
import '../shared/timed_snack_bar.dart';

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
    required this.budgetMonth,
    this.incomeTemplates = const [],
    this.priorBudgets = const [],
    this.budgetSuggestionRows = const [],
  });

  /// Budget rows for [budgetMonth] — the month the budgets section is
  /// viewing (this month or next; the page's switcher never offers
  /// further).
  final List<BudgetProgress> budgets;
  final List<RecurringIncome> incomeTemplates;
  final List<RecurringCommitment> commitments;
  final List<SavingsGoal> goals;
  final List<AccountSummary> accounts;
  final List<Category> categories;

  /// The CURRENT calendar month (YYYY-MM-01) — the frame commitments,
  /// income receipts and the funding-basis window resolve against,
  /// independent of which month the budgets section is viewing.
  final String monthStart;

  /// The month the budgets section shows (YYYY-MM-01) — `budgets`,
  /// `priorBudgets` and `budgetSuggestionRows` were loaded relative to
  /// it. Equals [monthStart] unless the reader is planning a month
  /// ahead.
  final String budgetMonth;

  /// Budget rows from months inside the rollover window before
  /// [budgetMonth] — the `budget_progress` range read the web workspace
  /// makes. Feeds both the per-card carry ("Chuyển từ tháng trước") and
  /// the quick-fill "Dùng hạn mức tháng trước" action.
  final List<BudgetProgress> priorBudgets;

  /// Trailing ledger rows covering the suggestion window and the income
  /// basis — the web's `budgetSuggestions` input plus the income rows
  /// `averageMonthlyIncome` reads for the "% đã dự phòng" chip. Empty
  /// means both the quick-fill average and the chip honestly have
  /// nothing to propose.
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
    this.loadGoalFunding,
    this.onCoverOverspend,
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
  /// the same category with the new limit. [monthStart] is the viewed
  /// budget month so a create lands on "Tháng sau" when the reader is
  /// planning ahead.
  final Future<void> Function(
    BudgetProgress? editing,
    String categoryId,
    int limitMinor,
    String monthStart,
  )
  onBudgetSave;
  final Future<void> Function(String budgetId) onBudgetDelete;

  /// Bulk-fill writes ("Điền nhanh") — each draft lands through the same
  /// `upsert_monthly_budget` RPC a manual save uses. Null (demo) hides the
  /// affordance entirely. Returns how many drafts actually wrote so the
  /// page can report a partial apply honestly.
  final Future<int> Function(List<BudgetDraft> drafts)? onBudgetFill;

  /// D11 goal detail — reads the signed allocation history (the
  /// progress authority) plus the newest goal-tagged transactions.
  /// Null (demo) simply drops the "Chi tiết" entry — the tile keeps
  /// its progress/projection without promising a history it can't read.
  final Future<GoalFunding> Function(String goalId)? loadGoalFunding;

  /// YNAB Rule 3 — move [amountMinor] of limit from [donor] to
  /// [overspent] inside the same month: two `upsert_monthly_budget`
  /// writes (donor −X, overspent +X). Implementations must surface a
  /// partial apply honestly — a failure after the donor write lands is
  /// a different state than "nothing happened". Null hides the "Bù từ
  /// danh mục khác" affordance.
  final Future<void> Function(
    BudgetProgress donor,
    BudgetProgress overspent,
    int amountMinor,
  )?
  onCoverOverspend;

  /// [intervalMonths] is the chosen cadence (1 monthly, 3/6/12, …24) —
  /// it rides `p_interval_months` where the RPC accepts it.
  final Future<void> Function(
    RecurringCommitment? editing,
    String name,
    int amountMinor,
    int dueDay,
    String accountId,
    String categoryId,
    int intervalMonths,
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

  /// [budgetMonth] (YYYY-MM-01) is the month the budgets section should
  /// show — the loader returns `budgets`, `priorBudgets` and
  /// `budgetSuggestionRows` resolved against it while `monthStart`
  /// (commitments, income, the funding basis) stays the current month.
  final Future<PlanningData> Function(String budgetMonth) loadData;
  final PlanningActions actions;

  @override
  State<PlanningPage> createState() => PlanningPageState();
}

class PlanningPageState extends State<PlanningPage> {
  late Future<PlanningData> _data;

  /// Viewed budget month as an offset from the current month — the
  /// YNAB month-ahead range. The web workspace blocks every future
  /// month (`resolveBudgetMonth` → adjustment "future"), so there is no
  /// web range to mirror; +1 is the conservative mobile bound.
  static const _maxBudgetMonthOffset = 1;
  var _budgetOffset = 0;

  String get _budgetMonth {
    // VN calendar — p_month_start and p_paid_on must agree on which
    // month is "current" whatever zone the device reports.
    final now = vnNow();
    final d = DateTime(now.year, now.month + _budgetOffset);
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-01';
  }

  @override
  void initState() {
    super.initState();
    _data = widget.loadData(_budgetMonth);
  }

  Future<void> _refresh() async {
    setState(() {
      _data = widget.loadData(_budgetMonth);
    });
    try {
      await _data;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  /// Public reload for the nav shell after a capture save.
  void reload() => _refresh();

  /// ‹/› month switcher for the budgets section — reloads against the
  /// picked month; the offset stays inside [0, _maxBudgetMonthOffset].
  void _shiftBudgetMonth(int delta) {
    final next = _budgetOffset + delta;
    if (next < 0 || next > _maxBudgetMonthOffset) return;
    setState(() {
      _budgetOffset = next;
      _data = widget.loadData(_budgetMonth);
    });
  }

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
          final today = vnToday();
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
                _BudgetSectionHeader(
                  label: 'Ngân sách · ${_monthLabel(d.budgetMonth)}',
                  canPrev: _budgetOffset > 0,
                  canNext: _budgetOffset < _maxBudgetMonthOffset,
                  onPrev: () => _shiftBudgetMonth(-1),
                  onNext: () => _shiftBudgetMonth(1),
                  onAdd:
                      d.categories.any((c) => c.kind == TransactionKind.expense)
                      ? () => _showBudgetForm(d)
                      : null,
                  onQuickFill: widget.actions.onBudgetFill == null
                      ? null
                      : () => _showQuickFill(d),
                ),
                if (_budgetOffset > 0) _fundedChip(d),
                if (d.budgets.isEmpty)
                  _empty(
                    'Chưa có ngân sách nào',
                    icon: Icons.pie_chart_outline,
                    message: 'Đặt hạn mức cho từng danh mục chi để theo dõi.',
                    // Same guard as the section header's add button — no
                    // expense category means the form has nothing to pick.
                    actionLabel:
                        d.categories.any(
                          (c) => c.kind == TransactionKind.expense,
                        )
                        ? 'Đặt hạn mức'
                        : null,
                    onAction:
                        d.categories.any(
                          (c) => c.kind == TransactionKind.expense,
                        )
                        ? () => _showBudgetForm(d)
                        : null,
                  ),
                for (final b in d.budgets)
                  _BudgetTile(
                    budget: b,
                    priorBudgets: d.priorBudgets,
                    onEdit: () => _showBudgetForm(d, editing: b),
                    onDelete: () => _deleteBudget(b),
                    onCover: widget.actions.onCoverOverspend == null
                        ? null
                        : () => _showCoverSheet(d, b),
                  ),
                if (widget.actions.onIncomeSave != null ||
                    d.incomeTemplates.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionHeader(
                    title: 'Thu nhập định kỳ',
                    addTooltip: 'Thêm khoản thu định kỳ',
                    onAdd: widget.actions.onIncomeSave == null
                        ? null
                        : () => _showIncomeForm(d),
                  ),
                  if (activeIncome.isEmpty)
                    _empty(
                      'Chưa có khoản thu định kỳ nào',
                      icon: Icons.event_repeat,
                      message: 'Thêm khoản thu lặp lại như lương, phụ cấp.',
                      actionLabel: widget.actions.onIncomeSave == null
                          ? null
                          : 'Thêm khoản thu',
                      onAction: widget.actions.onIncomeSave == null
                          ? null
                          : () => _showIncomeForm(d),
                    ),
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
                  addTooltip: 'Thêm cam kết',
                  onAdd: () => _showCommitmentForm(d),
                ),
                // D8 — PocketGuard's bill calendar: which days carry a
                // due commitment, tap a day for its list. Paid marks show
                // too — the grid answers "đến hạn ngày nào" regardless of
                // whether it's settled yet.
                if (activeCommitments.isNotEmpty)
                  CommitmentCalendar(
                    monthStart: d.monthStart,
                    commitments: activeCommitments,
                    today: today,
                    onPay: (c) => _payCommitment(c),
                  ),
                if (activeCommitments.isEmpty)
                  _empty(
                    'Chưa có cam kết nào',
                    icon: Icons.repeat,
                    message:
                        'Thêm khoản định kỳ như tiền nhà, internet '
                        'để theo dõi ngày đến hạn.',
                    actionLabel: 'Thêm cam kết',
                    onAction: () => _showCommitmentForm(d),
                  ),
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
                  addTooltip: 'Thêm mục tiêu',
                  onAdd: () => _showGoalForm(),
                ),
                // D11 reserve line — the web's "Còn có thể dành": VND
                // wallet balances minus money earmarked for active
                // goals. Names its basis so it never reads as free cash.
                if (activeGoals.isNotEmpty)
                  _GoalReserveLine(goals: activeGoals, accounts: d.accounts),
                if (activeGoals.isEmpty)
                  _empty(
                    'Chưa có mục tiêu nào',
                    icon: Icons.savings_outlined,
                    message: 'Đặt mục tiêu để theo dõi tiến độ tiết kiệm.',
                    actionLabel: 'Thêm mục tiêu',
                    onAction: () => _showGoalForm(),
                  ),
                for (final g in activeGoals)
                  _GoalTile(
                    goal: g,
                    onDetail: widget.actions.loadGoalFunding == null
                        ? null
                        : () => _showGoalDetail(g),
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

  /// One shared empty-state card per section — an action button renders
  /// only where a real seam exists, never as a dead affordance.
  Widget _empty(
    String text, {
    required IconData icon,
    String? message,
    String? actionLabel,
    VoidCallback? onAction,
  }) => EmptyStateCard(
    icon: icon,
    title: text,
    message: message,
    actionLabel: actionLabel,
    onAction: onAction,
  );

  /// "% đã dự phòng" for the month-ahead view — next month's planned
  /// limits against the average income of the three COMPLETED months
  /// (the `averageMonthlyIncome` window anchored on [PlanningData
  /// .monthStart], not the viewed month: this month is still earning,
  /// so a partial month cannot flatter the basis). Over 100% reports
  /// honestly — planning more than the average earns is allowed data.
  Widget _fundedChip(PlanningData d) {
    final planned = d.budgets.fold<int>(0, (s, b) => s + b.limitMinor);
    final basis = averageMonthlyIncome(d.budgetSuggestionRows, d.monthStart);
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: scheme.surfaceContainerLow,
      child: ListTile(
        dense: true,
        leading: const Icon(Icons.savings_outlined),
        title: basis <= 0
            ? const Text('Chưa có thu nhập 3 tháng gần để đối chiếu')
            : Text(
                'Đã dự phòng ${(planned / basis * 100).round()}% · '
                '${formatMoney(planned)} / ${formatMoney(basis)}',
              ),
        subtitle: basis <= 0 ? null : const Text('theo thu nhập TB 3 tháng'),
      ),
    );
  }

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
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
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
    // upsert_monthly_budget takes no idempotency key — the in-flight
    // guard IS the double-submit defense: a second tap while the RPC is
    // pending would post a duplicate write the server cannot dedupe.
    var submitting = false;
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
              // No cancel mid-flight — the RPC is already on the wire;
              // popping here would hide a write that still lands.
              onPressed: submitting ? null : () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: submitting
                  ? null
                  : () async {
                      final amount = parseMoneyInput(limit.text);
                      final categoryId = editing?.categoryId ?? cat?.id;
                      if (categoryId == null || amount == null || amount <= 0) {
                        return;
                      }
                      setDlg(() => submitting = true);
                      try {
                        await widget.actions.onBudgetSave(
                          editing,
                          categoryId,
                          amount,
                          // Edits keep their stored month (== the viewed
                          // one); creates land on the month the reader is
                          // planning.
                          editing?.monthStart ?? d.budgetMonth,
                        );
                      } catch (e) {
                        setDlg(() {
                          submitting = false;
                          error = planningErrorMessage(
                            e,
                            fallback: 'Không lưu được — thử lại',
                          );
                        });
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
    final prevMonth = shiftBudgetMonth(d.budgetMonth, -1);
    return budgetsToCarryForward(
      previousBudgets: d.priorBudgets
          .where((b) => b.monthStart == prevMonth)
          .toList(),
      currentBudgets: d.budgets,
      monthStart: d.budgetMonth,
    );
  }

  /// Suggested limits for expense categories that have no budget in the
  /// viewed month — the web's `budgetSuggestions` over the trailing 3
  /// months before it, restricted to categories that still exist.
  /// Anchored on `monthStart` like the funding basis: "3 tháng gần nhất"
  /// means three COMPLETED months — this month is still being spent, so
  /// counting it toward next month's average would flatter the figure
  /// (and its rows are not even in the loaded window).
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
    final prevMonthLabel = _monthLabel(shiftBudgetMonth(d.budgetMonth, -1));
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
                                    monthStart: d.budgetMonth,
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
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
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

  // -- Cover overspend (YNAB Rule 3) -----------------------------------------

  /// "Bù từ danh mục khác" — pick a donor budget with positive effective
  /// remaining, choose the amount (default = the deficit capped at what
  /// the donor can give), see BOTH writes before they land, then two
  /// `upsert_monthly_budget` calls: donor −X, overspent +X. Nothing is
  /// silent: the preview names the exact limits, and a partial apply
  /// (donor written, target failed) says so.
  Future<void> _showCoverSheet(PlanningData d, BudgetProgress overspent) async {
    final cover = widget.actions.onCoverOverspend;
    if (cover == null) return;
    int effectiveAvailable(BudgetProgress b) => budgetEffectiveAvailable(
      spentMinor: b.spentMinor,
      limitMinor: b.limitMinor,
      carry: budgetRollover(
        priorBudgets: d.priorBudgets,
        categoryId: b.categoryId,
        monthStart: d.budgetMonth,
      ).carry,
    );

    final deficit = -effectiveAvailable(overspent);
    if (deficit <= 0) return;
    // Donors need positive effective remaining AND at least 2 ₫ of own
    // limit — the RPC floor is limit_minor > 0, so a donor can give at
    // most limit − 1.
    final donors = [
      for (final b in d.budgets)
        if (b.categoryId != overspent.categoryId && b.limitMinor > 1)
          (budget: b, available: effectiveAvailable(b)),
    ].where((r) => r.available > 0).toList();
    if (donors.isEmpty) {
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        const SnackBar(content: Text('Không có danh mục nào còn dư để bù')),
      );
      return;
    }

    var picked = donors.first;
    int maxForDonor(({BudgetProgress budget, int available}) r) =>
        r.available < r.budget.limitMinor - 1
        ? r.available
        : r.budget.limitMinor - 1;
    var maxFor = maxForDonor(picked);
    final amount = TextEditingController(
      text: '${deficit < maxFor ? deficit : maxFor}',
    );
    final chosen =
        await showModalBottomSheet<({BudgetProgress donor, int amount})>(
          context: context,
          showDragHandle: true,
          isScrollControlled: true,
          builder: (ctx) => StatefulBuilder(
            builder: (ctx, setSheet) {
              final entered = parseMoneyInput(amount.text);
              final donorNew = picked.budget.limitMinor - (entered ?? 0);
              final overNew = overspent.limitMinor + (entered ?? 0);
              final valid = entered != null && entered > 0 && entered <= maxFor;
              return SafeArea(
                child: Padding(
                  // Lift above the keyboard so the amount stays visible.
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(ctx).viewInsets.bottom,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                        child: Text(
                          'Bù ${formatMoney(deficit)} cho '
                          '"${overspent.categoryName}"',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'Hạn mức chuyển đi — không đồng nào rời sổ cái, '
                          'chỉ là phân bổ lại.',
                        ),
                      ),
                      Flexible(
                        child: ListView(
                          shrinkWrap: true,
                          children: [
                            for (final r in donors)
                              ListTile(
                                leading: Icon(
                                  identical(r.budget, picked.budget) ||
                                          r.budget.id == picked.budget.id
                                      ? Icons.check_circle
                                      : Icons.circle_outlined,
                                  color: r.budget.id == picked.budget.id
                                      ? Theme.of(ctx).colorScheme.primary
                                      : null,
                                ),
                                title: Text(r.budget.categoryName),
                                subtitle: Text(
                                  'Còn dư ${formatMoney(r.available)}',
                                ),
                                onTap: () {
                                  setSheet(() {
                                    picked = r;
                                    maxFor = maxForDonor(picked);
                                    final a = parseMoneyInput(amount.text);
                                    if (a == null || a > maxFor) {
                                      amount.text = '$maxFor';
                                    }
                                  });
                                },
                              ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: TextField(
                          controller: amount,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: 'Số tiền bù',
                            hintText: 'vd: 500k',
                            helperText:
                                'Tối đa ${formatMoney(maxFor)} theo danh '
                                'mục đã chọn',
                            border: const OutlineInputBorder(),
                          ),
                          onChanged: (_) => setSheet(() {}),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                        child: Text(
                          '${picked.budget.categoryName}: '
                          '${formatMoney(picked.budget.limitMinor)} → '
                          '${formatMoney(donorNew)}\n'
                          '${overspent.categoryName}: '
                          '${formatMoney(overspent.limitMinor)} → '
                          '${formatMoney(overNew)}',
                          style: Theme.of(ctx).textTheme.bodySmall,
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
                              onPressed: !valid
                                  ? null
                                  : () => Navigator.pop(ctx, (
                                      donor: picked.budget,
                                      amount: entered,
                                    )),
                              child: Text(
                                entered == null
                                    ? 'Bù'
                                    : 'Bù ${formatMoney(entered)}',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
    if (chosen == null || !mounted) return;
    try {
      await cover(chosen.donor, overspent, chosen.amount);
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          SnackBar(
            content: Text(
              'Đã bù ${formatMoney(chosen.amount)} cho '
              '"${overspent.categoryName}" từ '
              '"${chosen.donor.categoryName}"',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          SnackBar(
            content: Text(
              e.toString().contains('cover_partial')
                  // The donor limit already moved — saying "không bù
                  // được" alone would hide that half the apply landed.
                  ? 'Đã giảm "${chosen.donor.categoryName}" nhưng chưa '
                        'bù được cho "${overspent.categoryName}" — '
                        'thử lại'
                  : planningErrorMessage(
                      e,
                      fallback: 'Không bù được — thử lại',
                    ),
            ),
          ),
        );
      }
    }
    _refresh();
  }

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
      onSave: (name, amount, day, accountId, categoryId, interval) => income
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
              interval,
            ),
    );
    if (ok) _refresh();
  }

  Future<void> _payCommitment(RecurringCommitment c) async {
    final ok = await _confirm(
      'Ghi chi ${formatMoney(c.amountMinor)} vào ${c.accountName} '
      'cho "${c.name}"?',
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
      'Ghi thu ${formatMoney(i.amountMinor)} vào ${i.accountName} '
      'cho "${i.name}"?',
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
    // upsert_savings_goal takes no idempotency key — the in-flight guard
    // IS the double-submit defense against a mid-RPC second tap.
    var submitting = false;
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
              // No cancel mid-flight — the RPC is already on the wire;
              // popping here would hide a write that still lands.
              onPressed: submitting ? null : () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: submitting
                  ? null
                  : () async {
                      final n = name.text.trim();
                      final t = parseMoneyInput(target.text);
                      if (n.isEmpty || t == null || t <= 0) return;
                      // Same guard the web dialog applies: the target can
                      // never drop below money already allocated.
                      if (editing != null && t < editing.allocatedMinor) {
                        setDlg(
                          () => error =
                              'Mức đích không được thấp hơn tiền đã dành',
                        );
                        return;
                      }
                      setDlg(() => submitting = true);
                      try {
                        await widget.actions.onGoalSave(
                          editing,
                          n,
                          t,
                          deadline,
                        );
                      } catch (e) {
                        setDlg(() {
                          submitting = false;
                          error = planningErrorMessage(
                            e,
                            fallback: 'Không lưu được — thử lại',
                          );
                        });
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
  /// after today, keeping a past stored deadline selectable. "Today" is
  /// the VN civil date, the calendar the stored deadline lives on.
  Future<String?> _pickDeadline(BuildContext ctx, String? current) async {
    final now = vnNow();
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
    // adjust_savings_goal takes no idempotency key — the in-flight guard
    // IS the double-submit defense: a second tap while the RPC is pending
    // would post the same deposit/withdraw twice.
    var submitting = false;
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
              // No cancel mid-flight — the RPC is already on the wire;
              // popping here would hide a write that still lands.
              onPressed: submitting ? null : () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: submitting
                  ? null
                  : () async {
                      final a = parseMoneyInput(amount.text);
                      if (a == null || a <= 0) return;
                      if (withdraw && a > g.allocatedMinor) {
                        setDlg(
                          () => error = 'Không thể rút quá số tiền đã dành',
                        );
                        return;
                      }
                      if (!withdraw && a > g.targetMinor - g.allocatedMinor) {
                        setDlg(
                          () => error =
                              'Số tiền vượt phần còn thiếu của mục tiêu',
                        );
                        return;
                      }
                      setDlg(() => submitting = true);
                      try {
                        await widget.actions.onGoalAdjust(
                          g.id,
                          withdraw ? -a : a,
                        );
                      } catch (e) {
                        setDlg(() {
                          submitting = false;
                          error = planningErrorMessage(
                            e,
                            fallback: 'Không điều chỉnh được — thử lại',
                          );
                        });
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

  /// D11 goal detail — progress + pace prerequisites + the signed
  /// funding history and goal-tagged transactions the research calls
  /// "linked funding". Read-only: nothing here writes.
  Future<void> _showGoalDetail(SavingsGoal g) async {
    final loader = widget.actions.loadGoalFunding;
    if (loader == null) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        final today = vnNow();
        final projection = projectGoalCompletion(
          targetMinor: g.targetMinor,
          contributedMinor: g.allocatedMinor,
          deadline: g.deadline,
          monthlyRateMinor: estimateGoalMonthlyRate(
            contributedMinor: g.allocatedMinor,
            createdAt: g.createdAt,
            today: today,
          ),
          today: today,
        );
        final missing = goalMissingPrerequisites(
          contributedMinor: g.allocatedMinor,
          deadline: g.deadline,
          createdAt: g.createdAt,
          today: today,
        );
        final theme = Theme.of(ctx);
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(g.name, style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(
                  'Đã dành ${formatMoney(g.allocatedMinor)} / '
                  '${formatMoney(g.targetMinor)}'
                  ' (${(g.progress * 100).round()}%)',
                ),
                if (g.deadline != null) Text('Hạn: ${_dmy(g.deadline!)}'),
                Text(
                  goalProjectionLabel(projection),
                  style: theme.textTheme.bodySmall,
                ),
                for (final m in missing)
                  Text(
                    '• $m',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                const SizedBox(height: 12),
                FutureBuilder(
                  future: loader(g.id),
                  builder: (ctx, snap) {
                    if (snap.hasError) {
                      return Text(
                        'Không tải được lịch sử — thử lại sau.',
                        style: theme.textTheme.bodySmall,
                      );
                    }
                    if (!snap.hasData) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    final funding = snap.data!;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Lần nạp/rút gần đây',
                          style: theme.textTheme.labelLarge,
                        ),
                        if (funding.allocations.isEmpty)
                          Text(
                            'Chưa có lần nạp nào.',
                            style: theme.textTheme.bodySmall,
                          )
                        else
                          for (final a in funding.allocations)
                            Text(
                              '${_dmyTime(a.createdAt)} · '
                              '${a.amountMinor > 0 ? 'Nạp' : 'Rút'} '
                              '${formatMoney(a.amountMinor.abs())}',
                              style: theme.textTheme.bodySmall,
                            ),
                        if (funding.allocationsHasMore)
                          Text(
                            'Hiển thị ${funding.allocations.length} '
                            'mục mới nhất',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        const SizedBox(height: 12),
                        Text(
                          'Giao dịch liên kết',
                          style: theme.textTheme.labelLarge,
                        ),
                        if (funding.linked.isEmpty)
                          Text(
                            'Chưa có giao dịch nào gắn mục tiêu này — '
                            'liên kết là ghi chú, tiến độ vẫn theo lần '
                            'nạp/rút ở trên.',
                            style: theme.textTheme.bodySmall,
                          )
                        else
                          for (final t in funding.linked)
                            Text(
                              '${_dmy(t.occurredOn)} · '
                              '${(t.payee == null || t.payee!.isEmpty) ? t.category : t.payee!} · '
                              '${t.kind == TransactionKind.income ? '+' : '-'}'
                              '${formatMoney(t.amount)}',
                              style: theme.textTheme.bodySmall,
                            ),
                        if (funding.linkedHasMore)
                          Text(
                            'Hiển thị ${funding.linked.length} '
                            'giao dịch mới nhất',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// "d/m/yyyy" for sheet lines — compact VN day-first form.
  static String _dmy(String ymdDay) =>
      '${int.parse(ymdDay.substring(8))}/${int.parse(ymdDay.substring(5, 7))}'
      '/${ymdDay.substring(0, 4)}';

  /// "d/m/yyyy" of an ISO timestamp (local civil date) — allocation rows
  /// carry timestamptz; the sheet shows their day, not their clock.
  static String _dmyTime(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return iso;
    return '${d.day}/${d.month}/${d.year}';
  }

  /// The server refuses to archive a goal that still holds allocated
  /// money — the web blocks the confirm the same way client-side.
  Future<void> _archiveGoal(SavingsGoal g) async {
    if (g.allocatedMinor > 0) {
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
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

/// Budgets header with the ‹/› month switcher — the month-ahead entry.
/// Chevrons disable at the range ends (this month .. next month), never
/// hidden: a disabled arrow is more honest than one that vanishes.
class _BudgetSectionHeader extends StatelessWidget {
  const _BudgetSectionHeader({
    required this.label,
    required this.canPrev,
    required this.canNext,
    required this.onPrev,
    required this.onNext,
    this.onAdd,
    this.onQuickFill,
  });

  final String label;
  final bool canPrev;
  final bool canNext;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final VoidCallback? onAdd;
  final VoidCallback? onQuickFill;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(label, style: Theme.of(context).textTheme.titleMedium),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_left),
          tooltip: 'Tháng trước',
          onPressed: canPrev ? onPrev : null,
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          tooltip: 'Tháng sau',
          onPressed: canNext ? onNext : null,
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
            tooltip: 'Thêm ngân sách',
            onPressed: onAdd,
          ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onAdd, this.addTooltip});

  final String title;
  final VoidCallback? onAdd;

  /// Screen-reader + long-press label for the icon-only add button.
  final String? addTooltip;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        if (onAdd != null)
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            tooltip: addTooltip,
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
    this.onCover,
  });

  final BudgetProgress budget;

  /// Prior-month rows inside the rollover window — empty keeps the card
  /// on the this-month-only figures it always showed.
  final List<BudgetProgress> priorBudgets;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  /// "Bù từ danh mục khác" — shown only when the effective remainder is
  /// negative (the sheet itself double-checks) and the action exists.
  final VoidCallback? onCover;

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
    final pace = monthPace(budget.monthStart, vnNow());
    final (status, color) = switch (state) {
      BudgetState.over => (
        'Vượt ${formatMoney(available.abs())}',
        context.mf.expenseText,
      ),
      BudgetState.nearLimit => (
        'Sắp tới hạn mức · còn ${formatMoney(available)}',
        context.mf.warningText,
      ),
      BudgetState.ok => (
        'Còn lại ${formatMoney(available)}',
        context.mf.incomeText,
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
            // YNAB Rule 3 entry — only a genuinely overspent row offers
            // it; the text button names the action (never color alone).
            if (available < 0 && onCover != null)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: onCover,
                  icon: const Icon(Icons.swap_horiz, size: 18),
                  label: const Text('Bù từ danh mục khác'),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 32),
                  ),
                ),
              ),
          ],
        ),
        // The web row pairs edit with a visible delete — a popup keeps the
        // same two actions one tap away; long-press stays a shortcut.
        trailing: PopupMenuButton<String>(
          tooltip: 'Tùy chọn ${budget.categoryName}',
          iconSize: 20,
          onSelected: (action) {
            switch (action) {
              case 'edit':
                onEdit();
              case 'delete':
                onDelete();
            }
          },
          itemBuilder: (ctx) => const [
            PopupMenuItem(value: 'edit', child: Text('Sửa hạn mức')),
            PopupMenuItem(value: 'delete', child: Text('Xóa hạn mức')),
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
    return Semantics(
      label: 'Đã chi ${(ratio * 100).round()}% ngân sách',
      child: MfTickBar(ratio: ratio, color: color, marker: pace),
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
      CommitmentStatus.overdue => context.mf.expenseText,
      CommitmentStatus.dueToday => context.mf.warningText,
      CommitmentStatus.upcoming => scheme.onSurfaceVariant,
      // Not due this month — the calmest unpaid band, like upcoming.
      CommitmentStatus.scheduled => scheme.onSurfaceVariant,
      CommitmentStatus.paidDifferent => context.mf.transferText,
      CommitmentStatus.paid => context.mf.incomeText,
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
            // Scheduled rows name their real due month — "Đến hạn
            // tháng 3/2026" — never the generic "Còn N ngày" a monthly
            // reading would fabricate.
            dueMonth: commitmentDueMonth(commitment, monthStart: monthStart),
            format: formatMoney,
          );
    // Monthly rows need no cadence word; a yearly/quarterly one does —
    // "ngày 5 · mỗi năm" is what stops it reading as due monthly.
    final interval = commitmentIntervalLabel(commitment.intervalMonths);
    final cadence = interval == null
        ? 'ngày ${commitment.dueDay}'
        : 'ngày ${commitment.dueDay} · $interval';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(commitment.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${commitment.categoryName} · ${commitment.accountName} · '
              '$cadence · ${formatMoney(commitment.amountMinor)}',
            ),
            if (statusLine != null)
              Text(statusLine, style: TextStyle(color: statusColor)),
          ],
        ),
        // "Đã trả" is tappable like the income tile's "Đã nhận" — it
        // undoes this month's payment (the web's Hoàn tác thanh toán).
        // A "khác số tiền" row undoes the same way.
        // A scheduled (not-yet-due) row can still be paid early — the
        // payment re-anchors the cycle, so the button says so honestly.
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            commitment.paidThisMonth
                ? TextButton(onPressed: onUndo, child: const Text('Đã trả'))
                : TextButton(
                    onPressed: onPay,
                    child: Text(
                      status == CommitmentStatus.scheduled ? 'Trả sớm' : 'Trả',
                    ),
                  ),
            PopupMenuButton<String>(
              tooltip: 'Tùy chọn ${commitment.name}',
              iconSize: 20,
              onSelected: (action) {
                switch (action) {
                  case 'edit':
                    onEdit();
                  case 'archive':
                    onArchive();
                }
              },
              itemBuilder: (ctx) => const [
                PopupMenuItem(value: 'edit', child: Text('Sửa')),
                PopupMenuItem(value: 'archive', child: Text('Lưu trữ')),
              ],
            ),
          ],
        ),
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
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            income.receivedThisMonth
                ? TextButton(onPressed: onUndo, child: const Text('Đã nhận'))
                : TextButton(onPressed: onReceive, child: const Text('Nhận')),
            if (onArchive != null)
              PopupMenuButton<String>(
                tooltip: 'Tùy chọn ${income.name}',
                iconSize: 20,
                onSelected: (action) {
                  switch (action) {
                    case 'edit':
                      onEdit?.call();
                    case 'archive':
                      onArchive!();
                  }
                },
                itemBuilder: (ctx) => [
                  if (onEdit != null)
                    const PopupMenuItem(value: 'edit', child: Text('Sửa')),
                  const PopupMenuItem(value: 'archive', child: Text('Lưu trữ')),
                ],
              ),
          ],
        ),
        onTap: onEdit,
        onLongPress: onArchive,
      ),
    );
  }
}

/// The web's reserve readout (D11): total VND wallet balance minus the
/// money already earmarked for active goals — "còn có thể dành". A
/// negative remainder says "đã dành quá số dư" exactly like the web,
/// and the line names its basis (entered goal allocations over VND
/// wallets) so it never masquerades as spendable-cash truth.
class _GoalReserveLine extends StatelessWidget {
  const _GoalReserveLine({required this.goals, required this.accounts});

  final List<SavingsGoal> goals;
  final List<AccountSummary> accounts;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final earmarked = goals.fold<int>(0, (s, g) => s + g.allocatedMinor);
    final vndBalance = accounts
        .where((a) => a.currencyCode == 'VND')
        .fold<int>(0, (s, a) => s + a.balance);
    final unreserved = vndBalance - earmarked;
    final line = unreserved >= 0
        ? 'Đã dành cho mục tiêu ${formatMoney(earmarked)} · '
              'còn có thể dành ${formatMoney(unreserved)}'
        : 'Đã dành ${formatMoney(earmarked)} — '
              'quá số dư ví ${formatMoney(-unreserved)}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        line,
        style: theme.textTheme.bodySmall?.copyWith(
          color: unreserved >= 0
              ? theme.colorScheme.onSurfaceVariant
              : theme.colorScheme.error,
        ),
      ),
    );
  }
}

class _GoalTile extends StatelessWidget {
  const _GoalTile({
    required this.goal,
    required this.onDetail,
    required this.onEdit,
    required this.onDeposit,
    required this.onWithdraw,
    required this.onArchive,
  });

  final SavingsGoal goal;

  /// "Chi tiết" — the funding-history sheet. Null when the store has
  /// no funding read (demo): the menu simply omits the entry.
  final VoidCallback? onDetail;
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
    final today = vnNow();
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
        leading: const MfSquareIcon(icon: Icons.savings_outlined),
        title: Text(goal.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              label: 'Đã đạt $pct% mục tiêu',
              child: ExcludeSemantics(
                child: MfTickBar(
                  ratio: goal.progress.clamp(0.0, 1.0),
                  height: 18,
                ),
              ),
            ),
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
            IconButton.outlined(
              icon: const Icon(Icons.add),
              tooltip: 'Nạp tiền',
              onPressed: onDeposit,
            ),
            const SizedBox(width: 4),
            IconButton.outlined(
              icon: const Icon(Icons.remove),
              tooltip: 'Rút tiền',
              onPressed: onWithdraw,
            ),
            PopupMenuButton<String>(
              tooltip: 'Tùy chọn ${goal.name}',
              iconSize: 20,
              onSelected: (action) {
                switch (action) {
                  case 'detail':
                    onDetail?.call();
                  case 'edit':
                    onEdit();
                  case 'archive':
                    onArchive();
                }
              },
              itemBuilder: (ctx) => [
                if (onDetail != null)
                  const PopupMenuItem(value: 'detail', child: Text('Chi tiết')),
                const PopupMenuItem(value: 'edit', child: Text('Sửa')),
                const PopupMenuItem(value: 'archive', child: Text('Lưu trữ')),
              ],
            ),
          ],
        ),
        onTap: onEdit,
        onLongPress: onArchive,
      ),
    );
  }
}
