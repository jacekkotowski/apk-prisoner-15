# Prisoner 15: status and plan

For a stressed person who used to be fit. The aim is that he keeps coming back: the app shows the comeback, forgives a missed day, and never becomes one more demand.

## Status: v0.4.0

Done: Strength tab (push-ups and squats, weekly variations, even rounds, equal sides, nose pad, 15-minute cap, progression, morning reminder), Run tab (Galloway run/walk steps, spoken timer with the screen off, loud cues, flexible length, run log), Record.

Not yet confirmed on a phone: nose pad (v0.3.0), loud cues, a full run with the screen off, the reminder.

## v0.5 "Comeback" (next)

No new permissions. Each item is small.

1. **Comeback line** on the home screen: first capacity and today's, per exercise ("Push-ups 10 → 16"). Needs the starting capacities stored once.
2. **Test day** every four weeks: one clean maximum set of each exercise, stopped when form slows, not at failure. Sets the capacities. Offered, never forced; replaces that day's session; inside 15 minutes; one-sided tests keep equal sides.
3. **Never miss twice**: after a missed day the reminder text becomes "Short one today. Four minutes." and the app opens with the 2-round session preselected. No streaks.
4. **Weekly verdict** on Sunday: one sentence with days served, repetitions and the change from last week.
5. **Milestones** on the tally wall at 7, 30 and 100 days served, one short line each.
6. **Backup**: save history to a file and load it back. Uses the system file picker, so no storage permission.

Done when: engine and UI tests cover each item, the build is signed with the stored key, and the owner has tried it.

## v0.6 "Eyes-free"

7. Spoken cues in Strength (round, rest, side) and a 3-2-1 countdown before the first set.
8. One tension cue per set (from *The Naked Warrior*: crush the floor, glutes tight, sharp exhale).

Starts after the owner has used the nose pad for a week, because both change the workout screen.

## Later, only if the owner asks

- Path toward the one-arm push-up and the pistol; 1-2-3 ladder mode on uneven days.
- 5 km goal on the Run tab; distance and walking/running detection from the step sensor or GPS (adds permissions).
- Camera squat counting.

## Not planned

Breathing or meditation screens, badges, points, sharing, more exercises, more settings, anything that punishes a missed day, static back exercises.
