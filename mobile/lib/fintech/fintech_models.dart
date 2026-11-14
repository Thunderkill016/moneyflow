import 'package:flutter/material.dart';

import 'fintech_theme.dart';

enum TxKind { expense, income, transfer }

enum TxSource { manual, voice, bill, quick }

IconData walletIconFromKey(String key) {
  return switch (key) {
    'bank_vcb' => Icons.account_balance_rounded,
    'bank_tcb' => Icons.credit_card_rounded,
    'momo' => Icons.account_balance_wallet_rounded,
    'cash' => Icons.payments_rounded,
    _ => Icons.wallet_rounded,
  };
}

class WalletCardModel {
  const WalletCardModel({
    required this.id,
    required this.name,
    required this.bankCode,
    required this.accountMask,
    required this.subtitle,
    required this.balance,
    required this.gradientColors,
    required this.iconKey,
  });

  final String id;
  final String name;
  final String bankCode;
  final String accountMask;
  final String subtitle;
  final int balance;
  final List<int> gradientColors;
  final String iconKey;

  IconData get icon => walletIconFromKey(iconKey);

  WalletCardModel copyWith({
    String? name,
    String? bankCode,
    String? accountMask,
    String? subtitle,
    int? balance,
    List<int>? gradientColors,
    String? iconKey,
  }) {
    return WalletCardModel(
      id: id,
      name: name ?? this.name,
      bankCode: bankCode ?? this.bankCode,
      accountMask: accountMask ?? this.accountMask,
      subtitle: subtitle ?? this.subtitle,
      balance: balance ?? this.balance,
      gradientColors: gradientColors ?? this.gradientColors,
      iconKey: iconKey ?? this.iconKey,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'bankCode': bankCode,
        'accountMask': accountMask,
        'subtitle': subtitle,
        'balance': balance,
        'gradientColors': gradientColors,
        'iconKey': iconKey,
      };

  factory WalletCardModel.fromJson(Map<String, dynamic> json) {
    final rawColors = json['gradientColors'] as List<dynamic>? ?? const [0xFF0F766E, 0xFF064E3B];
    return WalletCardModel(
      id: json['id'] as String,
      name: json['name'] as String,
      bankCode: json['bankCode'] as String? ?? 'WALLET',
      accountMask: json['accountMask'] as String? ?? '•• 0000',
      subtitle: json['subtitle'] as String? ?? 'Tài khoản',
      balance: (json['balance'] as num).toInt(),
      gradientColors: rawColors.map((e) => (e as num).toInt()).toList(),
      iconKey: json['iconKey'] as String? ?? 'bank_vcb',
    );
  }
}

class CategoryMeta {
  const CategoryMeta({
    required this.id,
    required this.name,
    required this.kind,
    required this.icon,
    required this.color,
    this.defaultBudget = 0,
  });

  final String id;
  final String name;
  final TxKind kind;
  final IconData icon;
  final Color color;
  final int defaultBudget;
}

class FinTx {
  const FinTx({
    required this.id,
    required this.kind,
    required this.amount,
    required this.categoryId,
    required this.walletId,
    this.toWalletId,
    required this.note,
    required this.timestamp,
    this.source = TxSource.manual,
  });

  final String id;
  final TxKind kind;
  final int amount;
  final String categoryId;
  final String walletId;
  final String? toWalletId;
  final String note;
  final DateTime timestamp;
  final TxSource source;

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind.name,
        'amount': amount,
        'categoryId': categoryId,
        'walletId': walletId,
        'toWalletId': toWalletId,
        'note': note,
        'timestamp': timestamp.toIso8601String(),
        'source': source.name,
      };

  factory FinTx.fromJson(Map<String, dynamic> json) {
    return FinTx(
      id: json['id'] as String,
      kind: TxKind.values.firstWhere(
        (e) => e.name == json['kind'],
        orElse: () => TxKind.expense,
      ),
      amount: (json['amount'] as num).toInt(),
      categoryId: json['categoryId'] as String,
      walletId: json['walletId'] as String,
      toWalletId: json['toWalletId'] as String?,
      note: json['note'] as String? ?? '',
      timestamp: DateTime.parse(json['timestamp'] as String),
      source: TxSource.values.firstWhere(
        (e) => e.name == json['source'],
        orElse: () => TxSource.manual,
      ),
    );
  }
}

class BillTemplate {
  const BillTemplate({
    required this.merchant,
    required this.itemsSummary,
    required this.amount,
    required this.categoryId,
    required this.walletId,
    required this.timeLabel,
    required this.badgeColor,
  });

  final String merchant;
  final String itemsSummary;
  final int amount;
  final String categoryId;
  final String walletId;
  final String timeLabel;
  final Color badgeColor;
}

