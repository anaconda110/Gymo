# Gymo Branch Strategy / Gymo 分支策略

Gymo uses a simplified Git Flow model, balancing development standards with the lightweight needs of a personal project.

Gymo 采用简化的 Git Flow 分支模型，兼顾开发规范与个人项目的轻量需求。

## Branch Structure / 分支结构

```
main ── develop ── feature/exercise-manager
                  ├─ feature/workout-stats
                  ├─ feature/data-backup
                  ├─ feature/ui-polish
                  └─ feature/set-reorder
```

## Long-lived Branches / 长期分支

| Branch / 分支 | Purpose / 用途 | Description / 说明 |
|--------|---------|-------------|
| `main` | Stable release branch / 稳定发布分支 | Only receives merges; always in a releasable state; tag on each merge / 只接收合并，始终保持可发布状态；每次合并打 tag |
| `develop` | Daily development mainline / 日常开发主线 | All feature branches are cut from here; merged back to `main` after testing / 所有 feature 分支从此切出，测试通过后合并回 `main` |

## Feature Branches / 功能分支

| Branch / 分支 | Description / 说明 |
|--------|-------------|
| `feature/exercise-manager` | Exercise library management: add/edit/delete custom exercises, muscle group editing / 动作库管理：增删改自定义动作、肌群分类编辑 |
| `feature/workout-stats` | Workout statistics: total volume, training frequency, weekly/monthly charts / 训练数据统计：总容量、训练频率、周/月图表 |
| `feature/data-backup` | Data backup & export: JSON/CSV export & import / 数据备份与导出：JSON/CSV 导出导入 |
| `feature/ui-polish` | UI polish: animations, theme switching, empty state illustrations / UI 美化：动画、主题切换、空状态插画 |
| `feature/set-reorder` | Set drag-to-reorder / 组次拖拽排序与重排 |

## Naming Conventions / 命名规范

- `feature/<name>` — New feature development / 新功能开发
- `fix/<name>` — Bug fix / Bug 修复
- `release/<version>` — Release preparation (e.g., `release/v1.0`) / 发布准备（如 `release/v1.0`）
- `hotfix/<name>` — Hotfix (cut from `main`, merged back to `main` + `develop`) / 紧急修复（从 `main` 切出，修完合并回 `main` + `develop`）

## Workflow / 工作流

1. Cut a feature branch from `develop` / 从 `develop` 切出 feature 分支
   ```bash
   git checkout develop
   git checkout -b feature/xxx
   ```

2. Develop and commit on the feature branch / 在 feature 分支上开发并提交
   ```bash
   git add .
   git commit -m "feat: description"
   ```

3. Merge back to `develop` when done / 开发完成后合并回 `develop`
   ```bash
   git checkout develop
   git merge feature/xxx
   git push origin develop
   ```

4. Merge `develop` to `main` and tag after testing / `develop` 测试通过后合并回 `main` 并打 tag
   ```bash
   git checkout main
   git merge develop
   git tag v1.0.0
   git push origin main --tags
   ```

5. Clean up merged feature branches / 清理已合并的 feature 分支
   ```bash
   git branch -d feature/xxx
   git push origin --delete feature/xxx
   ```

## Commit Message Conventions / 提交信息规范

- `feat:` New feature / 新功能
- `fix:` Bug fix / Bug 修复
- `docs:` Documentation changes / 文档变更
- `style:` Code formatting (no functional impact) / 代码格式（不影响功能）
- `refactor:` Refactoring / 重构
- `test:` Test-related / 测试相关
- `chore:` Build/tooling changes / 构建/工具变更