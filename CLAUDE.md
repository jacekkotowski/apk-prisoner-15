# Prisoner 15

Hand-built Android APK, no Gradle and no libraries. Package `pl.prisoner15`. WebView UI in `app/assets/index.html`, training engine in `app/assets/engine.js`, sensor and reminder in `app/src/pl/prisoner15/`. Interface text is English.

Status and roadmap: `PLAN.md`. Context material: `docs/plan.txt` is the owner's original plan. `docs/naked-warrior.md` is the training basis (Pavel Tsatsouline, *The Naked Warrior*): read it before changing the training logic, and keep only our own summary there, never the book's text or photos.

Rules:

- Strength work is only push-ups and squats; the Run screen is a separate Galloway run-walk timer. A session never exceeds 15 minutes (`LIMIT`, `BUDGET` in `engine.js`).
- Owner's training rules, never break them: the number of rounds is always even (2, 4 or 6); one-sided exercises (uneven push-ups, Bulgarian split squats) are always done in pairs with exactly equal repetitions on both sides (`P.target`, `P.hasFirst` in `engine.js`); no static back exercises (no planks or similar); the owner wants the absolute survival minimum.
- Running (Run tab) is flexible and never changes the strength plan: every second day is suggested, not required; a run of 20 minutes or more counts as done, longer is welcome (the timer goes past the target until stopped), shorter is logged. 5 km is a future goal, not the current one. Progression: run/walk steps (`LADDER`), two comfortable done runs step up.
- Push-ups are counted by touching the marked pad with the nose (counted at first contact, `pointerdown`); the proximity sensor is optional. Cues on the Run screen must be loud enough for noise (alarm volume).
- No network permission, no accounts, no added libraries.
- Never commit `*.keystore`, `*.jks`, `signing.env` or APK files.
- **Signing key:** it lives only in the private GitHub repository `jacekkotowski/apk-signing-keys`, folder `apk-prisoner-15` (files `prisoner15.keystore` and `signing.env`, same arrangement as `apk-heart-sounds`). Before building, get it from there: attach that repository to the session, copy both files into the project root (they are git-ignored), then run `./build.sh`. Never generate a new key: an APK signed with a different key cannot update the installed app and the user's history would be lost. Check the build with `apksigner verify --print-certs`: the certificate SHA-256 must be `8be0199b1c6af26849f1ff522e616a053ca1130c10253df85f139327a8b781cf`. If the key is missing from that folder, stop and ask the user.
- Source lives in `jacekkotowski/apk-prisoner-15`, branch `main`.
- Run `node tests/engine.test.js` and `node tests/ui.js` before handing over a build. State plainly what was not tested on a phone.
- Raise `versionCode` and the version name with each delivered build.
