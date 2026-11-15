package pl.prisoner15;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.Calendar;

/** One morning notification a day, with a ten-minute snooze. Rescheduled after each firing, restart and update. */
public class Reminder extends BroadcastReceiver {
    static final String FIRE = "pl.prisoner15.FIRE", SNOOZE = "pl.prisoner15.SNOOZE", CH = "morning";
    static final int ID = 15, SNOOZE_MIN = 10;

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("reminder", Context.MODE_PRIVATE); }
    static boolean on(Context c) { return prefs(c).getBoolean("on", false); }
    static int hour(Context c) { return prefs(c).getInt("h", 6); }
    static int minute(Context c) { return prefs(c).getInt("m", 30); }

    static void save(Context c, boolean on, int h, int m) {
        prefs(c).edit().putBoolean("on", on).putInt("h", Math.max(0, Math.min(23, h))).putInt("m", Math.max(0, Math.min(59, m))).apply();
        schedule(c);
    }

    private static PendingIntent fire(Context c) {
        return PendingIntent.getBroadcast(c, 0, new Intent(c, Reminder.class).setAction(FIRE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void setAt(Context c, long when) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, fire(c));
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, fire(c));
    }

    /** Sets the next firing at the chosen time, today or tomorrow; cancels it when the reminder is off. */
    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(fire(c));
        if (!on(c)) return;
        Calendar t = Calendar.getInstance();
        t.set(Calendar.HOUR_OF_DAY, hour(c)); t.set(Calendar.MINUTE, minute(c)); t.set(Calendar.SECOND, 0); t.set(Calendar.MILLISECOND, 0);
        if (t.getTimeInMillis() <= System.currentTimeMillis() + 1000) t.add(Calendar.DAY_OF_YEAR, 1);
        setAt(c, t.getTimeInMillis());
    }

    @Override public void onReceive(Context c, Intent in) {
        String a = in.getAction();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (SNOOZE.equals(a)) { nm.cancel(ID); setAt(c, System.currentTimeMillis() + SNOOZE_MIN * 60000L); return; }
        if (!FIRE.equals(a)) { schedule(c); return; } // restart or app update
        if (!on(c)) return;
        nm.createNotificationChannel(new NotificationChannel(CH, "Morning reminder", NotificationManager.IMPORTANCE_HIGH));
        PendingIntent open = PendingIntent.getActivity(c, 1, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent snooze = PendingIntent.getBroadcast(c, 2, new Intent(c, Reminder.class).setAction(SNOOZE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        // Never miss twice: after a missed day the reminder asks only for the short session.
        Calendar y = Calendar.getInstance(); y.add(Calendar.DAY_OF_YEAR, -1);
        String last = prefs(c).getString("last", null), yk = String.format(java.util.Locale.US, "%04d-%02d-%02d", y.get(Calendar.YEAR), y.get(Calendar.MONTH) + 1, y.get(Calendar.DAY_OF_MONTH));
        boolean missed = last != null && last.compareTo(yk) < 0;
        Notification n = new Notification.Builder(c, CH).setSmallIcon(R.drawable.ic_stat).setContentTitle(missed ? "Short one today." : "Your 15 minutes.")
                .setContentText(missed ? "Four minutes. Two easy rounds. Tap to start." : "Push-ups and squats. Tap to start.")
                .setContentIntent(open).setAutoCancel(true).addAction(new Notification.Action.Builder(null, "Snooze 10 min", snooze).build()).build();
        nm.notify(ID, n);
        schedule(c);
    }
}
