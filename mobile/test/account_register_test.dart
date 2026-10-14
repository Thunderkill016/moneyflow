import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/money.dart';
import 'package:moneyflow/domain/register.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/accounts/account_register_page.dart';

const _account = AccountSummary(
  id: 'a1',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 2000000,
  balance: 11098000,
);

Transaction _tx(
  String id,
  TransactionKind kind,
  int amount,
  String day, {
  String accountId = 'a1',
  String account = 'Tiền mặt',
  String? destinationAccountId,
  String? destinationAccount,
  String note = '',
  int splitCount = 0,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: kind == TransactionKind.transfer ? 'cat-transfer' : 'cat-food',
  category: kind == TransactionKind.transfer ? 'Chuyển khoản' : 'Ăn uống',
  note: note.isEmpty ? id : note,
  accountId: accountId,
  account: account,
  amount: amount,
  occurredOn: day,
  destinationAccountId: destinationAccountId,
  destinationAccount: destinationAccount,
  splitCount: splitCount,
);

void main() {
  group('accountTransactionImpact', () {
    test('expense leaves, income enters — both from the account side', () {
      final out = accountTransactionImpact(
        _tx('e', TransactionKind.expense, 45000, '2026-10-12'),
        'a1',
      )!;
      expect(out.impact, -45000);
      expect(out.direction, RegisterDirection.outflow);

      final in_ = accountTransactionImpact(
        _tx('i', TransactionKind.income, 15000000, '2026-10-10'),
        'a1',
      )!;
      expect(in_.impact, 15000000);
      expect(in_.direction, RegisterDirection.inflow);
    });

    test('transfer signs by which side the account is on', () {
      final t = _tx(
        't',
        TransactionKind.transfer,
        500000,
        '2026-10-09',
        destinationAccountId: 'a2',
        destinationAccount: 'VCB',
      );
      final source = accountTransactionImpact(t, 'a1')!;
      expect(source.impact, -500000);
      expect(source.direction, RegisterDirection.outflow);
      expect(source.transferCounterparty, 'VCB');

      final dest = accountTransactionImpact(t, 'a2')!;
      expect(dest.impact, 500000);
      expect(dest.direction, RegisterDirection.inflow);
      expect(dest.transferCounterparty, 'Tiền mặt');
    });

    test('unrelated, self-transfer and non-positive rows carry no impact', () {
      expect(
        accountTransactionImpact(
          _tx(
            'u',
            TransactionKind.expense,
            1000,
            '2026-10-01',
            accountId: 'other',
          ),
          'a1',
        ),
        isNull,
      );
      // A transfer whose legs name the same account is structurally
      // ambiguous — never invent a movement.
      expect(
        accountTransactionImpact(
          _tx(
            'self',
            TransactionKind.transfer,
            1000,
            '2026-10-01',
            destinationAccountId: 'a1',
          ),
          'a1',
        ),
        isNull,
      );
      expect(
        accountTransactionImpact(
          _tx('zero', TransactionKind.expense, 0, '2026-10-01'),
          'a1',
        ),
        isNull,
      );
    });
  });

  group('buildAccountRegister', () {
    test('empty ledger has no entries', () {
      expect(
        buildAccountRegister(
          currentBalance: 500000,
          accountId: 'a1',
          newestFirst: const [],
        ),
        isEmpty,
      );
    });

    test(
      'first row balanceAfter IS the current balance; chain walks backward',
      () {
        // newest → oldest: expense −45k, income +15tr, transfer-out −500k
        final rows = [
          _tx('e', TransactionKind.expense, 45000, '2026-10-12'),
          _tx('i', TransactionKind.income, 15000000, '2026-10-10'),
          _tx(
            't',
            TransactionKind.transfer,
            500000,
            '2026-10-09',
            destinationAccountId: 'a2',
            destinationAccount: 'VCB',
          ),
        ];
        final entries = buildAccountRegister(
          currentBalance: _account.balance,
          accountId: 'a1',
          newestFirst: rows,
        );
        expect(entries, hasLength(3));
        // The anchor invariant.
        expect(entries[0].balanceAfter, _account.balance);
        // Before the expense: 11098000 + 45000.
        expect(entries[1].balanceAfter, 11098000 + 45000);
        // Before the income: 11143000 − 15000000.
        expect(entries[2].balanceAfter, 11143000 - 15000000);
        // Sanity: balance before the oldest row = initial + nothing else.
        expect(
          entries.last.balanceAfter - entries.last.impact,
          _account.balance - (15000000 - 500000 - 45000),
        );
      },
    );

    test('transfer-in raises the running balance of older rows', () {
      final rows = [
        _tx(
          'tin',
          TransactionKind.transfer,
          500000,
          '2026-10-09',
          accountId: 'a2',
          account: 'VCB',
          destinationAccountId: 'a1',
          destinationAccount: 'Tiền mặt',
        ),
        _tx('e', TransactionKind.expense, 45000, '2026-10-08'),
      ];
      final entries = buildAccountRegister(
        currentBalance: 3000000,
        accountId: 'a1',
        newestFirst: rows,
      );
      expect(entries[0].impact, 500000);
      expect(entries[0].balanceAfter, 3000000);
      // Before the inflow the account held 500k less.
      expect(entries[1].balanceAfter, 2500000);
    });

    test('a split expense moves its whole amount, not per-line pieces', () {
      final rows = [
        _tx('s', TransactionKind.expense, 70000, '2026-10-12', splitCount: 2),
      ];
      final entries = buildAccountRegister(
        currentBalance: 1000000,
        accountId: 'a1',
        newestFirst: rows,
      );
      expect(entries.single.impact, -70000);
      expect(entries.single.balanceAfter, 1000000);
    });

    test('rows that never touch the account are skipped, not zeroed', () {
      final rows = [
        _tx(
          'u',
          TransactionKind.expense,
          1000,
          '2026-10-11',
          accountId: 'other',
        ),
        _tx('e', TransactionKind.expense, 45000, '2026-10-10'),
      ];
      final entries = buildAccountRegister(
        currentBalance: 955000,
        accountId: 'a1',
        newestFirst: rows,
      );
      expect(entries, hasLength(1));
      expect(entries.single.balanceAfter, 955000);
    });

    test('chain continues across pages — a later page keeps subtracting', () {
      // Six rows on one account, paged 4 + 2 through the same loader the
      // page uses: the second page's balances must equal what an
      // unpaged walk computes.
      final all = [
        _tx('r1', TransactionKind.expense, 10000, '2026-10-12'),
        _tx('r2', TransactionKind.income, 200000, '2026-10-11'),
        _tx('r3', TransactionKind.expense, 30000, '2026-10-10'),
        _tx(
          'r4',
          TransactionKind.transfer,
          40000,
          '2026-10-09',
          destinationAccountId: 'a2',
        ),
        _tx('r5', TransactionKind.expense, 50000, '2026-10-08'),
        _tx('r6', TransactionKind.income, 60000, '2026-10-07'),
      ];
      final loader = inMemoryPageLoader(all, pageSize: 4);
      const query = TransactionQuery(accountId: 'a1');
      return loader(query, offset: 0).then((p1) {
        expect(p1.rows, hasLength(4));
        expect(p1.hasMore, isTrue);
        return loader(query, offset: p1.rows.length).then((p2) {
          expect(p2.rows, hasLength(2));
          expect(p2.hasMore, isFalse);
          final paged = [...p1.rows, ...p2.rows];
          const balance = 1000000;
          final whole = buildAccountRegister(
            currentBalance: balance,
            accountId: 'a1',
            newestFirst: all,
          );
          final chained = buildAccountRegister(
            currentBalance: balance,
            accountId: 'a1',
            newestFirst: paged,
          );
          for (var i = 0; i < whole.length; i++) {
            expect(chained[i].balanceAfter, whole[i].balanceAfter);
          }
          expect(chained.first.balanceAfter, balance);
          // Page boundary row: r4 balance = balance − (r1+r2+r3 impacts).
          expect(chained[3].balanceAfter, balance - (-10000 + 200000 - 30000));
        });
      });
    });

    test('demo seeds reconcile — first row balance equals stored balance', () {
      // Seed balances are the anchor snapshot; walking backward from them
      // reproduces every row's balance-after with no drift.
      final seeds = DemoStore.seedTransactions();
      for (final account in DemoStore.seedAccounts()) {
        final rows = [
          for (final tx in seeds)
            if (TransactionQuery(accountId: account.id).matches(tx)) tx,
        ]..sort((a, b) => b.occurredOn.compareTo(a.occurredOn));
        final entries = buildAccountRegister(
          currentBalance: account.balance,
          accountId: account.id,
          newestFirst: rows,
        );
        if (entries.isNotEmpty) {
          expect(entries.first.balanceAfter, account.balance);
        }
      }
      // Known seed math: MoMo received 500k then spent 32k — walking back
      // from the stored 580k, the older expense row sits at 80k, and
      // the net-worth trend seed's second top-up lands at 112k.
      final momo = buildAccountRegister(
        currentBalance: 580000,
        accountId: 'acc-momo',
        newestFirst: [
          for (final tx in seeds)
            if (tx.accountId == 'acc-momo' ||
                tx.destinationAccountId == 'acc-momo')
              tx,
        ],
      );
      expect(momo.map((e) => e.impact), [500000, -32000, 500000]);
      expect(momo[0].balanceAfter, 580000);
      expect(momo[1].balanceAfter, 80000);
      expect(momo[2].balanceAfter, 112000);
    });
  });

  group('AccountRegisterPage', () {
    Widget page(
      List<Transaction> txs, {
      AccountSummary account = _account,
      Future<void> Function(Transaction)? onEdit,
      Future<void> Function(String)? onDelete,
      Future<AccountSummary?> Function()? loadAccount,
      int pageSize = transactionPageSize,
    }) => MaterialApp(
      home: AccountRegisterPage(
        account: account,
        loadPage: inMemoryPageLoader(txs, pageSize: pageSize),
        onEdit: onEdit,
        onDelete: onDelete,
        loadAccount: loadAccount,
      ),
    );

    testWidgets(
      'header shows the honest current balance; first row repeats it',
      (t) async {
        await t.pumpWidget(
          page([_tx('e', TransactionKind.expense, 45000, '2026-10-12')]),
        );
        await t.pumpAndSettle();

        expect(find.text('Số dư hiện tại'), findsOneWidget);
        expect(find.text(formatMoney(_account.balance)), findsWidgets);
        // The newest row's running balance is the header balance itself.
        expect(
          find.text('Số dư ${formatMoney(_account.balance)}'),
          findsOneWidget,
        );
        expect(find.text('− ${formatMoney(45000)}'), findsOneWidget);
      },
    );

    testWidgets('transfer-out names the destination and signs negative', (
      t,
    ) async {
      await t.pumpWidget(
        page([
          _tx(
            't',
            TransactionKind.transfer,
            500000,
            '2026-10-09',
            destinationAccountId: 'a2',
            destinationAccount: 'VCB',
          ),
        ]),
      );
      await t.pumpAndSettle();
      expect(find.textContaining('Chuyển đến VCB'), findsOneWidget);
      // The web register's suffix — a transfer must never read as spend.
      expect(find.textContaining('không tính chi tiêu'), findsOneWidget);
      expect(find.text('− ${formatMoney(500000)}'), findsOneWidget);
    });

    testWidgets('the same transfer signs positive on the destination side', (
      t,
    ) async {
      const dest = AccountSummary(
        id: 'a2',
        name: 'VCB',
        kind: AccountKind.bank,
        currencyCode: 'VND',
        initialBalance: 0,
        balance: 8000000,
      );
      await t.pumpWidget(
        page([
          _tx(
            't',
            TransactionKind.transfer,
            500000,
            '2026-10-09',
            destinationAccountId: 'a2',
            destinationAccount: 'VCB',
          ),
        ], account: dest),
      );
      await t.pumpAndSettle();
      expect(find.textContaining('Nhận từ Tiền mặt'), findsOneWidget);
      expect(find.textContaining('không tính thu nhập'), findsOneWidget);
      expect(find.text('+ ${formatMoney(500000)}'), findsOneWidget);
    });

    testWidgets('an untouched account shows the empty state', (t) async {
      await t.pumpWidget(page(const []));
      await t.pumpAndSettle();
      expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
      expect(find.text('Số dư hiện tại'), findsOneWidget);
    });

    testWidgets('tap routes to edit; long-press confirms soft delete', (
      t,
    ) async {
      Transaction? edited;
      String? deleted;
      var loads = 0;
      await t.pumpWidget(
        MaterialApp(
          home: AccountRegisterPage(
            account: _account,
            loadPage: (q, {offset = 0}) async {
              loads++;
              return TransactionPage([
                _tx('e', TransactionKind.expense, 45000, '2026-10-12'),
              ], hasMore: false);
            },
            onEdit: (tx) async => edited = tx,
            onDelete: (id) async => deleted = id,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(loads, 1);

      await t.tap(find.text('e'));
      await t.pumpAndSettle();
      expect(edited?.id, 'e');
      expect(loads, 2); // reload keeps the chain anchored

      await t.longPress(find.text('e'));
      await t.pumpAndSettle();
      expect(find.text('Xóa giao dịch?'), findsOneWidget);
      await t.tap(find.text('Xóa'));
      await t.pumpAndSettle();
      expect(deleted, 'e');
    });

    testWidgets('no edit/delete seams keeps rows read-only', (t) async {
      await t.pumpWidget(
        page([_tx('e', TransactionKind.expense, 45000, '2026-10-12')]),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('e'));
      await t.pumpAndSettle();
      await t.longPress(find.text('e'));
      await t.pumpAndSettle();
      expect(find.text('Xóa giao dịch?'), findsNothing);
    });

    testWidgets('a failed first page reports an error with retry', (t) async {
      var calls = 0;
      await t.pumpWidget(
        MaterialApp(
          home: AccountRegisterPage(
            account: _account,
            loadPage: (q, {offset = 0}) async {
              calls++;
              if (calls == 1) throw Exception('offline');
              return const TransactionPage([], hasMore: false);
            },
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Không tải được sổ giao dịch'), findsOneWidget);
      await t.tap(find.text('Thử lại'));
      await t.pumpAndSettle();
      expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
    });

    testWidgets('later pages load on scroll and continue the chain', (t) async {
      // A small viewport guarantees the first page overflows so the
      // scroll listener can reach the load-more threshold.
      t.view.physicalSize = const Size(360, 480);
      t.view.devicePixelRatio = 1.0;
      addTearDown(t.view.reset);
      final all = [
        for (var i = 0; i < 8; i++)
          _tx(
            'r$i',
            TransactionKind.expense,
            1000 * (i + 1),
            '2026-10-${(12 - i).toString().padLeft(2, '0')}',
          ),
      ];
      await t.pumpWidget(page(all, pageSize: 4));
      await t.pumpAndSettle();
      // ListView children materialize lazily — only the top rows exist
      // until the scroll reaches them.
      expect(find.text('r0'), findsOneWidget);
      expect(find.text('r7'), findsNothing);

      // Drags drive the scroll listener past the load-more threshold;
      // page two then materializes r7 near the bottom.
      for (var i = 0; i < 6 && find.text('r7').evaluate().isEmpty; i++) {
        await t.fling(find.byType(ListView), const Offset(0, -200), 3000);
        await t.pumpAndSettle();
      }
      expect(find.text('r7'), findsOneWidget);
      // r7's running balance continues the chain: balance − impacts of the
      // seven newer rows (r0…r6 all expenses → Σ −(1+…+7)k = −28000).
      expect(
        find.text('Số dư ${formatMoney(_account.balance + 28000)}'),
        findsOneWidget,
      );
    });
  });
}
