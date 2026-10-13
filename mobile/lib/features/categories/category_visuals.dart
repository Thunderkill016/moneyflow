import 'package:flutter/material.dart';

/// Render-side mapping from the web's stored icon keys
/// (PICKABLE_CATEGORY_ICONS + the legacy seeded "plus" + the internal
/// "arrows" transfer glyph) to the nearest Material icon. The stored string
/// is the contract — these glyphs only need to be recognizable next-of-kin,
/// never pixel-equal to the web's icon set.
IconData categoryIconData(String? key) => switch (key) {
  'bowl' => Icons.ramen_dining,
  'coffee' => Icons.coffee,
  'car' => Icons.directions_car,
  'fuel' => Icons.local_gas_station,
  'bus' => Icons.directions_bus,
  'bike' => Icons.pedal_bike,
  'parking' => Icons.local_parking,
  'bag' => Icons.shopping_bag,
  'shirt' => Icons.checkroom,
  'laundry' => Icons.local_laundry_service,
  'home' => Icons.home,
  'wifi' => Icons.wifi,
  'phone' => Icons.smartphone,
  'receipt' => Icons.receipt_long,
  'tax' => Icons.request_quote,
  'heart' => Icons.favorite,
  'pill' => Icons.medication,
  'baby' => Icons.child_care,
  'paw' => Icons.pets,
  'book' => Icons.menu_book,
  'study' => Icons.school,
  'gym' => Icons.fitness_center,
  'music' => Icons.music_note,
  'film' => Icons.movie,
  'plane' => Icons.flight,
  'gift' => Icons.card_giftcard,
  'charity' => Icons.volunteer_activism,
  'ticket' => Icons.confirmation_number,
  'briefcase' => Icons.work,
  'piggy' => Icons.savings,
  'coins' => Icons.payments,
  'wallet' => Icons.account_balance_wallet,
  'bank' => Icons.account_balance,
  'plus' => Icons.add,
  'arrows' => Icons.swap_horiz,
  // Unknown keys degrade to the same generic glyph the web falls back to
  // ("spark") — a stored string must never render as a missing glyph.
  _ => Icons.auto_awesome,
};

/// The web's eight category colors as display colors — identity aid only;
/// kind and state always carry a text label alongside.
Color categoryColor(String? key) => switch (key) {
  'amber' => Colors.amber,
  'blue' => Colors.blue,
  'coral' => Colors.deepOrange,
  'cyan' => Colors.cyan,
  'green' => Colors.green,
  'pink' => Colors.pink,
  'red' => Colors.red,
  // "violet" is also the fallback for anything outside the palette —
  // same degrade the web applies to unstorable colors.
  _ => Colors.deepPurple,
};
