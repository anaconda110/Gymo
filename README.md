# Gymo

Gymo is an Android fitness workout tracking app built with Jetpack Compose. It supports exercise selection, dynamic set addition, inline set editing, completion checkmarks, and workout history archiving — designed for a frictionless logging experience.

## Features

- **Exercise Picker Dialog**: 34 preset push/pull/leg exercises, grouped by target muscle, one-tap to add to current workout
- **Dynamic Set Addition**: Add sets anytime within an exercise card, auto-inheriting previous set's weight and reps
- **Inline Set Editing**: Weight and reps editable in-row, fault-tolerant parsing, persisted on focus loss
- **Completion Checkmark**: Toggle completion state per set, instantly synced to database
- **Set Deletion**: Delete any set, UI numbering auto-adjusts (no gaps)
- **Workout History**: Completed workouts listed in reverse chronological order, expandable to view exercises and set details
- **Auto Session Creation**: Adding an exercise with no active session automatically starts a new workout

## Tech Stack

- **Kotlin** 100%
- **Jetpack Compose** — Declarative UI
- **Material 3** — Design components
- **Room** — Local database persistence
- **ViewModel + StateFlow** — Reactive state management
- **Coroutines Flow** — Async data streams
- **Repository Pattern** — Data layer abstraction

## Project Structure

```
app/src/main/java/com/example/gymo/
├── MainActivity.kt                 # Entry + bottom navigation (Workout/History tabs)
├── data/
│   ├── AppDatabase.kt              # Room database + preset exercises
│   ├── GymoDao.kt                  # DAO interface
│   ├── GymoRepository.kt           # Data repository
│   ├── Exercise.kt                 # Exercise entity
│   ├── WorkoutSession.kt           # Workout session entity
│   ├── WorkoutExercise.kt          # Workout-exercise association entity
│   └── ExerciseSet.kt             # Set entity
└── ui/
    ├── WorkoutViewModel.kt         # Workout page ViewModel
    ├── GymoViewModelFactory.kt      # ViewModel factory
    ├── WorkoutScreen.kt            # Main workout screen + exercise cards + picker dialog
    ├── HistoryScreen.kt            # History screen
    └── theme/                      # Material 3 theme
```

## Build & Run

### Prerequisites

- Android Studio
- JDK 17+
- Android SDK (see `app/build.gradle.kts` for minSdk)

### Steps

1. Clone the repository
   ```bash
   git clone git@github.com:anaconda110/Gymo.git
   cd Gymo
   ```

2. Open the project in Android Studio and wait for Gradle sync

3. Connect an Android device or start an emulator, then click Run

Or build from command line:
```bash
./gradlew assembleDebug
```

## Data Model

| Entity | Description |
|--------|-------------|
| `Exercise` | Exercise library (name, target muscle, type, custom flag) |
| `WorkoutSession` | A workout session (start/end timestamps) |
| `WorkoutExercise` | Workout-exercise association (with display order) |
| `ExerciseSet` | A set (weight, reps, set type, completion status) |

## License

This project is licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 anaconda110