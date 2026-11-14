import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fintech_models.dart';

const _kStorageKey = 'mf_fintech_state_v1';

class DailySpendPoint {
  const DailySpendPoint({
    required this.label,
    required this.amount,
    required this.isToday,
  });

  final String label;
  final int amount;
  final bool isToday;
}

class MonthlyFlowPoint {
  const MonthlyFlowPoint({
    required this.monthLabel,
    required this.income,
    required this.expense,
  });

  final String monthLabel;
  final int income;
  final int expense;
}

class FintechStore extends ChangeNotifier {
  FintechStore({bool persist = true, DateTime? nowOverride})
      : _persist = persist,
        _now = nowOverride {
    _seedInitialState();
  }

  final bool _persist;
  final DateTime? _now;

  DateTime get now => _now ?? DateTime.now();

  bool _loaded = false;
  bool get loaded => _loaded;

  bool _hideBalance = false;
  bool get hideBalance => _hideBalance;

  List<WalletCardModel> _wallets = [];
  List<WalletCardModel> get wallets => List.unmodifiable(_wallets);

  List<FinTx> _transactions = [];
  List<FinTx> get transactions => List.unmodifiable(_transactions);

  Map<String, int> _budgets = {};
  Map<String, int> get budgets => Map.unmodifiable(_budgets);

