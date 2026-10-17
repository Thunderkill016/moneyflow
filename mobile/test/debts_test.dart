import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/debts.dart';
import 'package:moneyflow/domain/models.dart';

const _owe = Debt(
  id: 'd1',
  counterparty: 'Anh Hai',
  direction: DebtDirection.payable,
  principalMinor: 2000000,
  remainingMinor: 1500000,
);

const _lent = Debt(
  id: 'd2',
  counterparty: 'Em Lan',
  direction: DebtDirection.receivable,
  principalMinor: 300000,
  remainingMinor: 300000,
);

void main() {
  group('wire mapping', () {
    test('direction round-trips and unknown values fail to payable', () {
      expect(debtDirectionFromString('payable'), DebtDirection.payable);
      expect(debtDirectionFromString('receivable'), DebtDirection.receivable);
      // Unknown/garbage fails closed to payable — the honest read for a
      // debt that must be repaid, never silently "receivable".
      expect(debtDirectionFromString('???'), DebtDirection.payable);
      expect(debtDirectionWire(DebtDirection.payable), 'payable');
      expect(debtDirectionWire(DebtDirection.receivable), 'receivable');
    });

    test('state round-trips and unknown values fail to open', () {
      expect(debtStateFromString('open'), DebtState.open);
      expect(debtStateFromString('settled'), DebtState.settled);
      expect(debtStateFromString('archived'), DebtState.archived);
      expect(debtStateFromString('bogus'), DebtState.open);
      expect(debtStateWire(DebtState.settled), 'settled');
    });
  });

  group('repaymentKind', () {
    test('payable repays as expense; receivable collects as income', () {
      // Direction-derived server-side too — a transfer can never serve as
      // a repayment because it moves money between own accounts only.
      expect(repaymentKind(DebtDirection.payable), TransactionKind.expense);
      expect(repaymentKind(DebtDirection.receivable), TransactionKind.income);
    });
  });

  group('validateRepaymentAmount', () {
    test('rejects zero and negative amounts', () {
      expect(validateRepaymentAmount(1000, 0), 'amount_must_be_positive');
      expect(validateRepaymentAmount(1000, -5), 'amount_must_be_positive');
    });

    test('rejects an amount above the remaining balance', () {
      expect(
        validateRepaymentAmount(1500000, 1500001),
        'repayment_exceeds_remaining',
      );
      // Exactly the remaining amount is the boundary — it settles.
      expect(validateRepaymentAmount(1500000, 1500000), isNull);
    });

    test('accepts a partial repayment', () {
      expect(validateRepaymentAmount(1500000, 500000), isNull);
    });
  });

  group('Debt.repaidMinor', () {
    test('is derived from principal minus remaining, never stored', () {
      expect(_owe.repaidMinor, 500000);
      expect(_lent.repaidMinor, 0);
      expect(_owe.isOpen, isTrue);
    });
  });

  group('groupOpenDebts', () {
    test('merges counterparty spellings that differ only by case/space', () {
      final groups = groupOpenDebts(const [
        _owe,
        Debt(
          id: 'd3',
          counterparty: 'anh hai ',
          direction: DebtDirection.payable,
          principalMinor: 500000,
          remainingMinor: 500000,
        ),
        _lent,
      ]);

      expect(groups.length, 2);
      final hai = groups.firstWhere((g) => g.counterparty == 'Anh Hai');
      expect(hai.debts.map((d) => d.id), ['d1', 'd3']);
      expect(hai.remainingMinor, 2000000);
    });

    test('sorts groups by outstanding total desc then name', () {
      final groups = groupOpenDebts(const [
        _lent, // 300k
        _owe, // 1.5m
        Debt(
          id: 'd4',
          counterparty: 'Bác Ba',
          direction: DebtDirection.payable,
          principalMinor: 900000,
          remainingMinor: 900000,
        ),
      ]);

      expect(groups.map((g) => g.counterparty), [
        'Anh Hai',
        'Bác Ba',
        'Em Lan',
      ]);
    });

    test('the same person owing AND owed stays two groups — the totals '
        'are different facts, never netted', () {
      const lentToSame = Debt(
        id: 'd5',
        counterparty: 'Anh Hai',
        direction: DebtDirection.receivable,
        principalMinor: 100000,
        remainingMinor: 100000,
      );
      final groups = groupOpenDebts(const [_owe, lentToSame]);

      expect(groups.length, 2);
      final oweGroup = groups.firstWhere(
        (g) => g.direction == DebtDirection.payable,
      );
      final lentGroup = groups.firstWhere(
        (g) => g.direction == DebtDirection.receivable,
      );
      expect(oweGroup.remainingMinor, 1500000);
      expect(lentGroup.remainingMinor, 100000);
    });
  });

  group('debtErrorMessage', () {
    test('maps the server tokens to plain-language copy', () {
      expect(
        debtErrorMessage(
          Exception('repayment_exceeds_remaining'),
          fallback: 'x',
        ),
        contains('vượt phần còn lại'),
      );
      expect(
        debtErrorMessage(Exception('debt_not_found'), fallback: 'x'),
        contains('tải lại'),
      );
      expect(
        debtErrorMessage(Exception('debt_not_open'), fallback: 'x'),
        contains('không còn mở'),
      );
      expect(debtErrorMessage(Exception('???'), fallback: 'x'), 'x');
    });
  });
}
