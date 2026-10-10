# Changelog

本文件记录 Gymo 的版本变更。格式参考 [Keep a Changelog](https://keepachangelog.com/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 未发布

### 新增
- 跨端备份格式的统一设计（进行中时将记录为 ADR）。

---

## [v1.2.0] - 2026-10-10

多端单仓库基线：Android 原生客户端与 Web PWA 合并进一个仓库，共享领域文档。

### 新增
- 单仓库结构：`apps/android`（Kotlin / Jetpack Compose / Room）与
  `apps/web`（Svelte / TypeScript / Dexie）并列，`main` 为唯一主干。
- GitHub Actions CI：每次 push 运行 Web 全量测试（svelte-check、42 条单测、
  19 条 Playwright e2e）与 Android `assembleDebug` + 单测。
- 共享文档：根 `CONTEXT.md`（领域词汇表）、`docs/adr/`（决策记录，
  含 0003 合并决策与 0004 发布工程）、`docs/RELEASING.md`（发布手册）。
- 项目许可统一为 MIT（原 Android 端为 Apache-2.0），签名配置改为从
  gitignored 的 `keystore.properties` 读取。

### 修复
- Android 组次拖拽排序的手势 UI 此前从未实现（数据层 `reorderSets` 无调用方）；
  现补齐长按手柄拖拽，并修正跳过未知 id 时 `setIndex` 留空洞、会导致新增组
  撞索引的问题。
- Android 主题切换此前未接线（按钮为空实现），现生效并持久化。
- 移除三个无 `.kt` 后缀、从未参与编译的游离源文件。

---

## [v1.1.0] - 2026-07-28

Android 端首个签名发布版本（`apps/android`，当时为独立仓库）。

### 新增
- 动作库管理：34 个预置动作，自定义动作增删改、搜索、肌群筛选。
- 训练记录：动态加组、行内编辑重量/次数、完成勾选、组次排序数据层。
- 训练历史归档与统计页（总量、周训练频率热力图）。
- JSON 数据备份 / 导出 / 分享。
- 深浅色主题跟随系统；issue 模板与分支策略文档。

[v1.2.0]: https://github.com/anaconda110/Gymo/releases/tag/v1.2.0
[v1.1.0]: https://github.com/anaconda110/Gymo/releases/tag/v1.1.0
