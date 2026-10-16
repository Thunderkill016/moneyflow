// Bank/wallet push-notification → inbox-draft parser (Android listener
// pilot). The money grammar is deliberately NOT reimplemented here: the
// notification body runs through the same paste-line parser a pasted bank
// SMS uses, so "GD -50.000" means the same thing no matter how it arrived.
// This file adds what a push event carries that a pasted line does not:
// the source app label, the post time (the real occurred_on anchor), an
// account hint and the deterministic dedupe identity.
//
// Canon: an unparseable notification (no provable amount) produces NOTHING
// — inbox_candidates.amount_minor is `check (> 0)`, so a draft without an
// amount cannot exist, and inventing one would be fabricated evidence.

import 'dart:convert';

import '../../domain/models.dart';
import '../../domain/report.dart' show vnToday;
import '../share/inbox_paste_parser.dart';
import '../share/share_text_parser.dart' show foldVietnameseText;

/// One parsed bank-notification event, ready for `create_inbox_candidates`.
/// Always carries a positive amount — see the file header for why nothing
/// else is possible.
class BankNotificationDraft {
  const BankNotificationDraft({
    required this.kind,
    required this.amountMinor,
    required this.merchant,
    required this.note,
    required this.occurredOn,
    required this.confidence,
    required this.rawSnippet,
    required this.dedupeKey,
    this.accountName,
  });

  final TransactionKind kind;

  /// Integer VND đồng — the row's `amount_minor`.
  final int amountMinor;
  final String merchant;
  final String note;

  /// YYYY-MM-DD — an explicit date in the text wins; otherwise the VN
  /// calendar day the notification was posted.
  final String occurredOn;

  /// `high` | `medium` | `low` — the shared parser's confidence.
  final String confidence;

  /// Persisted candidate evidence (`raw_snippet`, ≤ [_rawSnippetMaxLength]).
  final String rawSnippet;

  /// `notif:<64-bit fnv-1a hex>` — deterministic identity for re-broadcast
  /// dedup, carried to the server as `source_external_id` (the RPC-owned
  /// `local_id` column is not writable through the candidate RPC).
  final String dedupeKey;

  /// `sourceLabel + masked tail` ("Vietcombank 001xxxx") when the text
  /// carries an account hint, else just the source label. It is evidence
  /// for the reviewer, never a silent account match: an unmatched name
  /// resolves to nothing in `resolveInboxAccountId`.
  final String? accountName;

  /// Durable-outbox codec — a held draft survives a process kill under
  /// its owner's prefs key, so the next session still submits it.
  Map<String, Object?> toJson() => {
    'kind': kind == TransactionKind.income ? 'income' : 'expense',
    'amountMinor': amountMinor,
    'merchant': merchant,
    'note': note,
    'occurredOn': occurredOn,
    'confidence': confidence,
    'rawSnippet': rawSnippet,
    'dedupeKey': dedupeKey,
    'accountName': accountName,
  };

  factory BankNotificationDraft.fromJson(Map<String, Object?> json) {
    String str(String k) => json[k] as String? ?? '';
    return BankNotificationDraft(
      kind: json['kind'] == 'income'
          ? TransactionKind.income
          : TransactionKind.expense,
      amountMinor: (json['amountMinor'] as num?)?.toInt() ?? 0,
      merchant: str('merchant'),
      note: str('note'),
      occurredOn: str('occurredOn'),
      confidence: str('confidence'),
      rawSnippet: str('rawSnippet'),
      dedupeKey: str('dedupeKey'),
      accountName: json['accountName'] as String?,
    );
  }
}

/// `raw_snippet` allows 2000 chars; drafts clip well under that — a
/// notification longer than this is mostly marketing tail anyway.
const _rawSnippetMaxLength = 1000;

/// `merchant` allows 200 chars.
const _merchantMaxLength = 200;

/// `note` allows 500 chars.
const _noteMaxLength = 500;

/// `account_name` allows 80 chars.
const _accountNameMaxLength = 80;

