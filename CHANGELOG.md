# Changelog

本文件记录 Gymo 的版本变更。格式参考 [Keep a Changelog](https://keepachangelog.com/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 未发布

### 修复
- **文档同步**：README、领域词汇表和备份规范更新为「跨端信封 v1 已互认」；
  修正 Web 第三方声明断链，并同步 58 条单测 / 20 条 e2e、ESLint 质量门与
  JDK 21 推荐构建环境。
- **Android 统计口径**：「总组数」此前未过滤已完成状态，把未勾选的组也计入，与
  `CONTEXT.md` 对「组」的定义（只有完成的组计入统计）矛盾。现已与「总容量」
  「总训练次数」统一口径。
- **Android 隐私一致**：关闭系统云备份（`allowBackup=false`）。此前整库会被上传到
  用户的云端备份，与「数据只存在本设备」的承诺冲突。新增守护测试，改回 true 即 CI 失败。
- **Web CSV 导出**：训练日名/动作名未转义内部引号（单组备注有转义，这两处漏了），
  且以 `= + - @` 开头的文本会被 Excel/Numbers 当公式执行——统一走 `csvCell()`
  双写引号并中和公式前缀。
- **Android 图标语义**：统计 / 切换主题 / 导出三个按钮此前共用同一个星形图标。

### 变更
- **Web 接入 ESLint**（flat config，`npm run lint`，已进 CI）：只抓真实问题——未使用
  变量、`{#each}` 缺 key、非响应式语句、表达式语句，不做风格检查。首次运行清出 66 项：
  46 处 `{#each}` 补 `key=`（列表增删/重排时避免错位复用 DOM），以及若干死 import 与
  死变量。

### 新增
- **跨端备份格式规范**（`docs/BACKUP-FORMAT.md`，信封 v1）：两端可互认的 JSON
  备份格式，含字段/取值映射、legacy 降级规则、有损点清单。决策见 `docs/adr/0005`。
- Web 端可导入 Android 原生备份（字段翻译 + 「手臂」按动作名细分二头/三头），
  导入结果携带告警（9 条新单测）。
- Android 端导出改为规范信封（`BackupCodec`），导入支持规范信封与旧版 Android
  文件，主键重分配与事务写入，有损点经对话框如实告知（9 条新单测）。
- Android 历史页新增「导入备份」入口（系统文件选择器）。
- **真 SQL 与迁移测试**：引入 Robolectric 在 JVM 上跑真实 SQLite（`GymoDaoTest`，
  覆盖统计谓词、软删除、`@Transaction` 导入的原子性与外键重建），Web 端补 Dexie
  v1→v2 迁移测试（造旧库→升级→断言数据保留与字段补齐）。决策见 `docs/adr/0006`。
- **跨端往返测试**：Web 的真实导出物由 Android 侧消费（`BackupImportTest`，含重复
  导入与自产自销往返），Android 的真实导出物由 Web 的 Playwright 在真实浏览器里
  导入（e2e 新增用例），两个方向都锚定在对方产出的文件上而非各自手搓的样例。

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