class ParsedQuickCapture {
  const ParsedQuickCapture({
    required this.amount,
    required this.kind,
    required this.categoryId,
    required this.walletId,
    required this.note,
  });

  final int amount;
  final TxKind kind;
  final String categoryId;
  final String walletId;
  final String note;
}

const List<CategoryMeta> kDefaultCategories = [
  CategoryMeta(
    id: 'food',
    name: 'Ăn uống',
    kind: TxKind.expense,
    icon: Icons.restaurant_rounded,
    color: Color(0xFFF97316),
    defaultBudget: 4000000,
  ),
  CategoryMeta(
    id: 'coffee',
    name: 'Cà phê',
    kind: TxKind.expense,
    icon: Icons.coffee_rounded,
    color: Color(0xFFA855F7),
    defaultBudget: 1200000,
  ),
  CategoryMeta(
    id: 'transport',
    name: 'Di chuyển',
    kind: TxKind.expense,
    icon: Icons.directions_car_rounded,
    color: FintechColors.cyan,
    defaultBudget: 1800000,
  ),
  CategoryMeta(
    id: 'shopping',
    name: 'Mua sắm',
    kind: TxKind.expense,
    icon: Icons.shopping_bag_rounded,
    color: Color(0xFFEC4899),
    defaultBudget: 2500000,
  ),
  CategoryMeta(
    id: 'bills',
    name: 'Hóa đơn',
    kind: TxKind.expense,
    icon: Icons.receipt_long_rounded,
    color: FintechColors.indigoBright,
    defaultBudget: 2000000,
  ),
  CategoryMeta(
    id: 'home',
    name: 'Nhà ở',
    kind: TxKind.expense,
    icon: Icons.home_work_rounded,
    color: Color(0xFF14B8A6),
    defaultBudget: 4000000,
  ),
  CategoryMeta(
    id: 'health',
    name: 'Sức khỏe',
    kind: TxKind.expense,
    icon: Icons.favorite_rounded,
    color: FintechColors.emerald,
    defaultBudget: 1000000,
  ),
  CategoryMeta(
    id: 'fun',
    name: 'Giải trí',
    kind: TxKind.expense,
    icon: Icons.sports_esports_rounded,
    color: FintechColors.amber,
    defaultBudget: 1500000,
  ),
  CategoryMeta(
    id: 'salary',
    name: 'Lương',
    kind: TxKind.income,
    icon: Icons.account_balance_wallet_rounded,
    color: FintechColors.emerald,
  ),
  CategoryMeta(
    id: 'bonus',
    name: 'Thưởng',
    kind: TxKind.income,
    icon: Icons.auto_awesome_rounded,
    color: FintechColors.cyan,
  ),
  CategoryMeta(
    id: 'invest',
    name: 'Đầu tư',
    kind: TxKind.income,
    icon: Icons.trending_up_rounded,
    color: FintechColors.indigoBright,
  ),
  CategoryMeta(
    id: 'other_in',
    name: 'Thu khác',
    kind: TxKind.income,
    icon: Icons.add_card_rounded,
    color: Color(0xFF14B8A6),
  ),
  CategoryMeta(
    id: 'transfer',
    name: 'Chuyển ví',
    kind: TxKind.transfer,
    icon: Icons.swap_horiz_rounded,
    color: FintechColors.sky,
  ),
];

const List<BillTemplate> kDemoBillTemplates = [
  BillTemplate(
    merchant: 'Highlands Coffee',
    itemsSummary: 'Phin Sữa Đá (L) · Bánh Mì Que',
    amount: 69000,
    categoryId: 'coffee',
    walletId: 'momo',
    timeLabel: 'Vừa xuất bill · POS #HC-204',
    badgeColor: Color(0xFFA855F7),
  ),
  BillTemplate(
    merchant: 'Bách Hóa Xanh',
    itemsSummary: 'Thịt cá, rau củ & đồ dùng bếp',
    amount: 245000,
    categoryId: 'food',
    walletId: 'tcb',
    timeLabel: 'Hóa đơn điện tử · BHX Q.3',
    badgeColor: Color(0xFFF97316),
  ),
  BillTemplate(
    merchant: 'GrabBike / Car',
    itemsSummary: 'Chuyến đi Nguyễn Thị Minh Khai → Q.1',
    amount: 42000,
    categoryId: 'transport',
    walletId: 'momo',
    timeLabel: 'Biên lai chuyến · e-Receipt',
    badgeColor: FintechColors.cyan,
  ),
  BillTemplate(
    merchant: 'Điện lực EVN HCMC',
    itemsSummary: 'Tiền điện sinh hoạt tháng hiện tại',
    amount: 850000,
    categoryId: 'bills',
    walletId: 'vcb',
    timeLabel: 'Hóa đơn VAT · Thanh toán tự động',
    badgeColor: FintechColors.indigoBright,
  ),
];

