# Gymo 分支策略

Gymo 是单人维护的项目，采用 **trunk-based** 模型，以 CI 作为质量门。重型
Git Flow 流程（长期 `develop`、release 分支）在这里不产生价值，已于
2026-10-10 随 `develop` 一并退役。

## 分支

| 分支 | 用途 |
|------|------|
| `main` | 唯一长期分支。始终保持可发布状态，CI 必须为绿。 |
| `feature/<功能名>` | 可选。较大或风险较高的改动，需要隔离时使用。 |
| `fix/<问题名>` | 可选。同上，用于修 bug。 |

## 工作流

1. 小而安全的改动——直接提交 `main`。每次 push 都会跑 CI，必须保持绿色；
   变红就立刻修复（fix forward）。

   ```bash
   git switch main
   git pull
   # 修改、本地测试，然后：
   git commit -m "feat: 描述"
   git push
   ```

2. 较大的改动——切分支，完成后用 PR 合回（PR 页展示 CI 状态，也是写清
   "为什么" 的地方）。单人项目里 PR 替代评审环节：像给评审者看那样写描述。

   ```bash
   git switch -c feature/xxx
   git commit -m "feat: 描述"
   git push -u origin feature/xxx
   gh pr create --fill
   ```

3. 合并后的分支即删除；全部历史都能从 `main` 追溯。

## 发布

在 `main` 上打 tag，并在 Release 中附上构建产物——见
[`docs/RELEASING.md`](../../docs/RELEASING.md)。

## 提交信息规范

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `refactor:` 行为不变的重构
- `test:` 测试相关
- `ci:` 构建/CI 配置
- `chore:` 杂项

## 测试门

每次 push 到 `main` 都会运行 `.github/workflows/ci.yml`（见
[`README.md`](../../README.md#测试与-ci)）。不要把红色的 `main` 推上去。
