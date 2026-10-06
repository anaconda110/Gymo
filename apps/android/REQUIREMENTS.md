# Gymo Requirements Roadmap

This document outlines the roadmap for future Gymo iterations, organized by priority and mapped to feature branches.

---

## P0 — Core Experience

### Requirement 1: Exercise Library Management
**Branch**: `feature/exercise-manager`

**Background**: The current exercise library has 34 preset exercises with no way for users to customize.

**Features**:
1. Add custom exercises: name, target muscle, type (barbell/dumbbell/machine/bodyweight)
2. Edit existing exercises: modify name/muscle/type
3. Delete exercises: soft delete (preset exercises with `isCustom=false` cannot be deleted, only hidden)
4. Exercise search: add a search box in the picker dialog, fuzzy match by name/muscle
5. Muscle group filter tabs: horizontal scrollable filter at the top of the picker dialog

**Acceptance Criteria**:
- Users can add custom exercises and immediately see them in the picker dialog
- Editing an exercise name syncs to workout history
- Searching "bench press" matches "Barbell Bench Press", "Dumbbell Bench Press", etc.

---

## P1 — Data & Statistics

### Requirement 2: Workout Statistics
**Branch**: `feature/workout-stats`

**Background**: Users need to review training volume and frequency to track progress.

**Features**:
1. Stats page (third tab): total workout count, total sets, total volume (Σ weight×reps)
2. Weekly training frequency heatmap (similar to GitHub contribution graph)
3. Per-exercise weight trend line chart (max weight over last 10 sessions)
4. Monthly training volume bar chart (grouped by muscle)

**Acceptance Criteria**:
- Stats update in real-time as workouts are completed
- Charts scroll smoothly on low-end devices (Canvas or MPAndroidChart)

---

### Requirement 3: Data Backup & Export
**Branch**: `feature/data-backup`

**Background**: Data is lost when switching devices or reinstalling; backup capability is needed.

**Features**:
1. Export: database to JSON file (all Sessions/Exercises/Sets)
2. Import: restore from JSON (merge strategy: deduplicate by id, skip if exists)
3. Share: send JSON via system share sheet (WeChat/email/etc.)
4. Auto-backup: export to app-private directory after each completed workout

**Acceptance Criteria**:
- Exported JSON can be imported on another device to fully restore workout records
- Import does not corrupt existing data (skip on id conflict, not overwrite)

---

## P2 — Interaction Polish

### Requirement 4: UI Polish
**Branch**: `feature/ui-polish`

**Background**: Current UI is function-first, lacking animations and visual hierarchy.

**Features**:
1. `AnimatedVisibility` transitions for exercise card add/remove
2. `animateItemPlacement` for smooth set row add/remove
3. Scale feedback animation on completion checkmark
4. Empty state illustrations (Lottie or vector)
5. Dark/light theme toggle (settings page)
6. Gradient backgrounds and shadow depth for workout cards

**Acceptance Criteria**:
- Animations ≥ 60fps, no jank
- Dark mode text contrast meets WCAG AA

---

### Requirement 5: Set Drag-to-Reorder
**Branch**: `feature/set-reorder`

**Background**: Users may add sets in the wrong order and need to drag to rearrange.

**Features**:
1. Long-press a set row to enter drag mode
2. Real-time UI reorder during drag
3. Batch update database `setIndex` on release (transaction)
4. Drag handle icon (≡) to indicate draggability

**Acceptance Criteria**:
- UI numbering matches database `setIndex` after drag
- Other rows smoothly avoid the dragged row

---

## Priority Overview

| Priority | Requirement | Branch | Status |
|----------|-------------|--------|--------|
| P0 | Exercise Library Management | `feature/exercise-manager` | To Do |
| P1 | Workout Statistics | `feature/workout-stats` | To Do |
| P1 | Data Backup & Export | `feature/data-backup` | To Do |
| P2 | UI Polish | `feature/ui-polish` | To Do |
| P2 | Set Drag-to-Reorder | `feature/set-reorder` | To Do |

---

## Development Workflow

1. Switch to the corresponding feature branch
   ```bash
   git checkout develop
   git checkout feature/xxx
   ```
2. Implement features one by one and commit
3. Merge back to `develop` after self-testing
4. Merge `develop` to `main` and tag after full testing