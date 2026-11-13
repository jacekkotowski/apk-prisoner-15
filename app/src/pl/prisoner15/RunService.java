package pl.prisoner15;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import java.util.Locale;

/** Run-walk-run interval timer. Keeps time with the screen off and speaks "Run" and "Walk" over the user's music, which is only lowered while it speaks. */
public class RunService extends Service {
    static volatile boolean on;
    static volatile long t0;
    static volatile int run, walk, total;

    private final Handler h = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean ttsOk, half;
    private int seg = -1;
    private PowerManager.WakeLock lock;
    private AudioManager am;
    private AudioFocusRequest focus;
    private ToneGenerator tone;
    private Vibrator vib;

    /** What the screen shows: phase, seconds left in it, seconds elapsed and total. */
    static String state() {
        if (!on) return "{\"on\":false}";
        double e = Math.min(total, (SystemClock.elapsedRealtime() - t0) / 1000.0), pos = e % (run + walk);
        boolean r = pos < run;
        return "{\"on\":true,\"phase\":\"" + (r ? "run" : "walk") + "\",\"left\":" + (r ? run - pos : run + walk - pos) + ",\"elapsed\":" + e + ",\"total\":" + total + "}";
    }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent in, int flags, int id) {
        if (in == null) { stopSelf(); return START_NOT_STICKY; }
        run = Math.max(1, in.getIntExtra("run", 60)); walk = Math.max(1, in.getIntExtra("walk", 30)); total = Math.max(60, in.getIntExtra("total", 1800));
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.createNotificationChannel(new NotificationChannel("run", "Run timer", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 3, new Intent(this, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, "run").setSmallIcon(R.drawable.ic_stat).setContentTitle("Run · walk · run").setContentText("Timer running. Tap to open.").setContentIntent(open).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(16, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE); else startForeground(16, n);

        am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(aa).build();
        try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 90); } catch (RuntimeException e) { tone = null; }
        if (lock == null) { lock = ((PowerManager) getSystemService(Context.POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "prisoner15:run"); }
        if (lock.isHeld()) lock.release();
        lock.acquire((total + 30) * 1000L);
        if (tts == null) tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            int r = tts.setLanguage(Locale.US);
            ttsOk = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
            tts.setAudioAttributes(aa);
        });
        h.removeCallbacksAndMessages(null);
        seg = -1; half = false; t0 = SystemClock.elapsedRealtime() + 3000; on = true; // three seconds to put the phone away
        h.postDelayed(this::tick, 3000);
        return START_NOT_STICKY;
    }

    private void tick() {
        if (!on) return;
        double e = (SystemClock.elapsedRealtime() - t0) / 1000.0;
        if (e >= total) { say("Done. Well run.", 3); on = false; h.postDelayed(this::stopSelf, 4000); return; }
        int cyc = run + walk, s = (int) (e / cyc) * 2 + (e % cyc < run ? 0 : 1);
        if (!half && e >= total / 2.0) { half = true; say("Halfway.", 0); }
        if (s != seg) { seg = s; say(s % 2 == 0 ? "Run" : "Walk", s % 2 == 0 ? 1 : 2); }
        h.postDelayed(this::tick, 200);
    }

    /** Speaks, or beeps when no voice is installed; buzzes 1 = run, 2 = walk, 3 = finished. */
    private void say(String text, int buzz) {
        if (ttsOk) {
            am.requestAudioFocus(focus);
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, "p15");
            h.postDelayed(() -> am.abandonAudioFocusRequest(focus), 2500);
        } else if (tone != null && buzz > 0) tone.startTone(buzz == 1 ? ToneGenerator.TONE_PROP_BEEP : buzz == 2 ? ToneGenerator.TONE_PROP_BEEP2 : ToneGenerator.TONE_PROP_ACK, 400);
        if (buzz > 0 && vib != null && vib.hasVibrator())
            vib.vibrate(VibrationEffect.createWaveform(buzz == 1 ? new long[]{0, 500} : buzz == 2 ? new long[]{0, 150, 150, 150} : new long[]{0, 200, 150, 200, 150, 500}, -1));
    }

    @Override public void onDestroy() {
        on = false; h.removeCallbacksAndMessages(null);
        if (am != null && focus != null) am.abandonAudioFocusRequest(focus);
        if (tts != null) tts.shutdown();
        if (tone != null) tone.release();
        if (lock != null && lock.isHeld()) lock.release();
        super.onDestroy();
    }
}
