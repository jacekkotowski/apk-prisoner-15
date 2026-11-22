# Prisoner 15

A minimal, offline Android morning routine: push-ups and squats, never more than 15 minutes. No account, no network permission, no libraries.

- Every session has two halves. Warm-up half: the first 2 rounds, standard push-ups and squats. Heavy half: the remaining rounds, uneven push-ups and Bulgarian split squats, both sides each round. Monday, Wednesday, Friday are moderate, Tuesday, Thursday, Saturday light, Sunday is 2 easy standard rounds.
- Energy: Exhausted (2 standard rounds), Normal and Strong (4 rounds by default; Setup offers 2, 4 or 6). Rounds are always even. A session that does not fit in 15 minutes first gets shorter rests, then fewer heavy rounds, then fewer repetitions; the two standard rounds stay.
- One-sided exercises are done in pairs with equal repetitions on both sides.
- Push-ups are counted by touching the marked pad with your nose (counted at first contact), by the proximity sensor, or both. Squats: do the set, tap done, correct with − and +.
- Repetition targets come from your own capacities and rise only after two clean, comfortable sessions of the same variation.
- Short sessions are stored as work done. The session ends by itself at 15:00.
- Two tabs, Strength and Run. Run: Galloway run-walk-run with a step plan (15/45 s up to 5 min / 30 s). Two comfortable runs of 20+ minutes move one step up. The timer speaks "Run" and "Walk" with the screen off, keeps going past the target until you stop, and lowers your music only while it speaks. Running every second day is suggested, never required.

- Comeback: the home screen shows where your numbers started and where they are, a test day is offered every four weeks, a missed day preselects the short session, Sunday gives one sentence about the week, and Setup saves or loads a backup file of your history.

- Workout voice: counts 3, 2, 1 into the first set, announces round, exercise, side and target, and gives one short tension cue; Setup can switch it off.

- Path (a section of Record): six steps from the uneven push-up to the one-arm push-up, and from the Bulgarian split squat to the pistol. You move up by choice once the capacity reaches 10; the capacity then restarts at half. The home screen has one message line: the first of resume, test day, missed day, next step, Sunday sentence, milestone, comeback.

## Releases

Every build is published as a GitHub Release with the signed APK attached. It is automatic: pushing a tag like `v0.8.0` (equal to `versionName` in `app/AndroidManifest.xml`) runs `.github/workflows/release.yml`, which runs the engine and screen tests, builds, checks the signing key and version, and publishes the release. Release notes come from `docs/releases/vX.Y.Z.md`.

One-time setup, in the repository's Settings, Secrets and variables, Actions, New repository secret:

- `KEYSTORE_B64`: the keystore file from the private `apk-signing-keys` repository (`apk-prisoner-15/prisoner15.keystore`) as base64. On Linux or macOS: `base64 -w0 prisoner15.keystore` (macOS: `base64 -i prisoner15.keystore`). On Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("prisoner15.keystore"))`.
- `KS_PASS`: the value after `KS_PASS=` in `apk-prisoner-15/signing.env` in the same repository.

Phone-only alternative: one secret, `KEYS_TOKEN`, a fine-grained personal access token (github.com, Settings, Developer settings) with read-only Contents access to `jacekkotowski/apk-signing-keys`. The workflow then reads the keystore and password from that repository, so `KEYSTORE_B64` and `KS_PASS` are not needed.

To release without pushing a tag: Actions tab, Release, Run workflow, enter the version (for example `0.8.0`). Tick dry run to test, build and check the signature without publishing anything.

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
    node tests/ui.js        # needs Playwright; the Release workflow runs both
