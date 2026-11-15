# Prisoner 15

Hand-built Android APK, no Gradle and no libraries. Package `pl.prisoner15`. WebView UI in `app/assets/index.html`, training engine in `app/assets/engine.js`, sensor and reminder in `app/src/pl/prisoner15/`. Interface text is English.

Rules:

- Strength work is only push-ups and squats; the Run screen is a separate Galloway run-walk timer. A session never exceeds 15 minutes (`LIMIT`, `BUDGET` in `engine.js`).
- No network permission, no accounts, no added libraries.
- Never commit `*.keystore`, `*.jks`, `signing.env` or APK files.
- **Signing key:** it lives only in the private GitHub repository `jacekkotowski/apk-signing-keys`, folder `apk-prisoner-15` (files `prisoner15.keystore` and `signing.env`, same arrangement as `apk-heart-sounds`). Before building, get it from there: attach that repository to the session, copy both files into the project root (they are git-ignored), then run `./build.sh`. Never generate a new key: an APK signed with a different key cannot update the installed app and the user's history would be lost. Check the build with `apksigner verify --print-certs`: the certificate SHA-256 must be `8be0199b1c6af26849f1ff522e616a053ca1130c10253df85f139327a8b781cf`. If the key is missing from that folder, stop and ask the user.
- Source lives in `jacekkotowski/apk-prisoner-15`, branch `main`.
- Run `node tests/engine.test.js` and `node tests/ui.js` before handing over a build. State plainly what was not tested on a phone.
- Raise `versionCode` and the version name with each delivered build.
