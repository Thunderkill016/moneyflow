package app.moneyflow.moneyflow

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import io.flutter.plugin.common.EventChannel
import org.json.JSONArray
import org.json.JSONObject

/**
 * Opt-in bank/wallet notification listener (Android-only pilot).
 *
 * What it does, in order:
 *  1. looks up [StatusBarNotification.getPackageName] in
 *     [BankNotificationSources] — BEFORE reading a single byte of content, so
 *     a notification from any other app is rejected without ever touching it;
 *  2. reads title + body text (extras only — contentIntent/actions are never
 *     touched, so the listener can never act on the user's behalf);
 *  3. hands the event to [NotificationCaptureBridge], which either streams it
 *     to the running Dart side or parks it in a small persisted queue that
 *     [MainActivity] drains on the next consume call.
 *
 * What it deliberately does NOT do: post anything to the ledger (Dart turns
 * each event into a reviewable inbox draft — never a transaction), read other
 * apps, or run unless the user granted Notification Access in system settings.
 */
class NotificationCaptureService : NotificationListenerService() {
    override fun onListenerConnected() {
        Log.i(TAG, "notification listener connected")
    }

    override fun onListenerDisconnected() {
        // The system may rebind later; the persisted queue means nothing
        // already captured is lost while disconnected.
        Log.i(TAG, "notification listener disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Whitelist FIRST: a non-bank package must not have its content read.
        val sourceLabel = BankNotificationSources.labelFor(sbn.packageName) ?: return

        val notification = sbn.notification
        // Group summaries re-state what their children already carry; the
        // per-child events dedupe through the same key anyway, but skipping
        // the summary avoids a guaranteed duplicate at the source.
        if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        // BIG_TEXT carries the full bank message when expanded; TEXT is the
        // collapsed body and the fallback.
        val text =
            (
                extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                    ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ).orEmpty()
        if (title.isBlank() && text.isBlank()) return

        NotificationCaptureBridge.dispatch(
            applicationContext,
            mapOf(
                "packageName" to sbn.packageName,
                "sourceLabel" to sourceLabel,
                "title" to title,
                "text" to text,
                "postTime" to sbn.postTime,
            ),
        )
    }

    companion object {
        private const val TAG = "NotifCapture"
    }
}

/**
 * Delivery point between the listener service and the Flutter engine.
 *
 * The service runs in the app process but has no FlutterEngine of its own, so
 * when Dart is not attached the event is parked in a bounded on-device queue
 * ([MainActivity] flushes it through `consumePendingCaptures`). The queue is
 * the ONLY place raw notification text is persisted, it is capped, and it is
 * cleared on consume, sign-out and data wipe.
 */
object NotificationCaptureBridge {
    private const val TAG = "NotifCaptureBridge"
    private const val PREFS = "mf_notif_pending"
    private const val KEY_EVENTS = "events"

    /** Pending-cap bound: enough for a weekend of bank pushes without letting
     *  uncollected raw text accumulate on disk forever. */
    private const val MAX_PENDING = 50

    @Volatile
    var sink: EventChannel.EventSink? = null

    fun dispatch(context: Context, event: Map<String, Any?>) {
        val active = sink
        if (active != null) {
            active.success(event)
        } else {
            enqueue(context, event)
        }
    }

    @Synchronized
    private fun enqueue(context: Context, event: Map<String, Any?>) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val list = readAll(prefs)
        list.put(JSONObject(event))
        while (list.length() > MAX_PENDING) list.remove(0)
        prefs.edit().putString(KEY_EVENTS, list.toString()).apply()
    }

    /** Drains the persisted queue — returned once, then cleared. */
    @Synchronized
    fun consumePending(context: Context): List<Map<String, Any?>> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val list = readAll(prefs)
        prefs.edit().remove(KEY_EVENTS).apply()
        val out = ArrayList<Map<String, Any?>>(list.length())
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val map = HashMap<String, Any?>()
            for (key in item.keys()) {
                map[key] = item.opt(key)
            }
            out.add(map)
        }
        return out
    }

    /** Drops every parked event — sign-out and data wipe call this so raw
     *  notification text never outlives the account it was captured for. */
    fun clearPending(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_EVENTS)
            .apply()
    }

    private fun readAll(prefs: android.content.SharedPreferences): JSONArray =
        try {
            JSONArray(prefs.getString(KEY_EVENTS, "[]") ?: "[]")
        } catch (e: Exception) {
            Log.w(TAG, "pending queue unreadable, resetting", e)
            JSONArray()
        }
}
