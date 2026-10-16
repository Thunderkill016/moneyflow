package app.moneyflow.moneyflow

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Home-screen widget — "Tổng số dư" + "Chi được hôm nay" read from the
 * last-known snapshot the app persists for offline mode, plus the
 * one-tap "＋ Ghi" button that opens the capture form via the same
 * `quick=capture` extra the launcher shortcut uses.
 *
 * Last-known only, never live: the widget performs no background fetch
 * and no login. The Dart side writes `mf_widget_snapshot` on every
 * dashboard load and nudges [requestRefresh]; a missing or >24h-old
 * value renders "—" under an honest caption, and a tap on the data
 * block simply opens the app.
 */
class QuickCaptureWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, buildViews(context))
        }
    }

    companion object {
        // PendingIntent request codes — capture vs plain app open vs
        // the review row's inbox deep link.
        private const val REQUEST_CAPTURE = 1
        private const val REQUEST_OPEN = 2
        private const val REQUEST_REVIEW = 3

        /** Re-render every placed widget — the Dart side calls this over
         *  `app.moneyflow/widget` right after writing a fresh snapshot. */
        fun requestRefresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context) ?: return
            val ids = manager.getAppWidgetIds(
                ComponentName(context, QuickCaptureWidgetProvider::class.java),
            )
            for (id in ids) {
                manager.updateAppWidget(id, buildViews(context))
            }
        }

        private fun buildViews(context: Context): RemoteViews {
            val capture = Intent(context, MainActivity::class.java)
                .putExtra(MainActivity.EXTRA_QUICK_ACTION, MainActivity.QUICK_ACTION_CAPTURE)
                // singleTop + this flag route the tap through onNewIntent
                // when the activity is already alive (warm path).
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val capturePending = PendingIntent.getActivity(
                context,
                REQUEST_CAPTURE,
                capture,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            // The data block is a plain launch — last-known figures lead
            // to the real dashboard, never to a deeper stale view.
            val open = Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val openPending = PendingIntent.getActivity(
                context,
                REQUEST_OPEN,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            // The "Chờ duyệt" row deep-links to the inbox — the queue its
            // count tallies (D18). The action crosses MainActivity's
            // allowlist, so a forged extra can never route anywhere else.
            val review = Intent(context, MainActivity::class.java)
                .putExtra(
                    MainActivity.EXTRA_QUICK_ACTION,
                    QuickActionContract.ACTION_REVIEW,
                )
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val reviewPending = PendingIntent.getActivity(
                context,
                REQUEST_REVIEW,
                review,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            val raw = context
                .getSharedPreferences(
                    WidgetSnapshotContract.PREFS_FILE,
                    Context.MODE_PRIVATE,
                )
                .getString(WidgetSnapshotContract.SNAPSHOT_KEY, null)
            val now = System.currentTimeMillis()
            val rendered = WidgetSnapshotContract.render(
                WidgetSnapshotContract.parse(raw),
                now,
                timeLabel = { ms ->
                    SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ms))
                },
                dateTimeLabel = { ms ->
                    SimpleDateFormat("HH:mm dd/MM", Locale.getDefault()).format(Date(ms))
                },
            )

            return RemoteViews(context.packageName, R.layout.widget_quick_capture).apply {
                setOnClickPendingIntent(R.id.widget_capture_button, capturePending)
                setOnClickPendingIntent(R.id.widget_data, openPending)
                setOnClickPendingIntent(R.id.widget_review_row, reviewPending)
                setTextViewText(R.id.widget_balance_value, rendered.total)
                setTextViewText(R.id.widget_safespend_value, rendered.safeSpend)
                setTextViewText(R.id.widget_caption, rendered.caption)
                // Unknown or stale count → the row hides outright; the
                // widget never shows a number it can't stand behind.
                setViewVisibility(
                    R.id.widget_review_row,
                    if (rendered.review == null) View.GONE else View.VISIBLE,
                )
                setTextViewText(
                    R.id.widget_review_value,
                    rendered.review ?: "",
                )
            }
        }
    }
}
