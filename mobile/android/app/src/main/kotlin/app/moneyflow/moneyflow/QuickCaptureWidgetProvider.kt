package app.moneyflow.moneyflow

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Home-screen widget — app name plus a one-tap "＋ Ghi" button that
 * opens the capture form via the same `quick=capture` extra the
 * launcher shortcut uses.
 *
 * Deliberately displays no data: a balance widget would need a
 * background-sync path for the ledger, which is out of scope for this
 * entry-point pass. The whole surface is a launch affordance, nothing
 * more.
 */
class QuickCaptureWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        val intent = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_QUICK_ACTION, MainActivity.QUICK_ACTION_CAPTURE)
            // singleTop + this flag route the tap through onNewIntent
            // when the activity is already alive (warm path).
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(
            context,
            REQUEST_CAPTURE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_capture)
            views.setOnClickPendingIntent(R.id.widget_capture_button, pending)
            views.setOnClickPendingIntent(R.id.widget_title, pending)
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    companion object {
        // PendingIntent request code — only the capture intent exists.
        private const val REQUEST_CAPTURE = 1
    }
}
