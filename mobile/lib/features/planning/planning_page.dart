import 'package:flutter/material.dart';

import '../../domain/budget.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';

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
  });

  final List<BudgetProgress> budgets;
  final List<RecurringCommitment> commitments;
  final List<SavingsGoal> goals;
  final List<AccountSummary> accounts;
  final List<Category> categories;
  final String monthStart; // YYYY-MM-01
}

/// Write surface — each maps 1:1 to a Data API RPC (or a demo no-op).
class PlanningActions {
  const PlanningActions({
    required this.onBudgetCreate,
    required this.onBudgetDelete,
    required this.onCommitmentCreate,
    required this.onCommitmentPay,
    required this.onCommitmentArchive,
    required this.onGoalCreate,
    required this.onGoalAdjust,
    required this.onGoalArchive,
  });

  final Future<void> Function(String categoryId, int limitMinor) onBudgetCreate;
  final Future<void> Function(String budgetId) onBudgetDelete;
  final Future<void> Function(
    String name,
    int amountMinor,
    int dueDay,
    String accountId,
    String categoryId,
  )
  onCommitmentCreate;
  final Future<void> Function(RecurringCommitment c) onCommitmentPay;
  final Future<void> Function(String commitmentId) onCommitmentArchive;
  final Future<void> Function(String name, int targetMinor, String? deadline)
  onGoalCreate;
  final Future<void> Function(String goalId, int amountMinor) onGoalAdjust;
  final Future<void> Function(String goalId) onGoalArchive;
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
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${snap.error}', textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _refresh,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }
          final d = snap.data!;
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
                      ? () => _createBudget(d)
                      : null,
                ),
                if (d.budgets.isEmpty) _empty('Chưa có ngân sách nào'),
                for (final b in d.budgets)
                  _BudgetTile(budget: b, onDelete: () => _deleteBudget(b)),
                const SizedBox(height: 20),
                _SectionHeader(
                  title: 'Cam kết hàng tháng',
                  onAdd: () => _createCommitment(d),
                ),
                if (d.commitments.isEmpty) _empty('Chưa có cam kết nào'),
                for (final c in d.commitments)
                  _CommitmentTile(
                    commitment: c,
                    onPay: c.paidThisMonth ? null : () => _payCommitment(c),
                    onArchive: () => _archiveCommitment(c),
                  ),
                const SizedBox(height: 20),
                _SectionHeader(title: 'Mục tiêu tiết kiệm', onAdd: _createGoal),
                if (d.goals.isEmpty) _empty('Chưa có mục tiêu nào'),
                for (final g in d.goals)
                  _GoalTile(
                    goal: g,
                    onAdjust: () => _adjustGoal(g),
                    onArchive: () => _archiveGoal(g),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _empty(String text) => Card(child: ListTile(title: Text(text)));

  // -- Budgets -------------------------------------------------------------

  Future<void> _createBudget(PlanningData d) async {
    final expenseCats = d.categories
        .where((c) => c.kind == TransactionKind.expense)
        .toList();
    Category? cat = expenseCats.firstOrNull;
    final limit = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Ngân sách mới'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
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
                if (cat == null || amount == null || amount <= 0) return;
                await widget.actions.onBudgetCreate(cat!.id, amount);
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: const Text('Tạo'),
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
      await widget.actions.onBudgetDelete(b.id);
      _refresh();
    }
  }

  // -- Commitments ---------------------------------------------------------

  Future<void> _createCommitment(PlanningData d) async {
    final expenseCats = d.categories
        .where((c) => c.kind == TransactionKind.expense)
        .toList();
    if (expenseCats.isEmpty || d.accounts.isEmpty) return;
    final name = TextEditingController();
    final amount = TextEditingController();
    final dueDay = TextEditingController();
    Category? cat = expenseCats.firstOrNull;
    AccountSummary? acc = d.accounts.firstOrNull;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Cam kết mới'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(
                    labelText: 'Tên',
                    hintText: 'vd: Tiền nhà',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amount,
                  decoration: const InputDecoration(
                    labelText: 'Số tiền',
                    hintText: 'vd: 3tr',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: dueDay,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Ngày đến hạn (1-31)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<AccountSummary>(
                  initialValue: acc,
                  decoration: const InputDecoration(
                    labelText: 'Tài khoản trả',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    for (final a in d.accounts)
                      DropdownMenuItem(value: a, child: Text(a.name)),
                  ],
                  onChanged: (v) => setDlg(() => acc = v ?? acc),
                ),
                const SizedBox(height: 12),
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
                ),
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
                final a = parseMoneyInput(amount.text);
                final day = int.tryParse(dueDay.text.trim());
                if (n.isEmpty ||
                    a == null ||
                    a <= 0 ||
                    day == null ||
                    day < 1 ||
                    day > 31 ||
                    acc == null ||
                    cat == null) {
                  return;
                }
                await widget.actions.onCommitmentCreate(
                  n,
                  a,
                  day,
                  acc!.id,
                  cat!.id,
                );
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: const Text('Tạo'),
            ),
          ],
        ),
      ),
    );
    if (ok == true) _refresh();
  }

  Future<void> _payCommitment(RecurringCommitment c) async {
    final ok = await _confirm(
      'Trả "${c.name}" — ${formatMoney(c.amountMinor)}?',
    );
    if (ok) {
      await widget.actions.onCommitmentPay(c);
      _refresh();
    }
  }

  Future<void> _archiveCommitment(RecurringCommitment c) async {
    final ok = await _confirm('Lưu trữ "${c.name}"?');
    if (ok) {
      await widget.actions.onCommitmentArchive(c.id);
      _refresh();
    }
  }

  // -- Goals ---------------------------------------------------------------

  Future<void> _createGoal() async {
    final name = TextEditingController();
    final target = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mục tiêu mới'),
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
              await widget.actions.onGoalCreate(n, t, null);
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: const Text('Tạo'),
          ),
        ],
      ),
    );
    if (ok == true) _refresh();
  }

  Future<void> _adjustGoal(SavingsGoal g) async {
    final amount = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Nạp vào "${g.name}"'),
        content: TextField(
          controller: amount,
          decoration: const InputDecoration(
            labelText: 'Số tiền',
            hintText: 'vd: 500k',
            border: OutlineInputBorder(),
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
              await widget.actions.onGoalAdjust(g.id, a);
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: const Text('Nạp'),
          ),
        ],
      ),
    );
    if (ok == true) _refresh();
  }

  Future<void> _archiveGoal(SavingsGoal g) async {
    final ok = await _confirm('Lưu trữ "${g.name}"?');
    if (ok) {
      await widget.actions.onGoalArchive(g.id);
      _refresh();
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
  const _SectionHeader({required this.title, this.onAdd});

  final String title;
  final VoidCallback? onAdd;

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
            onPressed: onAdd,
          ),
      ],
    );
  }
}

