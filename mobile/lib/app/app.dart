import 'package:flutter/material.dart';

import '../data/neon/auth_client.dart';
import '../data/neon/data_api.dart';
import '../data/neon/neon_config.dart';
import '../data/neon/real_store.dart';
import '../data/session_store.dart';
import '../domain/models.dart';
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

  _Gate _gate = _Gate.booting;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final token = await SessionStore.read();
    if (token != null) {
      final session = await _auth.restoreSession(token);
      if (session != null) {
        setState(() => _gate = _Gate.signedIn);
        return;
      }
      await SessionStore.clear();
    }
    setState(() => _gate = _Gate.login);
  }

  Future<void> _onSignedIn(_) async {
    final token = _auth.session?.sessionToken;
    if (token != null) await SessionStore.write(token);
    setState(() => _gate = _Gate.signedIn);
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
      _Gate.signedIn => DashboardPage(
        loadAccounts: _store.loadAccounts,
        loadTransactions: _store.loadTransactions,
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
            label: 'Đăng xuất',
            icon: Icons.logout,
            onTap: _signOut,
          ),
        ],
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
          onSubmit: (intent) async {
            if (intent.kind == TransactionKind.transfer) {
              await store.createTransfer(
                sourceAccountId: intent.accountId,
                destinationAccountId: intent.destinationAccountId!,
                amount: intent.amount,
                occurredOn: intent.occurredOn,
                note: intent.note,
                idempotencyKey: intent.idempotencyKey,
              );
            } else {
              await store.createTransaction(
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
          },
        );
      },
    );
  }
}
