# Prisoner 15: status and plan

For a stressed person who used to be fit. The aim is that he keeps coming back: the app shows the comeback, forgives a missed day, and never becomes one more demand.

## Status: v1.1.0 (mixed sessions, decluttered)

Done: Strength tab (push-ups and squats, every session in two halves: the first 2 rounds standard push-ups and squats, the rest uneven push-ups and Bulgarian split squats, even rounds, equal sides, nose pad, 15-minute cap, progression of every variation, morning reminder), Run tab (Galloway run/walk steps, spoken timer with the screen off, loud cues, flexible length, run log), Record with the Path section (six steps toward the one-arm push-up and the pistol, you move up by choice once the capacity reaches 10, the capacity then restarts at half), the v0.6 workout voice, and the v0.5 "Comeback" set (test day every four weeks, never miss twice, Sunday weekly sentence, milestones, backup to and from a file). The home screen has one message line. The saved state is upgraded by `migrate()` (v 2); backups with v 1 or 2 load.

Not yet confirmed on a phone: the mixed session, the message line, the Path inside Record, the migration of the real v0.8 history, the workout voice and the 3-2-1, nose pad, loud cues, a full run with the screen off, the reminder and its missed-day text, the backup file picker.

Notes: test day treats the stopped set (form slows, not failure) as the new capacity; targets stay a fraction of it. The comeback line starts from the first capacities stored, or from the capacities at the time of the v0.5 update for older histories.

## v0.6 "Eyes-free" (done)

Spoken cues in Strength: 3, 2, 1 at the end of the warm-up; on each set the round (first set of a round), exercise, side and target; "Rest."; "Done."; the second side of a pair is short ("Right hand. 8."). One tension cue per set on screen, spoken once per exercise per session. Setup has "Voice in workout". Over your music, which is only lowered while the voice speaks. Without an installed English voice it stays silent and the beeps remain.

Cue wording is ours, from general knowledge of the book's techniques, not checked against the book.

## Open now

1. **Release v1.1.0 on GitHub:** the Release workflow (secrets `KEYSTORE_B64` and `KS_PASS`, README section Releases) after the branch is merged. Save a backup in the old version before installing.
2. **Phone test:** a mixed session, the message line, Record with the Path, the real history after the update, nose pad, workout voice and 3-2-1, loud run cues, a full run with the screen off, the reminder and its missed-day text, backup file picker. What breaks decides the next build.

## Later, only if the owner asks

- 1-2-3 ladders on the light days (cut in v1.1.0).
- Walking and running detection with the step sensor (cut in v1.1.0; it needed the physical-activity permission and its running threshold was a guess).
- 5 km goal on the Run tab; GPS distance and pace (adds the location permission; the steps estimate is what exists now).
- Camera squat counting.

## Not planned

Breathing or meditation screens, badges, points, sharing, more exercises, more settings, anything that punishes a missed day, static back exercises.
