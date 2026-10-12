import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/neon/auth_client.dart';
import '../data/neon/data_api.dart';
import '../data/neon/neon_config.dart';
import '../data/neon/real_store.dart';
import '../data/notifications.dart';
import '../data/offline_cache.dart';
import '../data/session_store.dart';
import '../data/share/share_intent.dart';
import '../data/share/share_text_parser.dart';
import '../domain/models.dart';
import 'biometric_lock.dart';
import '../features/accounts/accounts_page.dart';
import '../features/activity/activity_page.dart';
import '../data/demo_store.dart';
import '../features/auth/login_page.dart';
import '../features/capture/capture_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/planning/planning_page.dart';
import '../features/reports/reports_page.dart';

/// MoneyFlow brand tokens (from src/app/manifest.ts).
const kBrandColor = Color(0xFF0EA5E9);
const kBrandBackground = Color(0xFFF8FAFC);

class MoneyFlowApp extends StatelessWidget {
  const MoneyFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MoneyFlow',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: kBrandColor,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: kBrandBackground,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: kBrandColor,
          brightness: Brightness.dark,
        ),
      ),
      home: const AuthGate(),
    );
  }
}

/// Startup auth state: restore persisted session → dashboard, else login.
/// Demo mode remains reachable from the login screen for offline exploration.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

enum _Gate { booting, login, signedIn, demo }

class _AuthGateState extends State<AuthGate> {
  final _config = NeonConfig.fromEnvironment();
  late final _auth = NeonAuthClient(config: _config);
  late final _store = RealStore(NeonDataApi(config: _config, auth: _auth));
  final _bioService = DeviceBiometricService();
  final _shareReceiver = const ShareIntentReceiver();

  _Gate _gate = _Gate.booting;
  bool _bioEnabled = false;
  OfflineCache? _offline;
  StreamSubscription<String>? _shareSub;

  /// A share that arrived before sign-in — drained once the dashboard is
  /// reachable so the prefill isn't lost behind the login screen.
  SharedTextPrefill? _pendingPrefill;

  @override
  void initState() {
    super.initState();
    _restore();
    _initShare();
    // Reminder setup is best-effort — a denied notification permission
    // must not block app startup.
    unawaited(NotificationService.init().catchError((_) {}));
  }

  @override
  void dispose() {
    _shareSub?.cancel();
    super.dispose();
  }

  Future<void> _restore() async {
    _bioEnabled = await BiometricPrefs.loadBiometricEnabled();
    _offline = OfflineCache(await SharedPreferences.getInstance());
    final token = await SessionStore.read();
    if (token != null) {
      try {
        final session = await _auth.restoreSession(token);
        if (session != null) {
          setState(() => _gate = _Gate.signedIn);
          _drainPendingShare();
          return;
        }
      } on SocketException {
        return _restoreOffline();
      } on HttpException {
        return _restoreOffline();
      } on TimeoutException {
        return _restoreOffline();
      }
      await SessionStore.clear();
    }
    setState(() => _gate = _Gate.login);
  }

  /// The stored token couldn't be validated because the network is down —
  /// trust it anyway and let the dashboard render its cached snapshot under
  /// the stale label. The JWT refresh path re-validates lazily on the next
  /// request once connectivity returns; an upstream 401 still signs out.
  void _restoreOffline() {
    setState(() => _gate = _Gate.signedIn);
    _drainPendingShare();
  }

  void _initShare() {
    _shareReceiver.consumeInitialShare().then((text) {
      if (text != null) _onSharedText(text);
    });
    _shareSub = _shareReceiver.stream().listen(_onSharedText);
  }

  /// Shared text only ever pre-fills the capture form — review stays
  /// manual, so a shared SMS can never silently mutate the ledger.
  void _onSharedText(String text) {
    final prefill = parseSharedText(text);
    if (prefill == null || !mounted) return;
    if (_gate == _Gate.signedIn) {
      _openSharedCapture(prefill);
    } else {
      _pendingPrefill = prefill;
    }
  }

