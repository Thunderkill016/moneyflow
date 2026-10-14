import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/voice/voice_engine.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/voice/voice_capture_page.dart';

/// Scripted engine — stands in for SpeechRecognizer so the page's state
/// machine and confirm gate are testable without a microphone.
class FakeVoiceEngine implements VoiceEngine {
  VoiceEngineStatus status = VoiceEngineStatus.available;
  void Function(String)? onPartial;
  void Function(String)? onFinal;
  void Function(String)? onError;
  bool listening = false;
  int listenCalls = 0;

  @override
  Future<VoiceEngineStatus> initialize() async => status;

  @override
  Future<void> listen({
    void Function(String)? onPartial,
    void Function(String)? onFinal,
    void Function(String)? onError,
  }) async {
    listenCalls += 1;
    listening = true;
    this.onPartial = onPartial;
    this.onFinal = onFinal;
    this.onError = onError;
  }

  @override
  Future<void> stop() async {
    listening = false;
    onFinal?.call('ăn sáng hai chục');
  }

  @override
  Future<void> cancel() async {
    listening = false;
  }
}

AccountSummary account({String id = 'a1'}) => AccountSummary(
  id: id,
  name: 'Ví tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 0,
  icon: 'wallet',
  color: '#0EA5E9',
);

Category category({
  String id = 'c1',
  TransactionKind kind = TransactionKind.expense,
}) =>
    Category(id: id, name: 'Ăn uống', kind: kind, icon: 'food', color: '#f00');

Widget page(FakeVoiceEngine engine, List<CaptureIntent> submitted) =>
    MaterialApp(
      home: VoiceCapturePage(
        accounts: [account()],
        categories: [category()],
        engine: engine,
        onSubmit: (intent) async => submitted.add(intent),
        today: '2026-10-20',
      ),
    );

void main() {
  testWidgets('mic tap listens, stop parses, confirm saves via onSubmit', (
    tester,
  ) async {
    final engine = FakeVoiceEngine();
    final submitted = <CaptureIntent>[];
    await tester.pumpWidget(page(engine, submitted));

    // Idle: the mic affordance is the only action.
    await tester.tap(find.byIcon(Icons.mic));
    await tester.pump();
    expect(engine.listening, isTrue);
    expect(find.text('Đang nghe…'), findsOneWidget);

    // Partial transcript shows while listening.
    engine.onPartial?.call('ăn sáng hai');
    await tester.pump();
    expect(find.textContaining('ăn sáng hai'), findsOneWidget);

    // Stop → confirm card with the parsed amount prefilled.
    await tester.tap(find.text('Xong, ghi đi'));
    await tester.pumpAndSettle();
    expect(find.text('Lưu vào sổ'), findsOneWidget);
    // The parsed amount is surfaced read-only ("20.000 ₫"); the field
    // itself stays editable before the explicit save.
    expect(find.textContaining('20.000'), findsWidgets);
    expect(find.text('Ăn uống'), findsWidgets); // category preselected

    await tester.tap(find.text('Lưu vào sổ'));
    await tester.pumpAndSettle();
    expect(submitted, hasLength(1));
    final intent = submitted.single;
    expect(intent.amount, 20000);
    expect(intent.kind, TransactionKind.expense);
    expect(intent.categoryId, 'c1');
    expect(intent.accountId, 'a1');
    expect(intent.occurredOn, '2026-10-20');
    expect(intent.idempotencyKey, isNotEmpty);
  });

  testWidgets('unsupported device shows the honest fallback', (tester) async {
    final engine = FakeVoiceEngine()..status = VoiceEngineStatus.unavailable;
    await tester.pumpWidget(page(engine, []));
    await tester.pumpAndSettle();
    expect(find.textContaining('không hỗ trợ'), findsOneWidget);
    expect(find.byIcon(Icons.mic), findsNothing);
  });

  testWidgets('nothing saves without the explicit confirm tap', (tester) async {
    final engine = FakeVoiceEngine();
    final submitted = <CaptureIntent>[];
    await tester.pumpWidget(page(engine, submitted));
    await tester.tap(find.byIcon(Icons.mic));
    await tester.pump();
    await tester.tap(find.text('Xong, ghi đi'));
    await tester.pumpAndSettle();
    // Parsed, awaiting review — no write happened yet.
    expect(submitted, isEmpty);
    // The cancel action sits below the fold — the confirm card's ListView
    // lazy-builds children, so drag it up until the button materializes.
    await tester.dragUntilVisible(
      find.text('Hủy'),
      find.byType(ListView),
      const Offset(0, -200),
    );
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
    expect(submitted, isEmpty);
  });
}