/// Account hint: "TK 001xxxx", "STK *1234", "tài khoản 1234567890" —
/// matched on the diacritic-folded text (indices still align with the
/// original, so extraction slices the original string).
final _accountHintPattern = RegExp(
  '(?:tk|stk|acct|account|tai khoan)\\s*[:#.]?\\s*([x*•\\d][x*•.\\d-]{2,15})',
);

final _hasDigit = RegExp(r'\d');

/// "ND: TIEN NHA" style note labels — matched folded, sliced original.
final _noteLabelPattern = RegExp(
  r'(?:nd|noi dung|mo ta|description|ref)\s*[:=]\s*',
);

final _whitespace = RegExp(r'\s+');

/// An explicitly signed money token ("-85.000đ", "+2,000,000 VND") is far
/// stronger direction evidence than keyword guessing — "thành công" folds
/// to "cong" (an income hint) in the shared grammar, which would flip a
/// ZaloPay debit to income. First signed token wins; a contradiction with
/// the keyword-derived kind stays flagged via low confidence.
final _signedAmountPattern = RegExp(
  '([+-])\\s*(\\d{1,3}(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*'
  '(k|tr|triệu|trieu|m|nghìn|ngan|đ|d|vnd|₫)',
  caseSensitive: false,
);

/// Verification-code and credential traffic — a 6-digit OTP survives the
/// shared amount grammar as fake money, and a draft asking the reviewer to
/// approve their own OTP is worse than silence. Checked on folded text.
final _nonFinancialPattern = RegExp(
  r'\b(otp|ma\s+xac\s*(?:minh|thuc|nhan)|xac\s*(?:minh|thuc|nhan)\s*(?:ma|tk)|'
  r'ma\s+dang\s+nhap|verification|one[\s-]*time|mat\s+khau|password|pin\b|'
  r'ma\s+bi\s+(?:mat|khoa)|secure\s+code)\b',
);

/// Parse one whitelisted bank/wallet notification into a candidate draft.
/// Returns null when no provable amount exists — the caller counts that as
/// "parse failed" and drops the event; a draft without an amount would be
/// fabricated evidence (see header).
BankNotificationDraft? parseBankNotification({
  required String packageName,
  required String sourceLabel,
  required String title,
  required String text,
  required int postTimeMs,
}) {
  final combined = '$title\n$text'.trim();
  if (combined.isEmpty) return null;
  if (_nonFinancialPattern.hasMatch(foldVietnameseText(combined))) {
    return null;
  }

  final draft = parseInboxPasteLine(combined, today: _vnDate(postTimeMs));
  if (draft == null) return null;

  var merchant = draft.merchant.trim();
  // "Không rõ" as the merchant would hide the one fact we DO know — which
  // app sent the money signal. The source label is honest evidence.
  if (merchant.isEmpty || merchant == 'Không rõ') merchant = sourceLabel;
  if (merchant.length > _merchantMaxLength) {
    merchant = merchant.substring(0, _merchantMaxLength).trimRight();
  }

  var kind = draft.kind;
  var confidence = draft.confidence;
  final signed = _explicitSignKind(combined);
  if (signed != null && signed != kind) {
    // Sign and keywords disagree (e.g. "thành công" → cong income hint on a
    // "-85.000đ" debit). The sign wins, and the conflict drops confidence
    // so the reviewer double-checks direction.
    kind = signed;
    confidence = 'low';
  }

  return BankNotificationDraft(
    kind: kind,
    amountMinor: draft.amountMinor,
    confidence: confidence,
    merchant: merchant,
    note: _extractNote(combined),
    occurredOn: draft.occurredOn,
    rawSnippet: _buildRawSnippet(sourceLabel, title, text),
    dedupeKey: notificationDedupeKey(
      packageName: packageName,
      title: title,
      text: text,
      postTimeMs: postTimeMs,
    ),
    accountName: _accountName(sourceLabel, combined),
  );
}