class _BudgetTile extends StatelessWidget {
  const _BudgetTile({required this.budget, required this.onDelete});

  final BudgetProgress budget;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final ratio = budget.limitMinor <= 0
        ? 0.0
        : (budget.spentMinor / budget.limitMinor).clamp(0.0, 1.0);
    final state = budgetState(
      spentMinor: budget.spentMinor,
      limitMinor: budget.limitMinor,
    );
    final pace = monthPace(budget.monthStart, DateTime.now());
    final (status, color) = switch (state) {
      BudgetState.over => (
        'Vượt ${formatMoney(budget.spentMinor - budget.limitMinor)}',
        Colors.red.shade700,
      ),
      BudgetState.nearLimit => (
        'Sắp tới hạn mức · còn ${formatMoney(budget.limitMinor - budget.spentMinor)}',
        Colors.orange.shade800,
      ),
      BudgetState.ok => (
        'Còn lại ${formatMoney(budget.limitMinor - budget.spentMinor)}',
        Colors.green.shade700,
      ),
    };
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
              '${formatMoney(budget.spentMinor)} / ${formatMoney(budget.limitMinor)} · $status',
              style: TextStyle(color: color),
            ),
          ],
        ),
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
    required this.onPay,
    required this.onArchive,
  });

  final RecurringCommitment commitment;
  final VoidCallback? onPay;
  final VoidCallback onArchive;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(commitment.name),
        subtitle: Text(
          '${commitment.categoryName} · ${commitment.accountName} · ngày ${commitment.dueDay}',
        ),
        trailing: commitment.paidThisMonth
            ? const Text('Đã trả')
            : TextButton(onPressed: onPay, child: const Text('Trả')),
        onLongPress: onArchive,
      ),
    );
  }
}

class _GoalTile extends StatelessWidget {
  const _GoalTile({
    required this.goal,
    required this.onAdjust,
    required this.onArchive,
  });

  final SavingsGoal goal;
  final VoidCallback onAdjust;
  final VoidCallback onArchive;

  @override
  Widget build(BuildContext context) {
    final pct = (goal.progress * 100).round();
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
          ],
        ),
        trailing: IconButton(icon: const Icon(Icons.add), onPressed: onAdjust),
        onLongPress: onArchive,
      ),
    );
  }
}
