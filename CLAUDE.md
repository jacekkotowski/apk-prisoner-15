# Prisoner 15

Hand-built Android APK, no Gradle and no libraries. Package `pl.prisoner15`. WebView UI in `app/assets/index.html`, training engine in `app/assets/engine.js`, sensor and reminder in `app/src/pl/prisoner15/`. Interface text is English.

Rules:

- Only push-ups and squats. A session never exceeds 15 minutes (`LIMIT`, `BUDGET` in `engine.js`).
- No network permission, no accounts, no added libraries.
- Never commit `*.keystore` or `signing.env`.
- Run `node tests/engine.test.js` and `node tests/ui.js` before handing over a build. State plainly what was not tested on a phone.
- Raise `versionCode` and the version name with each delivered build.
