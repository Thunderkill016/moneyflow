import 'package:flutter/material.dart';

import '../data/neon/auth_client.dart';
import '../data/neon/data_api.dart';
import '../data/neon/neon_config.dart';
import '../data/neon/real_store.dart';
import '../data/session_store.dart';
import '../features/auth/login_page.dart';
import '../features/dashboard/dashboard_page.dart';

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
    } catch (_) {/* upstream sign-out failure still logs out locally */}
    await SessionStore.clear();
    setState(() => _gate = _Gate.login);
  }

  @override
  Widget build(BuildContext context) {
    return switch (_gate) {
      _Gate.booting =>
        const Scaffold(body: Center(child: CircularProgressIndicator())),
      _Gate.login => LoginPage(
          auth: _auth,
          onSignedIn: _onSignedIn,
          onDemo: () => setState(() => _gate = _Gate.demo),
        ),
      _Gate.demo => DashboardPage.demo(
          onSignOut: () => setState(() => _gate = _Gate.login)),
      _Gate.signedIn => DashboardPage(
          loadAccounts: _store.loadAccounts,
          loadTransactions: _store.loadTransactions,
          onSignOut: _signOut,
        ),
    };
  }
}
