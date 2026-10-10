# Gymo Requirements Roadmap

> Note (2026-10-07): rewritten after the repository became a two-client monorepo.
> The original July iteration (P0–P2, developed on the since-deleted `feature/*`
> branches, preserved in `main` history) is fully implemented — including theme
> switching and set drag-to-reorder, which were repaired after the merge.

## Android client status (apps/android)

Implemented and maintained:
- Exercise library management (34 presets + custom CRUD, search, muscle filter)
- Workout logging: dynamic sets, inline editing, completion checkmarks,
  **long-press drag-to-reorder**
- Workout history, stats page (totals + weekly heatmap)
- JSON backup / export / share, theming (system-follow + manual override)

The Web client (`apps/web`) additionally has: RPE, templates, superset UI,
body measurements, PR/1RM estimation, unit conversion — see
`apps/web/docs/项目文档.md`.

## Candidate directions (tracked as GitHub issues — pick by real need)

1. **Cross-platform backup format** — Android (Room entities) and Web (Dexie
   tables) backups are currently not interchangeable. A shared, versioned
   envelope would let either client restore the other's data.
   → [issue #1](https://github.com/anaconda110/Gymo/issues/1).
2. **Feature parity** — port a Web-verified feature to Android when it starts
   to matter on the phone → [issue #3](https://github.com/anaconda110/Gymo/issues/3).
3. **Release channel polish** — signed release APKs on GitHub Releases per tag.
   → [issue #2](https://github.com/anaconda110/Gymo/issues/2); process in `docs/RELEASING.md`.

## Notes

- Branch strategy: `BRANCHES.md`. Merged feature branches are deleted; all work
  lives in `main` history.
- Unit-test convention: ViewModel-layer tests run on a plain JVM with an
  in-memory DAO (see `ReorderSetsTest`) — no device, no Robolectric.
