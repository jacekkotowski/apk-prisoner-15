# Prisoner 15

A minimal, offline Android morning routine: push-ups and squats, never more than 15 minutes. No account, no network permission, no libraries.

- Monday, Wednesday, Friday: push-ups and squats, moderate. Tuesday, Thursday, Saturday: uneven push-ups and Bulgarian split squats, light. Sunday: easy recovery.
- Energy: Exhausted (two easy rounds), Normal and Strong (4 rounds by default; Setup offers 2, 4 or 6). Rounds are always even. A session that does not fit in 15 minutes first gets shorter rests, then fewer rounds, then fewer repetitions.
- One-sided exercises are done in pairs with equal repetitions on both sides.
- Push-ups are counted by touching the marked pad with your nose (counted at first contact), by the proximity sensor, or both. Squats: do the set, tap done, correct with − and +.
- Repetition targets come from your own capacities and rise only after two clean, comfortable sessions of the same variation.
- Short sessions are stored as work done. The session ends by itself at 15:00.
- Run screen: Galloway run-walk-run calculator (pace or timed 1.6 km gives run and walk seconds) and an interval timer that speaks "Run" and "Walk" with the screen off, lowering your music only while it speaks.

## Layout

- `app/assets/engine.js`: the training plan, progression, repetition detector and statistics. Pure functions.
- `app/assets/index.html`: the interface, shown in a WebView.
- `app/src/pl/prisoner15/`: `RunService` (run-walk timer, speech), `MainActivity` (WebView, proximity sensor, tones, vibration), `Reminder` (morning notification with snooze).

## Build

Hand-built, no Gradle: aapt2, javac, d8, zipalign, apksigner from Android SDK build-tools 36.0.0 and platform android-36.

    printf 'KS_FILE=/path/to/prisoner15.keystore\nKS_PASS=...\n' > signing.env
    ./build.sh

The keystore is never committed. Updates install over an older build only when signed with the same key.

## Tests

    node tests/engine.test.js
    node tests/ui.js        # needs Playwright