CategoryMeta categoryById(String id) {
  for (final cat in kDefaultCategories) {
    if (cat.id == id) return cat;
  }
  return kDefaultCategories.first;
}

String formatVnd(
  int amount, {
  bool signed = false,
  TxKind? kind,
  bool compact = false,
}) {
  final absVal = amount.abs();
  final prefix = switch ((signed, kind, amount < 0)) {
    (true, TxKind.income, _) => '+ ',
    (true, TxKind.expense, _) => '- ',
    (true, TxKind.transfer, _) => '↔ ',
    (true, null, true) => '- ',
    (true, null, false) when amount > 0 => '+ ',
    _ => '',
  };

  if (compact) {
    if (absVal >= 1000000000) {
      final val = absVal / 1000000000;
      return '$prefix${_trimDecimal(val, 2)}tỷ';
    }
    if (absVal >= 1000000) {
      final val = absVal / 1000000;
      return '$prefix${_trimDecimal(val, 1)}tr';
    }
    if (absVal >= 1000) {
      final val = absVal / 1000;
      return '$prefix${_trimDecimal(val, 0)}k';
    }
    return '$prefix$absVal₫';
  }

  final raw = absVal.toString();
  final buf = StringBuffer();
  for (var i = 0; i < raw.length; i++) {
    final posFromEnd = raw.length - i;
    if (i > 0 && posFromEnd % 3 == 0) {
      buf.write('.');
    }
    buf.write(raw[i]);
  }
  return '$prefix$buf ₫';
}

String _trimDecimal(double val, int maxDecimals) {
  var str = val.toStringAsFixed(maxDecimals);
  if (str.contains('.')) {
    str = str.replaceAll(RegExp(r'0+$'), '').replaceAll(RegExp(r'\.$'), '');
  }
  return str.replaceAll('.', ',');
}

String formatVnDayLabel(DateTime dt, DateTime now) {
  final targetDay = DateTime(dt.year, dt.month, dt.day);
  final today = DateTime(now.year, now.month, now.day);
  final diff = today.difference(targetDay).inDays;
  if (diff == 0) return 'Hôm nay';
  if (diff == 1) return 'Hôm qua';
  final dd = dt.day.toString().padLeft(2, '0');
  final mm = dt.month.toString().padLeft(2, '0');
  return '$dd/$mm/${dt.year}';
}

String formatVnTime(DateTime dt) {
  final hh = dt.hour.toString().padLeft(2, '0');
  final mm = dt.minute.toString().padLeft(2, '0');
  return '$hh:$mm';
}

