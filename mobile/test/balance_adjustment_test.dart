import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/accounts/account_register_page.dart';
import 'package:moneyflow/features/accounts/balance_adjustment_dialog.dart';
import 'package:moneyflow/domain/transaction_query.dart';

const _account = AccountSummary(
  id: 'a1',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 2000000,
  balance: 11098000,
);

final _expenseCat = Category(
  id: 'cat-food',
  name: 'Ăn uống',
  kind: TransactionKind.expense,
);
final _incomeCat = Category(
  id: 'cat-adjust-in',
  name: 'Điều chỉnh khác',
  kind: TransactionKind.income,
);

class _Host extends StatelessWidget {
  const _Host({required this.submit, this.categories});

  final Future<void> Function({
    required TransactionKind kind,
    required int amountMinor,
    required String categoryId,
    required String note,
  })
  submit;
  final Future<List<Category>> Function()? categories;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: FilledButton(
      onPressed: () => showBalanceAdjustmentDialog(
        context,
        account: _account,
        loadCategories: categories ?? () async => [_expenseCat, _incomeCat],
        submit: submit,
      ),
      child: const Text('open'),
    ),
  );
}

Future<void> _open(WidgetTester t, _Host host) async {
  await t.pumpWidget(MaterialApp(home: host));
  await t.tap(find.text('open'));
  await t.pumpAndSettle();
}

