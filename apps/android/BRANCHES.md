# Gymo Branch Strategy

Gymo is a single-maintainer project. It uses a **trunk-based** model with CI as
the gate — heavy Git Flow ceremony (long-lived `develop`, release branches)
buys nothing here and was retired on 2026-10-10, when `develop` was deleted.

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | The only long-lived branch. Always releaseable; CI must be green. |
| `feature/<name>` | Optional. For larger or risky changes that benefit from isolation. |
| `fix/<name>` | Optional. Same idea, for bug fixes. |

## Workflow

1. Small, safe changes — commit directly to `main`. CI runs on every push and
   must stay green; if it goes red, fix forward immediately.

   ```bash
   git switch main
   git pull
   # edit, test locally, then:
   git commit -m "feat: description"
   git push
   ```

2. Larger changes — branch, then bring it back with a PR (the PR page shows
   CI status and gives a place to write down why). For a solo project the PR
   replaces the review step: write the description as if for a reviewer.

   ```bash
   git switch -c feature/xxx
   git commit -m "feat: description"
   git push -u origin feature/xxx
   gh pr create --fill
   ```

3. Merged branches are deleted; all history stays reachable from `main`.

## Release

Tag on `main` and publish a Release with the built artifact — see
[`docs/RELEASING.md`](../../docs/RELEASING.md).

## Commit messages

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` behavior-preserving change
- `test:` tests
- `ci:` build/CI configuration
- `chore:` housekeeping

## Testing gates

Every push to `main` runs `.github/workflows/ci.yml` (see
[`README.md`](../../README.md#测试与-ci)). Do not push a red `main`.
