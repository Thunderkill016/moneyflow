package app.moneyflow.moneyflow

import org.json.JSONObject

/**
 * Contract for the home-screen widget's last-known-balance block.
 *
 * The Dart side (lib/data/widget_snapshot.dart) writes one JSON string
 * via shared_preferences, which lands in the `FlutterSharedPreferences`
 * file under the `flutter.`-prefixed key below. The widget never
 * fetches: an absent, malformed or >24h-old snapshot renders "—" and
 * every surface stays a tap-to-open-app affordance.
 *
 * Pure Kotlin + org.json only (no android.* imports) so app/src/test
 * verifies parse/staleness/formatting on the JVM.
 */
object WidgetSnapshotContract {
    /** The SharedPreferences file the Flutter shared_preferences plugin writes. */
    const val PREFS_FILE = "FlutterSharedPreferences"

    /** Dart key `mf_widget_snapshot` with the plugin's `flutter.` prefix. */
    const val SNAPSHOT_KEY = "flutter.mf_widget_snapshot"

    /** Older than this a figure can no longer pose as current. */
    const val STALE_AFTER_MS: Long = 24L * 60 * 60 * 1000

    /** The honest empty figure — matches the dashboard's suppressed-tile stance. */
    const val NO_VALUE = "—"

    /**
     * Decoded snapshot: integer đồng totals plus the load's wall-clock ms.
     * [pendingReview] is the inbox draft count (D18) — null when the Dart
     * side could not vouch for a number; the review row hides rather than
     * quote a fabricated zero.
     */
    data class Snapshot(
        val totalVnd: Long,
        val safeSpendVnd: Long?,
        val savedAtMs: Long,
        val pendingReview: Long? = null,
    )

    /**
     * Pre-formatted widget lines — the provider applies them verbatim.
     * [review] is null when the row should hide (no snapshot, stale data,
     * or an unknown count).
     */
    data class Rendered(
        val total: String,
        val safeSpend: String,
        val caption: String,
        val review: String?,
    )

    /** Strict decode — absent, malformed JSON or wrong field types read as "no snapshot". */
    fun parse(raw: String?): Snapshot? {
        if (raw.isNullOrEmpty()) return null
        return try {
            val json = JSONObject(raw)
            Snapshot(
                totalVnd = json.getLong("total"),
                safeSpendVnd =
                    if (json.isNull("safeSpend")) null else json.getLong("safeSpend"),
                savedAtMs = json.getLong("savedAtMs"),
                // Negative counts are meaningless — treat as unknown.
                pendingReview =
                    if (json.isNull("pendingReview")) {
                        null
                    } else {
                        json.getLong("pendingReview").coerceAtLeast(0)
                    },
            )
        } catch (e: Exception) {
            null
        }
    }

    fun isStale(savedAtMs: Long, nowMs: Long): Boolean =
        nowMs - savedAtMs > STALE_AFTER_MS

    /**
     * What the widget shows. [timeLabel]/[dateTimeLabel] format a
     * timestamp on-device (device timezone); tests pass fixed strings.
     */
    fun render(
        snapshot: Snapshot?,
        nowMs: Long,
        timeLabel: (Long) -> String,
        dateTimeLabel: (Long) -> String,
    ): Rendered =
        when {
            snapshot == null ->
                Rendered(NO_VALUE, NO_VALUE, "Chạm để mở MoneyFlow", null)
            isStale(snapshot.savedAtMs, nowMs) ->
                Rendered(
                    NO_VALUE,
                    NO_VALUE,
                    "Dữ liệu cũ từ ${dateTimeLabel(snapshot.savedAtMs)} — chạm để mở",
                    null,
                )
            else ->
                Rendered(
                    formatVnd(snapshot.totalVnd),
                    snapshot.safeSpendVnd?.let { formatVnd(it) } ?: NO_VALUE,
                    "Cập nhật lúc ${timeLabel(snapshot.savedAtMs)}",
                    // A verified zero still renders — "0 mục" is the
                    // all-clear answer the row exists to give.
                    snapshot.pendingReview?.let { "$it mục" },
                )
        }

    /** vi-VN grouping: 1234567 → "1.234.567 ₫" (dot separators, đồng suffix). */
    fun formatVnd(amount: Long): String {
        val digits = amount.toString().removePrefix("-")
        val grouped = buildString {
            for (i in digits.indices) {
                if (i > 0 && (digits.length - i) % 3 == 0) append('.')
                append(digits[i])
            }
        }
        return "${if (amount < 0) "-" else ""}$grouped ₫"
    }
}
