# ADR 0006：迁移与备份策略（数据不得静默丢失）

日期：2026-10-11
状态：已接受

## 背景

Gymo 的数据只存在于用户设备上——这是产品承诺，也意味着**任何一次 schema 变更
都是对唯一副本的写入**，没有服务端兜底。审查中发现三处与此承诺不一致或危险的做法：

1. Android 的 `AppDatabase` 使用 `fallbackToDestructiveMigration()`：schema 升版
   而没写 migration 时，Room 会**删除全部数据**重建。对这个应用，这等于静默清库。
2. Android 的 `AndroidManifest.xml` 是 `allowBackup="true"`，且
   `data_extraction_rules.xml` 里的 `<cloud-backup>` 没有任何 include/exclude——
   默认语义是"整库备份"，即训练数据会被系统上传到用户的云备份，与 README 的
   "数据只存在本设备、不联网同步"冲突。
3. 两端的 schema 升级逻辑（Room `version/n/`、Dexie `.version(n).upgrade()`）
   此前**零测试覆盖**，而迁移写错的表现就是静默丢数据。

## 决策

1. **Android 关闭系统云备份**：`allowBackup="false"`。数据主权由应用内的 JSON
   导出/导入兑现（`docs/BACKUP-FORMAT.md`），而不是交给系统备份通道。
   新增测试 `PrivacyConfigTest` 断言该标志为 false、且不申请任何网络权限——
   任何人把它改回 true 都会在 CI 上失败。
2. **Web 的迁移逻辑纳入测试**：`migration.test.ts` 用 `fake-indexeddb` 造出 v1 库
   （缺 `setType` 的旧行），再用 v2 + 真实 `upgrade()` 重开，断言旧数据保留、
   字段被补齐、新索引可查询、已赋值的行不被改写。
3. **Android 的 DAO 纳入测试**：引入 Robolectric（JVM 上跑真实 SQLite），
   `GymoDaoTest` 覆盖统计谓词、软删除、以及 `@Transaction` 导入的原子性与
   外键重建。此前这些只由内存 fake 覆盖，SQL 本身从未被测。
4. **`fallbackToDestructiveMigration` 的处置**：本次**保留**，但收紧为显式约定：
   今后每次修改 Room 实体或索引，必须同时提升 `version` 并补 `Migration`；
   若确实要丢弃旧格式（例如原型期的表重构），必须在提交信息里写明"破坏性迁移，
   用户数据将丢失"，并在 CHANGELOG 标注。不引入 `fallbackToDestructiveMigrationOnDowngrade()`
   之外的自动化兜底——静默降级同样危险。

## 取舍与代价

- **关闭云备份的代价**：用户换机时不再有系统级迁移通道，必须靠应用内 JSON 导出。
  这是有意选择：该项目的用户画像正是"不愿数据上云"的人，且 JSON 备份的格式
  已规范化为两端互认（ADR 0005）。
- **保留 fallback 而非立即补全部 migration 的代价**：仍存在"忘记写 migration 就
  清库"的风险，只是把风险从默认行为转为需要人工遵守的约定。若要彻底消除，
  应改用 `fallbackToDestructiveMigration(dropAllTables = false)` 并在 `onDestructiveMigration`
  中拒绝启动；但那会让开发者本地迭代变慢（改 schema 就要写 migration），
  对单人项目不划算。故选择"约定 + 文档 + CHANGELOG 强制"。
- **Robolectric 的代价**：新增 3 个测试依赖，首次运行需下载 android-all 镜像
  （约 100MB，CI 上会缓存）。换来的是真 SQL 覆盖——此前统计口径的 bug
  （`COUNT(*)` 漏了 `isCompleted = 1`）正是这一层才能守住的。

## 后续

- 下一次修改 Room schema 时，第一个动作是写 `Migration` 并补 `MigrationsTest`。
- Web 端每次新增 Dexie 版本时，在 `migration.test.ts` 里加一条从上一版本升级的用例。