void main() {
  testWidgets('zero difference needs no adjustment — submit stays off', (
    t,
  ) async {
    var calls = 0;
    await _open(
      t,
      _Host(
        submit:
            ({
              required kind,
              required amountMinor,
              required categoryId,
              required note,
            }) async => calls++,
      ),
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Số dư thực tế'),
      '11098000',
    );
    await t.pump();
    expect(find.textContaining('Không chênh lệch'), findsOneWidget);
    expect(
      t
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Ghi điều chỉnh'),
          )
          .enabled,
      isFalse,
    );
    expect(calls, 0);
  });

  testWidgets('positive diff forces income categories only', (t) async {
    await _open(
      t,
      _Host(
        submit:
            ({
              required kind,
              required amountMinor,
              required categoryId,
              required note,
            }) async {},
      ),
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Số dư thực tế'),
      '12000000',
    );
    await t.pump();
    expect(find.textContaining('thu'), findsWidgets);
    await t.tap(find.byType(DropdownButtonFormField<String>));
    await t.pumpAndSettle();
    // Income option listed; the expense category must not be pickable
    // for a positive adjustment (kind mismatch would fail server-side).
    expect(find.text('Điều chỉnh khác'), findsWidgets);
    expect(find.text('Ăn uống'), findsNothing);
  });

  testWidgets(
    'negative diff submits an expense adjustment with the ghi → thực tế note',
    (t) async {
      final seen = <(TransactionKind, int, String, String)>[];
      await _open(
        t,
        _Host(
          submit:
              ({
                required kind,
                required amountMinor,
                required categoryId,
                required note,
              }) async => seen.add((kind, amountMinor, categoryId, note)),
        ),
      );
      await t.enterText(
        find.widgetWithText(TextField, 'Số dư thực tế'),
        '10000000',
      );
      await t.pump();
      await t.tap(find.byType(DropdownButtonFormField<String>));
      await t.pumpAndSettle();
      await t.tap(find.text('Ăn uống').last);
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(FilledButton, 'Ghi điều chỉnh'));
      await t.pumpAndSettle();
      expect(seen.single.$1, TransactionKind.expense);
      expect(seen.single.$2, 1098000);
      expect(seen.single.$3, 'cat-food');
      expect(seen.single.$4, contains('11.098.000'));
      expect(seen.single.$4, contains('10.000.000'));
      // Dialog popped on success.
      expect(find.text('Điều chỉnh số dư'), findsNothing);
    },
  );

  testWidgets('a submit failure surfaces honestly and keeps the dialog', (
    t,
  ) async {
    await _open(
      t,
      _Host(
        submit:
            ({
              required kind,
              required amountMinor,
              required categoryId,
              required note,
            }) async => throw StateError('rpc down'),
      ),
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Số dư thực tế'),
      '10000000',
    );
    await t.pump();
    await t.tap(find.byType(DropdownButtonFormField<String>));
    await t.pumpAndSettle();
    await t.tap(find.text('Ăn uống').last);
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(FilledButton, 'Ghi điều chỉnh'));
    await t.pumpAndSettle();
    expect(
      find.text('Không ghi được điều chỉnh — thử lại sau'),
      findsOneWidget,
    );
    expect(find.text('Điều chỉnh số dư'), findsOneWidget);
  });

  testWidgets('a second tap while the RPC is in flight cannot double-submit', (
    t,
  ) async {
    // audit P1-5: the write is a real ledger transaction — a mid-RPC
    // tap must not post it twice. The button disables until the
    // request resolves.
    var calls = 0;
    final gate = Completer<void>();
    await _open(
      t,
      _Host(
        submit:
            ({
              required kind,
              required amountMinor,
              required categoryId,
              required note,
            }) async {
              calls++;
              await gate.future;
            },
      ),
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Số dư thực tế'),
      '10000000',
    );
    await t.pump();
    await t.tap(find.byType(DropdownButtonFormField<String>));
    await t.pumpAndSettle();
    await t.tap(find.text('Ăn uống').last);
    await t.pumpAndSettle();

    await t.tap(find.widgetWithText(FilledButton, 'Ghi điều chỉnh'));
    await t.pump(); // submit in flight — button disabled
    await t.tap(find.widgetWithText(FilledButton, 'Ghi điều chỉnh'));
    await t.tap(find.text('Hủy')); // cancel is inert mid-flight too
    await t.pump();

    gate.complete();
    await t.pumpAndSettle();
    expect(calls, 1);
    // The dialog was NOT cancelled mid-flight — it closed on success.
    expect(find.text('Điều chỉnh số dư'), findsNothing);
  });

  testWidgets('a failed submit stays retryable — busy clears on error', (
    t,
  ) async {
    var calls = 0;
    await _open(
      t,
      _Host(
        submit:
            ({
              required kind,
              required amountMinor,
              required categoryId,
              required note,
            }) async {
              calls++;
              if (calls == 1) throw StateError('rpc down');
            },
      ),
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Số dư thực tế'),
      '10000000',
    );
    await t.pump();
    await t.tap(find.byType(DropdownButtonFormField<String>));
    await t.pumpAndSettle();
    await t.tap(find.text('Ăn uống').last);
    await t.pumpAndSettle();

    await t.tap(find.widgetWithText(FilledButton, 'Ghi điều chỉnh'));
    await t.pumpAndSettle();
    expect(
      find.text('Không ghi được điều chỉnh — thử lại sau'),
      findsOneWidget,
    );

    // The same dialog retries — this is the attempt the stable
    // idempotency key (app.dart) dedupes server-side.
    await t.tap(find.widgetWithText(FilledButton, 'Ghi điều chỉnh'));
    await t.pumpAndSettle();
    expect(calls, 2);
    expect(find.text('Điều chỉnh số dư'), findsNothing);
  });

  testWidgets('a categories-load failure blocks submit honestly', (t) async {
    await _open(
      t,
      _Host(
        categories: () async => throw StateError('offline'),
        submit:
            ({
              required kind,
              required amountMinor,
              required categoryId,
              required note,
            }) async {},
      ),
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Số dư thực tế'),
      '10000000',
    );
    await t.pump();
    expect(find.textContaining('Chưa tải được danh mục'), findsOneWidget);
    expect(
      t
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Ghi điều chỉnh'),
          )
          .enabled,
      isFalse,
    );
  });

  testWidgets(
    'register header surfaces the button only when the seam is wired',
    (t) async {
      Future<TransactionPage> empty(
        TransactionQuery query, {
        int offset = 0,
      }) async => const TransactionPage([], hasMore: false);
      await t.pumpWidget(
        MaterialApp(
          home: AccountRegisterPage(
            account: _account,
            loadPage: empty,
            onAdjustBalance: () async => true,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Điều chỉnh số dư'), findsOneWidget);

      await t.pumpWidget(
        MaterialApp(
          home: AccountRegisterPage(account: _account, loadPage: empty),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Điều chỉnh số dư'), findsNothing);
    },
  );
}
