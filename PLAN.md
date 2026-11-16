# Prisoner 15: status and plan

For a stressed person who used to be fit. The aim is that he keeps coming back: the app shows the comeback, forgives a missed day, and never becomes one more demand.

## Status: v0.8.0

Done: Strength tab (push-ups and squats, weekly variations, even rounds, equal sides, nose pad, 15-minute cap, progression, morning reminder), Run tab (Galloway run/walk steps, spoken timer with the screen off, loud cues, flexible length, run log), Record, the v0.8 one-arm push-up and pistol paths (Path screen, six steps each, you move up by choice once the capacity reaches 10, the capacity then restarts at half) with optional 1-2-3 ladders on the light days, the v0.7 walking and running detection (optional step sensor: cadence on the run screen, one warning if you keep running 12 seconds into a walk break, steps and an estimated distance in the log), the v0.6 workout voice, and the v0.5 "Comeback" set: comeback line (first capacity to today's), test day every four weeks (offered, replaces that day's session, open sets, equal sides, sets the capacities), never miss twice (after a missed day the home screen preselects the short session and the reminder text changes), Sunday weekly sentence, 7/30/100-day milestones, backup to and from a file.

Not yet confirmed on a phone: the path steps (set-ups, the threshold of 10, the halved restart), the ladders, the step detection and its running threshold (135 steps/min is a guess), the workout voice and the 3-2-1, nose pad (v0.3.0), loud cues, a full run with the screen off, the reminder and its missed-day text, the backup file picker.

Notes: test day treats the stopped set (form slows, not failure) as the new capacity; targets stay a fraction of it. The comeback line starts from the first capacities stored, or from the capacities at the time of the v0.5 update for older histories.

## v0.6 "Eyes-free" (done)

Spoken cues in Strength: 3, 2, 1 at the end of the warm-up; on each set the round (first set of a round), exercise, side and target; "Rest."; "Done."; the second side of a pair is short ("Right hand. 8."). One tension cue per set on screen, spoken once per exercise per session. Setup has "Voice in workout". Over your music, which is only lowered while the voice speaks. Without an installed English voice it stays silent and the beeps remain.

Cue wording is ours, from general knowledge of the book's techniques, not checked against the book.

## Open now

1. **Release on GitHub:** add the secrets `KEYSTORE_B64` and `KS_PASS` (README, section Releases), then run the Release workflow with version 0.8.0 (the first run on 2026-11-16 stopped at the missing secrets). After that every build is released by pushing a tag.
2. **Phone test of everything since v0.3.0:** nose pad, workout voice and 3-2-1, loud run cues, a full run with the screen off, walking and running detection (threshold 135 steps per minute is a guess), the reminder and its missed-day text, backup file picker, path steps and ladders. What breaks decides the next build.

## Later, only if the owner asks

- 5 km goal on the Run tab; GPS distance and pace (adds the location permission; the steps estimate is what exists now).
- Camera squat counting.

## Not planned

Breathing or meditation screens, badges, points, sharing, more exercises, more settings, anything that punishes a missed day, static back exercises.
