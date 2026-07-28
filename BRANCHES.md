# Gymo Branch Strategy

Gymo uses a simplified Git Flow model, balancing development standards with the lightweight needs of a personal project.

## Branch Structure

```
main ── develop ── feature/exercise-manager
                  ├─ feature/workout-stats
                  ├─ feature/data-backup
                  ├─ feature/ui-polish
                  └─ feature/set-reorder
```

## Long-lived Branches

| Branch | Purpose | Description |
|--------|---------|-------------|
| `main` | Stable release branch | Only receives merges; always in a releasable state; tag on each merge |
| `develop` | Daily development mainline | All feature branches are cut from here; merged back to `main` after testing |

## Feature Branches

| Branch | Description |
|--------|-------------|
| `feature/exercise-manager` | Exercise library management: add/edit/delete custom exercises, muscle group editing |
| `feature/workout-stats` | Workout statistics: total volume, training frequency, weekly/monthly charts |
| `feature/data-backup` | Data backup & export: JSON/CSV export & import |
| `feature/ui-polish` | UI polish: animations, theme switching, empty state illustrations |
| `feature/set-reorder` | Set drag-to-reorder |

## Naming Conventions

- `feature/<name>` — New feature development
- `fix/<name>` — Bug fix
- `release/<version>` — Release preparation (e.g., `release/v1.0`)
- `hotfix/<name>` — Hotfix (cut from `main`, merged back to `main` + `develop`)

## Workflow

1. Cut a feature branch from `develop`
   ```bash
   git checkout develop
   git checkout -b feature/xxx
   ```

2. Develop and commit on the feature branch
   ```bash
   git add .
   git commit -m "feat: description"
   ```

3. Merge back to `develop` when done
   ```bash
   git checkout develop
   git merge feature/xxx
   git push origin develop
   ```

4. Merge `develop` to `main` and tag after testing
   ```bash
   git checkout main
   git merge develop
   git tag v1.0.0
   git push origin main --tags
   ```

5. Clean up merged feature branches
   ```bash
   git branch -d feature/xxx
   git push origin --delete feature/xxx
   ```

## Commit Message Conventions

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no functional impact)
- `refactor:` Refactoring
- `test:` Test-related
- `chore:` Build/tooling changes