/// Deterministic per-notification identity: package + post minute +
/// normalized content. Re-broadcasts of the same status-bar entry produce
/// the same key; a genuinely different notification almost always differs
/// in at least one of the three. FNV-1a 64 — dedup only, so the app's
/// dependency set stays untouched (no crypto needed for a non-secret hash).
String notificationDedupeKey({
  required String packageName,
  required String title,
  required String text,
  required int postTimeMs,
}) {
  final minute = postTimeMs ~/ _millisPerMinute;
  final normalized = foldVietnameseText(
    '$title $text',
  ).replaceAll(_whitespace, ' ').trim();
  final hash = _fnv1a64(utf8.encode('$packageName|$minute|$normalized'));
  return 'notif:${hash.toRadixString(16).padLeft(16, '0')}';
}

const _millisPerMinute = 60 * 1000;

/// FNV-1a over UTF-8 bytes, reduced mod 2^64. Dart int arithmetic wraps on
/// overflow which IS the mod step; the mask keeps the result positive.
int _fnv1a64(List<int> bytes) {
  var hash = 0xcbf29ce484222325;
  const prime = 0x100000001b3;
  const mask = 0x7fffffffffffffff; // 2^63-1 — keeps the value non-negative
  for (final b in bytes) {
    hash = ((hash ^ b) * prime) & mask;
  }
  return hash;
}

/// Vietnam calendar day of the post instant — the honest occurred_on
/// fallback when the text carries no explicit date. Same shared rule as
/// every other ledger-facing date (domain/report.dart).
String _vnDate(int postTimeMs) =>
    vnToday(DateTime.fromMillisecondsSinceEpoch(postTimeMs, isUtc: true));

/// "sourceLabel maskedTail" when the text names an account; just the label
/// otherwise (still useful evidence — it tells the reviewer which bank).
String _accountName(String sourceLabel, String combined) {
  final folded = foldVietnameseText(combined);
  final match = _accountHintPattern.firstMatch(folded);
  final tail = match?.group(1);
  // An all-masked tail ("xxx") proves nothing — require at least one digit.
  final name = (tail != null && _hasDigit.hasMatch(tail))
      ? '$sourceLabel $tail'
      : sourceLabel;
  return name.length > _accountNameMaxLength
      ? name.substring(0, _accountNameMaxLength).trimRight()
      : name;
}

/// Kind from the FIRST explicitly signed money token in the raw combined
/// text ("-85.000đ" → expense, "+2tr" → income). Null when nothing is
/// signed. Checked on the raw text, not the folded one — signs survive
/// folding anyway, and the raw match avoids false hits on folded hints.
TransactionKind? _explicitSignKind(String combined) {
  final match = _signedAmountPattern.firstMatch(combined);
  if (match == null) return null;
  return match.group(1) == '+'
      ? TransactionKind.income
      : TransactionKind.expense;
}

/// Free-text note behind a labelled marker ("ND: TIEN NHA"), else empty —
/// the raw snippet already carries the full body as evidence.
String _extractNote(String combined) {
  final folded = foldVietnameseText(combined);
  final match = _noteLabelPattern.firstMatch(folded);
  if (match == null) return '';
  // Index-preserving fold → the folded end offset slices the original.
  var note = combined.substring(match.end).trim();
  final stop = note.indexOf(RegExp(r'[\n.;|]'));
  if (stop >= 0) note = note.substring(0, stop);
  note = note.trim();
  if (note.length > _noteMaxLength) {
    note = note.substring(0, _noteMaxLength).trimRight();
  }
  return note;
}

String _buildRawSnippet(String sourceLabel, String title, String text) {
  final body = [
    title.trim(),
    text.trim(),
  ].where((s) => s.isNotEmpty).join(' | ').replaceAll(_whitespace, ' ').trim();
  final snippet = '[$sourceLabel] $body';
  return snippet.length > _rawSnippetMaxLength
      ? snippet.substring(0, _rawSnippetMaxLength)
      : snippet;
}
