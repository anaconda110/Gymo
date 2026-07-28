# Gymo 分支策略

Gymo 采用简化的 Git Flow 分支模型，兼顾开发规范与个人项目的轻量需求。

## 分支结构

```
main ── develop ── feature/exercise-manager
                  ├─ feature/workout-stats
                  ├─ feature/data-backup
                  ├─ feature/ui-polish
                  └─ feature/set-reorder
```

## 长期分支

| 分支 | 用途 | 说明 |
|------|------|------|
| `main` | 稳定发布分支 | 只接收合并，始终保持可发布状态；每次合并打 tag |
| `develop` | 日常开发主线 | 所有 feature 分支从此切出，测试通过后合并回 `main` |

## 功能分支

| 分支 | 功能说明 |
|------|----------|
| `feature/exercise-manager` | 动作库管理：增删改自定义动作、肌群分类编辑 |
| `feature/workout-stats` | 训练数据统计：总容量、训练频率、周/月图表 |
| `feature/data-backup` | 数据备份与导出：JSON/CSV 导出导入 |
| `feature/ui-polish` | UI 美化：动画、主题切换、空状态插画 |
| `feature/set-reorder` | 组次拖拽排序与重排 |

## 命名规范

- `feature/<功能名>` — 新功能开发
- `fix/<问题名>` — Bug 修复
- `release/<版本号>` — 发布准备（如 `release/v1.0`）
- `hotfix/<问题名>` — 紧急修复（从 `main` 切出，修完合并回 `main` + `develop`）

## 工作流

1. 从 `develop` 切出 feature 分支
   ```bash
   git checkout develop
   git checkout -b feature/xxx
   ```

2. 在 feature 分支上开发并提交
   ```bash
   git add .
   git commit -m "feat: 描述"
   ```

3. 开发完成后合并回 `develop`
   ```bash
   git checkout develop
   git merge feature/xxx
   git push origin develop
   ```

4. `develop` 测试通过后合并回 `main` 并打 tag
   ```bash
   git checkout main
   git merge develop
   git tag v1.0.0
   git push origin main --tags
   ```

5. 清理已合并的 feature 分支
   ```bash
   git branch -d feature/xxx
   git push origin --delete feature/xxx
   ```

## 提交信息规范

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具变更