  void _drainPendingShare() {
    final prefill = _pendingPrefill;
    if (prefill == null) return;
    _pendingPrefill = null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _gate == _Gate.signedIn) _openSharedCapture(prefill);
    });
  }

  Future<void> _openSharedCapture(SharedTextPrefill prefill) async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _SharedCaptureLoader(store: _store, prefill: prefill),
      ),
    );
  }

  Future<void> _onSignedIn(_) async {
    final token = _auth.session?.sessionToken;
    if (token != null) await SessionStore.write(token);
    setState(() => _gate = _Gate.signedIn);
    _drainPendingShare();
  }

  Future<void> _toggleBiometric() async {
    if (!_bioEnabled) {
      // Prove an unlock path before arming the lock — the platform can
      // report supported hardware with no credential enrolled, and arming
      // then would strand the user on a lock screen they can never pass.
      final ok = await _bioService
          .authenticate(reason: 'Bật khóa MoneyFlow')
          .catchError((_) => false);
      if (!mounted) return;
      if (!ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không xác thực được — chưa bật khóa')),
        );
        return;
      }
    }
    final enabled = !_bioEnabled;
    await BiometricPrefs.saveBiometricEnabled(enabled);
    setState(() => _bioEnabled = enabled);
  }

  Future<void> _signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {
      /* upstream sign-out failure still logs out locally */
    }
    await SessionStore.clear();
    setState(() => _gate = _Gate.login);
  }

  @override
  Widget build(BuildContext context) {
    return switch (_gate) {
      _Gate.booting => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      _Gate.login => LoginPage(
        auth: _auth,
        onSignedIn: _onSignedIn,
        onDemo: () => setState(() => _gate = _Gate.demo),
      ),
      _Gate.demo => _demoDashboard(context),
      _Gate.signedIn => BiometricGate(
        enabled: _bioEnabled,
        service: _bioService,
        child: DashboardPage(
          loadAccounts: _store.loadAccounts,
          loadTransactions: _store.loadTransactions,
          readSnapshot: () => _offline?.readDashboard(),
          writeSnapshot: (snap) =>
              _offline?.saveDashboard(snap) ?? Future.value(),
          captureBuilder: (accounts) => _CaptureLoader(
            accounts: accounts,
            categories: _store.loadCategories(),
            store: _store,
          ),
          onShowActivity: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ActivityPage(
                loadTransactions: _store.loadTransactions,
                onDelete: _store.deleteTransaction,
              ),
            ),
          ),
          menuItems: [
            DashboardMenuItem(
              label: 'Tài khoản',
              icon: Icons.account_balance_wallet,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => AccountsPage(
                    loadAccounts: _store.loadAccounts,
                    onCreate: (name, kind, bal) => _store
                        .createAccount(
                          name: name,
                          kind: kind,
                          initialBalance: bal,
                        )
                        .then((_) {}),
                    onArchive: _store.setAccountArchived,
                  ),
                ),
              ),
            ),
            DashboardMenuItem(
              label: 'Kế hoạch',
              icon: Icons.event_note,
              onTap: () => Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => _planningPage())),
            ),
            DashboardMenuItem(
              label: 'Báo cáo',
              icon: Icons.bar_chart,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) =>
                      ReportsPage(loadTransactions: _store.loadTransactions),
                ),
              ),
            ),
            DashboardMenuItem(
              label: _bioEnabled ? 'Tắt khóa sinh trắc' : 'Bật khóa sinh trắc',
              icon: _bioEnabled ? Icons.fingerprint : Icons.lock_open,
              onTap: _toggleBiometric,
            ),
            DashboardMenuItem(
              label: 'Đăng xuất',
              icon: Icons.logout,
              onTap: _signOut,
            ),
          ],
        ),
      ),
    };
  }

  /// Demo keeps the same surfaces on seed data; writes are honest no-ops so
  /// read-only exploration still works fully offline.
  DashboardPage _demoDashboard(BuildContext context) {
    String monthStart() {
      final n = DateTime.now();
      return '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
    }

    return DashboardPage(
      loadAccounts: () async => DemoStore.seedAccounts(),
      loadTransactions: () async => DemoStore.seedTransactions(),
      modeLabel: 'demo',
      menuItems: [
        DashboardMenuItem(
          label: 'Kế hoạch',
          icon: Icons.event_note,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => PlanningPage(
                loadData: () async => PlanningData(
                  budgets: DemoStore.seedBudgets(monthStart()),
                  commitments: DemoStore.seedCommitments(),
                  goals: DemoStore.seedGoals(),
                  accounts: DemoStore.seedAccounts(),
                  categories: DemoStore.seedCategories(),
                  monthStart: monthStart(),
                ),
                actions: _noopPlanningActions,
              ),
            ),
          ),
        ),
        DashboardMenuItem(
          label: 'Báo cáo',
          icon: Icons.bar_chart,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ReportsPage(
                loadTransactions: () async => DemoStore.seedTransactions(),
              ),
            ),
          ),
        ),
        DashboardMenuItem(
          label: 'Đăng xuất',
          icon: Icons.logout,
          onTap: () => setState(() => _gate = _Gate.login),
        ),
      ],
    );
  }

  static final _noopPlanningActions = PlanningActions(
    onBudgetCreate: (_, _) async {},
    onBudgetDelete: (_) async {},
    onCommitmentCreate: (_, _, _, _, _) async {},
    onCommitmentPay: (_) async {},
    onCommitmentArchive: (_) async {},
    onGoalCreate: (_, _, _) async {},
    onGoalAdjust: (_, _) async {},
    onGoalArchive: (_) async {},
  );

  /// First of the current month — the planning RPC window boundary.
  static String _monthStart() {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
  }

  static String _today() {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
  }

  PlanningPage _planningPage() => PlanningPage(
    loadData: () async {
      final monthStart = _monthStart();
      final results = await Future.wait([
        _store.loadBudgets(monthStart),
        _store.loadCommitments(monthStart),
        _store.loadGoals(),
        _store.loadAccounts(),
        _store.loadCategories(),
      ]);
      // Reschedule due-day reminders against the just-fetched list —
      // archived commitments get cancelled inside the scheduler.
      unawaited(
        NotificationService.scheduleCommitmentReminders(
          results[1] as List<RecurringCommitment>,
        ).catchError((_) {}),
      );
      return PlanningData(
        budgets: results[0] as List<BudgetProgress>,
        commitments: results[1] as List<RecurringCommitment>,
        goals: results[2] as List<SavingsGoal>,
        accounts: results[3] as List<AccountSummary>,
        categories: results[4] as List<Category>,
        monthStart: monthStart,
      );
    },
    actions: PlanningActions(
      onBudgetCreate: (categoryId, limit) => _store
          .upsertBudget(
            categoryId: categoryId,
            monthStart: _monthStart(),
            limitMinor: limit,
          )
          .then((_) {}),
      onBudgetDelete: _store.deleteBudget,
      onCommitmentCreate: (name, amount, day, accountId, categoryId) => _store
          .upsertCommitment(
            name: name,
            amountMinor: amount,
            dueDay: day,
            accountId: accountId,
            categoryId: categoryId,
          )
          .then((_) {}),
      onCommitmentPay: (c) => _store
          .payCommitment(
            commitmentId: c.id,
            monthStart: _monthStart(),
            paidOn: _today(),
            idempotencyKey: newIdempotencyKey(),
          )
          .then((_) {}),
      onCommitmentArchive: (id) => _store.setCommitmentArchived(id, true),
      onGoalCreate: (name, target, deadline) => _store
          .upsertGoal(name: name, targetMinor: target, deadline: deadline)
          .then((_) {}),
      onGoalAdjust: _store.adjustGoal,
      onGoalArchive: (id) => _store.setGoalArchived(id, true),
    ),
  );
}