  Future<void> init() async {
    if (!_persist) {
      _loaded = true;
      notifyListeners();
      return;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kStorageKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        final rawWallets = decoded['wallets'] as List<dynamic>?;
        final rawTxs = decoded['transactions'] as List<dynamic>?;
        final rawBudgets = decoded['budgets'] as Map<String, dynamic>?;
        if (rawWallets != null && rawWallets.isNotEmpty && rawTxs != null) {
          _wallets = rawWallets
              .map((e) => WalletCardModel.fromJson(e as Map<String, dynamic>))
              .toList();
          _transactions = rawTxs
              .map((e) => FinTx.fromJson(e as Map<String, dynamic>))
              .toList()
            ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
          _hideBalance = decoded['hideBalance'] as bool? ?? false;
          if (rawBudgets != null) {
            _budgets = {
              for (final e in rawBudgets.entries) e.key: (e.value as num).toInt(),
            };
          }
          _loaded = true;
          notifyListeners();
          return;
        }
      }
    } catch (_) {
      // Fall back to fresh seeded state if storage is unreadable or corrupt.
    }
    _seedInitialState();
    _loaded = true;
    notifyListeners();
    await _save();
  }

  void _seedInitialState() {
    final current = now;
    DateTime sameMonthDay(int day, {int hour = 10, int minute = 0}) {
      final clamped = min(day, current.day).clamp(1, 28);
      return DateTime(current.year, current.month, clamped, hour, minute);
    }

    DateTime prevMonthDay(int monthsBack, int day, {int hour = 12}) {
      final target = DateTime(current.year, current.month - monthsBack, 1);
      final maxDay = DateTime(target.year, target.month + 1, 0).day;
      return DateTime(target.year, target.month, min(day, maxDay), hour);
    }

    _wallets = [
      const WalletCardModel(
        id: 'vcb',
        name: 'Vietcombank',
        bankCode: 'VCB',
        accountMask: '•• 8821',
        subtitle: 'Tài khoản lương',
        balance: 42150000,
        gradientColors: [0xFF0D9488, 0xFF064E3B],
        iconKey: 'bank_vcb',
      ),
      const WalletCardModel(
        id: 'tcb',
        name: 'Techcombank',
        bankCode: 'TCB',
        accountMask: '•• 4019',
        subtitle: 'Thẻ chi tiêu chính',
        balance: 18500000,
        gradientColors: [0xFFBE123C, 0xFF312E81],
        iconKey: 'bank_tcb',
      ),
      const WalletCardModel(
        id: 'momo',
        name: 'Ví MoMo',
        bankCode: 'MOMO',
        accountMask: '•• 0912',
        subtitle: 'Ví điện tử',
        balance: 4600000,
        gradientColors: [0xFFC026D3, 0xFF4C1D95],
        iconKey: 'momo',
      ),
      const WalletCardModel(
        id: 'cash',
        name: 'Tiền mặt',
        bankCode: 'CASH',
        accountMask: 'Ví túi',
        subtitle: 'Tiêu vặt hằng ngày',
        balance: 3200000,
        gradientColors: [0xFFD97706, 0xFF334155],
        iconKey: 'cash',
      ),
    ];

    _budgets = {
      for (final c in kDefaultCategories)
        if (c.kind == TxKind.expense && c.defaultBudget > 0) c.id: c.defaultBudget,
    };

    _transactions = [
      FinTx(
        id: 'seed-1',
        kind: TxKind.expense,
        amount: 69000,
        categoryId: 'coffee',
        walletId: 'momo',
        note: 'Highlands Coffee sáng',
        timestamp: DateTime(current.year, current.month, current.day, 8, 35),
        source: TxSource.quick,
      ),
      FinTx(
        id: 'seed-2',
        kind: TxKind.expense,
        amount: 55000,
        categoryId: 'food',
        walletId: 'cash',
        note: 'Phở bò đặc biệt',
        timestamp: DateTime(current.year, current.month, current.day, 7, 45),
        source: TxSource.voice,
      ),
      FinTx(
        id: 'seed-3',
        kind: TxKind.expense,
        amount: 340000,
        categoryId: 'food',
        walletId: 'tcb',
        note: 'Bách Hóa Xanh cuối tuần',
        timestamp: current.subtract(const Duration(days: 1, hours: 3)),
        source: TxSource.bill,
      ),
      FinTx(
        id: 'seed-4',
        kind: TxKind.expense,
        amount: 88000,
        categoryId: 'transport',
        walletId: 'momo',
        note: 'GrabCar đi gặp đối tác',
        timestamp: current.subtract(const Duration(days: 1, hours: 7)),
      ),
      FinTx(
        id: 'seed-5',
        kind: TxKind.transfer,
        amount: 2000000,
        categoryId: 'transfer',
        walletId: 'vcb',
        toWalletId: 'momo',
        note: 'Nạp ví MoMo chi tiêu',
        timestamp: current.subtract(const Duration(days: 2, hours: 2)),
      ),
      FinTx(
        id: 'seed-6',
        kind: TxKind.expense,
        amount: 650000,
        categoryId: 'shopping',
        walletId: 'tcb',
        note: 'Uniqlo áo polo & phụ kiện',
        timestamp: current.subtract(const Duration(days: 2, hours: 6)),
      ),
      FinTx(
        id: 'seed-7',
        kind: TxKind.expense,
        amount: 280000,
        categoryId: 'fun',
        walletId: 'momo',
        note: 'Vé xem phim CGV & bắp nước',
        timestamp: current.subtract(const Duration(days: 3, hours: 4)),
      ),
      FinTx(
        id: 'seed-8',
        kind: TxKind.expense,
        amount: 420000,
        categoryId: 'food',
        walletId: 'tcb',
        note: 'Lẩu nướng cùng nhóm bạn',
        timestamp: current.subtract(const Duration(days: 4, hours: 5)),
      ),
      FinTx(
        id: 'seed-9',
        kind: TxKind.expense,
        amount: 165000,
        categoryId: 'coffee',
        walletId: 'cash',
        note: 'Cà phê & làm việc ngoài quán',
        timestamp: current.subtract(const Duration(days: 5, hours: 3)),
      ),
      FinTx(
        id: 'seed-10',
        kind: TxKind.expense,
        amount: 510000,
        categoryId: 'health',
        walletId: 'tcb',
        note: 'Gia hạn phòng tập gym',
        timestamp: current.subtract(const Duration(days: 6, hours: 2)),
      ),
      FinTx(
        id: 'seed-11',
        kind: TxKind.income,
        amount: 28000000,
        categoryId: 'salary',
        walletId: 'vcb',
        note: 'Lương chính tháng này',
        timestamp: sameMonthDay(5, hour: 9, minute: 15),
      ),
      FinTx(
        id: 'seed-12',
        kind: TxKind.income,
        amount: 4500000,
        categoryId: 'bonus',
        walletId: 'tcb',
        note: 'Thưởng dự án UI Fintech',
        timestamp: sameMonthDay(6, hour: 16, minute: 20),
      ),
      FinTx(
        id: 'seed-13',
        kind: TxKind.expense,
        amount: 3500000,
        categoryId: 'home',
        walletId: 'vcb',
        note: 'Tiền nhà & phí dịch vụ',
        timestamp: sameMonthDay(2, hour: 10, minute: 30),
      ),
      FinTx(
        id: 'seed-14',
        kind: TxKind.expense,
        amount: 850000,
        categoryId: 'bills',
        walletId: 'vcb',
        note: 'Điện lực EVN & Internet FPT',
        timestamp: sameMonthDay(3, hour: 14, minute: 10),
        source: TxSource.bill,
      ),
      // Prior 5 months history for crisp 6-month cashflow curve
      FinTx(
        id: 'hist-1in',
        kind: TxKind.income,
        amount: 28500000,
        categoryId: 'salary',
        walletId: 'vcb',
        note: 'Lương tháng trước',
        timestamp: prevMonthDay(1, 5),
      ),
      FinTx(
        id: 'hist-1out',
        kind: TxKind.expense,
        amount: 11200000,
        categoryId: 'food',
        walletId: 'tcb',
        note: 'Tổng hợp chi tháng trước',
        timestamp: prevMonthDay(1, 18),
      ),
      FinTx(
        id: 'hist-2in',
        kind: TxKind.income,
        amount: 26000000,
        categoryId: 'salary',
        walletId: 'vcb',
        note: 'Thu nhập tháng -2',
        timestamp: prevMonthDay(2, 5),
      ),
      FinTx(
        id: 'hist-2out',
        kind: TxKind.expense,
        amount: 13400000,
        categoryId: 'shopping',
        walletId: 'tcb',
        note: 'Chi tiêu tháng -2',
        timestamp: prevMonthDay(2, 16),
      ),
      FinTx(
        id: 'hist-3in',
        kind: TxKind.income,
        amount: 30500000,
        categoryId: 'salary',
        walletId: 'vcb',
        note: 'Lương & thưởng tháng -3',
        timestamp: prevMonthDay(3, 6),
      ),
      FinTx(
        id: 'hist-3out',
        kind: TxKind.expense,
        amount: 9800000,
        categoryId: 'home',
        walletId: 'vcb',
        note: 'Chi tiêu tháng -3',
        timestamp: prevMonthDay(3, 14),
      ),
      FinTx(
        id: 'hist-4in',
        kind: TxKind.income,
        amount: 25000000,
        categoryId: 'salary',
        walletId: 'vcb',
        note: 'Lương tháng -4',
        timestamp: prevMonthDay(4, 5),
      ),
      FinTx(
        id: 'hist-4out',
        kind: TxKind.expense,
        amount: 12100000,
        categoryId: 'food',
        walletId: 'momo',
        note: 'Chi tiêu tháng -4',
        timestamp: prevMonthDay(4, 15),
      ),
      FinTx(
        id: 'hist-5in',
        kind: TxKind.income,
        amount: 24500000,
        categoryId: 'salary',
        walletId: 'vcb',
        note: 'Lương tháng -5',
        timestamp: prevMonthDay(5, 5),
      ),
      FinTx(
        id: 'hist-5out',
        kind: TxKind.expense,
        amount: 10500000,
        categoryId: 'bills',
        walletId: 'vcb',
        note: 'Chi tiêu tháng -5',
        timestamp: prevMonthDay(5, 19),
      ),
    ]..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  WalletCardModel walletById(String id) {
    for (final w in _wallets) {
      if (w.id == id) return w;
    }
    return _wallets.first;
  }

  int get totalBalance => _wallets.fold(0, (sum, w) => sum + w.balance);

  int get monthIncome {
    final c = now;
    return _transactions
        .where((t) =>
            t.kind == TxKind.income &&
            t.timestamp.year == c.year &&
            t.timestamp.month == c.month)
        .fold(0, (sum, t) => sum + t.amount);
  }

  int get monthExpense {
    final c = now;
    return _transactions
        .where((t) =>
            t.kind == TxKind.expense &&
            t.timestamp.year == c.year &&
            t.timestamp.month == c.month)
        .fold(0, (sum, t) => sum + t.amount);
  }

  int get totalMonthlyBudget => _budgets.values.fold(0, (sum, v) => sum + v);

  double get budgetUsageRatio {
    final budget = totalMonthlyBudget;
    if (budget <= 0) return 0;
    return (monthExpense / budget).clamp(0.0, 2.0);
  }

  Map<String, int> categorySpendBreakdown({int? daysBack}) {
    final c = now;
    final cutoff = daysBack != null
        ? DateTime(c.year, c.month, c.day).subtract(Duration(days: daysBack - 1))
        : DateTime(c.year, c.month, 1);

    final map = <String, int>{};
    for (final tx in _transactions) {
      if (tx.kind != TxKind.expense) continue;
      if (tx.timestamp.isBefore(cutoff)) continue;
      map[tx.categoryId] = (map[tx.categoryId] ?? 0) + tx.amount;
    }
    final sorted = map.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return {for (final e in sorted) e.key: e.value};
  }

  List<DailySpendPoint> sevenDayExpenses() {
    final c = now;
    const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    final todayStart = DateTime(c.year, c.month, c.day);
    final result = <DailySpendPoint>[];
    for (var offset = 6; offset >= 0; offset--) {
      final day = todayStart.subtract(Duration(days: offset));
      final total = _transactions
          .where((t) =>
              t.kind == TxKind.expense &&
              t.timestamp.year == day.year &&
              t.timestamp.month == day.month &&
              t.timestamp.day == day.day)
          .fold(0, (sum, t) => sum + t.amount);
      result.add(
        DailySpendPoint(
          label: weekdayLabels[day.weekday - 1],
          amount: total,
          isToday: offset == 0,
        ),
      );
    }
    return result;
  }

  List<MonthlyFlowPoint> sixMonthCashflow() {
    final c = now;
    final points = <MonthlyFlowPoint>[];
    for (var i = 5; i >= 0; i--) {
      final m = DateTime(c.year, c.month - i, 1);
      final income = _transactions
          .where((t) =>
              t.kind == TxKind.income &&
              t.timestamp.year == m.year &&
              t.timestamp.month == m.month)
          .fold(0, (s, t) => s + t.amount);
      final expense = _transactions
          .where((t) =>
              t.kind == TxKind.expense &&
              t.timestamp.year == m.year &&
              t.timestamp.month == m.month)
          .fold(0, (s, t) => s + t.amount);
      points.add(
        MonthlyFlowPoint(
          monthLabel: 'T${m.month}',
          income: income,
          expense: expense,
        ),
      );
    }
    return points;
  }

  List<FinTx> transactionsForWallet(String? walletId) {
    if (walletId == null) return transactions;
    return _transactions
        .where((t) => t.walletId == walletId || t.toWalletId == walletId)
        .toList();
  }

  Future<void> addTransaction(FinTx tx) async {
    _transactions = [tx, ..._transactions]
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    _applyBalanceDelta(tx, reverse: false);
    notifyListeners();
    await _save();
  }

  Future<void> deleteTransaction(String id) async {
    final idx = _transactions.indexWhere((t) => t.id == id);
    if (idx < 0) return;
    final removed = _transactions[idx];
    _transactions = [..._transactions]..removeAt(idx);
    _applyBalanceDelta(removed, reverse: true);
    notifyListeners();
    await _save();
  }

  void _applyBalanceDelta(FinTx tx, {required bool reverse}) {
    final sign = reverse ? -1 : 1;
    _wallets = _wallets.map((w) {
      if (tx.kind == TxKind.expense && w.id == tx.walletId) {
        return w.copyWith(balance: w.balance - sign * tx.amount);
      }
      if (tx.kind == TxKind.income && w.id == tx.walletId) {
        return w.copyWith(balance: w.balance + sign * tx.amount);
      }
      if (tx.kind == TxKind.transfer) {
        if (w.id == tx.walletId) {
          return w.copyWith(balance: w.balance - sign * tx.amount);
        }
        if (w.id == tx.toWalletId) {
          return w.copyWith(balance: w.balance + sign * tx.amount);
        }
      }
      return w;
    }).toList();
  }

  Future<void> adjustWalletBalance(String walletId, int newBalance) async {
    _wallets = _wallets
        .map((w) => w.id == walletId ? w.copyWith(balance: newBalance) : w)
        .toList();
    notifyListeners();
    await _save();
  }

  Future<void> addWallet(WalletCardModel wallet) async {
    _wallets = [..._wallets, wallet];
    notifyListeners();
    await _save();
  }

  Future<void> updateBudget(String categoryId, int amount) async {
    _budgets = {..._budgets, categoryId: amount};
    notifyListeners();
    await _save();
  }

  Future<void> toggleHideBalance() async {
    _hideBalance = !_hideBalance;
    notifyListeners();
    await _save();
  }

  Future<void> resetToDemoSeed() async {
    _seedInitialState();
    notifyListeners();
    await _save();
  }

  Future<void> _save() async {
    if (!_persist) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final payload = jsonEncode({
        'hideBalance': _hideBalance,
        'wallets': _wallets.map((w) => w.toJson()).toList(),
        'transactions': _transactions.map((t) => t.toJson()).toList(),
        'budgets': _budgets,
      });
      await prefs.setString(_kStorageKey, payload);
    } catch (_) {
      // Best-effort persistence
    }
  }
}