/// Parses natural Vietnamese quick-capture phrases into a structured draft.
/// Examples:
/// - "ăn sáng phở bò 55k" -> 55.000 đ, expense, food, default wallet
/// - "cà phê highlands 45 nghìn momo" -> 45.000 đ, expense, coffee, momo
/// - "nhận lương 25 triệu vcb" -> 25.000.000 đ, income, salary, vcb
ParsedQuickCapture parseVietnameseQuickInput(
  String raw, {
  List<WalletCardModel> wallets = const [],
}) {
  final trimmed = raw.trim();
  final lower = trimmed.toLowerCase();

  var amount = 0;
  var noteWithoutAmount = trimmed;

  // Match dotted thousands first (e.g. "45.000" or "1.250.000")
  final dottedMatch = RegExp(
    r'(\d{1,3}(?:\.\d{3})+)\s*(đ|d|vnd)?\b',
    caseSensitive: false,
  ).firstMatch(trimmed);

  // Match unit-suffixed numbers ("55k", "1.5tr", "45 nghìn", "25 triệu")
  final unitMatch = RegExp(
    r'(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr|củ|cu|m|nghìn|nghin|ngàn|ngan|k|đ|d)\b',
    caseSensitive: false,
  ).firstMatch(trimmed);

  // Fallback bare number ("phở bò 55")
  final bareMatch = RegExp(r'\b(\d{1,9})\b').firstMatch(trimmed);

  if (unitMatch != null) {
    final numRaw = unitMatch.group(1)!.replaceAll(',', '.');
    final unit = unitMatch.group(2)!.toLowerCase();
    final parsed = double.tryParse(numRaw) ?? 0;
    if (unit == 'tr' || unit == 'triệu' || unit == 'trieu' || unit == 'củ' || unit == 'cu' || unit == 'm') {
      amount = (parsed * 1000000).round();
    } else if (unit == 'k' || unit == 'nghìn' || unit == 'nghin' || unit == 'ngàn' || unit == 'ngan') {
      amount = (parsed * 1000).round();
    } else {
      amount = parsed.round();
    }
    noteWithoutAmount = (trimmed.substring(0, unitMatch.start) + trimmed.substring(unitMatch.end)).trim();
  } else if (dottedMatch != null) {
    final digits = dottedMatch.group(1)!.replaceAll('.', '');
    amount = int.tryParse(digits) ?? 0;
    noteWithoutAmount = (trimmed.substring(0, dottedMatch.start) + trimmed.substring(dottedMatch.end)).trim();
  } else if (bareMatch != null) {
    final val = int.tryParse(bareMatch.group(1)!) ?? 0;
    amount = (val > 0 && val < 1000) ? val * 1000 : val;
    noteWithoutAmount = (trimmed.substring(0, bareMatch.start) + trimmed.substring(bareMatch.end)).trim();
  }

  // Detect wallet mention
  var walletId = wallets.isNotEmpty ? wallets.first.id : 'vcb';
  const walletKeywords = {
    'momo': ['momo', 'ví momo'],
    'vcb': ['vcb', 'vietcombank'],
    'tcb': ['tcb', 'techcombank'],
    'cash': ['tiền mặt', 'tien mat', 'cash', 'túi'],
  };
  for (final entry in walletKeywords.entries) {
    if (entry.value.any(lower.contains)) {
      walletId = entry.key;
      for (final kw in entry.value) {
        noteWithoutAmount = noteWithoutAmount.replaceAll(
          RegExp('\\b${RegExp.escape(kw)}\\b', caseSensitive: false),
          '',
        );
      }
      break;
    }
  }

  // Detect TxKind & categoryId
  var kind = TxKind.expense;
  var categoryId = 'food';

  if (_containsAny(lower, ['chuyển ví', 'chuyen vi', 'nạp ví', 'nap vi', 'rút về ví'])) {
    kind = TxKind.transfer;
    categoryId = 'transfer';
  } else if (_containsAny(lower, ['lương', 'luong'])) {
    kind = TxKind.income;
    categoryId = 'salary';
  } else if (_containsAny(lower, ['thưởng', 'thuong', 'hoa hồng', 'bonus'])) {
    kind = TxKind.income;
    categoryId = 'bonus';
  } else if (_containsAny(lower, ['cổ tức', 'lãi tiết kiệm', 'đầu tư', 'chứng khoán'])) {
    kind = TxKind.income;
    categoryId = 'invest';
  } else if (_containsAny(lower, ['hoàn tiền', 'thu nhập', 'thu khác', 'bán đồ'])) {
    kind = TxKind.income;
    categoryId = 'other_in';
  } else if (_containsAny(lower, ['cà phê', 'ca phe', 'coffee', 'highlands', 'starbucks', 'trà sữa', 'tra sua'])) {
    categoryId = 'coffee';
  } else if (_containsAny(lower, ['grab', 'xăng', 'xang', 'taxi', 'xe', 'gửi xe', 'vé tàu', 'be '])) {
    categoryId = 'transport';
  } else if (_containsAny(lower, ['điện', 'nước', 'internet', 'wifi', '4g', 'hóa đơn', 'hoa don', 'evn'])) {
    categoryId = 'bills';
  } else if (_containsAny(lower, ['thuê nhà', 'tiền nhà', 'chung cư', 'nội thất'])) {
    categoryId = 'home';
  } else if (_containsAny(lower, ['shopee', 'lazada', 'tiki', 'mua sắm', 'siêu thị', 'bách hóa', 'áo', 'giày'])) {
    categoryId = 'shopping';
  } else if (_containsAny(lower, ['thuốc', 'khám', 'bệnh', 'gym', 'sức khỏe', 'nha khoa'])) {
    categoryId = 'health';
  } else if (_containsAny(lower, ['phim', 'cgv', 'netflix', 'spotify', 'game', 'giải trí', 'du lịch'])) {
    categoryId = 'fun';
  } else {
    categoryId = 'food';
  }

  final cleanedNote = noteWithoutAmount.replaceAll(RegExp(r'\s{2,}'), ' ').trim();
  return ParsedQuickCapture(
    amount: amount,
    kind: kind,
    categoryId: categoryId,
    walletId: walletId,
    note: cleanedNote.isEmpty ? categoryById(categoryId).name : _capitalizeFirst(cleanedNote),
  );
}

bool _containsAny(String source, List<String> terms) {
  for (final t in terms) {
    if (source.contains(t)) return true;
  }
  return false;
}

String _capitalizeFirst(String input) {
  if (input.isEmpty) return input;
  return input[0].toUpperCase() + input.substring(1);
}