/// Loads categories before showing the capture form (form needs them for
/// expense/income; transfers skip categories server-side anyway).
class _CaptureLoader extends StatelessWidget {
  const _CaptureLoader({
    required this.accounts,
    required this.categories,
    required this.store,
  });

  final List<dynamic> accounts;
  final Future<List<dynamic>> categories;
  final RealStore store;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: categories,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return CapturePage(
          accounts: accounts.cast(),
          categories: snap.data!.cast(),
          onSubmit: (intent) => _submitCaptureIntent(store, intent),
        );
      },
    );
  }
}

/// Share-receive entry — accounts/categories are fetched on demand because
/// a share can arrive before the dashboard has loaded anything.
class _SharedCaptureLoader extends StatelessWidget {
  const _SharedCaptureLoader({required this.store, required this.prefill});

  final RealStore store;
  final SharedTextPrefill prefill;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: Future.wait([store.loadAccounts(), store.loadCategories()]),
      builder: (context, snap) {
        if (snap.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Ghi khoản')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Không tải được dữ liệu — thử lại khi có mạng',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ),
          );
        }
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return CapturePage(
          accounts: snap.data![0].cast(),
          categories: snap.data![1].cast(),
          prefill: prefill,
          onSubmit: (intent) => _submitCaptureIntent(store, intent),
        );
      },
    );
  }
}

/// One submit path for every capture surface — transaction vs transfer
/// routes to the matching RPC; the intent's idempotency key guards replays.
Future<void> _submitCaptureIntent(RealStore store, CaptureIntent intent) {
  if (intent.kind == TransactionKind.transfer) {
    return store.createTransfer(
      sourceAccountId: intent.accountId,
      destinationAccountId: intent.destinationAccountId!,
      amount: intent.amount,
      occurredOn: intent.occurredOn,
      note: intent.note,
      idempotencyKey: intent.idempotencyKey,
    );
  }
  return store.createTransaction(
    accountId: intent.accountId,
    categoryId: intent.categoryId!,
    kind: intent.kind,
    amount: intent.amount,
    occurredOn: intent.occurredOn,
    note: intent.note,
    payee: intent.payee,
    idempotencyKey: intent.idempotencyKey,
  );
}
