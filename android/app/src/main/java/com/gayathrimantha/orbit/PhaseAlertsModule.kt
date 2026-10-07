package com.gayathrimantha.orbit

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/**
 * Schedules an exact alarm for each remaining phase change while the app is
 * in the background; PhaseAlertReceiver turns each into a notification. The
 * Android counterpart of ios/Orbit/PhaseAlerts.swift, driven by src/alerts.ts.
 */
class PhaseAlertsModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private val alarms = context.getSystemService(AlarmManager::class.java)
    private val prefs = context.getSharedPreferences("orbit.alerts", Context.MODE_PRIVATE)

    override fun getName() = "PhaseAlerts"

    /** The runtime prompt is shown from JS (PermissionsAndroid); this reports the result. */
    @ReactMethod
    fun requestPermission(promise: Promise) {
        promise.resolve(NotificationManagerCompat.from(context).areNotificationsEnabled())
    }

    @ReactMethod
    fun schedule(alerts: ReadableArray) {
        val now = System.currentTimeMillis()
        val codes = mutableSetOf<String>()
        for (i in 0 until alerts.size()) {
            val alert = alerts.getMap(i) ?: continue
            val at = alert.getDouble("at").toLong()
            if (at - now < 500) continue
            val code = alert.getString("id").hashCode()
            val pending = pendingIntent(code, alert.getString("title"), alert.getString("body"))
            // Timer apps may use exact alarms (USE_EXACT_ALARM); inexact ones can
            // drift by minutes under Doze, which is useless for a 20 second interval.
            if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            }
            codes += code.toString()
        }
        prefs.edit().putStringSet(KEY_CODES, codes).apply()
    }

    @ReactMethod
    fun cancelAll() {
        val notifications = NotificationManagerCompat.from(context)
        prefs.getStringSet(KEY_CODES, emptySet())!!.forEach {
            val code = it.toInt()
            alarms.cancel(pendingIntent(code, null, null))
            notifications.cancel(code)
        }
        prefs.edit().remove(KEY_CODES).apply()
    }

    private fun pendingIntent(code: Int, title: String?, body: String?): PendingIntent {
        val intent = Intent(context, PhaseAlertReceiver::class.java)
            .putExtra(EXTRA_CODE, code)
            .putExtra(EXTRA_TITLE, title)
            .putExtra(EXTRA_BODY, body)
        return PendingIntent.getBroadcast(
            context, code, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    companion object {
        private const val KEY_CODES = "codes"
        const val EXTRA_CODE = "code"
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
    }
}

class PhaseAlertReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL, "Phase changes", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "A cue when each work, rest or focus phase begins"
                    vibrationPattern = longArrayOf(0, 120, 80, 120)
                    enableVibration(true)
                },
            )
        }
        val open = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_orbit)
            .setContentTitle(intent.getStringExtra(PhaseAlertsModule.EXTRA_TITLE))
            .setContentText(intent.getStringExtra(PhaseAlertsModule.EXTRA_BODY))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(open)
            .setAutoCancel(true)
            .setTimeoutAfter(TIMEOUT_MS)
            .build()
        if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            manager.notify(intent.getIntExtra(PhaseAlertsModule.EXTRA_CODE, 0), notification)
        }
    }

    companion object {
        private const val CHANNEL = "phases"
        // A phase cue is stale once the next one arrives.
        private const val TIMEOUT_MS = 60_000L
    }
}
